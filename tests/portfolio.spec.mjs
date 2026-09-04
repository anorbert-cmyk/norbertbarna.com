import { inflateSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PROJECT_LABEL = "Discuss your project";
const PROJECT_TITLE = "Opens your email app to discuss your project";

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
  "/ai-integration",
  "/hu/ai-integracio",
  "/privacy",
  "/hu/adatvedelem",
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
    // Existing visual locks test a returning visitor; consent has its own fresh-state suite.
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
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

async function footerSeamClip(page) {
  const sample = await page.evaluate(() => {
    const cta = document.querySelector(".footer-cta").getBoundingClientRect();
    const work = document.querySelector(".footer-col-title").getBoundingClientRect();
    const controls = [...document.querySelectorAll(".footer-cta a, .footer-cta button")].map((control) => {
      const box = control.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
    const gutter = 12;
    const x = Math.ceil(Math.max(...controls.map((control) => control.right)) + gutter);
    const y = Math.max(0, Math.floor(cta.bottom - 12));
    return {
      controls, viewport, gutter,
      clip: {
        x, y,
        width: Math.min(80, Math.floor(viewport.width - gutter - x)),
        height: Math.min(viewport.height, Math.ceil(work.top + 12)) - y,
      },
    };
  });
  const { clip, controls, viewport, gutter } = sample;
  expect(controls).toHaveLength(2);
  expect(clip.width, "the empty background sample must remain useful").toBeGreaterThanOrEqual(32);
  expect(clip.width).toBeLessThanOrEqual(80);
  expect(clip.height).toBeGreaterThanOrEqual(8);
  expect(clip.x).toBeGreaterThanOrEqual(0);
  expect(clip.y).toBeGreaterThanOrEqual(0);
  expect(clip.x + clip.width).toBeLessThanOrEqual(viewport.width);
  expect(clip.y + clip.height).toBeLessThanOrEqual(viewport.height);
  for (const control of controls) {
    expect(clip.x).toBeGreaterThanOrEqual(control.right + gutter);
    const intersects = clip.x < control.right && clip.x + clip.width > control.left &&
      clip.y < control.bottom && clip.y + clip.height > control.top;
    expect(intersects, "mesh sample must not contain a contact control or its border").toBe(false);
  }
  return clip;
}

async function footerSeamJump(page, clip) {
  const png = readPng(await page.screenshot({ clip, type: "png" }));
  expect(png.width).toBe(clip.width);
  expect(png.height).toBe(clip.height);
  const row = (y) => {
    let sum = 0;
    for (let x = 0; x < png.width; x += 1) {
      const i = (y * png.width + x) * 4;
      sum += 0.2126 * png.pixels[i] + 0.7152 * png.pixels[i + 1] + 0.0722 * png.pixels[i + 2];
    }
    return sum / png.width;
  };
  let maxJump = 0;
  for (let y = 1; y < png.height; y += 1) {
    maxJump = Math.max(maxJump, Math.abs(row(y) - row(y - 1)));
  }
  return maxJump;
}

function srgbToLin(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(r, g, b) {
  return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseCssColor(color) {
  const match = color.match(/rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (!match) throw new Error(`unparsed color: ${color}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function pixelStats(png) {
  const samples = [];
  for (let y = 1; y < png.height - 1; y += 1) {
    for (let x = 1; x < png.width - 1; x += 1) {
      const i = (y * png.width + x) * 4;
      const r = png.pixels[i];
      const g = png.pixels[i + 1];
      const b = png.pixels[i + 2];
      samples.push({ r, g, b, l: relativeLuminance(r, g, b) });
    }
  }
  samples.sort((a, b) => a.l - b.l);
  const pick = (q) => samples[Math.min(samples.length - 1, Math.floor((samples.length - 1) * q))];
  return {
    darkest: pick(0.05),
    lightest: pick(0.95),
    median: pick(0.5),
  };
}

function colorLuminance(color) {
  return relativeLuminance(color.r, color.g, color.b);
}

function contrastAgainst(fg, bg) {
  return contrastRatio(colorLuminance(fg), bg.l);
}

function hexRgb({ r, g, b }) {
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`;
}

async function sampleBehindGlyphs(page, locator, { includePixels = false } = {}) {
  const box = await locator.boundingBox();
  if (!box || box.width < 4 || box.height < 4) throw new Error("no glyph box");
  await locator.evaluate((el) => {
    const hide = (node) => {
      node.style.color = "transparent";
      node.style.webkitTextFillColor = "transparent";
      node.style.caretColor = "transparent";
    };
    hide(el);
    el.querySelectorAll("*").forEach(hide);
  });
  const png = readPng(await page.screenshot({
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.max(4, Math.ceil(box.width)),
      height: Math.max(4, Math.ceil(box.height)),
    },
    type: "png",
  }));
  await locator.evaluate((el) => {
    const show = (node) => {
      node.style.color = "";
      node.style.webkitTextFillColor = "";
      node.style.caretColor = "";
    };
    show(el);
    el.querySelectorAll("*").forEach(show);
  });
  const stats = pixelStats(png);
  return includePixels ? { ...stats, png, x: Math.max(0, box.x), y: Math.max(0, box.y) } : stats;
}

async function expectHeaderTextAA(page, locator, label, { raster = false } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const runs = await locator.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const result = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const style = getComputedStyle(node.parentElement);
      if (style.visibility !== "visible") continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0)
        .map(({ left, right, top, bottom }) => ({ left, right, top, bottom }));
      if (!rects.length) continue;
      let opacity = 1;
      const backgrounds = [];
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        const parentStyle = getComputedStyle(parent);
        opacity *= Number(parentStyle.opacity);
        backgrounds.push({ color: parentStyle.backgroundColor, image: parentStyle.backgroundImage });
      }
      result.push({
        text: node.textContent.replace(/\s+/g, " ").trim(), color: style.color,
        size: parseFloat(style.fontSize), weight: parseInt(style.fontWeight, 10),
        opacity, backgrounds, rects,
      });
    }
    return result;
  });
  expect(runs.length, `${label}: visible text must actually be measured`).toBeGreaterThan(0);
  const needsRaster = raster || runs.some((run) => run.opacity !== 1 || run.backgrounds.some((layer) => layer.image !== "none"));
  // Range fragments exclude the empty area to the right of wrapped lines.
  // Unlike the legacy 5/95-percentile summaries, every pixel in each text
  // fragment participates in this conservative worst-background comparison.
  const sample = needsRaster ? await sampleBehindGlyphs(page, locator, { includePixels: true }) : null;
  const mix = (foreground, background, alpha) => ({
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  });
  for (const run of runs) {
    const color = parseCssColor(run.color);
    const alpha = color.a * run.opacity;
    const required = run.size >= 24 || (run.size >= 18.6667 && run.weight >= 700) ? 3 : 4.5;
    let worst = Infinity;
    let measured = 0;
    const compare = (background) => {
      worst = Math.min(worst, contrastRatio(colorLuminance(mix(color, background, alpha)), colorLuminance(background)));
      measured += 1;
    };
    if (sample) {
      for (const rect of run.rects) {
        const left = Math.max(0, Math.floor(rect.left - sample.x));
        const right = Math.min(sample.png.width, Math.ceil(rect.right - sample.x));
        const top = Math.max(0, Math.floor(rect.top - sample.y));
        const bottom = Math.min(sample.png.height, Math.ceil(rect.bottom - sample.y));
        for (let y = top; y < bottom; y += 1) {
          for (let x = left; x < right; x += 1) {
            const index = (y * sample.png.width + x) * 4;
            compare({ r: sample.png.pixels[index], g: sample.png.pixels[index + 1], b: sample.png.pixels[index + 2] });
          }
        }
      }
    } else {
      // Flat-field pages need no screenshots: composite every actual ancestor
      // background and the text alpha instead of treating rgba ink as opaque.
      let background = { r: 255, g: 255, b: 255 };
      for (const layer of [...run.backgrounds].reverse()) {
        const fill = parseCssColor(layer.color);
        background = mix(fill, background, fill.a);
      }
      compare(background);
    }
    expect(measured, `${label}: no relevant background pixels for ${run.text}`).toBeGreaterThan(0);
    expect.soft(worst, `${label}: “${run.text}” ${run.size}px/${run.weight}, alpha ${alpha.toFixed(2)}, worst ${worst.toFixed(2)}:1; requires ${required}:1`)
      .toBeGreaterThanOrEqual(required);
  }
}

for (const width of [320, 390, 768, 991, 992, 1280, 1440]) {
  test(`${width} home: every header text meets AA on its worst relevant background`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(/posthog\.com/, (route) => route.abort());
    await openStable(page, "/");
    const text = page.locator(".home-mast .hero-kicker, .home-mast h1, .home-mast .home-banner-subtitle, .home-mast .home-proof-chip, .home-mast .home-employer-list li");
    await expect(text).toHaveCount(10);
    for (let index = 0; index < await text.count(); index += 1) {
      await expectHeaderTextAA(page, text.nth(index), `${width} home text ${index + 1}`, { raster: true });
    }
    const controls = page.locator(".home-mast a.hero-work-link, .navbar a.nav-link, .navbar button.footer-email");
    await expect(controls).toHaveCount(3);
    for (let index = 0; index < await controls.count(); index += 1) {
      const control = controls.nth(index);
      if (!await control.isVisible()) await page.locator(".menu-button").click();
      for (const state of ["default", "hover", "focus"]) {
        await control.evaluate((element) => element.blur());
        await page.mouse.move(0, 899);
        if (state === "hover") await control.hover();
        if (state === "focus") await control.focus();
        await page.waitForTimeout(220);
        await expectHeaderTextAA(page, control, `${width} home control ${index + 1} ${state}`, { raster: true });
      }
    }
  });
}

