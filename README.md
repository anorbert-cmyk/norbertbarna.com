# Norbert Barna - Portfolio Website

Self-hosted portfolio site (static HTML + a small Express server), deployed on Railway.

## 🚀 Deploy

### Railway (production)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login & deploy
railway login
railway init
railway up
```

### Docker
```bash
docker build -t portfolio .
docker run -p 3000:3000 portfolio
```

### Local Development
```bash
npm install
npm start
# Open http://localhost:3000
```

## ✅ Checks
```bash
npm test   # Content, responsive, release, server, SEO and broken-link checks
npm run test:e2e  # Chromium scroll, layout, navigation, CLS and accessibility checks
```

## 📁 Structure
```
├── index.html          # Homepage
├── works.html          # Works page
├── work/               # Individual case studies
│   ├── sportsgambit.html
│   ├── raiffeisen.html
│   ├── instructure.html
│   ├── bitpanda.html
│   ├── onrobot.html
│   ├── kineticare.html
│   └── benker.html
├── assets/             # All static assets
│   ├── css/
│   ├── js/             # animations.js + self-hosted GSAP vendor libraries
│   ├── images/
│   ├── videos/
│   └── icons/
├── docs/seo-keywords.md  # Keyword & long-tail strategy per page
├── scripts/check-site.mjs # Site invariant checks (npm test)
├── server.js           # Express server (clean URLs, redirects, security headers)
├── package.json        # Node.js config
├── Dockerfile          # Docker config
└── railway.json        # Railway config
```

## SEO planning and evidence

- [Candidate keyword map](docs/seo-keywords.md): current page topics and required demand validation.
- [Client acquisition, SEO/GEO and ChatGPT Ads plan](docs/client-acquisition-seo-geo-2026-09-04.md): enterprise-first EN/HU service strategy, evidence-led article briefs, implementation record and remaining gates.
- [Source-backed SEO research and execution plan, 2026-09-04](docs/seo-research-playbook-2026-09-04.md): Google, Semrush, Ahrefs, web.dev and Bing guidance applied to this portfolio; open live redirect issue, measurement requirements and acceptance checks.

These documents distinguish shipped code, observed live behavior and proposed work.
Passing local checks does not prove indexing, rankings or completed analytics setup.

## Writing (Írások): publishing an article

Articles live in `content/` as Markdown with a frontmatter block. The build
turns them into static pages; there is no CMS and no runtime rendering.

1. Add `content/<anything>.md`:

   ```markdown
   ---
   title: Mitől függ egy céges weboldal ára 2026-ban?
   description: A céges weboldal árát a cél, a tartalom, a funkciók, a nyelvek és az üzemeltetés határozza meg. Tényezőlista árajánlatkérés előtt.
   lang: hu
   slug: ceges-weboldal-ara
   date: 2026-10-21T20:00:00+02:00
   updated: 2026-10-21T20:00:00+02:00
   tags: [weboldal készítés, webfejlesztés, árajánlat]
   ---
   Body in Markdown: ## and ### headings, paragraphs, - and 1. lists,
   > quotes, **bold**, *italic*, `code`, [links](/path).
   ```

   - `title`: at most 60 characters; it is also the H1 and the schema headline.
   - `description`: 105-135 characters.
   - `lang`: `hu` publishes at `/hu/irasok/<slug>`, `en` at `/writing/<slug>`.
   - `date` / `updated`: first publication and last meaningful change, full date-time with timezone.
   - `tags`: 3-8 terms; they become meta keywords and RSS categories.
   - `draft: true` keeps the file in `content/` without publishing it (the
     frontmatter is still validated). Publishing = delete that line, set `date`
     and `updated` to the publication time, rebuild.
   - Optional: `pair` (slug of the translation in the other language),
     `service` + `service_label` (related service page for the closing CTA),
     `cover` + `cover_alt` (a 1200x630 JPEG under `/assets/images/og/writing/`,
     used as the social preview).
   - A `## Gyakori kérdések` / `## Frequently asked questions` section with
     `###` questions becomes FAQPage schema, word for word.
   - Tables: a `| a | b |` header row, a `|---|---|` row, then body rows.

2. `npm run build:writing` writes the article, the list page, the RSS feed,
   the sitemap entries and the `llms.txt` Writing section.
3. `npm test` fails if a generated file is out of date or a page breaks a
   site invariant. Commit the Markdown and the generated files together.

Write from your own projects: no invented statistics, prices or clients
(`docs/seo-keywords.md`). A pair must be reciprocal; the build refuses a
one-sided pair, a duplicate slug, a description outside 105-135 characters
or a missing related-service page.

## URL conventions

- Canonical URLs are extension-less: `/works`, `/work/benker`, `/ai-integration`, `/hu/ai-integracio`, `/writing/<slug>`, `/hu/irasok/<slug>`.
- `.html` variants and the old `/work/raiffesen` misspelling 301-redirect
  to the canonical URL (see `server.js`).
