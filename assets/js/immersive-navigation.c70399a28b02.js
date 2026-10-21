/** Stable navigation; only the decorative document-progress number updates. */
(function () {
  'use strict';
  var body = document.body;
  var header = document.querySelector('.navbar');
  if (!header) return;
  var compact = matchMedia('(max-width: 991px)');
  function syncCompactHeader() { header.toggleAttribute('data-compact-nav', compact.matches); }
  syncCompactHeader();
  compact.addEventListener('change', syncCompactHeader);
  var isHome = body.classList.contains('home');
  var isCase = Boolean(document.querySelector('.case-study-header'));
  var isWork = isCase || body.classList.contains('works-index');
  if (!isHome && !isWork) return;
  var wrap = header.querySelector('.nav-wrap');
  if (!wrap) return;
  if (isCase) body.classList.add('immersive-case');
  var wordmark = header.querySelector('.home-nav-wordmark');
  if (!wordmark) {
    wordmark = document.createElement('a');
    wordmark.className = 'home-nav-wordmark';
    wordmark.href = '/';
    wordmark.setAttribute('aria-label', 'Norbert Barna — Home');
    wordmark.textContent = 'NORBERT.BARNA';
    wrap.appendChild(wordmark);
  }
  var progress = header.querySelector('.home-nav-progress');
  if (!progress) {
    progress = document.createElement('span');
    progress.className = 'home-nav-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '[ <span>001</span> ]';
    wrap.appendChild(progress);
  }
  var counter = progress.querySelector('span');
  var frame = 0;
  var suspended = false;
  var lastCount = '';
  function render() {
    frame = 0;
    if (suspended) return;
    var limit = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var ratio = Math.min(1, Math.max(0, scrollY / limit));
    var number = String(Math.max(1, Math.round(ratio * 100))).padStart(3, '0');
    if (lastCount !== number) { counter.textContent = number; lastCount = number; }
    // This is real document progress, not a loading estimate. Keep its static
    // markup hidden until a calculation has run; no-JS has no invented number.
    progress.hidden = false;
    header.dataset.journey = ratio.toFixed(3);
    if (isWork) document.documentElement.style.setProperty('--work-nav-height', header.offsetHeight + 'px');
  }
  function request() { if (!suspended && !frame) frame = requestAnimationFrame(render); }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  window.addEventListener('load', request, { once: true });
  window.addEventListener('portfolio:arrivalend', request);
  window.addEventListener('pagehide', function () { suspended = true; cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', function () { suspended = false; request(); });
  document.addEventListener('visibilitychange', function () {
    suspended = document.hidden;
    if (suspended) { cancelAnimationFrame(frame); frame = 0; } else request();
  });
  if (document.fonts) document.fonts.ready.then(request);
  if (isWork && 'ResizeObserver' in window) new ResizeObserver(request).observe(header);
  // Observe only the consent component's owned spacer. Its existing controller
  // already measures the visible banner, including details and font reflow.
  var consentWatch = new MutationObserver(function () { syncConsent(false); });
  var consentSpace = null;
  /* Consent refit (2026-10-07). The home stage yields the banner's space by
     lifting and scaling its statement, sculpture and baseline. Layout
     (--consent-cover) and the banner itself change at once, and a growing
     banner is yielded to at once, so nothing is ever under it. When the
     banner shrinks or leaves, the stage relaxes into the freed space on a
     critically damped spring, omega 12 rad/s, zeta 1 (within 2% in .49 s),
     writing only --consent-lift and --consent-scale. data-consent-fit names
     the resting pose once it is reached, so the glass repaints its backdrop
     once, from the final pose. */
  var REFIT = 12;
  var stageHeight = 1, refit = null, shown = null, pageLoaded = false;
  function paintStage(stage, cover) {
    stage.style.setProperty('--consent-lift', (Math.round(cover * 100) / 100) + 'px');
    stage.style.setProperty('--consent-scale', String(Math.round(Math.max(.15, 1 - cover / stageHeight) * 1e4) / 1e4));
    shown = cover;
  }
  function fitStage(stage, cover) {
    stage.setAttribute('data-consent-fit', cover + '/' + Math.round(Math.max(.15, 1 - cover / stageHeight) * 1e4) / 1e4);
  }
  function stageSpring(stage) {
    if (refit || !window.PortfolioPhysics) return refit;
    var world = window.PortfolioPhysics.createWorld();
    refit = world.spring({ name: 'consent-cover', stiffness: REFIT * REFIT, dampingCoefficient: 2 * REFIT, precision: .2, restVelocity: 2 });
    refit.world = world;
    refit.value = refit.previous = refit.target = shown || 0;
    world.paint(function (current, alpha) {
      paintStage(stage, refit.at(alpha));
      if (refit.resting) fitStage(stage, refit.target);
    });
    window.PortfolioConsentStage = world;
    return refit;
  }
  function syncConsent(snap) {
    var next = document.querySelector('.consent-space');
    if (next && next !== consentSpace) {
      consentSpace = next;
      consentWatch.disconnect();
      consentWatch.observe(next, { attributes: true, attributeFilter: ['style', 'hidden'] });
    }
    var space = consentSpace && !consentSpace.hidden ? parseFloat(consentSpace.style.height) || 0 : 0;
    var stage = document.querySelector('.home-mast-scene');
    if (!stage) return;
    var cover = Math.max(0, space - (space ? 16 : 0));
    stage.style.setProperty('--consent-cover', cover + 'px');
    stageHeight = Math.max(1, stage.clientHeight);
    var spring = stageSpring(stage);
    if (snap || !spring || !pageLoaded || shown === null || cover >= shown) {
      if (spring) { spring.set(cover); spring.snap(); if (spring.world.running) spring.world.settle(); }
      paintStage(stage, cover);
      fitStage(stage, cover);
      return;
    }
    if (spring.target === cover) return;
    spring.set(cover);
    spring.world.start();
  }
  consentWatch.observe(document.body, { childList: true });
  syncConsent(true);
  window.addEventListener('resize', function () { syncConsent(true); }, { passive: true });
  window.addEventListener('load', function () { pageLoaded = true; }, { once: true });
  request();
})();
