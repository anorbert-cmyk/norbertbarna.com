#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://www.barnanorbert.com';
const pages = ['index.html', 'works.html', ...readdirSync(join(ROOT, 'work')).filter(f => f.endsWith('.html')).sort().map(f => 'work/' + f)];
const read = p => readFileSync(join(ROOT, p), 'utf8');
const attr = (tag, name) => tag.match(new RegExp('\\s' + name + '\\s*=\\s*(["\'])(.*?)\\1', 'i'))?.[2] || '';
const media = read('assets/js/media.js');
execFileSync(process.execPath, ['--check', join(ROOT, 'assets/js/media.js')], { stdio: 'inherit' });
const mediaName = 'media.' + createHash('sha256').update(media).digest('hex').slice(0, 12) + '.js';
assert.equal(read('assets/js/' + mediaName), media, 'Media release must be content-hashed and byte-identical');
assert.ok(!read('assets/js/animations.js').includes('function enhanceVideoControls'), 'Only one module may own media playback');
const noteRule = read('assets/css/responsive.css').match(/\.summary > \.case-evidence-note\s*\{([^}]+)\}/)?.[1] || '';
assert.match(noteRule, /background:\s*transparent\s*;/);
assert.match(noteRule, /border:\s*0\s*;/);
assert.match(noteRule, /padding:\s*0\s*;/);
assert.match(noteRule, /font-size:\s*14px\s*;/);

const titles = new Set(), descriptions = new Set(), canonicals = new Set();
let notes = 0, videoCount = 0, schemaCount = 0;
for (const page of pages) {
  const html = read(page);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const tags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const meta = name => {
    const matches = tags.filter(tag => attr(tag, 'property') === name || attr(tag, 'name') === name);
    assert.equal(matches.length, 1, page + ': expected exactly one ' + name);
    return attr(matches[0], 'content');
  };
  const description = meta('description');
  assert.ok(title && !titles.has(title), page + ': missing/duplicate title'); titles.add(title);
  assert.ok(description && !descriptions.has(description), page + ': missing/duplicate description'); descriptions.add(description);
  const canonicalTags = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(tag => attr(tag, 'rel') === 'canonical');
  assert.equal(canonicalTags.length, 1, page + ': canonical count');
  const canonical = attr(canonicalTags[0], 'href');
  const route = page === 'index.html' ? '/' : '/' + page.replace(/\.html$/, '');
  assert.equal(canonical, origin + route, page + ': canonical path');
  assert.ok(!canonicals.has(canonical)); canonicals.add(canonical);
  assert.equal(meta('og:url'), canonical);
  assert.ok(!/noindex|nofollow/i.test(meta('robots')));
  assert.equal(meta('og:image:width'), '1200'); assert.equal(meta('og:image:height'), '630');
  assert.equal(meta('og:image:type'), 'image/jpeg');
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(meta('twitter:image'), meta('og:image'));
  for (const name of ['og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description', 'twitter:image:alt']) assert.ok(meta(name));
  const image = new URL(meta('og:image'));
  assert.equal(image.origin, origin);
  assert.ok(existsSync(join(ROOT, image.pathname.slice(1))), page + ': missing social image');
  assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, page + ': H1 count');
  const schemas = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => JSON.parse(m[1]));
  assert.ok(schemas.length, page + ': missing JSON-LD'); schemaCount += schemas.length;
  if (page.startsWith('work/')) {
    const note = html.match(/<p class="case-evidence-note">[\s\S]*?<\/p>/)?.[0];
    assert.ok(note && /not.*independently audited/i.test(note), page + ': evidence qualification lost'); notes += 1;
  }
  const videos = [...html.matchAll(/<video\b[^>]*>/gi)].map(m => m[0]);
  videoCount += videos.length;
  const mediaRefs = [...html.matchAll(/<script\b[^>]*src="([^"]*\/media\.[a-f0-9]{12}\.js)"[^>]*>/g)];
  assert.equal(mediaRefs.length, videos.length ? 1 : 0, page + ': independent media script count');
  if (videos.length) {
    assert.ok(mediaRefs[0][1].endsWith('/' + mediaName));
    assert.equal([...html.matchAll(/<button\b[^>]*\bdata-media-toggle\b[^>]*>/g)].length, 1, page + ': page-level pause setting');
    assert.ok(!/\bdata-w-bg-video-control\b[^>]*>/i.test(html), page + ': legacy overlay control remains');
  }
  for (const tag of videos) {
    assert.match(tag, /\sdata-autoplay-video(?:\s|>)/i);
    assert.ok(!/\scontrols(?:\s|=|>)/i.test(tag), page + ': native player UI remains');
    assert.ok(!/\sautoplay(?:\s|=|>)/i.test(tag), page + ': playback must pass the system preference guard first');
    assert.match(tag, /\smuted(?:\s|=|>)/i); assert.match(tag, /\splaysinline(?:\s|=|>)/i);
    assert.ok(attr(tag, 'poster')); assert.ok(Number(attr(tag, 'width')) > 0 && Number(attr(tag, 'height')) > 0);
  }
}
assert.equal(notes, 7);
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(new Set(urls), canonicals, 'Sitemap and canonical page coverage differ');
assert.ok(read('robots.txt').includes(origin + '/sitemap.xml'));
console.log(`OK: ${pages.length} SEO pages, ${notes} unboxed notes, ${videoCount} preference-aware videos, ${schemaCount} JSON-LD blocks`);
