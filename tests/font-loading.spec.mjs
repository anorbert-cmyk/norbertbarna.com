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

// Independently pinned pre-migration Google font bytes/ranges. Native text
// metrics vary between macOS and Linux; compare the original discrete faces in
// the same renderer, rather than encoding one OS's canvas widths or reading the
// reference declarations back from the production stylesheet under test.
const originalFonts = {
  Inter: {
    latin: { file: "inter-latin.c940764593d0.woff2", sha256: "c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4" },
    "latin-ext": { file: "inter-latin-ext.a28eb6d3ccb5.woff2", sha256: "a28eb6d3ccb534ae0c94ca999371df024aab60b08c3c8a5720ee9e32fa0faaa2" },
  },
  "Funnel Display": {
    latin: { file: "funnel-display-latin.96468ae77275.woff2", sha256: "96468ae7727580c804f679aa5d29c75389e605fb2e41ae6a067ad86e5e9a86a9" },
    "latin-ext": { file: "funnel-display-latin-ext.20bc54b005a2.woff2", sha256: "20bc54b005a2bc3c074c7554090cc7f06495355d1babbcb014d9892d683912f0" },
  },
};
const originalRanges = {
  latin: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  "latin-ext": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
};

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
    expect({ file: font.file, sha256: font.sha256 }).toEqual(originalFonts[font.family][font.subset]);
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
    const metrics = await page.evaluate(async ({ sampleText, originals, ranges }) => {
      await document.fonts.ready;
      const results = [];
      for (const [family, subsets] of Object.entries(originals)) {
        const reference = `Original ${family}`;
        // 400 covers body copy; 700/800 preserve the original matching for
        // authored 650/750. Aliases do not change any page element's styles.
        for (const weight of [400, 700, 800]) {
          for (const [subset, font] of Object.entries(subsets)) {
            document.fonts.add(new FontFace(reference, `url("/assets/fonts/${font.file}")`, {
              style: "normal", weight: String(weight), unicodeRange: ranges[subset],
            }));
          }
        }
        for (const weight of [400, 650, 700, 750, 800]) {
          const actualFaces = await document.fonts.load(`${weight} 64px "${family}"`, sampleText);
          const referenceFaces = await document.fonts.load(`${weight} 64px "${reference}"`, sampleText);
          const canvas = document.createElement("canvas").getContext("2d");
          canvas.font = `${weight} 64px "${family}"`;
          const actual = canvas.measureText(sampleText).width;
          canvas.font = `${weight} 64px "${reference}"`;
          const original = canvas.measureText(sampleText).width;
          results.push({ family, weight, actual, original,
            actualFaces: actualFaces.map((font) => ({ status: font.status, range: font.unicodeRange })),
            referenceFaces: referenceFaces.map((font) => ({ status: font.status, range: font.unicodeRange })),
          });
        }
      }
      return results;
    }, { sampleText: sample, originals: originalFonts, ranges: originalRanges });
    expect(externalFonts).toEqual([]);
    expect(new Set(localFonts).size).toBe(4);
    for (const result of metrics) {
      const label = `${result.family} ${result.weight}`;
      expect(result.actual, `${label} matches the original faces in this renderer`).toBe(result.original);
      expect(result.actual, `${label} rendered nonempty text`).toBeGreaterThan(0);
      for (const faces of [result.actualFaces, result.referenceFaces]) {
        expect(faces, `${label} matched real Latin and Latin-ext faces`).toHaveLength(2);
        expect(faces.every((font) => font.status === "loaded"), `${label} loaded successfully`).toBe(true);
        expect(faces.some((font) => font.range.includes("U+100-2BA")), `${label} covers Hungarian ő/ű`).toBe(true);
      }
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
