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
remains supported, but is not the primary acquisition KPI. Preserve the
Product VP role, work order and shipped evidence. The 2026-09-13
KODE recreation brief below replaces the earlier semicircle composition.

`/ai-integration` and `/hu/ai-integracio` explain the same core service offer in
English and Hungarian. Compose from existing type and reading-width primitives;
no new palette, imagery, cards or service-page motion. One service H1, scoped offer, linked
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
role, access to shipped work, and a contact close. They are not here for a
Webflow demo, a blog, or a Dribbble cover.

Out of scope: live Webflow edits, ads, session deletion, invented metrics,
generated product evidence, generated palettes, generated wordmarks, Geist /
Vercel chrome, a third type family.

## Use this priority order

When requirements compete, protect them in this order:

1. Preserve shipped facts, case copy, claims, and the no-invented-email rule.
2. Preserve Funnel Display + Inter, the footer palette, existing routes,
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
| `/` | Identify a Product VP and open work | Role in H1 and Works in the opening scene; proof in the following statement. Central 3D chevron and vector title, **no** product screenshot |
| `/works` | Scan the hiring-order list and open a case | First case card on the fold |
| `/work/*` | Identify the project and inspect real product evidence | Centered title and complete UI on the lilac stage; dek beneath; four facts follow the opening |
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

The first viewport identifies Norbert as a Product VP and opens his work.

The user explicitly escalated the 2026-09-13 brief from inspiration to faithful
recreation of KODE's design and animations. The earlier left/right folded arch,
automatic short curtain, scroll-only decoration and first-fold proof locks are
superseded. The generated fidelity storyboard is a proposal; browser evidence
must prove the actual implementation. Do not copy KODE text, logos or model files.

- Preserve the exact footer palette: lilac `#D6D4ED`, navy `#0A1628`, forest
  `#1B3A32`, olive `#BDB414`. Footer markup and factual product assets remain.
- Keep Inter and Funnel Display for semantic text. The hero uses original SVG
  angular display lettering for “PRODUCT / WITH / PURPOSE”, adapting the
  reference's integrated vector title. This user-requested title artwork is the
  narrow exception to the earlier no-generated-letterforms rule.
- Opening stage: horizontal NORBERT.BARNA wordmark assembled over 220/60 seconds,
  real prerequisite progress in a travelling top counter, then an Enter button.
  Enter starts a one-second upward clip reveal. Asset failure and reduced motion
  must leave the usable page accessible. No simulated network progress or audio.
- Home: 100svh centered scene, three massive lines behind an independently
  assembled, bevelled refractive-glass chevron with forest/olive reflections.
  Geometry begins 200ms after Enter,
  assembles in 2.3 seconds, responds to pointer tilt/nearby fragmentation and drag.
  Use original dependency-free WebGL with a corresponding SVG fallback.
- The real H1 remains Product VP, visible at the lower left in the starting pose. Works and the native scroll affordance occupy the lower edge. The user-selected 03/04 direction adds a 210svh native track: the same object turns and morphs to a matte forest/olive folded gate on the right. The large live Product VP display, original name/dek, proof and employers resolve on the left; the semantic H1 remains unique. Short windows, no-JS, reduced motion and enlarged text use the final unpinned composition.
- During the home opening and Selected work, NB and destinations form a quiet stable lilac top bar. After that chapter, resume the distributed utility header: NB left, central wordmark, real page-progress
  counter and existing destinations. It travels down the viewport with native
  page progress and the wordmark expands at the footer. Keyboard focus and the
  mobile menu return navigation to a stable top position. Reading and product
  evidence across the main content have a 12px clearance: chrome chooses a
  free slot above/below neighbouring blocks, or
  docks at the top on an opaque navy field when enlarged text fills the view.
  Large changes between reading slots relocate invisibly and settle in 180ms
  with opacity only; never translate the menu across the paragraph.
  The terminal wordmark has its own landing after the unchanged footer links;
  a screen-space offset keeps the scaled letters centred inside that landing.
- `home-composition.js` is the only home morph scroll owner. One coalesced native-scroll frame updates opacity/transform and calls `PortfolioHeroScene.setMorphProgress`; no duplicated model, scroll interception, touch capture or second GSAP text owner. A real anchor marker at the track end supports the introductory hash. The scene suspends while hidden and restores on pageshow.
- All seven cases inherit the branded arrival/chrome vocabulary; complete real
  product images and text remain. The lilac stage uses a large centered Funnel
  title, four-slice media assembly, and a short native-scroll perspective settle.
  Project-specific colors remain on work index cards and body evidence.
  KODE provides no equivalent product-detail template to copy.

