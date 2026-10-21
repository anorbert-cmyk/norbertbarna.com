// First-party physics motion (2026-10-07). Part A: the case opening, the
// home selected-work and related-card hover springs, the arrival pre-curtain
// gate and the compact menu drop. Part B: the home scroll follower, the glass
// (tilt, drag, assembly, compact turn), the consent refit and the case TOC
// chip. Assertions read the module's own world samples
// (PortfolioPhysicsDebug) and a requestAnimationFrame tracer that starts with
// the document, so every painted frame is accounted for.
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

test("physics.js loads deferred in the head of the cases, both homes and both AI pages, before their owners use it", async ({ page }) => {
  await returning(page);
  for (const route of ["/", "/hu", "/work/raiffeisen", "/hu/munka/kineticare", "/ai-integration", "/hu/ai-integracio"]) {
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

test("the physics owners add no non-passive wheel, touch or key listener", async ({ page }) => {
  await returning(page);
  await page.addInitScript(() => {
    window.__activeListeners = [];
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      const passive = typeof options === "object" && options !== null && options.passive === true;
      const source = (new Error().stack || "").match(/\/(case-opening|animations|physics|arrival|hero-scene|home-composition|immersive-navigation)\.[a-f0-9]{12}\.js/);
      if (source && /^(wheel|mousewheel|touchstart|touchmove|keydown)$/.test(type) && !passive) window.__activeListeners.push(`${source[1]}: ${type}`);
      return add.call(this, type, listener, options);
    };
  });
  for (const route of ["/work/raiffeisen", "/", "/ai-integration"]) {
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(300);
    // arrival.js keeps its pre-existing capture keydown (Enter starts the curtain exit).
    expect(await page.evaluate(() => window.__activeListeners.filter((entry) => !entry.startsWith("arrival"))), route).toEqual([]);
  }
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

test("input during the case entrance hurries it from where it is instead of cutting to the end", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await recordPhysics(page);
  await page.goto("/work/raiffeisen", { waitUntil: "load" });
  await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening.state)).toBe("assembling");
  // Mid-entrance: the plate is still leaning back and the last mask is closed.
  await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening.entrance?.time ?? 0)).toBeGreaterThan(.35);
  const pressed = await page.evaluate(() => window.PortfolioCaseOpening.entrance.time);
  expect(pressed, "the key arrives before the entrance would end").toBeLessThan(1.6);
  await page.keyboard.press("Shift");
  await expect.poll(() => page.evaluate(() => window.PortfolioCaseOpening.state), { timeout: 1500 }).toBe("settled");
  const world = await entranceWorld(page);
  // Settled well before the plan's 2.3 s, and by about .6 s after the input.
  expect(world.time, "the hurried entrance ends early").toBeLessThan(Math.max(pressed, .4) + .65);
  // No body jumps: between two fixed 1/240 s steps nothing moves more than a
  // 60 Hz frame's worth of a fast spring (the end is reached by motion, not a cut).
  for (const name of world.names) {
    const run = series(world, name);
    const span = Math.max(...run.map((sample) => sample.x)) - Math.min(...run.map((sample) => sample.x)) || 1;
    for (let index = 1; index < run.length; index += 1) {
      expect(Math.abs(run[index].x - run[index - 1].x) / span, `${name} step at ${run[index].t.toFixed(3)} s`).toBeLessThan(.03);
    }
  }
  expect(Math.min(...series(world, "plate").map((sample) => sample.x)), "never past the stop").toBeGreaterThanOrEqual(0);
  // The simulation itself reached the end pose (a cut would stop it mid-way).
  for (const name of world.names) {
    const end = series(world, name).at(-1).x;
    expect(Math.abs(end - (name.startsWith("slice-") ? 1 : 0)), `${name} ends in place`).toBeLessThan(.002);
  }
  await expect(page.locator("#case-title")).toHaveText("Raiffeisen");
  expect(await page.locator("#case-title .case-opening-letter").count()).toBe(0);
});

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

