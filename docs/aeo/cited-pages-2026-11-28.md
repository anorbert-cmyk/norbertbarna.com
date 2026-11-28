# Cited competitor pages vs Norbi's pages: what concretely differs

Date of fetch: 2026-11-28. Scope: 17 competitor pages cited by answer engines across 390 non-brand answers, compared with the matching pages in /home/user/norbertbarna.com.

## Method and limits (read first)

- **Fetch route.** `litescrape /web/fetch` returned `503 no upstreams available` on all 5 attempts (auto engine, browser engine, html mode, spread over about 6 minutes). All 17 pages were therefore fetched with the free fallback `keenable /promo/v1/fetch` (`live: true`). Monid spend: 0.00 USD.
- **JSON-LD was NOT obtained for any competitor page.** Raw HTML needed litescrape; keenable returns markdown only, and direct download is blocked by the session proxy. Every "JSON-LD" cell for competitors below says "not verified". Nothing in this file claims a competitor schema type. Norbi's schema was read from the built HTML.
- **Author and date for competitors** come from two places: visible text in the markdown, and keenable's `author` / `published_at` metadata fields (which keenable derives from page metadata; shown as "meta").
- **Word counts** are `\w+` tokens on the returned markdown with image and link URLs removed. They include some navigation, testimonial and footer text, so treat them as approximate. Norbi's counts use the same regex on the body of content/*.md.
- **Partial extractions.** gesellschaft-datenschutz.de returned only 2,276 characters on two attempts (live and indexed); the real page is probably longer, so that section is weak evidence. ki-beratungsatlas.de is 229,642 characters; only the first 50,000 were captured.
- **What this can and cannot show.** These are observed differences between cited pages and Norbi's pages. They are correlations from 17 pages, not proof of cause. Factors that cannot be seen from page content (domain age, backlinks, whether Norbi's pages are indexed yet) are not assessed. Norbi's matching articles were published between 2026-10-21 and 2026-11-27, so several are days to five weeks old; that alone may explain part of the gap.
- Saved pages: /tmp/claude-0/-home-user/387078d7-588d-5c2b-9474-833bef6e1450/scratchpad/aeo/pages/<domain>.md (17 files, each with a frontmatter block holding url, runId, meta author/date, total_chars, truncated).

## Norbi's pages: baseline facts