Acceptance requires reference-vs-local desktop/mobile composition and sequence
comparison, real pointer/drag and scroll behavior, failure/reduced-motion/history
checks, semantic text and keyboard reflow, and independent implementation review.
The earlier functional pass does not prove reference fidelity.

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
5. On Kineticare at 390: is the dek navy on the lilac field, is the actual
   video contained, and do the following facts wrap cleanly?
6. Does `npm test` still pass?

Keep this review internal. Deliver the implementation, not a scorecard.

## Locked brand (do not regenerate)

**Type:** Funnel Display 700 for case and section display; Inter for UI, dek,
and body. The semantic home H1 uses Inter. Original SVG lettering is limited to the
requested KODE-style decorative hero title; do not add a third font family.

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

Site chrome stays ink on cool paper; the home mast uses the requested
footer-lilac field below. Case colors remain on the work index cards; the immersive case
opening now uses the shared footer-lilac field. The footer mesh **pixel-matches the accepted lock crop**, not
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
   `Norbert Barna`. Home Person JSON-LD must include `image` using the
   existing OG portrait `assets/images/og/norbert-barna.jpg`. Do not generate
   a new headshot.
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
6. Copyright bottom-left: `© 2026 Norbert Barna`. Sharp 1px
   dark hairline on the yellow. No back-to-top control. The approved privacy
   exception adds only a wrapping `.footer-privacy` utility row: English and
   Hungarian privacy links plus a native analytics-settings button. No new
   columns or contact form. For site-wide AA, its content area has one shared
   64% navy reading surface with white Inter text, retaining the existing
   hairline and spacing. This protects small type across the navy/olive
   transition without separate label chips. Compact colored mesh groups sit
   90px lower, with a 760px minimum field height, so the full Work list remains on the pale field; the full-bleed
   grain stays fixed. Work links underline without lowering ink opacity.

**Optional analytics (2026-09-05):** `/privacy` and `/hu/adatvedelem` are paired
utility pages. This release is ON via the first-loaded, static
`analytics-config.js` (`enabled: true`). Both consumers still return before any
side effects unless the value is exactly `true`. Settings start hidden in HTML
and are revealed by the consent owner. A first visit shows the existing non-modal
banner; notices, metadata and JSON-LD describe optional, consent-gated PostHog EU
capture of page views and Email-button clicks. Insights lock: project **265707**
only, public write-only key in `analytics.js`, host `https://eu.i.posthog.com`.
Consent before any capture. Do not add PostHog dashboards or the official snippet
to this repo. The official `posthog-js` snippet
is not used, so CSP allows `https://eu.i.posthog.com` on `connect-src` only — not
`eu-assets.i.posthog.com` on `script-src` (asset host not needed). Google Search Console HTML verification is
injected by `server.js` from `GOOGLE_SITE_VERIFICATION` or `GSC_VERIFICATION`
when a real token is present. Never invent a token in HTML.

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
| Home role H1 | 16px desktop; 12px compact; reflows at 200% | 400 Inter | 44px; 1.4 with enlarged text | `.home-banner-title` |
| Case display H1 | clamp(64px, 10.5vw, 164px) desktop; 36–104px compact | 700 Funnel | .94 desktop / 1 compact | `.banner-title` |
| Home intro statement | 30–72px desktop; 32–60px compact | 500 Funnel | 1.08 | `.home-banner-subtitle` |
| Case dek | 20–22px | 400 Inter | ~1.45 | `.banner-text` |
| Body | 17–18px | 400 Inter | ~1.5 | `body`, `.summary` |
| Section H2 | 28–32px | 700 Funnel | 1.15 | `.summary h2`, `.section-title` |
| Card title | 22–24px | 700 Funnel | 1.2 | `.work-title` |
| Kicker | 13px compact; 18px home desktop | 600–700 Inter | 1.2 | `.hero-kicker`, `.work-category` |

The decorative home display is vector artwork; the semantic home H1 remains
a small role label. Case titles are deliberately oversized under the new brief.
Keep body/dek weights readable and do not substitute oversized lightweight copy. The home name
remains plain `Norbert Barna` in the DOM. User text-spacing
detection compares against the authored responsive baseline.

## Information architecture

**One work order everywhere** (hiring-first):