/* ---- Part B: shared helpers ------------------------------------------------ */
const DEG = Math.PI / 180;
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const smoothstep = (n) => { n = clamp01(n); return n * n * (3 - 2 * n); };
// Columns of a world's fixed-step samples, by body name. key: "hero" (the
// glass), "home" (the scroll follower) or "consent" (the stage refit).
function readWorld(page, key, names) {
  return page.evaluate(({ key, names }) => {
    const world = key === "hero" ? window.PortfolioHeroScene.world : key === "home" ? window.PortfolioHomeMorph.world : window.PortfolioConsentStage;
    const index = names.map((name) => world.bodies.findIndex((body) => body.name === name));
    return {
      running: world.running, time: world.time, frames: world.stats.frames,
      impacts: Object.fromEntries(names.map((name, i) => [name, world.bodies[index[i]].impacts.map((impact) => impact.time)])),
      series: Object.fromEntries(names.map((name, i) => [name, world.samples.map((row) => ({ t: row[0], x: row[index[i] + 1][0], v: row[index[i] + 1][1] }))])),
    };
  }, { key, names });
}
async function heroRested(page) {
  await expect.poll(() => page.evaluate(() => {
    const world = window.PortfolioHeroScene?.world;
    return Boolean(world) && !world.running && world.time > 2;
  }), { timeout: 8000 }).toBe(true);
}
// The largest change across any 1/60 s of simulated time (four fixed steps).
function perSixtieth(series, map) {
  let step = 0;
  for (let i = 4; i < series.length; i += 1) step = Math.max(step, Math.abs(map(series[i].x) - map(series[i - 4].x)));
  return step;
}

test("60 Hz and 120 Hz frames end the follower, the assembly and a thrown glass in the same state", () => {
  function run(frameMs) {
    const world = Physics.createWorld({ clock: "external", reduced: false, limit: 30 });
    const spring = (omega, zeta, options) => world.spring({ stiffness: omega * omega, dampingCoefficient: 2 * zeta * omega, ...options });
    const follow = spring(36, 1, { precision: 1e-4, restVelocity: 2e-3 });
    const place = [0, 114, 228].map(() => spring(2.6, .8, { from: 1, to: 1, precision: .0015 }));
    const spin = [0, 114, 228].map(() => spring(2.9, .92, { from: 1, to: 1, precision: .002 }));
    const yaw = spring(6, .5, { from: 30 * DEG, to: 30 * DEG, limits: [-60 * DEG, 60 * DEG], restitution: .3, precision: 1e-4 });
    [0, 114, 228].forEach((delay, i) => world.at(.2 + delay / 1000, () => { place[i].set(0); spin[i].set(0); }));
    world.at(.1, () => follow.set(.3));
    world.at(.25, () => yaw.set(-27 * DEG, 600 * DEG));
    world.start();
    let stamp = 1000;
    while (world.advance(stamp)) stamp += frameMs;
    return { follow: follow.value, place: place.map((s) => s.value), spin: spin.map((s) => s.value), yaw: yaw.value, impacts: yaw.impacts.map((impact) => impact.time), time: world.time };
  }
  const sixty = run(1000 / 60);
  const twice = run(1000 / 120);
  expect(sixty.follow).toBe(.3);
  expect(sixty.place).toEqual([0, 0, 0]);
  expect(sixty.yaw).toBe(-27 * DEG);
  expect(sixty.impacts.length, "a 600 deg/s throw from 30 deg meets the 60 deg stop").toBeGreaterThan(0);
  expect(twice).toEqual({ ...sixty, time: twice.time });
  expect(Math.abs(twice.time - sixty.time)).toBeLessThan(1 / 60);
});

