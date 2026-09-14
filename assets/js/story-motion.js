/** One native-scroll owner for About's decorative camera moves and chapter rail. */
(function () {
  "use strict";
  var root = document.querySelector("body.story-page main[data-story]");
  if (!root || window.PortfolioStoryMotion) return;
  var opening = root.querySelector('[data-story-scene="opening"]');
  var stage = opening && opening.querySelector("[data-story-stage]");
  if (!opening || !stage) return;
  var copy = opening.querySelector(".story-opening-copy");
  var copyParts = copy ? Array.from(copy.querySelectorAll("h1, .story-eyebrow, .story-opening-dek")) : [];
  var scenes = Array.from(root.querySelectorAll("[data-story-scene]"));
  var detail = root.querySelector('[data-story-scene="detail"]');
  var perspective = root.querySelector('[data-story-scene="perspective"]');
  var next = root.querySelector('[data-story-scene="next"]');
  var detailArt = detail && detail.querySelector("[data-story-art]");
  var perspectiveArt = perspective && perspective.querySelector("[data-story-art]");
  var line = next && next.querySelector("[data-story-line]");
  var steps = Array.from(document.querySelectorAll("[data-story-step]"));
  var toggle = root.querySelector("[data-story-motion-toggle]");
  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var listeners = new AbortController();
  var resizeObserver, intersectionObserver, preferenceObserver;
  var frame = 0, restoreFrame = 0, destroyed = false, failed = false, pageHidden = false, near = true;
  var locallyPaused = false, painted = false, currentMode = "flow", currentMotion = false, currentReflow = false;
  var owned = [], originalAttributes = {
    motion: root.getAttribute("data-story-motion"), mode: root.getAttribute("data-story-mode"), reflow: root.getAttribute("data-story-reflow")
  };
  var originalSteps = steps.map(function (step) { return step.getAttribute("aria-current"); });
  var originalToggle = toggle && {
    text: toggle.textContent, hidden: toggle.hidden, disabled: toggle.disabled,
    pressed: toggle.getAttribute("aria-pressed"), title: toggle.getAttribute("title")
  };
  var readingBlocks = scenes.filter(function (scene) { return scene !== opening; }).flatMap(function (scene) {
    return Array.from(scene.querySelectorAll("h2, h3, p, li"));
  });
  var api = window.PortfolioStoryMotion = {
    state: "static", mode: "flow", progress: 0, refresh: request, destroy: destroy
  };

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function smooth(value) { value = clamp(value); return value * value * (3 - 2 * value); }
  function on(target, name, handler, options) {
    target.addEventListener(name, handler, Object.assign({ signal: listeners.signal }, options || {}));
  }
  function forcedReduced() {
    return reducedQuery.matches || document.documentElement.classList.contains("no-motion") ||
      Boolean(window.PortfolioMedia && window.PortfolioMedia.isReduced());
  }
  function property(element, name) {
    if (!element) return function () {};
    var original = element.style.getPropertyValue(name), priority = element.style.getPropertyPriority(name);
    var last = original;
    var item = {
      restore: function () {
        if (original) element.style.setProperty(name, original, priority); else element.style.removeProperty(name);
        last = original;
      }
    };
    owned.push(item);
    return function (value) {
      if (value !== last) { element.style.setProperty(name, value); last = value; }
    };
  }
  var write = {
    progress: property(root, "--story-progress"), open: property(opening, "--story-open"),
    camera: property(opening, "--story-camera"), sculptureScale: property(opening, "--story-sculpture-scale"),
    sculptureY: property(opening, "--story-sculpture-y"), wingX: property(opening, "--story-wing-x"),
    wingScale: property(opening, "--story-wing-scale"), shade: property(opening, "--story-shade"),
    detailX: property(detailArt, "--story-detail-x"), detailScale: property(detailArt, "--story-detail-scale"),
    perspectiveY: property(perspectiveArt, "--story-perspective-y"),
    perspectiveRotate: property(perspectiveArt, "--story-perspective-rotate"), line: property(line, "--story-line")
  };
  function resetProperties() { owned.forEach(function (item) { item.restore(); }); }
  function restoreAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
  }
  function readingAnchor() {
    var focus = document.activeElement;
    if (focus && root.contains(focus) && !opening.contains(focus)) {
      var focusBox = focus.getBoundingClientRect();
      if (focusBox.bottom > 0 && focusBox.top < innerHeight) return { element: focus, top: focusBox.top };
    }
    for (var i = 0; i < readingBlocks.length; i++) {
      var box = readingBlocks[i].getBoundingClientRect();
      if (box.height && box.bottom > 90 && box.top < innerHeight) return { element: readingBlocks[i], top: box.top };
    }
    return null;
  }
  function keepReading(anchor) {
    if (!anchor || !anchor.element.isConnected) return;
    var shift = anchor.element.getBoundingClientRect().top - anchor.top;
    if (Math.abs(shift) > .5) window.scrollBy({ top: shift, left: 0, behavior: "instant" });
  }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function cancelRestore() { if (restoreFrame) cancelAnimationFrame(restoreFrame); restoreFrame = 0; }
  function restoreHistory(event) {
    pageHidden = false; request(); cancelRestore();
    var navigation = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var saved = history.state && history.state.nbStoryScroll;
    if (!saved || saved.url !== location.href || !Number.isFinite(saved.y) ||
        !(event.persisted || (navigation && navigation.type === "back_forward"))) return;
    // A restored hash can be aligned while the initial HTML still has its short
    // flow layout. Apply the saved entry only after the cinematic layout and the
    // browser's own fragment alignment have completed; normal anchors stay native.
    restoreFrame = requestAnimationFrame(function () {
      restoreFrame = requestAnimationFrame(function () {
        restoreFrame = 0;
        if (!destroyed && !failed && !pageHidden && !document.hidden && saved.url === location.href) {
          window.scrollTo({ top: saved.y, left: 0, behavior: "instant" }); request();
        }
      });
    });
  }
  function request() {
    if (!frame && !destroyed && !failed && !pageHidden && !document.hidden && near) frame = requestAnimationFrame(render);
  }
  function render() {
    frame = 0;
    if (destroyed || failed || pageHidden || document.hidden || !near) return;
    try { paint(); } catch (error) {
      failed = true; stop(); cancelRestore(); resetProperties();
      root.dataset.storyMotion = "off"; root.dataset.storyMode = "flow";
      api.state = "fallback"; api.mode = "flow";
      if (toggle) { toggle.disabled = true; toggle.textContent = "Motion unavailable"; }
    }
  }
  function paint() {
    var reduced = forcedReduced(), enabled = !reduced && !locallyPaused;
    var rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    // Measure the live glyph blocks, excluding mode-dependent wrapper padding.
    // A viewport budget remains stable when the reflow CSS changes stage height.
    var copyHeight = copyParts.reduce(function (sum, part) { return sum + part.offsetHeight; }, 80);
    var reflow = rootFont > 20 || (copyParts.length > 0 && copyHeight > innerHeight * .65);
    var cinematic = enabled && !reflow && innerWidth >= 992 && innerHeight >= 700;
    var mode = cinematic ? "cinematic" : "flow";
    var anchor = painted && (currentMode !== mode || currentReflow !== reflow) ? readingAnchor() : null;
    if (currentMotion !== enabled || !painted) {
      if (!enabled) resetProperties();
      root.dataset.storyMotion = enabled ? "on" : "off";
      currentMotion = enabled;
    }
    if (currentReflow !== reflow || !painted) { root.toggleAttribute("data-story-reflow", reflow); currentReflow = reflow; }
    if (currentMode !== mode || !painted) { root.dataset.storyMode = mode; currentMode = mode; }
    keepReading(anchor);
    api.state = reduced ? "reduced" : locallyPaused ? "paused" : "active";
    api.mode = mode;
    if (toggle) {
      toggle.hidden = false; toggle.disabled = reduced;
      var label = reduced ? "Motion reduced" : locallyPaused ? "Resume motion" : "Pause motion";
      if (toggle.textContent !== label) toggle.textContent = label;
      toggle.setAttribute("aria-pressed", String(!enabled));
      toggle.title = reduced ? "Motion follows your device or site preference." : "Pause or resume the decorative camera movement.";
    }

    // Measure first, then write compositor-only properties. Reading elements
    // never receive transforms, opacity, split text, tabindex or scroll handlers.
    var height = Math.max(1, innerHeight), rootBox = root.getBoundingClientRect();
    var boxes = scenes.map(function (scene) { return scene.getBoundingClientRect(); });
    var openingBox = boxes[scenes.indexOf(opening)];
    var distance = cinematic ? opening.offsetHeight - stage.offsetHeight : opening.offsetHeight * .78;
    var open = clamp(-openingBox.top / Math.max(1, distance));
    var progress = clamp(-rootBox.top / Math.max(1, root.offsetHeight - height));
    api.progress = progress; write.progress(progress.toFixed(4));
    var activeStep = steps[0];
    steps.forEach(function (step) {
      var id = (step.getAttribute("href") || "").replace(/^#/, "");
      var index = scenes.findIndex(function (scene) { return scene.id === id; });
      if (index >= 0 && boxes[index].top <= height * .45) activeStep = step;
    });
    steps.forEach(function (step) {
      if (step === activeStep) {
        if (step.getAttribute("aria-current") !== "location") step.setAttribute("aria-current", "location");
      } else step.removeAttribute("aria-current");
    });
    if (enabled) {
      var travel = smooth(open), compact = !cinematic;
      write.open(open.toFixed(4));
      write.camera((1 + travel * (compact ? .12 : .35)).toFixed(4));
      write.sculptureScale((1 + travel * (compact ? .35 : 1.1)).toFixed(4));
      write.sculptureY((-travel * (compact ? 22 : 50)).toFixed(2) + "px");
      write.wingX((travel * (compact ? 5 : 12)).toFixed(3) + "%");
      write.wingScale((1 + travel * (compact ? .07 : .2)).toFixed(4));
      write.shade((travel * (compact ? .32 : .7)).toFixed(4));
      if (detailArt) {
        var detailBox = boxes[scenes.indexOf(detail)];
        var detailProgress = smooth((height - detailBox.top) / (height + detailBox.height));
        write.detailX(((detailProgress * 2 - 1) * (compact ? 3 : 6)).toFixed(3) + "%");
        write.detailScale("1.1");
      }
      if (perspectiveArt) {
        var perspectiveBox = boxes[scenes.indexOf(perspective)];
        var perspectiveProgress = smooth((height * .9 - perspectiveBox.top) / (height * .8 + perspectiveBox.height * .4));
        write.perspectiveY(((compact ? 16 : 32) - perspectiveProgress * (compact ? 26 : 52)).toFixed(2) + "px");
        write.perspectiveRotate((-5 * (1 - perspectiveProgress) * (compact ? .5 : 1)).toFixed(3) + "deg");
      }
      if (line) {
        var nextBox = boxes[scenes.indexOf(next)];
        write.line((.15 + smooth((height * .88 - nextBox.top) / Math.max(100, height * .45)) * .85).toFixed(4));
      }
    }
    painted = true;
  }
  function destroy() {
    if (destroyed) return;
    var anchor = readingAnchor();
    destroyed = true; stop(); cancelRestore(); listeners.abort();
    if (resizeObserver) resizeObserver.disconnect();
    if (intersectionObserver) intersectionObserver.disconnect();
    if (preferenceObserver) preferenceObserver.disconnect();
    resetProperties();
    restoreAttribute(root, "data-story-motion", originalAttributes.motion);
    restoreAttribute(root, "data-story-mode", originalAttributes.mode);
    restoreAttribute(root, "data-story-reflow", originalAttributes.reflow);
    steps.forEach(function (step, index) { restoreAttribute(step, "aria-current", originalSteps[index]); });
    if (toggle) {
      toggle.textContent = originalToggle.text; toggle.hidden = originalToggle.hidden; toggle.disabled = originalToggle.disabled;
      restoreAttribute(toggle, "aria-pressed", originalToggle.pressed); restoreAttribute(toggle, "title", originalToggle.title);
    }
    keepReading(anchor); api.state = "destroyed"; api.mode = "flow";
  }
  on(window, "scroll", request, { passive: true });
  on(window, "resize", request, { passive: true });
  on(window, "load", request, { once: true });
  on(window, "portfolio:arrivalend", request);
  on(window, "portfolio:motionchange", request);
  on(reducedQuery, "change", request);
  on(window, "pagehide", function () {
    try { history.replaceState(Object.assign({}, history.state, { nbStoryScroll: { url: location.href, y: scrollY } }), ""); } catch (error) {}
    pageHidden = true; stop(); cancelRestore();
  });
  on(window, "pageshow", restoreHistory);
  ["wheel", "touchstart", "pointerdown", "keydown", "hashchange"].forEach(function (name) {
    on(window, name, cancelRestore, { passive: true });
  });
  on(document, "visibilitychange", function () { if (document.hidden) { stop(); cancelRestore(); } else request(); });
  if (toggle) on(toggle, "click", function () { if (!forcedReduced()) { locallyPaused = !locallyPaused; request(); } });
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(request); resizeObserver.observe(root);
    scenes.forEach(function (scene) { resizeObserver.observe(scene); });
    if (copy) resizeObserver.observe(copy);
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
