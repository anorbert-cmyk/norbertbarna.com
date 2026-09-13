/** Existing case title and media assemble once; native scroll settles the panel. */
(function () {
  "use strict";
  var header = document.querySelector(".case-study-header");
  if (!header || window.PortfolioCaseOpening || !window.gsap || !window.ScrollTrigger) return;
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  var media = header.querySelector(".case-hero-media, .kineticare-hero-bg");
  var heading = header.querySelector("h1");
  if (!media || !heading) return;
  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var listeners = new AbortController();
  var timeline = null, scrollContext = null, watchdog = 0, started = false, destroyed = false;
  var originalNodes = null, originalLabel = null, resizeTimer = 0;
  var navigation = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var historical = Boolean(location.hash || (navigation && navigation.type === "back_forward"));
  var variables = ["--case-enter-y", "--case-enter-angle", "--case-enter-scale", "--case-slice-a", "--case-slice-b", "--case-slice-c", "--case-slice-d"];
  var originals = variables.map(function (key) { return media.style.getPropertyValue(key); });
  media.classList.add("case-opening-media");
  var api = window.PortfolioCaseOpening = { state: "static", finish: finish, destroy: destroy };
  gsap.registerPlugin(ScrollTrigger);

  function reduced() {
    return reducedQuery.matches || document.documentElement.classList.contains("no-motion") ||
      Boolean(window.PortfolioMedia && window.PortfolioMedia.isReduced());
  }
  function on(target, event, handler, options) {
    target.addEventListener(event, handler, Object.assign({ signal: listeners.signal }, options || {}));
  }
  function restoreHeading() {
    if (!originalNodes) return;
    heading.replaceChildren(originalNodes);
    if (originalLabel === null) heading.removeAttribute("aria-label"); else heading.setAttribute("aria-label", originalLabel);
    originalNodes = null;
  }
  function splitHeading() {
    var text = heading.textContent;
    originalLabel = heading.getAttribute("aria-label"); originalNodes = document.createDocumentFragment();
    while (heading.firstChild) originalNodes.appendChild(heading.firstChild);
    heading.setAttribute("aria-label", text.trim());
    return Array.from(text).map(function (character) {
      var letter = document.createElement("span"); letter.className = "case-opening-letter";
      letter.setAttribute("aria-hidden", "true"); letter.textContent = character === " " ? "\u00a0" : character;
      heading.appendChild(letter); return letter;
    });
  }
  function clearEntrance() {
    clearTimeout(watchdog);
    if (timeline) { timeline.kill(); timeline = null; }
    variables.forEach(function (key, index) {
      if (originals[index]) media.style.setProperty(key, originals[index]); else media.style.removeProperty(key);
    });
    restoreHeading();
    header.setAttribute("data-case-opening", "settled");
    api.state = "settled";
  }
  function finish() { if (!destroyed) { started = true; clearEntrance(); } }
  function installScroll() {
    if (scrollContext) { scrollContext.revert(); scrollContext = null; }
    if (destroyed || reduced() || historical) return;
    scrollContext = gsap.matchMedia();
    scrollContext.add({ compact: "(max-width: 991px)", wide: "(min-width: 992px)" }, function (context) {
      var compact = context.conditions.compact;
      gsap.fromTo(media, {
        rotationX: compact ? 2 : 5, rotationY: compact ? 0 : -3,
        y: compact ? 4 : 10, scale: compact ? .988 : .98, transformPerspective: 1500,
      }, {
        rotationX: 0, rotationY: 0, y: 0, scale: 1, ease: "none",
        scrollTrigger: { trigger: header, start: "top top", end: function () { return "+=" + Math.min(220, Math.max(150, innerHeight * .24)); },
          scrub: .3, invalidateOnRefresh: true },
      });
    });
  }
  function start(event) {
    if (started || destroyed) return;
    var reason = event && event.detail && event.detail.reason;
    if (reduced() || historical || document.hidden || window.scrollY > 12 || (reason && reason !== "entered")) {
      finish(); return;
    }
    started = true;
    try {
      var letters = splitHeading();
      var compact = innerWidth <= 991;
      header.setAttribute("data-case-opening", "assembling"); api.state = "assembling";
      timeline = gsap.timeline({ onComplete: clearEntrance });
      timeline.fromTo(letters, { yPercent: 95, rotationX: -35, opacity: 0 }, {
        yPercent: 0, rotationX: 0, opacity: 1, duration: 1.5, stagger: .035, ease: "circ.out",
      }, .12);
      timeline.fromTo(media, { "--case-enter-y": compact ? "28px" : "60px", "--case-enter-angle": compact ? "7deg" : "13deg", "--case-enter-scale": ".92" }, {
        "--case-enter-y": "0px", "--case-enter-angle": "0deg", "--case-enter-scale": "1", duration: 2.3, ease: "circ.out",
      }, .2);
      ["a", "b", "c", "d"].forEach(function (slice, index) {
        var from = {}, to = { duration: 1.8, ease: "circ.out" };
        from["--case-slice-" + slice] = "0%"; to["--case-slice-" + slice] = "100%";
        timeline.fromTo(media, from, to, .2 + index * .14);
      });
      // Animation interruption or missing CSS must never leave concealed evidence.
      watchdog = setTimeout(finish, 2900);
    } catch (error) { finish(); }
  }
  function motionChange() {
    if (reduced()) finish();
    installScroll();
  }
  function destroy() {
    if (destroyed) return;
    clearEntrance(); destroyed = true; listeners.abort(); clearTimeout(resizeTimer);
    if (scrollContext) scrollContext.revert(); scrollContext = null;
    media.classList.remove("case-opening-media"); header.removeAttribute("data-case-opening");
    api.state = "destroyed";
  }
  on(window, "portfolio:arrivalstart", start);
  on(window, "portfolio:arrivalend", function (event) { if (!started) start(event); });
  on(window, "portfolio:motionchange", motionChange);
  on(reducedQuery, "change", motionChange);
  ["wheel", "touchmove", "keydown", "pointerdown"].forEach(function (event) {
    on(window, event, function () { if (api.state === "assembling") finish(); }, { capture: true, passive: true });
  });
  on(document, "visibilitychange", function () { if (document.hidden) finish(); });
  on(window, "pagehide", function () {
    finish(); if (scrollContext) scrollContext.revert(); scrollContext = null;
  });
  on(window, "pageshow", function (event) { if (event.persisted) { finish(); installScroll(); } });
  on(window, "resize", function () {
    if (api.state === "assembling") finish();
    clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 160);
  }, { passive: true });
  installScroll();
  function automaticStart() {
    requestAnimationFrame(function () {
      if (!document.querySelector(".site-arrival") && !document.documentElement.classList.contains("arrival-active")) start();
    });
  }
  if (document.readyState === "loading") on(document, "DOMContentLoaded", automaticStart, { once: true });
  else automaticStart();
})();
