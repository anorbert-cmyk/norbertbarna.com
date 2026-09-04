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

Hiring portfolio for Norbert Barna, Product VP.
English portfolio with an English/Hungarian client-service entry pair.
Self-hosted static HTML. Canonical host: `www.barnanorbert.com`.

User-confirmed acquisition priority (2026-09-04): larger AI-integration clients
first, Hungarian AI and development service clients second. Hiring discovery
remains supported, but is not the primary acquisition KPI. Preserve the home
Product VP mast, work order, shipped evidence and visual locks below.

`/ai-integration` and `/hu/ai-integracio` explain the same core service offer in
English and Hungarian. Compose from existing type and reading-width primitives;
no new palette, imagery, cards or motion. One service H1, scoped offer, linked
case evidence, engagement questions and the native Email action. These are
WebPage/Service pages, not portfolio Articles. Use self canonicals and reciprocal
en/hu hreflang; x-default points to the English offer. The Hungarian body is
Hungarian; retained English navigation/footer chrome is explicitly `lang="en"`.
Do not imply all linked cases were AI-integrations, or invent technical stacks,
certifications, pricing, service levels or an OpenAI partnership. The existing
home `AI products` card heading links to the English entry; its visible language
switch leads to Hungarian. Do not restore a separate home acquisition pitch.

The reader in the first five seconds is a VP / hiring manager or a client
for AI product and web work in regulated or high-trust systems. They need:
role, proof of shipped product, a contact close. They are not here for a
Webflow demo, a blog, or a Dribbble cover.

Out of scope: live Webflow edits, ads, session deletion, invented metrics,
generated UI screenshots, generated palettes, generated wordmarks, Geist /
Vercel chrome, a third type family.

## Use this priority order

When requirements compete, protect them in this order:

1. Preserve shipped facts, case copy, claims, and the no-invented-email rule.
2. Preserve Funnel Display + Inter, the shipped case colors, existing routes,
   and the class names in **Primitives**.
3. Make the hiring question, the role, and how to reach him obvious in
   the first viewport of `/`. Product UI lives in Selected work and cases.
4. Keep one hiring-order work list on `/` and `/works`.
5. Choose a composition for this reader. Reject both generic SaaS heroes and
   a fixed “portfolio template”.
6. Refine type, reflow, and motion without weakening that hierarchy.

## Reader jobs

| Surface | Job in the first viewport | Proof they should see |
|---|---|---|
| `/` | Identify a Product VP and open work | Role in H1; live highlights; CTA to `/works`. Analog mesh mast, **no** product screenshot |
| `/works` | Scan the hiring-order list and open a case | First case card on the fold |
| `/work/*` | Confirm role, period, and that the product is real | Complete UI beside H1; four facts; short dek |
| Footer / nav | Start a project conversation | Nav LinkedIn link; footer LinkedIn `in` icon + **Discuss your project**, sharing outlined 44px / 12px chrome. No duplicate home engagement block and no Contact column. Footer is one full-bleed analog-grain mesh: greyer-lilac type band, a **left-weighted navy horizon**, olive-chartreuse **right-weighted** (not a centered yellow balloon). Not stacked Ironclad dunes, not a dark void, not a SaaS Product/Legal sitemap. |

If a change helps a designer-flex and hurts one of those jobs, reject it.

## Work in four passes

### 1. Frame the reader’s job

The executive path on `/` is: name, role, live proof in the highlights,
how to see the work, how to reach him. The audit path is the case studies.

Do not invent metrics or emails. The one real contact address is
`anorbert@pm.me`. HTML must not contain `mailto:` or that address as
text, including after the Email click. The footer Email button only
`location.assign`s the assembled href from split JS parts — do not write
`mailto:` onto an `href` or into the DOM. Do not put a multi-field form
back in the footer.
Do not restore a Contact column.
Do not restore removed SportsGambit figures (`35% first-day activation`,
`70% of wagers`).

### 2. Choose the composition

The first viewport is the argument, not a masthead plus setup.

- H1 is the role (`Product VP`), not the name.
- The name is a plain kicker, not an all-caps tracked eyebrow.
- The first viewport is an analog mesh mast (greyer-lilac grain, a **large
  navy félkör** from the bottom toward center-right, blur 56 family). Live
  copy sits left on the lilac. The right side is mesh — not Canvas Career,
  not any product screenshot.
