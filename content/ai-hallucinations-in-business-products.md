---
title: "AI hallucinations in business: what a product has to do"
description: "AI hallucinations cannot be switched off, only contained: sources, drafts, abstention, human review. Seven patterns from shipped work."
lang: en
slug: ai-hallucinations-in-business-products
date: 2026-11-12T12:00:00+01:00
updated: 2026-11-12T12:00:00+01:00
tags: [ai hallucinations, how to prevent ai hallucinations, llm hallucination, retrieval augmented generation, human in the loop ai]
service: /ai-integration
service_label: AI integration for regulated industries
cover: /assets/images/og/writing/ki-halluzinationen-im-unternehmen.jpg
cover_alt: A folded sheet of paper with one loose corner lifting away, next to a small olive check mark: containing AI hallucinations in a business product
pair: de/ki-halluzinationen-im-unternehmen
---
AI hallucinations are outputs of a language model that read convincingly but are wrong or invented. In a business product you cannot switch them off, you can only contain them: the AI works from your own sources and shows them, the output is a draft that a person edits, and where no source exists the system says “I don’t know” instead of guessing. A team that builds this into the interface has not removed hallucinations, but it has taken away their effect.

Most writing on the subject explains what a hallucination is and why it happens. This article starts after that point: what does a product team building an AI feature for employees or customers do so that a wrong answer causes no damage? The seven patterns come from two products I worked on: AI features in Instructure’s learning platform, and an AI-based prediction-market MVP called SportsGambit.

A note on collaboration: I work with companies across the EU, in English or Hungarian.

## Why does AI hallucinate? Three sentences

A language model does not predict the truth, it predicts the most likely next word. Where its training holds no facts, it fills the gap with something that sounds plausible. And the usual evaluation methods reward guessing: a research paper from OpenAI shows that a model which guesses when unsure scores better on the common tests than one that abstains, because “I don’t know” earns zero points and a lucky guess earns one (source: Kalai, Nachum, Vempala, Zhang, [Why Language Models Hallucinate](https://arxiv.org/abs/2509.04664), 4 September 2025, accessed 21 October 2026).

The consequence for the product: the model will not become careful on its own. The care has to be built into the interface and the workflow.

## Which AI hallucinations actually hurt a business

Not every wrong answer costs the same. Three kinds come up most often in the company projects I see:

- **Invented sources and numbers.** The AI cites a policy, a clause or a price that does not exist. Dangerous, because the output looks like evidence.
- **Mixed-up cases.** The AI answers one customer’s question with another customer’s data, because two documents looked alike. In customer service, and anywhere personal data is involved, this is the most expensive mistake.
- **Outdated truth.** The answer was correct two years ago. The document it came from was never updated. Strictly speaking this is not a hallucination, but to the user it is the same thing.

The second and third kind do not start in the model. They start in your data. That is why the work against hallucinations begins with a plain question: which sources is the AI allowed to work from at all?

## How to prevent AI hallucinations, and contain the rest: seven patterns

### 1. The AI works from your sources, not from its memory

The technique is called retrieval augmented generation, RAG for short: the system first finds the relevant passages in your documents, then has the model answer from them. This cuts the number of invented facts considerably. It does not remove them, because the model can still summarise the passages it found incorrectly. RAG is the foundation, not the solution.

### 2. The source sits next to the answer

Every answer shows which document and which passage it came from, and the user gets there in one click. At Instructure this was one of the guardrails from day one: source cues on every AI output, so that educators can see what a suggestion rests on. Without a visible source, users either check everything, and the time saving is gone, or they check nothing, and the error goes through. Details are in the [Instructure case study](/work/instructure).

### 3. The output is a draft, not a result

The AI writes, the person sends. The field is editable, discarding takes one click, and the product does not say “done”, it says “draft for review”. That one word in the interface changes how people treat the output.

### 4. Abstaining is an allowed answer

When the search finds no matching passage in your sources, the system does not fall back on the model’s general knowledge. It says: “I found nothing on this in the documents.” This has to be designed and tested explicitly, because left to itself the model prefers to guess. A system that abstains ten times a day is better than one that is convincingly wrong ten times a day.

### 5. Confidence is shown, not claimed

In SportsGambit every AI recommendation carried a confidence score and the agent’s track record so far, so users could weigh the recommendation before acting on it. Early telemetry also showed a risk: users leaned heavily on the AI suggestions. That made the visible confidence score and a deliberate review step before each action more important, not less. A confidence score is no proof of correctness. It tells the user how much checking the answer deserves. Details are in the [SportsGambit case study](/work/sportsgambit).

### 6. Review is tiered by consequence

Not every output needs the same control. An internal summary can come straight from the AI. A draft reply to a customer is approved by a person. Anything that moves money, touches a legal position or prepares a decision about a person does not go out automatically at all. I describe this tiering in more detail in the article on [human-in-the-loop AI](/writing/human-in-the-loop-ai).

### 7. Errors are measured, not just retold

The pilot measures how often drafts are rewritten or discarded, how often the system abstains, and which questions lead to wrong answers. That list is the most valuable document in the project. It shows which sources are missing or out of date, and it is the evidence you put in front of management and data protection to show that the review works.

## What this means for choosing a model

“Which AI hallucinates the least?” is a common question, and the answer changes with every model generation. For a business product it is secondary. A mediocre model with clean sources, visible evidence and human review is more reliable than the best model answering freely from memory. The model can be swapped later. The sources, the interface and the workflow stay.

The same logic applies when you compare vendors: ask how the product behaves when the model is wrong, not which model is inside. I cover those questions in [what to prepare before hiring an AI integration partner](/writing/before-hiring-an-ai-integration-partner).

## What the EU AI Act says about it

The EU AI Act does not require error-free AI. For high-risk systems it requires human oversight (Article 14), and for AI that interacts with people it requires transparency (Article 50, which applies from 2 August 2026). The patterns above are the design answer to both requirements. This is a product designer’s reading, not legal advice.

## Where to start

The question is not whether your AI hallucinates. It does. The question is whether your product is built so that a wrong answer gets noticed before it takes effect. If you are planning an AI feature, or want an existing one reviewed, I can tell you in one conversation which of the seven patterns is missing first in your case: [get in touch](/contact). The method is described on the [AI integration](/ai-integration) page.

## Frequently asked questions

### What does it mean when an AI hallucinates?

The model produces an output that sounds plausible but is wrong or backed by no source: an invented quote, a policy that does not exist, a wrong number. The model is not “lying”. It has no concept of true and false, only of likely.

### Can you completely prevent AI hallucinations?

No. You can reduce them considerably by having the AI work from your sources and abstain when no source exists, and you can contain their effect by having a person review the output before it takes effect. A vendor who promises you hallucination-free AI is describing the product inaccurately.

### Does RAG stop LLM hallucinations?

It helps against invented facts. It does not help against wrong summaries of the passages it found, against outdated documents or against mixed-up cases. That is why RAG always comes with visible sources and a review step.

### Who is liable when a company’s AI gives a wrong answer?

The company that uses the output or passes it on to customers, not the model provider. That is exactly why human approval on consequential outputs is not mere caution: it is the place where the responsibility sits. The precise liability position is a question for your legal counsel.

### Which AI model has the fewest hallucinations?

That changes with every model generation, and for your use case only a measurement on your own documents counts. In the prototype we test several models on the same examples and choose on that basis, not from a leaderboard.

### Do you work with companies in Germany and the rest of the EU?

Yes. I work with companies in Hungary, Germany and the rest of the EU. Communication is in English or Hungarian; German-speaking teams work with me in English.
