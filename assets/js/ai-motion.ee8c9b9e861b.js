/** The AI service pages' motion owner: it decides whether motion runs and in
 *  which mode, and keeps the ribbon counter with the camera. The movement
 *  itself is CSS scroll-driven animation (ai-integration.css), which the
 *  compositor runs; this script writes no transforms and no styles. */
(function () {
  "use strict";
  var root = document.querySelector("body.ai-page main[data-ai]");
  if (!root || window.PortfolioAiMotion) return;
  var pieces = root.querySelector("[data-ai-pieces]");
  var stage = pieces && pieces.querySelector("[data-ai-stage]");
  var journey = pieces && pieces.querySelector("[data-ai-journey]");
  var ribbon = pieces && pieces.querySelector("[data-ai-ribbon]");
  var count = pieces && pieces.querySelector(".ai-pieces-count span");
  var countFirst = count ? count.textContent : "", countShown = countFirst;
  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var listeners = new AbortController();
  var resizeObserver, intersectionObserver, preferenceObserver;
  var frame = 0, destroyed = false, failed = false, pageHidden = false, near = true, painted = false;
  var currentMotion = false, currentMode = "flow";
  var scrollDriven = Boolean(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));
  var original = { motion: root.getAttribute("data-ai-motion"), mode: root.getAttribute("data-ai-mode"), driver: root.getAttribute("data-ai-driver") };
  var api = window.PortfolioAiMotion = { state: "static", mode: "flow", driver: scrollDriven ? "css" : "none", progress: 0, camera: 0, refresh: request, destroy: destroy };

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function on(target, name, handler, options) {
    target.addEventListener(name, handler, Object.assign({ signal: listeners.signal }, options || {}));
  }
  function forcedReduced() {
    return reducedQuery.matches || document.documentElement.classList.contains("no-motion") ||
      Boolean(window.PortfolioMedia && window.PortfolioMedia.isReduced());
  }
  function showCount(index) {
    if (!count) return;
    var text = index ? "0" + index : countFirst;
    if (text !== countShown) { count.textContent = text; countShown = text; }
  }
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
      failed = true; stop(); showCount(0);
      root.dataset.aiMotion = "off"; root.dataset.aiMode = "flow"; api.state = "fallback"; api.mode = "flow";
    }
  }
  function paint() {
    var reduced = forcedReduced(), enabled = !reduced && scrollDriven;
    var cinematic = enabled && innerWidth >= 992 && innerHeight >= 740 && Boolean(stage);
    var mode = cinematic ? "cinematic" : "flow";
    if (currentMotion !== enabled || !painted) {
      root.dataset.aiMotion = enabled ? "on" : "off"; root.dataset.aiDriver = api.driver; currentMotion = enabled;
    }
    if (currentMode !== mode || !painted) { root.dataset.aiMode = mode; currentMode = mode; }
    api.state = reduced ? "reduced" : enabled ? "active" : "static"; api.mode = mode;
    var height = Math.max(1, innerHeight);
    var rootBox = root.getBoundingClientRect();
    api.progress = clamp(-rootBox.top / Math.max(1, root.offsetHeight - height));
    if (!enabled) { showCount(0); api.camera = 0; painted = true; return; }
    // The counter reads the same journey the stylesheet's timelines read: the
    // pinned stage's scroll on a desktop, the ribbon's sticky run on a phone.
    if (cinematic) {
      var box = pieces.getBoundingClientRect();
      var p = clamp(-box.top / Math.max(1, pieces.offsetHeight - stage.offsetHeight));
      api.camera = p;
      showCount(p < .36 ? 1 : p < .64 ? 2 : 3);
    } else if (journey && ribbon && innerWidth < 992) {
      var run = journey.getBoundingClientRect();
      var hold = parseFloat(getComputedStyle(ribbon).top) || 0;
      var q = clamp((hold - run.top) / Math.max(1, run.height - ribbon.offsetHeight));
      api.camera = q;
      showCount(q < .34 ? 1 : q < .67 ? 2 : 3);
    } else { api.camera = 1; showCount(0); }
    painted = true;
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; stop(); listeners.abort();
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    if (preferenceObserver) preferenceObserver.disconnect();
    showCount(0);
    restoreAttribute(root, "data-ai-motion", original.motion);
    restoreAttribute(root, "data-ai-mode", original.mode);
    restoreAttribute(root, "data-ai-driver", original.driver);
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
  request();
})();