- Fold proof on `/` is the live highlights list, not DualIndex: the **work
  list** still opens with Raiffeisen.
- One primary action: `View selected work` → `/works`. Outlined 12px chrome,
  not a black pill.

Before adding a block, name the generic layout this page type would suggest
(centered manifesto, card grid, 16:9 cover). Reject it unless the material
earns it.

### 3. Use the locked visual system

Use the tokens, type roles, and primitives below. Do not introduce a
parallel system. Page-owned CSS may tune local geometry; it must not invent
new type families, case colors, or component names that duplicate these.

### 4. Inspect and revise

Render `/`, `/works`, `/work/raiffeisen`, `/work/instructure`, and
`/work/kineticare` at 1280 and 390. Ask, in order:

1. If the reader saw only the first viewport of `/`, would they remember the
   role and how to open the work — not a Canvas mock or a mood-only mesh?
2. Is every product crop a complete UI (`object-fit: contain`), not a
   CoverPoster or a Figma leftover?
3. Do `/` and `/works` use the same case order?
4. Can any tracked kicker, icon tile, or marquee motion be removed without
   losing meaning? Prefer stillness. Do not add marquees.
5. On Kineticare at 390: is the dek white on the dark field, and does Role
   wrap cleanly under the sticky bar?
6. Does `npm test` still pass?

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
| Kineticare | live dark field `#0c1b2e` / hand video | `#fff` |

Site chrome (nav, home) stays ink on cool paper. Case color is the case
header field. The footer mesh **pixel-matches the accepted lock crop**, not
the raw case hexes: greyer-lilac `#D6D4ED` on the type band, Instructure navy
`#0A1628` as a **left-weighted horizon mass** (in across the width by mid-
height; stronger and earlier on the left — not a blob with lilac gutters),
Bitpanda forest `#1B3A32` as a quiet left-olive, olive-chartreuse `#BDB414`
**right-weighted** (yellow onset ≈ left 94% / center 84% / right 73% of
field height). Desktop field is ~3:2 (`min(66.667vw, 960px)`). Do not
invent a centered yellow balloon. Do not use bright Benker `#E1E1F5`, neon
`#FFE000`, or SportsGambit `#A8D800` in the footer.
Do not restore stacked Ironclad dune ridges. Do not wash the field in candy
pink, magenta, or `#5b45ff`.

**Locked footer**

One site-wide footer on every content page (same markup; work pages only
change the asset prefix). The whole footer is one full-bleed mesh. Type sits
on the pale top of the mesh — not on a separate paper chrome slab, not
`.footer-dunes`, and not on a navy dune. Pixel-match the accepted lock crop.

1. Existing `NB.svg` wordmark (not a new logo, not live text) and the line
   `Product VP — I lead AI products in regulated finance and high-trust
   systems.` Em dash. Do not use “AI Product Design Lead” in the footer,
   title, H1, meta, or JSON-LD name. JSON-LD `jobTitle`, ProfilePage
   `name`, and visible H1 use Product VP. Person `name` stays
   `Norbert Barna`.
2. Controls under the lede, left: LinkedIn and Email share chrome — height
   44px, radius 12px, 1px black stroke, transparent fill, black ink. Not
   grey fill. Not radius 999. Not a filled pill. LinkedIn is the `in` icon
   (~17px) at `https://www.linkedin.com/in/barna-norbert/`. The project email
   label is `Discuss your project` (Inter 15/500, black), width hug,
   padding 0 14, min-width 44, same height as LinkedIn, gap 8–10px.
   Do not constrain its width to the former one-word Email label. Email is
   `<button type="button" class="footer-email">` — native Space/Enter, not a
   fake link. Hover is a light ink wash; keep the outline and black ink. Do
   not draw a mouse cursor. Do not make Email a 44px square with tiny type.
   Page card/row hit-areas (`.work-title::after`) stay scoped to the card or
   row. The footer stacks above them (`z-index: 8`) so Email and LinkedIn
   keep their hover wash.