/* ---- Item 2: the home scroll follower ---------------------------------- */
test("1440: twelve notched wheel ticks move the home morph through the omega 36 follower; glass and copy paint in one frame", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await recordPhysics(page);
  await page.addInitScript(() => {
    window.__morph = [];
    window.__tracing = false;
    const tick = () => {
      if (window.__tracing && window.PortfolioHomeMorph && window.PortfolioHeroScene?.drawn) {
        window.__morph.push({ t: performance.now(), p: window.PortfolioHomeMorph.progress, glass: window.PortfolioHeroScene.drawn.morph });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  await expect.poll(() => page.evaluate(() => window.PortfolioHeroScene?.status)).toBe("ready");
  await page.evaluate(() => {
    window.PortfolioHeroScene.finish();
    const world = window.PortfolioHomeMorph.world, spring = world.bodies[0], set = spring.set.bind(spring);
    window.__targets = [];
    spring.set = (target, velocity) => {
      if (target !== spring.target) window.__targets.push({ t: world.time, target, from: spring.target });
      return set(target, velocity);
    };
  });
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__tracing = true; });
  const trace = [];
  for (let tick = 0; tick < 12; tick += 1) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(90);
    trace.push(await page.evaluate(() => scrollY));
  }
  // The follower only reads scroll: each notch lands where native scroll put it.
  expect(trace).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200]);
  await expect.poll(() => page.evaluate(() => window.PortfolioHomeMorph.world.running), { timeout: 2000 }).toBe(false);
  const world = await readWorld(page, "home", ["scroll"]);
  const { targets, morph } = await page.evaluate(() => { window.__tracing = false; return { targets: window.__targets, morph: window.__morph }; });
  const follower = world.series.scroll;
  const progress = (x) => smoothstep((x - .04) / .74);
  const reveal = (x) => smoothstep((progress(x) - .6) / .4);
  // Per frame at 60 Hz, the worst of every 1/60 s window of the fixed-step
  // samples (the shared machine's long frames are absorbed by the fixed step);
  // the former direct paint moved .20 and .59. The plan's .05 and .15 hold for
  // ticks 130 ms or more apart; closer ticks across the reveal's steepest part
  // (p near .8, where one 100px notch spans a quarter of the opacity) reach
  // .055 and .165 with omega 36 (simulated worst case, 90-200 ms apart).
  expect(perSixtieth(follower, progress), "progress per 1/60 s").toBeLessThanOrEqual(.055);
  expect(perSixtieth(follower, reveal), "intro opacity per 1/60 s").toBeLessThanOrEqual(.165);
  expect(Math.min(...follower.map((sample) => sample.v)), "critically damped: forward ticks never pull it back").toBeGreaterThanOrEqual(-1e-6);
  // Settled after the last tick that still moved the pose (later ticks are past the track's end).
  const last = targets.at(-1);
  // The plan's settle measure: within 2% of the distance still to go when the
  // last tick lands (the follower may still be catching up the tick before).
  const atTick = follower.find((sample) => sample.t >= last.t - 1e-9);
  const gap = Math.abs(atTick.x - last.target);
  expect(gap).toBeGreaterThan(0);
  const settled = follower.find((sample) => sample.t > last.t && Math.abs(sample.x - last.target) <= .02 * gap);
  expect(settled.t - last.t, "within 2% of the last tick by 200 ms").toBeLessThanOrEqual(.2 + 1e-9);
  expect(follower.at(-1).x, "it rests exactly on the scroll position").toBe(last.target);
  // The plan: the loop stops within 300 ms of settling.
  expect(follower.at(-1).t - settled.t, "and stops by itself").toBeLessThanOrEqual(.3 + 1e-9);
  // The glass painted the copy's value in the copy's frame, every frame.
  expect(morph.length).toBeGreaterThan(20);
  for (const frame of morph) expect(Math.abs(frame.p - frame.glass), "glass and copy share the frame").toBeLessThanOrEqual(2e-5);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.PortfolioHomeMorph.world.stats.frames), "the follower's loop has stopped").toBe(world.frames);

  // Focus and pointer gating read the scroll position, not the follower: the
  // frame the scroll reaches the reading pose, its action is already a target.
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.PortfolioHomeMorph.progress), { timeout: 2000 }).toBe(0);
  // The follower is held 30 ms into its run, so a slow frame on a loaded
  // machine cannot finish the catch-up before the gate is read.
  const gate = await page.evaluate(() => new Promise((resolve) => {
    const track = document.querySelector(".home-mast-track");
    window.PortfolioPhysicsDebug.hold = .03;
    scrollTo(0, track.offsetHeight);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const intro = document.querySelector(".home-mast-intro");
      resolve({ opacity: Number(intro.style.opacity), tabindex: intro.querySelector("a").getAttribute("tabindex"), pointer: intro.style.pointerEvents, target: window.PortfolioHomeMorph.target });
      window.PortfolioPhysicsDebug.hold = null;
    }));
  }));
  expect(gate.target).toBe(1);
  expect(gate.opacity, "the copy is still catching up").toBeLessThan(.95);
  expect(gate, "but its action is already focusable and clickable").toMatchObject({ tabindex: null, pointer: "" });
  await expect(page.locator(".home-mast-intro")).toHaveCSS("opacity", "1");
});

