import { expect, test } from '@playwright/test';

const caseRoutes = ['benker', 'bitpanda', 'instructure', 'kineticare', 'onrobot', 'raiffeisen', 'sportsgambit'];
const examples = [
  { name: 'homepage', route: '/', selector: '.home-about-video > video', ratio: true },
  { name: 'Instructure', route: '/work/instructure', selector: '.background-video > video', ratio: true },
  { name: 'Kineticare hero', route: '/work/kineticare', selector: '.kineticare-hero-bg > video' },
  { name: 'Kineticare walkthrough', route: '/work/kineticare', selector: '.kineticare-browser-frame > video', ratio: true },
];

test.beforeEach(async ({ page }) => {
  page.__mediaErrors = [];
  page.on('pageerror', error => page.__mediaErrors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(page.__mediaErrors).toEqual([]);
});

async function open(page, route) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => Boolean(window.PortfolioMedia))).toBe(true);
}
async function intoView(video) {
  // A DOM scroll is not a trusted play gesture. Autoplay must work without a click.
  await video.evaluate(v => v.scrollIntoView({ block: 'center', behavior: 'instant' }));
}
async function playing(video) {
  await expect.poll(() => video.evaluate(v => !v.paused && v.currentTime > 0.15), { timeout: 12000 }).toBe(true);
  const time = await video.evaluate(v => v.currentTime);
  await expect.poll(() => video.evaluate(v => v.currentTime)).not.toBe(time);
  expect(await video.evaluate(v => v.muted && v.playsInline && v.loop && !v.controls)).toBe(true);
}
async function screenshot(page, info, name) {
  await page.evaluate(() => document.fonts?.ready || Promise.resolve());
  const path = info.outputPath(name + '.png');
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function switchInView(page, mobile) {
  await page.evaluate(() => window.scrollTo(0, 0));
  if (mobile) await page.locator('.menu-button').click();
  return page.getByRole('switch', { name: 'Page motion' });
}

for (const viewport of [
  { name: 'desktop', width: 1366, height: 900, mobile: false },
  { name: 'touch', width: 390, height: 844, mobile: true },
]) {
  test.describe(viewport.name + ' media', () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile, hasTouch: viewport.mobile, reducedMotion: 'no-preference' });
    for (const example of examples) {
      test(`${example.name}: muted autoplay without a play overlay`, async ({ page }, info) => {
        await open(page, example.route);
        const video = page.locator(example.selector);
        await intoView(video);
        await playing(video);
        await expect(page.locator('.motion-video-toggle, [data-w-bg-video-control], video[controls]')).toHaveCount(0);
        if (example.ratio) {
          const geometry = await video.evaluate(v => {
            const r = v.getBoundingClientRect();
            return { width: r.width, height: r.height, natural: v.videoWidth / v.videoHeight };
          });
          expect(geometry.width).toBeGreaterThan(100);
          expect(Math.abs(geometry.width / geometry.height - geometry.natural)).toBeLessThan(.02);
        }
        await screenshot(page, info, viewport.name + '-' + example.name.replaceAll(' ', '-'));
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
        await intoView(video);
        await playing(video);
      });
    }
    test('one keyboard-accessible motion preference survives scrolling, navigation and reload', async ({ page }) => {
      await open(page, '/work/kineticare');
      await playing(page.locator('.kineticare-hero-bg > video'));
      const toggle = await switchInView(page, viewport.mobile);
      await toggle.focus();
      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(await page.evaluate(() => [...document.querySelectorAll('video')].every(v => v.paused))).toBe(true);
      if (viewport.mobile) await page.keyboard.press('Escape');
      const walkthrough = page.locator('.kineticare-browser-frame > video');
      await intoView(walkthrough);
      await page.waitForTimeout(200);
      expect(await walkthrough.evaluate(v => v.paused)).toBe(true);
      await open(page, '/work/instructure');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect.poll(() => page.evaluate(() => window.PortfolioMedia?.isReduced())).toBe(true);
      const demo = page.locator('.background-video > video');
      await intoView(demo);
      expect(await demo.evaluate(v => v.paused)).toBe(true);
      const resume = await switchInView(page, viewport.mobile);
      await resume.click();
      await expect(resume).toHaveAttribute('aria-checked', 'true');
      if (viewport.mobile) await page.keyboard.press('Escape');
      await intoView(demo);
      await playing(demo);
      expect(await page.evaluate(() => document.querySelectorAll('.case-motion-rail').length)).toBeLessThanOrEqual(1);
    });
  });
}

