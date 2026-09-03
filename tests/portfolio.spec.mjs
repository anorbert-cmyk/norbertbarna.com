import { inflateSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-edge-991", width: 991, height: 900 },
  { name: "desktop-edge-992", width: 992, height: 900 },
  { name: "desktop-1366", width: 1366, height: 900 },
];

const contentRoutes = [
  "/",
  "/works",
  "/work/benker",
  "/work/bitpanda",
  "/work/instructure",
  "/work/kineticare",
  "/work/onrobot",
  "/work/raiffeisen",
  "/work/sportsgambit",
];

test.beforeEach(async ({ page }) => {
  page.__runtimeErrors = [];
  page.on("pageerror", (error) => page.__runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      page.__runtimeErrors.push(`console.error: ${message.text()}`);
    }
  });
  await page.addInitScript(() => {
    window.__cumulativeLayoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cumulativeLayoutShift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
});

test.afterEach(async ({ page }) => {
  if (page.isClosed() || page.url() === "about:blank") return;
  expect(page.__runtimeErrors, page.__runtimeErrors.join("\n")).toEqual([]);
  const cumulativeLayoutShift = await page.evaluate(() => window.__cumulativeLayoutShift || 0);
  expect(cumulativeLayoutShift, `CLS ${cumulativeLayoutShift} exceeds the good threshold`).toBeLessThan(0.1);
});

function readPng(buffer) {
  if (buffer[0] !== 0x89 || buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("not a PNG");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idats = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported png ${bitDepth}/${colorType}`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idats));
  const stride = width * bpp;
  const pixels = Buffer.alloc(width * height * 4);
  let src = 0;
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src];
    src += 1;
    const row = Buffer.from(raw.subarray(src, src + stride));
    src += stride;
    if (filter === 1) {
      for (let i = 0; i < stride; i += 1) {
        row[i] = (row[i] + (i >= bpp ? row[i - bpp] : 0)) & 255;
      }
    } else if (filter === 2) {
      for (let i = 0; i < stride; i += 1) {
        row[i] = (row[i] + prev[i]) & 255;
      }
    } else if (filter === 3) {
      for (let i = 0; i < stride; i += 1) {
        const left = i >= bpp ? row[i - bpp] : 0;
        row[i] = (row[i] + Math.floor((left + prev[i]) / 2)) & 255;
      }
    } else if (filter === 4) {
      for (let i = 0; i < stride; i += 1) {
        const left = i >= bpp ? row[i - bpp] : 0;
        const upLeft = i >= bpp ? prev[i - bpp] : 0;
        row[i] = (row[i] + paeth(left, prev[i], upLeft)) & 255;
      }
    } else if (filter !== 0) {
      throw new Error(`unsupported png filter ${filter}`);
    }
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      pixels[i] = row[x * bpp];
      pixels[i + 1] = row[x * bpp + 1];
      pixels[i + 2] = row[x * bpp + 2];
      pixels[i + 3] = bpp === 4 ? row[x * bpp + 3] : 255;
    }
    prev = row;
  }
  return { width, height, pixels };
}

function sampleStats(png, { skipEdge = 1 } = {}) {
  let count = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  const luminances = [];
  for (let y = skipEdge; y < png.height - skipEdge; y += 1) {
    for (let x = skipEdge; x < png.width - skipEdge; x += 1) {
      const i = (y * png.width + x) * 4;
      const pr = png.pixels[i];
      const pg = png.pixels[i + 1];
      const pb = png.pixels[i + 2];
      r += pr;
      g += pg;
      b += pb;
      luminances.push(0.2126 * pr + 0.7152 * pg + 0.0722 * pb);
      count += 1;
    }
  }
  const meanL = luminances.reduce((sum, value) => sum + value, 0) / count;
  const variance = luminances.reduce((sum, value) => sum + (value - meanL) ** 2, 0) / count;
  return {
    r: r / count,
    g: g / count,
    b: b / count,
    luminance: meanL,
    stddev: Math.sqrt(variance),
  };
}

async function screenshotClip(page, clip) {
  const buffer = await page.screenshot({ clip, type: "png" });
  return sampleStats(readPng(buffer));
}

function srgbToLin(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

function contrastRatio(a, b) {
  const left = relativeLuminance(a);
  const right = relativeLuminance(b);
  const hi = Math.max(left, right);
  const lo = Math.min(left, right);
  return (hi + 0.05) / (lo + 0.05);
}

function parseCssColor(color) {
  const match = color.match(/rgba?\(\s*([\d.]+)\s*[,\s/]+\s*([\d.]+)\s*[,\s/]+\s*([\d.]+)(?:\s*[,\s/]+\s*([\d.]+%?))?\s*\)/i);
  if (!match) return { rgb: [17, 17, 17], alpha: 1 };
  const alpha = match[4] == null
    ? 1
    : String(match[4]).endsWith("%")
      ? Number.parseFloat(match[4]) / 100
      : Number(match[4]);
  return { rgb: [Number(match[1]), Number(match[2]), Number(match[3])], alpha };
}

async function contrastBehind(page, selector) {
  const meta = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.scrollIntoView({ block: "nearest" });
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      color: style.color,
      size: Number.parseFloat(style.fontSize),
      weight: style.fontWeight,
    };
  }, selector);
  if (!meta) return null;
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el.style.color = "transparent";
    el.querySelectorAll("*").forEach((node) => {
      node.style.color = "transparent";
    });
  }, selector);
  const viewport = page.viewportSize();
  const clip = {
    x: Math.max(0, Math.min(viewport.width - 12, meta.x + Math.min(8, meta.width / 3))),
    y: Math.max(0, Math.min(viewport.height - 10, meta.y + Math.min(8, meta.height / 2))),
    width: 10,
    height: 8,
  };
  const sample = await screenshotClip(page, clip);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el.style.color = "";
    el.querySelectorAll("*").forEach((node) => {
      node.style.color = "";
    });
  }, selector);
  const parsed = parseCssColor(meta.color);
  const fg = parsed.alpha < 1
    ? parsed.rgb.map((channel, index) => channel * parsed.alpha + [sample.r, sample.g, sample.b][index] * (1 - parsed.alpha))
    : parsed.rgb;
  const large = meta.size >= 24 || (meta.size >= 18.67 && Number(meta.weight) >= 700);
  return {
    selector,
    ratio: contrastRatio(fg, [sample.r, sample.g, sample.b]),
    need: large ? 3 : 4.5,
    size: meta.size,
  };
}

async function openStable(page, route) {
  await page.goto(route, { waitUntil: "load" });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
  await page.waitForFunction(() => {
    if (!document.fonts?.check) return true;
    return document.fonts.check('700 48px "Funnel Display"')
      || document.documentElement.classList.contains("wf-active");
  }, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(100);
}

for (const viewport of viewports) {
  test(`${viewport.name}: native scroll remains monotonic and reaches the footer`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openStable(page, "/");

    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    await page.evaluate(() => window.scrollTo(0, 0));
    const samples = [];
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(35);
      samples.push(await page.evaluate(() => window.scrollY));
    }
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1] - 2);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(80);
    const atBottom = await page.evaluate(() => ({
      y: window.scrollY,
      max: document.documentElement.scrollHeight - window.innerHeight,
      footerTop: document.querySelector("footer").getBoundingClientRect().top,
    }));
    expect(atBottom.y).toBeGreaterThanOrEqual(atBottom.max - 2);
    expect(atBottom.footerTop).toBeLessThan(viewport.height);

    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(80);
    const afterBottomWheel = await page.evaluate(() => window.scrollY);
    expect(afterBottomWheel).toBeGreaterThanOrEqual(atBottom.y - 2);
  });

  test(`${viewport.name}: long case content has no horizontal overflow or stretched images`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openStable(page, "/work/kineticare");
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(320, window.innerHeight * 0.7)) {
        window.scrollTo(0, y);
        await new Promise((resolve) => window.setTimeout(resolve, 35));
      }
      window.scrollTo(0, 0);
    });
    await expect.poll(() => page.evaluate(() =>
      [...document.querySelectorAll(".summary img")].every((image) => image.complete && image.naturalWidth > 0)
    )).toBe(true);
    const result = await page.evaluate(() => {
      const images = [...document.querySelectorAll(".summary img")].map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          natural: image.naturalWidth > 0 && image.naturalHeight > 0,
          ratioDelta: Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight),
        };
      });
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        images,
      };
    });
    expect(result.overflow).toBeLessThanOrEqual(1);
    expect(result.images.length).toBeGreaterThan(0);
    expect(result.images.every((image) => image.natural && image.ratioDelta < 0.02)).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    const samples = [];
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(35);
      samples.push(await page.evaluate(() => window.scrollY));
    }
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1] - 2);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(80);
    const caseBottom = await page.evaluate(() => ({
      y: window.scrollY,
      max: document.documentElement.scrollHeight - window.innerHeight,
    }));
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(caseBottom.max - 2);
  });
}

for (const width of [360, 768, 991]) {
  test(`mobile navigation is single-toggle and keyboard complete at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/");
    const button = page.locator(".menu-button");
    const navigation = page.locator("#primary-navigation");

    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(navigation).toHaveAttribute("data-nav-menu-open", "");

    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.evaluate(() => document.querySelector("main").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.focus();
    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const mailRequest = page.waitForRequest((req) => /^mailto:/i.test(req.url()), { timeout: 4000 });
    await page.locator(".navbar button.footer-email").click();
    expect((await mailRequest).url()).toBe("mailto:anorbert@pm.me");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.setViewportSize({ width: 992, height: 900 });
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
}

test("skip link and full-card project action work without hover", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-to-content")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await openStable(page, "/works");
  const firstCard = page.locator(".work-card").first();
  await firstCard.click({ position: { x: 30, y: 30 } });
  await expect(page).toHaveURL(/\/work\/raiffeisen$/);
});

test("reduced-motion preference stops active animation and video", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStable(page, "/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("no-motion"))).toBe(true);
  const immediateState = await page.evaluate(() => ({
    hiddenSplitWords: [...document.querySelectorAll(".split-reveal-word")]
      .some((element) => Number.parseFloat(getComputedStyle(element).opacity) === 0),
    aboutOpacity: Number.parseFloat(getComputedStyle(document.querySelector(".home-about-area")).opacity),
    activeScrollTriggers: window.ScrollTrigger?.getAll().length || 0,
  }));
  expect(immediateState.hiddenSplitWords).toBe(false);
  expect(immediateState.aboutOpacity).toBeGreaterThan(0);
  expect(immediateState.activeScrollTriggers).toBe(0);

  await page.setViewportSize({ width: 991, height: 900 });
  await page.setViewportSize({ width: 992, height: 900 });
  await page.waitForTimeout(100);
  const state = await page.evaluate(() => ({
    videosPaused: [...document.querySelectorAll("video")].every((video) => video.paused),
    hiddenContent: [...document.querySelectorAll(".work-card, .section-title")]
      .some((element) => Number.parseFloat(getComputedStyle(element).opacity) === 0),
    activeScrollTriggers: window.ScrollTrigger?.getAll().length || 0,
  }));
  expect(state.videosPaused).toBe(true);
  expect(state.hiddenContent).toBe(false);
  expect(state.activeScrollTriggers).toBe(0);
});

for (const viewport of [viewports[0], viewports[4]]) {
  for (const route of contentRoutes) {
    test(`${viewport.name}: ${route} has no serious accessibility violation`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openStable(page, route);
      const results = await new AxeBuilder({ page }).analyze();
      const blockers = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      expect(blockers, blockers.map(({ id, help }) => `${id}: ${help}`).join("\n")).toEqual([]);
    });
  }
}