test("390: native scroll turns the compact glass through its omega 36 follower, and a still page leaves it still", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await returning(page);
  await recordPhysics(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".home-mast")).toHaveAttribute("data-glass-live", "");
  await heroRested(page);
  const before = await page.evaluate(() => window.PortfolioHeroScene.drawn.turn);
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(180);
  await heroRested(page);
  const world = await readWorld(page, "hero", ["turn"]);
  const turn = world.series.turn.filter((sample) => sample.t > 0);
  const target = await page.evaluate(() => {
    const scene = document.querySelector(".home-mast-scene").getBoundingClientRect();
    return Math.max(0, Math.min(1, -scene.top / scene.height));
  });
  expect(target).toBeGreaterThan(before);
  const moving = turn.filter((sample) => sample.v !== 0);
  expect(moving.length, "the turn followed instead of jumping").toBeGreaterThan(20);
  expect(Math.max(...turn.map((sample) => sample.x)), "no overshoot").toBeLessThanOrEqual(target + 1e-9);
  const start = moving[0].t;
  const settled = turn.find((sample) => sample.t > start && Math.abs(sample.x - target) <= .01 * (target - before));
  expect(settled.t - start, "within 1% by 200 ms").toBeLessThanOrEqual(.2);
  expect(turn.at(-1).x).toBeCloseTo(target, 9);
  expect(await page.evaluate(() => window.PortfolioHeroScene.drawn.turn)).toBeCloseTo(target, 9);
  const frames = world.frames;
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.PortfolioHeroScene.world.stats.frames), "a still page runs no physics frame").toBe(frames);
});

/* ---- Item 3: tilt, drag, fling and the torsion return ----------------- */
// Drags the glass with synthetic pointer events at a fixed rate. The page
// busy-waits between events, so their timestamps are the real input times.
async function throwGlass(page, { rate, px, duration, pause = 0 }) {
  return page.evaluate(({ rate, px, duration, pause }) => {
    const box = document.querySelector(".home-mast-sculpture").getBoundingClientRect();
    const x0 = box.left + box.width / 2, y0 = box.top + box.height / 2;
    const target = document.elementFromPoint(x0, y0);
    const init = (x) => ({ bubbles: true, clientX: x, clientY: y0, button: 0, pointerType: "mouse", isPrimary: true });
    target.dispatchEvent(new PointerEvent("pointerdown", init(x0)));
    // Events every 1000/rate ms at a constant speed; the last one lands
    // exactly at the end of the stroke, so no rate holds the pointer still
    // for part of a period before the release.
    const begin = performance.now();
    let x = x0;
    for (let k = 1; ; k += 1) {
      const due = Math.min(duration, k * 1000 / rate);
      while (performance.now() - begin < due) { /* the next event */ }
      x = x0 + px * due / duration;
      target.dispatchEvent(new PointerEvent("pointermove", init(x)));
      if (due >= duration) break;
    }
    const still = performance.now() + pause;
    while (performance.now() < still) { /* holding the pointer still */ }
    window.dispatchEvent(new PointerEvent("pointerup", init(x)));
    const world = window.PortfolioHeroScene.world;
    return { fling: window.PortfolioHeroScene.fling, released: world.bodies.find((body) => body.name === "yaw").value, at: world.time };
  }, { rate, px, duration, pause });
}
function afterRelease(world, release) {
  return world.series.yaw.filter((sample) => sample.t >= release.at - 1e-9);
}

