import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function expectHomeBar(page, label, scripted = true) {
  if (scripted) await settle(page);
  const state = await page.locator(".navbar").evaluate((nav) => {
    const style = getComputedStyle(nav);
    const controls = [...nav.querySelectorAll("a, button")].filter((control) => {
      const box = control.getBoundingClientRect();
      return box.width && box.height && getComputedStyle(control).visibility !== "hidden";
    }).map((control) => {
      const box = control.getBoundingClientRect();
      return { label: control.textContent.trim() || control.getAttribute("aria-label"),
        x: box.x, y: box.y, width: box.width, height: box.height,
        ink: getComputedStyle(control.querySelector(".home-nav-label, .home-nav-monogram") || control).color,
        hit: control.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)) };
    });
    const overlaps = controls.flatMap((a, i) => controls.slice(i + 1).filter((b) =>
      a.x < b.x + b.width - 1 && a.x + a.width > b.x + 1 && a.y < b.y + b.height - 1 && a.y + a.height > b.y + 1
    ).map((b) => `${a.label} / ${b.label}`));
    return { top: nav.getBoundingClientRect().top, height: nav.getBoundingClientRect().height,
      background: style.backgroundColor, blend: style.mixBlendMode, opacity: Number(style.opacity),
      animations: nav.getAnimations().length, controls, overlaps,
      overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(state, label).toMatchObject({ top: 0, background: "rgb(214, 212, 237)", blend: "normal", opacity: 1, animations: 0, overlaps: [] });
  expect(state.overflow, label).toBeLessThanOrEqual(1);
  for (const control of state.controls) {
    expect(control.hit, `${label}: ${control.label} has its own clickable area`).toBe(true);
    expect(control.height, `${label}: ${control.label} target height`).toBeGreaterThanOrEqual(44);
    expect(control.ink, `${label}: ${control.label} ink`).toBe("rgb(10, 22, 40)");
  }
  return state;
}

async function readingPositions(page) {
  return page.evaluate(() => {
    const workBottom = document.querySelector("#works").getBoundingClientRect().bottom + scrollY;
    const positions = [0, workBottom - 80, workBottom, workBottom + 80,
      ...[...document.querySelectorAll("main section, main > div, footer")].map((element) => element.getBoundingClientRect().top + scrollY + 120),
      document.documentElement.scrollHeight];
    return [...new Set(positions.map((y) => Math.max(0, Math.round(y))))];
  });
}

for (const width of [992, 1280, 1920]) {
  test(`${width}: home keeps one opaque top bar with separate destinations through every chapter`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await settle(page);
    expect(await page.locator(".navbar").evaluate((nav) => nav.getBoundingClientRect().top), "the footer must not relocate the home menu").toBe(0);
    await page.evaluate(() => scrollTo(0, 0));
    const opening = await expectHomeBar(page, "opening");
    expect(opening.controls.map((control) => control.label)).toEqual(["NB", "Works", "About", "AI integration", "LinkedIn", "Email"]);
    for (const y of await readingPositions(page)) {
      await page.evaluate((position) => scrollTo(0, position), y);
      const state = await expectHomeBar(page, `scroll ${y}`);
      expect(state.controls, "the menu never redistributes or fades after Selected work or at the footer").toEqual(opening.controls);
    }
    await expect(page.locator(".immersive-nav-landing")).toHaveCount(0);
    await page.locator('.navbar a[href="/ai-integration"]').click();
    await expect(page).toHaveURL(/\/ai-integration$/);
  });
}

test("1024: doubled navigation text and WCAG spacing reflow without collisions", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  await page.locator(".navbar").evaluate((nav) => {
    [...nav.querySelectorAll(".nav-link, .footer-email, .home-nav-label, .home-nav-monogram")].forEach((control) => {
      control.style.fontSize = `${parseFloat(getComputedStyle(control).fontSize) * 2}px`;
      control.style.lineHeight = "1.5";
      control.style.letterSpacing = ".12em";
      control.style.wordSpacing = ".16em";
    });
  });
  const opening = await expectHomeBar(page, "enlarged opening");
  expect(opening.controls).toHaveLength(6);
  for (const y of await readingPositions(page)) {
    await page.evaluate((position) => scrollTo(0, position), y);
    expect((await expectHomeBar(page, `enlarged scroll ${y}`)).controls).toEqual(opening.controls);
  }
});

test("home keeps one top bar across compact/desktop breakpoints and keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  for (const width of [991, 992, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expectHomeBar(page, `breakpoint ${width}`);
    if (width < 992) {
      await page.locator(".menu-button").click();
      await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "true");
      await expectHomeBar(page, `open disclosure ${width}`);
      await page.keyboard.press("Escape");
      await expect(page.locator(".menu-button")).toBeFocused();
    } else {
      await page.keyboard.press("Tab");
      await page.locator('.navbar a[href="/works"]').focus();
      await expectHomeBar(page, `keyboard ${width}`);
    }
  }
});

test("reduced motion retains the same home bar after the work chapter", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "load" });
  const opening = await expectHomeBar(page, "reduced opening");
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  expect((await expectHomeBar(page, "reduced footer")).controls).toEqual(opening.controls);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  test("desktop home still has a stable usable top bar", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expectHomeBar(page, "no-JS opening", false);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expectHomeBar(page, "no-JS footer", false);
    await page.locator('.navbar a[href="/works"]').click();
    await expect(page).toHaveURL(/\/works$/);
  });
});