for (const width of [360, 768, 1366]) {
  test(`all seven evidence notes are unboxed and legible at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of caseRoutes) {
      await open(page, '/work/' + slug);
      const note = page.locator('.case-evidence-note');
      await note.scrollIntoViewIfNeeded();
      const result = await note.evaluate(e => {
        const s = getComputedStyle(e), label = getComputedStyle(e.querySelector('strong'));
        const c = s.color.match(/[\d.]+/g).slice(0,3).map(Number).map(v => {
          v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
        });
        return { bg: s.backgroundColor, border: s.borderLeftWidth, padding: s.paddingLeft,
          font: parseFloat(s.fontSize), contrast: 1.05 / (.2126*c[0]+.7152*c[1]+.0722*c[2]+.05),
          labelDisplay: label.display, labelSize: parseFloat(label.fontSize),
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          width: e.getBoundingClientRect().width, text: e.textContent };
      });
      expect(result.bg).toBe('rgba(0, 0, 0, 0)');
      expect(result.border).toBe('0px');
      expect(result.padding).toBe('0px');
      expect(result.font).toBeGreaterThanOrEqual(14);
      expect(result.contrast).toBeGreaterThanOrEqual(4.5);
      expect(result.labelDisplay).toBe('block');
      expect(result.labelSize).toBeGreaterThanOrEqual(12);
      expect(result.overflow).toBeLessThanOrEqual(1);
      expect(result.width).toBeGreaterThan(200);
      expect(result.text).toContain('independently audited');
      if (slug === 'onrobot') {
        expect(result.text).toContain('12 tasks with 18 operators');
        await screenshot(page, info, 'onrobot-editorial-' + width);
      }
    }
  });
}

test('device reduced motion stops autoplay and cannot be overridden by the site switch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, '/work/kineticare');
  await expect(page.getByRole('switch', { name: 'Page motion' })).toBeDisabled();
  expect(await page.evaluate(() => [...document.querySelectorAll('video')].every(v => v.paused && !v.autoplay))).toBe(true);
  await page.evaluate(() => window.PortfolioMedia.setPaused(false));
  expect(await page.evaluate(() => window.PortfolioMedia.isReduced())).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await playing(page.locator('.kineticare-hero-bg > video'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('video')].every(v => v.paused))).toBe(true);
  expect(await page.evaluate(() => window.ScrollTrigger?.getAll().length || 0)).toBe(0);
});

test('Save-Data suppresses media requests and handles a runtime preference change', async ({ page }) => {
  await page.addInitScript(() => {
    const connection = new EventTarget(); connection.saveData = true;
    Object.defineProperty(navigator, 'connection', { value: connection, configurable: true });
    window.__testConnection = connection;
  });
  const mediaRequests = [];
  page.on('request', request => { if (request.url().includes('/assets/videos/')) mediaRequests.push(request.url()); });
  await open(page, '/work/kineticare');
  await page.waitForTimeout(250);
  expect(mediaRequests).toEqual([]);
  await expect(page.getByRole('switch', { name: 'Page motion' })).toBeDisabled();
  await page.evaluate(() => { window.__testConnection.saveData = false; window.__testConnection.dispatchEvent(new Event('change')); });
  await playing(page.locator('.kineticare-hero-bg > video'));
  await page.evaluate(() => { window.__testConnection.saveData = true; window.__testConnection.dispatchEvent(new Event('change')); });
  await expect.poll(() => page.locator('.kineticare-hero-bg > video').evaluate(v => v.paused)).toBe(true);
});

test('visibility and page lifecycle handlers pause and safely restore visible media', async ({ page }) => {
  await open(page, '/work/kineticare');
  const video = page.locator('.kineticare-hero-bg > video');
  await playing(video);
  // Headless pages do not reliably become hidden on bringToFront. Exercise the
  // exact browser event handler with a controlled visibility state instead.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await video.evaluate(v => v.paused)).toBe(true);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await playing(video);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  expect(await video.evaluate(v => v.paused)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await playing(video);
});

test('denied autoplay leaves a poster, no play overlay and no unbounded retries', async ({ page }) => {
  await page.addInitScript(() => {
    window.__playAttempts = 0;
    HTMLMediaElement.prototype.play = function () {
      window.__playAttempts++;
      return Promise.reject(new DOMException('Autoplay denied for regression test', 'NotAllowedError'));
    };
  });
  await open(page, '/work/kineticare');
  const video = page.locator('.kineticare-hero-bg > video');
  await expect(video).toHaveAttribute('data-media-state', 'blocked');
  const before = await page.evaluate(() => window.__playAttempts);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__playAttempts)).toBe(before);
  expect(await video.evaluate(v => Boolean(v.poster) && v.paused && !v.controls)).toBe(true);
  await expect(page.locator('.motion-video-toggle, [data-w-bg-video-control]')).toHaveCount(0);
  await page.locator('#case-title').click();
  await expect.poll(() => page.evaluate(() => window.__playAttempts)).toBe(before + 1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#case-title').click();
  expect(await page.evaluate(() => window.__playAttempts)).toBe(before + 1);
});

test('a late play promise cannot undo an explicit pause', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    window.__releasePlayback = [];
    HTMLMediaElement.prototype.play = function () {
      const video = this;
      return new Promise((resolve, reject) => window.__releasePlayback.push(() => original.call(video).then(resolve, reject)));
    };
  });
  await open(page, '/work/kineticare');
  await expect.poll(() => page.evaluate(() => window.__releasePlayback.length)).toBeGreaterThan(0);
  await page.getByRole('switch', { name: 'Page motion' }).click();
  await page.evaluate(() => window.__releasePlayback.splice(0).forEach(release => release()));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [...document.querySelectorAll('video')].every(v => v.paused && !v.autoplay))).toBe(true);
  await expect(page.getByRole('switch', { name: 'Page motion' })).toHaveAttribute('aria-checked', 'false');
});

test('autoplay and motion preference work even when GSAP fails to load', async ({ page }) => {
  await page.route('**/assets/js/vendor/**', route => route.abort());
  await open(page, '/work/kineticare');
  await playing(page.locator('.kineticare-hero-bg > video'));
  const toggle = page.getByRole('switch', { name: 'Page motion' });
  await toggle.click(); await toggle.click();
  await playing(page.locator('.kineticare-hero-bg > video'));
});

test('autoplay has a native scroll fallback without IntersectionObserver', async ({ page }) => {
  await page.addInitScript(() => { window.IntersectionObserver = undefined; });
  await page.route('**/assets/js/vendor/**', route => route.abort());
  await open(page, '/work/kineticare');
  const video = page.locator('.kineticare-browser-frame > video');
  await intoView(video); await playing(video);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
});

test('a JavaScript-free visit keeps readable notes, navigation and poster fallbacks', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3000/work/onrobot');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.locator('.case-evidence-note')).toBeVisible();
    await expect(page.locator('[data-motion-toggle]')).toBeHidden();
    await page.goto('http://127.0.0.1:3000/work/kineticare');
    expect(await page.locator('video[autoplay], video[controls]').count()).toBe(0);
  } finally { await context.close(); }
});