test("1440: a throw is read from event time, so 125 Hz and 1000 Hz mice throw alike; the glass returns to rest inside its stops", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await recordPhysics(page);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  await heroRested(page);
  const throws = {};
  for (const rate of [125, 1000]) {
    const release = await throwGlass(page, { rate, px: 150, duration: 100 });
    await heroRested(page);
    const world = await readWorld(page, "hero", ["yaw"]);
    const motion = afterRelease(world, release);
    throws[rate] = { fling: release.fling / DEG, released: release.released / DEG, peak: Math.max(...motion.map((sample) => sample.x)) / DEG, rest: motion.at(-1).x / DEG };
    expect(Math.max(...world.series.yaw.map((sample) => Math.abs(sample.x))), "never past the 60 degree stops").toBeLessThanOrEqual(60 * DEG + 1e-9);
  }
  // .2 deg per px: 150 px in 100 ms is 300 deg/s, released at -27 + 30 = 3 deg.
  for (const rate of [125, 1000]) {
    expect(throws[rate].fling, `${rate} Hz fling`).toBeGreaterThan(285);
    expect(throws[rate].fling, `${rate} Hz fling`).toBeLessThan(315);
    expect(throws[rate].released).toBeCloseTo(3, 6);
    expect(throws[rate].rest, "back at the rest yaw").toBeCloseTo(-27, 9);
  }
  expect(Math.abs(throws[1000].fling - throws[125].fling) / throws[125].fling, "release velocity independent of event rate").toBeLessThanOrEqual(.05);
  const coast = (rate) => throws[rate].peak - throws[rate].released;
  expect(coast(125)).toBeGreaterThan(1);
  expect(Math.abs(coast(1000) - coast(125)) / coast(125), "how far it is thrown, independent of event rate").toBeLessThanOrEqual(.05);

  // A hard throw is clamped to 600 deg/s, meets the stop and bounces back.
  // 300 px in 40 ms releases at -27 + 60 = 33 deg; from there the omega 6,
  // zeta .5 return carries a 600 deg/s throw onto the 60 deg stop.
  const hard = await throwGlass(page, { rate: 1000, px: 300, duration: 40 });
  await heroRested(page);
  const world = await readWorld(page, "hero", ["yaw"]);
  const motion = afterRelease(world, hard);
  expect(hard.fling / DEG).toBeCloseTo(600, 6);
  expect(Math.max(...motion.map((sample) => sample.x)), "it reaches the stop and never passes it").toBeCloseTo(60 * DEG, 9);
  const impact = world.impacts.yaw.find((time) => time >= hard.at);
  expect(impact, "a hard stop, with restitution").toBeTruthy();
  const after = motion.find((sample) => sample.t > impact);
  expect(after.v, "it bounces back from the stop").toBeLessThan(0);
  expect(motion.at(-1).x).toBeCloseTo(-27 * DEG, 9);

  // Dragged far and held still, the rubber band keeps the yaw short of 60 deg.
  const band = await throwGlass(page, { rate: 125, px: 600, duration: 400, pause: 120 });
  expect(band.released / DEG, "the band gives toward the stop").toBeGreaterThan(55);
  expect(band.released / DEG).toBeLessThan(60);
  expect(Math.abs(band.fling), "held still before release: no throw").toBeLessThan(1e-9);
  await heroRested(page);
  const frames = await page.evaluate(() => window.PortfolioHeroScene.world.stats.frames);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.PortfolioHeroScene.world.stats.frames), "the glass loop stops at rest").toBe(frames);
});

test("1440: pointer tilt rides an omega 7.5, zeta .7 spring and stops at rest", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await recordPhysics(page);
  await page.goto("/", { waitUntil: "load" });
  await heroRested(page);
  await page.mouse.move(720, 450);
  await heroRested(page);
  await page.mouse.move(1000, 450);
  await heroRested(page);
  const world = await readWorld(page, "hero", ["tilt-y"]);
  const tilt = world.series["tilt-y"];
  const target = tilt.at(-1).x;
  expect(target).toBeGreaterThan(0);
  const start = tilt.findLastIndex((sample, index) => index && sample.v !== 0 && tilt[index - 1].v === 0);
  const run = tilt.slice(Math.max(0, start - 1));
  const from = run[0].x;
  const overshoot = (Math.max(...run.map((sample) => sample.x)) - target) / (target - from);
  expect(overshoot, "zeta .7 overshoots about 4.6%").toBeLessThan(.06);
  expect(overshoot).toBeGreaterThan(.02);
  const first = run.find((sample) => sample.t >= run[0].t + 1 / 60 - 1e-9);
  expect((first.x - from) / (target - from), "frame-1 jump").toBeLessThanOrEqual(.05);
});

