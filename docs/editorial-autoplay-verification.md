# Editorial notes and automatic portfolio media

## Implemented scope

- Replace the gray/purple Measurement note card with transparent, unboxed editorial typography in all seven case studies.
- Preserve each original measurement qualification byte-for-byte; the source checker freezes the reviewed text by SHA-256. Raiffeisen has its own reproducibility qualification, not the generic audit disclaimer.
- Give media.js sole ownership of video autoplay, separately from GSAP reveals. Visible showcase videos play muted and inline without individual Play/native-player controls. Decorative award videos retain their hover/focus behavior.
- Provide one keyboard-accessible page-level pause setting, persisted across navigation within the browsing session. Reduced-motion always wins; Save-Data prevents default playback unless explicitly enabled. Browser autoplay rejection retains the poster instead of claiming success.
- Pause offscreen media, hidden tabs and pagehide; safely restore eligible media, including fast re-entry and interrupted play promises.
- Restore Instructure's video on touch layouts and reserve its correct 16:9 geometry.
- Preserve original content, JSON-LD, canonical metadata, social images, intrinsic screenshot ratios, responsive crops, native scrolling, and old release assets.
- Extend content-hash cache validation to the independent media module.

## Full-repository verification evidence

GitHub Actions run: 33450937375 (2026-08-31 UTC).
Generated implementation commit: 8e7859fe4c321f9689407d4f326f5f4f11fcf343.
Artifact: editorial-release-validation, ID 9779766309.

- npm test: all five check suites passed.
- HTML/site invariants: 10 pages.
- SEO: 9 canonical pages, 9 existing 1200x630 JPEG social images verified from their actual bytes, 17 parsed JSON-LD blocks, unique metadata and sitemap coverage.
- Evidence notes: 7 exact original qualifications preserved.
- Media markup: 9 preference-aware video elements.
- Server: 344 mutable assets revalidate; 12 verified releases use immutable caching; error routes remain real 404s.
- JavaScript syntax and production dependency audit passed.
- Playwright/Chromium: 66 tests passed, including all existing 33 tests and 33 editorial/media regressions. Desktop and emulated touch surfaces, actual advancing video time, viewport re-entry, keyboard pause, persistence, reduced-motion, Save-Data, lifecycle, blocked autoplay, no-IntersectionObserver, no-GSAP, late play completion, no-JavaScript, layout and Axe checks are covered.

The temporary integration inputs and write-enabled preparation workflow are removed from the final change. The cleaned PR head must pass the ordinary read-only CI workflow before merge; CI retains browser screenshots and failure traces for seven days.

## Coverage limits

Chromium touch emulation is not a physical iPhone/Safari test. No claim of a separate Safari/iOS run is made. Browser/OS policies may intentionally prevent autoplay; the static poster and text description remain available. Business/project measurement claims were preserved, not independently audited.
