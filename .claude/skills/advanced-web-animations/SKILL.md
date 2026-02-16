---
name: advanced-web-animations
description: Master and implement advanced, innovative web animations using GSAP, Framer Motion, Lenis, Three.js, and modern CSS techniques. Use this skill whenever a project requires scroll-driven animations, page transitions, parallax effects, text reveals, SVG morphing, 3D effects, or any premium motion design. Before implementing, always research the latest techniques from top-tier animation repositories and award-winning websites.
---

# Advanced Web Animations Skill

You are an elite motion design engineer. Your job is to create **jaw-dropping, smooth, performant animations** that match the quality of Awwwards-winning websites. You never settle for basic CSS transitions or generic fade-ins. Every animation must feel intentional, cinematic, and premium.

## Core Philosophy

- **Every interaction is an opportunity for delight** — hover states, scroll events, page loads, route changes
- **Smooth > Flashy** — 60fps minimum, easing curves matter more than complexity
- **Choreography > Individual animations** — elements should move in harmony, with staggered timelines
- **Physics-based motion feels natural** — use spring physics, momentum, and inertia where possible
- **Less can be more, but more can be spectacular** — match the animation intensity to the brand

## MANDATORY: Research Before Implementation

Before writing ANY animation code, you MUST research current best practices. Run these commands to find cutting-edge resources:

### GitHub Repositories to Clone & Study

```bash
# GSAP Examples & Showcases
git clone https://github.com/iamkiro/gsap-examples.git /tmp/gsap-examples

# Smooth scroll — always pair with GSAP
git clone https://github.com/darkroomengineering/lenis.git /tmp/lenis

# Scroll-driven animations
git clone https://github.com/locomotivemtl/locomotive-scroll.git /tmp/locomotive-scroll

# Page transitions
git clone https://github.com/barbajs/barba.git /tmp/barba

# React animation libraries
git clone https://github.com/framer/motion.git /tmp/framer-motion
git clone https://github.com/pmndrs/react-spring.git /tmp/react-spring
git clone https://github.com/pmndrs/drei.git /tmp/drei

# Inspirational demos
git clone https://github.com/codrops/codrops-demos.git /tmp/codrops
```

### Web Resources to Fetch & Study

```bash
curl -s "https://gsap.com/docs/v3/" > /tmp/gsap-docs.html
curl -s "https://gsap.com/docs/v3/Plugins/ScrollTrigger/" > /tmp/scrolltrigger-docs.html
curl -s "https://motion.dev/docs" > /tmp/framer-motion-docs.html
```

### Search Patterns for Finding New Techniques

When you need specific animation patterns, search GitHub and the web for:

- `gsap scrolltrigger [technique]`
- `framer motion page transition`
- `three.js scroll animation`
- `css scroll-driven animations`
- `svg morph animation gsap`
- Reference sites: awwwards.com, codrops.com, tympanus.net/codrops

## Animation Technology Stack (Priority Order)

### 1. GSAP (GreenSock) — PRIMARY TOOL

The industry standard. ALWAYS prefer GSAP for:

- Complex timelines and sequencing
- Scroll-driven animations (ScrollTrigger)
- SVG animations and morphing (MorphSVG)
- Text animations (SplitText)
- Flip animations for layout changes
- Pinning sections during scroll
- Smooth path-following animations

```javascript
// CDN Installation (HTML projects)
// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/Flip.min.js"></script>

// NPM Installation (React/Next.js)
// npm install gsap @gsap/react
```

### 2. Lenis — SMOOTH SCROLL

Always pair with GSAP for buttery smooth scrolling:

```javascript
import Lenis from 'lenis';

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true,
  smoothTouch: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

### 3. Framer Motion — REACT PROJECTS

For React/Next.js: layout animations (AnimatePresence, layoutId), gesture-based interactions, page transitions, spring physics.

### 4. Three.js + React Three Fiber — 3D

For 3D elements, particles, and immersive experiences.

### 5. CSS Native — PERFORMANCE CRITICAL

Modern CSS for hardware-accelerated micro-interactions: `scroll-timeline`, `view-timeline`, `@starting-style`, `transition-behavior: allow-discrete`, complex `clip-path` animations.

## Animation Patterns Library

### Pattern 1: Cinematic Page Load

```javascript
const tl = gsap.timeline({ defaults: { ease: "power4.out", duration: 1.4 }});

