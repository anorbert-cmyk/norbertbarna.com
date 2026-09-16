# SEO/GEO research and internal-link audit — 2026-09-16

Source baseline: `269f2ebc88e71144fc6d3cacf3e5f52921016e52`, all 14 canonical
HTML pages listed in `sitemap.xml`. This public document records source analysis,
research and editorial decisions. Exact authenticated analytics, account details,
URL-inspection snapshots and exports are held outside git in the private audit.
It does not claim that an indexable page is indexed or that a release produced growth.

The current [keyword map](seo-keywords.md) owns page/intent assignments. The
[AI service evidence ledger](ai-content-strategy-2026-09-15.md) owns historical
claim boundaries and the bilingual engagement method. SearchFit's content-strategy,
internal-linking and keyword-clustering skills informed the review. Their generic
article cadences, word counts and fixed link quotas were not adopted: this small
portfolio needs useful project evidence and a coherent service offer.

## Decisions

1. Keep the existing EN/HU service pair as the commercial destination. It already
   explains scope, data access, human review, prototype/pilot decisions, evaluation
   and handover. No additional synonym pages are justified.
2. Keep case studies as evidence, with each project's real scope. Kineticare proves
   custom platform engineering; Raiffeisen proves regulated product delivery;
   neither is recast as an AI implementation. Instructure and SportsGambit have
   different AI/product-design evidence and delivery boundaries.
3. Preserve the Product VP home and case-led Works hierarchy. Existing contextual
   links now connect both discovery surfaces and relevant cases to the service.
4. Resolve stale documentation and technical mismatches before speculative keyword
   rewrites. Current search observations are too limited to validate a non-brand
   commercial cluster or estimate its conversion potential.
5. Use first-hand detail as the differentiator. No generic article factory,
   certification implication, invented stack, pricing promise or guaranteed citation.

## Current primary-source guidance

Checked on 2026-09-16. Source availability is separate from feature availability
or data for this particular website.