/* ---- Item 5: the assembly springs -------------------------------------- */
test("1440: each slice assembles on its own translation (omega 2.6, zeta .8) and rotation (omega 2.9, zeta .92) springs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await recordPhysics(page);
  await page.addInitScript(() => {
    window.__glass = [];
    const tick = () => {
      if (window.PortfolioHeroScene?.drawn && window.__glass.length < 400) window.__glass.push(window.PortfolioHeroScene.drawn.scatter);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto("/", { waitUntil: "load" });
  await heroRested(page);
  const names = [];
  for (let index = 0; index < 7; index += 1) names.push(`place-${index}`, `spin-${index}`);
  const world = await readWorld(page, "hero", names);
  const delays = [0, 114, 228, 76, 190, 38, 152];
  const begin = world.series["place-0"][0].t - Physics.STEP;
  for (let index = 0; index < 7; index += 1) {
    for (const [name, overshoot, frameOne] of [[`place-${index}`, .016, .0015], [`spin-${index}`, .001, .0015]]) {
      const series = world.series[name];
      expect(series[0].x, `${name} starts scattered`).toBe(1);
      const released = series.find((sample) => sample.x < 1);
      // Released on the first fixed step at or after 200 ms plus its delay.
      expect(released.t - begin - Physics.STEP, `${name} released 200 ms after Enter plus its delay`).toBeGreaterThanOrEqual(.2 + delays[index] / 1000 - 1e-9);
      expect(released.t - begin - Physics.STEP, name).toBeLessThan(.2 + delays[index] / 1000 + Physics.STEP);
      const first = series.find((sample) => sample.t >= released.t - Physics.STEP + 1 / 60 - 1e-9);
      expect(1 - first.x, `${name} frame-1 jump`).toBeLessThanOrEqual(frameOne);
      expect(-Math.min(...series.map((sample) => sample.x)), `${name} overshoot`).toBeLessThanOrEqual(overshoot);
      expect(Math.max(...series.filter((sample) => sample.t - begin >= 2.2).map((sample) => Math.abs(sample.x))), `${name} within 2% by 2.2 s`).toBeLessThanOrEqual(.02);
      expect(series.at(-1).x, `${name} rests seated`).toBe(0);
    }
  }
  expect(world.time - begin, "the last overshoot returns and the loop stops").toBeLessThan(4);
  const glass = await page.evaluate(() => window.__glass);
  expect(glass[0], "the first painted frame is the scattered start, never the finished form").toBeGreaterThanOrEqual(.999);
  const frames = world.frames;
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.PortfolioHeroScene.world.stats.frames)).toBe(frames);
});

/* ---- Item 6: the consent refit ----------------------------------------- */
async function firstConsentVisit(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.removeItem("bn-analytics-consent-v1");
  });
}

