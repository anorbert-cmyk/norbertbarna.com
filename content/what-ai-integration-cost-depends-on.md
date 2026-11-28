---
title: "AI integration cost: what it depends on at mid-size"
description: "AI integration cost for a mid-size company depends on eight factors. How each moves the price, what to stage, how to compare quotes."
lang: en
slug: what-ai-integration-cost-depends-on
date: 2026-11-27T23:30:00+01:00
updated: 2026-11-27T23:30:00+01:00
tags: [ai integration cost, ai integration, ai implementation cost, ai integration pricing, ai pilot, ai running costs]
service: /ai-integration
service_label: AI integration for regulated industries
cover: /assets/images/og/writing/ai-integration-cost.jpg
cover_alt: A folded paper balance scale in forest green on a lilac background, one pan holding three stacked olive paper blocks, the other one larger green block: what AI integration cost depends on
pair: [hu/ai-fejlesztes-ara-mitol-fugg, de/ki-beratung-kosten]
---
For a mid-size company, AI integration cost depends far more on the work around the model than on the model. Eight factors decide it: the scope of the workflow, the readiness of your data, the number of integrations, the level of human review, how the output is evaluated, risk and regulation, the languages involved, and who maintains the result after launch. Two quotes for the same request can differ widely and both be fair, because they answer those eight questions differently.

There are no price figures in this article. Every AI integration is custom work, and a number without a scope says nothing about your project. I work with companies across the EU, in English or Hungarian.

## Why do quotes for the same AI project differ so much?

Quotes for an AI project differ because the word “integration” covers very different amounts of work. One quote prices a model connected to a chat window. Another prices the same model connected to your CRM, with permissions, a review step, an evaluation set, failure states and a handover. A quote that cannot say what happens when the output is wrong has priced a demo.

## What does AI integration cost depend on? Eight factors

### 1. The scope of the workflow

Scope is how many steps, people and decisions the process touches, and how often it runs. Summarising one type of incoming document for one team is a small scope. Classifying, routing and answering across departments is several projects. Narrowing to one repeated task is the strongest cost lever you control.

### 2. The readiness of your data

Tidy, accessible data with a clear owner becomes a reliable result faster than scattered sources. Cost rises when the knowledge lives in mailboxes and shared drives, when nobody knows which version is current, or when approval to use the data is missing.

### 3. The number of integrations

Every system the feature reads from or writes to adds mapping, permissions, testing and failure handling. A documented interface costs less to connect than a legacy system. Reading is cheaper than writing: drafting a reply for a colleague is a smaller job than changing a customer record.

### 4. The level of human review

A review step is designed work: an interface for checking, editing and rejecting, and a record of who accepted what. Internal drafts need light review. Anything that reaches a customer or moves money needs sign-off on every output. The patterns are in [Human-in-the-loop AI for regulated products](/writing/human-in-the-loop-ai).

### 5. Evaluation

Evaluation is the set of your own examples, with expected results, that the feature is tested against before launch and after every change. Building that set takes time from the people who know the work. Without it nobody can say whether the pilot helped or whether a model update made it worse.

### 6. Risk and regulation

Personal, health or financial data and decisions that affect people need more design, testing and documentation. EU AI Act obligations widen the evidence you will want to keep. These are design questions here, not legal advice: which rules apply to you is for your counsel. The labelling duties are covered in [EU AI Act Article 50: what product teams must label now](/writing/eu-ai-act-transparency-obligations).

### 7. Languages

Each language the feature must understand or answer in needs its own test examples and its own reviewers. Source material in one language and answers in another add a further quality check. Name the launch languages before asking for a quote.

### 8. Who maintains it after launch

A feature your team will run needs documentation and a handover. A feature the partner keeps running needs a support agreement. Either way someone must own evaluation, source updates and the decision to pause or roll back.

: AI integration cost factors: what makes each one cheaper or more expensive
| Factor | Makes it cheaper | Makes it more expensive |
|---|---|---|
| Workflow scope | one repeated task, one team | several departments, many decision points |
| Data readiness | approved, current sources with an owner | scattered, duplicated or unapproved sources |
| Integrations | one documented system, read only | several systems, legacy interfaces, write access |
| Human review | internal drafts a colleague edits anyway | sign-off and audit trail on every output |
| Evaluation | existing examples of good and bad results | no baseline, examples must be collected first |
| Risk and regulation | internal, low-consequence use | regulated data, decisions affecting people |
| Languages | one language in and out | several languages, cross-language answers |
| Maintenance | a named owner on your side | no owner, open-ended support expected |

