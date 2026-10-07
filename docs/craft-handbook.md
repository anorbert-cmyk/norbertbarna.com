# Craft handbook

How to bring any page of this site to the bar the contact page reached
(`/contact`, `/hu/kapcsolat`, October 2026). That page went through two
designs and three review rounds. It shipped only when four independent
reviewers (design critic, accessibility and UX research, copy editor,
security) each returned **PROUD**. This file records the method and the
measurable criteria behind that verdict, so the next page can get there in
fewer rounds.

Reference implementation, read it before you start:

| Layer | Files |
|---|---|
| Markup | `contact.html`, `hu/kapcsolat.html` |
| Style | `assets/css/contact.css` (source), `contact.<sha12>.css` (release) |
| Behaviour | `assets/js/contact.js` (proof of work, form, fold, glass owner) |
| Motion kit | `assets/js/physics.js` (`window.PortfolioPhysics`) |
| Server | `lib/contact.js`, `lib/turnstile.js`, `lib/contact-email.html`, the CSP block in `server.js` |
| Guards | `scripts/check-*.mjs`, `scripts/service-pages.mjs`, `scripts/private-inbox.mjs` |
| Specs | `tests/motion-physics.spec.mjs`, `tests/turnstile.spec.mjs`, `tests/contact-copy.spec.mjs`, `tests/portfolio.spec.mjs` |

---

## 1. Purpose and place

**Use this handbook** when you build a new page, redesign an existing one, or
add motion, a form or a new language mirror. Do not use it for a one-line
copy fix.

**How it relates to the other sources:**

| Source | What it holds | Who wins |
|---|---|---|
| `AGENTS.md` | Six standing rules (read `design.md`, no parallel system, no generated evidence, Funnel Display + Inter, encode repeated corrections, re-hash after CSS edits) | Always |
| `design.md` | The design authority: reader jobs, locked brand, type scale, primitives, anti-patterns, system reference, motion contracts | Always, for *what* the site looks and behaves like |
| This file | The working method: how to brief, build, measure, review and ship to that standard | Only for *how* to work. If it ever disagrees with `design.md`, `design.md` is right and this file is stale |
| `scripts/check-*.mjs` | Mechanical rules already named | CI. A rule that is only written here is not yet enforced |
| `lib/*.js`, `server.js` | Runtime truth | Where prose (including `design.md`) and code disagree on a number, the code is right; fix the prose in the same change (`design.md`, System reference) |

This file never restates `design.md` contracts. It points to them by section
name (for example **Motion → Case opening**, **Named anti-patterns**,
**System reference → Checks**).

---

## 2. The quality bar: what "proud" meant

Each reviewer judged against research-backed sources (NN/g, Baymard,
GOV.UK Design System, W3C/WAI) and had to cite a guideline URL for every
blocking issue. These are their criteria written as checks you can run.

### 2.1 Design critic

| Criterion | Check |
|---|---|
| The page is made of the site's own material | Every visual element traces to an existing asset, token or primitive (`design.md` **Locked brand**, **Primitives**). Nothing newly drawn stands in for the site's art |
| The object is whole at every width | The glass chevron or artwork is never cut by the footer, the pane, the bar or the viewport edge at 320, 390, 768, 992, 1024, 1180, 1200, 1440, 1920 |
| Contrast between object and field | The object never sits on a field of its own colour (round 1: the chevron "dissolved into the yellow paper" below 992 px; fixed by moving its slot over the forest and lilac region) |
| Edges do not coincide | A pane edge never lands exactly on an artwork edge (fixed with `--contact-art-x: 35%` at 1200 to 1799 px) |
| Typography holds its intended lines | The display title breaks where it was designed to (`.contact-title { max-width: 6ch }` from 992 px keeps "Write / to me." and "Írj / nekem." on two lines) |
| No native chrome left over | No textarea resize grip (`resize: none` plus `field-sizing: content` with a measured fallback), no double borders, focus rings only on `:focus-visible` |
| Third-party widgets fit | The Turnstile frame is a fixed 300 × 65 px iframe; below that width the compact widget is rendered and its 140 px row reserved (round 3 blocker at 320 to 371 px) |
| Motion carries the visitor's content | The fold lifts the visitor's own writing, not a blank sheet (round 3 blocker: "the visitor's words vanish in one frame and a blank ruled sheet folds") |
| The finale never loses the visitor | After the sequence, the parked letter and the thank-you heading are both on screen below the bar, at every width and with reduced motion |

### 2.2 Accessibility and UX research

| Criterion | Check |
|---|---|
| axe | 0 violations, EN and HU, at 320, 390, 768, 1440, in every state (idle, errors, waiting, busy, sent) |
| Focus never drops to `body` | The focused submit is never `disabled`; it carries `aria-disabled="true"` and a busy guard |
| Status is always in the tree | One `role="status" aria-live="polite"` element outside the form, never `display: none` when empty (`.contact-status:empty` only removes padding) |
| Error pattern | GOV.UK: summary focused on submit, linked to fields; inline error with a visually hidden "Error: " prefix; `aria-invalid`; `aria-describedby` |
| Validation timing | On blur, never while typing; cleared as soon as the field is fixed; a blur caused by a press is checked after `pointerup`, so no line appears between mousedown and mouseup and steals the click |
| Short viewports | Heading fully visible after send at 844 × 390, 720 × 450, 1280 × 512 and 320 × 256 at 400% zoom |
| No-JavaScript path | Usable, honest, and never leaks data into a URL |
| Forced colors | Marks, chosen state and glyphs use system colors |
| Input is never lost | Every failure message says "What you wrote is still here" and is true |
| Time limits | Nothing waits forever: every wait has a bounded timeout and an announced outcome |

### 2.3 Copy editor

| Criterion | Check |
|---|---|
| Owner's voice | First person, plain verbs, no dashes as punctuation, no AI tells (section 6) |
| Errors | GOV.UK wording; empty and invalid are different messages |
| Truth | No promise the owner has not made (no reply time), no invented fact |
| Parity | HU says the same thing in natural tegező Hungarian, never third person where EN is first person |
| Accessible names | Visible label is contained in the accessible name (WCAG 2.5.3) |

### 2.4 Security reviewer

