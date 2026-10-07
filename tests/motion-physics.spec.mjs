// First-party physics motion (2026-10-07, part A): the case opening, the
// home selected-work and related-card hover springs, the arrival pre-curtain
// gate and the compact menu drop. Assertions read the module's own world
// samples (PortfolioPhysicsDebug) and a requestAnimationFrame tracer that
// starts with the document, so every painted frame is accounted for.
import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Physics = require("../assets/js/physics.js");
const SLOW_4G = { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 };

async function returning(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
}
async function recordPhysics(page) {
  await page.addInitScript(() => { window.PortfolioPhysicsDebug = { record: true, worlds: [] }; });
}
async function slow4g(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
}
// Samples the case opening once per frame from the first frame of the document.
async function traceCase(page) {
  await page.addInitScript(() => {
    window.__frames = [];
    const tick = () => {
      const root = document.documentElement;
      const title = document.querySelector("#case-title");
      const media = document.querySelector(".case-study-header .case-hero-media, .case-study-header .kineticare-hero-bg");
      if (title && media) {
        const letters = document.querySelectorAll(".case-opening-letter");
        window.__frames.push({
          t: performance.now(), state: root.getAttribute("data-case-opening"),
          title: getComputedStyle(title).opacity, media: getComputedStyle(media).opacity,
          transform: getComputedStyle(media).transform,
          angle: media.style.getPropertyValue("--case-enter-angle"), rise: media.style.getPropertyValue("--case-enter-rise"),
          slice: media.style.getPropertyValue("--case-slice-a"),
          letters: [...letters].map((letter) => letter.style.getPropertyValue("--case-letter-rise")),
        });
      }
      if (window.__frames.length < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
function entranceWorld(page) {
  return page.evaluate(() => {
    const world = window.PortfolioPhysicsDebug.worlds.find((candidate) => candidate.bodies.some((body) => body.name === "plate"));
    if (!world) return null;
    return {
      names: world.bodies.map((body) => body.name), samples: world.samples, running: world.running, time: world.time,
      impacts: world.bodies[0].impacts, stats: { frames: world.stats.frames, mean: world.stats.scriptTotal / Math.max(1, world.stats.frames), max: world.stats.scriptMax },
    };
  });
}
function series(world, name) {
  const index = world.names.indexOf(name) + 1;
  return world.samples.map((row) => ({ t: row[0], x: row[index][0], v: row[index][1] }));
}

test("physics.js loads deferred in the head of the cases and both homes, before their owners use it", async ({ page }) => {
  await returning(page);
  for (const route of ["/", "/hu", "/work/raiffeisen", "/hu/munka/kineticare"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const script = await page.evaluate(() => {
      const tag = document.querySelector('script[src*="/physics."]');
      return tag && { head: tag.parentElement === document.head, defer: tag.defer, src: tag.getAttribute("src"), version: window.PortfolioPhysics?.version };
    });
    expect(script, route).toMatchObject({ head: true, defer: true, version: 1 });
    expect(script.src, route).toMatch(/physics\.[a-f0-9]{12}\.js$/);
  }
});

test("the entrance world is a fixed-step simulation: 60 Hz and 120 Hz frames end in the same state", () => {
  function run(frameMs) {
    const world = Physics.createWorld({ clock: "external", reduced: false, limit: 6 });
    const hz = (omega) => omega / (2 * Math.PI);
    const plate = world.spring({ from: 13, to: 13, frequency: hz(3.6), damping: .55, limits: [0, Infinity], restitution: .25, precision: .01 });
    const slice = world.spring({ from: 0, to: 0, frequency: hz(3.3), damping: 1, limits: [0, 1], restitution: 0, precision: .001 });
    const letter = world.spring({ from: 1, to: 1, frequency: hz(9), damping: .75, precision: .001 });
    world.at(.2, () => { plate.set(0); slice.set(1.03); });
    world.at(.12, () => letter.set(0));
    world.start();
    let stamp = 1000;
    while (world.advance(stamp)) stamp += frameMs;
    return { time: world.time, plate: plate.value, slice: slice.value, letter: letter.value, impacts: plate.impacts.map((impact) => impact.time) };
  }
  const sixty = run(1000 / 60);
  const twice = run(1000 / 120);
  expect(sixty.plate).toBe(0);
  expect(sixty.slice).toBe(1);
  expect(twice).toEqual({ ...sixty, time: twice.time });
  expect(Math.abs(twice.time - sixty.time)).toBeLessThan(1 / 60);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}: the case panel stands up on its hinge and the letters spring in, within the plan's numbers`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await returning(page);
    await recordPhysics(page);
    await traceCase(page);
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value; })
        .observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/work/raiffeisen", { waitUntil: "load" });
    await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening.state), { timeout: 6000 }).toBe("settled");
    const world = await entranceWorld(page);
    expect(world, "the entrance runs on PortfolioPhysics").not.toBeNull();
    expect(world.running).toBe(false);
    const tilt = viewport.width < 992 ? 7 : 13;

    // Hinged plate (omega 3.6, zeta .55) against the stop at 0, released at .2 s.
    const plate = series(world, "plate");
    expect(plate[0].x).toBeCloseTo(tilt, 5);
    expect(world.impacts[0].time - .2, "first contact with the reading plane").toBeGreaterThan(.68);
    expect(world.impacts[0].time - .2).toBeLessThan(.75);
    expect(Math.max(...plate.filter((sample) => sample.t > world.impacts[0].time).map((sample) => sample.x)), "a bounce under half a degree").toBeLessThan(.5);
    expect(Math.max(...plate.filter((sample) => sample.t > .2 + 1.7).map((sample) => sample.x)), "under .05deg by 1.7 s after release").toBeLessThan(.05);
    expect(Math.min(...plate.map((sample) => sample.x)), "never past the stop").toBeGreaterThanOrEqual(0);
    // Rise and scale on one critically damped progress (omega 5.5).
    const rise = series(world, "rise");
    expect(Math.max(...rise.filter((sample) => sample.t > .2 + 1.1).map((sample) => sample.x)), "rise within 2% by 1.1 s after release").toBeLessThan(.02);
    expect(Math.min(...rise.map((sample) => sample.x)), "critically damped, no overshoot").toBeGreaterThanOrEqual(0);
    // Four masks press against 100% and land exactly, inside the locked 2.3 s.
    for (const name of ["slice-a", "slice-b", "slice-c", "slice-d"]) {
      const slice = series(world, name);
      const landed = slice.find((sample) => sample.x === 1);
      expect(landed, name).toBeTruthy();
      expect(landed.t, `${name} lands by 2.3 s`).toBeLessThanOrEqual(2.3);
    }
    // Letters (omega 9, zeta .75): overshoot at most 3%.
    const letterNames = world.names.filter((name) => name.startsWith("letter-"));
    expect(letterNames).toHaveLength("Raiffeisen".length);
    for (const name of letterNames) {
      expect(Math.min(...series(world, name).map((sample) => sample.x)), `${name} overshoot`).toBeGreaterThanOrEqual(-.03);
    }
    expect(world.time, "the loop stops when the last mask lands").toBeLessThanOrEqual(2.32);
    expect(world.stats.mean, "mean script time per physics frame (ms)").toBeLessThan(1);

    // Frame-1 displacement at 60 Hz, read from the fixed-step samples 1/60 s
    // after each body starts (painted frames also carry the shared machine's
    // jank, which the fixed step absorbs). The panel moves at most 1% of its
    // travel. A letter's spring (omega 9, zeta .75) moves 1.03% in 1/60 s
    // analytically and 1.3% with the module's semi-implicit step, while the
    // letter is at about 10% ink (the former circ.out ease moved 15%).
    const firstFrame = (name, start, from, to) => {
      const sample = series(world, name).find((candidate) => candidate.t >= start + 1 / 60 - 1e-9);
      return Math.abs(sample.x - from) / Math.abs(to - from);
    };
    expect(firstFrame("plate", .2, tilt, 0), "plate frame-1 jump").toBeLessThanOrEqual(.01);
    expect(firstFrame("rise", .2, 1, 0), "rise frame-1 jump").toBeLessThanOrEqual(.01);
    ["slice-a", "slice-b", "slice-c", "slice-d"].forEach((name, index) => {
      expect(firstFrame(name, .2 + index * .14, 0, 1), `${name} frame-1 jump`).toBeLessThanOrEqual(.01);
    });
    letterNames.forEach((name, index) => {
      expect(firstFrame(name, .12 + index * .035, 1, 0), `${name} frame-1 jump`).toBeLessThanOrEqual(.015);
    });
    // The first painted entrance frame is the starting pose: nothing finished shows first.
    const frames = await page.evaluate(() => window.__frames);
    const entering = frames.filter((frame) => frame.state === "assembling" && frame.angle !== "");
    expect(entering.length).toBeGreaterThan(60);
    expect(Number(entering[0].angle)).toBeGreaterThanOrEqual(tilt * .99);
    expect(Number(entering[0].rise)).toBeGreaterThanOrEqual(.99);
    expect(entering[0].slice).toBe("0%");
    expect(entering[0].letters.every((value) => Number(value) >= .99)).toBe(true);
    // The real computed transform carries the entrance (the former GSAP path wrote none).
    expect(entering[0].transform).toMatch(/^matrix3d\(/);
    expect(new Set(entering.slice(0, 40).map((frame) => frame.transform)).size, "the computed pose changes while entering").toBeGreaterThan(20);
    const settled = await page.locator(".case-hero-media").evaluate((media) => getComputedStyle(media).transform);
    expect(entering[0].transform).not.toBe(settled);
    // Title restored to its semantic text, no layout shift.
    await expect(page.locator("#case-title")).toHaveText("Raiffeisen");
    expect(await page.locator("#case-title .case-opening-letter").count()).toBe(0);
    expect(await page.evaluate(() => window.__cls)).toBe(0);
  });
}

test("slow 4G: no frame paints the finished title or panel before the case entrance", async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await traceCase(page);
  await slow4g(page);
  await page.goto("/work/raiffeisen", { waitUntil: "load", timeout: 45000 });
  await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening.state), { timeout: 8000 }).toBe("settled");
  const { frames, fcp } = await page.evaluate(() => ({
    frames: window.__frames, fcp: performance.getEntriesByName("first-contentful-paint")[0].startTime,
  }));
  const start = frames.findIndex((frame) => frame.state === "assembling");
  expect(start, "the entrance ran").toBeGreaterThan(0);
  for (const frame of frames.slice(0, start)) {
    expect(frame, "before the entrance, the title and panel are unpainted").toMatchObject({ state: "pending", title: "0", media: "0" });
  }
  expect(fcp, "the first contentful paint is the gated stage").toBeLessThan(frames[start].t);
  expect(frames[start].t - frames[0].t, "the entrance starts inside the 2.9 s gate").toBeLessThan(2900);
});

