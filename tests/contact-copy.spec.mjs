import { expect, test } from "@playwright/test";

const projectCopy = {
  en: { label: "Discuss your project", title: "Opens your email app to discuss your project" },
  hu: { label: "Beszéljünk a projektedről", title: "Megnyitja a leveleződet, hogy a projektedről írhass." },
};
const contactHref = ["mai", "lto", ":"].join("") + ["anorbert", "@", "pm", ".", "me"].join("");
const routes = ["/", "/ai-integration", "/hu/ai-integracio", "/privacy", "/hu/adatvedelem"];
const viewports = [
  { width: 320, height: 720, activation: "pointer" },
  { width: 390, height: 844, activation: "Enter" },
  { width: 1280, height: 900, activation: "Space" },
];

test.use({ reducedMotion: "reduce" });

// These are text-only resize checks, not CSS zoom or a narrower screenshot.
// Snapshot every header/hero computed size before changing any ancestor so
// nested elements inherit neither an accidental 4x nor an untested 1x size.
async function doubleHeaderText(page) {
  return page.evaluate(() => {
    const snapshot = [...document.querySelectorAll(".navbar, .navbar *, .home-banner-section, .home-banner-section *")]
      .filter((element) => element instanceof HTMLElement)
      .map((element) => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }));
    for (const { element, size } of snapshot) element.style.setProperty("font-size", `${size * 2}px`, "important");
    return snapshot.map(({ element, size }) => ({
      element: `${element.tagName}.${element.className}`,
      before: size,
      after: parseFloat(getComputedStyle(element).fontSize),
    }));
  });
}

async function openHeaderFixture(page, viewport, route = "/") {
  await page.setViewportSize(viewport);
  await page.route(/posthog\.com/, (request) => request.abort());
  const response = await page.goto(route);
  expect(response.status()).toBe(200);
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await expect(page.locator(".menu-button")).toHaveAttribute("data-navigation-ready", "true");
}

async function assertControlTextFits(control, label, viewport) {
  // Check horizontal reflow before Playwright can scroll an overflowing
  // element sideways into view and accidentally conceal the original defect.
  const beforeScroll = await control.boundingBox();
  expect.soft(beforeScroll.x, `${label}: no horizontal rescue scroll needed at left`).toBeGreaterThanOrEqual(-1);
  expect.soft(beforeScroll.x + beforeScroll.width, `${label}: no horizontal rescue scroll needed at right`).toBeLessThanOrEqual(viewport.width + 1);
  await control.scrollIntoViewIfNeeded();
  const geometry = await control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const lines = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      lines.push(...[...range.getClientRects()].map((line) => ({
        left: line.left, right: line.right, top: line.top, bottom: line.bottom,
      })));
    }
    return {
      box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height },
      overflowX: element.scrollWidth - element.clientWidth,
      overflowY: element.scrollHeight - element.clientHeight,
      lines,
    };
  });
  expect.soft(geometry.box.width, `${label}: actionable width`).toBeGreaterThanOrEqual(44);
  expect.soft(geometry.box.height, `${label}: actionable height`).toBeGreaterThanOrEqual(44);
  expect.soft(geometry.overflowX, `${label}: horizontal text clipping`).toBeLessThanOrEqual(1);
  expect.soft(geometry.overflowY, `${label}: vertical text clipping`).toBeLessThanOrEqual(1);
  expect.soft(geometry.box.left, `${label}: left viewport edge`).toBeGreaterThanOrEqual(-1);
  expect.soft(geometry.box.right, `${label}: right viewport edge`).toBeLessThanOrEqual(viewport.width + 1);
  expect.soft(geometry.box.top, `${label}: reachable top`).toBeGreaterThanOrEqual(-1);
  expect.soft(geometry.box.bottom, `${label}: reachable bottom`).toBeLessThanOrEqual(viewport.height + 1);
  expect(geometry.lines.length, `${label}: real label rectangles`).toBeGreaterThan(0);
  for (const line of geometry.lines) {
    expect.soft(line.left, `${label}: label inside left border`).toBeGreaterThanOrEqual(geometry.box.left - 1);
    expect.soft(line.right, `${label}: label inside right border`).toBeLessThanOrEqual(geometry.box.right + 1);
    expect.soft(line.top, `${label}: label inside top border`).toBeGreaterThanOrEqual(geometry.box.top - 1);
    expect.soft(line.bottom, `${label}: label inside bottom border`).toBeLessThanOrEqual(geometry.box.bottom + 1);
  }
}

