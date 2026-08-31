#!/usr/bin/env node
/** Apply this draft only to a clean, isolated checkout of the reviewed baseline.
 * Default: dry run. Usage: node apply-refinement.mjs /path/to/repo [--write]
 * Does not install packages, commit, push, merge, deploy or delete old assets.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const BASE = 'd75c57d80f0c368e659d365aa716b14be3ac165c';
const bundle = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const root = resolve(args.find(a => !a.startsWith('--')) || process.cwd());
const write = args.includes('--write');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim();
const read = p => readFileSync(join(root, p), 'utf8');
const pending = new Map();
const stage = (p, text) => pending.set(p, text);

git('merge-base', '--is-ancestor', BASE, 'HEAD');
const priorChanges = git('diff', '--name-only', BASE, 'HEAD').split('\n').filter(Boolean);
if (priorChanges.some(p => !p.startsWith('.github/refinement-input/') && p !== '.github/workflows/editorial-refinement.yml')) throw new Error('Site baseline changed. Review before applying.');
if (git('status', '--porcelain')) throw new Error('Checkout has existing changes. Preserve them and use a separate clean checkout.');
const origin = git('remote', 'get-url', 'origin');
if (!/github\.com[:/]anorbert-cmyk\/norbertbarna\.com(?:\.git)?$/.test(origin)) throw new Error('Unexpected repository origin.');
if (write && git('branch', '--show-current') === 'main') throw new Error('Use an isolated feature branch, not main.');

function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  if (first < 0 || text.indexOf(before, first + before.length) >= 0) throw new Error('Unmatched/ambiguous patch: ' + label);
  return text.slice(0, first) + after + text.slice(first + before.length);
}
function release(sourcePath, content) {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
  const target = sourcePath.replace(/\.(js|css)$/, '.' + hash + '.$1');
  if (existsSync(join(root, target)) && read(target) !== content) throw new Error('Refusing to overwrite existing release asset: ' + target);
  stage(sourcePath, content);
  stage(target, content);
  return target.split('/').pop();
}

const editorialCss = readFileSync(join(bundle, 'assets/css/editorial-note.css'), 'utf8');
let css = read('assets/css/responsive.css');
const oldRule = css.match(/\.summary > \.case-evidence-note \{[^}]+\}/)?.[0];
if (!oldRule || !oldRule.includes('border-left: 3px solid var(--site-focus)')) throw new Error('Evidence-note baseline differs.');
css = replaceOnce(css, oldRule, editorialCss.trim(), 'editorial note');
const responsiveName = release('assets/css/responsive.css', css);

let animations = read('assets/js/animations.js');
const start = animations.indexOf('  function syncWebflowVideoControl(');
const end = animations.indexOf('  function focusPageTitle()', start);
if (start < 0 || end < start) throw new Error('Legacy media ownership boundaries changed.');
animations = animations.slice(0, start) + '  // Video playback is owned independently by media.js.\n\n' + animations.slice(end);
animations = replaceOnce(animations, '  enhanceVideoControls();\n', '', 'legacy media initializer');
const animationName = release('assets/js/animations.js', animations);
const media = readFileSync(join(bundle, 'assets/js/media.js'), 'utf8');
if (existsSync(join(root, 'assets/js/media.js'))) throw new Error('A media module already exists; review before integrating.');
const mediaName = release('assets/js/media.js', media);

const cases = readdirSync(join(root, 'work')).filter(p => p.endsWith('.html')).map(p => 'work/' + p);
if (cases.length !== 7) throw new Error('Expected seven case studies.');
let totalVideos = 0;
for (const page of ['index.html', 'works.html', ...cases, '404.html']) {
  const original = read(page);
  let html = original.replace(/responsive\.[a-f0-9]{12}\.css/g, responsiveName)
    .replace(/animations\.[a-f0-9]{12}\.js/g, animationName);
  const count = [...html.matchAll(/<video\b/gi)].length;
  if (count) {
    totalVideos += count;
    html = html.replace(/<video\b[^>]*>/gi, tag => tag.replace(/\scontrols(?:=(?:"[^"]*"|'[^']*'))?(?=\s|>)/gi, '')
      .replace(/^<video\b/i, '<video data-autoplay-video'));
    // Remove Webflow player controls, not the adjacent description/caption.
    html = html.replace(/<(a|button)\b[^>]*\bdata-w-bg-video-control\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const prefix = page.startsWith('work/') ? '../' : '';
    const navigation = '<script src="' + prefix + 'assets/js/navigation.js"></script>';
    html = replaceOnce(html, navigation, navigation + '<script src="' + prefix + 'assets/js/' + mediaName + '"></script>', page + ': media script');
    const button = '<button type="button" class="site-media-toggle" data-media-toggle hidden aria-label="Motion on — pause page videos" aria-pressed="true">Motion on</button>';
    html = replaceOnce(html, '<div class="nav-button-wrap"></div>', '<div class="nav-button-wrap">' + button + '</div>', page + ': motion setting');
  }
  const notes = s => [...s.matchAll(/<p class="case-evidence-note">[\s\S]*?<\/p>/g)].map(m => m[0]);
  const schemas = s => [...s.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (JSON.stringify(notes(original)) !== JSON.stringify(notes(html))) throw new Error('Evidence content changed: ' + page);
  if (JSON.stringify(schemas(original)) !== JSON.stringify(schemas(html))) throw new Error('Structured-data content changed: ' + page);
  stage(page, html);
}
if (!totalVideos) throw new Error('No videos found.');

let responsiveChecks = read('scripts/check-responsive.mjs');
responsiveChecks = replaceOnce(responsiveChecks,
  'const navigationJs = readFileSync(join(ROOT, "assets/js/navigation.js"), "utf8");',
  'const navigationJs = readFileSync(join(ROOT, "assets/js/navigation.js"), "utf8");\nconst mediaJs = readFileSync(join(ROOT, "assets/js/media.js"), "utf8");', 'media test source');
responsiveChecks = replaceOnce(responsiveChecks,
  `!animationJs.includes('webflowControl.addEventListener("click"')`,
  `!mediaJs.includes('button.addEventListener("click"')`, 'page-level pause control');
responsiveChecks = responsiveChecks.replace('independent menu and retained background-video controls are incomplete', 'independent menu and page-level media control are incomplete');
const legacySurfaceCheck = responsiveChecks.split('\n').find(line => line.includes('homepage video control must stay on the media surface'));
if (!legacySurfaceCheck) throw new Error('Legacy media check changed.');
responsiveChecks = replaceOnce(responsiveChecks, legacySurfaceCheck,
  'if (!mediaJs.includes("IntersectionObserver") || !mediaJs.includes("document.hidden") || !mediaJs.includes("motionAllowed")) fail("viewport and preference-aware video playback is missing");', 'viewport contract');
responsiveChecks = replaceOnce(responsiveChecks,
  String.raw`/<video\b[^>]*\bcontrols\b[^>]*aria-label="Kineticare platform walkthrough"/i`,
  String.raw`/<video\b[^>]*\bdata-autoplay-video\b[^>]*aria-label="Kineticare platform walkthrough"/i`, 'content video autoplay');
responsiveChecks = replaceOnce(responsiveChecks,
  'content video needs native controls and a text description',
  'content video needs managed autoplay and a text description', 'video description contract');
const declaration = 'const kineticareHtml = readFileSync(join(ROOT, "work/kineticare.html"), "utf8");';
responsiveChecks = replaceOnce(responsiveChecks, declaration, declaration + '\n' + String.raw`if (!/<button\b[^>]*\bdata-media-toggle(?:\s|>)/i.test(kineticareHtml) ||
    /<video\b[^>]*\scontrols(?:\s|=|>)/i.test(kineticareHtml)) {
  fail("work/kineticare.html: use an accessible page-level pause setting, not native player chrome");
}`, 'page-level pause contract');
stage('scripts/check-responsive.mjs', responsiveChecks);


let server = read('server.js');
server = replaceOnce(server, String.raw`js\/animations\.`, String.raw`js\/(?:animations|media)\.`, 'immutable media release cache');
stage('server.js', server);
for (const p of ['scripts/check-editorial-media.mjs', 'tests/editorial-media.spec.mjs']) {
  if (existsSync(join(root, p))) throw new Error('Do not overwrite an existing implementation: ' + p);
  stage(p, readFileSync(join(bundle, p), 'utf8'));
}
const pkg = JSON.parse(read('package.json'));
pkg.scripts.test += ' && node scripts/check-editorial-media.mjs';
stage('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log((write ? 'Applying' : 'Dry run:') + ' ' + pending.size + ' file writes; ' + totalVideos + ' managed videos.');
for (const [p, content] of pending) {
  console.log(p);
  if (write) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), content); }
}
console.log('No commit, push, merge or deployment performed. Run npm ci, npm test and npm run test:e2e; inspect desktop/mobile screenshots before release.');