test("the case gate fails open: without its owner after 2.9 s, without physics at once", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await traceCase(page);
  await page.route(/\/case-opening\.[a-f0-9]{12}\.js$/, (route) => route.abort());
  await page.goto("/work/instructure", { waitUntil: "load" });
  await expect(page.locator("#case-title")).toHaveCSS("opacity", "1", { timeout: 4000 });
  const frames = await page.evaluate(() => window.__frames);
  const shown = frames.find((frame) => frame.title === "1" && frame.media === "1");
  expect(shown.t - frames[0].t, "the stylesheet releases the gate by itself").toBeLessThan(3100);
  expect(shown.t - frames[0].t).toBeGreaterThan(2700);

  await page.unrouteAll();
  await page.route(/\/physics\.[a-f0-9]{12}\.js$/, (route) => route.abort());
  await page.goto("/work/bitpanda", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening?.state)).toBe("settled");
  const timing = await page.evaluate(() => ({ now: performance.now(), title: getComputedStyle(document.querySelector("#case-title")).opacity }));
  expect(timing.title).toBe("1");
  expect(timing.now, "without the physics module the opening finishes at once").toBeLessThan(2500);
});

for (const mode of ["reduce", "no-motion"]) {
  test(`${mode}: the case opening paints its end state with no physics frame, pixel-identical to the animated end`, async ({ browser }) => {
    const shots = {};
    for (const run of ["motion", mode]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: run === "reduce" ? "reduce" : "no-preference" });
      const page = await context.newPage();
      await returning(page);
      await recordPhysics(page);
      // html.no-motion also follows Save-Data (media.js), independent of the OS preference.
      if (run === "no-motion") await page.addInitScript(() => Object.defineProperty(navigator, "connection", {
        configurable: true, value: { saveData: true, addEventListener() {}, removeEventListener() {} },
      }));
      await page.goto("/work/raiffeisen", { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      if (run === "motion") {
        await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening.state), { timeout: 6000 }).toBe("settled");
      } else {
        expect(await page.evaluate(() => ({
          state: window.PortfolioCaseOpening.state, root: document.documentElement.getAttribute("data-case-opening"),
          title: getComputedStyle(document.querySelector("#case-title")).opacity,
          worlds: window.PortfolioPhysicsDebug.worlds.length, noMotion: document.documentElement.classList.contains("no-motion"),
        }))).toEqual({ state: "settled", root: "settled", title: "1", worlds: 0, noMotion: true });
      }
      // Past the 150-220px settle interval the panel rests in the reading plane.
      await page.evaluate(() => window.scrollTo(0, 300));
      await page.waitForTimeout(700);
      if (run === "motion") await expect(page.locator(".case-hero-media")).toHaveAttribute("data-case-flat", "");
      const clip = await page.locator(".case-study-header").evaluate((header) => {
        const box = header.getBoundingClientRect();
        const top = Math.max(64, box.top);
        return { x: 0, y: top, width: innerWidth, height: Math.min(innerHeight, box.bottom) - top };
      });
      shots[run] = await page.screenshot({ clip });
      await context.close();
    }
    expect(shots[mode].equals(shots.motion), "the end state matches the animated end state exactly").toBe(true);
  });
}

