# AGENTS.md

This repository is a static hiring portfolio.

1. Read `design.md` before changing layout, type, color, copy, or IA.
   That file is the design authority (Vercel `design.md` loop: guidance,
   stylesheet, deterministic checks).
2. Use existing class names documented there. Do not add a parallel design
   system, a third type family, or Vercel/Geist chrome.
3. Do not generate images, palettes, wordmarks, or UI screenshots.
4. Keep Funnel Display + Inter and the shipped case colors.
5. Mechanical rules live in `scripts/check-design.mjs` plus the existing
   `scripts/check-*.mjs` suite. If a correction repeats, encode it — do not
   only patch the page.
6. After CSS edits, re-hash `assets/css/responsive.css` (and `case-motion.css` /
   `animations.js` if those changed) and update page references.
