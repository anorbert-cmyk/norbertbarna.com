// Writing (Írások) source: content/*.md with a small frontmatter block.
// Shared by scripts/build-writing.mjs (renders the pages) and
// scripts/service-pages.mjs (puts the generated pages in every check inventory).
// No dependency: the Markdown subset below is all the articles need.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENT_DIR = join(ROOT, "content");
export const ORIGIN = "https://www.barnanorbert.com";

// Where each language's section lives. The list page is <dir>/index.html.
export const SECTIONS = {
  hu: { dir: "hu/irasok", path: "/hu/irasok", name: "Írások" },
  en: { dir: "writing", path: "/writing", name: "Writing" },
  de: { dir: "de/wissen", path: "/de/wissen", name: "Wissen" },
};
// The order of list pages, feeds and the sitemap; English is the x-default.
export const WRITING_LANGS = ["en", "hu", "de"];
// A page without a translation in a language leads there anyway: the
// language's list page, or its home while that language has no article.
export const HOME_OF = { en: "index.html", hu: "hu/index.html", de: "de/index.html" };

const FIELDS = ["draft", "title", "description", "lang", "slug", "date", "updated", "pair", "tags", "cover", "cover_alt", "service", "service_label"];
const REQUIRED = ["title", "description", "lang", "slug", "date", "updated"];
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;

function unquote(value) {
  const trimmed = value.trim();
  if (/^".*"$/.test(trimmed)) return JSON.parse(trimmed);
  if (/^'.*'$/.test(trimmed)) return trimmed.slice(1, -1).replaceAll("''", "'");
  return trimmed;
}

// key: value, key: "quoted", key: [a, "b c"]. Nothing else is YAML here.
export function parseFrontmatter(source, file) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`${file}: missing --- frontmatter ---`);
  const data = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const pair = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!pair) throw new Error(`${file}: unreadable frontmatter line: ${line}`);
    const [, key, raw] = pair;
    if (!FIELDS.includes(key)) throw new Error(`${file}: unknown frontmatter field ${key}`);
    if (raw.trim().startsWith("[")) {
      const inner = raw.trim().replace(/^\[|\]$/g, "");
      data[key] = inner.trim() ? inner.split(",").map(unquote).filter(Boolean) : [];
    } else if (raw.trim() === "null" || raw.trim() === "") {
      continue;
    } else if (raw.trim() === "true" || raw.trim() === "false") {
      data[key] = raw.trim() === "true";
    } else {
      data[key] = unquote(raw);
    }
  }
  return { data, body: source.slice(match[0].length) };
}

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export { escapeHtml };

// Heading anchors: ASCII, accents folded (ő -> o), so links stay readable.
export const slugify = (value) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inline(text) {
  const codes = [];
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`);
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const target = href.replaceAll("&amp;", "&");
    const external = /^https?:\/\//.test(target) && !target.startsWith(ORIGIN);
    const url = target.startsWith(ORIGIN) ? target.slice(ORIGIN.length) || "/" : target;
    return external
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : `<a href="${escapeHtml(url)}">${label}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${escapeHtml(codes[Number(index)])}</code>`);
}

// Markdown subset: ## and ### headings, paragraphs, - and 1. lists, > quotes,
// **bold**, *italic*, `code`, [links](/path). A # H1 is refused: the title is the H1.
export function markdownToHtml(markdown, file) {
  const blocks = [];
  const ids = new Set();
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      if (level < 2 || level > 3) throw new Error(`${file}: only ## and ### headings are allowed (the title is the H1)`);
      let id = slugify(heading[2]);
      for (let n = 2; ids.has(id); n++) id = `${slugify(heading[2])}-${n}`;
      ids.add(id);
      blocks.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
      index++;
      continue;
    }
    if (line.startsWith("|") && /^\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[index + 1] || "")) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((cell) => inline(cell.trim()));
      const head = cells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].startsWith("|")) rows.push(cells(lines[index++]));
      blocks.push(`<table><thead><tr>${head.map((cell) => `<th scope="col">${cell}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    const list = line.match(/^(\s*)(?:([-*])|(\d+)\.)\s+/);
    if (list) {
      const ordered = Boolean(list[3]);
      const items = [];
      while (index < lines.length && /^(?:[-*]|\d+\.)\s+/.test(lines[index])) {
        let item = lines[index].replace(/^(?:[-*]|\d+\.)\s+/, "");
        index++;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index])) item += ` ${lines[index++].trim()}`;
        items.push(`<li>${inline(item)}</li>`);
      }
      blocks.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    if (line.startsWith(">")) {
      const quote = [];
      while (index < lines.length && lines[index].startsWith(">")) quote.push(lines[index++].replace(/^>\s?/, ""));
      blocks.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,6}\s|>|\||(?:[-*]|\d+\.)\s)/.test(lines[index])) {
      paragraph.push(lines[index++].trim());
    }
    blocks.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }
  return blocks.join("\n");
}