test("Kineticare compact fold: white dek and unclipped facts, no Motion chip", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openStable(page, "/work/kineticare");

  const dekColor = await page.locator(".kineticare-hero .banner-text").evaluate(
    (element) => getComputedStyle(element).color
  );
  expect(dekColor).toBe("rgb(255, 255, 255)");

  const layout = await page.evaluate(() => {
    const role = document.querySelector(".case-facts dd");
    return {
      clipped: role.scrollWidth > role.clientWidth + 1,
      roleText: role.textContent.trim(),
      motionControl: Boolean(document.querySelector("[data-motion-toggle], .site-motion-toggle")),
    };
  });
  expect(layout.roleText).toBe("Product designer and full-stack builder");
  expect(layout.clipped).toBe(false);
  expect(layout.motionControl).toBe(false);
});

const caseRoutes = contentRoutes.filter((route) => route.startsWith("/work/"));

for (const route of caseRoutes) {
  test(`1280: ${route} TOC chips wrap without clipping`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openStable(page, route);
    const toc = await page.evaluate(() => {
      const list = document.querySelector(".case-toc ol");
      const chips = [...document.querySelectorAll(".case-toc a")];
      const listBox = list.getBoundingClientRect();
      return {
        chipCount: chips.length,
        listOverflow: list.scrollWidth - list.clientWidth,
        clippedChips: chips.filter((chip) => {
          const box = chip.getBoundingClientRect();
          return chip.scrollWidth > chip.clientWidth + 1 ||
            box.right > listBox.right + 1 || box.left < listBox.left - 1;
        }).map((chip) => chip.textContent.trim()),
      };
    });
    expect(toc.chipCount).toBeGreaterThan(0);
    expect(toc.listOverflow, "TOC list must wrap instead of overflowing").toBeLessThanOrEqual(1);
    expect(toc.clippedChips, `clipped TOC chips: ${toc.clippedChips.join(", ")}`).toEqual([]);
  });
}

