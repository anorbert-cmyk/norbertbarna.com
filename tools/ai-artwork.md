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

## Ribbon fidelity correction

The owner rejected the simplified procedural rails and ribbon as a visual
regression. The original `bars.webp` is restored unchanged. The ribbon source
is the approved board crop at `474544d:assets/images/ai/ribbon.webp` (976×114),
before later alpha-keying damaged the glass and before the procedural renders.

Built-in image generation edited that exact source to remove the tiny baked
labels and reconstruct it at higher resolution. It preserved the shallow
wave, rounded forest fold, glass edges, olive/forest return and soft shadows.
This is a source-based edit, not a new geometry concept. The actual output is
2172×724 (the requested3072×1024 is not the output size). Source PNG:
`exec-87afbbb6-1db1-435d-8acd-4166d988cf4a.png`.
The production `ribbon-studio.webp` uses WebP quality95/method6. Only format
conversion was applied; the displayed7.5:1 crop is CSS, not a destructive edit.
The full prompt and source provenance are in `ai-ribbon-fidelity.json`.

The previous offline renderer remains under `ribbon-scene/` as historical
source. It does not supply the restored page artwork. JavaScript in the live
website does not render WebGL or write artwork transforms; CSS owns motion.

## Responsive treatment

Artwork has explicit intrinsic dimensions, is decorative (`alt=""` and
aria-hidden wrapper), and loads lazily except the opening. The first mobile
contact stays in document flow; the portal is masked below the text. The
workflow image has its own square frame, independent of biography length.
Final closing text and privacy controls are live HTML. A navy reflection scrim
keeps their contrast independent of bright artwork. Ribbon labels are plain
translated type on the surfaces, without boxes. Full-width mobile fallback
places the same labels below the picture in three readable columns. Active
mobile motion uses300% overscan; desktop camera bounds also keep cut image
edges outside the viewport. All base compositions are readable with no
JavaScript, reduced motion and no scroll-timeline support.
