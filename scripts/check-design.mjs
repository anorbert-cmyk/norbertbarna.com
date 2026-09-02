#!/usr/bin/env node
/**
 * Deterministic checks for design.md.
 * Judgment stays in design.md. These catch mechanical failures that have
 * already been named there.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = readdirSync(join(ROOT, "work"))
  .filter((name) => name.endsWith(".html"))
  .map((name) => name.replace(/\.html$/, ""));

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL: ${message}`);
};

const home = readFileSync(join(ROOT, "index.html"), "utf8");
const works = readFileSync(join(ROOT, "works.html"), "utf8");
const css = readFileSync(join(ROOT, "assets/css/responsive.css"), "utf8");
const design = readFileSync(join(ROOT, "design.md"), "utf8");
const raiffeisen = readFileSync(join(ROOT, "work/raiffeisen.html"), "utf8");
const instructure = readFileSync(join(ROOT, "work/instructure.html"), "utf8");

const titles = (html) =>
  [...html.matchAll(/<a[^>]*class="work-title"[^>]*href="\/work\/([^"]+)"/g)].map((m) => m[1]);

const homeOrder = titles(home);
const worksOrder = titles(works);
const hiring = ["raiffeisen", "instructure", "bitpanda", "benker", "sportsgambit", "kineticare", "onrobot"];

const caseHero = (html) => html.match(/class="case-hero-shot"[^>]*>/)?.[0] || "";

if (home.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] !== "AI Product Design Lead") {
  fail("home H1 must be the role, not only the name");
}
if (!home.includes('class="hero-kicker">Norbert Barna')) {
  fail("home fold must name Norbert Barna in the kicker");
}
if (!/class="hero-work-link"[^>]*href="\/works"/.test(home)) {
  fail("home CTA must go to /works");
}
if (!home.includes('class="hero-proof"') || !/hero-proof[\s\S]{0,1200}insights-feed/.test(home)) {
  fail("home fold must show a complete Instructure Canvas Career screen, not a CoverPoster");
}
if (!/class="hero-proof"[^>]*href="\/work\/instructure"/.test(home)) {
  fail("home-fold proof must link to the Instructure case");
}
if (!home.includes("hero-proof-caption") || !home.includes("Instructure — Canvas Career")) {
  fail("home-fold proof needs a caption that names the shipped product");
}
if (home.indexOf("hero-proof") > home.indexOf("home-banner-outcomes")) {
  fail("EmptyFold: product screen must precede the outcomes list so it can land in the compact fold");
}
if (home.indexOf("hero-work-link") > home.indexOf("hero-proof")) {
  fail("home CTA must sit with the role, before the product screen");
}
if (/hero-proof[\s\S]{0,1200}banking-experience/.test(home)) {
  fail("CoverPoster: home fold still uses the cropped Raiffeisen device cluster");
}
if (JSON.stringify(homeOrder) !== JSON.stringify(hiring.slice(0, 6))) {
  fail(`home selected-work order is ${homeOrder.join(", ")} (must be hiring 1–6 incl. Kineticare)`);
}
if (homeOrder.length < 6) {
  fail("home selected work must include Kineticare (hiring 1–6)");
}
if (JSON.stringify(worksOrder) !== JSON.stringify(hiring)) {
  fail(`/works order is ${worksOrder.join(", ")}`);
}
if (/These aren.t mockups/i.test(works)) fail("/works still has the defensive manifesto");
if (!works.includes("Hungarian product")) fail("Kineticare card must flag the Hungarian product");
if (/The Value Provided|Gain insights through user interviews/i.test(home)) {
  fail("template about copy returned");
}
if (/Professional<br\s*\/?>Experience/.test(home)) fail("Professional experience heading is still jammed");

if (!/Funnel Display/.test(design) || !/\bInter\b/.test(design)) {
  fail("design.md must lock Funnel Display and Inter");
}
if (/AIDecor/.test(design) === false) fail("design.md must name the AIDecor anti-pattern");
if (/YellowDuneSlab/.test(design) === false) fail("design.md must name the YellowDuneSlab anti-pattern");
if (/FlatDuneGrain/.test(design) === false) fail("design.md must name the FlatDuneGrain anti-pattern");
if (/SaaSFooter/.test(design) === false) fail("design.md must name the SaaSFooter anti-pattern");
if (/footer-dunes/.test(design) === false) fail("design.md must document footer-dunes");
if (!/CoverPoster/.test(design) || !/FigmaLeftover/.test(design) || !/TrackedKicker/.test(design)) {
  fail("design.md must name CoverPoster, FigmaLeftover, and TrackedKicker");
}
if (!/InkOnNight/.test(design) || !/MotionCover/.test(design)) {
  fail("design.md must name InkOnNight and MotionCover");
}

if (!/\.home-banner-title[\s\S]{0,160}64px/.test(css)) fail("display size is not locked to 56–64");
if (!/\.case-hero-shot[\s\S]{0,240}object-fit:\s*contain/.test(css)) {
  fail("product crops must use object-fit contain");
}
if (!/\.nav-menu\.w-nav-menu[\s\S]{0,80}background:\s*#fff/.test(css)) {
  fail("mobile menu must be an opaque fill");
}
if (!/\.case-motion-rail[\s\S]{0,40}display:\s*none\s*!important/.test(css)) {
  fail("PROJECT FLOW rail is not hidden");
}
if (!/\.case-toc ol[\s\S]{0,80}flex-wrap:\s*wrap/.test(css)) fail("case TOC must wrap");
if (/\.hero-kicker[\s\S]{0,160}text-transform:\s*uppercase/.test(css)) {
  fail("TrackedKicker: name kicker must not be all-caps tracked");
}
if (!/\.home-banner-content-wrap[\s\S]{0,120}--ink/.test(css)) {
  fail("home outcomes must stay ink on paper after leaving the .black wrap");
}
if (!/\.banner-section\.gambit:not\(\.kineticare-hero\) \.banner-text[\s\S]{0,80}#111/.test(css)) {
  fail("SportsGambit ink dek must not paint Kineticare");
}
if (!/\.kineticare-hero \.banner-text[\s\S]{0,80}#fff/.test(css)) {
  fail("InkOnNight: Kineticare dek must be white on the dark field");
}
if (!/\.case-facts dd[\s\S]{0,80}overflow-wrap:\s*anywhere/.test(css)) {
  fail("MotionCover: fact values must wrap instead of clipping");
}

// Locked header: one sticky white bar, 64/56, 1px #e6e8e9. No Motion control.
if (!/\.navbar\s*\{[\s\S]{0,200}position:\s*sticky/.test(css)) {
  fail("header lock: .navbar must be sticky");
}
if (!/\.navbar\s*\{[\s\S]{0,300}border-bottom:\s*1px solid #e6e8e9/.test(css) ||
    !/\.navbar\s*\{[\s\S]{0,300}background:\s*#fff/.test(css)) {
  fail("header lock: .navbar must be a white bar with a 1px #e6e8e9 border");
}
if (!/\.navbar \.nav-wrap,\s*\.navbar \.nav-wrap\.dark\s*\{[\s\S]{0,120}min-height:\s*64px/.test(css)) {
  fail("header lock: desktop bar height must be 64px");
}
if (!/@media\s*\(max-width:\s*991px\)[\s\S]*?\.navbar \.nav-wrap,\s*\.navbar \.nav-wrap\.dark\s*\{[\s\S]{0,120}min-height:\s*56px/.test(css)) {
  fail("header lock: compact bar height must be 56px");
}
if (/data-motion-toggle/.test(home + works + css) || /site-motion-toggle/.test(home + works)) {
  fail("MotionNav: the Motion control must not appear on home or /works");
}
if (!/\.work-grid[\s\S]{0,200}repeat\(12,\s*minmax\(0,\s*1fr\)\)/.test(css)) {
  fail("work grid must be a 12-column track");
}
if (!/:nth-child\(odd\)[\s\S]{0,80}span 7/.test(css) || !/:nth-child\(even\)[\s\S]{0,80}span 5/.test(css)) {
  fail("work grid must keep the 7/5 rhythm");
}
if (/\.home-work-card-wrap\.top-space[\s\S]{0,80}margin-top:\s*1\d{2}px/.test(css)) {
  fail("StaggerHole: the 140px stagger offset must not return");
}
if (!/--site-readable:\s*720px/.test(css)) {
  fail("body lock: reading measure must be 720px");
}

const raiffeisenHero = caseHero(raiffeisen);
if (!/student/.test(raiffeisenHero) || /banking-experience/.test(raiffeisenHero)) {
  fail("Raiffeisen fold must use complete phone frames (student), not the CoverPoster cluster");
}
const instructureHero = caseHero(instructure);
if (!/insights-feed/.test(instructureHero) || /Data Insights|data-insights/.test(instructureHero)) {
  fail("FigmaLeftover: Instructure fold must not use Data Insights.png");
}
const instMontage = css.match(/\.inst-bg-video\.mobile \.background-video > video\s*\{([^}]+)\}/)?.[1] || "";
if (!/inset:\s*0/.test(instMontage) || !/z-index:\s*0/.test(instMontage) ||
    /inset:\s*-100%/.test(instMontage) || /z-index:\s*-100/.test(instMontage)) {
  fail("HiddenMontage: Instructure video must fill the 16:9 frame (inset 0, z-index 0)");
}

// Locked footer: cool-paper chrome, Email + LinkedIn icon buttons, Work/Contact
// on the navy dune, analog grain. No form, no sitemap, no lavender wash.
const footerPages = ["index.html", "works.html", ...WORK.map((slug) => `work/${slug}.html`)];
const footerCanon = footerPages.map((page) => {
  const html = readFileSync(join(ROOT, page), "utf8");
  const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>") + 9);
  return footer.replaceAll("../assets/", "assets/");
});
if (new Set(footerCanon).size !== 1) {
  fail("site-wide footer markup must match across pages (asset prefix aside)");
}
if (!/\.footer-section[\s\S]{0,400}#f1f3f2/.test(css) && !/--footer-paper:\s*#f1f3f2/.test(css)) {
  fail("footer chrome must be cool paper #f1f3f2, not a dark or lavender band");
}
if (/footer-atmosphere|#d9daf2|#5b45ff/.test(css.slice(css.indexOf(".footer-section"), css.indexOf(".footer-section") + 8000))) {
  fail("footer stylesheet must not restore the lavender atmosphere wash");
}
if (!/#FFE000/.test(css) && !/#ffe000/.test(footerCanon[0]) && !/#FFE000/.test(footerCanon[0])) {
  fail("footer dunes must name the Raiffeisen #FFE000 family");
}
const duneField = css.match(/\.footer-dunes\s*\{[^}]+\}/)?.[0] || "";
if (/background:\s*#FFE000/i.test(duneField)) {
  fail("YellowDuneSlab: dune field must not be a flat #FFE000 band — yellow is a back plate with sampled body");
}
if (/\.footer-dunes-grain/.test(css) || /class="footer-dunes-grain"/.test(footerCanon[0]) || /class="footer-dunes-noise"/.test(footerCanon[0])) {
  fail("FlatDuneGrain: do not put one grain overlay on the whole footer");
}
if (!/sand-grain-1/.test(footerCanon[0]) || !/sand-grain-4/.test(footerCanon[0]) || !/seed="4"/.test(footerCanon[0])) {
  fail("each dune ridge must have its own sand-grain filter seed");
}
if (!/#DCA30C/.test(footerCanon[0]) || !/#05646F/.test(footerCanon[0]) || !/#01112F/.test(footerCanon[0]) || !/#9BA306/.test(footerCanon[0])) {
  fail("dune albedo must use sampled body colors, not flat named fills");
}
if (!/dune-lit-yellow/.test(footerCanon[0]) || !/dune-cast/.test(footerCanon[0])) {
  fail("dune ridges need crest lighting and contact shadows");
}
if (!/\.footer-section a\.footer-contact-link:hover[\s\S]{0,160}background-color:\s*#000/.test(css)) {
  fail("footer icon hover must fill black via background-color (not a delayed shorthand)");
}
for (const page of footerPages) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>") + 9);
  if (!footer.includes("footer-cta") || !footer.includes("footer-dunes") || !footer.includes("data-footer-dunes")) {
    fail(`${page}: locked footer chrome + dunes are missing`);
    continue;
  }
  if (/Product<\/h3>|Company<\/h3>|Resources<\/h3>|Legal<\/h3>/.test(footer) ||
      /instagram|youtube|twitter\.com|\bx\.com\b/i.test(footer)) {
    fail(`SaaSFooter: ${page} must not ship sitemap columns or extra socials`);
  }
  if (/data-contact-form|footer-hp|footer-contact-form/.test(footer)) {
    fail(`${page}: footer must not restore the multi-field email form`);
  }
  if (/AI Product Design Lead|AI Governance|BlackRock|All rights reserved/.test(footer)) {
    fail(`${page}: footer copy is off the lock`);
  }
  if (!footer.includes("Product VP — I lead AI products in regulated finance and high-trust systems.")) {
    fail(`${page}: footer must use the Product VP line`);
  }
  if (!footer.includes("© 2026 Norbert Barna") || /All rights reserved/.test(footer)) {
    fail(`${page}: copyright must be © 2026 Norbert Barna`);
  }
  const iconLinks = [...footer.matchAll(/<a[^>]*class="[^"]*\bfooter-contact-link\b[^"]*"[^>]*>/gi)].map((m) => m[0]);
  if (iconLinks.length !== 2) {
    fail(`${page}: footer needs exactly two icon buttons (Email + LinkedIn)`);
  } else {
    if (!/mailto:anorbert@pm\.me/.test(iconLinks[0])) {
      fail(`${page}: first footer icon must be mailto:anorbert@pm.me`);
    }
    if (!/linkedin\.com\/in\/barna-norbert/.test(iconLinks[1])) {
      fail(`${page}: second footer icon must reuse the site LinkedIn URL`);
    }
  }
  const workHrefs = [...footer.matchAll(/href="(\/work\/[^"]+)"/g)].map((m) => m[1]);
  if (JSON.stringify(workHrefs) !== JSON.stringify([
    "/work/raiffeisen", "/work/instructure", "/work/bitpanda", "/work/kineticare",
  ])) {
    fail(`${page}: Work column must be Raiffeisen, Instructure, Bitpanda, Kineticare (got ${workHrefs.join(", ")})`);
  }
  if (!/#DCA30C/.test(footer) || !/#05646F/.test(footer) || !/#9BA306/.test(footer) || !/#FFE000/.test(footer)) {
    fail(`${page}: dune SVG must keep sampled bodies and the #FFE000 family name`);
  }
  if (!footer.includes("68f9e9de8ed08e31e52c4188_NB.svg")) {
    fail(`${page}: footer must reuse the existing nb wordmark`);
  }
  const mailtos = [...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => m[1]);
  if (mailtos.some((address) => address !== "anorbert@pm.me")) {
    fail(`${page}: only mailto:anorbert@pm.me is allowed (got ${mailtos.join(", ")})`);
  }
  if (html.includes("data-motion-toggle") || html.includes("site-motion-toggle")) {
    fail(`MotionNav: ${page} still renders a Motion control`);
  }
}

for (const slug of WORK) {
  const html = readFileSync(join(ROOT, "work", `${slug}.html`), "utf8");
  const keys = [...html.matchAll(/<dt>([^<]+)<\/dt>/g)].map((m) => m[1]);
  if (JSON.stringify(keys) !== JSON.stringify(["Role", "Focus", "Period", "Delivery"])) {
    fail(`${slug}: fact keys must be Role, Focus, Period, Delivery (got ${keys.join(", ")})`);
  }

  // One sticky bar owns the breadcrumb; the 57px strip under the nav is gone.
  const navbar = html.slice(html.indexOf('class="navbar'), html.indexOf("<main"));
  if (!/class="nav-breadcrumb"[\s\S]*?href="\/works">Works<\/a>/.test(navbar) ||
      !/aria-current="page"/.test(navbar)) {
    fail(`${slug}: header bar must carry the Works / {page} breadcrumb`);
  }
  if (html.includes('class="case-breadcrumb"')) {
    fail(`${slug}: the old breadcrumb strip under the nav must be removed`);
  }
  if (navbar.includes("data-motion-toggle") || html.includes("site-motion-toggle")) {
    fail(`MotionNav: ${slug} still renders a Motion control`);
  }

  // BlogHero: no visible byline anywhere; dates stay in meta and JSON-LD.
  if (html.includes("case-byline") || /Written by/.test(html)) {
    fail(`BlogHero: ${slug} still renders a visible byline`);
  }

  // Case header media: Kineticare is exactly one autoplaying video; every
  // other case shows one complete screenshot in the hero slot.
  const header = html.slice(
    html.indexOf('<header class="case-study-header"'),
    html.indexOf("</header>") + 9
  );
  if (slug === "kineticare") {
    const mediaNodes = [...header.matchAll(/<(?:video|img|picture|iframe)\b/gi)];
    if (mediaNodes.length !== 1 || !/<video[^>]*data-autoplay-video/.test(header)) {
      fail(`kineticare: case header must contain exactly one autoplaying video (found ${mediaNodes.length} media nodes)`);
    }
    if (header.includes("case-hero-media")) {
      fail("kineticare: no hero screenshot next to the header video");
    }
  } else {
    if (!header.includes('class="case-hero-shot"')) fail(`${slug}: case fold has no product crop`);
  }

  // First still after the role section, not thousands of pixels down.
  const summaryStart = html.indexOf('class="summary');
  const summary = html.slice(summaryStart);
  const headings = [...summary.matchAll(/<h2 id="/g)];
  const firstFigure = summary.search(/<figure\b[^>]*w-richtext-figure-type-image/);
  if (headings.length >= 3 && (firstFigure < 0 || firstFigure > headings[2].index)) {
    fail(`${slug}: first body still must land right after the role section`);
  }
}

if (failures) {
  console.error(`\n${failures} design.md check(s) failed`);
  process.exit(1);
}
console.log("OK: design.md hiring-path and anti-pattern checks hold");
