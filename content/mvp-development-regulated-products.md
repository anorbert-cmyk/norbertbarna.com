---
title: "MVP development for regulated products: what must be real"
description: "MVP development for fintech, health and other regulated markets: what you can leave out, what must be real on day one, and how."
lang: en
slug: mvp-development-regulated-products
date: 2026-11-12T12:00:00+01:00
updated: 2026-11-28T12:00:00+01:00
tags: [mvp development, fintech mvp, mvp for regulated industries, minimum viable product, saas development]
service: /web-development
service_label: Web development and product design for SaaS and fintech
cover: /assets/images/og/writing/mvp-entwicklung-regulierte-produkte.jpg
cover_alt: A small, cleanly folded paper shape on a solid dark green paper base, with room around it for further folds: MVP development for regulated products
pair: [de/mvp-entwicklung-regulierte-produkte, hu/mvp-fejlesztes-szabalyozott-termekhez]
---
An MVP, a minimum viable product, is the smallest version of a product that lets you test one central assumption with real users. In MVP development for a regulated market, such as payments, health, insurance or gambling, the principle is the same, with one restriction: what you may leave out is scope. What you may not leave out is everything that concerns trust and permissibility: identity verification, consent, data protection, secure confirmation of consequential actions, traceability. Those are real on day one, or the product does not go to real users.

This article describes how building an MVP for regulated industries differs from the startup textbook, what had to be real on day one in projects I worked on, and what the process looks like from hypothesis to first user. I work with companies across the EU; the work runs in English or Hungarian.

## In short: an MVP for a regulated market

- **Definition:** an MVP, a minimum viable product, is the smallest version of a product that lets you test one central assumption with real users.
- **The rule:** you may cut scope. You may not cut identity verification, consent, data protection, confirmation of consequential actions or traceability. A facade is allowed, a fake foundation is not.
- **Prototype or MVP:** a prototype is not functional and does not go to real users; an MVP is functional and does. In a regulated product the prototype comes first, because the critical flows can be tested before any duties apply.
- **AI in the MVP:** if users interact with an AI system, the AI Act’s transparency rules (Article 50) apply from 2 August 2026, to an MVP as well. The European Commission lists credit scoring among the high-risk use cases, whose rules apply from 2 December 2027.
- **What sets the duration:** the duty list and the integrations, such as identity verification and payment, more than the features.

## What is an MVP, and what can it not be in a regulated market?

The lean startup idea behind the MVP is build, measure, learn, in short loops, with as little effort as possible. A landing page, a clickable dummy or a facade operated by hand is often enough to find out whether anyone wants the product.

Regulated markets set two limits on that.

The first is legal. As soon as real users bring real money, real health data or real identities, duties apply that no MVP status suspends: the General Data Protection Regulation, payment services rules such as PSD2 with strong customer authentication, anti-money-laundering rules with identity verification and, depending on the product, the AI Act, Regulation (EU) 2024/1689 (source: [EUR-Lex, Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), accessed 22 October 2026).

The second is about what you are measuring. In these markets trust is the assumption under test. A fintech MVP that feels unsafe at the moment a payment is confirmed does not tell you whether the idea is good. It only tells you that users do not trust the product.

That gives the split this article proposes: **a facade is allowed, a fake foundation is not.**

## What you can leave out

- Secondary features that are not part of the central assumption: settings, exports, statistics, multiple languages.
- Automation behind the scenes. Much of what a system will do later can be done by a person in the MVP, as long as the user does not notice and no duty is breached.
- Scale. An MVP has to carry a hundred users, not a hundred thousand.
- Polish in the design. Clear and consistent, yes. Refined, no.

None of this is a compromise on quality. It is the point of an MVP: every feature you do not build is a week you spend learning instead.

## What must be real on day one

### 1. Identity and consent

Whoever signs up has to be who they say they are, where the product requires it, and has to know what they are consenting to. At Benker, a banking platform on blockchain infrastructure, I was responsible for the entire entry into the product: onboarding, the KYC check, card linking with 3DS confirmation. None of it was a placeholder in the MVP. The work was to design the mandatory steps so that people who had never opened a bank account in an app understood them and got through: clear guidance, visible progress, errors explained, a way back. Details: [Benker case study](/work/benker).

### 2. Confirmation of consequential actions

Deposit, execute, withdraw. Each of these actions needs a confirmation that shows what will happen, what it costs and whether it can be undone. At Benker we introduced one consistent presentation for every state, open, pending, successful, failed, escalated, so that the product behaves the same way everywhere. That sounds like polish. It is foundation: a user who does not know whether their transfer is on its way calls support or leaves.

### 3. Data protection in the code, not in the policy

Consent before tracking, data minimisation, encrypted transport, a strict Content Security Policy. On Kineticare, a health platform I designed and built, analytics tools stay off until the visitor agrees, and the application ships with a strict security policy. A health product carries more data protection risk than a portfolio site, and that has to be right in the code, not on a page of legal text. Details: [Kineticare case study](/work/kineticare).

### 4. Traceability

Who approved what and when, which version of the terms the user accepted, which decision a system made. These records cannot be produced after the fact. In the MVP they can be simple, but they have to be complete from the start.

### 5. With AI: labelling, review, confidence