## What can be staged: discovery, prototype, pilot

An AI integration can be bought in stages. Each stage ends with a decision, and you can stop after any of them.

1. **Discovery.** We map the task with the people who do it and check whether simpler rules or a clearer interface would solve it. You leave with a focused problem, an initial scope and a baseline.
2. **Prototype.** We test on representative, approved examples, including uncertain outputs, unavailable data, editing and recovery. You leave with evaluation examples and a build decision.
3. **Pilot.** A bounded version connected to your systems, with permissions, review states, failure paths and a named person who can pause it.
4. **Rollout.** Wider use, once the pilot is measured against the baseline.

Staging lowers the risk: you commit to a build only after the prototype has shown what the task needs. The steps are on my [AI integration](/ai-integration) page, and [what to prepare before hiring an AI integration partner](/writing/before-hiring-an-ai-integration-partner) lists the inputs that keep discovery short.

## An example: where the work went at Instructure

At Instructure I led end-to-end feature design for AI features in an enterprise learning platform. What shipped: an AI pattern library, a guardrail framework (human in the loop, editability, audit, recovery), accessible component states for empty, error, loading and latency, content guidelines for AI disclosures, and instrumentation hooks for ongoing evaluation. Legal, Compliance and Data Science reviewed the flows from the start.

The lesson for cost: none of that list is “the model”. Review, failure states, disclosure and evaluation were the work: factors four, five and six. Details: [Instructure case study](/work/instructure).

## Which running costs do people forget?

Running costs start on launch day. Ask for each of these as a separate line in the quote:

- **Model usage.** Usage is billed by volume, so it grows with the number of cases and the length of the documents. Ask how it will be capped and reported.
- **Monitoring.** Someone has to check output quality and review effort regularly, and rerun the evaluation set when the model or the prompts change.
- **Source maintenance.** A feature that answers from your documents is only as current as those documents, so policies, price lists and product data need an owner. An outdated source produces a wrong answer, as I describe in [AI hallucinations in business](/writing/ai-hallucinations-in-business-products).
- **Reviewer time.** Approving outputs takes your team’s hours. Measure them in the pilot.
- **Changes.** A new model version or a changed interface in a connected system means retesting.

## How do you compare two AI integration quotes?

Two AI integration quotes are comparable only when they describe the same scope. Put the same questions to everyone who quotes, me included:

1. Which workflow and which users does the quote cover, and what is explicitly not in scope?
2. Which systems are connected, and does the feature read, write or both?
3. What does a person review, and what does the interface show when the output is wrong, empty or late?
4. How is quality evaluated on our own examples, and who builds the example set?
5. Where does the quote stop: discovery, prototype, pilot or rollout?
6. Which running costs are included, and which does a vendor bill to us directly?
7. Who owns the feature and the evaluation set after handover, and who can pause it?

If one quote answers all seven and the other answers three, the price difference is the four missing answers.

## Where to start

AI integration cost follows from scope, and you can write the scope down before any partner is involved. Pick one workflow, name the systems and data it touches, decide what a person must approve, and say which languages matter at launch. [Send me that description](/contact) and I will tell you which stage makes sense first.

## Frequently asked questions

### What does AI integration cost depend on for a mid-size company?

Eight factors: workflow scope, data readiness, number of integrations, level of human review, evaluation, risk and regulation, languages, and who maintains the feature after launch.

### How much does it cost to integrate AI into a business?

No single figure is honest, because the same request can mean a model behind a chat window or a reviewed, evaluated feature connected to several systems. I quote after the workflow, data and integrations are described.

### Is it cheaper to buy an off-the-shelf AI tool than to build a custom integration?

At launch, usually yes, and for a general task it is often the right choice. A custom integration earns its cost when the feature must work on your data, inside your systems, with your review rules.

### Can we start small with AI integration?

Yes. Discovery alone gives you a decision about whether to go further, and a prototype on approved examples shows what the build needs before you commit.

### What are the ongoing costs of AI after launch?

Model usage billed by volume, monitoring and re-evaluation, keeping source material current, reviewer time, and retesting when a model version or a connected system changes.