3. Mesh field: greyer-lilac `#D6D4ED` type band. Navy `#0A1628` is a wide
   **left-weighted horizon** under the type — already spanning the width by
   mid-height, stronger on the left. Not a centered blob with lilac still at
   both sides at 50% height. Olive-chartreuse `#BDB414` is **right-weighted**:
   yellow onset from the top of the field is ≈ left 94%, center 84%, right
   73%. At 80% height the left is still dark green-navy and the right is
   already yellow. There is no yellow island in the middle with navy on both
   sides. Desktop field ~3:2. Color seams are an analog wash: large
   overlapping masses plus a strong SVG blur (`feGaussianBlur` 48–72). Do
   not leave hard-ish ellipse bands between lilac / navy / olive / yellow.
   No extra CSS blur on `.footer-mesh-art`. Heavy static analog film grain
   (speckle on the wash, not two hard ellipses that read as a smiley). No
   stacked SVG dune paths, no crest lighting per ridge. Navy / olive /
   yellow are separate groups inside the same blur: they may translate a
   few pixels under the pointer (yellow closer, navy deeper) plus a
   barely-there idle. Type, Work, Email, LinkedIn, copyright, and the
   hairline stay still. `prefers-reduced-motion: reduce` is the current
   static mesh. No rotation, no lava-lamp travel. Grain does not crawl. Do
   not restore a yellow `<rect>` slab. On compact viewports the mesh SVG
   fills the whole footer — do not pin a short field to the bottom that
   clips a seam through the ident / Email row.
4. Work column, right, dark type: Raiffeisen, Instructure, Bitpanda,
   Kineticare — existing case URLs only. Do not invent AI Governance or
   add Benker / SportsGambit / OnRobot / BlackRock here.
5. No Contact column and no empty Contact heading. Footer Email stays in
   the ident row. Home has Email only in its navigation and footer, not
   after the services cards. Do not add LinkedIn again in the nav. `/contact` stays
   404; no `/contact` link, no form, no captcha, no send endpoint.
6. Copyright bottom-left: `© 2026 Norbert Barna` in dark charcoal. Sharp 1px
   dark hairline on the yellow. No back-to-top control. The approved privacy
   exception adds only a wrapping `.footer-privacy` utility row: English and
   Hungarian privacy links plus a native analytics-settings button. No new
   columns, brand styling or contact form. This row uses the existing ink and
   Inter and does not restyle the mesh.

**Optional analytics (2026-09-04):** `/privacy` and `/hu/adatvedelem` are paired
utility pages. This release is explicitly OFF via the first-loaded, static
`analytics-config.js`; both consumers must return before any side effects unless
the value is exactly `true`. Settings are hidden in HTML and no consent banner
is shown while OFF. The notice, metadata and JSON-LD describe this inactive state.
Activation is a separate reviewed release after processor/retention confirmation,
with updated notices and a fresh consent version (old preferences cannot opt in).
The active-mode component below is preparation, not enabled production tracking.

The two pages are paired
WebPage notices, composed from existing reading-width and type primitives, not
Service or Article pages. A small non-modal consent banner uses ink on paper,
equal 44px / 12px outlined accept/reject buttons, no initial autofocus and no
new motion. `assets/css/consent.css` is a narrow, revalidated utility stylesheet;
it may style only this consent component and `.footer-privacy`, not the brand.
No PostHog request before consent or after withdrawal. No replay, autocapture,
person profiles or arbitrary URLs/text. Email works independently of analytics.

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

Home selected work shows 1–6 as compact stacked rows (`.work-list` / `.work-row`):
72–96px thumbs cropped from existing case images, live titles, live one-liners,
hairline between rows, quiet arrow. Never giant 2-up color cards.
`/works` shows all seven in that order on the 12-column **7/5** grid; the seventh
card stays span 7. Do not lead the **list** with a
prediction-market MVP or a Hungarian product on an otherwise English hiring
path.

**Header (locked):**

- **Home:** the bar sits **on the analog mast** — transparent fill, no white
  slab, no `#e6e8e9` border. Contents: `nb` left; right: Works text + outlined
  LinkedIn 44px square + outlined Email (`<button type="button" class="footer-email">`,
  same 1px black / radius 12 / Inter 15/500 chrome as the footer). Email is
  assign-only; no `mailto:` / address in HTML. Not a footer clone: no Work
  column, no copyright in the header. No Motion control.
- **`/works` and case pages:** one sticky white bar, 64px desktop / 56px compact,
  `#fff` fill, 1px `#e6e8e9` bottom border. Contents in order: logo →
  (case pages only) breadcrumb `Works / {Project}` in the bar → LinkedIn link
  (visible label `LinkedIn`, full aria-label kept). `/works` keeps the `Works`
  nav link instead of the breadcrumb.

