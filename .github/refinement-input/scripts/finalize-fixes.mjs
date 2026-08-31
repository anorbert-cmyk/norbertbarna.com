import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = process.cwd();
const bundle = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = '7a9caab1912d2eed4f5df98589e6a0e3c46cf316';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
git('merge-base', '--is-ancestor', base, 'HEAD');
if (git('status', '--porcelain')) throw new Error('Use a clean checkout');
if (git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean).some(p => !p.startsWith('.github/refinement-input/') && p !== '.github/workflows/editorial-refinement.yml')) throw new Error('Implementation moved; review before patching');
const read = p => readFileSync(join(root, p), 'utf8');
const write = (p, text) => writeFileSync(join(root, p), text);
function once(text, before, after) {
  const at = text.indexOf(before);
  if (at < 0 || text.indexOf(before, at + before.length) >= 0) throw new Error('Ambiguous replacement: ' + before);
  return text.slice(0, at) + after + text.slice(at + before.length);
}
let checker = read('scripts/check-server.mjs');
checker = once(checker, String.raw`/^animations\.([a-f0-9]{12})\.js$/i`, String.raw`/^(?:animations|media)\.([a-f0-9]{12})\.js$/i`);
write('scripts/check-server.mjs', checker);

let seo = read('scripts/check-editorial-media.mjs');
seo = once(seo,
  "assert.ok(note && /not.*independently audited/i.test(note), page + ': evidence qualification lost'); notes += 1;",
  `const genericNoteHash = '25bcfbb5b422f7d8b3bc0bac86622fdaf6a7a58cd57ad46d9e7c0f285487e434';
    const expectedNoteHash = {
      'work/onrobot.html': 'c26df415d320eb80778ce9884f7f7046b326388046bea41a26dd0413588a4997',
      'work/raiffeisen.html': '8971325f11c620c1b617ef669a19e6734a0387330d95ece0bb2e89e503b55721'
    }[page] || genericNoteHash;
    assert.ok(note, page + ': evidence qualification missing');
    assert.equal(createHash('sha256').update(note).digest('hex'), expectedNoteHash, page + ': evidence qualification changed from reviewed source');
    notes += 1;`);
seo = once(seo,
  "  assert.ok(existsSync(join(ROOT, image.pathname.slice(1))), page + ': missing social image');",
  `  const imagePath = join(ROOT, image.pathname.slice(1));
  assert.ok(existsSync(imagePath), page + ': missing social image');
  const bytes = readFileSync(imagePath);
  assert.equal(bytes.readUInt16BE(0), 0xffd8, page + ': social image is not JPEG');
  let dimensions = null;
  for (let offset = 2; offset + 8 < bytes.length;) {
    assert.equal(bytes[offset], 0xff, page + ': invalid JPEG marker');
    const marker = bytes[offset + 1], length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      dimensions = [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)]; break;
    }
    assert.ok(length >= 2, page + ': invalid JPEG segment');
    offset += 2 + length;
  }
  assert.deepEqual(dimensions, [1200, 630], page + ': actual social image dimensions differ');`);
write('scripts/check-editorial-media.mjs', seo);
write('tests/editorial-media.spec.mjs', readFileSync(join(bundle, 'tests/editorial-media.spec.mjs'), 'utf8'));

let css = read('assets/css/responsive.css');
if (createHash('sha256').update(css).digest('hex').slice(0,12) !== 'b009c678adff') throw new Error('Responsive source changed');
css += `
/* Keep the Instructure demonstration available on touch devices too. The
 * exported .mobile class hid it, even though the controller was ready. */
.work-single-section .inst-bg-video.mobile {
  display: block;
  width: min(calc(100% - 2 * var(--site-gutter)), 1200px);
  margin: 0 auto clamp(36px, 5vw, 72px);
}
.inst-bg-video.mobile > .container-2 {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
}
.inst-bg-video .background-video {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  border-radius: 0;
  overflow: hidden;
}
.inst-bg-video .background-video > video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  object-fit: contain;
}
`;
const cssName = 'responsive.' + createHash('sha256').update(css).digest('hex').slice(0,12) + '.css';
write('assets/css/responsive.css', css);
write('assets/css/' + cssName, css);
for (const page of ['index.html', 'works.html', '404.html', ...readdirSync(join(root, 'work')).filter(f => f.endsWith('.html')).map(f => 'work/' + f)]) {
  const original = read(page);
  write(page, original.replace(/responsive\.[a-f0-9]{12}\.css/g, cssName));
}
console.log('Applied verified source-preserving evidence checks, independent media cache validation, mobile Instructure geometry, and full media lifecycle tests.');
