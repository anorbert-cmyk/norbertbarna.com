import { expect, test } from "@playwright/test";

const routes = ["/", "/works", "/work/raiffeisen", "/work/instructure", "/work/bitpanda", "/work/benker",
  "/work/onrobot", "/work/sportsgambit", "/work/kineticare", "/ai-integration", "/hu/ai-integracio", "/privacy", "/hu/adatvedelem"];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

function luminance(color) {
  return color.match(/[\d.]+/g).slice(0, 3).map((n) => Number(n) / 255)
    .map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
    .reduce((sum, n, index) => sum + n * [.2126, .7152, .0722][index], 0);
}

async function expectStableBar(page, label) {
  await settle(page);
  const state = await page.locator(".navbar").evaluate((nav) => {
    const style = getComputedStyle(nav);
    const toggle = nav.querySelector(".menu-button");
    const box = toggle.getBoundingClientRect();
    let iconBacking = "rgb(255, 255, 255)";
    for (let node = toggle; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor;
      const channels = color.match(/[\d.]+/g).map(Number);
      if (channels.length === 3 || channels[3] === 1) { iconBacking = color; break; }
    }
    // Work routes keep the navy reference bar. AI alone changes its bar to
    // lilac when the hero leaves it, including safe-area clearance.
    const aiRoute = ["/ai-integration", "/hu/ai-integracio"].includes(location.pathname);
    const workRoute = location.pathname === "/works" || location.pathname.startsWith("/work/");
    const opening = aiRoute && document.querySelector("[data-ai-hero]")?.getBoundingClientRect().bottom > nav.getBoundingClientRect().height;
    return { y: nav.getBoundingClientRect().top, opacity: Number(style.opacity), animations: nav.getAnimations().length,
      background: style.backgroundColor, expectedBackground: (opening || workRoute) ? "rgb(10, 22, 40)" : "rgb(214, 212, 237)", blend: style.mixBlendMode,
      iconInk: getComputedStyle(toggle.querySelector(".w-icon-nav-menu")).color, iconBacking,
      toggleHit: toggle.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)),
      overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(Math.abs(state.y), label).toBeLessThanOrEqual(.5);
  expect(state, label).toMatchObject({ opacity: 1, animations: 0, background: state.expectedBackground, blend: "normal", toggleHit: true });
  const ink = luminance(state.iconInk), backing = luminance(state.iconBacking);
  expect((Math.max(ink, backing) + .05) / (Math.min(ink, backing) + .05), `${label}: visible menu icon`).toBeGreaterThanOrEqual(3);
  expect(state.overflow, label).toBeLessThanOrEqual(1);
}

for (const width of [390, 991]) {
  test(`${width}: every page keeps its compact bar at the top through scroll and viewport-height changes`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 844 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: "load" });
      await expectStableBar(page, `${route} opening`);
      const positions = await page.evaluate(() => {
        const limit = document.documentElement.scrollHeight - innerHeight;
        const work = document.querySelector("#works");
        return [240, work ? work.getBoundingClientRect().bottom + scrollY + 100 : limit * .3, limit * .65, limit];
      });
      for (const y of positions) {
        await page.evaluate((target) => scrollTo(0, target), y);
        await expectStableBar(page, `${route} scroll ${y}`);
      }
      // Browser address-bar expansion changes the available height during a
      // real visit; utility controls must not derive a new vertical position.
      for (const height of [720, 844]) {
        await page.setViewportSize({ width, height });
        await expectStableBar(page, `${route} height ${height}`);
      }
    }
  });
}

test.describe("mobile touch and disclosure", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test("downward touch scrolling after work keeps the bar, consent and first menu action usable", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("bn-analytics-consent-v1"));
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator("[data-consent-banner]")).toBeVisible();
    await expectStableBar(page, "fresh consent");
    await page.locator("#works").evaluate((work) => scrollTo(0, work.getBoundingClientRect().bottom + scrollY + 100));
    await settle(page);
    const before = await page.evaluate(() => scrollY);
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 480, id: 1 }] });
      for (let step = 1; step <= 8; step += 1) {
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: 480 - step * 30, id: 1 }] });
        await expectStableBar(page, `touch step ${step}`);
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally { await session.detach(); }
    await expect.poll(() => page.evaluate((start) => scrollY - start, before)).toBeGreaterThan(100);
    await expectStableBar(page, "touch complete");
    await page.getByRole("button", { name: "Decline analytics", exact: true }).tap();
    await expect(page.locator("[data-consent-banner]")).toBeHidden();
    const toggle = page.locator(".menu-button");
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expectStableBar(page, "open disclosure");
    const works = page.locator('.navbar .nav-link[href="/works"]');
    await works.focus();
    await expectStableBar(page, "keyboard focus");
    const contrast = await works.evaluate((link) => {
      const rgb = (color) => color.match(/[\d.]+/g).map(Number);
      const luminance = (channels) => channels.slice(0, 3).map((n) => n / 255)
        .map((n) => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
        .reduce((sum, n, index) => sum + n * [.2126, .7152, .0722][index], 0);
      let background = [255, 255, 255];
      for (let node = link; node; node = node.parentElement) {
        const fill = rgb(getComputedStyle(node).backgroundColor);
        if (fill.length === 3 || fill[3] === 1) { background = fill; break; }
      }
      const foreground = luminance(rgb(getComputedStyle(link).color));
      const backing = luminance(background);
      return (Math.max(foreground, backing) + .05) / (Math.min(foreground, backing) + .05);
    });
    expect(contrast, "the open menu retains AA on its actual opaque backing").toBeGreaterThanOrEqual(4.5);
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.tap();
    await works.tap();
    await expect(page).toHaveURL(/\/works$/);
  });
});

test("crossing the compact breakpoint preserves the same stationary work bar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/work/instructure", { waitUntil: "load" });
  await page.evaluate(() => scrollTo(0, 1200));
  const top = () => page.locator(".navbar").evaluate((nav) => nav.getBoundingClientRect().top);
  await expect.poll(top).toBe(0);
  await page.setViewportSize({ width: 390, height: 900 });
  await expectStableBar(page, "desktop to compact");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => scrollTo(0, 1200));
  await expect(page.locator(".navbar")).not.toHaveAttribute("data-compact-nav");
  await expect.poll(top).toBe(0);
  await page.setViewportSize({ width: 390, height: 720 });
  await expectStableBar(page, "second compact transition");
});