| Criterion | Check |
|---|---|
| No inbox anywhere | No `mailto:`, no address, no script that assembles one, in HTML, CSS, JS, comments or old release copies |
| No PII in URLs or logs | A native submit can never become a GET with the message in the query |
| No double delivery | A spent token is forgotten before the request leaves |
| Hostile input is inert | Visitor text never reaches `innerHTML` unescaped, in the page or in the owner's email |
| Server checks are layered cheapest first and fail closed | Section 8 |
| Memory is bounded | Every in-memory map has a cap and expiry |

### 2.5 Motion (the physics audit)

Frame-1 jump at most 1% (entrances) or 5% (hover); overshoot only as designed
for the chosen ζ; the loop stops at rest; `scriptMax` at most 1 ms (2 ms at
4× CPU); 60 and 120 Hz end identically; reduced motion paints the identical
end state with no physics frame; CLS 0. How to measure each: section 5.6.

---

## 3. Workflow

### 3.1 Brief

A brief is one file the builder can work from without asking. The contact
brief (`CONTACT_BRIEF.md` in the team scratchpad) had these parts; copy the
shape:

1. **Read first.** `AGENTS.md`, `design.md`, and the named pages and
   stylesheets whose vocabulary the new page must absorb.
2. **Goal in the owner's terms.** "A contact page the owner is proud of", plus
   what the visitor does on it.
3. **File ownership.** The exact files the builder may create or edit, and
   "never edit anything else, never run git, others work in parallel".
4. **Contracts.** Field names, API shapes, status codes and the copy strings
   that must match the server, written out exactly.
5. **Copy rules** (section 6) and the exact strings when they are decided.
6. **Self-verification** the builder runs before reporting, and what to
   report (decisions made, what the lead must wire, such as hashing).

### 3.2 Reuse the site's own materials before inventing anything

The redesign that succeeded is entirely reuse:

| Need | Reused material |
|---|---|
| Background | `assets/images/story/fold-detail.webp` from the About chapter, full-bleed and sticky, `alt=""` |
| Hero object | The home refractive chevron, as a third stage of `hero-scene.js` (`data-glass-scene`, `data-glass-slot`, compact contract, `setCompactProgress`) |
| Surface | Lilac `#D6D4ED` as frosted glass (`rgb(214 212 237 / 84%)`, `backdrop-filter: blur(16px)`) |
| Origami language | A dashed crease (`repeating-linear-gradient` 7 px dash / 6 px gap at navy 42%) between letterhead and form; a round topic mark whose corner folds over in olive; an error glyph that is a folded corner |
| Palette | The brand four plus alpha derivations of navy only (`--contact-muted` 82%, `--contact-control` 70%, `--contact-rule` 26%, `--contact-crease` 42%) |
| Type | Funnel Display 700 for display, Inter for everything else |
| Action | The site's navy capsule (`border-radius: 999px`, lilac ink, 48 px) |
| Motion | `physics.js`, the same module as the case opening and the hover springs |

Before you draw anything, list the existing art (`assets/images/story/`,
`assets/images/geometry/`, `hero-gate.svg`, the glass stages) and choose from
it. A new stage of the glass needs an explicit owner request (`design.md`
**Motion**: "No further stage without an explicit request for one").

### 3.3 Why the first contact design was rejected

The owner called the first version ugly. Its screenshots show what went wrong;
treat these as page-level anti-patterns:

| Anti-pattern | What it looked like | Lesson |
|---|---|---|
| Flat white sheet | A white `#fff` card with a dog-ear corner on a bare lilac field | A literal paper metaphor drawn in CSS reads as a template. Use the site's photographed paper and glass instead |
| Newly drawn art | A flat CSS "envelope tunnel" illustration in the right column | New geometry competes with the approved art and looks cheaper. Reuse an existing asset |
| Explainer caption | "Your message, before it folds. The sheet becomes an envelope when you send it." under the art | If decoration needs a caption to explain itself, it is not working. Cut it |
| Boxed chips with dog-ears | Each topic in an outlined box with a folded corner | Repeated ornament on controls is noise. One quiet origami detail per element type |
| Empty field | Half the viewport bare lilac beside the form; the title and lede far apart | The page had no stage. The redesign gave it a full-bleed scene with one object and one pane |

The fix was not polish of that design. It was a different composition built
from existing material. When a design is rejected as a whole, do not iterate
on it; go back to 3.2.

### 3.4 Build

- Compose from `design.md` **Primitives**. New names go into the page's own
  scoped stylesheet and into Primitives in the same change.
- One page, one scoped companion stylesheet (`contact.css`), one owner script
  per animated target. Never append page rules to `responsive.css`.
- Start every page-scoped token on the page's body class
  (`body.contact-page { --contact-lilac: #D6D4ED; ... }`) with values copied
  from the brand tokens, so the page cannot drift from them.
- Write the comment at the top of the stylesheet and script that says what
  the page is and what it never does (see the header of `contact.css`).
- Work against unhashed sources while iterating; hash once at the end
  (section 9.1).

### 3.5 Review rounds with independent critics

Run at least four critics in parallel: design, accessibility and UX
research, copy, security. Each critic works independently, read-only, on its
own server port, and reports in a fixed format. A critic never edits a repo
file.

**Reviewer brief template** (based on `REVIEW_BRIEF.md`):

```text
Subject: <routes>, <files>. Repo /home/user/norbertbarna.com.
Context: read AGENTS.md, design.md and <BRIEF.md>.
Bar: the owner wants world-class quality; the team iterates until every
reviewer is genuinely proud. Judge against NN/g, Baymard, GOV.UK Design
System, W3C/WAI. Cite a guideline URL for every blocking issue.

How to look: run the real server on your own port, never 3000:
  CONTACT_DRY_RUN=1 PORT=<4200 + n> node server.js   (background; stop it after)
Skip the intro and consent with addInitScript:
  sessionStorage 'nb-arrival-seen-v2' = '1'
  localStorage 'bn-analytics-consent-v1' =
    '{"version":1,"decision":"rejected","timestamp":<now>}'
Use page.route only for states the server cannot produce (400/403/429/503,
third-party failures). Chromium: executablePath '/opt/pw-browsers/chromium'.
Widths 320, 390, 768, 1024, 1440, 1920; short viewports; reduced motion;
keyboard only; 200% and 400% zoom. Screenshots under scratchpad/review/<role>/.
Read only, report only.

Report:
- Verdict: PROUD / NOT YET
- Blocking issues: file:line or screenshot path, the exact fix, guideline URL
- Polish: same format
Be concrete and demanding; no generic praise.
```

