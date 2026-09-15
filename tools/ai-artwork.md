# AI landing architecture

Scope: decorative artwork for `/ai-integration` and `/hu/ai-integracio`.
User-approved references: The Passage (01) and Systems in Motion (02),
2026-09-15. These are abstract brand environments, never client/product evidence.
Palette: navy #0A1628, forest #1B3A32, olive #BDB414, lilac #D6D4ED.

The original boards are retained in the project workspace at
`output/ai-landing-concepts-v1/`. The original board crops in assets remain
unchanged. New source PNGs were generated using the built-in image generation
tool, visually compared with the original, then converted to WebP quality90,
method6 using the existing system Pillow. No runtime image processing or new
package dependency is needed.

| New production file | Dimensions | Source PNG identifier |
| --- | --- | --- |
| passage-refined.webp | 1804×872 | exec-616e43ce-ccf1-4f56-acd6-665ba5ceb579.png |
| workflow-refined.webp | 1254×1254 | exec-d202cef3-8a0b-43cc-bc35-aa75c572df2e.png |
| closing-passage.webp | 1536×1024 | exec-64f12cce-e9ce-4e49-a8bd-d9f83305575d.png |

Source PNGs remain in the local Codex generated-image directory; the site ships
only the optimized WebP files under `assets/images/ai/`.

## Generation briefs and invariants

- **Opening:** recreate `passage-panel.webp` precisely, with left55% empty navy
  wall, forest diagonal from floor36% to apex75%, narrow olive internal plane,
  slim lilac triangular aperture and reflective floor. Remove board outlines
  and patch seams; preserve camera, composition and palette. No text or UI.
- **Workflow:** recreate `workflow-passage.webp` and the Passage board's
  lower-left architectural gate. Preserve diagonal folded forest lintel,
  triangular right support, tall open doorway and narrow olive internal face.
  Restore crisp edges without the crop's block artifacts or stray right-edge
  fragment. Seamless lilac studio environment, rich satin material, no text/UI.
- **Closing:** reconstruct only the Passage board's lower-right environment.
  Landscape3:2; near-navy negative space across the left65%, forest wall,
  narrow vertical olive light slit at80%, a thin floor light line and subtly
  reflective floor at bottom18%. No triangular portal in this closing, no
  extra objects, neon orange, lettering or UI.

## Separately rendered motion assets

See `ribbon-scene/README.md` for the reproducible Three.js offline renderer,
registered independent bar layers, ribbon label coordinates and exact RGBA
roundtrip export validation. JavaScript in the live website does not render
WebGL or write artwork transforms; CSS view timelines own motion.

## Responsive treatment

Artwork has explicit intrinsic dimensions, is decorative (`alt=""` and
aria-hidden wrapper), and loads lazily except the opening. The first mobile
contact stays in document flow; the portal is masked below the text. The
workflow image has its own square frame, independent of biography length.
Final closing text and privacy controls are live HTML. All base compositions
are readable with no JavaScript, reduced motion and no scroll-timeline support.
