---
title: "AI automation: which business process to automate first"
description: "AI automation works best on a first process that is frequent, reads messy input, is checked by a person and is cheap to get wrong."
lang: en
slug: which-process-to-automate-with-ai-first
date: 2026-11-27T23:30:00+01:00
updated: 2026-11-28T12:00:00+01:00
tags: [ai automation, business process automation, ai integration, ai audit, human in the loop ai, ai pilot]
service: /ai-integration
service_label: AI integration for regulated industries
cover: /assets/images/og/writing/ki-automatisierung-erster-prozess.jpg
cover_alt: Several folded paper strips run in parallel, one highlighted in olive and leading through a small paper gate: the first business process chosen for AI automation
pair: [de/ki-automatisierung-erster-prozess, hu/ai-automatizalas-melyik-folyamattal-kezdj]
---
The first business process a company should hand to AI automation is one that runs daily or weekly, starts from unstructured input such as emails, documents or free text, produces a result a person can check in seconds before it takes effect, and is cheap to correct when it is wrong. In most companies that is intake and triage: reading incoming requests or documents, classifying them, and preparing a draft or a pre-filled record for a colleague to approve. A process that follows fixed rules on structured data needs classic automation, not AI.

Below are five criteria, a decision table and six steps to a measured pilot. I work with companies across the EU, in English or Hungarian.

## In short: the first process for AI automation

- **The first process:** one that runs daily or weekly, starts from unstructured input, produces a result a person can check in seconds, and is cheap to correct. In most companies that is intake and triage.
- **The rule:** if you can write the rule down, use classic automation. Use AI only for the part where no rule can be written.
- **Not first:** payments, contracts and decisions about people. The European Commission lists CV-sorting software for recruitment and credit scoring among the high-risk use cases of the AI Act, whose rules apply from 2 December 2027.
- **What others use AI for:** in 2025, 19.95% of EU enterprises used AI technologies, 6.47 percentage points more than in 2024. The most common use was the analysis of written language (text mining), at 11.75% of enterprises (Eurostat, data extracted December 2025).
- **A pilot is measured by:** time per case against the baseline, the share of suggestions that were rewritten, and what the employees report.

## Which business process should a company automate with AI first?

Start where a person reads something messy, understands it and copies the result into another system, and where a colleague sees a mistake before a customer does. Three versions appear in almost every company:

- **Request triage.** Incoming enquiries, support tickets or internal requests are read, classified by topic and urgency, and routed to the responsible person with a draft reply attached.
- **Document extraction.** Defined fields are read from delivery notes, contracts, invoices or applications and pre-filled into a form for review.
- **Internal answers from your own documentation.** Employees ask a question and receive an answer with the source passage shown.

In all three the AI drafts and a person sends. That property matters more than the department. A customer-facing bot that answers on its own is a poor first project, while a triage and drafting step inside the same service team is a good one.

## Do you need AI automation or classic automation?

Classic automation executes written rules on structured data: when an invoice arrives, file it and enter the amount in a table. It is deterministic: when it fails, it fails the same way every time.

AI automation belongs where the rule cannot be written down. The invoice is a photo and the amount sits in a different place each time. The customer request is free text in three languages. A model recognises the pattern and produces a suggestion. The cost is that the output is not deterministic, can be wrong, and has to be checked.

The working rule: **if you can write the rule down, automate it the classic way.** AI is for the part where you would say “you can just tell by looking at it.”

## Five criteria for the first AI automation project

1. **Frequency.** The process runs daily or weekly, not quarterly. Only a frequent process repays the setup work and produces enough cases in a pilot to measure anything.
2. **Unstructured input.** Emails, PDFs, scans, free text, call notes.
3. **Checkable output.** A person can verify the result in seconds before it has an effect: a pre-filled form, a draft reply, a category. If checking takes longer than the work itself, or the result takes effect unseen, the process is not a first project.
4. **Limited consequence of an error.** A wrongly routed ticket gets moved. A wrong bank transfer does not come back. In the first process an error should be annoying, not expensive.
5. **A measurable baseline.** You know today how long one case takes and how often it causes a query or a correction, or you can measure that within two weeks. Without a baseline the pilot proves nothing.

Four out of five is often enough, unless checkable output or limited consequence is the missing one.

: Decision table: classic automation, AI automation or not yet
| What the process looks like | Recommendation | Example |
|---|---|---|
| Fixed rules, structured data | Classic automation, no AI | Filing an incoming invoice and entering the amount in a table |
| Frequent, messy input, a person approves the draft, errors are cheap | AI automation, a good first project | Ticket triage with a draft reply; fields read from delivery notes into a form |
| Messy input, but the output acts without review | Add a review step first, or choose another process | A customer-facing bot that answers on its own |
| Triggers payments or concludes contracts | Not first, and never without human approval | Releasing a bank transfer; accepting a contract |
| Decides about people: hiring, credit, performance | Legal review before any technical work | CV screening, credit scoring |
| Undocumented, or nobody owns it | Document it and name an owner first | A task only one colleague knows how to do |

## Which processes should you not automate with AI first?

Four kinds of process make a bad first AI automation project:

