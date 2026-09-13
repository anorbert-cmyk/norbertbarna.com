/** One native-scroll owner connects the existing WebGL object to its reading pose. */
(function () {
  'use strict';
  var mast = document.querySelector('.home-mast');
  var track = mast && mast.querySelector('.home-mast-track');
  if (!track) return;
  var scene = track.querySelector('.home-mast-scene');
  var intro = scene.querySelector('.home-mast-intro');
  var statement = scene.querySelector('.home-mast-statement');
  var baseline = scene.querySelector('.home-mast-baseline');
  var fallback = scene.querySelector('.home-mast-fallback');
  var nav = document.querySelector('.navbar');
  var work = document.querySelector('#works');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var frame = 0, paused = false, active = false, painted = false, restoreFrame = 0;
  var lastReading = null;
  function rememberReading() {
    var focus = intro.contains(document.activeElement) ? document.activeElement : null;
    lastReading = { introTop: intro.getBoundingClientRect().top, focus: focus, focusTop: focus ? focus.getBoundingClientRect().top : null };
  }
  intro.addEventListener('focusin', rememberReading);
  var api = window.PortfolioHomeMorph = { progress: 1, request: request };
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function smooth(n) { n = clamp(n); return n * n * (3 - 2 * n); }
  function motionOff() { return reduced.matches || document.documentElement.classList.contains('no-motion'); }
  function request() { if (!paused && !frame) frame = requestAnimationFrame(render); }
  function render() {
    frame = 0;
    if (paused) return;
    // Enlarged/short layouts stay in flow; nothing relies on a pinned reading slot.
    var nextActive = !motionOff() && !mast.hasAttribute('data-text-reflow') && innerHeight >= 780 && (!window.PortfolioHeroScene || window.PortfolioHeroScene.status !== 'fallback');
    var changingMode = painted && active !== nextActive;
    var focused = intro.contains(document.activeElement) ? document.activeElement : null;
    var before = changingMode && lastReading ? (focused && lastReading.focus === focused ? lastReading.focusTop : lastReading.introTop) : 0;
    var oldSceneTop = changingMode ? scene.getBoundingClientRect().top : 0;
    active = nextActive;
    mast.toggleAttribute('data-morph-active', active);
    if (changingMode && active) {
      window.scrollTo(0, scrollY + track.getBoundingClientRect().top + track.offsetHeight - scene.offsetHeight - Math.min(0, oldSceneTop));
    }
    var box = track.getBoundingClientRect();
    var distance = Math.max(1, track.offsetHeight - scene.offsetHeight);
    var raw = active ? clamp(-box.top / distance) : 1;
    var p = active ? smooth((raw - .04) / .74) : 1;
    api.progress = p;
    if (window.PortfolioHeroScene && window.PortfolioHeroScene.setMorphProgress) window.PortfolioHeroScene.setMorphProgress(p);
    var reveal = smooth((p - .72) / .28);
    intro.style.opacity = String(reveal);
    intro.style.transform = active ? 'translate3d(0,' + ((1 - reveal) * 48).toFixed(2) + 'px,0)' : '';
    intro.toggleAttribute('data-morph-hidden', active && reveal < .015);
    intro.style.pointerEvents = reveal < .95 ? 'none' : '';
    var link = intro.querySelector('a');
    if (reveal < .95) link.setAttribute('tabindex', '-1'); else link.removeAttribute('tabindex');
    var leaving = clamp(1 - p * 3);
    statement.style.opacity = String(leaving);
    statement.style.transform = 'translate3d(' + (-p * 14).toFixed(2) + '%,' + (-p * 5).toFixed(2) + '%,0) scale(' + (1 - p * .16).toFixed(3) + ')';
    baseline.style.opacity = String(leaving);
    baseline.toggleAttribute('data-morph-hidden', leaving < .05);
    baseline.querySelectorAll('a').forEach(function (a) { if (leaving < .95) a.setAttribute('tabindex', '-1'); else a.removeAttribute('tabindex'); });
    // The SVG shares the same path when WebGL is unavailable; it is never a second visible shape.
    if (active) fallback.style.transform = 'translate(' + (p * (innerWidth < 600 ? 33 : 60)).toFixed(2) + '%, ' + (-p * (innerWidth < 600 ? 35 : 8)).toFixed(2) + '%) rotate(' + (-p * 90).toFixed(2) + 'deg) scale(' + (1 - p * .25).toFixed(3) + ')';
    else fallback.style.removeProperty('transform');
    var chapter = work && work.getBoundingClientRect().bottom > 52;
    nav.toggleAttribute('data-composition-nav', Boolean(chapter));
    if (changingMode && !active) {
      var after = (focused || intro).getBoundingClientRect().top;
      window.scrollBy(0, after - before);
    }
    painted = true;
    rememberReading();
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  window.addEventListener('load', request, { once: true });
  window.addEventListener('portfolio:arrivalend', request);
  window.addEventListener('portfolio:heroready', request);
  window.addEventListener('portfolio:motionchange', request);
  reduced.addEventListener('change', request);
  new MutationObserver(request).observe(mast, { attributes: true, attributeFilter: ['data-text-reflow'] });
  if (document.fonts) document.fonts.ready.then(request);
  // The track-end marker is a real native anchor. History and bfcache retain
  // the browser's exact reading position; pageshow never forces a hash jump.
  function restore(event) {
    paused = false; request();
    var navigation = performance.getEntriesByType('navigation')[0];
    var saved = history.state && history.state.nbCompositionScroll;
    if (saved && saved.url === location.href && Number.isFinite(saved.y) &&
        (event.persisted || (navigation && navigation.type === 'back_forward'))) {
      // WebKit may re-align a fragment after pageshow instead of restoring the
      // reading offset. Restore this entry only, after its native alignment.
      restoreFrame = requestAnimationFrame(function () {
        restoreFrame = requestAnimationFrame(function () {
          restoreFrame = 0;
          if (!paused) { window.scrollTo(0, saved.y); request(); }
        });
      });
    }
  }
  window.addEventListener('pagehide', function () {
    try { history.replaceState(Object.assign({}, history.state, { nbCompositionScroll: { url: location.href, y: scrollY } }), ''); } catch (_) {}
    paused = true; cancelAnimationFrame(frame); cancelAnimationFrame(restoreFrame); frame = restoreFrame = 0;
  });
  window.addEventListener('pageshow', restore);
  document.addEventListener('visibilitychange', function () {
    paused = document.hidden;
    if (paused) { cancelAnimationFrame(frame); frame = 0; } else request();
  });
  render();
})();
