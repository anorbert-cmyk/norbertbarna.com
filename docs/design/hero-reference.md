# Original folded sculpture: artwork and scroll endpoint

The approved reference is panel **03 Hero** of the original generated 1536×1024
`desktop-sequence.png` storyboard. This revision preserves that sculpture's
actual forest/olive material, folds, lighting and perspective. It replaces the
previous five-face geometric approximation while keeping the existing glass
arrival, native scroll owner, project lists, compact navigation and editorial
experience/footer work.

## Editable and runtime files

- `hero-reference-source.svg`: self-contained authoring source. It embeds the
  original storyboard losslessly beneath the measured silhouette. The viewBox
  is `288 550 452 392`; no external image is required to edit or export it.
- `hero-reference-landmarks.json`: independently measured reference corners and
  the opening's intermediate contour coordinates.
- `../../assets/images/hero-final.webp`: transparent 904×784, lossless runtime
  texture (174,098 bytes), exported from the source SVG at 2× using the existing
  local SVG rasterizer. No dependency was added.
- `../../assets/images/hero-gate.svg`: self-contained SVG embedding those same
  WebP bytes for the static, reduced-motion, experience and footer artwork.

The empty opening is actual alpha. The original lilac anti-aliasing is removed
only in the outermost 0.9 reference-pixel band by a native SVG morphology filter.
The group opacity of 0.99999 forces one intermediate compositing surface in
librsvg, so its outer clip is applied once. The exported alpha remains byte for
byte identical before/after edge cleanup. The original interior texture remains.

The shadow's two contact areas and ambient spread come from the original
image's luminance. Its transparent alpha is reconstructed against the sampled
lilac backdrop; it is visually matched, not an exact recoverable original alpha
channel. The source does not contain a clean background plate. The reference's
native sculpture resolution is approximately 339×347 pixels; the 2× export
preserves that texture without claiming newly recovered fine detail.

## Motion integration

`PortfolioHomeMorph` remains the sole native-scroll progress owner. The original
seven glass fragments continuously form one UV-mapped artwork plane in the same
WebGL canvas. No second DOM artwork fades over a different silhouette. At the
endpoint the fragment shader samples the finished artwork directly, without
extra lighting or a second shadow. The original p0 geometry and material remain. Pixel comparison uses the baseline
with the same finalized backdrop layout, since the old renderer could retain a
reflection captured before the consent panel finished changing that layout.

Both the canvas and static image use the same contain rectangle: desktop
left 36%, right 98%, top 6%, bottom 84%; below 600px, left 42%, right 102%, top
12.5%, bottom 42%. Padding includes the original ambient shadow. The source
artwork is never stretched to change its proportions.

The initial final-image decode and optional reflection decode share a bounded
1800ms readiness budget. Missing/failed artwork falls back to the self-contained
SVG. Context restoration reuploads the decoded texture; destroy cancels pending
loads and releases all three textures. Idle and offscreen scenes stop drawing.
Consent-driven scale/translation changes mark the backdrop dirty and refresh it
once on the existing rendering frame. Hidden/offscreen scenes retain that dirty
state until visible; the observer is disconnected on destroy. The consent close
regression verifies that an unchanged viewport resize no longer alters the image.

## Design generation provenance

A built-in image-generation **edit** was attempted using the original storyboard
as reference; no API/CLI or named model override was used. The generated variant
was rejected because it subtly changed the proportions/olive and supplied a
painted checkerboard instead of actual alpha. The selected final artwork is the
original reference preserved in the editable SVG described above.

Final attempted prompt:

> Use case: background-extraction. Asset type: transparent hero artwork for the same website. Edit target: the supplied four-panel storyboard, specifically ONLY the geometric sculpture in the LOWER LEFT panel labelled 03 Hero. Extract and faithfully upscale that EXACT sculpture into a standalone high-resolution transparent PNG. Preserve its exact silhouette, perspective, corner positions, relative face widths, all five visible folds, broad dark forest green left ribbon, broad subtly lit top plane, thinner splayed right forest leg, olive inner triangle at the lower left, olive narrow upper inner fold on the right, and empty triangular opening. Preserve the original softly textured matte material, realistic light gradients and contact shading. The shape is NOT a typographic letter A or thick extruded gate: keep the specific original folded-paper/ribbon sculpture. Do not redesign, mirror, simplify to flat fills, change the camera, add bevels, add extra faces, or alter proportions. Remove ALL typography, UI, panels and lilac backdrop. Keep the entire shape and its soft ground shadow; everything outside the sculpture and shadow must be actual transparent alpha, including the inner opening. Center the object with a small clear margin. This must look like the original 03 Hero sculpture simply isolated and enlarged, not a new interpretation. No words, logos or watermark. The exact shape, original materials and original lighting are the overriding priorities.

## Acceptance

The separate reference review verifies contour alignment, five-face material,
opening, shadow, three background colors and edge cleanup. Runtime verification
covers the actual hashed served script, p0 preservation, intermediate progress,
matching desktop/mobile endpoint, idle/offscreen counters, missing texture,
reduced motion, WebGL loss/restoration and destroy. `hero-reference.spec.mjs`
retains regressions for the approved face colors, open alpha, identical static
and animated asset bytes, and direct endpoint rendering on desktop and mobile.

Browser emulation is not a claim of physical iPhone/Brave smoothness. This is a
local implementation and verification; no production deployment is implied.
