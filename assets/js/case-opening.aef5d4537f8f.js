/** Case opening: the existing title letters and the one real product panel
 *  assemble once on first-party physics (window.PortfolioPhysics), then native
 *  scroll settles the panel's perspective. No GSAP, no clones, no scroll
 *  interception; reading text other than the title letters never moves.
 *
 *  The panel is a plate hinged on its lower edge (transform-origin 50% 100%):
 *  it starts leaning back 13deg (7deg compact) and a crease spring stands it
 *  up against a stop at 0deg (omega 3.6 rad/s, zeta .55, restitution .25:
 *  first contact at .72 s, a bounce under half a degree). It rises 60px (28px
 *  compact) and grows from .92 on one critically damped progress (omega 5.5).
 *  Four alternating masks open on critically damped springs (omega 3.3) that
 *  press against a stop at 100%, so each lands exactly and the reveal ends by
 *  2.3 s. Each letter rises and turns on its own spring (omega 9, zeta .75,
 *  35 ms stagger) and inks in linearly over 160 ms.
 *
 *  Every value is a custom property on the element; case-opening.css composes
 *  the entrance and the scroll settle into one transform, so neither owner can
 *  overwrite the other. A parse-time head script marks the document
 *  data-case-opening="pending" when an entrance may run; the stylesheet keeps
 *  the title and panel unpainted until this owner starts, and shows them on its
 *  own after 2.9 s. Reduced motion, html.no-motion, history and deep links get
 *  the finished opening with no physics frame. */