1. Raiffeisen
2. Instructure
3. Bitpanda
4. Benker
5. SportsGambit
6. Kineticare (HU product — kicker must say so)
7. OnRobot

Home selected work shows 1–6 as landscape editorial rows (`.work-list` / `.work-row`), directly after the home scene. The user-selected 03/04 storyboard supersedes the 72–96px thumbnails: a wide 2.4:1 image frame, small sequence number, large live title, original summary, View project affordance and factual domain labels. Existing complete case images use `contain`; compact stacks image above copy. Each entire row remains one native project link, separated by a hairline on footer-lilac.
`/works` shows all seven in that order as the locked **E′ Weighted** grid
(A/B/C/D/Mesh remain HOLD). Row 1 is **7/5** (Raiffeisen wider / Instructure
narrower) with flush tops and equal band height. Row 2 is three equal 4-span
columns (Bitpanda, Benker, SportsGambit). Kineticare and OnRobot stay a 7/5
pair. Labels under each band are the project name plus a light grey pill:
`Product design` on six cards; Kineticare keeps `Hungarian product`. No domain
chips, no card summaries, no invented metrics. Color bands use the shipped
case fields. Stills are existing complete UI with `object-fit: contain`.
Compact stacks to one column below 600px and a 2-up below 992px — never a
broken 7/5. Do not lead the **list** with a prediction-market MVP or a
Hungarian product on an otherwise English hiring path.

**Header:**

- Home: NB home link on the left; Works, LinkedIn and Email on the right,
  on the pale mast. Native links and 44px minimum targets; compact keeps the
  accessible disclosure. Email remains a native assign-only button.
- `/works` retains its sticky bar. Cases share the travelling wordmark header,
  keeping `Works / {Project}` on desktop. Compact hides that duplicate
  breadcrumb and includes a native Works link in the disclosure alongside
  LinkedIn. Shared entrances must never hide navigation indefinitely.
- No Motion control, sound requirement, Contact page, new form or invented
  address. `prefers-reduced-motion` controls decorative animation. Contact and
  privacy behavior retain their existing owners.

**Site-wide text accessibility (WCAG 2.2 AA):** normal text must reach 4.5:1;
large text (24px regular or 18.667px bold) must reach 3:1. Apply this to every
route, including the footer, disclosures, hover/focus states and the 404 page.
Use actual composited backgrounds for grain, images and video; an automated
contrast result marked incomplete is not a pass. Remove overlays that fade
sector labels, and keep the How I work heading on its existing black card
even when the underlying video is entirely white. Text inherits antialiasing
on WebKit/macOS and grayscale smoothing on Firefox/macOS where supported;
other platforms use their native font rasterizer. Do not thin text with opacity.

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
The home proof and employer list use solid lilac text on the separate navy
reading scene, clear of the glass decoration. Short viewports preserve role and CTA before
nonessential decoration. Enlarged or user-spaced mast text uses the existing
`data-text-reflow` fallback and a single reading column. ResizeObserver checks
computed typography rather than layout height; restoring authored text restores
the normal composition. Ordinary viewport changes must not trigger false text
reflow. Kineticare uses navy text outside the contained video on the lilac
stage, so even an all-white video frame cannot change its text contrast.
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

**Home fold — immersive direction (2026-09-13)**

1. Footer-lilac 100svh stage; original navy display lettering behind a
   refractive forest/olive chevron. No horizontal overflow or old semicircle.
2. Semantic H1 `Product VP` in Inter 400 at the lower left. The large
   `PRODUCT / WITH / PURPOSE` artwork does not replace the accessible role.
3. Native scrolling transforms the same glass chevron to the right-hand matte folded gate. The left editorial composition preserves the plain name `Norbert Barna` and
   `AI products for fintech, Web3, regulated teams — strategy to ship.`
4. Preserve proofs: multi-country banking / Raiffeisen and enterprise EdTech
   AI / Instructure. No invented results or metrics.
5. `[ Works ]` in the scene and `View selected work` in the intro link
   natively to `/works`; at least 44px high and usable on first touch.
6. BlackRock, Instructure, Raiffeisen, Bitpanda and Balabit remain semantic employer items at the lower edge of the resolved intro. Their detailed evidence remains below.
7. Under text zoom/spacing the art and controls get separate rows. Decorative
   header text and progress can yield space to native links. The original
   consent component remains usable and the first-view role/Works stay clear.
