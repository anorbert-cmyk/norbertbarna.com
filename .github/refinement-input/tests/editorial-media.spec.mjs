import { test, expect } from '@playwright/test';
const cases = ['benker', 'bitpanda', 'instructure', 'kineticare', 'onrobot', 'raiffeisen', 'sportsgambit'];
for (const width of [390, 1366]) {
  for (const slug of cases) {
    test(`${width}px: ${slug} evidence note is editorial, unboxed and visible`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/work/' + slug);
      const note = page.locator('.case-evidence-note');
      await note.scrollIntoViewIfNeeded();
      await expect(note).toBeVisible();
      await expect(note).toContainText('independently audited');
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