| Primary source | Relevant verified guidance | Application here |
| --- | --- | --- |
| [Google's generative-AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), updated July 10, 2026 | Ordinary SEO and useful original expertise remain the foundation. There is no required AI writing format, exact long-tail coverage, chunk size or special file. Google Search ignores `llms.txt` for visibility/ranking. | Preserve clear HTML and grounded cases. The existing `llms.txt` is an optional secondary summary, not a ranking lever. Do not change copy just to match imagined AI prompts. |
| [Google link best practices](https://developers.google.com/search/docs/crawling-indexing/links-crawlable) | Crawlable native anchors, informative anchor text and relevant context help discovery. There is no ideal link count. | Audit real destinations and context. Do not add a reciprocal link merely to satisfy a quota. |
| [Google common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) | Googlebot controls Search crawling. Google-Extended controls other training/grounding uses and does not control inclusion or ranking in Google Search. | Keep crawler policy distinctions explicit. A user-agent string alone is not proof of an authentic crawler or CDN access. |
| [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots) | OAI-SearchBot serves search discovery; GPTBot's training control is independent. ChatGPT-User represents user-triggered fetches and does not determine search eligibility. | Current wildcard allowance is not a missing OAI-SearchBot directive. Do not change training preferences as an SEO shortcut. Hosting/CDN allowance and actual retrieval remain separate checks. |
| [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a) | Standard internal links, stable canonical URLs, renderable content and clear, verifiable facts support search and grounding. Structured data cannot guarantee citation. IndexNow notifies changes. | The same factual pages serve people and crawlers. No cloaking, hidden AI instructions or artificial links. IndexNow is a possible separate delivery integration, not part of this docs change. |
| [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) | Markup should accurately represent visible page content. | Service pages remain WebPage/Service; cases remain evidence pages. Do not invent ratings, FAQ benefits, credentials or a portrait from decorative art. |

The Bing help application's direct text renderer returned an empty shell; its
current primary-domain indexed content was also retrieved during research. The
OpenAI documentation URL redirects from the former platform.openai.com address to
the current developers.openai.com page. These are retrieval details, not site errors.

## Measurement guidance updated for 2026

- [Google's Generative AI performance report](https://support.google.com/webmasters/answer/16984139)
  documents impressions for AI Overviews/AI Mode with page, country, date and device
  dimensions. It draws from Web search data; it is not a keyword-volume or sales
  report. The documentation notes report availability/data thresholds. Check the
  actual property before claiming an AI-specific baseline. Do not retain the older
  blanket claim that AI visibility can only be viewed in a combined Web report.
- [Bing's AI Performance announcement](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview)
  describes citations and cited-page activity across supported Microsoft AI
  experiences. These metrics are not ranking, click or conversion measures, and
  they do not measure all AI systems.
- Current query observations are insufficient for a broad “measured long-tail
  optimization” claim. Separate brand, relevant service intent and unrelated
  queries; omitted rows and unavailable tools do not establish zero demand.
- PostHog consent/configuration is already present in site sources. Its ingestion
  and events need their own evidence. Clicking a contact control does not prove an
  email was sent, an enquiry was received or a prospect qualified.

## Limited competitor/service-format research

These are adjacent providers' own pages, consulted to compare buyer questions and
page formats. They are not asserted SERP leaders or equivalents of Norbert's
capacity, credentials or services. No localized rank, volume or difficulty study
was possible from this sample; no competitor outcome is copied into this portfolio.

| Primary provider page | Observed format | Useful inference for this site |
| --- | --- | --- |
| [Supercharge services](https://www.supercharge.io/services) | Connects product strategy, design and software engineering, including system integration | The current offer should explain the connection between product decisions and delivery. One integrated service page is appropriate. Their organization size/certifications are not Norbert's claims. |
| [Supercharge AI discovery package](https://insights.supercharge.io/generative-ai-proof-of-concept) | A focused entry for identifying a useful AI use case and proof of concept | A defined starting problem and decision/output are more useful than a broad list of AI technologies. Do not copy a package price or duration without an owner-approved offer. |
| [Neurons Lab: how we work](https://neurons-lab.com/howwework/) | Separates discovery, pilot, production and expansion, with financial-services context | Buyer questions about governance, integration and ownership matter beyond the demo. The existing workflow already addresses these; any deeper case needs Norbert's own releasable implementation evidence. |

The implication is to validate and enrich existing pages when evidence supports a
specific gap. It is not to recreate agency service catalogs or target every phrase
used by a competitor. English market selection remains an owner decision.

## Native internal-link audit

Method: parse each sitemap HTML file with Python's standard `HTMLParser`; inspect
`a[href]`, resolve relative and same-host absolute URLs, validate target file/fragment
IDs, and build a directed page graph. Same-page anchors and external URLs are
excluded from cross-page counts. Multiple anchors to one page count as occurrences;
unique destinations collapse them. Navigation/footer anchors are counted for crawl
reachability but separated from content/context links for editorial assessment.
“Content” below includes related-project cards and article-body links, not merely prose.
This source audit does not prove Googlebot has crawled a link or that a live CDN
serves every request. Dynamic consent controls are not acquisition links.

**Result:** 14 pages; 214 native cross-page anchor occurrences; 137 distinct directed
page-to-page edges; average 15.3 occurrences per page. No missing internal destination
or fragment was found. There are no orphan pages or cross-page dead ends. Every
canonical page is at most two native-link clicks from home. These are graph facts,
not authority scores or a recommendation to maximize link count.

| Page | Outgoing occurrences / unique destinations | Distinct incoming pages | Home depth | Content destinations and relevance |
| --- | ---: | ---: | ---: | --- |
| `/` | 19 / 11 | 13 | 0 | Works, six selected cases and AI service. “AI products” is the service entry in the existing services area. |
| `/works` | 19 / 12 | 13 | 1 | All seven cases plus “enterprise AI” → service. Clear hub and commercial next step. |
| `/work/raiffeisen` | 15 / 10 | 12 | 1 | Works, Bitpanda, Benker: related banking/financial flows. Service is also reachable through navigation; no forced AI claim needed. |
| `/work/instructure` | 16 / 10 | 12 | 1 | In-copy “AI integration and product development approach” → workflow; related Kineticare/OnRobot and Works. |
| `/work/bitpanda` | 16 / 10 | 10 | 1 | Raiffeisen appears in the actual partner context and related cases; Benker and Works support financial-product exploration. |
| `/work/benker` | 16 / 10 | 5 | 1 | Bitpanda, Raiffeisen and Works. Related financial decisions and onboarding make the connections useful. |
| `/work/sportsgambit` | 17 / 10 | 4 | 1 | In-copy “AI product design and integration” → workflow; Instructure, Bitpanda and Works. The MVP boundary remains in the case. |
| `/work/kineticare` | 18 / 11 | 12 | 1 | In-copy “custom software development and handover process” → workflow; contextual banking/onboarding links; related OnRobot/Instructure and Works. No healthcare-AI claim. |
| `/work/onrobot` | 16 / 10 | 3 | 2 | Works, Kineticare and Instructure. Cross-domain product examples are navigation context, not assertions of an identical technology stack. |
| `/about` | 8 / 5 | 13 | 1 | Two Works links connect the story to evidence; global AI link provides service access. No artificial extra link is required. |
| `/ai-integration` | 16 / 10 | 12 | 1 | Three evidence rows, SportsGambit MVP link, About/current role and reciprocal HU service. Links sit outside the pinned ribbon. |
| `/hu/ai-integracio` | 16 / 10 | 2 | 2 | Same case/About evidence with English destination language indicated, plus EN switch. It is reachable, though local case translations would reduce language friction. |
| `/privacy` | 11 / 9 | 13 | 1 | HU privacy counterpart. Utility purpose stays intact. |
| `/hu/adatvedelem` | 11 / 9 | 13 | 1 | EN privacy counterpart. Utility purpose stays intact. |

### Link quality and remaining choices

- The service hub already has contextual incoming links from home, Works,
  Instructure, SportsGambit and Kineticare. The three case-to-service anchors explain
  the relationship, and their `#workflow` fragment exists.
- The supporting `/about#perspective` fragment exists. The nearby biography makes
  “Read the story” understandable; replacing every natural anchor with a keyword
  string would not improve the reader's task.
- HU service depth two is not an orphan/indexing defect. Its few incoming sources
  make a Hungarian case translation a reasonable future usability choice if buyer
  demand warrants it. Do not add sales links to privacy text just for graph density.
- OnRobot is intentionally reached through the full Works hub and related cases.
  Altering the locked home hiring order solely to lower its depth would disregard
  the current design goal.
- There is no evidence-based requirement to add a link to every page from every
  other page. No mass link insertion or new site-wide keyword footer is proposed.

## Stale statements corrected

| Earlier statement | Current source-backed replacement |
| --- | --- |
| AI pages are local-only/unpublished | They are part of the published bilingual offer; their current crawl/index status is separately evidenced in the private live audit. |
| The site still needs its initial GA4 installation | Sources contain consent-gated PostHog. No analytics-vendor replacement is proposed. |
| Person image is the old OG portrait URL | Current shared home/AI/privacy preview is forest/olive geometry. ProfilePage references it as page artwork; Person has no portrait claim. |
| September 4 apex paths still have an open 404 defect | Historical observation only. Use the dated current HTTP/redirect evidence, not the old status sentence. |
| Every specific phrase is an SEO opportunity | The map is candidate intent coverage. Demand, competition and conversion remain unvalidated for most topics. |
| A FAQ block implies a Google FAQ enhancement | Google ended FAQ rich results from May 7, 2026. Keep useful accurate answers; do not promise that feature. [Changelog](https://developers.google.com/search/updates#may-2026) |

## Finite action queue and acceptance

| Priority / owner | Action | Evidence needed to close |
| --- | --- | --- |
| Current technical delivery / implementation owner | Reconcile sitemap/structured dates with actual content changes and validate canonicals, language links, media metadata and crawlable links | Exact-revision checks and dated live route/redirect evidence; no fabricated lastmod freshness |
| Current research / audit owner | Record authenticated search baseline and all canonical URL inspections privately | Correct property/window/filter context and explicit distinctions among unknown, indexed and not indexed; no public account export |
| First observation: 2026-09-23 / owner | Recheck unresolved sitemap/canonical/recrawl observations once | Resolved status or concrete remaining issue; no repeated blind indexing submissions |
| Evaluation: 2026-10-14 / owner | Compare complete available periods and qualify service-intent signals | Canonical page groups, country/device filters, brand/non-brand classification and separate enquiry evidence |
| Conditional editorial choice / content owner | Select at most one case expansion or HU case translation | Distinct reader need plus approved factual material; otherwise keep the current pages |

This document creates no automation, new account, submission pipeline or publishing
schedule. Waiting for sufficient data is a defined observation step, not a reason
to invent keyword evidence or keep making unmeasured copy changes.

Docs-only verification: all 14 source routes were mapped; native destinations and
fragments were checked; page evidence was read; primary references were retrieved.
An independent review should verify the public/private evidence boundary and factual
map. App tests are needed for implementation changes owned by the other task, not
for wording corrections in these documents alone.

## Technical date provenance for the accompanying SEO patch

Dates describe an evidenced change, not the day this audit ran. Home, Works, both
AI service pages and Instructure/Kineticare/SportsGambit use September 15 sitemap
last-modified dates. Benker/Bitpanda/OnRobot/Raiffeisen and both privacy pages use
September 5; About retains September 15. These values do not claim a recrawl.

The three contextual case additions are evidenced by commit
`a3f5b9964c52563ef6fd1a49a4111c1f20853217`, dated
`2026-09-15T23:49:08+02:00`. The other four case Article modifications refer to
JSON-LD headline alignment in `0fd7369ae6f6acc840ae00c7a46c59f31a7ca2a8`, dated
`2026-09-05T20:03:12Z`; those bodies were not rewritten in that change. Unknown
publication times are omitted rather than filled with invented midnight values.

[Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
allows meaningful main-content, structured-data and link changes to inform
`lastmod`. The [Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article)
labels its properties recommended rather than required. The
[May 2026 Search updates](https://developers.google.com/search/updates#may-2026)
record FAQ rich-result retirement on May 7. The site's FAQ schema remains matched
to visible answers; no FAQ rich-result benefit is promised. The new 14-route
static SEO guard validates source contracts, not Rich Results Test acceptance,
indexing or search performance.
