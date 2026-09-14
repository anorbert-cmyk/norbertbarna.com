/** A short, decorative first arrival. It never owns content or scrolling. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var sessionKey = "nb-arrival-seen-v1";
  var isHome = document.body.classList.contains("home");
  var isCase = Boolean(document.querySelector(".case-study-header"));
  var motionOff = root.classList.contains("no-motion") || reduced.matches ||
    (window.PortfolioMedia && window.PortfolioMedia.isReduced());
  var navigation = window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  // Deep links and browser history must land directly on their reading position.
  if ((!isHome && !isCase) || motionOff || location.hash ||
      (navigation && navigation.type === "back_forward") ||
      !window.gsap || !window.ScrollTrigger || document.hidden || window.scrollY > 8 ||
      (document.activeElement && document.activeElement !== document.body && document.activeElement !== root) ||
      (window.performance && performance.now() > 1800)) return;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
  } catch (error) {
    // Without session storage, skip rather than replaying on every page.
    return;
  }
  var curtain = document.createElement("div");
  curtain.className = "site-arrival" + (isCase ? " site-arrival--case" : "");
  curtain.setAttribute("aria-hidden", "true");
  curtain.innerHTML = '<p class="site-arrival__name">NORBERT<br>BARNA</p>' +
    '<p class="site-arrival__role">Product VP</p><span class="site-arrival__rule"></span>';
  var listeners = new AbortController();
  var timer;
  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    listeners.abort();
    curtain.remove();
    window.dispatchEvent(new CustomEvent("portfolio:arrivalend"));
  }
  window.PortfolioArrival = { finish: finish };
  ["keydown", "pointerdown", "touchstart", "wheel", "focusin"].forEach(function (eventName) {
    window.addEventListener(eventName, finish, { capture: true, passive: true, signal: listeners.signal });
  });
  window.addEventListener("pagehide", finish, { once: true, signal: listeners.signal });
  document.addEventListener("visibilitychange", function () { if (document.hidden) finish(); }, { signal: listeners.signal });
  window.addEventListener("portfolio:motionchange", function (event) {
    if (event.detail && event.detail.reduced) finish();
  }, { signal: listeners.signal });
  reduced.addEventListener("change", function (event) { if (event.matches) finish(); }, { signal: listeners.signal });
  curtain.addEventListener("animationend", function (event) {
    if (event.target === curtain) finish();
  }, { signal: listeners.signal });
  document.body.appendChild(curtain);
  // Animation events can be lost when a stylesheet fails or settings change.
  timer = setTimeout(finish, isCase ? 1300 : 2100);
})();
