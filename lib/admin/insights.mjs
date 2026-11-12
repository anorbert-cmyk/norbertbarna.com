// Per-article search readiness for the admin: what each article is optimised
// for, and how it scores for classic search (SEO), answer engines (AEO:
// featured snippets, voice, AI overviews) and generative engines (GEO: LLM
// answers that quote and cite sources). Every check reads the same Markdown
// the site is built from (scripts/writing-content.mjs), so the score describes
// the page that is actually published, not a separate copy.
import {
  SECTIONS, WRITING_LANGS, citations, faqOf, leadParagraph, markdownToHtml, mentions, outlineOf, plainText, readingMinutes, wordCount,
} from "../../scripts/writing-content.mjs";

const DAY = 24 * 60 * 60 * 1000;

// What a reader typing the primary keyword most likely wants. Heuristic, by
// the words people use in each language; shown as a label, never scored.
const INTENTS = [
  { id: "cost", label: { hu: "Ár, költség", en: "Cost", de: "Kosten" }, pattern: /\b(?:ar|ara|arak|koltseg\w*|price|pricing|cost\w*|kostet|kosten|preis\w*)\b/ },
  { id: "comparison", label: { hu: "Összehasonlítás", en: "Comparison", de: "Vergleich" }, pattern: /\b(?:vagy|vs|versus|or|oder|alternative\w*)\b/ },
  { id: "howto", label: { hu: "Útmutató", en: "How to", de: "Anleitung" }, pattern: /\b(?:hogyan|lepes\w*|bevezet\w*|how|guide|steps?|wie|einfuhr\w*|schritt\w*|first|elso|erster?)\b/ },
  { id: "compliance", label: { hu: "Szabályozás", en: "Compliance", de: "Rechtliches" }, pattern: /\b(?:gdpr|dsgvo|bfsg|ai act|rendelet|pflicht\w*|kennzeichnung\w*|datenschutz|barrierefrei\w*|regulat\w*)\b/ },
  { id: "hiring", label: { hu: "Partnerválasztás", en: "Choosing a partner", de: "Partnerwahl" }, pattern: /\b(?:partner|agency|ugynokseg|hire|hiring|beauftrag\w*|valaszt\w*)\b/ },
];
const fold = (value) => String(value || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function intentOf(article) {
  const text = fold([article.tags?.[0], article.title].join(" "));
  const found = INTENTS.find((intent) => intent.pattern.test(text));
  return found ? { id: found.id, label: found.label } : { id: "informational", label: { hu: "Tájékozódás", en: "Informational", de: "Information" } };
}

const internalLinks = (markdown) => [...markdown.matchAll(/\]\((\/[^)\s]*|https:\/\/www\.barnanorbert\.com[^)\s]*)\)/g)].map((match) => match[1]);
const sentences = (text) => text.split(/(?<=[.!?])\s+/).filter(Boolean);
const NUMBER = /\b\d+(?:[.,]\d+)?\s?(?:%|százalék|percent|prozent|nap|days?|tage?|hét|weeks?|wochen|hónap|months?|monate?|év|years?|jahre?|€|eur|ft|huf|óra|hours?|stunden?)?/gi;
const QUESTION_HEADING = /^#{2,3}\s.*\?\s*$/gm;
const SUMMARY_HEADING = /^##\s+(?:Röviden|Összegzés|In short|Summary|TL;DR|Kurz gesagt|Zusammenfassung|Fazit|Kurzantwort)\b/im;

function check(id, label, pass, detail, weight = 1, fix = "") {
  return { id, label, pass: Boolean(pass), detail, weight, fix: pass ? "" : fix };
}

function score(checks) {
  const total = checks.reduce((sum, item) => sum + item.weight, 0);
  const got = checks.reduce((sum, item) => sum + (item.pass ? item.weight : 0), 0);
  return total ? Math.round((got / total) * 100) : 0;
}

/**
 * @param {object} article  one entry of loadArticles({ includeDrafts: true })
 * @param {object[]} all    every article (for translation coverage)
 * @param {{ now?: number, llms?: string, sitemap?: string }} context
 */
