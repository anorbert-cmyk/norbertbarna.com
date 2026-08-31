import { createHash } from 'node:crypto';

export const BASE_SHA = 'd75c57d80f0c368e659d365aa716b14be3ac165c';
export const BRANCH = 'codex/ship-editorial-autoplay';
export const NOTE_CSS = `.summary > .case-evidence-note {
  margin-top: 0;
  margin-bottom: clamp(44px, 6vw, 72px);
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--site-muted);
  font-size: 14px;
  line-height: 1.7;
}

.summary > .case-evidence-note > strong:first-child {
  display: block;
  margin-bottom: 10px;
  color: #343a3d;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: .1em;
  text-transform: uppercase;
}`;
export const SWITCH_CSS = `
/* One quiet page-level motion preference; never a play button on the media. */
.site-motion-toggle {
  display: inline-flex;
  min-width: 106px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 10px 8px;
  color: #17191a;
  font: 600 12px/1.4 Inter, sans-serif;
  letter-spacing: .035em;
  cursor: pointer;
}

/* Reserve the exact geometry before JS initializes. No dead no-JS control. */
.site-motion-toggle[hidden] {
  display: inline-flex;
  visibility: hidden;
}

.site-motion-toggle [data-motion-state] {
  min-width: 3ch;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.site-motion-toggle:focus-visible {
  outline: 3px solid var(--site-focus);
  outline-offset: 4px;
}

@media (max-width: 991px) {
  .nav-button-wrap { margin-top: 4px; padding-left: 0; }
  .site-motion-toggle {
    justify-content: flex-start;
    margin-top: 4px;
    padding-inline: 14px;
  }
}
`;
export const VIDEO_CSS = `
/* The Instructure demo is content, not a cropped 500px Webflow background.
 * Keep the same 16:9 composition visible on phones as on desktop. */
.inst-bg-video.mobile {
  display: block;
  width: calc(100% - (2 * var(--site-gutter)));
  max-width: 1200px;
  margin: 0 auto clamp(40px, 6vw, 80px);
}
.inst-bg-video.mobile .container-2 {
  width: 100%;
  max-width: none;
  padding: 0;
}
.inst-bg-video.mobile .background-video {
  position: relative;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--site-radius-md);
  background: #0c1b2e;
}
.inst-bg-video.mobile .background-video > video {
  width: 100%;
  height: 100%;
  margin: 0;
  object-fit: contain;
}
.site-motion-toggle:disabled { cursor: default; }
/* A manual pause receives the same static, readable hover fallback as the OS
 * setting; the legacy html.no-motion * rule must not reveal award backgrounds. */
html.no-motion .awards-bg-video-wrap,
html.no-motion .awards-card::after { opacity: 0 !important; }
html.no-motion .awards-card,
html.no-motion .awards-card:hover { color: #111 !important; }
html.no-motion .awards-card .awards-card-text { color: #606568 !important; }
html.no-motion .awards-card .awards-year { background: #fff !important; color: #111 !important; }
`;
export const SWITCH_HTML = '<button type="button" class="site-motion-toggle" data-motion-toggle hidden role="switch" aria-checked="true" aria-label="Page motion"><span>Motion</span><span data-motion-state aria-hidden="true">On</span></button>';

export function replaceOnce(text, old, replacement, label) {
  const pieces = text.split(old);
  if (pieces.length !== 2) throw new Error(`${label}: expected one matching block; found ${pieces.length - 1}. No files were written.`);
  return pieces[0] + replacement + pieces[1];
}
export function hashAsset(source, stem, extension) {
  return `${stem}.${createHash('sha256').update(source).digest('hex').slice(0,12)}.${extension}`;
}
export function transformCss(source) {
  const rules = [...source.matchAll(/\.summary\s*>\s*\.case-evidence-note\s*\{[^}]+\}/g)];
  if (rules.length !== 1 || !rules[0][0].includes('border-left: 3px solid var(--site-focus)')) {
    throw new Error('The original evidence-note CSS no longer matches. Review instead of overwriting.');
  }
  return source.replace(rules[0][0], NOTE_CSS) + SWITCH_CSS + VIDEO_CSS;
}