test("Kineticare case header contains exactly one media node and it autoplays", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStable(page, "/work/kineticare");
  const header = await page.evaluate(() => {
    const scope = document.querySelector(".case-study-header");
    const media = [...scope.querySelectorAll("video, img, picture, iframe")];
    const video = scope.querySelector("video");
    return {
      mediaCount: media.length,
      isVideo: media.length === 1 && media[0].tagName === "VIDEO",
      managedAutoplay: Boolean(video && video.hasAttribute("data-autoplay-video")),
    };
  });
  expect(header.mediaCount).toBe(1);
  expect(header.isVideo).toBe(true);
  expect(header.managedAutoplay).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const video = document.querySelector(".case-study-header video");
    return video.getAttribute("data-media-state");
  }), { timeout: 15000 }).toMatch(/playing|loading/);
});

function isTransparentFill(color) {
  return /rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/.test(color);
}

function isInkWash(color) {
  const legacy = color.match(/rgba\(\s*17,\s*17,\s*17,\s*([0-9.]+)\s*\)/);
  if (legacy && Number(legacy[1]) > 0 && Number(legacy[1]) <= 0.12) return true;
  const modern = color.match(/rgba?\(\s*17[\s,]+17[\s,]+17\s*\/\s*([0-9.]+%?)\s*\)/);
  if (!modern) return false;
  const raw = modern[1];
  const alpha = String(raw).endsWith("%") ? Number(raw.slice(0, -1)) / 100 : Number(raw);
  return alpha > 0 && alpha <= 0.12;
}

for (const route of ["/", "/works", "/work/instructure", "/work/kineticare"]) {
  test(`${route}: footer lock — mesh field, outlined Email, Work cases, no form`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openStable(page, route);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page.evaluate(() => {
      const root = document.querySelector("footer.footer-section");
      const chrome = root.querySelector(".footer-chrome");
      const email = root.querySelector("button.footer-email");
      const linkedin = root.querySelector("a.footer-contact-link");
      const icon = linkedin?.querySelector(".footer-icon");
      const work = [...root.querySelectorAll(".footer-nav .footer-col:first-child a")].map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent.trim(),
      }));
      const cols = [...root.querySelectorAll(".footer-nav .footer-col")];
      const emailStyle = email ? getComputedStyle(email) : null;
      const linkedinStyle = linkedin ? getComputedStyle(linkedin) : null;
      const barStyle = getComputedStyle(root.querySelector(".footer-bar"));
      const emailBox = email ? email.getBoundingClientRect() : null;
      const linkedinBox = linkedin ? linkedin.getBoundingClientRect() : null;
      const iconBox = icon ? icon.getBoundingClientRect() : null;
      const hairline = barStyle.borderTopColor;
      const alphaMatch = hairline.match(/rgba?\(\s*17,\s*17,\s*17(?:,\s*([0-9.]+))?\s*\)/);
      return {
        lede: root.querySelector(".footer-lede")?.textContent.trim() || "",
        copyright: root.querySelector(".footer-copyright")?.textContent.trim() || "",
        form: Boolean(root.querySelector("form, .footer-hp, [data-contact-form]")),
        emailHref: email ? email.getAttribute("href") : "missing",
        emailText: email ? email.textContent.trim() : "",
        emailTag: email ? email.tagName : "",
        emailType: email ? email.getAttribute("type") : "",
        linkedinHref: linkedin ? linkedin.getAttribute("href") : "",
        linkedinCount: root.querySelectorAll("a.footer-contact-link").length,
        emailCount: root.querySelectorAll("button.footer-email").length,
        fakeEmailLink: Boolean(root.querySelector("a.footer-email")),
        emailSize: emailBox && emailStyle ? {
          w: Math.round(emailBox.width),
          h: Math.round(emailBox.height),
          bg: emailStyle.backgroundColor,
          color: emailStyle.color,
          radius: emailStyle.borderRadius,
          weight: emailStyle.fontWeight,
          size: emailStyle.fontSize,
          padX: `${emailStyle.paddingLeft} ${emailStyle.paddingRight}`,
          border: emailStyle.borderTopWidth,
        } : null,
        linkedinSize: linkedinBox && linkedinStyle ? {
          w: Math.round(linkedinBox.width),
          h: Math.round(linkedinBox.height),
          radius: linkedinStyle.borderRadius,
          bg: linkedinStyle.backgroundColor,
          color: linkedinStyle.color,
          border: linkedinStyle.borderTopWidth,
        } : null,
        iconH: iconBox ? Math.round(iconBox.height) : 0,
        gap: emailBox && linkedinBox ? Math.round(emailBox.left - linkedinBox.right) : null,
        work,
        colTitles: cols.map((col) => col.querySelector(".footer-col-title")?.textContent.trim() || ""),
        colCount: cols.length,
        ledeColor: root.querySelector(".footer-lede") ? getComputedStyle(root.querySelector(".footer-lede")).color : "",
        workColor: root.querySelector(".footer-col-title") ? getComputedStyle(root.querySelector(".footer-col-title")).color : "",
        mesh: Boolean(root.querySelector(".footer-mesh") && root.querySelector("#mesh-blur")),
        dunes: Boolean(root.querySelector(".footer-dunes, .footer-dune-layer, #dune-lit-yellow, #sand-grain-1")),
        paper: getComputedStyle(root).backgroundColor,
        chromeBg: chrome ? getComputedStyle(chrome).backgroundColor : "",
        backToTop: Boolean(root.querySelector(".back-to-top-wrap, [aria-label='Back to top']")),
        hairlineWidth: barStyle.borderTopWidth,
        hairlineAlpha: alphaMatch ? Number(alphaMatch[1] ?? 1) : 0,
      };
    });
    expect(footer.form).toBe(false);
    expect(footer.backToTop).toBe(false);
    expect(footer.lede).toBe("Product VP — I lead AI products in regulated finance and high-trust systems.");
    expect(footer.copyright).toBe("© 2026 Norbert Barna");
    expect(footer.emailHref).toBeNull();
    expect(footer.emailText).toBe("Email");
    expect(footer.emailTag).toBe("BUTTON");
    expect(footer.emailType).toBe("button");
    expect(footer.emailCount).toBe(1);
    expect(footer.fakeEmailLink).toBe(false);
    expect(footer.linkedinHref).toBe("https://www.linkedin.com/in/barna-norbert/");
    expect(footer.linkedinCount).toBe(1);
    expect(footer.emailSize.h).toBe(44);
    expect(footer.emailSize.w).toBeGreaterThanOrEqual(68);
    expect(footer.emailSize.w).toBeLessThanOrEqual(80);
    expect(isTransparentFill(footer.emailSize.bg)).toBe(true);
    expect(footer.emailSize.color).toBe("rgb(17, 17, 17)");
    expect(footer.emailSize.radius).toBe("12px");
    expect(footer.emailSize.weight).toBe("500");
    expect(footer.emailSize.size).toBe("15px");
    expect(footer.emailSize.padX).toBe("14px 14px");
    expect(footer.emailSize.border).toBe("1px");
    expect(footer.linkedinSize.w).toBe(44);
    expect(footer.linkedinSize.h).toBe(44);
    expect(footer.linkedinSize.radius).toBe("12px");
    expect(isTransparentFill(footer.linkedinSize.bg)).toBe(true);
    expect(footer.linkedinSize.color).toBe("rgb(17, 17, 17)");
    expect(footer.linkedinSize.border).toBe("1px");
    expect(footer.iconH).toBeGreaterThanOrEqual(16);
    expect(footer.iconH).toBeLessThanOrEqual(18);
    expect(footer.gap).toBeGreaterThanOrEqual(8);
    expect(footer.gap).toBeLessThanOrEqual(10);
    expect(footer.work.map((item) => item.href)).toEqual([
      "/work/raiffeisen",
      "/work/instructure",
      "/work/bitpanda",
      "/work/kineticare",
    ]);
    expect(footer.work.map((item) => item.text)).toEqual([
      "Raiffeisen",
      "Instructure",
      "Bitpanda",
      "Kineticare",
    ]);
    expect(footer.colCount).toBe(1);
    expect(footer.colTitles).toEqual(["Work"]);
    expect(footer.ledeColor).toBe("rgb(17, 17, 17)");
    expect(footer.workColor).toBe("rgb(17, 17, 17)");
    expect(footer.mesh).toBe(true);
    expect(footer.dunes).toBe(false);
    expect(footer.paper).not.toBe("rgb(241, 243, 242)");
    expect(footer.chromeBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(footer.hairlineWidth).toBe("1px");
    expect(footer.hairlineAlpha).toBeGreaterThanOrEqual(0.45);

    const email = page.locator("footer button.footer-email");
    const linkedin = page.locator("footer a.footer-contact-link");
    const hoverWash = async (locator) => {
      await locator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
      await locator.hover({ force: true });
      return isInkWash(await locator.evaluate((el) => getComputedStyle(el).backgroundColor));
    };
    await expect.poll(() => hoverWash(email)).toBe(true);
    await expect.poll(() => email.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(17, 17, 17)");
    await expect.poll(() => email.evaluate((el) => getComputedStyle(el).borderRadius)).toBe("12px");
    await expect.poll(() => hoverWash(linkedin)).toBe(true);
    await expect.poll(() => linkedin.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(17, 17, 17)");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("no-motion"))).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const mesh = document.querySelector(".footer-mesh");
      const transform = getComputedStyle(mesh).transform;
      return transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)";
    })).toBe(true);
    await expect.poll(() => hoverWash(email)).toBe(true);
  });
}