async function assertFocusedControlAvailable(page, label) {
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    const box = element.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
    const y = Math.max(0, Math.min(innerHeight - 1, box.top + box.height / 2));
    const hit = document.elementFromPoint(x, y);
    return {
      isBody: element === document.body,
      width: box.width,
      height: box.height,
      inViewport: box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight,
      unobscured: hit === element || element.contains(hit),
    };
  });
  expect(focused.isBody, `${label}: focus has not fallen back to body`).toBe(false);
  expect(focused.width, `${label}: focused control has width`).toBeGreaterThan(0);
  expect(focused.height, `${label}: focused control has height`).toBeGreaterThan(0);
  expect(focused.inViewport, `${label}: focused control is reachable`).toBe(true);
  expect(focused.unobscured, `${label}: focus is not behind the menu`).toBe(true);
}

async function assertNoControlOverlap(page, selectors, label) {
  const overlap = await page.evaluate(([first, second]) => {
    const a = document.querySelector(first).getBoundingClientRect();
    const b = document.querySelector(second).getBoundingClientRect();
    return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  }, selectors);
  expect.soft(overlap, label).toBeLessThanOrEqual(1);
}

async function assertMenuIconFits(page) {
  await page.locator(".menu-button").scrollIntoViewIfNeeded();
  const geometry = await page.locator(".menu-button").evaluate((button) => {
    const outer = button.getBoundingClientRect();
    const icon = button.querySelector(".w-icon-nav-menu").getBoundingClientRect();
    return {
      inset: [icon.left - outer.left, outer.right - icon.right, icon.top - outer.top, outer.bottom - icon.bottom],
      centerX: Math.abs((icon.left + icon.right - outer.left - outer.right) / 2),
      centerY: Math.abs((icon.top + icon.bottom - outer.top - outer.bottom) / 2),
    };
  });
  for (const inset of geometry.inset) expect.soft(inset, "menu icon stays inside its button").toBeGreaterThanOrEqual(-1);
  expect.soft(geometry.centerX, "menu icon remains horizontally centered").toBeLessThanOrEqual(1);
  expect.soft(geometry.centerY, "menu icon remains vertically centered").toBeLessThanOrEqual(1);
}

for (const adjustment of ["text 200%", "WCAG text spacing"]) {
  test(`header AA: 320px ${adjustment} keeps contact and hero labels usable`, async ({ page }, testInfo) => {
    const viewport = { width: 320, height: 720 };
    await openHeaderFixture(page, viewport);
    if (adjustment === "text 200%") {
      const snapshot = await doubleHeaderText(page);
      expect(snapshot.length).toBeGreaterThan(10);
      for (const entry of snapshot) expect(entry.after, entry.element).toBeCloseTo(entry.before * 2, 2);
      await testInfo.attach("header-text-resize-snapshot", { body: JSON.stringify(snapshot, null, 2), contentType: "application/json" });
    } else {
      // WCAG 1.4.12 values are applied together, without relaxing the page's
      // existing font sizes or setting an implementation-specific fixed height.
      await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-block-end: 2em !important; }" });
    }
    await assertMenuIconFits(page);
    await page.locator(".menu-button").click();
    await expect(page.locator(".navbar button.footer-email")).toBeVisible();
    await assertControlTextFits(page.locator(".navbar button.footer-email"), "header contact", viewport);
    await assertNoControlOverlap(page, [".navbar button.footer-email", ".navbar .footer-contact-link"], "header contact does not overlap LinkedIn");
    await page.locator(".menu-button").click();
    await assertControlTextFits(page.locator(".home-banner-section .hero-work-link"), "hero CTA", viewport);
    await assertNoControlOverlap(page, [".home-banner-section .hero-work-link", ".home-banner-subtitle"], "hero CTA does not overlap its preceding text");
    expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "no horizontal page overflow").toBeLessThanOrEqual(1);
  });
}