(function () {
  "use strict";
  var root = document.documentElement;
  var header = document.querySelector(".case-study-header");
  var media = header && header.querySelector(".case-hero-media, .kineticare-hero-bg");
  var heading = header && header.querySelector("h1");
  if (!header || !media || !heading || window.PortfolioCaseOpening) {
    if (root.getAttribute("data-case-opening") === "pending") root.removeAttribute("data-case-opening");
    return;
  }

  var TAU = 2 * Math.PI;
  var PLATE = { omega: 3.6, zeta: .55, restitution: .25, tilt: 13, compactTilt: 7, at: .2 };
  var RISE = { omega: 5.5, zeta: 1, at: .2 };
  var SLICE = { omega: 3.3, zeta: 1, at: .2, stagger: .14, stop: 1.03 };
  var LETTER = { omega: 9, zeta: .75, at: .12, stagger: .035, ink: .16 };
  var SETTLE = { omega: 20, zeta: 1 };
  var SLICES = ["--case-slice-a", "--case-slice-b", "--case-slice-c", "--case-slice-d"];
  var ENTRANCE = ["--case-enter-angle", "--case-enter-rise"].concat(SLICES);

  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var compactQuery = matchMedia("(max-width: 991px)");
  var listeners = new AbortController();
  var navigation = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var historical = Boolean(location.hash || (navigation && navigation.type === "back_forward"));
  var entrance = null, letters = [], watchdog = 0, resizeTimer = 0;
  var started = false, destroyed = false, originalNodes = null, originalLabel = null;
  var settle = null, geometry = null, settleOn = false;

  media.classList.add("case-opening-media");
  var api = window.PortfolioCaseOpening = {
    state: "static", finish: finish, destroy: destroy,
    // Read-only views for tests and debugging; never drive them from outside.
    get entrance() { return entrance; },
    get settle() { return settle && settle.world; },
  };

  function hz(omega) { return omega / TAU; }
  function physics() { return window.PortfolioPhysics; }
  function reduced() {
    return reducedQuery.matches || root.classList.contains("no-motion") ||
      Boolean(window.PortfolioMedia && window.PortfolioMedia.isReduced());
  }
  function on(target, event, handler, options) {
    target.addEventListener(event, handler, Object.assign({ signal: listeners.signal }, options || {}));
  }
  function setState(state) {
    api.state = state;
    if (state === "static") root.removeAttribute("data-case-opening");
    else root.setAttribute("data-case-opening", state);
  }
  function fixed(value, digits) { return String(Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits)); }

  /* ---- Title letters ---------------------------------------------------- */
  function splitHeading() {
    var text = heading.textContent;
    originalLabel = heading.getAttribute("aria-label");
    originalNodes = document.createDocumentFragment();
    while (heading.firstChild) originalNodes.appendChild(heading.firstChild);
    heading.setAttribute("aria-label", text.trim());
    return Array.from(text).map(function (character) {
      var letter = document.createElement("span");
      letter.className = "case-opening-letter";
      letter.setAttribute("aria-hidden", "true");
      letter.textContent = character === " " ? " " : character;
      heading.appendChild(letter);
      return letter;
    });
  }
  function restoreHeading() {
    if (!originalNodes) return;
    heading.replaceChildren(originalNodes);
    if (originalLabel === null) heading.removeAttribute("aria-label"); else heading.setAttribute("aria-label", originalLabel);
    originalNodes = null;
    letters = [];
  }

  /* ---- Entrance --------------------------------------------------------- */
  function clearEntrance() {
    clearTimeout(watchdog);
    if (entrance) { entrance.destroy(); entrance = null; }
    ENTRANCE.forEach(function (key) { media.style.removeProperty(key); });
    restoreHeading();
    setState("settled");
  }
  function finish() { if (!destroyed) { started = true; clearEntrance(); } }

  // The stylesheet's 2.9 s fallback has already painted the title: an
  // entrance now would hide finished content and assemble it again.
  function alreadyShown() {
    return root.getAttribute("data-case-opening") !== "pending" || getComputedStyle(heading).opacity !== "0";
  }

  function buildEntrance(Physics) {
    var world = Physics.createWorld({ limit: 6 });
    var tilt = compactQuery.matches ? PLATE.compactTilt : PLATE.tilt;
    // Degrees; the stop at 0 is the upright reading plane.
    var plate = world.spring({ name: "plate", from: tilt, to: tilt, frequency: hz(PLATE.omega), damping: PLATE.zeta,
      limits: [0, Infinity], restitution: PLATE.restitution, precision: .01 });
    // Remaining rise: 1 is 60px low at .92 scale, 0 is in place.
    var rise = world.spring({ name: "rise", from: 1, to: 1, frequency: hz(RISE.omega), damping: RISE.zeta, precision: .001 });
    var slices = SLICES.map(function (key, index) {
      var slice = world.spring({ name: "slice-" + "abcd"[index], from: 0, to: 0, frequency: hz(SLICE.omega), damping: SLICE.zeta,
        limits: [0, 1], restitution: 0, precision: .001 });
      world.at(SLICE.at + index * SLICE.stagger, function () { slice.set(SLICE.stop); });
      return slice;
    });
    world.at(PLATE.at, function () { plate.set(0); });
    world.at(RISE.at, function () { rise.set(0); });
    var bodies = letters.map(function (element, index) {
      var start = LETTER.at + index * LETTER.stagger;
      var spring = world.spring({ name: "letter-" + index, from: 1, to: 1, frequency: hz(LETTER.omega), damping: LETTER.zeta, precision: .001 });
      world.at(start, function () { spring.set(0); });
      return { element: element, spring: spring, start: start };
    });
    world.paint(function (current, alpha) {
      var time = current.time - current.step * (1 - alpha);
      media.style.setProperty("--case-enter-angle", fixed(plate.at(alpha), 3));
      media.style.setProperty("--case-enter-rise", fixed(rise.at(alpha), 4));
      slices.forEach(function (slice, index) { media.style.setProperty(SLICES[index], fixed(slice.at(alpha) * 100, 2) + "%"); });
      bodies.forEach(function (body) {
        var ink = Math.min(1, Math.max(0, (time - body.start) / LETTER.ink));
        body.element.style.setProperty("--case-letter-rise", fixed(body.spring.at(alpha), 4));
        body.element.style.setProperty("--case-letter-ink", fixed(ink, 3));
      });
    });
    return world;
  }

  function start(event) {
    if (started || destroyed) return;
    var reason = event && event.detail && event.detail.reason;
    var fromArrival = reason === "entered";
    var Physics = physics();
    // A deferred physics.js has always run by DOMContentLoaded; wait for it.
    if (!Physics && document.readyState === "loading") {
      on(document, "DOMContentLoaded", function () { start(event); }, { once: true });
      return;
    }
    if (!Physics || reduced() || historical || document.hidden || window.scrollY > 12 ||
        (reason && !fromArrival) || (!fromArrival && alreadyShown())) {
      finish();
      return;
    }
    started = true;
    try {
      letters = splitHeading();
      entrance = buildEntrance(Physics);
      entrance.rested().then(function () { if (entrance) clearEntrance(); });
      // render(0) paints the first pose in this task, before the gate lifts.
      entrance.start();
      if (entrance && entrance.running) setState("assembling");
      // An interrupted frame loop or missing CSS never leaves evidence hidden.
      watchdog = setTimeout(finish, 2900);
    } catch (error) { finish(); }
  }

  /* ---- Scroll settle ---------------------------------------------------- */
  /* Native scroll through a 150-220px interval after the header reaches the
     top stands the panel from its reading tilt into the page. A critically
     damped follower (omega 20, about GSAP's former .3 s scrub) smooths the
     notched wheel; the scroll itself is only read. */
  function measure() {
    var box = header.getBoundingClientRect();
    geometry = { start: box.top + window.scrollY, range: Math.min(220, Math.max(150, innerHeight * .24)) };
  }
  function settleTarget() {
    if (!geometry) measure();
    return 1 - Math.min(1, Math.max(0, (window.scrollY - geometry.start) / geometry.range));
  }
  function paintSettle(value) { media.style.setProperty("--case-settle", fixed(value, 4)); }
  function onScroll() {
    if (!settleOn) return;
    var target = settleTarget();
    if (Math.abs(target - settle.spring.target) < 1e-6 && settle.spring.resting) return;
    settle.spring.set(target);
    settle.world.start();
  }
  function snapSettle() {
    if (!settleOn) return;
    measure();
    settle.spring.set(settleTarget()).snap();
    paintSettle(settle.spring.value);
  }
  function removeSettle() {
    settleOn = false;
    if (settle) { settle.world.destroy(); settle = null; }
    media.style.removeProperty("--case-settle");
  }
  function installSettle() {
    removeSettle();
    var Physics = physics();
    if (destroyed || reduced() || historical || !Physics) return;
    var world = Physics.createWorld({ limit: 30 });
    var spring = world.spring({ name: "settle", from: 1, to: 1, frequency: hz(SETTLE.omega), damping: SETTLE.zeta, precision: .0005 });
    world.paint(function (current, alpha) { paintSettle(spring.at(alpha)); });
    settle = { world: world, spring: spring };
    settleOn = true;
    snapSettle();
  }
  function whenPhysics(callback) {
    if (physics() || document.readyState !== "loading") callback();
    else on(document, "DOMContentLoaded", callback, { once: true });
  }

  function motionChange() {
    if (reduced()) finish();
    installSettle();
  }
  function destroy() {
    if (destroyed) return;
    clearEntrance();
    destroyed = true;
    removeSettle();
    listeners.abort();
    clearTimeout(resizeTimer);
    media.classList.remove("case-opening-media");
    setState("static");
    api.state = "destroyed";
  }

  on(window, "portfolio:arrivalstart", start);
  on(window, "portfolio:arrivalend", function (event) { if (!started) start(event); });
  on(window, "portfolio:motionchange", motionChange);
  on(reducedQuery, "change", motionChange);
  ["wheel", "touchmove", "keydown", "pointerdown"].forEach(function (name) {
    on(window, name, function () { if (api.state === "assembling") finish(); }, { capture: true, passive: true });
  });
  on(window, "scroll", onScroll, { passive: true });
  on(document, "visibilitychange", function () { if (document.hidden) finish(); });
  on(window, "pagehide", function () { finish(); removeSettle(); });
  on(window, "pageshow", function (event) { if (event.persisted) { finish(); installSettle(); } });
  on(window, "resize", function () {
    if (api.state === "assembling") finish();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(snapSettle, 160);
  }, { passive: true });
  on(window, "load", snapSettle, { once: true });

  whenPhysics(installSettle);
  function automaticStart() {
    // Reduced motion and history visits settle at once, without a frame.
    if (reduced() || historical) { finish(); return; }
    requestAnimationFrame(function () {
      if (!document.querySelector(".site-arrival") && !root.classList.contains("arrival-active")) start();
    });
  }
  if (document.readyState === "loading") on(document, "DOMContentLoaded", automaticStart, { once: true });
  else automaticStart();
})();