test("the scroll settle follows native scroll without changing it, then its loop stops", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await page.goto("/work/instructure", { waitUntil: "load" });
  await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening.state), { timeout: 6000 }).toBe("settled");
  const media = page.locator(".case-hero-media");
  await expect(media).toHaveCSS("--case-settle", "1");
  const trace = [];
  for (let tick = 0; tick < 4; tick += 1) {
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(120);
    trace.push(await page.evaluate(() => scrollY));
  }
  // The settle owner only reads scroll: each notch lands where native scroll put it.
  expect(trace).toEqual([100, 200, 300, 400]);
  await expect.poll(() => media.evaluate((element) => element.style.getPropertyValue("--case-settle")), { timeout: 1000 }).toBe("0");
  await expect(media).toHaveAttribute("data-case-flat", "");
  await expect(media).toHaveCSS("transform", "none");
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.PortfolioCaseOpening.settle.running), "the follower's loop has stopped").toBe(false);
  await page.mouse.wheel(0, -400);
  await expect.poll(() => media.evaluate((element) => element.style.getPropertyValue("--case-settle")), { timeout: 1000 }).toBe("1");
});

test("the case opening adds no non-passive wheel, touch or key listener", async ({ page }) => {
  await returning(page);
  await page.addInitScript(() => {
    window.__activeListeners = [];
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      const passive = typeof options === "object" && options !== null && options.passive === true;
      const source = (new Error().stack || "").match(/\/(case-opening|animations|physics|arrival)\.[a-f0-9]{12}\.js/);
      if (source && /^(wheel|mousewheel|touchstart|touchmove|keydown)$/.test(type) && !passive) window.__activeListeners.push(`${source[1]}: ${type}`);
      return add.call(this, type, listener, options);
    };
  });
  await page.goto("/work/raiffeisen", { waitUntil: "load" });
  await page.waitForTimeout(300);
  // arrival.js keeps its pre-existing capture keydown (Enter starts the curtain exit).
  expect(await page.evaluate(() => window.__activeListeners.filter((entry) => !entry.startsWith("arrival")))).toEqual([]);
});

