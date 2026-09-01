# design.md — barnanorbert.com

Single file any agent (or person) uses to design or change this site.
Do not invent a second visual language. Load this file, then use the class names
and tokens below. Do not restyle from adjectives such as “clean”, “premium”,
or “Awwwards”.

Companion stylesheet: `assets/css/responsive.css` (hashed on pages as
`responsive.<sha256-12>.css`). Judgment stays in this file. Repeatable
mechanics stay in CSS. Mechanical failures are caught by
`scripts/check-design.mjs`.

## Scope

This is a hiring portfolio for Norbert Barna, AI Product Design Lead.
English site. Self-hosted static HTML. Canonical host: `www.barnanorbert.com`.

The reader in the first five seconds is a VP / hiring manager for a
regulated or AI-lead role. They need: role, proof of shipped product, a
contact close. They are not here for a Webflow demo, a blog, or a Dribbble
cover.

Out of scope: live Webflow edits, ads, session deletion, invented metrics,
generated UI screenshots, generated palettes, generated wordmarks.

## Reader jobs

| Surface | Job in the first viewport | Proof they should see |
|---|---|---|
| `/` | Identify the person as an AI product design lead and open work | Role in H1; one real UI crop; CTA to `/works` |
| `/works` | Scan the hiring-order list and open a case | First case card on the fold |
| `/work/*` | Confirm role, period, and that the product is real | Device/UI beside H1; four facts; short dek |
| Footer / nav | Start a conversation | One LinkedIn close (no invented email) |

If a change helps a designer-flex and hurts one of those jobs, reject it.

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
or metrics.

## Type scale (lock)

| Role | Size | Weight | Line-height | Class |
|---|---|---|---|---|
| Display H1 | 56–64px | 700 Funnel | 1.05 | `.home-banner-title`, `.banner-title` |
| Dek | 20–22px | 400 Inter | ~1.45 | `.home-banner-subtitle`, `.banner-text` |
| Body | 17–18px | 400 Inter | ~1.5 | `body`, `.summary` |
| Section H2 | 28–32px | 700 Funnel | 1.15 | `.summary h2`, `.section-title` |
| Card title | 22–24px | 700 Funnel | 1.2 | `.work-title` |
| Kicker | 12–13px | 600 Inter | 1.2 | `.work-category`, `.metric-context` |

Do not use 89px display or 38px/300 dek. Do not bold a whole dek to fake a
missing middle size.

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
Do not lead with a prediction-market MVP or a Hungarian product on an
otherwise English hiring path.

**Nav (in this order):** logo → Works → LinkedIn (label required:
“Find me on LinkedIn”). Motion is not a nav item; keep the toggle in the
footer. Do not invent `mailto:` until a real address exists. `/contact` and
`/cv` stay unpublished rather than 404-bait.

**Home fold**

1. Kicker: `Norbert Barna`
2. H1: `AI Product Design Lead`
3. One-line dek (existing positioning, not a slogan)
4. Outcomes list (existing bullets)
5. Primary action: `View selected work` → `/works`
6. Right column: Raiffeisen UI crop (existing card asset), fully in frame

**Works fold:** H1 `Works`, two-line intro max, first card (Raiffeisen)
visible in a 900px-tall desktop viewport. No “these aren’t mockups” line.

**Case header (one template, color varies)**

1. Site nav
2. Breadcrumb `Home / Case studies / {Project}`
3. Hero row: left = kicker + H1 56–64 + 1–2 line dek (regular) + four facts;
   right = `.case-hero-media` with a real screenshot, `object-fit: contain`
4. Byline with `rel="author"` and `<time>` sits under the fact band, not as
   Medium-style meta in the color field
5. Measurement note under the fact band, not in the hero
6. TOC wraps. Labels ≤ 18 characters. No “PROJECT FLOW” rail.

**Fact keys (identical on every case):** Role, Focus, Period, Delivery.

## Copy

Use the shipped case copy. Do not rewrite claims. Do not restore removed
SportsGambit metrics (`35% first-day activation`, `70% of wagers`).

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
| EmptyFold | Name or manifesto, no product UI | Put a real crop in the first viewport |
| DualIndex | Home order ≠ `/works` order | One list, hiring-first |
| BlogHero | “Written by / Published / Updated” as the hero | Facts + UI; byline below |
| CoverPoster | 16:9 cover, site URL in the corner, no nav | Page module under the real nav |
| CroppedProduct | Sidebar or phone clipped by `object-fit: cover` | `contain`, full UI in frame |
| FakePII | Invented names, emails, `+123%` in comps | Shipped UI only, no unaudited % |
| FigmaLeftover | Red selection stroke on a screenshot | Crop it out of the source file |
| TemplateVoice | Webflow lorem about interviews and testing | Delete; keep the 16-year line |
| AIDecor | Glow blobs, generated shapes, fake words, new palettes | Existing color tokens + real UI |
| MotionNav | Motion On as a 11px nav item | Footer control only |

## Primitives (HTML vocabulary)

Agents compose pages from these names. Do not invent parallel components.

**Chrome:** `.skip-to-content` `.navbar` `.nav-logo-wrap` `.menu-button`
`#primary-navigation` `.nav-menu` `.nav-link` `.footer-section` `.footer-cta`
`.footer-contact-link` `.back-to-top-wrap` `[data-motion-toggle]` (footer)

**Home:** `.home-banner-section` `.hero-kicker` `.home-banner-title`
`.home-banner-subtitle` `.home-banner-outcomes` `.hero-work-link` `.hero-proof`
`.about-section-title` `.home-about-area` `.work-card` `.work-image`
`.work-title` `.work-card-summary` `.home-work-footer`

**Works:** same cards; `.home-banner-text` max two sentences.

**Case:** `article.case-study-article` `h1#case-title` `.case-breadcrumb`
`.case-hero-media` `.case-hero-shot` `.case-facts-section` `.case-facts`
`.case-byline` `.case-toc` `.case-evidence-note` `.summary` `.related-work-card`

**Buttons:** `.dark-button` `#000` on `#fff`. Footer contact min-height 52px.

## Motion

GSAP + ScrollTrigger already own reveals. Native scroll only (no Lenis).
Respect `prefers-reduced-motion`. Do not add Three.js, particles, or
generated Lottie. Hide `.case-motion-rail`.

## Eval rubric (first attempt must pass)

1. Facts that were on the page are still on the page.
2. A hiring reader can answer “who is this / what did they ship / how do I
   reach them” from the first viewport of `/`.
3. `/` and `/works` use the same case order.
4. Every case fold shows UI that is not clipped.
5. No anti-pattern from the table above.
6. `npm test` and `npm run test:e2e` stay green.

When a review correction repeats, encode it here (judgment), in
`responsive.css` (mechanic), or in `scripts/check-design.mjs` (check).
Do not hand-tune a single generated page and leave the rule unwritten.