// Width and height from a baseline or progressive JPEG's SOF marker.
function jpegSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

// Visible text of an HTML fragment, as check-seo reads <main>.
export const htmlText = (html) => html.replace(/<[^>]+>/g, " ")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
  .replace(/\s+/g, " ").trim();

// The article's visible FAQ: an H2 named like FAQ_HEADING, then ### questions,
// each answered by the blocks up to the next heading. Feeds FAQPage schema.
const FAQ_HEADING = /^(?:Gyakori kérdések|Frequently asked questions|Häufige Fragen)\b/i;
export function faqOf(html) {
  const sections = html.split(/(?=<h2\b)/);
  const section = sections.find((part) => FAQ_HEADING.test(htmlText(part.match(/^<h2\b[^>]*>([\s\S]*?)<\/h2>/)?.[1] || "")));
  if (!section) return [];
  return section.split(/(?=<h3\b)/).slice(1).map((part) => {
    const [, question, answer] = part.match(/^<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*)$/);
    return { question: htmlText(question), answer: htmlText(answer) };
  }).filter((item) => item.question && item.answer);
}

export function plainText(markdown) {
  return markdown.replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+|^>\s?|^(?:[-*]|\d+\.)\s+/gm, "").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
}

export const wordCount = (markdown) => plainText(markdown).split(" ").filter(Boolean).length;
// About 200 words a minute; never "0 minutes".
export const readingMinutes = (markdown) => Math.max(1, Math.ceil(wordCount(markdown) / 200));

