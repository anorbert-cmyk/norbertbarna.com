---
title: "AI for small business: what to do in the first 90 days"
description: "AI for small business in the first 90 days: which workflow to pick, what a person checks, how to measure a pilot and when to stop."
lang: en
slug: ai-for-small-business-first-90-days
date: 2026-11-27T23:30:00+01:00
updated: 2026-11-27T23:30:00+01:00
tags: [ai for small business, ai adoption, ai pilot, ai integration, workflow automation, human oversight]
service: /ai-integration
service_label: AI integration for regulated industries
cover: /assets/images/og/writing/ki-im-mittelstand-einfuehren.jpg
cover_alt: Three folded paper steps rising to the right against a purple background: the three phases of AI for small business in the first 90 days
pair: [de/ki-im-mittelstand-einfuehren, hu/ai-bevezetese-kkv-elso-90-nap]
---
AI for small business starts with one workflow, not with a tool. In the first 90 days you pick one repeated task, write down what the AI may do and what a person checks, try it on real examples, and then measure it in a narrow pilot against the numbers you had before. At the end you do not have an “AI strategy”. You have a decision: continue, change it or stop.

The 90 days are the schedule I propose, not a guaranteed duration. I work with companies across the EU, in English or Hungarian.

## Is your business ready for AI? Three questions

Three questions decide whether a small business is ready for a first AI project.

1. **Is there a task that returns every week in a similar form?** Quotes written from enquiries, incoming invoices matched to orders, customer questions answered from your own documentation. If every case is a one-off, AI is the wrong instrument.
2. **Is the information for that task written down somewhere?** The AI works from your documents, your order system, your inbox. If the knowledge lives in the heads of two colleagues, the first step is documentation, not an AI project.
3. **Who answers for it when the AI is wrong?** A named person who runs the pilot and judges the result.

A fourth question saves the most money: can a rule, a template or a clearer form give the same result without AI?

## What should a small business do in each 30 days?

: The first 90 days of AI in a small business: work and result per phase
| Phase | What happens | What you hold at the end |
|---|---|---|
| Days 1 to 30 | Observe the task, record the baseline, set data and review rules | A bounded problem, access rules, acceptance criteria |
| Days 31 to 60 | Prototype on approved examples with the people who do the work | A testable prototype and a decision on whether to pilot |
| Days 61 to 90 | Narrow pilot in one team with a named owner, measured weekly | A pilot review with numbers and a decision on the next step |

### Days 1 to 30: understand the work and set the limits

Nothing is built in the first weeks. I sit with the people who do the chosen task today and follow it step by step. Four things are written down before day 30:

- **The workflow today**: inputs, hand-offs, repeated decisions, and where people wait, search or ask back.
- **The baseline**: time per case, error rate, number of queries back, from your own records. Industry averages prove nothing about your pilot.
- **The data rules**: which documents and systems the AI may use, what may go to an external provider, what may not, and who approves access.
- **The limits**: what the AI may suggest, what a person must approve, what the AI may not touch, and what happens on a missing or wrong answer.

At Instructure, where I led end-to-end feature development within the Canvas Catalog ecosystem, the guardrails were set on day one: human in the loop, clear AI labelling, editable outputs, source cues and recovery paths. A small business needs the same list, only shorter: the [Instructure case study](/work/instructure) has the details.

### Days 31 to 60: try it before you build it

The second phase produces a prototype that works on representative examples approved for use, anonymised where they contain personal data. It is not a product. It is a workplace where three to five colleagues see the AI’s suggestions, edit them and reject them, including the uncomfortable cases: uncertain output and missing data. Typical findings:

- People need the source next to each suggestion. Without it they re-check everything and save no time.
- The suggestions fail in a recognisable group of cases. The rule then becomes that those cases never go to the AI.
- The documents the AI works from are out of date. Then document upkeep is the real task.

At Instructure, prototyping with Uizard, Galileo and Lovable shortened the cycle from concept to test, and we compared prompt patterns, review states and disclosure models before anything was built. At the end of this phase you decide whether the pilot happens at all. Stopping here is not a failed project: it spares you a build that would not have worked.

### Days 61 to 90: a narrow pilot with a named owner

