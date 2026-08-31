#!/usr/bin/env node
/** Dependency-free checks for media, editorial notes and real social metadata. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'works.html', ...readdirSync(join(root,'work')).filter(f=>f.endsWith('.html')).sort().map(f=>`work/${f}`)];
const origin = 'https://www.barnanorbert.com';

function attrs(tag) {
  const values = new Map();
  const pattern = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const [,name,dq,sq,uq] of tag.matchAll(pattern)) {
    const key = name.toLowerCase();
    assert(!values.has(key), `duplicate attribute ${key}`);
    values.set(key, dq ?? sq ?? uq ?? '');
  }
  return values;
}
function meta(html, key) {
  const matches = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag])=>attrs(tag))
    .filter(a=>(a.get('property') || a.get('name'))===key);
  assert.equal(matches.length,1,`${key} must exist exactly once`);
  return matches[0].get('content');
}
function nodes(value, result=[]) {
  if (!value || typeof value!=='object') return result;
  if (value['@type']) result.push(value);
  for (const child of Object.values(value)) nodes(child,result);
  return result;
}
function jpegDimensions(bytes) {
  assert(bytes[0]===0xff && bytes[1]===0xd8, 'OG file must be a real JPEG');
  let i=2;
  while (i+8<bytes.length) {
    if (bytes[i++]!==0xff) continue;
    while(bytes[i]===0xff) i++;
    const marker=bytes[i++];
    if (marker===0xda || marker===0xd9) break;
    if (marker===0x01 || (marker>=0xd0 && marker<=0xd7)) continue;
    const length=bytes.readUInt16BE(i);
    assert(length>=2 && i+length<=bytes.length, 'invalid JPEG segment');
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { height:bytes.readUInt16BE(i+3),width:bytes.readUInt16BE(i+5) };
    }
    i+=length;
  }
  throw new Error('JPEG dimensions were not found');
}
function release(path, stem, ext) {
  const content=readFileSync(join(root,path));
  const hash=createHash('sha256').update(content).digest('hex').slice(0,12);
  const filename=`${stem}.${hash}.${ext}`;
  assert(readFileSync(join(root,dirname(path),filename)).equals(content), `stale release ${filename}`);
  return filename;
}
const mediaFile=release('assets/js/media.js','media','js');
const cssFile=release('assets/css/responsive.css','responsive','css');
const css=readFileSync(join(root,'assets/css/responsive.css'),'utf8');
const noteRule=css.match(/\.summary\s*>\s*\.case-evidence-note\s*\{([^}]+)\}/)?.[1] || '';
assert(/background:\s*transparent/.test(noteRule),'evidence note must be unboxed');
assert(/border:\s*0\s*;/.test(noteRule) && /padding:\s*0\s*;/.test(noteRule),'evidence note must not have card chrome');
assert(!/border-left/.test(noteRule),'purple note border returned');
assert(!readFileSync(join(root,'assets/js/animations.js'),'utf8').includes('enhanceVideoControls'),'legacy click-to-play owner returned');
const seenTitles=new Set(), seenDescriptions=new Set();
let totalVideos=0;
const report=[];
for (const page of pages) {
  try {
    const html=readFileSync(join(root,page),'utf8');
    const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description=meta(html,'description');
    assert(title && !seenTitles.has(title),'missing/duplicate title');
    assert(description && !seenDescriptions.has(description),'missing/duplicate description');
    seenTitles.add(title); seenDescriptions.add(description);
    const canonical=[...html.matchAll(/<link\b[^>]*>/gi)].map(([tag])=>attrs(tag)).filter(a=>a.get('rel')==='canonical');
    assert.equal(canonical.length,1,'canonical count');
    const expected=origin+(page==='index.html' ? '/' : '/'+page.replace(/\.html$/,''));
    assert.equal(canonical[0].get('href'),expected,'canonical target');
    assert.equal(meta(html,'og:url'),expected,'OG URL');
    assert.equal(meta(html,'og:title'),title,'OG title drift');
    assert.equal(meta(html,'og:description'),description,'OG description drift');
    assert.equal(meta(html,'twitter:title'),title,'Twitter title drift');
    assert.equal(meta(html,'twitter:description'),description,'Twitter description drift');
    assert.equal(meta(html,'twitter:card'),'summary_large_image');
    const image=new URL(meta(html,'og:image'));
    assert.equal(image.origin,origin,'OG image origin');
    assert.equal(meta(html,'twitter:image'),image.href);
    assert(meta(html,'og:image:alt') && meta(html,'twitter:image:alt'),'social alternative text');
    assert.equal(meta(html,'og:image:type'),'image/jpeg');
    const dim=jpegDimensions(readFileSync(join(root,decodeURIComponent(image.pathname))));
    assert.equal(Number(meta(html,'og:image:width')),dim.width,'real OG width differs');
    assert.equal(Number(meta(html,'og:image:height')),dim.height,'real OG height differs');
    assert.equal(dim.width,1200); assert.equal(dim.height,630);
    const blocks=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    assert(blocks.length,'JSON-LD is missing');
    const graph=blocks.flatMap(([,json])=>nodes(JSON.parse(json)));
    const types=graph.flatMap(n=>[].concat(n['@type']));
    assert(types.includes(page==='index.html'?'ProfilePage':page==='works.html'?'CollectionPage':'Article'),'page schema');
    if(page.startsWith('work/')) {
      assert(types.includes('BreadcrumbList'),'breadcrumb schema');
      assert.equal((html.match(/<p class="case-evidence-note">/g)||[]).length,1,'evidence-note count');
    }
    if(page==='work/kineticare.html') assert(types.includes('FAQPage'),'existing FAQ data was lost');
    assert(!/name=["']keywords["']/i.test(html),'meta keywords must not be introduced');
    const switches=[...html.matchAll(/<button\b[^>]*\bdata-motion-toggle\b[^>]*>/g)];
    assert.equal(switches.length,1,'one global motion control is required');
    assert.equal(attrs(switches[0][0]).get('role'),'switch');
    assert.equal(attrs(switches[0][0]).get('aria-label'),'Page motion');
    assert(html.includes(`assets/js/${mediaFile}`),'active media fingerprint is missing');
    assert(html.includes(`assets/css/${cssFile}`),'active CSS fingerprint is missing');
    assert(html.indexOf(`assets/js/${mediaFile}`)<html.indexOf('assets/js/animations.'),'media must initialize before GSAP owner');
    assert(!/<(?:button|a)\b[^>]*\bdata-w-bg-video-control/.test(html),'old Webflow control returned');
    const videos=[...html.matchAll(/<video\b[^>]*>/g)].map(([tag])=>attrs(tag));
    for(const a of videos) {
      assert(a.has('data-autoplay-video'),'unmanaged video');
      assert(!a.has('controls') && !a.has('autoplay'),'raw video bypasses managed behavior');
      assert(a.has('muted') && a.has('playsinline') && a.has('loop'),'inline muted loop attributes');
      assert(Number(a.get('width'))>0 && Number(a.get('height'))>0,'video dimensions');
      assert.equal(a.get('preload'),'none','initial reduced-motion bandwidth guard');
      assert(a.get('poster'),'poster is required');
      assert(existsSync(resolve(root,dirname(page),a.get('poster'))),'poster file does not exist');
    }
    totalVideos+=videos.length;
    report.push({page,videos:videos.length,structuredData:[...new Set(types)],socialImage:`${dim.width}x${dim.height}`});
  } catch(error) { throw new Error(`${page}: ${error.message}`,{cause:error}); }
}
assert(totalVideos>=4,'video inventory unexpectedly shrank');
console.log(JSON.stringify({status:'PASS',pages:report,managedVideos:totalVideos},null,2));
