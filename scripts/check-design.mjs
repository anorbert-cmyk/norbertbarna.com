#!/usr/bin/env node
/**
 * Deterministic checks for design.md.
 * Judgment stays in design.md. These catch mechanical failures that have
 * already been named there.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVACY_PAGES, SERVICE_PAGES, UTILITY_PAGES } from "./service-pages.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = readdirSync(join(ROOT, "work"))
  .filter((name) => name.endsWith(".html"))
  .map((name) => name.replace(/\.html$/, ""));

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`FAIL: ${message}`);
};
const PROJECT_CONTACT = {
  en: { label: "Discuss your project", title: "Opens your email app to discuss your project" },
  hu: { label: "Beszéljünk a projektedről", title: "Megnyitja a leveleződet, hogy a projektedről írhass." },
};
const HOME_CONTACT = {
  label: "Email",
  accessibleName: "Email — discuss a project",
  title: "Opens your email app to discuss your project",
};
const contactButtons = (html) => [...html.matchAll(/(<button\b[^>]*class="[^"]*\bfooter-email\b[^"]*"[^>]*>)([\s\S]*?)<\/button>/g)];
function checkProjectContact(html, scope, language = "en") {
  const buttons = contactButtons(html);
  const copy = PROJECT_CONTACT[language];
  if (buttons.length !== 1) {
    fail(`${scope}: expected one native project-contact button (got ${buttons.length})`);
    return;
  }
  const [, tag, text] = buttons[0];
  if (!/\btype="button"/.test(tag) || /\bhref=/.test(tag)) {
    fail(`${scope}: project contact must remain a type=button with no href`);
  }
  if (text.trim() !== copy.label || !tag.includes(`title="${copy.title}"`)) {
    fail(`${scope}: project contact must say “${copy.label}” and explain that it opens the email app`);
  }
  if (language === "hu" && !/\blang="hu"/.test(tag)) {
    fail(`${scope}: the Hungarian project-contact button must declare lang=hu`);
  }
}

const home = readFileSync(join(ROOT, "index.html"), "utf8");
const works = readFileSync(join(ROOT, "works.html"), "utf8");
const css = readFileSync(join(ROOT, "assets/css/responsive.css"), "utf8");
const editorialCss = readFileSync(join(ROOT, "assets/css/editorial-sections.css"), "utf8");
const story = readFileSync(join(ROOT, "about.html"), "utf8");
const storyCss = readFileSync(join(ROOT, "assets/css/story.css"), "utf8");
const projectCss = readFileSync(join(ROOT, "assets/css/project-index.css"), "utf8");
const design = readFileSync(join(ROOT, "design.md"), "utf8");
const raiffeisen = readFileSync(join(ROOT, "work/raiffeisen.html"), "utf8");
const instructure = readFileSync(join(ROOT, "work/instructure.html"), "utf8");

const titles = (html) =>
  [...html.matchAll(/<a[^>]*class="work-title"[^>]*href="\/work\/([^"]+)"/g)].map((m) => m[1]);

const homeOrder = titles(home);
const worksOrder = titles(works);
const hiring = ["raiffeisen", "instructure", "bitpanda", "benker", "sportsgambit", "kineticare", "onrobot"];

const caseHero = (html) => html.match(/class="case-hero-shot"[^>]*>/)?.[0] || "";

if (home.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() !== "Product VP") {
  fail("home H1 must be Product VP, not the name and not Design Lead");
}
if ((home.match(/<h1\b/g) || []).length !== 1) {
  fail("home must keep exactly one H1");
}
// The removed solicitation must not return as visible copy, metadata,
// a hidden DOM node, an HTML comment or structured data.
if (/open for engagements|open to client engagements|I[’']m open for enterprise/i.test(home)) {
  fail("home must not restore the removed company-solicitation copy, including hidden source text");
}
if (!home.includes('class="hero-kicker">Norbert Barna')) {
  fail("home fold must name Norbert Barna in the kicker");
}
if (!/class="hero-work-link"[^>]*href="\/works"/.test(home)) {
  fail("home CTA must go to /works");
}
const homeMast = home.slice(
  home.indexOf('<header class="home-banner-section"'),
  home.indexOf("</header>") + "</header>".length
);
// Protect the original scene's semantics and fallback. Browser checks verify
// the rendered letter stage, interactions and contrast.
if (!/class="home-mast-sculpture"[^>]*aria-hidden="true"/.test(homeMast) ||
    !/class="home-mast-canvas"/.test(homeMast) || !/class="home-mast-fallback"/.test(homeMast)) {
  fail("home opening must include a decorative WebGL scene and its SVG fallback outside the reading content");
}
if (/hero-proof|insights-feed|Canvas Career|hero-proof-caption/.test(homeMast)) {
  fail("CanvasFold: homepage header must not ship a product screenshot");
}
if ([...homeMast.matchAll(/<img\b[^>]*src="([^"]+)"/g)].some((match) => !/(?:NB|hero-lettering|hero-chevron|hero-gate)\.svg$/.test(match[1]))) {
  fail("homepage opening artwork may only use original lettering/sculpture SVGs, never generated product evidence");
}
if (/footer-col-title">Work|footer-copyright|© 2026 Norbert Barna/.test(homeMast)) {
  fail("home mast is not a footer clone: no Work column or copyright");
}
if (/home-banner-outcomes/.test(home) === false) {
  fail("home fold must keep the selected-experience rail");
}
if (/4M\+|Redesigning banking for/.test(home)) {
  fail("do not replace live work copy with invented mock one-liners");
}
const homeNav = home.slice(home.indexOf('class="navbar'), home.indexOf("<main"));
if (!/class="nav-link[^"]*"[^>]*href="\/works">Works<\/a>/.test(homeNav)) {
  fail("home top bar must keep the Works text link");
}
if (!/class="footer-contact-link"/.test(homeNav) || !/linkedin\.com\/in\/barna-norbert/.test(homeNav)) {
  fail("home top bar must keep the LinkedIn destination");
}
const homeContact = contactButtons(homeNav);
if (homeContact.length !== 1 || homeContact[0][2].trim() !== HOME_CONTACT.label ||
    !/\btype="button"/.test(homeContact[0][1]) || /\bhref=/.test(homeContact[0][1]) ||
    !homeContact[0][1].includes(`aria-label="${HOME_CONTACT.accessibleName}"`) ||
    !homeContact[0][1].includes(`title="${HOME_CONTACT.title}"`)) {
  fail("home top bar: Email must stay a native, securely assembled project-contact action");
}
if (/href="[^"]*mailto:/.test(homeNav) || /anorbert@pm\.me/.test(homeNav)) {
  fail("MailtoInHtml: home Email must not expose mailto or the address");
}
if (!/class="home-nav-monogram"[^>]*>NB<\/span>/.test(homeNav) ||
    !/class="home-nav-label">LinkedIn<\/span>/.test(homeNav)) {
  fail("home top bar must use the NB / Works / LinkedIn / Email text treatment");
}
if (!/body\.home \.navbar \.nav-logo-wrap[\s\S]{0,200}min-width:\s*44px[\s\S]{0,80}min-height:\s*44px/.test(css)) {
  fail("home NB monogram hit-area must stay at least 44×44");
}
if (!/class="home-mast-proof-chips"/.test(homeMast) ||
    !/Multi-country banking/.test(homeMast) || !/Enterprise EdTech AI/.test(homeMast)) {
  fail("home mast must keep the two truthful screenshot-directed proof chips");
}
for (const employer of ["BlackRock", "Instructure", "Raiffeisen", "Bitpanda", "Balabit"]) {
  if (!new RegExp(`home-highlight-company[^>]*>${employer}<`).test(homeMast)) {
    fail(`home mast experience rail is missing ${employer}`);
  }
}
if (/\$52M\+|1\.8\s*(?:→|-&gt;)\s*4\.8|VERSION B/i.test(homeMast)) {
  fail("home mast must not copy unsupported numbers or design annotations from the reference image");
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
const worksLd = works.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
if (worksLd) {
  const items = JSON.parse(worksLd).mainEntity?.itemListElement || [];
  const ldOrder = [...items].sort((a, b) => a.position - b.position).map((item) =>
    String(item.url || "").replace("https://www.barnanorbert.com/work/", "")
  );
  if (JSON.stringify(ldOrder) !== JSON.stringify(hiring)) {
    fail(`DualIndex: /works JSON-LD ItemList is ${ldOrder.join(", ")}`);
  }
}
// The corridor stands the chevron as a still, never the flat gate and never a
// second live scene: the owner asked for the object's shape there, then asked
// for the moving object to be left out. The home hero is the only running scene.
{
  const about = readFileSync(join(ROOT, "about.html"), "utf8");
  if (/class="story-sculpture"[^>]*hero-(?:final|gate)/.test(about)) {
    fail("/about must stand the chevron in its corridor, not the flat gate");
  }
  if (/data-glass-|hero-scene\.js|story-sculpture-canvas/.test(about)) {
    fail("/about must stand a still, not run the live scene");
  }
  const scene = readFileSync(join(ROOT, "assets/js/hero-scene.js"), "utf8");
  if (/home-mast/.test(scene)) {
    fail("hero-scene.js must not reach for one stage's class names");
  }
  const others = [
    "works.html", "privacy.html", "ai-integration.html",
    "hu/ai-integracio.html", "hu/adatvedelem.html",
    ...WORK.map((slug) => `work/${slug}.html`),
  ];
  for (const page of others) {
    if (/page-chevron-mark|story-sculpture/.test(readFileSync(join(ROOT, page), "utf8"))) {
      fail(`${page}: the corridor sculpture belongs to Story in Motion alone`);
    }
  }
}
if (!/"jobTitle": "Product VP"/.test(home)) {
  fail("JobTitleDrift: home JSON-LD jobTitle must match the footer Product VP line");
}
const homeLdRaw = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
let homeLd;
try {
  homeLd = JSON.parse(homeLdRaw);
} catch {
  homeLd = null;
  fail("home JSON-LD must parse");
}
if (homeLd?.["@type"] !== "ProfilePage" || homeLd?.name !== "Norbert Barna — Product VP") {
  fail("JobTitleDrift: ProfilePage name must be Norbert Barna — Product VP");
}
if (homeLd?.mainEntity?.["@type"] !== "Person" || homeLd?.mainEntity?.name !== "Norbert Barna") {
  fail("JobTitleDrift: Person name must be Norbert Barna, not a job title");
}
if (homeLd?.mainEntity?.image !== "https://www.barnanorbert.com/assets/images/og/norbert-barna.jpg") {
  fail("PersonImageMissing: home Person image must be the existing OG portrait");
}
const homeServices = home.match(/<section\b[^>]*class="home-service-section\b[^>]*>[\s\S]*?<\/section>/)?.[0] || "";
if (!homeServices || /footer-email|hero-work-link|footer-cta|linkedin\.com/.test(homeServices)) {
  fail("home services must remain a professional overview without the removed engagement actions");
}
if (contactButtons(home).length !== 2) {
  fail("home keeps project contact only in the navigation and footer");
}
const homeHead = home.slice(0, home.indexOf("</head>"));
if (/AI Product Design Lead|product design lead/i.test(homeHead)) {
  fail("JobTitleDrift: home title, meta and JSON-LD must not say Design Lead");
}
if (works.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() !== "Selected work") {
  fail("TitleDrift: /works H1 must be Selected work");
}
const llms = readFileSync(join(ROOT, "llms.txt"), "utf8");
const llmsOpener = llms.split("\n").slice(0, 6).join("\n");
if (!/Product VP/.test(llmsOpener) || /product design leader/i.test(llmsOpener)) {
  fail("llms.txt opener must lead with Product VP, not product design leader");
}
if (/These aren.t mockups/i.test(works)) fail("/works still has the defensive manifesto");
if (!works.includes("Hungarian product")) fail("Kineticare card must flag the Hungarian product");
if ((works.match(/class="work-card-summary"/g) || []).length !== 7) fail("Every Works row needs its factual project summary");
if (/Alexandra|1\.500,00 EUR|1,8→4\.8|\$52M/i.test(works)) {
  fail("FakePII: /works must not invent balances, names, or metrics");
}
if (!/landscape row composition/.test(design) || !/Editorial footer/.test(design)) fail("design.md must document the user-selected editorial list and footer");
if (/RowClearfixHole/.test(design) === false) {
  fail("design.md must name the RowClearfixHole anti-pattern");
}
if (/The Value Provided|Gain insights through user interviews/i.test(home)) {
  fail("template about copy returned");
}
if (/Professional<br\s*\/?>Experience/.test(home)) fail("Professional experience heading is still jammed");

if (!/Funnel Display/.test(design) || !/\bInter\b/.test(design)) {
  fail("design.md must lock Funnel Display and Inter");
}
if (/AIDecor/.test(design) === false) fail("design.md must name the AIDecor anti-pattern");
if (/EmptyFold/.test(design) === false) fail("design.md must name the EmptyFold anti-pattern");
if (/CroppedProduct/.test(design) === false) fail("design.md must name the CroppedProduct anti-pattern");
if (/TemplateVoice/.test(design) === false) fail("design.md must name the TemplateVoice anti-pattern");
if (/HeadlineDrift/.test(design) === false) fail("design.md must name the HeadlineDrift anti-pattern");
if (/ClippedChip/.test(design) === false) fail("design.md must name the ClippedChip anti-pattern");
if (/WorksDomainChip/.test(design) === false) fail("design.md must name the WorksDomainChip anti-pattern");
if (/BlogFooterCTA/.test(design) === false) fail("design.md must name the BlogFooterCTA anti-pattern");
if (/Marquee/.test(design) === false) fail("design.md must name the Marquee anti-pattern");
if (/TightAwardVideo/.test(design) === false) fail("design.md must name the TightAwardVideo anti-pattern");
if (/YellowDuneSlab/.test(design) === false) fail("design.md must name the YellowDuneSlab anti-pattern");
if (/SausageBand/.test(design) === false) fail("design.md must name the SausageBand anti-pattern");
if (/YellowBalloon/.test(design) === false) fail("design.md must name the YellowBalloon anti-pattern");
if (/HardMeshSeam/.test(design) === false) fail("design.md must name the HardMeshSeam anti-pattern");
if (/FlatDuneGrain/.test(design) === false) fail("design.md must name the FlatDuneGrain anti-pattern");
if (/SaaSFooter/.test(design) === false) fail("design.md must name the SaaSFooter anti-pattern");
if (/FogGrain/.test(design) === false) fail("design.md must name the FogGrain anti-pattern");
if (/NavyFlood/.test(design) === false) fail("design.md must name the NavyFlood anti-pattern");
if (/NeonMeshYellow/.test(design) === false) fail("design.md must name the NeonMeshYellow anti-pattern");
if (/BrightMeshLilac/.test(design) === false) fail("design.md must name the BrightMeshLilac anti-pattern");
if (/FooterBackToTop/.test(design) === false) fail("design.md must name the FooterBackToTop anti-pattern");
if (/LinkedInHitSquare/.test(design) === false) fail("design.md must name the LinkedInHitSquare anti-pattern");
if (/FilledEmailPill/.test(design) === false) fail("design.md must name the FilledEmailPill anti-pattern");
if (/ContactColumn/.test(design) === false) fail("design.md must name the ContactColumn anti-pattern");
if (/MailtoInHtml/.test(design) === false) fail("design.md must name the MailtoInHtml anti-pattern");
if (/FakeEmailLink/.test(design) === false) fail("design.md must name the FakeEmailLink anti-pattern");
if (/CompactMeshClip/.test(design) === false) fail("design.md must name the CompactMeshClip anti-pattern");
if (/CanvasFold/.test(design) === false) fail("design.md must name the CanvasFold anti-pattern");
if (!/immersive|folded sculpture/i.test(design)) fail("design.md must document the new immersive opening");
if (/GiantWorkCards/.test(design) === false) fail("design.md must name the GiantWorkCards anti-pattern");
if (/FooterHitSteal/.test(design) === false) fail("design.md must name the FooterHitSteal anti-pattern");
if (/footer-mesh/.test(design) === false) fail("design.md must document footer-mesh");
if (/home-mast/.test(design) === false) fail("design.md must document the home mast");
if (/footer-dunes/.test(design) === false) fail("design.md must reject footer-dunes by name");
if (!/CoverPoster/.test(design) || !/FigmaLeftover/.test(design) || !/TrackedBody/.test(design)) {
  fail("design.md must name CoverPoster, FigmaLeftover, and TrackedBody");
}
if (!/InkOnNight/.test(design) || !/MotionCover/.test(design)) {
  fail("design.md must name InkOnNight and MotionCover");
}
if (/GrainWash/.test(design) === false) fail("design.md must name the GrainWash anti-pattern");
if (/JobTitleDrift/.test(design) === false) fail("design.md must name the JobTitleDrift anti-pattern");
if (/MeshParallaxCircus/.test(design) === false) fail("design.md must name the MeshParallaxCircus anti-pattern");
if (/BareWorkSlug/.test(design) === false) fail("design.md must name the BareWorkSlug anti-pattern");
if (/DualHome/.test(design) === false) fail("design.md must name the DualHome anti-pattern");
if (/TitleDrift/.test(design) === false) fail("design.md must name the TitleDrift anti-pattern");
if (/InventedSocial/.test(design) === false) fail("design.md must name the InventedSocial anti-pattern");

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
if (!/\.home-mast \.home-banner-title\s*\{[^}]*font-family:\s*Inter,\s*sans-serif/.test(css)) {
  fail("home H1 must retain the existing Inter face through text reflow; Funnel remains the case/section display family");
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
if (!/body\.home \.navbar[^{]*\{[^}]*position:\s*fixed/.test(css) ||
    !/\.home-mast-baseline/.test(css) || !/class="home-mast-scroll"[^>]*href="#home-introduction"/.test(home)) {
  fail("immersive opening needs its distributed utility header and native lower-edge scroll action");
}
if (!/\.work-list[\s\S]{0,200}flex-direction:\s*column/.test(css)) {
  fail("home selected work must be a stacked row list");
}
if (/#works[\s\S]{0,400}work-grid/.test(home) || /class="work-image-wrap"/.test(home)) {
  fail("home selected work must retain one ordered row list, separate from the /works grid");
}
if ((home.match(/class="work-row"/g) || []).length !== 6) {
  fail("home selected work must retain all six project rows");
}
if (!/class="home-mast-track"/.test(homeMast) || !/class="home-mast-display"[^>]*aria-hidden="true"/.test(homeMast)) {
  fail("home morph needs a native scroll track and a decorative display title alongside the semantic H1");
}
if (!(home.indexOf('id="works"') > home.indexOf("</header>") && home.indexOf('id="works"') < home.indexOf('class="home-about-section"'))) {
  fail("Selected work must follow the home opening before About");
}
// The selected 03/04 storyboard now also owns the complete /works index.
if (!/class="works-index"/.test(works) || (works.match(/class="work-row"/g) || []).length !== 7 || /class="work-card"/.test(works)) {
  fail("Works must use seven landscape editorial rows in the existing hiring order");
}
for (const [page, html, count] of [["index.html", home, 6], ["works.html", works, 7]]) {
  const thumbs = [...html.matchAll(/<img\b[^>]*class="work-row-thumb"[^>]*>/g)].map(m => m[0]);
  if (thumbs.length !== count) fail(`${page}: each project needs its own geometric artwork`);
  const sources = [];
  for (const thumb of thumbs) {
    const src = thumb.match(/src="([^"]+)"/)?.[1] || "";
    sources.push(src);
    if (!/alt=""/.test(thumb) || !/aria-hidden="true"/.test(thumb)) fail(`${page}: project art is decorative, not fabricated product evidence`);
    if (!/assets\/images\/geometry\/[a-z]+\.960\.webp$/.test(src) || !existsSync(join(ROOT, src))) fail(`${page}: missing dedicated geometric asset ${src}`);
    const candidates = [...(thumb.match(/srcset="([^"]+)"/)?.[1] || "").matchAll(/(assets\/images\/geometry\/[a-z]+\.(480|960|1600)\.webp) (\d+)w/g)];
    if (candidates.length !== 3) fail(`${page}: geometric art needs all three responsive widths`);
    for (const [, path, width, descriptor] of candidates) {
      if (width !== descriptor || !existsSync(join(ROOT, path))) fail(`${page}: invalid artwork candidate ${path}`);
      else if (statSync(join(ROOT, path)).size > 150000) fail(`${page}: decorative art exceeds the 150kB per-variant budget`);
    }
  }
  if (new Set(sources).size !== count) fail(`${page}: project geometries must be unique`);
}
if (!/aspect-ratio:\s*2\.4/.test(projectCss) || !/body\.works-index \.work-row/.test(projectCss)) fail("Complete work index must share the landscape row vocabulary");
if (/\.home-work-card-wrap\.top-space[\s\S]{0,80}margin-top:\s*1\d{2}px/.test(css)) {
  fail("StaggerHole: the 140px stagger offset must not return");
}
if (!/\.work-grid::before[\s\S]{0,160}content:\s*none/.test(css)) {
  fail("RowClearfixHole: /works grid must disable Webflow .w-row clearfix pseudos");
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

// Existing editorial routes share this footer. The selected About story has
// its own navy closing composition, checked separately below.
// Shared editorial footer: lilac field, geometric art, native contacts, Work only.
// No Contact column, no form, no sitemap, no Ironclad dunes, no
// back-to-top on the copyright row. Mail href is assembled on click.
const footerPages = ["index.html", "works.html", ...WORK.map((slug) => `work/${slug}.html`), ...UTILITY_PAGES];
const footerCanon = footerPages.map((page) => {
  const html = readFileSync(join(ROOT, page), "utf8");
  const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>") + 9);
  const sameAssets = footer.replaceAll(/(?:\.\.\/|\/)assets\//g, "assets/");
  // Hungarian content retains the locked English chrome with an explicit language.
  return page.startsWith("hu/") ? sameAssets.replace(' lang="en"', '') : sameAssets;
});
if (new Set(footerCanon).size !== 1) {
  fail("editorial footer markup must match across its existing routes (asset prefix aside)");
}

// About is a deliberately separate reading composition, not a case study or
// service page. Its preview cannot imply that the final biography was supplied.
const storyFooter = story.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i)?.[0] || "";
const storyNavigation = story.match(/<nav\b[^>]*\bid="primary-navigation"[^>]*>[\s\S]*?<\/nav>/i)?.[0] || "";
const storyClosing = story.match(/<section\b[^>]*\bid="next"[^>]*>[\s\S]*?<\/section>/i)?.[0] || "";
const storyTitle = story.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
  .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
if (storyTitle !== "A story in motion.") fail("About must retain the selected A story in motion opening");
if (!/class="story-draft-note"/.test(story) || !story.includes("Story preview")) {
  fail("About must visibly identify the unfinished biography as a story preview");
}
for (const color of ["#D6D4ED", "#0A1628", "#1B3A32", "#BDB414"]) {
  if (!storyCss.includes(color)) fail(`About must retain the original ${color} palette token`);
}
if (!storyCss.includes("Funnel Display") || !storyCss.includes("Inter")) {
  fail("About must use Funnel Display headings and Inter reading text");
}
for (const [scope, markup] of [["navigation", storyNavigation], ["closing chapter", storyClosing]]) {
  const buttons = contactButtons(markup);
  if (buttons.length !== 1 || !/\btype="button"/.test(buttons[0]?.[1] || "") ||
      /\bhref=/.test(buttons[0]?.[1] || "") ||
      !buttons[0]?.[2].replace(/<[^>]+>/g, "").trim()) {
    fail(`About ${scope} must retain one named native Email action`);
  }
}
if (!/<footer\b[^>]*class="[^"]*\bstory-footer\b/i.test(storyFooter) ||
    !storyFooter.includes("© 2026 Norbert Barna") ||
    !storyFooter.includes("Product VP") ||
    /footer-mesh|mesh-blur|footer-dunes|data-story-art/.test(storyFooter)) {
  fail("About must close with its still navy identity and legal footer, without animated artwork");
}
if (/href="\/contact"|mailto:|anorbert@pm\.me/i.test(story)) {
  fail("About contact must keep the existing native email owner and omit raw addresses or invented contact routes");
}
const storyToggles = [...story.matchAll(/(<button\b[^>]*\bdata-story-motion-toggle\b[^>]*>)([\s\S]*?)<\/button>/g)];
if (storyToggles.length !== 1 || !/\btype="button"/.test(storyToggles[0]?.[1] || "") ||
    !/\baria-pressed="false"/.test(storyToggles[0]?.[1] || "") ||
    !/\shidden(?:\s|>)/.test(storyToggles[0]?.[1] || "") ||
    !storyToggles[0]?.[2].trim()) {
  fail("About motion pause must be one named native toggle, initially hidden until its controller is ready");
}
// Latest user direction replaces the footer-mesh and video-backed experience.
if (existsSync(join(ROOT, "contact.html"))) fail("/contact must stay unpublished; contact is the native footer Email action");
if (/footer-mesh|mesh-blur|footer-dunes/.test(footerCanon[0])) fail("Editorial footer must not restore the old gradient field");
if (!/editorial-footer-title/.test(footerCanon[0]) || !/editorial-footer-art/.test(footerCanon[0])) fail("Editorial footer needs its personal contact title and original folded geometry");
for (const color of ["#D6D4ED", "#0A1628"]) {
  if (!editorialCss.includes(color)) fail(`Editorial sections must use the original ${color} palette token`);
}
if (!/\.editorial-footer \.footer-bar[\s\S]{0,500}background:\s*transparent/.test(editorialCss)) fail("Privacy controls must be integrated into the footer field");
if (!/\.footer-section\.editorial-footer button\.footer-email[\s\S]{0,200}min-height:\s*48px/.test(editorialCss)) fail("Project contact needs a readable 48px native control");
if (!/\.editorial-footer :is\(a, button\):focus-visible/.test(editorialCss)) fail("Editorial footer must retain visible keyboard focus");
const experience = home.match(/<section class="bottom-space-section editorial-experience"[\s\S]*?<\/section>/)?.[0] || "";
if ((experience.match(/class="awards-card"/g) || []).length !== 5 || /<video|tabindex="0"|role="button"/.test(experience)) fail("Experience must retain five factual, readable rows without fake interactions");
const experienceTuples = [...experience.matchAll(/class="awards-card-title">([^<]+)<\/h3><p class="awards-card-text">([^<]+)<\/p>[\s\S]*?class="awards-year"><div>([^<]+)<\/div>/g)]
  .map((match) => match.slice(1));
const expectedExperience = [
  ["Vice President", "BlackRock", "2026–Present"],
  ["Creative Team Lead", "Instructure", "2023–2025"],
  ["Senior Product Designer", "Instructure", "2022–2023"],
  ["Product Lead", "Raiffeisen Bank International", "2020–2022"],
  ["Staff Designer", "Balabit / Balasys / One Identity", "2014–2020"],
];
if (JSON.stringify(experienceTuples) !== JSON.stringify(expectedExperience)) fail("Experience role, company and date pairings must stay factual and ordered");
if (/class="back-to-top-wrap"/.test(footerCanon[0]) || /aria-label="Back to top"/.test(footerCanon[0])) {
  fail("FooterBackToTop: copyright row must not restore a back-to-top control");
}
if (/(?:^|[,{}]\s*)\.work-title::after/.test(css)) {
  fail("FooterHitSteal: .work-title::after must be scoped to .work-card or .work-row");
}
if (!/\.work-card \.work-title::after/.test(css) || !/\.work-row \.work-title::after/.test(css)) {
  fail("FooterHitSteal: card and row title hit-areas must stay scoped");
}
if (!/\.footer-section\s*\{[\s\S]{0,480}z-index:\s*8/.test(css)) {
  fail("FooterHitSteal: .footer-section must stack above page hit-areas (z-index 8)");
}
for (const page of footerPages) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>") + 9);
  if (!footer.includes("footer-cta") || !footer.includes("editorial-footer") || !footer.includes("footer-email")) {
    fail(`${page}: editorial footer + native Email CTA are missing`);
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
  checkProjectContact(footer, `${page}: footer`);
  const emailTag = [...footer.matchAll(/<button\b[^>]*class="[^"]*\bfooter-email\b[^"]*"[^>]*>/gi)].map((m) => m[0]);
  if (emailTag.length !== 1) {
    fail(`${page}: footer needs exactly one Email button (got ${emailTag.length})`);
  } else if (!/\btype="button"/.test(emailTag[0]) || /href=/.test(emailTag[0]) || /mailto:/i.test(emailTag[0])) {
    fail(`${page}: FakeEmailLink: Email must be type=button with no href`);
  }
  if (/<a[^>]*footer-email/.test(footer)) {
    fail(`${page}: FakeEmailLink: Email must not be an anchor`);
  }
  const linkedin = [...footer.matchAll(/<a[^>]*class="[^"]*\bfooter-contact-link\b[^"]*"[^>]*>/gi)].map((m) => m[0]);
  if (linkedin.length !== 1) {
    fail(`${page}: footer needs exactly one LinkedIn icon (got ${linkedin.length})`);
  } else if (!/linkedin\.com\/in\/barna-norbert/.test(linkedin[0])) {
    fail(`${page}: footer LinkedIn icon must reuse the site LinkedIn URL`);
  }
  const workHrefs = [...footer.matchAll(/href="(\/work\/[^"]+)"/g)].map((m) => m[1]);
  if (JSON.stringify(workHrefs) !== JSON.stringify([
    "/work/raiffeisen", "/work/instructure", "/work/bitpanda", "/work/kineticare",
  ])) {
    fail(`${page}: Work column must be Raiffeisen, Instructure, Bitpanda, Kineticare (got ${workHrefs.join(", ")})`);
  }
  if (/footer-col-title">Contact/.test(footer) || /<p class="footer-col-title">Contact<\/p>/.test(footer)) {
    fail(`${page}: ContactColumn: Contact heading must not ship`);
  }
  if (/href="\/contact"/.test(html)) {
    fail(`${page}: must not link to /contact`);
  }
  if (/href="\/work\/(?:benker|sportsgambit|onrobot)"/.test(footer)) {
    fail(`${page}: footer Work must not list Benker, SportsGambit, or OnRobot`);
  }
  if ((footer.match(/linkedin\.com\/in\/barna-norbert/g) || []).length !== 1) {
    fail(`${page}: LinkedIn must appear once in the footer (the icon)`);
  }
  if (!footer.includes("68f9e9de8ed08e31e52c4188_NB.svg")) {
    fail(`${page}: footer must reuse the existing nb wordmark`);
  }
  if (/mailto:/i.test(html) || /anorbert@pm\.me/i.test(html)) {
    fail(`${page}: MailtoInHtml: HTML must not contain mailto: or the contact address`);
  }
  if (html.includes("data-motion-toggle") || html.includes("site-motion-toggle")) {
    fail(`MotionNav: ${page} still renders a Motion control`);
  }
}

for (const page of SERVICE_PAGES) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
  checkProjectContact(main, `${page}: main`, page.startsWith("hu/") ? "hu" : "en");
}
// The service pages are the owner's two approved boards, in this order, and
// the Hungarian page is the same board: the section skeleton must match, the
// reading text must stay outside the artwork, and the finished board must be
// the stylesheet's resting state (every owner property falls back to it).
{
  const skeleton = (html) => {
    const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
    return [...main.matchAll(/<(header|section)\b[^>]*\bid="([^"]+)"/g)].map(([, tag, id]) => `${tag}#${id}`).join(" ");
  };
  const expected = "header#top section#shaped section#pieces section#work-better section#start";
  const pages = SERVICE_PAGES.map((page) => [page, readFileSync(join(ROOT, page), "utf8")]);
  for (const [page, html] of pages) {
    if (skeleton(html) !== expected) fail(`${page}: the five board sections must stand in order (${skeleton(html)})`);
    for (const hook of ["data-ai-hero", "data-ai-shape", "data-ai-pieces", "data-ai-stage", "data-ai-ribbon", "data-ai-work"]) {
      if ((html.match(new RegExp(`\\b${hook}(?=[\\s>=])`, "g")) || []).length !== 1) fail(`${page}: exactly one ${hook} hook`);
    }
    if ((html.match(/\bdata-ai-step="[123]"/g) || []).length !== 3) fail(`${page}: the ribbon journey has three steps`);
    for (const still of ["passage-panel", "bars", "ribbon", "band", "workflow-passage"]) {
      if (!html.includes(`/assets/images/ai/${still}.webp`)) fail(`${page}: the ${still} board crop is missing`);
    }
    // Board artwork is decorative: sized, empty alt, inside an aria-hidden node.
    for (const [tag] of html.matchAll(/<img\b[^>]*assets\/images\/ai\/[^>]*>/g)) {
      if (!/\balt=""/.test(tag) || !/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) fail(`${page}: board artwork must be sized with empty alt`);
    }
  }
  const aiCss = readFileSync(join(ROOT, "assets/css/ai-integration.css"), "utf8");
  for (const token of ["--ai-ribbon-x, 0%", "--ai-ribbon-s, 1", "--ai-step-1, 1", "--ai-step-2, 1", "--ai-step-3, 1", "--ai-work, 1"]) {
    if (!aiCss.includes(token)) fail(`ai-integration.css: the finished board must be the fallback (${token})`);
  }
  if (!/\[data-ai-mode="cinematic"\] \.ai-pieces-stage \{ position: sticky/.test(aiCss)) fail("ai-integration.css: the ribbon stage pins only in cinematic mode");
  const aiJs = readFileSync(join(ROOT, "assets/js/ai-motion.js"), "utf8");
  if (/\bgsap\b|ScrollTrigger|scroll-behavior|preventDefault/.test(aiJs)) fail("ai-motion.js must stay a native-scroll owner");
}
for (const page of PRIVACY_PAGES) {
  const html = readFileSync(join(ROOT, page), "utf8");
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || "";
  const buttons = contactButtons(main);
  if (buttons.length !== 1 || buttons[0][2].trim() !== "Email" ||
      !/\btype="button"/.test(buttons[0][1]) || /\bhref=/.test(buttons[0][1]) ||
      Object.values(PROJECT_CONTACT).some((copy) => buttons[0][1].includes(copy.title))) {
    fail(`${page}: privacy main contact must stay a native Email button, not a project enquiry`);
  }
}

const navigationJs = readFileSync(join(ROOT, "assets/js/navigation.js"), "utf8");
if (/anorbert@pm\.me/.test(navigationJs) || /mailto:anorbert/.test(navigationJs)) {
  fail("MailtoInHtml: do not store the complete address as one string in JS");
}
if (!navigationJs.includes('["mai", "lto"]') || !navigationJs.includes('["ano", "rbert"]') ||
    !navigationJs.includes('["pm", ".", "me"]') || !navigationJs.includes("button.footer-email") ||
    !navigationJs.includes("location.assign")) {
  fail("Email click must location.assign a href assembled from split parts");
}
if (!/querySelectorAll\(\s*["']a,\s*button\.footer-email["']\s*\)/.test(navigationJs)) {
  fail("mobile nav must close on header Email as well as links");
}
if (/a\.footer-email/.test(navigationJs) || /setAttribute\(\s*["']href["']/.test(navigationJs)) {
  fail("MailtoInHtml: do not write mailto onto href or use a fake Email link");
}
if (/mailto:/i.test(css) || /anorbert@pm\.me/i.test(css)) {
  fail("MailtoInHtml: stylesheet must not contain mailto: or the contact address");
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
