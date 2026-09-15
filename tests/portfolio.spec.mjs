import { inflateSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PROJECT_LABEL = "Discuss your project";
const PROJECT_TITLE = "Opens your email app to discuss your project";
const HOME_EMAIL_LABEL = "Email";
const HOME_EMAIL_NAME = "Email — discuss a project";

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
    // Visual and accessibility tests use a returning visitor; arrival has its own fresh-session suite.
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    window.__cumulativeLayoutShift = 0;
    window.__layoutShiftEvidence = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__cumulativeLayoutShift += entry.value;
          if (window.__layoutShiftEvidence.length < 100) window.__layoutShiftEvidence.push({
            time: entry.startTime, value: entry.value, scrollY,
            compositionNav: document.querySelector(".navbar")?.hasAttribute("data-composition-nav"),
            sources: (entry.sources || []).map((source) => ({
              node: source.node ? `${source.node.nodeName}#${source.node.id || ""}.${source.node.className || ""}` : null,
              previous: source.previousRect.toJSON(), current: source.currentRect.toJSON(),
            })),
          });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (page.isClosed() || page.url() === "about:blank") return;
  expect(page.__runtimeErrors, page.__runtimeErrors.join("\n")).toEqual([]);
  const cumulativeLayoutShift = await page.evaluate(() => window.__cumulativeLayoutShift || 0);
  if (cumulativeLayoutShift >= .1) await testInfo.attach("layout-shift-sources", {
    body: JSON.stringify(await page.evaluate(() => ({
      url: location.href, viewport: { width: innerWidth, height: innerHeight },
      cls: window.__cumulativeLayoutShift, fonts: document.fonts.status,
      entries: window.__layoutShiftEvidence,
    })), null, 2), contentType: "application/json",
  });
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
  const savedStyles = await locator.evaluate((el) => {
    const properties = ["transition", "color", "-webkit-text-fill-color", "caret-color"];
    return [el, ...el.querySelectorAll("*")].map((node) => {
      const saved = properties.map((property) => [property, node.style.getPropertyValue(property), node.style.getPropertyPriority(property)]);
      // Sampling must not start a real site's color transition to transparent.
      node.style.setProperty("transition", "none", "important");
      for (const property of properties.slice(1)) node.style.setProperty(property, "transparent", "important");
      return saved;
    });
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
  await locator.evaluate((el, saved) => {
    const nodes = [el, ...el.querySelectorAll("*")];
    nodes.forEach((node, index) => {
      for (const [property, value, priority] of saved[index].slice(1)) {
        if (value) node.style.setProperty(property, value, priority);
        else node.style.removeProperty(property);
      }
      // Commit restored ink while transitions are disabled, then restore the
      // exact original declarations without animating the measurement itself.
      void getComputedStyle(node).color;
      const [property, value, priority] = saved[index][0];
      if (value) node.style.setProperty(property, value, priority);
      else node.style.removeProperty(property);
    });
  }, savedStyles);
  const stats = pixelStats(png);
  return includePixels ? { ...stats, png, x: Math.max(0, box.x), y: Math.max(0, box.y) } : stats;
}

async function readableHomeTarget(page, locator) {
  const target = await locator.evaluate((element) => {
    const mast = element.closest(".home-mast");
    if (!mast) return null;
    return { active: mast.hasAttribute("data-morph-active"),
      role: element.matches(".home-banner-title"), baseline: Boolean(element.closest(".home-mast-baseline")),
      intro: Boolean(element.closest(".home-mast-intro")), action: element.matches(".hero-work-link") };
  });
  if (!target) return locator;
  // Each reading phase is reached by native document scrolling. Never reveal
  // hidden text by changing its styles, opacity or the animation's progress.
  if (target.active && (target.baseline || target.intro)) {
    await page.locator(".home-mast-track").evaluate((track, end) => {
      const box = track.getBoundingClientRect();
      const scene = track.querySelector(".home-mast-scene").getBoundingClientRect();
      scrollTo(0, box.top + scrollY + (end ? box.height - scene.height : 0));
    }, target.intro);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(220);
  } else if (!target.active && target.role) {
    // Static/reflow modes keep one semantic H1 and paint the large role title.
    locator = page.locator(".home-mast-display");
  } else if (!target.active && target.action) {
    locator = page.locator(".home-intro-work");
  }
  return locator;
}

async function expectHeaderTextAA(page, locator, label, { raster = false } = {}) {
  locator = await readableHomeTarget(page, locator);
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
      let blend = "normal";
      const backgrounds = [];
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        const parentStyle = getComputedStyle(parent);
        opacity *= Number(parentStyle.opacity);
        if (parentStyle.mixBlendMode !== "normal") blend = parentStyle.mixBlendMode;
        backgrounds.push({ color: parentStyle.backgroundColor, image: parentStyle.backgroundImage });
      }
      result.push({
        text: node.textContent.replace(/\s+/g, " ").trim(), color: style.color,
        size: parseFloat(style.fontSize), weight: parseInt(style.fontWeight, 10),
        opacity, blend, backgrounds, rects,
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
    expect(["normal", "difference"], `${label}: the checker must understand the actual blend mode`).toContain(run.blend);
    const color = parseCssColor(run.color);
    const alpha = color.a * run.opacity;
    const required = run.size >= 24 || (run.size >= 18.6667 && run.weight >= 700) ? 3 : 4.5;
    let worst = Infinity;
    let measured = 0;
    const compare = (background) => {
      const painted = run.blend === "difference" ? {
        r: Math.abs(background.r - color.r), g: Math.abs(background.g - color.g), b: Math.abs(background.b - color.b),
      } : color;
      worst = Math.min(worst, contrastRatio(colorLuminance(mix(painted, background, alpha)), colorLuminance(background)));
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

async function expectBreadcrumbSeparatorAA(page, label) {
  const separator = page.locator(".nav-breadcrumb li + li");
  const state = await separator.evaluate((element) => ({
    color: getComputedStyle(element, "::before").color,
    content: getComputedStyle(element, "::before").content,
    blend: getComputedStyle(element.closest(".navbar")).mixBlendMode,
  }));
  expect(state.content).toBe('"/"');
  expect(["normal", "difference"]).toContain(state.blend);
  const hiding = await page.addStyleTag({ content: ".nav-breadcrumb li + li::before { color: transparent !important; }" });
  const sample = await sampleBehindGlyphs(page, separator, { includePixels: true });
  await hiding.evaluate((element) => element.remove());
  const ink = parseCssColor(state.color);
  let worst = Infinity;
  for (let index = 0; index < sample.png.pixels.length; index += 4) {
    const background = { r: sample.png.pixels[index], g: sample.png.pixels[index + 1], b: sample.png.pixels[index + 2] };
    const foreground = Object.fromEntries(["r", "g", "b"].map((channel) => {
      const painted = state.blend === "difference" ? Math.abs(background[channel] - ink[channel]) : ink[channel];
      return [channel, painted * ink.a + background[channel] * (1 - ink.a)];
    }));
    worst = Math.min(worst, contrastRatio(colorLuminance(foreground), colorLuminance(background)));
  }
  expect(worst, `${label}: visible breadcrumb separator must meet AA on its actual blended field`).toBeGreaterThanOrEqual(4.5);
}

for (const width of [320, 390, 768, 991, 992, 1280, 1440]) {
  test(`${width} home: every header text meets AA on its worst relevant background`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route(/posthog\.com/, (route) => route.abort());
    await openStable(page, "/");
    const text = page.locator(".home-mast .hero-kicker, .home-mast h1, .home-mast .home-mast-display, .home-mast .home-banner-subtitle, .home-mast .metric-context, .home-mast .home-mast-proof-chips li, .home-mast .home-banner-outcomes li");
    await expect(text).toHaveCount(12);
    for (let index = 0; index < await text.count(); index += 1) {
      const target = await readableHomeTarget(page, text.nth(index));
      if (await target.evaluate((element) => element.matches(".metric-context") && getComputedStyle(element).display === "none")) continue;
      await expect(target).toBeVisible();
      await expectHeaderTextAA(page, target, `${width} home text ${index + 1}`, { raster: true });
    }
    const controls = page.locator(".home-mast[data-morph-active] a.hero-work-link, .home-mast:not([data-morph-active]) a.home-intro-work, .navbar .nav-logo-wrap, .navbar a.nav-link, .navbar a.footer-contact-link, .navbar button.footer-email");
    await expect(page.locator(".navbar a.nav-link")).toHaveText(["Works", "About", "AI integration"]);
    await expect(controls).toHaveCount(7);
    for (let index = 0; index < await controls.count(); index += 1) {
      const control = await readableHomeTarget(page, controls.nth(index));
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

test.describe("native intro contrast", () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const width of [320, 390, 768, 991, 1440]) {
    test(`${width}: scrolled introduction preserves every proof and text AA`, async ({ page }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width, height: 900 });
      await openStable(page, "/");
      await page.locator(".home-mast-intro").scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 180);
      const text = page.locator(".home-mast-intro .hero-kicker, .home-mast-intro .home-mast-display, .home-mast-intro .home-banner-subtitle, .home-mast-intro .metric-context, .home-mast-proof-chips li, .home-banner-outcomes li, .home-intro-work");
      await expect(text).toHaveCount(12);
      for (let index = 0; index < await text.count(); index += 1) {
        const target = await readableHomeTarget(page, text.nth(index));
        if (await target.evaluate((element) => element.matches(".metric-context") && getComputedStyle(element).display === "none")) continue;
        await expectHeaderTextAA(page, target, `${width} scrolled intro text ${index}`, { raster: true });
      }
    });
  }
});

test("home subtitle uses the reference break only on normal desktop text", async ({ page }) => {
  for (const mode of [
    { width: 1280, spacing: false, display: "inline" },
    { width: 390, spacing: false, display: "none" },
    { width: 1280, spacing: true, display: "none" },
  ]) {
    await page.setViewportSize({ width: mode.width, height: 900 });
    await openStable(page, "/");
    const mast = page.locator(".home-mast");
    const subtitle = mast.locator(".home-banner-subtitle");
    await expect(mast).not.toHaveAttribute("data-text-reflow");
    let spacingStyle;
    if (mode.spacing) {
      spacingStyle = await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }" });
      await expect(mast).toHaveAttribute("data-text-reflow", "");
    }
    await readableHomeTarget(page, subtitle);
    await expect(subtitle).toBeVisible();
    await expect(subtitle.locator("br")).toHaveCount(1);
    await expect(subtitle.locator("br")).toHaveCSS("display", mode.display);
    expect(await subtitle.textContent(), "hiding the break must not join the two words").toMatch(/Web3,\s+regulated/);
    expect(await subtitle.innerText()).toMatch(mode.display === "none" ? /Web3, +regulated/ : /Web3,\n\s*regulated/);
    if (spacingStyle) {
      await spacingStyle.evaluate((style) => style.remove());
      await expect(mast).not.toHaveAttribute("data-text-reflow");
      await expect(subtitle.locator("br")).toHaveCSS("display", "inline");
      // Applying and removing user spacing intentionally changes line wrapping.
      await page.waitForTimeout(100);
      await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
    }
  }
});

for (const resize of [
  { name: "compact to desktop", start: { width: 390, height: 844 }, wide: { width: 1280, height: 853 } },
  { name: "short to tall desktop", start: { width: 1280, height: 720 }, wide: { width: 1280, height: 853 } },
]) {
  test(`home authored typography survives ${resize.name} resizing without false text reflow`, async ({ page }) => {
    await page.setViewportSize(resize.start);
    await openStable(page, "/");
    const mast = page.locator(".home-mast");
    await expect(mast).toHaveAttribute("data-reflow-ready", "true");
    await expect(mast).not.toHaveAttribute("data-text-reflow");
    expect(await page.evaluate(() => window.__cumulativeLayoutShift || 0)).toBeLessThan(0.1);
    await mast.evaluate((element) => {
      window.__headerResizeReflowChanges = [];
      window.__headerResizeObserver = new MutationObserver((records) => {
        window.__headerResizeReflowChanges.push(...records.map((record) => record.oldValue));
      });
      window.__headerResizeObserver.observe(element, {
        attributes: true, attributeFilter: ["data-text-reflow"], attributeOldValue: true,
      });
    });
    for (const viewport of [resize.start, resize.wide, resize.start, resize.wide]) {
      await page.setViewportSize(viewport);
      // ResizeObserver and its scheduled typography check must both settle.
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(mast).not.toHaveAttribute("data-text-reflow");
      await expect(page.locator(".home-mast .home-banner-title")).toHaveCSS("font-family", /Inter/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const employer = await readableHomeTarget(page, page.locator(".home-mast .home-highlight-company").first());
      await expect(employer).toBeVisible();
    }
    // These are intentional viewport changes; the initial load was checked above.
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => {
      window.__headerResizeObserver.disconnect();
      return window.__headerResizeReflowChanges;
    }), "ordinary resizing must not trigger even a transient reflow toggle").toEqual([]);
    await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
  });
}

for (const { width, adjustment } of [320, 992].flatMap((width) => ["text 200%", "WCAG text spacing"].map((adjustment) => ({ width, adjustment })))) {
  test(`${width} home: ${adjustment} preserves header text contrast`, async ({ page }, testInfo) => {
    // Pixel-level AA sampling takes about 105 seconds on the slowest hosted
    // runner. Keep every assertion and give the deliberate reflow cleanup
    // enough time to finish before the shared CLS guard runs.
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    await page.route(/posthog\.com/, (route) => route.abort());
    await openStable(page, "/");
    expect(await page.evaluate(() => window.__cumulativeLayoutShift || 0)).toBeLessThan(0.1);
    const mast = page.locator(".home-mast");
    await expect(mast).not.toHaveAttribute("data-text-reflow");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator(".home-mast .home-banner-title")).toHaveCSS("font-family", /Inter/);
    const proofBounds = await page.locator(".home-mast-proof-chips li").evaluateAll((chips) => chips.map((chip) => {
      const box = chip.getBoundingClientRect();
      return {
        label: chip.textContent.trim(),
        clientWidth: chip.clientWidth,
        scrollWidth: chip.scrollWidth,
        inside: [...chip.children].every((part) => {
          const child = part.getBoundingClientRect();
          return child.left >= box.left && child.right <= box.right && child.bottom <= box.bottom;
        }),
      };
    }));
    for (const proof of proofBounds) {
      expect(proof.scrollWidth, proof.label).toBeLessThanOrEqual(proof.clientWidth + 1);
      expect(proof.inside, `${proof.label} must remain inside its chip`).toBe(true);
    }
    // An intentional user text adjustment is not an unexpected site shift.
    // The normal initial CLS was checked above; retain the shared final guard
    // for any subsequent shifts after the adjustment has been laid out.
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
    const text = page.locator(".home-mast .hero-kicker, .home-mast h1, .home-mast .home-mast-display, .home-mast .home-banner-subtitle, .home-mast .metric-context, .home-mast .home-mast-proof-chips li, .home-mast .home-banner-outcomes li");
    await expect(text).toHaveCount(12);
    for (let index = 0; index < await text.count(); index += 1) {
      const target = await readableHomeTarget(page, text.nth(index));
      if (await target.evaluate((element) => element.matches(".metric-context") && getComputedStyle(element).display === "none")) continue;
      await expectHeaderTextAA(page, target, `${width} ${adjustment} home text ${index + 1}`, { raster: true });
    }
    const controls = page.locator(".home-mast[data-morph-active] a.hero-work-link, .home-mast:not([data-morph-active]) a.home-intro-work, .navbar .nav-logo-wrap, .navbar a.nav-link, .navbar a.footer-contact-link, .navbar button.footer-email");
    await expect(page.locator(".navbar a.nav-link")).toHaveText(["Works", "About", "AI integration"]);
    await expect(controls).toHaveCount(7);
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
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    // Removing the deliberate user adjustment is another expected reflow.
    await page.waitForTimeout(100);
    await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
    const restoredLabel = page.locator(".home-mast .metric-context");
    const restoredProof = await restoredLabel.isVisible() ? restoredLabel : page.locator(".home-mast .home-banner-outcomes li").first();
    await expectHeaderTextAA(page, restoredProof, `${width} ${adjustment} restored experience proof`, { raster: true });
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
        await page.evaluate(() => window.PortfolioCaseOpening.finish());
        await expect(page.locator(".case-study-header .banner-section")).toHaveCSS("background-color", "rgb(214, 212, 237)");
        const stage = await page.locator(".case-study-header").boundingBox();
        const facts = await page.locator(".case-facts-section").boundingBox();
        expect(stage.height, "the original product has a complete viewport opening").toBeGreaterThanOrEqual(899);
        expect(facts.y, "the four factual keys follow the opening stage").toBeGreaterThanOrEqual(stage.y + stage.height - 1);
        const breadcrumb = page.locator(".nav-breadcrumb");
        if (width >= 992) {
          await expect(breadcrumb).toBeVisible();
          await expectHeaderTextAA(page, breadcrumb, `${width} ${route} breadcrumb text`, { raster: true });
          await expectBreadcrumbSeparatorAA(page, `${width} ${route}`);
        } else {
          await expect(breadcrumb).toBeHidden();
          await page.locator(".menu-button").click();
          const works = page.locator('.navbar a.nav-link[href="/works"]');
          await expect(works).toBeVisible();
          await expectHeaderTextAA(page, works, `${width} ${route} compact Works destination`, { raster: true });
          await page.locator(".menu-button").click();
        }
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

test("Kineticare adapted stage: separate text stays AA against a synthetic white video frame", async ({ page }) => {
  await page.route(/posthog\.com/, (route) => route.abort());
  for (const width of [320, 390, 768, 991, 992, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/work/kineticare");
    await page.evaluate(() => window.PortfolioCaseOpening.finish());
    // This is an explicit upper-luminance stress control, not a claim that the
    // shipped video contains a white frame. Keep the production text layout.
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
  await expect(page.locator("h1")).toHaveText(/Selected\s*work/);
  const firstCard = page.locator(".work-row").first();
  await firstCard.click({ position: { x: 30, y: 30 } });
  await expect(page).toHaveURL(/\/work\/raiffeisen$/);
});

const projectOrder = ["Raiffeisen", "Instructure", "Bitpanda", "Benker", "SportsGambit", "Kineticare", "OnRobot"];

async function expectTextWithinWidth(locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const state = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const rects = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(walker.currentNode);
      rects.push(...[...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => ({ left: rect.left, right: rect.right })));
    }
    return { rects, left: Math.max(0, box.left), right: Math.min(innerWidth, box.right), client: element.clientWidth || box.width, scroll: element.scrollWidth || box.width };
  });
  expect(state.rects.length, `${label}: actual glyph ranges`).toBeGreaterThan(0);
  expect(state.scroll, `${label}: own box must contain its text`).toBeLessThanOrEqual(state.client + 1);
  for (const rect of state.rects) {
    expect(rect.left, `${label}: visible left edge`).toBeGreaterThanOrEqual(state.left - 1);
    expect(rect.right, `${label}: visible right edge`).toBeLessThanOrEqual(state.right + 1);
  }
}

for (const width of [320, 390, 1280]) {
  test(`${width} Works editorial list preserves project order, landscape artwork and native row actions`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/works");
    await expect(page.locator("main h1")).toHaveText(/Selected\s*work/);
    await expect(page.locator(".work-title")).toHaveText(projectOrder);
    const rows = page.locator(".work-row");
    await expect(rows).toHaveCount(7);
    const sources = [];
    for (let index = 0; index < 7; index += 1) {
      const row = rows.nth(index);
      await row.scrollIntoViewIfNeeded();
      await expect(row.locator("a")).toHaveCount(1);
      const image = row.locator(".work-row-thumb");
      await expect.poll(() => image.evaluate((node) => node.complete && node.naturalWidth > 0)).toBe(true);
      await expect(image).toHaveAttribute("alt", "");
      await expect(image).toHaveAttribute("aria-hidden", "true");
      await expect(image).toHaveAttribute("src", new RegExp(`/geometry/${projectOrder[index].toLowerCase()}\\.960\\.webp$`));
      sources.push(await image.getAttribute("src"));
      const layout = await row.evaluate((element) => {
        const row = element.getBoundingClientRect(), art = element.querySelector(".work-row-visual").getBoundingClientRect();
        const copy = element.querySelector(".work-row-copy").getBoundingClientRect();
        return { row: row.toJSON(), art: art.toJSON(), copy: copy.toJSON(), fit: getComputedStyle(element.querySelector("img")).objectFit,
          nextTop: element.nextElementSibling?.getBoundingClientRect().top };
      });
      expect(layout.art.width / layout.art.height).toBeGreaterThan(1.5);
      expect(layout.fit).toBe("cover");
      if (width < 600) {
        expect(layout.art.width).toBeGreaterThan(layout.row.width * .8);
        expect(layout.copy.top).toBeGreaterThanOrEqual(layout.art.bottom);
      } else {
        expect(layout.art.width).toBeGreaterThan(layout.row.width * .25);
        expect(layout.copy.left).toBeGreaterThanOrEqual(layout.art.right);
      }
      if (layout.nextTop !== undefined) expect(layout.nextTop).toBeGreaterThanOrEqual(layout.row.bottom - 1);
      await expectHeaderTextAA(page, row.locator(".work-title"), `${width} Works title ${index}`, { raster: true });
      await expectHeaderTextAA(page, row.locator(".work-card-summary"), `${width} Works summary ${index}`, { raster: true });
    }
    expect(new Set(sources).size).toBe(7);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const second = rows.nth(1).locator("a");
    await second.focus();
    await expect(rows.nth(1)).toHaveCSS("outline-style", "solid");
    expect(await rows.nth(1).evaluate((row) => parseFloat(getComputedStyle(row).outlineWidth))).toBeGreaterThanOrEqual(3);
    await second.press("Enter");
    await expect(page).toHaveURL(/\/work\/instructure$/);
  });
}

test("320 Works editorial title and project labels reflow at 200% without clipped glyphs", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openStable(page, "/works");
  expect(await page.evaluate(() => window.__cumulativeLayoutShift)).toBeLessThan(.1);
  await page.evaluate(() => {
    const entries = [...document.querySelectorAll("main, main *")].filter((element) => element instanceof HTMLElement)
      .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
    for (const { element, size } of entries) element.style.setProperty("font-size", `${size * 2}px`, "important");
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
  for (const target of await page.locator("main h1, .work-title, .work-card-summary").all()) {
    await expectTextWithinWidth(target, "Works enlarged text");
    await expectHeaderTextAA(page, target, "Works enlarged text", { raster: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
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
    hiddenContent: [...document.querySelectorAll(".work-row, .section-title")]
      .some((element) => Number.parseFloat(getComputedStyle(element).opacity) === 0),
    activeScrollTriggers: window.ScrollTrigger?.getAll().length || 0,
  }));
  expect(state.videosPaused).toBe(true);
  expect(state.hiddenContent).toBe(false);
  expect(state.activeScrollTriggers).toBe(0);
});

for (const width of [390, 1280]) {
  test(`home supporting text stays readable over moving media at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStable(page, "/");
    // A fading layer above glyphs cannot be scored by hiding only the text.
    // These overlays previously reduced E-Commerce to 3.74:1 on desktop.
    for (const fade of await page.locator(".home-about-left-linear, .home-about-right-linear").all()) {
      await expect(fade).toBeHidden();
    }
    for (const label of await page.locator(".home-about-marquee-card > div:last-child").all()) {
      if (await label.isVisible()) await expectHeaderTextAA(page, label, "unfaded sector label");
    }
    // The video can overlap the heading's box; protect it for any frame.
    await page.locator(".home-about-video").evaluate((element) => {
      element.style.background = "#fff";
      element.querySelectorAll("video").forEach((video) => { video.style.visibility = "hidden"; });
    });
    await expectHeaderTextAA(page, page.locator(".home-about-video-text"), "How I work on a white frame", { raster: true });
  });
}

for (const viewport of [viewports[0], viewports[4]]) {
  for (const route of [...contentRoutes, "/codex-aa-not-found"]) {
    test(`${viewport.name}: ${route} has no serious accessibility violation and meets site-wide text AA`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openStable(page, route);
      // Keep stable indices while opening disclosures: filtering by [open]
      // would remove each clicked item and shift the remaining nth locators.
      for (const summary of await page.locator("main details > summary").all()) {
        if (!await summary.evaluate((element) => element.parentElement.open)) await summary.click();
      }
      const results = await new AxeBuilder({ page }).analyze();
      const blockers = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      expect(blockers, blockers.map(({ id, help }) => `${id}: ${help}`).join("\n")).toEqual([]);
      expect(results.violations.filter(({ id }) => id === "color-contrast"), "AA text contrast applies to the whole page at every severity").toEqual([]);
      const uncertain = results.incomplete.filter(({ id }) => id === "color-contrast").flatMap(({ nodes }) => nodes);
      const measured = [];
      for (const { target, any } of uncertain) {
        expect(target, "a contrast target must resolve to one inspectable DOM path").toHaveLength(1);
        expect(typeof target[0]).toBe("string");
        const element = page.locator(target[0]);
        await expect(element).toHaveCount(1);
        const decorativeSymbol = any.some(({ data }) => data?.messageKey === "nonBmp") &&
          await element.evaluate((node) => Boolean(node.closest('[aria-hidden="true"]')));
        if (decorativeSymbol) continue;
        await expectHeaderTextAA(page, element, `${viewport.name} ${route} ${target[0]}`, { raster: true });
        measured.push(target[0]);
      }
      await testInfo.attach("manual-background-contrast-coverage", {
        body: JSON.stringify({ route, viewport: viewport.name, rasterChecked: measured }, null, 2), contentType: "application/json",
      });
      const smoothing = await page.evaluate(() => {
        if (!CSS.supports("-webkit-font-smoothing", "antialiased")) return [];
        return [...document.querySelectorAll("body *")].filter((element) =>
          element.getClientRects().length && getComputedStyle(element).visibility === "visible" &&
          [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) &&
          getComputedStyle(element).webkitFontSmoothing !== "antialiased"
        ).map((element) => `${element.tagName}.${element.className}`);
      });
      expect(smoothing, "visible text inherits consistent smoothing where supported").toEqual([]);
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

test("Kineticare adapted compact stage: navy dek and unclipped facts, no Motion chip", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openStable(page, "/work/kineticare");

  const dekColor = await page.locator(".kineticare-hero .banner-text").evaluate(
    (element) => getComputedStyle(element).color
  );
  expect(dekColor).toBe("rgb(10, 22, 40)");
  await expect(page.locator(".kineticare-hero")).toHaveCSS("background-color", "rgb(214, 212, 237)");

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

async function alignFooterBottom(page) {
  // The brand landing follows the footer; keep its original field aligned to
  // the viewport when sampling footer geometry, palette and pointer motion.
  await page.locator("footer.footer-section").evaluate((footer) =>
    footer.scrollIntoView({ block: "end", inline: "nearest", behavior: "instant" }));
}

function isTransparentFill(color) {
  return /rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/.test(color);
}

for (const width of [320, 390, 768, 991, 1440]) {
  test(`footer text stays AA across its field and interaction states at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await openStable(page, "/");
    await page.locator("footer").scrollIntoViewIfNeeded();
    const footerBox = await page.locator("footer").boundingBox();
    await page.mouse.move(width * .92, Math.min(1090, footerBox.y + footerBox.height * .86));
    await page.waitForTimeout(450);
    const text = page.locator(".editorial-footer-title, .footer-lede, .footer-col-title, .footer-col a, footer .footer-email, footer .footer-contact-link, .footer-copyright, .footer-privacy a, .footer-privacy button");
    await expect(text).toHaveCount(13);
    for (const element of await text.all()) {
      await expectHeaderTextAA(page, element, "footer rendered text", { raster: true });
      if (await element.evaluate((node) => node.matches("a, button"))) {
        await element.hover();
        await expectHeaderTextAA(page, element, "footer hover text", { raster: true });
        await element.focus();
        await expectHeaderTextAA(page, element, "footer focus text", { raster: true });
      }
    }

  });
}

for (const route of ["/", "/works", "/work/instructure", "/work/kineticare"]) {
  test(`${route}: editorial footer preserves native contact, factual links and integrated legal controls`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openStable(page, route);
    const footer = page.locator("footer");
    await expect(footer.locator("form, .footer-mesh, .footer-dunes, .back-to-top-wrap, a.footer-email")).toHaveCount(0);
    await expect(footer.locator(".editorial-footer-title")).toHaveText(/Let’s talk\s*product\./);
    await expect(footer.locator(".footer-lede")).toHaveText("Product VP — I lead AI products in regulated finance and high-trust systems.");
    await expect(footer.locator(".footer-copyright")).toHaveText("© 2026 Norbert Barna");
    await expect(footer.locator(".footer-col-title")).toHaveText(["Work"]);
    await expect(footer.locator(".footer-col a")).toHaveText(["Raiffeisen", "Instructure", "Bitpanda", "Kineticare"]);
    expect(await footer.locator(".footer-col a").evaluateAll((links) => links.map((link) => link.getAttribute("href"))))
      .toEqual(["/work/raiffeisen", "/work/instructure", "/work/bitpanda", "/work/kineticare"]);
    await expect(footer.locator('.footer-privacy a[href="/privacy"]')).toHaveText("Privacy");
    await expect(footer.locator('.footer-privacy a[href="/hu/adatvedelem"]')).toHaveAttribute("lang", "hu");
    await expect(footer.locator("[data-consent-settings]")).toHaveCount(1);
    await expect(footer).toHaveCSS("background-color", "rgb(214, 212, 237)");
    await expect(footer.locator(".footer-bar")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(footer.locator(".footer-bar")).toHaveCSS("border-top-width", "1px");
    await expect(footer.locator(".editorial-footer-art")).toHaveAttribute("aria-hidden", "true");
    const email = footer.locator("button.footer-email"), linkedin = footer.locator("a.footer-contact-link");
    await expect(email).toHaveCount(1);
    await expect(email).toHaveText(PROJECT_LABEL);
    await expect(email).toHaveAttribute("type", "button");
    await expect(email).toHaveAttribute("title", PROJECT_TITLE);
    expect(await email.getAttribute("href")).toBeNull();
    await expect(linkedin).toHaveCount(1);
    await expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/barna-norbert/");
    await expectContactLabelFit(email);
    for (const control of [email, linkedin]) {
      await control.scrollIntoViewIfNeeded();
      const box = await control.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(await control.evaluate((element) => { const box = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)); })).toBe(true);
      await control.hover();
      await expectHeaderTextAA(page, control, `${route} footer hover`, { raster: true });
      await control.focus();
      await expect(control).toHaveCSS("outline-style", "solid");
      expect(await control.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(3);
      await expectHeaderTextAA(page, control, `${route} footer focus`, { raster: true });
    }
    await expect(email).toHaveCSS("background-color", "rgb(10, 22, 40)");
    await expect(email).toHaveCSS("color", "rgb(214, 212, 237)");
    const request = page.waitForRequest((req) => /^mailto:/i.test(req.url()), { timeout: 4000 });
    await email.press("Enter");
    expect((await request).url()).toBe("mailto:anorbert@pm.me");
    expect(await page.content()).not.toMatch(/mailto:|anorbert@pm\.me/i);
  });
}