8. User-requested removal (2026-09-04): no `Open for engagements` block,
   company-solicitation paragraph or duplicate LinkedIn/Email actions after
   the services cards. Do not hide this copy in CSS, HTML comments, metadata
   or JSON-LD. The existing `AI products` heading is an underlined, ink-colored
   native link to `/ai-integration`, with a visible keyboard focus ring. This
   preserves factual service discovery without a replacement promotional block.
   All five service headings use ink on paper, never the inherited white
   `--font-color--dark` from the old template. Test their revealed-state contrast.

**Home selected work (03/04 storyboard, 2026-09-14):** wide landscape rows directly follow the hero. Preserve the six project names, order and summaries. Show complete existing UI in a 2.4:1 frame, a small sequence number, large title and native whole-row action. Mobile stacks frame over copy. The same lilac field and fine rules connect hero and work; About and services follow the list. No invented metrics, dates or descriptions.

**Works fold:** H1 `Selected work` (same subject as `<title>`),
two-line intro max, first card (Raiffeisen) visible in a 900px-tall desktop
viewport. E′ Weighted color bands sit under the title — not 4:5 CoverPoster
crops. No “these aren’t mockups” line. No “Design Case Studies” as the
primary title.

**Home professional experience:** paper cards until hover (fine pointer) or
tap / Enter (coarse and keyboard). Then the existing award video fills the
card (`inset: 0; object-fit: cover`). Not a 500px Webflow strip. Compact
does not hide the wrap. Reduced motion keeps the paper card.

**Case opening (one centered lilac template)**

1. Shared travelling site bar; desktop breadcrumb and compact Works disclosure
2. Opening grid: category, oversized responsive Funnel H1, centered complete
   `.case-hero-media`, then the original regular dek. Images keep
   `object-fit: contain`. Four alternating vertical masks reveal the actual
   media over 2.3 seconds; title letters restore the original semantic nodes.
   A separate 150–220px native-scroll interval settles the panel perspective.
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

- Shared English footer and English service CTA: `Discuss your project`; title
  `Opens your email app to discuss your project`.
