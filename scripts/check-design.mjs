#!/usr/bin/env node
/**
 * Deterministic checks for design.md.
 * Judgment stays in design.md. These catch mechanical failures that have
 * already been named there.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
const design = readFileSync(join(ROOT, "design.md"), "utf8");
const raiffeisen = readFileSync(join(ROOT, "work/raiffeisen.html"), "utf8");
const instructure = readFileSync(join(ROOT, "work/instructure.html"), "utf8");

const titles = (html) =>
  [...html.matchAll(/<a[^>]*class="work-title"[^>]*href="\/work\/([^"]+)"/g)].map((m) => m[1]);

const homeOrder = titles(home);
const worksOrder = titles(works);
const hiring = ["raiffeisen", "instructure", "bitpanda", "benker", "sportsgambit", "kineticare", "onrobot"];

const caseHero = (html) => html.match(/class="case-hero-shot"[^>]*>/)?.[0] || "";

if (home.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] !== "Product VP") {
  fail("home H1 must be Product VP, not the name and not Design Lead");
}
if ((home.match(/<h1\b/g) || []).length !== 1) {
  fail("home must keep exactly one H1");
}
// The removed solicitation must not return as visible copy, metadata,
// a hidden DOM node, an HTML comment or structured data.
if (/open to client engagements|I[’']m open for enterprise/i.test(home)) {
  fail("home must not restore the removed company-solicitation copy, including hidden source text");
}
if (!/<a class="hero-engage-link" href="\/ai-integration">Open for AI\/web engagements<\/a>/.test(home)) {
  fail("home mast must keep the Version B text link to /ai-integration");
}
if (/<section\b[^>]*class="home-service-section[\s\S]*Open for AI\/web engagements/.test(home)) {
  fail("do not restore an engagements pitch inside the services section");
}
if (!home.includes('class="hero-kicker">Norbert Barna')) {
  fail("home fold must name Norbert Barna in the kicker");
}
if (!/class="hero-work-link"[^>]*href="\/works"/.test(home)) {
  fail("home CTA must go to /works");
}
const homeMast = home.slice(
  Math.max(0, home.indexOf("home-mast")),
  home.indexOf("home-about-section")
);
if (!/class="home-mast-mesh"/.test(homeMast) || !/home-mast-navy/.test(homeMast)) {
  fail("home fold must open on the analog mesh mast (lilac + navy félkör)");
}
if (!/id="home-mast-blur"/.test(homeMast) || !/stdDeviation="56"/.test(homeMast)) {
  fail("home mast must use the blur 56 family, not a second CSS fog");
}
if (!/#D6D4ED/.test(homeMast) || !/#0A1628/.test(homeMast)) {
  fail("home mast must use lock lilac and navy");
}
const homeNavy = [...homeMast.matchAll(/<ellipse cx="([0-9.]+)" cy="([0-9.]+)" rx="([0-9.]+)" ry="([0-9.]+)" fill="#0A1628"/g)];
if (!homeNavy.some((m) => Number(m[4]) >= 700 && Number(m[1]) >= 1080)) {
  fail("WeakNavyDome: home mast navy félkör must be a large center-right mass (ry ≥ 700, cx ≥ 1080)");
}
if (/hero-proof|insights-feed|Canvas Career|hero-proof-caption/.test(homeMast)) {
  fail("CanvasFold: homepage header must not ship a product screenshot");
}
if (/<img\b(?![^>]*NB\.svg)/.test(homeMast)) {
  fail("CanvasFold: homepage header may only show the nb wordmark, not case UI");
}
if (/footer-col-title">Work|footer-copyright|© 2026 Norbert Barna/.test(homeMast)) {
  fail("home mast is not a footer clone: no Work column or copyright");
}
if (/#BDB414|#FFE000/.test(homeMast)) {
  fail("home mast must not paint the footer yellow into the header");
}
if (/home-banner-outcomes|Selected portfolio highlights|multi-country mobile banking ecosystem/.test(home)) {
  fail("home fold must not restore the four highlight bullets");
}
if (!/\$52M\+ features · Instructure/.test(home) || !/1\.8→4\.8 · Raiffeisen/.test(home)) {
  fail("home fold must keep the two LinkedIn About proof chips (do not invent new numbers)");
}
if (!/class="home-proof-chips"/.test(home) || (home.match(/class="home-proof-chip"/g) || []).length !== 2) {
  fail("home fold must show exactly two compact proof chips, not a long bullet list");
}
if ((homeMast.match(/class="home-proof-mark"/g) || []).length !== 2) {
  fail("Version B chips must include two inline SVG marks, not generated images");
}
if (/<img\b/.test(homeMast.match(/home-proof-chips[\s\S]*?<\/ul>/)?.[0] || "")) {
  fail("CanvasFold: proof chips must not use <img> marks");
}
const homeEmployers = [...home.matchAll(/<ul class="home-employer-list"[^>]*>([\s\S]*?)<\/ul>/g)][0]?.[1] || "";
const employerNames = [...homeEmployers.matchAll(/<li>([^<]*)/g)].map((m) => m[1].replace(/\s+/g, " ").trim());
if (JSON.stringify(employerNames) !== JSON.stringify(["BlackRock", "Instructure", "Raiffeisen", "Bitpanda", "Balabit"])) {
  fail(`home fold employer list must be BlackRock, Instructure, Raiffeisen, Bitpanda, Balabit (got ${employerNames.join(", ")})`);
}
if (!/AI products for fintech, Web3, regulated teams/.test(home)) {
  fail("home dek must be the Version B one-liner");
}
if (/4M\+|Redesigning banking for/.test(home)) {
  fail("do not replace live work copy with invented mock one-liners");
}
const homeNav = home.slice(home.indexOf('class="navbar'), home.indexOf("<main"));
if (!/class="nav-link[^"]*"[^>]*href="\/works">Works<\/a>/.test(homeNav)) {
  fail("home top bar must keep the Works text link");
}
if (!/class="footer-contact-link"/.test(homeNav) || !/linkedin\.com\/in\/barna-norbert/.test(homeNav)) {
  fail("home top bar must use the outlined LinkedIn square");
}
checkProjectContact(homeNav, "home top bar");
if (/href="[^"]*mailto:/.test(homeNav) || /anorbert@pm\.me/.test(homeNav)) {
  fail("MailtoInHtml: home Email must not expose mailto or the address");
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
if (works.match(/<h1[^>]*>([^<]*)<\/h1>/)?.[1] !== "Selected work") {
  fail("TitleDrift: /works H1 must be Selected work");
}
const llms = readFileSync(join(ROOT, "llms.txt"), "utf8");
const llmsOpener = llms.split("\n").slice(0, 6).join("\n");
if (!/Product VP/.test(llmsOpener) || /product design leader/i.test(llmsOpener)) {
  fail("llms.txt opener must lead with Product VP, not product design leader");
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
if (/WeakNavyDome/.test(design) === false) fail("design.md must name the WeakNavyDome anti-pattern");
if (/GiantWorkCards/.test(design) === false) fail("design.md must name the GiantWorkCards anti-pattern");
if (/FooterHitSteal/.test(design) === false) fail("design.md must name the FooterHitSteal anti-pattern");
if (/footer-mesh/.test(design) === false) fail("design.md must document footer-mesh");
if (/home-mast/.test(design) === false) fail("design.md must document the home mast");
if (/footer-dunes/.test(design) === false) fail("design.md must reject footer-dunes by name");
if (!/CoverPoster/.test(design) || !/FigmaLeftover/.test(design) || !/TrackedKicker/.test(design)) {
  fail("design.md must name CoverPoster, FigmaLeftover, and TrackedKicker");
}
if (!/InkOnNight/.test(design) || !/MotionCover/.test(design)) {
  fail("design.md must name InkOnNight and MotionCover");
}
if (/InkOnNavy/.test(design) === false) fail("design.md must name the InkOnNavy anti-pattern");
if (/GrainWash/.test(design) === false) fail("design.md must name the GrainWash anti-pattern");
if (/JobTitleDrift/.test(design) === false) fail("design.md must name the JobTitleDrift anti-pattern");
if (/MeshParallaxCircus/.test(design) === false) fail("design.md must name the MeshParallaxCircus anti-pattern");
if (/BareWorkSlug/.test(design) === false) fail("design.md must name the BareWorkSlug anti-pattern");
if (/DualHome/.test(design) === false) fail("design.md must name the DualHome anti-pattern");
if (/TitleDrift/.test(design) === false) fail("design.md must name the TitleDrift anti-pattern");
if (/InventedSocial/.test(design) === false) fail("design.md must name the InventedSocial anti-pattern");

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
if (/(?:^|[,{}]\s*)\.hero-kicker\s*\{[\s\S]{0,200}text-transform:\s*uppercase/.test(css) ||
    !/(?:^|[,{}]\s*)\.hero-kicker\s*\{[\s\S]{0,200}letter-spacing:\s*0/.test(css) ||
    !/(?:^|[,{}]\s*)\.hero-kicker\s*\{[\s\S]{0,200}text-transform:\s*none/.test(css)) {
  fail("TrackedKicker: shared .hero-kicker must stay sentence case with no tracking");
}
if (!/\.home-mast \.hero-kicker[\s\S]{0,200}text-transform:\s*uppercase/.test(css) ||
    !/\.home-mast \.hero-kicker[\s\S]{0,200}letter-spacing:\s*\.16em/.test(css)) {
  fail("Version B mast kicker must be CSS uppercase + .16em tracking; HTML stays Norbert Barna");
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
if (!/body\.home \.navbar[\s\S]{0,240}background:\s*transparent/.test(css)) {
  fail("home mast: navbar must sit on the mesh, not a white slab");
}
if (!/(?:^|[,{}]\s*)\.hero-work-link\s*\{[\s\S]{0,360}border-radius:\s*12px/.test(css) ||
    /(?:^|[,{}]\s*)\.hero-work-link\s*\{[\s\S]{0,240}border-radius:\s*999px/.test(css) ||
    /(?:^|[,{}]\s*)\.hero-work-link\s*\{[\s\S]{0,240}background:\s*#111/.test(css)) {
  fail("shared .hero-work-link must stay outlined 12px chrome, not a black pill");
}
if (!/\.home-mast \.hero-work-link\s*\{[\s\S]{0,360}background:\s*#0a1628/.test(css) ||
    !/\.home-mast \.hero-work-link\s*\{[\s\S]{0,360}color:\s*#f4f5f7/.test(css) ||
    /\.home-mast \.hero-work-link\s*\{[\s\S]{0,360}border-radius:\s*999px/.test(css)) {
  fail("Version B mast CTA must be filled navy with light type and 12px corners, not a 999 pill");
}
if (!/\.work-list[\s\S]{0,200}flex-direction:\s*column/.test(css)) {
  fail("home selected work must be a stacked row list");
}
if (!/\.work-row-thumb[\s\S]{0,160}width:\s*84px/.test(css) ||
    !/\.work-row-thumb[\s\S]{0,200}height:\s*84px/.test(css)) {
  fail("home work thumbs must lock at 84px (72–96 family), not half-viewport cards");
}
if (/#works[\s\S]{0,400}work-grid/.test(home) || /class="work-image-wrap"/.test(home)) {
  fail("GiantWorkCards: home selected work must not restore giant 2-up cards");
}
if ((home.match(/class="work-row"/g) || []).length !== 6) {
  fail("home selected work must be six compact rows");
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

// Locked footer: mesh field, outlined LinkedIn + Email, Work only.
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
  fail("site-wide footer markup must match across pages (asset prefix aside)");
}
const footerCssStart = css.indexOf(".footer-section");
const footerCss = css.slice(footerCssStart, footerCssStart + 9000);
if (!/--footer-lavender:\s*#d6d4ed/.test(css)) {
  fail("footer mesh type band must be lock lilac #d6d4ed");
}
if (!/--footer-yellow:\s*#bdb414/.test(css)) {
  fail("footer mesh bottom must be lock olive-chartreuse #bdb414");
}
if (/#5b45ff/.test(footerCss)) {
  fail("footer stylesheet must not restore candy purple");
}
if (/#ffe000|#FFE000|#e1e1f5|#E1E1F5|#a8d800|#A8D800/.test(footerCss) ||
    /#FFE000|#E1E1F5|#A8D800/.test(footerCanon[0])) {
  fail("NeonMeshYellow/BrightMeshLilac: footer must not use neon #FFE000, bright #E1E1F5, or lime #A8D800");
}
if (/\.footer-dunes\b/.test(css) || /class="footer-dunes"/.test(footerCanon[0]) || /footer-dune-layer/.test(footerCanon[0])) {
  fail("Ironclad dunes: stacked .footer-dunes ridges must not return");
}
if (/<path[^>]*fill="#DCA30C"/.test(footerCanon[0]) || /id="dune-lit-yellow"/.test(footerCanon[0])) {
  fail("Ironclad dunes: lit-sand path army must not return");
}
if (existsSync(join(ROOT, "contact.html"))) {
  fail("/contact must stay unpublished; contact is the footer Email CTA");
}
if (/#f1f3f2|#F1F3F2/.test(css.slice(footerCssStart, footerCssStart + 500))) {
  fail("footer must not restore the paper chrome slab");
}
if (!/footer-mesh/.test(footerCanon[0]) || !/mesh-blur/.test(footerCanon[0])) {
  fail("footer must ship a blurred mesh field, not stacked dune paths");
}
if (!/#D6D4ED/.test(footerCanon[0]) || !/#0A1628/.test(footerCanon[0]) || !/#BDB414/.test(footerCanon[0])) {
  fail("mesh blobs must use lock lilac, navy, and olive-chartreuse");
}
if (!/viewBox="0 0 1600 1067"/.test(footerCanon[0])) {
  fail("SausageBand: mesh viewBox must be ~3:2 (1600×1067) so the left-weighted navy horizon and right-weighted yellow can exist");
}
if (/ry="72"/.test(footerCanon[0]) || /rx="1800"[\s\S]{0,80}fill="#0A1628"/.test(footerCanon[0])) {
  fail("SausageBand: navy must be a left-weighted horizon mass, not a thin rx=1800 ry=72 stripe");
}
if (/<rect[^>]*fill="#BDB414"/.test(footerCanon[0])) {
  fail("SausageBand: yellow must be right-weighted ellipses, not a rectangle slab");
}
const navyRy = Number((footerCanon[0].match(/<ellipse[^>]*ry="([0-9.]+)" fill="#0A1628"/) || [])[1]);
if (!navyRy || navyRy < 180) {
  fail("SausageBand: navy ellipse ry must be a horizon mass (≥ 180 in the 1067-tall viewBox)");
}
const navyCenters = [...footerCanon[0].matchAll(/<ellipse cx="([0-9.]+)"[^>]*fill="#0A1628"/g)].map((m) => Number(m[1]));
if (!navyCenters.some((cx) => cx < 600)) {
  fail("SausageBand: navy must include a left-weighted ellipse (cx < 600)");
}
if (navyCenters.some((cx) => cx >= 750 && cx <= 850)) {
  fail("YellowBalloon/SausageBand: navy must not be a centered blob (cx ≈ 800)");
}
const yellowEllipses = [...footerCanon[0].matchAll(/<ellipse cx="([0-9.]+)" cy="([0-9.]+)" rx="([0-9.]+)" ry="([0-9.]+)" fill="#BDB414"/g)];
if (yellowEllipses.length === 0) {
  fail("YellowBalloon: olive-chartreuse must be painted with ellipses, not a missing field");
}
for (const [, cx, , , ry] of yellowEllipses) {
  if (Number(cx) < 1200) {
    fail(`YellowBalloon: yellow ellipse cx=${cx} must be right-weighted (cx ≥ 1200), not a centered balloon`);
  }
}
const yellowRyMax = Math.max(...yellowEllipses.map((m) => Number(m[4])));
if (yellowRyMax < 200) {
  fail("YellowBalloon: yellow must include a substantial right-weighted bite (ry ≥ 200)");
}
if (!/min-height:\s*min\(66\.667vw,\s*960px\)/.test(css)) {
  fail("SausageBand: desktop footer field must be ~3:2 (min(66.667vw, 960px)), not a 680px crush");
}
const blurMatch = footerCanon[0].match(/<feGaussianBlur stdDeviation="([0-9.]+)"/);
const blur = Number(blurMatch?.[1]);
if (!blurMatch || blur < 48) {
  fail("HardMeshSeam: mesh SVG blur must be ≥ 48 so lilac/navy/yellow seams wash like the lock");
}
if (blur > 72) {
  fail("NavyFlood: mesh SVG blur must stay ≤ 72 so the navy horizon does not flood the type band");
}
if (!/class="footer-mesh-lilac"/.test(footerCanon[0]) ||
    !/class="footer-mesh-navy"/.test(footerCanon[0]) ||
    !/class="footer-mesh-olive"/.test(footerCanon[0]) ||
    !/class="footer-mesh-yellow"/.test(footerCanon[0])) {
  fail("mesh masses must be separate lilac/navy/olive/yellow groups inside the same blur");
}
if ((footerCanon[0].match(/class="footer-mesh-olive"/g) || []).length < 2) {
  fail("olive must stay two groups so the left overlay still paints after yellow");
}
if (/\.footer-mesh-(?:navy|olive|yellow)[\s\S]{0,240}rotate\(/.test(css) ||
    /@keyframes[\s\S]{0,200}footer-mesh-(?:navy|olive|yellow)/.test(css)) {
  fail("MeshParallaxCircus: mesh mass CSS must not rotate or keyframe-loop");
}
if (/inset:\s*auto 0 0 0/.test(css) && /min\(145vw,\s*580px\)/.test(css)) {
  fail("CompactMeshClip: compact mesh SVG must fill the footer, not pin a short field through the ident");
}
if (!/@media\s*\(max-width:\s*991px\)[\s\S]*?\.footer-mesh-art[\s\S]{0,160}inset:\s*0/.test(css) ||
    !/@media\s*\(max-width:\s*991px\)[\s\S]*?\.footer-mesh-art[\s\S]{0,200}height:\s*100%/.test(css)) {
  fail("CompactMeshClip: compact .footer-mesh-art must be inset 0 / height 100%");
}
if (!/@media\s*\(max-width:\s*991px\)[\s\S]*?\.footer-mesh-navy[\s\S]{0,280}mask-image:\s*linear-gradient/.test(css)) {
  fail("NavyFlood: compact navy must fade in below Work so the title stays on lilac");
}
if (!/@media\s*\(max-width:\s*991px\)[\s\S]*\.home-mast-navy[\s\S]{0,400}transparent 88%/.test(css)) {
  fail("NavyFlood: compact home mast navy must fade in below the last employer (mask from 88%)");
}
if (!/\.home-mast::after[\s\S]{0,240}radial-gradient[\s\S]{0,80}#0a1628/.test(css)) {
  fail("NavyFlood: compact home mast must paint a bottom navy overlay under the type");
}
if (!/@media\s*\(max-width:\s*991px\)[\s\S]*\.home-mast::after[\s\S]{0,160}height:\s*16%/.test(css)) {
  fail("NavyFlood: compact mast ::after navy must stay a short bottom wash (16%)");
}
if (!/--mast-muted:\s*#2a2a2e/.test(css)) {
  fail("GrainWash: --mast-muted must be solid #2a2a2e");
}
if (!/\.home-mast \.hero-kicker[\s\S]{0,80}--mast-muted/.test(css)) {
  fail("GrainWash: mast kicker must use --mast-muted, not 62% --muted");
}
if (!/@media\s*\(max-width:\s*991px\)[\s\S]*\.home-mast \.home-employer-list[\s\S]{0,160}--ink/.test(css)) {
  fail("NavyFlood: compact employer list must stay --ink on lilac, not --mast-on-navy");
}
if (!/TightAwardVideo/.test(design)) {
  fail("design.md must name the TightAwardVideo anti-pattern");
}
if (!/\.awards-bg-video > video[\s\S]{0,200}inset:\s*0/.test(css) ||
    !/\.awards-bg-video > video[\s\S]{0,240}object-fit:\s*cover/.test(css)) {
  fail("TightAwardVideo: award video must fill the card (inset 0 / cover)");
}
if (/@media\s*\(max-width:\s*991px\)[\s\S]*\.awards-bg-video-wrap[\s\S]{0,80}display:\s*none/.test(css)) {
  fail("TightAwardVideo: compact must not hide the award video wrap");
}
if (/\.awards-card[\s\S]{0,80}\.awards-bg-video-wrap[\s\S]{0,60}opacity:\s*0\s*!important/.test(css)) {
  fail("TightAwardVideo: coarse/hover-none must not force the award video off");
}
if (!/--mast-on-navy:\s*#f4f5f7/.test(css)) {
  fail("InkOnNavy: --mast-on-navy must be near-white #F4F5F7");
}
if (!/@media\s*\(min-width:\s*992px\)[\s\S]*\.home-mast \.home-employer-list[\s\S]{0,160}--mast-on-navy/.test(css)) {
  fail("InkOnNavy: desktop mast employer list must use --mast-on-navy");
}
if (!/@media\s*\(min-width:\s*992px\)[\s\S]*\.home-mast \.home-banner-area[\s\S]{0,200}grid-template-columns:\s*minmax\(0,\s*1fr\) auto/.test(css)) {
  fail("desktop mast must be a wide left column and a narrow employer stack");
}
if (!/@media\s*\(min-width:\s*992px\)[\s\S]*\.home-mast \.home-banner-area > \.banner-left-wrap[\s\S]{0,220}max-width:\s*46rem/.test(css)) {
  fail("desktop mast left stack must stay a reading-width column (46rem), not span the fold");
}
if (!/@media\s*\(min-width:\s*992px\)[\s\S]*\.home-mast \.home-banner-title[\s\S]{0,160}clamp\(64px/.test(css)) {
  fail("desktop mast H1 must be display-size (64–92px), not the 64px case-title cap");
}
if (!/@media\s*\(min-width:\s*992px\)[\s\S]*\.home-mast \.home-banner-subtitle[\s\S]{0,120}max-width:\s*36ch/.test(css)) {
  fail("desktop mast dek must wrap at reading width (36ch), not span the fold");
}
if (!/@media\s*\(min-width:\s*992px\)[\s\S]*\.home-banner-content-wrap[\s\S]{0,280}clamp\(220px/.test(css)) {
  fail("desktop employers must sit mid-mast on the solid navy (220–340px offset)");
}
if (!/@media\s*\(min-width:\s*992px\)[\s\S]*\.home-mast \.home-employer-list[\s\S]{0,280}clamp\(24px/.test(css)) {
  fail("desktop employer names must be 24–32px, not an 18px whisper");
}
if (!/\.home-proof-chip[\s\S]{0,200}--ink/.test(css) ||
    !/\.home-proof-chip[\s\S]{0,240}border-radius:\s*999px/.test(css) ||
    /\.home-proof-chip[\s\S]{0,200}background:\s*#111/.test(css)) {
  fail("proof chips must be compact ink-on-lilac pills (radius 999), not filled black");
}
if (!/\.home-proof-mark[\s\S]{0,160}#5c4f9a/.test(css)) {
  fail("proof chip marks must use the Version B purple token, not generated images");
}
if (!/@media\s*\(max-width:\s*479px\)[\s\S]*\.home-proof-chips[\s\S]{0,200}flex-direction:\s*column/.test(css)) {
  fail("compact proof chips must stack at ≤479px so webfont load cannot wrap-flip a row");
}
if (!/\.home-mast \.banner-left-wrap > p\.hero-kicker[\s\S]{0,80}font-size:\s*13px/.test(css)) {
  fail("home kicker must stay 13px on compact, not inherit the 17px banner bump");
}
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.footer-mesh-navy[\s\S]{0,280}transform:\s*none\s*!important/.test(css)) {
  fail("prefers-reduced-motion must freeze navy/olive/yellow mesh transforms");
}
if (/\.footer-mesh-art[\s\S]{0,160}filter:\s*blur\(/.test(css)) {
  fail("FogGrain: .footer-mesh-art must not add a second CSS blur");
}
if (/\.home-mast-art[\s\S]{0,160}filter:\s*blur\(/.test(css)) {
  fail("FogGrain: .home-mast-art must not add a second CSS blur");
}
if (/\.footer-mesh::after[\s\S]{0,240}opacity:\s*\.38/.test(css)) {
  fail("FogGrain: grain must not ship as a faint 0.38 multiply overlay");
}
if (/\.footer-section a\.footer-email/.test(css) ||
    /\.footer-section a\.footer-email[\s\S]{0,240}border-radius:\s*999px/.test(css) ||
    /\.footer-section button\.footer-email[\s\S]{0,240}border-radius:\s*999px/.test(css) ||
    /\.footer-section button\.footer-email[\s\S]{0,200}background-color:\s*#000/.test(css)) {
  fail("FilledEmailPill/FakeEmailLink: Email must be a native button, not a filled pill or fake link");
}
if (!/\.footer-section button\.footer-email[\s\S]{0,480}border-radius:\s*12px/.test(css) ||
    !/\.footer-section button\.footer-email[\s\S]{0,480}padding:\s*0 14px/.test(css) ||
    !/\.footer-section button\.footer-email[\s\S]{0,480}font-weight:\s*500/.test(css) ||
    !/\.footer-section button\.footer-email[\s\S]{0,480}background-color:\s*transparent/.test(css) ||
    !/\.footer-section button\.footer-email[\s\S]{0,480}appearance:\s*none/.test(css) ||
    !/\.footer-section button\.footer-email[\s\S]{0,480}font-family:\s*inherit/.test(css)) {
  fail("Email must be a reset native button with outlined 44px / 12px chrome (Inter 15/500, padding 0 14)");
}
if (!/\.footer-section a\.footer-contact-link[\s\S]{0,360}width:\s*44px/.test(css) ||
    !/\.footer-section a\.footer-contact-link[\s\S]{0,360}border-radius:\s*12px/.test(css) ||
    !/\.footer-section a\.footer-contact-link[\s\S]{0,360}background-color:\s*transparent/.test(css)) {
  fail("LinkedIn must be the 44px outlined square (transparent fill, 12px radius)");
}
if (/\.footer-section a\.footer-contact-link[\s\S]{0,200}background-color:\s*#e6e6e8/.test(css) ||
    /\.footer-section a\.footer-contact-link[\s\S]{0,80}width:\s*32px/.test(css)) {
  fail("LinkedInHitSquare: do not restore the grey 32px chip");
}
if (!/\.footer-cta[\s\S]{0,160}gap:\s*9px/.test(css)) {
  fail("CTA gap must stay in the 8–10px lock (9px)");
}
if (!/\.footer-icon[\s\S]{0,80}width:\s*17px/.test(css)) {
  fail("LinkedIn icon must be ~17px");
}
if (!/\.footer-bar[\s\S]{0,200}border-top:\s*1px solid rgb\(17 17 17 \/ 62%\)/.test(css)) {
  fail("footer hairline must be a sharp dark 1px rule, not a 14% ghost line");
}
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
  if (!footer.includes("footer-cta") || !footer.includes("footer-mesh") || !footer.includes("footer-email")) {
    fail(`${page}: locked footer mesh + Email CTA are missing`);
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
