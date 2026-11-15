import { expect, test } from "@playwright/test";

// The contact form's states around the Send button (2026-11-15). The button
// is never disabled: pressed early it validates and names every problem, or
// says which check it is waiting for. Field errors follow the timing of
// :user-invalid (after the visitor has edited and left a field, or tried to
// send), with the server's own rules. Without script the form says so and
// offers LinkedIn; a native post is answered with the page's "not sent"
// notice and is never read. The spam checks (proof of work, honeypot,
// timing, Turnstile) are covered by scripts/check-contact.mjs and
// tests/turnstile.spec.mjs and are untouched by any of this.

const ROUTES = [
  { route: "/contact", unsent: /^Your message was not sent, because the form had not finished loading\./, noscript: /turn on JavaScript/ },
  { route: "/hu/kapcsolat", unsent: /^Az üzeneted nem ment el, mert az űrlap még nem töltött be teljesen\./, noscript: /kapcsold be a JavaScriptet/ },
  { route: "/de/kontakt", unsent: /^Ihre Nachricht wurde nicht gesendet, weil das Formular noch nicht fertig geladen war\./, noscript: /JavaScript/ },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("nb-arrival-seen-v2", "1");
      localStorage.setItem("bn-analytics-consent-v1", JSON.stringify({ version: 1, decision: "rejected", timestamp: Date.now() }));
    } catch (error) { /* storage is optional */ }
  });
});

for (const { route, unsent } of ROUTES) {
  test(`${route}: Send is enabled from the first paint and an early press names every problem`, async ({ page }) => {
    const posts = [];
    page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
    await page.goto(route, { waitUntil: "load" });
    const submit = page.locator(".contact-submit");
    await expect(submit).toBeEnabled();
    await expect(submit).not.toHaveAttribute("aria-disabled", /.*/);
    await expect(page.locator(".contact-fields")).toBeEnabled();
    for (const id of ["contact-name", "contact-email", "contact-message"]) {
      await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "false");
    }

    await submit.click();
    const summary = page.locator(".contact-error-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary.locator("li a")).toHaveCount(4);
    for (const id of ["contact-name", "contact-email", "contact-message"]) {
      await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
      await expect(page.locator(`#${id}-error`)).toBeVisible();
      expect(await page.locator(`#${id}`).getAttribute("aria-describedby")).toContain(`${id}-error`);
    }
    await expect(page.locator("#contact-topic-error")).toBeVisible();
    // The first link of the summary takes the visitor to the first field.
    await summary.locator("li a").first().click();
    await expect(page.locator("#contact-name")).toBeFocused();
    // Still enabled, and nothing left the page.
    await expect(submit).toBeEnabled();
    expect(posts).toEqual([]);

    // Fixing a field clears its error at once and returns it to "false".
    await page.locator("#contact-name").fill("Ada Lovelace");
    await expect(page.locator("#contact-name-error")).toBeHidden();
    await expect(page.locator("#contact-name")).toHaveAttribute("aria-invalid", "false");
    await expect(summary.locator("li a")).toHaveCount(3);
  });

  test(`${route}: a field is named once it was edited and left, never while it was only passed through`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    await expect(page.locator(".contact-fields")).toBeEnabled();
    const name = page.locator("#contact-name");
    const email = page.locator("#contact-email");
    // Tabbing through untouched fields says nothing.
    await name.focus();
    await page.keyboard.press("Tab");
    await expect(email).toBeFocused();
    await expect(page.locator("#contact-name-error")).toBeHidden();
    await expect(name).toHaveAttribute("aria-invalid", "false");
    // Typing is never interrupted; leaving a wrong value names it.
    await email.pressSequentially("ada@");
    await expect(page.locator("#contact-email-error")).toBeHidden();
    await page.keyboard.press("Shift+Tab");
    await expect(page.locator("#contact-email-error")).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    // A field that was edited and then emptied is named as well.
    await name.pressSequentially("A");
    await page.keyboard.press("Backspace");
    await page.keyboard.press("Tab");
    await expect(page.locator("#contact-name-error")).toBeVisible();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".contact-error-summary")).toBeHidden();
    await expect(page.locator(".contact-submit")).toBeEnabled();
  });

  test(`${route}: a native post lands on the not-sent notice, which steps aside on the next send`, async ({ page, request }) => {
    const response = await request.post(route, { form: { name: "Ada", email: "ada@example.com", message: "A native post is never read." }, maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers().location).toBe(`${route}#contact-unsent`);

    await page.goto(route, { waitUntil: "load" });
    const notice = page.locator("#contact-unsent");
    await expect(notice).toBeHidden();
    await page.goto(`${route}#contact-unsent`, { waitUntil: "load" });
    await expect(notice).toBeVisible();
    await expect(notice).toHaveText(unsent);
    await expect(notice.locator("a")).toHaveAttribute("href", "https://www.linkedin.com/in/barna-norbert/");
    await expect(notice.locator("a")).toHaveAttribute("rel", "noopener noreferrer");
    await page.locator(".contact-submit").click();
    await expect(notice).toBeHidden();
    await expect(page.locator(".contact-error-summary")).toBeVisible();
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  for (const { route, noscript } of ROUTES) {
    test(`${route}: the form says it needs script, offers LinkedIn and shows no dead Send button`, async ({ page }) => {
      await page.goto(route, { waitUntil: "load" });
      const note = page.locator("#contact-form .contact-noscript:not(.contact-unsent)");
      await expect(note).toBeVisible();
      await expect(note).toHaveText(noscript);
      await expect(note.locator("a")).toHaveAttribute("href", "https://www.linkedin.com/in/barna-norbert/");
      await expect(page.locator(".contact-submit")).toBeHidden();
      await expect(page.locator("#contact-name")).toBeDisabled();
      await expect(page.locator("#contact-unsent")).toBeHidden();
    });
  }
});
