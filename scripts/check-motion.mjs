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
import { UTILITY_PAGES, assetPrefix } from "./service-pages.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_PAGES = readdirSync(join(ROOT, "work"))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => `work/${name}`);
const ANIMATED_PAGES = ["index.html", "works.html", ...WORK_PAGES, ...UTILITY_PAGES];
const ALL_PAGES = [...ANIMATED_PAGES, "404.html"];

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

function hasAccessibleName(anchor, html) {
  if (attribute(anchor, "aria-label").trim() || attribute(anchor, "title").trim()) return true;

  const labelledBy = attribute(anchor, "aria-labelledby").trim();
  if (labelledBy) {
    const labelsExist = labelledBy.split(/\s+/).every((id) => {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const labelledElement = html.match(
        new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*\\bid=["']${escaped}["'])[^>]*>([\\s\\S]*?)<\\/\\1>`, "i")
      );
      return labelledElement && labelledElement[2].replace(/<[^>]*>/g, "").trim();
    });
    if (labelsExist) return true;
  }

  const content = anchor.replace(/^<a\b[^>]*>|<\/a>$/gi, "");
  const text = content.replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;/gi, " ").trim();
  if (text) return true;

  return [...content.matchAll(/<img\b[^>]*>/gi)]
    .some((match) => attribute(match[0], "alt").trim());
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
    /<figure\b[^>]*\bclass=["'][^"']*\bw-richtext-figure-type-image\b[^"']*["'][^>]*>[\s\S]*?<\/figure>/gi
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

for (const page of ALL_PAGES) {
  const html = uncommented(readFileSync(join(ROOT, page), "utf8"));
  const compositionStyles = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attribute(match[0], "href")).filter((href) => /\/home-composition(?:\.|\/)/.test(href));
  const compositionScripts = [...html.matchAll(/<script\b[^>]*>/gi)]
    .map((match) => attribute(match[0], "src")).filter((src) => /\/home-composition(?:\.|\/)/.test(src));
  if (page === "index.html") {
    if (compositionStyles.length !== 1 || compositionStyles[0] !== `assets/css/${homeCompositionCssFile}` ||
        compositionScripts.length !== 1 || compositionScripts[0] !== `assets/js/${homeCompositionFile}`) {
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
    const required = stem !== "project-index" || page === "index.html" || page === "works.html";
    const refs = [...html.matchAll(/<link\b[^>]*href="([^"]+)"/g)].map(m => m[1]).filter(href => href.includes(`/assets/css/${stem}.`) || href.startsWith(`assets/css/${stem}.`));
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
  if (page === "index.html" || page.startsWith("work/")) {
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
      fail(`${page}: expected the current utility-header journey script once`);
    }
    if (page === "index.html") {
      const sceneIndex = scripts.indexOf(`assets/js/${heroSceneFile}`);
      const compositionIndex = scripts.indexOf(`assets/js/${homeCompositionFile}`);
      const arrivalIndex = scripts.indexOf(`assets/js/${arrivalFile}`);
      const motionIndex = scripts.indexOf(`assets/js/${animationsFile}`);
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
  } else if (arrivalRefs.length !== 0) {
    fail(`${page}: arrival is scoped to the home and project openings`);
  }

  checkBackToTop(page, html);

  if (page.startsWith("work/")) {
    const openingStyles = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => attribute(match[0], "href"))
      .filter((href) => /\/case-opening\./.test(href));
    const openingScripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)]
      .map((match) => match[1]).filter((src) => /\/case-opening\./.test(src));
    if (openingStyles.length !== 1 || openingStyles[0] !== `../assets/css/${caseOpeningCssFile}` ||
        openingScripts.length !== 1 || openingScripts[0] !== `../assets/js/${caseOpeningFile}`) {
      fail(`${page}: case-opening CSS and JS must each load their own current byte-matched asset once`);
    }
    const caseMotionRefs = [...html.matchAll(/<link\b[^>]*>/gi)]
      .map((match) => attribute(match[0], "href"))
      .filter((href) => /\/case-motion(?:\.[a-f0-9]+)?\.css$/i.test(href));
    const expectedCaseMotionRef = `../assets/css/${caseMotionFile}`;

    if (caseMotionRefs.length !== 1) {
      fail(`${page}: expected one active content-hashed case-motion stylesheet, found ${caseMotionRefs.length}`);
    } else if (caseMotionFile && caseMotionRefs[0] !== expectedCaseMotionRef) {
      fail(`${page}: expected ${expectedCaseMotionRef}, found ${caseMotionRefs[0]}`);
    }

    checkRichTextImages(page, html);
    if (!/class="case-opening-fold"[^>]*aria-hidden="true"/.test(html)) {
      fail(`${page}: case opening fold must be decorative and hidden from assistive technology`);
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
