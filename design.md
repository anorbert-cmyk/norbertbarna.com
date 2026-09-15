# design.md — barnanorbert.com

Single file any agent (or person) uses to design or change this site.
Do not invent a second visual language. Load this file, then use the class
names and tokens below. Do not restyle from adjectives such as “clean”,
“premium”, or “Awwwards”.

This file follows the loop in
[How our agents build on-brand pages with design.md](https://vercel.com/blog/how-our-agents-build-on-brand-pages-with-design-md):

1. **Guidance** (this file) — reader job, composition, named failures.
2. **Stylesheets** — `assets/css/responsive.css` holds the site tokens, the
   chrome lock and the reflow rules; nine scoped companions own one surface
   each. Pages load byte-identical `name.<sha256-12>.css` copies of the nine
   content-hashed families; `consent.css` is served unhashed and revalidates,
   so a change to it ships without a new copy. Repeatable
   mechanics live in CSS. Never read a hashed copy into context. The full
   ownership map is in **System reference** below.
3. **Checks** — `scripts/check-design.mjs` plus the seven other `check-*.mjs`
   scripts and seventeen Playwright specs. Mechanical failures that have
   already been named must fail CI. **System reference → Checks** says which
   file owns which rule, so a new rule lands in one place.

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
| Footer / nav | Start a project conversation | Large personal contact close, native Email and LinkedIn, original folded geometry on lilac; integrated privacy/settings controls. See Editorial footer below. |

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
  `#1B3A32`, olive `#BDB414`. Factual product assets remain; the latest editorial footer replaces the old mesh markup.
  Muted editorial text uses navy at 70% over lilac; the dark Story footer uses
  lilac at 85% over navy. Derive subdued text from these colors with alpha,
  maintaining at least 4.5:1 contrast, instead of adding standalone hues.
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
- The real H1 remains Product VP, visible at the lower left in the starting pose. Works and the native scroll affordance occupy the lower edge. The user-selected 03/04 direction adds a 210svh native track: the same object turns and morphs to a matte forest/olive triangular folded ribbon on the right, matching the original 03 silhouette: broad sloped left plane, visible olive inner fold and a slimmer outward-leaning right leg. Avoid the earlier thick horizontal lintel and parallel blocky towers. The large live Product VP display, original name/dek, proof and employers resolve on the left; the semantic H1 remains unique. Short windows, no-JS, reduced motion and enlarged text use the final unpinned composition. That composition still carries the live object: phones, tablets and short desktop windows keep the assembled refractive chevron in the right-hand drawing slot the flat gate held, turned by their own native scroll. The flat gate drawing is the fallback, not the compact design.
- During the home opening and Selected work, NB and destinations form a quiet stable lilac top bar. After that chapter, desktop resumes the distributed utility header: NB left, central wordmark, real page-progress
  counter and existing destinations. On desktop it travels down the viewport with native
  page progress and the wordmark expands at the footer. Keyboard focus and the
  mobile menu return navigation to a stable top position. Reading and product
  evidence across the main content have a 12px clearance: chrome chooses a
  free slot above/below neighbouring blocks, or
  docks at the top on an opaque navy field when enlarged text fills the view.
  Large changes between reading slots relocate invisibly and settle in 180ms
  with opacity only; never translate the menu across the paragraph.
  The terminal wordmark has its own landing after the unchanged footer links;
  a screen-space offset keeps the scaled letters centred inside that landing.
- `home-composition.js` is the only home morph scroll owner. One coalesced native-scroll frame updates opacity/transform and calls `PortfolioHeroScene.setMorphProgress`, or `setCompactProgress` while `data-glass-live` marks the unpinned slot; no duplicated model, scroll interception, touch capture or second GSAP text owner. A real anchor marker at the track end supports the introductory hash. The scene suspends while hidden and restores on pageshow.
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
2. Does each list project have its own geometric artwork, while case pages
   preserve complete real product UI (`object-fit: contain`)?
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

The home, work index, experience and footer share lilac `#D6D4ED`, navy
`#0A1628`, forest `#1B3A32` and olive `#BDB414`. Existing case evidence keeps
its shipped colors. The 2026-09-14 user request supersedes the earlier mesh
footer, video-backed experience and E′ Weighted index grid.

**Editorial footer (2026-09-14)**

One site-wide `.footer-section.editorial-footer` on all thirteen content pages.
Its lilac field continues the original 03/04 storyboard. A large live
“Let’s talk product.” heading and the existing Product VP lede form the left
column; the original folded gate and four existing Work links form the right.
The old `.footer-mesh` / blurred gradient and `.footer-dunes` are removed.

- Reuse the original NB mark. Keep the real Person metadata and OG portrait.
- Preserve the native `button.footer-email`, its “Discuss your project” label,
  assign-only email handler and destination. Match the hero action with a navy
  capsule and lilac text, at least 48px tall, wrapping safely at enlarged text.
- Keep one real LinkedIn link, with its icon and visible label. No new Contact
  page, form, endpoint, invented address or social account.
- Preserve Raiffeisen, Instructure, Bitpanda and Kineticare links and copyright.
- Integrate Privacy, Adatvédelem and Analytics settings into the same lilac
  footer field with a fine top rule. This is an in-flow utility row, without
  a separate dark slab. Preserve all consent hooks, language attributes and
  focus return; targets remain at least 44px tall.
- The mobile footer stacks naturally. The gate is decorative; text stays live,
  unoccluded, and readable at 320px/200%. No motion owner or new dependency.
- Use `assets/css/editorial-sections.css` for the experience and footer, and
  `assets/css/compact-navigation.css` for the stable compact navigation. The
  former also aligns the existing consent banner palette; choices stay equal.

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
Service or Article pages. A small non-modal consent banner uses navy on lilac,
equal outlined accept/reject buttons of at least 44px, no initial autofocus and no
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

Home selected work shows 1–6 as landscape editorial rows (`.work-list` / `.work-row`), directly after the home scene. The user-selected 03/04 storyboard supersedes the 72–96px thumbnails: a wide 2.4:1 image frame, small sequence number, large live title, original summary, View project affordance and factual domain labels. Unique geometric project artwork fills each frame; compact stacks image above copy. Each entire row remains one native project link, separated by a hairline on footer-lilac.
`/works` uses the same landscape row composition for all seven projects,
with a large Selected work introduction and factual summaries. Each index
row has an individual generated geometric artwork; these are decorative
images (`alt=""`, `aria-hidden="true"`), never presented as product evidence.
Original product screenshots remain inside their case studies. Images live
in `assets/images/geometry/` with 480/960/1600px WebP variants and a 150kB
per-variant ceiling. Reuse the same project image on home and Works; do not
reuse one artwork for multiple projects. The list uses `project-index.css`.
Compact stacks image above copy. Preserve project order and native whole-row
links, heading hierarchy and visible keyboard focus.

**Header:**

- Home: NB home link on the left; Works, LinkedIn and Email on the right,
  on the pale mast. Native links and 44px minimum targets; compact keeps the
  accessible disclosure. Email remains a native assign-only button.
- `/works` retains its sticky bar. Desktop cases share the travelling wordmark header,
  keeping `Works / {Project}` on desktop. Compact hides that duplicate
  breadcrumb and includes a native Works link in the disclosure alongside
  LinkedIn. Shared entrances must never hide navigation indefinitely.
- At widths up to 991px every page uses a stable lilac/navy top bar. No travel,
  reading-slot fade, footer relocation or expanded terminal wordmark. Preserve
  native scrolling, menu/focus behavior and browser-height changes.
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

**Home selected work (03/04 storyboard, 2026-09-14):** wide landscape rows directly follow the hero. Preserve the six project names, order and summaries. Show each project’s own geometric artwork in a 2.4:1 frame, a small sequence number, large title and native whole-row action. Mobile stacks frame over copy. The same lilac field and fine rules connect hero and work; About and services follow the list. No invented metrics, dates or descriptions.

**Works fold:** H1 `Selected work` (same subject as `<title>`), concise
factual introduction and first landscape row (Raiffeisen) visible in a
900px-tall desktop viewport. All seven projects use unique decorative geometric
art, original summaries and native links. No “these aren’t mockups” manifesto.

**Home professional experience:** five chronological text rows on lilac, original
roles/companies/dates, the original folded gate beside the heading. Company names
are visually prominent. No decorative video, pointer/tap state or fake tab stop.
A lead paragraph under the heading names the arc the five rows belong to, and each
row carries one short paragraph saying what that step actually was, so the section
reads as one career rather than five unconnected posts. Each row stands on its own:
a reader or an answer engine can take one without the rest for context. Every claim
in them is the owner's own, checkable, and carries the employer it belongs to.
Invent nothing here, and add no metric the owner has not stated. The same five roles
appear as described `hasOccupation` entries in the home `Person` schema; when a row
changes, its schema entry changes with it.

**The shared page mark (2026-09-15).** Every page other than the home page carries
`.page-chevron-mark`, a small still chevron in its header, so one identity runs
through the site instead of living only in the opening. It is decoration: aria
hidden, pointer inert, absolutely positioned so it never takes a grid cell, changes
a reading layout or pushes a documented fold. It is the same object the home hero
assembles and the `/about` stage stands in the corridor, never a second hero, never
a link, and never large enough to compete with a page's own title.

**The mark turns with the page (2026-09-15).** Native scroll drives it, on every
viewport including phones: the resolved gate hands over to the glass chevron and
the chevron ends pointing down the page. Scroll owns it, so it stops when the
reader stops and never idles. A mark pinned to the top of the document leaves a
phone screen in about 130px, too fast to watch, so the owner holds it against the
scroll for the length of the turn and then lets it travel away. Keep the handover
short: two different silhouettes held at similar opacity read as ghosting rather
than one object changing state. The arithmetic lives in the owner, not in CSS, so
the stylesheet's defaults are the honest resting state. Every page carries a
blanket `html.no-motion * { opacity: 1 !important }`, so reduced motion has to
re-assert the gate explicitly or both poses show at once.

**Case opening (one centered lilac template)**

1. Desktop travelling site bar; stable compact bar with the Works disclosure
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
copy update supersedes the older literal `Email` label/72–76px width lock.
The split-address handler remains. The current editorial footer uses the
48px capsule defined below; service-page buttons retain their existing chrome.

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
| AIDecor | Glow blobs, fake words, new palettes or generated product evidence | Existing tokens, original folded geometry and explicitly requested decorative project art; real product UI remains inside cases |
| YellowDuneSlab | A flat neon-yellow footer or stacked dunes return | Use the quiet editorial lilac field and the existing olive/forest geometry |
| SausageBand | The retired squeezed horizon mesh returns | Keep the editorial footer’s natural content height |
| YellowBalloon | A decorative yellow blob replaces the folded sculpture | Retain the original planar forest/olive gate |
| HardMeshSeam | Blurred color bands return behind footer text | Solid lilac, readable navy text and a separate geometric figure |
| CompactMeshClip | Footer art or an overflow rule cuts through mobile content | Natural in-flow stacking, contained art and text-range reflow checks |
| FlatDuneGrain | Grain overlays or stacked dunes are restored | The editorial footer has no mesh layer or `.footer-dunes` |
| FogGrain | Broad haze hides geometric facets | Keep the folded planes distinct; no extra CSS blur |
| NavyFlood | Dark artwork intrudes into navy reading text | Keep copy on lilac and reserve separate space for the sculpture |
| GrainWash | Translucent or overly light text falls below WCAG AA on the live grain | Solid navy ink on lilac, and lilac ink on the dark arrival; sample worst relevant pixels behind glyphs, including reflow |
| JobTitleDrift | Title, H1, meta, or JSON-LD name still say Design Lead | `jobTitle`, H1, and ProfilePage `name` are Product VP. Person `name` is `Norbert Barna` |
| PersonImageMissing | Home Person JSON-LD omits `image` | Existing OG portrait URL on the Person entity |
| HeadlineDrift | Case Article/CreativeWork `headline` disagrees with `<title>` | `headline` matches `<title>`, or omit it |
| NeonMeshYellow | Bottom of the footer is neon `#FFE000` | Muted olive-chartreuse `#BDB414` |
| BrightMeshLilac | Type band is bright `#E1E1F5` | Greyer-lilac `#D6D4ED` |
| FooterBackToTop | 44px outlined double-arrow on the copyright row | Lock has none; do not restore it |
| LinkedInHitSquare | LinkedIn collapses into an undersized icon | Keep a visible label and at least 48px target beside the native Email button |
| FilledEmailPill | An oversized or clipped capsule obscures its label | The requested navy capsule may wrap safely; text must remain fully inside at 200% |
| ContactColumn | A Contact heading (empty or with a mailto line) beside Work | Email in nav and footer ident; Work column only |
| MailtoInHtml | `mailto:` or `anorbert@pm.me` appears in page HTML (before or after click), or the complete address is one JS string | `location.assign` the assembled href; never write it onto `href` or into the DOM |
| FakeEmailLink | Email is an `<a role="link">` without href | Native `<button type="button" class="footer-email">`; Space/Enter come for free |
| SaaSFooter | Product / Company / Resources / Legal sitemap columns or extra socials | Personal contact close, existing Work links and one integrated privacy row |
| MotionNav | A visible “Motion On/Off” control in the header, footer, or as a chip | Remove it. `prefers-reduced-motion` remains the only preference |
| InkOnNight | Ink (`#111`) dek on a dark case field — Kineticare sharing SportsGambit’s `gambit` class | Navy dek on the new lilac case stage; do not revive the superseded dark-video text override |
| MotionCover | Any fixed chip covering Role / Focus on a compact fold | No Motion chip; fact values wrap |
| ClippedChip | A TOC chip cut mid-word (“Design P”) by overflow | TOC wraps or truncates to `+n`; chips never clip |
| StaggerHole | Dummy columns, stagger offsets or empty gaps interrupt project scanning | A single landscape list on home and Works |
| RowClearfixHole | Webflow `.w-row::before/::after` (`grid-area: 1 / 1`) occupy column 1 so a 7/5 pair cannot share a row | `content: none` on `.work-section .work-grid` pseudos; do not restyle every `.w-row` |
| WorksDomainChip | Decorative pills or invented metrics clutter the list | Large name, original factual summary and quiet domain text |
| BlogFooterCTA | Third-party or multi-field contact form | One native project button using the existing assign-only email handler |
| Marquee | New auto-scrolling chip rows | Do not add. Existing domain chips may stay; do not invent a second |
| HiddenMontage | Instructure 16:9 frame is a navy empty box while the file plays off-canvas | Override Webflow `inset: -100%` / `z-index: -100` with `inset: 0; z-index: 0` |
| MeshParallaxCircus | Retired mesh motion or moving footer text returns | Footer content stays still; compact navigation stays at the top |
| BareWorkSlug | `/raiffeisen` (and the other six root slugs) 404 | 301 to `/work/{slug}` |
| DualHome | `/` and `/index` both return 200 | `/index` and `/index.html` 301 to `/` |
| TitleDrift | Case or `/works` H1 does not lead the `<title>` | `/works` H1 is `Selected work`; case titles start `{H1} —` |
| InventedSocial | A made-up `twitter:site` handle or GSC verification token | Omit both until a real handle or token is documented |
| TightAwardVideo | Retired award-video cards or fake interactions return | Five readable factual experience rows with no video or tab stops |

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
Anything not listed here either does not exist yet or is inherited Webflow
markup that is being retired: check the page before reusing it.

**Chrome (all thirteen content pages):** `.skip-to-content` `.navbar`
`.nav-wrap` `.nav-menu` `.nav-menu-area` `.nav-link` `.nav-logo-wrap`
`.nav-cta` `.nav-breadcrumb` `.menu-button` `#primary-navigation`
`.home-nav-monogram` `.home-nav-label` `.home-nav-wordmark`
`.home-nav-progress`

**Editorial footer:** `.footer-section` `.editorial-footer`
`.editorial-footer-title` `.editorial-footer-art` `.editorial-linkedin-label`
`.footer-chrome` `.footer-inner` `.footer-ident` `.footer-brand`
`.footer-wordmark` `.footer-lede` `.footer-cta` `.footer-contact-link`
`.footer-email` `.footer-icon` `.footer-nav` `.footer-col` `.footer-col-title`
`.footer-col-list` `.footer-copyright` `.footer-bar` `.footer-privacy`

**Home opening:** `.home-mast` `.home-mast-scene` `.home-mast-canvas`
`.home-mast-fallback` `.home-mast-sculpture` `.home-mast-gate-fallback`
`.home-mast-display` `.home-mast-lettering` `.home-mast-track`
`.home-mast-anchor` `.home-mast-intro` `.home-mast-statement`
`.home-mast-baseline` `.home-mast-proof-chips` `.home-mast-scroll`
`.home-banner-section` `.home-banner-title` `.home-banner-subtitle`
`.home-banner-outcomes` `.home-highlight-company` `.hero-kicker`
`.hero-work-link` `.home-intro-work`

**Selected work and `/works` (one shared vocabulary):** `.work-list`
`.work-row` `.work-row-visual` `.work-row-thumb` `.work-row-number`
`.work-row-copy` `.work-row-meta` `.work-row-action` `.work-row-arrow`
`.work-title` `.work-title-heading` `.work-card-summary` `.work-category`
`.home-work-footer` `.works-index` `.project-index-intro`

**Home experience and services:** `.editorial-experience`
`.editorial-experience-art` `.home-service-section` `.home-service-grid`
`.home-service-title-area` `.home-service-card-title` `.home-about-area`
`.about-section-title`

**Case:** `article.case-study-article` `.case-study-header`
`.case-opening-fold` `h1#case-title` `.banner-section` `.banner-content-area`
`.banner-content-wrap` `.banner-title` `.banner-text` `.case-hero-media`
`.case-hero-shot` `.case-facts-section` `.case-facts` `.case-toc`
`.case-toc__inner` `.case-toc__label` `.case-evidence-note` `.summary`
`.case-related-projects` `.related-work-card` `.case-nav-works`

**About (`/about` only):** `.story-page` `.story-opening`
`.story-opening-stage` `.story-opening-copy` `.story-opening-dek`
`.story-opening-cue` `.story-chapter` `.story-chapter-number`
`.story-chapter-side` `.story-reading` `.story-detail` `.story-detail-window`
`.story-perspective` `.story-perspective-art` `.story-sculpture`
`.story-wing` `.story-backdrop` `.story-stage-shade` `.story-rail`
`.story-rail-dot` `.story-next` `.story-next-links` `.story-footer`
`.story-motion-toggle` `.story-draft-note` `.story-eyebrow` `.page-chevron-mark`
`.editorial-experience-lead` `.awards-card-summary`
`.story-closing-line` `.story-beginnings` `.story-text-link`
`.story-perspective-inner` `.story-sculpture-position` `.story-wing-left`
`.story-wing-right` `.story-footer-top` `.story-footer-bottom`
`.story-footer-name`

**Buttons:** `.dark-button` `#000` on `#fff`. Editorial footer Email is a navy capsule with lilac ink and a native `<button type="button" class="footer-email">`; LinkedIn is a visible text link with its existing `in` icon. Both are at least 48px tall. Project contact labels follow the Copy contract above. The home nav uses text-only 44px targets. The scene Works action and intro View selected work use native underlined/text controls.

**Behavioural hooks (attributes, not classes).** These are read by JavaScript;
renaming one silently disables a feature. `data-hero-critical`
`data-morph-active` (the pinned home track) `data-glass-live` (the unpinned
slot keeps the live object) `data-hero-scene` `data-hero-pose` `data-text-reflow`
`data-composition-nav` `data-autoplay-video` `data-motion-video`
`data-video-urls` `data-poster-url` `data-video-label` `data-object-fit`
`data-consent-settings` `data-story` `data-story-*` (`-art` `-line` `-mode`
`-motion` `-motion-toggle` `-reflow` `-scene` `-stage` `-step`). Five more
`data-story-*` attributes in `about.html` — `-backdrop` `-draft` `-sculpture`
`-shade` `-wing` — are markup state that no script queries; the animation binds
to the matching classes, so adding one of those attributes without its class
animates nothing. `data-w-id` is inherited Webflow state
that `animations.js` strips; never author a new one.

## System reference

Everything below is observable in the repository. If the code and this
section disagree, the code is right and this section is stale — fix it in the
same change that caused the drift.

### Pages and routes

| Route | File | Kind | Robots |
|---|---|---|---|
| `/` | `index.html` | Arrival, glass hero, Selected work, services, experience | `index, follow, max-image-preview:large` |
| `/works` | `works.html` | Seven landscape project rows | `index, follow, max-image-preview:large` |
| `/work/{slug}` | `work/*.html` (7) | Case studies | `index, follow, max-image-preview:large` |
| `/about` | `about.html` | Story in Motion, explicit draft | `noindex, follow`, kept out of `sitemap.xml` |
| `/ai-integration` | `ai-integration.html` | English service offer | default |
| `/hu/ai-integracio` | `hu/ai-integracio.html` | Hungarian pair, `lang="hu"` | default |
| `/privacy` | `privacy.html` | Consent and analytics notice | default |
| `/hu/adatvedelem` | `hu/adatvedelem.html` | Hungarian pair, `lang="hu"` | default |
| (none) | `404.html` | Error document; `/404` and `/404.html` must never return 200 | — |

Thirteen content pages carry chrome, consent and the editorial footer.
`sitemap.xml` lists thirteen URLs. `server.js` owns canonicalisation: apex to
`www`, and `/index`, `/{slug}`, trailing slashes and `.html` all 301 to one
URL. Adding a page means adding it to the checks that enumerate pages, not
only to the sitemap.

### Stylesheets and what each one owns

| File | Owns | Loaded by |
|---|---|---|
| `norbertbarna.webflow.*.css` | Inherited Webflow base | every page |
| `responsive.css` | Site tokens, chrome lock, type scale, reflow, footer base | every page |
| `arrival.css` | First-session name assembly and curtain | `/`, cases |
| `home-composition.css` | Home morph track and the resolved split composition | `/` |
| `project-index.css` | Landscape `.work-row` list | `/`, `/works` |
| `editorial-sections.css` | Editorial experience, editorial footer, consent palette alignment | 13 content pages (not `/about`) |
| `compact-navigation.css` | Stable bar up to 991px and the desktop utility journey | 14 content pages |
| `case-opening.css` | Lilac case stage and the four-slice media reveal | cases |
| `case-motion.css` | Case TOC, fact band, evidence-note chrome | cases |
| `story.css` | `/about` chapters, rail, dark story footer | `/about` |
| `consent.css` | Consent banner and `.footer-privacy` only | 14 content pages, unhashed |

Two stylesheets must never grow brand rules: the Webflow base (inherited, being
retired) and `consent.css` (narrow, separately revalidated). A new surface gets
a scoped companion; it does not get appended to `responsive.css`.

### Scripts and motion ownership

One owner per animated target. Three loading positions, not one: `webfont.js`
is a blocking head script, the analytics trio (`analytics-config.js`,
`consent.js`, `analytics.js`) is `defer`, and every other script is an ordinary
end-of-body tag that runs in written order. Moving one across those positions
changes its dependencies, so keep a script where it is.

| File | Owns | Content-hashed |
|---|---|---|
| `analytics-config.js` | Release gate; loads first; static `enabled` | no |
| `consent.js` | Consent record, settings reveal, focus return | no |
| `analytics.js` | Consent-gated PostHog EU capture | no |
| `media.js` | Every `<video>`: muted in-view autoplay, session pause, Save-Data, the Kineticare 4.5s header cap | yes |
| `navigation.js` | Mobile disclosure, every `.footer-email` assign-only handler, and the mast text-enlargement/spacing reflow detector; deliberately has no animation dependency | no |
| `hero-scene.js` | Original WebGL chevron, its pinned and compact poses, SVG fallback, context loss, lifecycle | yes |
| `home-composition.js` | The only home morph scroll owner; calls `PortfolioHeroScene.setMorphProgress`, and `setCompactProgress` for the unpinned slot | yes |
| `arrival.js` | First-session assembly, real readiness counter, Enter curtain | yes |
| `immersive-navigation.js` | Compact bar and the desktop travelling header | yes |
| `case-opening.js` | Case title and media assembly, perspective settle | yes |
| `story-motion.js` | `/about` camera, chapter rail, Pause control | yes |
| `animations.js` | GSAP reveals, decorative depth, Webflow IX2 takeover, footer mesh field | yes |
| `vendor/gsap.min.js`, `vendor/ScrollTrigger.min.js` | Self-hosted, pinned | vendored |

Load order is a contract, not a preference:

- `analytics-config.js` → `consent.js` → `analytics.js` on every content page.
- `media.js` before any GSAP owner, so video never depends on animation.
- On `/`: `hero-scene.js` → `home-composition.js` → `arrival.js` →
  `immersive-navigation.js` → `animations.js`.
- `animations.js` waits for the Webflow IX2 takeover and for fonts before it
  adds `html.gsap-ready`. Do not move that class earlier.

### Tokens

Site scope (`responsive.css`, available everywhere):

| Token | Value | Use |
|---|---|---|
| `--ink` | `#111111` | Body, nav, light-hero text |
| `--paper` | `#f7f8f8` | Site background |
| `--paper-full` | `#ffffff` | Cards, menus, fact band |
| `--muted` | `rgb(17 17 17 / 62%)` | Meta and kickers on paper only |
| `--mast-muted` | `#2a2a2e` | 13px kicker on lilac grain. Solid charcoal, **not** `--muted`, because 62% ink fails AA on grain |
| `--mast-on-navy` | `#c8c1e5` | Body, strong and labels on the darkest mast navy `#0A1628` |
| `--site-gutter` | `clamp(24px, 4vw, 60px)` | Page gutter; narrowed per breakpoint |
| `--site-content` | `1200px` | Content max width |
| `--site-readable` | `720px` | Reading measure for case and utility body |
| `--site-radius-sm` / `--site-radius-md` | `14px` / `24px` (16–20px compact) | Cards and frames |
| `--site-focus` | `#5b45ff` | Focus ring, 3px with 4–5px offset |
| `--site-muted` | `#62676a` | Secondary UI text on paper |

Brand scope (shared by home, work index, experience, footer, About):

| Token | Value |
|---|---|
| `--footer-lavender` / `--editorial-lilac` / `--story-lilac` | `#D6D4ED` |
| `--footer-navy` / `--editorial-navy` / `--story-navy` / `--case-stage-ink` | `#0A1628` |
| `--footer-teal` / `--story-forest` | `#1B3A32` |
| `--footer-yellow` / `--story-olive` | `#BDB414` |
| `--editorial-muted` | `rgb(10 22 40 / 70%)` (navy at 70% on lilac) |
| `--editorial-rule` | `rgb(10 22 40 / 26%)` |
| `--case-stage-paper` | `#D6D4ED` |

Derive subdued text from these four brand colors with alpha. Do not add a
standalone hue to get a lighter grey. The same lilac appears under three
names because three scoped stylesheets own three surfaces; keep the value
identical when you touch one.

Motion and stage scope:

| Token | Value | Owner |
|---|---|---|
| `--case-motion-fast` / `--case-motion-medium` | `220ms` / `420ms` | `case-motion.css` |
| `--case-motion-ease` | `cubic-bezier(.16, 1, .3, 1)` | `case-motion.css` |
| `--case-motion-line` / `--case-motion-muted` | `rgb(17 17 17 / 18%)` / `/ 32%` | `case-motion.css` |
| `--arrival-assembly-duration` | `3666.667ms` (220 frames at 60fps) | `arrival.css` |
| `--arrival-progress` / `--arrival-fidelity` | runtime, written by `arrival.js` | `arrival.css` |
| `--case-stage-gutter` | `clamp(20px, 4vw, 72px)` | `case-opening.css` |
| `--editorial-gutter` | `clamp(24px, 4.8vw, 80px)` | `editorial-sections.css` |
| `--story-gutter` | `clamp(24px, 5.2vw, 88px)` | `story.css` |
| `--immersive-link-ink` | `#0A1628` | `compact-navigation.css` |

### Breakpoints and media features

| Query | Meaning |
|---|---|
| `max-width: 479px` | Smallest phone tuning |
| `max-width: 599px` / `min-width: 600px` | Compact stack turning into two-up |
| `max-width: 767px` | Inherited Webflow tier. Do not author new rules here. One existing exception: the arrival wordmark block in `arrival.css` |
| `max-width: 991px` / `min-width: 992px` | **The** split: stable compact bar against the desktop utility journey |
| `min-width: 1200px`, `min-width: 1800px` | Wide tuning only |
| `(hover: hover) and (pointer: fine)` | Desktop pointer motion may run |
| `(hover: none), (pointer: coarse)` | Restrained decorative depth only; a first tap always follows the link |
| `prefers-reduced-motion: reduce` | Static composited state. The largest single rule group in the codebase |
| `max-height: 600px` | Short viewport: role and primary action come before decoration |

The home hero's pointer motion requires 992px **and** a fine pointer, so a wide
touch screen gets the compact contract there, not the desktop one. `/about` is
the known exception: `story-motion.js` picks its cinematic mode from width and
height alone (992px and 700px), with no pointer test, so a wide touch screen
does get its cinematic layout. Do not document or test a pointer gate for
`/about` until that runtime actually has one. The compact contract is
a different motion budget, not the absence of the glass: the pinned 210svh track
needs `innerHeight >= 780`, while the live object itself is present wherever the
scene is ready and motion is allowed.

### Checks

`npm test` runs eight scripts in order; `npm run test:e2e` runs seventeen
Playwright specs against the real server at 127.0.0.1:3000. Put a new rule in
the file that already owns that subject.

| Script | Owns |
|---|---|
| `check-site.mjs` | One H1, unique title and description, canonical, valid JSON-LD, every local reference resolves |
| `check-responsive.mjs` | Compact composition, image stability, landmarks, social previews, the reduced-motion and native-scroll contract |
| `check-motion.mjs` | Pages reference byte-identical hashed release files; motion ownership and initialisation order |
| `check-server.mjs` | Express behaviour: redirects, private paths, and that only content-versioned files get an immutable cache |
| `check-editorial-media.mjs` | Posters, muted loop attributes, evidence-note chrome, real OG files, breadcrumb and service schema |
| `check-design.mjs` | This file. Named anti-patterns, work order, header lock, home H1 and JSON-LD identity |
| `check-client-seo.mjs` | Service pages: visible offer, en/hu equivalence, no invented price or review |
| `check-analytics.mjs` | Gate and owner order, hidden settings, EU host, the insights lock for project **265707** |

Playwright specs, grouped by what they defend:

- **Arrival and hero:** `arrival-fidelity`, `arrival-pointer`, `hero-motion`,
  `hero-reference`, `home-composition`, `home-first-paint`.
- **Chrome:** `compact-navigation`, `contact-copy`, `case-first-paint`.
- **Content and access:** `portfolio` (the large accessibility and AA suite),
  `editorial-media`, `story-motion`.
- **Consent and analytics:** `consent`, `consent-focus`, `consent-ux`,
  `analytics`, `analytics-off`.

`check-design.mjs` also asserts that this file keeps naming every
anti-pattern in the table above. Renaming one here without renaming it there
fails CI, which is the point: the vocabulary is the contract.

### Asset hashing and cache policy

`server.js` serves `assets/**` with `must-revalidate` by default, and gives a
one-year immutable policy **only** to files whose name carries the first
twelve characters of their own SHA-256 digest, in these families:

- JS: `animations`, `media`, `arrival`, `hero-scene`, `home-composition`,
  `immersive-navigation`, `case-opening`, `story-motion`
- CSS: `case-motion`, `responsive`, `arrival`, `home-composition`,
  `case-opening`, `editorial-sections`, `compact-navigation`, `project-index`,
  `story`

After editing one of those sources: recompute the digest, write the hashed
copy beside the source, update every page reference, and delete nothing. Stale
hashed copies stay on disk so a cached page keeps resolving. `check-motion.mjs`
verifies that each page's reference is byte-identical to the current source,
so a forgotten re-hash fails CI rather than shipping a stale file behind an
immutable header.

### Change runbook

1. Read the reader job for the surface you are touching, then the anti-pattern
   table. Most requests are already answered there.
2. Compose from **Primitives**. If nothing fits, add one name to the scoped
   stylesheet that owns the surface, and add it to Primitives in the same
   change.
3. Keep one owner per animated target. New motion joins the existing
   responsive context and removes its own listeners, transforms and
   ScrollTriggers on breakpoint or preference change.
4. Re-hash touched release files and update page references.
5. Run `npm test`, then `npm run test:e2e`.
6. Render `/`, `/works`, `/work/raiffeisen`, `/work/instructure`,
   `/work/kineticare` and `/about` at 1280 and 390, with and without
   `prefers-reduced-motion`.
7. If a correction repeats, encode it: prose here, mechanic in CSS, check in
   `scripts/check-design.mjs`. Never hand-tune one page and leave the rule
   unwritten.

## Motion

GSAP + ScrollTrigger already own reveals. Native scroll only (no Lenis),
respect `prefers-reduced-motion`, `html.no-motion` and `PortfolioMedia.isReduced()`.
No new runtime dependency, sound requirement, generated Lottie or visible
Motion control. Original raw WebGL is the user-requested central hero exception,
and since 2026-09-15 it serves two stages: the home hero and the Story in Motion
corridor. One renderer, not two. The host names itself with `data-glass-scene`,
`data-glass-stage`, `data-glass-frame`, `data-glass-backdrop` and
`data-glass-field` rather than the home page's class names, so neither stage
owns the other's markup. No third stage without the same request.
Keep `.case-motion-rail` hidden.

The central glass form assembles once, then responds to pointer tilt,
fragment hover and drag. Its raw WebGL renderer sleeps when idle/offscreen.
The following intro is owned by `home-composition.js`, which couples native
scroll progress to the same WebGL object and live copy. WebGL failure gives a single static SVG; reduced motion gives
one static rendered form or the fallback, never both.
One owner
per animated target; responsive and preference changes remove obsolete GSAP
contexts and restore the correct static/composited state. No pinning, snap,
scroll hijack or infinite idle rotation.

**Compact glass (2026-09-15).** Without the pin the same object stays live in
the drawing slot rather than resolving to its flat endpoint, so phones, tablets
and short desktop windows get glass instead of a drawing. User-confirmed
(2026-09-15) that phones keep it: do not trade the live object back for the
static drawing on phones as a battery optimisation. The restraint below is
where that cost is paid. The compact contract
is restrained: the object never blends toward the flat artwork, its own scene's
native scroll turns it within a bounded arc, and it holds still when the page
does. No idle loop, no drag, no fragment scatter and no pointer response on a
coarse pointer; a fine pointer may still tilt it. Render density stays capped
and the renderer sleeps offscreen. It must not overlap the role, dek, primary
action or proof, and reduced motion, enlarged text and WebGL failure still fall
back to the single static drawing. The stage hides the lettering here, so the
same approved title artwork is painted into the refraction source behind the
slot; it is what the glass shows through itself, never a second visible layer.

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

Footer content and geometry stay still. The earlier gradient/mesh motion is
retired; no decorative footer loop or pointer-triggered layout movement.

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

Professional experience keeps the five original role/company/date tuples.
Its new `.editorial-experience` layout uses a large section title with the
original gate beside five chronological rows. Company names are visually
prominent, roles and dates secondary. Preserve natural semantic text and
reading order. The old TightAwardVideo treatment and decorative award
videos are retired; rows are not buttons and must not acquire tab stops.
Normal reveal may settle once as the rows enter view; reduced motion and
no JavaScript show readable static content immediately.

## About — A story in motion

The selected About concept is the dark cinematic board at
`../output/about-concepts/02-story-in-motion.png`. `/about` extends the existing
lilac `#D6D4ED`, navy `#0A1628`, forest `#1B3A32` and olive `#BDB414` palette,
Funnel Display headings, Inter body text and folded geometric imagery.
The user explicitly requested generated concept artwork and selected this board
for implementation. Its decorative corridor/fold images, the requested home
sculpture and the unique geometric work-list images are narrow exceptions to
the earlier blanket image-generation ban. They never replace real product
evidence, portraits, logos or biography facts; no new palette is authorized.
The object standing in the corridor is the live glass chevron the home hero
assembles, not the flat gate it morphs into and not a still of it (changed
2026-09-15, at the owner's request). It runs the same `hero-scene.js`, so the two
stages are one object seen twice. It refracts what is actually behind it, which
here is the corridor photograph rather than the home page's lettering: that keeps
the principle the home scene already follows and keeps the lilac field off a page
that has none. The chevron is taller than it is wide where the gate was wider than
tall, so its slot narrows to hold the same standing height on the floor. The
drawing stays as the fallback and the two never show at once: WebGL failure and
reduced motion both resolve to the still, never to both. Outside the home hero
this treatment belongs to Story in Motion alone; other pages carry no scene.
Alternate atmospheric chapter openings with still, comfortably spaced reading
sections. Long biography copy stays semantic and readable while decorative
artwork moves; native scroll and chapter anchors remain in charge. The About
motion controller owns only its own `story-*` elements, listeners and frames.
It must settle into readable static content with reduced motion, no JavaScript
or missing animation assets, without hiding the sole copy or trapping focus.

The final biography has not been supplied. `about.html` is therefore an
explicit draft: `body.story-page[data-story-draft]`, one self-canonical `/about`
URL, `AboutPage` structured data and `robots="noindex, follow"`. Do not invent
career events or dates to fill the design. Keep the draft out of `sitemap.xml`
until the supplied text is integrated and indexing is deliberately enabled.
Existing content pages retain their `index, follow` contract. The shared main
navigation includes a native About link; `/about.html` and `/about/` permanently
redirect to `/about`, preserving query parameters. Shared navigation, consent,
analytics and footer contact behavior remain available on this route.

About uses the selected board's quiet navy footer rather than the editorial
Work-column footer on the other routes. Its header Email and closing Get in
touch actions reuse the existing native email owner; the footer retains the
real LinkedIn link, identity, copyright, privacy links and analytics settings.
Its chapter rail uses named native anchors. The story-only Pause motion button
starts hidden and is exposed by the story controller; it does not restore the
retired global motion switch or affect another route's motion state.

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
