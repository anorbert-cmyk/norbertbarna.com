import { expect, test } from "@playwright/test";

const heroSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#1B3A32"/></svg>';

async function fixture(page, { scene = "pending", image = "ready", kind = "home", missingCss = false } = {}) {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/arrival-critical.svg", async (route) => {
    if (image === "failed") return route.abort();
    await route.fulfill({ contentType: "image/svg+xml", body: heroSvg });
  });
  if (missingCss) await page.route("**/assets/css/arrival.css", (route) => route.abort());
  await page.route(/\/arrival-fixture(?:\?.*)?$/, async (route) => {
    await route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="en"><head>
      <meta name="viewport" content="width=device-width, initial-scale=1"><title>Portfolio arrival fixture</title>
      <link rel="stylesheet" href="/assets/css/arrival.css">
      <style>body{margin:0;font-family:Inter,sans-serif}main{min-height:2400px;padding:40px;background:#D6D4ED}h1{margin-top:0}img{width:160px;height:90px;object-fit:contain}a{display:inline-block;min-height:44px;padding:10px}</style>
      </head><body class="${kind === "home" ? "home" : "case-page"}"><main>
      <h1>Product VP</h1><a href="/works" id="first-link">View selected work</a>
      <header class="${kind === "home" ? "home-mast" : "case-study-header"}"><img class="case-hero-shot" data-hero-critical src="/arrival-critical.svg" width="320" height="180" alt="Existing product screenshot"></header><h2 id="reading">Project details</h2></main>
      <script>window.__arrivalEvents=[];for(const name of ['portfolio:arrivalstart','portfolio:arrivalend'])window.addEventListener(name,event=>window.__arrivalEvents.push({name,at:performance.now(),detail:event.detail}));
      window.PortfolioHeroScene={ready:new Promise((resolve,reject)=>{window.__resolveScene=resolve;window.__rejectScene=reject;})};
      ${scene !== "pending" ? `window.__resolveScene({status:${JSON.stringify(scene)}});` : ""}</script>
      <script src="/assets/js/vendor/gsap.min.js"></script><script src="/assets/js/vendor/ScrollTrigger.min.js"></script>
      <script src="/assets/js/arrival.js"></script></body></html>` });
  });
}

async function openFixture(page) {
  await page.goto("/arrival-fixture", { waitUntil: "domcontentloaded" });
}

async function expectReleased(page) {
  await expect(page.locator(".site-arrival")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/arrival-active/);
  await expect(page.locator("html")).not.toHaveAttribute("data-arrival-state");
  expect(await page.evaluate(() => ({
    inert: Boolean(document.querySelector("main[inert], body[inert], html[inert]")),
    locked: [document.body, document.documentElement].some((element) => ["hidden", "clip"].includes(getComputedStyle(element).overflowY)),
  }))).toEqual({ inert: false, locked: false });
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}: sliced horizontal name waits for real readiness, then Enter wipes upward`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await fixture(page);
    await openFixture(page);
    await expect(page.locator(".site-arrival")).toBeVisible();
    await expect(page.locator(".site-arrival")).toHaveCSS("background-color", "rgb(10, 22, 40)");
    await expect(page.locator(".site-arrival__measure")).toHaveText("NORBERT.BARNA".split(""));
    const geometry = await page.locator(".site-arrival__wordmark").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { ratio: rect.width / innerWidth, center: (rect.left + rect.width / 2) / innerWidth,
        font: getComputedStyle(element).fontFamily, weight: getComputedStyle(element).fontWeight,
        lines: new Set([...element.children].map((letter) => Math.round(letter.getBoundingClientRect().top))).size };
    });
    expect(geometry.ratio).toBeCloseTo(viewport.width < 768 ? .88 : .49, 2);
    expect(geometry.center).toBeCloseTo(.5, 2);
    expect(geometry.lines).toBe(1);
    expect(geometry.font).toMatch(/Inter/);
    expect(geometry.weight).toBe("700");
    // The document fonts and real decoded image settle; the scene is still pending.
    await expect(page.locator(".site-arrival__counter")).toHaveText("067");
    const counterLeft = await page.locator(".site-arrival__counter").evaluate((element) => element.getBoundingClientRect().left);
    const earlyPose = await page.locator(".site-arrival__slice").first().evaluate((element) => getComputedStyle(element).transform);
    await page.waitForTimeout(3900);
    const assembledPose = await page.locator(".site-arrival__slice").first().evaluate((element) => getComputedStyle(element).transform);
    expect(assembledPose).not.toEqual(earlyPose);
    await expect(page.locator(".site-arrival__counter")).toHaveText("067");
    await expect(page.getByRole("button", { name: "Enter the portfolio" })).toBeHidden();
    expect(await page.evaluate(() => window.__arrivalEvents)).toEqual([]);
    await page.evaluate(() => window.__resolveScene({ status: "ready" }));
    const enter = page.getByRole("button", { name: "Enter the portfolio" });
    await expect(enter).toBeVisible();
    await expect(page.locator(".site-arrival__counter")).toHaveText("100");
    await expect.poll(() => page.locator(".site-arrival__counter").evaluate((element) => element.getBoundingClientRect().left)).toBeGreaterThan(counterLeft + 20);
    expect(await page.evaluate(() => document.activeElement === document.body), "readiness never steals focus").toBe(true);
    const buttonGap = await enter.evaluate((button) => button.getBoundingClientRect().top - document.querySelector(".site-arrival__wordmark").getBoundingClientRect().bottom);
    expect(buttonGap).toBeCloseTo(24, 0);
    const counterCenter = await page.locator(".site-arrival__counter").evaluate((element) => { const box = element.getBoundingClientRect(); return box.top + box.height / 2; });
    expect(counterCenter).toBeCloseTo(26, 0);
    await enter.click();
    await expect.poll(() => page.evaluate(() => window.PortfolioArrival.state)).toBe("exiting");
    await page.waitForTimeout(180);
    expect(await page.locator(".site-arrival").evaluate((element) => getComputedStyle(element).clipPath)).not.toBe("inset(0px)");
    await expectReleased(page);
    const events = await page.evaluate(() => window.__arrivalEvents);
    expect(events.map((event) => event.name)).toEqual(["portfolio:arrivalstart", "portfolio:arrivalend"]);
    expect(events[1].at - events[0].at).toBeGreaterThanOrEqual(900);
    expect(events[1].at - events[0].at).toBeLessThan(1400);
    await expect(page.locator("h1")).toBeFocused();
  });
}

