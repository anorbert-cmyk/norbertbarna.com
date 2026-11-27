// Search and Markdown for agents.
//
// Two conventions AI agents already look for (Cloudflare ships both at its
// edge; this site is not behind Cloudflare, so the server answers them itself):
//
//   1. /.well-known/search?q=...  (GET, or HTTP QUERY with the question in the
//      body). Returns the most relevant passages of the site as Markdown, not
//      a generated answer. Every page advertises it in <meta name="agent:*">.
//   2. Accept: text/markdown on any page URL returns that page as Markdown,
//      with the same discovery block in YAML front matter.
//
// The index is built once, in memory, from the pages the sitemap lists. No
// model, no network, no storage: ranking is BM25 over the page text.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://www.barnanorbert.com";
const SEARCH_PATH = "/.well-known/search";
const AGENT = {
  instructions:
    "Use this search API to find relevant content across this site with keywords or natural-language queries, instead of crawling individual pages. Results are returned in Markdown.",
  endpoint: `${ORIGIN}${SEARCH_PATH}?q={query}`,
  method: "GET",
  documentation: `${ORIGIN}/llms.txt`,
};
// The exact tags every page carries in its <head>; scripts/check-seo.mjs and
// scripts/build-writing.mjs read this so the pages and the server never drift.
const AGENT_META = Object.entries(AGENT)
  .map(([key, value]) => `<meta content="${value}" name="agent:${key}"/>`)
  .join("");

const MAX_QUERY = 500;
const MAX_RESULTS = 10;
const MAX_PER_PAGE = 2;
const MAX_PASSAGE = 1600;

// ---- HTML to Markdown --------------------------------------------------------
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", copy: "©", shy: "" };
function decode(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    const value = ENTITIES[name.toLowerCase()];
    return value === undefined ? whole : value;
  }).replace(/­/g, "");
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// Not content for a reader who cannot see the page: code, decoration, media
// chrome, controls and the form (its labels say nothing without its fields).
const SKIP = new Set(["script", "style", "svg", "noscript", "template", "video", "audio", "picture", "canvas", "iframe", "button", "form", "nav", "dialog", "select", "textarea"]);
// Inline formatting keeps the words on both sides together; any other inline
// wrapper (span, time, small) separates what it holds from its neighbours.
const INLINE = new Set(["a", "strong", "b", "em", "i", "code", "sup", "sub", "u", "mark", "abbr", "s", "q", "cite", "wbr"]);
const BLOCK = new Set(["p", "div", "section", "article", "header", "footer", "aside", "figure", "figcaption", "ul", "ol", "dl", "table", "blockquote", "address", "details", "main", "hgroup"]);
const TABLE_PART = new Set(["thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup"]);

