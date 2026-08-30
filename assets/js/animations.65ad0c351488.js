/**
 * Norbert Barna Portfolio — Premium GSAP Animations
 *
 * Dependencies (self-hosted in assets/js/vendor/, loaded before this file):
 *   - Lenis (smooth scroll)
 *   - GSAP 3.12+ (core)
 *   - GSAP ScrollTrigger
 *
 * Works across all pages: index, works, work/* case studies
 */

(function () {
  "use strict";

  // Guard: bail if GSAP or Lenis not loaded
  if (typeof gsap === "undefined" || typeof Lenis === "undefined") return;

  // ============================================================
  // GSAP READY: Remove !important overrides, let GSAP control
  // ============================================================
  document.documentElement.classList.add("gsap-ready");

  // Clear Webflow IX2 inline styles that may hide elements
  document.querySelectorAll("[data-w-id]").forEach(function (el) {
    el.style.opacity = "";
    el.style.transform = "";
  });

  // ============================================================
  // ACCESSIBILITY
  // ============================================================
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("no-motion");
    // Background/demo videos autoplay from markup; stop them for
    // reduced-motion users (the poster frame stays visible).
    document.querySelectorAll("video[autoplay]").forEach(function (v) {
      v.removeAttribute("autoplay");
      v.pause();
    });
    return;
  }

  // ============================================================
  // GSAP PLUGIN REGISTRATION
  // ============================================================
  gsap.registerPlugin(ScrollTrigger);

  // ============================================================
  // LENIS SMOOTH SCROLL
  // ============================================================
  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) {
      return Math.min(1, 1.001 - Math.pow(2, -10 * t));
    },
    smoothTouch: false,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Content height grows after init (lazy images, videos, web fonts), which
  // leaves Lenis with a stale scroll limit: wheel/touch scrolling stops short
  // of the footer while the native scrollbar still reaches it. Recalculate on
  // full load and whenever the body actually changes height, and keep
  // ScrollTrigger positions in sync.
  var refreshFrame = null;
  function refreshScrollLimits() {
    if (refreshFrame !== null) return;
    refreshFrame = window.requestAnimationFrame(function () {
      refreshFrame = null;
      lenis.resize();
      ScrollTrigger.refresh(true);
    });
  }
  window.addEventListener("load", refreshScrollLimits);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refreshScrollLimits);
  }
  document.querySelectorAll("img[loading='lazy']").forEach(function (image) {
    if (!image.complete) {
      image.addEventListener("load", refreshScrollLimits, { once: true });
      image.addEventListener("error", refreshScrollLimits, { once: true });
    }
  });
  document.querySelectorAll("video").forEach(function (video) {
    if (video.readyState < 1) {
      video.addEventListener("loadedmetadata", refreshScrollLimits, { once: true });
    }
  });
  if (window.ResizeObserver) {
    var lastBodyHeight = document.body.scrollHeight;
    var resizeTimer = null;
    new ResizeObserver(function () {
      var h = document.body.scrollHeight;
      if (Math.abs(h - lastBodyHeight) > 1) {
        lastBodyHeight = h;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(refreshScrollLimits, 150);
      }
    }).observe(document.body);
  }

  // ============================================================
  // UTILITY: Text Splitter
  // ============================================================
  function splitChars(el) {
    if (!el) return [];
    var existingChars = el.querySelectorAll(":scope > .split-char");
    if (existingChars.length) return existingChars;
    // Preserve non-text children (e.g. <br/> inside multi-line headings)
    // instead of flattening them away via textContent.
    var nodes = Array.prototype.slice.call(el.childNodes);
    // Keep the original text for assistive tech (spans read letter-by-letter);
    // join per-node text with spaces so line breaks don't glue words together.
    el.setAttribute("aria-label", nodes.map(function (n) {
      return n.textContent.trim();
    }).filter(Boolean).join(" "));
    el.textContent = "";
    nodes.forEach(function (node) {
      if (node.nodeType !== Node.TEXT_NODE) {
        el.appendChild(node);
        return;
      }
      var text = node.textContent;
      for (var i = 0; i < text.length; i++) {
        var span = document.createElement("span");
        span.className = "split-char";
        span.setAttribute("aria-hidden", "true");
        span.style.display = "inline-block";
        if (text[i] === " ") {
          span.innerHTML = "&nbsp;";
        } else {
          span.textContent = text[i];
        }
        el.appendChild(span);
      }
    });
    return el.querySelectorAll(".split-char");
  }

  function splitWords(el) {
    if (!el) return [];
    // Whole words in document order read fine to assistive tech, so no
    // aria-hidden/aria-label here (aria-label is unsupported on <p> anyway).
    var text = el.textContent;
    el.textContent = "";
    var words = text.split(/\s+/).filter(function (w) { return w.length > 0; });
    words.forEach(function (w, i) {
      var span = document.createElement("span");
      span.className = "split-word";
      span.style.display = "inline-block";
      span.textContent = w;
      el.appendChild(span);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return el.querySelectorAll(".split-word");
  }

  // ============================================================
  // UTILITY: Magnetic Cursor Effect
  // ============================================================
  var magneticTargets = [];
  function addMagneticEffect(els, strength, signal) {
    strength = strength || 0.3;
    els.forEach(function (el) {
      magneticTargets.push(el);
      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * strength;
        var y = (e.clientY - rect.top - rect.height / 2) * strength;
        gsap.to(el, { x: x, y: y, duration: 0.4, ease: "power3.out" });
      }, { signal: signal });
      el.addEventListener("mouseleave", function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
      }, { signal: signal });
    });
  }

  // ============================================================
  // UTILITY: Hover underline on work cards
  // ============================================================
  function initHoverUnderlines(cards, signal) {
    cards.forEach(function (card) {
      var line = card.querySelector(".work-title-line");
      if (!line) return;
      gsap.set(line, { transformOrigin: "left center", scaleX: 0 });

      function showLine() {
        gsap.to(line, { scaleX: 1, duration: 0.4, ease: "power2.out" });
      }

      function hideLine() {
        gsap.to(line, { scaleX: 0, duration: 0.3, ease: "power2.in" });
      }

      card.addEventListener("mouseenter", showLine, { signal: signal });
      card.addEventListener("mouseleave", hideLine, { signal: signal });
      card.addEventListener("focusin", showLine, { signal: signal });
      card.addEventListener("focusout", function (event) {
        if (!event.relatedTarget || !card.contains(event.relatedTarget)) hideLine();
      }, { signal: signal });
    });
  }

  function initRelatedCardInteractions(cards, signal) {
    cards.forEach(function (card) {
      var area = card.closest(".related-projects-area");
      var image = card.querySelector(".work-image");
      var title = card.querySelector(".related-work-title");
      var category = card.querySelector(".work-category-text");
      var siblings = area ? Array.from(area.querySelectorAll(".related-work-card")) : [];

      function activate() {
        if (area) area.classList.add("is-interacting");
        card.classList.add("is-active");
        siblings.forEach(function (sibling) {
          if (sibling === card) return;
          gsap.to(sibling, { opacity: 0.46, scale: 0.985, duration: 0.38, ease: "power3.out" });
        });
        gsap.to(card, { y: -4, duration: 0.38, ease: "power3.out" });
        if (image) gsap.to(image, { scale: 1.04, duration: 0.55, ease: "power4.out" });
        if (title) gsap.to(title, { y: -3, duration: 0.35, ease: "power3.out" });
        if (category) gsap.to(category, { x: 4, opacity: 0.74, duration: 0.35, ease: "power3.out" });
      }

      function deactivate(event) {
        if (event && event.relatedTarget && card.contains(event.relatedTarget)) return;
        card.classList.remove("is-active");
        if (area && !area.querySelector(".related-work-card.is-active")) {
          area.classList.remove("is-interacting");
        }
        siblings.forEach(function (sibling) {
          gsap.to(sibling, { opacity: 1, scale: 1, duration: 0.38, ease: "power3.out" });
        });
        gsap.to(card, { y: 0, duration: 0.38, ease: "power3.out" });
        if (image) gsap.to(image, { scale: 1, duration: 0.55, ease: "power4.out" });
        if (title) gsap.to(title, { y: 0, duration: 0.35, ease: "power3.out" });
        if (category) gsap.to(category, { x: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
      }

      card.addEventListener("mouseenter", activate, { signal: signal });
      card.addEventListener("mouseleave", deactivate, { signal: signal });
      card.addEventListener("focusin", activate, { signal: signal });
      card.addEventListener("focusout", deactivate, { signal: signal });
    });
  }

  // ============================================================
  // DETECT PAGE TYPE
  // ============================================================
  var isHome = !!document.querySelector(".home-about-section");
  var isWorks = !!document.querySelector(".work-section");
  var isCaseStudy = !!document.querySelector(".work-single-section");

  // Prepare a stable, shared motion contract for every case-study page.
  // These classes are decorative hooks only; the source content and reading
  // order remain untouched. Reduced-motion users return before this point.
  var caseStudySummary = null;
  var caseStudyHeadings = [];
  var caseStudyFigures = [];

  if (isCaseStudy) {
    document.body.classList.add("case-motion-active");
    caseStudySummary = document.querySelector(".summary");

    if (caseStudySummary) {
      caseStudyHeadings = Array.from(caseStudySummary.querySelectorAll("h2"));
      caseStudyHeadings.forEach(function (heading, index) {
        heading.classList.add("case-motion-heading");
        heading.setAttribute("data-motion-index", String(index + 1).padStart(2, "0"));
      });

      caseStudyFigures = Array.from(
        caseStudySummary.querySelectorAll("figure.w-richtext-figure-type-image")
      );
      caseStudyFigures.forEach(function (figure) {
        var mask = figure.querySelector(":scope > div");
        var media = mask ? mask.querySelector("img") : null;
        figure.classList.add("case-motion-figure");
        if (mask) mask.classList.add("case-motion-figure__mask");
        if (media) media.classList.add("case-motion-figure__media");
      });
    }

    document.documentElement.classList.add("case-motion-ready");
  }

  // ============================================================
  // RESPONSIVE ANIMATIONS
  // ============================================================
  var mm = gsap.matchMedia();

  // ============================================================
  // DESKTOP (768px+)
  // ============================================================
  mm.add("(min-width: 768px)", function () {
    var listeners = new AbortController();
    var caseCleanup = null;

    // ── SHARED: Nav + Logo ────────────────────────────────────
    var logo = document.querySelector(".nav-logo-wrap");
    var navLinks = document.querySelectorAll(".nav-link");

    var navTl = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.1 });

    if (logo) {
      navTl.from(logo, { opacity: 0, y: -20, duration: 0.6 });
    }
    if (navLinks.length) {
      navTl.from(navLinks, {
        yPercent: -100,
        opacity: 0,
        stagger: 0.06,
        duration: 0.7,
      }, "-=0.3");
    }

    // ── SHARED: Back to Top ───────────────────────────────────
    var backToTop = document.querySelectorAll(".back-to-top-wrap");
    if (backToTop.length) {
      if (!isCaseStudy) addMagneticEffect(Array.from(backToTop), 0.4, listeners.signal);
      backToTop.forEach(function (el) {
        var arrowImages = el.querySelectorAll(".back-to-top-arrow-wrap img");

        function activateArrow() {
          el.classList.add("is-active");
          if (isCaseStudy && arrowImages.length) {
            gsap.to(arrowImages, {
              yPercent: -100,
              stagger: 0.035,
              duration: 0.45,
              ease: "power4.out",
            });
          }
        }

        function resetArrow(event) {
          if (event && event.relatedTarget && el.contains(event.relatedTarget)) return;
          el.classList.remove("is-active");
          if (isCaseStudy && arrowImages.length) {
            gsap.to(arrowImages, {
              yPercent: 0,
              stagger: 0.035,
              duration: 0.45,
              ease: "power4.out",
            });
          }
        }

        if (isCaseStudy) {
          el.addEventListener("mouseenter", activateArrow, { signal: listeners.signal });
          el.addEventListener("mouseleave", resetArrow, { signal: listeners.signal });
          el.addEventListener("focusin", activateArrow, { signal: listeners.signal });
          el.addEventListener("focusout", resetArrow, { signal: listeners.signal });
        }

        el.addEventListener("click", function (e) {
          e.preventDefault();
          lenis.scrollTo(0, {
            duration: 1.5,
            onComplete: function () {
              if (!isCaseStudy) return;
              var pageTitle = document.querySelector("h1");
              if (!pageTitle) return;
              pageTitle.setAttribute("tabindex", "-1");
              pageTitle.focus({ preventScroll: true });
            },
          });
        }, { signal: listeners.signal });
      });
    }

    // ── SHARED: Section titles char reveal ────────────────────
    var sectionTitles = document.querySelectorAll(".section-title");
    sectionTitles.forEach(function (title) {
      var titleChars = splitChars(title);
      gsap.from(titleChars, {
        yPercent: 100,
        opacity: 0,
        rotateX: -40,
        stagger: 0.035,
        duration: 0.8,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: title,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });
    });

    // ── SHARED: Work cards (home + works page) ────────────────
    var workCards = document.querySelectorAll(".work-card");
    if (workCards.length) {
      workCards.forEach(function (card, i) {
        gsap.from(card, {
          y: 80,
          opacity: 0,
          scale: 0.96,
          duration: 1,
          ease: "power4.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        });

        // Image parallax
        var img = card.querySelector(".work-image");
        if (img) {
          gsap.to(img, {
            yPercent: -12,
            ease: "none",
            scrollTrigger: {
              trigger: card,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }
      });
      initHoverUnderlines(workCards, listeners.signal);
    }

    // ── SHARED: Related work cards (case study pages) ─────────
    var relatedCards = document.querySelectorAll(".related-work-card");
    if (relatedCards.length) {
      gsap.from(relatedCards, {
        y: 60,
        opacity: 0,
        scale: 0.96,
        stagger: 0.15,
        duration: 0.9,
        ease: "power4.out",
        scrollTrigger: {
          trigger: relatedCards[0].closest(".related-projects-area") || relatedCards[0],
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
      initHoverUnderlines(relatedCards, listeners.signal);
      if (isCaseStudy) initRelatedCardInteractions(Array.from(relatedCards), listeners.signal);
    }

    // ==========================================================
    // HOME PAGE
    // ==========================================================
    if (isHome) {

      // ── HERO: Cinematic Timeline ─────────────────────────────
      var heroIntro = document.querySelector(".banner-left-wrap > p");
      var heroTitle = document.querySelector(".home-banner-title");
      var heroSubtitle = document.querySelector(".home-banner-subtitle");
      var heroStats = document.querySelectorAll(".home-banner-text strong");
      var heroDividers = document.querySelectorAll(".banner-left-wrap .home-work-divider-line");

      var heroTl = gsap.timeline({
        defaults: { ease: "power4.out", duration: 1.2 },
        delay: 0.2,
      });

      // "Hello there. This is"
      if (heroIntro) {
        heroTl.from(heroIntro, {
          opacity: 0,
          y: 20,
          duration: 0.7,
          ease: "power3.out",
        });
      }

      // Title — character reveal with 3D depth
      if (heroTitle) {
        var titleChars = splitChars(heroTitle);
        heroTl.from(titleChars, {
          yPercent: 120,
          rotateX: -80,
          opacity: 0,
          stagger: 0.04,
          duration: 1.4,
          transformOrigin: "0% 50% -50",
        }, heroIntro ? "-=0.5" : "0");
      }

      // Subtitle — clip-path wipe from left
      if (heroSubtitle) {
        heroTl.from(heroSubtitle, {
          clipPath: "inset(0 100% 0 0)",
          duration: 1,
          ease: "power3.inOut",
        }, "-=0.8");
      }

      // Stats — stagger fade-up
      if (heroStats.length) {
        heroTl.from(heroStats, {
          y: 25,
          opacity: 0,
          stagger: 0.1,
          duration: 0.7,
        }, "-=0.5");
      }

      // Divider lines — width grow
      if (heroDividers.length) {
        heroTl.from(heroDividers, {
          scaleX: 0,
          transformOrigin: "left center",
          stagger: 0.1,
          duration: 0.8,
          ease: "power3.inOut",
        }, "-=0.4");
      }

      // ── ABOUT: Word-by-word scrub ────────────────────────────
      var aboutText = document.querySelector(".large-text.black");
      if (aboutText) {
        var words = splitWords(aboutText);
        gsap.from(words, {
          opacity: 0.12,
          stagger: 0.02,
          scrollTrigger: {
            trigger: aboutText,
            start: "top 75%",
            end: "bottom 50%",
            scrub: 0.5,
          },
        });
      }

      // About video — scale + clip-path reveal
      var aboutVideo = document.querySelector(".home-about-video-wrap");
      if (aboutVideo) {
        gsap.from(aboutVideo, {
          clipPath: "inset(15%)",
          scale: 0.92,
          duration: 1.4,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: aboutVideo,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // ── SERVICES: Stagger + Magnetic ─────────────────────────
      var serviceItems = document.querySelectorAll(".service-item");
      if (serviceItems.length) {
        gsap.from(serviceItems, {
          y: 60,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: ".home-service-section",
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        });

        var serviceIcons = document.querySelectorAll(".home-service-icon-area");
        if (serviceIcons.length) {
          addMagneticEffect(Array.from(serviceIcons), 0.25, listeners.signal);
        }
      }

      // ── WORKS TITLE ("Works") ────────────────────────────────
      var worksTitle = document.querySelector(".home-work-image-text");
      if (worksTitle) {
        gsap.from(worksTitle, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power4.out",
          scrollTrigger: {
            trigger: worksTitle,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // ── EXPERIENCE: Awards cards stagger ─────────────────────
      var awardsCards = document.querySelectorAll(".awards-card");
      if (awardsCards.length) {
        awardsCards.forEach(function (card, i) {
          gsap.from(card, {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            delay: i * 0.12,
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          });
        });
      }

      // ── EXPERIENCE: Awards card title reveal ───────────────────
      var awardsTitles = document.querySelectorAll(".awards-card-title");
      awardsTitles.forEach(function (title) {
        var chars = splitChars(title);
        gsap.from(chars, {
          yPercent: 100,
          opacity: 0,
          stagger: 0.03,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: title,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        });
      });

      // ── EXPERIENCE: Awards video clip-path reveal ─────────────
      var awardsVideos = document.querySelectorAll(".awards-bg-video-wrap");
      awardsVideos.forEach(function (wrap) {
        gsap.from(wrap, {
          clipPath: "inset(12%)",
          duration: 1.4,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: wrap,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });
      });

      // ── ABOUT: Marquee area reveal ─────────────────────────────
      var marqueeArea = document.querySelector(".home-about-marquee-area");
      if (marqueeArea) {
        gsap.from(marqueeArea, {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: marqueeArea,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        });
      }
    }

    // ==========================================================
    // WORKS LISTING PAGE
    // ==========================================================
    if (isWorks) {

      var worksHeroTitle = document.querySelector(".home-banner-title");
      var worksHeroText = document.querySelector(".home-banner-text");

      var worksTl = gsap.timeline({
        defaults: { ease: "power4.out" },
        delay: 0.3,
      });

      if (worksHeroTitle) {
        var wChars = splitChars(worksHeroTitle);
        worksTl.from(wChars, {
          yPercent: 120,
          rotateX: -80,
          opacity: 0,
          stagger: 0.04,
          duration: 1.2,
          transformOrigin: "0% 50% -50",
        });
      }

      if (worksHeroText) {
        worksTl.from(worksHeroText, {
          y: 30,
          opacity: 0,
          duration: 0.8,
        }, "-=0.6");
      }
    }

    // ==========================================================
    // CASE STUDY PAGES (work/*.html)
    // ==========================================================
    if (isCaseStudy) {
      // ── Hero aperture + continuous signal rail ─────────────
      var csHero = document.querySelector(".banner-section:not(.w-condition-invisible)");
      var csBannerContent = csHero ? csHero.querySelector(".banner-content-wrap") : null;
      var csBannerTitle = document.querySelector(".banner-section:not(.w-condition-invisible) .banner-title");
      var csBannerCategory = document.querySelector(".banner-section:not(.w-condition-invisible) .work-category");
      var csBannerText = document.querySelector(".banner-section:not(.w-condition-invisible) .banner-text strong");
      var csRail = null;
      var csRailTrack = null;
      var csRailProgress = null;
      var csRailCount = null;

      if (caseStudyHeadings.length) {
        csRail = document.createElement("div");
        csRail.className = "case-motion-rail";
        csRail.setAttribute("aria-hidden", "true");

        csRailTrack = document.createElement("span");
        csRailTrack.className = "case-motion-rail__track";

        csRailProgress = document.createElement("span");
        csRailProgress.className = "case-motion-rail__progress";

        var csRailLabel = document.createElement("span");
        csRailLabel.className = "case-motion-rail__label";
        csRailLabel.textContent = "PROJECT FLOW";

        csRailCount = document.createElement("span");
        csRailCount.className = "case-motion-rail__count";
        csRailCount.textContent = "01 / " + String(caseStudyHeadings.length).padStart(2, "0");

        csRailTrack.appendChild(csRailProgress);
        csRail.appendChild(csRailTrack);
        csRail.appendChild(csRailLabel);
        csRail.appendChild(csRailCount);
        document.body.appendChild(csRail);
        gsap.set(csRailProgress, { scaleY: 0, transformOrigin: "top center" });
      }

      var csTl = gsap.timeline({
        defaults: { ease: "power4.out" },
        delay: 0.16,
      });

      if (csRail) {
        csTl.fromTo(csRail, {
          autoAlpha: 0,
          x: 14,
        }, {
          autoAlpha: 1,
          x: 0,
          duration: 0.72,
          ease: "power4.out",
        });
      }

      if (csRailTrack) {
        csTl.from(csRailTrack, {
          scaleY: 0,
          transformOrigin: "top center",
          duration: 1.05,
          ease: "expo.inOut",
        }, csRail ? "-=0.5" : 0);
      }

      if (csBannerContent) {
        csTl.fromTo(csBannerContent, {
          clipPath: "inset(0 49.85% 0 49.85%)",
        }, {
          clipPath: "inset(0 0% 0 0%)",
          duration: 1.25,
          ease: "expo.inOut",
          clearProps: "clipPath",
        }, csRailTrack ? "-=0.76" : 0);
      }

      if (csBannerCategory) {
        csTl.from(csBannerCategory, {
          y: 24,
          opacity: 0,
          duration: 0.65,
        }, csBannerContent ? "-=0.68" : 0);
      }

      if (csBannerTitle) {
        var csChars = splitChars(csBannerTitle);
        csTl.from(csChars, {
          yPercent: 115,
          rotateX: -68,
          opacity: 0,
          stagger: 0.028,
          duration: 1.05,
          transformOrigin: "0% 50% -50",
        }, "-=0.34");
      }

      if (csBannerText) {
        csTl.from(csBannerText, {
          y: 34,
          opacity: 0,
          duration: 0.78,
        }, "-=0.52");
      }

      // The hero yields to the story without pinning or changing layout height.
      if (csHero && csBannerContent) {
        gsap.to(csBannerContent, {
          yPercent: -7,
          scale: 0.985,
          opacity: 0.78,
          ease: "none",
          scrollTrigger: {
            trigger: csHero,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
      }

      // ── Numbered narrative chapters ─────────────────────────
      if (caseStudySummary) {
        caseStudyHeadings.forEach(function (heading, index) {
          gsap.from(heading, {
            x: index % 2 === 0 ? -34 : 34,
            opacity: 0,
            duration: 0.82,
            ease: "power4.out",
            scrollTrigger: {
              trigger: heading,
              start: "top 86%",
              toggleActions: "play none none none",
            },
          });

          if (csRailCount) {
            ScrollTrigger.create({
              trigger: heading,
              start: "top 52%",
              end: "bottom 52%",
              onEnter: function () {
                csRailCount.textContent = String(index + 1).padStart(2, "0") +
                  " / " + String(caseStudyHeadings.length).padStart(2, "0");
              },
              onEnterBack: function () {
                csRailCount.textContent = String(index + 1).padStart(2, "0") +
                  " / " + String(caseStudyHeadings.length).padStart(2, "0");
              },
            });
          }
        });

        if (csRailProgress) {
          gsap.to(csRailProgress, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: caseStudySummary,
              start: "top 58%",
              end: "bottom 70%",
              scrub: 0.55,
              invalidateOnRefresh: true,
            },
          });
        }

        var contentBlocks = Array.from(caseStudySummary.querySelectorAll("h3, p, ul, ol"))
          .filter(function (block) {
            return block.textContent.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").trim().length > 0;
          });
        contentBlocks.forEach(function (block) {
          gsap.from(block, {
            y: block.tagName === "H3" ? 32 : 24,
            opacity: 0,
            duration: block.tagName === "H3" ? 0.72 : 0.62,
            ease: "power3.out",
            scrollTrigger: {
              trigger: block,
              start: "top 91%",
              toggleActions: "play none none none",
            },
          });
        });
      }

      // ── Images open from the same central axis as the hero ──
      caseStudyFigures.forEach(function (figure) {
        var mask = figure.querySelector(".case-motion-figure__mask");
        var media = figure.querySelector(".case-motion-figure__media");
        if (!mask || !media) return;

        figure.classList.add("is-motion-pending");

        var figTl = gsap.timeline({
          scrollTrigger: {
            trigger: figure,
            start: "top 88%",
            toggleActions: "play none none none",
          },
          onComplete: function () {
            figure.classList.remove("is-motion-pending");
            figure.classList.add("is-motion-complete");
            gsap.set([mask, media], { clearProps: "willChange" });
          },
        });

        figTl.fromTo(mask, {
          clipPath: "inset(0 49.8% 0 49.8%)",
          willChange: "clip-path",
        }, {
          clipPath: "inset(0 0% 0 0%)",
          duration: 1.02,
          ease: "expo.inOut",
        });
        figTl.from(media, {
          scale: 1.07,
          willChange: "transform",
          duration: 1.15,
          ease: "power3.out",
        }, 0);

        gsap.fromTo(media, {
          yPercent: -2.2,
        }, {
          yPercent: 2.2,
          ease: "none",
          scrollTrigger: {
            trigger: figure,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        });
      });

      // ── Related projects CTA ────────────────────────────────
      var viewAllBtn = document.querySelector(".dark-button.projects");
      if (viewAllBtn) {
        viewAllBtn.classList.add("case-motion-button");
        if (!viewAllBtn.querySelector(".case-motion-button__label")) {
          var buttonLabel = document.createElement("span");
          buttonLabel.className = "case-motion-button__label";
          buttonLabel.textContent = viewAllBtn.textContent.trim();
          var buttonAccent = document.createElement("span");
          buttonAccent.className = "case-motion-button__accent";
          buttonAccent.setAttribute("aria-hidden", "true");
          viewAllBtn.textContent = "";
          viewAllBtn.appendChild(buttonLabel);
          viewAllBtn.appendChild(buttonAccent);
        }

        var viewAllLabel = viewAllBtn.querySelector(".case-motion-button__label");
        var viewAllAccent = viewAllBtn.querySelector(".case-motion-button__accent");
        gsap.set(viewAllAccent, { scaleX: 0, transformOrigin: "left center" });

        function activateViewAll() {
          gsap.to(viewAllBtn, { y: -3, duration: 0.36, ease: "power3.out" });
          gsap.to(viewAllLabel, { x: 3, duration: 0.36, ease: "power3.out" });
          gsap.to(viewAllAccent, { scaleX: 1, duration: 0.42, ease: "power4.out" });
        }

        function resetViewAll(event) {
          if (event && event.relatedTarget && viewAllBtn.contains(event.relatedTarget)) return;
          gsap.to(viewAllBtn, { y: 0, duration: 0.36, ease: "power3.out" });
          gsap.to(viewAllLabel, { x: 0, duration: 0.36, ease: "power3.out" });
          gsap.to(viewAllAccent, { scaleX: 0, duration: 0.34, ease: "power3.out" });
        }

        viewAllBtn.addEventListener("mouseenter", activateViewAll, { signal: listeners.signal });
        viewAllBtn.addEventListener("mouseleave", resetViewAll, { signal: listeners.signal });
        viewAllBtn.addEventListener("focusin", activateViewAll, { signal: listeners.signal });
        viewAllBtn.addEventListener("focusout", resetViewAll, { signal: listeners.signal });

        gsap.from(viewAllBtn, {
          y: 20,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: viewAllBtn,
            start: "top 92%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // Service divider line grow
      var divider = document.querySelector(".service-single-divider");
      if (divider) {
        gsap.from(divider, {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1,
          ease: "power3.inOut",
          scrollTrigger: {
            trigger: divider,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        });
      }

      caseCleanup = function () {
        if (csRail) csRail.remove();
        caseStudyFigures.forEach(function (figure) {
          var mask = figure.querySelector(".case-motion-figure__mask");
          var media = figure.querySelector(".case-motion-figure__media");
          var figureTargets = [mask, media].filter(Boolean);
          gsap.killTweensOf(figureTargets);
          if (mask) gsap.set(mask, { clearProps: "clipPath,willChange" });
          if (media) gsap.set(media, { clearProps: "transform,willChange" });
          figure.classList.remove("is-motion-pending", "is-motion-complete");
        });
        var relatedMotionTargets = document.querySelectorAll(
          ".related-work-card, .related-work-card .work-image, " +
          ".related-work-card .related-work-title, .related-work-card .work-category-text"
        );
        gsap.killTweensOf(relatedMotionTargets);
        gsap.set(relatedMotionTargets, { clearProps: "opacity,transform" });
        if (viewAllBtn) {
          viewAllBtn.classList.remove("case-motion-button");
          var viewAllTargets = [viewAllBtn, viewAllLabel, viewAllAccent].filter(Boolean);
          gsap.killTweensOf(viewAllTargets);
          gsap.set(viewAllTargets, { clearProps: "opacity,transform" });
        }
        document.querySelectorAll(".back-to-top-arrow-wrap img").forEach(function (arrow) {
          gsap.killTweensOf(arrow);
          gsap.set(arrow, { clearProps: "transform" });
        });
        document.querySelectorAll(".related-projects-area").forEach(function (area) {
          area.classList.remove("is-interacting");
        });
        document.querySelectorAll(".related-work-card.is-active").forEach(function (card) {
          card.classList.remove("is-active");
        });
      };
    }

    return function () {
      listeners.abort();
      if (caseCleanup) caseCleanup();
      // A mousemove tween may still be mid-flight when the breakpoint flips;
      // with its mouseleave listener gone the element would stay translated.
      magneticTargets.forEach(function (el) {
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: "x,y" });
      });
      magneticTargets.length = 0;
    };
  }); // end desktop

  // ============================================================
  // MOBILE (< 768px)
  // ============================================================
  mm.add("(max-width: 767px)", function () {
    var listeners = new AbortController();

    // ── Mobile hero: mini-timeline for coordinated entrance ────
    var mHeroTl = gsap.timeline({ delay: 0.15 });
    var mTitle = document.querySelector(".home-banner-title") ||
                 document.querySelector(".banner-section:not(.w-condition-invisible) .banner-title");
    var mSubtitle = document.querySelector(".home-banner-subtitle") ||
                    document.querySelector(".banner-section:not(.w-condition-invisible) .banner-text");
    var mCategory = document.querySelector(".banner-section:not(.w-condition-invisible) .work-category");

    if (mCategory) {
      mHeroTl.from(mCategory, { y: 15, opacity: 0, duration: 0.5, ease: "power3.out" });
    }
    if (mTitle) {
      mHeroTl.from(mTitle, { y: 35, opacity: 0, duration: 0.7, ease: "power3.out" }, mCategory ? "-=0.3" : 0);
    }
    if (mSubtitle) {
      mHeroTl.from(mSubtitle, { y: 20, opacity: 0, duration: 0.5, ease: "power3.out" }, "-=0.3");
    }

    // ── Titles: slightly more dramatic ────────────────────────
    var mTitles = document.querySelectorAll(".section-title, .summary h2, .summary h3");
    mTitles.forEach(function (el) {
      gsap.from(el, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none none" },
      });
    });

    // ── Cards: more y distance + stagger offset ───────────────
    var mCards = document.querySelectorAll(".work-card, .related-work-card, .awards-card");
    mCards.forEach(function (card) {
      gsap.from(card, {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: { trigger: card, start: "top 92%", toggleActions: "play none none none" },
      });
    });

    // ── Text + smaller elements ───────────────────────────────
    var mText = document.querySelectorAll(
      ".large-text.black, .service-item, .home-work-image-text, " +
      ".summary p, .summary ul, .summary ol, .home-banner-text"
    );
    mText.forEach(function (el) {
      gsap.from(el, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%", toggleActions: "play none none none" },
      });
    });

    // ── Images: clip-path even on mobile ──────────────────────
    var mImages = document.querySelectorAll(".w-richtext-figure-type-image, .home-about-video-wrap");
    mImages.forEach(function (fig) {
      gsap.from(fig, {
        clipPath: "inset(5%)",
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: fig, start: "top 90%", toggleActions: "play none none none" },
      });
    });

    // ── Back to top ───────────────────────────────────────────
    var backToTop = document.querySelectorAll(".back-to-top-wrap");
    backToTop.forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        lenis.scrollTo(0, { duration: 1.2 });
      }, { signal: listeners.signal });
    });

    return function () {
      listeners.abort();
    };
  }); // end mobile

})();
