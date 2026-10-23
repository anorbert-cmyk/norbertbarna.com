---
title: "Human-in-the-loop AI for regulated products: 7 patterns"
description: "Human-in-the-loop AI patterns that hold up in review: labels, editable outputs, source cues, failure states, a stop. From shipped work."
lang: en
slug: human-in-the-loop-ai
date: 2026-10-21T09:00:00+02:00
updated: 2026-10-21T09:00:00+02:00
tags: [human in the loop ai, ai integration, ai product design, regulated industries, eu ai act, human oversight]
service: /ai-integration
service_label: AI integration for regulated industries
cover: /assets/images/og/writing/human-in-the-loop-ai.jpg
cover_alt: A folded paper ribbon passing through a paper gate with a small olive checkpoint fold: human-in-the-loop AI review before an output takes effect
pair: de/human-in-the-loop-ki
---
Human-in-the-loop AI means a person reviews, edits or approves what the system proposes before it has an effect, and can override or stop it. In a regulated product that is not a checkbox at the end of the project. It is a set of interface decisions made on day one: what the AI may suggest, what a person must check, how the person sees why, and what happens when the output is wrong.

This article describes seven patterns that held up in review in two products I worked on: AI features in Instructure’s learning platform, and an AI-based prediction-market MVP called SportsGambit. The examples come from those projects; the conclusions are mine.

## What does human-in-the-loop AI mean, and what does it not?

Three terms are commonly used, and they describe different amounts of human control:

- **Human in the loop:** a person approves each consequential output before it takes effect.
- **Human on the loop:** the system acts on its own; a person monitors and can intervene.
- **Human out of the loop:** fully automated, with review only after the fact, if at all.

These are design terms, not legal categories. In regulated industries the right level depends on the consequence of a wrong output, not on how good the model is. A draft that a person edits anyway can tolerate a weaker model; an action that reaches a customer or moves money cannot.

Three things have to be true for a person to be genuinely in the loop. They can see that the AI was involved. They can change or reject the output. And the decision is recorded, so that who accepted what, and on what basis, can be reconstructed later. If any one of these is missing, the person is not in the loop. They are watching it.

## What the EU AI Act asks of human oversight

Article 14 of the EU AI Act requires that high-risk AI systems be designed so the people overseeing them can understand the system’s capacities and limitations, remain aware of automation bias, interpret the output correctly, decide not to use it or override it, and stop it through a “stop” button or a similar procedure (source: [AI Act Service Desk, Article 14](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14), accessed 2026-10-21).