for (const { width, adjustment } of [320, 992].flatMap((width) => ["text 200%", "WCAG text spacing"].map((adjustment) => ({ width, adjustment })))) {
  test(`${width} home: ${adjustment} preserves header text contrast`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(/posthog\.com/, (route) => route.abort());
    await openStable(page, "/");
    expect(await page.evaluate(() => window.__cumulativeLayoutShift || 0)).toBeLessThan(0.1);
    const mast = page.locator(".home-mast");
    await expect(mast).not.toHaveAttribute("data-text-reflow");
    await expect(page.locator(".home-mast .home-banner-area")).toHaveCSS("display", width < 992 ? "block" : "grid");
    let spacingStyle;
    if (adjustment === "text 200%") {
      const snapshot = await page.evaluate(() => {
        const entries = [...document.querySelectorAll(".navbar, .navbar *, .home-banner-section, .home-banner-section *")]
          .filter((element) => element instanceof HTMLElement)
          .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
        window.__headerContrastFonts = entries.map(({ element }) => ({
          element, value: element.style.getPropertyValue("font-size"),
          priority: element.style.getPropertyPriority("font-size"),
        }));
        for (const { element, size } of entries) element.style.setProperty("font-size", `${size * 2}px`, "important");
        return entries.map(({ element, size }) => ({
          element: `${element.tagName}.${element.className}`, before: size,
          after: parseFloat(getComputedStyle(element).fontSize),
        }));
      });
      expect(snapshot.length).toBeGreaterThan(10);
      for (const entry of snapshot) expect(entry.after, entry.element).toBeCloseTo(entry.before * 2, 2);
      await testInfo.attach("contrast-text-resize-snapshot", { body: JSON.stringify(snapshot, null, 2), contentType: "application/json" });
    } else {
      spacingStyle = await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }" });
    }
    await expect(mast).toHaveAttribute("data-text-reflow", "");
    await expect(page.locator(".home-mast .home-banner-area")).toHaveCSS("display", "block");
    // An intentional user text adjustment is not an unexpected site shift.
    // The normal initial CLS was checked above; retain the shared final guard
    // for any subsequent shifts after the adjustment has been laid out.
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
    const text = page.locator(".home-mast .hero-kicker, .home-mast h1, .home-mast .home-banner-subtitle, .home-mast .home-proof-chip, .home-mast .home-employer-list li");
    await expect(text).toHaveCount(10);
    for (let index = 0; index < await text.count(); index += 1) {
      await expectHeaderTextAA(page, text.nth(index), `${width} ${adjustment} home text ${index + 1}`, { raster: true });
    }
    const controls = page.locator(".home-mast a.hero-work-link, .navbar a.nav-link, .navbar button.footer-email");
    await expect(controls).toHaveCount(3);
    for (let index = 0; index < await controls.count(); index += 1) {
      const control = controls.nth(index);
      const toggle = page.locator(".menu-button");
      if (await control.evaluate((element) => Boolean(element.closest(".navbar")))) {
        if (!await control.isVisible()) await toggle.click();
      } else if (await toggle.getAttribute("aria-expanded") === "true") {
        await toggle.click();
      }
      for (const state of ["default", "hover", "focus"]) {
        await control.evaluate((element) => element.blur());
        await page.mouse.move(0, 899);
        if (state === "hover") await control.hover();
        if (state === "focus") await control.focus();
        await page.waitForTimeout(220);
        await expectHeaderTextAA(page, control, `${width} ${adjustment} home control ${index + 1} ${state}`, { raster: true });
      }
    }
    expect(await page.evaluate(() => window.__cumulativeLayoutShift || 0)).toBeLessThan(0.1);
    if (spacingStyle) await spacingStyle.evaluate((style) => style.remove());
    else await page.evaluate(() => {
      for (const { element, value, priority } of window.__headerContrastFonts) {
        if (value) element.style.setProperty("font-size", value, priority);
        else element.style.removeProperty("font-size");
      }
      delete window.__headerContrastFonts;
    });
    await expect(mast).not.toHaveAttribute("data-text-reflow");
    await expect(page.locator(".home-mast .home-banner-area")).toHaveCSS("display", width < 992 ? "block" : "grid");
    // Removing the deliberate user adjustment is another expected reflow.
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
    await expectHeaderTextAA(page, page.locator(".home-mast .home-employer-list li").first(), `${width} ${adjustment} restored employer list`, { raster: true });
  });
}

