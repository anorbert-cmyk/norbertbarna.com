import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-edge-991", width: 991, height: 900 },
  { name: "desktop-edge-992", width: 992, height: 900 },
  { name: "desktop-1366", width: 1366, height: 900 },
];

const contentRoutes = [
  "/",
  "/works",
  "/work/benker",
  "/work/bitpanda",
  "/work/instructure",
  "/work/kineticare",
  "/work/onrobot",
  "/work/raiffeisen",
  "/work/sportsgambit",
];

test.beforeEach(async ({ page }) => {
  page.__runtimeErrors = [];
  page.on("pageerror", (error) => page.__runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      page.__runtimeErrors.push(`console.error: ${message.text()}`);
    }
  });
  await page.addInitScript(() => {
    window.__cumulativeLayoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cumulativeLayoutShift += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
});

test.afterEach(async ({ page }) => {
  if (page.isClosed() || page.url() === "about:blank") return;
  expect(page.__runtimeErrors, page.__runtimeErrors.join("\n")).toEqual([]);
  const cumulativeLayoutShift = await page.evaluate(() => window.__cumulativeLayoutShift || 0);
  expect(cumulativeLayoutShift, `CLS ${cumulativeLayoutShift} exceeds the good threshold`).toBeLessThan(0.1);
});

async function openStable(page, route) {
  await page.goto(route, { waitUntil: "load" });
  await page.waitForFunction(() => !document.fonts || document.fonts.status === "loaded");
  await page.waitForTimeout(100);
}

for (const viewport of viewports) {
  test(`${viewport.name}: native scroll remains monotonic and reaches the footer`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openStable(page, "/");

    const horizontalOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(horizontalOverflow).toBeLessThanOrEqual(1);

    await page.evaluate(() => window.scrollTo(0, 0));
    const samples = [];
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(35);
      samples.push(await page.evaluate(() => window.scrollY));
    }
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1] - 2);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(80);
    const atBottom = await page.evaluate(() => ({
      y: window.scrollY,
      max: document.documentElement.scrollHeight - window.innerHeight,
      footerTop: document.querySelector("footer").getBoundingClientRect().top,
    }));
    expect(atBottom.y).toBeGreaterThanOrEqual(atBottom.max - 2);
    expect(atBottom.footerTop).toBeLessThan(viewport.height);

    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(80);
    const afterBottomWheel = await page.evaluate(() => window.scrollY);
    expect(afterBottomWheel).toBeGreaterThanOrEqual(atBottom.y - 2);
  });

  test(`${viewport.name}: long case content has no horizontal overflow or stretched images`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openStable(page, "/work/kineticare");
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(320, window.innerHeight * 0.7)) {
        window.scrollTo(0, y);
        await new Promise((resolve) => window.setTimeout(resolve, 35));
      }
      window.scrollTo(0, 0);
    });
    await expect.poll(() => page.evaluate(() =>
      [...document.querySelectorAll(".summary img")].every((image) => image.complete && image.naturalWidth > 0)
    )).toBe(true);
    const result = await page.evaluate(() => {
      const images = [...document.querySelectorAll(".summary img")].map((image) => {
        const rect = image.getBoundingClientRect();
        return {
          natural: image.naturalWidth > 0 && image.naturalHeight > 0,
          ratioDelta: Math.abs(rect.width / rect.height - image.naturalWidth / image.naturalHeight),
        };
      });
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        images,
      };
    });
    expect(result.overflow).toBeLessThanOrEqual(1);
    expect(result.images.length).toBeGreaterThan(0);
    expect(result.images.every((image) => image.natural && image.ratioDelta < 0.02)).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    const samples = [];
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.wheel(0, 520);
      await page.waitForTimeout(35);
      samples.push(await page.evaluate(() => window.scrollY));
    }
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1] - 2);
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(80);
    const caseBottom = await page.evaluate(() => ({
      y: window.scrollY,
      max: document.documentElement.scrollHeight - window.innerHeight,
    }));
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(caseBottom.max - 2);
  });
}