- Screenshot-directed home navigation exception: visible `Email`; accessible
  name `Email — discuss a project`; the same explanatory title and secure
  split-address handler remain.
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
| EmptyFold | Name or manifesto, or a Canvas/product screenshot standing in for the home argument | Role + Works on the opening stage, live proof in the following intro; product UI stays in work rows and case pages |
| CanvasFold | Instructure Canvas Career (or any product UI) in the homepage header | Delete it. Use the central original glass scene and title |
| GiantWorkCards | Home Selected work as giant 2-up rounded color cards or half-viewport covers | Wide landscape rows from the approved 03/04 storyboard; compact stacks image above copy |
| FooterHitSteal | Unscoped `.work-title::after` (z-index 5) paints over footer Email/LinkedIn so the ink-wash hover never sticks | Scope the hit-area to `.work-card` / `.work-row` / `.related-work-card`. Footer stacks at `z-index: 8` |
| DualIndex | Home **list** order ≠ `/works` order | One list, hiring-first |
| BlogHero | “Written by / Published / Updated” anywhere on the page | Facts + UI; authorship stays in meta and JSON-LD |
| CoverPoster | Campaign headline + clustered devices, site URL in the corner, or any artboard that already crops the phones | One complete product screen; `contain` |
| CroppedProduct | Sidebar or phone clipped by `object-fit: cover` **or** by the source artboard | Different existing asset whose UI is fully in frame |
| FakePII | Invented names, emails, `+123%` in comps we author | Shipped UI only, no unaudited % in our chrome |
| FigmaLeftover | Red selection stroke on a screenshot (`Data Insights.png`) | Do not use that file as a fold or case hero |
| TemplateVoice | Webflow lorem about interviews and testing | Delete; keep the 16-year line |
| TrackedBody | Uppercase/tracking applied to the dek or evidence body | Tracking is limited to the 13px home name kicker and small labels |
| AIDecor | Glow blobs, fake words, new palettes or generated product evidence | Existing color tokens + real UI; the requested glass sculpture and original SVG title are the header exceptions. Footer mesh stays on the lock crop (greyer-lilac, left-weighted navy horizon, right-weighted olive-chartreuse) — never Ironclad dunes, candy pink, or a third palette |
| YellowDuneSlab | Footer filled as a flat `#FFE000` rectangle or a stacked yellow dune ridge | Olive-chartreuse is the bottom of the mesh, not a ridge or a CSS slab |
| SausageBand | Navy is a thin full-width ellipse (~8% of field height, `ry` ≪ field) then a flat yellow rectangle | Taller ~3:2 field; navy is a left-weighted horizon mass, not a crushed stripe |
| YellowBalloon | Centered yellow ellipse (`cx` at field center, sitting as an island / smiley) | Yellow is right-weighted (onset left 94% / center 84% / right 73%); left at 80% stays dark |
| HardMeshSeam | Visible ellipse contours or hard-ish bands between lilac / navy / olive / yellow | Larger overlapping masses + `feGaussianBlur` ≥ 48 so the lock reads as analog bleed |
| CompactMeshClip | A hard horizontal seam through the compact ident / Email / Work stack where a short bottom-pinned mesh SVG begins | Compact `.footer-mesh-art` fills the footer (`inset: 0; height: 100%`) so the wash is one field |
| FlatDuneGrain | Four solid dune fills, Ironclad ridge silhouettes, or per-layer sand on stacked paths | One soft mesh + one static analog grain overlay. No `.footer-dunes` |
| FogGrain | A blurred grain layer or broad neutral haze flattens the field | Visible static speckle with retained light gray and blue depth; home planes remain distinct; footer retains its existing material |
| NavyFlood | Navy reaches dark reading text and destroys contrast | Compact footer: fade navy below type. Home: navy copy and employers stay on the lilac composition; text reflow uses an unpinned layout without the sculpture |
| GrainWash | Translucent or overly light text falls below WCAG AA on the live grain | Solid navy ink on lilac, and lilac ink on the dark arrival; sample worst relevant pixels behind glyphs, including reflow |
| JobTitleDrift | Title, H1, meta, or JSON-LD name still say Design Lead | `jobTitle`, H1, and ProfilePage `name` are Product VP. Person `name` is `Norbert Barna` |
| PersonImageMissing | Home Person JSON-LD omits `image` | Existing OG portrait URL on the Person entity |
| HeadlineDrift | Case Article/CreativeWork `headline` disagrees with `<title>` | `headline` matches `<title>`, or omit it |
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
| InkOnNight | Ink (`#111`) dek on a dark case field — Kineticare sharing SportsGambit’s `gambit` class | Navy dek on the new lilac case stage; do not revive the superseded dark-video text override |
| MotionCover | Any fixed chip covering Role / Focus on a compact fold | No Motion chip; fact values wrap |
| ClippedChip | A TOC chip cut mid-word (“Design P”) by overflow | TOC wraps or truncates to `+n`; chips never clip |
| StaggerHole | Selected-work grid leaving an empty offset column (`margin-top` stagger) or unequal row-1 band heights | E′ Weighted 7/5 then 3-up; flush tops; equal band height; no dummy column |
| RowClearfixHole | Webflow `.w-row::before/::after` (`grid-area: 1 / 1`) occupy column 1 so a 7/5 pair cannot share a row | `content: none` on `.work-section .work-grid` pseudos; do not restyle every `.w-row` |
| WorksDomainChip | `/works` labels restore domain chips, card summaries, or invented metrics | Name + light grey `Product design` pill; Kineticare `Hungarian product`; no summaries |
| BlogFooterCTA | Footer contact as a third-party form, a LinkedIn-only pill, or a multi-field email form | One outlined project enquiry button; mail opens via `location.assign`; no form; no Contact column |
| Marquee | New auto-scrolling chip rows | Do not add. Existing domain chips may stay; do not invent a second |
| HiddenMontage | Instructure 16:9 frame is a navy empty box while the file plays off-canvas | Override Webflow `inset: -100%` / `z-index: -100` with `inset: 0; z-index: 0` |
| MeshParallaxCircus | Mesh masses rotate, loop like a GIF, or drag type/chrome | Footer masses translate a few pixels; the original home glass responds within its documented pointer/drag bounds. Footer chrome stays still; the requested utility header travels through clear space; reduced-motion is static |
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
`.home-mast-sculpture` `.home-banner-section` `.hero-kicker`
`.home-banner-title` `.home-banner-subtitle` `.home-mast-proof-chips`
`.home-banner-outcomes` `.home-highlight-company`
`.hero-work-link` `.home-nav-monogram` `.home-nav-label`
`.about-section-title` `.home-about-area` `.work-list` `.work-row`
`.work-row-thumb` `.work-row-copy` `.work-row-arrow` `.work-title`
`.work-card-summary` `.home-work-footer` `.nav-cta`

**Works:** `.work-grid` `.work-card` `.work-image` `.work-category-text` (light grey Product design / Hungarian product pill on `/works`). `.home-banner-text` max two sentences.

