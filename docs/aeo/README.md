# Answer engine visibility: how it is measured

The aim is to be cited by ChatGPT, Google AI Mode, Perplexity and similar answer engines. This folder holds a fixed measurement, so progress is a number and not an impression.

## Files

- `questions.json`: 90 fixed questions, 30 each in Hungarian, English and German. Types: `info` (a question one of our articles answers or should answer), `commercial` (someone looking for a provider), `brand` (someone asking about Norbert Barna or the site). `target` is the page that should be cited, or `null` where no page existed on the day the set was written. Never edit a question; add new ones with new ids.
- `results/<date>.json`: one measurement. For every question and engine: the URLs the answer cited, whether the site was cited or named, and the first 600 characters of the answer.
- `score-<date>.md`: the score of that measurement, printed by `scripts/aeo-score.mjs`.
- `findings-<date>.md`: what the measurement showed and what was changed because of it.

## Taking a measurement

The engines are reached through the Monid connector, so a measurement runs from a Claude session, not from CI. One full run is 270 calls and costs about 0.90 USD.

| Engine | Monid provider and endpoint | Input |
| --- | --- | --- |
| Google AI Mode | `litescrape` `/google/ai-mode` | `q`, `hl`, `gl` (hu/hu, en/us, de/de) |
| ChatGPT (signed out, web search on) | `cloro` `/chatgpt/ask` | `prompt`, `country` (HU, US, DE) |
| Perplexity (sonar) | `dataforseo` `/ai/perplexity-response` | `user_prompt`, `model_name: sonar`, `max_output_tokens: 400`, `web_search_country_iso_code` |

Each call is stored as one small JSON file `<id>.<engine>.json` with `id`, `engine`, `ok`, `cited` (every cited URL, exact), `answer`. Then:

```
node scripts/aeo-score.mjs --collect <raw-dir> docs/aeo/results/<date>.json
node scripts/aeo-score.mjs docs/aeo/results/<date>.json docs/aeo/results/<previous>.json > docs/aeo/score-<date>.md
```

The second command prints the change against the previous measurement.

## Reading the score

Answers are generated per request, so a single question can flip between runs. Compare totals and groups, not single cells. New pages need to be crawled and indexed before an engine can cite them: measure again four to six weeks after a content change, not the next day.