test("a usable scene fallback is ready, but Enter remains hidden until the 220-frame assembly completes", async ({ page }) => {
  await fixture(page, { scene: "fallback", kind: "case" });
  await openFixture(page);
  await expect(page.locator(".site-arrival__counter")).toHaveText("100");
  await expect(page.getByRole("button", { name: "Enter the portfolio" })).toBeHidden();
  const started = Date.now();
  await expect(page.getByRole("button", { name: "Enter the portfolio" })).toBeVisible();
  expect(Date.now() - started).toBeGreaterThan(3000);
  await page.keyboard.press("Enter");
  await expectReleased(page);
  expect(await page.evaluate(() => window.__arrivalEvents.map((event) => event.name))).toEqual(["portfolio:arrivalstart", "portfolio:arrivalend"]);
});

test("asset rejection fails open without reporting false completion", async ({ page }) => {
  await fixture(page, { image: "failed", scene: "ready" });
  await openFixture(page);
  await expectReleased(page);
  const end = await page.evaluate(() => window.__arrivalEvents.find((event) => event.name === "portfolio:arrivalend"));
  expect(end.detail.reason).toBe("asset-failed");
  expect(end.detail.progress).toBeLessThan(100);
  await page.locator("#first-link").click();
  await expect(page).toHaveURL(/\/works$/);
});

test("stalled readiness expires within eight seconds without false100 or a trapped page", async ({ page }) => {
  await fixture(page);
  await openFixture(page);
  await expect(page.locator(".site-arrival__counter")).toHaveText("067");
  await expect(page.locator(".site-arrival")).toHaveCount(0, { timeout: 8500 });
  await expectReleased(page);
  const events = await page.evaluate(() => window.__arrivalEvents);
  expect(events).toHaveLength(2);
  expect(events[1].detail).toMatchObject({ reason: "readiness-timeout", progress: 67 });
});

for (const input of ["Tab", "Escape", "wheel", "reduced-motion"]) {
  test(`${input} releases the introduction while preserving native navigation`, async ({ page }) => {
    await fixture(page);
    await openFixture(page);
    await expect(page.locator(".site-arrival")).toBeVisible();
    if (input === "wheel") await page.mouse.wheel(0, 300);
    else if (input === "reduced-motion") await page.emulateMedia({ reducedMotion: "reduce" });
    else await page.keyboard.press(input);
    await expectReleased(page);
    if (input === "Tab") await expect(page.locator("#first-link")).toBeFocused();
    if (input === "wheel") await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await page.evaluate(() => { window.PortfolioArrival.finish(); window.PortfolioArrival.finish(); });
    expect(await page.evaluate(() => window.__arrivalEvents.map((event) => event.name))).toEqual(["portfolio:arrivalstart", "portfolio:arrivalend"]);
  });
}

test("first-session skip persists across reload, and deep links never start an arrival", async ({ page }) => {
  await fixture(page);
  await openFixture(page);
  await page.keyboard.press("Escape");
  await expectReleased(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => window.PortfolioArrival.state)).toBe("skipped");
  expect(await page.evaluate(() => window.__arrivalEvents)).toEqual([]);
  await page.evaluate(() => sessionStorage.removeItem("nb-arrival-seen-v2"));
  await page.goto("/arrival-fixture#reading", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  expect(await page.evaluate(() => window.PortfolioArrival.state)).toBe("skipped");
  await expect(page.locator(".site-arrival")).toHaveCount(0);
});

test("missing arrival CSS fails open immediately", async ({ page }) => {
  await fixture(page, { missingCss: true });
  await openFixture(page);
  await expectReleased(page);
  expect(await page.evaluate(() => window.PortfolioArrival.state)).toBe("finished");
  await page.locator("#first-link").click();
  await expect(page).toHaveURL(/\/works$/);
});

test.describe("without scripting", () => {
  test.use({ javaScriptEnabled: false });
  test("the page and links are visible without an introduction", async ({ page }) => {
    await fixture(page);
    await openFixture(page);
    await expect(page.locator(".site-arrival")).toHaveCount(0);
    await expect(page.locator("h1")).toBeVisible();
    await page.locator("#first-link").click();
    await expect(page).toHaveURL(/\/works$/);
  });
});