There is no Motion control — not in the bar, not as a fixed chip, not in
the footer. Autoplay and GSAP already honor `prefers-reduced-motion`. The old
57px breadcrumb strip under the nav is retired. The one real contact address
is `anorbert@pm.me`; do not invent additional addresses. Do not put `mailto:`
or the address in HTML. `/contact` stays 404. `/cv` stays unpublished.

**Header accessibility (WCAG 2.2 AA):** validate shared navigation and opening
content at narrow, breakpoint and desktop widths, not just one screenshot.
Normal text must reach 4.5:1; large text and meaningful control visuals 3:1,
including hover/focus states and the actual background behind the text. Header
keyboard focus uses the existing ink/paper palette: a 3px ink outline with a
white inner halo so it remains distinct on the mesh, paper and dark fields.
Do not remove breadcrumb-link focus merely because it is not `.nav-link`.

At normal text size the outlined contact and primary actions remain 44px tall.
At 200% text size or user-defined text spacing they may wrap and grow vertically
(44px minimum), while keeping their full visible labels and existing action.
The header contact row can wrap; it must not overlap LinkedIn. Long opening
headings may break within a word only when needed to avoid clipping. The menu
icon stays centered and the open disclosure is vertically scrollable on short
screens. Do not apply these header fixes to unrelated footer typography.
Keep desktop highlights below the pale/navy transition (164–190px top offset),
without a boxed background. The Kineticare video scrim is owned by the shared
stylesheet, including its mobile direction; it must preserve white-text AA
even against a synthetic all-white frame, not only a sampled poster.
Enlarged or user-spaced desktop mast text switches to the existing compact,
single-column lilac reading surface (`data-text-reflow`), keeping the navy
shape below the copy. ResizeObserver checks computed typography, not layout
height, to avoid feedback loops; restoring normal text restores the two columns.
The decorative Kineticare header video starts automatically but has a single
4.5-second preview window, then stays paused for that document visit. Scrolling,
tab/lifecycle changes and media refresh must not restart an expired preview.
This keeps header motion below WCAG 2.2.2's five-second threshold without adding
a Play overlay or motion switch. Non-header media retains its existing behavior.

The navigation is a non-modal disclosure, not an ARIA menu or focus trap.
Its button reflects expanded state. Closing it must not leave focus on a hidden
external-link/mail control. When a breakpoint hides the focused nav item or
toggle, transfer focus to the corresponding visible navigation control. Escape
returns to the menu button. Keep native semantics, skip-link and no-JS fallback.

**Home fold**

1. Analog mesh mast: greyer-lilac `#D6D4ED` grain, a **large navy félkör**
   (`#0A1628`) rising from the bottom toward center-right, `feGaussianBlur` 56.
   Not the weaker/smaller navy of the text-only crop. Not the footer’s
   right-weighted yellow. Type on the pale band. Empty right is mesh.
   On compact, navy fades in below the last highlight (`mask-image` starts
   at 88%) so ink stays on lilac — same NavyFlood rule as the footer.
   Compact `::after` navy is a short bottom wash (≤ 16% of the mast), not a
   28% overlay through the list. The highlights label uses `--mast-muted`,
   not 62% `--muted`. Playwright samples pixels **behind glyphs** at 390.
   On desktop the highlights column sits on the navy félkör: use light ink
   (`--mast-on-navy` `#F4F5F7`), not `--ink`. Offset that column onto the
   dome (still inside the mast). Do not shrink the dome to dodge contrast.
   Do not move the list down onto About.
2. Kicker: `Norbert Barna` (sentence case, no tracking). Stay 13px on
   compact; do not inherit the 17px `.banner-left-wrap > p:first-child` bump.
   Color is solid `--mast-muted` `#2a2a2e`, not 62% `--muted`. Compact
   highlights label uses the same token. Fold type must meet WCAG AA
   against the live grain (pixels behind glyphs): 4.5:1 normal, 3:1 large /
   UI stroke. Left column stays dark ink on lilac. Compact highlights stay
   dark ink on lilac — never `--mast-on-navy` at ≤ 991px.