test("home HTML has no mailto or address; Email button assigns mail without writing the DOM", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toMatch(/mailto:/i);
  expect(html).not.toMatch(/anorbert@pm\.me/i);
  expect(html).toMatch(/<button type="button" class="footer-email">Email<\/button>/);
  expect(html).not.toMatch(/<a[^>]*footer-email/);
  expect((html.match(/<button type="button" class="footer-email">Email<\/button>/g) || []).length).toBe(2);
  expect(html).not.toMatch(/footer-col-title">Contact/);
  expect(html).not.toMatch(/href="\/contact"/);
  expect([...html.slice(html.indexOf("<footer"), html.indexOf("</footer>")).matchAll(/href="(\/work\/[^"]+)"/g)].map((match) => match[1])).toEqual([
    "/work/raiffeisen",
    "/work/instructure",
    "/work/bitpanda",
    "/work/kineticare",
  ]);

  const navJs = await (await request.get("/assets/js/navigation.js")).text();
  expect(navJs).not.toMatch(/anorbert@pm\.me/);
  expect(navJs).not.toMatch(/mailto:anorbert/);
  expect(navJs).not.toMatch(/setAttribute\(\s*["']href["']/);
  expect(navJs).toMatch(/button\.footer-email/);
  expect(navJs).toMatch(/location\.assign/);

  await openStable(page, "/");
  const liveHtml = await page.content();
  expect(liveHtml).not.toMatch(/mailto:/i);
  expect(liveHtml).not.toMatch(/anorbert@pm\.me/i);

  const email = page.locator("footer button.footer-email");
  const headerEmail = page.locator(".navbar button.footer-email");
  await expect(email).toBeVisible();
  await expect(headerEmail).toBeVisible();
  await expect(email).toHaveText("Email");
  await expect(headerEmail).toHaveText("Email");
  await expect(email).toHaveJSProperty("tagName", "BUTTON");
  expect(await email.getAttribute("type")).toBe("button");
  expect(await headerEmail.getAttribute("type")).toBe("button");
  expect(await email.getAttribute("href")).toBeNull();
  expect(await headerEmail.getAttribute("href")).toBeNull();

  const mailRequestPromise = page.waitForRequest((req) => /^mailto:/i.test(req.url()), { timeout: 4000 });
  await email.click();
  expect((await mailRequestPromise).url()).toBe("mailto:anorbert@pm.me");
  expect(await email.getAttribute("href")).toBeNull();
  expect(await headerEmail.getAttribute("href")).toBeNull();
  expect(await email.evaluate((el) => el.outerHTML)).not.toMatch(/mailto:/i);
  expect(await headerEmail.evaluate((el) => el.outerHTML)).not.toMatch(/mailto:/i);
  expect(await email.evaluate((el) => el.outerHTML)).not.toMatch(/anorbert@pm\.me/i);
  expect(await headerEmail.evaluate((el) => el.outerHTML)).not.toMatch(/anorbert@pm\.me/i);

  const afterHtml = await page.content();
  expect(afterHtml).not.toMatch(/mailto:/i);
  expect(afterHtml).not.toMatch(/anorbert@pm\.me/i);
});

test("1280 home footer: type stays on the pale band, olive bottom, analog grain", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStable(page, "/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(80);
  const boxes = await page.evaluate(() => {
    const footer = document.querySelector("footer.footer-section").getBoundingClientRect();
    const work = document.querySelector(".footer-col-title").getBoundingClientRect();
    const lede = document.querySelector(".footer-lede").getBoundingClientRect();
    return {
      footer: { x: footer.x, y: footer.y, width: footer.width, height: footer.height },
      work: { x: work.x, y: work.y, width: work.width, height: work.height },
      lede: { x: lede.x, y: lede.y, width: lede.width, height: lede.height },
    };
  });
  const sampleBeside = (box) => ({
    x: Math.max(0, box.x - 28),
    y: box.y + 2,
    width: 20,
    height: 16,
  });
  const workBand = await screenshotClip(page, sampleBeside(boxes.work));
  const ledeBand = await screenshotClip(page, sampleBeside(boxes.lede));
  for (const [name, sample] of [["Work", workBand], ["lede", ledeBand]]) {
    expect(sample.luminance, `${name} must sit on the pale lilac band, not navy`).toBeGreaterThan(140);
    expect(sample.b, `${name} band should stay cool-lilac, not yellow`).toBeGreaterThan(sample.r - 8);
  }
  const grain = await screenshotClip(page, {
    x: boxes.footer.x + boxes.footer.width * 0.5 - 32,
    y: boxes.footer.y + 20,
    width: 64,
    height: 48,
  });
  expect(grain.luminance, "top of the footer must stay the pale lilac band").toBeGreaterThan(160);
  expect(grain.stddev, "grain must read as analog speckle, not a smooth fog").toBeGreaterThan(2.5);
  const yellow = await screenshotClip(page, {
    x: boxes.footer.x + boxes.footer.width * 0.5 - 24,
    y: boxes.footer.y + boxes.footer.height - 72,
    width: 48,
    height: 36,
  });
  expect(yellow.r, "bottom band must be muted olive, not neon #FFE000").toBeLessThan(230);
  expect(yellow.g).toBeLessThan(220);
  expect(yellow.b).toBeLessThan(90);
  expect(yellow.r).toBeGreaterThan(120);
  expect(yellow.g).toBeGreaterThan(110);
});

test("1440 home footer: yellow is right-weighted, navy is a left horizon, not a balloon", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openStable(page, "/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(80);
  const footer = await page.evaluate(() => {
    const box = document.querySelector("footer.footer-section").getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  expect(footer.height, "desktop field must be tall enough for the lock mesh (~3:2 / 960px at 1440)").toBeGreaterThan(900);
  expect(footer.y, "full 960px footer must sit in the 1100 viewport after scroll").toBeGreaterThanOrEqual(0);

  const isYellow = (sample) => sample.r > 120 && sample.g > 110 && sample.b < 95 && sample.luminance > 90;
  const sampleAt = (fx, fy) => screenshotClip(page, {
    x: Math.max(0, footer.x + footer.width * fx - 10),
    y: footer.y + footer.height * fy,
    width: 20,
    height: 12,
  });

  async function yellowOnset(fx) {
    for (let fy = 0.48; fy <= 0.98; fy += 0.02) {
      if (isYellow(await sampleAt(fx, fy))) return fy;
    }
    return 1;
  }

  const leftOnset = await yellowOnset(0.08);
  const centerOnset = await yellowOnset(0.5);
  const rightOnset = await yellowOnset(0.92);
  expect(rightOnset, "yellow onset must be right-weighted (lock ~73% on the right)").toBeLessThan(centerOnset - 0.04);
  expect(centerOnset, "yellow onset must rise from right to left (lock ~84% center / ~94% left)").toBeLessThan(leftOnset - 0.04);
  expect(rightOnset).toBeGreaterThan(0.62);
  expect(rightOnset).toBeLessThan(0.82);
  expect(centerOnset).toBeGreaterThan(0.74);
  expect(centerOnset).toBeLessThan(0.90);
  expect(leftOnset).toBeGreaterThan(0.86);

  const left80 = await sampleAt(0.08, 0.80);
  const right80 = await sampleAt(0.92, 0.80);
  expect(isYellow(left80), "at 80% height the left is still dark green-navy, not yellow").toBe(false);
  expect(left80.luminance, "at 80% height the left is still dark").toBeLessThan(90);
  expect(isYellow(right80), "at 80% height the right is already yellow").toBe(true);

  const left50 = await sampleAt(0.20, 0.50);
  const right50 = await sampleAt(0.88, 0.50);
  expect(left50.luminance, "at 50% height x≈20% is navy, not a lilac gutter").toBeLessThan(90);
  expect(right50.luminance, "at 50% height the right is navy, not a lilac gutter beside a centered blob").toBeLessThan(140);

  const atCenterOnsetRight = await sampleAt(0.90, centerOnset);
  expect(isYellow(atCenterOnsetRight), "no yellow island: when the center turns yellow the right is already yellow").toBe(true);

  const left95 = await sampleAt(0.08, 0.95);
  const right95 = await sampleAt(0.92, 0.95);
  expect(isYellow(right95), "at 95% the right is bright chartreuse").toBe(true);
  expect(right95.r + right95.g, "at 95% the left stays olive; the right is brighter yellow").toBeGreaterThan(left95.r + left95.g + 20);

  const navyBand = await sampleAt(0.28, 0.55);
  expect(navyBand.luminance, "navy must be a wide left-center horizon, not a thin stripe").toBeLessThan(85);
});

async function readFooterMeshMotion(page) {
  return page.evaluate(() => {
    const offset = (el) => {
      if (!el) return { x: 0, y: 0 };
      const transform = getComputedStyle(el).transform;
      if (!transform || transform === "none") return { x: 0, y: 0 };
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.e, y: matrix.f };
    };
    const state = {
      navy: offset(document.querySelector(".footer-mesh-navy")),
      olive: offset(document.querySelector(".footer-mesh-olive")),
      yellow: offset(document.querySelector(".footer-mesh-yellow")),
      lilac: offset(document.querySelector(".footer-mesh-lilac")),
      lede: offset(document.querySelector(".footer-lede")),
      work: offset(document.querySelector(".footer-col-title")),
      email: offset(document.querySelector("button.footer-email")),
      linkedin: offset(document.querySelector("a.footer-contact-link")),
      copy: offset(document.querySelector(".footer-copyright")),
      bar: offset(document.querySelector(".footer-bar")),
      layers: {
        navy: Boolean(document.querySelector(".footer-mesh-navy")),
        olive: document.querySelectorAll(".footer-mesh-olive").length,
        yellow: Boolean(document.querySelector(".footer-mesh-yellow")),
      },
    };
    return {
      ...state,
      navyTravel: Math.hypot(state.navy.x, state.navy.y),
      oliveTravel: Math.hypot(state.olive.x, state.olive.y),
      yellowTravel: Math.hypot(state.yellow.x, state.yellow.y),
      lilacTravel: Math.hypot(state.lilac.x, state.lilac.y),
    };
  });
}

test("1440 footer mesh: pointer moves masses a little; type and chrome stay still", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openStable(page, "/");
  await page.mouse.move(8, 8);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(80);

  const rest = await readFooterMeshMotion(page);
  expect(rest.layers.navy).toBe(true);
  expect(rest.layers.olive).toBeGreaterThanOrEqual(2);
  expect(rest.layers.yellow).toBe(true);
  expect(rest.navyTravel, "resting navy must stay near identity").toBeLessThan(1.5);
  expect(rest.yellowTravel, "resting yellow must stay near identity").toBeLessThan(1.5);
  expect(rest.lilacTravel).toBeLessThan(0.05);

  const footer = page.locator("footer.footer-section");
  const box = await footer.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.86);
  await expect.poll(async () => (await readFooterMeshMotion(page)).yellowTravel, {
    timeout: 2500,
  }).toBeGreaterThan(1.8);

  const moved = await readFooterMeshMotion(page);
  expect(moved.yellowTravel, "yellow is the closer mass").toBeGreaterThan(moved.navyTravel + 0.4);
  expect(moved.oliveTravel).toBeGreaterThan(moved.navyTravel);
  expect(moved.yellowTravel, "travel stays a few pixels").toBeLessThan(12);
  expect(moved.navyTravel).toBeGreaterThan(0.4);
  expect(moved.navyTravel).toBeLessThan(8);
  expect(moved.lilacTravel, "lilac plate stays still").toBeLessThan(0.05);
  for (const key of ["lede", "work", "email", "linkedin", "copy", "bar"]) {
    expect(Math.hypot(moved[key].x, moved[key].y), `${key} must not parallax`).toBeLessThan(0.05);
  }
});

test("reduced-motion keeps the footer mesh static under the pointer", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openStable(page, "/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const box = await page.locator("footer.footer-section").boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.86);
  await page.waitForTimeout(400);
  const moved = await readFooterMeshMotion(page);
  expect(moved.navyTravel).toBeLessThan(0.05);
  expect(moved.oliveTravel).toBeLessThan(0.05);
  expect(moved.yellowTravel).toBeLessThan(0.05);
  expect(moved.lilacTravel).toBeLessThan(0.05);
});

test("/contact stays unpublished", async ({ request }) => {
  const response = await request.get("/contact");
  expect(response.status()).toBe(404);
});

test("390 footer stacks ident, CTA, Work with copyright left and no back-to-top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const stack = await page.evaluate(() => {
    const ident = document.querySelector(".footer-ident").getBoundingClientRect();
    const work = document.querySelector(".footer-nav .footer-col").getBoundingClientRect();
    const copy = document.querySelector(".footer-copyright").getBoundingClientRect();
    const footer = document.querySelector("footer.footer-section").getBoundingClientRect();
    const cols = document.querySelectorAll(".footer-nav .footer-col");
    return {
      identBottom: ident.bottom,
      workTop: work.top,
      copyLeft: copy.left,
      footerLeft: footer.left,
      colCount: cols.length,
      contactHeading: Boolean([...cols].some((col) => /Contact/.test(col.textContent))),
      backToTop: Boolean(document.querySelector("footer .back-to-top-wrap")),
    };
  });
  expect(stack.backToTop).toBe(false);
  expect(stack.colCount).toBe(1);
  expect(stack.contactHeading).toBe(false);
  expect(stack.workTop).toBeGreaterThan(stack.identBottom - 1);
  expect(stack.copyLeft).toBeLessThan(stack.footerLeft + 80);

  const work = await page.evaluate(() => {
    const title = document.querySelector(".footer-col-title").getBoundingClientRect();
    return { x: title.x, y: title.y, width: title.width, height: title.height };
  });
  const workBand = await screenshotClip(page, {
    x: Math.max(0, work.x - 24),
    y: work.y + 2,
    width: 16,
    height: 14,
  });
  expect(workBand.luminance, "390 Work must sit on the pale lilac band, not the navy horizon").toBeGreaterThan(140);

  const seam = await page.evaluate(() => {
    const cta = document.querySelector(".footer-cta").getBoundingClientRect();
    const work = document.querySelector(".footer-col-title").getBoundingClientRect();
    return {
      x: 180,
      y: cta.bottom - 12,
      width: 80,
      height: Math.max(8, Math.round(work.top - cta.bottom + 24)),
    };
  });
  const seamBuf = await page.screenshot({ clip: seam, type: "png" });
  const seamPng = readPng(seamBuf);
  let maxJump = 0;
  for (let y = 1; y < seamPng.height; y += 1) {
    const row = (yy) => {
      let sum = 0;
      for (let x = 0; x < seamPng.width; x += 1) {
        const i = (yy * seamPng.width + x) * 4;
        sum += 0.2126 * seamPng.pixels[i] + 0.7152 * seamPng.pixels[i + 1] + 0.0722 * seamPng.pixels[i + 2];
      }
      return sum / seamPng.width;
    };
    maxJump = Math.max(maxJump, Math.abs(row(y) - row(y - 1)));
  }
  expect(maxJump, "compact mesh must not clip a hard seam through the Email / Work stack").toBeLessThan(12);
});