On timing: the Digital Omnibus on AI (Regulation (EU) 2026/1744, in force since 27 July 2026) moved the Annex III high-risk obligations to 2 December 2027 and the Annex I obligations to 2 August 2028. The Article 50 transparency duties, such as telling people they are interacting with an AI system, still apply from 2 August 2026 (sources: [Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/), [National Law Review](https://natlawreview.com/article/eu-digital-omnibus-ai-enters-force), accessed 2026-10-21).

This is a design reading of the text, not legal advice. Whether your system is high-risk is a question for your counsel. What I can say from shipped work is that each of the five oversight abilities in Article 14 maps to an interface decision, and the rest of this article is those decisions.

## Seven human-in-the-loop AI patterns that hold up in review

### 1. Label every AI output

At Instructure, where I led end-to-end feature design within the Canvas Catalog ecosystem, part of a product that several million people used every day, clear AI labelling and disclosure was a guardrail fixed on day one. Every AI suggestion had a label, an edit state and a way back, and nothing the model decided could remain invisible.

Decide before building: the wording of the label, where it sits, and whether it persists after a person has edited the output.

### 2. Explain first, then suggest

The Instructure design principle was “explanation before suggestion”: show the signals and sources behind a suggestion before the suggestion itself. A reviewer who sees why can judge; a reviewer who only sees what can only trust.

Decide: which source cue the reviewer can actually verify in the time they have. A citation nobody opens is decoration.

### 3. Make outputs editable and reversible

Outputs at Instructure were editable and undoable, with explicit review states: draft, reviewed, published. This is the interface form of Article 14’s “decide not to use, override or reverse”. An AI output that can only be accepted or rejected pushes people toward accepting.

### 4. Design the states nobody demos

We shipped accessible component states for empty, loading, error and latency across every product variant. In a review, the failure state is where the questions start: what does the instructor see when the model returns nothing, returns late, or returns something it should not? If the interface hides those states, a person cannot review what they cannot see.

### 5. Show confidence, and keep a deliberate review step

At SportsGambit, a prediction-market MVP with AI agents recommending picks, every tip carried a confidence score, leaderboards let users check an agent’s history before acting on its advice, and a deliberate review step stood before any action. Early product data showed heavy use of AI-originated recommendations; we treated that as a risk to watch, not as a success metric, because automation reliance is exactly the failure mode human oversight is meant to catch. This maps to Article 14’s automation-bias requirement.

The case study also states its boundary: the MVP did not validate production wagering safeguards. Details: [SportsGambit case study](/work/sportsgambit).

### 6. Put legal, compliance and data science in the room early

At Instructure the flows were reviewed jointly with Legal, Compliance and Data Science, and then codified into reusable patterns: prompts, review states, confirmations, feedback loops. They did not stand in our way at the end; they co-wrote the guardrails from the start. A guardrail added after the design is usually a warning dialog nobody reads.

The same held in non-AI regulated work. At Raiffeisen, where I was Product Lead for the mobile banking redesign, PSD2, strong customer authentication, KYC and audit trail arrived as non-negotiables. We kept almost every step and changed how it felt to go through them. That is the regulated-delivery parallel, not an AI example. Details: [Raiffeisen case study](/work/raiffeisen).

### 7. Ship behind flags, measure, and name who can stop it

Features at Instructure went out behind feature flags, and we measured adoption and task completion so that every iteration built on what the data showed. In my [AI integration work](/ai-integration) the same idea becomes step four of the method: a bounded pilot with a named owner who can pause it or roll back to the previous version.

Decide: who owns the stop, how fast it can happen, and what is logged for later review.

## What to decide before you build: eight questions

1. What is the consequence of a wrong output, and for whom?
2. What may the AI suggest, and what must a person approve?
3. What does the reviewer see to judge the output?
4. How does the reviewer edit, reject or reverse it?
5. What happens on empty, missing or late output?
6. Who can stop the feature, and how fast?
7. What is logged for later review?
8. Which measures decide whether the pilot continues?

If these questions do not have answers yet, that is where the AI product design work starts, and human oversight is its first deliverable. In my method the second step, before anything is built, is defining access and human control: what the AI can suggest, what a person must review, and what happens when an answer is missing or wrong. If you are comparing partners, [what to prepare before hiring an AI integration partner](/writing/before-hiring-an-ai-integration-partner) lists the inputs that make that conversation useful.

## What made it hard

Most AI projects start with what can be automated. At Instructure we started with what must stay human. The hard part was ethical, not technical: designing for the AI being wrong, biased or misused, instead of pretending those cases would not occur. That does not make for an impressive slide deck. It makes for AI that real institutions can roll out to millions of people and still sleep at night. Details: [Instructure case study](/work/instructure).

## Frequently asked questions

### What is human-in-the-loop AI?

A workflow in which the system proposes and a person decides at defined points, with enough information to decide well. The person can see the AI was involved, can change or reject the output, and the decision is recorded.

### Does the EU AI Act require human in the loop?

Article 14 requires effective human oversight for high-risk systems, including the ability to override and to stop the system. It does not prescribe one interface pattern. Whether a system is high-risk is a legal question; this article is not legal advice.

### When do the high-risk obligations apply?

After the 2026 Digital Omnibus: Annex III systems from 2 December 2027, Annex I systems from 2 August 2028. Article 50 transparency duties apply from 2 August 2026.

### Does human review slow everything down?

It moves effort to where a mistake costs most. Measure review effort in the pilot: if reviewers approve everything in two seconds, the loop is not working; if review takes longer than the original task, the feature is not working either.

### Can a small team do this?

Yes. The patterns are interface decisions, not infrastructure. Start with one workflow, one label, one edit state and one named owner.

### What is automation bias?

The tendency to over-trust a system’s output. The design response is visible confidence, verifiable sources and a deliberate review step before any action.

### Do you work with teams in Germany and the rest of the EU?

Yes. Communication is in English or Hungarian; German-speaking teams work with me in English.

## Where to start

Human-in-the-loop AI is easier to design than to retrofit. The product that passes review is the one where every AI output already had a label, an edit state and a way back. Bring the workflow and the decision you are worried about, and [we start there](/contact).