3. H1: `Product VP`
4. One-line dek (existing positioning, not a slogan)
5. Primary action: `View selected work` → `/works` (outlined 12px chrome,
   not a filled black pill)
6. `SELECTED PORTFOLIO HIGHLIGHTS` plus the four live bullets (Raiffeisen /
   Instructure / Bitpanda / Balabit). Do not invent a Canvas Career mock.
   Do not put any product screenshot in the header.
7. User-requested removal (2026-09-04): no `Open for engagements` block,
   company-solicitation paragraph or duplicate LinkedIn/Email actions after
   the services cards. Do not hide this copy in CSS, HTML comments, metadata
   or JSON-LD. The existing `AI products` heading is an underlined, ink-colored
   native link to `/ai-integration`, with a visible keyboard focus ring. This
   preserves factual service discovery without a replacement promotional block.
   All five service headings use ink on paper, never the inherited white
   `--font-color--dark` from the old template. Test their revealed-state contrast.

**Home selected work (E):** compact rows, not giant 2-up rounded color cards.
Small 72–96px thumbs (crops of existing case images), live titles + live
one-liners, hairline between rows, quiet arrow. Do not use invented years or
invented descriptions from the compact-row mock.

**Works fold:** H1 `Selected work` (same subject as `<title>`),
two-line intro max, first card (Raiffeisen) visible in a 900px-tall desktop
viewport. No “these aren’t mockups” line. No “Design Case Studies” as the
primary title.

**Home professional experience:** paper cards until hover (fine pointer) or
tap / Enter (coarse and keyboard). Then the existing award video fills the
card (`inset: 0; object-fit: cover`). Not a 500px Webflow strip. Compact
does not hide the wrap. Reduced motion keeps the paper card.

**Case header (one template, color varies)**

1. Sticky site bar with the breadcrumb `Works / {Project}` inside it
2. Hero row: left = kicker + H1 56–64 + 1–2 line dek (regular);
   right = `.case-hero-media` with a **complete** screenshot already on the
   page, `object-fit: contain`. New images are forbidden.
3. Fact band with four keys directly under the hero
4. No visible byline. “Written by / Published / Updated” never appears on
   the page; authorship and dates live in meta tags and JSON-LD only.
5. Measurement note under the fact band, not in the hero
6. TOC wraps or truncates to `+n`. Labels ≤ 18 characters. Never a clipped
   chip (“Design P”). No “PROJECT FLOW” rail.
7. Body: H2 28–32, reading measure 720px, and the first still sits right
   after the role section — not thousands of pixels down.

**Kineticare exception:** its case header contains exactly one media node —
the existing hand-rehabilitation background video, autoplaying via
`data-autoplay-video`. No hero screenshot next to it.

**Raiffeisen fold proof:** payment / account phone frames (`student` asset),
not the yellow “Reimagining Student Banking Journey” device cluster.

**Instructure fold proof:** insights-feed dashboard, not `Data Insights.png`
(that file still has a red Figma selection stroke).

**Instructure montage:** the Canvas Career video in `.inst-bg-video` must fill
the 16:9 frame (`inset: 0; z-index: 0`). Webflow background-video CSS
(`inset: -100%`, `z-index: -100`) parks a playing file outside the clip.

**Fact keys (identical on every case):** Role, Focus, Period, Delivery.

## Copy

Use the shipped case copy. Do not rewrite claims.

User-requested project contact copy (2026-09-04): the existing native
`button.footer-email` opens an email app for a project enquiry; it does not
send a message, book a meeting or create a confirmed lead. This explicit
copy update supersedes the older literal `Email` label/72–76px width lock,
not the outlined 44px / 12px chrome or the split-address handler.

- Shared English footer, home navigation, English service CTA:
  `Discuss your project`; title `Opens your email app to discuss your project`.
- Hungarian service main CTA: `Beszéljünk a projektedről`, `lang="hu"`;
  title `Megnyitja a leveleződet, hogy a projektedről írhass.`.
- Privacy-page main contact buttons remain `Email`: data-rights enquiries
  must not be presented as project enquiries. The shared English footer
  retains the project CTA and its existing English language scope.

Keep the visible label as the accessible name. The title only clarifies
the email-app action; do not replace the visible text with a tooltip-only
label or an unrelated aria-label. Labels must fit at 320px without clipping.

