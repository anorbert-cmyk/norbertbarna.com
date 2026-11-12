# Reach audit, 12 November 2026

Question: does the site work, and is its search and AI reach as good as it can be in Hungarian, English and German?

Short answer: the site works. The reach is weak, for reasons outside the pages themselves.

Per-article data (what each article is optimised for, its structure and its measured results) is in `docs/article-seo.json`. The admin interface can read it directly.

## What was measured

| Check | Source | Result |
| --- | --- | --- |
| Site function | `npm test`, Live QA workflow | Green |
| Google position for 24 topic keywords (HU, DE, US) | DataForSEO SERP, top 50 | Not in the top 50 for any |
| AI Overview citations | Same SERPs, 19 of 24 show an AI Overview | 0 citations |
| Featured snippets | Same SERPs | 0 |
| Ranked keywords in HU, DE, US | DataForSEO Labs | 0 |
| Mentions in ChatGPT and Google AI answers | DataForSEO LLM mentions | 0 |
| Search Console impressions | GSC via PostHog warehouse | About 211 a week (20 to 40 before the German articles), average position about 42 |
| Search Console clicks | Same | 0 in 45 days, 1 all time |
| Pages ever shown in Google | Same, against the sitemap | 32 of 63 |
| Brand query (the owner's name) | SERP | Namesakes on Facebook and Instagram rank; the site appears only in the image pack |
| Analytics pageviews | PostHog, 30 days | 14 pageviews, 5 visitors, consent-gated so an undercount |

## What is working

- Canonical, hreflang, Article, FAQPage and BreadcrumbList schema, sitemap, robots and llms.txt are all in place and checked by `npm test`.
- Long, conversational queries already reach page one. Example: "wer unterstützt mittelständische unternehmen, die ihre website bfsg-konform machen müssen" at position 5.7.
- `/de/wissen/barrierefreie-website-bfsg` carries most of the impressions (315, position 46.7).

## Why the reach is weak

1. No authority. The domain is young and has no external links. The outreach round and the guest pitches are prepared but not sent.
2. Half the pages have never been shown. The Hungarian and German service pages, the German contact page, the German article index and six German articles have no impressions at all.
3. The languages were uneven: 12 German articles, 4 Hungarian, 2 English, while English has the largest demand.

## What this change does

Eight articles, each the Hungarian or English version of an existing German article, chosen by measured search volume:

| New article | Language | Primary keyword | Monthly searches |
| --- | --- | --- | --- |
| ai-hallucinations-in-business-products | EN | ai hallucinations | 14 800 |
| eu-ai-act-transparency-obligations | EN | eu ai act | 8 100 |
| how-much-does-a-business-website-cost | EN | how much does a website cost | 2 400 |
| mvp-development-regulated-products | EN | mvp development | 590 |
| ai-act-jelolesi-kotelezettseg | HU | ai act | 880 |
| human-in-the-loop-emberi-felugyelet | HU | human in the loop | 110 |
| ai-automatizalas-melyik-folyamattal-kezdj | HU | ai automatizálás | 50 |
| weboldal-felujitas-vagy-uj-oldal | HU | weboldal felújítás | 50 |

The site now has 12 German, 8 Hungarian and 6 English articles. Seven translation groups are linked with hreflang, three of them in all three languages.

## What only the owner can do

- Request indexing in Search Console for the pages that were never shown, the service pages first.
- Send the prepared outreach and guest pitches. Without external links the positions will not move much.
- Have a lawyer read the legal articles (AI Act, BFSG, DSGVO and their new versions).

## Next article candidates

Accessibility in Hungarian and English (European Accessibility Act; the Hungarian law needs checking), GDPR and AI in English and Hungarian, AI in customer service in English (4 400 searches), AI hallucinations in Hungarian, custom or template website in English, AI rollout for small business in English (3 600).
