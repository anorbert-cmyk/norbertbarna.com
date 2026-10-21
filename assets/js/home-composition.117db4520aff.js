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
  // `progress` is the painted pose (the followed scroll), `target` the pose the
  // native scroll position asks for; `world` is the follower's physics world.
  var api = window.PortfolioHomeMorph = { progress: 1, target: 1, request: request, world: null };
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function smooth(n) { n = clamp(n); return n * n * (3 - 2 * n); }
  function motionOff() { return reduced.matches || document.documentElement.classList.contains('no-motion'); }
  function request() { if (!paused && !frame) frame = requestAnimationFrame(render); }

  /* Scroll follower (2026-10-07). A notched wheel or a key moves native scroll
     in 100px steps; painted directly, the pose jumped up to a fifth of the
     morph in one frame. The pose now follows the scroll position as a mass on
     a critically damped spring, omega 36 rad/s, zeta 1 (within 1% of a step in
     .18 s, no overshoot), on a fixed-step PortfolioPhysics world driven by this
     owner's own frame, so the glass and the copy paint from the same value in
     the same frame. Native scroll is only read. Mode changes, resizes, page
     show, history restores and the page's first frames snap; focus, tabindex
     and pointer gating read the scroll position itself, never the follower. */
  var FOLLOW = 36;
  var follower = null, snapNext = true, loaded = false;
  function followerWorld() {
    if (follower || !window.PortfolioPhysics) return follower;
    var world = window.PortfolioPhysics.createWorld({ clock: 'external', limit: 30 });
    follower = world.spring({ name: 'scroll', from: 0, to: 0, stiffness: FOLLOW * FOLLOW,
      dampingCoefficient: 2 * FOLLOW, precision: 1e-4, restVelocity: 2e-3 });
    follower.world = world;
    api.world = world;
    return follower;
  }
  // Returns the followed scroll fraction for this frame.
  function follow(raw, snap, stamp) {
    var spring = followerWorld();
    if (!spring) return raw;
    var world = spring.world;
    if (snap || motionOff()) {
      spring.set(raw); spring.snap();
      if (world.running) world.settle();
      return raw;
    }
    if (spring.target !== raw) { spring.set(raw); world.start(); }
    world.advance(stamp);
    return clamp(spring.at(world.alpha));
  }
  function render(stamp) {
    frame = 0;
    if (paused) return;
    if (typeof stamp !== 'number') stamp = performance.now();
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
    var followed = follow(raw, snapNext || changingMode || !painted || !loaded || !active, stamp);
    snapNext = false;
    // While the follower moves this owner keeps its frame, and asks for the next
    // one before the scene does, so the scene's paint stays inside this frame.
    var settling = Boolean(follower && follower.world.running);
    if (settling) request();
    var target = active ? smooth((raw - .04) / .74) : 1;
    var p = active ? smooth((followed - .04) / .74) : 1;
    api.progress = p;
    api.target = target;
    var hero = window.PortfolioHeroScene;
    // Without a renderer the drawings must not wait on a verdict that never comes.
    if (!hero) { var sculpture = scene.querySelector('[data-glass-scene]'); if (sculpture && !sculpture.dataset.heroScene) sculpture.dataset.heroScene = 'fallback'; }
    // Without the pin the same object stays in the drawing slot as assembled
    // glass instead of its flat endpoint; this scene's own travel turns it.
    var glass = Boolean(hero) && hero.status === 'ready' && !motionOff() &&
      !mast.hasAttribute('data-text-reflow');
    mast.toggleAttribute('data-glass-live', glass && !active);
    if (glass && !active && hero.setCompactProgress) {
      // The slot owns the pose here; forcing the endpoint would also cut the
      // assembly short, so the compact stage never sees the object arrive.
      // The scene follows this travel with its own follower on the same frame.
      var sceneBox = scene.getBoundingClientRect();
      hero.setCompactProgress(clamp(-sceneBox.top / Math.max(1, sceneBox.height)), stamp);
    } else if (hero) {
      if (hero.clearCompact) hero.clearCompact();
      // A scene that has not reported yet has no decided owner. Sending the
      // unpinned endpoint now would complete the arrival before it is shown.
      // The stamp makes the glass paint in this frame, with the copy.
      if (hero.setMorphProgress && (active || hero.status !== 'loading')) hero.setMorphProgress(p, stamp);
    }
    // The reading pose starts to resolve while the object is still folding, so
    // the track never shows the object alone on an empty field for long.
    // Paint from the followed pose; gate pointer and focus on the scroll itself.
    var reveal = smooth((p - .6) / .4);
    var revealAt = smooth((target - .6) / .4);
    intro.style.opacity = String(reveal);
    intro.style.transform = active ? 'translate3d(0,' + ((1 - reveal) * 48).toFixed(2) + 'px,0)' : '';
    intro.toggleAttribute('data-morph-hidden', active && reveal < .015 && revealAt < .015);
    intro.style.pointerEvents = revealAt < .95 ? 'none' : '';
    var link = intro.querySelector('a');
    if (revealAt < .95) link.setAttribute('tabindex', '-1'); else link.removeAttribute('tabindex');
    var leaving = clamp(1 - p * 3);
    var leavingAt = clamp(1 - target * 3);
    statement.style.opacity = String(leaving);
    statement.style.transform = 'translate3d(' + (-p * 14).toFixed(2) + '%,' + (-p * 5).toFixed(2) + '%,0) scale(' + (1 - p * .16).toFixed(3) + ')';
    baseline.style.opacity = String(leaving);
    baseline.toggleAttribute('data-morph-hidden', leaving < .05 && leavingAt < .05);
    baseline.querySelectorAll('a').forEach(function (a) { if (leavingAt < .95) a.setAttribute('tabindex', '-1'); else a.removeAttribute('tabindex'); });
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
  function snap() { snapNext = true; request(); }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', snap, { passive: true });
  // The browser restores a reload's scroll position while the page loads; the
  // follower starts only once that has happened.
  window.addEventListener('load', function () {
    request();
    requestAnimationFrame(function () { requestAnimationFrame(function () { loaded = true; }); });
  }, { once: true });
  window.addEventListener('portfolio:arrivalend', request);
  window.addEventListener('portfolio:heroready', request);
  window.addEventListener('portfolio:motionchange', snap);
  reduced.addEventListener('change', snap);
  new MutationObserver(snap).observe(mast, { attributes: true, attributeFilter: ['data-text-reflow'] });
  if (document.fonts) document.fonts.ready.then(snap);
  // The track-end marker is a real native anchor. History and bfcache retain
  // the browser's exact reading position; pageshow never forces a hash jump.
  function restore(event) {
    paused = false; snap();
    var navigation = performance.getEntriesByType('navigation')[0];
    var saved = history.state && history.state.nbCompositionScroll;
    if (saved && saved.url === location.href && Number.isFinite(saved.y) &&
        (event.persisted || (navigation && navigation.type === 'back_forward'))) {
      // WebKit may re-align a fragment after pageshow instead of restoring the
      // reading offset. Restore this entry only, after its native alignment.
      restoreFrame = requestAnimationFrame(function () {
        restoreFrame = requestAnimationFrame(function () {
          restoreFrame = 0;
          if (!paused) { window.scrollTo(0, saved.y); snap(); }
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
