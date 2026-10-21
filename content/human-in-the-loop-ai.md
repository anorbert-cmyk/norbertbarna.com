---
title: "Human-in-the-loop AI: what it means in a regulated product"
description: What human-in-the-loop AI means in practice for a regulated product, from review states to recovery paths, drawn from shipped work.
lang: en
slug: human-in-the-loop-ai
date: 2026-10-21T20:00:00+02:00
updated: 2026-10-21T20:00:00+02:00
tags: [human in the loop ai, ai integration, ai product design, regulated industries]
service: /ai-integration
service_label: AI integration for businesses
---
"Human in the loop" is easy to put on a slide and hard to put in a product. In a regulated setting it is not a person who glances at the output now and then. It is a set of interface states, permissions and fallbacks that decide what the AI may do on its own, what a person must confirm, and what happens when the model is wrong.

This article describes what that looked like in two products I worked on: AI features in Instructure's learning platform, and an AI-based prediction-market MVP called SportsGambit. The examples come from those projects; the conclusions are mine.

## A working definition

Human-in-the-loop AI is a workflow in which the system proposes and a person decides, at defined points, with enough information to decide well. Three things have to be true:

- **The person can see that the AI was involved.** Output is labelled, not blended into human-written content.
- **The person can change or reject the output.** An edit state and a way back exist for every suggestion.
- **The decision is recorded.** Who accepted what, and on what basis, can be reconstructed later.

If any one of these is missing, the human is not really in the loop. They are watching it.

## Why regulated products need it

In regulated environments, the cost of a wrong answer is not only a bad experience. It can be a compliance breach, an unfair decision about a person, or a loss that someone has to explain to an auditor. Customers in education, public sector, healthcare and finance do not buy impressive demos. They buy something they can roll out to many people and defend afterwards.

Regulation is moving in the same direction. The EU AI Act requires human oversight for high-risk AI systems (Article 14), and its list of high-risk uses includes areas such as education and access to essential services. Whether a given feature falls under that list is a legal question, but the product patterns that satisfy human oversight are the same ones that make an AI feature trustworthy in the first place.

## What it looked like at Instructure

At Instructure I led end-to-end feature design within the Canvas Catalog ecosystem, part of a product that several million people used every day. Every AI suggestion needed to be explainable, editable and auditable. We set the guardrails on day one, before any feature was designed:

- **Clear AI labelling and disclosure.** Users always knew which content the AI had produced.
- **Editable outputs.** Generated pages and assignments came with human-review safeguards and could be changed before anyone relied on them.
- **Source cues.** Suggestions showed the signals and sources behind them: explain first, then suggest.
- **Recovery paths.** Every suggestion had a way to back out.
- **Audit-ready controls** for AI applied to regulated content, such as legal material, with explicit human override.

Two decisions mattered more than any single screen.

First, Legal, Compliance and Data Science co-reviewed the flows from the start. They were not a gate at the end; they wrote the guardrails with us. That is the only way I have seen it work, because a guardrail added after the design is usually a warning dialog nobody reads.

Second, we designed for failure modes instead of hoping they would not happen. We mapped how the AI could be wrong, biased or misused, and built flows for those cases. Empty, loading, error and latency states were explicit, because a person cannot review what the interface hides.

These patterns were then codified into a reusable library: prompting, sources, review and confirm states, and feedback loops. One AI pattern across many contexts meant users met the same review behaviour everywhere, and teams did not reinvent it for each feature.

## What it looked like at SportsGambit

SportsGambit was a prediction-market MVP with AI agents recommending picks. The risk here was different: speed. The product had to let users review time-sensitive picks quickly, and the temptation was to remove friction until the AI was effectively deciding.

We kept a deliberate review step before any action. Each recommendation carried a confidence signal and return context, and performance leaderboards let users check an agent's track record before acting on its advice. The design question was whether a new user could understand a card in a few seconds and still feel in control of the choice.

Early telemetry showed heavy use of AI-originated recommendations. We treated that as a risk to monitor, not a success metric, because automation reliance is exactly the failure mode human oversight is meant to catch. The case study also states what was not shipped: production-grade safeguards such as eligibility checks, deposit and loss limits and self-exclusion would have been launch requirements before any real-money release.

## Patterns that carry over to other products

Across both projects, the same handful of decisions did most of the work:

1. **Decide what must stay human before deciding what to automate.** Start from the decision a person is accountable for, then let the AI prepare it.
2. **Make AI output a draft by default.** Review states, not publish buttons.
3. **Show why.** Sources, signals or confidence next to the suggestion, with optional depth for people who want it.
4. **Design the failure paths.** Wrong answer, missing data, slow response, unavailable model. Each needs a state and a way forward.
5. **Record decisions.** Who accepted, edited or rejected a suggestion, so the workflow can be audited and improved.
6. **Measure review effort, not only adoption.** If reviewers approve everything in two seconds, the loop is not working. If review takes longer than the original task, the feature is not working either.

## Questions to ask before you add AI to a regulated workflow

- Which decisions in this workflow is a person accountable for?
- What happens to the user, or to a third party, if the AI is wrong?
- Can the user see, edit and reject every AI output?
- What does the interface show when the model is slow, unsure or unavailable?
- Who reviews the guardrails, and when: at the start or before launch?
- How will you know whether people are reviewing or just approving?

If these questions do not have answers yet, that is where the work starts. In my [AI integration work](/ai-integration) the second step, before anything is built, is defining access and human control: what the AI can suggest, what a person must review, and what happens when an answer is missing or wrong. The [Instructure](/work/instructure) and [SportsGambit](/work/sportsgambit) case studies show the patterns in their original context.