for (const route of contentRoutes.filter((route) => route !== "/")) {
  test(`${route}: header and project facts meet AA on the rendered field`, async ({ page }) => {
    await page.route(/posthog\.com/, (request) => request.abort());
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await openStable(page, route);
      const isCase = route.startsWith("/work/");
      if (isCase) {
        const separator = await page.locator(".nav-breadcrumb li + li").evaluate((element) => ({
          color: getComputedStyle(element, "::before").color,
          background: getComputedStyle(element.closest(".navbar")).backgroundColor,
        }));
        const foreground = parseCssColor(separator.color);
        const background = parseCssColor(separator.background);
        expect(background.a, "breadcrumb is on an opaque navigation field").toBe(1);
        const painted = ["r", "g", "b"].map((channel) => foreground[channel] * foreground.a + background[channel] * (1 - foreground.a));
        expect.soft(contrastRatio(relativeLuminance(...painted), colorLuminance(background)), `${width} ${route} breadcrumb separator text contrast`).toBeGreaterThanOrEqual(4.5);
      }
      const selectors = isCase
        ? ".case-study-header h1, .case-study-header .work-category, .case-study-header .banner-text, .case-facts dt, .case-facts dd"
        : route.includes("privacy") || route.includes("adatvedelem")
          ? "main h1, main .summary > p:nth-of-type(-n+2)"
          : "main header h1, main header p";
      const text = page.locator(selectors);
      if (isCase) await expect(text).toHaveCount(11);
      else expect(await text.count()).toBeGreaterThanOrEqual(2);
      for (let index = 0; index < await text.count(); index += 1) {
        const target = text.nth(index);
        const videoBehind = route === "/work/kineticare" && await target.evaluate((element) => Boolean(element.closest(".case-study-header")));
        if (videoBehind) await page.locator(".kineticare-hero video").evaluate((video) => video.pause());
        await expectHeaderTextAA(page, target, `${width} ${route} text ${index + 1}`, { raster: videoBehind });
      }
    }
  });
}

