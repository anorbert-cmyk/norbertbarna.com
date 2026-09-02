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

async function openStable(page, route) {
  await page.goto(route, { waitUntil: "load" });
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
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

for (const route of ["/", "/works", "/work/instructure", "/work/kineticare"]) {
  test(`${route}: footer lock — mesh field, Email pill, Work cases, no form`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openStable(page, route);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page.evaluate(() => {
      const root = document.querySelector("footer.footer-section");
      const chrome = root.querySelector(".footer-chrome");
      const email = root.querySelector("a.footer-email");
      const linkedin = root.querySelector("a.footer-contact-link");
      const work = [...root.querySelectorAll(".footer-nav .footer-col:first-child a")].map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent.trim(),
      }));
      const contact = root.querySelector(".footer-nav .footer-col:last-child");
      const emailStyle = email ? getComputedStyle(email) : null;
      const linkedinStyle = linkedin ? getComputedStyle(linkedin) : null;
      const barStyle = getComputedStyle(root.querySelector(".footer-bar"));
      const emailBox = email ? email.getBoundingClientRect() : null;
      const linkedinBox = linkedin ? linkedin.getBoundingClientRect() : null;
      const hairline = barStyle.borderTopColor;
      const alphaMatch = hairline.match(/rgba?\(\s*17,\s*17,\s*17(?:,\s*([0-9.]+))?\s*\)/);
      return {
        lede: root.querySelector(".footer-lede")?.textContent.trim() || "",
        copyright: root.querySelector(".footer-copyright")?.textContent.trim() || "",
        form: Boolean(root.querySelector("form, .footer-hp, [data-contact-form]")),
        emailHref: email ? email.getAttribute("href") : "",
        emailText: email ? email.textContent.trim() : "",
        linkedinHref: linkedin ? linkedin.getAttribute("href") : "",
        linkedinCount: root.querySelectorAll("a.footer-contact-link").length,
        emailSize: emailBox ? {
          h: Math.round(emailBox.height),
          bg: emailStyle.backgroundColor,
          color: emailStyle.color,
          radius: emailStyle.borderRadius,
        } : null,
        linkedinSize: linkedinBox ? {
          w: Math.round(linkedinBox.width),
          h: Math.round(linkedinBox.height),
          radius: linkedinStyle.borderRadius,
          bg: linkedinStyle.backgroundColor,
        } : null,
        work,
        contactTitle: contact?.querySelector(".footer-col-title")?.textContent.trim() || "",
        contactLinks: [...(contact?.querySelectorAll("a") || [])].map((a) => a.textContent.trim()),
        contactText: contact?.textContent.replace(/\s+/g, " ").trim() || "",
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
    expect(footer.emailHref).toBe("mailto:anorbert@pm.me");
    expect(footer.emailText).toBe("Email");
    expect(footer.linkedinHref).toBe("https://www.linkedin.com/in/barna-norbert/");
    expect(footer.linkedinCount).toBe(1);
    expect(footer.emailSize.h).toBeGreaterThanOrEqual(40);
    expect(footer.emailSize.h).toBeLessThanOrEqual(48);
    expect(footer.emailSize.bg).toBe("rgb(0, 0, 0)");
    expect(footer.emailSize.color).toBe("rgb(255, 255, 255)");
    expect(Number.parseFloat(footer.emailSize.radius)).toBeGreaterThanOrEqual(20);
    expect(footer.linkedinSize.w).toBeGreaterThanOrEqual(28);
    expect(footer.linkedinSize.w).toBeLessThanOrEqual(36);
    expect(footer.linkedinSize.h).toBeGreaterThanOrEqual(28);
    expect(footer.linkedinSize.h).toBeLessThanOrEqual(36);
    expect(footer.linkedinSize.radius).toBe("8px");
    expect(footer.linkedinSize.bg).toBe("rgb(230, 230, 232)");
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
    expect(footer.contactTitle).toBe("Contact");
    expect(footer.contactLinks).toEqual(["anorbert@pm.me"]);
    expect(footer.contactText).toMatch(/Contact/);
    expect(footer.contactText).toMatch(/anorbert@pm\.me/);
    expect(footer.contactText).not.toMatch(/Email/);
    expect(footer.ledeColor).toBe("rgb(17, 17, 17)");
    expect(footer.workColor).toBe("rgb(17, 17, 17)");
    expect(footer.mesh).toBe(true);
    expect(footer.dunes).toBe(false);
    expect(footer.paper).not.toBe("rgb(241, 243, 242)");
    expect(footer.chromeBg).toMatch(/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/);
    expect(footer.hairlineWidth).toBe("1px");
    expect(footer.hairlineAlpha).toBeGreaterThanOrEqual(0.45);

    const email = page.locator("footer a.footer-email");
    const linkedin = page.locator("footer a.footer-contact-link");
    await email.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
    await email.hover({ force: true });
    await expect.poll(() => email.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(26, 26, 26)");
    await expect.poll(() => email.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
    await linkedin.hover({ force: true });
    await expect.poll(() => linkedin.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 0, 0)");
    await expect.poll(() => linkedin.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("no-motion"))).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const mesh = document.querySelector(".footer-mesh");
      const transform = getComputedStyle(mesh).transform;
      return transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)";
    })).toBe(true);
    await email.hover({ force: true });
    await expect.poll(() => email.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(26, 26, 26)");
  });
}

