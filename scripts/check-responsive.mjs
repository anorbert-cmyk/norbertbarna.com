#!/usr/bin/env node
/**
 * Regression checks for mobile composition, image stability, landmarks,
 * social previews and the reduced-motion/native-scroll contract.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK_PAGES = readdirSync(join(ROOT, "work"))
  .filter((name) => name.endsWith(".html"))
  .sort()
  .map((name) => `work/${name}`);
const CONTENT_PAGES = ["index.html", "works.html", ...WORK_PAGES];
const ALL_PAGES = [...CONTENT_PAGES, "404.html"];
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find(Boolean) || "";
}

for (const page of ALL_PAGES) {
  const html = readFileSync(join(ROOT, page), "utf8");
  if (count(html, /<main\b/gi) !== 1 || count(html, /<\/main>/gi) !== 1) {
    fail(`${page}: expected exactly one main landmark`);
  }
  if (!/<main\b[^>]*\bid="main-content"[^>]*\btabindex="-1"/i.test(html)) {
    fail(`${page}: #main-content is not a programmatic skip-link target`);
  }
  if (page !== "404.html" &&
      (count(html, /<footer\b/gi) !== 1 || count(html, /<\/footer>/gi) !== 1)) {
    fail(`${page}: expected exactly one footer landmark`);
  }
  if (!/name="viewport"[^>]*content="[^"]*viewport-fit=cover/i.test(html) &&
      !/content="[^"]*viewport-fit=cover[^>]*name="viewport"/i.test(html)) {
    fail(`${page}: viewport-fit=cover is missing`);
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const image = match[0];
    for (const name of ["srcset", "sizes", "decoding"]) {
      if (count(image, new RegExp(`\\s${name}=`, "gi")) > 1) {
        fail(`${page}: image has duplicate ${name} attributes`);
      }
    }
    if (/\bclass="[^"]*\bwork-image\b/i.test(image) &&
        (!/^\d+$/.test(attribute(image, "width")) || !/^\d+$/.test(attribute(image, "height")))) {
      fail(`${page}: work image lacks intrinsic dimensions`);
    }
  }

  for (const match of html.matchAll(/<a\b[^>]*\bhref="#"[^>]*>/gi)) {
    if (!/\bclass="[^"]*\bback-to-top-wrap\b/i.test(match[0])) {
      fail(`${page}: non-functional href=# remains outside back-to-top`);
    }
  }

  if (page !== "404.html") {
    const ogImage = html.match(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"/i)?.[1] ||
      html.match(/<meta\b[^>]*content="([^"]+)"[^>]*property="og:image"/i)?.[1];
    if (!ogImage || !ogImage.startsWith("https://www.barnanorbert.com/assets/images/og/")) {
      fail(`${page}: absolute first-party OG image is missing`);
    } else {
      const local = join(ROOT, new URL(ogImage).pathname.slice(1));
      if (!existsSync(local) || statSync(local).size < 20_000) fail(`${page}: OG image is missing or empty`);
    }
    for (const required of ["og:image:alt", "og:image:width", "og:image:height", "twitter:image:alt"]) {
      if (!html.includes(`property="${required}"`)) fail(`${page}: ${required} is missing`);
    }
    if (!/class="menu-button[^"]*"[^>]*aria-controls="primary-navigation"[^>]*aria-expanded="false"/i.test(html)) {
      fail(`${page}: mobile menu control state is incomplete`);
    }
  }

  if (page.startsWith("work/")) {
    if (count(html, /<article\b/gi) !== 1 || count(html, /<\/article>/gi) !== 1) {
      fail(`${page}: case-study content is not one article`);
    }
    const figures = [...html.matchAll(/<figure\b[^>]*\bw-richtext-figure-type-image\b[^>]*>[\s\S]*?<\/figure>/gi)];
    if (!figures.length) fail(`${page}: no rich-text figures found`);
    for (const [index, figureMatch] of figures.entries()) {
      const image = figureMatch[0].match(/<img\b[^>]*>/i)?.[0] || "";
      if (!/^\d+$/.test(attribute(image, "width")) || !/^\d+$/.test(attribute(image, "height"))) {
        fail(`${page}: figure ${index + 1} lacks intrinsic dimensions`);
      }
      if (!attribute(image, "srcset").includes("assets/images/responsive/")) {
        fail(`${page}: figure ${index + 1} lacks generated responsive candidates`);
      }
      if (!attribute(image, "sizes") || attribute(image, "decoding") !== "async") {
        fail(`${page}: figure ${index + 1} lacks responsive loading hints`);
      }
    }
  }
}

const responsiveCss = readFileSync(join(ROOT, "assets/css/responsive.css"), "utf8");
const cssContracts = [
  [/\.summary[\s\S]*?height:\s*auto\s*!important/i, "rich-text images must keep intrinsic ratio"],
  [/@media\s*\(max-width:\s*991px\)/i, "tablet/mobile layout breakpoint is missing"],
  [/@media\s*\(max-width:\s*599px\)/i, "compact mobile layout breakpoint is missing"],
  [/\.work-image-wrap[\s\S]*?aspect-ratio:\s*4\s*\/\s*5/i, "portfolio cover ratio is not reserved"],
  [/:focus-visible/i, "keyboard focus treatment is missing"],
  [/@media\s*\(prefers-reduced-motion:\s*reduce\)/i, "reduced-motion CSS is missing"],
];
for (const [pattern, message] of cssContracts) if (!pattern.test(responsiveCss)) fail(message);

const animationJs = readFileSync(join(ROOT, "assets/js/animations.js"), "utf8");
const reducedIndex = animationJs.indexOf("prefers-reduced-motion: reduce");
const libraryGuardIndex = animationJs.indexOf("typeof window.gsap");
if (reducedIndex < 0 || libraryGuardIndex < 0 || reducedIndex > libraryGuardIndex) {
  fail("reduced-motion detection must run before the GSAP dependency guard");
}
if (!animationJs.includes("min-width: 992px") || !animationJs.includes("pointer: fine")) {
  fail("desktop motion is not isolated from mobile/tablet/coarse pointers");
}
if (!animationJs.includes('window.Webflow.require("ix2")') || !animationJs.includes("ix2.destroy()")) {
  fail("Webflow IX2 is not disabled before GSAP claims motion ownership");
}
if (/new\s+ResizeObserver/i.test(animationJs)) fail("ResizeObserver refresh loop must not return");
if (/smoothTouch/i.test(animationJs)) fail("touch smoothing must remain disabled");

if (failures) {
  console.error(`\n${failures} responsive check(s) failed`);
  process.exit(1);
}

console.log(`OK: responsive, image, accessibility and metadata contracts hold across ${ALL_PAGES.length} pages`);