test("1280 home selected work: compact rows, small thumbs, hiring order, stable title color", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStable(page, "/");
  const list = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("#works .work-row")].map((row) => {
      const thumb = row.querySelector(".work-row-thumb");
      const box = thumb.getBoundingClientRect();
      return {
        href: row.querySelector(".work-title")?.getAttribute("href"),
        title: row.querySelector(".work-title")?.textContent.trim(),
        summary: row.querySelector(".work-card-summary")?.textContent.trim() || "",
        thumbW: Math.round(box.width),
        thumbH: Math.round(box.height),
      };
    });
    return {
      rows,
      giantCards: Boolean(document.querySelector("#works .work-image-wrap, #works .work-grid")),
    };
  });
  expect(list.giantCards, "GiantWorkCards must not return").toBe(false);
  expect(list.rows.map((row) => row.href)).toEqual([
    "/work/raiffeisen",
    "/work/instructure",
    "/work/bitpanda",
    "/work/benker",
    "/work/sportsgambit",
    "/work/kineticare",
  ]);
  expect(list.rows.map((row) => row.title)).toEqual([
    "Raiffeisen",
    "Instructure",
    "Bitpanda",
    "Benker",
    "SportsGambit",
    "Kineticare",
  ]);
  expect(list.rows.some((row) => /4M\+|Redesigning banking for/.test(row.summary))).toBe(false);
  for (const row of list.rows) {
    expect(row.thumbW).toBeGreaterThanOrEqual(72);
    expect(row.thumbW).toBeLessThanOrEqual(96);
    expect(row.thumbH).toBeGreaterThanOrEqual(72);
    expect(row.thumbH).toBeLessThanOrEqual(96);
  }

  const kineticareTitle = page.locator('#works .work-title[href="/work/kineticare"]');
  await kineticareTitle.scrollIntoViewIfNeeded();
  const colorBefore = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  await kineticareTitle.hover();
  await page.waitForTimeout(250);
  const colorAfter = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  expect(colorAfter, "title color must not jump on hover").toBe(colorBefore);
});