Home About opens on Product VP ownership (strategy → ship, teams,
regulated), not “I’ve spent the last 16 years designing”. Do not invent
metrics. Home descriptions for search and social previews summarize the actual
portfolio and expertise, not availability for engagements. The dedicated service
pages retain their visible offers; do not move a home-only solicitation into
structured data. The home has one H1 and does not add `/contact`.

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
| EmptyFold | Name or manifesto, or a Canvas/product screenshot standing in for the home argument | Role + live highlights on the analog mast; product UI lives in Selected work rows and case pages |
| CanvasFold | Instructure Canvas Career (or any product UI) in the homepage header | Delete it. Empty right is mesh |
| WeakNavyDome | Home mast navy is a thin horizon or the smaller text-crop dome | Large félkör from the bottom toward center-right (ry ≥ 700, cx ≥ 1080); blur 56; lock saturation `#0A1628` on `#D6D4ED` |
| GiantWorkCards | Home Selected work as giant 2-up rounded color cards or half-viewport covers | Compact stacked rows, 72–96px thumbs |
| FooterHitSteal | Unscoped `.work-title::after` (z-index 5) paints over footer Email/LinkedIn so the ink-wash hover never sticks | Scope the hit-area to `.work-card` / `.work-row` / `.related-work-card`. Footer stacks at `z-index: 8` |
| DualIndex | Home **list** order ≠ `/works` order | One list, hiring-first |
| BlogHero | “Written by / Published / Updated” anywhere on the page | Facts + UI; authorship stays in meta and JSON-LD |
| CoverPoster | Campaign headline + clustered devices, site URL in the corner, or any artboard that already crops the phones | One complete product screen; `contain` |
| CroppedProduct | Sidebar or phone clipped by `object-fit: cover` **or** by the source artboard | Different existing asset whose UI is fully in frame |
| FakePII | Invented names, emails, `+123%` in comps we author | Shipped UI only, no unaudited % in our chrome |
| FigmaLeftover | Red selection stroke on a screenshot (`Data Insights.png`) | Do not use that file as a fold or case hero |
| TemplateVoice | Webflow lorem about interviews and testing | Delete; keep the 16-year line |
| TrackedKicker | All-caps, letter-spaced name/eyebrow above the H1 | Sentence-case name, 13px Inter, no tracking |
| AIDecor | Glow blobs, generated shapes, fake words, new palettes | Existing color tokens + real UI. Footer mesh stays on the lock crop (greyer-lilac, left-weighted navy horizon, right-weighted olive-chartreuse) — never Ironclad dunes, candy pink, or a third palette |
| YellowDuneSlab | Footer filled as a flat `#FFE000` rectangle or a stacked yellow dune ridge | Olive-chartreuse is the bottom of the mesh, not a ridge or a CSS slab |
| SausageBand | Navy is a thin full-width ellipse (~8% of field height, `ry` ≪ field) then a flat yellow rectangle | Taller ~3:2 field; navy is a left-weighted horizon mass, not a crushed stripe |
| YellowBalloon | Centered yellow ellipse (`cx` at field center, sitting as an island / smiley) | Yellow is right-weighted (onset left 94% / center 84% / right 73%); left at 80% stays dark |
| HardMeshSeam | Visible ellipse contours or hard-ish bands between lilac / navy / olive / yellow | Larger overlapping masses + `feGaussianBlur` ≥ 48 so the lock reads as analog bleed |
| CompactMeshClip | A hard horizontal seam through the compact ident / Email / Work stack where a short bottom-pinned mesh SVG begins | Compact `.footer-mesh-art` fills the footer (`inset: 0; height: 100%`) so the wash is one field |
| FlatDuneGrain | Four solid dune fills, Ironclad ridge silhouettes, or per-layer sand on stacked paths | One soft mesh + one static analog grain overlay. No `.footer-dunes` |
| FogGrain | Faint multiply grain (~0.38) plus extra CSS/SVG blur so the field reads as fog | Heavy analog speckle; do not blur the grain layer |
| NavyFlood | Navy mesh blob bleeds up under Work or compact home highlights so ink contrast dies | Compact: keep type on the pale lilac band; fade navy in below the last highlight (mask from 88%). Desktop home highlights may sit on the félkör — then use light ink, do not shrink the dome |
| InkOnNavy | `--ink` / `--muted` on the desktop mast highlights over `#0A1628` | `--mast-on-navy` `#F4F5F7` on that column; left column stays `--ink` on lilac |
| GrainWash | 62% `--muted` on analog mast grain samples below WCAG AA 4.5:1 | Home-mast kicker **and compact highlights label** use solid `--mast-muted` `#2a2a2e` |
| JobTitleDrift | Title, H1, meta, or JSON-LD name still say Design Lead | `jobTitle`, H1, and ProfilePage `name` are Product VP. Person `name` is `Norbert Barna` |
| NeonMeshYellow | Bottom of the footer is neon `#FFE000` | Muted olive-chartreuse `#BDB414` |
| BrightMeshLilac | Type band is bright `#E1E1F5` | Greyer-lilac `#D6D4ED` |
| FooterBackToTop | 44px outlined double-arrow on the copyright row | Lock has none; do not restore it |
| LinkedInHitSquare | Footer LinkedIn is a grey-filled ~32px chip, or Email is a filled black pill | Both share 44px height, 12px radius, 1px black stroke, transparent fill, black ink |
| FilledEmailPill | Email is a solid black pill (radius 999) with white type | Outlined rounded-square chrome; project CTA in black Inter 15/500 |
| ContactColumn | A Contact heading (empty or with a mailto line) beside Work | Email in nav and footer ident; Work column only |
| MailtoInHtml | `mailto:` or `anorbert@pm.me` appears in page HTML (before or after click), or the complete address is one JS string | `location.assign` the assembled href; never write it onto `href` or into the DOM |
| FakeEmailLink | Email is an `<a role="link">` without href | Native `<button type="button" class="footer-email">`; Space/Enter come for free |
| SaaSFooter | Product / Company / Resources / Legal columns, X/Instagram/YouTube tiles | Outlined LinkedIn + Email; Work on the mesh; no Contact column; no sitemap |
| MotionNav | A visible “Motion On/Off” control in the header, footer, or as a chip | Remove it. `prefers-reduced-motion` remains the only preference |
| InkOnNight | Ink (`#111`) dek on a dark case field — Kineticare sharing SportsGambit’s `gambit` class | White dek on Kineticare; `:not(.kineticare-hero)` on the lime-field rule |
| MotionCover | Any fixed chip covering Role / Focus on a compact fold | No Motion chip; fact values wrap |
| ClippedChip | A TOC chip cut mid-word (“Design P”) by overflow | TOC wraps or truncates to `+n`; chips never clip |
| StaggerHole | Selected-work grid leaving an empty offset column (`margin-top` stagger) | 12-column 7/5 rhythm; tops aligned; no dummy column |
| BlogFooterCTA | Footer contact as a third-party form, a LinkedIn-only pill, or a multi-field email form | One outlined project enquiry button; mail opens via `location.assign`; no form; no Contact column |
| Marquee | New auto-scrolling chip rows | Do not add. Existing domain chips may stay; do not invent a second |
| HiddenMontage | Instructure 16:9 frame is a navy empty box while the file plays off-canvas | Override Webflow `inset: -100%` / `z-index: -100` with `inset: 0; z-index: 0` |
| MeshParallaxCircus | Mesh masses rotate, travel tens of pixels, loop like a GIF, or drag type/chrome | Navy / olive / yellow translate a few pixels at different depths; chrome stays still; reduced-motion is static |
| BareWorkSlug | `/raiffeisen` (and the other six root slugs) 404 | 301 to `/work/{slug}` |
| DualHome | `/` and `/index` both return 200 | `/index` and `/index.html` 301 to `/` |
| TitleDrift | Case or `/works` H1 does not lead the `<title>` | `/works` H1 is `Selected work`; case titles start `{H1} —` |
| InventedSocial | A made-up `twitter:site` handle or GSC verification token | Omit both until a real handle or token is documented |
| TightAwardVideo | Professional-experience hover/tap shows a 500px Webflow strip or `inset: -100%` file, or compact hides the wrap | `.awards-bg-video > video` fills the card (`inset: 0; object-fit: cover`). Hover, focus, and tap (`.is-award-on`) all reveal the same full-bleed fill. Do not `display: none` the wrap on compact. Reduced motion keeps the paper card |