/* ---- Home selected work and related cards -------------------------------- */
async function rowTrace(page) {
  await page.addInitScript(() => {
    window.__rowFrames = [];
    window.__rowTracing = false;
    const tick = () => {
      if (window.__rowTracing) {
        const thumb = document.querySelector(".work-row-thumb");
        const arrow = document.querySelector(".work-row-arrow");
        const image = new DOMMatrixReadOnly(getComputedStyle(thumb).transform === "none" ? undefined : getComputedStyle(thumb).transform);
        const mark = new DOMMatrixReadOnly(getComputedStyle(arrow).transform === "none" ? undefined : getComputedStyle(arrow).transform);
        window.__rowFrames.push({ t: performance.now(), scale: image.a, y: image.f, x: mark.e });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

test("home rows: clamped springs in and out, velocity carried through a reversal, loop stopped at rest", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await returning(page);
  await recordPhysics(page);
  await rowTrace(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".work-list")).toHaveAttribute("data-work-motion", "pointer");
  const row = page.locator(".work-row").first();
  await row.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + scrollY - 150));
  await page.mouse.move(2, 2);
  await page.waitForTimeout(200);
  const box = await row.boundingBox();
  await page.evaluate(() => { window.__rowTracing = true; });
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(110);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(60);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
  const frames = await page.evaluate(() => { window.__rowTracing = false; return window.__rowFrames; });
  for (const frame of frames) {
    expect(frame.scale).toBeLessThanOrEqual(1.0601);
    expect(frame.scale).toBeGreaterThanOrEqual(.9999);
    expect(frame.x).toBeLessThanOrEqual(4.01);
    expect(frame.y).toBeGreaterThanOrEqual(-2.01);
  }
  const firstMove = frames.find((frame) => frame.scale > 1);
  expect((firstMove.scale - 1) / .06, "frame-1 jump at most 5% of the travel").toBeLessThanOrEqual(.05);

  const world = await page.evaluate(() => {
    const candidate = window.PortfolioHover.rows;
    return { samples: candidate.samples, running: candidate.running, frames: candidate.stats.frames, names: candidate.bodies.map((body) => body.name) };
  });
  expect(world.names).toHaveLength(6);
  const spring = world.samples.map((row) => ({ t: row[0], x: row[1][0], v: row[1][1] }));
  // Velocity is continuous: per 1/240 s step it changes by no more than the
  // spring's own acceleration allows (the former GSAP reversal jumped 13.5/s in
  // one frame). A reversal is a jump in acceleration; across it the velocity
  // keeps its sign, so the frame decelerates before it turns back.
  let reversals = 0;
  for (let index = 1; index < spring.length; index += 1) {
    expect(Math.abs(spring[index].v - spring[index - 1].v)).toBeLessThan(3.2);
    if (index < 2 || spring[index].t - spring[index - 2].t > 3 / 240) continue;
    const jerk = (spring[index].v - spring[index - 1].v) - (spring[index - 1].v - spring[index - 2].v);
    if (Math.abs(jerk) > 1 && Math.abs(spring[index - 1].v) > .5) {
      reversals += 1;
      expect(Math.sign(spring[index].v), "the step after a reversal keeps the direction of travel").toBe(Math.sign(spring[index - 1].v));
    }
  }
  expect(reversals, "out and back in again").toBeGreaterThanOrEqual(2);
  expect(Math.min(...spring.map((sample) => sample.x))).toBeGreaterThanOrEqual(0);
  expect(Math.max(...spring.map((sample) => sample.x))).toBeLessThanOrEqual(1);
  expect(spring.at(-1).x).toBe(0);
  expect(world.running, "the hover loop stops at rest").toBe(false);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.PortfolioHover.rows.stats.frames)).toBe(world.frames);
});

