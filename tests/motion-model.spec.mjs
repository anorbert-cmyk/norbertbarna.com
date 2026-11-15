import { expect, test } from "@playwright/test";

// The modern motion model (design.md, Motion): page-to-page view transitions
// that coexist with the arrival curtain and the case opening, reduced motion
// handled per animation rather than by a blanket reset, and a Pause control
// on every looping video.

function recordReveals() {
  const push = (key, value) => {
    try {
      const list = JSON.parse(sessionStorage.getItem(key) || "[]");
      list.push(value);
      sessionStorage.setItem(key, JSON.stringify(list));
    } catch { /* storage is only test evidence */ }
  };
  addEventListener("pagereveal", (event) => {
    const root = document.documentElement;
    const entry = {
      path: location.pathname, transition: Boolean(event.viewTransition),
      gate: root.hasAttribute("data-arrival-gate"), opening: root.getAttribute("data-case-opening"),
    };
    if (event.viewTransition) {
      const started = performance.now();
      event.viewTransition.ready.then(() => {
        push("motion-model-names", [...new Set(document.getAnimations()
          .map((animation) => animation.effect && animation.effect.pseudoElement)
          .filter((pseudo) => pseudo && pseudo.startsWith("::view-transition-group")))].sort());
      }, () => push("motion-model-skipped", location.pathname));
      event.viewTransition.finished.then(() => push("motion-model-finished", Math.round(performance.now() - started)), () => {});
    }
    push("motion-model-reveals", entry);
  });
  new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1 && (node.matches(".site-arrival") || node.querySelector(".site-arrival"))) push("motion-model-curtains", location.pathname);
    }
  }).observe(document, { childList: true, subtree: true });
}

const evidence = (page, key) => page.evaluate((name) => JSON.parse(sessionStorage.getItem(name) || "[]"), key);

async function openNavLink(page, href) {
  const link = page.locator(`.navbar a[href="${href}"]:visible`).first();
  if (!(await link.count())) await page.locator(".menu-button:visible").click();
  await link.click();
}

for (const width of [390, 1440]) {
  test(`${width}: internal navigation cross-fades once, keeps the header as its own group and never replays the arrival`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(recordReveals);

    // A first direct visit: the arrival curtain, and no view transition.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".site-arrival")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".site-arrival")).toHaveCount(0);

    await openNavLink(page, "/works");
    await expect(page).toHaveURL(/\/works$/);
    await page.locator('.work-title[href="/work/raiffeisen"]').first().click();
    await expect(page).toHaveURL(/\/work\/raiffeisen$/);
    await expect(page.locator("h1")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/works$/);
    await expect.poll(() => evidence(page, "motion-model-finished").then((list) => list.length)).toBe(3);

    const reveals = await evidence(page, "motion-model-reveals");
    expect(reveals.map((entry) => `${entry.path}:${entry.transition}`)).toEqual([
      "/:false", "/works:true", "/work/raiffeisen:true", "/works:true",
    ]);
    // The first visit is the arrival's (the curtain asserted above), never a
    // transition's; the owner may already have lifted its parse-time gate.
    expect(reveals.slice(1).some((entry) => entry.gate), "an internal navigation never raises the arrival gate").toBe(false);
    expect(reveals[2].opening, "the case opening is pending in the incoming page while the old one fades").toBe("pending");
    expect(await evidence(page, "motion-model-curtains"), "one curtain, on the first page only").toEqual(["/"]);
    expect(await evidence(page, "motion-model-skipped"), "a duplicate transition name would abort the transition").toEqual([]);
    for (const names of await evidence(page, "motion-model-names")) {
      expect(names).toEqual(["::view-transition-group(root)", "::view-transition-group(site-nav)"]);
    }
    for (const duration of await evidence(page, "motion-model-finished")) expect(duration).toBeLessThan(900);
    expect(errors).toEqual([]);
  });
}

test("reduced motion navigates without a view transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(recordReveals);
  await page.goto("/works");
  await page.locator('.work-title[href="/work/raiffeisen"]').first().click();
  await expect(page).toHaveURL(/\/work\/raiffeisen$/);
  await expect(page.locator("h1")).toBeVisible();
  const reveals = await evidence(page, "motion-model-reveals");
  expect(reveals.map((entry) => entry.transition)).toEqual([false, false]);
});

