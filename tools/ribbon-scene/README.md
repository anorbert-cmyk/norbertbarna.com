# AI decorative geometry compiler

The original `ribbon3d.html` / `render.mjs` remain unchanged. The new
`ai-geometry.html` / `render-ai.mjs` build original, text-free decorative
geometry for the AI landing's approved **Systems in Motion** concept.

Run from the repository root:

```sh
node tools/ribbon-scene/render-ai.mjs
```

The compiler reuses the existing Three.js **r128** CDN source, the existing
Playwright installation, and Python Pillow. It adds no dependencies and no
runtime WebGL to the website. The pinned CDN script is fetched at render time;
the published output is just transparent WebP. PNG intermediates and lilac
studio previews are written to a new OS temp directory, printed by the tool.

## Output and registration

| File in `assets/images/ai` | Canvas | Purpose |
| --- | --- | --- |
| `bars-forest.webp` | 1800 × 1100 | Upper forest folded architectural channel |
| `bars-glass.webp` | 1800 × 1100 | Middle translucent lilac rectangular rail |
| `bars-olive.webp` | 1800 × 1100 | Lower olive channel |
| `bars-all.webp` | 1800 × 1100 | Composite reference/static option |
| `ribbon-refined.webp` | 2800 × 480 | Continuous forest/glass/olive sheet |

All three rail layers use identical camera, framing and output dimensions.
Overlay them without individual auto-cropping, in **forest → glass → olive**
paint order. Each has its own transparent floor shadow. The upper channel is
angled up to the right; the middle rail bridges the composition; the bottom
channel is almost horizontal. These are rendered mesh layers, so each can
translate/rotate independently without slicing a flat source image.

The ribbon has deeper direction changes, saturated forest and olive faces,
a visible lilac transparent span, and a soft studio shadow. Its empty vertical
margin is removed by a camera view offset; no visible fold or shadow is cut.
The lateral ends intentionally continue through the frame, as in the concept.
The author's existing `ribbon.webp` is never overwritten.

## Live-text anchors

Labels are **not baked into any image**. For optional live HTML labels placed
on the surfaces, the following centres come from projecting the source
geometry through the exact render camera. Coordinates refer to the entire
image canvas, with centred text transforms (`translate(-50%, -50%)`).

| Surface | Left | Top | Rotate |
| --- | --- | --- | --- |
| Forest rail | 48.5% | 32.6% | −16.2° |
| Glass rail | 52.5% | 56.2% | −11.1° |
| Olive rail | 56.1% | 73.2% | −5.9° |
| Ribbon: insight | 16.3% | 71.3% | +7.2° |
| Ribbon: integration | 47.5% | 39.5% | −14.0° |
| Ribbon: impact | 79.2% | 32.2% | +7.9° |

The compiler prints these anchors so they can be refreshed after a geometry
or camera change. If layout uses `object-fit: cover`, the label container must
receive the same crop transform as the image; natural image sizing is simpler.
Mobile may present the same meaning as normal adjacent text instead of tiny
surface labels.

## Export details

The output uses lossless WebP with `exact=True`, preserving RGB values even
under transparent pixels. This matters: the default encoder's transparent
RGB optimisation caused visible horizontal streaks in one image previewer.
Exact RGBA round-trips are checked against the source PNG after export.

The reference controls are the owner's three approved AI concept boards.
No product evidence, logo, result, metrics or typography is generated here.
