import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

// Without the pinned track the same WebGL object stays live in the drawing slot
// instead of resolving to the flat gate. These viewports are short enough that
// `home-composition.js` never takes the 210svh pin. `slot` names the geometry
// branch in `fitCompact`: narrow below 600px, wide above it.
const COMPACT = [
  { label: "phone", width: 390, height: 700, slot: "narrow", measure: true },
  { label: "small phone", width: 320, height: 640, slot: "narrow" },
  { label: "landscape tablet", width: 1024, height: 768, slot: "wide", measure: true },
  { label: "short desktop window", width: 1440, height: 700, slot: "wide" },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function openHome(page) {
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
}

// A locator screenshot scrolls its element into view, which would undo the very
// scroll being measured. Clip the viewport instead: it never moves the page.
async function canvasClip(page) {
  const clip = await page.evaluate(() => {
    const box = document.querySelector(".home-mast-canvas").getBoundingClientRect();
    const left = Math.max(0, box.left), top = Math.max(0, box.top);
    const right = Math.min(innerWidth, box.right), bottom = Math.min(innerHeight, box.bottom);
    return right <= left || bottom <= top ? null
      : { x: left, y: top, width: right - left, height: bottom - top };
  });
  expect(clip, "the canvas is outside the viewport").not.toBeNull();
  return clip;
}

async function paint(page) {
  const clip = await canvasClip(page);
  return { clip, hash: createHash("sha256").update(await page.screenshot({ clip })).digest("hex") };
}

// The object assembles for 2.3 seconds after the scene reports ready. Anything
// that compares two paints has to wait that out, or it measures the arrival.
async function settle(page) {
  await page.waitForTimeout(2800);
  const first = await paint(page);
  await page.waitForTimeout(500);
  const second = await paint(page);
  expect(second.hash, "the object never came to rest").toBe(first.hash);
  return second;
}

// Bounding box of the painted object, in viewport coordinates. The stage is a
// flat lilac field, so any pixel far from it belongs to the glass. The copy and
// the chrome paint above the canvas and would be captured with it, so they are
// hidden for the measurement; visibility cannot move the object.
const ABOVE_CANVAS = [".home-mast-intro", ".navbar", ".consent-banner"];

async function objectBox(page) {
  const conceal = (hidden) => page.evaluate(({ selectors, hidden }) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) continue;
      if (hidden) node.style.visibility = "hidden";
      else node.style.removeProperty("visibility");
    }
  }, { selectors: ABOVE_CANVAS, hidden });

  await conceal(true);
  const clip = await canvasClip(page);
  const shot = await page.screenshot({ clip });
  await conceal(false);

  const bounds = await page.evaluate(async ({ png }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const surface = document.createElement("canvas");
    surface.width = image.width; surface.height = image.height;
    const context = surface.getContext("2d");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const field = [214, 212, 237];
    let left = image.width, right = -1, top = image.height, bottom = -1;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        const distance = Math.abs(data[i] - field[0]) + Math.abs(data[i + 1] - field[1]) +
          Math.abs(data[i + 2] - field[2]);
        if (distance <= 24) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    return right < 0 ? null : { left, right, top, bottom, width: image.width, height: image.height };
  }, { png: shot.toString("base64") });

  expect(bounds, "the compact slot painted nothing").not.toBeNull();
  const scaleX = clip.width / bounds.width, scaleY = clip.height / bounds.height;
  return {
    x: clip.x + bounds.left * scaleX, y: clip.y + bounds.top * scaleY,
    width: (bounds.right - bounds.left) * scaleX, height: (bounds.bottom - bounds.top) * scaleY,
  };
}

// Line boxes, not element boxes: `.home-mast-display` is a full-width block
// whose glyphs occupy a fraction of it, so its border box would report an
// overlap the reader never sees. `.home-intro-work` carries a navy background,
// so there its whole box is ink.
function inkRects(page, selector) {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) return [];
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()]
      .filter((rect) => rect.width > 1 && rect.height > 1)
      .map((rect) => rect.toJSON());
    if (getComputedStyle(element).backgroundColor !== "rgba(0, 0, 0, 0)") {
      rects.push(element.getBoundingClientRect().toJSON());
    }
    return rects;
  }, selector);
}

