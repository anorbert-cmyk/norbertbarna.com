/** One native-scroll owner for the AI service pages' decorative artwork. */
(function () {
  "use strict";
  var root = document.querySelector("body.ai-page main[data-ai]");
  if (!root || window.PortfolioAiMotion) return;
  var hero = root.querySelector("[data-ai-hero]");
  var heroArt = hero && hero.querySelector("[data-ai-hero-art]");
  var shape = root.querySelector("[data-ai-shape]");
  var shapeArt = shape && shape.querySelector("[data-ai-shape-art]");
  var pieces = root.querySelector("[data-ai-pieces]");
  var stage = pieces && pieces.querySelector("[data-ai-stage]");
  var ribbon = pieces && pieces.querySelector("[data-ai-ribbon]");
  var steps = pieces ? Array.from(pieces.querySelectorAll("[data-ai-step]")) : [];
  var work = pieces && pieces.querySelector("[data-ai-work]");
  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var listeners = new AbortController();
  var resizeObserver, intersectionObserver, preferenceObserver;
  var frame = 0, destroyed = false, failed = false, pageHidden = false, near = true, painted = false;
  var currentMotion = false, currentMode = "flow";
  var owned = [], camera = [], pan = [];
  var original = { motion: root.getAttribute("data-ai-motion"), mode: root.getAttribute("data-ai-mode") };
  var api = window.PortfolioAiMotion = { state: "static", mode: "flow", progress: 0, camera: 0, refresh: request, destroy: destroy };

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function smooth(value) { value = clamp(value); return value * value * (3 - 2 * value); }
  function ramp(value, from, to) { return smooth((value - from) / Math.max(1e-6, to - from)); }
  function on(target, name, handler, options) {
    target.addEventListener(name, handler, Object.assign({ signal: listeners.signal }, options || {}));
  }
  function forcedReduced() {
    return reducedQuery.matches || document.documentElement.classList.contains("no-motion") ||
      Boolean(window.PortfolioMedia && window.PortfolioMedia.isReduced());
  }
  // Every write goes through a property owner that remembers the inline
  // original, so destroy() and reduced motion restore the stylesheet's state.
  // The stylesheet's fallbacks are the finished board, never a hidden state.
  function property(element, name, group) {
    if (!element) return function () {};
    var first = element.style.getPropertyValue(name), priority = element.style.getPropertyPriority(name), last = first;
    var item = { restore: function () {
      if (first) element.style.setProperty(name, first, priority); else element.style.removeProperty(name);
      last = first;
    } };
    owned.push(item); if (group) group.push(item);
    return function (value) { if (value !== last) { element.style.setProperty(name, value); last = value; } };
  }
  var write = {
    heroDrift: property(heroArt, "--ai-hero-drift"), heroScale: property(heroArt, "--ai-hero-scale"),
    shapeY: property(shapeArt, "--ai-shape-y"), shapeRotate: property(shapeArt, "--ai-shape-rotate"),
    shapeFade: property(shapeArt, "--ai-shape-fade", camera),
    ribbonX: property(ribbon, "--ai-ribbon-x", camera), ribbonS: property(ribbon, "--ai-ribbon-s", camera),
    steps: steps.map(function (step) { return property(step, "--ai-step", camera); }),
    work: property(work, "--ai-work", camera),
    ribbonPan: property(ribbon, "--ai-ribbon-pan", pan)
  };
  function resetProperties() { owned.forEach(function (item) { item.restore(); }); }
  function resetCamera() { camera.forEach(function (item) { item.restore(); }); }
  function resetPan() { pan.forEach(function (item) { item.restore(); }); }
  function restoreAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
  }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function request() {
    if (!frame && !destroyed && !failed && !pageHidden && !document.hidden && near) frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (destroyed || failed || pageHidden || document.hidden || !near) return;
    try { paint(); } catch (error) {
      failed = true; stop(); resetProperties();
      root.dataset.aiMotion = "off"; root.dataset.aiMode = "flow"; api.state = "fallback"; api.mode = "flow";
    }
  }
  // The ribbon camera: where the lens looks along the ribbon (0..1) and how
  // close it is, as one scroll of the pinned stage unfolds.
  function lens(p) {
    var focus, scale = 1.45;
    if (p < .22) focus = .17;
    else if (p < .42) focus = .17 + ramp(p, .22, .42) * .33;
    else if (p < .5) focus = .5;
    else if (p < .7) focus = .5 + ramp(p, .5, .7) * .35;
    else if (p < .78) focus = .85;
    else { var out = ramp(p, .78, 1); focus = .85 - out * .35; scale = 1.45 - out * .45; }
    return { focus: focus, scale: scale };
  }
  function paint() {
    var reduced = forcedReduced(), enabled = !reduced;
    var cinematic = enabled && innerWidth >= 992 && innerHeight >= 740 && Boolean(stage);
    var mode = cinematic ? "cinematic" : "flow";
    if (currentMotion !== enabled || !painted) {
      if (!enabled) resetProperties();
      root.dataset.aiMotion = enabled ? "on" : "off"; currentMotion = enabled;
    }
    if (currentMode !== mode || !painted) {
      if (mode === "flow") resetCamera(); else resetPan();
      root.dataset.aiMode = mode; currentMode = mode;
    }
    api.state = reduced ? "reduced" : "active"; api.mode = mode;
    var height = Math.max(1, innerHeight);
    var rootBox = root.getBoundingClientRect();
    api.progress = clamp(-rootBox.top / Math.max(1, root.offsetHeight - height));
    if (!enabled) { painted = true; return; }
    // Measure first, then write compositor-only properties to artwork only.
    if (hero && heroArt) {
      var heroBox = hero.getBoundingClientRect();
      var leave = smooth(-heroBox.top / Math.max(1, heroBox.height));
      write.heroDrift((-leave * (cinematic ? 60 : 24)).toFixed(2) + "px");
      write.heroScale((1 + leave * (cinematic ? .06 : .03)).toFixed(4));
    }
    if (shape && shapeArt) {
      // The bars lean and settle as their section leaves, handing over to the
      // ribbon that opens the next stage in the same three materials.
      var shapeBox = shape.getBoundingClientRect();
      var gone = smooth(-shapeBox.top / Math.max(1, shapeBox.height));
      write.shapeY((gone * (cinematic ? 90 : 28)).toFixed(2) + "px");
      write.shapeRotate((-gone * (cinematic ? 9 : 3)).toFixed(3) + "deg");
      if (cinematic) write.shapeFade((1 - gone * .85).toFixed(4));
    }
    if (cinematic) {
      var piecesBox = pieces.getBoundingClientRect();
      var p = clamp(-piecesBox.top / Math.max(1, pieces.offsetHeight - stage.offsetHeight));
      api.camera = p;
      var look = lens(p);
      write.ribbonX(((.5 - look.focus) * look.scale * 100).toFixed(3) + "%");
      write.ribbonS(look.scale.toFixed(4));
      var arrivals = [ramp(p, .02, .16), ramp(p, .36, .5), ramp(p, .64, .78)];
      write.steps.forEach(function (set, index) { set(arrivals[index].toFixed(4)); });
      write.work(ramp(p, .84, .98).toFixed(4));
    } else {
      api.camera = 1;
      if (ribbon && innerWidth < 992) {
        // The compact window pans from the green start to the olive end as
        // the section crosses the viewport; the fallback shows the start.
        var box = pieces.getBoundingClientRect();
        var travel = smooth((height * .9 - box.top) / Math.max(1, height * .9 + box.height * .55));
        write.ribbonPan((-travel * 56).toFixed(3) + "%");
      }
    }
    painted = true;
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; stop(); listeners.abort();
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    if (preferenceObserver) preferenceObserver.disconnect();
    resetProperties();
    restoreAttribute(root, "data-ai-motion", original.motion);
    restoreAttribute(root, "data-ai-mode", original.mode);
    api.state = "destroyed"; api.mode = "flow";
  }
  on(window, "scroll", request, { passive: true });
  on(window, "resize", request, { passive: true });
  on(window, "load", request, { once: true });
  on(window, "portfolio:motionchange", request);
  on(reducedQuery, "change", request);
  on(window, "pagehide", function () { pageHidden = true; stop(); });
  on(window, "pageshow", function () { pageHidden = false; request(); });
  on(document, "visibilitychange", function () { if (document.hidden) stop(); else request(); });
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(request); resizeObserver.observe(root);
  }
  if (typeof IntersectionObserver === "function") {
    intersectionObserver = new IntersectionObserver(function (entries) {
      near = entries.some(function (entry) { return entry.isIntersecting; });
      if (near) request(); else stop();
    }, { rootMargin: "100px 0px" });
    intersectionObserver.observe(root);
  }
  if (typeof MutationObserver === "function") {
    preferenceObserver = new MutationObserver(request);
    preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  }
  root.querySelectorAll("img").forEach(function (img) { if (!img.complete) on(img, "load", request, { once: true }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request, request);
  request();
})();