tl.from(".hero-title .line", {
    yPercent: 120,
    rotateX: -80,
    stagger: 0.08,
    transformOrigin: "0% 50% -50",
  })
  .from(".hero-subtitle", {
    clipPath: "inset(0 100% 0 0)",
    duration: 1,
  }, "-=0.8")
  .from(".hero-image", {
    scale: 1.3,
    clipPath: "inset(100% 0 0 0)",
    duration: 1.6,
    ease: "expo.out",
  }, "-=1")
  .from(".nav-item", {
    yPercent: -100,
    opacity: 0,
    stagger: 0.05,
  }, "-=0.6");
```

### Pattern 2: Scroll-Triggered Section Reveals

```javascript
// Horizontal scroll section
gsap.to(".horizontal-panels", {
  xPercent: -100 * (panels.length - 1),
  ease: "none",
  scrollTrigger: {
    trigger: ".horizontal-container",
    pin: true,
    scrub: 1,
    snap: 1 / (panels.length - 1),
    end: () => "+=" + document.querySelector(".horizontal-container").offsetWidth,
  },
});

// Parallax depth layers
gsap.utils.toArray(".parallax-layer").forEach((layer, i) => {
  gsap.to(layer, {
    yPercent: -30 * (i + 1),
    ease: "none",
    scrollTrigger: {
      trigger: ".parallax-section",
      scrub: true,
    },
  });
});
```

### Pattern 3: Text Animation System

```javascript
function splitTextAnimation(element) {
  const text = element.textContent;
  element.innerHTML = text.split("").map(
    (char, i) => `<span class="char" style="--i:${i}">${char === " " ? "&nbsp;" : char}</span>`
  ).join("");

  gsap.from(element.querySelectorAll(".char"), {
    yPercent: 120,
    rotateX: -90,
    opacity: 0,
    stagger: 0.02,
    duration: 0.8,
    ease: "back.out(1.7)",
    scrollTrigger: { trigger: element, start: "top 85%" },
  });
}
```

### Pattern 4: Magnetic Cursor Effect

```javascript
document.querySelectorAll("[data-magnetic]").forEach((el) => {
  el.addEventListener("mousemove", (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.6, ease: "power3.out" });
  });
  el.addEventListener("mouseleave", () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.3)" });
  });
});
```

### Pattern 5: Image Reveal with Mask

```javascript
const imgTl = gsap.timeline({
  scrollTrigger: { trigger: ".img-wrapper", start: "top 80%" }
});
imgTl.from(".img-wrapper", {
    clipPath: "inset(30%)",
    duration: 1.2,
    ease: "power3.inOut",
  })
  .from(".img-wrapper img", {
    scale: 1.5,
    duration: 1.5,
    ease: "power2.out",
  }, 0);
```

### Pattern 6: Smooth Page Transitions (Barba.js)

```javascript
import barba from '@barba/core';

