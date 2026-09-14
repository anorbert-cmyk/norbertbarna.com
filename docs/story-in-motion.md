# Story in motion — implementation handoff

The selected second About concept is implemented at `/about`. It is a local story preview awaiting Norbert's biographical source text, with an explicit visible preview note, `noindex, follow`, and no sitemap entry. No dates, career metrics or invented personal history were added.

## Composition and motion

The original forest–olive sculpture remains a separate image over a newly generated cinematic corridor. On desktop, a short native sticky track moves the background, sculpture and foreground planes at different rates. The live heading scrolls naturally away; reading paragraphs never receive transforms, opacity changes or split-text animation.

The first reading chapter leads into a panoramic close-up, then the lilac Perspective chapter and the navy closing. The existing Email owner handles native contact actions. Real hash links form the chapter rail, and the regular navigation links to About from the other content routes.

The new motion owner is `assets/js/story-motion.js`. It uses coalesced native scroll frames and CSS transforms, not a second GSAP ScrollTrigger controller. This isolates it from the shared animation module's global reduced-motion cleanup. Existing home arrival and sculpture morph sources are unchanged.

On compact screens there is no extra sticky track. The portrait corridor is independently art-directed. Large text switches the opening into natural flow. Pause/Resume, OS reduced motion, no-JavaScript, failed motion loading, visibility, page lifecycle and history restoration retain readable content.

## Files

- `about.html`: semantic page, chapter content and draft metadata.
- `assets/css/story.css`: scoped composition and responsive styles.
- `assets/js/story-motion.js`: motion lifecycle and chapter progress.
- `assets/images/story/corridor.webp`: generated text-free desktop environment.
- `assets/images/story/corridor-mobile.webp`: generated portrait environment.
- `assets/images/story/fold-detail.webp`: generated panoramic detail.
- Existing `assets/images/hero-final.webp`: the original approved sculpture.
- `tests/story-motion.spec.mjs`: behavior, history, reflow, no-JS and shared-nav regression coverage.
- Shared route and static checks include About without weakening the existing public-page indexing or case-content contracts.

All three new WebP assets total 238,048 bytes. The generated images are decorative artwork, not photographic evidence of professional work. Built-in imagegen was used with the selected design as a reference; no model version override was selected. Complete prompts and browser captures are saved in the sibling `output/story-build` working-artifact folder.

Versioned assets at review:
- `story.a69700bf238b.css`
- `story-motion.a410a7c0ebb7.js`
- `compact-navigation.fb6816aa62f3.css`

## Verification on 2026-09-14

- `npm test`: all eight static/integration check scripts passed on Node 22.23.1.
- `npx playwright test tests/story-motion.spec.mjs tests/home-composition.spec.mjs tests/compact-navigation.spec.mjs`: 20/20 passed.
- Chromium 1440×900 and 390×844 plus WebKit 390×844: automated axe checks reported zero violations in the selected WCAG A/AA tags; zero uncaught page errors and horizontal overflow.
- WebKit mobile: native scroll, stable navigation during viewport-height change, reduced motion and lazy image loading verified. Offscreen lazy images were initially unloaded and all loaded once their chapters entered the viewport.
- Separate WebKit desktop Back restoration: 2989px before navigation, 2989px after returning.
- Independent source/guard/browser review approved the implementation with no open blocker.
- Physical iPhone performance and public deployment are not represented by these local checks.

The complete personal narrative and any factual timeline await the source material the user said they would provide. Replace the preview passages with that approved material, then update the deliberate draft SEO guard and sitemap together when publication is requested.