// The opening paragraph, as plain text: the article's direct answer, which
// the page repeats as the schema abstract for answer engines.
export function leadParagraph(markdown) {
  const first = markdown.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((block) => block.trim()).find((block) => block && !/^(?:#|>|\||[-*]\s|\d+\.\s)/.test(block));
  return first ? plainText(first) : "";
}

// Every external source the article links, once, in order: Article.citation.
export function citations(markdown) {
  const urls = [];
  for (const [, href] of markdown.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    if (!href.startsWith(ORIGIN) && !urls.includes(href)) urls.push(href);
  }
  return urls;
}

// The H2 outline of rendered HTML, for the on-page table of contents.
export const outlineOf = (html) => [...html.matchAll(/<h2\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g)]
  .map(([, id, inner]) => ({ id, text: htmlText(inner) }));

export function articleFile(article) {
  return `${SECTIONS[article.lang].dir}/${article.slug}.html`;
}

// Published articles only; `draft: true` keeps a file in content/ without
// output (its frontmatter is still validated). includeDrafts lists both.
export function loadArticles({ root = ROOT, includeDrafts = false } = {}) {
  const dir = join(root, "content");
  if (!existsSync(dir)) return [];
  const articles = [];
  for (const name of readdirSync(dir).filter((entry) => entry.endsWith(".md")).sort()) {
    const file = `content/${name}`;
    const { data, body } = parseFrontmatter(readFileSync(join(dir, name), "utf8"), file);
    for (const key of REQUIRED) if (!data[key]) throw new Error(`${file}: frontmatter needs ${key}`);
    if (!SECTIONS[data.lang]) throw new Error(`${file}: lang must be en, hu or de`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) throw new Error(`${file}: slug must be lowercase ASCII words joined by hyphens`);
    if (data.slug === "index" || data.slug === "feed") throw new Error(`${file}: slug ${data.slug} is reserved`);
    for (const key of ["date", "updated"]) {
      if (!DATE_TIME.test(data[key]) || !Number.isFinite(Date.parse(data[key]))) {
        throw new Error(`${file}: ${key} must be a full date-time with timezone, e.g. 2026-10-21T18:00:00+02:00`);
      }
    }
    if (Date.parse(data.date) > Date.parse(data.updated)) throw new Error(`${file}: updated predates date`);
    if (data.title.length > 60) throw new Error(`${file}: title is ${data.title.length} characters; keep it to 60`);
    if (data.description.length < 105 || data.description.length > 135) {
      throw new Error(`${file}: description is ${data.description.length} characters; keep it between 105 and 135`);
    }
    if (Boolean(data.cover) !== Boolean(data.cover_alt)) throw new Error(`${file}: cover and cover_alt go together`);
    if (data.cover) {
      const cover = join(root, data.cover.replace(/^\//, ""));
      if (!existsSync(cover)) throw new Error(`${file}: cover ${data.cover} does not exist`);
      const size = jpegSize(readFileSync(cover));
      if (!size || size.width !== 1200 || size.height !== 630) throw new Error(`${file}: cover must be a 1200x630 JPEG (the social preview size)`);
    }
    if (!data.tags || data.tags.length < 3 || data.tags.length > 8) throw new Error(`${file}: tags needs 3 to 8 terms (they become meta keywords)`);
    if (new Set(data.tags.map((tag) => tag.toLowerCase())).size !== data.tags.length) throw new Error(`${file}: tags repeat a term`);
    if (Boolean(data.service) !== Boolean(data.service_label)) throw new Error(`${file}: service and service_label go together`);
    if (/^#\s/m.test(body)) throw new Error(`${file}: remove the # heading; the title is the H1`);
    // `pair` names the translations as lang/slug entries (one or a list).
    // A bare slug is the article's pair in the other of hu and en.
    const pairs = [data.pair].flat().filter(Boolean).map((entry) => {
      const [lang, slug] = entry.includes("/") ? entry.split("/") : [data.lang === "hu" ? "en" : "hu", entry];
      if (!SECTIONS[lang] || lang === data.lang || !slug) throw new Error(`${file}: pair ${entry} must be <other language>/<slug>`);
      return { lang, slug };
    });
    if (new Set(pairs.map((pair) => pair.lang)).size !== pairs.length) throw new Error(`${file}: one pair per language`);
    articles.push({ ...data, pairs, tags: data.tags || [], source: file, markdown: body.trim() });
  }
  if (!includeDrafts) {
    for (let i = articles.length - 1; i >= 0; i--) if (articles[i].draft) articles.splice(i, 1);
  }
  const bySlug = new Map();
  for (const article of articles) {
    const key = `${article.lang}/${article.slug}`;
    if (bySlug.has(key)) throw new Error(`${article.source}: slug ${article.slug} is also used by ${bySlug.get(key).source}`);
    bySlug.set(key, article);
  }
  // Every pair names a published article, which names this one back, and
  // the translations of a translation are listed too (one closed group).
  for (const article of articles) {
    for (const pair of article.pairs) {
      const other = bySlug.get(`${pair.lang}/${pair.slug}`);
      if (!other) throw new Error(`${article.source}: pair ${pair.lang}/${pair.slug} has no published article`);
      if (!other.pairs.some((back) => back.lang === article.lang && back.slug === article.slug)) {
        throw new Error(`${article.source}: pair must be reciprocal (${other.source} does not name ${article.lang}/${article.slug})`);
      }
      for (const third of other.pairs) {
        if (third.lang !== article.lang && !article.pairs.some((pair) => pair.lang === third.lang && pair.slug === third.slug)) {
          throw new Error(`${article.source}: must also name ${third.lang}/${third.slug}, a translation of ${other.source}`);
        }
      }
    }
  }
  // Newest first: the order of list pages, feeds and the sitemap.
  return articles.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.slug.localeCompare(b.slug));
}

// Generated page inventory for the checks: list pages first, then articles.
export function writingPages(articles = loadArticles()) {
  const pages = [];
  for (const lang of WRITING_LANGS) {
    const own = articles.filter((article) => article.lang === lang);
    if (!own.length) continue;
    pages.push(`${SECTIONS[lang].dir}/index.html`, ...own.map(articleFile));
  }
  return pages;
}

// For each generated page, per other language: its destination there and
// whether that destination is a true translation (rel="alternate" + hreflang)
// or only that language's list page (or home, while it has no article).
export function writingLanguageLinks(articles = loadArticles()) {
  const links = {};
  const hasLang = (lang) => articles.some((article) => article.lang === lang);
  const fallback = (lang) => hasLang(lang) ? { file: `${SECTIONS[lang].dir}/index.html`, alternate: false } : { file: HOME_OF[lang], alternate: false };
  for (const lang of WRITING_LANGS) {
    if (!hasLang(lang)) continue;
    links[`${SECTIONS[lang].dir}/index.html`] = Object.fromEntries(WRITING_LANGS.filter((other) => other !== lang)
      .map((other) => [other, hasLang(other) ? { file: `${SECTIONS[other].dir}/index.html`, alternate: true } : fallback(other)]));
  }
  for (const article of articles) {
    links[articleFile(article)] = Object.fromEntries(WRITING_LANGS.filter((other) => other !== article.lang).map((other) => {
      const pair = article.pairs.find((pair) => pair.lang === other);
      return [other, pair ? { file: `${SECTIONS[other].dir}/${pair.slug}.html`, alternate: true } : fallback(other)];
    }));
  }
  return links;
}
