import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

// These samples come from the approved 1536×1024 storyboard, panel 03.
// They guard its five different faces, material colors and open inner contour.
const samples = [
  { name: "forest front", x: 465, y: 720, rgba: [24, 50, 43, 255] },
  { name: "lit top", x: 520, y: 610, rgba: [68, 98, 92, 255] },
  { name: "upper olive fold", x: 580, y: 720, rgba: [147, 141, 29, 255] },
  { name: "lower olive fold", x: 520, y: 845, rgba: [179, 168, 30, 255] },
  { name: "right forest leg", x: 637, y: 778, rgba: [26, 51, 46, 255] },
];

test("the static SVG embeds the exact transparent WebP used by the animated endpoint", async ({ page }) => {
  const svg = readFileSync(new URL("../assets/images/hero-gate.svg", import.meta.url), "utf8");
  const embedded = svg.match(/data:image\/webp;base64,([^\"]+)/)?.[1];
  expect(embedded).toBeTruthy();
  expect(Buffer.from(embedded, "base64")).toEqual(readFileSync(new URL("../assets/images/hero-final.webp", import.meta.url)));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const result = await page.evaluate(async (samples) => {
    const image = new Image(); image.src = "/assets/images/hero-final.webp"; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
    const pixel = (x, y) => [...ctx.getImageData((x - 288) * 2, (y - 550) * 2, 1, 1).data];
    return { size: [image.width, image.height], faces: samples.map(({ x, y }) => pixel(x, y)), opening: pixel(555, 786)[3], exterior: pixel(690, 600)[3] };
  }, samples);
  expect(result.size).toEqual([904, 784]);
  expect(result.opening).toBe(0); expect(result.exterior).toBe(0);
  for (let i = 0; i < samples.length; i++) {
    for (let c = 0; c < 4; c++) expect(Math.abs(result.faces[i][c] - samples[i].rgba[c]), samples[i].name).toBeLessThanOrEqual(1);
  }
});

for (const width of [390, 1440]) {
  test(`${width}: scroll finishes in the reference colors and perspective without relighting`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      sessionStorage.setItem("nb-arrival-seen-v2", "1");
      localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    });
    await page.goto("/", { waitUntil: "load" });
    await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
    await page.evaluate(() => {
      PortfolioHeroScene.finish();
      const track = document.querySelector(".home-mast-track"), scene = document.querySelector(".home-mast-scene");
      scrollTo(0, scrollY + track.getBoundingClientRect().top + track.offsetHeight - scene.offsetHeight);
    });
    await expect.poll(() => page.evaluate(() => window.PortfolioHomeMorph?.progress)).toBe(1);
    const screenshot = await page.locator(".home-mast-canvas").screenshot();
    const result = await page.evaluate(async ({ png, samples, width }) => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
      const compact = width < 600;
      const box = { left: image.width * (compact ? .42 : .36), right: image.width * (compact ? 1.02 : .98), top: image.height * (compact ? .125 : .06), bottom: image.height * (compact ? .42 : .84) };
      const w = Math.min(box.right - box.left, (box.bottom - box.top) * 452 / 392), h = w * 392 / 452;
      const x0 = (box.left + box.right - w) / 2, y0 = (box.top + box.bottom - h) / 2;
      return samples.map(({ x, y }) => [...ctx.getImageData(Math.round(x0 + (x - 288) / 452 * w), Math.round(y0 + (y - 550) / 392 * h), 1, 1).data]);
    }, { png: screenshot.toString("base64"), samples, width });
    for (let i = 0; i < samples.length; i++) {
      // Rasterization positions differ by <1 source pixel on compact viewports.
      for (let c = 0; c < 3; c++) expect(Math.abs(result[i][c] - samples[i].rgba[c]), `${samples[i].name}, channel ${c}`).toBeLessThanOrEqual(5);
    }
  });
}


test("dismissing consent refreshes the glass backdrop without needing a window resize", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const enter = page.getByRole("button", { name: "Enter the portfolio" });
  await expect(enter).toBeVisible();
  await enter.click();
  await page.locator('[data-consent-decision="rejected"]').click();
  await expect(page.locator("[data-consent-banner]")).toBeHidden();
  await page.mouse.move(-10, -10);
  await page.evaluate(async () => { await PortfolioHeroScene.ready; PortfolioHeroScene.finish(); });
  await expect.poll(() => page.evaluate(() => PortfolioHeroScene.status)).toBe("ready");
  await expect.poll(() => page.evaluate(() => PortfolioHomeMorph.progress)).toBe(0);
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  await page.waitForTimeout(400);
  const canvas = page.locator(".home-mast-canvas");
  const before = createHash("sha256").update(await canvas.screenshot()).digest("hex");
  // An unchanged viewport must not reveal a previously stale reflection image.
  await page.evaluate(() => dispatchEvent(new Event("resize")));
  await page.waitForTimeout(150);
  const after = createHash("sha256").update(await canvas.screenshot()).digest("hex");
  expect(after).toBe(before);
});
