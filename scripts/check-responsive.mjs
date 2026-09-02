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
const CARD_SIZES = {
  "index.html": "(max-width: 599px) calc(100vw - 32px), (max-width: 799px) calc(46vw - 14px), (max-width: 991px) calc(50vw - 46px), (max-width: 1066px) calc(40vw - 25.6px), (max-width: 1439px) 37.6vw, (max-width: 1829px) 30.08vw, (max-width: 1919px) 550.4px, 516px",
  "works.html": "(max-width: 599px) calc(100vw - 32px), (max-width: 799px) calc(46vw - 14px), (max-width: 991px) calc(50vw - 46px), (max-width: 1066px) calc(48.5vw - 32px), (max-width: 1276px) 45.5vw, (max-width: 1599px) calc(600px - 1.5vw), 576px",
  related: "(max-width: 599px) calc(100vw - 32px), (max-width: 799px) calc(46vw - 14px), (max-width: 991px) calc(50vw - 46px), (max-width: 1066px) calc(50vw - 42px), (max-width: 1276px) calc(47vw - 10px), 590px",
};
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

function hasClass(tag, className) {
  return attribute(tag, "class").split(/\s+/).includes(className);
}

function countTagsByClass(source, tagName, className) {
  return [...source.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi"))]
    .filter((match) => hasClass(match[0], className)).length;
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
    if (/\bclass="[^"]*\bwork-image\b/i.test(image)) {
      const width = Number(attribute(image, "width"));
      const height = Number(attribute(image, "height"));
      const src = attribute(image, "src");
      const srcset = attribute(image, "srcset");
      const expectedSizes = page.startsWith("work/") ? CARD_SIZES.related : CARD_SIZES[page];
      if (width * 5 !== height * 4) fail(`${page}: project cover is not an intrinsic 4:5 crop`);
      if (!/assets\/images\/responsive\/card-[a-z]+\.\d+\.webp$/i.test(src)) {
        fail(`${page}: project cover does not use a dedicated WebP crop`);
      }
      if (attribute(image, "sizes") !== expectedSizes) fail(`${page}: project cover sizes does not match its layout`);
      if (attribute(image, "decoding") !== "async") fail(`${page}: project cover must decode asynchronously`);
      const candidates = srcset.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean);
      if (candidates.length < 3 || candidates.some((candidate) => !/card-[a-z]+\.\d+\.webp$/i.test(candidate))) {
        fail(`${page}: project cover srcset is incomplete`);
      }
      for (const candidate of candidates) {
        const local = join(ROOT, dirname(page), candidate);
        if (!existsSync(local)) fail(`${page}: project cover candidate is missing: ${candidate}`);
      }
    }
  }

  for (const match of html.matchAll(/<video\b[^>]*>/gi)) {
    const video = match[0];
    if (/\sautoplay(?:\s|=|>)/i.test(video)) fail(`${page}: raw autoplay must not bypass the motion preference gate`);
    if (!/\sdata-autoplay-video(?:\s|=|>)/i.test(video)) fail(`${page}: video is not managed by in-view autoplay`);
    if (/\scontrols(?:\s|=|>)/i.test(video)) fail(`${page}: native play controls returned`);
    if (attribute(video, "preload") !== "none") fail(`${page}: video must use preload=none`);
    if (!/^\d+$/.test(attribute(video, "width")) || !/^\d+$/.test(attribute(video, "height"))) {
      fail(`${page}: video lacks intrinsic dimensions`);
    }
    if (!attribute(video, "poster")) fail(`${page}: video poster is missing`);
  }
  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    const source = match[0];
    const src = attribute(source, "src");
    if (/\.mp4$/i.test(src) && attribute(source, "type") !== "video/mp4") fail(`${page}: MP4 source lacks its MIME type`);
    if (/\.webm$/i.test(src) && attribute(source, "type") !== "video/webm") fail(`${page}: WebM source lacks its MIME type`);
  }
  if (/\bdata-autoplay=["']true["']/i.test(html)) fail(`${page}: Webflow video wrapper still autoplays`);

  for (const match of html.matchAll(/<a\b[^>]*\bhref="#"[^>]*>/gi)) {
    fail(`${page}: non-functional href=# remains (back-to-top is not in the lock)`);
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
    for (const required of ["og:image:alt", "og:image:width", "og:image:height"]) {
      if (!html.includes(`property="${required}"`)) fail(`${page}: ${required} is missing`);
    }
    for (const required of ["twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
      if (!html.includes(`name="${required}"`)) fail(`${page}: ${required} is missing`);
    }
    if (/property=["']twitter:/i.test(html)) fail(`${page}: Twitter metadata must use the name attribute`);
    if (!/class="menu-button[^"]*"[^>]*aria-controls="primary-navigation"[^>]*aria-expanded="false"/i.test(html)) {
      fail(`${page}: mobile menu control state is incomplete`);
    }
    if (!/<button\b[^>]*class="[^"]*\bmenu-button\b/i.test(html)) fail(`${page}: menu control is not a native button`);
    if (html.indexOf('<button type="button" class="menu-button') > html.indexOf('<nav id="primary-navigation"')) {
      fail(`${page}: mobile menu links do not follow the trigger in keyboard order`);
    }
    if (!/<noscript>[\s\S]*?\.nav-menu\.w-nav-menu\{display:block!important/i.test(html)) {
      fail(`${page}: no-JavaScript navigation fallback is missing`);
    }
    if (/assets\/js\/(?:jquery|webflow)[^"']*\.js/i.test(html)) {
      fail(`${page}: legacy Webflow or jQuery runtime returned`);
    }
    const navigationScripts = [...html.matchAll(/<script[^>]*src="([^"]*assets\/js\/navigation\.js)"[^>]*><\/script>/gi)];
    if (navigationScripts.length !== 1) {
      fail(`${page}: independent mobile navigation script is missing or duplicated`);
    }
    if (!/class="[^\"]*\bnav-logo-wrap\b[^\"]*"[^>]*aria-label="Norbert Barna — Home"/i.test(html) &&
        !/aria-label="Norbert Barna — Home"[^>]*class="[^\"]*\bnav-logo-wrap\b/i.test(html)) {
      fail(`${page}: logo link needs an explicit Home accessible name`);
    }
    if (!/aria-label="Find me on LinkedIn \(opens in a new tab\)"[^>]*class="[^\"]*\bnav-link\b/i.test(html)) {
      fail(`${page}: external LinkedIn navigation label is incomplete`);
    }
    const emailPill =
      /<a\b[^>]*class="[^"]*\bfooter-email\b[^"]*"[^>]*href="mailto:anorbert@pm\.me"/i.test(html) ||
      /<a\b[^>]*href="mailto:anorbert@pm\.me"[^>]*class="[^"]*\bfooter-email/i.test(html);
    const linkedinIcon =
      /<a\b[^>]*class="[^"]*\bfooter-contact-link\b[^"]*"[^>]*href="https:\/\/www\.linkedin\.com\/in\/barna-norbert\/"/i.test(html);
    if (count(html, /<div\b[^>]*class="[^"]*\bfooter-cta\b[^"]*"/gi) !== 1 ||
        count(html, /<a\b[^>]*class="[^"]*\bfooter-contact-link\b[^"]*"/gi) !== 1 ||
        count(html, /<a\b[^>]*class="[^"]*\bfooter-email\b[^"]*"/gi) !== 1 ||
        !emailPill ||
        !linkedinIcon) {
      fail(`${page}: footer must expose a LinkedIn icon and a labeled Email pill`);
    }

    const cards = countTagsByClass(html, "div", "work-card") + countTagsByClass(html, "div", "related-work-card");
    const cardTitleLinks = countTagsByClass(html, "a", "work-title") + countTagsByClass(html, "a", "related-work-title");
    if (cards !== cardTitleLinks) fail(`${page}: each project card must have exactly one title link`);
    if (/<a\b[^>]*class=["'][^"']*\b(?:work-image-wrap|related-work-image-wrap)\b/i.test(html)) {
      fail(`${page}: project card has a duplicate image link`);
    }
  }

  if (page.startsWith("work/")) {
    if (count(html, /<article\b/gi) !== 1 || count(html, /<\/article>/gi) !== 1) {
      fail(`${page}: case-study content is not one article`);
    }
    const articleStart = html.indexOf("<article");
    const articleEnd = html.indexOf("</article>", articleStart);
    const asideStart = html.indexOf('<aside class="case-related-projects"');
    const mainEnd = html.indexOf("</main>", articleEnd);
    if (articleStart < 0 || articleEnd < 0 || asideStart < articleEnd || asideStart > mainEnd) {
      fail(`${page}: related projects must follow the article inside main`);
    }
    const article = html.slice(articleStart, articleEnd + 10);
    if (count(article, /class="case-toc"/gi) !== 1) {
      fail(`${page}: long-form case study needs on-page navigation`);
    }
    if (count(html, /class="nav-breadcrumb"/gi) !== 1) {
      fail(`${page}: the header bar must carry the breadcrumb`);
    }
    const sectionIds = [...article.matchAll(/<h[23]\b[^>]*\bid="([^"]+)"/gi)].map((match) => match[1]);
    if (sectionIds.length === 0 || new Set(sectionIds).size !== sectionIds.length) {
      fail(`${page}: case-study heading anchors are missing or duplicated`);
    }
    const toc = article.match(/class="case-toc"[\s\S]*?<\/nav>/i)?.[0] || "";
    for (const [, target] of toc.matchAll(/href="#([^"]+)"/gi)) {
      if (!sectionIds.includes(target)) fail(`${page}: on-page navigation target #${target} is missing`);
    }
    if (count(article, /<h1\b/gi) !== 1 || !/class="[^"]*\bcase-evidence-note\b/i.test(article)) {
      fail(`${page}: article needs one H1 and an evidence note`);
    }
    if (count(article, /class="case-facts-section"/gi) !== 1 ||
        count(article, /<dt\b/gi) !== 4 || count(article, /<dd\b/gi) !== 4) {
      fail(`${page}: project facts must expose four labelled scan points`);
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

const homeHtml = readFileSync(join(ROOT, "index.html"), "utf8");
if (/<h2\b[^>]*class="[^"]*\bhome-banner-subtitle\b/i.test(homeHtml)) {
  fail("index.html: hero tagline must not create a second primary section heading");
}
if (!/<h2\b[^>]*class="[^"]*\babout-section-title\b[^>]*>About Norbert Barna<\/h2>/i.test(homeHtml)) {
  fail("index.html: About section needs a descriptive H2");
}
if (!/<h2\b[^>]*class="[^"]*\babout-section-title\b[^>]*>Selected work<\/h2>/i.test(homeHtml) ||
    !/class="[^"]*\bhome-work-footer\b[^"]*"[\s\S]*?href="\/works"/i.test(homeHtml)) {
  fail("index.html: selected work needs a clear heading and all-case-studies action");
}
if (/class="[^"]*\bhome-service-grid\b[^"]*"[^>]*role="list"/i.test(homeHtml)) {
  fail("index.html: the service heading must not be an invalid child of an ARIA list");
}
if (/class="[^"]*\bhome-work-wrap\b[^"]*"[^>]*role="list"/i.test(homeHtml)) {
  fail("index.html: the selected-work CTA must not be an invalid child of an ARIA list");
}
if (!/<ul\b[^>]*class="[^"]*\bhome-banner-outcomes\b/i.test(homeHtml) ||
    !/class="[^"]*\bhero-work-link\b[^"]*"[^>]*href="\/works"/i.test(homeHtml)) {
  fail("index.html: hero outcomes must be a semantic list with a selected-work action");
}
if (/home-banner-details-wrap[^>]*><\/div>[\s\S]{0,80}home-work-divider-line[\s\S]{0,80}home-work-divider-line/i.test(homeHtml)) {
  fail("index.html: empty hero details and duplicate divider must not return");
}
if (!/<p\b[^>]*class="sr-only"[^>]*>Domains include/i.test(homeHtml) ||
    !/<div\b[^>]*aria-hidden="true"[^>]*class="home-about-marquee-area"/i.test(homeHtml)) {
  fail("index.html: animated domain marquee needs one static screen-reader alternative");
}
for (const page of ["index.html", "works.html"]) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const cards = countTagsByClass(html, "div", "work-card");
  const summaries = countTagsByClass(html, "p", "work-card-summary");
  if (cards !== summaries) fail(`${page}: every primary project card needs a visible scope summary`);
}

