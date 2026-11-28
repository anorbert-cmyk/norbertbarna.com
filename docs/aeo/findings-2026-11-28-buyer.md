# Findings, 2026-11-28: buyer-language questions and the pages engines cite

## What was measured

36 new questions in the words a buyer uses (`buyer` type in `questions.json`, ids `bhu-`, `ben-`, `bde-`): "best X", "X or Y", "alternatives to X" and concrete situations ("we are a 40 person accounting firm, who can introduce AI with human approval?"). Asked on ChatGPT, Perplexity (sonar-pro, 1024 tokens), Gemini and Claude (Haiku 4.5 with forced web search). Google AI Mode through `litescrape` returned 503 "no upstreams available" all afternoon, so it was asked the same evening through `cloro` `/google/ai-mode` (body `prompt`, `country`, `hl`). Score: `score-2026-11-28-buyer.md`.

Separately, the 17 small-provider pages cited most often in the first two rounds were fetched and compared with the matching pages of this site: `cited-pages-2026-11-28.md`.

## Results

- 0 of 180 answers cite or name the site, Google AI Mode included. Across all rounds the site is cited in 1 of 570 non-brand answers.
- The field is fragmented. On 7 of 36 questions the four engines share not a single cited domain, and the best agreement on any question is one domain cited by four engines.
- "Who" questions are answered from directories: clutch.co (+ themanifest.com) 17 citations, aiagencies.eu 15, barrierefreie-agenturen.de 16, Toptal, Arc and Contra 26, KI-Beratungsatlas 10, German freelancer portals 29, Malt 8, uxagencies.com 8, ai-atlasz.hu 3 (all rounds).
- People are named from conference speaker pages (aisummit.hu, portfolio.hu) and expert directories, rarely from the person's own site.
- Reddit 0 and YouTube 2 of 1,321 citations in this round. List-style URLs ("best", "top", "companies", "alternatives") make up about 20%.
- Gemini gave no sources in 26 of 36 answers; there only what the model already knows counts.

## Why other pages are cited (from the page comparison)

Engines lift facts and names, not prose quality. The cited pages state quantities where the question asks for one, name firms in a list (often with the publisher on it, disclosed), open with a labelled short answer, cover the whole question cluster on one URL, carry tables with values, have a URL and H1 that match the service exactly, and show an update date. This site's schema and writing are not the gap; its matching articles had no figures, no named providers and 0 to 2 outbound links.

## Changed because of it

- The three AI service pages: titles and descriptions now carry the buyer phrases ("Human-in-the-loop AI consulting", "AI automatizálás emberi jóváhagyással", "KI-Beratung mit menschlicher Freigabe") and industry examples.
- 15 key articles (5 topics in 3 languages): a labelled short-answer section, a table with values, a sources section and a visible update date.
- Off-site actions for the owner (directory profiles, speaker pages, LinkedIn) are listed in the project files, with ready-to-paste texts.
