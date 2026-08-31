import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.__mediaErrors = [];
  page.on('pageerror', error => page.__mediaErrors.push(error.stack || error.message));
});
test.afterEach(async ({ page }) => {
  expect(page.__mediaErrors).toEqual([]);
});
const cases = ['benker', 'bitpanda', 'instructure', 'kineticare', 'onrobot', 'raiffeisen', 'sportsgambit'];
for (const width of [390, 1366]) {
  for (const slug of cases) {
    test(`${width}px: ${slug} evidence note is editorial, unboxed and visible`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/work/' + slug);
      const note = page.locator('.case-evidence-note');
      await note.scrollIntoViewIfNeeded();
      await expect(note).toBeVisible();
      await expect(note).toContainText(slug === 'raiffeisen' ? 'independently reproducible headline claims' : 'independently audited');
      const style = await note.evaluate(el => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, border: s.borderLeftWidth, padding: s.paddingLeft, size: s.fontSize };
      });
      expect(style).toEqual({ background: 'rgba(0, 0, 0, 0)', border: '0px', padding: '0px', size: '14px' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: test.info().outputPath('editorial-note.png') });
    });
  }
  test(`${width}px: Kineticare walkthrough auto-plays silently, no player overlay`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/work/kineticare');
    const video = page.locator('.kineticare-browser-frame video');
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate(el => !el.paused && el.currentTime > 0), { timeout: 15000 }).toBe(true);
    expect(await video.evaluate(el => ({ muted: el.muted, inline: el.playsInline, controls: el.controls }))).toEqual({ muted: true, inline: true, controls: false });
    await expect(page.locator('.motion-video-toggle, [data-w-bg-video-control]')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => video.evaluate(el => el.paused)).toBe(true);
    await video.scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate(el => !el.paused)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => video.evaluate(el => el.paused)).toBe(true);
  });
}
test('manual pause persists across navigation and remains keyboard-operable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/work/kineticare');
  const toggle = page.locator('[data-media-toggle]');
  await toggle.focus(); await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.locator('[data-media-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.kineticare-browser-frame video').scrollIntoViewIfNeeded();
  expect(await page.locator('video').evaluateAll(videos => videos.every(video => video.paused))).toBe(true);
});
test('browser autoplay rejection leaves a poster and no unhandled error', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('Test autoplay policy', 'NotAllowedError')); };
  });
  await page.goto('/work/kineticare');
  const video = page.locator('.kineticare-browser-frame video');
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute('data-media-state', 'blocked');
  await expect(video).toHaveAttribute('poster', /kineticare-scroll-poster/);
  expect(errors).toEqual([]);
});

