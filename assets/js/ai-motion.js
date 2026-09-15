/** One native-scroll owner for the AI service pages' decorative artwork. */
(function () {
  "use strict";
  var root = document.querySelector("body.ai-page main[data-ai]");
  if (!root || window.PortfolioAiMotion) return;
  var hero = root.querySelector("[data-ai-hero]");
  var heroArt = hero && hero.querySelector("[data-ai-hero-art]");
  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var listeners = new AbortController();
  var resizeObserver, intersectionObserver, preferenceObserver;
  var frame = 0, destroyed = false, failed = false, pageHidden = false, near = true, painted = false;
  var currentMotion = false, currentMode = "flow";
  var owned = [];
  var original = { motion: root.getAttribute("data-ai-motion"), mode: root.getAttribute("data-ai-mode") };
  var api = window.PortfolioAiMotion = { state: "static", mode: "flow", progress: 0, refresh: request, destroy: destroy };

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function smooth(value) { value = clamp(value); return value * value * (3 - 2 * value); }
  function on(target, name, handler, options) {
    target.addEventListener(name, handler, Object.assign({ signal: listeners.signal }, options || {}));
  }
  function forcedReduced() {
    return reducedQuery.matches || document.documentElement.classList.contains("no-motion") ||
      Boolean(window.PortfolioMedia && window.PortfolioMedia.isReduced());
  }
  // Every write goes through a property owner that remembers the inline
  // original, so destroy() and reduced motion restore the stylesheet's state.
  function property(element, name) {
    if (!element) return function () {};
    var first = element.style.getPropertyValue(name), priority = element.style.getPropertyPriority(name), last = first;
    owned.push({ restore: function () {
      if (first) element.style.setProperty(name, first, priority); else element.style.removeProperty(name);
      last = first;
    } });
    return function (value) { if (value !== last) { element.style.setProperty(name, value); last = value; } };
  }
  var write = {
    heroDrift: property(heroArt, "--ai-hero-drift"), heroScale: property(heroArt, "--ai-hero-scale")
  };
  function resetProperties() { owned.forEach(function (item) { item.restore(); }); }
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
  function paint() {
    var reduced = forcedReduced(), enabled = !reduced;
    var cinematic = enabled && innerWidth >= 992 && innerHeight >= 700;
    var mode = cinematic ? "cinematic" : "flow";
    if (currentMotion !== enabled || !painted) {
      if (!enabled) resetProperties();
      root.dataset.aiMotion = enabled ? "on" : "off"; currentMotion = enabled;
    }
    if (currentMode !== mode || !painted) { root.dataset.aiMode = mode; currentMode = mode; }
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
