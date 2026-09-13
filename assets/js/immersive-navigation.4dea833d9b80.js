/** Stable compact navigation with a native-scroll desktop utility journey. */
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
  if (!isHome && !isCase) return;
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
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var footer = document.querySelector('.footer-section');
  // Reserve actual document space for the terminal brand, clear of footer links.
  var landing = document.createElement('div');
  landing.className = 'immersive-nav-landing';
  landing.setAttribute('aria-hidden', 'true');
  if (footer) footer.after(landing);
  var frame = 0;
  var suspended = false;
  var lastCount = '';
  var keyboard = false;
  var heldTravel = null;
  var previousTravel = null;
  var previousSlot = 'natural';
  var slotFade = null;
  function cancelSlotFade() {
    if (slotFade) { slotFade.cancel(); slotFade = null; }
  }
  // Protect actual reading/evidence blocks across the page, including titles
  // revealed later by GSAP. The decorative home lettering stays part of the art.
  var candidates = Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6, main p, main li, main dt, main dd, main figure, main figcaption, main .home-mast-baseline, main .home-mast-intro > .banner-left-wrap, main .home-mast-proof-chips, main .home-banner-content-wrap, main .work-row, main .awards-card, main .case-hero-media, main .kineticare-hero-bg')).filter(function (element) {
    return !element.closest('.home-mast-statement, [aria-hidden="true"]');
  });
  var readingGroups = candidates.filter(function (element) {
    return !candidates.some(function (parent) { return parent !== element && parent.contains(element); });
  });
  function readingClearance(desired, stationary) {
    var height = header.offsetHeight;
    var gap = 12;
    var blocked = [];
    readingGroups.forEach(function (group, index) {
      var box = group.getBoundingClientRect();
      if (!box.width || !box.height || box.bottom < -gap || box.top > innerHeight + gap) return;
      blocked.push({ start: box.top - height - gap, end: box.bottom + gap, id: index });
    });
    blocked.sort(function (a, b) { return a.start - b.start; });
    var ranges = [];
    blocked.forEach(function (range) {
      var last = ranges[ranges.length - 1];
      if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
      else ranges.push(range);
    });
    for (var index = 0; index < ranges.length; index++) {
      var range = ranges[index];
      if (desired <= range.start || desired >= range.end) continue;
      // Progress stays real; choose a slot clear of every neighbouring block.
      if (!stationary) {
        if (range.start >= 0) return { y: range.start, dock: false, slot: 'above-' + range.id };
        if (range.end <= innerHeight - height) return { y: range.end, dock: false, slot: 'below-' + range.id };
      }
      // Dense text can fill the view. A normal opaque top bar stays readable
      // while the document continues scrolling underneath it.
      return { y: 0, dock: true, slot: 'docked' };
    }
    return { y: desired, dock: false, slot: 'natural' };
  }
  function render() {
    frame = 0;
    if (suspended) return;
    var limit = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var ratio = Math.min(1, Math.max(0, scrollY / limit));
    var number = String(Math.max(1, Math.round(ratio * 100))).padStart(3, '0');
    if (lastCount !== number) { counter.textContent = number; lastCount = number; }
    var motionOff = reduced.matches || document.documentElement.classList.contains('no-motion');
    var focused = keyboard && header.contains(document.activeElement);
    var menuOpen = Boolean(header.querySelector('[aria-expanded="true"]'));
    var composition = header.hasAttribute('data-composition-nav');
    // Compact browser chrome changes the viewport height while scrolling.
    // Keep utility controls at the top instead of recomputing travelling slots.
    var stationary = compact.matches || motionOff || focused || menuOpen;
    var travel = stationary ? 0 : Math.max(0, innerHeight - header.offsetHeight) * ratio;
    var safe = compact.matches ? { y: 0, dock: false, slot: 'compact' } :
      composition ? { y: 0, dock: false, slot: 'composition' } : readingClearance(travel, stationary);
    travel = heldTravel !== null && !stationary ? heldTravel : safe.y;
    var changingSlot = previousTravel !== null && previousSlot !== safe.slot && Math.abs(travel - previousTravel) > header.offsetHeight * 2;
    if (compact.matches || composition || motionOff || keyboard || focused || menuOpen || heldTravel !== null) cancelSlotFade();
    else if (changingSlot && header.animate) {
      // Relocate between clear reading slots while invisible, then settle.
      // Never translate the controls across the paragraph they are avoiding.
      cancelSlotFade();
      slotFade = header.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      slotFade.onfinish = function () { slotFade = null; };
    }
    header.toggleAttribute('data-reading-dock', safe.dock);
    header.style.setProperty('--nav-travel', travel.toFixed(2) + 'px');
    previousTravel = travel;
    previousSlot = safe.slot;
    var terminal = footer ? Math.min(1, Math.max(0, (innerHeight - landing.getBoundingClientRect().top) / Math.max(1, landing.offsetHeight))) : 0;
    var footerVisible = footer && footer.getBoundingClientRect().top < innerHeight;
    var maxScale = Math.max(1, (innerWidth - 44) / Math.max(1, wordmark.offsetWidth));
    var brandScale = stationary ? 1 : 1 + terminal * (maxScale - 1);
    var brandOffset = 0;
    if (terminal > 0 && !stationary) {
      var landingBox = landing.getBoundingClientRect();
      var brandHeight = wordmark.offsetHeight;
      // Scaling around the wordmark's lower edge lifts its visible letters.
      // Compensate in screen pixels so they stay centred in their own landing.
      brandOffset = landingBox.top + landingBox.height / 2 - (travel + brandHeight - brandHeight / 2 * brandScale);
    }
    header.style.setProperty('--nav-brand-scale', String(brandScale));
    header.style.setProperty('--nav-brand-offset', brandOffset.toFixed(2) + 'px');
    header.style.setProperty('--nav-end', String(stationary ? 0 : terminal));
    header.toggleAttribute('data-footer-zone', Boolean(footerVisible && !stationary));
    header.dataset.journey = ratio.toFixed(3);
  }
  function request() { if (!suspended && !frame) frame = requestAnimationFrame(render); }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  window.addEventListener('load', request, { once: true });
  window.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;
    keyboard = true; header.dataset.keyboard = 'true'; cancelSlotFade(); request();
  }, true);
  window.addEventListener('pointerdown', function (event) {
    keyboard = false; delete header.dataset.keyboard;
    if (header.contains(event.target)) { cancelSlotFade(); heldTravel = parseFloat(header.style.getPropertyValue('--nav-travel')) || 0; }
  }, { passive: true, capture: true });
  function releasePointer() { if (heldTravel !== null) { heldTravel = null; request(); } }
  window.addEventListener('pointerup', releasePointer, { passive: true });
  window.addEventListener('pointercancel', releasePointer, { passive: true });
  window.addEventListener('blur', function () { cancelSlotFade(); releasePointer(); });
  header.addEventListener('focusin', request);
  header.addEventListener('focusout', request);
  header.addEventListener('click', request);
  reduced.addEventListener('change', request);
  compact.addEventListener('change', function () {
    heldTravel = null; previousTravel = null; cancelSlotFade(); request();
  });
  window.addEventListener('portfolio:motionchange', request);
  window.addEventListener('portfolio:arrivalend', request);
  window.addEventListener('pagehide', function () { heldTravel = null; cancelSlotFade(); suspended = true; cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', function () { suspended = false; request(); });
  document.addEventListener('visibilitychange', function () {
    suspended = document.hidden;
    if (suspended) { heldTravel = null; cancelSlotFade(); cancelAnimationFrame(frame); frame = 0; } else request();
  });
  if (document.fonts) document.fonts.ready.then(request);
  if (readingGroups.length && 'ResizeObserver' in window) {
    var readingResize = new ResizeObserver(request);
    readingGroups.forEach(function (group) { readingResize.observe(group); });
  }
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
