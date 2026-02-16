# Norbert Barna Portfolio - Claude Code Guidelines

## Project Overview

Self-hosted Webflow export running on Express (Node 18) deployed to Railway.
Static portfolio site with HTML, CSS, JS, images, and videos.

## Architecture

- **Server**: Express.js (`server.js`) with compression and static file serving
- **Deployment**: Railway via Nixpacks (Dockerfile also available)
- **Pages**: 8 HTML files (index, works, 6 work detail pages)
- **CSS**: 4 Webflow-generated CSS files (1 shared + 3 page-specific)
- **JS**: jQuery 3.5.1, Webflow runtime (2 bundles), WebFont Loader, GSAP 3.12+ (CDN), Lenis (CDN)
- **Fonts**: Google Fonts (Funnel Display, Inter) loaded via webfont.js
- **Animations**: GSAP + ScrollTrigger + Lenis (supplements Webflow animations)

## File Structure

```
index.html            - Home page
works.html            - Works listing
work/*.html           - Individual project pages (benker, bitpanda, instructure, onrobot, raiffesen, sportsgambit)
assets/css/           - Webflow CSS (shared + page-specific)
assets/js/            - jQuery, Webflow JS, WebFont Loader
assets/js/animations.js - CUSTOM: GSAP animation master file
assets/images/        - All images (SVG, PNG, JPG)
assets/videos/        - Background videos (MP4, WebM)
assets/icons/         - Favicon and webclip
server.js             - Express server
.claude/skills/advanced-web-animations/SKILL.md - Animation patterns library
```

## Agentic Team Strategy for Complex Tasks

When tackling multi-faceted issues (e.g., CSS breakage, deployment problems, full-stack debugging), use **specialized subagent teams of 4+ agents** running in parallel. Each agent focuses on one diagnostic or fix domain.

### When to Use Subagent Teams (min 4 agents)

Use parallel subagent teams for:

- **Deployment/hosting issues** (CSS missing, assets 404, layout broken)
- **Cross-cutting bugs** affecting multiple files or systems
- **Performance audits** (server config + asset optimization + caching + CDN)
- **Migration tasks** (Webflow re-export, platform migration)
- **Security audits** (headers, SRI, CORS, dependencies)
- **Animation overhauls** (replacing/enhancing Webflow animations with GSAP across all pages)

### Recommended Team Compositions

**Deployment Debugging Team (4 agents):**

1. **SRI/Integrity Agent** - Verify all SRI hashes match actual file content
1. **Asset Reference Agent** - Audit all HTML files for broken CSS/JS/image paths
1. **Server Config Agent** - Test MIME types, headers, CORS, compression
1. **CSS Content Agent** - Check CSS files for external dependencies, @imports, url() refs

**Full-Stack Audit Team (4 agents):**

1. **HTML Structure Agent** - Validate HTML, check meta tags, OG images
1. **CSS/Style Agent** - Verify all styles load, check responsive breakpoints
1. **JS/Interaction Agent** - Test GSAP animations, navigation, video playback
1. **Performance Agent** - Check asset sizes, compression, caching headers

**Animation Overhaul Team (4 agents):**

1. **Hero Animation Agent** - Page load timeline, text reveals, image wipes
1. **Scroll Animation Agent** - ScrollTrigger setup, section reveals, parallax
1. **Interaction Agent** - Hover states, magnetic cursor, card animations
1. **Performance/Mobile Agent** - matchMedia breakpoints, reduced-motion, 60fps audit

### When NOT to Use Teams

Use single-agent or direct tool calls for:

- Single-file edits
- Simple text/content changes
- Adding/removing a page
- Quick config tweaks

## Known Issues and Fixes

### SRI Integrity Hash Mismatch (RESOLVED 2026-02-07)

**Problem**: Page-specific CSS files were modified after export but HTML still contained original Webflow SRI hashes. Browsers rejected the CSS entirely.
**Fix**: Removed `integrity` and `crossorigin="anonymous"` attributes from all local resource `<link>` and `<script>` tags. SRI is unnecessary for self-hosted same-origin assets.
**Prevention**: Do NOT add SRI integrity attributes to self-hosted resources.

## Important Rules