### 3.6 Fix rounds

The lead consolidates all reports into one `FIX_ROUND<n>.md`:

- Grouped by reviewer, each item keeps the reviewer's ID (B1, N2, P4) so the
  next review can confirm it by ID.
- Copy changes are written out **exactly**, in both languages. The builder
  applies them verbatim unless they conflict with an accessibility finding.
- Out-of-scope items are named as such ("the fold look is rebuilt by the
  physics team next round; do not add time to the sequence").
- A **verification list** the builder must run before reporting (axe matrix,
  keyboard-only send, short viewports, no-JS, forced colors, timing tables,
  `npm test`).
- Concurrency rules: "re-read a file right before each edit and never revert
  lines you did not change" (other agents re-release hashed references).

Then re-run the same critics on the result. Stop only when every critic says
PROUD. Round 2 of the contact page ended "two fixes from PROUD"; the third
round closed them. Expect three rounds for a new page.

### 3.7 Encode what repeats

After each round, ask which finding could recur on another page. Put it in
one place (`AGENTS.md` rule 5; `design.md` **Change runbook** step 7): prose
in `design.md`, a mechanic in CSS, or a check in the `check-*.mjs` that owns
the subject. Section 9.3 lists the ones still open.

---

## 4. Visual composition

### 4.1 Stage, object, pane

The contact page has three layers. Use the same structure for any page that
needs a scene:

1. **Stage art** (`.contact-stage-art`): sticky under the bar
   (`top: var(--contact-nav)`), `height: calc(100svh - var(--contact-nav))`,
   `object-fit: cover` with a per-breakpoint `object-position` token
   (`--contact-art-x`). It keeps its own margin box, so when the stage ends
   the whole frame rises and leaves under the bar as one piece. Do not use a
   negative margin that lets the footer slide across the art (round 1 B5).
2. **Object** (`.contact-stage-glass`): an absolutely positioned slot in the
   clear column beside the pane (`left: calc(gutter + pane + 24px)` on
   desktop, the top 54% of the stage below 992 px). The canvas is
   `opacity: 0` until the renderer reports `ready`; without a renderer only
   the picture shows.
3. **Pane** (`.contact-paper`): content in one frosted surface over the art,
   pulled up with `margin-top: calc(-100svh + var(--contact-nav))`.

Rules that came out of review:

- A media query that sets the same property as a later base rule with equal
  specificity is dead. Put breakpoint rules after the base rule (round 1 B3:
  the 992 to 1199 px layout rule never applied).
- Check the object against the field behind it at every breakpoint, not only
  the field you designed on.
- Raise glass opacity where the field behind is brighter (88% below 992 px
  over the olive plane, otherwise the lilac turns beige).
- Provide `@supports not (backdrop-filter)` and
  `@media (prefers-reduced-transparency: reduce)` fallbacks with a near-opaque
  lilac (94% / 96%).
- Large `backdrop-filter` areas cost input latency on slow CPUs (30 px blur
  with saturate and brightness measured about 300 ms). Use `blur(16px)` alone.

### 4.2 Type scale

Use the `design.md` **Type scale** roles. The contact page's page-level values,
as a reference for proportions:

| Element | Value |
|---|---|
| Display title | Funnel 700, `clamp(60px, 7.6vw, 112px)`, line-height .92, tracking -.055em, `text-wrap: balance`, `max-width: 6ch` from 992 px; `clamp(52px, 13.5vw, 88px)` below 992; 46 px below 360 |
| Lede | Inter 17 to 20 px, line-height 1.45, `max-width: 34ch` (40ch compact), `text-wrap: pretty` |
| Labels, legend | Inter 600, 15 px |
| Input text | Inter 18 px (17 px below 600), never below 16 px on phones (iOS zoom) |
| Hints, counter, privacy, status | Inter 15 px, navy 82% |
| Thank-you heading | Funnel 700, `clamp(32px, 3.4vw, 48px)` |
| Eyebrow | Inter 12 px uppercase, .08em. One small label per page at most (`design.md` **TrackedBody**) |

### 4.3 Spacing

Spacing is fluid with `clamp()` and keyed to two page tokens:
`--contact-gutter: clamp(20px, 4.2vw, 60px)` (16 px below 600) and
`--contact-pad: clamp(24px, 3.4vw, 56px)`. Vertical rhythm between form groups
is `clamp(26px, 3vw, 38px)`. Every control is at least 44 px tall, primary
actions 48 px. Inline links that sit in body text get a 44 px hit area with
padding and equal negative margin, so the line does not grow.

### 4.4 Breakpoints

Author only the `design.md` breakpoints (479, 599/600, 991/992, 1200, 1800,
`max-height: 600px`; never new rules at 767). Third-party constraints may add
one, documented in a comment (`max-width: 373px` is where the pane is narrower
than Turnstile's 300 px frame).

Render every state at these widths before review:

| Width | Why |
|---|---|
| 320 | Smallest supported; Turnstile compact; 200% text |
| 390 | Reference phone |
| 768 | Tablet portrait, still compact |
| 992 | First desktop width, narrowest pane |
| 1024, 1180 | Inside the 992 to 1199 band where columns are tightest |
| 1200 | Wide tuning starts |
| 1440 | Reference desktop |
| 1920 | Wide; `--contact-pane: 700px` from 1800 |

Plus short viewports: 844 × 390, 720 × 450, 1280 × 512, and 320 × 256 (400%
zoom).

### 4.5 Light and dark

The site has no `prefers-color-scheme` mode; fields are fixed (lilac reading
fields, navy bars and footers). What matters instead:

- **Contrast on the actual composite.** Text on glass over a photograph must
  be sampled on the worst pixels behind the glyphs, at several scroll
  positions (the a11y reviewer sampled 0, 360 and 720 px at each width).
  An automated "incomplete" contrast result is not a pass (`design.md`
  **Site-wide text accessibility**).
- **Control boundaries** reach 3:1 against the frosted lilac (navy 70%).
- **Forced colors** (section 7.5).
- **Third-party theme**: Turnstile is rendered with `theme: "light"` because
  the pane is always lilac.

---

## 5. Motion and physics

### 5.1 When to use `physics.js` and when CSS

| Use CSS (`transition`, `@keyframes`, `linear()`) | Use `physics.js` |
|---|---|
| A fixed, short, non-interruptible change (menu drop, glyph turn, a 180 ms colour change) | Anything that can be interrupted or reversed (hover in and out) |
| No state depends on velocity | Contact, stops, bounces, gravity, hinges |
| The curve can be sampled once from a spring into `linear()` | Several bodies coupled by choreography (`world.at`, `world.when`) |
| | A scroll follower that must not change native scroll |

To keep spring feel in CSS, sample the spring into `linear()` and declare a
`cubic-bezier` fallback first (see the compact menu in
`compact-navigation.css`: `compact-menu-drop 260ms linear(0, 0.057, ...)`).

Never animate reading text (`design.md` **Motion**). The fold works because
the form has already left the document: the sheet that folds is a decorative,
`aria-hidden` copy (`.contact-fold`), drawn from measured rectangles.

### 5.2 Choosing ω and ζ

`physics.js` takes **frequency in Hz**; `design.md` and the owners write
**ω in rad/s**. Convert with `f = ω / 2π` (`hz()` in `case-opening.js`,
`tuneSpring()` in `animations.js`).

- Critically damped (ζ = 1) settles to 2% in about `5.8 / ω` seconds.
- Overshoot of an underdamped step is `exp(-ζπ / √(1 - ζ²))`: ζ .75 gives
  about 2.5%, ζ .7 about 4.5%, ζ .55 about 12%.
- Pick ζ = 1 for anything that must land exactly (followers, hovers, reveals).
  Go below 1 only when the overshoot is the point (a letter landing, a plate
  hitting a stop).

Values shipped across the site:

| Motion | ω (rad/s) | ζ | Feels like | Owner |
|---|---|---|---|---|
| Compact menu drop (clip) | 28 | 1 | A blind dropping, about .23 s, no bounce | `compact-navigation.css` (`linear()`) |
| Menu close glyph quarter turn | 26 | .7 | A small click into place | `compact-navigation.css` |
| Home row hover out | 21 | 1 | Quick release, about .30 s | `animations.js` |
| Case scroll-settle follower | 20 | 1 | Smooth catch-up to scroll, replaces a .3 s scrub | `case-opening.js` |
| Related card title line | 18 | 1 | Crisp underline draw | `animations.js` |
| Home row hover in | 17 | 1 | Deliberate lift, about .37 s | `animations.js` |
| Related card image scale | 13 | 1 | Slow breathe to 1.025 | `animations.js` |
| Case title letters | 9 | .75 | Each letter lands with 2.5% overshoot, settled .62 s | `case-opening.js` |
| Case panel rise and scale | 5.5 | 1 | A heavy object rising, within 2% by 1.08 s | `case-opening.js` |
| Case panel hinge to the stop | 3.6 | .55 | A plate standing up and tapping the reading plane, restitution .25, first contact .71 s | `case-opening.js` |
| Case mask slices | 3.3 | 1 | Curtains opening; aimed 3% past a stop at 100% so each lands exactly | `case-opening.js` |
| Preset `paper` (fold lift) | 19.5 (3.1 Hz) | .66 | Light, about 6% overshoot | `physics.js` |
| Preset `glass` (fold scale and travel) | 13.2 (2.1 Hz) | .82 | Heavier, about 1% overshoot | `physics.js` |
| Preset `settle` | 16.3 (2.6 Hz) | 1 | Neutral default | `physics.js` |

Real objects use physical parameters, not ω. The contact fold models A4
stationery at 120 g/m² (`Physics.paper()`): thirds 99 × 210 mm, restitution
.34 then .3, crease memory 0.3 then 1.9 times the panel's own weight torque
with 40° and 55° elastic range, hand pushes of 1.6× weight until 100° and
3.2× until 165°. Tune physical quantities, then measure the outcome; do not
tune by eye toward a duration.

The aim stated in `design.md` for the contact fold: the letter parks about
28° open at about 1.5 s on desktop and 1.2 s on phones, fully on screen.

### 5.3 The module's guarantees and how to keep them

- **Fixed step.** 1/240 s semi-implicit Euler, renders interpolate between
  the last two steps, long frames clamp at 250 ms of steps. This is what
  makes 60 and 120 Hz end identically. Never integrate with the frame delta
  yourself.
- **Choreography in simulated time.** Use `world.at(t, fn)` and
  `world.when(test, fn)`, never `setTimeout`, so the animated and the instant
  run reach the same end state.
- **Stops by itself.** The loop ends when every body rests, pauses in hidden
  tabs, and has a per-run safety limit (`limit`, default 8 simulated
  seconds).
- **External clock.** An owner that already has a frame loop creates the
  world with `{ clock: "external" }` and calls `world.advance(stamp)`.
- **Write only cheap properties.** Per frame: transform, opacity, clip-path,
  mask, or custom properties feeding them. Sizes change at most once per
  phase (the fold changes piece sizes only when a crease splits a piece).
- **Do not rewrite unchanged values.** Cache the last value per property
  (`put()` in `contact.js`).

### 5.4 Reduced motion and `html.no-motion`

- `world.start()` re-reads the preference every time. With reduced motion it
  calls `world.settle()`: runs the simulation to rest synchronously and paints
  the end state once. No rAF, no physics frame.
- `html.no-motion` is set by `media.js` for reduced motion and Save-Data, and
  by `animations.js`. Every page carries `html.no-motion * { opacity: 1
  !important }`. A physics owner that writes opacity must write it inline with
  `!important` (`style.setProperty(name, value, "important")`), or the blanket
  rule shows both stacked states at once.
- The stylesheet's defaults are the honest resting state. Keep the arithmetic
  in the owner (`design.md` **Motion**).
- The page's own CSS kills transitions and animations under both
  `prefers-reduced-motion: reduce` and `html.no-motion` (end of `contact.css`).
- Scroll moves become instant (`behavior: reducedMotion() ? "auto" :
  "smooth"`).
- Proof: the end state under reduced motion is pixel-identical to the
  animated end (`motion-physics.spec.mjs`, "paints its end state with no
  physics frame").

### 5.5 Gates that fail open

Anything that hides content until a script acts must release it by itself.

| Gate | Release |
|---|---|
| Arrival pre-curtain veil | CSS animation after 4 s; `arrival.js` lifts it earlier |
| Case-opening `pending` | CSS after 2.9 s; without physics at once |
| Contact glass `data-contact-glass="pending"` | Canvas stays `opacity: 0`; the picture is always visible, so nothing is hidden. `off` on fallback, destroy or any error |
| Contact submit `disabled` in HTML | Enabled by `contact.js` only after the submit handler is bound, also in the unsupported branch |
| Turnstile script load | Error listener attached before append; 10 s poll timeout; then an announced error and a retry on next send |
| Turnstile answer | Each waiter has a 30 s timer, then `captchaStuck` copy |
| Missing `physics.js` | The fold layer is skipped and the thank-you shows at once |

Never make the document `inert` or hide the only copy of text as an animation
prerequisite.

### 5.6 How to measure

1. **World samples.** Before the page loads:
   `addInitScript(() => { window.PortfolioPhysicsDebug = { record: true, worlds: [] }; })`.
   Every world then logs each step as `[t, [value, velocity], ...]` in
   `world.samples`, with `world.bodies[i].name` naming the columns and
   `world.stats` holding `frames`, `steps`, `scriptMax`, `scriptTotal`,
   `frameGaps`.
2. **Stills.** `PortfolioPhysicsDebug.hold = t` freezes every run at `t`
   simulated seconds; set it to `null` to finish. Use it for exact fold
   stills (round 3 verified the visitor's text on the lifted sheet this way).
3. **rAF tracer.** An init script that records computed style every frame
   from the first frame of the document (`traceCase()` in
   `motion-physics.spec.mjs`). It catches what world samples cannot: a frame
   painted before the owner started, or a GSAP inline style overriding the
   physics.
4. **Frame-1 jump.** First painted change divided by total travel. Targets:
   ≤ 1% entrance, ≤ 5% hover.
5. **Settle time.** The `t` of the last sample before `world.running` turns
   false; check against the plan number.
6. **Loop stopped.** Read `stats.frames`, wait 300 ms, read again; it must
   not change.
7. **60/120 Hz parity.** In Node, `require("../assets/js/physics.js")`,
   build the world with `{ clock: "external", reduced: false }`, advance with
   `1000/60` and `1000/120` ms stamps, compare end values and impact times
   (the second test in `motion-physics.spec.mjs`).
8. **Cost.** `stats.scriptMax` ≤ 1 ms at 1×, ≤ 2 ms at 4× CPU throttle (CDP
   `Emulation.setCPUThrottlingRate`).
9. **Side effects.** No non-passive wheel, touch or key listener added;
   `scrollY` traces identical with and without the owner; CLS 0.
10. **Slow network.** Emulate slow 4G (150 ms latency, 1.6 Mbit/s) and prove
    no frame shows the finished state before the entrance.
11. **Main-thread work next to input.** For background work (the proof of
    work), record event timing (`PerformanceObserver` type `event`) and frame
    gaps while typing, at 1× and 4× CPU (the reviewers' `jank.mjs`). Work in
    slices of about 8 ms and yield through `MessageChannel`, not nested
    `setTimeout` (clamped to 4 ms).

---

## 6. Copy

### 6.1 The owner's voice

- First person where the page speaks as Norbert. Hungarian uses the tegező
  form consistently.
- **No dashes as punctuation** in prose (no em dash, en dash or spaced
  hyphen). Rewrite with a full stop, comma or colon. Numeric ranges such as
  2023–2025 may keep the en dash; Hungarian compounds keep the hyphen
  (AI-integráció). Page titles use `|` or `:`, never a dash (`design.md`
  **TitleDrift**).
- **No AI tells.** English: delve, leverage, seamless, robust, elevate,
  empower, unlock, harness, journey, landscape, realm, navigate (figurative),
  cutting-edge, holistic, transformative, foster, crucial, pivotal, truly,
  deeply, "not just X but Y", rhetorical openers, rhythmic triads, colon
  slogans. Hungarian: drama gondolatjel, zökkenőmentes, átfogó,
  kulcsfontosságú, innovatív, élvonalbeli, holisztikus, "nem csupán …
  hanem", "Fedezd fel", "a következő szintre", calques of English word order.
- **No invented facts or promises.** No metric, client, stack, price, reply
  time or availability the owner has not stated. The sent state says "I will
  reply to <address>", not when.
- **Experience is 17 years** (tizenhét év) wherever years of experience are
  mentioned. Do not touch unrelated numbers.
- Short, concrete sentences. Plain verbs. Say what happens, then what to do.

### 6.2 The error and status pattern (GOV.UK)

Every message names the field, says what is wrong in the visitor's terms and
how to fix it. Empty and invalid are separate messages.

| Reason | Pattern | EN example |
|---|---|---|
| empty | Imperative to fill it, with the reason if not obvious | "Enter your email address so I can reply." |
| format | "Enter … in the correct format, like …" | "Enter an email address in the correct format, like name@example.com." |
| short / long | "Your … must be at least / … or fewer." | "Your message must be 5000 characters or fewer." |
| links | What to remove | "Your message can include up to 3 links. Remove the others." |

Status and failure messages follow one order: **what happened, that the input
is safe, what to do next, the alternative**.

> "Your message was not sent. What you wrote is still here. Try again, or
> write to me on LinkedIn."

Rules from the review rounds:

- Progress copy is honest about what runs: "Running the spam check in your
  browser…"; after 8 s "The spam check is still running…", and it never steps
  back to the first message.
- The button says "Sending…" only right before the request leaves, not while
  waiting for a human check.
- A background event the visitor did not cause (a token expiring while they
  type) is handled silently. Never announce "expired, send again" to someone
  who has not sent.
- A stale notice about a check is cleared when that check succeeds, and only
  that notice (`statusKind` in `contact.js`).
- Server reasons map to the same strings as the client (`reasons` in the 400
  body: `empty | short | long | format | links`). Mirror the server's rules
  client side, including its exact email regex, so most problems never reach
  it.
- Injected links that open a new tab carry a visually hidden "(opens in a
  new tab)" / "(új lapon nyílik meg)".

### 6.3 EN/HU parity

- Every content page has a Hungarian pair with the same DOM, classes, ids and
  `data-*` hooks; only text nodes and human-readable attributes differ
  (`design.md` **Whole-site language switch**). Diff the tag skeletons:
  `diff <(sed 's/>[^<]*</></g' contact.html) <(sed 's/>[^<]*</></g' hu/kapcsolat.html)`
  should show only head metadata, `lang`, hrefs and the HU font preloads.
- HU pages preload the Latin-ext faces (ő, ű).
- `Barna Norbert` in Hungarian prose, `Norbert Barna` in English.
- JavaScript strings come from `document.documentElement.lang`
  (`/^hu(?:-|$)/i`), one string table per language, keys identical.
- Retained English chrome on a Hungarian page carries `lang="en"`.
- Head: translated title, a 105 to 135 character description, 3 to 8 keywords
  backed by visible copy, `og:locale` swapped, reciprocal `en`, `hu`,
  `x-default` alternates, JSON-LD with `inLanguage`.
- Never change a byte of an executable inline script when translating: its
  CSP hash is pinned.

---

## 7. Accessibility

### 7.1 Navigation contract (NN/g audit)

Follow `design.md` **Navigation (NN/g audit, 2026-10-06)** and **Whole-site
language switch**. In short, per page:

- One Contact entry in the menu (`a.nav-link` to `/contact` or
  `/hu/kapcsolat`), with `aria-current="page"` and the olive underline on the
  current item.
- LinkedIn as the one external utility link.
- The language link last: `a.nav-link.lang-switch`, text "Magyar" or
  "English", `rel="alternate"`, `hreflang` and `lang` of the other language,
  leading to this page's pair. Its visible text is its accessible name.
- The editorial footer with one `a.footer-email` ("Discuss your project" /
  "Beszéljünk a projektedről") to the contact form, then LinkedIn, then the
  privacy row. On the contact page itself the footer action carries
  `aria-current="page"`.
- Accessible names contain the visible label ("Find me there on LinkedIn
  (opens in a new tab)" for the visible "Find me there").

### 7.2 Focus

- Visible ring: 3 px solid navy, 4 px offset, on `:focus-visible` only.
- A heading that receives programmatic focus has `tabindex="-1"` and
  `:focus:not(:focus-visible) { outline: none }`, so a keyboard visitor sees
  the ring and a pointer visitor sees nothing odd. Do not write a blanket
  `:focus { outline: none }`; it overrides `:focus-visible` (round 3 P7).
- Never disable the focused control. Use `aria-disabled="true"` plus a guard.
- Keyboard focus into a field scrolls it fully into view when the bar or
  viewport edge would clip it; focus from a press is left alone, because
  scrolling between mousedown and mouseup loses the click.
- After an asynchronous sequence, move focus to the result only if focus is
  still on `body` or inside the component; the visitor may have tabbed
  elsewhere meanwhile (round 3 P4).
- Scroll margins account for the bar (`--work-nav-height`, plus the page's
  `scroll-padding-top`) and are capped so a tall target still fits a short
  viewport.

### 7.3 Status region

- One `role="status" aria-live="polite"` node, present from page load, outside
  any element that will be hidden (it lives in `.contact-sheet`, not in the
  form). Hiding it or creating it late means the first message is not read.
- Do not add `aria-busy` to a form whose region must announce.
- The error summary is focused on submit, so it has no live role; it is a
  `role="group"` with a heading.
- In the sent state the status text is kept but visually hidden.
- A character counter is `aria-hidden`; a separate live node announces the
  remainder once per 100-character step in the last 10%, not per key.

### 7.4 Disabled, no-JavaScript and the fieldset

- Ship the fields inside `<fieldset class="contact-fields" role="presentation"
  disabled>` and enable on init; `role="presentation"` stops an unnamed group
  being announced.
- A `<noscript>` note at the top of the form explains why it cannot send and
  offers LinkedIn; `<noscript><style>` hides the submit and the empty check
  row.
- Topics are native radios in a `fieldset` with a `legend`, visually hidden
  but focusable; arrow keys move the choice natively; the row shows
  `:focus-within`.

### 7.5 Forced colors

Add an `@media (forced-colors: active)` block for every custom control:
surfaces to `Canvas` with a `CanvasText` border, custom marks with
`forced-color-adjust: none` and system colors (`Highlight` for chosen),
glyphs drawn with `background` (which forced colors removes) re-coloured
`CanvasText`, decorative shadows and tones `display: none`, and a real border
on any decorative piece that would otherwise vanish.

### 7.6 Keyboard and assistive technology checks

Run these for every interactive state:

1. Tab from the skip link through the whole page; focus is visible and on
   screen at every step, EN and HU, 390 and 1440.
2. Complete the primary task by keyboard only.
3. Submit empty: the summary takes focus; each summary link focuses its field
   (radios: the checked one or the first).
4. Trigger every server state (400 with reasons, 403 retry, 429, 503, network
   failure, third-party failure): focus stays on the button; the message is
   announced; the input is intact.
5. Inspect `page.accessibility` / `ariaSnapshot()` in idle: the status region
   is present.
6. 200% text and 400% zoom: nothing clipped, nothing overlapping.
7. Forced-colors screenshots of controls and states.
8. Click right after blurring an invalid field: the click lands (no layout
   shift between mousedown and mouseup).

---

## 8. Security and privacy invariants for any page with a form

### 8.1 The inbox

- The destination lives only in `CONTACT_TO` on Railway. No page, stylesheet,
  script, comment, test, doc or old release copy contains it or `mailto:`, and
  no script assembles one (`design.md` **MailtoInHtml**, **FakeEmailLink**).
- Guards compare a SHA-256 digest (`scripts/private-inbox.mjs`), so they never
  spell it. The digest guard catches plain and upper-case forms only; it does
  not catch percent-encoded, entity-encoded, split or base64 forms. The rule
  is therefore "never type it anywhere", not "the guard will catch it".
- The reply-to `mailto:` link in the owner's notification email is built
  server-side from the visitor's address, inside `lib/contact.js`; that is
  the only place a mail link exists.

### 8.2 CSP per route

- `script-src` is hash-based: `'self'` plus one `sha256-` per executable
  inline script. No `'unsafe-inline'` or `'unsafe-eval'` in `script-src`.
- Third-party hosts are added per route only: Turnstile's
  `https://challenges.cloudflare.com` goes into `script-src` and `frame-src`
  on `/contact` and `/hu/kapcsolat` alone (`TURNSTILE_PAGES` in `server.js`).
- `form-action 'self'`, `object-src 'none'`, `base-uri 'self'`,
  `frame-ancestors 'self'`.
- New third-party scripts are injected by the owner with their error listener
  attached before append, not as static tags.

### 8.3 Inline scripts

Prefer none. If a parse-time gate is unavoidable: place it before the first
stylesheet, add its hash to `server.js`, add its body to `check-motion.mjs`,
and give it a CSS fail-open. `check-server.mjs` fails on any executable inline
script without a hash. JSON-LD needs no hash.

### 8.4 The form path

- `<form method="post" action="/contact" novalidate>` and a submit that is
  `disabled` until the handler is bound. `server.js` answers a native POST to
  the page with a 303 back to itself without reading the body. Never leave a
  form on the default GET: with JavaScript off or failed, the message lands
  in the URL and in logs (security finding N1).
- Nothing before the submit handler may throw. Bind the form first; guard
  every optional API.
- Forget a single-use token **before** `await post()`, so a lost response can
  never re-post it (finding N2: one message delivered twice).
- Visitor text never reaches `innerHTML` unescaped. In `contact.js` only
  constant strings use `innerHTML`; field values go through `textContent` or
  the `escape()` in `measurePrint()`. In the email every value is
  HTML-escaped before it reaches `lib/contact-email.html`.
- Length checks run before regexes (a 100 000-character email took 3.3 s in
  the client regex during review).

### 8.5 Server checks, cheapest first, failing closed

`lib/contact.js` is the pattern: same-origin and JSON-only, 16 kB body, then
the HMAC-signed challenge (canonical signature spelling only; spent
challenges keyed by their signed salt), then proof of work, then field
validation with reason codes, then the per-address limits, then the honeypot
and minimum fill time (answered as success and never delivered, so a bot
learns nothing), then Turnstile siteverify (5 s timeout, hostname and action
checked), then the site-wide cap, then delivery. The limit values are the
constants at the top of `lib/contact.js`; read them there.

- Turnstile runs after every cheaper check so no token is burned on a request
  that would fail anyway. Missing or bad token: 400 `captcha_failed`. Missing
  secret or unreachable Cloudflare: 503 `captcha_unavailable`. Nothing is
  delivered without a verdict.
- Client address: Railway's `X-Real-IP`, else the rightmost
  `X-Forwarded-For` entry, validated as an IP; IPv6 grouped per /64.
- Every in-memory map (limiters, spent challenges) is bounded and expires.
- API responses carry `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
- The site key is public in `contact.js`; on any host other than
  barnanorbert.com the page uses Cloudflare's always-pass test key, and local
  servers use the matching dummy secret.

### 8.6 Secrets and logs

- Secrets live only in Railway variables: `TURNSTILE_SECRET_KEY`,
  `RESEND_API_KEY`, `CONTACT_SECRET` (at least 32 characters), `CONTACT_TO`,
  `CONTACT_FROM`. Never in source, tests, docs or scratch files that get
  committed.
- Logs carry status codes and Cloudflare error codes only. Never a token,
  secret, address, name or message.
- `CONTACT_DRY_RUN=1` is for local QA and CI only.

---

## 9. Mechanics

### 9.1 Content-hashed release

Principle (`design.md` **Asset hashing and cache policy**, `AGENTS.md`
rule 6): a release file is `name.<first 12 hex of its own SHA-256>.ext`,
byte-identical to its source, served immutable for a year. After editing a
source in a hashed family:

```sh
h=$(sha256sum assets/css/contact.css | cut -c1-12)
cp assets/css/contact.css "assets/css/contact.$h.css"
# then point every page that loads it at contact.$h.css (EN and HU)
```

Keep old hashed copies on disk; a cached page may still reference them. The
team used a local helper (`release.mjs` in the session scratchpad) that does
exactly this for a list of `css/<stem>` and `js/<stem>` targets across
`.`, `work/`, `hu/` and `hu/munka/`; it is not in the repository and nothing
depends on it.

What the repository checks today:

| Check | What it proves |
|---|---|
| `check-server.mjs` | Every file named like a release in an approved family (`RELEASE_SOURCES`) carries its real digest and gets the immutable header; nothing else does |
| `check-motion.mjs` | For responsive, editorial-sections, compact-navigation, project-index, animations, immersive-navigation, arrival, case-opening, case-motion, story, ai and physics (on arrival pages): the page references the **current** release, once |
| `check-design.mjs` | The contact pages reference *a* hashed `contact.<sha12>.js` |

A new hashed family must be added in four places in one change: the
`CONTENT_HASHED_ASSET` pattern in `server.js`, `RELEASE_SOURCES` in
`check-server.mjs`, a `versionedAsset()` check in `check-motion.mjs`, and the
family list in `design.md`.

### 9.2 HU mirror wiring (`scripts/service-pages.mjs`)

| Export | Meaning |
|---|---|
| `HU_MIRRORS` | Hungarian portfolio page file → its English base (`hu/munkak.html` → `works.html`) |
| `baseOf(page)` | The English base, so page-type checks treat a mirror as its counterpart |
| `SERVICE_PAGES`, `PRIVACY_PAGES`, `CONTACT_PAGES`, `UTILITY_PAGES` | Utility pairs, both languages listed explicitly; they are not in `HU_MIRRORS` |
| `urlOf(page)` | File to URL path (`hu/index.html` → `/hu`) |
| `assetPrefix(page)` | `/` for utility and HU pages, `../` for `work/`, empty at the root |

Adding a page pair:

1. Mirror page: add it to `HU_MIRRORS`. Utility pair: add a list (or extend
   one) and include it in `UTILITY_PAGES`.
2. Utility pairs are also named by hand in `HU_PAIRS` (`check-site.mjs`) and
   `LANGUAGE_PAIRS` (`check-seo.mjs`). Update both.
3. `server.js`: add the path to the `.html` and trailing-slash redirect loop;
   add it to `TURNSTILE_PAGES` only if it embeds Turnstile.
4. `sitemap.xml`: English pages in hiring order, then utility pairs, then the
   Hungarian mirror.
5. `design.md` **Pages and routes**.

### 9.3 Guards to extend (encode repeated corrections)

These corrections came up more than once in review and are not yet
mechanical. Each belongs in the script that already owns the subject.

| Correction | Proposed guard | Owner |
|---|---|---|
| Stale contact release references | `versionedAsset()` for `contact.css`, `contact.js`, and the physics tag on the contact pages, as for the other families | `check-motion.mjs` |
| Dashes as punctuation in copy | Fail on ` — `, ` – ` and ` - ` in visible text nodes and human-readable attributes of every served page, allowing digit–digit ranges | `check-design.mjs` |
| AI-tell vocabulary | A short EN and HU deny-list over visible text | `check-design.mjs` |
| "16 years" drift | Fail on `16 years`, `sixteen years`, `tizenhat év` | `check-design.mjs` |
| GET forms | Every `<form>` has `method="post"`, an `action`, and a submit rendered `disabled` | `check-site.mjs` |
| Third-party hosts outside their route | Generalise the Turnstile CSP assertion to any added host | `check-server.mjs` |
| Utility pairs listed twice | Export the pairs from `service-pages.mjs` and import them in `check-site` and `check-seo` | `service-pages.mjs` |
| Unescaped `innerHTML` | Fail on `innerHTML =` with a non-literal right side in page scripts, except an allow-listed escaping helper | `check-design.mjs` |

### 9.4 Specs to add

The contact form has API coverage (`check-contact.mjs`), Turnstile coverage
(`turnstile.spec.mjs`) and publication coverage (`portfolio.spec.mjs`), but
its interface states were verified by reviewers' scratch scripts. Turn them
into `tests/contact-form.spec.mjs`:

1. Empty submit: summary focused, links focus fields, `aria-invalid` and
   `aria-describedby` set, axe clean, EN and HU.
2. Server 400 with each reason code shows the matching string.
3. 403 retries once with a fresh challenge; 429, 503 and network failure keep
   focus on the button and keep the input; the button is never `disabled`.
4. A spent token is never posted twice when the first response is lost
   (abort the first POST, count POSTs and tokens).
5. Click after blur lands on the target at 390 and 1440.
6. Successful send: the parked letter and heading are fully visible below the
   bar at 1440, 1024, 390, 320 and the four short viewports; focus is on the
   heading unless the visitor moved it.
7. Fold parity: with reduced motion and with `html.no-motion`, no physics
   frame and a final frame pixel-identical to the animated end; the fold world
   stops (`stats.frames` constant after rest); 60/120 Hz parity in Node with
   the fold's own hinges.
8. The lifted sheet carries the visitor's text (hold the world at a mid
   time with `PortfolioPhysicsDebug.hold`, read `.contact-fold-print`).
9. No-JavaScript: submit hidden, check row hidden, a native POST returns 303
   to the page, and no query string.
10. Turnstile widths: a 300 × 65 stub iframe at 320, 360, 390 is never
    clipped and reserves its height.

For any new page with motion, add its world to `motion-physics.spec.mjs` with
the same four assertions as the case opening: frame-1 jump, settle time,
loop stops, reduced-motion pixel identity.

---

## 10. Pre-ship checklist

**Composition**

- [ ] Every visual element is an existing asset, token or primitive; nothing
      newly drawn; no caption explains decoration.
- [ ] Object whole and contrasted at 320, 390, 768, 992, 1024, 1180, 1200,
      1440, 1920; no edge coincidences; footer never cuts the art.
- [ ] Breakpoint rules come after base rules; only `design.md` breakpoints
      plus documented third-party ones.
- [ ] Glass has `@supports not` and `prefers-reduced-transparency` fallbacks.

**Motion**

- [ ] Reading text and focusable content never transform or fade.
- [ ] ω and ζ chosen and written in a comment; the table in 5.2 updated.
- [ ] Frame-1 jump, settle time, loop stop, `scriptMax`, 60/120 Hz parity
      measured.
- [ ] Reduced motion and `html.no-motion`: no physics frame, end state
      identical; opacity written inline with `!important`.
- [ ] Every gate fails open by itself.

**Copy**

- [ ] No dashes as punctuation, no AI tells, no invented facts or promises,
      17 years.
- [ ] GOV.UK error strings; every failure says the input is still there and
      what to do.
- [ ] EN and HU say the same thing; skeleton diff is clean; HU tegező and
      first person.

**Accessibility**

- [ ] axe 0 violations, EN/HU, 320/390/768/1440, every state.
- [ ] Keyboard-only completion; focus visible and on screen at every step;
      never on `body`.
- [ ] Status region present in idle; summary focus; forced-colors screenshots.
- [ ] Short viewports, 200% text, 400% zoom.
- [ ] One Contact entry, language link last, footer contract intact.

**Security**

- [ ] No inbox, no `mailto:`, anywhere; `node scripts/check-contact.mjs` green.
- [ ] Forms are POST with an action and a submit disabled until bound.
- [ ] Single-use tokens forgotten before the request.
- [ ] No unescaped visitor text in `innerHTML` or email.
- [ ] CSP: third-party hosts on their route only; every inline script hashed.
- [ ] Secrets only in Railway variables; logs carry codes only.

**Mechanics**

- [ ] Sources re-hashed, every EN and HU reference updated, old copies kept.
- [ ] New pages wired in `service-pages.mjs`, `check-site`, `check-seo`,
      `server.js` redirects, `sitemap.xml`, `design.md` routes.
- [ ] `design.md` Primitives, hooks and System reference updated in the same
      change.
- [ ] Repeated corrections encoded as guards (9.3); new specs added (9.4).
- [ ] `npm test` green, then `npm run test:e2e` green.
- [ ] Every reviewer's last verdict is PROUD.
