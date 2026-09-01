# design.md — barnanorbert.com

Single file any agent (or person) uses to design or change this site.
Do not invent a second visual language. Load this file, then use the class
names and tokens below. Do not restyle from adjectives such as “clean”,
“premium”, or “Awwwards”.

This file follows the loop in
[How our agents build on-brand pages with design.md](https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md):

1. **Guidance** (this file) — reader job, composition, named failures.
2. **Stylesheet** — `assets/css/responsive.css` (hashed on pages as
   `responsive.<sha256-12>.css`). Repeatable mechanics live there. Do not
   read the hashed copy into context.
3. **Checks** — `scripts/check-design.mjs` plus the existing `check-*.mjs`
   suite. Mechanical failures that have already been named must fail CI.

Judgment stays here. When a review correction repeats, encode it here
(prose), in `responsive.css` (mechanic), or in `check-design.mjs` (check).
Do not hand-tune a single page and leave the rule unwritten.

## Scope

Hiring portfolio for Norbert Barna, AI Product Design Lead.
English site. Self-hosted static HTML. Canonical host: `www.barnanorbert.com`.

The reader in the first five seconds is a VP / hiring manager for a
regulated or AI-lead role. They need: role, proof of shipped product, a
contact close. They are not here for a Webflow demo, a blog, or a Dribbble
cover.

Out of scope: live Webflow edits, ads, session deletion, invented metrics,
generated UI screenshots, generated palettes, generated wordmarks, Geist /
Vercel chrome, a third type family.

## Use this priority order

When requirements compete, protect them in this order:

1. Preserve shipped facts, case copy, claims, and the no-invented-email rule.
2. Preserve Funnel Display + Inter, the shipped case colors, existing routes,
   and the class names in **Primitives**.
3. Make the hiring question, the role, and one complete product screen
   obvious in the first viewport of `/`.
4. Keep one hiring-order work list on `/` and `/works`.
5. Choose a composition for this reader. Reject both generic SaaS heroes and
   a fixed “portfolio template”.
6. Refine type, reflow, and motion without weakening that hierarchy.

## Reader jobs

| Surface | Job in the first viewport | Proof they should see |
|---|---|---|
| `/` | Identify an AI product design lead and open work | Role in H1; one **complete** product screen that supports the H1; CTA to `/works` |
| `/works` | Scan the hiring-order list and open a case | First case card on the fold |
| `/work/*` | Confirm role, period, and that the product is real | Complete UI beside H1; four facts; short dek |
| Footer / nav | Start a conversation | One LinkedIn close (no invented email) |

If a change helps a designer-flex and hurts one of those jobs, reject it.

## Work in four passes

### 1. Frame the reader’s job

The executive path on `/` is: name, role, one complete shipped UI, how to
see the work, how to reach him. The audit path is the case studies.

Do not invent metrics, emails, or a second contact channel. Do not restore
removed SportsGambit figures (`35% first-day activation`, `70% of wagers`).

### 2. Choose the composition

The first viewport is the argument, not a masthead plus setup.

- H1 is the role (`AI Product Design Lead`), not the name.
- The name is a plain kicker, not an all-caps tracked eyebrow.
- Fold proof is **one complete product screen** that supports the H1 —
  Instructure Canvas Career (insights feed). It is not a marketing
  composition with a campaign headline and cropped device cluster, and it is
  not DualIndex: the **work list** still opens with Raiffeisen.
- One primary action: `View selected work` → `/works`.

Before adding a block, name the generic layout this page type would suggest
(centered manifesto, card grid, 16:9 cover). Reject it unless the material
earns it.

### 3. Use the locked visual system

Use the tokens, type roles, and primitives below. Do not introduce a
parallel system. Page-owned CSS may tune local geometry; it must not invent
new type families, case colors, or component names that duplicate these.

### 4. Inspect and revise

Render `/`, `/works`, `/work/raiffeisen`, and `/work/instructure` at 1280 and
390. Ask, in order:

1. If the reader saw only the first viewport of `/`, would they remember the
   role and one shipped product — not only a mood or a headline?
2. Is every product crop a complete UI (`object-fit: contain`), not a
   CoverPoster or a Figma leftover?
3. Do `/` and `/works` use the same case order?
4. Can any tracked kicker, icon tile, or marquee motion be removed without
   losing meaning? Prefer stillness. Do not add marquees.
5. Does `npm test` still pass?

Keep this review internal. Deliver the implementation, not a scorecard.

## Locked brand (do not regenerate)