test("home HTML has no mailto or address; Email button assigns mail without writing the DOM", async ({ page, request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toMatch(/mailto:/i);
  expect(html).not.toMatch(/anorbert@pm\.me/i);
  expect(html).toMatch(/<button\b[^>]*class="footer-email"[^>]*>Discuss your project<\/button>/);
  expect(html).toMatch(/<button\b[^>]*class="footer-email"[^>]*aria-label="Email — discuss a project"[^>]*>Email<\/button>/);
  expect(html).not.toMatch(/<a[^>]*footer-email/);
  expect((html.match(/<button\b[^>]*class="footer-email"[^>]*>Discuss your project<\/button>/g) || []).length).toBe(1);
  expect((html.match(/<button\b[^>]*class="footer-email"[^>]*>Email<\/button>/g) || []).length).toBe(1);
  expect(html).not.toMatch(/open for engagements|open to client engagements|I[’']m open for enterprise/i);
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
  await expect(email).toHaveText(PROJECT_LABEL);
  await expect(email).toHaveAccessibleName(PROJECT_LABEL);
  await expect(headerEmail).toHaveText(HOME_EMAIL_LABEL);
  await expect(headerEmail).toHaveAccessibleName(HOME_EMAIL_NAME);
  for (const locator of [email, headerEmail]) await expect(locator).toHaveAttribute("title", PROJECT_TITLE);
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

for (const width of [390, 1440]) {
  test(`${width} editorial footer keeps text, folded art and targets in readable native flow`, async ({ playwright }, testInfo) => {
    // This page has two explicit measurement phases: ordinary load/scroll/actions
    // retain <0.1 CLS; a deliberate OS preference change is verified in every
    // compositor frame and reports its raw CLS without treating CDP as user input.
    // Linux Chromium can replace LCD glyph antialiasing with grayscale when
    // motion layers are removed. Only this paint comparison fixes the raster
    // mode; production CSS and every pixel, geometry and focus guard stay intact.
    const rasterBrowser = await playwright.chromium.launch({ args: ["--disable-lcd-text", "--enable-automation"] });
    const page = await rasterBrowser.newPage({ baseURL: "http://127.0.0.1:3000", viewport: { width, height: 1100 }, reducedMotion: "no-preference" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(`console.error: ${message.text()}`);
    });
    await page.addInitScript(() => {
      sessionStorage.setItem("nb-arrival-seen-v2", "1");
      localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
      window.__cumulativeLayoutShift = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cumulativeLayoutShift += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    try {
      await openStable(page, "/");
      await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active");
      await alignFooterBottom(page);
      const read = () => page.locator("footer .footer-ident, footer .editorial-footer-art, footer .footer-nav, footer .footer-bar").evaluateAll((elements) => elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      }));
      const before = await read();
      const [ident, art, work, legal] = before;
      for (const box of before) {
        expect(box.width).toBeGreaterThan(0);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width);
      }
      if (width < 600) {
        expect(art.top).toBeGreaterThanOrEqual(ident.bottom);
        expect(work.top).toBeGreaterThanOrEqual(art.bottom);
      } else {
        expect(art.left).toBeGreaterThanOrEqual(ident.right);
        expect(work.top).toBeGreaterThanOrEqual(art.bottom);
      }
      expect(legal.top).toBeGreaterThanOrEqual(Math.max(ident.bottom, art.bottom, work.bottom));
      await page.mouse.move(width * .88, 780);
      await page.waitForTimeout(240);
      expect(await read(), "pointer input does not relocate the editorial close").toEqual(before);
      const email = page.locator("footer button.footer-email");
      await email.focus();
      await expect(email).toBeFocused();
      const ordinaryCLS = await page.evaluate(() => window.__cumulativeLayoutShift);
      expect(ordinaryCLS, "ordinary load, scroll and contact focus retain the existing CLS threshold").toBeLessThan(.1);
      expect(errors).toEqual([]);

      const identBox = await page.locator("footer .footer-ident").boundingBox();
      const cdp = await page.context().newCDPSession(page);
      const { arguments: launchArguments } = await cdp.send("Browser.getBrowserCommandLine");
      expect(launchArguments).toContain("--disable-lcd-text");
      const frames = [], acknowledgements = [];
      cdp.on("Page.screencastFrame", (event) => {
        frames.push({ timestamp: event.metadata.timestamp, bytes: Buffer.from(event.data, "base64") });
        acknowledgements.push(cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }));
      });
      await page.evaluate(() => {
        window.__footerFrames = [];
        window.__captureFooter = true;
        const sample = (time) => {
          window.__footerFrames.push({ time, focused: document.activeElement === document.querySelector("footer button.footer-email"), boxes:
            [...document.querySelectorAll("footer, footer .footer-ident, footer .editorial-footer-art, footer .footer-nav, footer .footer-bar")].map((element) => {
              const box = element.getBoundingClientRect();
              return { x: box.x, y: box.y, width: box.width, height: box.height };
            }) });
          if (window.__captureFooter) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
      await page.waitForTimeout(120);
      const changedAt = Date.now() / 1000;
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(500);
      await cdp.send("Page.stopScreencast");
      await Promise.all(acknowledgements);
      const samples = await page.evaluate(() => { window.__captureFooter = false; return window.__footerFrames; });
      const rawCLS = await page.evaluate(() => window.__cumulativeLayoutShift);
      const reference = readPng(frames[0].bytes);
      const paint = frames.map((frame) => {
        const image = readPng(frame.bytes);
        let substantialPixels = 0, maxChannelDifference = 0;
        for (let y = Math.max(53, Math.ceil(identBox.y)); y < Math.min(1100, Math.floor(identBox.y + identBox.height)); y += 1) {
          for (let x = Math.ceil(identBox.x); x < Math.floor(identBox.x + identBox.width); x += 1) {
            const pixel = (y * image.width + x) * 4;
            const difference = Math.max(...[0, 1, 2].map((channel) => Math.abs(image.pixels[pixel + channel] - reference.pixels[pixel + channel])));
            maxChannelDifference = Math.max(maxChannelDifference, difference);
            // Frame audits measured at most 23/255 at four focused-outline
            // antialias pixels; displacement changes high-contrast glyph edges.
            if (difference > 32) substantialPixels += 1;
          }
        }
        return { timestamp: frame.timestamp, substantialPixels, maxChannelDifference };
      });
      await testInfo.attach("OS-motion-preference-measurements", { body: Buffer.from(JSON.stringify({ rasterMode: "grayscale (--disable-lcd-text)", ordinaryCLS, rawCLS, preferenceCLS: rawCLS - ordinaryCLS, changedAt, samples, paint }, null, 2)), contentType: "application/json" });
      for (let index = 0; index < frames.length; index += 1) await testInfo.attach(`compositor-frame-${index}`, { body: frames[index].bytes, contentType: "image/png" });
      expect(frames.some((frame) => frame.timestamp < changedAt)).toBe(true);
      expect(frames.some((frame) => frame.timestamp >= changedAt)).toBe(true);
      expect(samples.length).toBeGreaterThan(2);
      for (const sample of samples) {
        expect(sample.focused, "Email remains focused in every preference-change frame").toBe(true);
        expect(sample.boxes, "all visible footer geometry stays at its reading position in every frame").toEqual(samples[0].boxes);
      }
      for (const frame of paint) expect(frame.substantialPixels, "every compositor frame preserves the painted contact content").toBe(0);
      await expect(email).toBeFocused();
      await expect(page.locator(".home-mast")).not.toHaveAttribute("data-morph-active");
      await expect(email).toHaveCSS("background-color", "rgb(10, 22, 40)");
      await expect(email).toHaveCSS("color", "rgb(214, 212, 237)");
      expect(errors).toEqual([]);
    } finally { await rasterBrowser.close(); }
  });
}

test("320 editorial footer reflows every label and preserves accessible contact and settings at 200%", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openStable(page, "/works");
  await page.evaluate(() => {
    const entries = [...document.querySelectorAll("footer, footer *")].filter((element) => element instanceof HTMLElement)
      .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
    for (const { element, size } of entries) element.style.setProperty("font-size", `${size * 2}px`, "important");
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
  for (const target of await page.locator(".editorial-footer-title, .footer-lede, .footer-col a, footer .footer-email, footer .footer-contact-link, .footer-copyright, .footer-privacy a, .footer-privacy button").all()) {
    await expectTextWithinWidth(target, "enlarged footer label");
    await expectHeaderTextAA(page, target, "enlarged footer label", { raster: true });
    if (await target.evaluate((element) => element.matches("a,button"))) {
      expect((await target.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  }
  const settings = page.locator("footer [data-consent-settings]");
  await settings.click();
  await expect(page.locator("[data-consent-banner]")).toBeVisible();
  await page.getByRole("button", { name: "Decline analytics", exact: true }).click();
  await expect(settings).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test.describe("editorial footer without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  test("static contact information and native Work links remain keyboard reachable", async ({ page }) => {
    await openStable(page, "/works");
    const footer = page.locator("footer");
    await expect(footer.locator(".editorial-footer-title")).toBeVisible();
    await expect(footer.locator(".footer-col a")).toHaveCount(4);
    await expect(footer.locator(".editorial-footer-art img")).toHaveAttribute("alt", "");
    const work = footer.locator('.footer-col a[href="/work/instructure"]');
    await work.focus();
    await expect(work).toBeFocused();
    await expect(work).toHaveCSS("outline-style", "solid");
    await work.press("Enter");
    await expect(page).toHaveURL(/\/work\/instructure$/);
  });
});

test("home sculpture pointer motion leaves title, proof and native links stationary", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStable(page, "/");
  const read = () => page.locator(".navbar .nav-wrap, .home-banner-title, .home-mast-proof-chips, .home-banner-outcomes, .hero-work-link").evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  await page.mouse.move(150, 180);
  const before = await read();
  await page.mouse.move(1300, 600);
  await page.waitForTimeout(400);
  expect(await read(), "decorative pointer response must not move reading or target geometry").toEqual(before);
});

test("the immersive home remains readable when GSAP is unavailable", async ({ page }) => {
  await page.route("**/assets/js/vendor/gsap.min.js", (route) => route.abort());
  await openStable(page, "/");
  await expect(page.locator(".site-arrival")).toHaveCount(0);
  await expect(page.locator(".home-banner-title")).toHaveText("Product VP");
  await readableHomeTarget(page, page.locator(".home-mast-proof-chips"));
  await expect(page.locator(".home-mast-proof-chips")).toBeVisible();
  await expect(page.locator(".hero-work-link")).toHaveAttribute("href", "/works");
});

test("/contact stays unpublished", async ({ request }) => {
  const response = await request.get("/contact");
  expect(response.status()).toBe(404);
});

test("1280 home selected work: wide landscape media, hiring order and stable title color", async ({ page }) => {
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
        thumbW: box.width,
        thumbH: box.height,
        rowW: row.getBoundingClientRect().width,
        fit: getComputedStyle(thumb).objectFit,
        source: thumb.getAttribute("src"), alt: thumb.getAttribute("alt"), hidden: thumb.getAttribute("aria-hidden"),
      };
    });
    return {
      rows,
      giantCards: Boolean(document.querySelector("#works .work-image-wrap, #works .work-grid")),
    };
  });
  expect(list.giantCards, "home keeps a single ordered list").toBe(false);
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
    expect(row.thumbW, "the project image is a substantial landscape band").toBeGreaterThanOrEqual(row.rowW * .25);
    expect(row.thumbW / row.thumbH).toBeGreaterThanOrEqual(1.5);
    expect(row.fit, "decorative geometry fills the landscape frame").toBe("cover");
    expect(row.source).toMatch(new RegExp(`/geometry/${row.title.toLowerCase()}\\.960\\.webp$`));
    expect(row.alt).toBe("");
    expect(row.hidden).toBe("true");
  }

  const kineticareTitle = page.locator('#works .work-title[href="/work/kineticare"]');
  await kineticareTitle.scrollIntoViewIfNeeded();
  const colorBefore = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  await kineticareTitle.hover();
  await page.waitForTimeout(250);
  const colorAfter = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  expect(colorAfter, "title color must not jump on hover").toBe(colorBefore);
});

async function workRowSnapshot(page) {
  return page.locator(".work-row").evaluateAll((rows) => rows.map((row) => ({
    content: [row, ...row.querySelectorAll(".work-title, .work-card-summary")].map((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        text: element.textContent.trim(), href: element.getAttribute("href"),
        geometry: [box.x, box.y + scrollY, box.width, box.height].map((value) => Math.round(value * 100) / 100),
        transform: style.transform, color: style.color,
      };
    }),
    media: [...row.querySelectorAll(".work-row-thumb, .work-row-arrow")].map((element) => ({
      src: element.getAttribute("src"),
      layout: [element.offsetLeft, element.offsetTop, element.offsetWidth, element.offsetHeight],
      fit: getComputedStyle(element).objectFit, position: getComputedStyle(element).objectPosition,
    })),
    border: ["borderBottomWidth", "borderBottomStyle", "borderBottomColor"].map((property) => getComputedStyle(row)[property]),
    hitArea: ["inset", "transform"].map((property) => getComputedStyle(row.querySelector(".work-title"), "::after")[property]),
  })));
}