for (const project of ["sportsgambit", "instructure", "raiffeisen"]) {
  test(`header AA: 320px breadcrumb text 200% keeps Works separate from ${project}`, async ({ page }, testInfo) => {
    await openHeaderFixture(page, { width: 320, height: 720 }, `/work/${project}`);
    const works = page.locator(".nav-breadcrumb a");
    const current = page.locator('.nav-breadcrumb [aria-current="page"]');
    const before = {
      works: await works.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      current: await current.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    };
    await doubleHeaderText(page);
    // Confirm actual post-render typography, not only the inline declaration.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect.poll(() => works.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBe(before.works * 2);
    await expect.poll(() => current.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBe(before.current * 2);
    const geometry = await page.locator(".nav-breadcrumb").evaluate((breadcrumb) => {
      const link = breadcrumb.querySelector("a");
      const label = breadcrumb.querySelector('[aria-current="page"]');
      const linkBox = link.getBoundingClientRect();
      const itemBox = link.closest("li").getBoundingClientRect();
      const labelBox = label.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(link);
      const linkGlyph = range.getBoundingClientRect();
      range.selectNodeContents(label);
      const labelGlyph = range.getBoundingClientRect();
      const breadcrumbBox = breadcrumb.getBoundingClientRect();
      return {
        linkWidth: linkBox.width,
        firstItemWidth: itemBox.width,
        linkGlyphLeft: linkGlyph.left,
        linkGlyphRight: linkGlyph.right,
        firstItemLeft: itemBox.left,
        firstItemRight: itemBox.right,
        currentLabelLeft: Math.max(labelBox.left, labelGlyph.left),
        currentVisibleRight: Math.min(labelBox.right, labelGlyph.right),
        breadcrumbLeft: breadcrumbBox.left,
        breadcrumbRight: breadcrumbBox.right,
        breadcrumbOverflow: breadcrumb.scrollWidth - breadcrumb.clientWidth,
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    await testInfo.attach("breadcrumb-text-resize-geometry", { body: JSON.stringify({ before, geometry }, null, 2), contentType: "application/json" });
    expect.soft(geometry.firstItemWidth, "Works list item must not shrink below its real link").toBeGreaterThanOrEqual(geometry.linkWidth - 1);
    expect.soft(geometry.linkGlyphLeft, "Works glyphs stay inside their list item").toBeGreaterThanOrEqual(geometry.firstItemLeft - 1);
    expect.soft(geometry.linkGlyphRight, "Works glyphs stay inside their list item").toBeLessThanOrEqual(geometry.firstItemRight + 1);
    expect.soft(geometry.linkGlyphRight, "Works must not overlap the current project label").toBeLessThanOrEqual(geometry.currentLabelLeft + 1);
    // The existing current-page ellipsis is intentional; inspect its visible
    // clipped label rather than treating the hidden full range as painted ink.
    expect.soft(geometry.currentVisibleRight, "visible current label stays within the viewport").toBeLessThanOrEqual(321);
    expect.soft(geometry.breadcrumbLeft, "breadcrumb viewport left").toBeGreaterThanOrEqual(-1);
    expect.soft(geometry.breadcrumbRight, "breadcrumb viewport right").toBeLessThanOrEqual(321);
    expect.soft(geometry.breadcrumbOverflow, "no horizontal breadcrumb overflow").toBeLessThanOrEqual(1);
    expect.soft(geometry.pageOverflow, "no horizontal page overflow").toBeLessThanOrEqual(1);
  });
}

test("header AA: keyboard external-link activation restores focus when the mobile menu closes", async ({ page, context }) => {
  await page.addInitScript(() => {
    window.blockedHeaderExternalActions = 0;
    // Cancel only the external default action, not propagation: the real
    // navigation click listener must run. No LinkedIn page or email opens.
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".navbar .footer-contact-link")) return;
      event.preventDefault();
      window.blockedHeaderExternalActions += 1;
    }, true);
  });
  await openHeaderFixture(page, { width: 390, height: 844 });
  const toggle = page.locator(".menu-button");
  await toggle.focus();
  await page.keyboard.press("Enter");
  const externalLink = page.locator(".navbar .footer-contact-link");
  await externalLink.focus();
  await expect(externalLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await assertFocusedControlAvailable(page, "external-link menu close");
  expect(await page.evaluate(() => window.blockedHeaderExternalActions)).toBe(1);
  expect(context.pages()).toHaveLength(1);
  await expect(page).toHaveURL(/\/$/);
});

test("header AA: crossing either navigation breakpoint hands focus to a visible control", async ({ page }) => {
  await openHeaderFixture(page, { width: 1280, height: 900 });
  const works = page.locator(".navbar a.nav-link").first();
  const toggle = page.locator(".menu-button");
  await works.focus();
  await expect(works).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await assertFocusedControlAvailable(page, "desktop to compact");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(works).toBeFocused();
  await assertFocusedControlAvailable(page, "compact to desktop");
});

test("header AA: a later footer pointer interaction must not resurrect stale navigation focus", async ({ page }) => {
  await openHeaderFixture(page, { width: 1280, height: 900 });
  const works = page.locator(".navbar a.nav-link").first();
  await works.focus();
  await expect(works).toBeFocused();
  // A real pointer click on non-interactive footer copy deliberately leaves
  // navigation. No synthetic blur/focus and no link or email action is used.
  const copyright = page.locator(".footer-copyright");
  await copyright.click();
  await expect(copyright).toBeInViewport();
  await expect(page.locator("body")).toBeFocused();
  expect(await page.evaluate(() => window.scrollY), "the visitor is browsing the footer").toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("body"), "resize must not steal focus back to abandoned navigation").toBeFocused();
  expect(await page.evaluate(() => window.scrollY), "resize must not return the visitor to the header").toBeGreaterThan(0);
});

