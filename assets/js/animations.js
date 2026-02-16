/**
 * Norbert Barna Portfolio — Premium GSAP Animations
 *
 * Dependencies (loaded via CDN before this file):
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

  // ============================================================
  // UTILITY: Text Splitter
  // ============================================================
  function splitChars(el) {
    if (!el) return [];
    var text = el.textContent;
    var html = "";
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === " ") {
        html += '<span class="split-char" style="display:inline-block">&nbsp;</span>';
      } else {
        html +=
          '<span class="split-char" style="display:inline-block;will-change:transform">' +
          ch +
          "</span>";
      }
    }
    el.innerHTML = html;
    return el.querySelectorAll(".split-char");
  }

  function splitWords(el) {
    if (!el) return [];
    var text = el.textContent;
    el.innerHTML = text
      .split(/\s+/)
      .filter(function (w) { return w.length > 0; })
      .map(function (w) {
        return '<span class="split-word" style="display:inline-block">' + w + "</span>";
      })
      .join(" ");
    return el.querySelectorAll(".split-word");
  }

  // ============================================================
  // UTILITY: Magnetic Cursor Effect
  // ============================================================
  function addMagneticEffect(els, strength) {
    strength = strength || 0.3;
    els.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * strength;
        var y = (e.clientY - rect.top - rect.height / 2) * strength;
        gsap.to(el, { x: x, y: y, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.3)" });
      });
    });
  }

  // ============================================================
  // UTILITY: Hover underline on work cards
  // ============================================================
  function initHoverUnderlines(cards) {
    cards.forEach(function (card) {
      var line = card.querySelector(".work-title-line");
      if (!line) return;
      gsap.set(line, { transformOrigin: "left center", scaleX: 0 });
      card.addEventListener("mouseenter", function () {
        gsap.to(line, { scaleX: 1, duration: 0.4, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", function () {
        gsap.to(line, { scaleX: 0, duration: 0.3, ease: "power2.in" });
      });
    });
  }

  // ============================================================
  // DETECT PAGE TYPE
  // ============================================================
  var isHome = !!document.querySelector(".home-about-section");
  var isWorks = !!document.querySelector(".work-section");
  var isCaseStudy = !!document.querySelector(".work-single-section");

  // ============================================================
  // RESPONSIVE ANIMATIONS
  // ============================================================
  var mm = gsap.matchMedia();

  // ============================================================
  // DESKTOP (768px+)
  // ============================================================
  mm.add("(min-width: 768px)", function () {

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
      addMagneticEffect(Array.from(backToTop), 0.4);
      backToTop.forEach(function (el) {
        el.addEventListener("click", function (e) {
          e.preventDefault();
          lenis.scrollTo(0, { duration: 1.5 });
        });
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
      initHoverUnderlines(workCards);
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
      initHoverUnderlines(relatedCards);
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
          addMagneticEffect(Array.from(serviceIcons), 0.25);
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

      // Banner elements
      var csBannerTitle = document.querySelector(".banner-section:not(.w-condition-invisible) .banner-title");
      var csBannerCategory = document.querySelector(".banner-section:not(.w-condition-invisible) .work-category");
      var csBannerText = document.querySelector(".banner-section:not(.w-condition-invisible) .banner-text strong");

      var csTl = gsap.timeline({
        defaults: { ease: "power4.out" },
        delay: 0.3,
      });

      if (csBannerCategory) {
        csTl.from(csBannerCategory, {
          y: 20,
          opacity: 0,
          duration: 0.6,
        });
      }

      if (csBannerTitle) {
        var csChars = splitChars(csBannerTitle);
        csTl.from(csChars, {
          yPercent: 100,
          rotateX: -60,
          opacity: 0,
          stagger: 0.035,
          duration: 1.2,
          transformOrigin: "0% 50% -50",
        }, "-=0.3");
      }

      if (csBannerText) {
        csTl.from(csBannerText, {
          y: 30,
          opacity: 0,
          duration: 0.8,
        }, "-=0.6");
      }

      // Content section: richtext headings + paragraphs reveal
      var summaryContent = document.querySelector(".summary");
      if (summaryContent) {
        var contentBlocks = summaryContent.querySelectorAll("h2, h3, p, ul, ol, figure");
        contentBlocks.forEach(function (block) {
          gsap.from(block, {
            y: 40,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: block,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          });
        });
      }

      // Case study images — cinematic clip-path reveal
      var csImages = document.querySelectorAll(".w-richtext-figure-type-image");
      csImages.forEach(function (fig) {
        var img = fig.querySelector("img");
        if (!img) return;

        var figTl = gsap.timeline({
          scrollTrigger: {
            trigger: fig,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });

        figTl.from(fig, {
          clipPath: "inset(8% 4% 8% 4%)",
          duration: 1.2,
          ease: "power3.inOut",
        });
        figTl.from(img, {
          scale: 1.15,
          duration: 1.4,
          ease: "power2.out",
        }, 0);
      });

      // "Other projects" section title
      var relatedTitle = document.querySelector(".related-service-title-area .section-title");
      if (relatedTitle) {
        gsap.from(relatedTitle, {
          y: 30,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: relatedTitle,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        });
      }

      // "View all case studies" button
      var viewAllBtn = document.querySelector(".dark-button.projects");
      if (viewAllBtn) {
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
        addMagneticEffect([viewAllBtn], 0.15);
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
    }

  }); // end desktop

  // ============================================================
  // MOBILE (< 768px)
  // ============================================================
  mm.add("(max-width: 767px)", function () {

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
      });
    });

  }); // end mobile

})();