async function workMotionState(page, index) {
  return page.locator(".work-row").nth(index).evaluate((row) => {
    function matrix(selector) {
      const transform = getComputedStyle(row.querySelector(selector)).transform;
      return transform === "none" ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform);
    }
    const image = matrix(".work-row-thumb");
    const arrow = matrix(".work-row-arrow");
    return { scale: image.a, scaleY: image.d, y: image.f, x: arrow.e };
  });
}

async function expectWorkMotionAt(page, index, { scale = 1, y = 0, x = 0 } = {}) {
  await expect.poll(async () => {
    const state = await workMotionState(page, index);
    return Math.max(Math.abs(state.scale - scale) * 100, Math.abs(state.scaleY - scale) * 100,
      Math.abs(state.y - y), Math.abs(state.x - x));
  }, { message: "thumbnail and arrow must settle at the intended state" }).toBeLessThan(0.08);
}

async function expectWorkMotionBounds(page, portable) {
  for (let index = 0; index < 6; index += 1) {
    const state = await workMotionState(page, index);
    expect(state.scale).toBeGreaterThanOrEqual(0.9999);
    expect(state.scale).toBeLessThanOrEqual(portable ? 1.0401 : 1.0601);
    expect(Math.abs(state.scale - state.scaleY)).toBeLessThan(0.0001);
    expect(state.y).toBeGreaterThanOrEqual(portable ? -1.01 : -2.01);
    expect(state.y).toBeLessThanOrEqual(0.01);
    expect(state.x).toBeGreaterThanOrEqual(-0.01);
    expect(state.x).toBeLessThanOrEqual(portable ? 3.01 : 4.01);
  }
}