test("header AA: Escape returns focus and Tab can leave the non-modal disclosure unobscured", async ({ page }) => {
  await openHeaderFixture(page, { width: 390, height: 844 });
  const toggle = page.locator(".menu-button");
  const lastControl = page.locator(".navbar button.footer-email");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await lastControl.focus();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await assertFocusedControlAvailable(page, "Escape");
  await page.keyboard.press("Enter");
  await lastControl.focus();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement.closest(".navbar"))), "disclosure must not trap focus").toBe(false);
  await assertFocusedControlAvailable(page, "Tab out of disclosure");
});

test("header AA: 568x200 landscape menu keeps every control reachable with enlarged text", async ({ page }, testInfo) => {
  const viewport = { width: 568, height: 200 };
  await openHeaderFixture(page, viewport);
  const snapshot = await doubleHeaderText(page);
  await testInfo.attach("landscape-text-resize-snapshot", { body: JSON.stringify(snapshot, null, 2), contentType: "application/json" });
  await page.locator(".menu-button").click();
  const controls = page.locator("#primary-navigation a[href], #primary-navigation button");
  expect(await controls.count()).toBe(3);
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    await control.focus();
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeFocused();
    await assertFocusedControlAvailable(page, `landscape menu control ${index + 1}`);
    const box = await control.boundingBox();
    expect.soft(box.x, "landscape control left").toBeGreaterThanOrEqual(-1);
    expect.soft(box.x + box.width, "landscape control right").toBeLessThanOrEqual(viewport.width + 1);
    expect.soft(box.y, "landscape control top").toBeGreaterThanOrEqual(-1);
    expect.soft(box.y + box.height, "landscape control bottom").toBeLessThanOrEqual(viewport.height + 1);
  }
  await page.keyboard.press("Escape");
  await expect(page.locator(".menu-button")).toBeFocused();
  await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "false");
});