test("1440 home header: analog mast, live copy, no product screenshot, outlined chrome", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStable(page, "/");
  const fold = await page.evaluate(() => {
    const mast = document.querySelector(".home-mast");
    const header = document.querySelector(".home-banner-section");
    const navbar = document.querySelector(".navbar");
    const email = navbar.querySelector("button.footer-email");
    const linkedin = navbar.querySelector("a.footer-contact-link");
    const cta = document.querySelector(".hero-work-link");
    const headerImgs = [...header.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    const emailStyle = email ? getComputedStyle(email) : null;
    const linkedinStyle = linkedin ? getComputedStyle(linkedin) : null;
    const ctaStyle = cta ? getComputedStyle(cta) : null;
    const navStyle = getComputedStyle(navbar);
    return {
      kicker: document.querySelector(".hero-kicker")?.textContent.trim() || "",
      h1: document.querySelector(".home-banner-title")?.textContent.trim() || "",
      sub: document.querySelector(".home-banner-subtitle")?.textContent.trim() || "",
      cta: cta?.textContent.trim() || "",
      ctaHref: cta?.getAttribute("href") || "",
      highlights: [...document.querySelectorAll(".home-banner-outcomes li")].map((li) => li.textContent.trim()),
      mesh: Boolean(document.querySelector(".home-mast-mesh") && document.querySelector("#home-mast-blur")),
      dunes: Boolean(document.querySelector(".footer-dunes, .home-mast-dunes")),
      canvas: Boolean(document.querySelector(".hero-proof, .home-mast img[src*='insights-feed']")),
      headerImgs,
      motion: Boolean(document.querySelector("[data-motion-toggle], .site-motion-toggle")),
      navBg: navStyle.backgroundColor,
      navBorder: navStyle.borderBottomWidth,
      emailHref: email ? email.getAttribute("href") : "missing",
      emailType: email ? email.getAttribute("type") : "",
      emailText: email ? email.textContent.trim() : "",
      works: Boolean(navbar.querySelector('a.nav-link[href="/works"]')),
      emailSize: email ? {
        w: Math.round(email.getBoundingClientRect().width),
        h: Math.round(email.getBoundingClientRect().height),
        radius: emailStyle.borderRadius,
        bg: emailStyle.backgroundColor,
        color: emailStyle.color,
        size: emailStyle.fontSize,
        weight: emailStyle.fontWeight,
      } : null,
      linkedinSize: linkedin ? {
        w: Math.round(linkedin.getBoundingClientRect().width),
        h: Math.round(linkedin.getBoundingClientRect().height),
        radius: linkedinStyle.borderRadius,
        bg: linkedinStyle.backgroundColor,
      } : null,
      ctaChrome: ctaStyle ? {
        h: Math.round(cta.getBoundingClientRect().height),
        radius: ctaStyle.borderRadius,
        bg: ctaStyle.backgroundColor,
        color: ctaStyle.color,
        weight: ctaStyle.fontWeight,
        size: ctaStyle.fontSize,
      } : null,
      mastBox: mast ? mast.getBoundingClientRect() : null,
    };
  });
  expect(fold.kicker).toBe("Norbert Barna");
  expect(fold.h1).toBe("AI Product Design Lead");
  expect(fold.sub).toMatch(/AI-driven, secure/);
  expect(fold.cta).toBe("View selected work");
  expect(fold.ctaHref).toBe("/works");
  expect(fold.highlights.length).toBe(4);
  expect(fold.highlights[0]).toMatch(/Raiffeisen/);
  expect(fold.highlights[1]).toMatch(/Instructure/);
  expect(fold.highlights[2]).toMatch(/Bitpanda/);
  expect(fold.highlights[3]).toMatch(/Balabit/);
  expect(fold.mesh).toBe(true);
  expect(fold.dunes).toBe(false);
  expect(fold.canvas).toBe(false);
  expect(fold.headerImgs).toEqual([]);
  expect(fold.motion).toBe(false);
  expect(fold.works).toBe(true);
  expect(fold.navBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
  expect(fold.navBorder).toBe("0px");
  expect(fold.emailHref).toBeNull();
  expect(fold.emailType).toBe("button");
  expect(fold.emailText).toBe("Email");
  expect(fold.emailSize.h).toBe(44);
  expect(fold.emailSize.w).toBeGreaterThanOrEqual(68);
  expect(fold.emailSize.w).toBeLessThanOrEqual(80);
  expect(isTransparentFill(fold.emailSize.bg)).toBe(true);
  expect(fold.emailSize.color).toBe("rgb(17, 17, 17)");
  expect(fold.emailSize.radius).toBe("12px");
  expect(fold.emailSize.size).toBe("15px");
  expect(fold.emailSize.weight).toBe("500");
  expect(fold.linkedinSize.w).toBe(44);
  expect(fold.linkedinSize.h).toBe(44);
  expect(fold.linkedinSize.radius).toBe("12px");
  expect(isTransparentFill(fold.linkedinSize.bg)).toBe(true);
  expect(fold.ctaChrome.h).toBe(44);
  expect(fold.ctaChrome.radius).toBe("12px");
  expect(isTransparentFill(fold.ctaChrome.bg)).toBe(true);
  expect(fold.ctaChrome.color).toBe("rgb(17, 17, 17)");
  expect(fold.ctaChrome.weight).toBe("500");
  expect(fold.ctaChrome.size).toBe("15px");

  const mast = fold.mastBox;
  expect(mast).toBeTruthy();
  const lilac = await screenshotClip(page, {
    x: Math.max(0, mast.x + 48),
    y: mast.y + 28,
    width: 64,
    height: 40,
  });
  expect(lilac.luminance, "copy sits on the pale lilac band").toBeGreaterThan(150);
  expect(lilac.b, "type band stays cool-lilac").toBeGreaterThan(lilac.r - 12);
  const outcomes = await page.evaluate(() => {
    const list = document.querySelector(".home-banner-outcomes").getBoundingClientRect();
    return { x: list.x, y: list.y };
  });
  const outcomesBand = await screenshotClip(page, {
    x: Math.max(0, outcomes.x - 20),
    y: outcomes.y + 4,
    width: 18,
    height: 14,
  });
  expect(outcomesBand.luminance, "highlights stay on lilac, not the navy félkör").toBeGreaterThan(130);
  const dome = await screenshotClip(page, {
    x: Math.max(0, mast.x + mast.width * 0.72 - 24),
    y: mast.y + mast.height - 70,
    width: 48,
    height: 36,
  });
  expect(dome.luminance, "navy félkör must occupy the lower field").toBeLessThan(70);
  expect(dome.b, "dome is navy, not yellow").toBeGreaterThan(dome.r - 20);
  const domeRise = await screenshotClip(page, {
    x: Math.max(0, mast.x + mast.width * 0.74 - 24),
    y: mast.y + mast.height * 0.78,
    width: 48,
    height: 36,
  });
  expect(domeRise.luminance, "félkör rises through the lower field, not a thin horizon").toBeLessThan(110);
  const grain = await screenshotClip(page, {
    x: Math.max(0, mast.x + 80),
    y: mast.y + 80,
    width: 72,
    height: 48,
  });
  expect(grain.stddev, "mast grain must read as analog speckle").toBeGreaterThan(2.5);
});

test("390 home header: highlights stay on lilac, kicker stays 13px, navy sits under the type", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");
  const fold = await page.evaluate(() => {
    const kicker = document.querySelector(".hero-kicker");
    const last = document.querySelector(".home-banner-outcomes li:last-child");
    const mast = document.querySelector(".home-mast");
    return {
      kickerSize: kicker ? getComputedStyle(kicker).fontSize : "",
      lastBox: last ? last.getBoundingClientRect() : null,
      mastBox: mast ? mast.getBoundingClientRect() : null,
    };
  });
  expect(fold.kickerSize, "compact kicker must stay 13px").toBe("13px");
  expect(fold.lastBox).toBeTruthy();
  expect(fold.mastBox).toBeTruthy();
  expect(fold.lastBox.bottom, "mast must extend past the highlights so navy can sit under type").toBeLessThan(fold.mastBox.bottom - 80);

  const kickerBand = await screenshotClip(page, { x: 20, y: 90, width: 20, height: 14 });
  expect(kickerBand.luminance, "kicker sits on lilac").toBeGreaterThan(150);
  const outcomes = await page.evaluate(() => {
    const list = document.querySelector(".home-banner-outcomes").getBoundingClientRect();
    const last = document.querySelector(".home-banner-outcomes li:last-child").getBoundingClientRect();
    return { x: list.x, y: list.y, lastY: last.y, lastH: last.height };
  });
  const outcomesTop = await screenshotClip(page, {
    x: Math.max(0, outcomes.x - 12),
    y: outcomes.y + 4,
    width: 16,
    height: 12,
  });
  expect(outcomesTop.luminance, "highlights stay on lilac, not the navy félkör").toBeGreaterThan(130);
  const outcomesLast = await screenshotClip(page, {
    x: Math.max(0, outcomes.x - 12),
    y: outcomes.lastY + Math.min(8, outcomes.lastH / 2),
    width: 16,
    height: 12,
  });
  expect(outcomesLast.luminance, "last highlight stays on lilac").toBeGreaterThan(130);
  await page.evaluate(() => {
    const mast = document.querySelector(".home-mast");
    window.scrollTo(0, Math.max(0, mast.getBoundingClientRect().height - window.innerHeight));
  });
  const domeBox = await page.evaluate(() => {
    const mast = document.querySelector(".home-mast").getBoundingClientRect();
    return { x: mast.x, width: mast.width, bottom: mast.bottom };
  });
  const dome = await screenshotClip(page, {
    x: Math.max(0, domeBox.x + domeBox.width * 0.72 - 20),
    y: Math.max(0, domeBox.bottom - 40),
    width: 36,
    height: 24,
  });
  expect(dome.luminance, "navy félkör still occupies the compact lower field").toBeLessThan(90);
});