async function expectWorkPaper(row) {
  const paint = await row.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    pseudo: getComputedStyle(element, "::before").content,
  }));
  expect(isTransparentFill(paint.background) || colorLuminance(parseCssColor(paint.background)) > 0.99,
    "the row keeps its quiet reading surface").toBe(true);
  expect(paint.pseudo, "the former colored hover/focus wash must not return").toMatch(/^(none|normal)$/);
}

for (const width of [992, 1440]) {
  test(width + " selected-work hover: thumbnails and arrows respond while text and whole-row links stay still", async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openStable(page, "/");
    const list = page.locator(".work-list");
    await expect(list).toHaveAttribute("data-work-motion", "pointer");
    await expect(list.locator(".work-row")).toHaveCount(6);
    await expect(list.locator(".work-list-surface, .work-list-highlight")).toHaveCount(0);
    await list.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 100));
    const before = await workRowSnapshot(page);
    for (let index = 0; index < 6; index += 1) {
      const row = page.locator(".work-row").nth(index);
      await expect(row.locator("a")).toHaveCount(1);
      await row.hover();
      await expectWorkMotionAt(page, index, { scale: 1.06, y: -2, x: 4 });
      await expectWorkPaper(row);
      await expectHeaderTextAA(page, row.locator(".work-title"), width + " row " + (index + 1) + " hovered title", { raster: true });
      await expectHeaderTextAA(page, row.locator(".work-card-summary"), width + " row " + (index + 1) + " hovered summary", { raster: true });
    }
    expect(await workRowSnapshot(page), "hover leaves text, source crops, grid layout, separators and link hit areas unchanged").toEqual(before);
    const focused = page.locator(".work-row").nth(2);
    await focused.locator(".work-title").focus();
    await focused.hover();
    await page.mouse.move(1, 1);
    await expect(focused.locator(".work-title")).toBeFocused();
    await expectWorkMotionAt(page, 2, { scale: 1.06, y: -2, x: 4 });
    expect(await focused.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(3);
    await expectWorkPaper(focused);
    await expectHeaderTextAA(page, focused.locator(".work-title"), width + " keyboard focus", { raster: true });
    await expectHeaderTextAA(page, focused.locator(".work-card-summary"), width + " mixed pointer/focus summary", { raster: true });
    await focused.locator(".work-title").evaluate((element) => element.blur());
    await expectWorkMotionAt(page, 2);
    await page.locator(".work-row").nth(4).hover();
    await expectWorkMotionAt(page, 4, { scale: 1.06, y: -2, x: 4 });
    await page.mouse.move(1, 1);
    await expectWorkMotionAt(page, 4);
  });
}