test("1280 home footer: type stays on the pale band, olive bottom, analog grain", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStable(page, "/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(80);
  const boxes = await page.evaluate(() => {
    const footer = document.querySelector("footer.footer-section").getBoundingClientRect();
    const work = document.querySelector(".footer-col-title").getBoundingClientRect();
    const contact = document.querySelector(".footer-nav .footer-col:last-child .footer-col-title").getBoundingClientRect();
    const lede = document.querySelector(".footer-lede").getBoundingClientRect();
    return {
      footer: { x: footer.x, y: footer.y, width: footer.width, height: footer.height },
      work: { x: work.x, y: work.y, width: work.width, height: work.height },
      contact: { x: contact.x, y: contact.y, width: contact.width, height: contact.height },
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
  const contactBand = await screenshotClip(page, sampleBeside(boxes.contact));
  const ledeBand = await screenshotClip(page, sampleBeside(boxes.lede));
  for (const [name, sample] of [["Work", workBand], ["Contact", contactBand], ["lede", ledeBand]]) {
    expect(sample.luminance, `${name} must sit on the pale lilac band, not navy`).toBeGreaterThan(140);
    expect(sample.b, `${name} band should stay cool-lilac, not yellow`).toBeGreaterThan(sample.r - 8);
  }
  const grain = await screenshotClip(page, {
    x: boxes.lede.x,
    y: boxes.lede.y + boxes.lede.height + 18,
    width: 64,
    height: 48,
  });
  expect(grain.stddev, "grain must read as analog speckle, not a smooth fog").toBeGreaterThan(6);
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

test("/contact stays unpublished", async ({ request }) => {
  const response = await request.get("/contact");
  expect(response.status()).toBe(404);
});

test("390 footer stacks ident, CTA, Work, Contact with copyright left and no back-to-top", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const stack = await page.evaluate(() => {
    const ident = document.querySelector(".footer-ident").getBoundingClientRect();
    const work = document.querySelector(".footer-nav .footer-col:first-child").getBoundingClientRect();
    const contact = document.querySelector(".footer-nav .footer-col:last-child").getBoundingClientRect();
    const copy = document.querySelector(".footer-copyright").getBoundingClientRect();
    const footer = document.querySelector("footer.footer-section").getBoundingClientRect();
    return {
      identBottom: ident.bottom,
      workTop: work.top,
      workBottom: work.bottom,
      contactTop: contact.top,
      copyLeft: copy.left,
      footerLeft: footer.left,
      backToTop: Boolean(document.querySelector("footer .back-to-top-wrap")),
    };
  });
  expect(stack.backToTop).toBe(false);
  expect(stack.workTop).toBeGreaterThan(stack.identBottom - 1);
  expect(stack.contactTop).toBeGreaterThan(stack.workBottom - 1);
  expect(stack.copyLeft).toBeLessThan(stack.footerLeft + 80);
});

test("1280 home selected work: Kineticare present, 7/5 grid, no stagger hole, stable title color", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStable(page, "/");
  const grid = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll("#works .home-work-card-wrap")].map((wrap, index) => {
      const box = wrap.getBoundingClientRect();
      const col = getComputedStyle(wrap).gridColumn;
      return {
        index,
        href: wrap.querySelector(".work-title")?.getAttribute("href"),
        top: Math.round(box.top + window.scrollY),
        width: Math.round(box.width),
        col,
      };
    });
    return wraps;
  });
  expect(grid.map((card) => card.href)).toContain("/work/kineticare");
  expect(grid.length).toBe(6);
  for (let i = 0; i < grid.length; i += 2) {
    const wide = grid[i];
    const narrow = grid[i + 1];
    expect(wide.width, "odd cards are the 7-span").toBeGreaterThan(narrow.width + 40);
    expect(Math.abs(wide.top - narrow.top), "pair tops align — no stagger hole").toBeLessThanOrEqual(4);
  }

  const kineticareTitle = page.locator('#works .work-title[href="/work/kineticare"]');
  await kineticareTitle.scrollIntoViewIfNeeded();
  const colorBefore = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  await kineticareTitle.hover();
  await page.waitForTimeout(250);
  const colorAfter = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  expect(colorAfter, "title color must not jump on hover").toBe(colorBefore);
});

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
