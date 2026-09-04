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

## URL conventions

- Canonical URLs are extension-less: `/works`, `/work/benker`, `/ai-integration`, `/hu/ai-integracio`.
- `.html` variants and the old `/work/raiffesen` misspelling 301-redirect
  to the canonical URL (see `server.js`).