test("selected-work repeated hover and interrupted reversals preserve smooth intermediate motion", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // Control browser frames so intermediate-state assertions do not depend on CI speed.
  await page.clock.install();
  await openStable(page, "/");
  const row = page.locator(".work-row").first();
  await expect(page.locator(".work-list")).toHaveAttribute("data-work-motion", "pointer");
  await row.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 150));
  await page.mouse.move(1, 1);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const box = await row.boundingBox();
  const enter = () => page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const leave = () => page.mouse.move(1, 1);
  const normalized = (state) => [
    (state.scale - 1) / 0.06, (state.scaleY - 1) / 0.06, -state.y / 2, state.x / 4,
  ];
  async function expectIntermediate(stage) {
    const state = await workMotionState(page, 0);
    for (const value of normalized(state)) {
      expect(value, stage + ": 64 ms must show motion between the endpoints").toBeGreaterThan(0.08);
      expect(value, stage + ": reusing a hover controller must not jump to its old endpoint").toBeLessThan(0.92);
    }
    return state;
  }
  async function reverseContinuously(move) {
    const before = normalized(await workMotionState(page, 0));
    await move();
    const after = normalized(await workMotionState(page, 0));
    for (let index = 0; index < before.length; index += 1) {
      expect(Math.abs(after[index] - before[index]), "reversal starts from the currently painted transform").toBeLessThan(0.02);
    }
  }
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await enter();
    await page.clock.runFor(64);
    await expectIntermediate("cycle " + (cycle + 1) + " enter");
    await page.clock.runFor(400);
    await expectWorkMotionAt(page, 0, { scale: 1.06, y: -2, x: 4 });
    await leave();
    await page.clock.runFor(64);
    await expectIntermediate("cycle " + (cycle + 1) + " leave");
    await page.clock.runFor(320);
    await expectWorkMotionAt(page, 0);
  }
  await enter();
  await page.clock.runFor(64);
  const entering = await expectIntermediate("interrupted enter");
  await reverseContinuously(leave);
  await page.clock.runFor(32);
  const leaving = await workMotionState(page, 0);
  expect(leaving.scale).toBeGreaterThan(1.001);
  expect(leaving.scale).toBeLessThan(entering.scale);
  await reverseContinuously(enter);
  await page.clock.runFor(32);
  const returning = await workMotionState(page, 0);
  expect(returning.scale).toBeGreaterThan(leaving.scale);
  expect(returning.scale).toBeLessThan(1.059);
  await page.clock.runFor(400);
  await expectWorkMotionAt(page, 0, { scale: 1.06, y: -2, x: 4 });
  await leave();
  await page.clock.runFor(320);
  await expectWorkMotionAt(page, 0);
});

