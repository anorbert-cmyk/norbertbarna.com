import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformCss, transformAnimations, transformHtml, transformResponsiveChecks, transformServer, hashAsset, replaceOnce } from './lib/refinement.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || process.cwd());
const get = path => readFileSync(join(root, path), 'utf8');
const output = new Map();
let css = transformCss(get('assets/css/responsive.css'));
css = replaceOnce(css, '.inst-bg-video.mobile .background-video > video {\n  width: 100%;',
  '.inst-bg-video.mobile .background-video > video {\n  position: absolute;\n  inset: 0;\n  z-index: 0;\n  width: 100%;', 'reset inherited Webflow video inset and stacking');
let animations = transformAnimations(get('assets/js/animations.js'));
// ScrollTrigger 3.12 can splice its trigger registry during a nested refresh
// when once:true destroys an already-passed trigger on a deep initial scroll.
// The same one-way play actions without auto-kill preserve the visual behavior;
// matchMedia/reduced-motion teardown still owns disposal.
const revealStart = animations.indexOf('  function revealElement(');
const revealCode = animations.slice(revealStart);
if ((revealCode.match(/once: true/g) || []).length !== 4) throw new Error('Unexpected reveal trigger inventory');
animations = animations.slice(0, revealStart) + revealCode.replaceAll('once: true', 'toggleActions: "play none none none"');
const media = readFileSync(join(here, 'payload/assets/js/media.js'), 'utf8');
const versions = { css: hashAsset(css, 'responsive', 'css'), animations: hashAsset(animations, 'animations', 'js'), media: hashAsset(media, 'media', 'js') };
output.set('assets/css/responsive.css', css);
output.set('assets/css/' + versions.css, css);
output.set('assets/js/animations.js', animations);
output.set('assets/js/' + versions.animations, animations);
output.set('assets/js/media.js', media);
output.set('assets/js/' + versions.media, media);
for (const page of ['index.html', 'works.html', ...readdirSync(join(root, 'work')).filter(f => f.endsWith('.html')).sort().map(f => 'work/' + f), '404.html']) {
  output.set(page, transformHtml(get(page), page, versions));
}
output.set('server.js', transformServer(get('server.js')));
output.set('scripts/check-responsive.mjs', transformResponsiveChecks(get('scripts/check-responsive.mjs')));
let serverChecks = get('scripts/check-server.mjs');
serverChecks = replaceOnce(serverChecks, '/^animations\\.([a-f0-9]{12})\\.js$/i', '/^(?:animations|media)\\.([a-f0-9]{12})\\.js$/i', 'independent media hash verification');
serverChecks = replaceOnce(serverChecks, '["js/animations.js", "js", "animations"],', '["js/animations.js", "js", "animations"],\n    ["js/media.js", "js", "media"],', 'new media cache coverage');
serverChecks = replaceOnce(serverChecks, '  for (const [legacyPath, expectedLocation] of [', '  for (const [legacyPath, expectedLocation] of [\n    ["/favicon.ico", "/assets/icons/68f923d010d274634c966a6e_favicon.png"],', 'favicon redirect test');
output.set('scripts/check-server.mjs', serverChecks);
for (const path of ['scripts/check-editorial-media.mjs', 'tests/editorial-media.spec.mjs']) {
  let text = readFileSync(join(here, 'payload', path), 'utf8');
  if (path === 'tests/editorial-media.spec.mjs') {
    text = replaceOnce(text, "      expect(result.text).toContain('independently audited');",
      "      expect(result.text).toContain(slug === 'raiffeisen' ? 'independently reproducible headline claims' : 'independently audited');", 'preserve the distinct Raiffeisen qualification');
    text = replaceOnce(text, 'natural: v.videoWidth / v.videoHeight };',
      'natural: v.videoWidth / v.videoHeight, offset: Math.abs(r.top - v.parentElement.getBoundingClientRect().top) };', 'video containment measurement');
    text = replaceOnce(text, '          expect(geometry.width).toBeGreaterThan(100);',
      '          expect(geometry.width).toBeGreaterThan(100);\n          if (example.name === "Instructure") expect(geometry.offset).toBeLessThan(2);', 'in-frame playback check');
    text += `

test('deep scrolling before GSAP loads cannot corrupt the trigger registry', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/js/vendor/gsap.min.js', async route => { await gate; await route.continue(); });
  await page.goto('/work/kineticare', { waitUntil: 'commit' });
  await expect.poll(() => page.evaluate(() => Boolean(window.PortfolioMedia))).toBe(true);
  const video = page.locator('.kineticare-browser-frame > video');
  await intoView(video);
  release();
  await page.waitForLoadState('load');
  await expect(page.locator('html')).toHaveClass(/gsap-ready/);
  await playing(video);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(() => window.ScrollTrigger.refresh());
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('#case-title')).toBeVisible();
});
`;
  }
  output.set(path, text);
}
let pkg = get('package.json');
pkg = replaceOnce(pkg, 'node scripts/check-server.mjs"', 'node scripts/check-server.mjs && node scripts/check-editorial-media.mjs"', 'editorial/media/SEO check gate');
output.set('package.json', pkg);
let config = get('playwright.config.mjs');
config = replaceOnce(config, 'reporter: process.env.CI ? [["github"], ["list"]] : "list",', 'reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],', 'browser evidence reporter');
output.set('playwright.config.mjs', config);
let ci = get('.github/workflows/ci.yml');
ci = ci.replace(/      - name: Prepare isolated review workspace[\s\S]*?(?=      - name: Dependency audit)/, '');
ci = replaceOnce(ci, '          node --check assets/js/animations.js', '          node --check assets/js/animations.js\n          node --check assets/js/media.js', 'new media syntax gate');
output.set('.github/workflows/ci.yml', ci);

// Transformations and their guards all completed before writing anything.
for (const [path, content] of output) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}
console.log(JSON.stringify({ versions, files: [...output.keys()] }, null, 2));
