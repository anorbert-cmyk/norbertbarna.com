/**
 * Portfolio media — muted, in-view autoplay independent of GSAP.
 * Posters and intrinsic geometry are present in HTML. Playback starts only
 * after device preferences, the session pause, and visibility are checked.
 */
(function () {
  "use strict";
  if (window.PortfolioMedia) return;

  var root = document.documentElement;
  var query = window.matchMedia("(prefers-reduced-motion: reduce)");
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  var hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  var storageKey = "portfolio-motion-paused";
  var userPaused = readPause();
  var suspended = false;
  var states = [];
  var stateByTarget = new WeakMap();
  var frame = 0;
  var hasObserver = typeof window.IntersectionObserver === "function";

  function readPause() {
    try { return window.sessionStorage.getItem(storageKey) === "1"; }
    catch (error) { return false; }
  }

  function deviceReduced() {
    return query.matches || Boolean(connection && connection.saveData);
  }

  function isReduced() {
    return userPaused || deviceReduced();
  }

  function setStatus(state, value) {
    state.video.setAttribute("data-media-state", value);
  }

  function visibilityTarget(video) {
    // Webflow background videos are absolutely centred well outside their
    // clipped frame. Their own rect is therefore not the user-visible surface.
    return video.closest(".w-background-video") || video;
  }

  function awardOn(card) {
    return card.matches(":hover, :focus-within") || card.classList.contains("is-award-on");
  }

  function awardVisible(state) {
    // Decorative card fills. Decode only the hovered / focused / tapped card
    // so five 720p files do not start at once. Compact tap uses .is-award-on.
    return !state.award || awardOn(state.award);
  }

  function setAwardOn(card, on) {
    document.querySelectorAll(".awards-card.is-award-on").forEach(function (other) {
      if (!on || other !== card) other.classList.remove("is-award-on");
    });
    if (card) card.classList.toggle("is-award-on", Boolean(on));
    requestRefresh();
  }

  function shouldPlay(state) {
    return !isReduced() && !suspended && !document.hidden && state.visible &&
      !state.failed && awardVisible(state);
  }

  function stop(state) {
    if (state.pending || !state.video.paused) state.pauseGeneration += 1;
    state.video.autoplay = false;
    state.video.removeAttribute("autoplay");
    try { state.video.pause(); } catch (error) { /* No selected media yet. */ }
    if (!state.failed) setStatus(state, state.blocked ? "blocked" : "paused");
  }

  function start(state) {
    var video = state.video;
    if (!shouldPlay(state) || state.pending || state.blocked || !video.paused) return;
    state.pending = true;
    var generation = state.pauseGeneration;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.autoplay = true;
    setStatus(state, "loading");

    function settled(error) {
      state.pending = false;
      if (error) {
        // A controller pause normally rejects an in-flight play with AbortError.
        // A policy/codec rejection is retried only on an intentional gesture or
        // preference change, never in an interval or a repeated animation frame.
        if (error.name !== "AbortError" || generation === state.pauseGeneration) {
          state.blocked = true;
          video.autoplay = false;
          video.removeAttribute("autoplay");
        }
        if (error.name === "NotAllowedError" && !userPaused && !deviceReduced()) {
          // If the browser denies autoplay, the global switch must not claim
          // motion is on. Persist the safe state so one switch action can make
          // a deliberate retry, including after navigation or reload.
          setPaused(true);
        }
        if (!state.failed) setStatus(state, state.blocked ? "blocked" : "paused");
        if (!state.blocked && shouldPlay(state)) requestRefresh();
        return;
      }
      // Late resolution must not undo a scroll, tab hide, or a user pause.
      if (!shouldPlay(state)) stop(state);
      else setStatus(state, video.paused ? "paused" : "playing");
    }

    try {
      var result = video.play();
      if (result && typeof result.then === "function") {
        result.then(function () { settled(null); }, settled);
      } else settled(null);
    } catch (error) { settled(error); }
  }

  function reconcile(state) {
    if (isReduced() || suspended || document.hidden || !awardVisible(state)) {
      stop(state);
      return;
    }
    if (state.near && !state.warmed && !state.failed) {
      state.warmed = true;
      state.video.preload = "metadata";
    }
    if (shouldPlay(state)) start(state);
    else stop(state);
  }

  function measure(state) {
    var r = state.target.getBoundingClientRect();
    var style = window.getComputedStyle(state.target);
    var hasArea = r.width > 0 && r.height > 0 && style.visibility !== "hidden" &&
      style.visibility !== "collapse";
    state.visible = hasArea && r.bottom > 0 && r.top < window.innerHeight &&
      r.right > 0 && r.left < window.innerWidth;
    state.near = hasArea && r.bottom > -400 && r.top < window.innerHeight + 400 &&
      r.right > 0 && r.left < window.innerWidth;
  }

  function refresh() {
    frame = 0;
    states.forEach(function (state) { measure(state); reconcile(state); });
  }

  function requestRefresh() {
    if (!frame) frame = window.requestAnimationFrame(refresh);
  }

  function syncControls() {
    var reduced = isReduced();
    root.classList.toggle("no-motion", reduced);
    root.setAttribute("data-motion", reduced ? "off" : "on");
    document.querySelectorAll("[data-motion-toggle]").forEach(function (button) {
      button.hidden = false;
      button.disabled = deviceReduced();
      button.setAttribute("aria-checked", String(!reduced));
      button.title = deviceReduced()
        ? "Motion is off to respect your device's reduced-motion or data-saving setting."
        : "Turn automatic video and page motion on or off.";
      var label = button.querySelector("[data-motion-state]");
      if (label) label.textContent = reduced ? "Off" : "On";
    });
  }

  function notifyPreference() {
    syncControls();
    states.forEach(function (state) {
      if (!isReduced()) state.blocked = false;
      measure(state);
      reconcile(state);
    });
    window.dispatchEvent(new CustomEvent("portfolio:motionchange", {
      detail: { reduced: isReduced() }
    }));
  }

  function setPaused(paused) {
    userPaused = Boolean(paused);
    try {
      if (userPaused) window.sessionStorage.setItem(storageKey, "1");
      else window.sessionStorage.removeItem(storageKey);
    } catch (error) { /* Storage denial must not break playback or navigation. */ }
    notifyPreference();
  }

  window.PortfolioMedia = Object.freeze({
    isReduced: isReduced,
    setPaused: setPaused,
    refresh: requestRefresh
  });

  var nearObserver = hasObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var state = stateByTarget.get(entry.target);
      if (!state) return;
      state.near = entry.isIntersecting;
      reconcile(state);
    });
  }, { rootMargin: "400px 0px", threshold: 0 }) : null;

  var visibleObserver = hasObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var state = stateByTarget.get(entry.target);
      if (!state) return;
      state.visible = entry.isIntersecting && entry.intersectionRect.width > 0 &&
        entry.intersectionRect.height > 0;
      reconcile(state);
    });
  }, { threshold: [0, 0.01] }) : null;

  function init() {
    document.querySelectorAll("video[data-autoplay-video]").forEach(function (video) {
      var state = {
        video: video, target: visibilityTarget(video),
        award: video.closest(".awards-card"), visible: false,
        near: false, warmed: false, pending: false, blocked: false,
        failed: false, pauseGeneration: 0
      };
      states.push(state);
      stateByTarget.set(state.target, state);
      video.controls = false;
      video.removeAttribute("controls");
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("loop", "");
      video.autoplay = false;
      video.removeAttribute("autoplay");
      video.preload = "none";
      video.addEventListener("play", function () {
        if (!shouldPlay(state)) stop(state);
      });
      video.addEventListener("playing", function () {
        if (!shouldPlay(state)) stop(state);
        else setStatus(state, "playing");
      });
      video.addEventListener("canplay", function () { reconcile(state); });
      video.addEventListener("error", function () {
        state.failed = true;
        stop(state);
        setStatus(state, "error");
      });
      if (state.award) {
        if (!state.award.hasAttribute("tabindex")) state.award.setAttribute("tabindex", "0");
        state.award.addEventListener("pointerenter", function () { measure(state); reconcile(state); });
        state.award.addEventListener("pointerleave", function () {
          if (!state.award.classList.contains("is-award-on")) stop(state);
        });
        state.award.addEventListener("click", function (event) {
          if (hoverQuery.matches && event.pointerType !== "touch") return;
          setAwardOn(state.award, !state.award.classList.contains("is-award-on"));
        });
        state.award.addEventListener("keydown", function (event) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setAwardOn(state.award, !state.award.classList.contains("is-award-on"));
        });
      }
      measure(state);
      reconcile(state);
      if (nearObserver) nearObserver.observe(state.target);
      if (visibleObserver) visibleObserver.observe(state.target);
    });
    document.querySelectorAll("[data-motion-toggle]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (!deviceReduced()) setPaused(!userPaused);
      });
    });
    syncControls();
  }

  if (typeof query.addEventListener === "function") query.addEventListener("change", notifyPreference);
  else if (typeof query.addListener === "function") query.addListener(notifyPreference);
  if (connection && typeof connection.addEventListener === "function") {
    connection.addEventListener("change", notifyPreference);
  }
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pagehide", function () {
    suspended = true;
    states.forEach(stop);
  });
  window.addEventListener("pageshow", function () { suspended = false; refresh(); });
  window.addEventListener("resize", requestRefresh, { passive: true });
  window.addEventListener("orientationchange", requestRefresh, { passive: true });
  if (!hasObserver) window.addEventListener("scroll", requestRefresh, { passive: true });

  function retryBlocked(event) {
    if (isReduced() || (event.target instanceof Element &&
        event.target.closest("[data-motion-toggle]"))) return;
    states.forEach(function (state) {
      if (state.blocked && shouldPlay(state)) {
        state.blocked = false;
        start(state);
      }
    });
  }
  // Bounded recovery when a browser denies even muted autoplay. No Play overlay.
  document.addEventListener("click", retryBlocked, { passive: true });
  document.addEventListener("keydown", retryBlocked, { passive: true });

  syncControls();
  // Production loads this after main, before GSAP; missing/slow animation
  // libraries must not delay playback or the accessible motion preference.
  if (document.querySelector("main") || document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init, { once: true });
})();
