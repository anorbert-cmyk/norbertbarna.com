# SEO Keyword and Long-Tail Strategy: barnanorbert.com

Reviewed: 2026-09-04, against main `90e6840010de3439de7cadbef0df8c17e4ee408e`.

This is a candidate keyword map, not a measured demand or ranking report.
Search volume, keyword difficulty, traffic potential, current rankings and
conversion rates have not been obtained for these terms. Unknown is not zero.
User-confirmed priority: larger enterprise AI-integration clients first, Hungarian
AI and development service buyers second. English-speaking target countries still
need selection; Hungary is confirmed for the Hungarian entry. Product VP identity
and the visual rules in `design.md` remain; hiring is a secondary discovery path.

Assign related terms to the page that best serves their shared search intent.
Use them naturally in relevant copy and metadata, not in every field by formula.
Structured-data properties describe the content; they do not guarantee rankings.
See the [source-backed research and execution plan](seo-research-playbook-2026-09-04.md)
for evidence, data requirements, priorities and acceptance checks.

Method: [Semrush keyword mapping](https://www.semrush.com/blog/keyword-mapping/)
and [Ahrefs keyword strategy](https://ahrefs.com/blog/keyword-strategy/).

## Positioning

- **Primary buyers:** enterprise product, technology and operational decision-makers
  seeking help with AI integration. These buyer roles are planning hypotheses, not
  measured visitor segments. Secondary: Hungarian business owners and product teams
  seeking AI or custom development services.
- **Intent mix:** navigational (Norbert Barna / Barna Norbert), commercial
  (enterprise AI integration consulting / AI integráció vállalatoknak), and
  informational (human review in AI workflows / AI pilot to production).
- **Success:** qualified client enquiries and opportunities, not hiring leads or raw
  clicks as the primary KPI. Demand, conversion rate and attribution remain unverified.
- **Long-tail caveat:** specificity or word count does not establish low competition.
  Labels below describe research candidates; low-volume status must be validated.
  Related variants may belong on one page. [Ahrefs long-tail guidance](https://ahrefs.com/blog/long-tail-keywords/)
- **AI search:** clear, original evidence can help readers, but neither metrics,
  `llms.txt` nor extra schema guarantees AI citations. Google does not use
  `llms.txt` as a ranking or visibility signal. [Google AI guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

## Page-by-page keyword map

### /ai-integration and /hu/ai-integracio (new local service pages)

| Buyer task | English research candidates | Hungarian research candidates | Primary target |
|---|---|---|---|
| Select an integration partner | enterprise AI integration consulting; enterprise AI integration services | AI integráció vállalatoknak; AI bevezetés cégeknek | The relevant language version of the service page |
| Fit AI into existing work | custom AI integration services; AI integration into existing systems | mesterséges intelligencia integráció meglévő rendszerekbe; üzleti folyamatok AI automatizálása | Integration section on the same page; exact technical delivery scope must be agreed |
| Decide how to implement | AI implementation consulting; AI pilot to production | AI bevezetési tanácsadás vállalkozásoknak | Process section; supporting article only with distinct useful evidence |
| Evaluate a custom build | custom AI product development; custom web application development | egyedi AI fejlesztés cégeknek; egyedi webalkalmazás fejlesztés vállalkozásoknak | Development section, not a separate thin page for each variant |
| Understand review and risk | human-in-the-loop AI workflows; enterprise AI adoption | emberi ellenőrzés AI munkafolyamatokban | Instructure case and a planned evidence-led article |

These are candidate long-tail/conversational search phrases, not verified low-volume
or low-difficulty terms. Some broad terms may prove too competitive or too vague.
The services pages share a core offer and have reciprocal en/hu/x-default hreflang;
no automatic language redirect. They are local code, not yet published or indexed.
Read the [client acquisition plan](client-acquisition-seo-geo-2026-09-04.md) for
dated search observations, article briefs, ChatGPT discovery and advertising limits.

### / (home)
| Tier | Keywords |
|---|---|
| Primary | Product VP, AI product portfolio |
| Secondary | enterprise AI integration, AI product and web development |
| Long-tail | Product VP for AI and fintech products; Product VP for regulated industries; AI product portfolio; hire Product VP with banking experience |

Implemented in: title, meta description, H1 + hero copy, and JSON-LD.
`jobTitle` and ProfilePage `name` use Product VP. Person `name` is
`Norbert Barna`. Person `image` is the existing OG portrait URL.

### /works

`Selected work` is the locked navigation/page label, not evidence of search demand.
Keep it; validate the supporting portfolio terms against the target-market results.

| Tier | Keywords |
|---|---|
| Primary | selected work |
| Secondary | UX design portfolio, product case studies |
| Long-tail | fintech and AI selected work; enterprise UX case studies; crypto and banking UX portfolio |

Implemented in: title, matching H1 (`Selected work`), meta description,
`CollectionPage` + `ItemList` JSON-LD.

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

The page includes four question-and-answer blocks and `FAQPage` markup.
Retain useful answers for readers, but do not claim a Google FAQ rich-result
benefit: Google discontinued that feature on 2026-05-07. This does not require
deleting the answers or treating the remaining schema as invalid.
[Google documentation changelog](https://developers.google.com/search/updates#may-2026)

`Article` links the author to the canonical `Person`. Publication/update dates
remain metadata, not a visible byline, under the current design rules. Their
historical accuracy needs content-owner verification; do not refresh dates merely
to make an unchanged case study look new.

### /work/sportsgambit
| Tier | Keywords |
|---|---|
| Primary | AI prediction market UX |
| Secondary | sports betting app design, AI agent UX |
| Long-tail | AI prediction market design case study; sports betting app UX case study; AI agent training UX for non-technical users; 0-to-1 AI product design |

## On-page rules applied

- Unique, descriptive titles and descriptions. The earlier ≤60 / 105–155 character
  ranges are editorial heuristics, not Google limits or ranking thresholds.
  Keep the locked brand/case-led title structure; do not force a keyword first.
  Google can select different title links and snippets.
  [Titles](https://developers.google.com/search/docs/appearance/title-link),
  [descriptions](https://developers.google.com/search/docs/appearance/snippet).
- Exactly one H1 is this project's semantic/design contract, not a universal
  Google ranking formula. Keep the title and visible subject consistent.
- Canonical URL = clean URL (`/works`, `/work/benker`); `.html` variants,
  `/index`, bare `/{slug}` roots, and the old `/work/raiffesen` misspelling
  are normalized by `server.js`. Production exception found 2026-09-04:
  apex `/works`, `/work/raiffeisen` and `/work/kineticare` return 404 instead of
  redirecting to their working www equivalents. Local tests pass, but the live
  host/path routing remains an open issue; see the research plan's evidence table.
- `BreadcrumbList` JSON-LD on every case study; `keywords` on every `Article`.
- robots.txt no longer blocks CSS/JS, so Google can render the pages.
- House editorial standard: direct, human phrasing without filler adjectives or
  stock AI language. Claims are scoped and checkable, or clearly labelled as
  portfolio-reported evidence.
- No keyword stuffing or mechanical keyword-density target. Do not add a
  `<meta name="keywords">` tag as a substitute for useful page content.

## Research and content roadmap (not yet executed)

1. **Repair and verify the live apex redirect gap** before describing technical
   SEO as complete. Diagnose the actual serving layer; do not blindly edit DNS.
2. **Use the existing Search Console property.** Verify access, indexing,
   Google-selected canonicals and sitemap processing. Export an agreed baseline;
   do not create a duplicate property or invent a verification token.
3. **Validate this map.** Select English target countries; client priority and the
   Hungarian market are now confirmed. Then
   inspect actual search results and compare relevant competitors. Record provider,
   country, date, intent, target URL and uncertainty for every volume/KD estimate.
   Semrush and Ahrefs scores are not interchangeable or Google metrics.
4. **Measure contact intent separately from real enquiries.** GA4/GTM code was
   not found in the current page sources. Its approved measurement and consent
   setup, real property ID and event verification remain implementation work.
5. **Improve existing cases before adding pages.** Candidate briefs include
   KYC recovery decisions, first-time cobot operator guidance, and human review
   in EdTech AI. These are not validated low-KD topics. Create a new article only
   for a distinct reader need, backed by publishable first-hand evidence.
6. **Validate the local service offer with the owner**, especially delivery scope,
   capacity and acceptable project size. The home engagement copy now names AI
   integration and links two service entries; it does not claim certifications,
   fixed prices or AI implementation results for every case.
7. **Earn relevant references** through approved original work and real professional
   relationships. No link-package purchases, automated outreach or promised links.
8. **Evaluate comparable periods** after collection is working. Segment brand and
   non-brand queries, countries and devices. Do not infer success from a vendor
   score, one day's fluctuation, or a contact-button click alone.

## Validation record required for each selected cluster

Record: candidate terms, intended reader/task, primary URL, target country,
observed result-page types, dated competitor URLs, source of project evidence,
GSC query/page baseline, provider-specific volume/KD/traffic estimates (or
`unknown`), next action, owner, review date and observed outcome.

Keyword-validation status at this review: **candidate — demand, competition and
conversion not validated**. Two service routes and the revised home offer passed
local implementation checks. Publication status belongs to the associated GitHub
PR and Railway deployment; neither publication nor indexing validates keyword
demand, competition or business conversion by itself.