test("1440: after a consent decision the home stage relaxes on an omega 12 spring, at most .02 scale per frame; the banner and layout change at once", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await firstConsentVisit(page);
  await recordPhysics(page);
  await page.addInitScript(() => {
    window.__stage = [];
    window.__tracing = false;
    window.__fits = [];
    const tick = () => {
      const scene = document.querySelector(".home-mast-scene");
      if (window.__tracing && scene) {
        const banner = document.querySelector("[data-consent-banner]");
        window.__stage.push({
          t: performance.now(), scale: Number(getComputedStyle(document.querySelector(".home-mast-sculpture")).scale),
          cover: scene.style.getPropertyValue("--consent-cover"), banner: Boolean(banner && !banner.hidden && banner.getClientRects().length),
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator("[data-consent-banner]")).toBeVisible();
  await expect(page.locator(".home-mast")).toHaveAttribute("data-morph-active", "");
  const scene = page.locator(".home-mast-scene");
  // The stage yields the banner's space at once, so nothing is under it.
  const fit = await scene.getAttribute("data-consent-fit");
  const [cover, scale] = fit.split("/").map(Number);
  expect(cover).toBeGreaterThan(40);
  expect(await scene.evaluate((element) => element.style.getPropertyValue("--consent-scale"))).toBe(String(scale));
  await page.evaluate(() => {
    const scene = document.querySelector(".home-mast-scene");
    new MutationObserver(() => window.__fits.push(scene.getAttribute("data-consent-fit"))).observe(scene, { attributes: true, attributeFilter: ["data-consent-fit"] });
    window.__tracing = true;
  });
  await page.locator('[data-consent-decision="rejected"]').click();
  await expect(scene).toHaveAttribute("data-consent-fit", "0/1");
  await expect.poll(() => page.evaluate(() => window.PortfolioConsentStage.running)).toBe(false);
  const { stage, fits, height } = await page.evaluate(() => {
    window.__tracing = false;
    return { stage: window.__stage, fits: window.__fits, height: document.querySelector(".home-mast-scene").clientHeight };
  });
  const world = await readWorld(page, "consent", ["consent-cover"]);
  const refit = world.series["consent-cover"];
  expect(refit[0].x).toBeLessThanOrEqual(cover);
  expect(refit.at(-1).x).toBe(0);
  expect(Math.min(...refit.map((sample) => sample.x)), "critically damped: it never overshoots the freed space").toBeGreaterThanOrEqual(0);
  const toScale = (x) => Math.max(.15, 1 - x / height);
  expect(perSixtieth(refit, toScale), "scale per 1/60 s").toBeLessThanOrEqual(.02);
  // The banner leaves and the layout variable changes in the first frame; the
  // stage's scale moves over many frames, each step bounded by its duration.
  const first = stage.findIndex((frame) => !frame.banner);
  expect(stage[first].cover, "layout is instant").toBe("0px");
  const moving = stage.slice(first);
  expect(moving.filter((frame) => frame.scale > scale + 1e-4 && frame.scale < 1 - 1e-4).length, "the scale is sprung, not snapped").toBeGreaterThan(3);
  for (let i = 1; i < moving.length; i += 1) {
    const frames = Math.max(1, Math.round((moving[i].t - moving[i - 1].t) / (1000 / 60)));
    expect(moving[i].scale - moving[i - 1].scale, "painted scale step").toBeLessThanOrEqual(.02 * frames + 1e-4);
  }
  expect(fits, "the glass is told the resting pose once").toEqual(["0/1"]);
  expect(world.time, "settled within .9 s").toBeLessThan(.9);
});

for (const mode of ["reduce", "no-motion"]) {
  test(`${mode}: the home glass, follower and consent refit run no physics frame and end in the animated end state`, async ({ browser }) => {
    const ends = {};
    for (const run of ["motion", mode]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: run === "reduce" ? "reduce" : "no-preference" });
      const page = await context.newPage();
      await firstConsentVisit(page);
      await recordPhysics(page);
      if (run === "no-motion") await page.addInitScript(() => Object.defineProperty(navigator, "connection", {
        configurable: true, value: { saveData: true, addEventListener() {}, removeEventListener() {} },
      }));
      await page.goto("/", { waitUntil: "load" });
      await expect(page.locator("[data-consent-banner]")).toBeVisible();
      await page.mouse.move(720, 450);
      await page.mouse.move(900, 400, { steps: 4 });
      await page.mouse.wheel(0, 200);
      await page.locator('[data-consent-decision="rejected"]').click();
      await expect(page.locator(".home-mast-scene")).toHaveAttribute("data-consent-fit", "0/1");
      await page.waitForTimeout(run === "motion" ? 1200 : 400);
      ends[run] = await page.evaluate(() => [".home-mast-statement", ".home-mast-sculpture", ".home-mast-baseline"].map((selector) => {
        const style = getComputedStyle(document.querySelector(selector));
        return [style.translate, style.scale];
      }));
      if (run !== "motion") {
        const worlds = await page.evaluate(() => window.PortfolioPhysicsDebug.worlds.map((world) => ({ frames: world.stats.frames, running: world.running })));
        expect(worlds.length).toBeGreaterThan(0);
        for (const world of worlds) expect(world, "no physics frame").toEqual({ frames: 0, running: false });
        expect(await page.evaluate(() => document.documentElement.classList.contains("no-motion"))).toBe(true);
      }
      await context.close();
    }
    expect(ends[mode], "the stage's end pose matches the animated end").toEqual(ends.motion);
  });
}

/* ---- Item 4: the case TOC chip ----------------------------------------- */
test("case TOC chips change colour, fill and border in the same frame", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await returning(page);
  await page.goto("/work/raiffeisen", { waitUntil: "load" });
  const chip = page.locator(".case-toc a").first();
  await chip.scrollIntoViewIfNeeded();
  expect(await chip.evaluate((element) => getComputedStyle(element).transitionDuration.split(",").every((value) => parseFloat(value) === 0))).toBe(true);
  await chip.hover();
  const hovered = await chip.evaluate((element) => new Promise((resolve) => requestAnimationFrame(() => {
    const style = getComputedStyle(element);
    resolve([style.color, style.backgroundColor, style.borderTopColor]);
  })));
  expect(hovered).toEqual(["rgb(255, 255, 255)", "rgb(17, 17, 17)", "rgb(17, 17, 17)"]);
});
