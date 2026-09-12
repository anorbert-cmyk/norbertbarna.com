# Text contrast and reference-list motion

The requested outcome is readable type across the portfolio and restrained,
useful motion in the home reference list on both pointer and touch devices.
The approved gray mast, grain, typography, project order and navigation remain
the visual foundation.

## Research and decisions

- [WCAG 2.2 text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
  requires 4.5:1 for normal text and 3:1 for large text; thresholds cannot be
  rounded up. Antialiasing does not replace contrast, and light/thin lettering
  benefits from margin above the threshold.
- [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
  requires 3:1 for the visual information needed to identify controls and states.
  Existing visible focus outlines stay immediate while decorative motion runs.
- [MDN font smoothing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-smooth)
  describes nonstandard platform-specific properties. Inherited WebKit
  antialiasing and Mozilla grayscale smoothing request consistent rendering on
  supported systems; other systems retain their native rasterizer.
- [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia/),
  [context](https://gsap.com/docs/v3/GSAP/gsap.context/),
  [quickTo](https://gsap.com/docs/v3/GSAP/gsap.quickTo/) and
  [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) provide scoped
  cleanup, reusable input animation and progress tied to native scrolling.
  [GSAP accessibility guidance](https://gsap.com/resources/a11y/) supports
  honoring reduced-motion preferences.

The animation parameters below are design choices for this portfolio, not
values prescribed by those sources. The whole thumbnail frame grows to 1.06
and rises 2px on desktop hover/focus; the arrow advances 4px. On compact or
coarse-input screens, scroll produces a smaller 1.04 / 1px / 3px peak before
returning to rest. Copy and link geometry remain stable. This ties the response
to the selected project without adding a background wash or covering its UI.
The first touch follows the native link. Reduced motion and missing JavaScript
or GSAP produce static readable rows. No new dependencies are needed.

The home mast also responds to native scrolling on compact and touch screens.
Its two navy layers rise by at most 28px / 44px in screen coordinates, with a
0.48s ease. SVG scale normalization makes the depth consistent on narrow phones
and wide touch screens. The upward direction retains the dark background behind
light employer labels. Text, navigation, grain and link targets stay still;
there are no touch handlers, scroll capture or idle loops. The existing scoped
controller pauses offscreen, cleans up on responsive changes and returns to the
static mast for reduced motion or unavailable JavaScript/GSAP.

## Findings and acceptance evidence

An initial axe contrast scan across 13 content routes plus 404 at mobile and
desktop widths reported no automatic violations but left image, grain and
video backgrounds incomplete. These cases require additional measurement.

Independent rendered-glyph measurement found the desktop E-Commerce sector
label at 3.74:1: a white edge fade was painting over the letters. Removing the
two fades restores black text on white. The How I work heading passed five
real video frames but failed an all-white frame because the video can overlap
the heading. An opaque black heading background protects it for every frame.

The extra rendered-background checks also exposed footer utility text over
the dark green transition (roughly 1.8–3:1 on actual glyph cores), plus the last
compact Work link. A single translucent navy reading surface with white type
protects the utility row even over a white background. Moving compact colored
mesh groups 90px down preserves the pale area through all four Work links;
the grain and broad decorative field remain visible. Hover underlines no
longer lower the Work-link ink opacity.

The browser suite checks every route with axe, measures unresolved text
backgrounds from rendered pixels, and checks inherited smoothing where the
browser supports it. Dedicated regressions exercise the faded sector labels,
an all-white video frame, pointer/focus/touch list states, bounded transforms,
first-tap navigation and cleanup after resize or a motion-preference change.
Header regressions exercise actual touch scrolling, stable text geometry and
grain, bounded screen-pixel depth, offscreen pause and repeated mode changes.
At 320, 390, 768, 991 and 1440px with coarse input, rendered-background sampling
checks every visible mast text at native-scroll middle and near-end positions.
The tests preserve each observed painted pose while bringing text into view,
so sampling cannot accidentally reset the animation to its resting state.
Provider CI, independent review and the live deployment canary supply the
release evidence; a local screenshot alone is not a release check.