The pilot runs in one team, connected to the systems you already use. One person owns it and can pause it or roll back to the previous way of working. Three things are measured every week against the baseline: time per case including the time spent reviewing, the share of AI suggestions that were rewritten or rejected, and what the people using it report.

I watch for two warning signs. If people approve everything in two seconds, no review is taking place. If the review takes longer than the work did without AI, the feature brings nothing. On SportsGambit, an AI prediction-market MVP I designed, heavy use of AI-originated recommendations was treated as a risk to monitor, not as a success figure, as the [SportsGambit case study](/work/sportsgambit) states. The patterns that keep a review real are in [Human-in-the-loop AI](/writing/human-in-the-loop-ai).

## What decides whether 90 days are enough?

- **State of the data.** Ordered documents shorten the first phase. Scattered knowledge extends it by weeks.
- **Time from your people.** Observation and prototype need hours from the people who do the work today.
- **Integration.** A prototype that runs beside your order system is quick to make. One that writes into it needs access, permissions and testing.
- **Consequence of a wrong output.** An internal draft tolerates more than a reply that reaches a customer.
- **Number of decision makers.** One team with one decision maker is fast. Three departments are not.

The same factors decide the cost, which is why every project is custom work.

## Which mistakes do small businesses make in the first months?

1. **Starting with the tool.** “We want AI” is not a task. “We process enquiries by hand every week” is. The workflow comes first, the licence last.
2. **Starting too wide.** One measured pilot convinces more than five half-finished ones.
3. **Building for the demo.** Daily work is decided by what happens when the model is wrong, the subject of [AI hallucinations in business](/writing/ai-hallucinations-in-business-products).
4. **Measuring without a baseline.** Without the numbers from before, nobody can say whether the pilot helped.
5. **Bypassing the people who do the work.** If they experience the AI as a threat, it will not be used, however good it is.
6. **Leaving privacy to the end.** Which data the AI sees is settled in the first week.

## Regulation in one paragraph

If your AI system talks to customers, the transparency duties of Article 50 of the EU AI Act apply from 2 August 2026: for example, people must be told that they are interacting with an AI system. The Digital Omnibus on AI (Regulation (EU) 2026/1744) moved the Annex III high-risk obligations, which cover uses such as screening job applicants, to 2 December 2027 and did not postpone Article 50 (source: [National Law Review](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), accessed 21 October 2026). The GDPR applies alongside. These are design questions for the first phase, not legal advice; which category your system falls into is a question for a lawyer. More in [EU AI Act Article 50](/writing/eu-ai-act-transparency-obligations).

## Where to start

AI for small business is not a technology purchase. It is one workflow, changed so that a person stays the decision maker and the result can be measured. Bring the task that returns every week, who does it today and what would count as better. The preparation is in [What to prepare before hiring an AI integration partner](/writing/before-hiring-an-ai-integration-partner), my method is on the [AI integration](/ai-integration) page, and a [first conversation](/contact) needs no more than that.

## Frequently asked questions

### How should a small business start with AI?

Start with one repeated task, not with a tool. Record how it performs today, define what the AI may suggest and what a person approves, test on real examples, then run a narrow pilot with one named owner.

### What is the best first AI project for a small business?

The best first project is a task that returns weekly, works from written information, and produces a draft a person can check quickly, such as quotes from enquiries or answers from your own documentation.

### How much does it cost to implement AI in a small business?

The cost depends on the state of your data, the number of systems to connect, the consequence of a wrong output and the level of human control, not on company size. Every project is custom work, so I give a proposal after the first phase, when the scope is known.

### Do we need our own AI model or a developer on staff?

For a first pilot, usually neither. The work is connecting existing models to your documents and workflow and designing the review. You need one person who knows your systems and owns the pilot; the build can be external.

### What if the AI pilot does not work?

Then after 90 days you have a documented answer on why not, and usually a pointer to what helps instead: better documentation, a clearer workflow, or classic automation without AI.

### How do we protect customer data during an AI pilot?

Use anonymised examples in the prototype, and in the pilot a written rule on which data the AI may see, a data processing agreement with the provider, and a record of what was processed.
