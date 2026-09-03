# SEO Keyword and Long-Tail Strategy: barnanorbert.com

Keyword map for the portfolio. Every page targets one primary keyword cluster;
secondary and long-tail terms support it. Terms are woven into the title tag,
meta description, H1/H2s, JSON-LD (`keywords`, `knowsAbout`, `about`) and body
copy. Never stuffed.

## Positioning

- **Who searches:** recruiters, hiring managers, founders, design leaders.
- **Intent mix:** navigational (brand: "norbert barna designer"), commercial
  ("hire AI product designer", "fintech UX designer portfolio"), informational
  ("banking app redesign case study", "robotics HMI design example").
- **Strategy for a small personal domain:** low-competition long-tail case-study
  queries are the realistic entry point; the brand + portfolio queries convert.
  Case studies are the linkable, citable assets (also for AI search / LLM
  citation, since each study leads with concrete metrics, which AI answers quote).

## Page-by-page keyword map

### / (home)
| Tier | Keywords |
|---|---|
| Primary | AI product design lead, AI product designer portfolio |
| Secondary | fintech UX designer, product design lead portfolio, senior product designer |
| Long-tail | product design lead for AI and fintech products; senior product designer for regulated industries; AI-driven product design portfolio; hire product design lead with banking experience |

Implemented in: title, meta description, H1 + hero copy, and `Person` JSON-LD
(`knowsAbout`, `alternateName`). `jobTitle` is `Product VP` so it matches the
footer lock, not the H1.

### /works
| Tier | Keywords |
|---|---|
| Primary | product design case studies |
| Secondary | UX design portfolio, UX case studies |
| Long-tail | fintech and AI product design case studies; enterprise UX design case studies; crypto and banking UX portfolio |

Implemented in: title, matching H1 (`Product Design Case Studies`), meta
description, `CollectionPage` + `ItemList` JSON-LD.

### /work/benker
| Tier | Keywords |
|---|---|
| Primary | digital banking UX design |
| Secondary | blockchain banking design, neobank product design |
| Long-tail | blockchain banking app design case study; KYC onboarding UX design; fintech onboarding flow design; digital bank account opening UX |

### /work/bitpanda
| Tier | Keywords |
|---|---|
| Primary | crypto exchange UX design |
| Secondary | crypto trading app design, fintech product design |
| Long-tail | crypto trading app redesign case study; cryptocurrency investment app UX; trading platform UX design; crypto deposit flow UX |

### /work/instructure
| Tier | Keywords |
|---|---|
| Primary | EdTech product design |
| Secondary | AI product design case study, LMS design |
| Long-tail | AI in education platform UX design; explainable AI UX design; human-in-the-loop AI design; WCAG-compliant AI product design |

### /work/onrobot
| Tier | Keywords |
|---|---|
| Primary | robotics HMI design |
| Secondary | industrial UX design, human-machine interface design |
| Long-tail | collaborative robot interface design case study; no-code robot programming UX; tablet HMI for cobots; teach pendant replacement UX |

### /work/raiffeisen
| Tier | Keywords |
|---|---|
| Primary | mobile banking UX design |
| Secondary | banking app redesign, banking design system |
| Long-tail | mobile banking app redesign case study; multi-country banking app design; payments and KYC UX design; banking app rating improvement case study |

### /work/kineticare
| Tier | Keywords |
|---|---|
| Primary | digital health platform design |
| Secondary | telehealth UX design, healthcare product design case study |
| Long-tail | online physiotherapy course platform design; patient education platform UX; designing trust in digital health products; how to structure a physiotherapy site for search; Next.js Payload CMS healthcare build |

Written for answer engines as well as classic search: every section stands on
its own, headings state the subject plainly, and the page closes with four
question-and-answer blocks backed by `FAQPage` schema. The `Article` schema
carries visible, matching `datePublished`/`dateModified` values and links the
author to the site's canonical `Person` entity.

### /work/sportsgambit
| Tier | Keywords |
|---|---|
| Primary | AI prediction market UX |
| Secondary | sports betting app design, AI agent UX |
| Long-tail | AI prediction market design case study; sports betting app UX case study; AI agent training UX for non-technical users; 0-to-1 AI product design |

## On-page rules applied

- One unique title (≤60 chars, keyword first) and meta description
  (105 to 155 chars, with the primary keyword) per page.
- Exactly one H1 per page, matching the page's subject (hidden duplicate
  Webflow CMS banners were removed).
- Canonical URL = clean URL (`/works`, `/work/benker`); `.html` variants,
  `/index`, bare `/{slug}` roots, and the old `/work/raiffesen` misspelling
  301-redirect to it (server.js). Apex `barnanorbert.com` always 301s to www.
- `BreadcrumbList` JSON-LD on every case study; `keywords` on every `Article`.
- robots.txt no longer blocks CSS/JS, so Google can render the pages.
- House editorial standard: direct, human phrasing without filler adjectives or
  stock AI language. Claims are scoped and checkable, or clearly labelled as
  portfolio-reported evidence.
- No `<meta name="keywords">`: ignored by every major engine; the map above
  lives in content and structured data instead.

## Content roadmap (highest-leverage next steps)

1. **One insight article per cluster** (informational long-tail, low KD):
   "Designing clearer KYC recovery paths", "Designing HMIs for new cobot
   operators", "What explainable AI means in EdTech UX".
   Link each article to its case study (internal link with descriptive anchor).
2. **About/services copy on the home page** targeting "hire" intent phrases
   naturally (e.g. "available for AI product design leadership roles").
3. **Backlinks:** case studies pitched to design newsletters/galleries
   (bestfolios, Muzli, Sidebar), talk/podcast appearances, LinkedIn articles
   pointing at the studies.
4. **Measure:** connect Google Search Console after the domain is live again;
   review impressions/CTR per query monthly; promising high-impression,
   low-CTR queries get title/description iterations.