test("Kineticare header: overlay protects text against a synthetic white video frame", async ({ page }) => {
  await page.route(/posthog\.com/, (route) => route.abort());
  for (const width of [320, 390, 768, 991, 992, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/work/kineticare");
    // This is an explicit upper-luminance stress control, not a claim that the
    // shipped video contains a white frame. Leave the real overlay untouched.
    await page.addStyleTag({ content: ".kineticare-hero-bg{background:#fff!important}.kineticare-hero-bg video{visibility:hidden!important}" });
    const text = page.locator(".case-study-header h1, .case-study-header .work-category, .case-study-header .banner-text");
    await expect(text).toHaveCount(3);
    await expect(page.locator(".kineticare-hero-bg")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator(".kineticare-hero-bg video")).toHaveCSS("visibility", "hidden");
    for (let index = 0; index < await text.count(); index += 1) {
      await expectHeaderTextAA(page, text.nth(index), `${width} Kineticare synthetic white frame text ${index + 1}`, { raster: true });
    }
  }
});

async function openStable(page, route) {
  await page.goto(route, { waitUntil: "load" });
  // Poll the FontFaceSet state; retaining its native promise through CDP can be garbage-collected.
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
  await page.waitForFunction(() => {
    if (!document.fonts?.check) return true;
    return document.fonts.check('700 48px "Funnel Display"')
      || document.documentElement.classList.contains("wf-active");
  }, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(100);
}

async function expectContactLabelFit(locator) {
  const size = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    return {
      width: box.width,
      expected: Math.max(44, range.getBoundingClientRect().width +
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
        parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)),
      overflow: element.scrollWidth - element.clientWidth,
      left: box.left,
      right: box.right,
      viewport: document.documentElement.clientWidth,
    };
  });
  expect(size.width).toBeGreaterThanOrEqual(44);
  expect(Math.abs(size.width - size.expected), "contact width must hug its rendered label and padding").toBeLessThanOrEqual(2);
  expect(size.overflow, "contact label must not clip").toBeLessThanOrEqual(1);
  expect(size.left).toBeGreaterThanOrEqual(-1);
  expect(size.right).toBeLessThanOrEqual(size.viewport + 1);
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
  await expect(page.locator("h1")).toHaveText("Selected work");
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
      // Reuse the same scan: severity is not a WCAG conformance level. Header
      // A/AA violations also block when axe rates their impact moderate/minor.
      const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
      const headerBlockers = await page.evaluate((violations) => {
        const failures = [];
        for (const { id, impact, nodes } of violations) {
          for (const { target, failureSummary } of nodes) {
            const evidence = { id, impact, target, failureSummary };
            // This static portfolio has no frame/shadow-root header paths.
            // Fail explicitly if the selector format cannot prove its scope.
            if (target.length !== 1 || typeof target[0] !== "string") {
              failures.push({ ...evidence, reason: "unsupported frame/shadow or compound axe target" });
              continue;
            }
            let element;
            try {
              element = document.querySelector(target[0]);
            } catch {
              failures.push({ ...evidence, reason: "invalid CSS axe target" });
              continue;
            }
            if (!element) failures.push({ ...evidence, reason: "axe target did not resolve; header scope unknown" });
            else if (element.closest(".navbar, .home-mast, main header")) failures.push(evidence);
          }
        }
        return failures;
      }, results.violations.filter(({ tags }) => tags.some((tag) => wcagTags.includes(tag))));
      expect(headerBlockers, "WCAG A/AA header violations at every impact, or unresolved target scope").toEqual([]);
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
        emailTitle: email ? email.getAttribute("title") : "",
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
    expect(footer.emailText).toBe(PROJECT_LABEL);
    expect(footer.emailTitle).toBe(PROJECT_TITLE);
    expect(footer.emailTag).toBe("BUTTON");
    expect(footer.emailType).toBe("button");
    expect(footer.emailCount).toBe(1);
    expect(footer.fakeEmailLink).toBe(false);
    expect(footer.linkedinHref).toBe("https://www.linkedin.com/in/barna-norbert/");
    expect(footer.linkedinCount).toBe(1);
    expect(footer.emailSize.h).toBe(44);
    await expectContactLabelFit(page.locator("footer button.footer-email"));
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
  expect(html).toMatch(/<button\b[^>]*class="footer-email"[^>]*>Discuss your project<\/button>/);
  expect(html).not.toMatch(/<a[^>]*footer-email/);
  expect((html.match(/<button\b[^>]*class="footer-email"[^>]*>Discuss your project<\/button>/g) || []).length).toBe(2);
  expect((html.match(/<button\b[^>]*class="footer-email[^"]*"[^>]*>Discuss your project<\/button>/g) || []).length).toBe(2);
  expect(html).not.toMatch(/open to client engagements|I[’']m open for enterprise/i);
  expect(html).toMatch(/class="hero-engage-link" href="\/ai-integration">Open for AI\/web engagements</);
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
  await expect(page.locator(".home-service-section button.footer-email, .home-service-section a.hero-work-link")).toHaveCount(0);
  await expect(page.locator(".home-service-section h2")).toHaveText(["The Work I Drive"]);
  const serviceLink = page.locator('.home-service-card-title a[href="/ai-integration"]');
  await expect(serviceLink).toBeVisible();
  await expect(serviceLink).toHaveAccessibleName("AI products");
  const serviceHeadings = page.locator(".home-service-card-title");
  await expect(serviceHeadings).toHaveCount(5);
  for (let index = 0; index < await serviceHeadings.count(); index += 1) {
    const heading = serviceHeadings.nth(index);
    await heading.scrollIntoViewIfNeeded();
    // Evaluate the revealed state, not the intentional off-screen entry fade.
    await expect.poll(() => heading.evaluate((element) => {
      let opacity = 1;
      for (let node = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
      return opacity;
    })).toBeGreaterThan(.99);
    await expectHeaderTextAA(page, heading, `service heading ${index + 1}`);
  }
  await serviceLink.focus();
  await expect(serviceLink).toHaveCSS("text-decoration-line", "underline");
  await expect(serviceLink).toHaveCSS("outline-style", "solid");
  await expect(serviceLink).toHaveCSS("outline-width", "3px");
  await expect(email).toBeVisible();
  await expect(headerEmail).toBeVisible();
  for (const locator of [email, headerEmail]) {
    await expect(locator).toHaveText(PROJECT_LABEL);
    await expect(locator).toHaveAccessibleName(PROJECT_LABEL);
    await expect(locator).toHaveAttribute("title", PROJECT_TITLE);
  }
  await expect(email).toHaveJSProperty("tagName", "BUTTON");
  expect(await email.getAttribute("type")).toBe("button");
  expect(await headerEmail.getAttribute("type")).toBe("button");
  expect(await email.getAttribute("href")).toBeNull();
  expect(await headerEmail.getAttribute("href")).toBeNull();

  for (const locator of [headerEmail, email]) {
    const mailRequestPromise = page.waitForRequest((req) => /^mailto:/i.test(req.url()), { timeout: 4000 });
    await locator.click();
    expect((await mailRequestPromise).url()).toBe("mailto:anorbert@pm.me");
    expect(await locator.getAttribute("href")).toBeNull();
    expect(await locator.evaluate((el) => el.outerHTML)).not.toMatch(/mailto:/i);
    expect(await locator.evaluate((el) => el.outerHTML)).not.toMatch(/anorbert@pm\.me/i);
  }

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

  const seam = await footerSeamClip(page);
  const maxJump = await footerSeamJump(page, seam);
  expect(maxJump, "compact mesh must not clip a hard seam through the Email / Work stack").toBeLessThan(12);
  console.log("Empty footer seam sample:", JSON.stringify({ ...seam, maxJump }));
});

test("390 footer seam guard detects a synthetic full-width hard seam", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const seam = await footerSeamClip(page);
  await page.evaluate((y) => {
    // Negative control exists only in this test document, not in site assets.
    const line = document.createElement("div");
    line.setAttribute("data-test-hard-seam", "");
    Object.assign(line.style, {
      position: "fixed", left: "0", right: "0", top: `${y}px`, height: "2px",
      background: "#000", zIndex: "2147483647", pointerEvents: "none",
    });
    document.body.appendChild(line);
  }, Math.floor(seam.y + seam.height / 2));
  const line = await page.locator("[data-test-hard-seam]").boundingBox();
  expect(line.x).toBe(0);
  expect(line.width).toBe(390);
  const maxJump = await footerSeamJump(page, seam);
  expect(maxJump, "a real full-width seam must still violate the unchanged <12 guard").toBeGreaterThanOrEqual(12);
  console.log("Synthetic footer seam negative control:", maxJump);
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
    const cta = document.querySelector(".home-banner-section a.hero-work-link[href='/works']");
    const engage = document.querySelector(".home-banner-section a.hero-engage-link[href='/ai-integration']");
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
      engage: engage?.textContent.trim() || "",
      engageHref: engage?.getAttribute("href") || "",
      dekLines: (() => {
        const dek = document.querySelector(".home-banner-subtitle");
        if (!dek) return 0;
        return Math.round(dek.getBoundingClientRect().height / parseFloat(getComputedStyle(dek).lineHeight));
      })(),
      employerSize: getComputedStyle(document.querySelector(".home-employer-list")).fontSize,
      leftWidth: document.querySelector(".home-mast .banner-left-wrap")?.getBoundingClientRect().width || 0,
      h1Size: getComputedStyle(document.querySelector(".home-banner-title")).fontSize,
      employerY: document.querySelector(".home-employer-list")?.getBoundingClientRect().y || 0,
      chips: [...document.querySelectorAll(".home-proof-chip")].map((li) => li.textContent.trim()),
      employers: [...document.querySelectorAll(".home-employer-list li")].map((li) => li.textContent.replace(/\s+/g, " ").trim()),
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
      emailTitle: email ? email.getAttribute("title") : "",
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
  expect(fold.h1).toBe("Product VP");
  expect(fold.sub).toMatch(/AI products for fintech/);
  expect(fold.cta).toBe("View selected work");
  expect(fold.ctaHref).toBe("/works");
  expect(fold.engage).toBe("Open for AI/web engagements");
  expect(fold.engageHref).toBe("/ai-integration");
  expect(fold.dekLines, "dek wraps at reading width like the Version B lock").toBe(2);
  expect(Number.parseFloat(fold.employerSize), "employer names must read as a type stack").toBeGreaterThanOrEqual(24);
  expect(Number.parseFloat(fold.h1Size), "mast H1 is display size, not the 64px case cap").toBeGreaterThanOrEqual(80);
  expect(fold.leftWidth, "left stack stays a reading column, not the full fold").toBeLessThan(800);
  expect(fold.employerY, "employers sit mid-mast on solid navy, not the lilac fade").toBeGreaterThan(400);
  expect(fold.chips).toEqual(["$52M+ features · Instructure", "1.8→4.8 · Raiffeisen"]);
  expect(fold.employers).toEqual(["BlackRock ·", "Instructure ·", "Raiffeisen ·", "Bitpanda ·", "Balabit ·"]);
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
  expect(fold.emailText).toBe(PROJECT_LABEL);
  expect(fold.emailTitle).toBe(PROJECT_TITLE);
  expect(fold.emailSize.h).toBe(44);
  await expectContactLabelFit(page.locator(".navbar button.footer-email"));
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
    const list = document.querySelector(".home-employer-list").getBoundingClientRect();
    return { x: list.x, y: list.y };
  });
  const outcomesBand = await screenshotClip(page, {
    // Sample navy *beside* the stack — glyphs are --mast-on-navy (light).
    x: Math.max(0, outcomes.x - 20),
    y: outcomes.y + 10,
    width: 14,
    height: 14,
  });
  expect(outcomesBand.luminance, "desktop employers sit on the navy félkör, not a lilac dodge").toBeLessThan(90);
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

test("1440 home mast type meets WCAG AA on navy and lilac", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStable(page, "/");

  const kicker = page.locator(".home-mast .hero-kicker").first();
  const h1 = page.locator(".home-mast h1").first();
  const dek = page.locator(".home-mast .home-banner-subtitle").first();
  const chip = page.locator(".home-mast .home-proof-chip").first();
  const firstEmployer = page.locator(".home-mast .home-employer-list li").first();
  const lastEmployer = page.locator(".home-mast .home-employer-list li").last();
  const email = page.locator(".navbar button.footer-email").first();
  const linkedin = page.locator(".navbar a.footer-contact-link").first();

  const schema = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .flatMap((script) => {
        try { return [JSON.parse(script.textContent)]; } catch { return []; }
      });
    const walk = (value, found = []) => {
      if (!value || typeof value !== "object") return found;
      if (!Array.isArray(value) && value["@type"]) found.push(value);
      for (const child of Object.values(value)) {
        if (child && typeof child === "object") walk(child, found);
      }
      return found;
    };
    const typed = nodes.flatMap((node) => walk(node));
    const person = typed.find((node) => node["@type"] === "Person");
    const profile = typed.find((node) => node["@type"] === "ProfilePage");
    return {
      h1: document.querySelector(".home-mast h1")?.textContent.trim() || "",
      h1Count: document.querySelectorAll("h1").length,
      jobTitle: person?.jobTitle || "",
      profileName: profile?.name || "",
      personName: person?.name || "",
      personDescription: person?.description || "",
    };
  });
  expect(schema.h1).toBe("Product VP");
  expect(schema.h1Count).toBe(1);
  expect(schema.jobTitle).toBe("Product VP");
  expect(schema.profileName).toBe("Norbert Barna — Product VP");
  expect(schema.personName).toBe("Norbert Barna");
  expect(schema.personDescription).toMatch(/Product VP/);
  expect(schema.personDescription).not.toMatch(/design lead/i);

  const kickerRgb = parseCssColor(await kicker.evaluate((el) => getComputedStyle(el).color));
  const h1Rgb = parseCssColor(await h1.evaluate((el) => getComputedStyle(el).color));
  const dekRgb = parseCssColor(await dek.evaluate((el) => getComputedStyle(el).color));
  const chipRgb = parseCssColor(await chip.evaluate((el) => getComputedStyle(el).color));
  const employerRgb = parseCssColor(await firstEmployer.evaluate((el) => getComputedStyle(el).color));
  const lastEmployerRgb = parseCssColor(await lastEmployer.evaluate((el) => getComputedStyle(el).color));
  const emailBorder = parseCssColor(await email.evaluate((el) => getComputedStyle(el).borderTopColor));
  const linkedinBorder = parseCssColor(await linkedin.evaluate((el) => getComputedStyle(el).borderTopColor));

  expect(kickerRgb.a, "kicker must be solid ink, not 62% --muted").toBeGreaterThan(0.92);
  expect(kickerRgb.r + kickerRgb.g + kickerRgb.b, "kicker stays dark on lilac").toBeLessThan(160);
  expect(h1Rgb.r + h1Rgb.g + h1Rgb.b, "H1 stays dark ink on lilac").toBeLessThan(80);
  expect(dekRgb.r + dekRgb.g + dekRgb.b, "dek stays dark ink on lilac").toBeLessThan(80);
  expect(chipRgb.r + chipRgb.g + chipRgb.b, "proof chips stay dark ink on lilac").toBeLessThan(80);
  expect(employerRgb.r + employerRgb.g + employerRgb.b, "InkOnNavy: employers must be light ink").toBeGreaterThan(600);
  expect(lastEmployerRgb.r + lastEmployerRgb.g + lastEmployerRgb.b, "InkOnNavy: last employer must be light ink").toBeGreaterThan(600);

  const kickerBg = await sampleBehindGlyphs(page, kicker);
  const h1Bg = await sampleBehindGlyphs(page, h1);
  const dekBg = await sampleBehindGlyphs(page, dek);
  const chipBg = await sampleBehindGlyphs(page, chip);
  const employerBg = await sampleBehindGlyphs(page, firstEmployer);
  const lastBg = await sampleBehindGlyphs(page, lastEmployer);

  expect(employerBg.median.l, "employers must sit on the navy félkör, not a lilac dodge").toBeLessThan(0.2);
  expect(lastBg.median.l, "last employer must sit on the navy félkör").toBeLessThan(0.2);
  expect(h1Bg.median.l, "H1 must stay on lilac").toBeGreaterThan(0.5);
  expect(kickerBg.median.l, "kicker must stay on lilac").toBeGreaterThan(0.5);
  expect(dekBg.median.l, "dek must stay on lilac").toBeGreaterThan(0.5);
  expect(chipBg.median.l, "proof chips must stay on lilac").toBeGreaterThan(0.5);

  const kickerVsLight = contrastAgainst(kickerRgb, kickerBg.lightest);
  const kickerVsDark = contrastAgainst(kickerRgb, kickerBg.darkest);
  const h1VsLilac = contrastAgainst(h1Rgb, h1Bg.median);
  const dekVsLight = contrastAgainst(dekRgb, dekBg.lightest);
  const chipVsLight = contrastAgainst(chipRgb, chipBg.lightest);
  const employerVsNavy = contrastAgainst(employerRgb, employerBg.darkest);
  const employerVsLight = contrastAgainst(employerRgb, employerBg.lightest);
  const lastVsNavy = contrastAgainst(lastEmployerRgb, lastBg.darkest);

  expect(kickerVsLight, `kicker vs lightest grain ${kickerVsLight.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  expect(kickerVsDark, `kicker vs darkest grain ${kickerVsDark.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  expect(h1VsLilac, `H1 vs lilac ${h1VsLilac.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  expect(dekVsLight, `dek vs lightest grain ${dekVsLight.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  expect(chipVsLight, `chip vs lightest grain ${chipVsLight.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  expect(employerVsNavy, `employer vs darkest navy ${employerVsNavy.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  expect(employerVsLight, `employer vs lightest under glyphs ${employerVsLight.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  expect(lastVsNavy, `last employer vs darkest navy ${lastVsNavy.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);

  const emailBox = await email.boundingBox();
  const linkedinBox = await linkedin.boundingBox();
  const emailFill = await screenshotClip(page, {
    x: emailBox.x + 10,
    y: emailBox.y + 12,
    width: 16,
    height: 10,
  });
  const linkedinFill = await screenshotClip(page, {
    x: linkedinBox.x + 12,
    y: linkedinBox.y + 12,
    width: 12,
    height: 10,
  });
  const emailStroke = contrastRatio(colorLuminance(emailBorder), relativeLuminance(emailFill.r, emailFill.g, emailFill.b));
  const linkedinStroke = contrastRatio(colorLuminance(linkedinBorder), relativeLuminance(linkedinFill.r, linkedinFill.g, linkedinFill.b));
  expect(emailStroke, `Email 1px stroke ${emailStroke.toFixed(2)}`).toBeGreaterThanOrEqual(3);
  expect(linkedinStroke, `LinkedIn 1px stroke ${linkedinStroke.toFixed(2)}`).toBeGreaterThanOrEqual(3);

  const ratios = [
    `kicker ${hexRgb(kickerRgb)} vs light ${hexRgb(kickerBg.lightest)} = ${kickerVsLight.toFixed(2)}`,
    `kicker ${hexRgb(kickerRgb)} vs dark ${hexRgb(kickerBg.darkest)} = ${kickerVsDark.toFixed(2)}`,
    `H1 ${hexRgb(h1Rgb)} vs ${hexRgb(h1Bg.median)} = ${h1VsLilac.toFixed(2)}`,
    `dek vs lightest = ${dekVsLight.toFixed(2)}`,
    `chip vs lightest = ${chipVsLight.toFixed(2)}`,
    `employer ${hexRgb(employerRgb)} vs darkest ${hexRgb(employerBg.darkest)} = ${employerVsNavy.toFixed(2)}`,
    `employer ${hexRgb(employerRgb)} vs lightest ${hexRgb(employerBg.lightest)} = ${employerVsLight.toFixed(2)}`,
    `last employer vs darkest navy = ${lastVsNavy.toFixed(2)}`,
    `Email stroke = ${emailStroke.toFixed(2)}`,
    `LinkedIn stroke = ${linkedinStroke.toFixed(2)}`,
  ].join("\n");
  console.log(ratios);
  expect(ratios).toMatch(/employer .+ = ([4-9]|1[0-9])/);
});

test("390 home mast type meets WCAG AA on lilac, navy sits under the last employer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");

  const kicker = page.locator(".home-mast .hero-kicker").first();
  const h1 = page.locator(".home-mast h1").first();
  const dek = page.locator(".home-mast .home-banner-subtitle").first();
  const chip = page.locator(".home-mast .home-proof-chip").first();
  const firstEmployer = page.locator(".home-mast .home-employer-list li").first();
  const lastEmployer = page.locator(".home-mast .home-employer-list li").last();

  const fold = await page.evaluate(() => {
    const kickerEl = document.querySelector(".hero-kicker");
    const last = document.querySelector(".home-employer-list li:last-child");
    const mast = document.querySelector(".home-mast");
    return {
      kickerSize: kickerEl ? getComputedStyle(kickerEl).fontSize : "",
      lastBottom: last ? last.getBoundingClientRect().bottom : 0,
      mastBottom: mast ? mast.getBoundingClientRect().bottom : 0,
    };
  });
  expect(fold.kickerSize, "compact kicker must stay 13px").toBe("13px");
  expect(fold.lastBottom, "mast must extend past the employers so navy can sit under type").toBeLessThan(fold.mastBottom - 140);

  const kickerRgb = parseCssColor(await kicker.evaluate((el) => getComputedStyle(el).color));
  const h1Rgb = parseCssColor(await h1.evaluate((el) => getComputedStyle(el).color));
  const dekRgb = parseCssColor(await dek.evaluate((el) => getComputedStyle(el).color));
  const chipRgb = parseCssColor(await chip.evaluate((el) => getComputedStyle(el).color));
  const employerRgb = parseCssColor(await firstEmployer.evaluate((el) => getComputedStyle(el).color));
  const lastRgb = parseCssColor(await lastEmployer.evaluate((el) => getComputedStyle(el).color));

  expect(kickerRgb.a, "kicker must be solid ink, not 62% --muted").toBeGreaterThan(0.92);
  expect(kickerRgb.r + kickerRgb.g + kickerRgb.b, "kicker stays dark on lilac").toBeLessThan(160);
  expect(h1Rgb.r + h1Rgb.g + h1Rgb.b, "H1 stays dark ink on lilac").toBeLessThan(80);
  expect(chipRgb.r + chipRgb.g + chipRgb.b, "compact chips stay dark ink").toBeLessThan(80);
  expect(employerRgb.r + employerRgb.g + employerRgb.b, "compact employers stay dark ink").toBeLessThan(80);
  expect(lastRgb.r + lastRgb.g + lastRgb.b, "last compact employer stays dark ink").toBeLessThan(80);

  const kickerBg = await sampleBehindGlyphs(page, kicker);
  const h1Bg = await sampleBehindGlyphs(page, h1);
  const dekBg = await sampleBehindGlyphs(page, dek);
  const chipBg = await sampleBehindGlyphs(page, chip);
  const firstBg = await sampleBehindGlyphs(page, firstEmployer);
  const lastBg = await sampleBehindGlyphs(page, lastEmployer);

  expect(kickerBg.median.l, "kicker must stay on lilac").toBeGreaterThan(0.5);
  expect(h1Bg.median.l, "H1 must stay on lilac").toBeGreaterThan(0.5);
  expect(dekBg.median.l, "dek must stay on lilac").toBeGreaterThan(0.5);
  expect(chipBg.median.l, "chips must stay on lilac").toBeGreaterThan(0.5);
  expect(firstBg.median.l, "first employer must stay on lilac").toBeGreaterThan(0.5);
  expect(lastBg.median.l, "last employer must stay on lilac, not the navy fade").toBeGreaterThan(0.5);
  expect(lastBg.darkest.l, "navy must not reach the last employer glyphs").toBeGreaterThan(0.35);

  const pairs = [
    ["kicker vs lightest grain", contrastAgainst(kickerRgb, kickerBg.lightest)],
    ["kicker vs darkest grain", contrastAgainst(kickerRgb, kickerBg.darkest)],
    ["H1 vs lightest grain", contrastAgainst(h1Rgb, h1Bg.lightest)],
    ["dek vs lightest grain", contrastAgainst(dekRgb, dekBg.lightest)],
    ["chip vs lightest grain", contrastAgainst(chipRgb, chipBg.lightest)],
    ["first employer vs lightest grain", contrastAgainst(employerRgb, firstBg.lightest)],
    ["last employer vs lightest grain", contrastAgainst(lastRgb, lastBg.lightest)],
    ["last employer vs darkest under glyphs", contrastAgainst(lastRgb, lastBg.darkest)],
  ];
  const ratios = pairs.map(([name, value]) => `${name} = ${value.toFixed(2)}`).join("\n");
  console.log(ratios);
  for (const [name, value] of pairs) {
    expect(value, `${name} ${value.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  }

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

async function awardFill(page, card) {
  return card.evaluate((el) => {
    const wrap = el.querySelector(".awards-bg-video-wrap");
    const frame = el.querySelector(".awards-bg-video");
    const video = el.querySelector("video");
    if (!wrap || !frame || !video) return null;
    const cardBox = el.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const videoBox = video.getBoundingClientRect();
    const cover = (inner, outer) => {
      const overlapW = Math.max(0, Math.min(inner.right, outer.right) - Math.max(inner.left, outer.left));
      const overlapH = Math.max(0, Math.min(inner.bottom, outer.bottom) - Math.max(inner.top, outer.top));
      const area = outer.width * outer.height;
      return area ? (overlapW * overlapH) / area : 0;
    };
    const style = getComputedStyle(video);
    return {
      wrapDisplay: getComputedStyle(wrap).display,
      wrapOpacity: Number.parseFloat(getComputedStyle(wrap).opacity),
      wrapFill: cover(wrapBox, cardBox),
      frameFill: cover(frameBox, cardBox),
      videoFill: cover(videoBox, cardBox),
      inset: style.inset,
      objectFit: style.objectFit,
      cardW: cardBox.width,
      cardH: cardBox.height,
      videoW: videoBox.width,
      videoH: videoBox.height,
    };
  });
}

test("1440 experience card hover fills the card with the award video", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStable(page, "/");
  const card = page.locator(".awards-card").first();
  await card.scrollIntoViewIfNeeded();
  const rest = await awardFill(page, card);
  expect(rest.wrapDisplay, "desktop wrap stays in layout").not.toBe("none");
  expect(rest.wrapOpacity, "video stays off until hover").toBeLessThan(0.2);
  await card.hover();
  await expect.poll(() => awardFill(page, card).then((info) => info.wrapOpacity)).toBeGreaterThan(0.9);
  const hot = await awardFill(page, card);
  expect(hot.wrapFill, "wrap covers the card").toBeGreaterThan(0.98);
  expect(hot.frameFill, "500px Webflow frame must not sit as a tight strip").toBeGreaterThan(0.98);
  expect(hot.videoFill, "video file must cover the card").toBeGreaterThan(0.98);
  expect(hot.inset).toMatch(/^(0px|0)$/);
  expect(hot.objectFit).toBe("cover");
});

test.describe("compact award tap", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("390 experience card tap fills the card with the award video", async ({ page }) => {
    await openStable(page, "/");
    const card = page.locator(".awards-card").first();
    await card.scrollIntoViewIfNeeded();
    const rest = await awardFill(page, card);
    expect(rest.wrapDisplay, "compact must not hide the award video wrap").not.toBe("none");
    expect(rest.wrapOpacity, "video stays off until tap").toBeLessThan(0.2);
    await card.tap();
    await expect.poll(() => page.locator(".awards-card").first().evaluate((el) => el.classList.contains("is-award-on"))).toBe(true);
    await expect.poll(() => awardFill(page, card).then((info) => info.wrapOpacity)).toBeGreaterThan(0.9);
    const hot = await awardFill(page, card);
    expect(hot.wrapFill, "wrap covers the compact card").toBeGreaterThan(0.98);
    expect(hot.frameFill, "compact video frame must fill the card, not a tight strip").toBeGreaterThan(0.98);
    expect(hot.videoFill, "compact video file must cover the card").toBeGreaterThan(0.98);
    expect(hot.inset).toMatch(/^(0px|0)$/);
    expect(hot.objectFit).toBe("cover");
  });
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
