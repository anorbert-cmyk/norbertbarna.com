/** KODE-inspired name assembly, driven by real page readiness and native input. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var isHome = document.body.classList.contains("home");
  var isCase = Boolean(document.querySelector(".case-study-header"));
  var navigation = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var curtain;
  var listeners;
  var watchdog;
  var exitWatchdog;
  var exitTween;
  var resizeFrame;
  var startedExit = false;
  var finished = false;
  var assemblyReady = false;
  var assetsReady = false;
  var restoreAfterExit = false;
  var api = { state: "skipped", progress: 0, finish: finish };
  window.PortfolioArrival = api;

  // Also cover same-site links opened in a new tab (without shared storage),
  // or a source page whose optional scripts failed. Referrer is only read;
  // no URL is persisted and native navigation is never intercepted.
  var internalNavigation = false;
  try {
    internalNavigation = new URL(document.referrer).origin === location.origin;
  } catch (error) { /* Direct arrivals have no referrer. */ }

  // A history/deep-link/active-reader visit goes straight to its existing position.
  if (internalNavigation || (!isHome && !isCase) || reduced.matches || root.classList.contains("no-motion") ||
      (window.PortfolioMedia && window.PortfolioMedia.isReduced()) || location.hash ||
      (navigation && navigation.type === "back_forward") || document.hidden || window.scrollY > 8 ||
      (document.activeElement && document.activeElement !== document.body && document.activeElement !== root) ||
      !window.gsap || !window.ScrollTrigger) return;
  try {
    var firstArrival = window.PortfolioVisit ? window.PortfolioVisit.firstArrival :
      !sessionStorage.getItem("nb-arrival-seen-v2");
    if (!firstArrival) return;
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
  } catch (error) { return; }

  root.classList.add("arrival-active");
  setState("assembling");
  listeners = new AbortController();
  curtain = document.createElement("div");
  curtain.className = "site-arrival" + (isCase ? " site-arrival--case" : "");
  curtain.setAttribute("role", "region");
  curtain.setAttribute("aria-label", "Introduction");
  curtain.innerHTML = '<div class="site-arrival__meter" aria-hidden="true"><span class="site-arrival__counter">000</span></div>' +
    '<div class="site-arrival__center"><p class="site-arrival__wordmark" aria-hidden="true"></p>' +
    '<button class="site-arrival__enter" type="button" hidden aria-label="Enter the portfolio">[ ENTER ]</button></div>' +
    '<p class="site-arrival__status" role="status" aria-live="polite">Preparing the portfolio. Press Escape or Tab to skip the introduction.</p>';
  var wordmark = curtain.querySelector(".site-arrival__wordmark");
  var counter = curtain.querySelector(".site-arrival__counter");
  var enter = curtain.querySelector(".site-arrival__enter");
  var status = curtain.querySelector(".site-arrival__status");
  "NORBERT.BARNA".split("").forEach(function (character, index) {
    var letter = document.createElement("span");
    letter.className = "site-arrival__letter";
    letter.style.setProperty("--letter-index", index);
    letter.style.setProperty("--slice-x", ((index % 5) - 2) * .22 + "em");
    letter.style.setProperty("--slice-y", (index % 2 ? -1 : 1) * (1 + (index % 3) * .24) + "em");
    letter.innerHTML = '<span class="site-arrival__measure">' + character + '</span>' +
      '<span class="site-arrival__slice site-arrival__slice--upper">' + character + '</span>' +
      '<span class="site-arrival__slice site-arrival__slice--lower">' + character + '</span>';
    wordmark.appendChild(letter);
  });
  document.body.appendChild(curtain);

  // A missing stylesheet must not create an unstyled introduction in the document.
  if (getComputedStyle(curtain).getPropertyValue("--arrival-fidelity").trim() !== "1") {
    finish("stylesheet-unavailable");
    return;
  }
  fitWordmark();

  function setState(state) {
    api.state = state;
    root.setAttribute("data-arrival-state", state);
    if (curtain) curtain.setAttribute("data-state", state);
  }
  function announceExit(reason) {
    if (startedExit) return;
    startedExit = true;
    window.dispatchEvent(new CustomEvent("portfolio:arrivalstart", { detail: { reason: reason } }));
  }
  function finish(reason) {
    if (finished || !curtain) return;
    finished = true;
    clearTimeout(watchdog);
    clearTimeout(exitWatchdog);
    cancelAnimationFrame(resizeFrame);
    if (exitTween) exitTween.kill();
    if (listeners) listeners.abort();
    announceExit(typeof reason === "string" ? reason : "skipped");
    var restoreFocus = restoreAfterExit || curtain.contains(document.activeElement);
    curtain.remove();
    root.classList.remove("arrival-active");
    root.removeAttribute("data-arrival-state");
    api.state = "finished";
    if (restoreFocus) {
      var target = document.querySelector("main h1") || document.querySelector("main") || document.querySelector(".navbar a");
      if (target) {
        var originalTabindex = target.getAttribute("tabindex");
        if (originalTabindex === null) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        if (originalTabindex === null) target.addEventListener("blur", function () {
          target.removeAttribute("tabindex");
        }, { once: true });
      }
    }
    window.dispatchEvent(new CustomEvent("portfolio:arrivalend", { detail: {
      reason: typeof reason === "string" ? reason : "skipped", progress: api.progress,
    } }));
  }
  function beginExit() {
    if (api.state !== "ready" || finished) return;
    restoreAfterExit = curtain.contains(document.activeElement);
    setState("exiting");
    enter.disabled = true;
    announceExit("entered");
    // Keep a bounded fallback if the optional animation runtime is interrupted.
    exitWatchdog = setTimeout(function () { finish("exit-timeout"); }, 1300);
    try {
      exitTween = window.gsap.to(curtain, {
        clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "power2.out",
        onComplete: function () { finish("entered"); },
      });
    } catch (error) { finish("animation-unavailable"); }
  }
  function revealEnter() {
    if (finished || !assemblyReady || !assetsReady) return;
    clearTimeout(watchdog);
    setState("ready");
    enter.hidden = false;
    status.textContent = "NORBERT.BARNA. The portfolio is ready. Press Enter to continue, or Escape or Tab to skip.";
  }
  function fitWordmark() {
    if (finished) return;
    var currentSize = parseFloat(getComputedStyle(wordmark).fontSize);
    var width = wordmark.getBoundingClientRect().width;
    if (width > 0 && Number.isFinite(currentSize)) {
      var desired = window.innerWidth * (window.innerWidth <= 767 ? .88 : .49);
      curtain.style.setProperty("--arrival-word-size", currentSize * desired / width + "px");
    }
  }
  function imageReady(image) {
    if (image.complete && image.naturalWidth === 0) return Promise.reject(new Error("Hero image failed"));
    if (typeof image.decode === "function") return image.decode();
    if (image.complete) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      image.addEventListener("load", resolve, { once: true, signal: listeners.signal });
      image.addEventListener("error", reject, { once: true, signal: listeners.signal });
    });
  }

  enter.addEventListener("click", beginExit, { signal: listeners.signal });
  window.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && api.state === "ready") {
      event.preventDefault();
      beginExit();
    } else if (event.key === "Escape" || event.key === "Tab" || api.state !== "exiting") {
      finish("keyboard");
    }
  }, { capture: true, signal: listeners.signal });
  // Keep the curtain in place through pointerup and the touch compatibility click.
  // Removing it on pointerdown can retarget that click to a covered link beneath it.
  curtain.addEventListener("click", function (event) {
    if (!enter.contains(event.target)) {
      event.preventDefault();
      finish("pointer");
    }
  }, { capture: true, signal: listeners.signal });
  window.addEventListener("touchmove", function () { finish("gesture"); }, { capture: true, passive: true, signal: listeners.signal });
  window.addEventListener("wheel", function () { finish("wheel"); }, { capture: true, passive: true, signal: listeners.signal });
  window.addEventListener("focusin", function (event) {
    if (!curtain.contains(event.target)) finish("focus");
  }, { signal: listeners.signal });
  window.addEventListener("pagehide", function () { finish("pagehide"); }, { once: true, signal: listeners.signal });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) finish("hidden");
  }, { signal: listeners.signal });
  reduced.addEventListener("change", function (event) {
    if (event.matches) finish("reduced-motion");
  }, { signal: listeners.signal });
  window.addEventListener("portfolio:motionchange", function (event) {
    if (event.detail && event.detail.reduced) finish("reduced-motion");
  }, { signal: listeners.signal });
  window.addEventListener("resize", function () {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(fitWordmark);
  }, { passive: true, signal: listeners.signal });

  // The visible percentage counts completed prerequisites, never elapsed time.
  var prerequisites = [];
  if (document.fonts) {
    prerequisites.push(Promise.all([document.fonts.ready, document.fonts.load('700 96px "Inter"')]).then(fitWordmark));
  }
  document.querySelectorAll(".case-study-header img.case-hero-shot, .home-mast img[data-hero-critical]").forEach(function (image) {
    prerequisites.push(imageReady(image));
  });
  document.querySelectorAll(".case-study-header video[poster]").forEach(function (video) {
    var poster = new Image();
    poster.src = video.poster;
    prerequisites.push(imageReady(poster));
  });
  if (window.PortfolioHeroScene && window.PortfolioHeroScene.ready) {
    prerequisites.push(Promise.resolve(window.PortfolioHeroScene.ready).then(function (result) {
      if (result && result.status && result.status !== "ready" && result.status !== "fallback") {
        throw new Error("Hero scene failed");
      }
    }));
  }
  var completed = 0;
  function completedPrerequisite() {
    if (finished) return;
    completed += 1;
    api.progress = Math.round(completed / prerequisites.length * 100);
    counter.textContent = String(api.progress).padStart(3, "0");
    curtain.style.setProperty("--arrival-progress", api.progress / 100);
  }
  Promise.all(prerequisites.map(function (prerequisite) {
    return prerequisite.then(completedPrerequisite);
  })).then(function () {
    if (finished) return;
    // With no asynchronous prerequisites the document itself is already ready.
    if (!prerequisites.length) {
      api.progress = 100;
      counter.textContent = "100";
      curtain.style.setProperty("--arrival-progress", "1");
    }
    assetsReady = true;
    revealEnter();
  }).catch(function () { finish("asset-failed"); });
  var slices = wordmark.querySelectorAll(".site-arrival__slice");
  var animations = [];
  slices.forEach(function (slice) { animations = animations.concat(slice.getAnimations()); });
  if (!animations.length) {
    finish("assembly-unavailable");
    return;
  }
  Promise.all(animations.map(function (animation) { return animation.finished; })).then(function () {
    assemblyReady = true;
    revealEnter();
  }).catch(function () { finish("assembly-interrupted"); });
  watchdog = setTimeout(function () { finish("readiness-timeout"); }, 8000);
})();
