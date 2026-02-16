/**
 * Norbert Barna Portfolio — Premium GSAP Animations
 *
 * Dependencies (loaded via CDN before this file):
 *   - Lenis (smooth scroll)
 *   - GSAP 3.12+ (core)
 *   - GSAP ScrollTrigger
 *   - GSAP Flip
 *
 * Structure:
 *   1. Accessibility check
 *   1. Lenis smooth scroll init
 *   1. Utility functions (text splitting, magnetic cursor)
 *   1. Desktop animations (full suite)
 *   1. Mobile animations (simplified)
 */

(function () {
  "use strict";

  // ============================================================
  // ACCESSIBILITY: Skip all animations if user prefers reduced motion
  // ============================================================
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Make everything visible immediately
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
  const lenis = new Lenis({
    duration: 1.2,
    easing: function (t) {
      return Math.min(1, 1.001 - Math.pow(2, -10 * t));
    },
    smooth: true,
    smoothTouch: false,
  });

  // Connect Lenis to GSAP ScrollTrigger
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ============================================================
  // UTILITY: Text Splitter (split text into lines/words/chars)
  // ============================================================
  function splitText(element, type) {
    if (!element) return [];
    var text = element.textContent;
    var html = "";

    if (type === "chars") {
      for (var i = 0; i < text.length; i++) {
        var char = text[i];
        if (char === " ") {
          html += '<span class="split-char" style="display:inline-block">&nbsp;</span>';
        } else {
          html += '<span class="split-char" style="display:inline-block">' + char + "</span>";
        }
      }
    } else if (type === "words") {
      var words = text.split(" ");
      for (var j = 0; j < words.length; j++) {
        html += '<span class="split-word" style="display:inline-block">' + words[j] + "</span>";
        if (j < words.length - 1) html += " ";
      }
    }

    element.innerHTML = html;
    return element.querySelectorAll(type === "chars" ? ".split-char" : ".split-word");
  }

  // ============================================================
  // UTILITY: Magnetic Cursor Effect
  // ============================================================
  function addMagneticEffect(elements, strength) {
    strength = strength || 0.3;
    elements.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, {
          x: x * strength,
          y: y * strength,
          duration: 0.6,
          ease: "power3.out",
        });
      });
      el.addEventListener("mouseleave", function () {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: "elastic.out(1, 0.3)",
        });
      });
    });
  }

  // ============================================================
  // RESPONSIVE ANIMATIONS
  // ============================================================
  var mm = gsap.matchMedia();

  // ============================================================
  // DESKTOP ANIMATIONS (768px+)
  // ============================================================
  mm.add("(min-width: 768px)", function () {

    // ----------------------------------------------------------
    // HERO: Cinematic Page Load Timeline
    // ----------------------------------------------------------
    var heroTl = gsap.timeline({
      defaults: { ease: "power4.out", duration: 1.2 },
      delay: 0.3,
    });

    // Nav items slide in
    var navLinks = document.querySelectorAll(".nav-link");
    if (navLinks.length) {
      heroTl.from(navLinks, {
        yPercent: -100,
        opacity: 0,
        stagger: 0.06,
        duration: 0.8,
      });
    }

    // Hero title — character reveal
    var heroTitle = document.querySelector(".home-banner-title");
    if (heroTitle) {
      var chars = splitText(heroTitle, "chars");
      heroTl.from(
        chars,
        {
          yPercent: 120,
          rotateX: -80,
          opacity: 0,
          stagger: 0.02,
          duration: 1.4,
          transformOrigin: "0% 50% -50",
        },
        "-=0.6"
      );
    }

    // Hero subtitle — clip-path wipe
    var heroSubtitle = document.querySelector(".home-banner-subtitle");
    if (heroSubtitle) {
      heroTl.from(
        heroSubtitle,
        {
          clipPath: "inset(0 100% 0 0)",
          duration: 1,
          ease: "power3.inOut",
        },
        "-=0.8"
      );
    }

    // Hero stats — stagger fade up
    var heroStats = document.querySelectorAll(".home-banner-text strong");
    if (heroStats.length) {
      heroTl.from(
        heroStats,
        {
          y: 30,
          opacity: 0,
          stagger: 0.1,
          duration: 0.8,
        },
        "-=0.6"
      );
    }

    // ----------------------------------------------------------
    // ABOUT SECTION: Scroll Reveals
    // ----------------------------------------------------------
    var aboutText = document.querySelector(".large-text.black");
    if (aboutText) {
      var words = splitText(aboutText, "words");
      gsap.from(words, {
        opacity: 0.15,
        stagger: 0.02,
        duration: 0.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: aboutText,
          start: "top 80%",
          end: "bottom 60%",
          scrub: 0.5,
        },
      });
    }

    // About video reveal
    var aboutVideo = document.querySelector(".home-about-video-wrap");
    if (aboutVideo) {
      gsap.from(aboutVideo, {
        clipPath: "inset(20%)",
        scale: 0.9,
        duration: 1.4,
        ease: "power3.inOut",
        scrollTrigger: {
          trigger: aboutVideo,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
    }

    // ----------------------------------------------------------
    // SERVICES GRID: Stagger Reveal
    // ----------------------------------------------------------
    var serviceItems = document.querySelectorAll(".service-item");
    if (serviceItems.length) {
      gsap.from(serviceItems, {
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: {
          trigger: ".home-service-section",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      // Magnetic effect on service icons
      var serviceIcons = document.querySelectorAll(".home-service-icon-area");
      if (serviceIcons.length) {
        addMagneticEffect(Array.from(serviceIcons), 0.25);
      }
    }

    // Section titles — reveal
    var sectionTitles = document.querySelectorAll(".section-title");
    sectionTitles.forEach(function (title) {
      var titleChars = splitText(title, "chars");
      gsap.from(titleChars, {
        yPercent: 100,
        opacity: 0,
        rotateX: -60,
        stagger: 0.02,
        duration: 0.8,
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: title,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    });

    // ----------------------------------------------------------
    // WORKS SECTION: Card Reveals + Image Parallax
    // ----------------------------------------------------------
    var workCards = document.querySelectorAll(".work-card");
    workCards.forEach(function (card) {
      // Card reveal
      gsap.from(card, {
        y: 80,
        opacity: 0,
        scale: 0.95,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      // Inner image parallax
      var img = card.querySelector(".work-image");
      if (img) {
        gsap.to(img, {
          yPercent: -15,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }

      // Title underline on hover
      var titleLine = card.querySelector(".work-title-line");
      if (titleLine) {
        card.addEventListener("mouseenter", function () {
          gsap.to(titleLine, { width: "100%", duration: 0.4, ease: "power2.out" });
        });
        card.addEventListener("mouseleave", function () {
          gsap.to(titleLine, { width: "0%", duration: 0.3, ease: "power2.in" });
        });
      }
    });

    // ----------------------------------------------------------
    // PROFESSIONAL EXPERIENCE: Awards Cards
    // ----------------------------------------------------------
    var awardsCards = document.querySelectorAll(".awards-card");
    if (awardsCards.length) {
      gsap.from(awardsCards, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: ".awards-card-wrap",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });
    }

    // ----------------------------------------------------------
    // FOOTER: Back to Top Magnetic
    // ----------------------------------------------------------
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

  }); // end desktop mm

  // ============================================================
  // MOBILE ANIMATIONS (< 768px)
  // ============================================================
  mm.add("(max-width: 767px)", function () {

    // Simple fade-in reveals for all major sections
    var mobileRevealElements = document.querySelectorAll(
      ".home-banner-title, .home-banner-subtitle, .home-banner-text, " +
      ".large-text.black, .service-item, .work-card, .awards-card, .section-title"
    );

    mobileRevealElements.forEach(function (el) {
      gsap.from(el, {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    });

    // Back to top — smooth scroll (no magnetic on mobile)
    var backToTop = document.querySelectorAll(".back-to-top-wrap");
    backToTop.forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        lenis.scrollTo(0, { duration: 1.2 });
      });
    });

  }); // end mobile mm

})();