function attribute(tag, name) {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match ? decode(match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function absolute(href) {
  if (!href || /^(?:javascript|data):/i.test(href)) return "";
  if (href.startsWith("#")) return "";
  if (href.startsWith("/")) return `${ORIGIN}${href}`;
  return href;
}

function htmlToMarkdown(html) {
  const out = [];
  const stack = []; // { name, skip, link }
  let skipDepth = 0;
  let listDepth = 0;
  let cell = null; // text of the table cell being read
  let row = null;
  const emit = (text) => {
    if (skipDepth) return;
    if (cell !== null) cell += text;
    else out.push(text);
  };
  const tokens = html.replace(/<!--[\s\S]*?-->/g, "").split(/(<[^>]+>)/);
  for (const token of tokens) {
    if (!token) continue;
    if (token[0] !== "<") {
      if (!skipDepth) emit(decode(token).replace(/\s+/g, " "));
      continue;
    }
    const closing = token[1] === "/";
    const name = (/^<\/?\s*([a-z0-9]+)/i.exec(token)?.[1] || "").toLowerCase();
    if (!name) continue;
    if (!closing) {
      const hidden = /\saria-hidden\s*=\s*["']?true/i.test(token) || /\shidden(?:[\s=>/]|$)/i.test(token);
      // "More articles" and "Other projects" teasers repeat other pages.
      const teaser = name === "aside" && /\sclass\s*=\s*["'][^"']*related/i.test(token);
      const skip = SKIP.has(name) || hidden || teaser;
      const selfClosed = VOID.has(name) || /\/>$/.test(token);
      if (name === "br") emit(stack.some((entry) => /^h[1-6]$/.test(entry.name)) ? " " : "\n");
      if (name === "hr") emit("\n\n---\n\n");
      if (selfClosed) continue;
      const entry = { name, skip };
      stack.push(entry);
      if (skip) {
        skipDepth += 1;
        continue;
      }
      if (skipDepth) continue;
      if (/^h[1-6]$/.test(name)) emit(`\n\n${"#".repeat(Number(name[1]))} `);
      else if (name === "li") emit(`\n${"  ".repeat(Math.max(0, listDepth - 1))}- `);
      else if (name === "ul" || name === "ol") {
        listDepth += 1;
        emit("\n");
      } else if (name === "tr") row = [];
      else if (name === "td" || name === "th") cell = "";
      else if (name === "a") {
        entry.link = absolute(attribute(token, "href"));
        entry.start = cell !== null ? cell.length : out.length;
        entry.inCell = cell !== null;
      } else if (name === "strong" || name === "b") emit("**");
      else if (name === "em" || name === "i") emit("*");
      else if (name === "code") emit("`");
      else if (name === "blockquote") emit("\n\n> ");
      else if (name === "summary" || name === "dt") emit("\n\n**");
      else if (name === "dd") emit("\n");
      else if (BLOCK.has(name)) emit("\n\n");
      else if (!INLINE.has(name) && !TABLE_PART.has(name)) emit(" ");
      continue;
    }
    // Closing tag: unwind to the matching open element (tolerates stray tags).
    let index = stack.length - 1;
    while (index >= 0 && stack[index].name !== name) index -= 1;
    if (index < 0) continue;
    while (stack.length > index) {
      const entry = stack.pop();
      if (entry.skip) {
        skipDepth -= 1;
        continue;
      }
      if (skipDepth) continue;
      const tag = entry.name;
      if (/^h[1-6]$/.test(tag)) emit("\n\n");
      else if (tag === "ul" || tag === "ol") {
        listDepth = Math.max(0, listDepth - 1);
        emit("\n");
      } else if (tag === "td" || tag === "th") {
        if (row && cell !== null) row.push(cell.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim());
        cell = null;
      } else if (tag === "tr") {
        if (row && row.length) {
          const header = stackHas(stack, "thead");
          out.push(`\n| ${row.join(" | ")} |`);
          if (header) out.push(`\n| ${row.map(() => "---").join(" | ")} |`);
        }
        row = null;
      } else if (tag === "a") {
        if (!entry.link) continue;
        // Take back what the link holds and write it as one Markdown link; a
        // link around whole blocks (a card) keeps its blocks and names its
        // target on a line of its own.
        let inner;
        if (entry.inCell && cell !== null) {
          inner = cell.slice(entry.start);
          cell = cell.slice(0, entry.start);
        } else {
          inner = out.splice(entry.start).join("");
        }
        const text = inner.trim();
        if (!text) continue;
        if (/\n\s*\n/.test(text)) emit(`\n\n${text}\n\n${entry.link}\n\n`);
        else emit(`${/^\s/.test(inner) ? " " : ""}[${text.replace(/\s+/g, " ")}](${entry.link})${/\s$/.test(inner) ? " " : ""}`);
      } else if (tag === "strong" || tag === "b") emit("**");
      else if (tag === "em" || tag === "i") emit("*");
      else if (tag === "code") emit("`");
      else if (tag === "summary" || tag === "dt") emit("**\n\n");
      else if (BLOCK.has(tag)) emit("\n\n");
      else if (tag === "caption") emit("\n\n");
      else if (!INLINE.has(tag) && !TABLE_PART.has(tag)) emit(" ");
    }
  }
  return tidy(out.join(""));
}

function stackHas(stack, name) {
  return stack.some((entry) => entry.name === name);
}

function tidy(markdown) {
  return markdown
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/^[ \t]*-[ \t]*\n+(?=\S)/gm, "")
    .replace(/ +([,.;:!?])(?=\s|$)/g, "$1")
    .replace(/\[\s*\]\([^)]*\)/g, "")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]\(/g, "](")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+(?=\S)(?![-|])/g, "\n")
    .replace(/^(#{1,6}) +/gm, "$1 ")
    .replace(/^#{1,6}\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

// ---- pages -------------------------------------------------------------------
function pageFile(urlPath) {
  if (urlPath === "/") return "index.html";
  const clean = urlPath.replace(/^\//, "");
  const direct = path.join(ROOT, `${clean}.html`);
  if (fs.existsSync(direct)) return `${clean}.html`;
  const index = path.join(ROOT, clean, "index.html");
  return fs.existsSync(index) ? path.join(clean, "index.html") : null;
}

function meta(html, name) {
  const tag = new RegExp(`<meta\\b[^>]*\\bname=["']${name}["'][^>]*>`, "i").exec(html)?.[0];
  return tag ? attribute(tag, "content") || "" : "";
}

function loadPage(urlPath) {
  const file = pageFile(urlPath);
  if (!file) return null;
  const html = fs.readFileSync(path.join(ROOT, file), "utf8");
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1];
  if (!main) return null;
  return {
    path: urlPath,
    url: `${ORIGIN}${urlPath === "/" ? "/" : urlPath}`,
    lang: /<html\b[^>]*\blang=["']([a-z-]+)["']/i.exec(html)?.[1] || "en",
    title: decode(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "").trim(),
    description: meta(html, "description"),
    markdown: htmlToMarkdown(main),
  };
}

function sitemapPaths() {
  const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
  const paths = new Set();
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    if (!match[1].startsWith(ORIGIN)) continue;
    paths.add(match[1].slice(ORIGIN.length) || "/");
  }
  return [...paths];
}

// ---- index ---------------------------------------------------------------
// Words that carry no topic in the three languages of the site.
const STOP = new Set(
  ("a an and are as at be but by can do does for from how i in is it my of on or that the this to was what when where which who why will with you your " +
    "az egy es is hogy nem meg de ha vagy mit mi ki mikor hol hogyan miert van volt lesz ez azt ezt en te mint csak mar meg kell lehet " +
    "der die das ein eine einer und oder ist sind war wie was wer wo wann warum mit von zu im in den dem des fur auf nicht ich sie es man auch")
    .split(" ")
);

function fold(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");
}

function tokenize(text) {
  return fold(text).split(/[^a-z0-9]+/).filter((token) => token.length > 1 && !STOP.has(token));
}

// One passage per h1/h2 section, so a result is a self-contained answer.
function passages(page) {
  const parts = [];
  let heading = "";
  let lines = [];
  const flush = () => {
    const text = lines.join("\n").trim();
    if (text.replace(/^#+ .*$/gm, "").trim().length > 40) parts.push({ heading, text });
    lines = [];
  };
  for (const line of page.markdown.split("\n")) {
    const match = /^(#{1,2}) (.+)$/.exec(line);
    if (match) {
      flush();
      heading = match[2].replace(/[*`]/g, "").trim();
    }
    lines.push(line);
  }
  flush();
  return parts;
}

let cached = null;
function index() {
  if (cached) return cached;
  const pages = new Map();
  const docs = [];
  const postings = new Map(); // term -> Map(doc index -> weighted frequency)
  for (const urlPath of sitemapPaths()) {
    let page = null;
    try {
      page = loadPage(urlPath);
    } catch {
      page = null;
    }
    if (!page) continue;
    pages.set(urlPath, page);
    for (const passage of passages(page)) {
      const id = docs.length;
      const frequencies = new Map();
      const add = (text, weight) => {
        for (const token of tokenize(text)) frequencies.set(token, (frequencies.get(token) || 0) + weight);
      };
      add(passage.text, 1);
      // A page's own title and the section heading say what the passage is about.
      add(page.title, 2);
      add(passage.heading, 2);
      add(page.description, 1);
      let length = 0;
      for (const [term, count] of frequencies) {
        length += count;
        if (!postings.has(term)) postings.set(term, new Map());
        postings.get(term).set(id, count);
      }
      docs.push({ page, heading: passage.heading, text: passage.text, length });
    }
  }
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length);
  cached = { pages, docs, postings, average, terms: [...postings.keys()] };
  return cached;
}

// Hungarian and German inflect and compound heavily; a query word also counts,
// at half weight, for index words that share a long enough stem with it.
function related(term, terms) {
  const matches = [];
  if (term.length < 4) return matches;
  for (const other of terms) {
    if (other === term) continue;
    const shared = Math.min(term.length, other.length);
    if (shared < 4) continue;
    if (other.startsWith(term) || (term.length >= 6 && term.startsWith(other) && other.length >= 5)) matches.push(other);
    else if (shared >= 7 && other.slice(0, shared - 2) === term.slice(0, shared - 2)) matches.push(other);
  }
  return matches;
}

// The site says the same things in three languages. A query that shows its
// language gets that language first; one that does not gets English, the
// x-default of every page.
const LANGUAGE_WORDS = {
  en: new Set("the and what how who is are does do with for of in to which when why can should".split(" ")),
  hu: new Set("az egy es hogy nem mit mi ki mikor hol hogyan miert van mennyibe kerul mennyi melyik kell lehet vagy".split(" ")),
  de: new Set("der die das ein eine und oder ist sind wie was wer wo wann warum mit von fur nicht kostet welche".split(" ")),
};
function queryLanguage(query) {
  const counts = { en: 0, hu: 0, de: 0 };
  if (/[áéíóőúű]/i.test(query)) counts.hu += 2;
  if (/[äß]/i.test(query)) counts.de += 2;
  for (const word of fold(query).split(/[^a-z0-9]+/)) {
    for (const lang of Object.keys(counts)) if (LANGUAGE_WORDS[lang].has(word)) counts[lang] += 1;
  }
  const [first, second] = Object.entries(counts).sort((x, y) => y[1] - x[1]);
  return first[1] > second[1] ? { lang: first[0], boost: 1.5 } : { lang: "en", boost: 1.1 };
}

// Index pages repeat the title and summary of every page they list; the page
// itself is the better answer.
const LIST_PAGE = /^\/(?:works|writing|hu\/munkak|hu\/irasok|de\/arbeiten|de\/wissen)$/;

function search(query) {
  const { docs, postings, average, terms } = index();
  const scores = new Map();
  const k1 = 1.4;
  const b = 0.75;
  for (const term of new Set(tokenize(query))) {
    // Per passage, the best of the word itself and its related forms: three
    // inflections of one word are still one match.
    const best = new Map();
    const rarity = (list) => Math.log(1 + (docs.length - list.size + 0.5) / (list.size + 0.5));
    // A rare inflection of a common word is still the common word.
    const own = postings.has(term) ? rarity(postings.get(term)) : Infinity;
    const score = (candidate, weight) => {
      const list = postings.get(candidate);
      if (!list) return;
      const idf = Math.min(own, rarity(list));
      for (const [id, frequency] of list) {
        const doc = docs[id];
        const tf = (frequency * (k1 + 1)) / (frequency + k1 * (1 - b + (b * doc.length) / average));
        const value = weight * idf * tf;
        if (value > (best.get(id) || 0)) best.set(id, value);
      }
    };
    score(term, 1);
    for (const other of related(term, terms)) score(other, 0.5);
    for (const [id, value] of best) scores.set(id, (scores.get(id) || 0) + value);
  }
  const preferred = queryLanguage(query);
  for (const [id, value] of scores) {
    const page = docs[id].page;
    let factor = page.lang === preferred.lang ? preferred.boost : 1;
    if (LIST_PAGE.test(page.path)) factor *= 0.8;
    scores.set(id, value * factor);
  }
  const ranked = [...scores.entries()].sort((a, b2) => b2[1] - a[1]);
  const perPage = new Map();
  const results = [];
  for (const [id, value] of ranked) {
    const doc = docs[id];
    const used = perPage.get(doc.page.path) || 0;
    if (used >= MAX_PER_PAGE) continue;
    perPage.set(doc.page.path, used + 1);
    results.push({ doc, score: value });
    if (results.length >= MAX_RESULTS) break;
  }
  const top = results[0]?.score || 1;
  return results.map((result) => ({ ...result, score: result.score / top }));
}

function clip(text) {
  if (text.length <= MAX_PASSAGE) return text;
  const cut = text.slice(0, MAX_PASSAGE);
  const stop = Math.max(cut.lastIndexOf("\n\n"), cut.lastIndexOf(". "));
  return `${cut.slice(0, stop > MAX_PASSAGE / 2 ? stop + 1 : MAX_PASSAGE).trim()} …`;
}

function renderResults(query, results) {
  const shown = query.replace(/\s+/g, " ").replace(/"/g, "'");
  const lines = [`# Search results for: "${shown}"`, ""];
  if (!results.length) {
    lines.push("No matching content on this site.", "", `Site guide: ${ORIGIN}/llms.txt`);
    return `${lines.join("\n")}\n`;
  }
  results.forEach(({ doc, score }, position) => {
    if (position) lines.push("---", "");
    lines.push(`## ${doc.page.url} (score: ${score.toFixed(3)})`, "");
    lines.push(`Page: ${doc.page.title}`);
    if (doc.heading) lines.push(`Section: ${doc.heading}`);
    lines.push(`Language: ${doc.page.lang}`, "", clip(doc.text), "");
  });
  return `${lines.join("\n")}\n`;
}

// ---- HTTP --------------------------------------------------------------------
function yamlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s+/g, " ")}"`;
}

function frontMatter(page) {
  return [
    "---",
    `title: ${yamlString(page.title)}`,
    `description: ${yamlString(page.description)}`,
    `url: ${yamlString(page.url)}`,
    `lang: ${yamlString(page.lang)}`,
    "agent:",
    ...Object.entries(AGENT).map(([key, value]) => `  ${key}: ${yamlString(value)}`),
    "---",
    "",
  ].join("\n");
}

function pageMarkdown(urlPath) {
  const page = index().pages.get(urlPath);
  return page ? `${frontMatter(page)}\n${page.markdown}\n` : null;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    // An oversized body is read to its end and thrown away, so the client
    // receives the 413 instead of a reset connection.
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    req.on("end", () => (size > limit ? reject(Object.assign(new Error("too large"), { status: 413 })) : resolve(Buffer.concat(chunks).toString("utf8"))));
    req.on("error", reject);
  });
}

function sendMarkdown(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "text/markdown; charset=utf-8");
  res.send(body);
}

const USAGE = [
  "# Site search for agents",
  "",
  "Send a keyword or natural-language query; the answer is the most relevant passages of this site in Markdown (retrieved text with source URLs, not a generated answer). Content is in English, Hungarian and German.",
  "",
  `- GET ${ORIGIN}${SEARCH_PATH}?q=your+question`,
  `- QUERY ${ORIGIN}${SEARCH_PATH} with the question as a text/plain body, or as JSON {"q":"your question"}`,
  "",
  `Site guide: ${ORIGIN}/llms.txt`,
  "",
].join("\n");

// Mounted at /.well-known/search.
function searchHandler() {
  return async (req, res) => {
    // Public, read-only text: any agent, including one running in a browser,
    // may read it. Nothing here depends on cookies or a session.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Robots-Tag", "noindex");
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, QUERY, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Allow", "GET, HEAD, QUERY, OPTIONS");
      return res.status(204).end();
    }
    let query = "";
    if (req.method === "GET" || req.method === "HEAD") {
      const value = req.query.q;
      query = typeof value === "string" ? value : Array.isArray(value) && typeof value[0] === "string" ? value[0] : "";
    } else if (req.method === "QUERY") {
      let body = "";
      if (Number(req.headers["content-length"]) > 65536) {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Connection", "close");
        return sendMarkdown(res, 413, USAGE);
      }
      try {
        body = await readBody(req, 4096);
      } catch (error) {
        res.setHeader("Cache-Control", "no-store");
        return sendMarkdown(res, error.status === 413 ? 413 : 400, USAGE);
      }
      if (/json/i.test(req.headers["content-type"] || "")) {
        try {
          const parsed = JSON.parse(body);
          query = parsed && typeof parsed.q === "string" ? parsed.q : "";
        } catch {
          query = "";
        }
      } else {
        query = body;
      }
    } else {
      res.setHeader("Allow", "GET, HEAD, QUERY, OPTIONS");
      res.setHeader("Cache-Control", "no-store");
      return sendMarkdown(res, 405, USAGE);
    }
    query = query.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, MAX_QUERY);
    if (!query) {
      res.setHeader("Cache-Control", "no-store");
      return sendMarkdown(res, 400, USAGE);
    }
    res.setHeader("Cache-Control", req.method === "QUERY" ? "no-store" : "public, max-age=300");
    const results = search(query);
    // Read by lib/agent-analytics.js once the answer has been sent.
    res.locals.agentSearch = { query, results: results.length, top: results[0]?.doc.page.path || null };
    return sendMarkdown(res, 200, renderResults(query, results));
  };
}

// Pages answer in Markdown when the client asks for it ahead of HTML.
function markdownNegotiation() {
  return (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (!/text\/markdown/i.test(req.headers.accept || "")) return next();
    if (req.accepts(["text/html", "text/markdown"]) !== "text/markdown") return next();
    const body = pageMarkdown(req.path);
    if (!body) return next();
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    res.setHeader("Vary", "Accept");
    res.setHeader("X-Markdown-Tokens", String(Math.ceil(body.length / 4)));
    return sendMarkdown(res, 200, body);
  };
}

module.exports = { AGENT, AGENT_META, SEARCH_PATH, htmlToMarkdown, index, markdownNegotiation, pageMarkdown, search, searchHandler, renderResults };
