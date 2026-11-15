#!/usr/bin/env node
/**
 * Static regression checks for the shared motion layer.
 *
 * The canonical motion sources stay mutable in the repository, while pages
 * must reference byte-identical, content-hashed release files. The remaining
 * checks protect accessibility and layout stability assumptions that smooth
 * scrolling and ScrollTrigger rely on.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ERROR_PAGES, SERVICE_PAGES, UTILITY_PAGES, assetPrefix, baseOf, HU_PAGES, DE_PAGES, WRITING_PAGES, ENTRY_PAGES } from "./service-pages.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_PAGES = readdirSync(join(ROOT, "work"))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => `work/${name}`);
const ANIMATED_PAGES = ["index.html", "works.html", "about.html", ...WORK_PAGES, ...UTILITY_PAGES, ...HU_PAGES, ...DE_PAGES, ...WRITING_PAGES];
const ALL_PAGES = [...ANIMATED_PAGES, ...ERROR_PAGES];

let failures = 0;
function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function uncommented(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match ? match[2] : "";
}

function hasClass(tag, className) {
  return attribute(tag, "class").split(/\s+/).includes(className);
}

function versionedAsset(sourcePath, stem, extension) {
  const absoluteSource = join(ROOT, sourcePath);
  if (!existsSync(absoluteSource)) {
    fail(`missing canonical motion source: ${sourcePath}`);
    return null;
  }

  const source = readFileSync(absoluteSource);
  const version = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const fileName = `${stem}.${version}.${extension}`;
  const releasePath = join(dirname(absoluteSource), fileName);

  if (!existsSync(releasePath)) {
    fail(`missing content-hashed motion asset: ${join(dirname(sourcePath), fileName)}`);
  } else if (!readFileSync(releasePath).equals(source)) {
    fail(`${join(dirname(sourcePath), fileName)} is not byte-identical to ${sourcePath}`);
  }

  return fileName;
}

function checkBackToTop(page, html) {
  const anchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)]
    .map((match) => match[0])
    .filter((anchor) => hasClass(anchor, "back-to-top-wrap"));

  if (anchors.length !== 0) {
    fail(`${page}: FooterBackToTop: back-to-top must not appear in the footer lock`);
  }
}

function hasStableAspect(image, figure) {
  const width = attribute(image, "width");
  const height = attribute(image, "height");
  if (/^\d+(?:\.\d+)?$/.test(width) && /^\d+(?:\.\d+)?$/.test(height)) return true;

  const imageStyle = attribute(image, "style");
  const figureStyle = attribute(figure.match(/^<figure\b[^>]*>/i)?.[0] || "", "style");
  return /(?:^|;)\s*aspect-ratio\s*:/i.test(imageStyle) ||
    /(?:^|;)\s*aspect-ratio\s*:/i.test(figureStyle);
}

function checkRichTextImages(page, html) {
  const figures = [...html.matchAll(
    /<figure\b[^>]*\bclass=["'][^"']*\brich-text-figure-image\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi
  )].map((match) => match[0]);

  figures.forEach((figure, figureIndex) => {
    const images = [...figure.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
    if (images.length === 0) {
      fail(`${page}: rich-text figure ${figureIndex + 1} has no image`);
      return;
    }
    images.forEach((image) => {
      if (!hasStableAspect(image, figure)) {
        fail(`${page}: rich-text figure ${figureIndex + 1} image lacks width/height or aspect-ratio`);
      }
    });
  });
}

const heroSceneFile = versionedAsset("assets/js/hero-scene.js", "hero-scene", "js");
const homeCompositionCssFile = versionedAsset("assets/css/home-composition.css", "home-composition", "css");
const homeCompositionFile = versionedAsset("assets/js/home-composition.js", "home-composition", "js");
const immersiveNavigationFile = versionedAsset("assets/js/immersive-navigation.js", "immersive-navigation", "js");
const editorialFiles = ["editorial-sections", "compact-navigation", "project-index"].map(stem => ({ stem, file: versionedAsset(`assets/css/${stem}.css`, stem, "css") }));
const arrivalCssFile = versionedAsset("assets/css/arrival.css", "arrival", "css");
const arrivalFile = versionedAsset("assets/js/arrival.js", "arrival", "js");
const caseOpeningCssFile = versionedAsset("assets/css/case-opening.css", "case-opening", "css");
const caseOpeningFile = versionedAsset("assets/js/case-opening.js", "case-opening", "js");
const animationsFile = versionedAsset("assets/js/animations.js", "animations", "js");
const caseMotionFile = versionedAsset("assets/css/case-motion.css", "case-motion", "css");
const responsiveFile = versionedAsset("assets/css/responsive.css", "responsive", "css");
const storyCssFile = versionedAsset("assets/css/story.css", "story", "css");
const storyMotionFile = versionedAsset("assets/js/story-motion.js", "story-motion", "js");
const aiCssFile = versionedAsset("assets/css/ai-integration.css", "ai-integration", "css");
const aiMotionFile = versionedAsset("assets/js/ai-motion.js", "ai-motion", "js");
const physicsFile = versionedAsset("assets/js/physics.js", "physics", "js");

// Parse-time gates (2026-10-07). Each is an inline head script that runs before
// any stylesheet can block it: the arrival pre-curtain gate on the pages that
// run the arrival, and the case-opening pending gate on the cases. Their
// stylesheets fail them open (4 s and 2.9 s), so they may never hide content
// without a bounded release.
const ARRIVAL_GATE = '<script>(function(r){try{var n=performance.getEntriesByType("navigation")[0],f=document.referrer;if(location.hash||n&&n.type==="back_forward"||document.hidden||matchMedia("(prefers-reduced-motion: reduce)").matches||sessionStorage.getItem("nb-arrival-seen-v2")||f&&new URL(f).origin===location.origin)return;r.setAttribute("data-arrival-gate","")}catch(e){}})(document.documentElement)</script>';
const CASE_GATE = '<script>(function(r){try{var n=performance.getEntriesByType("navigation")[0];if(location.hash||n&&n.type==="back_forward"||document.hidden||matchMedia("(prefers-reduced-motion: reduce)").matches)return;r.setAttribute("data-case-opening","pending")}catch(e){}})(document.documentElement)</script>';
{
  const arrivalCss = readFileSync(join(ROOT, "assets/css/arrival.css"), "utf8");
  const openingCss = readFileSync(join(ROOT, "assets/css/case-opening.css"), "utf8");
  if (!/html\[data-arrival-gate\] body::after\s*\{[^}]*animation:\s*arrival-gate-release 0s linear 4s forwards/.test(arrivalCss)) {
    fail("the arrival pre-curtain gate must fail open by itself after four seconds");
  }
  if (!/html\[data-case-opening="pending"\][^{]*\{[^}]*opacity:\s*0;[^}]*animation:\s*case-opening-release 0s linear 2\.9s forwards/.test(openingCss)) {
    fail("the case-opening pending gate must fail open by itself after 2.9 s");
  }
  const caseJs = readFileSync(join(ROOT, "assets/js/case-opening.js"), "utf8");
  if (/window\.gsap|ScrollTrigger/.test(caseJs) || !caseJs.includes("PortfolioPhysics")) {
    fail("the case opening runs on PortfolioPhysics, not GSAP");
  }
}

for (const page of ALL_PAGES) {
  const html = uncommented(readFileSync(join(ROOT, page), "utf8"));
  const storyStyles = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(match => attribute(match[0], "href")).filter(href => /\/story(?:\.[a-f0-9]+)?\.css$/i.test(href));
  const storyScripts = [...html.matchAll(/<script\b[^>]*>/gi)]
    .map(match => attribute(match[0], "src")).filter(src => /\/story-motion(?:\.[a-f0-9]+)?\.js$/i.test(src));
  if (baseOf(page) === "about.html") {
    if (storyStyles.length !== 1 || storyStyles[0] !== `${assetPrefix(page)}assets/css/${storyCssFile}` ||
        storyScripts.length !== 1 || storyScripts[0] !== `${assetPrefix(page)}assets/js/${storyMotionFile}`) {
      fail(`${page}: story CSS and motion JS must each load one current byte-matched asset`);
    }
    const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => attribute(match[0], "src"));
    const storyIndex = scripts.indexOf(`${assetPrefix(page)}assets/js/${storyMotionFile}`);
    if (storyIndex <= scripts.indexOf(`${assetPrefix(page)}assets/js/${animationsFile}`)) {
      fail(`${page}: the independent story owner must initialize after the shared motion layer`);
    }
    if (/<(?:main|body|html)\b[^>]*\binert(?:\s|=|>)/i.test(html)) {
      fail(`${page}: decorative story motion must not make the reading page inert`);
    }
  } else if (storyStyles.length || storyScripts.length) {
    fail(`${page}: the About story owner must not change another route`);
  }
  // The AI service pages carry their own board stylesheet and native-scroll
  // owner, released like the others, loaded after the shared motion layer,
  // and on no other route.
  const aiStyles = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(match => attribute(match[0], "href")).filter(href => /\/ai-integration(?:\.[a-f0-9]+)?\.css$/i.test(href));
  const aiScripts = [...html.matchAll(/<script\b[^>]*>/gi)]
    .map(match => attribute(match[0], "src")).filter(src => /\/ai-motion(?:\.[a-f0-9]+)?\.js$/i.test(src));
  // The German entry page (2026-10-21) stands on the same board as the service pages.
  if (SERVICE_PAGES.includes(page) || ENTRY_PAGES.includes(page)) {
    if (aiStyles.length !== 1 || aiStyles[0] !== `/assets/css/${aiCssFile}` ||
        aiScripts.length !== 1 || aiScripts[0] !== `/assets/js/${aiMotionFile}`) {
      fail(`${page}: the AI service stylesheet and owner must each load one current byte-matched asset`);
    }
    const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => attribute(match[0], "src"));
    if (scripts.indexOf(`/assets/js/${aiMotionFile}`) <= scripts.indexOf(`/assets/js/${animationsFile}`)) {
      fail(`${page}: the AI service owner must initialize after the shared motion layer`);
    }
    if (/<(?:main|body|html)\b[^>]*\binert(?:\s|=|>)/i.test(html)) {
      fail(`${page}: decorative service motion must not make the reading page inert`);
    }
  } else if (aiStyles.length || aiScripts.length || /assets\/images\/ai\//.test(html) || /\bai-page\b/.test(html)) {
    fail(`${page}: the AI service boards belong to the service and entry pages alone`);
  }
  const compositionStyles = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attribute(match[0], "href")).filter((href) => /\/home-composition(?:\.|\/)/.test(href));
  const compositionScripts = [...html.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => attribute(match[0], "src")).filter((src) => /\/home-composition(?:\.|\/)/.test(src));
  if (baseOf(page) === "index.html") {
    if (compositionStyles.length !== 1 || compositionStyles[0] !== `${assetPrefix(page)}assets/css/${homeCompositionCssFile}` ||
        compositionScripts.length !== 1 || compositionScripts[0] !== `${assetPrefix(page)}assets/js/${homeCompositionFile}`) {
      fail("home composition CSS and JS must each load their own current byte-matched asset once");
    }
  } else if (compositionStyles.length || compositionScripts.length) {
    fail(`${page}: the home composition must not change another page's opening`);
  }
  const responsiveRefs = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attribute(match[0], "href"))
    .filter((href) => /\/responsive(?:\.[a-f0-9]+)?\.css$/i.test(href));
  const expectedResponsiveRef = `${assetPrefix(page)}assets/css/${responsiveFile}`;

  if (responsiveRefs.length !== 1) {
    fail(`${page}: expected one active content-hashed responsive stylesheet, found ${responsiveRefs.length}`);
  } else if (responsiveFile && responsiveRefs[0] !== expectedResponsiveRef) {
    fail(`${page}: expected ${expectedResponsiveRef}, found ${responsiveRefs[0]}`);
  }
}

for (const page of ANIMATED_PAGES) {
  const html = uncommented(readFileSync(join(ROOT, page), "utf8"));
  for (const { stem, file } of editorialFiles) {
    const required = stem === "editorial-sections" ? baseOf(page) !== "about.html"
      : stem !== "project-index" || baseOf(page) === "index.html" || baseOf(page) === "works.html";
    const refs = [...html.matchAll(/<link\b[^>]*href="([^"]+)"/g)].map(m => m[1]).filter(href => href.includes(`/assets/css/${stem}.`) || href.startsWith(`${assetPrefix(page)}assets/css/${stem}.`));
    if (required && (refs.length !== 1 || refs[0] !== `${assetPrefix(page)}assets/css/${file}`)) fail(`${page}: expected one current ${stem} stylesheet`);
  }
  const animationRefs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']*\/animations(?:\.[a-f0-9]+)?\.js)["'][^>]*><\/script>/gi)]
    .map((match) => match[1]);
  const expectedAnimationRef = `${assetPrefix(page)}assets/js/${animationsFile}`;

  if (animationRefs.length !== 1) {
    fail(`${page}: expected one active content-hashed animations script, found ${animationRefs.length}`);
  } else if (animationsFile && animationRefs[0] !== expectedAnimationRef) {
    fail(`${page}: expected ${expectedAnimationRef}, found ${animationRefs[0]}`);
  }

  const navigationRefs = [...html.matchAll(/<script\b[^>]*src="([^"]*assets\/js\/immersive-navigation(?:\.[a-f0-9]+)?\.js)"/g)].map(m => m[1]);
  if (navigationRefs.length !== 1 || navigationRefs[0] !== `${assetPrefix(page)}assets/js/${immersiveNavigationFile}`) {
    fail(`${page}: every route needs the current compact-header controller exactly once`);
  }
  const arrivalRefs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']*\/arrival(?:\.[a-f0-9]+)?\.js)["'][^>]*><\/script>/gi)]
    .map((match) => match[1]);
  if (baseOf(page) === "index.html" || baseOf(page).startsWith("work/")) {
    const expectedArrivalRef = `${assetPrefix(page)}assets/js/${arrivalFile}`;
    if (arrivalRefs.length !== 1 || arrivalRefs[0] !== expectedArrivalRef) {
      fail(`${page}: expected one current content-hashed arrival script`);
    }
    const arrivalStyles = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => attribute(match[0], "href"))
      .filter((href) => /\/arrival\./.test(href));
    if (arrivalStyles.length !== 1 || arrivalStyles[0] !== `${assetPrefix(page)}assets/css/${arrivalCssFile}`) {
      fail(`${page}: same-stem arrival CSS and JS must resolve to their own byte-matched asset type`);
    }
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map((match) => match[1]);
    if (scripts.filter((src) => src === `${assetPrefix(page)}assets/js/${immersiveNavigationFile}`).length !== 1) {
      fail(`${page}: expected the current stable utility-header script once`);
    }
    if (baseOf(page) === "index.html") {
      const sceneIndex = scripts.indexOf(`${assetPrefix(page)}assets/js/${heroSceneFile}`);
      const compositionIndex = scripts.indexOf(`${assetPrefix(page)}assets/js/${homeCompositionFile}`);
      const arrivalIndex = scripts.indexOf(`${assetPrefix(page)}assets/js/${arrivalFile}`);
      const motionIndex = scripts.indexOf(`${assetPrefix(page)}assets/js/${animationsFile}`);
      if (sceneIndex < 0 || sceneIndex >= arrivalIndex || arrivalIndex >= motionIndex) {
        fail("home scene readiness must initialize before arrival, followed by shared animation ownership");
      }
      if (compositionIndex <= sceneIndex || compositionIndex >= motionIndex) {
        fail("home morph must connect to the scene before shared animations can claim the same statement");
      }
    }
    if (/<(?:main|body|html)\b[^>]*\binert(?:\s|=|>)/i.test(html)) {
      fail(`${page}: arrival must never leave the native page inert`);
    }
    // The gates run before the first stylesheet, so no paint precedes them.
    const head = html.slice(0, html.indexOf("</head>"));
    const firstStyle = head.search(/<link\b[^>]*rel="stylesheet"|<link\b[^>]*stylesheet/);
    const gates = [ARRIVAL_GATE, ...(baseOf(page).startsWith("work/") ? [CASE_GATE] : [])];
    for (const gate of gates) {
      const at = head.indexOf(gate);
      if (at < 0 || head.indexOf(gate, at + 1) >= 0 || (firstStyle >= 0 && at > firstStyle)) {
        fail(`${page}: expected one parse-time ${gate === CASE_GATE ? "case-opening" : "arrival"} gate before the first stylesheet`);
      }
    }
    // physics.js: one current, deferred head copy, read by the owners after DOMContentLoaded.
    const physicsTags = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]*\/physics(?:\.[a-f0-9]+)?\.js)"[^>]*>/g)];
    if (physicsTags.length !== 1 || physicsTags[0][1] !== `${assetPrefix(page)}assets/js/${physicsFile}` ||
        !/\bdefer\b/.test(physicsTags[0][0]) || html.indexOf(physicsTags[0][0]) > html.indexOf("</head>")) {
      fail(`${page}: expected one current deferred physics.js in the head`);
    }
  } else if (arrivalRefs.length !== 0) {
    fail(`${page}: arrival is scoped to the home and project openings`);
  } else if (html.includes('data-arrival-gate') || html.includes('data-case-opening","pending')) {
    fail(`${page}: the parse-time gates belong to the pages that run the arrival and the case opening`);
  }

  checkBackToTop(page, html);

  if (baseOf(page).startsWith("work/")) {
    const openingStyles = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => attribute(match[0], "href"))
      .filter((href) => /\/case-opening\./.test(href));
    const openingScripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)]
      .map((match) => match[1]).filter((src) => /\/case-opening\./.test(src));
    if (openingStyles.length !== 1 || openingStyles[0] !== `${assetPrefix(page)}assets/css/${caseOpeningCssFile}` ||
        openingScripts.length !== 1 || openingScripts[0] !== `${assetPrefix(page)}assets/js/${caseOpeningFile}`) {
      fail(`${page}: case-opening CSS and JS must each load their own current byte-matched asset once`);
    }
    const caseMotionRefs = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => attribute(match[0], "href"))
      .filter((href) => /\/case-motion(?:\.[a-f0-9]+)?\.css$/i.test(href));
    const expectedCaseMotionRef = `${assetPrefix(page)}assets/css/${caseMotionFile}`;

    if (caseMotionRefs.length !== 1) {
      fail(`${page}: expected one active content-hashed case-motion stylesheet, found ${caseMotionRefs.length}`);
    } else if (caseMotionFile && caseMotionRefs[0] !== expectedCaseMotionRef) {
      fail(`${page}: expected ${expectedCaseMotionRef}, found ${caseMotionRefs[0]}`);
    }

    checkRichTextImages(page, html);
    // The folded corner retired with its GSAP path (2026-10-07); only case-opening.js animates the opening.
    if (/case-opening-fold/.test(html)) {
      fail(`${page}: the retired case-opening fold markup must not return`);
    }
  }
}

// ---- Modern motion model (2026-11-15) ---------------------------------------
// Encodes Chrome's Modern Web Guidance for this site: page-to-page view
// transitions are opted into under no-preference, reduced motion is handled
// per animation instead of by a blanket reset, only compositor or paint
// properties animate, nothing keeps `will-change`, pages stay eligible for the
// back/forward cache, and a looping video carries a Pause control.
{
  const cssDir = join(ROOT, "assets/css");
  const cssSources = readdirSync(cssDir).filter((name) => /\.css$/.test(name) && !/\.[0-9a-f]{12}\.css$/.test(name));
  const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
  const LAYOUT_PROPERTY = /^(?:all|width|height|min-width|max-width|min-height|max-height|top|right|bottom|left|inset(?:-[a-z-]+)?|margin(?:-[a-z-]+)?|padding(?:-[a-z-]+)?|font-size|line-height|letter-spacing|border(?:-[a-z]+)?-width|flex(?:-[a-z]+)?|gap|grid-[a-z-]+)$/;
  const TIME = /^-?(?:\d+\.?\d*|\.\d+)m?s$/;
  const EASING = /^(?:ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end|cubic-bezier\(|linear\(|steps\(|var\()/;
  let viewTransitionOptIns = 0;
  const namedSelectors = [];
  for (const name of cssSources) {
    const css = strip(readFileSync(join(cssDir, name), "utf8"));
    if (/(?:animation|transition)(?:-duration)?\s*:[^;{}]*(?<![\d.])0?\.0\d*m?s\b/.test(css)) {
      fail(`${name}: a near-zero animation or transition duration is the blanket reduced-motion reset; switch the specific animation off instead`);
    }
    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = selector.trim().split(/\s*,\s*(?![^()]*\))/);
      const universal = selectors.some((part) => !/::view-transition/.test(part) && /(?:^|[\s>+~(])\*(?:::?[a-z-]+)?\)?\s*$/.test(part.trim()));
      if (universal && /(?:^|;)\s*(?:animation|transition)(?:-[a-z-]+)?\s*:/.test(body)) {
        fail(`${name}: "${selector.trim().slice(0, 80)}" resets animation or transition for every element; name the animated elements`);
      }
      if (/\bhtml\.no-motion\s+\*\s*$/.test(selector.trim())) {
        fail(`${name}: the blanket html.no-motion * rule must not return`);
      }
      if (/(?:^|;)\s*will-change\s*:/.test(body) && !(name === "arrival.css" && /\.site-arrival__slice\b/.test(selector))) {
        fail(`${name}: "${selector.trim().slice(0, 80)}" keeps will-change permanently; only the arrival curtain, which is removed from the document, may hint`);
      }
      const named = body.match(/(?:^|;)\s*view-transition-name\s*:\s*([^;]+)/);
      if (named && named[1].trim() !== "none") namedSelectors.push(`${name}: ${selector.trim()} = ${named[1].trim()}`);
      for (const [, property, value] of body.matchAll(/(?:^|;)\s*(transition|transition-property)\s*:\s*([^;]+)/g)) {
        if (/^\s*none\b/.test(value)) continue;
        for (const item of value.split(/,(?![^()]*\))/)) {
          const words = item.trim().replace(/!important/, "").split(/\s+(?![^()]*\))/).filter(Boolean);
          const target = property === "transition-property" ? words[0]
            : words.find((word) => !TIME.test(word) && !EASING.test(word) && word !== "allow-discrete" && word !== "normal") || "all";
          if (LAYOUT_PROPERTY.test(target)) {
            fail(`${name}: "${selector.trim().slice(0, 80)}" transitions ${target}, which triggers layout; animate transform, translate, scale, opacity or clip-path`);
          }
        }
      }
    }
    for (const [, keyframes, block] of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)) {
      for (const [, property] of block.matchAll(/(?:\{|;)\s*([a-z-]+)\s*:/g)) {
        if (LAYOUT_PROPERTY.test(property)) fail(`${name}: @keyframes ${keyframes} animates ${property}, which triggers layout`);
      }
    }
    const optIns = [...css.matchAll(/@view-transition\s*\{[^}]*\}/g)];
    viewTransitionOptIns += optIns.length;
    if (optIns.length && name !== "base.css") fail(`${name}: the view-transition opt-in lives in base.css, which every page loads`);
  }
  const baseCss = strip(readFileSync(join(cssDir, "base.css"), "utf8"));
  if (viewTransitionOptIns !== 1 ||
      !/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*@view-transition\s*\{\s*navigation:\s*auto;?\s*\}/.test(baseCss)) {
    fail("base.css must opt into cross-document view transitions once, inside prefers-reduced-motion: no-preference");
  }
  if (namedSelectors.length !== 1 || !/^base\.css: \.navbar = site-nav$/.test(namedSelectors[0])) {
    fail(`exactly one view-transition-name is allowed (.navbar = site-nav in base.css); a duplicate name on a page aborts the transition. Found: ${namedSelectors.join(" | ") || "none"}`);
  }
  if (!/html\[data-arrival-gate\]::view-transition-group\(\*\)[\s\S]{0,400}animation:\s*none/.test(baseCss)) {
    fail("the first-visit arrival curtain must end a view transition at once (html[data-arrival-gate]::view-transition-* { animation: none })");
  }
  if (!/::view-transition-group\(\*\)\s*\{\s*animation-duration:\s*(\d+)ms/.test(baseCss) || Number(RegExp.$1) > 250) {
    fail("the page-to-page cross-fade must stay at or under 250ms");
  }

  const jsDir = join(ROOT, "assets/js");
  for (const name of readdirSync(jsDir).filter((entry) => /\.js$/.test(entry) && !/\.[0-9a-f]{12}\.js$/.test(entry))) {
    const js = readFileSync(join(jsDir, name), "utf8");
    if (/addEventListener\(\s*["'](?:unload|beforeunload)["']|\bon(?:before)?unload\s*=/.test(js)) {
      fail(`${name}: unload and beforeunload handlers make a page ineligible for the back/forward cache; use pagehide`);
    }
    if (/["']will-change["']\s*,\s*["'][^"']|willChange\s*=\s*["'][^"']/.test(js)) {
      fail(`${name}: scripts must not set will-change; the animating engine promotes layers itself`);
    }
  }
  const navigationJs = readFileSync(join(jsDir, "navigation.js"), "utf8");
  if (!/addEventListener\("pageswap"/.test(navigationJs) || !/skipTransition\(\)/.test(navigationJs)) {
    fail("navigation.js must leave navigations to documents without the opt-in (feed, files, admin) plain, from pageswap");
  }
  const mediaJs = readFileSync(join(jsDir, "media.js"), "utf8");
  if (!/data-video-pause/.test(mediaJs) || !/userStopped/.test(mediaJs) || /aria-pressed/.test(mediaJs)) {
    fail("media.js must give every looping video a Pause control whose label names the action (no aria-pressed)");
  }
  const serverJs = readFileSync(join(ROOT, "server.js"), "utf8");
  for (const [index, line] of serverJs.split("\n").entries()) {
    if (!/no-store/.test(line)) continue;
    const context = serverJs.split("\n").slice(Math.max(0, index - 6), index + 1).join("\n");
    if (!/admin|app\.post\(|headersSent|err\b/.test(context)) {
      fail(`server.js:${index + 1}: Cache-Control: no-store on a public document blocks the back/forward cache`);
    }
  }

  const EXPECT_LINK = '<link rel="expect" href="#primary-navigation" blocking="render"/>';
  for (const page of ALL_PAGES) {
    const html = uncommented(readFileSync(join(ROOT, page), "utf8"));
    if (/html\.no-motion\s+\*\s*\{/.test(html)) {
      fail(`${page}: the inline blanket html.no-motion * rule must not return; reduced motion is handled per animation`);
    }
    if (/view-transition-name/.test(html)) {
      fail(`${page}: view-transition names are declared in base.css only`);
    }
    const navbars = [...html.matchAll(/<[a-z]+\b[^>]*\bclass="([^"]*)"/g)].filter((match) => match[1].split(/\s+/).includes("navbar"));
    if (navbars.length !== 1) {
      fail(`${page}: expected one .navbar (the view-transition name site-nav must be unique), found ${navbars.length}`);
    }
    const head = html.slice(0, html.indexOf("</head>"));
    if (head.split(EXPECT_LINK).length !== 2 || (html.match(/\bid="primary-navigation"/g) || []).length !== 1) {
      fail(`${page}: expected one render-blocking hint for #primary-navigation in the head, and that id once in the page`);
    }
  }
}

if (WORK_PAGES.length !== 7) {
  fail(`expected 7 work pages, found ${WORK_PAGES.length}`);
}

if (failures) {
  console.error(`\n${failures} motion check(s) failed`);
  process.exit(1);
}

console.log(`OK: motion invariants hold across ${ANIMATED_PAGES.length} animated pages`);