function overlaps(a, b) {
  if (!a || !b || !b.width || !b.height) return false;
  return a.x < b.x + b.width && b.x < a.x + a.width &&
    a.y < b.y + b.height && b.y < a.y + a.height;
}

function slotState(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".home-mast-canvas");
    const gate = document.querySelector(".home-mast-gate-fallback");
    return {
      canvasVisibility: getComputedStyle(canvas).visibility,
      canvasOpacity: Number(getComputedStyle(canvas).opacity),
      gateOpacity: Number(getComputedStyle(gate).opacity),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

for (const { label, width, height, slot, measure } of COMPACT) {
  test(`${label}: the unpinned slot keeps the live object, not the flat drawing`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openHome(page);

    const mast = page.locator(".home-mast");
    await expect(mast).not.toHaveAttribute("data-morph-active", "");
    await expect(mast).toHaveAttribute("data-glass-live", "");
    await expect(page.locator(".home-mast-sculpture")).toHaveAttribute("data-hero-pose", "compact");

    // Exactly one of the live canvas and the static drawing is visible.
    const state = await slotState(page);
    expect(state.canvasVisibility).toBe("visible");
    expect(state.canvasOpacity).toBeGreaterThan(.99);
    expect(state.gateOpacity).toBeLessThan(.01);
    expect(state.overflow).toBeLessThanOrEqual(0);

    // One viewport per geometry branch carries the cost of measuring the paint.
    if (!measure) return;
    await settle(page);
    const drawn = await objectBox(page);
    expect(drawn.width, `${slot} slot drew nothing wide enough to be the object`).toBeGreaterThan(width * .1);
    for (const selector of [".home-mast-display", ".home-banner-subtitle",
      ".home-intro-work", ".home-mast-proof-chips"]) {
      for (const rect of await inkRects(page, selector)) {
        expect(overlaps(drawn, rect), `${selector} is under the glass`).toBe(false);
      }
    }
  });
}

test("native scroll turns the object, and a still page leaves it still", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openHome(page);
  // Settle the assembly first, so its motion cannot be read as the turn.
  const resting = await settle(page);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  await page.waitForTimeout(400);

  const turned = await paint(page);
  expect(turned.hash, "native scroll did not change the painted object").not.toBe(resting.hash);

  // No idle rotation: the same scroll position must paint identically.
  await page.waitForTimeout(800);
  const held = await paint(page);
  expect(held.clip).toEqual(turned.clip);
  expect(held.hash, "the object kept moving on a still page").toBe(turned.hash);
});

test("the compact slot completes the arrival assembly instead of jumping to the endpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  const early = await paint(page);
  await page.waitForTimeout(900);
  expect((await paint(page)).hash, "the assembly was not running").not.toBe(early.hash);
  await page.waitForTimeout(2400);
  const settled = await paint(page);
  await page.waitForTimeout(700);
  expect((await paint(page)).hash, "the assembly never settled").toBe(settled.hash);
});

test("reduced motion keeps one static drawing and never both forms", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-glass-live", "");
  const state = await slotState(page);
  expect(state.canvasVisibility).toBe("hidden");
  expect(state.gateOpacity).toBeGreaterThan(.99);
});

test("unavailable WebGL leaves the compact slot on its static drawing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type) {
      if (String(type).indexOf("webgl") === 0) return null;
      return original.apply(this, arguments);
    };
  });
  await page.goto("/", { waitUntil: "load" });
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("fallback");
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-glass-live", "");
  const state = await slotState(page);
  expect(state.canvasVisibility).toBe("hidden");
  expect(state.gateOpacity).toBeGreaterThan(.99);
});

test("a tall viewport keeps the pinned track and hands the pose back to the morph owner", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await openHome(page);
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  await expect(page.locator(".home-mast")).not.toHaveAttribute("data-glass-live", "");
  await expect(page.locator(".home-mast-sculpture")).not.toHaveAttribute("data-hero-pose", "compact");
  const state = await slotState(page);
  expect(state.canvasVisibility).toBe("visible");
  expect(state.gateOpacity).toBeLessThan(.01);
});
