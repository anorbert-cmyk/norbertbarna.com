/**
 * Norbert Barna Portfolio — stable GSAP motion system
 *
 * Motion contract:
 * - Small native handlers own navigation and media; GSAP exclusively owns reveals.
 * - Desktop cinematic motion starts at 992px with a fine pointer.
 * - Every viewport uses native scrolling; tablet/mobile use restrained reveals.
 * - Only transform and opacity are animated.
 */

(function () {
  "use strict";

  var root = document.documentElement;
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reducedMotion = window.PortfolioMedia ? window.PortfolioMedia.isReduced() : reducedMotionQuery.matches;
  var portableViewport = window.matchMedia("(max-width: 991px), (hover: none), (pointer: coarse)");

  var webflowMotionSelectors = [
    "[data-w-id]",
    ".home-about-content-wrap",
    ".home-about-marquee-area",
    ".home-about-marquee-wrap",
    ".home-about-video-wrap",
    ".home-service-title-area",
    ".service-item",
    ".home-work-card-wrap",
    ".home-work-image-text",
    ".home-work-title-wrap",
    ".w-layout-hflex",
    ".work-card",
    ".related-work-card",
    ".work-image",
    ".work-title-line",
    ".awards-card",
    ".awards-bg-video-wrap",
    ".awards-card-text",
    ".section-title",
    ".service-single-divider",
    ".related-service-title-area",
    ".back-to-top-wrap",
    ".back-to-top-arrow-wrap",
    ".summary h2",
    ".summary h3",
    ".summary figure",
    ".work-single-section .div-block > div",
  ];
  var webflowMotionElements = new Set();
  var activeMotionMedia = null;
  var motionRuntimeReady = false;

  function clearWebflowMotionState() {
    document.querySelectorAll(webflowMotionSelectors.join(",")).forEach(function (element) {
      webflowMotionElements.add(element);
    });

    webflowMotionElements.forEach(function (element) {
      [
        "opacity",
        "transform",
        "translate",
        "rotate",
        "scale",
        "filter",
        "clip-path",
        "will-change",
      ].forEach(function (property) {
        element.style.removeProperty(property);
      });

      if (element.matches(".work-title-line")) {
        element.style.removeProperty("width");
      }
      if (element.matches(".awards-card-text")) {
        element.style.removeProperty("color");
      }
      element.removeAttribute("data-w-id");
    });
  }

  /** Stop Webflow IX2 after its async init so GSAP is the single motion owner. */
  function disableWebflowInteractions() {
    try {
      if (window.Webflow && typeof window.Webflow.require === "function") {
        var ix2 = window.Webflow.require("ix2");
        if (ix2 && typeof ix2.destroy === "function") ix2.destroy();
      }
    } catch (error) {
      // A missing IX2 module must never make content disappear.
    }

    clearWebflowMotionState();
  }

  function scheduleWebflowMotionTakeover() {
    return new Promise(function (resolve) {
      var resolved = false;

      function takeOwnership(finalCheckpoint) {
        disableWebflowInteractions();
        window.requestAnimationFrame(function () {
          // IX2 can write initial styles while its ready callback is unwinding.
          disableWebflowInteractions();
          if (finalCheckpoint && !resolved) {
            resolved = true;
            resolve();
          }
        });
      }

      if (window.Webflow && typeof window.Webflow.push === "function") {
        window.Webflow.push(function () {
          takeOwnership(false);
        });
      } else if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          takeOwnership(false);
        }, { once: true });
      } else {
        takeOwnership(false);
      }

      // A cold Webflow chunk can finish after DOM ready. Full load is the final
      // ownership checkpoint; GSAP cannot start until this cleanup has finished.
      if (document.readyState === "complete") {
        takeOwnership(true);
      } else {
        window.addEventListener("load", function () {
          takeOwnership(true);
        }, { once: true });
      }
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

  function enforceReducedMotion() {
    reducedMotion = true;
    started = false;
    root.classList.add("no-motion");
    root.classList.remove("gsap-ready");
    document.querySelectorAll("video").forEach(pauseVideo);
    if (activeMotionMedia) {
      activeMotionMedia.revert();
      activeMotionMedia = null;
    }
    document.querySelectorAll(".case-motion-rail").forEach(function (rail) {
      rail.remove();
    });
    if (window.ScrollTrigger && typeof window.ScrollTrigger.getAll === "function") {
      window.ScrollTrigger.getAll().forEach(function (trigger) {
        trigger.kill(true);
      });
    }
    if (window.gsap && window.gsap.globalTimeline &&
        typeof window.gsap.globalTimeline.clear === "function") {
      window.gsap.globalTimeline.clear();
    }
    clearWebflowMotionState();
  }

  function handleReducedMotionChange(event) {
    reducedMotion = window.PortfolioMedia ? window.PortfolioMedia.isReduced() : event.matches;
    if (reducedMotion) {
      enforceReducedMotion();
    } else {
      root.classList.remove("no-motion");
      // Resume only after the same ownership/font checkpoints as initial load.
      if (webflowMotionReady && motionRuntimeReady) {
        webflowMotionReady.then(function () {
          var fonts = document.fonts && document.fonts.ready;
          if (fonts) fonts.then(startResponsiveMotion, startResponsiveMotion);
          else startResponsiveMotion();
        });
      }
    }
  }

  window.addEventListener("portfolio:motionchange", function (event) {
    handleReducedMotionChange({ matches: event.detail.reduced });
  });

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }

  // Media is owned by the independent media.js controller.

  function focusPageTitle() {
    var title = document.querySelector("h1");
    if (!title) return;
    title.setAttribute("tabindex", "-1");
    title.focus({ preventScroll: true });
  }

  function setupNonMotionUi() {
    document.querySelectorAll(".back-to-top-wrap").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
        window.setTimeout(focusPageTitle, reducedMotion ? 0 : 520);
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

    initFooterDunes();
  }

  function initFooterDunes() {
    var field = document.querySelector("[data-footer-dunes]");
    if (!field) return;
    var layers = field.querySelectorAll("[data-depth]");
    if (!layers.length) return;
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    var x = 0;
    var y = 0;
    var targetX = 0;
    var targetY = 0;
    var frame = 0;

    function motionOff() {
      return window.PortfolioMedia ? window.PortfolioMedia.isReduced() : reducedMotion;
    }

    function resetLayers() {
      layers.forEach(function (layer) {
        layer.style.transform = "translate3d(0,0,0)";
      });
    }

    function tick() {
      frame = 0;
      if (motionOff() || !finePointer.matches) {
        resetLayers();
        return;
      }
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      layers.forEach(function (layer) {
        var depth = parseFloat(layer.getAttribute("data-depth")) || 0;
        layer.style.transform = "translate3d(" + (x * depth) + "px," + (y * depth) + "px,0)";
      });
      if (Math.abs(targetX - x) > 0.08 || Math.abs(targetY - y) > 0.08) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    function onMove(event) {
      if (motionOff() || !finePointer.matches) return;
      var rect = field.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 48;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 32;
      if (!frame) frame = window.requestAnimationFrame(tick);
    }

    function onLeave() {
      targetX = 0;
      targetY = 0;
      if (!frame) frame = window.requestAnimationFrame(tick);
    }

    var footer = field.closest("footer") || field;
    footer.addEventListener("pointermove", onMove);
    footer.addEventListener("pointerleave", onLeave);
    window.addEventListener("portfolio:motionchange", function () {
      if (motionOff()) {
        targetX = 0;
        targetY = 0;
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
        resetLayers();
      }
    });
  }

  setupNonMotionUi();
  var webflowMotionReady = scheduleWebflowMotionTakeover();

  if (reducedMotion) enforceReducedMotion();

  if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") return;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  motionRuntimeReady = true;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  var isHome = Boolean(document.querySelector(".home-about-section"));
  var isCaseStudy = Boolean(document.querySelector(".work-single-section"));
  var refreshTimer = null;
  var lastViewportWidth = window.innerWidth;

  function requestLayoutRefresh() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
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

  function lateRevealAlreadyPassed(element, start) {
    if (!element || window.scrollY < 2) return false;
    var match = String(start || "").match(/^(top|center|bottom)\s+(\d+(?:\.\d+)?)%$/);
    var rect = element.getBoundingClientRect();
    if (!match) return rect.bottom <= 0;
    var triggerPoint = rect.top;
    if (match[1] === "center") triggerPoint += rect.height / 2;
    else if (match[1] === "bottom") triggerPoint += rect.height;
    return triggerPoint <= window.innerHeight * Number(match[2]) / 100;
  }

  function revealElement(element, options) {
    if (!element) return null;
    options = options || {};
    var start = options.start || "top 88%";
    var trigger = options.trigger || element;
    if (lateRevealAlreadyPassed(trigger, start)) {
      gsap.set(element, { clearProps: "transform,opacity" });
      return null;
    }
    return gsap.from(element, {
      y: options.y === undefined ? 28 : options.y,
      opacity: 0,
      scale: options.scale === undefined ? 1 : options.scale,
      duration: options.duration === undefined ? 0.78 : options.duration,
      ease: options.ease || "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: trigger,
        start: start,
        once: true,
      },
    });
  }

  function revealCollection(elements, trigger, options) {
    elements = Array.from(elements || []);
    if (!elements.length) return null;
    options = options || {};
    var start = options.start || "top 86%";
    var collectionTrigger = trigger || elements[0];
    if (lateRevealAlreadyPassed(collectionTrigger, start)) {
      gsap.set(elements, { clearProps: "transform,opacity" });
      return null;
    }
    return gsap.from(elements, {
      y: options.y === undefined ? 30 : options.y,
      opacity: 0,
      scale: options.scale === undefined ? 1 : options.scale,
      stagger: options.stagger === undefined ? 0.07 : options.stagger,
      duration: options.duration === undefined ? 0.78 : options.duration,
      ease: options.ease || "power3.out",
      clearProps: "transform,opacity",
      scrollTrigger: {
        trigger: collectionTrigger,
        start: start,
        once: true,
      },
    });
  }

  function revealWords(element, splits, options) {
    if (!element) return null;
    options = options || {};
    if (options.scrollTrigger && lateRevealAlreadyPassed(
        options.scrollTrigger.trigger || element, options.scrollTrigger.start)) {
      gsap.set(element, { clearProps: "transform,opacity" });
      return null;
    }
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
        if (reducedMotion) return;
        if (media) gsap.to(media, { scale: 1.025, duration: 0.62, ease: "power3.out", overwrite: "auto" });
        if (line) gsap.to(line, { scaleX: 1, duration: 0.42, ease: "power3.out", overwrite: "auto" });
      }

      function leave(event) {
        if (event && event.relatedTarget && card.contains(event.relatedTarget)) return;
        if (reducedMotion) {
          var staticTargets = [media, line].filter(Boolean);
          gsap.killTweensOf(staticTargets);
          gsap.set(staticTargets, { clearProps: "transform,opacity" });
          return;
        }
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
    if (reducedMotion) return function () {};
    var listeners = new AbortController();
    var splits = [];
    var rail = null;
    var hoverTargets = [];

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

    if (isCaseStudy) {
      rail = createCaseRail();

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
        if (lateRevealAlreadyPassed(figure, "top 88%")) {
          gsap.set([figure, media].filter(Boolean), { clearProps: "transform,opacity" });
          return;
        }
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
    if (reducedMotion) return function () {};
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
    if (started || reducedMotion) return;
    started = true;
    root.classList.add("gsap-ready");
    activeMotionMedia = gsap.matchMedia();
    activeMotionMedia.add("(min-width: 992px) and (hover: hover) and (pointer: fine)", initDesktopMotion);
    activeMotionMedia.add("(max-width: 991px)", initPortableMotion);
    activeMotionMedia.add("(min-width: 992px) and (hover: none), (min-width: 992px) and (pointer: coarse)", initPortableMotion);
  }

  webflowMotionReady.then(function () {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startResponsiveMotion, startResponsiveMotion);
    } else {
      startResponsiveMotion();
    }
  });
})();