**Type:** Funnel Display 700 for display; Inter for UI, dek, and body.
Do not add a third family. Do not generate letterforms.

**Ink / paper**

| Token | Value | Use |
|---|---|---|
| `--ink` | `#111111` | Body, nav, light-hero text |
| `--paper` | `#f7f8f8` | Site background |
| `--paper-full` | `#ffffff` | Cards, menus, fact band |
| `--muted` | `rgb(17 17 17 / 62%)` | Meta, kickers |

**Case color (already shipped — never AI-pick replacements)**

| Case | Field | Text on field |
|---|---|---|
| Raiffeisen | `#fee500` | `#111` |
| SportsGambit | `#aaed15` | `#111` |
| Instructure | `#0c1b2f` | `#fff` |
| Bitpanda | `#203d36` | `#fff` |
| Benker | `#d9daf2` | `#111` |
| OnRobot | `#ecf2f5` | `#111` |
| Kineticare | existing live field | Match current contrast |

Site chrome (nav, footer, home) stays ink on paper. Case color is only the
case header field.

**Logo:** existing `NB.svg`. Do not generate a new mark. Do not put
`BARNANORBERT.COM` in the case hero.

**Product images:** only files already in `assets/images/`. Crop with
`object-fit: contain` so UI is not sliced. Never generate dashboards, people,
or metrics. Prefer a single complete screen over a device cluster whose
artboard already crops the phones.

## Type scale (lock)

| Role | Size | Weight | Line-height | Class |
|---|---|---|---|---|
| Display H1 | 56–64px desktop; 40–56px compact | 700 Funnel | 1.05 | `.home-banner-title`, `.banner-title` |
| Dek | 20–22px | 400 Inter | ~1.45 | `.home-banner-subtitle`, `.banner-text` |
| Body | 17–18px | 400 Inter | ~1.5 | `body`, `.summary` |
| Section H2 | 28–32px | 700 Funnel | 1.15 | `.summary h2`, `.section-title` |
| Card title | 22–24px | 700 Funnel | 1.2 | `.work-title` |
| Kicker | 13px | 600 Inter | 1.2 | `.hero-kicker`, `.work-category` |

Do not use 89px display or 38px/300 dek. Do not bold a whole dek to fake a
missing middle size. Do not uppercase-track the name kicker.

## Information architecture

**One work order everywhere** (hiring-first):

1. Raiffeisen
2. Instructure
3. Bitpanda
4. Benker
5. SportsGambit
6. Kineticare (HU product — kicker must say so)
7. OnRobot

Home selected work shows 1–5. `/works` shows all seven in that order.
Do not lead the **list** with a prediction-market MVP or a Hungarian product
on an otherwise English hiring path.

**Nav (in this order):** logo → Works → LinkedIn (label required:
“Find me on LinkedIn”). Motion is not a nav item; keep the toggle in the
footer. Do not invent `mailto:` until a real address exists. `/contact` and
`/cv` stay unpublished rather than 404-bait.

**Home fold**

1. Kicker: `Norbert Barna` (sentence case, no tracking)
2. H1: `AI Product Design Lead`
3. One-line dek (existing positioning, not a slogan)
4. Primary action: `View selected work` → `/works`
5. Product screen: Instructure Canvas Career insights-feed screenshot, fully
   in frame, linking to `/work/instructure`, with a short caption. This
   supports the H1. It is not DualIndex. On compact viewports it sits after
   the CTA so it still lands in the first viewport.
6. Outcomes list (existing bullets) follows as supporting evidence.

**Works fold:** H1 `Works`, two-line intro max, first card (Raiffeisen)
visible in a 900px-tall desktop viewport. No “these aren’t mockups” line.

**Case header (one template, color varies)**

1. Site nav
2. Breadcrumb `Home / Case studies / {Project}`
3. Hero row: left = kicker + H1 56–64 + 1–2 line dek (regular) + four facts;
   right = `.case-hero-media` with a **complete** screenshot,
   `object-fit: contain`
4. Byline with `rel="author"` and `<time>` sits under the fact band, not as
   Medium-style meta in the color field
5. Measurement note under the fact band, not in the hero
6. TOC wraps. Labels ≤ 18 characters. No “PROJECT FLOW” rail.

**Raiffeisen fold proof:** payment / account phone frames (`student` asset),
not the yellow “Reimagining Student Banking Journey” device cluster.

**Instructure fold proof:** insights-feed dashboard, not `Data Insights.png`
(that file still has a red Figma selection stroke).