const kineticareHtml = readFileSync(join(ROOT, "work/kineticare.html"), "utf8");
if (!/<video\b[^>]*\bdata-autoplay-video\b[^>]*aria-label="Kineticare platform walkthrough"/i.test(kineticareHtml) ||
    !/<details\b[^>]*class="kineticare-video-description"[\s\S]*?<summary>Walkthrough description<\/summary>/i.test(kineticareHtml)) {
  fail("work/kineticare.html: content video needs managed autoplay and a text description");
}

const responsiveCss = readFileSync(join(ROOT, "assets/css/responsive.css"), "utf8");
const cssContracts = [
  [/\.summary[\s\S]*?height:\s*auto\s*!important/i, "rich-text images must keep intrinsic ratio"],
  [/@media\s*\(max-width:\s*991px\)/i, "tablet/mobile layout breakpoint is missing"],
  [/@media\s*\(max-width:\s*599px\)/i, "compact mobile layout breakpoint is missing"],
  [/\.work-image-wrap[\s\S]*?aspect-ratio:\s*4\s*\/\s*5/i, "portfolio cover ratio is not reserved"],
  [/\.home-about-video[\s\S]*?aspect-ratio:\s*16\s*\/\s*9/i, "homepage video ratio is not reserved"],
  [/\.kineticare-browser-frame video[\s\S]*?aspect-ratio:\s*16\s*\/\s*9/i, "Kineticare video ratio is not reserved"],
  [/\.summary \.kineticare-video-caption[\s\S]*?color:\s*#d8e2ec/i, "Kineticare video caption contrast is not guaranteed"],
  [/\.case-facts[\s\S]*?grid-template-columns:\s*repeat\(4/i, "desktop project facts grid is missing"],
  [/@media\s*\(max-width:\s*599px\)[\s\S]*?\.case-facts\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/i, "mobile project facts grid is missing"],
  [/\.case-toc ol[\s\S]*?scrollbar-width:\s*thin/i, "mobile case navigation has no visible scroll affordance"],
  [/\.footer-contact-link[\s\S]*?min-height:\s*32px/i, "footer LinkedIn icon is missing its compact lock size"],
  [/\.footer-email[\s\S]*?min-height:\s*44px/i, "footer Email pill is not touch-safe"],
  [/\.footer-section[\s\S]*?min-height:/i, "footer mesh field must reserve height"],
  [/\.footer-contact-link[\s\S]*?border-radius:\s*8px/i, "footer LinkedIn must be a compact rounded square, not a 44px hit-square"],
  [/\.work-title::after[\s\S]*?inset:\s*0/i, "project title link does not own the full card hit area"],
  [/\.dark-button\s*\{[\s\S]*?background:\s*#000;[\s\S]*?color:\s*#fff;/i, "primary dark button contrast is not guaranteed"],
  [/\.summary\s*>\s*\.case-evidence-note/i, "case-study evidence note styling is missing"],
  [/\.navbar\s*\{[\s\S]{0,200}position:\s*sticky/i, "sticky header bar rule is missing"],
  [/\.banner-section\.gambit:not\(\.kineticare-hero\) \.banner-text/i, "Kineticare must not inherit SportsGambit ink dek"],
  [/\.kineticare-hero \.banner-text[\s\S]{0,80}#fff/i, "Kineticare dek contrast is not guaranteed"],
  [/\.case-facts dd[\s\S]*?overflow-wrap:\s*anywhere/i, "project fact values must wrap on compact viewports"],
  [/\.work-card \.work-title-line[\s\S]*?width:\s*100%\s*!important/i, "project underline geometry is unstable"],
  [/:focus-visible/i, "keyboard focus treatment is missing"],
  [/@media\s*\(prefers-reduced-motion:\s*reduce\)/i, "reduced-motion CSS is missing"],
];
for (const [pattern, message] of cssContracts) if (!pattern.test(responsiveCss)) fail(message);

const animationJs = readFileSync(join(ROOT, "assets/js/animations.js"), "utf8");
const navigationJs = readFileSync(join(ROOT, "assets/js/navigation.js"), "utf8");
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
if (!animationJs.includes("window.Webflow.push") || !animationJs.includes("scheduleWebflowMotionTakeover")) {
  fail("GSAP must wait for and then deterministically take over Webflow motion");
}
if (!navigationJs.includes('primaryNavigation.setAttribute("data-nav-menu-open", "")') ||
    !navigationJs.includes('event.key !== "Escape"') ||
    !animationJs.includes('window.addEventListener("portfolio:motionchange"')) {
  fail("independent menu and shared motion preference bridge are incomplete");
}
const takeoverIndex = animationJs.indexOf("var webflowMotionReady = scheduleWebflowMotionTakeover()");
const startIndex = animationJs.indexOf("function startResponsiveMotion()");
const readyClassIndex = animationJs.indexOf('root.classList.add("gsap-ready")', startIndex);
if (takeoverIndex < 0 || startIndex < takeoverIndex || readyClassIndex < startIndex) {
  fail("gsap-ready must only be applied inside motion start after Webflow takeover");
}
if (/setTimeout\([^)]*900/i.test(animationJs)) fail("900ms font fallback must not return");
if (/querySelectorAll\([^)]*["']img\[loading=["']lazy/i.test(animationJs)) {
  fail("lazy images must not trigger global ScrollTrigger refreshes");
}
const sportsGambit = readFileSync(join(ROOT, "work/sportsgambit.html"), "utf8");
if (/(?:win more bets|effortless, one-tap|high-probability|security and transparency of the blockchain|35% of new users|70% of all wagers)/i.test(sportsGambit)) {
  fail("SportsGambit contains overclaiming or unsafe decision-design language");
}
if (/new\s+ResizeObserver/i.test(animationJs)) fail("ResizeObserver refresh loop must not return");
if (/smoothTouch/i.test(animationJs)) fail("touch smoothing must remain disabled");
if (/new\s+(?:window\.)?Lenis\b/i.test(animationJs)) fail("custom smooth scrolling must not override native scroll state");
if (!animationJs.includes('reducedMotionQuery.addEventListener("change"') ||
    !animationJs.includes("enforceReducedMotion") ||
    !animationJs.includes("window.ScrollTrigger.getAll()") ||
    !animationJs.includes("function initFooterDunes()")) {
  fail("runtime reduced-motion changes must stop active motion and media (mesh footer stays still)");
}
if (/html:not\(\.nav-enhanced\)/i.test(responsiveCss)) fail("pre-enhancement navigation must not cause layout shift");
if (animationJs.includes("enhanceVideoControls")) fail("the old click-to-play controller returned");
if (!/@media\s*\(max-width:\s*599px\)[\s\S]*?\.motion-video-toggle[\s\S]*?top:\s*12px\s*!important;[\s\S]*?bottom:\s*auto\s*!important;/i.test(responsiveCss)) {
  fail("mobile video control must not be stretched by simultaneous top and bottom offsets");
}

if (failures) {
  console.error(`\n${failures} responsive check(s) failed`);
  process.exit(1);
}

console.log(`OK: responsive, image, accessibility and metadata contracts hold across ${ALL_PAGES.length} pages`);
