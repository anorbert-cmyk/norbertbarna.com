import { expect, test } from "@playwright/test";
import { createRequire } from "node:module";

// Cloudflare Turnstile on the contact form (owner spec, 2026-10-06). The test
// server runs with Cloudflare's documented always-pass secret (see
// playwright.config.mjs); the page uses the matching dummy site key on any
// host other than barnanorbert.com. These tests need network access to
// challenges.cloudflare.com, as CI has.

const require = createRequire(import.meta.url);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
    localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
  });
});

async function fill(page) {
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-topic-ai").check({ force: true });
  await page.locator("#contact-message").fill("I would like to talk about adding a reviewed assistant to our onboarding.");
}

for (const route of ["/contact", "/hu/kapcsolat"]) {
  test(`${route}: the Turnstile widget renders under the real CSP and its token reaches the server`, async ({ page }) => {
    const violations = [];
    page.on("console", (message) => {
      if (/Content Security Policy|Refused to (?:load|frame|execute)/i.test(message.text())) violations.push(message.text());
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        window.__cspViolations = (window.__cspViolations || []).concat(`${event.violatedDirective} ${event.blockedURI}`);
      });
    });
    await page.goto(route, { waitUntil: "load" });
    // Turnstile mounts its frame inside a closed shadow root, so no selector
    // reaches it; the page's frame tree does, and the frame must sit in the
    // widget container the form provides.
    await expect.poll(() => page.evaluate(() => typeof window.turnstile === "object" && document.querySelector(".contact-turnstile")?.childElementCount > 0), { timeout: 20_000 }).toBe(true);
    await expect.poll(() => page.frames().some((frame) => frame.url().startsWith("https://challenges.cloudflare.com/")), { timeout: 20_000 }).toBe(true);

    await fill(page);
    const posted = page.waitForRequest((request) => request.url().endsWith("/api/contact") && request.method() === "POST", { timeout: 40_000 });
    const answered = page.waitForResponse((response) => response.url().endsWith("/api/contact") && response.request().method() === "POST", { timeout: 40_000 });
    await page.locator(".contact-submit").click();
    const body = JSON.parse((await posted).postData() || "{}");
    expect(typeof body["cf-turnstile-response"]).toBe("string");
    expect(body["cf-turnstile-response"].length).toBeGreaterThan(10);
    expect((await answered).status()).toBe(200);
    expect(violations).toEqual([]);
    expect(await page.evaluate(() => window.__cspViolations || [])).toEqual([]);
  });
}

test("a Turnstile verdict that fails is refused and nothing is delivered", async ({ request }) => {
  // A second, in-process server with Cloudflare's always-fail dummy secret and a
  // recording sender: the real siteverify answers "fail", so delivery never runs.
  const express = require("express");
  const contact = require("../lib/contact.js");
  const { createHash } = await import("node:crypto");
  const previous = { ...process.env };
  process.env.TURNSTILE_SECRET_KEY = "2x0000000000000000000000000000000AA";
  process.env.CONTACT_POW_BITS = "12";
  delete process.env.CONTACT_DRY_RUN;
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONTACT_TO = "inbox@example.test";
  const sent = [];
  let clock = Date.now();
  const app = express();
  app.use("/api/contact", contact.createContactRouter({ now: () => clock, send: async (mail) => { sent.push(mail); } }));
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const challenge = await (await request.get(`${base}/api/contact/challenge`)).json();
    let nonce = 0;
    for (;; nonce += 1) {
      const digest = createHash("sha256").update(`${challenge.salt}:${nonce}`).digest();
      if (contact.leadingZeroBits(digest) >= challenge.difficulty) break;
    }
    clock += 5000;
    const response = await request.post(`${base}/api/contact`, {
      headers: { "Content-Type": "application/json", Origin: base },
      data: {
        name: "Ada Lovelace", email: "ada@example.com", topic: "ai", lang: "en", hp_7f3: "",
        message: "I would like to talk about adding a reviewed assistant to our onboarding.",
        token: challenge.token, nonce: String(nonce), "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe("captcha_failed");
    expect(sent).toEqual([]);
  } finally {
    server.close();
    for (const key of ["TURNSTILE_SECRET_KEY", "CONTACT_POW_BITS", "CONTACT_DRY_RUN", "RESEND_API_KEY", "CONTACT_TO"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