test("related project cards: image and title line on critically damped springs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await page.goto("/work/raiffeisen", { waitUntil: "load" });
  await expect(page.locator("html")).toHaveClass(/gsap-ready/);
  const card = page.locator(".related-work-card").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const line = card.locator(".work-title-line");
  const image = card.locator(".work-image");
  await expect(line).toHaveCSS("transform", "matrix(0, 0, 0, 1, 0, 0)");
  await card.hover();
  await expect.poll(() => image.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeCloseTo(1.025, 3);
  await expect.poll(() => line.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeCloseTo(1, 3);
  await page.mouse.move(2, 2);
  await expect.poll(() => line.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeCloseTo(0, 3);
  await expect(image).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => window.PortfolioHover.cards.running)).toBe(false);
});

/* ---- Arrival pre-curtain gate -------------------------------------------- */
async function traceArrival(page) {
  await page.addInitScript(() => {
    window.__arrivalFrames = [];
    const tick = () => {
      const body = document.body;
      const veil = body ? getComputedStyle(body, "::after") : null;
      window.__arrivalFrames.push({
        t: performance.now(), gate: document.documentElement.hasAttribute("data-arrival-gate"),
        veil: Boolean(veil && veil.content !== "none" && veil.visibility === "visible" && veil.display !== "none"),
        curtain: Boolean(document.querySelector(".site-arrival")),
      });
      if (window.__arrivalFrames.length < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

for (const route of ["/", "/work/raiffeisen"]) {
  test(`slow 4G first arrival on ${route}: the page never paints before the curtain`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await traceArrival(page);
    await slow4g(page);
    await page.goto(route, { waitUntil: "load", timeout: 45000 });
    await expect(page.locator(".site-arrival")).toBeVisible();
    const { frames, fcp } = await page.evaluate(() => ({
      frames: window.__arrivalFrames, fcp: performance.getEntriesByName("first-contentful-paint")[0].startTime,
    }));
    const curtain = frames.findIndex((frame) => frame.curtain);
    expect(curtain).toBeGreaterThan(0);
    for (const frame of frames.slice(0, curtain)) expect(frame, "the navy veil holds until the curtain").toMatchObject({ gate: true, veil: true });
    expect(frames[curtain], "the curtain replaces the veil in the same frame").toMatchObject({ gate: false, curtain: true });
    expect(fcp).toBeLessThan(frames[curtain].t);
    await page.keyboard.press("Escape");
    await expect(page.locator(".site-arrival")).toHaveCount(0);
  });
}

test("the pre-curtain gate fails open after four seconds and never applies to a returning or reduced-motion visit", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await traceArrival(page);
  await page.route(/\/arrival\.[a-f0-9]{12}\.js$/, (route) => route.abort());
  await page.goto("/work/benker", { waitUntil: "load" });
  await expect.poll(() => page.evaluate(() => window.__arrivalFrames.at(-1).veil), { timeout: 5000 }).toBe(false);
  const frames = await page.evaluate(() => window.__arrivalFrames);
  const lifted = frames.find((frame) => !frame.veil);
  expect(frames[0].veil, "a first visit starts veiled").toBe(true);
  expect(lifted.t - frames[0].t).toBeGreaterThan(3800);
  expect(lifted.t - frames[0].t, "the veil lifts by itself").toBeLessThan(4300);
  await expect(page.locator("#case-title")).toBeVisible();

  await page.unrouteAll();
  await page.goto("/work/benker", { waitUntil: "load" });
  expect(await page.evaluate(() => window.__arrivalFrames.some((frame) => frame.gate)), "a returning visit is never veiled").toBe(false);
  await page.evaluate(() => sessionStorage.clear());
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "load" });
  expect(await page.evaluate(() => window.__arrivalFrames.some((frame) => frame.gate || frame.veil)), "reduced motion is never veiled").toBe(false);
});

/* ---- Compact menu drop --------------------------------------------------- */
test("390: the compact menu drops from the bar on a sampled spring and closes at once", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await returning(page);
  await page.goto("/work/raiffeisen", { waitUntil: "load" });
  const toggle = page.locator(".menu-button");
  await expect(toggle).toHaveAttribute("data-navigation-ready", "true");
  await toggle.click();
  const opening = await page.evaluate(() => {
    const menu = document.querySelector("#primary-navigation");
    const animations = document.getAnimations().map((animation) => ({
      name: animation.animationName, target: animation.effect.target === menu ? "menu" : animation.effect.pseudoElement || "other",
      duration: animation.effect.getTiming().duration, easing: animation.effect.getKeyframes()[0].easing, state: animation.playState,
    })).filter((animation) => /^compact-menu-/.test(animation.name));
    return { animations, pointer: getComputedStyle(menu).pointerEvents, inert: menu.closest("[inert]") !== null };
  });
  expect(opening.pointer).toBe("auto");
  expect(opening.inert).toBe(false);
  const drop = opening.animations.find((animation) => animation.name === "compact-menu-drop");
  const turn = opening.animations.find((animation) => animation.name === "compact-menu-turn");
  expect(drop).toMatchObject({ target: "menu", duration: 260 });
  expect(drop.easing).toMatch(/^linear\(/);
  expect(turn).toMatchObject({ target: "::before", duration: 300 });
  const works = page.locator('#primary-navigation a.nav-link[href="/works"]');
  await page.waitForTimeout(60);
  expect(await works.evaluate((link) => {
    const box = link.getBoundingClientRect();
    return link.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), "the first destination is a live target within a few frames").toBe(true);
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => ({
    display: getComputedStyle(document.querySelector("#primary-navigation")).display,
    running: document.getAnimations().filter((animation) => /^compact-menu-/.test(animation.animationName)).length,
  })), "closing is instant").toEqual({ display: "none", running: 0 });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => /^compact-menu-/.test(animation.animationName)).length),
    "reduced motion opens without movement").toBe(0);
});
