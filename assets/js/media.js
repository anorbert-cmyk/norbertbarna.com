/**
 * Preference-aware, viewport-owned portfolio video playback.
 * No GSAP dependency and no per-video play overlays. One page-level motion
 * setting provides a persistent pause mechanism for continuous video.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  if (root.hasAttribute("data-media-ready")) return;
  var videos = Array.from(document.querySelectorAll("video[data-autoplay-video]"));
  if (!videos.length) return;

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var storageKey = "portfolio-video-motion";
  var preference = null;
  var suspended = false;
  var scheduled = false;
  try {
    var saved = sessionStorage.getItem(storageKey);
    if (saved === "on" || saved === "off") preference = saved;
  } catch (error) { /* Storage is optional in private/restricted contexts. */ }

  function motionAllowed() {
    return !motionQuery.matches && preference !== "off" &&
      (!(connection && connection.saveData) || preference === "on");
  }

  function intersects(element) {
    var rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 &&
      rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
  }

  var states = videos.map(function (video, index) {
    var card = video.closest(".awards-card");
    if (!video.id) video.id = "portfolio-video-" + (index + 1);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.controls = false;
    video.removeAttribute("controls");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    return {
      video: video,
      target: card || video,
      card: card,
      hovered: false,
      focused: false,
      inView: false,
      pending: false,
      blocked: false,
      failed: false,
      abortRetries: 0
    };
  });

  function shouldPlay(state) {
    return motionAllowed() && !document.hidden && !suspended && state.inView &&
      state.video.getClientRects().length > 0 &&
      (!state.card || state.hovered || state.focused);
  }

  function pause(state) {
    state.video.autoplay = false;
    try {
      if (!state.video.paused || state.pending) state.video.pause();
    } catch (error) { /* A source can be unavailable while navigating away. */ }
    if (!state.blocked && !state.failed) state.video.dataset.mediaState = "paused";
  }

  function play(state) {
    if (state.pending || state.blocked || state.failed) return;
    var video = state.video;
    video.muted = true;
    video.preload = "metadata";
    video.autoplay = true;
    if (!video.paused) return;
    state.pending = true;
    var promise;
    try { promise = video.play(); }
    catch (error) { rejected(error); return; }
    if (promise && typeof promise.then === "function") {
      promise.then(function () {
        state.pending = false;
        state.abortRetries = 0;
        if (!shouldPlay(state)) pause(state);
      }, rejected);
    } else {
      state.pending = false;
    }

    function rejected(error) {
      state.pending = false;
      video.autoplay = false;
      if (error && error.name === "AbortError") {
        // A fast viewport exit can abort a pending play. Re-evaluate once on
        // the next frame so a rapid re-entry is not left stuck on the poster.
        if (shouldPlay(state) && state.abortRetries < 2) {
          state.abortRetries += 1;
          window.requestAnimationFrame(function () { update(state); });
        }
        return;
      }
      state.blocked = !!error && error.name === "NotAllowedError";
      state.failed = !state.blocked;
      video.dataset.mediaState = state.blocked ? "blocked" : "error";
      // Keep the poster/caption. Never manufacture a successful-play state.
    }
  }

  function update(state) {
    if (shouldPlay(state)) play(state);
    else pause(state);
  }

  var controls = Array.from(document.querySelectorAll("[data-media-toggle]"));
  function syncControls() {
    var allowed = motionAllowed();
    root.dataset.videoMotion = allowed ? "automatic" : "paused";
    controls.forEach(function (button) {
      button.hidden = false;
      button.disabled = motionQuery.matches;
      button.textContent = allowed ? "Motion on" : "Motion off";
      button.setAttribute("aria-pressed", String(allowed));
      button.setAttribute("aria-label", motionQuery.matches ?
        "Motion off — disabled by your system preference" :
        (allowed ? "Motion on — pause page videos" : "Motion off — enable page videos"));
      button.setAttribute("aria-controls", videos.map(function (video) { return video.id; }).join(" "));
    });
  }

  function refresh() {
    syncControls();
    states.forEach(function (state) {
      var nextVisible = intersects(state.target);
      if (!state.inView && nextVisible) state.abortRetries = 0;
      state.inView = nextVisible;
      update(state);
    });
  }

  controls.forEach(function (button) {
    button.addEventListener("click", function () {
      if (motionQuery.matches) return;
      preference = motionAllowed() ? "off" : "on";
      try { sessionStorage.setItem(storageKey, preference); } catch (error) { /* Optional. */ }
      states.forEach(function (state) { state.blocked = false; state.abortRetries = 0; });
      refresh();
    });
  });

  states.forEach(function (state) {
    state.video.addEventListener("play", function () {
      if (!shouldPlay(state)) { pause(state); return; }
      state.video.dataset.mediaState = "playing";
    });
    state.video.addEventListener("error", function () {
      state.failed = true;
      state.video.dataset.mediaState = "error";
    });
    if (state.card) {
      state.card.addEventListener("pointerenter", function () { state.hovered = true; update(state); });
      state.card.addEventListener("pointerleave", function () { state.hovered = false; update(state); });
      state.card.addEventListener("focusin", function () { state.focused = true; update(state); });
      state.card.addEventListener("focusout", function (event) {
        if (event.relatedTarget && state.card.contains(event.relatedTarget)) return;
        state.focused = false;
        update(state);
      });
    }
  });

  if ("IntersectionObserver" in window) {
    var byTarget = new Map();
    states.forEach(function (state) { byTarget.set(state.target, state); });
    var visibility = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var state = byTarget.get(entry.target);
        if (!state) return;
        var nextVisible = entry.isIntersecting && entry.intersectionRatio > 0;
        if (!state.inView && nextVisible) state.abortRetries = 0;
        state.inView = nextVisible;
        update(state);
      });
    }, { threshold: [0, 0.01] });
    var warmup = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var state = byTarget.get(entry.target);
        if (state && entry.isIntersecting && motionAllowed()) state.video.preload = "metadata";
      });
    }, { rootMargin: "360px 0px" });
    states.forEach(function (state) { visibility.observe(state.target); warmup.observe(state.target); });
  } else {
    window.addEventListener("scroll", function () {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () { scheduled = false; refresh(); });
    }, { passive: true });
  }

  if (typeof motionQuery.addEventListener === "function") motionQuery.addEventListener("change", refresh);
  else if (typeof motionQuery.addListener === "function") motionQuery.addListener(refresh);
  if (connection && typeof connection.addEventListener === "function") connection.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("resize", refresh, { passive: true });
  window.addEventListener("pagehide", function () { suspended = true; states.forEach(pause); });
  window.addEventListener("pageshow", function () { suspended = false; refresh(); });
  root.setAttribute("data-media-ready", "");
  refresh();
})();