- **Payments and contracts without human approval.** One error outweighs the time saved.
- **Decisions about people.** Screening applicants, assessing creditworthiness and evaluating performance are likely to fall under the high-risk rules of the EU AI Act and need a legal review before any technical work.
- **Undocumented processes.** Automating them produces the same disorder faster.
- **Processes without an owner.** A pilot needs a named person who can pause it.

## A worked example: how the first AI use cases were chosen at Instructure

At Instructure, where I led end-to-end feature design within the Canvas Catalog ecosystem, the AI use cases were anchored in the jobs users had to get done, for example drafting an assignment, extracting key takeaways and turning data into actions, not in what looked impressive in a demo. Before that, contextual inquiry and task shadowing in real classroom and admin workflows showed where AI help was needed at all.

The guardrails were set on day one: human in the loop, clear AI labelling, editable outputs, source cues and recovery paths. Features shipped behind flags, with adoption and completion instrumented. Details are in the [Instructure case study](/work/instructure).

The same order applies to process automation: observe the work, pick the task, fix where a person stays in control, then measure. The control patterns are in [human-in-the-loop AI for regulated products](/writing/human-in-the-loop-ai).

## How do you get from a candidate process to a pilot?

1. **Observe the process.** Watch and measure for two weeks: duration, inputs, outputs, errors, queries. An “AI audit” is useful to the extent that it does this, with the people who do the work.
2. **Set the limits.** What the AI suggests, what a person approves, what the AI never touches, and which data it may see.
3. **Prototype with real, anonymised cases.** Three to five employees edit and reject the suggestions in a simple workspace, with no integration yet.
4. **Integrate only as far as needed.** A connection that reads and does not write is often enough for a pilot. Write access comes after the pilot has proved something.
5. **Run the pilot with an owner and a measure.** Time per case against the baseline, the share of suggestions that were rewritten, and what the employees report.
6. **Decide with numbers.** Extend, rebuild or stop, and document the result.

The tool comes last. Workflow platforms such as n8n or Make are often sensible for a prototype, but the process and the limits are decided first. If you plan to bring in outside help, [what to prepare before hiring an AI integration partner](/writing/before-hiring-an-ai-integration-partner) lists the inputs that make the first conversation useful.

## Who should take part in choosing the first process?

Four roles: the people who do the work, because only they know the inputs and the exceptions; the process owner, who can change how the work is done; whoever runs the systems the AI would read; and one named person who will own the pilot and can pause it. Where the process touches customer data or decisions about people, your counsel joins before any technical work.

## What is ready at the end of the pilot?

At the end of the pilot you have a comparison of time per case against the baseline, the share of AI suggestions that employees rewrote or rejected, a list of the cases where the output failed, and the employees’ own account. From those you take a documented decision: extend, rebuild or stop.

## What the answer depends on

The right first process depends on where unstructured input arrives in volume, how well the process is documented, which systems can be read without a large integration, and what a wrong output would cost. Regulation matters as well. Most internal automations that sort documents or write drafts are limited-risk or minimal-risk systems under the EU AI Act, Regulation (EU) 2024/1689 (source: [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), accessed 22 October 2026). When the AI talks to customers directly, the transparency duties described in [EU AI Act Article 50](/writing/eu-ai-act-transparency-obligations) apply. This is a product team’s design reading, not legal advice.

## Where to start

AI automation rarely fails on technology and often fails on the choice of the first process. The full method is on the [AI integration](/ai-integration) page. Name three processes that consume time in your company, and I will tell you which meets the five criteria and which is better automated without AI: [contact](/contact).

## Sources

- [Use of artificial intelligence in enterprises](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Use_of_artificial_intelligence_in_enterprises), Eurostat Statistics Explained, data extracted December 2025, accessed 28 November 2026
- [AI Act](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), European Commission, Shaping Europe’s digital future, accessed 28 November 2026

## Frequently asked questions

### Which business process should a company automate with AI first?

A frequent process with unstructured input whose result a person checks before it takes effect, and where an error is cheap to fix. In most companies that is triage of incoming requests or extraction of fields from documents, with an employee approving the AI’s draft.

### What business processes can be automated with AI?

Processes in which a person reads unstructured input, understands it and transfers it: classifying requests, extracting data from documents, summarising notes, answering questions from internal documentation. Processes with fixed rules and structured data need classic automation.

### What is the difference between automation and AI?

Classic automation executes written rules and is deterministic. AI recognises patterns in input for which no rule can be written, so its output can be wrong and has to be reviewed. Good solutions combine both.

### Should we start AI automation with customer service?

Start inside the service team, not in front of the customer. Classifying tickets and drafting replies for an agent to approve is a good first project, while a bot that answers customers on its own sends unchecked output. The risk is covered in [AI hallucinations in business products](/writing/ai-hallucinations-in-business-products).

### How much does AI automation cost?

The cost of AI automation depends on the number of processes, the state of the data, the integration needed and the level of human review. I quote no fixed figure, because every project is custom work and the scope is clear only after the observation phase.

### Where do I start with AI in my company?

With one process that you observe and measure for two weeks: one that runs often, works on free text or documents, and whose result a colleague can check in seconds. Do not begin with payments or decisions about people.
