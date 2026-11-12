// Reads and validates the site's content for the admin. Articles are the
// Markdown files in content/ (the same source scripts/build-writing.mjs
// renders); pages are the hand-authored HTML files. Nothing here writes to
// the repository: publishing goes through lib/admin/github.js.
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COVER_DIR = "assets/images/og/writing";
const MAX_SOURCE_BYTES = 200 * 1024;
const MAX_COVER_BYTES = 600 * 1024;

const writing = () => import("../../scripts/writing-content.mjs");
const insights = () => import("./insights.mjs");

const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const readIfPresent = (file) => (fs.existsSync(path.join(ROOT, file)) ? read(file) : "");

// A throwaway copy of content/ (plus the covers the articles name) so a
// candidate article can be checked by the real loader without touching the
// deployed files.
function withCandidateRoot({ files = {}, removed = [], covers = {} }, run) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "admin-validate-"));
  try {
    fs.mkdirSync(path.join(tmp, "content"));
    for (const name of fs.readdirSync(path.join(ROOT, "content"))) {
      if (name.endsWith(".md") && !removed.includes(name)) fs.copyFileSync(path.join(ROOT, "content", name), path.join(tmp, "content", name));
    }
    for (const [name, source] of Object.entries(files)) fs.writeFileSync(path.join(tmp, "content", name), source);
    fs.mkdirSync(path.join(tmp, COVER_DIR), { recursive: true });
    for (const name of fs.existsSync(path.join(ROOT, COVER_DIR)) ? fs.readdirSync(path.join(ROOT, COVER_DIR)) : []) {
      fs.copyFileSync(path.join(ROOT, COVER_DIR, name), path.join(tmp, COVER_DIR, name));
    }
    for (const [name, bytes] of Object.entries(covers)) fs.writeFileSync(path.join(tmp, COVER_DIR, name), bytes);
    return run(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Measured market data per article (search volume, Google rank, AI citations),
// written by the reach audit into docs/article-seo.json. Optional.
function marketData() {
  try {
    const sheet = JSON.parse(read("docs/article-seo.json"));
    const bySource = new Map((sheet.articles || []).map((entry) => [entry.source, entry]));
    return { measured: sheet.measured || null, bySource };
  } catch {
    return { measured: null, bySource: new Map() };
  }
}

async function listArticles() {
  const { loadArticles } = await writing();
  const { analyseAll, coverage } = await insights();
  const articles = loadArticles({ includeDrafts: true });
  const context = { llms: readIfPresent("llms.txt"), sitemap: readIfPresent("sitemap.xml") };
  const market = marketData();
  const marketOf = (source) => {
    const entry = market.bySource.get(source);
    if (!entry) return null;
    return {
      market: entry.optimizedFor?.market || null,
      monthlySearches: Number.isFinite(entry.optimizedFor?.monthlySearches) ? entry.optimizedFor.monthlySearches : null,
      googleRank: Number.isFinite(entry.googleRank) ? entry.googleRank : entry.googleRank?.position ?? null,
      aiOverviewCitation: entry.geo?.aiOverviewCitation === true,
      llmMentions: Number.isFinite(entry.geo?.llmMentions) ? entry.geo.llmMentions : null,
    };
  };
  return {
    measured: market.measured,
    articles: analyseAll(articles, context).map((analysis, index) => ({
      ...analysis,
      market: marketOf(articles[index].source),
      file: articles[index].source,
      description: articles[index].description,
      date: articles[index].date,
      updated: articles[index].updated,
      cover: articles[index].cover || null,
      tags: articles[index].tags,
    })),
    coverage: coverage(articles.filter((article) => !article.draft)),
  };
}

function articleSource(file) {
  const name = path.basename(String(file || ""));
  if (!/^[a-z0-9-]+\.md$/.test(name) || !fs.existsSync(path.join(ROOT, "content", name))) return null;
  return { file: `content/${name}`, source: read(`content/${name}`) };
}

// Frontmatter fields and body of a source, for the editor's form.
async function parseSource(source) {
  const { parseFrontmatter } = await writing();
  const { data, body } = parseFrontmatter(String(source).replace(/\r\n?/g, "\n"), "cikk");
  return { data, body: body.replace(/^\n+/, "") };
}

function decodeCover(cover) {
  if (!cover) return null;
  const name = String(cover.name || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.jpg$/.test(name)) throw new Error("A borítókép neve kisbetűs, kötőjeles .jpg legyen (pl. cikk-cime.jpg).");
  const bytes = Buffer.from(String(cover.base64 || ""), "base64");
  if (!bytes.length || bytes.length > MAX_COVER_BYTES) throw new Error("A borítókép legfeljebb 600 KB-os JPEG lehet.");
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("A borítókép JPEG formátumú legyen.");
  return { name, bytes, path: `${COVER_DIR}/${name}` };
}

/**
 * Checks one candidate article against every rule the build enforces.
 * @param {{ source: string, previousFile?: string, cover?: { name: string, base64: string } }} input
 * @returns {Promise<{ ok: boolean, error?: string, file?: string, analysis?: object, html?: string, article?: object, cover?: object }>}
 */
async function validateArticle({ source, previousFile, cover }) {
  if (typeof source !== "string" || !source.trim()) return { ok: false, error: "A cikk forrása üres." };
  if (Buffer.byteLength(source) > MAX_SOURCE_BYTES) return { ok: false, error: "A cikk forrása túl nagy (legfeljebb 200 KB)." };
  const normalized = source.replace(/\r\n?/g, "\n");
  const { loadArticles, parseFrontmatter, markdownToHtml } = await writing();
  const { analyseArticle } = await insights();
  let data;
  let image = null;
  try {
    ({ data } = parseFrontmatter(normalized, "cikk"));
    image = decodeCover(cover);
  } catch (error) {
    return { ok: false, error: error.message };
  }
  if (!SLUG.test(String(data.slug || ""))) return { ok: false, error: "A slug kisbetűs ASCII szavakból álljon, kötőjellel elválasztva." };
  const file = `${data.slug}.md`;
  const previous = previousFile ? path.basename(previousFile) : null;
  if (previous && !/^[a-z0-9-]+\.md$/.test(previous)) return { ok: false, error: "Érvénytelen fájlnév." };
  if (!previous && fs.existsSync(path.join(ROOT, "content", file))) return { ok: false, error: `Már létezik cikk ezzel a sluggal: ${data.slug}.` };
  if (previous && previous !== file && fs.existsSync(path.join(ROOT, "content", file))) return { ok: false, error: `Már létezik cikk ezzel a sluggal: ${data.slug}.` };
  try {
    return withCandidateRoot({ files: { [file]: normalized }, removed: previous && previous !== file ? [previous] : [], covers: image ? { [image.name]: image.bytes } : {} }, (root) => {
      // Twice on purpose: with drafts (every file is well formed) and without
      // (the published set still pairs up once this article is in or out).
      const all = loadArticles({ root, includeDrafts: true });
      loadArticles({ root });
      const article = all.find((entry) => entry.source === `content/${file}`);
      const analysis = analyseArticle(article, all, { llms: "", sitemap: "" });
      return {
        ok: true,
        file: `content/${file}`,
        previousFile: previous && previous !== file ? `content/${previous}` : null,
        source: normalized.endsWith("\n") ? normalized : `${normalized}\n`,
        analysis,
        html: markdownToHtml(article.markdown, article.source, article.lang),
        article: { title: article.title, description: article.description, lang: article.lang, slug: article.slug, draft: Boolean(article.draft) },
        cover: image ? { path: image.path, base64: image.bytes.toString("base64") } : null,
      };
    });
  } catch (error) {
    return { ok: false, error: translateError(error.message) };
  }
}

// Whether the published set stays consistent once a file is gone (pairs).
async function validateRemoval(file) {
  const name = path.basename(String(file || ""));
  if (!/^[a-z0-9-]+\.md$/.test(name) || !fs.existsSync(path.join(ROOT, "content", name))) return { ok: false, error: "Nincs ilyen cikk." };
  const { loadArticles } = await writing();
  try {
    return withCandidateRoot({ removed: [name] }, (root) => {
      loadArticles({ root });
      return { ok: true, file: `content/${name}` };
    });
  } catch (error) {
    return { ok: false, error: translateError(error.message) };
  }
}

// The build's messages are English and written for a terminal; the admin
// shows the most common ones in Hungarian and keeps the original after it.
const ERRORS = [
  [/title is (\d+) characters; keep it to 60/, (m) => `A cím ${m[1]} karakter; legfeljebb 60 lehet.`],
  [/description is (\d+) characters; keep it between 105 and 135/, (m) => `A leírás ${m[1]} karakter; 105 és 135 között legyen.`],
  [/the primary keyword "(.+)" \(first tag\) is missing from the (.+)$/, (m) => `A fő kulcsszó („${m[1]}”, az első címke) hiányzik innen: ${({ title: "cím", description: "leírás", "opening paragraph": "első bekezdés", cover_alt: "borítókép alt szövege" })[m[2]] || m[2]}.`],
  [/no dash as punctuation/, () => "Gondolatjel nem használható írásjelként; írd át vesszővel, kettősponttal vagy ponttal."],
  [/use the language's quotation marks/, () => "A nyelv saját idézőjeleit használd („” magyar, „“ német, “” angol), ne egyenes idézőjelet."],
  [/write dates in words/, () => "A dátumokat szavakkal írd (2026. október 21.), ne számokkal."],
  [/at least one ## heading should be a question/, () => "Legalább egy ## alcím legyen kérdés, amire az emberek rákeresnek."],
  [/tags needs 3 to 8 terms/, () => "3–8 címke kell (ezekből lesznek a meta kulcsszavak)."],
  [/cover must be a 1200x630 JPEG/, () => "A borítókép 1200×630 képpontos JPEG legyen."],
  [/cover (.+) does not exist/, (m) => `A borítókép nem található: ${m[1]}. Töltsd fel a szerkesztőben.`],
  [/pair (.+) has no published article/, (m) => `A megadott fordítás (${m[1]}) nem létező vagy nem közzétett cikk.`],
  [/pair must be reciprocal \((.+) does not name (.+)\)/, (m) => `A fordításpár kölcsönös kell legyen: a ${m[1]} fájlban is add meg ezt: ${m[2]}.`],
  [/remove the # heading/, () => "Töröld a # címsort; a cím maga a H1."],
  [/only ## and ### headings are allowed/, () => "Csak ## és ### alcímek használhatók."],
  [/frontmatter needs (\w+)/, (m) => `Hiányzó kötelező mező: ${m[1]}.`],
  [/(date|updated) must be a full date-time/, (m) => `A ${m[1]} mező teljes dátum-idő legyen időzónával, pl. 2026-10-21T18:00:00+02:00.`],
  [/updated predates date/, () => "A frissítés dátuma nem lehet korábbi a megjelenésnél."],
];
function translateError(message) {
  const text = String(message || "").replace(/^content\/[^:]+:\s*/, "");
  for (const [pattern, render] of ERRORS) {
    const match = text.match(pattern);
    if (match) return render(match);
  }
  return text;
}

// Hand-authored pages with the metadata search engines read.
function listPages() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (["hu", "de", "work", "writing", "hu/munka", "hu/irasok", "de/arbeit", "de/wissen"].includes(rel)) walk(rel);
      } else if (entry.name.endsWith(".html") && !/(?:^|\/)404\.html$/.test(rel)) files.push(rel);
    }
  };
  walk("");
  const pick = (html, pattern) => (html.match(pattern)?.[1] || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").trim();
  return files.sort().map((file) => {
    const html = read(file);
    const canonical = pick(html, /<link rel="canonical" href="([^"]+)"/);
    const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] || "";
    const words = main.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    const title = pick(html, /<title>([\s\S]*?)<\/title>/);
    const description = pick(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/) || pick(html, /<meta[^>]+content="([^"]*)"[^>]+name="description"/);
    const kind = /^(?:hu\/irasok|writing|de\/wissen)\//.test(file) ? (/index\.html$/.test(file) ? "lista" : "cikk")
      : /^(?:work|hu\/munka|de\/arbeit)\//.test(file) ? "esettanulmány"
        : /privacy|adatvedelem|datenschutz/.test(file) ? "jogi" : "oldal";
    return {
      file,
      path: canonical ? canonical.replace("https://www.barnanorbert.com", "") || "/" : `/${file.replace(/(?:\/?index)?\.html$/, "")}`,
      lang: pick(html, /<html[^>]+lang="([^"]+)"/) || "en",
      kind,
      title,
      titleLength: title.length,
      description,
      descriptionLength: description.length,
      h1: pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, "").replace(/&shy;/g, "").replace(/\s+/g, " "),
      words,
      hreflang: [...html.matchAll(/hreflang="([^"]+)"/g)].map((match) => match[1]).filter((value, index, list) => list.indexOf(value) === index),
      schema: [...html.matchAll(/"@type":\s*"([A-Za-z]+)"/g)].map((match) => match[1]).filter((value, index, list) => list.indexOf(value) === index).slice(0, 8),
      indexable: !/<meta[^>]+name="robots"[^>]+noindex/i.test(html),
    };
  });
}

module.exports = { listArticles, articleSource, parseSource, validateArticle, validateRemoval, listPages, translateError, ROOT };