export function transformAnimations(source) {
  let result = replaceOnce(source,
    'var reducedMotion = reducedMotionQuery.matches;',
    'var reducedMotion = window.PortfolioMedia ? window.PortfolioMedia.isReduced() : reducedMotionQuery.matches;', 'motion initial preference');
  const begin = result.indexOf('  function syncWebflowVideoControl(');
  const end = result.indexOf('  function focusPageTitle()', begin);
  if (begin < 0 || end < begin || !result.slice(begin,end).includes('function enhanceVideoControls()')) {
    throw new Error('Legacy video-controller boundaries do not match.');
  }
  result = result.slice(0,begin) + '  // Media is owned by the independent media.js controller.\n\n' + result.slice(end);
  result = replaceOnce(result, '  enhanceVideoControls();\n', '', 'remove old initialization');
  result = replaceOnce(result,
    '    reducedMotion = event.matches;\n    if (reducedMotion) enforceReducedMotion();\n    else root.classList.remove("no-motion");',
    `    reducedMotion = window.PortfolioMedia ? window.PortfolioMedia.isReduced() : event.matches;
    if (reducedMotion) {
      enforceReducedMotion();
    } else {
      root.classList.remove("no-motion");
      // Resume only after the same ownership/font checkpoints as initial load.
      if (webflowMotionReady && motionRuntimeReady) {
        webflowMotionReady.then(function () {
          var fonts = document.fonts && document.fonts.ready;
          if (fonts) fonts.then(startResponsiveMotion, startResponsiveMotion);
          else startResponsiveMotion();
        });
      }
    }`, 'runtime preference');
  result = replaceOnce(result,
    '  if (typeof reducedMotionQuery.addEventListener === "function") {',
    `  window.addEventListener("portfolio:motionchange", function (event) {
    handleReducedMotionChange({ matches: event.detail.reduced });
  });

  if (typeof reducedMotionQuery.addEventListener === "function") {`, 'preference bridge');
  result = replaceOnce(result,
    '  function enforceReducedMotion() {\n    reducedMotion = true;',
    '  function enforceReducedMotion() {\n    reducedMotion = true;\n    started = false;', 'motion restart guard');
  result = replaceOnce(result,
    '  if (reducedMotion) {\n    enforceReducedMotion();\n    return;\n  }',
    '  if (reducedMotion) enforceReducedMotion();', 'initial reduced-motion setup');
  result = replaceOnce(result, '  var activeMotionMedia = null;',
    '  var activeMotionMedia = null;\n  var motionRuntimeReady = false;', 'runtime initialization guard');
  result = replaceOnce(result, '  var ScrollTrigger = window.ScrollTrigger;',
    '  var ScrollTrigger = window.ScrollTrigger;\n  motionRuntimeReady = true;', 'runtime guard activation');
  // No reveal, scrolling, image geometry, or refresh logic is otherwise changed.
  return result;
}

function stripAttribute(tag, name) {
  return tag.replace(new RegExp('\\s'+name+'(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s>]+))?(?=\\s|/?>)', 'gi'), '');
}

function protectedFragments(html) {
  html = html.replace(/<(button|a)\b(?=[^>]*\bdata-w-bg-video-control)[^>]*>[\s\S]*?<\/\1>/gi, '');
  return {
    images: html.match(/<img\b[^>]*>/gi) || [],
    notes: html.match(/<p class="case-evidence-note">[\s\S]*?<\/p>/g) || [],
    metadata: html.match(/<meta\b[^>]*>|<title>[\s\S]*?<\/title>|<link\b[^>]*rel="canonical"[^>]*>|<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi) || []
  };
}