**Fact keys (identical on every case):** Role, Focus, Period, Delivery.

## Copy

Use the shipped case copy. Do not rewrite claims.

Forbidden template strings:

- “The Value Provided”
- “Gain insights through user interviews, surveys, and usability testing.”
- “These aren’t mockups—they’re real products in action.”
- `ProfessionalExperience` / `Professional<br/>Experience`

Heading set on cases stays the existing ids (for TOC). Visible TOC labels may
be shortened. Do not mix Title Case and sentence case inside one TOC.

Kineticare UI is Hungarian. Say “Hungarian product” in the card kicker. Do not
English-wash the screenshot.

## Named anti-patterns (never ship)

| Name | What it looks like | Fix |
|---|---|---|
| EmptyFold | Name or manifesto, no product UI | Put a complete product screen in the first viewport |
| DualIndex | Home **list** order ≠ `/works` order | One list, hiring-first |
| BlogHero | “Written by / Published / Updated” as the hero | Facts + UI; byline below |
| CoverPoster | Campaign headline + clustered devices, site URL in the corner, or any artboard that already crops the phones | One complete product screen; `contain` |
| CroppedProduct | Sidebar or phone clipped by `object-fit: cover` **or** by the source artboard | Different existing asset whose UI is fully in frame |
| FakePII | Invented names, emails, `+123%` in comps we author | Shipped UI only, no unaudited % in our chrome |
| FigmaLeftover | Red selection stroke on a screenshot (`Data Insights.png`) | Do not use that file as a fold or case hero |
| TemplateVoice | Webflow lorem about interviews and testing | Delete; keep the 16-year line |
| TrackedKicker | All-caps, letter-spaced name/eyebrow above the H1 | Sentence-case name, 13px Inter, no tracking |
| AIDecor | Glow blobs, generated shapes, fake words, new palettes | Existing color tokens + real UI |
| MotionNav | Motion On as a 11px nav item | Footer control only |
| Marquee | New auto-scrolling chip rows | Do not add. Existing domain chips may stay; do not invent a second |

## Reject generated-design reflexes

Do not ship: decorative gradients or glow blobs; generic centered hero copy
followed by a card grid as the only structure; a 16:9 cover poster as the
fold; nested cards to fake hierarchy; icon tiles as a substitute for proof;
uppercase-tracked eyebrows; invented `mailto:`; generated screenshots.

Restraint here is precise hierarchy and honest product evidence. It is not
black-and-white empty margin, and it is not a Vercel report shell.

## Primitives (HTML vocabulary)

Agents compose pages from these names. Do not invent parallel components.

**Chrome:** `.skip-to-content` `.navbar` `.nav-logo-wrap` `.menu-button`
`#primary-navigation` `.nav-menu` `.nav-link` `.footer-section` `.footer-cta`
`.footer-contact-link` `.back-to-top-wrap` `[data-motion-toggle]` (footer)

**Home:** `.home-banner-section` `.hero-kicker` `.home-banner-title`
`.home-banner-subtitle` `.home-banner-outcomes` `.hero-work-link` `.hero-proof`
`.hero-proof-caption` `.about-section-title` `.home-about-area` `.work-card`
`.work-image` `.work-title` `.work-card-summary` `.home-work-footer`

**Works:** same cards; `.home-banner-text` max two sentences.

**Case:** `article.case-study-article` `h1#case-title` `.case-breadcrumb`
`.case-hero-media` `.case-hero-shot` `.case-facts-section` `.case-facts`
`.case-byline` `.case-toc` `.case-evidence-note` `.summary` `.related-work-card`

**Buttons:** `.dark-button` `#000` on `#fff`. Footer contact min-height 52px.

## Motion

GSAP + ScrollTrigger already own reveals. Native scroll only (no Lenis).
Respect `prefers-reduced-motion`. Do not add Three.js, particles, or
generated Lottie. Hide `.case-motion-rail`. Default to stillness for anything
new.

## Eval rubric (first attempt must pass)

1. Facts that were on the page are still on the page.
2. A hiring reader can answer “who is this / what did they ship / how do I
   reach them” from the first viewport of `/`.
3. `/` and `/works` use the same case **list** order.
4. Every case fold shows UI that is not clipped and is not a CoverPoster or
   Figma leftover.
5. No anti-pattern from the table above.
6. `npm test` and `npm run test:e2e` stay green.

When a review correction repeats, encode it here, in CSS, or in
`scripts/check-design.mjs`.