## Reject generated-design reflexes

Do not ship: decorative gradients or glow blobs; generic centered hero copy
followed by a card grid as the only structure; a 16:9 cover poster as the
fold; nested cards to fake hierarchy; icon tiles as a substitute for proof;
uppercase-tracked eyebrows; `mailto:` or the contact address in HTML;
generated screenshots.

Restraint here is precise hierarchy and honest product evidence. It is not
black-and-white empty margin, and it is not a Vercel report shell.

## Primitives (HTML vocabulary)

Agents compose pages from these names. Do not invent parallel components.

**Chrome:** `.skip-to-content` `.navbar` `.nav-logo-wrap` `.nav-breadcrumb`
`.menu-button` `#primary-navigation` `.nav-menu` `.nav-link` `.footer-section`
`.footer-chrome` `.footer-ident` `.footer-brand` `.footer-wordmark`
`.footer-lede` `.footer-cta` `.footer-contact-link` `.footer-email` `.footer-mesh`
`.footer-mesh-art` `.footer-mesh-lilac` `.footer-mesh-navy` `.footer-mesh-olive`
`.footer-mesh-yellow` `.footer-nav` `.footer-col` `.footer-col-title`
`.footer-copyright` `.footer-bar`

**Home:** `.home-mast` `.home-mast-mesh` `.home-mast-art` `.home-mast-lilac`
`.home-mast-navy` `.home-banner-section` `.hero-kicker` `.home-banner-title`
`.home-banner-subtitle` `.home-banner-outcomes` `.hero-work-link`
`.about-section-title` `.home-about-area` `.work-list` `.work-row`
`.work-row-thumb` `.work-row-copy` `.work-row-arrow` `.work-title`
`.work-card-summary` `.home-work-footer` `.nav-cta`

