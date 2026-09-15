import { expect, test } from "@playwright/test";

const routes = ["/works", ...["benker", "bitpanda", "instructure", "kineticare", "onrobot", "raiffeisen", "sportsgambit"].map((slug) => `/work/${slug}`)];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function barState(page, scripted = true) {
  if (scripted) await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.locator(".navbar").evaluate((nav) => {
    const style = getComputedStyle(nav);
    const controls = [...nav.querySelectorAll("a, button")].filter((e) => {
      const box = e.getBoundingClientRect();
      return box.width && box.height && getComputedStyle(e).visibility !== "hidden";
    }).map((e) => {
      const box = e.getBoundingClientRect();
      return { label: e.textContent.trim() || e.getAttribute("aria-label"), x: box.x, y: box.y, width: box.width, height: box.height,
        hit: e.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) };
    });
    const overlap = controls.flatMap((a, i) => controls.slice(i + 1).filter((b) =>
      a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1
    ).map((b) => `${a.label} / ${b.label}`));
    const clipped = [...nav.querySelectorAll("a, button, .nav-breadcrumb, .home-nav-progress")].filter((e) => e.getBoundingClientRect().width && getComputedStyle(e).visibility === "visible").flatMap((e) => {
      const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), bad = [];
      while (walker.nextNode()) {
        const range = document.createRange(); range.selectNode(walker.currentNode);
        for (const box of range.getClientRects()) if (box.width && (box.left < -1 || box.right > innerWidth + 1)) bad.push(e.textContent.trim());
      }
      return bad;
    });
    const mark = nav.querySelector(".home-nav-wordmark")?.getBoundingClientRect();
    const readingLimit = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    return { top: nav.getBoundingClientRect().top, background: style.backgroundColor, blend: style.mixBlendMode, opacity: Number(style.opacity),
      animations: nav.getAnimations().length, controls, overlap, clipped, overflow: document.documentElement.scrollWidth - innerWidth,
      markCenter: mark?.width ? mark.x + mark.width / 2 : null, viewport: innerWidth,
      counter: nav.querySelector(".home-nav-progress span")?.textContent,
      expectedCounter: String(Math.max(1, Math.round(scrollY / readingLimit * 100))).padStart(3, "0") };
  });
}

async function expectBar(page, label, { scripted = true, centered = false } = {}) {
  const state = await barState(page, scripted);
  expect(state, label).toMatchObject({ top: 0, background: "rgb(10, 22, 40)", blend: "normal", opacity: 1, animations: 0, overlap: [], clipped: [] });
  expect(state.overflow, label).toBeLessThanOrEqual(1);
  for (const control of state.controls) {
    expect(control.hit, `${label}: ${control.label} is clickable`).toBe(true);
    expect(control.height, `${label}: ${control.label} target`).toBeGreaterThanOrEqual(44);
  }
  if (scripted) expect(state.counter, `${label}: progress describes native scrolling`).toBe(state.expectedCounter);
  if (centered) expect(Math.abs(state.markCenter - state.viewport / 2), `${label}: reference wordmark remains centered`).toBeLessThanOrEqual(2);
  return state;
}

for (const route of routes) {
  test(`${route}: dark desktop header keeps its reference layout throughout reading and footer`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const opening = await expectBar(page, "opening", { centered: true });
    for (const ratio of [.18, .51, .84, 1, 0]) {
      await page.evaluate((p) => scrollTo(0, p * (document.documentElement.scrollHeight - innerHeight)), ratio);
      const state = await expectBar(page, `position ${ratio}`, { centered: true });
      expect(state.controls, "destinations never relocate, fade or grow at the footer").toEqual(opening.controls);
    }
    await expect(page.locator(".immersive-nav-landing")).toHaveCount(0);
  });
}

for (const route of ["/works", "/work/sportsgambit"]) {
  test(`${route}: 992px and doubled spaced text keep all header destinations separate`, async ({ page }) => {
    await page.setViewportSize({ width: 992, height: 900 });
    await page.goto(route, { waitUntil: "load" });
    await expectBar(page, "desktop breakpoint");
    await page.locator(".navbar").evaluate((nav) => {
      const sizes = [...nav.querySelectorAll("a, button, .nav-breadcrumb, .nav-breadcrumb span, .home-nav-progress")].map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]);
      for (const [e, size] of sizes) { e.style.fontSize = `${size * 2}px`; e.style.lineHeight = "1.5"; e.style.letterSpacing = ".12em"; e.style.wordSpacing = ".16em"; }
    });
    await expectBar(page, "enlarged opening");
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expectBar(page, "enlarged footer");
    await page.keyboard.press("Tab");
    await page.locator('.navbar a[href="/about"]').focus();
    await expectBar(page, "keyboard focus");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expectBar(page, "reduced motion");
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  for (const route of ["/works", "/work/benker"]) {
    test(`${route}: reference bar and native destinations do not rely on enhancement`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await expectBar(page, "no-JS opening", { scripted: false, centered: true });
      await expect(page.locator(".home-nav-progress")).toBeHidden();
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await expectBar(page, "no-JS footer", { scripted: false, centered: true });
      await page.locator('.navbar a[href="/about"]').click();
      await expect(page).toHaveURL(/\/about$/);
    });
  }
});

test("an enlarged sticky header clears native case-section links", async ({ page }) => {
  await page.setViewportSize({ width: 992, height: 900 });
  await page.goto("/work/benker", { waitUntil: "load" });
  await page.locator(".navbar").evaluate((nav) => {
    const sizes = [...nav.querySelectorAll("a, .nav-breadcrumb, .nav-breadcrumb span")].map((e) => [e, parseFloat(getComputedStyle(e).fontSize)]);
    for (const [e, size] of sizes) e.style.fontSize = `${size * 2}px`;
  });
  await page.locator('.case-toc a[href="#the-process"]').click();
  await expect(page).toHaveURL(/#the-process$/);
  await expect.poll(() => page.locator("#the-process").evaluate((heading) => heading.getBoundingClientRect().top - document.querySelector(".navbar").getBoundingClientRect().bottom)).toBeGreaterThanOrEqual(0);
  await expectBar(page, "native section destination");
});