for (const [width, height] of [[390, 844], [768, 900], [1280, 800], [1440, 900]]) {
  test(`${width} home mast type meets WCAG AA against the live grain`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openStable(page, "/");
    const selectors = [
      ".navbar .nav-link",
      ".hero-kicker",
      ".home-banner-title",
      ".home-banner-subtitle",
      ".hero-work-link",
      ".home-banner-area .metric-context",
      ".home-banner-outcomes li",
      ".home-banner-outcomes li:last-child",
      ".navbar button.footer-email",
    ];
    for (const selector of selectors) {
      const sample = await contrastBehind(page, selector);
      expect(sample, selector).toBeTruthy();
      expect(
        sample.ratio,
        `${width} ${selector} contrast ${sample.ratio.toFixed(2)}:1 (need ${sample.need}:1)`
      ).toBeGreaterThanOrEqual(sample.need);
    }
  });
}

for (const [width, expected] of [[1280, 64], [390, 56]]) {
  test(`${width}: header is a sticky white ${expected}px bar with the locked border`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/work/instructure");
    const bar = await page.evaluate(() => {
      const navbar = document.querySelector(".navbar");
      const wrap = navbar.querySelector(".nav-wrap");
      const style = getComputedStyle(navbar);
      return {
        position: style.position,
        background: style.backgroundColor,
        border: style.borderBottomWidth + " " + style.borderBottomColor,
        height: Math.round(wrap.getBoundingClientRect().height),
        breadcrumb: navbar.querySelector(".nav-breadcrumb")?.textContent.replace(/\s+/g, " ").trim() || "",
        oldStrip: Boolean(document.querySelector(".case-breadcrumb")),
        motion: Boolean(document.querySelector("[data-motion-toggle], .site-motion-toggle")),
      };
    });
    expect(bar.position).toBe("sticky");
    expect(bar.background).toBe("rgb(255, 255, 255)");
    expect(bar.border).toBe("1px rgb(230, 232, 233)");
    expect(bar.height).toBe(expected);
    expect(bar.breadcrumb).toContain("Works");
    expect(bar.breadcrumb).toContain("Instructure");
    expect(bar.oldStrip).toBe(false);
    expect(bar.motion).toBe(false);

    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(80);
    const stuckTop = await page.evaluate(() => document.querySelector(".navbar").getBoundingClientRect().top);
    expect(stuckTop).toBe(0);
  });
}
