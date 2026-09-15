/**
 * Norbert Barna Portfolio — stable GSAP motion system
 *
 * Motion contract:
 * - Small native handlers own navigation and media; GSAP owns reveals and decorative depth.
 * - Desktop cinematic motion starts at 992px with a fine pointer.
 * - Every viewport uses native scrolling; tablet/mobile add restrained decorative depth.
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
    stopFooterMeshField();
    clearWebflowMotionState();
  }

  function handleReducedMotionChange(event) {
    reducedMotion = window.PortfolioMedia ? window.PortfolioMedia.isReduced() : event.matches;
    if (reducedMotion) {
      enforceReducedMotion();
    } else {
      root.classList.remove("no-motion");
      startFooterMeshField();
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

    initFooterMeshField();
  }

  var MESH_POINTER_RANGE = 6.5;
  var MESH_IDLE_PX = 1.5;
  var MESH_IDLE_MS = 22000;
  var MESH_LERP = 0.12;
  var meshLayers = [];
  var meshRaf = 0;
  var meshStart = 0;
  var meshVisible = false;
  var meshHover = false;
  var meshTargetX = 0;
  var meshTargetY = 0;
  var meshCurX = 0;
  var meshCurY = 0;
  var meshFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function meshReduced() {
    return window.PortfolioMedia ? window.PortfolioMedia.isReduced() : reducedMotionQuery.matches;
  }

  function resetFooterMeshField() {
    meshTargetX = 0;
    meshTargetY = 0;
    meshCurX = 0;
    meshCurY = 0;
    meshHover = false;
    meshLayers.forEach(function (layer) {
      layer.el.style.transform = "";
    });
  }

  function stopFooterMeshField() {
    if (meshRaf) {
      cancelAnimationFrame(meshRaf);
      meshRaf = 0;
    }
    resetFooterMeshField();
  }

  function tickFooterMeshField(now) {
    meshRaf = 0;
    if (!meshMotionAllowed() || !meshVisible) {
      resetFooterMeshField();
      return;
    }
    var towardX = meshHover ? meshTargetX : 0;
    var towardY = meshHover ? meshTargetY : 0;
    meshCurX += (towardX - meshCurX) * MESH_LERP;
    meshCurY += (towardY - meshCurY) * MESH_LERP;
    meshLayers.forEach(function (layer) {
      var turn = ((now - meshStart) / (MESH_IDLE_MS * layer.period)) * Math.PI * 2;
      var idle = MESH_IDLE_PX * layer.idle;
      var x = meshCurX * layer.depth + Math.sin(turn) * idle;
      var y = meshCurY * layer.depth + Math.sin(turn * 0.79) * idle * 0.65;
      layer.el.style.transform = "translate(" + x.toFixed(2) + "px, " + y.toFixed(2) + "px)";
    });
    meshRaf = requestAnimationFrame(tickFooterMeshField);
  }

  function meshMotionAllowed() {
    return !meshReduced() && !portableViewport.matches;
  }

  function startFooterMeshField() {
    if (meshRaf || !meshMotionAllowed() || !meshVisible) return;
    if (!meshStart) meshStart = performance.now();
    meshRaf = requestAnimationFrame(tickFooterMeshField);
  }

  function initFooterMeshField() {
    var footer = document.querySelector("footer.footer-section");
    if (!footer) return;
    var navy = footer.querySelector(".footer-mesh-navy");
    var olives = footer.querySelectorAll(".footer-mesh-olive");
    var yellow = footer.querySelector(".footer-mesh-yellow");
    if (!navy || !yellow || olives.length === 0) return;

    meshLayers = [{ el: navy, depth: 0.3, idle: 0.7, period: 1.12 }];
    olives.forEach(function (el) {
      meshLayers.push({ el: el, depth: 0.55, idle: 0.9, period: 0.94 });
    });
    meshLayers.push({ el: yellow, depth: 0.92, idle: 1, period: 1 });

    footer.addEventListener("pointermove", function (event) {
      if (!meshFinePointer.matches || !meshMotionAllowed()) return;
      var rect = footer.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var nx = (event.clientX - rect.left) / rect.width - 0.5;
      var ny = (event.clientY - rect.top) / rect.height - 0.5;
      meshTargetX = nx * 2 * MESH_POINTER_RANGE;
      meshTargetY = ny * 2 * MESH_POINTER_RANGE * 0.72;
      meshHover = true;
      meshVisible = true;
      startFooterMeshField();
    });
    footer.addEventListener("pointerleave", function () {
      meshHover = false;
      meshTargetX = 0;
      meshTargetY = 0;
    });

    if (typeof portableViewport.addEventListener === "function") {
      portableViewport.addEventListener("change", function () {
        if (portableViewport.matches) stopFooterMeshField();
        else startFooterMeshField();
      });
    } else if (typeof portableViewport.addListener === "function") {
      portableViewport.addListener(function () {
        if (portableViewport.matches) stopFooterMeshField();
        else startFooterMeshField();
      });
    }

    if (typeof IntersectionObserver === "function") {
      var io = new IntersectionObserver(function (entries) {
        meshVisible = entries.some(function (entry) {
          return entry.isIntersecting;
        });
        if (meshVisible) startFooterMeshField();
        else stopFooterMeshField();
      }, { root: null, threshold: 0.01 });
      io.observe(footer);
    } else {
      meshVisible = true;
      startFooterMeshField();
    }
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

  function addWorkListMotion(signal, portable) {
    var list = document.querySelector(".work-list");
    if (!list) return function () {};
    var rows = Array.from(list.querySelectorAll(".work-row"));
    list.setAttribute("data-work-motion", portable ? "scroll" : "pointer");

    rows.forEach(function (row) {
      var image = row.querySelector(".work-row-thumb");
      var arrow = row.querySelector(".work-row-arrow");
      if (!image || !arrow) return;
      var hovered = false;
      var focused = row.contains(document.activeElement);
      var progress = { value: 0 };

      // One presentation timeline owns the actual elements. Input and scroll
      // only change a proxy; they never compete for an image/arrow property.
      gsap.set(image, { scale: 1, y: 0 });
      gsap.set(arrow, { x: 0 });
      var presentation = gsap.timeline({ paused: true, data: "work-list-motion" })
        .to(image, {
          scale: portable ? 1.04 : 1.06, y: portable ? -1 : -2,
          duration: 1, ease: "none", data: "work-list-motion",
        }, 0)
        .to(arrow, {
          x: portable ? 3 : 4, duration: 1, ease: "none", data: "work-list-motion",
        }, 0);

      function render() {
        if (signal.aborted || reducedMotion) return;
        presentation.progress(portable && focused ? 1 : progress.value);
      }

      var update;
      if (portable) {
        gsap.timeline({
          data: "work-list-motion",
          onUpdate: render,
          scrollTrigger: {
            trigger: row, start: "top 82%", end: "bottom 28%",
            scrub: 0.2, invalidateOnRefresh: true,
          },
        })
          .to(progress, { value: 1, duration: 0.5, ease: "none", data: "work-list-motion" })
          .to(progress, { value: 0, duration: 0.5, ease: "none", data: "work-list-motion" });
        // Focus holds the restrained peak while native scroll keeps updating
        // its own proxy. Releasing focus restores the current scroll position.
        update = render;
      } else {
        var enter = gsap.quickTo(progress, "value", {
          duration: 0.36, ease: "power3.out", onUpdate: render, data: "work-list-motion",
        });
        var leave = gsap.quickTo(progress, "value", {
          duration: 0.28, ease: "power2.out", onUpdate: render, data: "work-list-motion",
        });
        update = function () {
          var active = hovered || focused;
          (active ? leave : enter).tween.pause();
          (active ? enter : leave)(active ? 1 : 0, progress.value);
        };
        row.addEventListener("pointerenter", function (event) {
          if (event.pointerType === "touch" || reducedMotion) return;
          hovered = true;
          update();
        }, { signal: signal });
        row.addEventListener("pointerleave", function (event) {
          if (event.pointerType === "touch") return;
          hovered = false;
          update();
        }, { signal: signal });
      }

      row.addEventListener("focusin", function () {
        focused = true;
        update();
      }, { signal: signal });
      row.addEventListener("focusout", function (event) {
        if (event.relatedTarget && row.contains(event.relatedTarget)) return;
        focused = false;
        update();
      }, { signal: signal });
      if (focused) update();
    });

    return function () {
      // The containing matchMedia context reverts only its own animations and
      // ScrollTriggers; its AbortController removes all local input handlers.
      list.removeAttribute("data-work-motion");
    };
  }

  /** WebGL owns assembly and pointer response; native document scroll stays untouched. */
  function addHomeMastField() {
    return function () {};
  }

  /** A spacious statement resolves from separated words as the reader scrolls. */
  function addHomeStatement(splits) {
    var statement = document.querySelector('.home-banner-subtitle');
    if (!statement || window.PortfolioHomeMorph) return;
    var split = splitRevealWords(statement);
    splits.push(split);
    gsap.fromTo(split.words, {
      yPercent: 70,
      x: function (index) { return (index % 3 - 1) * 36; },
      rotationX: -36,
      transformPerspective: 800,
    }, {
      yPercent: 0, x: 0, rotationX: 0, stagger: .055, ease: 'power2.out',
      scrollTrigger: { trigger: statement, start: 'top 92%', end: 'bottom 55%', scrub: .45, invalidateOnRefresh: true },
    });
  }

  /** The small folded corner reveals once; copy and complete media stay still. */
  function addCaseOpening() {
    if (window.PortfolioCaseOpening) return;
    var fold = document.querySelector(".case-opening-fold");
    if (!fold || window.scrollY > 80 || location.hash) return;
    gsap.from(fold, {
      xPercent: 22, yPercent: -15, rotation: -8, opacity: 0,
      duration: .9, ease: "power3.out", clearProps: "transform,opacity",
    });
  }

  /** Complete media gently unfolds to the reading plane; no crop or scroll lock. */
  function addCaseMediaDepth(portable) {
    if (window.PortfolioCaseOpening) return;
    var header = document.querySelector(".case-study-header");
    var media = header && header.querySelector(".case-hero-media");
    if (!media) return; // Kineticare's single hand video keeps its media owner.
    gsap.fromTo(media, {
      rotationX: portable ? 3 : 7,
      rotationY: portable ? 0 : -5,
      scale: portable ? .985 : .965,
      y: portable ? 8 : 18,
      transformPerspective: 1100,
      transformOrigin: "50% 50%",
    }, {
      rotationX: 0, rotationY: 0, scale: 1, y: 0,
      ease: "none",
      scrollTrigger: {
        // A media-relative entry range may already be complete on tall screens.
        // The header instead owns a short scroll after its top reaches the viewport top.
        trigger: header, start: "top top",
        end: function () { return "+=" + Math.min(240, Math.max(160, window.innerHeight * .24)); },
        scrub: .4, invalidateOnRefresh: true,
      },
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

  // The shared page mark turns with native scroll: the resolved gate hands over
  // to the glass chevron and the chevron ends pointing down the page. Scroll
  // drives it, so it stops when the reader stops and never idles. Runs on every
  // viewport, phones included; reduced motion leaves the gate alone.
  function addPageMarkTurn() {
    var mark = document.querySelector(".page-chevron-mark");
    if (!mark || reducedMotion) return;
    var progress = { value: 0 };
    // A mark pinned to the top of the document leaves a phone screen in about
    // 130px, which is too fast to watch. Hold it against the scroll for the
    // length of the turn so it is actually seen, then let it travel away.
    function hold() { return Math.min(innerHeight * 0.32, 220); }
    function clamp01(value) { return Math.max(0, Math.min(1, value)); }
    function render() {
      var p = clamp01(progress.value);
      mark.style.setProperty("--page-mark", p.toFixed(3));
      mark.style.setProperty("--page-mark-y", (p * hold()).toFixed(2) + "px");
      mark.style.setProperty("--page-mark-rest", clamp01(1 - p * 4.5).toFixed(3));
      mark.style.setProperty("--page-mark-glass", clamp01(p * 5 - 0.9).toFixed(3));
    }
    gsap.timeline({
      data: "page-mark-turn",
      onUpdate: render,
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: function () { return hold(); },
        scrub: 0.3,
        invalidateOnRefresh: true,
      },
    }).to(progress, { value: 1, duration: 1, ease: "none", data: "page-mark-turn" });
    return function () {
      ["--page-mark", "--page-mark-y", "--page-mark-rest", "--page-mark-glass"]
        .forEach(function (name) { mark.style.removeProperty(name); });
    };
  }

  function initDesktopMotion() {
    if (reducedMotion) return function () {};
    var releasePageMark = addPageMarkTurn();
    var listeners = new AbortController();
    var splits = [];
    var rail = null;
    var hoverTargets = [];
    var removeWorkListMotion = null;
    var removeHomeMastField = null;

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
      addHomeStatement(splits);
      removeHomeMastField = addHomeMastField();
      removeWorkListMotion = addWorkListMotion(listeners.signal, false);
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
      addCaseOpening();
      addCaseMediaDepth(false);
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
          figureTimeline.fromTo(media, { scale: .98, rotationX: 5, transformPerspective: 1100 }, {
            rotationX: 0,
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
      if (releasePageMark) releasePageMark();
      if (removeHomeMastField) removeHomeMastField();
      if (removeWorkListMotion) removeWorkListMotion();
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
    var releasePageMark = addPageMarkTurn();
    var splits = [];
    var listeners = new AbortController();
    var removeWorkListMotion = null;
    var removeHomeMastField = null;
    if (isCaseStudy) { addCaseOpening(); addCaseMediaDepth(true); }
    document.querySelectorAll(".section-title, .summary h2, .summary h3").forEach(function (heading) {
      revealElement(heading, { y: 16, duration: 0.54, start: "top 91%" });
    });
    document.querySelectorAll(".work-card, .related-work-card, .awards-card").forEach(function (card) {
      revealElement(card, { y: 18, duration: 0.56, start: "top 92%" });
    });

    if (isHome) {
      addHomeStatement(splits);
      removeHomeMastField = addHomeMastField();
      removeWorkListMotion = addWorkListMotion(listeners.signal, true);
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
    return function () {
      listeners.abort();
      if (releasePageMark) releasePageMark();
      if (removeHomeMastField) removeHomeMastField();
      if (removeWorkListMotion) removeWorkListMotion();
      splits.reverse().forEach(function (split) { split.revert(); });
    };
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

  window.addEventListener("pagehide", function () {
    if (activeMotionMedia) activeMotionMedia.revert();
    activeMotionMedia = null;
    started = false;
    window.clearTimeout(refreshTimer);
  });
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) startResponsiveMotion();
  });

  webflowMotionReady.then(function () {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(startResponsiveMotion, startResponsiveMotion);
    } else {
      startResponsiveMotion();
    }
  });
})();
