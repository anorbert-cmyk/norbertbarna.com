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
  var consentWatch = new MutationObserver(function () { syncConsent(); });
  var consentSpace = null;
  function syncConsent() {
    var next = document.querySelector('.consent-space');
    if (next && next !== consentSpace) {
      consentSpace = next;
      consentWatch.disconnect();
      consentWatch.observe(next, { attributes: true, attributeFilter: ['style', 'hidden'] });
    }
    var space = consentSpace && !consentSpace.hidden ? parseFloat(consentSpace.style.height) || 0 : 0;
    var stage = document.querySelector('.home-mast-scene');
    if (stage) {
      var cover = Math.max(0, space - (space ? 16 : 0));
      stage.style.setProperty('--consent-cover', cover + 'px');
      stage.style.setProperty('--stage-safe-scale', String(Math.max(.15, 1 - cover / Math.max(1, stage.clientHeight))));
    }
  }
  consentWatch.observe(document.body, { childList: true });
  syncConsent();
  window.addEventListener('resize', syncConsent, { passive: true });
  request();
})();