**Works:** `.work-grid` `.work-card` `.work-image`; `.home-banner-text` max two sentences.

**Case:** `article.case-study-article` `h1#case-title` `.case-hero-media`
`.case-hero-shot` `.case-facts-section` `.case-facts` `.case-toc`
`.case-evidence-note` `.summary` `.related-work-card`

**Buttons:** `.dark-button` `#000` on `#fff`. Footer LinkedIn is an outlined `<a>`; Email is `<button type="button" class="footer-email">`. Both share 44px / 12px chrome (1px black stroke, transparent fill). LinkedIn is the `in` icon (~17px); project contact labels follow the Copy contract above. Home nav reuses that LinkedIn square + email chrome. Home `View selected work` is the same outlined 12px language, not a black pill.

## Motion

GSAP + ScrollTrigger already own reveals. Native scroll only (no Lenis).
Respect `prefers-reduced-motion` and `PortfolioMedia.isReduced()`. Do not
add a visible Motion toggle, Three.js, particles, or generated Lottie.
Hide `.case-motion-rail`. Default to stillness for anything new. The locked
footer mesh may translate navy / olive / yellow a few pixels under the
pointer (yellow closer, navy deeper) with an easy-to-miss idle. Type,
Work, Email, LinkedIn, copyright, and the hairline do not move.
The **home mast is static** — no pointer parallax, no Motion control.
`prefers-reduced-motion: reduce` is the static wash. No dunes, no header
Motion control, no rotation circus.

### Selected-work field and experience clarity

The compact home reference list has one decorative, shared GSAP background
field on desktop (at least 992px, fine pointer with hover). It follows rows
using transform/opacity only; pointer drift is capped at 6px. Existing case
colors are shown at 10% opacity over paper. Text, thumbnails, arrows and
native link hit areas never follow the pointer. No loops, new plugins,
cursor replacements, animated gradients or layout-property animation.

Create the field and reusable `quickTo` controllers inside the existing
responsive motion context. Remove the field and its listeners on breakpoint
or reduced-motion changes; never kill unrelated GSAP timelines. Keyboard
focus uses an immediate CSS field and the existing visible outline. Touch,
reduced motion and unavailable GSAP keep native links and static feedback.

Professional-experience video fills stay full-bleed with their original
brightness: no full-card scrim, dot overlay, filter or blend grading. Only
the title/company text has a small opaque white backplate on hover, focus
or tap; the year keeps its white pill. Ink text must meet AA over both white
and black test frames. `media.js` remains the sole playback owner; reduced
motion retains the static paper cards. This exception does not remove the
separately verified Kineticare header contrast protection.

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