Read from content/*.md and the built HTML.

| Page | Words | Tables / question headings | Numbers, outbound links |
|---|---|---|---|
| content/ceges-weboldal-ara.md (HU) | 1,696 | 0 tables / 7 | No numbers at all (text says "Ebben a cikkben nem írok számokat"). 0 outbound links. |
| content/ai-fejleszto-partner-valasztasa.md (HU) | 1,537 | 1 table / 10 | Only "90 nap". 0 outbound links. |
| content/before-hiring-an-ai-integration-partner.md (EN) | 1,199 | 0 / 7 | No numbers. 2 outbound (cooley.com, natlawreview.com). |
| content/mvp-development-regulated-products.md (EN) | 1,577 | 0 / 7 | No numbers; timeline answer is "a few weeks to a few months". 1 outbound (EUR-Lex). |
| content/mvp-fejlesztes-szabalyozott-termekhez.md (HU) | 1,586 | 1 / 10 | No numbers. 1 outbound (EUR-Lex). |
| content/ai-automatizalas-melyik-folyamattal-kezdj.md (HU) | 1,385 | 0 / 8 | Only "90 nap". 1 outbound (EUR-Lex). |
| content/ki-beratung-kosten.md (DE) | 1,564 | 1 / 11 | No numbers ("In diesem Artikel nenne ich keine Zahlen"). 0 outbound. |
| content/ki-kennzeichnungspflicht.md (DE) | 1,305 | 0 / 7 | Dates of the law only. 2 outbound (cooley.com, natlawreview.com). |
| content/custom-website-or-template.md (EN) | 1,573 | 1 decision table / 8 | No numbers. 0 outbound. Names WordPress only. |

Shared properties of Norbi's built pages (checked on hu/irasok/ceges-weboldal-ara.html, writing/mvp-development-regulated-products.html, hu/ai-tanacsadas-fejlesztes.html, web-development.html):

- JSON-LD on articles: `Article` (headline, datePublished, dateModified, inLanguage, author `Person` "Norbert Barna", jobTitle "Product VP", `ImageObject`), `BreadcrumbList`, `FAQPage` with 6 `Question`s. On service pages: `WebPage` (dateModified 2026-10-22), `Service` with areaServed countries and provider `Person`, `FAQPage` with 8 `Question`s.
- Visible byline with `rel="author"` link to /about, visible `<time>` publish date, reading time. dateModified equals datePublished on the articles checked (no visible "updated" line).
- Direct answer in the first sentence: yes, on every article checked.
- FAQ block: yes, on every article and service page.
- What is absent on every matching page: any price, any numeric timeline, any percentage or count, any named third-party company or ranked list, any sources list, and (on most) any outbound link. The cost FAQ answers say the price depends on factors and that no fixed price is given; the timeline FAQ on the website-cost page says "általános hetek számát nem ígérek".

---

## 1. webcraft.hu/weboldal-keszites-arak/ [cited 8 times]

- **Type:** price guide on a solo developer's own pricing page (first person).
- **Words:** about 2,500 (18,876 chars).
- **Definitive answer at top:** yes. Bold second paragraph: "Egy weboldal elkészítése nálam 265.000 Ft-tól indul, egy webáruházé 390.000 Ft-tól", followed by typical range and timeline in the same paragraph. Almost every H2 section opens with a bolded one-sentence answer containing a number.
- **Competitors named / ranked list:** no ranked list. Names Wix and Squarespace as the rented alternative; describes the market range ("70 ezer forinttól akár több millió forintig").
- **Concrete numbers:** own prices per project type (265-300k, 300-450k, 450-600k, 390-900k, 1M+ Ft), timelines per type (1 week, 2-3, 3-4, 3-6 weeks), yearly upkeep (30-100k Ft), domain and hosting costs, maintenance plans (7,500 / 12,000 / 20,000 Ft per month), hourly rate (16,000 Ft), WordPress market share 43% and 60% with source.
- **Tables:** 2 (project type / price / lead time / who it is for; yearly cost items).
- **FAQ block:** yes, 10 answers under "Gyakori kérdések a weboldal készítés árakról" (question text was not captured in the markdown, answers were).
- **Date / author:** meta author "Gálik János", meta date 2026-10-22. Visible author box "Ki készíti majd a honlapomat?" with portrait, "2005 óta", "20+ év". Year "2026" in H1 lead and several H2s.
- **JSON-LD:** not verified. (The page text itself sells "strukturált adatok (schema markup)" as a service.)
- **H2s mirror buyer questions:** yes. 18 H2s, 6 literal questions ("Mennyibe kerül egy weboldal elkészítése Magyarországon?", "Mitől függ a weboldal készítés ára?", "Mennyibe kerül egy webáruház elkészítése?", "Mennyibe kerül egy weboldal felújítása?", "Mennyibe kerül egy weboldal fenntartása évente?"), the rest are "<type> ára" headings.
- **Outbound authority links:** 1 (W3Techs).

**Versus content/ceges-weboldal-ara.md:** Norbi has the same question as title, a direct first sentence, a factor list and an FAQ, with comparable schema on his side. The differences are (a) webcraft answers the literal question "mennyibe kerül" with figures in the first 60 words, Norbi's opening explicitly declines to give figures; (b) webcraft states a market range and third-party prices (Wix/Squarespace yearly fees, domain, hosting) which are not its own prices; (c) per-type timelines; (d) two tables; (e) a sub-question H2 for every adjacent query (shop, redesign, upkeep, maintenance, WordPress, rented site). Norbi's page covers one question; webcraft's covers about ten.

## 2. rmwebstudio.hu/weboldal-keszites-arak-koltsegei-2026-ban/ [cited 6]

- **Type:** very long price guide / pillar article by a small agency.
- **Words:** about 15,500 (122,567 chars). 51 H2, 79 H3.
- **Definitive answer at top:** yes. The first H2 is "Weboldal készítés árak 2026-ban, gyors összefoglaló táblázat" and its first bold sentence is "2026-ban egy professzionális céges weboldal elkészítése Magyarországon jellemzően nettó 250 000 és 1 500 000 Ft közötti összegbe kerül." A price table follows immediately.
- **Competitors named / ranked list:** no ranking of agencies. Names tools and platforms (Wix, Squarespace, Webflow, WordPress, Oxygen, Let's Encrypt, Cloudflare).
- **Concrete numbers:** price bands per site type and per shop type, own "from" prices (350,000 and 500,000 Ft), hourly rate band (12,500-35,000 Ft), domain / hosting / SSL yearly bands, design, wireframe, UX, support price sections, Hungary vs abroad price section, "120 cég" own count, lead time "1-2 hét".
- **Tables:** 14.
- **FAQ block:** no dedicated FAQ heading found in the text; 31 headings are phrased as questions ("Mekkora költséggel jár ...?", "Mennyibe kerül ma egy közepes színvonalú céges weboldal ...?").
- **Date / author:** visible date "2026. július 10." directly under H1. Meta author "Roska Máté | RM Webstudio". Visible first-person intro box "Roska Máté vagyok, az RM Webstudio alapítója".
- **JSON-LD:** not verified.
- **H2s mirror buyer questions:** yes, and they repeat the year and place ("... 2026-ban, Budapest és környékén", "... Magyarországon, valamint külföldön (2026-ban)").
- **Outbound links:** about 20 external hosts, mostly tool vendors (wordpress.org, letsencrypt.org, cloudflare.com, developer.chrome.com, wikipedia, an affiliate hosting link).

**Versus content/ceges-weboldal-ara.md:** nine times the length, 14 tables against 0, and a number in nearly every section. It covers every sub-cost (hourly rates, hosting, SSL, design, UX, support) as its own heading, so it matches many long-tail queries. Quality of prose is lower than Norbi's (repetition, sales boxes every few sections), which suggests the engines are picking it for extractable figures and coverage, not for writing quality.

## 3. accedia.com/insights/blog/best-ai-consulting-firms-for-banks-in-europe [cited 6, by 5 engines for one question]

- **Type:** "best X" listicle, top 10, on a 250-engineer software firm's blog.
- **Words:** about 2,200 (17,094 chars).
- **Definitive answer at top:** a "Key Highlights" box of three bullets stating what the list is, the six criteria, and who it is for. Not a one-line answer, but a summary block before the first H2.
- **Competitors named / ranked list:** yes. Numbered 1-10: Neurons Lab, Sigma Software, Accedia, Neos, Valcon, Future Processing, Capaciteam, ML6, Wavestone, Miquido. **The publisher lists itself at number 3**, with the longest entry and the only entry with internal links.
- **Concrete numbers:** per firm: founded year, HQ city, headcount, Clutch rating and review count. Market stat with source (AI spend in European banking USD 9.44bn in 2025 to 20.88bn by 2028, Statista). Own stats (50+ projects, 91% retention, fraud loss reduction up to 30%).
- **Tables:** none in text; a comparison table exists as an image (alt text describes it), so engines cannot read it.
- **FAQ block:** yes, 4 questions (one answer captured).
- **Date / author:** visible "Published May 21, 2026"; meta author "Temenuzhka Kurteva". "(2026)" in title.
- **JSON-LD:** not verified.
- **H2 structure:** "What Makes European AI Consulting Firms a Good Fit for Banking Projects", "Best AI Consulting Firms for Banks in Europe in 2026", "How to Evaluate AI Consulting Firms for Banking Projects" (six numbered criteria), "Your Next Steps in Choosing an AI Consulting Firm". Each firm has the identical field block: Founded / Headquartered / Size / Clutch rating / Overview / Key Services / Why Choose.
- **Outbound links:** 1 (Statista). No links to the listed firms.

**Versus content/before-hiring-an-ai-integration-partner.md and ai-fejleszto-partner-valasztasa.md:** Norbi answers "how do I choose and prepare", accedia answers "who are the options". The question that five engines answered from this page is a "which firms" question; an engine needs named entities to answer it, and Norbi's pages name none. His evaluation content overlaps with accedia's "How to Evaluate" section (and is more specific), but that section is not why the page is cited. Norbi has nothing in the "who" format in any language.

## 4. gilzor.com/insights/mvp-development-companies-for-startups-europe [cited 4]

- **Type:** "Top 14" listicle on a dev agency's site.
- **Words:** about 2,600 (21,239 chars).
- **Definitive answer at top:** none captured; the extracted content starts directly at entry 1.
- **Competitors named / ranked list:** yes, 14 numbered firms (Gilzor, Railsware, OSKI Solutions, Netguru, A-listware, Upsilon, Relevant Software, TeaCode, Syndicode, Selleo, Altar.io, Asper Brothers, Apptension, Imaginary Cloud). **The publisher is number 1** and says so openly: "Why is Gilzor first? We wrote this list, and we put ourselves at the top...".
- **Concrete numbers:** few. Own stats (70+ products, 98% on time, 85% return). Per firm: locations, addresses, contact data. No prices or timelines.
- **Tables:** none.
- **FAQ block:** none.
- **Date / author:** meta author "Andrew Laminsky", meta date 2026-09-18; "(2026)" in title.
- **JSON-LD:** not verified.
- **H2 structure:** one H2 per firm, each with identical H3s "Key Facts" (Best for / Core services / Specialization / Locations / Notable strength) and "Contact Information". Then a "How we built this list" method note and "Conclusion".
- **Outbound links:** plain-text domains of every listed firm (not hyperlinked), LinkedIn.

**Versus content/mvp-development-regulated-products.md:** different intent again. Gilzor is cited for "which MVP companies in Europe" questions because it is a uniform, machine-readable directory with a "Best for" line per firm. Norbi's MVP article is a guide; it cannot be the source for a "who" answer. Gilzor's page has no depth on MVP building at all, which shows that format and named entities, not expertise, earned the citation.

## 5. valtorian.com/blog/fintech-healthcare-mvp-development-how-compliance-changes-the-plan [cited 4]

- **Type:** short guide / blog post by a two-founder studio. The closest like-for-like to Norbi's MVP article.
- **Words:** about 1,200 (8,582 chars). "7 min".
- **Definitive answer at top:** yes. A lead paragraph, then a labelled "**TL;DR:**" paragraph that ends with a number: "you can still launch in 6–10 weeks".
- **Competitors named / ranked list:** no. Names tools: Onfido, Persona, Sumsub, AWS S3, React Native, Flutter.
- **Concrete numbers:** timelines stated three times ("4–8 weeks", "A normal MVP may take 4–6 weeks. A fintech or healthcare MVP may take 6–12 weeks", "6–10 weeks"). No prices.
- **Tables:** none.
- **FAQ block:** yes, 7 questions, each answered in one or two short sentences ("Can I skip KYC/AML or PHI protection in early versions? No. These are legal requirements, not nice-to-haves.").
- **Date / author:** visible date "5.12.2025". No author byline captured; the closing section says "you work directly with the founders".
- **JSON-LD:** not verified.
- **H2 structure:** "Why regulated MVPs are fundamentally different", "Fintech MVPs: Why compliance comes first", "Impact on MVP speed and cost", "What fintech MVPs must include in v1 (non-negotiable)", "How compliance reshapes your MVP roadmap", "How compliance impacts cost and time", "Founder mistakes in regulated MVP development", FAQ. Names the regulations as keywords in the lead: KYC/AML, PCI DSS, HIPAA/GDPR.
- **Outbound links:** none to authorities; only internal links.
- **Quality note:** the page contains errors (a React Native vs Flutter block pasted under "Impact on MVP speed and cost"; healthcare items listed under "What fintech MVPs can delay"). It is cited anyway.

**Versus content/mvp-development-regulated-products.md:** Norbi's article is longer, more accurate, has an EUR-Lex source, a byline and FAQPage schema. Valtorian's differs in four visible ways: (a) a labelled TL;DR; (b) numeric week ranges where Norbi says "a few weeks to a few months"; (c) the regulation acronyms (KYC, AML, PCI DSS, HIPAA) appear in the first 60 words and in headings, where Norbi leads with "identity verification, consent, data protection" in plain words and names PSD2/GDPR later; (d) FAQ answers of one or two sentences that begin with yes/no. Also: valtorian's page is a year old; Norbi's EN version is 16 days old.

## 6. rabit.hu/szolgaltatasok/startup-mvp-fejlesztes/ [cited 3, by 4 engines]

- **Type:** plain service page of a Hungarian software house.
- **Words:** about 830, of which roughly a third is a technology logo list and a third is testimonials. Actual service copy is about 300 words.
- **Definitive answer at top:** the first paragraph defines the service and spells out "MVP (Minimum Viable Product)". No numbers.
- **Competitors named / ranked list:** no.
- **Concrete numbers:** only "néhány ... kéthetes sprint".
- **Tables / FAQ:** none.
- **Date / author:** meta date 2023-12-21. No author.
- **JSON-LD:** not verified.
- **H2 structure:** "Hogyan integráljuk az AI-t az MVP-fejlesztésbe, és miért éri meg", "Technológiák", "Megoldásaink", "Ötlettől a kiadásig", "Üzleti elemzés", "Gyors piacra jutás", "Tervezés, tesztelés, tanulás, újrakezdés", testimonials (12, several with name, city and photo; several in Clutch-style anonymised form).
- **Outbound links:** none.

**Versus hu/webfejlesztes.html and content/mvp-fejlesztes-szabalyozott-termekhez.md:** this page has none of the content patterns (no numbers, tables, FAQ, date, author). What it has that Norbi does not: a dedicated URL and H1 that exactly match the query "startup MVP fejlesztés" as a service (`/szolgaltatasok/startup-mvp-fejlesztes/`), a company (not a person) as provider, a long named-technology list, and many client testimonials with names and cities. Norbi's MVP content is an article under /hu/irasok/, and his service page is general web development. For "ki vállal MVP fejlesztést" questions the engines appear to want a provider page whose subject is exactly that service. The page dates from 2023, so age and existing authority probably also play a part; that cannot be confirmed from the content.

## 7. kdconsulting.hu/en/ai-consulting-firms-hungary/ [3 engines]

- **Type:** "ten firms" listicle by an independent consultant, EN translation of a HU original.
- **Words:** about 1,600 (11,052 chars).
- **Definitive answer at top:** no one-line answer. Opens with "Before you start" (data source and as-of date) and "Ranking criteria".
- **Competitors named / ranked list:** yes, numbered 01-10: KD AI Consulting, bildr.hub, Cubix, Stylers Group, Training360, Optimaze, Soter-Line, Dyntell, AppForge, Ardo AI. **The publisher is number 01.**
- **Concrete numbers:** programme facts per firm (four-week intensive, 15-20 processes, sixteen programmes, twenty-seven courses, 90-day programme). No prices, but a column saying whether each firm publishes prices.
- **Tables:** 1 "Side by side" table: Firm / Main profile / For / Public pricing / Named clients.
- **FAQ block:** no. A "Which one fits when" section gives five "If the goal is X ... that means A, B and C" paragraphs, which is answer-shaped text for "which firm for my case" questions.
- **Date / author:** visible "Compiled in October 2026, updated in November 2026" and "as of autumn 2026"; first person ("I spell out the ranking criteria"). States "I update the overview once a year".
- **JSON-LD:** not verified.
- **Outbound links:** a link to each listed firm's site (9 external hosts).
- **Method transparency:** states that all data comes from firms' own public sites, and gives four explicit ranking criteria.

**Versus content/before-hiring-an-ai-integration-partner.md / ai-fejleszto-partner-valasztasa.md:** same gap as with accedia: named firms, a comparison table with one row per firm, and a "which one fits when" mapping. Notable because the publisher is a one-person consultancy like Norbi, so size is not the barrier. Norbi's 10-question table is useful, but it is not an answer to "which AI consulting firms are there in Hungary".

## 8. automating.hu/blog/ai-automatizalas-cegeknek

- **Type:** long buyer guide that doubles as the firm's offer page.
- **Words:** about 3,200 (23,108 chars).
- **Definitive answer at top:** yes, twice. A lead paragraph with identity, offer and price ("Egy munkakör havi 129 000 Ft"), then a "Röviden" box of five bullets, each with a number. The bold intro repeats it. There is also a boxed one-paragraph definition of "AI automatizálás".
- **Competitors named / ranked list:** no named competitors. It classifies the market into five provider types and compares pricing models (project price vs own build vs its subscription) in a table using "magyar nyilvános árlisták" ranges.
- **Concrete numbers:** own prices (129,000 / 490,000 Ft per month, 290,000 Ft one-off), market ranges from public price lists (150-300k, 500k-1.5M one-off; 30-120k monthly), first-year totals, Eurostat adoption stats (10.4%, 20%, 15.3%, 40%), a worked ROI calculation from the statutory minimum wage (2,900 Ft per hour, break-even at about 45 hours), own stats (30+ systems, 120M Ft, 5,000 hours).
- **Tables:** 3 (service / price / time to live; areas and roles; pricing-model comparison).
- **FAQ block:** yes, 6 questions; the first is literally "Ki csinál AI automatizálást cégeknek Magyarországon?" and the answer begins with the company name.
- **Date / author:** meta author link (Homoki Gábor), meta date 2026-11-10. Visible footer: "Szakmailag átnézte: Hudácsek Bence, az Automating technológiai vezetője. Utolsó tartalmi frissítés: 2026. november 25." Two quoted expert statements in the body.
- **JSON-LD:** not verified.
- **H2s mirror buyer questions:** yes, 8 of 10 H2s are literal questions ("Ki csinál AI automatizálást cégeknek Magyarországon?", "Mit vesz át az AI egy cégnél?", "Mennyibe kerül, és mikor térül meg?", "Hogyan válassz AI automatizálási szolgáltatót?", "Kinek nem való az AI automatizálás?"). Each H2 is followed by a one or two sentence direct answer. There is a table of contents.
- **Outbound authority links:** a numbered "Források" list of 6: Eurostat (2), Nemzeti Jogszabálytár (2), n8n pricing, EUR-Lex GDPR Art. 28, each with a date or "megtekintve" date.
- **Named clients:** two case studies with company and owner names and a quote.

**Versus content/ai-automatizalas-melyik-folyamattal-kezdj.md:** this is the most complete example of the pattern set. Against Norbi's page: 3 tables vs 0; 6 dated sources vs 1; dozens of figures vs one ("90 nap"); question H2s that include the "who does this in Hungary" and "how much" questions vs Norbi's selection-criteria H2s; named clients vs none in this article; "reviewed by" plus "last updated" lines vs a publish date only. Norbi's article answers a narrower question (which process first) and answers it well, but the cited page answers who, what, how long, how much, how to choose and who it is not for, all on one URL. For Norbi's no-price rule, the relevant part is that the market ranges, the Eurostat figures and the wage-based break-even arithmetic are all third-party or derived numbers, not the firm's own price.

## 9. aiboost.hu/ai-szotar/ai-es-gdpr/

- **Type:** glossary entry in an "AI szótár".
- **Words:** about 480 (3,884 chars). The shortest cited page.
- **Definitive answer at top:** yes. A one-sentence definition directly under the H1, before the first H2. The first H2 then opens with a bolded expansion and a bolded trigger condition ("amint a céged egy konkrét emberhez köthető adatot tölt be egy AI rendszerbe").
- **Competitors named:** no. Names products: OpenAI, Anthropic, Google, Claude, ChatGPT, Gemini, each linking to its own glossary entry.
- **Concrete numbers:** few (2018, seven principles, a 25-person law firm example, "1 oldalas" policy).
- **Tables / FAQ:** none. Headings are questions: "Mit jelent a GDPR az AI kontextusában?", "Mire kell figyelnie egy cégnek?", "Mit kell tudni egy cégvezetőnek?", plus "Üzleti példa".
- **Date / author:** none captured.
- **JSON-LD:** not verified.
- **Outbound links:** none external; dense internal links to other glossary terms (LLM, API, AI Act, adatanonimizálás, AI etika).
- **Title tag:** a question: "AI és GDPR — Mit szabad és mit nem AI eszközökkel a magyar cégeknek?".

**Versus Norbi:** there is no HU page on AI and GDPR in content/ (the DE ki-datenschutz-dsgvo.md exists). The pattern here is one concept per URL, a one-sentence definition first, three question headings, three numbered actions, under 500 words, inside a cross-linked glossary. Norbi has no glossary or short definitional pages; his shortest articles are about 1,200 words.

## 10. leventech.hu/en/enterprise-ai-solutions

- **Type:** service / home-style landing page of a small AI firm.
- **Words:** about 1,950 (12,619 chars).
- **Definitive answer at top:** an H1 ("We automate what your team still does by hand") and a one-line scope, then four stat tiles.
- **Competitors named:** no. Names many technologies and models.
- **Concrete numbers:** stat tiles (40-45% efficiency gain, invoice processing 3 days to 4 hours, 96% satisfaction, 13+ years), case metrics (94% vs 60% defect detection, 78% adoption, 2,000 invoices per month in 6 currencies), own prices in EUR and HUF, timelines ("6-12 weeks", "2-3 weeks" pilot, reply "within one working day", plan "within 5 working days"), founder stats (46+ projects, $6M+ savings).
- **Tables:** none.
- **FAQ block:** yes, "Common questions", about 9 answers (question text not captured), each a dense paragraph of figures.
- **Date / author:** meta author "Leventech Solutions Kft.", meta date 2026-11-23. Visible founder block with name, title, photo and a first-person credential paragraph.
- **JSON-LD:** not verified.
- **H2 structure:** "Industries Where We've Built Production Systems", "Results From the Field", "Know what you get at each step", "What We Build", "Why Companies Choose Leventech", "Who We Are", "What our clients say", "Common questions".
- **Outbound links:** none.
- **Title tag** contains the geography and audience: "AI Consulting and Automation in Budapest for SMEs and Enterprises".

**Versus ai-integration.html / hu/ai-tanacsadas-fejlesztes.html:** Norbi's service pages have comparable schema (Service + FAQPage, 8 questions) and structure. Differences: quantified case results in the first screen, a title that says city plus audience, numeric timelines, a process with a stated deliverable and turnaround per step, and a founder block with countable credentials. The prices are leventech's own and are out of scope for Norbi; the case metrics and turnaround times are not prices.

## 11. ki-beratungsatlas.de/schwerpunkt/ki-implementierung/

- **Type:** third-party directory category page (not a provider).
- **Words:** 229,642 chars in total; 50,000 captured (about 5,900 words).
- **Definitive answer at top:** the H1 itself is a countable fact: "Schwerpunkt KI-Implementierung & Softwareentwicklung: 430 KI-Berater (Stand November 2026)", followed by three count bullets (430 Einträge, 15 Bundesländer, 24 nennen ein Förderprogramm).
- **Named entities:** 430 firms, each with name, city, federal state, a three-sentence neutral description, focus tags, service form (Beratung / Umsetzung / Schulung) and in some cases "Vom Anbieter bestätigt". Sorted by state, city, name; not ranked.
- **Tables / FAQ:** none in the captured part.
- **Date:** "Stand November 2026" in the H1.
- **JSON-LD:** not verified.
- **Outbound links:** none in the captured part; each entry links to an internal profile page.

**Versus Norbi:** not comparable as a page type. The useful observation is the other direction: engines cite a directory when asked who implements AI in Germany, and each entry in it is a short neutral description with city and service tags. Being listed in such directories (and having a profile whose text states location, focus and service form) is a route into these answers that does not depend on Norbi's own pages. Whether Norbi is listed there was not checked.

## 12. ki-automatisierung-mittelstand.de/ki-beratung-kosten/

- **Type:** price page that answers only the cost question; same primary keyword as Norbi's ki-beratung-kosten.
- **Words:** about 1,300 (10,357 chars).
- **Definitive answer at top:** yes. First H2 is the literal question "Was kostet KI-Beratung im Mittelstand 2026?" answered in four sentences with four figures. A later H2 "Was kostet KI-Beratung konkret?" under the label "Auf den Punkt" repeats the answer as a self-contained paragraph that also states the audience ("10–500 Mitarbeitende, Deutschland/DACH"), the as-of date ("Stand August 2026") and the VAT basis.
- **Competitors named:** no.
- **Concrete numbers:** from 4,900 EUR (Potenzialanalyse), from 6,900 EUR (Roadmap), from 1,900 EUR per month (Retainer), 4,900-16,900 EUR range, training 1,500 / 2,400 / 9,800 EUR, durations (2-4 days, 1-2 weeks, 90 minutes, 30 minutes), a legal date (Art. 4 EU AI Act, 2 February 2025).
- **Tables:** 1 (Leistung / Umfang / Investition / Ergebnis, 6 rows).
- **FAQ block:** yes, 6 answers.
- **Date / author:** meta date 2026-08-05; the "author" meta field holds "Datenstand: August 2026"; visible "Stand August 2026". No person named.
- **JSON-LD:** not verified.
- **H2s mirror buyer questions:** yes: "Was kostet KI-Beratung im Mittelstand 2026?", "Tagessatz oder Festpreis: Was bei KI-Beratung günstiger ist", "Was Potenzialanalyse, Roadmap und Retainer kosten", "Was kostet KI-Beratung konkret?".
- **Outbound links:** none; internal links to sibling pages for each sub-question.

**Versus content/ki-beratung-kosten.md:** Norbi's page has the same title keyword, question H2s ("Wovon hängen die Kosten einer KI-Beratung ab?"), a table, an FAQ with 6 questions and schema. It is longer and has an author. The single visible difference is that the competitor's answer to "Was kostet ...?" contains figures and Norbi's says "In diesem Artikel nenne ich keine Zahlen". An engine asked "was kostet KI-Beratung" needs a quantity to quote. Two further details: the competitor separates billing models (Tagessatz / Festpreis / Retainer), which is a non-price angle Norbi's H2s do not have, and it carries an explicit data-as-of line. Note also that Norbi's DE article was published on 2026-11-27, one day before this fetch, so it may simply not be indexed yet.

## 13. gesellschaft-datenschutz.de/ki-kennzeichnungspflicht/

- **Type:** short topic landing page of a training provider (as far as captured).
- **Words:** about 300 captured (2,276 chars). **Extraction is probably partial**; two fetches returned the same two sections.
- **Captured content:** H2 "Vom Pflichtpunkt zur Governance: So wird Kennzeichnung handhabbar" and H2 "Unsere Empfehlung: Ausbildung zum AI Officer (DEKRA)". No numbers, no table, no FAQ, no legal citations in the captured part.
- **Date / author:** meta author "saschabeer", meta date 2025-04-09.
- **JSON-LD:** not verified.
- **Observable signals:** exact-match URL slug and title ("KI Kennzeichnungspflicht"), a domain whose name is the topic area (data protection society), a third-party certification name (DEKRA), page age of 19 months.

**Versus content/ki-kennzeichnungspflicht.md:** on the captured evidence Norbi's article is far stronger on every content point (direct answer with Article 50 and the 2 August 2026 date, five design decisions, FAQ, two outbound sources, byline, schema). The competitor's citation cannot be explained by on-page content from what was captured; domain topical authority, age and exact-match slug are the remaining candidates. Do not draw content lessons from this page.

## 14. socialfirm.com/blog/custom-website-vs-template-website/

- **Type:** comparison guide on a US agency blog; same query as Norbi's custom-website-or-template.
- **Words:** about 2,400 (16,734 chars).
- **Definitive answer at top:** yes, three layers: a "Key Takeaways" H2 with a summary paragraph and six bullets; then a paragraph starting "The short answer:" with a numeric threshold ("limited budget (under roughly $5,000)"); then definitions.
- **Competitors named:** no agencies. Names platforms: WordPress, Wix, Squarespace.
- **Concrete numbers:** cost ranges for both options ($100-500 per year, $1,500-5,000, $5,000-50,000+), timelines (days to weeks vs 4-12+ weeks), maintenance ranges, performance figures with sources (INP 82 ms vs 152 ms, page weight 200-500 KB vs 2-5 MB, LCP ranges), "7%" conversion stat, "20%" conversion claim.
- **Tables:** 1 "at a Glance" table: Factor / Template / Custom, five rows (best for, cost, time, customisation, SEO control).
- **FAQ block:** yes, 5 questions with H3 headings.
- **Date / author:** visible "September 4th, 2026"; meta author "Jason Willis".
- **JSON-LD:** not verified.
- **H2 structure:** "What Is a Template Website?", "What Is a Custom Website?", "... How They Compare at a Glance", then one H2 per criterion (Cost, Design, SEO, Scalability), **each ending with a bolded "Winner:" verdict line**, then "Which Should You Choose?" with "Choose a template website if: ..." / "Choose a custom website if: ...".
- **Outbound links:** 5 (Search Engine Journal, a cost estimator site, and three small blogs/studies).

**Versus content/custom-website-or-template.md:** Norbi's page is structurally the closest of all his pages to a cited competitor: direct answer in sentence one, six criteria, a decision table, an FAQ, a real example. Remaining differences: (a) every figure, including third-party platform fees and typical timelines, which are not Norbi's prices; (b) a side-by-side attribute table (factor by option) in addition to Norbi's situation-to-recommendation table; (c) explicit "What is X?" definition H2s for each term; (d) a per-criterion "Winner:" verdict line; (e) 5 outbound sources vs 0; (f) named platforms (Wix, Squarespace) where Norbi names only WordPress.

## 15. s-pro.io/claude-implementation-partners-europe

- **Type:** partner list / comparison page on a Zurich fintech engineering firm's site.
- **Words:** about 1,500 (11,353 chars).
- **Definitive answer at top:** yes, and the strongest example in the set. One paragraph directly under the H1 answers the whole question with named entities: three partner types, with Deloitte, Accenture, KPMG, PwC, adesso, ML6, valantic and S-PRO named, plus "The right choice depends on scope, regulation (FINMA, BaFin, FCA)...".
- **Competitors named / ranked list:** yes, 8 firms in a table. States "This is a list, not a ranking". **The publisher is in the first row** and says "S-PRO is one of the companies listed; we apply the same criteria to ourselves."
- **Concrete numbers:** own facts (2014, 250+ engineers, ISO 27001 / 27701, 100+ AI projects, 40+ agentic, Clutch 4.9 from 46 reviews), case results (85%, 90%, 40%+, 30 s down from 15 min).
- **Tables:** 1: Company / Type / HQ / Best for / Source.
- **FAQ block:** yes, 7 questions under "Questions buyers ask us".
- **Date / author:** visible "Last updated: 4 November 2026 · S-PRO, Zurich"; "Compiled in October 2026". Named contacts with roles at the bottom.
- **JSON-LD:** not verified.
- **Method section:** "How we ranked" with five criteria and a statement of what was and was not verified.
- **Outbound authority links:** a source link per listed firm (anthropic.com news pages for Deloitte, KPMG, PwC; Accenture newsroom; adesso, ML6, valantic press pages).
- **Machine-readable delivery:** the fetched content began with a YAML frontmatter block (title, url, lang, description, source). No other page in the set returned one. This suggests the site serves or exposes a markdown rendition of the page to automated clients; that was not verified further.
- **Related pages:** links to a cluster of sibling question pages ("Who can build AI agents for a Swiss private bank", "adesso alternatives for Claude implementation in financial services", "Claude implementation partners in Switzerland for banks").

**Versus ai-integration.html and content/before-hiring-an-ai-integration-partner.md:** same structural gap as pages 3, 4 and 7 (named firms, list with source column, self-inclusion with disclosure), plus an entity-dense first paragraph that an engine can quote whole, a visible "Last updated" line, and a per-row source link. Norbi has no page that names who the options are for any of his service categories.

## 16. lioner.hu/weboldal-keszites-arak

- **Type:** price guide on a two-developer studio's pricing page.
- **Words:** about 3,900 (28,964 chars).
- **Definitive answer at top:** yes. H2 "Mennyibe kerül egy weboldal 2026-ban?" with the sub-label "A rövid válasz, ha nincs időd végigolvasni", then market bands in three sentences, then own "from" prices.
- **Competitors named:** no firms. Compares approaches (template WordPress, custom-design WordPress, coded build) and names WordPress, WooCommerce, Laravel, Let's Encrypt, Google Workspace, Microsoft 365.
- **Concrete numbers:** a **market** price table by site type with lead times (six rows, from 50,000 Ft to above 10,000,000 Ft; 2 days to 12 months), with a stated method: "2026 szeptemberében a Google első oldalán megjelenő hazai árlistákat néztük át". Market hourly-rate bands by provider type (5-15k, 12-30k, 30-60k Ft). Upkeep table (domain, hosting, VPS, SSL, licences, maintenance). Own prices, hourly rate, 30% deposit, 12-month guarantee, lead times.
- **Tables:** 3 (market price by type with "Mikor elég" column; three-approach comparison across 9 attributes; upkeep costs).
- **FAQ block:** yes, about 17 answers (question text not captured), most opening with the market figure and then the own figure.
- **Date / author:** meta author "Farkas Péter, Ádám Kristóf". No visible publish date captured; "2026" in H1 and H2s; dated client reviews (Google Maps links) from 2026.
- **JSON-LD:** not verified.
- **H2s mirror buyer questions:** yes, 9 literal question H2s ("Miért ekkora a különbség a weboldal árakban?", "Mi van benne az árban, és mi nincs?", "WordPress vagy egyedi fejlesztés: melyik éri meg?", "Mikor elég az olcsóbb oldal, és mikor éri meg az egyedi?", "Mennyibe kerül egy weboldal fenntartása?", "Mitől lesz drágább vagy olcsóbb a weboldal?"), plus "6 kérdés, amit tegyél fel egy weboldal árajánlatnál".
- **Outbound links:** only Google Maps review links.
- **Named clients:** six short project examples with client names and one metric each.

**Versus content/ceges-weboldal-ara.md:** this page is the best model for what Norbi could do inside his rule, because its lead table is a survey of other providers' published prices with the method and month stated, separate from its own prices. Norbi's page already shares several of lioner's sections in substance (why offers differ, what is and is not included, what to ask before a quote, an honest "when the cheaper option is enough"). What it lacks: the market-band table, lead-time ranges, the three-approach comparison table, the upkeep cost table (third-party costs: domain, hosting, SSL, licences), the hourly-rate market bands, and named project examples with a metric beyond the single Kineticare example.

## 17. completapp.com/services/mvp-development

- **Type:** service page of a one-person Budapest product studio.
- **Words:** about 1,240 (7,570 chars).
- **Definitive answer at top:** H1 "MVP Development for Startups" plus one sentence. The first numbered H2 "What is MVP development?" opens with a one-sentence definition and, in the same paragraph, a one-sentence entity statement: "CompletApp is a Budapest-based product studio that builds MVPs for mobile and web, working in Hungarian and English at a fixed scope and a fixed price."
- **Competitors named:** no.
- **Concrete numbers:** "Typical projects: 2,250 to 5,750 EUR", "Typical timeline: 4 to 6 weeks", "reply within 24 hours", "30 minute discovery call", two named outcomes (Copywise / Persuva "raised $200K in its first investment round in 2024"; Books By Experts "sold on Flippa").
- **Tables:** none.
- **FAQ block:** no separate FAQ; the main H2s are the questions: "What is MVP development?", "What do you get in an MVP?", "What do we build an MVP with?", "Maintenance and growth after launch", "How we work".
- **Date / author:** meta author "@janos_kiss01"; no date captured.
- **JSON-LD:** not verified.
- **Outbound links:** Calendly only.
- **Other:** names the stack (Flutter, React, Astro, Firebase, Supabase), a 4-step process, testimonials, and a link to a cost calculator.

**Versus web-development.html / hu/webfejlesztes.html:** like rabit.hu, this is a URL and H1 dedicated to exactly "MVP development" as a service, which Norbi does not have (his MVP content is an article; his service page is general web development and product design). It also has a quotable entity sentence (who, where, what, languages, terms) inside the definition paragraph, question H2s on a service page, a numeric typical timeline, and two named product outcomes. The publisher is a solo provider, so again scale is not the barrier.

---

## Comparison table

Legend: Y = present in fetched content, N = not present in fetched content, n/v = not verified.

### A. Format and answer shape

| Page | Type, words | Answer at top | Names firms / self on list |
|---|---|---|---|
| 1 webcraft.hu | Price guide, 2,500 | Y, with figures | N / n.a. |
| 2 rmwebstudio.hu | Price guide, 15,500 | Y, with figures + table | N / n.a. |
| 3 accedia.com | Top 10 listicle, 2,200 | Key Highlights box | Y, 10 firms / self at 3 |
| 4 gilzor.com | Top 14 listicle, 2,600 | N (starts at entry 1) | Y, 14 firms / self at 1 |
| 5 valtorian.com | Guide, 1,200 | Y, labelled TL;DR with weeks | N |
| 6 rabit.hu | Service page, 830 | Definition paragraph | N |
| 7 kdconsulting.hu | Top 10 listicle, 1,600 | N (method first) | Y, 10 firms / self at 1 |
| 8 automating.hu | Guide + offer, 3,200 | Y, "Röviden" box with figures | Provider types only |
| 9 aiboost.hu | Glossary entry, 480 | Y, one-sentence definition | N |
| 10 leventech.hu | Service page, 1,950 | Stat tiles | N |
| 11 ki-beratungsatlas.de | Directory, very long | Count in H1 | Y, 430 firms / third party |
| 12 ki-automatisierung-mittelstand.de | Price page, 1,300 | Y, with figures | N |
| 13 gesellschaft-datenschutz.de | Topic page, 300 (partial) | N | N |
| 14 socialfirm.com | Comparison guide, 2,400 | Y, Key Takeaways + "The short answer" | Platforms only |
| 15 s-pro.io | Partner list, 1,500 | Y, entity-dense paragraph | Y, 8 firms / self in row 1 |
| 16 lioner.hu | Price guide, 3,900 | Y, "A rövid válasz" with figures | Approaches only |
| 17 completapp.com | Service page, 1,240 | Definition + entity sentence | N |
| Norbi (9 articles) | Guides, 1,200-1,700 | Y, first sentence, no figures | N / no list page |

### B. Extractable facts

| Page | Numbers (price / time / stats) | Tables | FAQ block |
|---|---|---|---|
| 1 webcraft.hu | Y / Y / Y | 2 | Y (10) |
| 2 rmwebstudio.hu | Y / Y / Y | 14 | N (31 question headings) |
| 3 accedia.com | N / N / Y (firm facts, market stat) | 0 (image only) | Y (4) |
| 4 gilzor.com | N / N / few | 0 | N |
| 5 valtorian.com | N / Y / N | 0 | Y (7) |
| 6 rabit.hu | N / N / N | 0 | N |
| 7 kdconsulting.hu | N / programme lengths / Y | 1 | N ("Which one fits when") |
| 8 automating.hu | Y / Y / Y (Eurostat, ROI math) | 3 | Y (6) |
| 9 aiboost.hu | N / N / few | 0 | N (question headings) |
| 10 leventech.hu | Y / Y / Y | 0 | Y (about 9) |
| 11 ki-beratungsatlas.de | N / N / counts | 0 | N |
| 12 ki-automatisierung-mittelstand.de | Y / Y / N | 1 | Y (6) |
| 13 gesellschaft-datenschutz.de | N / N / N | 0 | N |
| 14 socialfirm.com | Y / Y / Y | 1 | Y (5) |
| 15 s-pro.io | N / N / Y | 1 | Y (7) |
| 16 lioner.hu | Y / Y / Y (market survey) | 3 | Y (about 17) |
| 17 completapp.com | Y / Y / few | 0 | N (question H2s) |
| Norbi (9 articles) | N / N / N | 0 or 1 | Y (6 each) |

### C. Trust and freshness signals

| Page | Visible date or "updated" | Author / reviewer | Outbound sources |
|---|---|---|---|
| 1 webcraft.hu | Year in headings; meta 2026-10-22 | Named developer box, "2005 óta" | 1 (W3Techs) |
| 2 rmwebstudio.hu | "2026. július 10." | Founder intro box | about 20, mostly tools |
| 3 accedia.com | "Published May 21, 2026" | Meta author only | 1 (Statista) |
| 4 gilzor.com | Year in title; meta 2026-09-18 | Meta author only | Firm domains as text |
| 5 valtorian.com | "5.12.2025" | None captured | 0 |
| 6 rabit.hu | None; meta 2023-12-21 | None | 0 |
| 7 kdconsulting.hu | "Compiled October 2026, updated November 2026" | First person, named in entry 01 | 9 (each listed firm) |
| 8 automating.hu | "Utolsó tartalmi frissítés: 2026. november 25." | Author + "Szakmailag átnézte" | 6, numbered and dated |
| 9 aiboost.hu | None | None | 0 |
| 10 leventech.hu | None; meta 2026-11-23 | Founder block with credentials | 0 |
| 11 ki-beratungsatlas.de | "Stand November 2026" in H1 | None | 0 captured |
| 12 ki-automatisierung-mittelstand.de | "Stand August 2026" | None | 0 |
| 13 gesellschaft-datenschutz.de | None; meta 2025-04-09 | Meta author only | 0 |
| 14 socialfirm.com | "September 4th, 2026" | Meta author only | 5 |
| 15 s-pro.io | "Last updated: 4 November 2026" | Company; named contacts | 7 (source per firm) |
| 16 lioner.hu | Year in headings; survey month stated | Meta authors (two founders) | Review links only |
| 17 completapp.com | None | Meta author handle | 0 |
| Norbi (9 articles) | Publish date; no "updated" line | Byline with rel=author, Person schema | 0 to 2 |

JSON-LD for all 17 competitor pages: not verified (see Method). Norbi: Article + Person + BreadcrumbList + FAQPage on articles; WebPage + Service + FAQPage on service pages.

---

## Ranked list: the 10 patterns that most plausibly explain the citations

Ranking weighs how many cited pages show the pattern, how often those pages were cited, and how completely Norbi's pages lack it.

### 1. The page states quantities where the question asks for a quantity

- **Shown by:** 1, 2, 8, 10, 12, 14, 16, 17 (prices and timelines); 5 (timelines only); 3, 15 (firm facts and results). The two most-cited pages in the whole set (1 and 2, 14 citations together) are number-dense price pages.
- **Norbi:** absent on every matching page. Across nine articles the only figures are "90 nap" and legal dates. Cost FAQs answer "it depends on..."; the timeline answers are "a few weeks to a few months" or an explicit refusal to give weeks.
- **Within the no-price rule:** the cited pages show four kinds of numbers that are not the publisher's own prices: (a) market ranges attributed to third parties with method and month (16: "2026 szeptemberében a Google első oldalán megjelenő hazai árlistákat néztük át"; 8: "magyar nyilvános árlisták"); (b) third-party running costs such as domain, hosting, SSL, platform subscriptions, tool licences (1, 2, 14, 16); (c) effort and duration ranges per project type or phase (1, 5, 12, 16, 17); (d) public statistics and worked arithmetic (8: Eurostat adoption rates, wage-based break-even hours). Any of these would give an engine something to quote from Norbi's pages without him publishing a price of his own.

### 2. There is a "who" page: named firms in a uniform list, with the publisher on it

- **Shown by:** 3 (self at 3), 4 (self at 1), 7 (self at 1), 15 (self in row 1), 11 (third-party directory). Page 3 was cited by five engines for a single question.
- **Norbi:** absent. No page on barnanorbert.com names any other provider. His partner-selection articles answer "how to choose", which is a different question from "who are the options", and engines cannot answer a "who" question from a page with no names.
- **How the cited pages handle the self-interest:** 4, 7 and 15 disclose it in plain words (for example gilzor: "We wrote this list, and we put ourselves at the top"; s-pro: "This is a list, not a ranking ... S-PRO is one of the companies listed"), state criteria, and say the data comes from each firm's own public site. Pages 7 and 17 show that a one-person business can publish this format.

### 3. A self-contained answer block at the very top, often labelled

- **Shown by:** 1 (bold lead), 2 (summary table as first H2), 3 ("Key Highlights"), 5 ("TL;DR:"), 8 ("Röviden"), 9 (one-sentence definition), 12 (first H2 answered in four sentences, repeated under "Auf den Punkt"), 14 ("Key Takeaways", "The short answer:"), 15 (entity-dense paragraph), 16 ("A rövid válasz, ha nincs időd végigolvasni").
- **Norbi:** partly present. Every article opens with a direct-answer sentence, and ceges-weboldal-ara has a "Röviden" list. What differs is the payload: competitors' blocks contain the figure or the names; Norbi's contain the factors. His blocks are also unlabelled prose in most articles.

### 4. Headings are the buyer's literal questions, and one URL covers the whole cluster of adjacent questions

- **Shown by:** 1 (18 H2s covering build, shop, redesign, upkeep, maintenance, rented site), 2 (51 H2s), 8 (who, what, how long, how much, how to choose, who it is not for), 12, 14, 16 (17 H2s), 17 (question H2s on a service page), 9.
- **Norbi:** partly present. He uses question H2s and has 7 to 11 question headings per article. But each article covers one question, and the "who does this", "how much" and "how long" questions are either missing or deflected. Competitor pages 1, 8 and 16 answer about ten adjacent questions on one URL, each with a one or two sentence direct answer under the heading.

### 5. Tables that put the comparison in rows and columns

- **Shown by:** 1 (2), 2 (14), 7 (1), 8 (3), 12 (1), 14 (1), 15 (1), 16 (3).
- **Norbi:** partly present. Four of nine articles have one table; ceges-weboldal-ara, before-hiring, mvp-development (EN), ai-automatizalas and ki-kennzeichnungspflicht have none. The competitor tables are attribute-by-option grids with numeric cells (type / price / lead time / who it is for; factor / template / custom; firm / profile / audience). Norbi's existing tables map situation to recommendation or question to good answer, which is useful but carries no extractable values.

### 6. A dedicated URL and H1 that exactly match the service being asked for

- **Shown by:** 6 (`/szolgaltatasok/startup-mvp-fejlesztes/`, cited by 4 engines with almost no content), 17 (`/services/mvp-development`), 10, 12 (`/ki-beratung-kosten/`), 13 (`/ki-kennzeichnungspflicht/`, cited with thin content).
- **Norbi:** absent for MVP. His MVP material is an article under /writing, /hu/irasok and /de/wissen; the service pages are general (web development, AI integration). When the question is "who does MVP development in Hungary", the cited pages are provider pages whose single subject is that service. Pages 6 and 13 are cited with little else going for them on the page, which suggests exact topical match of URL, title and H1 matters on its own. (Their age, 2023 and 2025, may also contribute; not verifiable here.)

### 7. Visible freshness: year in title and headings, plus an explicit "updated" or "data as of" line

- **Shown by:** year in title or H1: 1, 2, 3, 4, 7, 11, 12, 15, 16. Explicit update or as-of line: 7 ("updated in November 2026"), 8 ("Utolsó tartalmi frissítés: 2026. november 25."), 11 ("Stand November 2026"), 12 ("Stand August 2026"), 15 ("Last updated: 4 November 2026"). Visible publish date: 2, 3, 5, 14.
- **Norbi:** partly present. Visible publish date and dateModified in schema; "2026" in the titles of some articles (ceges-weboldal-ara has it). No visible "updated" or "as of" line, and dateModified equals datePublished. Since his facts are not time-sensitive figures, there is currently nothing on the pages that an as-of line would attach to; this pattern follows from pattern 1.

### 8. An entity sentence and countable proof: who, where, for whom, how many

- **Shown by:** 17 ("CompletApp is a Budapest-based product studio that builds MVPs for mobile and web, working in Hungarian and English..."), 8 ("Az Automating magyar AI-cég ... 30-nál több rendszerünk fut élesben"), 10 (title with "Budapest", stat tiles, founder with "46+ projects"), 15 (Zurich, 250+ engineers, ISO certificates, Clutch 4.9 / 46), 3 (per-firm fact block), 1 ("2005 óta", "20+ év"), 2 ("120 cég"), 6 and 16 (named testimonials with city, named client projects with a metric), 8 (two named client case studies with quotes).
- **Norbi:** partly present. He has a real byline, Person schema with job title, and names Instructure and Kineticare in some articles, and one article states "Tizenhét éve dolgozom szabályozott termékeken". What is missing on the matching pages is a single quotable sentence combining name, location, service, audience and languages, and any countable results (project counts, measured outcomes, named client results). Engines answering "who does X in Hungary / Europe" quote exactly that kind of sentence.

### 9. Sources and outbound links to authorities, shown as a list or per row

- **Shown by:** 8 (numbered "Források" with Eurostat, Nemzeti Jogszabálytár, EUR-Lex, each dated), 15 (source link per listed firm, mostly anthropic.com and company newsrooms), 7 (link per firm), 14 (5 sources incl. Search Engine Journal), 1 (W3Techs), 3 (Statista), 2 (tool vendors).
- **Norbi:** weak. Three of nine articles have no outbound link, three have exactly one (EUR-Lex), two have two (law-firm commentary). No sources section. This is a mid-ranked pattern because several cited pages (5, 6, 9, 10, 12, 16, 17) have no authority links at all, so it is not necessary for citation; where numbers are quoted, though, the best-performing guide (8) sources each one.

### 10. Short, verdict-first units: yes/no FAQ answers, "Winner:" lines, "choose X if", and short definitional pages

- **Shown by:** 5 (FAQ answers of one or two sentences opening with "No." / "Not always."), 14 ("Winner:" after each criterion; "Choose a template website if: ..."), 7 ("Which one fits when": "If the goal is X ... that means A, B and C"), 16 ("Nem biztos, hogy mi vagyunk a jó választás, ha" / "Az egyedi fejlesztés akkor térül meg, ha"), 8 ("Kinek nem való az AI automatizálás?"), 9 (a 480-word glossary entry cited on its own).
- **Norbi:** partly present. His FAQ answers are short and his custom-vs-template article has a decision table. He has no glossary-style short pages (shortest article about 1,200 words), no per-criterion verdict lines, and his cost and timeline FAQ answers open with a deferral rather than a verdict.

### Not ranked, but worth knowing

- **Schema is probably not the differentiator.** Norbi already ships Article, Person, BreadcrumbList, FAQPage and Service markup. Competitor JSON-LD could not be checked, so this is not confirmed, but nothing visible suggests Norbi is behind on markup.
- **Writing quality is not the differentiator.** Pages 2 and 5 contain repetition and outright errors and are among the most cited. Pages 6 and 13 are thin. The engines appear to reward extractable facts, named entities and exact topical match over prose quality.
- **Page age.** Norbi's matching articles are 1 to 38 days old at fetch time. Several cited pages are also recent (8, 10, 15 were updated in November 2026), so recency does not rule a page out, but whether Norbi's newest pages (for example the DE cost article dated 2026-11-27) are indexed by the engines' search back-ends was not checked and should be before drawing conclusions about them.
- **Machine-readable delivery.** s-pro.io returned YAML frontmatter with the page content, which suggests a markdown rendition for automated clients. Norbi's repo has llms.txt and llms-full.txt at the root; whether per-page markdown is served was not checked.
- **Third-party directories.** Page 11 is cited as a neutral source for "who" questions. Presence in such directories is a separate route into answers and was not checked for Norbi.