- **Never add SRI integrity attributes** to self-hosted CSS/JS files
- **Keep `crossorigin="anonymous"`** only on `<link rel="preconnect" href="https://fonts.gstatic.com"/>`
- **Asset paths**: Root pages use `assets/...`, work/ pages use `../assets/...`
- **CSS mapping**: Each page type has its own CSS file + shared CSS:
  - index.html -> `...279e-13ee6e6a9.css`
  - works.html -> `...27a5-acb15adb8.css`
  - work/*.html -> `...27a4-603c31720.css`
  - All pages -> `shared.8948b5576.css`

-----

## Animation Standards — Premium Motion Design (GSAP + Lenis)

This portfolio must have **award-winning quality animations** matching Awwwards-level portfolios. Every element should feel cinematic, smooth, and intentional. This is a VP-level Product Design Lead's personal portfolio — the animations ARE the portfolio.

### Animation Stack (CDN-based — NO npm for animations)

Since this is a static Webflow export, all animation libraries load via CDN. These script tags go BEFORE `</body>` in every HTML file, AFTER jQuery and Webflow JS:

```html
<!-- Lenis Smooth Scroll -->
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>

<!-- GSAP Core + Plugins -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Flip.min.js"></script>

<!-- Custom Animations -->
<script src="assets/js/animations.js"></script>
```

For work/ subpages, adjust the custom animation path:

```html
<script src="../assets/js/animations.js"></script>
```

### Animation Rules (Non-Negotiable)

1. **NEVER use basic CSS transitions for visible elements** — use GSAP timelines
1. **NEVER use `linear` or `ease` easing** — use `power4.out`, `expo.out`, `back.out(1.7)`, `circ.out`
1. **ONLY animate `transform` and `opacity`** — never layout properties
1. **ALWAYS stagger grouped elements** — nothing should appear all at once
1. **ALWAYS use `gsap.matchMedia()`** — simplify animations on mobile
1. **ALWAYS respect `prefers-reduced-motion`**
1. **DO NOT break existing Webflow interactions** — GSAP supplements, doesn't replace the Webflow JS runtime
1. **Webflow `data-w-id` attributes** — leave them in place; they control some built-in interactions. GSAP adds on top.

### Before Writing Any Animation Code

1. Read `.claude/skills/advanced-web-animations/SKILL.md` for full patterns library
1. Search GitHub for latest GSAP patterns if needed
1. Check gsap.com/docs for plugin updates

### HTML Element → Animation Mapping (index.html)

**Hero Section:**

- `.home-banner-title` ("Norbert Barna") → Split into chars, staggered yPercent + rotateX reveal, `power4.out`
- `.home-banner-subtitle` → Clip-path wipe from left, delay 0.3s
- `.home-banner-text` → Fade up (y + opacity), stagger `<strong>` stats
- `.nav-wrap .nav-link` → Slide down from yPercent -100 with stagger

**About Section:**

- `.large-text.black` → Line split, stagger reveal on scroll
- `.home-about-marquee-area` → Enhance existing marquee with GSAP speed control + hover pause
- `.home-about-video-wrap` → Scale + clip-path reveal on scroll

**Services Grid:**

- `.service-item` → Stagger grid reveal (y:60 + opacity:0), ScrollTrigger start "top 80%"
- `.home-service-icon-area` → Magnetic cursor effect on hover (desktop only)
- `.section-title` → Character split reveal on scroll

**Works Section:**

- `.work-card` → Scale from 0.95 + opacity on scroll, stagger per card
- `.work-image` → Inner parallax (yPercent shift slower than container)
- `.work-title-line` → GSAP-driven width animation on card hover (0 → 100%)

**Professional Experience:**

- `.awards-card` → Stagger reveal from bottom on scroll
- `.awards-card-title` → Text reveal per card
- `.awards-bg-video-wrap` → Clip-path reveal when card enters viewport

**Footer:**

- `.back-to-top-wrap` → Magnetic hover + smooth scroll to top via Lenis

**Smooth Scroll (ALL pages):**

- Lenis init with `duration: 1.2`, exponential easing
- Connected to GSAP ticker for ScrollTrigger sync

### animations.js Template

```javascript
// assets/js/animations.js
(function() {
  "use strict";

  // Accessibility: skip all animations if user prefers reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Register GSAP plugins
  gsap.registerPlugin(ScrollTrigger);

  // === LENIS SMOOTH SCROLL ===
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: false,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // === RESPONSIVE ANIMATIONS ===
  let mm = gsap.matchMedia();

  mm.add("(min-width: 768px)", () => {
    // DESKTOP: Full animation suite
    // Hero timeline, scroll reveals, parallax, magnetic hover, etc.
  });

  mm.add("(max-width: 767px)", () => {
    // MOBILE: Simplified — fade-in reveals only, no parallax, no magnetic
  });
})();
```

### Quality Bar

This is a VP-level designer's personal portfolio. Every animation must make hiring managers think: "This person understands craft at a level that's rare."

Ask: "Would Denis Snellenberg or Locomotive be proud of these animations?"
If not — iterate until they would.

### Skill Location

Full animation patterns library: `.claude/skills/advanced-web-animations/SKILL.md`
