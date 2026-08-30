/**
 * Norbert Barna Portfolio — stable GSAP motion system
 *
 * Motion contract:
 * - Webflow owns components (navigation); GSAP exclusively owns reveals.
 * - Desktop cinematic motion starts at 992px with a fine pointer.
 * - Tablet/mobile use native scrolling and restrained vertical reveals.
 * - Only transform and opacity are animated.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var portableViewport = window.matchMedia("(max-width: 991px), (hover: none), (pointer: coarse)");

  /** Stop Webflow IX2 so GSAP is the single owner of motion properties. */
  function disableWebflowInteractions() {
    try {
      if (window.Webflow && typeof window.Webflow.require === "function") {
        var ix2 = window.Webflow.require("ix2");
        if (ix2 && typeof ix2.destroy === "function") ix2.destroy();
      }
    } catch (error) {
      // A missing IX2 module must never make content disappear.
    }

    document.querySelectorAll("[data-w-id]").forEach(function (element) {
      element.style.removeProperty("opacity");
      element.style.removeProperty("transform");
      element.style.removeProperty("translate");
      element.style.removeProperty("rotate");
      element.style.removeProperty("scale");
      element.style.removeProperty("clip-path");
      element.style.removeProperty("will-change");
      element.removeAttribute("data-w-id");
    });
  }

  function pauseVideo(video) {
    video.removeAttribute("autoplay");
    try {
      video.pause();
    } catch (error) {
      // Some engines throw while media has no selected source.
    }
  }

  function syncWebflowVideoControl(video, control) {
    if (!control) return;
    var states = control.querySelectorAll(":scope > span");
    var isPaused = video.paused;
    control.setAttribute("aria-label", isPaused ? "Play background video" : "Pause background video");
    if (states[0]) states[0].hidden = isPaused;
    if (states[1]) states[1].hidden = !isPaused;
  }

  /** Continuous media is opt-in and never autoplayed on compact devices. */
  function enhanceVideoControls() {
    document.querySelectorAll("video").forEach(function (video, index) {
      var awardCard = video.closest(".awards-card");
      var webflowVideo = video.closest(".w-background-video");
      var webflowControl = webflowVideo
        ? webflowVideo.querySelector("[data-w-bg-video-control]")
        : null;

      if (portableViewport.matches) video.preload = "none";

      if (awardCard) {
        pauseVideo(video);
        video.preload = "none";

        if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          awardCard.addEventListener("pointerenter", function () {
            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
          });
          awardCard.addEventListener("pointerleave", function () {
            video.pause();
          });
          awardCard.addEventListener("focusin", function () {
            var playPromise = video.play();
            if (playPromise && typeof playPromise.catch === "function") playPromise.catch(function () {});
          });
          awardCard.addEventListener("focusout", function (event) {
            if (!event.relatedTarget || !awardCard.contains(event.relatedTarget)) video.pause();
          });
        }
        return;
      }

      if (webflowControl) {
        if (reducedMotion || portableViewport.matches) pauseVideo(video);
        syncWebflowVideoControl(video, webflowControl);
        video.addEventListener("play", function () {
          syncWebflowVideoControl(video, webflowControl);
        });
        video.addEventListener("pause", function () {
          syncWebflowVideoControl(video, webflowControl);
        });
        return;
      }

      if (!video.hasAttribute("autoplay") && !reducedMotion) return;

      pauseVideo(video);
      var host = video.closest(".kineticare-hero") ||
        video.closest(".kineticare-browser-frame") ||
        video.closest(".home-about-video-wrap") ||
        video.parentElement;
      if (!host || host.querySelector(":scope > .motion-video-toggle")) return;

      var button = document.createElement("button");
      button.type = "button";
      button.className = "motion-video-toggle";
      if (!video.id) video.id = "motion-video-" + (index + 1);
      button.setAttribute("aria-controls", video.id);
      button.textContent = "Play video";
      host.appendChild(button);

      function syncButton() {
        button.textContent = video.paused ? "Play video" : "Pause video";
        button.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
      }

      button.addEventListener("click", function () {
        if (video.paused) {
          var playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(syncButton);
          }
        } else {
          video.pause();
        }
      });
      video.addEventListener("play", syncButton);
      video.addEventListener("pause", syncButton);
      syncButton();
    });
  }

  disableWebflowInteractions();
  enhanceVideoControls();

  if (reducedMotion) {
    root.classList.add("no-motion");
    document.querySelectorAll("video").forEach(pauseVideo);
    return;
  }

  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("gsap-ready");
  ScrollTrigger.config({ ignoreMobileResize: true });

  var isHome = Boolean(document.querySelector(".home-about-section"));
  var isWorks = Boolean(document.querySelector(".work-section"));
  var isCaseStudy = Boolean(document.querySelector(".work-single-section"));
  var activeLenis = null;
  var lenisTicker = null;
  var refreshTimer = null;
  var lastViewportWidth = window.innerWidth;

  function requestLayoutRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      if (activeLenis && typeof activeLenis.resize === "function") activeLenis.resize();
      ScrollTrigger.refresh(true);
    }, 160);
  }

  window.addEventListener("load", requestLayoutRefresh, { once: true });
  window.addEventListener("orientationchange", requestLayoutRefresh);
  window.addEventListener("resize", function () {
    var nextWidth = window.innerWidth;
    if (Math.abs(nextWidth - lastViewportWidth) < 2) return;
    lastViewportWidth = nextWidth;
    requestLayoutRefresh();
  });

  document.querySelectorAll("img[loading='lazy']").forEach(function (image) {
    if (image.complete) return;
    image.addEventListener("load", requestLayoutRefresh, { once: true });
    image.addEventListener("error", requestLayoutRefresh, { once: true });
  });

  function startLenis() {
    if (typeof window.Lenis === "undefined") return function () {};

    activeLenis = new window.Lenis({
      duration: 0.92,
      easing: function (value) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * value));
      },
      smoothWheel: true,
      syncTouch: false,
      autoResize: true,
    });

    activeLenis.on("scroll", ScrollTrigger.update);
    lenisTicker = function (time) {
      if (activeLenis) activeLenis.raf(time * 1000);
    };
    gsap.ticker.add(lenisTicker);

    return function () {
      if (lenisTicker) gsap.ticker.remove(lenisTicker);
      lenisTicker = null;
      if (activeLenis && typeof activeLenis.destroy === "function") activeLenis.destroy();
      activeLenis = null;
      root.classList.remove("lenis", "lenis-smooth", "lenis-scrolling");
    };
  }

  function focusPageTitle() {
    var title = document.querySelector("h1");
    if (!title) return;
    title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
  }

  document.querySelectorAll(".back-to-top-wrap").forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      if (activeLenis) {
        activeLenis.scrollTo(0, { duration: 1.1, onComplete: focusPageTitle });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.setTimeout(focusPageTitle, 520);
      }
    });
  });

  var skipLink = document.querySelector(".skip-to-content");
  if (skipLink) {
    skipLink.addEventListener("click", function () {
      var target = document.querySelector(skipLink.getAttribute("href"));
      if (!target) return;
      window.setTimeout(function () {
        target.focus({ preventScroll: true });
      }, 0);
    });
  }

  var primaryNavigation = document.querySelector(".nav-menu");
  var menuButton = document.querySelector(".menu-button");
  if (primaryNavigation && menuButton) {
    if (!primaryNavigation.id) primaryNavigation.id = "primary-navigation";
    menuButton.setAttribute("aria-controls", primaryNavigation.id);
    menuButton.setAttribute("aria-label", "Open navigation");
  }

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
    root.classList.add("case-motion-ready");
  }

  function splitRevealWords(element) {
    if (!element) return { words: [], revert: function () {} };
    var original = element.innerHTML;

    function visit(node) {
      Array.from(node.childNodes).forEach(function (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          var fragment = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (token) {
            if (!token) return;
            if (/^\s+$/.test(token)) {
              fragment.appendChild(document.createTextNode(token));
              return;
            }
            var word = document.createElement("span");
            word.className = "split-reveal-word";
            word.textContent = token;
            fragment.appendChild(word);
          });
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          visit(child);
        }
      });
    }

    visit(element);
    var words = Array.from(element.querySelectorAll(".split-reveal-word"));
    return {
      words: words,
      revert: function () {
        gsap.killTweensOf(words);
        element.innerHTML = original;
      },
    };
  }

  function revealElement(element, options) {
    if (!element) return null;
    options = options || {};
    return gsap.from(element, {
      y: options.y === undefined ? 28 : options.y,
      opacity: 0,
      scale: options.scale === undefined ? 1 : options.scale,
      duration: options.duration === undefined ? 0.78 : options.duration,
      ease: options.ease || "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: options.trigger || element,
        start: options.start || "top 88%",
        once: true,
      },
    });
  }

  function revealCollection(elements, trigger, options) {
    elements = Array.from(elements || []);
    if (!elements.length) return null;
    options = options || {};
    return gsap.from(elements, {
      y: options.y === undefined ? 30 : options.y,
      opacity: 0,
      scale: options.scale === undefined ? 1 : options.scale,
      stagger: options.stagger === undefined ? 0.07 : options.stagger,
      duration: options.duration === undefined ? 0.78 : options.duration,
      ease: options.ease || "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: trigger || elements[0],
        start: options.start || "top 86%",
        once: true,
      },
    });
  }

  function revealWords(element, splits, options) {
    if (!element) return null;
    options = options || {};
    var split = splitRevealWords(element);
    splits.push(split);
    return gsap.from(split.words, {
      yPercent: options.yPercent === undefined ? 105 : options.yPercent,
      opacity: 0,
      rotateX: options.rotateX === undefined ? -28 : options.rotateX,
      transformOrigin: "0% 50% -30px",
      stagger: options.stagger === undefined ? 0.065 : options.stagger,
      duration: options.duration === undefined ? 0.9 : options.duration,
      ease: options.ease || "power4.out",
      scrollTrigger: options.scrollTrigger || undefined,
    });
  }

  function addCardHover(cards, signal) {
    Array.from(cards).forEach(function (card) {
      var media = card.querySelector(".work-image");
      var line = card.querySelector(".work-title-line");
      if (line) gsap.set(line, { scaleX: 0, transformOrigin: "0% 50%" });

      function enter() {
        if (media) gsap.to(media, { scale: 1.025, duration: 0.62, ease: "power3.out", overwrite: "auto" });
        if (line) gsap.to(line, { scaleX: 1, duration: 0.42, ease: "power3.out", overwrite: "auto" });
      }

      function leave(event) {
        if (event && event.relatedTarget && card.contains(event.relatedTarget)) return;
        if (media) gsap.to(media, { scale: 1, duration: 0.58, ease: "power3.out", overwrite: "auto" });
        if (line) gsap.to(line, { scaleX: 0, duration: 0.32, ease: "power2.out", overwrite: "auto" });
      }

      card.addEventListener("pointerenter", enter, { signal: signal });
      card.addEventListener("pointerleave", leave, { signal: signal });
      card.addEventListener("focusin", enter, { signal: signal });
      card.addEventListener("focusout", leave, { signal: signal });
    });
  }

  function createCaseRail() {
    if (!caseStudyHeadings.length) return null;
    var rail = document.createElement("div");
    rail.className = "case-motion-rail";
    rail.setAttribute("aria-hidden", "true");
    rail.innerHTML =
      '<span class="case-motion-rail__label">Project flow</span>' +
      '<span class="case-motion-rail__track"><span class="case-motion-rail__progress"></span></span>' +
      '<span class="case-motion-rail__count">01 / ' +
      String(caseStudyHeadings.length).padStart(2, "0") +
      "</span>";
    document.body.appendChild(rail);
    return rail;
  }

  function initDesktopMotion() {
    var listeners = new AbortController();
    var splits = [];
    var cleanupLenis = startLenis();
    var rail = null;
    var hoverTargets = [];

    var navigationTimeline = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.06 });
    var logo = document.querySelector(".nav-logo-wrap");
    var navLinks = document.querySelectorAll(".nav-link");
    if (logo) navigationTimeline.from(logo, { y: -14, opacity: 0, duration: 0.55, clearProps: "transform,opacity" });
    if (navLinks.length) {
      navigationTimeline.from(navLinks, {
        y: -12,
        opacity: 0,
        stagger: 0.055,
        duration: 0.52,
        clearProps: "transform,opacity",
      }, "-=0.34");
    }

    document.querySelectorAll(".section-title").forEach(function (title) {
      revealWords(title, splits, {
        stagger: 0.055,
        duration: 0.82,
        scrollTrigger: { trigger: title, start: "top 86%", once: true },
      });
    });

    var allCards = document.querySelectorAll(".work-card, .related-work-card");
    allCards.forEach(function (card) {
      revealElement(card, { y: 44, scale: 0.985, duration: 0.86, start: "top 88%" });
    });
    hoverTargets = Array.from(allCards);
    addCardHover(hoverTargets, listeners.signal);

    if (isHome) {
      var intro = document.querySelector(".banner-left-wrap > p");
      var title = document.querySelector(".home-banner-title");
      var subtitle = document.querySelector(".home-banner-subtitle");
      var stats = document.querySelector(".home-banner-text");
      var heroTimeline = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.1 });
      if (intro) heroTimeline.from(intro, { y: 16, opacity: 0, duration: 0.55, clearProps: "transform,opacity" });
      if (title) {
        var titleSplit = splitRevealWords(title);
        splits.push(titleSplit);
        heroTimeline.from(titleSplit.words, {
          yPercent: 108,
          opacity: 0,
          rotateX: -32,
          transformOrigin: "0% 50% -35px",
          stagger: 0.075,
          duration: 1.02,
        }, "-=0.28");
      }
      if (subtitle) heroTimeline.from(subtitle, { y: 24, opacity: 0, duration: 0.72, clearProps: "transform,opacity" }, "-=0.56");
      if (stats) heroTimeline.from(stats, { y: 18, opacity: 0, duration: 0.62, clearProps: "transform,opacity" }, "-=0.38");

      var aboutArea = document.querySelector(".home-about-area");
      if (aboutArea) revealCollection(aboutArea.children, aboutArea, { y: 34, stagger: 0.12, duration: 0.86 });
      var serviceGrid = document.querySelector(".home-service-grid");
      if (serviceGrid) {
        revealCollection(serviceGrid.querySelectorAll(".service-item"), serviceGrid, {
          y: 28,
          stagger: 0.075,
          duration: 0.72,
        });
      }
      revealElement(document.querySelector(".home-work-image-text"), { y: 38, scale: 0.98, duration: 0.92 });
      revealCollection(document.querySelectorAll(".awards-card"), document.querySelector(".awards-card-wrap"), {
        y: 30,
        stagger: 0.08,
        duration: 0.74,
      });
    }

    if (isWorks) {
      var worksTitle = document.querySelector(".home-banner-title");
      var worksText = document.querySelector(".home-banner-text");
      var worksTimeline = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.1 });
      if (worksTitle) {
        var worksSplit = splitRevealWords(worksTitle);
        splits.push(worksSplit);
        worksTimeline.from(worksSplit.words, {
          yPercent: 108,
          opacity: 0,
          rotateX: -30,
          stagger: 0.07,
          duration: 1,
        });
      }
      if (worksText) worksTimeline.from(worksText, { y: 22, opacity: 0, duration: 0.68, clearProps: "transform,opacity" }, "-=0.48");
    }

    if (isCaseStudy) {
      rail = createCaseRail();
      var hero = document.querySelector(".banner-section:not(.w-condition-invisible)");
      var category = hero ? hero.querySelector(".work-category") : null;
      var caseTitle = hero ? hero.querySelector(".banner-title") : null;
      var caseText = hero ? hero.querySelector(".banner-text") : null;
      var caseHeroTimeline = gsap.timeline({ defaults: { ease: "power4.out" }, delay: 0.1 });

      if (rail) caseHeroTimeline.from(rail, { opacity: 0, duration: 0.55, clearProps: "opacity" });
      if (category) caseHeroTimeline.from(category, { y: 16, opacity: 0, duration: 0.52, clearProps: "transform,opacity" }, "-=0.28");
      if (caseTitle) {
        var caseTitleSplit = splitRevealWords(caseTitle);
        splits.push(caseTitleSplit);
        caseHeroTimeline.from(caseTitleSplit.words, {
          yPercent: 108,
          opacity: 0,
          rotateX: -30,
          stagger: 0.06,
          duration: 1,
        }, "-=0.25");
      }
      if (caseText) caseHeroTimeline.from(caseText, { y: 24, opacity: 0, duration: 0.72, clearProps: "transform,opacity" }, "-=0.48");

      caseStudyHeadings.forEach(function (heading, index) {
        revealElement(heading, { y: 26, duration: 0.78, start: "top 86%" });
        if (!rail) return;
        var count = rail.querySelector(".case-motion-rail__count");
        ScrollTrigger.create({
          trigger: heading,
          start: "top 54%",
          end: "bottom 54%",
          onEnter: function () {
            count.textContent = String(index + 1).padStart(2, "0") + " / " + String(caseStudyHeadings.length).padStart(2, "0");
          },
          onEnterBack: function () {
            count.textContent = String(index + 1).padStart(2, "0") + " / " + String(caseStudyHeadings.length).padStart(2, "0");
          },
        });
      });

      if (rail && caseStudySummary) {
        gsap.fromTo(rail.querySelector(".case-motion-rail__progress"), { scaleY: 0 }, {
          scaleY: 1,
          transformOrigin: "50% 0%",
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

      document.querySelectorAll(".summary h3").forEach(function (heading) {
        revealElement(heading, { y: 22, duration: 0.7, start: "top 88%" });
      });

      caseStudyFigures.forEach(function (figure) {
        var media = figure.querySelector("img");
        var figureTimeline = gsap.timeline({
          scrollTrigger: { trigger: figure, start: "top 88%", once: true },
        });
        figureTimeline.from(figure, {
          y: 34,
          opacity: 0,
          duration: 0.9,
          ease: "power4.out",
          clearProps: "transform,opacity",
        });
        if (media) {
          figureTimeline.fromTo(media, { scale: 1.025 }, {
            scale: 1,
            duration: 1.05,
            ease: "power3.out",
            clearProps: "transform",
          }, 0);
        }
      });

      revealElement(document.querySelector(".service-single-divider"), { y: 0, duration: 0.72, start: "top 90%" });
      revealElement(document.querySelector(".dark-button.projects"), { y: 16, duration: 0.58, start: "top 92%" });
    }

    requestLayoutRefresh();

    return function () {
      listeners.abort();
      cleanupLenis();
      if (rail) rail.remove();
      hoverTargets.forEach(function (card) {
        var targets = [card.querySelector(".work-image"), card.querySelector(".work-title-line")].filter(Boolean);
        gsap.killTweensOf(targets);
        gsap.set(targets, { clearProps: "transform,opacity" });
      });
      splits.reverse().forEach(function (split) {
        split.revert();
      });
    };
  }

  function initPortableMotion() {
    var heroTitle = document.querySelector(".home-banner-title") ||
      document.querySelector(".banner-section:not(.w-condition-invisible) .banner-title");
    var heroCategory = document.querySelector(".banner-section:not(.w-condition-invisible) .work-category");
    var heroText = document.querySelector(".home-banner-subtitle") ||
      document.querySelector(".banner-section:not(.w-condition-invisible) .banner-text") ||
      document.querySelector(".home-banner-text");
    var heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.05 });

    if (heroCategory) heroTimeline.from(heroCategory, { y: 12, opacity: 0, duration: 0.42, clearProps: "transform,opacity" });
    if (heroTitle) heroTimeline.from(heroTitle, { y: 18, opacity: 0, duration: 0.62, clearProps: "transform,opacity" }, heroCategory ? "-=0.2" : 0);
    if (heroText) heroTimeline.from(heroText, { y: 14, opacity: 0, duration: 0.5, clearProps: "transform,opacity" }, "-=0.28");

    document.querySelectorAll(".section-title, .summary h2, .summary h3").forEach(function (heading) {
      revealElement(heading, { y: 16, duration: 0.54, start: "top 91%" });
    });
    document.querySelectorAll(".work-card, .related-work-card, .awards-card").forEach(function (card) {
      revealElement(card, { y: 18, duration: 0.56, start: "top 92%" });
    });

    if (isHome) {
      revealElement(document.querySelector(".home-about-area"), { y: 18, duration: 0.58, start: "top 90%" });
      revealCollection(document.querySelectorAll(".service-item"), document.querySelector(".home-service-grid"), {
        y: 16,
        stagger: 0.045,
        duration: 0.5,
        start: "top 90%",
      });
      revealElement(document.querySelector(".home-work-image-text"), { y: 18, duration: 0.58, start: "top 92%" });
    }

    caseStudyFigures.forEach(function (figure) {
      revealElement(figure, { y: 16, duration: 0.58, start: "top 92%" });
    });

    requestLayoutRefresh();
    return function () {};
  }

  var started = false;
  function startResponsiveMotion() {
    if (started) return;
    started = true;
    var matchMedia = gsap.matchMedia();
    matchMedia.add("(min-width: 992px) and (hover: hover) and (pointer: fine)", initDesktopMotion);
    matchMedia.add("(max-width: 991px)", initPortableMotion);
    matchMedia.add("(min-width: 992px) and (hover: none), (min-width: 992px) and (pointer: coarse)", initPortableMotion);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startResponsiveMotion, startResponsiveMotion);
    window.setTimeout(startResponsiveMotion, 900);
  } else {
    startResponsiveMotion();
  }
})();