for (const viewport of viewports) {
  for (const route of routes) {
    test(`${viewport.width} ${route}: contact copy, fit and native ${viewport.activation}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const vendorRequests = [];
      await page.route(/posthog\.com/, async (request) => {
        vendorRequests.push(request.request().url());
        await request.abort();
      });
      await page.addInitScript(() => { window.contactHandoffs = []; });
      await page.route("**/assets/js/navigation.js", async (request) => {
        const response = await request.fetch();
        const source = await response.text();
        const assign = "window.location.assign(footerMailHref());";
        expect(source.split(assign)).toHaveLength(2);
        // Run the real native click handler; stub only the external app handoff.
        // No email app is opened and no email is sent by this test.
        await request.fulfill({ response, body: source.replace(assign, "window.contactHandoffs.push(footerMailHref());") });
      });
      const response = await page.goto(route);
      expect(response.status()).toBe(200);
      await page.waitForFunction(() => document.fonts.status === "loaded");
      const expectedCount = route === "/" ? 3 : 2;
      const buttons = page.locator("button.footer-email");
      await expect(buttons).toHaveCount(expectedCount);

      for (let index = 0; index < expectedCount; index += 1) {
        const button = buttons.nth(index);
        const scope = await button.evaluate((element) => ({
          main: Boolean(element.closest("main")),
          nav: Boolean(element.closest(".navbar")),
          lang: element.closest("[lang]")?.lang,
        }));
        const privacyContact = scope.main && ["/privacy", "/hu/adatvedelem"].includes(route);
        const language = scope.main && route === "/hu/ai-integracio" ? "hu" : "en";
        const label = privacyContact ? "Email" : projectCopy[language].label;
        if (scope.nav && viewport.width < 992) await page.locator(".menu-button").click();
        await expect(button).toBeVisible();
        await expect(button).toHaveText(label);
        await expect(button).toHaveAccessibleName(label);
        await expect(button).toHaveAttribute("type", "button");
        await expect(button).not.toHaveAttribute("href");
        if (privacyContact) {
          expect(await button.getAttribute("title")).toBeNull();
        } else {
          await expect(button).toHaveAttribute("title", projectCopy[language].title);
          expect(scope.lang).toBe(language);
        }
        await button.scrollIntoViewIfNeeded();
        const size = await button.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          const range = document.createRange();
          range.selectNodeContents(element);
          return {
            width: box.width, height: box.height, left: box.left, right: box.right,
            expected: Math.max(44, range.getBoundingClientRect().width +
              parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) +
              parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)),
            overflow: element.scrollWidth - element.clientWidth,
          };
        });
        expect(size.height).toBe(44);
        expect(size.width).toBeGreaterThanOrEqual(44);
        expect(Math.abs(size.width - size.expected), "button width must fit its actual label").toBeLessThanOrEqual(2);
        expect(size.overflow).toBeLessThanOrEqual(1);
        expect(size.left).toBeGreaterThanOrEqual(-1);
        expect(size.right).toBeLessThanOrEqual(viewport.width + 1);
        if (viewport.activation === "pointer") await button.click();
        else {
          await button.focus();
          await page.keyboard.press(viewport.activation);
        }
        await expect.poll(() => page.evaluate(() => window.contactHandoffs.length)).toBe(index + 1);
        if (scope.nav && viewport.width < 992) {
          await expect(page.locator(".menu-button")).toHaveAttribute("aria-expanded", "false");
        }
      }

      expect(await page.evaluate(() => window.contactHandoffs)).toEqual(Array(expectedCount).fill(contactHref));
      expect(await page.content()).not.toMatch(/mailto:|anorbert@pm\.me/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => ({
        enabled: window.PortfolioAnalyticsConfig.enabled,
        consent: typeof window.PortfolioConsent,
        analytics: typeof window.PortfolioAnalyticsReady,
      }))).toEqual({ enabled: false, consent: "undefined", analytics: "undefined" });
      expect(vendorRequests).toEqual([]);
    });
  }
}