export function analyseArticle(article, all = [], { now = Date.now(), llms = "", sitemap = "" } = {}) {
  const md = article.markdown || "";
  const html = markdownToHtml(md, article.source || article.slug, article.lang);
  const primary = article.tags?.[0] || "";
  const lead = leadParagraph(md);
  const leadWords = lead.split(/\s+/).filter(Boolean).length;
  const words = wordCount(md);
  const outline = outlineOf(html);
  const questionHeadings = (md.match(QUESTION_HEADING) || []).length;
  const faq = faqOf(html);
  const sources = citations(md);
  const links = internalLinks(md);
  const numbers = (plainText(md).match(NUMBER) || []).filter((value) => /\d/.test(value)).length;
  const lists = (md.match(/^(?:[-*]|\d+\.)\s/gm) || []).length;
  const tables = (md.match(/^\|.*\|\s*$/gm) || []).length ? 1 : 0;
  const ageDays = Math.floor((now - Date.parse(article.updated)) / DAY);
  const url = `${SECTIONS[article.lang].path}/${article.slug}`;
  const absolute = `https://www.barnanorbert.com${url}`;
  const translations = WRITING_LANGS.filter((lang) => lang !== article.lang).map((lang) => {
    const pair = article.pairs?.find((entry) => entry.lang === lang);
    const target = pair && all.find((other) => other.lang === lang && other.slug === pair.slug);
    return { lang, slug: pair?.slug || null, title: target?.title || null, path: pair ? `${SECTIONS[lang].path}/${pair.slug}` : null };
  });
  const h2WithKeyword = outline.some((item) => mentions(item.text, primary));
  const longSentences = md.split(/\n+/).filter((line) => line.trim() && !/^\|/.test(line)).flatMap((line) => sentences(plainText(line))).filter((sentence) => sentence.split(/\s+/).length > 30).length;

  const seo = [
    check("title-length", "Cím hossza 30–60 karakter", article.title.length >= 30 && article.title.length <= 60, `${article.title.length} karakter`, 2, "A cím legyen 30 és 60 karakter között, hogy a találati listában ne vágódjon le."),
    check("title-keyword", "A fő kulcsszó a címben", mentions(article.title, primary), primary, 3, "Tedd bele a fő kulcsszót (az első címkét) a címbe."),
    check("description", "Meta leírás 105–135 karakter, kulcsszóval", article.description.length >= 105 && article.description.length <= 135 && mentions(article.description, primary), `${article.description.length} karakter`, 2, "A leírás legyen 105–135 karakter, és szerepeljen benne a fő kulcsszó."),
    check("lead-keyword", "A fő kulcsszó az első bekezdésben", mentions(lead, primary), "", 2, "Az első bekezdés nevezze meg a fő kulcsszót."),
    check("h2-keyword", "A fő kulcsszó legalább egy alcímben", h2WithKeyword, "", 1, "Legalább egy ## alcím tartalmazza a fő kulcsszót vagy közeli változatát."),
    check("length", "Terjedelem legalább 900 szó", words >= 900, `${words} szó`, 2, "A versenyképes cikkek ebben a témában jellemzően 900 szó felettiek."),
    check("internal-links", "Legalább 2 belső link", links.length >= 2, `${links.length} belső link`, 2, "Linkelj a kapcsolódó szolgáltatásoldalra és egy másik cikkre."),
    check("service", "Kapcsolódó szolgáltatásoldal megadva", Boolean(article.service), article.service || "nincs", 1, "Add meg a service mezőt, hogy a cikk a szolgáltatásoldalra vezessen."),
    check("cover", "Saját borítókép alt szöveggel", Boolean(article.cover && article.cover_alt), article.cover || "alapértelmezett kép", 1, "Adj meg 1200×630-as borítóképet és leíró alt szöveget."),
    check("tags", "3–8 kulcsszó-címke", (article.tags?.length || 0) >= 3 && (article.tags?.length || 0) <= 8, `${article.tags?.length || 0} címke`, 1, "Adj meg 3–8 címkét; az első a fő kulcsszó."),
    check("fresh", "Frissítve az elmúlt 12 hónapban", ageDays <= 365, `${ageDays} napja`, 1, "Nézd át és frissítsd a cikket (updated dátum)."),
    check("hreflang", "Legalább egy fordítás (hreflang)", translations.some((item) => item.slug), `${translations.filter((item) => item.slug).length} fordítás`, 1, "Készíts fordítást, hogy a cikk a másik nyelvű keresésekben is megjelenjen."),
    check("sitemap", "Benne van a sitemapben", !sitemap || sitemap.includes(`<loc>${absolute}</loc>`), "", 1, "Futtasd a build:writing parancsot, hogy a sitemap frissüljön."),
  ];
  const aeo = [
    check("direct-answer", "Közvetlen válasz az elején (35–90 szó)", leadWords >= 35 && leadWords <= 90, `${leadWords} szó`, 3, "Az első bekezdés 35–90 szóban válaszolja meg a kérdést: ezt idézik a kiemelt találatok és a hangalapú válaszok."),
    check("question-heading", "Kérdés formájú alcímek (legalább 2)", questionHeadings >= 2, `${questionHeadings} kérdés`, 2, "Fogalmazz meg legalább két alcímet úgy, ahogy az emberek kérdeznek."),
    check("faq", "Látható GYIK legalább 3 kérdéssel (FAQPage schema)", faq.length >= 3, `${faq.length} kérdés`, 3, "Adj hozzá „Gyakori kérdések” részt legalább 3 ### kérdéssel."),
    check("faq-answers", "GYIK válaszok tömörek (max. 80 szó)", faq.length > 0 && faq.every((item) => item.answer.split(/\s+/).length <= 80), "", 1, "A GYIK válaszok legyenek rövidek; a részletek maradjanak a törzsszövegben."),
    check("summary", "Összefoglaló vagy „Röviden” rész", SUMMARY_HEADING.test(md), "", 1, "Adj hozzá „Röviden” vagy „Összegzés” részt."),
    check("lists", "Felsorolás vagy táblázat a könnyű kiemeléshez", lists >= 3 || tables > 0, `${lists} listaelem, ${tables ? "van" : "nincs"} táblázat`, 1, "Egy lépéslista vagy összehasonlító táblázat könnyen kiemelhető."),
    check("readable", "Kevés túl hosszú mondat (30+ szó)", longSentences <= Math.max(3, Math.ceil(words / 250)), `${longSentences} hosszú mondat`, 1, "Bontsd ketté a 30 szónál hosszabb mondatokat."),
  ];
  const geo = [
    check("citations", "Legalább 2 külső forrás (Article.citation)", sources.length >= 2, `${sources.length} forrás`, 3, "Hivatkozz elsődleges forrásokra (jogszabály, kutatás, hivatalos oldal); az LLM-ek a hivatkozott állításokat szívesebben idézik."),
    check("numbers", "Konkrét számok, tények (legalább 5)", numbers >= 5, `${numbers} szám`, 2, "Konkrét számok, határidők és tények teszik idézhetővé a cikket. Árat ne írj."),
    check("llms", "Szerepel az llms.txt-ben", !llms || llms.includes(absolute), "", 2, "Futtasd a build:writing parancsot, hogy az llms.txt frissüljön."),
    check("entity", "Szerző és kiadó entitás (Person schema)", true, "Barna Norbert, a sablonból", 1),
    check("experience", "Saját tapasztalat, példa", /\b(?:projekt\w*|példa|example|beispiel|kineticare|raiffeisen|bitpanda|onrobot|instructure|benker)\b/i.test(md), "", 2, "Írj le egy konkrét, saját projektből vett példát: ez különbözteti meg a cikket a generált szövegektől."),
    check("structure", "Legalább 4 tagolt rész (H2)", outline.length >= 4, `${outline.length} H2`, 1, "Tagold a cikket legalább 4 ## részre, hogy a modellek darabolva is értsék."),
  ];
  const scores = { seo: score(seo), aeo: score(aeo), geo: score(geo) };
  return {
    slug: article.slug,
    lang: article.lang,
    path: url,
    title: article.title,
    draft: Boolean(article.draft),
    optimisedFor: {
      primaryKeyword: primary,
      secondaryKeywords: (article.tags || []).slice(1),
      intent: intentOf(article),
      service: article.service || null,
      serviceLabel: article.service_label || null,
    },
    facts: { words, readingMinutes: readingMinutes(md), leadWords, questionHeadings, faq: faq.length, citations: sources.length, internalLinks: links.length, numbers, ageDays, outline: outline.map((item) => item.text) },
    translations,
    scores: { ...scores, overall: Math.round((scores.seo + scores.aeo + scores.geo) / 3) },
    checks: { seo, aeo, geo },
  };
}

export function analyseAll(articles, context) {
  return articles.map((article) => analyseArticle(article, articles, context));
}

// Translation coverage across the three languages: which article groups miss
// which language. A group is an article plus every pair it names.
export function coverage(articles) {
  const seen = new Set();
  const groups = [];
  for (const article of articles) {
    const key = `${article.lang}/${article.slug}`;
    if (seen.has(key)) continue;
    const members = [article, ...(article.pairs || []).map((pair) => articles.find((other) => other.lang === pair.lang && other.slug === pair.slug)).filter(Boolean)];
    for (const member of members) seen.add(`${member.lang}/${member.slug}`);
    const byLang = Object.fromEntries(WRITING_LANGS.map((lang) => [lang, members.find((member) => member.lang === lang)?.slug || null]));
    groups.push({ title: article.title, primaryKeyword: article.tags?.[0] || "", ...byLang, missing: WRITING_LANGS.filter((lang) => !byLang[lang]) });
  }
  return groups;
}