for (const touch of [false, true]) {
  test.describe(touch ? 'touch autoplay' : 'desktop autoplay', () => {
    test.use({ viewport: { width: touch ? 390 : 1366, height: 900 }, hasTouch: touch, isMobile: touch });
    for (const surface of [
      { name: 'home research animation', path: '/', selector: '.home-about-video video' },
      { name: 'Instructure demonstration', path: '/work/instructure', selector: '.background-video video' },
      { name: 'Kineticare hero', path: '/work/kineticare', selector: '.kineticare-hero-bg video' }
    ]) {
      test(surface.name + ' starts without a click and resumes on re-entry', async ({ page }) => {
        await page.goto(surface.path);
        const video = page.locator(surface.selector);
        await video.scrollIntoViewIfNeeded();
        await expect.poll(() => video.evaluate(v => !v.paused && v.currentTime > 0.1), { timeout: 12000 }).toBe(true);
        expect(await video.evaluate(v => v.muted && v.playsInline && !v.controls)).toBe(true);
        await page.screenshot({ path: test.info().outputPath('autoplay-surface.png') });
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
        await video.scrollIntoViewIfNeeded();
        await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      });
    }
    test('page-level pause is visible, keyboard-accessible and survives navigation', async ({ page }) => {
      await page.goto('/work/kineticare');
      async function reachToggle() {
        await page.evaluate(() => window.scrollTo(0, 0));
        if (touch) {
          const menu = page.locator('.menu-button');
          if (await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
        }
        const toggle = page.locator('[data-media-toggle]');
        await expect(toggle).toBeVisible();
        await toggle.focus();
        return toggle;
      }
      let toggle = await reachToggle();
      await page.keyboard.press('Space');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.goto('/works');
      await page.goto('/work/instructure');
      const video = page.locator('.background-video video');
      await video.scrollIntoViewIfNeeded();
      expect(await video.evaluate(v => v.paused)).toBe(true);
      toggle = await reachToggle();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      if (touch) await page.keyboard.press('Escape');
      await video.scrollIntoViewIfNeeded();
      await expect.poll(() => video.evaluate(v => !v.paused && v.currentTime > 0.1), { timeout: 12000 }).toBe(true);
    });
  });
}

test('Save-Data suppresses automatic playback until an explicit page preference', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, addEventListener() {} } });
  });
  await page.goto('/work/kineticare');
  const video = page.locator('.kineticare-hero-bg video');
  await expect(page.locator('html')).toHaveAttribute('data-video-motion', 'paused');
  expect(await video.evaluate(v => v.paused)).toBe(true);
  await page.locator('[data-media-toggle]').click();
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
});

test('reduced motion at load and at runtime always overrides the page setting', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/work/kineticare');
  const toggle = page.locator('[data-media-toggle]');
  await expect(toggle).toBeDisabled();
  expect(await page.locator('video').evaluateAll(vs => vs.every(v => v.paused))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(toggle).toBeEnabled();
  const video = page.locator('.kineticare-hero-bg video');
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('video').evaluateAll(vs => vs.every(v => v.paused))).toBe(true);
  await page.waitForTimeout(350);
  await expect(toggle).toBeDisabled();
});

test('page lifecycle and tab visibility pause and restore visible media', async ({ page }) => {
  await page.goto('/work/kineticare');
  const video = page.locator('.kineticare-hero-bg video');
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect.poll(() => video.evaluate(v => !v.paused)).toBe(true);
});

test('no IntersectionObserver uses native scroll fallback', async ({ page }) => {
  await page.addInitScript(() => { delete window.IntersectionObserver; });
  await page.goto('/work/kineticare');
  const video = page.locator('.kineticare-browser-frame video');
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(v => !v.paused && v.currentTime > 0.1), { timeout: 12000 }).toBe(true);
});

test('video playback and pause do not depend on GSAP loading', async ({ page }) => {
  await page.route('**/assets/js/vendor/gsap.min.js', route => route.abort());
  await page.route('**/assets/js/vendor/ScrollTrigger.min.js', route => route.abort());
  await page.goto('/work/kineticare');
  const video = page.locator('.kineticare-browser-frame video');
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(v => !v.paused && v.currentTime > 0.1), { timeout: 12000 }).toBe(true);
});

test('late play completion cannot override an explicit page pause', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const video = this;
      return new Promise((resolve, reject) => {
        window.__finishMediaPlay = () => original.call(video).then(resolve, reject);
      });
    };
  });
  await page.goto('/work/kineticare');
  await page.waitForFunction(() => typeof window.__finishMediaPlay === 'function');
  await page.locator('[data-media-toggle]').click();
  await expect(page.locator('[data-media-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => window.__finishMediaPlay());
  await expect.poll(() => page.locator('video').evaluateAll(vs => vs.every(v => v.paused))).toBe(true);
});

test('JavaScript-free visit retains content, navigation, and a poster', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await page.goto('/work/instructure');
  await expect(page.locator('.case-evidence-note')).toBeVisible();
  await expect(page.locator('.nav-menu')).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('poster', /poster/);
  expect(await page.locator('video').getAttribute('autoplay')).toBeNull();
  await context.close();
});