test("selected-work motion reuses its controllers and cleans up repeated reduced-motion and breakpoint transitions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStable(page, "/");
  const list = page.locator(".work-list");
  await expect(list).toHaveAttribute("data-work-motion", "pointer");
  const allocated = await page.evaluate(() => {
    window.__workMotionAnimations = new Set(gsap.globalTimeline.getChildren(true, true, true)
      .filter((animation) => animation.vars.data === "work-list-motion"));
    return window.__workMotionAnimations.size;
  });
  expect(allocated, "the six rows use a bounded preallocated animation set").toBeGreaterThan(0);
  expect(allocated).toBeLessThanOrEqual(6 * 6);
  await list.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 100));
  const rows = await page.locator(".work-row").all();
  for (let step = 0; step < 18; step += 1) {
    const row = rows[step % rows.length];
    await row.scrollIntoViewIfNeeded();
    const box = await row.boundingBox();
    const point = { x: step % 2 ? box.x + 20 : box.x + box.width - 20, y: box.y + box.height / 2 };
    expect(await row.evaluate((element, target) => element.contains(document.elementFromPoint(target.x, target.y)), point),
      "the pointer samples a visible point inside the intended row").toBe(true);
    await page.mouse.move(point.x, point.y);
    expect(await page.evaluate(() => gsap.globalTimeline.getChildren(true, true, true)
      .filter((animation) => animation.vars.data === "work-list-motion")
      .every((animation) => window.__workMotionAnimations.has(animation))), "rapid pointer input must reuse its original controllers").toBe(true);
    await expectWorkMotionBounds(page, false);
  }
  await expectWorkMotionAt(page, 5, { scale: 1.06, y: -2, x: 4 });
  for (const next of [0, 1].flatMap(() => [
    { width: 991, mode: "scroll" }, { reduced: "reduce", mode: null },
    { reduced: "no-preference", mode: "scroll" }, { width: 992, mode: "pointer" },
  ])) {
    await page.evaluate(() => {
      window.__workPreviousAnimations = gsap.globalTimeline.getChildren(true, true, true)
        .filter((animation) => animation.vars.data === "work-list-motion");
      window.__workPreviousTriggers = ScrollTrigger.getAll().filter((trigger) => trigger.trigger?.matches(".work-row"));
    });
    if (next.width) await page.setViewportSize({ width: next.width, height: 1000 });
    else await page.emulateMedia({ reducedMotion: next.reduced });
    if (next.mode) await expect(list).toHaveAttribute("data-work-motion", next.mode);
    else await expect(list).not.toHaveAttribute("data-work-motion");
    await expect.poll(() => page.evaluate(() => {
      const live = gsap.globalTimeline.getChildren(true, true, true);
      return window.__workPreviousAnimations.every((animation) => !live.includes(animation)) &&
        window.__workPreviousTriggers.every((trigger) => !ScrollTrigger.getAll().includes(trigger));
    })).toBe(true);
    const resources = await page.evaluate(() => ({
      animations: gsap.globalTimeline.getChildren(true, true, true).filter((animation) => animation.vars.data === "work-list-motion").length,
      triggers: ScrollTrigger.getAll().filter((trigger) => trigger.trigger?.matches(".work-row")).length,
    }));
    expect(resources.triggers).toBe(next.mode === "scroll" ? 6 : 0);
    expect(resources.animations).toBeLessThanOrEqual(6 * 6);
    if (!next.mode) {
      expect(resources.animations).toBe(0);
      for (let index = 0; index < 6; index += 1) await expectWorkMotionAt(page, index);
    } else {
      expect(resources.animations).toBeGreaterThan(0);
      await expectWorkMotionBounds(page, next.mode === "scroll");
    }
  }
  await page.locator(".work-row").first().hover();
  await expectWorkMotionAt(page, 0, { scale: 1.06, y: -2, x: 4 });
});

