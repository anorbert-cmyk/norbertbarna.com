#!/usr/bin/env node
/**
 * Browser checks against the deployed site (Live QA workflow):
 * the Kineticare walkthrough spans its text column, plays without a click
 * and drops no frames; the navigation and the flag language menu work; the
 * contact pages render the Turnstile widget; no page throws, and nothing
 * overflows a phone viewport. Exits 1 on any failure.
 *   LIVE_BASE=https://www.barnanorbert.com node scripts/live-browser.mjs
 */
import { appendFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = (process.env.LIVE_BASE || "https://www.barnanorbert.com").replace(/\/$/, "");
const failures = [];
const passes = [];
const fail = (m) => { failures.push(m); console.log(`FAIL ${m}`); };
const pass = (m) => { passes.push(m); console.log(`ok   ${m}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function openPage(route, { width = 1280, height = 900 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "en-GB", reducedMotion: "no-preference" });
  await context.addInitScript(() => {
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    // The arrival curtain is a one-time intro; the checks look at the pages behind it.
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
  });
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (error) => page.errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") page.errors.push(message.text()); });
  const response = await page.goto(`${BASE}${route}`, { waitUntil: "load" });
  if (!response || response.status() !== 200) fail(`${route} loaded with ${response?.status()}`);
  return page;
}
async function close(page, route) {
  const errors = page.errors.filter((e) => !/posthog|challenges\.cloudflare\.com|net::ERR_BLOCKED_BY_CLIENT/i.test(e));
  if (errors.length) fail(`${route}: ${errors.length} console/page error(s): ${errors.slice(0, 3).join(" | ")}`);
  await page.context().close();
}

// 1. Kineticare walkthrough: full column, autoplays, smooth.
for (const route of ["/work/kineticare", "/hu/munka/kineticare"]) {
  const page = await openPage(route);
  const video = page.locator(".kineticare-browser-frame > video");
  await video.evaluate((v) => v.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(1500);
  const state = await video.evaluate(async (v) => {
    const frame = v.closest(".kineticare-browser-frame").getBoundingClientRect();
    const column = v.closest(".w-richtext").getBoundingClientRect();
    const start = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
    const t0 = v.currentTime;
    let callbacks = 0;
    const counting = new Promise((resolve) => {
      const tick = () => { callbacks++; if (callbacks < 240 && performance.now() < deadline) v.requestVideoFrameCallback(tick); else resolve(); };
      const deadline = performance.now() + 3000;
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tick); else resolve();
    });
    await counting;
    const end = v.getVideoPlaybackQuality ? v.getVideoPlaybackQuality() : null;
    return {
      span: frame.width / column.width,
      paused: v.paused,
      advanced: v.currentTime - t0,
      callbacks,
      dropped: end && start ? end.droppedVideoFrames - start.droppedVideoFrames : null,
      total: end && start ? end.totalVideoFrames - start.totalVideoFrames : null,
      readyState: v.readyState,
    };
  });
  if (state.span < 0.98) fail(`${route}: walkthrough spans ${(state.span * 100).toFixed(1)}% of the column`);
  if (state.paused || state.advanced <= 0) fail(`${route}: walkthrough is not playing (paused=${state.paused}, advanced=${state.advanced.toFixed(2)}s)`);
  if (state.total && state.dropped / state.total > 0.05) fail(`${route}: walkthrough dropped ${state.dropped}/${state.total} frames in 3 s`);
  if (!failures.some((f) => f.startsWith(route))) pass(`${route}: walkthrough full column, playing, ${state.total ?? state.callbacks} frames / ${state.dropped ?? "?"} dropped in 3 s`);
  await close(page, route);
}

// 2. Navigation: services group and the flag language menu on each language home.
for (const [route, lang, other] of [["/", "EN", "/hu"], ["/hu", "HU", "/de"], ["/de", "DE", "/"]]) {
  const page = await openPage(route);
  const trigger = page.locator(".nav-lang-trigger");
  if (!(await trigger.count())) { fail(`${route}: no language menu`); await close(page, route); continue; }
  await trigger.click();
  const panel = page.locator("#nav-languages");
  const visible = await panel.isVisible();
  const links = await panel.locator("a.lang-switch").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  if (!visible || !links.includes(other)) fail(`${route}: language menu open=${visible}, links=${links.join(",")}`);
  else pass(`${route}: ${lang} language menu opens with ${links.join(", ")}`);
  const services = page.locator("[data-nav-group] .nav-group-trigger").first();
  if (await services.count()) {
    await services.click();
    const open = await page.locator(".nav-group-panel:not([hidden])").count();
    if (!open) fail(`${route}: services menu did not open`);
  }
  await close(page, route);
}

// 3. Contact pages: the Turnstile widget renders (its iframe loads).
for (const route of ["/contact", "/hu/kapcsolat", "/de/kontakt"]) {
  const page = await openPage(route);
  const form = page.locator("form");
  if (!(await form.count())) fail(`${route}: no form`);
  const mount = page.locator("[data-contact-turnstile]");
  await mount.scrollIntoViewIfNeeded().catch(() => {});
  let iframe = 0;
  for (let i = 0; i < 20 && !iframe; i++) {
    iframe = await page.locator('iframe[src*="challenges.cloudflare.com"]').count();
    if (!iframe) await page.waitForTimeout(500);
  }
  if (!iframe) fail(`${route}: Turnstile widget did not render within 10 s`);
  else pass(`${route}: form + Turnstile widget rendered`);
  await close(page, route);
}

// 4. Phone viewport: no horizontal overflow on key pages, no errors.
for (const route of ["/", "/hu", "/de", "/hu/ai-tanacsadas-fejlesztes", "/de/wissen", "/hu/irasok/ceges-weboldal-ara", "/de/ueber-mich", "/hu/rolam", "/writing"]) {
  const page = await openPage(route, { width: 390, height: 844 });
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const h1 = await page.locator("h1").count();
  if (overflow > 1) fail(`${route}: ${overflow}px horizontal overflow at 390px`);
  if (h1 < 1) fail(`${route}: no H1`);
  if (overflow <= 1 && h1 >= 1) pass(`${route}: fits 390px, H1 present`);
  await close(page, route);
}

await browser.close();
const summary = [
  "## Browser checks",
  "",
  `${failures.length ? "❌" : "✅"} ${passes.length} passed, ${failures.length} failed`,
  ...failures.map((f) => `- ❌ ${f}`),
  "",
].join("\n");
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(`\n${passes.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