for (const width of [360, 768, 991]) {
  test(`mobile navigation is single-toggle and keyboard complete at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/");
    const button = page.locator(".menu-button");
    const navigation = page.locator("#primary-navigation");

    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(navigation).toHaveAttribute("data-nav-menu-open", "");

    await page.keyboard.press("Escape");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.evaluate(() => document.querySelector("main").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.focus();
    await page.keyboard.press("Space");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await page.setViewportSize({ width: 992, height: 900 });
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
}

test("skip link and full-card project action work without hover", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStable(page, "/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-to-content")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await openStable(page, "/works");
  const firstCard = page.locator(".work-card").first();
  await firstCard.click({ position: { x: 30, y: 30 } });
  await expect(page).toHaveURL(/\/work\/raiffeisen$/);
});

test("reduced-motion preference stops active animation and video", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStable(page, "/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("no-motion"))).toBe(true);
  const immediateState = await page.evaluate(() => ({
    hiddenSplitWords: [...document.querySelectorAll(".split-reveal-word")]
      .some((element) => Number.parseFloat(getComputedStyle(element).opacity) === 0),
    aboutOpacity: Number.parseFloat(getComputedStyle(document.querySelector(".home-about-area")).opacity),
    activeScrollTriggers: window.ScrollTrigger?.getAll().length || 0,
  }));
  expect(immediateState.hiddenSplitWords).toBe(false);
  expect(immediateState.aboutOpacity).toBeGreaterThan(0);
  expect(immediateState.activeScrollTriggers).toBe(0);

  await page.setViewportSize({ width: 991, height: 900 });
  await page.setViewportSize({ width: 992, height: 900 });
  await page.waitForTimeout(100);
  const state = await page.evaluate(() => ({
    videosPaused: [...document.querySelectorAll("video")].every((video) => video.paused),
    hiddenContent: [...document.querySelectorAll(".work-card, .section-title")]
      .some((element) => Number.parseFloat(getComputedStyle(element).opacity) === 0),
    activeScrollTriggers: window.ScrollTrigger?.getAll().length || 0,
  }));
  expect(state.videosPaused).toBe(true);
  expect(state.hiddenContent).toBe(false);
  expect(state.activeScrollTriggers).toBe(0);
});

for (const viewport of [viewports[0], viewports[4]]) {
  for (const route of contentRoutes) {
    test(`${viewport.name}: ${route} has no serious accessibility violation`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openStable(page, route);
      const results = await new AxeBuilder({ page }).analyze();
      const blockers = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      expect(blockers, blockers.map(({ id, help }) => `${id}: ${help}`).join("\n")).toEqual([]);
    });
  }
}

test("Kineticare compact fold: white dek and unclipped facts, no Motion chip", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openStable(page, "/work/kineticare");

  const dekColor = await page.locator(".kineticare-hero .banner-text").evaluate(
    (element) => getComputedStyle(element).color
  );
  expect(dekColor).toBe("rgb(255, 255, 255)");

  const layout = await page.evaluate(() => {
    const role = document.querySelector(".case-facts dd");
    return {
      clipped: role.scrollWidth > role.clientWidth + 1,
      roleText: role.textContent.trim(),
      motionControl: Boolean(document.querySelector("[data-motion-toggle], .site-motion-toggle")),
    };
  });
  expect(layout.roleText).toBe("Product designer and full-stack builder");
  expect(layout.clipped).toBe(false);
  expect(layout.motionControl).toBe(false);
});

const caseRoutes = contentRoutes.filter((route) => route.startsWith("/work/"));

for (const route of caseRoutes) {
  test(`1280: ${route} TOC chips wrap without clipping`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openStable(page, route);
    const toc = await page.evaluate(() => {
      const list = document.querySelector(".case-toc ol");
      const chips = [...document.querySelectorAll(".case-toc a")];
      const listBox = list.getBoundingClientRect();
      return {
        chipCount: chips.length,
        listOverflow: list.scrollWidth - list.clientWidth,
        clippedChips: chips.filter((chip) => {
          const box = chip.getBoundingClientRect();
          return chip.scrollWidth > chip.clientWidth + 1 ||
            box.right > listBox.right + 1 || box.left < listBox.left - 1;
        }).map((chip) => chip.textContent.trim()),
      };
    });
    expect(toc.chipCount).toBeGreaterThan(0);
    expect(toc.listOverflow, "TOC list must wrap instead of overflowing").toBeLessThanOrEqual(1);
    expect(toc.clippedChips, `clipped TOC chips: ${toc.clippedChips.join(", ")}`).toEqual([]);
  });
}

test("Kineticare case header contains exactly one media node and it autoplays", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStable(page, "/work/kineticare");
  const header = await page.evaluate(() => {
    const scope = document.querySelector(".case-study-header");
    const media = [...scope.querySelectorAll("video, img, picture, iframe")];
    const video = scope.querySelector("video");
    return {
      mediaCount: media.length,
      isVideo: media.length === 1 && media[0].tagName === "VIDEO",
      managedAutoplay: Boolean(video && video.hasAttribute("data-autoplay-video")),
    };
  });
  expect(header.mediaCount).toBe(1);
  expect(header.isVideo).toBe(true);
  expect(header.managedAutoplay).toBe(true);
  await expect.poll(() => page.evaluate(() => {
    const video = document.querySelector(".case-study-header video");
    return video.getAttribute("data-media-state");
  }), { timeout: 15000 }).toMatch(/playing|loading/);
});

for (const route of ["/", "/works", "/work/instructure", "/work/kineticare"]) {
  test(`${route}: footer lock — paper chrome, icon buttons, Work cases, no form`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openStable(page, route);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await page.evaluate(() => {
      const root = document.querySelector("footer.footer-section");
      const chrome = root.querySelector(".footer-chrome");
      const icons = [...root.querySelectorAll("a.footer-contact-link")];
      const work = [...root.querySelectorAll(".footer-dune-nav .footer-col:first-child a")].map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent.trim(),
      }));
      const email = icons[0];
      const linkedin = icons[1];
      const emailStyle = email ? getComputedStyle(email) : null;
      return {
        paper: chrome ? getComputedStyle(chrome).backgroundColor : "",
        lede: root.querySelector(".footer-lede")?.textContent.trim() || "",
        copyright: root.querySelector(".footer-copyright")?.textContent.trim() || "",
        form: Boolean(root.querySelector("form, .footer-hp, [data-contact-form]")),
        iconCount: icons.length,
        emailHref: email ? email.getAttribute("href") : "",
        linkedinHref: linkedin ? linkedin.getAttribute("href") : "",
        iconSize: email ? {
          w: Math.round(email.getBoundingClientRect().width),
          h: Math.round(email.getBoundingClientRect().height),
          radius: emailStyle.borderRadius,
        } : null,
        work,
        purple: /rgb\(\s*(1[89]\d|2\d\d)\s*,\s*(1[0-6]\d)\s*,\s*(2\d\d)/.test(
          chrome ? getComputedStyle(chrome).backgroundColor : ""
        ),
      };
    });
    expect(footer.form).toBe(false);
    expect(footer.lede).toBe("Product VP — I lead AI products in regulated finance and high-trust systems.");
    expect(footer.copyright).toBe("© 2026 Norbert Barna");
    expect(footer.iconCount).toBe(2);
    expect(footer.emailHref).toBe("mailto:anorbert@pm.me");
    expect(footer.linkedinHref).toBe("https://www.linkedin.com/in/barna-norbert/");
    expect(footer.iconSize.w).toBe(52);
    expect(footer.iconSize.h).toBe(52);
    expect(footer.iconSize.radius).toBe("12px");
    expect(footer.work.map((item) => item.href)).toEqual([
      "/work/raiffeisen",
      "/work/instructure",
      "/work/bitpanda",
      "/work/kineticare",
    ]);
    expect(footer.purple).toBe(false);
    expect(footer.paper).toBe("rgb(241, 243, 242)");
    const duneLock = await page.evaluate(() => {
      const root = document.querySelector("footer.footer-section");
      return {
        globalGrain: Boolean(root.querySelector(".footer-dunes-grain, .footer-dunes-noise")),
        sand: Boolean(root.querySelector("#sand-grain-1") && root.querySelector("#sand-grain-4")),
        lighting: Boolean(root.querySelector("#dune-lit-yellow") && root.querySelector("#dune-cast")),
        yellowBody: Boolean(root.querySelector('path[fill="#DCA30C"]')),
        blendWrap: Boolean(root.querySelector(".footer-dune-blend-overlay") && root.querySelector(".footer-dune-blend-soft")),
        grainOnPath: [...root.querySelectorAll("path[filter]")].some((path) => /sand-grain/.test(path.getAttribute("filter") || "") && /mix-blend/.test(path.getAttribute("style") || "")),
        shadowUp: (root.querySelector("#dune-cast feOffset")?.getAttribute("dy") || "") === "-12",
      };
    });
    expect(duneLock.globalGrain).toBe(false);
    expect(duneLock.sand).toBe(true);
    expect(duneLock.lighting).toBe(true);
    expect(duneLock.yellowBody).toBe(true);
    expect(duneLock.blendWrap).toBe(true);
    expect(duneLock.grainOnPath).toBe(false);
    expect(duneLock.shadowUp).toBe(true);

    const email = page.locator("footer a.footer-contact-link").first();
    const linkedin = page.locator("footer a.footer-contact-link").nth(1);
    await email.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
    await email.hover({ force: true });
    await expect.poll(() => email.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 0, 0)");
    await expect.poll(() => email.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
    await linkedin.hover({ force: true });
    await expect.poll(() => linkedin.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(0, 0, 0)");
    await expect.poll(() => linkedin.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("no-motion"))).toBe(true);
    await expect.poll(() => page.evaluate(() => {
      const transform = getComputedStyle(document.querySelector(".footer-dune-layer")).transform;
      if (transform === "none") return true;
      const values = transform.slice(transform.indexOf("(") + 1, transform.indexOf(")")).split(",").map((part) => Number(part.trim()));
      return values.length >= 6 && Math.abs(values[4]) < 0.05 && Math.abs(values[5]) < 0.05;
    })).toBe(true);
    await email.hover({ force: true });
    await expect(email).toHaveCSS("background-color", "rgb(0, 0, 0)");
  });
}

test("1280 home selected work: Kineticare present, 7/5 grid, no stagger hole, stable title color", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openStable(page, "/");
  const grid = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll("#works .home-work-card-wrap")].map((wrap, index) => {
      const box = wrap.getBoundingClientRect();
      const col = getComputedStyle(wrap).gridColumn;
      return {
        index,
        href: wrap.querySelector(".work-title")?.getAttribute("href"),
        top: Math.round(box.top + window.scrollY),
        width: Math.round(box.width),
        col,
      };
    });
    return wraps;
  });
  expect(grid.map((card) => card.href)).toContain("/work/kineticare");
  expect(grid.length).toBe(6);
  for (let i = 0; i < grid.length; i += 2) {
    const wide = grid[i];
    const narrow = grid[i + 1];
    expect(wide.width, "odd cards are the 7-span").toBeGreaterThan(narrow.width + 40);
    expect(Math.abs(wide.top - narrow.top), "pair tops align — no stagger hole").toBeLessThanOrEqual(4);
  }

  const kineticareTitle = page.locator('#works .work-title[href="/work/kineticare"]');
  await kineticareTitle.scrollIntoViewIfNeeded();
  const colorBefore = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  await kineticareTitle.hover();
  await page.waitForTimeout(250);
  const colorAfter = await kineticareTitle.evaluate((el) => getComputedStyle(el).color);
  expect(colorAfter, "title color must not jump on hover").toBe(colorBefore);
});

for (const [width, expected] of [[1280, 64], [390, 56]]) {
  test(`${width}: header is a sticky white ${expected}px bar with the locked border`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStable(page, "/work/instructure");
    const bar = await page.evaluate(() => {
      const navbar = document.querySelector(".navbar");
      const wrap = navbar.querySelector(".nav-wrap");
      const style = getComputedStyle(navbar);
      return {
        position: style.position,
        background: style.backgroundColor,
        border: style.borderBottomWidth + " " + style.borderBottomColor,
        height: Math.round(wrap.getBoundingClientRect().height),
        breadcrumb: navbar.querySelector(".nav-breadcrumb")?.textContent.replace(/\s+/g, " ").trim() || "",
        oldStrip: Boolean(document.querySelector(".case-breadcrumb")),
        motion: Boolean(document.querySelector("[data-motion-toggle], .site-motion-toggle")),
      };
    });
    expect(bar.position).toBe("sticky");
    expect(bar.background).toBe("rgb(255, 255, 255)");
    expect(bar.border).toBe("1px rgb(230, 232, 233)");
    expect(bar.height).toBe(expected);
    expect(bar.breadcrumb).toContain("Works");
    expect(bar.breadcrumb).toContain("Instructure");
    expect(bar.oldStrip).toBe(false);
    expect(bar.motion).toBe(false);

    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(80);
    const stuckTop = await page.evaluate(() => document.querySelector(".navbar").getBoundingClientRect().top);
    expect(stuckTop).toBe(0);
  });
}