for (const fallback of [
  { name: "390 reduced motion", width: 390, reducedMotion: "reduce" },
  { name: "reduced motion", width: 1440, reducedMotion: "reduce" },
  { name: "blocked GSAP", width: 1440, blockGsap: true },
  { name: "no JavaScript", width: 1440, javaScriptEnabled: false },
]) {
  test.describe("selected-work fallback: " + fallback.name, () => {
    test.use({ viewport: { width: fallback.width, height: 1000 }, javaScriptEnabled: fallback.javaScriptEnabled !== false });
    test("retains the native whole-row link and static keyboard focus", async ({ page }) => {
      if (fallback.blockGsap) await page.route("**/assets/js/vendor/gsap.min.js", (route) => route.abort());
      await page.emulateMedia({ reducedMotion: fallback.reducedMotion || "no-preference" });
      await openStable(page, "/");
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches))
        .toBe(fallback.reducedMotion === "reduce");
      await expect(page.locator(".work-list")).not.toHaveAttribute("data-work-motion");
      await expect(page.locator(".work-list-surface, .work-list-highlight")).toHaveCount(0);
      const row = page.locator(".work-row").first();
      const link = row.locator("a.work-title");
      await link.focus();
      await expect(link).toBeFocused();
      const focus = await row.evaluate((element) => {
        const style = getComputedStyle(element);
        return { width: parseFloat(style.outlineWidth), style: style.outlineStyle };
      });
      expect(focus.width).toBeGreaterThanOrEqual(3);
      expect(focus.style).toBe("solid");
      await expectWorkMotionAt(page, 0);
      await expectWorkPaper(row);
      await expectHeaderTextAA(page, link, fallback.name + " focus title", { raster: true });
      await link.press("Enter");
      await expect(page).toHaveURL(/\/work\/raiffeisen$/);
      await openStable(page, "/");
      const second = page.locator(".work-row").nth(1);
      await second.scrollIntoViewIfNeeded();
      const box = await second.boundingBox();
      await second.click({ position: { x: box.width - 8, y: box.height / 2 } });
      await expect(page).toHaveURL(/\/work\/instructure$/);
    });
  });
}

for (const width of [390, 1440]) test.describe(width + " selected-work touch", () => {
  test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
  test("native scroll moves only the thumbnail and arrow, with focus taking precedence", async ({ page }) => {
    await openStable(page, "/");
    await expect(page.locator(".work-list")).toHaveAttribute("data-work-motion", "scroll");
    await expect(page.locator(".work-list-surface, .work-list-highlight")).toHaveCount(0);
    const row = page.locator(".work-row").nth(2);
    const scrollRow = async (position) => row.evaluate((element, target) => {
      const box = element.getBoundingClientRect();
      const top = box.top + scrollY;
      const destination = target === "before" ? top - innerHeight * 0.85 :
        target === "peak" ? top + box.height / 2 - innerHeight * 0.55 : top + box.height - innerHeight * 0.25;
      window.scrollTo(0, destination);
    }, position);
    await scrollRow("before");
    await expectWorkMotionAt(page, 2);
    const before = await workRowSnapshot(page);
    await scrollRow("peak");
    await expectWorkMotionAt(page, 2, { scale: 1.04, y: -1, x: 3 });
    await expectWorkMotionBounds(page, true);
    await expectWorkPaper(row);
    await expectHeaderTextAA(page, row.locator(".work-title"), width + " scroll-active title", { raster: true });
    await expectHeaderTextAA(page, row.locator(".work-card-summary"), width + " scroll-active summary", { raster: true });
    await row.locator(".work-title").focus();
    expect(await row.evaluate((element) => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(3);
    await scrollRow("after");
    await expectWorkMotionAt(page, 2, { scale: 1.04, y: -1, x: 3 });
    await row.locator(".work-title").evaluate((element) => element.blur());
    await expectWorkMotionAt(page, 2);
    await scrollRow("peak");
    await expectWorkMotionAt(page, 2, { scale: 1.04, y: -1, x: 3 });
    expect(await workRowSnapshot(page), "native scrolling leaves all reading content and link geometry still").toEqual(before);
  });
  test("the first tap follows a whole-row link without arming a hover state", async ({ page }) => {
    await openStable(page, "/");
    await expect(page.locator(".work-list")).toHaveAttribute("data-work-motion", "scroll");
    const row = page.locator(".work-row").first();
    await row.scrollIntoViewIfNeeded();
    const box = await row.boundingBox();
    await row.tap({ position: { x: box.width - 8, y: box.height / 2 } });
    await expect(page).toHaveURL(/\/work\/raiffeisen$/);
  });
});

test("1440 home opening: original centered artwork and semantic role lead into the split composition", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStable(page, "/");
  await expect(page.locator(".home-mast h1")).toHaveText("Product VP");
  await expect(page.locator(".home-mast-statement")).toHaveText("Product with purpose.");
  await expect(page.locator(".home-mast-lettering")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".home-mast-sculpture")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".home-mast-canvas")).toHaveCount(1);
  await expect(page.locator(".home-mast-fallback")).toHaveAttribute("src", /hero-chevron\.svg$/);
  await expect(page.locator(".hero-work-link")).toHaveAttribute("href", "/works");
  await expect(page.locator(".home-mast-scroll")).toHaveAttribute("href", "#home-introduction");
  await expect(page.locator(".home-banner-title")).toHaveCSS("font-family", /Inter/);
  const layout = await page.evaluate(() => {
    const stage = document.querySelector(".home-mast-scene").getBoundingClientRect();
    const art = document.querySelector(".home-mast-sculpture").getBoundingClientRect();
    const track = document.querySelector(".home-mast-track").getBoundingClientRect();
    return { stageHeight: stage.height, centered: Math.abs(art.left + art.width / 2 - innerWidth / 2),
      trackHeight: track.height, introInside: Boolean(document.querySelector(".home-mast-scene > .home-mast-intro")), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(layout.stageHeight).toBeCloseTo(900, 0);
  expect(layout.centered).toBeLessThan(1);
  expect(layout.trackHeight, "the native track supplies scroll distance for the composition change").toBeGreaterThan(layout.stageHeight);
  expect(layout.introInside).toBe(true);
  expect(layout.overflow).toBeLessThanOrEqual(1);
  await expect(page.locator(".home-banner-title")).toBeInViewport();
  await expect(page.locator(".hero-work-link")).toBeInViewport();
  await expect(page.locator(".home-mast .hero-kicker")).toHaveText("Norbert Barna");
  await expect(page.locator(".home-banner-subtitle")).toHaveText(/AI products for fintech, Web3,\s*regulated teams — strategy to ship\./);
  await expect(page.locator(".home-mast-proof-chips li")).toHaveText(["Multi-country bankingRaiffeisen", "Enterprise EdTech AIInstructure"]);
  await expect(page.locator(".home-banner-outcomes li")).toHaveText(["BlackRock", "Instructure", "Raiffeisen", "Bitpanda", "Balabit"]);
  const email = page.locator(".navbar button.footer-email");
  await expect(email).toHaveAttribute("type", "button");
  await expect(email).not.toHaveAttribute("href");
  await expect(email).toHaveAttribute("aria-label", HOME_EMAIL_NAME);
  await expect(email).toHaveAttribute("title", PROJECT_TITLE);
  await expect(page.locator(".navbar .home-nav-wordmark")).toHaveText("NORBERT.BARNA");
  await expect(page.locator(".navbar .home-nav-progress")).toHaveAttribute("aria-hidden", "true");
});

for (const width of [390, 992, 1280]) {
test(`${width} first-visit scene keeps role and primary action above the consent banner`, async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("bn-analytics-consent-v1"));
  await page.setViewportSize({ width, height: 720 });
  await openStable(page, "/");
  await page.waitForSelector("#portfolio-consent, [data-consent-banner]", { state: "visible", timeout: 5000 }).catch(() => {});
  const fold = await page.evaluate(() => {
    const banner = document.querySelector("[data-consent-banner], .consent-banner, #portfolio-consent");
    const bannerBox = banner && !banner.hidden ? banner.getBoundingClientRect() : null;
    const items = [...document.querySelectorAll(".home-banner-outcomes li")].map((li) => {
      const box = li.getBoundingClientRect();
      return {
        name: li.textContent.trim(),
        top: box.top,
        bottom: box.bottom,
        covered: Boolean(bannerBox && box.bottom > bannerBox.top + 2),
      };
    });
    const active = document.querySelector(".home-mast").hasAttribute("data-morph-active");
    const action = document.querySelector(active ? ".hero-work-link" : ".home-intro-work");
    const role = document.querySelector(active ? ".home-banner-title" : ".home-mast-display");
    const actionBox = action.getBoundingClientRect();
    const actionHit = document.elementFromPoint(actionBox.left + actionBox.width / 2, actionBox.top + actionBox.height / 2);
    return { items, bannerTop: bannerBox ? bannerBox.top : null, ctaBottom: actionBox.bottom, actionReceivesPointer: action.contains(actionHit),
      roleBottom: role.getBoundingClientRect().bottom,
      introTop: document.querySelector(".home-mast-intro").getBoundingClientRect().top };
  });
  expect(fold.items.map((item) => item.name)).toEqual(["BlackRock", "Instructure", "Raiffeisen", "Bitpanda", "Balabit"]);
  expect(fold.bannerTop, "this regression must exercise the actual first-visit consent banner").not.toBeNull();
  expect(fold.ctaBottom + 8, "primary action and focus outline must remain above consent").toBeLessThanOrEqual(fold.bannerTop ?? 720);
  expect(fold.roleBottom + 8, "the Product VP role remains above consent").toBeLessThanOrEqual(fold.bannerTop ?? 720);
  expect(fold.actionReceivesPointer, "the visible Works action receives the first pointer or touch input").toBe(true);
  for (const item of fold.items) {
    expect(item.top, `${item.name} stays inside the semantic introduction`).toBeGreaterThanOrEqual(fold.introTop);
  }
});
}

