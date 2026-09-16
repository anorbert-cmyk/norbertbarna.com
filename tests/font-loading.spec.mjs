import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "assets/fonts/manifest.json"), "utf8"));
const canonicalPaths = [...readFileSync(resolve(root, "sitemap.xml"), "utf8").matchAll(/<loc>(.*?)<\/loc>/g)]
  .map((match) => new URL(match[1]).pathname);
const htmlFor = (route) => resolve(root, route === "/" ? "index.html" : `${route.slice(1)}.html`);
const cssSource = readFileSync(resolve(root, "assets/css/fonts.css"), "utf8");
const cssDigest = createHash("sha256").update(cssSource).digest("hex").slice(0, 12);
const sample = "Norbert Barna ÁÉÍÓÖŐÚÜŰ árvíztűrő tükörfúrógép";

// Canvas widths captured from the original Google-served faces before the change,
// once both Latin and Latin-ext were loaded; these are font metrics, not snapshots
// regenerated from the implementation under test.
const originalWidths = { Inter: 1579.76416015625, "Funnel Display": 1578.87890625 };

test("every canonical page and 404 load licensed, content-hashed fonts directly from the head", () => {
  expect(canonicalPaths).toHaveLength(14);
  expect(readFileSync(resolve(root, `assets/css/fonts.${cssDigest}.css`), "utf8")).toBe(cssSource);
  for (const route of [...canonicalPaths, "/404"]) {
    const html = readFileSync(htmlFor(route), "utf8");
    const head = html.split("</head>")[0];
    expect(head, route).not.toMatch(/WebFont\.load|assets\/js\/webfont\.js|fonts\.(?:googleapis|gstatic)\.com/);
    expect(head, route).toContain(`/assets/css/fonts.${cssDigest}.css`);
    expect(head, route).toMatch(/rel="preload"[^>]+inter-latin\.[a-f0-9]{12}\.woff2[^>]+as="font"[^>]+crossorigin="anonymous"/);
  }
  expect(manifest.fonts).toHaveLength(4);
  for (const font of manifest.fonts) {
    const bytes = readFileSync(resolve(root, "assets/fonts", font.file));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(font.sha256);
    expect(bytes.length).toBe(font.bytes);
    expect(font.file).toContain(`.${font.sha256.slice(0, 12)}.`);
    expect(bytes.subarray(0, 4).toString()).toBe("wOF2");
    expect(cssSource).toContain(`../fonts/${font.file}`);
    expect(new URL(font.source).host).toBe("fonts.gstatic.com");
  }
  for (const family of ["inter", "funnel-display"]) {
    expect(readFileSync(resolve(root, `assets/fonts/${family}-OFL.txt`), "utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
  }
  expect(cssSource).not.toMatch(/font-weight:\s*\d+\s+\d+/);
  expect(cssSource.match(/font-display: swap/g)).toHaveLength(28);
});

for (const route of ["/", "/work/instructure", "/hu/ai-integracio", "/hu/adatvedelem", "/does-not-exist"]) {
  test(`native fonts preserve English/Hungarian metrics without JavaScript or Google access on ${route}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const externalFonts = [];
    const localFonts = [];
    await page.route(/https?:\/\/fonts\.(?:googleapis|gstatic)\.com\//, (request) => {
      externalFonts.push(request.request().url());
      return request.abort();
    });
    page.on("request", (request) => { if (/\/assets\/fonts\/.*\.woff2$/.test(request.url())) localFonts.push(request.url()); });
    await page.goto(`${baseURL}${route}`, { waitUntil: "load" });
    const metrics = await page.evaluate(async (sampleText) => {
      await document.fonts.ready;
      const results = {};
      for (const family of ["Inter", "Funnel Display"]) {
        await document.fonts.load(`700 64px "${family}"`, sampleText);
        const canvas = document.createElement("canvas").getContext("2d");
        canvas.font = `700 64px "${family}"`;
        results[family] = canvas.measureText(sampleText).width;
      }
      return { widths: results, faces: [...document.fonts].filter((font) => font.status === "loaded").map((font) => ({family: font.family.replace(/["']/g, ""), range: font.unicodeRange})) };
    }, sample);
    expect(externalFonts).toEqual([]);
    expect(new Set(localFonts).size).toBe(4);
    for (const [family, width] of Object.entries(originalWidths)) {
      expect(metrics.widths[family], `${family} matches the original font including Hungarian letters`).toBeCloseTo(width, 4);
      expect(metrics.faces.some((face) => face.family === family && face.range.includes("U+100-2BA"))).toBe(true);
    }
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await context.close();
  });
}

test("slow local fonts leave AI copy readable, then settle without a large layout shift", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    window.__fontShifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__fontShifts.push(entry.value);
    }).observe({ type: "layout-shift", buffered: true });
  });
  let release;
  const hold = new Promise((resolve) => { release = resolve; });
  await page.route(/\/assets\/fonts\/.*\.woff2$/, async (route) => { await hold; await route.continue(); });
  try {
    await page.goto("/hu/ai-integracio", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    expect(await page.evaluate(() => document.fonts.status)).toBe("loading");
  } finally { release(); }
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => window.__fontShifts.reduce((sum, value) => sum + value, 0))).toBeLessThan(.1);
  await expect(page.locator("h1")).toBeInViewport();
});

test("the real first-session home still waits for Inter 700 before releasing its arrival", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
  let release;
  const hold = new Promise((resolve) => { release = resolve; });
  await page.route(/\/assets\/fonts\/.*\.woff2$/, async (route) => { await hold; await route.continue(); });
  const enter = page.getByRole("button", { name: "Enter the portfolio" });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".site-arrival")).toBeVisible();
    expect(await page.evaluate(() => document.fonts.status)).toBe("loading");
    await expect(enter).toBeHidden();
    await expect(page.locator(".site-arrival__counter")).not.toHaveText("100");
  } finally { release(); }
  await expect(enter).toBeVisible();
  expect(await page.evaluate(() => document.fonts.check('700 96px "Inter"'))).toBe(true);
  await expect(page.locator(".site-arrival__wordmark")).toHaveCSS("font-weight", "700");
  await expect(page.locator(".site-arrival__counter")).toHaveText("100");
  await enter.click();
  await expect(page.locator(".site-arrival")).toHaveCount(0);
  await expect(page.locator(".home-mast-lettering")).toBeVisible();
  await expect(page.getByRole("link", { name: "Scroll for more" })).toBeInViewport();
});
