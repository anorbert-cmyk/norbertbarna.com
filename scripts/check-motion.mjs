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
import { SERVICE_PAGES, assetPrefix } from "./service-pages.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_PAGES = readdirSync(join(ROOT, "work"))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => `work/${name}`);
const ANIMATED_PAGES = ["index.html", "works.html", ...WORK_PAGES, ...SERVICE_PAGES];
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

const animationsFile = versionedAsset("assets/js/animations.js", "animations", "js");
const caseMotionFile = versionedAsset("assets/css/case-motion.css", "case-motion", "css");
const responsiveFile = versionedAsset("assets/css/responsive.css", "responsive", "css");

for (const page of ALL_PAGES) {
  const html = uncommented(readFileSync(join(ROOT, page), "utf8"));
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
  const animationRefs = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']*\/animations(?:\.[a-f0-9]+)?\.js)["'][^>]*><\/script>/gi)]
    .map((match) => match[1]);
  const expectedAnimationRef = `${assetPrefix(page)}assets/js/${animationsFile}`;

  if (animationRefs.length !== 1) {
    fail(`${page}: expected one active content-hashed animations script, found ${animationRefs.length}`);
  } else if (animationsFile && animationRefs[0] !== expectedAnimationRef) {
    fail(`${page}: expected ${expectedAnimationRef}, found ${animationRefs[0]}`);
  }

  checkBackToTop(page, html);

  if (page.startsWith("work/")) {
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