At SportsGambit, an AI-supported prediction-market MVP, every recommendation carried a confidence score and the agent’s track record, and a deliberate review step stood before any action. Early telemetry showed that users relied heavily on the AI suggestions, which we treated as a risk, not as a success. The AI Act names this tendency: Article 14(4)(b) asks that the people overseeing a high-risk system “remain aware of the possible tendency of automatically relying or over-relying on the output”, which it calls automation bias. The patterns behind this are described in [human-in-the-loop AI for regulated products](/writing/human-in-the-loop-ai).

The case study draws a clear boundary here. It describes the information architecture and the explainability of the MVP, and it does not claim that production-grade safeguards for real-money betting were shipped. Before a launch with real money, age and location checks, deposit and loss limits, self-exclusion options and a legal review would be launch requirements. Details: [SportsGambit case study](/work/sportsgambit).

## The process: from hypothesis to first user

1. **Name the one assumption.** What has to be true for the product to make sense? One sentence, measurable.
2. **Write the duty list.** Which rules apply the moment a real user arrives. Legal counsel co-writes this list, in the first week.
3. **Separate facade from foundation.** Everything that is neither the assumption nor a duty goes on the “leave out” or the “by hand” list. Everything else is built for real.
4. **Design the critical flows first.** Onboarding, confirmation, errors, the way back. Prototype, test with users and revise before a line of product code is written.
5. **Build in short loops,** with measurement from the start: where users drop off, where they call, where they hesitate.
6. **Launch with a few real users,** behind restricted access, with one named owner who reads the numbers every week.
7. **Decide.** Extend, rebuild or stop, based on what users did, not on what they said.

The order matters. Step two comes before any design work because the duty list decides how much of the product is foundation and how much can stay facade.

: MVP development for a regulated product: what is ready at the end of each phase, and who must take part
| Phase | Ready at the end | Who must take part |
|---|---|---|
| Assumption and duty list (steps 1 and 2) | One measurable assumption; a written list of the rules that apply once a real user arrives | Founder or product owner, legal counsel |
| Facade and foundation (step 3) | Three lists: leave out, do by hand, build for real | Product owner, designer, lead developer |
| Critical flows (step 4) | A prototype of onboarding, confirmation, errors and the way back, tested with users and revised | Designer, test users, whoever reviews compliance |
| Build (step 5) | A working product with real identity checks, consent, confirmations and records; measurement switched on | Developers, designer, the identity and payment providers |
| Restricted launch (step 6) | A few real users behind restricted access; numbers read every week | One named owner, support |
| Decision (step 7) | A documented decision: extend, rebuild or stop | Product owner and whoever funds the next stage |

## Who builds an MVP for a regulated market?

A small team builds it: one person who owns the product decisions, a designer for the critical flows, one or more developers, and legal counsel who co-writes the duty list. Identity verification and payment are usually connected from specialised providers, not built from scratch. I cover the product design and the web development; the legal review stays with your counsel.

## What is ready at the end of an MVP?

At the end of an MVP you have a working product in the hands of a few real users, complete records of who consented to and approved what, and measurements of where users dropped off or hesitated. You also have a decision on the one assumption: extend, rebuild or stop. What you do not have yet is scale, secondary features or refined design.

## What effort and cost depend on when you commission an MVP

- Which duties apply: identity verification, payment processing, health data, AI labelling.
- Whether payments or third-party systems are integrated.
- How much of the foundation already exists, for example a design system or a component library.
- The number of platforms: web, iOS, Android.
- How many users the launch has to carry.

I do not quote a fixed price, because every project is individual work; the price follows once the duty list and the one assumption are settled. How I approach this kind of SaaS development and product work is described on the [web development and product design](/web-development) page.

## Where to start

An MVP in a regulated market is small in scope and complete in its foundation. That holds with or without AI, for a web application as much as for a mobile app. Tell me your one assumption and the market the product launches in, and in one conversation I will tell you what belongs on the duty list and what you can safely leave out: [get in touch](/contact).

## Sources

- [AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), European Commission, Shaping Europe’s digital future, accessed 28 November 2026
- [Article 14: Human oversight](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-14), AI Act Service Desk, European Commission, accessed 28 November 2026

## Frequently asked questions

### What does the MVP approach mean?

It means building the smallest version of a product that lets you test one central assumption with real users, and then learning from what those users do before you build more. The approach comes from the lean startup method.

### How long does MVP development take?

In regulated markets, a few weeks to a few months, depending on the duty list and the integrations. The mandatory steps, such as identity verification and payment, determine the duration more than the actual features do.

### What is the difference between a prototype and an MVP?

A prototype tests whether people understand a flow; it is not functional and does not go to real users. An MVP is functional, goes to real users and tests whether they use it. In regulated products the prototype comes before the MVP, because it lets you test the critical flows before any duties apply.

### Can you build an MVP with no-code tools?

For the facade, yes. For identity verification, payment, data protection and logging, only if the platform demonstrably meets those requirements. That has to be checked before the launch, not after it.

### Does the EU AI Act apply to an AI MVP?

If users interact with an AI, the Article 50 transparency duty has applied since 2 August 2026, and it applies to an MVP too. High-risk obligations, for example for credit decisions, apply from 2 December 2027 following the 2026 Digital Omnibus. This is a product team’s reading, not legal advice.

### What must a fintech MVP include from day one?

Everything that concerns trust and permissibility: identity verification and consent, a clear confirmation for every consequential action, data protection built into the code, and complete records of who approved what. Features can wait. These cannot, because without them the product may not go to real users at all.
