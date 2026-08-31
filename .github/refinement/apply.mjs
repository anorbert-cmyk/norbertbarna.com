import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformCss, transformAnimations, transformHtml, transformResponsiveChecks, transformServer, hashAsset, replaceOnce } from './lib/refinement.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || process.cwd());
const get = path => readFileSync(join(root, path), 'utf8');
const output = new Map();
const css = transformCss(get('assets/css/responsive.css'));
const animations = transformAnimations(get('assets/js/animations.js'));
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
  output.set(path, readFileSync(join(here, 'payload', path), 'utf8'));
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