test("1440 home mast and text navigation meet WCAG AA on their live backgrounds", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStable(page, "/");

  const kicker = page.locator(".home-mast .hero-kicker").first();
  const h1 = page.locator(".home-mast h1").first();
  const firstBullet = page.locator(".home-mast .home-banner-outcomes li").first();
  const lastBullet = page.locator(".home-mast .home-banner-outcomes li").last();
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
      personImage: typeof person?.image === "string" ? person.image : person?.image?.url || "",
      personDescription: person?.description || "",
    };
  });
  expect(schema.h1).toBe("Product VP");
  expect(schema.h1Count).toBe(1);
  expect(schema.jobTitle).toBe("Product VP");
  expect(schema.profileName).toBe("Norbert Barna — Product VP");
  expect(schema.personName).toBe("Norbert Barna");
  expect(schema.personImage).toBe("https://www.barnanorbert.com/assets/images/og/norbert-barna.jpg");
  expect(schema.personDescription).toMatch(/Product VP/);
  expect(schema.personDescription).not.toMatch(/design lead/i);

  for (const [name, text] of [["kicker", kicker], ["title", h1], ["first employer", firstBullet], ["last employer", lastBullet], ["email", email], ["LinkedIn", linkedin]]) {
    await expectHeaderTextAA(page, text, `1440 immersive ${name}`, { raster: true });
  }
});

test("390 immersive header keeps every label readable and inside the content flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");
  await readableHomeTarget(page, page.locator(".home-mast .hero-kicker"));
  const labels = page.locator(".home-mast .hero-kicker, .home-mast .home-mast-display, .home-mast .home-banner-subtitle, .home-mast .home-highlight-company");
  await expect(labels).toHaveCount(8);
  const bounds = await labels.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    const mast = element.closest(".home-mast").getBoundingClientRect();
    return { text: element.textContent.trim(), width: box.width, left: box.left, right: box.right,
      inside: box.top >= mast.top && box.bottom <= mast.bottom + 1 };
  }));
  for (const box of bounds) {
    expect(box.width, box.text).toBeGreaterThan(0);
    expect(box.left, box.text).toBeGreaterThanOrEqual(0);
    expect(box.right, box.text).toBeLessThanOrEqual(390);
    expect(box.inside, `${box.text} stays inside the opening`).toBe(true);
  }
  for (let index = 0; index < await labels.count(); index += 1) {
    await expectHeaderTextAA(page, labels.nth(index), `390 immersive label ${index}`, { raster: true });
  }
});

const experienceFacts = [
  ["Vice President", "BlackRock", "2026–Present"],
  ["Creative Team Lead", "Instructure", "2023–2025"],
  ["Senior Product Designer", "Instructure", "2022–2023"],
  ["Product Lead", "Raiffeisen Bank International", "2020–2022"],
  ["Staff Designer", "Balabit / Balasys / One Identity", "2014–2020"],
];

async function expectEditorialExperience(page, { pointer = false } = {}) {
  const section = page.locator(".editorial-experience");
  await expect(section.getByRole("heading", { level: 2 })).toHaveText("Professional experience");
  await expect(section.getByRole("list")).toHaveCount(1);
  const rows = section.getByRole("listitem");
  await expect(rows).toHaveCount(5);
  expect(await rows.evaluateAll((elements) => elements.map((element) =>
    [".awards-card-title", ".awards-card-text", ".awards-year"].map((selector) => element.querySelector(selector).textContent.trim())))).toEqual(experienceFacts);
  await expect(section.locator('video, button, a, [tabindex="0"], [role="button"]')).toHaveCount(0);
  await expect(section.locator(".editorial-experience-art")).toHaveAttribute("aria-hidden", "true");
  await expect(section.locator(".editorial-experience-art img")).toHaveAttribute("alt", "");
  for (const row of await rows.all()) {
    await row.scrollIntoViewIfNeeded();
    for (const target of await row.locator(".awards-card-title, .awards-card-text, .awards-year").all()) {
      await expectTextWithinWidth(target, "experience fact");
      await expectHeaderTextAA(page, target, "experience fact", { raster: true });
    }
    if (pointer) {
      const read = () => row.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, top: box.top + scrollY, width: box.width, height: box.height,
          text: element.textContent.replace(/\s+/g, " ").trim(), transform: getComputedStyle(element).transform };
      });
      const before = await read();
      await row.hover();
      await page.waitForTimeout(160);
      expect(await read(), "noninteractive experience facts do not move on hover").toEqual(before);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

for (const width of [320, 390, 1440]) {
  test(`${width} editorial experience preserves all five factual rows, AA text and static pointer behavior`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/");
    await expectEditorialExperience(page, { pointer: true });
  });
}

test("editorial experience stays readable with reduced motion and 200% mobile text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openStable(page, "/");
  await page.evaluate(() => {
    const entries = [...document.querySelectorAll(".editorial-experience, .editorial-experience *")].filter((element) => element instanceof HTMLElement)
      .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
    for (const { element, size } of entries) element.style.setProperty("font-size", `${size * 2}px`, "important");
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__cumulativeLayoutShift = 0; });
  await expectTextWithinWidth(page.locator("#experience-title"), "enlarged experience heading");
  await expectEditorialExperience(page, { pointer: true });
});

test.describe("editorial experience without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  test("all facts are available without activating a video or control", async ({ page }) => {
    await openStable(page, "/");
    await expectEditorialExperience(page);
  });
});

for (const width of [1280, 390]) {
  test(`${width}: case utility keeps real progress and ${width < 992 ? "a stable compact bar" : "its desktop journey"} with keyboard navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/work/instructure");
    const bar = await page.evaluate(() => {
      const navbar = document.querySelector(".navbar");
      const wrap = navbar.querySelector(".nav-wrap");
      const style = getComputedStyle(navbar);
      return {
        position: style.position,
        height: Math.round(wrap.getBoundingClientRect().height),
        breadcrumb: navbar.querySelector(".nav-breadcrumb")?.textContent.replace(/\s+/g, " ").trim() || "",
        oldStrip: Boolean(document.querySelector(".case-breadcrumb")),
        motion: Boolean(document.querySelector("[data-motion-toggle], .site-motion-toggle")),
      };
    });
    expect(bar.position).toBe("fixed");
    expect(bar.height).toBeGreaterThanOrEqual(44);
    expect(bar.breadcrumb).toContain("Works");
    expect(bar.breadcrumb).toContain("Instructure");
    expect(bar.oldStrip).toBe(false);
    expect(bar.motion).toBe(false);

    await page.evaluate(() => window.scrollTo(0, 1200));
    const progress = await page.evaluate(() => String(Math.max(1, Math.round(scrollY / (document.documentElement.scrollHeight - innerHeight) * 100))).padStart(3, "0"));
    await expect(page.locator(".home-nav-progress span")).toHaveText(progress);
    const travelled = await page.locator(".navbar").boundingBox();
    if (width < 992) expect(Math.abs(travelled.y), "compact case navigation stays at the top").toBeLessThanOrEqual(.5);
    else expect(travelled.y, "desktop case navigation follows native document progress").toBeGreaterThan(0);
    expect(travelled.y + travelled.height).toBeLessThanOrEqual(900);
    await page.keyboard.press("Tab");
    await page.locator(".navbar .nav-logo-wrap").focus();
    await expect.poll(() => page.locator(".navbar").evaluate((element) => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
    if (width < 992) await page.locator(".menu-button").click();
    const works = page.locator(width < 992 ? '.navbar .nav-link[href="/works"]' : '.nav-breadcrumb a[href="/works"]');
    await expect(works).toBeVisible();
    await works.click();
    await expect(page).toHaveURL(/\/works$/);
  });
}