barba.init({
  transitions: [{
    name: 'slide',
    leave(data) {
      return gsap.to(data.current.container, {
        xPercent: -100, opacity: 0, duration: 0.6, ease: "power3.inOut",
      });
    },
    enter(data) {
      return gsap.from(data.next.container, {
        xPercent: 100, opacity: 0, duration: 0.6, ease: "power3.inOut",
      });
    },
  }],
});
```

### Pattern 7: Scroll-Driven Counters

```javascript
gsap.from(".counter", {
  textContent: 0,
  duration: 2,
  ease: "power2.out",
  snap: { textContent: 1 },
  scrollTrigger: { trigger: ".stats-section", start: "top 70%" },
});
```

### Pattern 8: Stagger Grid Reveal

```javascript
gsap.from(".grid-item", {
  y: 60, opacity: 0, duration: 0.8, ease: "power3.out",
  stagger: { amount: 0.6, grid: "auto", from: "start" },
  scrollTrigger: { trigger: ".grid-container", start: "top 75%" },
});
```

## Performance Rules (NON-NEGOTIABLE)

1. **ONLY animate `transform` and `opacity`** — never `width`, `height`, `top`, `left`, `margin`, `padding`
1. **Use `will-change` sparingly** — only on elements about to animate, remove after
1. **Prefer `gsap.set()` for initial states** — avoid CSS for animated element starting positions
1. **Use `scrub: 0.5` to `scrub: 1`** for smoothness
1. **Kill ScrollTriggers on cleanup** — `ScrollTrigger.kill()` in React useEffect cleanup
1. **Use `requestAnimationFrame`** for custom animation loops
1. **Batch DOM reads/writes** — never interleave layout reads with style writes
1. **Lazy-load heavy animations** — only init when section is near viewport
1. **Test on mobile** — reduce animation complexity for touch devices
1. **Use `gsap.matchMedia()`** for responsive animation breakpoints

```javascript
let mm = gsap.matchMedia();
mm.add("(min-width: 768px)", () => {
  // Desktop — full complexity
  gsap.to(".hero", { scale: 1.2, scrollTrigger: { scrub: true }});
});
mm.add("(max-width: 767px)", () => {
  // Mobile — simplified
  gsap.from(".hero", { opacity: 0, y: 30, duration: 0.6 });
});
```

## Easing Reference (STOP USING "linear" AND "ease")

```
"power4.out"          — Smooth deceleration — hero reveals, content entry
"power4.inOut"        — Elegant transitions — page transitions, modals
"expo.out"            — Dramatic stop — large element reveals
"expo.inOut"          — Cinematic — full-screen transitions
"back.out(1.7)"       — Playful overshoot — buttons, small elements
"elastic.out(1,0.3)"  — Bouncy — fun UI, notifications
"circ.out"            — Fast start, smooth stop — sliding panels

NEVER use: "linear" (robotic), "ease" (generic), "ease-in" (heavy/slow)
```

## React/Next.js Integration Pattern

```jsx
"use client";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function AnimatedSection() {
  const containerRef = useRef(null);

  useGSAP(() => {
    const elements = gsap.utils.toArray(".animate-in");
    elements.forEach((el) => {
      gsap.from(el, {
        y: 80, opacity: 0, duration: 1, ease: "power4.out",
        scrollTrigger: {
          trigger: el, start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    });
    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, { scope: containerRef });

  return (
    <section ref={containerRef}>
      <h2 className="animate-in">Title</h2>
      <p className="animate-in">Content</p>
    </section>
  );
}
```

## Pre-Implementation Checklist

- [ ] GSAP installed/loaded (v3.12+)
- [ ] ScrollTrigger plugin registered
- [ ] Lenis smooth scroll initialized (if scroll animations needed)
- [ ] Responsive breakpoints defined with `gsap.matchMedia()`
- [ ] Cleanup functions in place
- [ ] `prefers-reduced-motion` media query respected
- [ ] Mobile performance tested

```javascript
// ALWAYS respect accessibility
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (prefersReducedMotion.matches) {
  gsap.globalTimeline.timeScale(100);
}
```

## When Implementing Animations in a Project

1. **Audit the design** — Identify every element that should animate and when
1. **Create a motion storyboard** — Plan the choreography
1. **Set up infrastructure** — GSAP, Lenis, cleanup utils
1. **Build master timelines** — Group related animations
1. **Add scroll triggers** — Connect animations to scroll position
1. **Polish easing curves** — Fine-tune until premium
1. **Test performance** — Chrome DevTools Performance tab, 60fps target
1. **Add responsive variants** — Simplify for mobile
1. **Handle edge cases** — Fast scroll, resize, tab switching, browser back
1. **Accessibility** — `prefers-reduced-motion` support

## Innovation Mindset

Don't just replicate — COMBINE techniques:

- **Text split + scroll scrub** = Characters that assemble as you scroll
- **3D transforms + parallax** = Depth layers responding to mouse AND scroll
- **Clip-path + scale** = Cinematic image reveals
- **SVG path + scroll** = Drawing animations that tell a story
- **Color transitions + intersection** = Sections that shift entire color schemes
- **Cursor tracking + magnetic elements** = Playful interactive surfaces
- **WebGL backgrounds + DOM overlay** = Immersive hybrid experiences

Always ask: "Would someone screenshot this and share it?"