**Case:** `article.case-study-article` `h1#case-title` `.case-hero-media`
`.case-hero-shot` `.case-facts-section` `.case-facts` `.case-toc`
`.case-evidence-note` `.summary` `.related-work-card`

**Buttons:** `.dark-button` `#000` on `#fff`. Footer LinkedIn is an outlined `<a>`; Email is `<button type="button" class="footer-email">`. Both share 44px / 12px chrome (1px black stroke, transparent fill). LinkedIn is the `in` icon (~17px); project contact labels follow the Copy contract above. The home nav uses text-only 44px targets. The scene Works action and intro View selected work use native underlined/text controls.

## Motion

GSAP + ScrollTrigger already own reveals. Native scroll only (no Lenis),
respect `prefers-reduced-motion`, `html.no-motion` and `PortfolioMedia.isReduced()`.
No new runtime dependency, sound requirement, generated Lottie or visible
Motion control. Original raw WebGL is the user-requested central hero exception.
Keep `.case-motion-rail` hidden.

The central glass form assembles once, then responds to pointer tilt,
fragment hover and drag. Its raw WebGL renderer sleeps when idle/offscreen.
The following intro resolves word transforms through GSAP/ScrollTrigger with
native scroll. WebGL failure gives a single static SVG; reduced motion gives
one static rendered form or the fallback, never both.
One owner
per animated target; responsive and preference changes remove obsolete GSAP
contexts and restore the correct static/composited state. No pinning, snap,
scroll hijack or infinite idle rotation.

First-session arrival assembles the horizontal brand for 220/60 seconds,
waits for real fonts/critical images/scene readiness, then shows Enter. The
counter reports completed real prerequisites; Enter additionally waits for
the minimum name-assembly duration. It does not simulate bytes downloaded. Enter triggers a one-second upward curtain.
Internal navigation skips it and cases retain their own bounded opening.
Reduced motion, unavailable prerequisites, no JavaScript,
restored scroll/hash navigation and user interaction must have prompt readable
content. Bounded fail-open cleanup prevents an overlay trapping the page.
Do not make the document inert or hide its only semantic copy as an animation
prerequisite. The skip link and native navigation retain keyboard behavior.

Case reveals decorate existing title/media and settle into complete readable
geometry; users can immediately scroll or follow the TOC. Kineticare's video
remains solely owned by `media.js`, with its existing 4.5-second cap.

Footer motion is unchanged: subtle translation of existing masses, static grain
and chrome, no rotation or large travel, reduced-motion freeze.

### Selected-work motion and experience clarity

The home reference rows stay on paper, with no hover background field. On
desktop fine pointers, animate the existing thumbnail frame to 1.06 scale and
-2px y while its arrow moves 4px right (0.36s power3.out in, 0.28s power2.out
out). Keyboard focus has priority over pointer exit and preserves the instant
visible outline. Keep text, row geometry, separators and native link targets
still. Scale the complete frame without introducing another image crop.

On compact layouts or coarse pointers, use native scroll through each row:
thumbnail 1 → 1.04 → 1 scale, 0 → -1 → 0px y, arrow 0 → 3 → 0px x. The range
runs from top 82% to bottom 28% with 0.2s scrub. A first tap follows the native
link immediately. No pinning, snap, scroll hijacking, loops or new plugins.
Create reusable controllers inside the existing responsive motion context;
remove only their own listeners, transforms and ScrollTriggers on breakpoint
or motion-preference changes. Reduced motion, no JavaScript and unavailable
GSAP leave static readable rows and native links.

Professional-experience video fills stay full-bleed with their original
brightness: no full-card scrim, dot overlay, filter or blend grading. Only
the title/company text has a small opaque white backplate on hover, focus
or tap; the year keeps its white pill. Ink text must meet AA over both white
and black test frames. `media.js` remains the sole playback owner; reduced
motion retains the static paper cards. This exception does not remove the
separately verified Kineticare header contrast protection.

## Eval rubric (first attempt must pass)

1. Facts that were on the page are still on the page.
2. The opening identifies a Product VP and gives native access to work and
   contact; the next reading scene preserves the shipped evidence.
3. `/` and `/works` use the same case **list** order.
4. Every case fold shows UI that is not clipped and is not a CoverPoster or
   Figma leftover.
5. No anti-pattern from the table above.
6. `npm test` and `npm run test:e2e` stay green.

When a review correction repeats, encode it here, in CSS, or in
`scripts/check-design.mjs`.