export function transformHtml(source, page, versions) {
  const protectedBefore = JSON.stringify(protectedFragments(source));
  let result = source;
  const refs = [...result.matchAll(/assets\/css\/responsive\.[a-f0-9]{12}\.css/g)];
  if (refs.length !== 1) throw new Error(`${page}: expected exactly one responsive release reference`);
  result = result.replace(refs[0][0], `assets/css/${versions.css}`);
  if (page === '404.html') return result;
  result = replaceOnce(result, '<div class="nav-button-wrap"></div>',
    `<div class="nav-button-wrap">${SWITCH_HTML}</div>`, `${page} global motion control`);
  const prefix = page.startsWith('work/') ? '../' : '';
  const navigation = `<script src="${prefix}assets/js/navigation.js"></script>`;
  result = replaceOnce(result, navigation,
    `<script src="${prefix}assets/js/${versions.media}"></script>\n${navigation}`, `${page} media script`);
  const animationRefs = [...result.matchAll(/assets\/js\/animations\.[a-f0-9]{12}\.js/g)];
  if (animationRefs.length !== 1) throw new Error(`${page}: expected exactly one animation release reference`);
  result = result.replace(animationRefs[0][0], `assets/js/${versions.animations}`);

  result = result.replace(/rel="shortcut icon" type="image\/x-icon"/g, 'rel="icon" type="image/png"');
  result = result.replace(/\sdata-autoplay=(?:"false"|'false')/g, '');
  result = result.replace(/<(button|a)\b(?=[^>]*\bdata-w-bg-video-control)[^>]*>[\s\S]*?<\/\1>/gi, '');
  result = result.replace('<div aria-live="polite"></div>', '');
  result = result.replace(/<video\b[^>]*>/gi, (tag) => {
    let video = stripAttribute(stripAttribute(tag, 'controls'), 'autoplay');
    if (!/\sdata-autoplay-video(?:\s|=|>)/.test(video)) video = video.replace('<video', '<video data-autoplay-video');
    for (const name of ['muted','playsinline','loop']) {
      if (!new RegExp('\\s'+name+'(?:\\s|=|>)').test(video)) video = video.replace(/>$/, ` ${name}>`);
    }
    // No eager autoplay attribute: motion preference is checked before playback.
    if (!/\spreload="none"/.test(video)) throw new Error(`${page}: unexpected preload policy`);
    return video;
  });
  if (JSON.stringify(protectedFragments(result)) !== protectedBefore) {
    throw new Error(`${page}: image geometry, qualification text, or SEO metadata changed unexpectedly`);
  }
  return result;
}

export function transformResponsiveChecks(source) {
  let result = replaceOnce(source,
    '    if (/\\sautoplay(?:\\s|=|>)/i.test(video)) fail(`${page}: autoplay video bypasses user control`);',
    '    if (/\\sautoplay(?:\\s|=|>)/i.test(video)) fail(`${page}: raw autoplay must not bypass the motion preference gate`);\n' +
    '    if (!/\\sdata-autoplay-video(?:\\s|=|>)/i.test(video)) fail(`${page}: video is not managed by in-view autoplay`);\n' +
    '    if (/\\scontrols(?:\\s|=|>)/i.test(video)) fail(`${page}: native play controls returned`);', 'static managed-autoplay policy');
  result = replaceOnce(result,
    '!animationJs.includes(\'webflowControl.addEventListener("click"\'))',
    '!animationJs.includes(\'window.addEventListener("portfolio:motionchange"\'))', 'old Webflow-control assertion');
  result = result.replace('independent menu and retained background-video controls are incomplete', 'independent menu and shared motion preference bridge are incomplete');
  const oldSurface = 'if (!/video\\.closest\\("\\.home-about-video"\\)/.test(animationJs)) fail("homepage video control must stay on the media surface");';
  result = replaceOnce(result, oldSurface,
    'if (animationJs.includes("enhanceVideoControls")) fail("the old click-to-play controller returned");', 'remove obsolete media-surface assertion');
  result = replaceOnce(result,
    '!/<video\\b[^>]*\\bcontrols\\b[^>]*aria-label="Kineticare platform walkthrough"/i.test(kineticareHtml)',
    '!/<video\\b[^>]*\\bdata-autoplay-video\\b[^>]*aria-label="Kineticare platform walkthrough"/i.test(kineticareHtml)',
    'walkthrough managed media assertion');
  result = result.replace('content video needs native controls and a text description', 'content video needs managed autoplay and a text description');
  // The obsolete CSS rule is harmless and left in place; existing responsive,
  // native scroll, geometry, metadata, and accessibility assertions are retained.
  return result;
}

export function transformServer(source) {
  let result = replaceOnce(source, '  "/index.html": "/",',
    '  "/index.html": "/",\n  "/favicon.ico": "/assets/icons/68f923d010d274634c966a6e_favicon.png",', 'favicon redirect');
  result = replaceOnce(result, 'js\\/animations\\.', 'js\\/(?:animations|media)\\.', 'immutable media release policy');
  return result;
}