test("a link to a document without the opt-in stays a plain navigation with no script error", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/writing");
  await page.locator('main a[href$="feed.xml"]').first().click();
  await expect(page).toHaveURL(/feed\.xml$/);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

// Spatial properties may not keep a transition or an animation under reduced
// motion; colour, border and shadow feedback may. Nothing in main is left
// transparent or invisible.
const SPATIAL = /^(?:all|transform|translate|scale|rotate|opacity|clip-path|width|height|top|left|right|bottom|margin|padding|font-size)/;
for (const route of ["/", "/works", "/work/raiffeisen", "/work/kineticare", "/contact", "/ai-integration", "/about", "/writing", "/hu", "/de"]) {
  test(`reduced motion on ${route}: no spatial transition or animation is declared and no content stays hidden`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await page.waitForLoadState("load");
    await expect(page.locator("html")).not.toHaveClass(/gsap-ready/);
    await page.locator(".menu-button:visible").click();
    const report = await page.evaluate((spatialSource) => {
      const spatial = new RegExp(spatialSource);
      const moving = [], hidden = [];
      const name = (element) => `${element.tagName.toLowerCase()}.${String(element.getAttribute("class") || "").trim().replace(/\s+/g, ".")}`;
      const main = document.querySelector("main");
      for (const element of document.querySelectorAll("*")) {
        for (const pseudo of [null, "::before", "::after"]) {
          const style = getComputedStyle(element, pseudo);
          if (pseudo && style.content === "none") continue;
          // An unrendered element (a <source>) reports empty computed values.
          if (!style.display || style.display === "none") continue;
          const durations = style.transitionDuration.split(",").map((value) => parseFloat(value));
          style.transitionProperty.split(",").forEach((property, index) => {
            if (durations[index % durations.length] > 0 && spatial.test(property.trim())) moving.push(`${name(element)}${pseudo || ""} transitions ${property.trim()}`);
          });
          if (style.animationName && style.animationName !== "none") moving.push(`${name(element)}${pseudo || ""} animates ${style.animationName}`);
        }
        if (main && main.contains(element) && !element.closest("[hidden], [aria-hidden='true'], canvas, video")) {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          if (style.display !== "none" && box.width > 1 && box.height > 1 && (style.opacity === "0" || style.visibility === "hidden")) hidden.push(name(element));
        }
      }
      return { moving, hidden, running: document.getAnimations().length };
    }, SPATIAL.source);
    expect(report.moving).toEqual([]);
    expect(report.running, "no animation is running").toBe(0);
    expect(report.hidden).toEqual([]);
  });
}

for (const [route, playLabel, pauseLabel] of [
  ["/work/instructure", "Play video", "Pause video"],
  ["/hu/munka/kineticare", "Videó lejátszása", "Videó szüneteltetése"],
  ["/de/arbeit/instructure", "Video abspielen", "Video anhalten"],
]) {
  test(`${route}: the looping video has a Pause control that stops and restarts it`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => { try { sessionStorage.setItem("nb-arrival-seen-v2", "1"); } catch { /* skipped arrival is only a convenience */ } });
    await page.goto(route);
    const control = page.locator("[data-video-pause]");
    await expect(control).toHaveCount(1);
    const video = page.locator(`#${await control.getAttribute("aria-controls")}`);
    await expect(video).toHaveCount(1);
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeVisible();
    await expect(control).toHaveText(pauseLabel);
    await expect(control).not.toHaveAttribute("aria-pressed", /.*/);
    const box = await control.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    await expect(video).toHaveAttribute("data-media-state", "playing");

    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toHaveText(playLabel);
    await expect(video).toHaveAttribute("data-media-state", "paused");
    expect(await video.evaluate((element) => element.paused)).toBe(true);
    // Scrolling away and back must not restart a video the reader stopped.
    await page.evaluate(() => scrollTo(0, 0));
    await control.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    expect(await video.evaluate((element) => element.paused)).toBe(true);

    await control.click();
    await expect(control).toHaveText(pauseLabel);
    await expect(video).toHaveAttribute("data-media-state", "playing");
  });
}

test("the Kineticare header preview stops by itself and carries no control; reduced motion shows none at all", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => { try { sessionStorage.setItem("nb-arrival-seen-v2", "1"); } catch { /* as above */ } });
  await page.goto("/work/kineticare");
  await expect(page.locator(".case-study-header [data-video-pause]")).toHaveCount(0);
  await expect(page.locator("[data-video-pause]")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[data-video-pause]")).toBeHidden();
  await page.goto("/");
  await expect(page.locator("[data-video-pause]")).toBeHidden();
});
