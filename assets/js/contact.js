/** Contact page owners. Plain ES2018, no dependencies. Strings follow the
 *  document language.
 *  1. The proof of work: a compact pure-JS SHA-256 run in short time slices,
 *     exposed as window.PortfolioContactPow so it can be verified in Node.
 *  2. The form: validation that mirrors the server's rules, the challenge,
 *     send, and the finale. The fold motion lives in one function,
 *     runFold(), which receives the layer and sheet and resolves when the
 *     sheet has parked; reduced motion takes runFoldInstant() instead. Both
 *     run the same physics scene (window.PortfolioPhysics, physics.js, which
 *     loads first); the instant one runs it to rest without animating.
 *  3. The glass: hero-scene.js renders the chevron in its own slot on the
 *     paper; this owner only tells it how far the stage has scrolled.
 *  The form binds first and nothing before its submit handler can throw, so
 *  a native submit (GET with the visitor's details in the URL) never happens
 *  on a scripted page. */
(function () {
  "use strict";
  var K = new Int32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  var INIT = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  var W = new Int32Array(64);

  /* Returns a function that hashes `${salt}:${nonce}` (UTF-8, nonce as
     decimal digits) and reports its leading zero bits. The prefix is encoded
     once; each call rewrites only the digits and the padding. */
  function makeHasher(prefix) {
    var encoder = new TextEncoder();
    var prefixBytes = encoder.encode(prefix);
    var capacity = Math.ceil((prefixBytes.length + 12 + 9) / 64) * 64;
    var bytes = new Uint8Array(capacity);
    bytes.set(prefixBytes, 0);
    var H = new Int32Array(8);
    return function (nonce) {
      var length = prefixBytes.length;
      var digits = String(nonce);
      for (var d = 0; d < digits.length; d += 1) bytes[length + d] = digits.charCodeAt(d);
      length += digits.length;
      var blocks = Math.ceil((length + 9) / 64);
      var total = blocks * 64;
      bytes[length] = 0x80;
      for (var z = length + 1; z < total; z += 1) bytes[z] = 0;
      var bits = length * 8;
      bytes[total - 4] = bits >>> 24; bytes[total - 3] = (bits >>> 16) & 255;
      bytes[total - 2] = (bits >>> 8) & 255; bytes[total - 1] = bits & 255;
      for (var i = 0; i < 8; i += 1) H[i] = INIT[i];
      for (var block = 0; block < total; block += 64) {
        var t;
        for (t = 0; t < 16; t += 1) {
          var o = block + t * 4;
          W[t] = (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3];
        }
        for (t = 16; t < 64; t += 1) {
          var w15 = W[t - 15], w2 = W[t - 2];
          var s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
          var s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
          W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
        }
        var a = H[0], b = H[1], c = H[2], dd = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (t = 0; t < 64; t += 1) {
          var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
          var ch = (e & f) ^ (~e & g);
          var temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
          var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
          var maj = (a & b) ^ (a & c) ^ (b & c);
          var temp2 = (S0 + maj) | 0;
          h = g; g = f; f = e; e = (dd + temp1) | 0; dd = c; c = b; b = a; a = (temp1 + temp2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + dd) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
      }
      var zeros = 0;
      for (var k = 0; k < 8; k += 1) {
        if (H[k] === 0) { zeros += 32; continue; }
        return zeros + Math.clz32(H[k]);
      }
      return zeros;
    };
  }

  // Yielding through a MessageChannel returns in well under a millisecond,
  // where nested setTimeout is clamped to 4 ms.
  var channel = typeof MessageChannel === "function" ? new MessageChannel() : null;
  var pending = null;
  if (channel) channel.port1.onmessage = function () { var fn = pending; pending = null; if (fn) fn(); };
  function yieldSoon(fn) {
    if (channel && !pending) { pending = fn; channel.port2.postMessage(0); return; }
    setTimeout(fn, 0);
  }

  /* Solves salt:nonce for `difficulty` leading zero bits in slices of about
     8 ms so the page keeps responding. Resolves with { nonce, hashes, ms }. */
  function solve(salt, difficulty, options) {
    var budget = options && options.slice || 8;
    var hasher = makeHasher(salt + ":");
    var started = (typeof performance !== "undefined" ? performance.now() : Date.now());
    var now = function () { return typeof performance !== "undefined" ? performance.now() : Date.now(); };
    return new Promise(function (resolve) {
      var nonce = 0;
      function slice() {
        var end = now() + budget;
        do {
          for (var i = 0; i < 512; i += 1) {
            if (hasher(nonce) >= difficulty) { resolve({ nonce: nonce, hashes: nonce + 1, ms: now() - started }); return; }
            nonce += 1;
          }
        } while (now() < end);
        yieldSoon(slice);
      }
      slice();
    });
  }

  var api = { makeHasher: makeHasher, solve: solve };
  if (typeof window !== "undefined") window.PortfolioContactPow = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();

(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  var sheet = document.querySelector("[data-contact-sheet]");
  if (!form || !sheet) return;

  // Cloudflare Turnstile sits on top of the proof of work. The production
  // key answers only on the real host; every other host (localhost,
  // previews, CI) gets Cloudflare's always-pass test key.
  var TURNSTILE = {
    production: "0x4AAAAAAFPwDpb1_iHcZbA9",
    test: "1x00000000000000000000AA",
    hosts: ["www.barnanorbert.com", "barnanorbert.com"],
    script: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    loadTimeout: 10000,
    answerTimeout: 30000
  };

  var isHungarian = /^hu(?:-|$)/i.test(document.documentElement.lang);
  var lang = isHungarian ? "hu" : "en";
  var linkedIn = "https://www.linkedin.com/in/barna-norbert/";
  var newTab = isHungarian ? " (új lapon nyílik meg)" : " (opens in a new tab)";
  var linkedInLink = function (label) {
    return "<a href=\"" + linkedIn + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + label +
      "<span class=\"contact-sr\">" + newTab + "</span></a>";
  };
  var STRINGS = {
    en: {
      name: { empty: "Enter your name.", short: "Your name must be at least 2 characters.", long: "Your name must be 100 characters or fewer.", format: "Your name must be on one line.", links: "Remove the web address from your name." },
      email: { empty: "Enter your email address so I can reply.", format: "Enter an email address in the correct format, like name@example.com.", long: "Your email address must be 254 characters or fewer." },
      topic: { empty: "Choose what you want to talk about." },
      message: { empty: "Write your message.", short: "Write at least 20 characters so I know how I can help.", long: "Your message must be 5000 characters or fewer.", links: "Your message can include up to 3 links. Remove the others." },
      checking: "Running the spam check in your browser…",
      still: "The spam check is still running…",
      sending: "Sending…",
      sentStatus: "Thank you, your message is on its way.",
      rate: "Too many messages have come from your network recently. What you wrote is still here. Try again later, or write to me on " + linkedInLink("LinkedIn") + ".",
      failed: "Your message was not sent. What you wrote is still here. Try again, or write to me on " + linkedInLink("LinkedIn") + ".",
      unavailable: "The form is paused for now. What you wrote is still here. Write to me on " + linkedInLink("LinkedIn") + " instead.",
      unsupported: "This browser cannot run the spam check, so the form cannot send. Write to me on " + linkedInLink("LinkedIn") + " instead.",
      captchaWaiting: "Your message will go as soon as the human check above is done. If it shows a checkbox, tick it.",
      captchaStuck: "The human check has not finished, so your message was not sent. What you wrote is still here. Tick the box in the check if it shows one, then send again.",
      captchaError: "The human check could not load. Check your internet connection and send again, or write to me on " + linkedInLink("LinkedIn") + ".",
      captchaFailed: "The human check did not go through, so your message was not sent. What you wrote is still here. Send it again.",
      captchaUnavailable: "The human check is not available right now. What you wrote is still here. Try again later, or write to me on " + linkedInLink("LinkedIn") + ".",
      errorPrefix: "Error: ",
      remaining: function (n) { return n === 1 ? "You have 1 character left." : "You have " + n + " characters left."; },
      overLimit: function (n) { return "You are " + n + (n === 1 ? " character" : " characters") + " over the limit."; }
    },
    hu: {
      name: { empty: "Add meg a neved.", short: "A neved legalább 2 karakter legyen.", long: "A neved legfeljebb 100 karakter lehet.", format: "A neved egy sorban legyen.", links: "Töröld a webcímet a nevedből." },
      email: { empty: "Add meg az e-mail-címed, hogy válaszolhassak.", format: "Az e-mail-címet ilyen formában add meg: nev@pelda.hu.", long: "Az e-mail-címed legfeljebb 254 karakter lehet." },
      topic: { empty: "Válaszd ki, miről szeretnél beszélni." },
      message: { empty: "Írd meg az üzeneted.", short: "Írj legalább 20 karaktert, hogy tudjam, miben segíthetek.", long: "Az üzeneted legfeljebb 5000 karakter lehet.", links: "Az üzenetben legfeljebb 3 link lehet. A többit töröld." },
      checking: "Fut a spamszűrő a böngésződben…",
      still: "Még fut a spamszűrő…",
      sending: "Küldés…",
      sentStatus: "Köszönöm, az üzeneted elment.",
      rate: "A hálózatodról az utóbbi időben túl sok üzenet érkezett. Amit írtál, itt maradt. Próbáld újra később, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
      failed: "Az üzeneted nem ment el. Amit írtál, itt maradt. Próbáld újra, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
      unavailable: "Az űrlap most szünetel. Amit írtál, itt maradt. Írj nekem inkább " + linkedInLink("LinkedInen") + ".",
      unsupported: "Ebben a böngészőben nem fut le a spamszűrő, ezért az űrlap nem tudja elküldeni az üzenetet. Írj nekem inkább " + linkedInLink("LinkedInen") + ".",
      captchaWaiting: "Az üzeneted elmegy, amint kész a fenti emberellenőrzés. Ha jelölőnégyzetet látsz benne, pipáld be.",
      captchaStuck: "Az emberellenőrzés nem fejeződött be, ezért az üzeneted nem ment el. Amit írtál, itt maradt. Ha jelölőnégyzetet látsz benne, pipáld be, és küldd el újra.",
      captchaError: "Nem töltött be az emberellenőrzés. Ellenőrizd az internetkapcsolatod, és küldd el újra, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
      captchaFailed: "Nem sikerült az emberellenőrzés, ezért az üzeneted nem ment el. Amit írtál, itt maradt. Küldd el újra.",
      captchaUnavailable: "Az emberellenőrzés most nem érhető el. Amit írtál, itt maradt. Próbáld újra később, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
      errorPrefix: "Hiba: ",
      remaining: function (n) { return "Még " + n + " karaktert írhatsz."; },
      overLimit: function (n) { return "Az üzeneted " + n + " karakterrel hosszabb a megengedettnél."; }
    }
  };
  var t = STRINGS[lang];
  var status = sheet.querySelector(".contact-status");
  var submit = form.querySelector(".contact-submit");
  var submitLabel = submit && submit.querySelector(".contact-submit-label");
  var fieldsBox = form.querySelector(".contact-fields");

  // The status line remembers what kind of message it shows, so a human
  // check that completes can clear its own earlier notice and nothing else.
  var statusKind = "";
  function say(text, asHtml, kind) {
    if (!status) return;
    if (asHtml) status.innerHTML = text; else status.textContent = text;
    statusKind = text ? (kind || "") : "";
  }
  function enableForm() {
    if (fieldsBox) fieldsBox.disabled = false;
    if (submit) submit.disabled = false;
  }

  // The form posts JSON after a proof of work. Without fetch, TextEncoder or
  // the solver the page cannot send; the submit is caught and LinkedIn offered.
  var pow = window.PortfolioContactPow;
  if (!window.fetch || typeof TextEncoder !== "function" || !pow || typeof Promise !== "function") {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      say(t.unsupported, true);
    });
    enableForm();
    return;
  }

  var LIMITS = { nameMin: 2, nameMax: 100, emailMax: 254, messageMin: 20, messageMax: 5000, links: 3 };
  // The server's own rules, mirrored so most problems never reach it.
  var EMAIL_PATTERN = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
  var LINK_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
  var HAS_LINK = /\b(?:https?:\/\/|www\.)\S+/i;
  // The server drops any message that arrives too soon after its challenge
  // was issued; an honest visitor needs this long anyway.
  var MIN_CHALLENGE_AGE = 3300;
  var STILL_WORKING_AFTER = 8000;

  var fields = {
    name: form.querySelector("#contact-name"),
    email: form.querySelector("#contact-email"),
    message: form.querySelector("#contact-message"),
    honeypot: form.querySelector("#contact-website")
  };
  var topicGroup = form.querySelector(".contact-topics");
  var topics = Array.prototype.slice.call(form.querySelectorAll("input[name=\"topic\"]"));
  var counter = form.querySelector("[data-contact-count]");
  var counterBox = form.querySelector("#contact-message-counter");
  var summary = form.querySelector(".contact-error-summary");
  var summaryList = form.querySelector(".contact-error-summary-list");
  var counterLive = form.querySelector("[data-contact-count-live]");
  var sentEmail = sheet.querySelector("[data-contact-sent-email]");
  var written = sheet.querySelector("[data-contact-written]");
  var foot = sheet.querySelector("[data-contact-foot]");
  var sent = sheet.querySelector(".contact-sent");
  var sentCopy = sheet.querySelector(".contact-sent-copy");
  var fold = sheet.querySelector("[data-contact-fold]");
  var foldSheet = fold && fold.querySelector(".contact-fold-sheet");
  var sentTitle = sheet.querySelector(".contact-sent-title");
  var again = sheet.querySelector(".contact-again");

  function reducedMotion() {
    try {
      return document.documentElement.classList.contains("no-motion") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) { return true; }
  }
  function narrow() {
    try { return window.matchMedia("(max-width: 991px)").matches; } catch (error) { return false; }
  }
  function navHeight() {
    var value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--work-nav-height"));
    return Number.isFinite(value) ? value : narrow() ? 56 : 64;
  }

  /* ---- Human check (Turnstile) ------------------------------------------ */
  var checkBox = form.querySelector("[data-contact-turnstile]");
  var checkRow = form.querySelector("[data-contact-check]");
  var captcha = { token: null, widget: null, failed: false, script: null, loading: false, waiters: [] };
  function siteKey() {
    return TURNSTILE.hosts.indexOf(location.hostname) !== -1 ? TURNSTILE.production : TURNSTILE.test;
  }
  function widgetSize() {
    // Cloudflare's frame is a fixed 300 x 65; where the pane is narrower
    // the compact widget fits, and below 600px the flexible one lines up
    // with the full-width Send capsule.
    if (!checkBox) return "normal";
    if (checkBox.clientWidth < 300) return "compact";
    return window.innerWidth < 600 ? "flexible" : "normal";
  }
  function settleWaiters(error) {
    var waiters = captcha.waiters;
    captcha.waiters = [];
    waiters.forEach(function (waiter) {
      clearTimeout(waiter.timer);
      if (error) waiter.reject(error); else waiter.resolve(captcha.token);
    });
  }
  function captchaReady(token) {
    captcha.token = token || null;
    captcha.failed = false;
    // A notice about the check itself is stale once the check has answered.
    if (statusKind === "captcha" && !busy) say("");
    if (captcha.token) settleWaiters(null);
  }
  // A token lives 300 s; one that runs out while the visitor is still
  // writing is simply replaced, without a word.
  function captchaExpired() {
    captcha.token = null;
    resetCaptcha();
  }
  function captchaError() {
    captcha.token = null;
    captcha.failed = true;
    captcha.loading = false;
    if (checkRow) checkRow.hidden = true;
    say(t.captchaError, true, "captcha");
    settleWaiters(new Error("captcha"));
  }
  function resetCaptcha() {
    captcha.token = null;
    try { if (window.turnstile && captcha.widget !== null) window.turnstile.reset(captcha.widget); } catch (error) { /* the widget is gone */ }
  }
  function renderCaptcha() {
    if (!checkBox || !window.turnstile) return;
    if (captcha.widget !== null) {
      try { window.turnstile.remove(captcha.widget); } catch (error) { /* already gone */ }
      captcha.widget = null;
      checkBox.textContent = "";
    }
    if (checkRow) checkRow.hidden = false;
    try {
      captcha.widget = window.turnstile.render(checkBox, {
        sitekey: siteKey(),
        action: "contact",
        theme: "light",
        language: lang,
        size: widgetSize(),
        appearance: "always",
        "response-field": false,
        callback: captchaReady,
        "expired-callback": captchaExpired,
        "error-callback": captchaError,
        "timeout-callback": captchaExpired
      });
    } catch (error) { captchaError(); }
  }
  // The script is injected here, with its error listener attached before it
  // is appended, so a failed load is known at once rather than after the
  // timeout. A retry removes the old tag and injects a fresh one.
  function injectTurnstile() {
    if (captcha.script && captcha.script.parentNode) captcha.script.parentNode.removeChild(captcha.script);
    var script = document.createElement("script");
    script.src = TURNSTILE.script;
    script.async = true;
    script.addEventListener("error", captchaError, { once: true });
    captcha.script = script;
    (document.head || document.documentElement).appendChild(script);
  }
  function startCaptcha() {
    if (!checkBox || captcha.loading) return;
    captcha.failed = false;
    captcha.loading = true;
    if (checkRow) checkRow.hidden = false;
    if (window.turnstile) { captcha.loading = false; renderCaptcha(); return; }
    injectTurnstile();
    var started = Date.now();
    (function poll() {
      if (!captcha.loading) return;
      if (window.turnstile) { captcha.loading = false; renderCaptcha(); return; }
      if (Date.now() - started > TURNSTILE.loadTimeout) { captchaError(); return; }
      setTimeout(poll, 150);
    })();
  }
  startCaptcha();
  // Resolves with a token: at once when one is held, or when the check
  // completes. A check that failed to load is started again first; one that
  // never answers gives up after a while so the button is never stuck.
  function ensureCaptcha() {
    if (captcha.token) return Promise.resolve(captcha.token);
    if (captcha.failed) startCaptcha();
    say(t.captchaWaiting, false, "captcha");
    return new Promise(function (resolve, reject) {
      var waiter = { resolve: resolve, reject: reject, timer: 0 };
      waiter.timer = setTimeout(function () {
        var index = captcha.waiters.indexOf(waiter);
        if (index !== -1) captcha.waiters.splice(index, 1);
        reject(new Error("stuck"));
      }, TURNSTILE.answerTimeout);
      captcha.waiters.push(waiter);
    });
  }

  /* ---- Field errors ---------------------------------------------------- */
  function errorNode(key) { return form.querySelector("#contact-" + key + "-error"); }
  function controlFor(key) { return key === "topic" ? topicGroup : fields[key]; }
  function inputsFor(key) { return key === "topic" ? topics : [fields[key]]; }
  // The topic error is described on the fieldset alone; each radio already
  // carries the group's legend.
  function describedTargets(key) { return key === "topic" ? [topicGroup] : [fields[key]]; }

  function describedBy(node, id, add) {
    var current = (node.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    var index = current.indexOf(id);
    if (add && index === -1) current.push(id);
    if (!add && index !== -1) current.splice(index, 1);
    if (current.length) node.setAttribute("aria-describedby", current.join(" "));
    else node.removeAttribute("aria-describedby");
  }

  function messageFor(key, reason) {
    var set = t[key] || {};
    return set[reason] || set.format || set.empty || "";
  }

  function setError(key, message) {
    var node = errorNode(key);
    var control = controlFor(key);
    if (!node || !control || !message) return;
    node.textContent = "";
    var prefix = document.createElement("span");
    prefix.className = "contact-sr";
    prefix.textContent = t.errorPrefix;
    node.appendChild(prefix);
    node.appendChild(document.createTextNode(message));
    node.hidden = false;
    control.setAttribute("data-invalid", "");
    inputsFor(key).forEach(function (input) { input.setAttribute("aria-invalid", "true"); });
    describedTargets(key).forEach(function (target) { describedBy(target, node.id, true); });
  }

  function clearError(key) {
    var node = errorNode(key);
    var control = controlFor(key);
    if (!node || !control) return;
    if (!node.hidden) { node.hidden = true; node.textContent = ""; }
    control.removeAttribute("data-invalid");
    if (summaryList) {
      var stale = summaryList.querySelector("a[data-contact-field=\"" + key + "\"]");
      if (stale && stale.parentNode) summaryList.removeChild(stale.parentNode);
      if (summary && !summaryList.children.length) summary.hidden = true;
    }
    inputsFor(key).forEach(function (input) { input.removeAttribute("aria-invalid"); });
    describedTargets(key).forEach(function (target) { describedBy(target, node.id, false); });
  }

  /* ---- Validation (reason codes shared with the server) ----------------- */
  function reasonFor(key) {
    var value;
    switch (key) {
      case "name":
        value = fields.name.value.trim();
        if (!value) return "empty";
        if (value.length < LIMITS.nameMin) return "short";
        if (value.length > LIMITS.nameMax) return "long";
        if (/\n/.test(value)) return "format";
        if (HAS_LINK.test(value)) return "links";
        return "";
      case "email":
        value = fields.email.value.trim();
        if (!value) return "empty";
        if (value.length > LIMITS.emailMax) return "long";
        if (!EMAIL_PATTERN.test(value)) return "format";
        return "";
      case "topic":
        return topics.some(function (input) { return input.checked; }) ? "" : "empty";
      case "message":
        value = fields.message.value.replace(/\r\n?/g, "\n").trim();
        if (!value) return "empty";
        if (value.length < LIMITS.messageMin) return "short";
        if (value.length > LIMITS.messageMax) return "long";
        if ((value.match(LINK_PATTERN) || []).length > LIMITS.links) return "links";
        return "";
    }
    return "";
  }
  function validateField(key) {
    var reason = reasonFor(key);
    return reason ? messageFor(key, reason) : "";
  }

  var ORDER = ["name", "email", "topic", "message"];
  function validateAll() {
    var invalid = [];
    ORDER.forEach(function (key) {
      var message = validateField(key);
      if (message) { setError(key, message); invalid.push(key); } else { clearError(key); }
    });
    return invalid;
  }

  function focusField(key) {
    var inputs = inputsFor(key);
    var target = inputs[0];
    if (key === "topic") {
      target = topics.filter(function (input) { return input.checked; })[0] || topics[0];
    }
    if (target && typeof target.focus === "function") target.focus();
  }

  /* ---- Error summary (GOV.UK pattern): every problem, linked to its field. */
  function hideSummary() {
    if (!summary) return;
    summary.hidden = true;
    if (summaryList) summaryList.textContent = "";
  }

  function showSummary(keys) {
    if (!summary || !summaryList) { focusField(keys[0]); return; }
    summaryList.textContent = "";
    keys.forEach(function (key) {
      var node = errorNode(key);
      var target = inputsFor(key)[0];
      if (!node || !target) return;
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#" + target.id;
      link.setAttribute("data-contact-field", key);
      link.textContent = node.textContent.replace(t.errorPrefix, "");
      item.appendChild(link);
      summaryList.appendChild(item);
    });
    summary.hidden = false;
    summary.focus({ preventScroll: true });
    try { summary.scrollIntoView({ block: "start", behavior: reducedMotion() ? "auto" : "smooth" }); } catch (error) { /* ignore */ }
  }

  if (summaryList) {
    summaryList.addEventListener("click", function (event) {
      var link = event.target.closest("a[data-contact-field]");
      if (!link) return;
      event.preventDefault();
      focusField(link.getAttribute("data-contact-field"));
    });
  }

  // A field that takes focus is brought fully into view when the bar or the
  // viewport edge would otherwise clip it, so keyboard visitors always see
  // where they are writing. Focus from a press is left alone: scrolling
  // between mousedown and mouseup (instantly, with reduced motion) would
  // move the button from under the pointer and lose the click.
  var pressedAt = 0;
  form.addEventListener("pointerdown", function () { pressedAt = Date.now(); }, true);
  form.addEventListener("focusin", function (event) {
    if (Date.now() - pressedAt < 600) return;
    var target = event.target.closest(".contact-field, .contact-topic, .contact-actions");
    if (!target) return;
    var box = target.getBoundingClientRect();
    if (box.top >= navHeight() + 8 && box.bottom <= window.innerHeight - 8) return;
    try { target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }); } catch (error) { /* ignore */ }
  });

  // Validate a field once the visitor leaves it, and clear its error as soon
  // as they fix it. Never scold while the field is still being typed into.
  // A blur caused by a press is checked only after the press has ended and
  // its click has landed: an error line appearing between mousedown and
  // mouseup would move the target from under the pointer.
  var pointerHeld = false;
  var deferredChecks = [];
  function runDeferredChecks() {
    var checks = deferredChecks;
    deferredChecks = [];
    checks.forEach(function (check) { check(); });
  }
  document.addEventListener("pointerdown", function () { pointerHeld = true; }, true);
  ["pointerup", "pointercancel"].forEach(function (name) {
    document.addEventListener(name, function () { pointerHeld = false; setTimeout(runDeferredChecks, 0); }, true);
  });
  ["name", "email", "message"].forEach(function (key) {
    var input = fields[key];
    if (!input) return;
    input.addEventListener("blur", function () {
      var check = function () {
        if (input.value.trim() === "" && !controlFor(key).hasAttribute("data-invalid")) return;
        var message = validateField(key);
        if (message) setError(key, message); else clearError(key);
      };
      if (pointerHeld) deferredChecks.push(check); else check();
    });
    input.addEventListener("input", function () {
      if (controlFor(key).hasAttribute("data-invalid") && !validateField(key)) clearError(key);
    });
  });
  topics.forEach(function (input) {
    input.addEventListener("change", function () { clearError("topic"); });
  });

  /* ---- Counter and growing message field -------------------------------- */
  // The count stays quiet until the last 10%, then it turns navy and the
  // remaining number is announced once per 100-character step, not per key.
  var lastAnnounced = null;
  function updateCounter() {
    if (!counter || !fields.message) return;
    var length = fields.message.value.length;
    var left = LIMITS.messageMax - length;
    counter.textContent = String(length);
    var near = left <= 500;
    if (counterBox) counterBox.setAttribute("data-near", near ? "true" : "false");
    if (!counterLive) return;
    if (!near) { lastAnnounced = null; if (counterLive.textContent) counterLive.textContent = ""; return; }
    var step = left < 0 ? "over" : String(Math.floor(left / 100));
    if (step === lastAnnounced) return;
    lastAnnounced = step;
    counterLive.textContent = left < 0 ? t.overLimit(-left) : t.remaining(left);
  }
  // The message field grows with its text; browsers without field-sizing
  // get the same from a measured height.
  var growsNatively = Boolean(window.CSS && CSS.supports && CSS.supports("field-sizing: content"));
  function growMessage() {
    if (growsNatively || !fields.message) return;
    fields.message.style.height = "auto";
    fields.message.style.height = fields.message.scrollHeight + 2 + "px";
  }
  if (fields.message) {
    fields.message.addEventListener("input", function () { updateCounter(); growMessage(); });
    updateCounter();
    growMessage();
  }

  /* ---- Proof of work --------------------------------------------------- */
  var challenge = null;      // { token, nonce, receivedAt }
  var solving = null;        // Promise<{token, nonce, receivedAt}>
  var armed = false;

  async function fetchChallenge() {
    var response = await fetch("/api/contact/challenge", {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("challenge " + response.status);
    var data = await response.json();
    if (!data || typeof data.token !== "string" || typeof data.salt !== "string" ||
        typeof data.difficulty !== "number" || !(data.difficulty >= 0 && data.difficulty <= 24)) {
      // 24 leading zero bits is already millions of hashes; anything beyond
      // is a broken or hostile challenge, not something to grind through.
      throw new Error("challenge shape");
    }
    data.receivedAt = Date.now();
    return data;
  }

  function prepareChallenge(force) {
    if (solving && !force) return solving;
    challenge = null;
    solving = (async function () {
      var data = await fetchChallenge();
      var solved = await pow.solve(data.salt, data.difficulty);
      var ready = { token: data.token, nonce: solved.nonce, receivedAt: data.receivedAt };
      challenge = ready;
      return ready;
    })();
    // A failed background attempt must not poison the submit path: forget it
    // so submit can try again with a fresh request.
    solving.catch(function () { solving = null; });
    return solving;
  }

  // The challenge starts when the visitor starts: on the first focus or
  // keystroke in the form, not on a timer.
  function arm() {
    if (armed) return;
    armed = true;
    prepareChallenge(false);
  }
  form.addEventListener("focusin", arm, { once: true });
  form.addEventListener("input", arm, { once: true });

  /* ---- Send ------------------------------------------------------------ */
  var busy = false;
  var idleLabel = submitLabel ? submitLabel.textContent : "";

  // The button is never disabled while it has focus: aria-disabled and the
  // busy guard stop a second send, and focus stays where the visitor put it.
  function setBusy(flag) {
    busy = flag;
    if (!submit) return;
    if (flag) submit.setAttribute("aria-disabled", "true"); else submit.removeAttribute("aria-disabled");
    if (!flag && submitLabel) submitLabel.textContent = idleLabel;
  }
  // The capsule says "Sending" only while the message is actually leaving.
  function setLabel(text) {
    if (submitLabel) submitLabel.textContent = text;
  }

  function payload(ready) {
    var topic = topics.filter(function (input) { return input.checked; })[0];
    return {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      topic: topic ? topic.value : "",
      message: fields.message.value,
      hp_7f3: fields.honeypot ? fields.honeypot.value : "",
      "cf-turnstile-response": captcha.token || "",
      token: ready.token,
      nonce: String(ready.nonce),
      lang: lang
    };
  }

  async function post(ready) {
    var response = await fetch("/api/contact", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload(ready))
    });
    var data = null;
    try { data = await response.json(); } catch (error) { data = null; }
    return { status: response.status, data: data || {} };
  }

  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  async function send(allowRetry) {
    var ready = challenge;
    var stillTimer = 0;
    var stillShown = false;
    // Once "still running" has been said, the progress line does not step
    // back to the first message.
    function progress(text) { if (!stillShown) say(text); }
    // The human check must have answered before anything is posted.
    try { await ensureCaptcha(); } catch (error) { return { ok: false, kind: error && error.message === "stuck" ? "captchaStuck" : "captchaError" }; }
    if (!ready) {
      progress(t.checking);
      stillTimer = setTimeout(function () { if (busy) { stillShown = true; say(t.still); } }, STILL_WORKING_AFTER);
      try { ready = await prepareChallenge(!solving); } finally { clearTimeout(stillTimer); }
    }
    // Never post before the challenge is old enough; the progress text stays
    // up while we wait, on the first try and on a retry alike.
    var age = MIN_CHALLENGE_AGE - (Date.now() - (ready.receivedAt || 0));
    if (age > 0) { progress(t.checking); await wait(age); }
    say(t.sending);
    setLabel(t.sending);
    // The token is spent the moment it leaves; a lost response must never
    // re-post it, so it is forgotten before the request goes out.
    challenge = null;
    solving = null;
    var result = await post(ready);
    // Human-check tokens are single use: the widget resets after every attempt.
    resetCaptcha();

    if (result.status === 200 && result.data.ok === true) return { ok: true };
    // Every other answer needs a fresh challenge for the next attempt.
    prepareChallenge(true);
    if (result.status === 403 && result.data.error === "challenge" && allowRetry) {
      setLabel(idleLabel);
      say(t.checking);
      return send(false);
    }
    if (result.status === 400 && result.data.error === "invalid") {
      var names = Array.isArray(result.data.fields) ? result.data.fields : [];
      var reasons = result.data.reasons && typeof result.data.reasons === "object" ? result.data.reasons : {};
      var marked = [];
      ORDER.forEach(function (name) {
        if (names.indexOf(name) === -1) return;
        // The server names the exact problem; the client's own check is the
        // fallback when it does not.
        setError(name, messageFor(name, reasons[name]) || validateField(name) || messageFor(name, "format"));
        marked.push(name);
      });
      return { ok: false, kind: "invalid", fields: marked };
    }
    if (result.status === 400 && result.data.error === "captcha_failed") return { ok: false, kind: "captchaFailed" };
    if (result.status === 503 && result.data.error === "captcha_unavailable") return { ok: false, kind: "captchaUnavailable" };
    if (result.status === 429) return { ok: false, kind: "rate" };
    if (result.status === 503) return { ok: false, kind: "unavailable" };
    return { ok: false, kind: "failed" };
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy) return;
    var invalid = validateAll();
    if (invalid.length) {
      say("");
      showSummary(invalid);
      return;
    }
    hideSummary();
    say("");
    setBusy(true);
    send(true).then(function (result) {
      setBusy(false);
      if (result.ok) { showSent(); return; }
      if (result.kind === "invalid") {
        say("");
        if (result.fields && result.fields.length) showSummary(result.fields); else say(t.failed, true);
        return;
      }
      if (result.kind === "rate") { say(t.rate, true); return; }
      if (result.kind === "unavailable") { say(t.unavailable, true); return; }
      if (result.kind === "captchaError") { say(t.captchaError, true, "captcha"); return; }
      if (result.kind === "captchaStuck") { say(t.captchaStuck, false, "captcha"); return; }
      if (result.kind === "captchaFailed") { say(t.captchaFailed, false, "captcha"); return; }
      if (result.kind === "captchaUnavailable") { say(t.captchaUnavailable, true, "captcha"); return; }
      say(t.failed, true);
    }).catch(function () {
      setBusy(false);
      prepareChallenge(true);
      resetCaptcha();
      say(t.failed, true);
    });
  });

  /* ---- Fold ------------------------------------------------------------ */
  // The motion of the send fold lives here and nowhere else. runFold()
  // receives the decorative layer and its sheet and resolves once the letter
  // has parked; runFoldInstant() is the reduced-motion path. Both build the
  // same scene on PortfolioPhysics (physics.js) and differ only in whether
  // its world is animated or run to rest at once, so they end in exactly the
  // same state.
  //
  // The written area lifts off the glass as a sheet of the same frosted
  // lilac, keeping the lines the form drew. The bottom third, then the top
  // third, are pushed just past upright and laid down by their own weight;
  // on a desktop the left half is then pressed over the right. Each panel is
  // a hinged plate with gravity, air drag, limit stops and crease memory;
  // its face is shaded by its normal, a turning panel casts a contact shadow
  // on the sheet beneath and every layer a drop shadow on the glass. The
  // last crease keeps its memory, so the letter parks with that leaf a
  // little open under its own spring, its olive inner fold along the hinge.
  // Only transforms and opacity change per frame; sizes change once per
  // fold, when a crease splits a piece of the sheet in two.
  var Physics = window.PortfolioPhysics || null;
  var DEG = Math.PI / 180;
  var FOLD = {
    perspective: 1600,
    lift: 26,           // px the sheet rises off the glass
    rest: 6,            // px the parked letter keeps above it
    layer: 1.2,         // px between stacked layers, in sheet space
    margin: 20,         // px kept clear under the sheet while it folds
    // A4 stationery at 120 g/m2: thirds 99 mm deep across 210 mm, a half
    // 105 mm across 99 mm. A laid fold is pushed just past upright and falls
    // by its own weight onto the stack; the last fold is pressed nearly shut
    // and keeps its crease (through three layers on a desktop).
    third: { length: 0.099, width: 0.21, grammage: 0.12, restitution: 0.34, crease: { strength: 0.3, elastic: 40 * DEG } },
    last: { length: 0.105, width: 0.099, grammage: 0.12, layers: 3, restitution: 0.3, friction: 13, crease: { strength: 1.9, elastic: 55 * DEG } },
    lastCompact: { length: 0.099, width: 0.21, grammage: 0.12, restitution: 0.3, friction: 13, crease: { strength: 1.9, elastic: 55 * DEG } },
    // Hand torques, in multiples of the panel's own weight torque m g L / 2.
    laid: { torque: 1.6, until: 100 * DEG },
    pressed: { torque: 3.2, until: 165 * DEG },
    start: 0.06,        // s: the first fold begins while the sheet still rises
    next: 150 * DEG,    // the next fold begins as the previous one lands
    // Tone from light.tone(): irradiance against the flat sheet, minus one,
    // from -0.55 (only ambient) to +0.18 (facing the key light).
    shade: 0.5,         // navy per unit of lost light
    shine: 1.2,         // white per unit of extra light
    // Drop shadow per layer on the glass (light.contact): none while the
    // film touches the glass, fading as a layer rises; `spread` is the soft
    // edge's half width.
    ground: { strength: 0.12, touch: 5, reach: 120, spread: 13 },
    cast: 0.5
  };
  var PIECES = [
    { row: "mid", col: "R", marks: [] },
    { row: "bottom", col: "R", marks: [["bottom", "top"]] },
    { row: "top", col: "R", marks: [["top", "bottom"]] },
    { row: "mid", col: "L", marks: [["half", "right"]] },
    { row: "bottom", col: "L", marks: [["bottom", "top"], ["half", "right"]] },
    { row: "top", col: "L", marks: [["top", "bottom"], ["half", "right"]] }
  ];
  var foldTimers = [];
  var foldScene = null;
  var foldParts = null;
  var foldRun = 0;
  function later(fn, ms) { foldTimers.push(setTimeout(fn, ms)); }
  function cancelFold() {
    foldRun += 1;
    foldTimers.forEach(clearTimeout);
    foldTimers = [];
    if (foldScene) { foldScene.world.destroy(); foldScene = null; }
  }
  function step(layer, name) {
    var steps = (layer.getAttribute("data-fold-step") || "").split(/\s+/).filter(Boolean);
    if (steps.indexOf(name) === -1) steps.push(name);
    layer.setAttribute("data-fold-step", steps.join(" "));
  }
  // The parked letter never takes more than about a third of the viewport's
  // height, so the heading beneath it still fits on a short screen.
  function parkScaleFor(height, compact) {
    return Math.min(compact ? .62 : .72, window.innerHeight * .3 / (height / 3));
  }
  function parkedSize(width, height, compact) {
    var scale = parkScaleFor(height, compact);
    return { height: Math.round(height / 3 * scale), width: Math.round((compact ? width : width / 2) * scale) };
  }
  function prepareLayer(layer, sheetNode, width, height, compact) {
    layer.removeAttribute("data-fold-step");
    layer.classList.toggle("is-narrow", compact);
    layer.style.height = height + "px";
    layer.style.width = "";
    if (sheetNode) { sheetNode.style.width = width + "px"; sheetNode.style.height = height + "px"; }
    layer.hidden = false;
  }
  // The parked letter sits inside the pane's padding; the layer keeps just
  // its room, so the thank-you follows it.
  function park(layer, size, pad) {
    step(layer, "park");
    layer.style.height = Math.round(pad + size.height) + "px";
  }

  // The lines of the written page, in sheet coordinates, so the lifted sheet
  // keeps them where the form drew them.
  function measureRules(scope, origin) {
    var rules = [];
    function add(node, side) {
      var style = getComputedStyle(node);
      var width = parseFloat(style["border" + side + "Width"]) || 0;
      var box = node.getBoundingClientRect();
      if (!width || style["border" + side + "Style"] === "none" || !box.width) return;
      rules.push("linear-gradient(" + style["border" + side + "Color"] + "," + style["border" + side + "Color"] + ") " +
        Math.round(box.left - origin.left) + "px " + Math.round((side === "Top" ? box.top : box.bottom - width) - origin.top) + "px / " +
        Math.round(box.width) + "px " + width + "px no-repeat");
    }
    Array.prototype.forEach.call(scope.querySelectorAll(".contact-input, .contact-textarea, .contact-topic"), function (node) { add(node, "Bottom"); });
    Array.prototype.forEach.call(scope.querySelectorAll(".contact-topic-grid, .contact-aside-note"), function (node) { add(node, "Top"); });
    return rules.join(", ");
  }

  // The writing itself, as it stood on the form: every label, each field's
  // text and the chosen topic with its filled mark, placed at its own
  // rectangle in sheet coordinates with its computed type, at 1x; the
  // sheet's transform scales it with the paper.
  function measurePrint(scope, origin) {
    var out = [];
    function escape(text) {
      return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function place(node, text, inline, single) {
      if (!node || !text) return;
      var box = node.getBoundingClientRect();
      if (!box.width || !box.height) return;
      var style = getComputedStyle(node);
      out.push("<span style=\"position:absolute;left:" + (box.left - origin.left).toFixed(1) + "px;top:" + (box.top - origin.top).toFixed(1) + "px;width:" + box.width.toFixed(1) + "px;height:" + box.height.toFixed(1) + "px;box-sizing:border-box;margin:0;" +
        "padding:" + style.paddingTop + " " + style.paddingRight + " " + style.paddingBottom + " " + style.paddingLeft + ";" +
        "font:" + style.font + ";line-height:" + style.lineHeight + ";letter-spacing:" + style.letterSpacing + ";color:" + style.color + ";" +
        "text-transform:" + style.textTransform + ";text-align:" + style.textAlign + (single ? ";white-space:nowrap;overflow:visible;" : ";white-space:pre-wrap;overflow-wrap:anywhere;overflow:hidden;") +
        (inline ? "display:flex;align-items:center;" : "display:block;") + "\">" + escape(text) + "</span>");
    }
    Array.prototype.forEach.call(scope.querySelectorAll(".contact-label"), function (node) { place(node, node.textContent, false, true); });
    Array.prototype.forEach.call(scope.querySelectorAll(".contact-input"), function (node) { place(node, node.value, true); });
    Array.prototype.forEach.call(scope.querySelectorAll(".contact-textarea"), function (node) { place(node, node.value, false); });
    var chosen = scope.querySelector(".contact-topic-input:checked");
    if (chosen) {
      var row = chosen.closest(".contact-topic");
      var text = row && row.querySelector(".contact-topic-text");
      var mark = row && row.querySelector(".contact-topic-mark");
      if (text) place(text, text.textContent, false);
      if (mark) {
        var box = mark.getBoundingClientRect();
        var ink = getComputedStyle(mark).color;
        out.push("<svg viewBox=\"0 0 20 20\" aria-hidden=\"true\" style=\"position:absolute;left:" + (box.left - origin.left).toFixed(1) + "px;top:" + (box.top - origin.top).toFixed(1) + "px;width:" + box.width.toFixed(1) + "px;height:" + box.height.toFixed(1) + "px;overflow:visible\">" +
          "<circle cx=\"10\" cy=\"10\" r=\"8.75\" fill=\"" + ink + "\" stroke=\"" + ink + "\" stroke-width=\"1.5\"/>" +
          "<path d=\"M10 10v8.75A8.75 8.75 0 0 0 18.75 10Z\" fill=\"#BDB414\"/></svg>");
      }
    }
    return out.join("");
  }

  function part(className, parent) {
    var node = document.createElement("div");
    node.className = className;
    parent.appendChild(node);
    return { node: node, last: {} };
  }
  // Inline and important, so no blanket stylesheet rule (html.no-motion) can
  // undo the state the physics wrote; unchanged values are not rewritten.
  function put(item, name, value) {
    if (item.last[name] === value) return;
    item.last[name] = value;
    item.node.style.setProperty(name, value, "important");
  }
  function flag(item, name, value) {
    if (item.last["@" + name] === value) return;
    item.last["@" + name] = value;
    item.node.setAttribute(name, value);
  }
  function buildParts(sheetNode) {
    if (foldParts && foldParts.sheet === sheetNode) return foldParts;
    sheetNode.textContent = "";
    var parts = { sheet: sheetNode, camera: { node: sheetNode, last: {} }, grounds: [], casts: {}, pieces: [] };
    PIECES.forEach(function () { parts.grounds.push(part("contact-fold-ground", sheetNode)); });
    ["bottom", "top", "half"].forEach(function (name) { parts.casts[name] = part("contact-fold-cast", sheetNode); });
    PIECES.forEach(function (spec) {
      var piece = part("contact-fold-piece", sheetNode);
      piece.spec = spec;
      piece.film = part("contact-fold-film", piece.node);
      piece.print = part("contact-fold-print", piece.node);
      piece.marks = spec.marks.map(function (mark) {
        var liner = part("contact-fold-liner", piece.node);
        liner.node.setAttribute("data-edge", mark[1]);
        return { hinge: mark[0], edge: mark[1], liner: liner };
      });
      piece.tone = part("contact-fold-tone", piece.node);
      piece.marks.forEach(function (mark) {
        mark.crease = part("contact-fold-crease", piece.node);
        mark.crease.node.setAttribute("data-edge", mark.edge);
      });
      parts.pieces.push(piece);
    });
    foldParts = parts;
    return parts;
  }

  function createFoldScene(layer, sheetNode, options) {
    var M = Physics.mat;
    var light = Physics.light;
    var W = options.width, H = options.height, compact = options.compact;
    var x1 = Math.round(W / 2), y1 = Math.round(H / 3), y2 = Math.round(H * 2 / 3);
    var gap = FOLD.layer;
    var parkScale = parkScaleFor(H, compact);
    var room = Math.max(160, options.room || H);
    // On a short viewport the sheet is fitted to what shows, but never below
    // the scale it will park at: the lower third may start below the edge.
    var fit = Math.max(parkScale, Math.min(1, room / H));
    var fitX = (W - W * fit) / 2;
    var fitY = (options.offset || 0) + Math.max(0, (room - H * fit) / 2);
    var parkX = options.pad - parkScale * (compact ? 0 : x1);
    var parkY = options.pad - parkScale * y1;
    var eye = [W / 2, fitY + H * fit / 2, FOLD.perspective];
    var cast = light.cast(1);
    var parts = buildParts(sheetNode);
    var world = Physics.createWorld({ reduced: Boolean(options.instant) });
    var lift = world.spring({ name: "lift", preset: "paper", from: 0, precision: 0.002 });
    var scale = world.spring({ name: "scale", preset: "glass", from: 1, precision: 0.0002 });
    var shiftX = world.spring({ name: "x", preset: "glass", from: 0, precision: 0.05 });
    var shiftY = world.spring({ name: "y", preset: "glass", from: 0, precision: 0.05 });
    var hinges = {
      bottom: world.hinge(Physics.paper(Object.assign({ name: "bottom" }, FOLD.third))),
      top: world.hinge(Physics.paper(Object.assign({ name: "top" }, compact ? FOLD.lastCompact : FOLD.third))),
      half: compact ? null : world.hinge(Physics.paper(Object.assign({ name: "half" }, FOLD.last)))
    };
    var last = hinges.half || hinges.top;
    var split = { bottom: false, top: false, cols: false };
    var dirty = true;
    var detached = 0;
    var parked = false;
    var done = false;
    var listeners = [];

    function push(hinge, how) { hinge.push(how.torque * hinge.weight, how.until); }
    function near(spring, pixels) { return Math.abs(spring.value - spring.target) < pixels; }
    function formed(hinge) { return hinge ? Math.max(0, Math.min(1, (hinge.peak - 20 * DEG) / (100 * DEG))) : 0; }

    // Choreography, in simulated time.
    world.at(0, function () {
      lift.set(1);
      scale.set(fit);
      shiftX.set(fitX);
      shiftY.set(fitY);
      step(layer, "lift");
    });
    world.at(FOLD.start, function () {
      split.bottom = true;
      dirty = true;
      push(hinges.bottom, FOLD.laid);
      step(layer, "one");
    });
    world.when(function () { return split.bottom && hinges.bottom.angle > FOLD.next; }, function () {
      split.top = true;
      dirty = true;
      push(hinges.top, compact ? FOLD.pressed : FOLD.laid);
      step(layer, "two");
    });
    if (hinges.half) {
      world.when(function () { return split.top && hinges.top.angle > FOLD.next; }, function () {
        split.cols = true;
        dirty = true;
        push(hinges.half, FOLD.pressed);
        step(layer, "three");
      });
    }
    // The last crease has met the stack and sprung open to its widest: the
    // letter travels to its place and settles onto the glass while the leaf
    // finds its rest.
    world.when(function () { return last.impacts.length > 0 && last.velocity >= 0; }, function () {
      parked = true;
      lift.set(FOLD.rest / FOLD.lift);
      scale.set(parkScale);
      shiftX.set(parkX);
      shiftY.set(parkY);
    });
    world.when(function () {
      return parked && near(shiftX, 0.75) && near(shiftY, 0.75) &&
        Math.abs(scale.value - scale.target) * H < 0.75 && Math.abs(lift.value - lift.target) * FOLD.lift < 0.5;
    }, function () {
      done = true;
      listeners.splice(0).forEach(function (fn) { fn(); });
    });

    function layout() {
      dirty = false;
      parts.pieces.forEach(function (piece, index) {
        var spec = piece.spec;
        var ground = parts.grounds[index];
        var shown = (spec.col === "R" || split.cols) && (spec.row === "mid" || split[spec.row]);
        var left = spec.col === "L" ? 0 : split.cols ? x1 : 0;
        var right = spec.col === "L" ? x1 : W;
        var top = spec.row === "top" ? 0 : spec.row === "bottom" ? y2 : split.top ? y1 : 0;
        var bottom = spec.row === "top" ? y1 : spec.row === "bottom" ? H : split.bottom ? y2 : H;
        piece.rect = { x: left, y: top, w: right - left, h: bottom - top };
        piece.shown = shown;
        flag(piece, "data-shown", shown ? "true" : "false");
        flag(ground, "data-shown", shown ? "true" : "false");
        if (!shown) return;
        put(piece, "width", piece.rect.w + "px");
        put(piece, "height", piece.rect.h + "px");
        // Sheet-sized layers, offset by a transform so the split moves
        // nothing in layout (and is no layout shift).
        [piece.film, piece.print].forEach(function (sheetLayer) {
          put(sheetLayer, "width", W + "px");
          put(sheetLayer, "height", H + "px");
          put(sheetLayer, "transform", "translate(" + -left + "px," + -top + "px)");
        });
        put(piece.print, "background", options.rules || "none");
        if (piece.printed !== options.print) { piece.printed = options.print || ""; piece.print.node.innerHTML = piece.printed; }
        ground.inset = Math.max(0, Math.min(FOLD.ground.spread, piece.rect.w / 2 - 1, piece.rect.h / 2 - 1));
        put(ground, "width", (piece.rect.w - 2 * ground.inset) + "px");
        put(ground, "height", (piece.rect.h - 2 * ground.inset) + "px");
      });
      put(parts.casts.bottom, "width", W + "px");
      put(parts.casts.bottom, "height", (H - y2) + "px");
      put(parts.casts.top, "width", W + "px");
      put(parts.casts.top, "height", y1 + "px");
      put(parts.casts.half, "width", (y2 - y1) + "px");
      put(parts.casts.half, "height", x1 + "px");
    }

    // A shadow on the plane z = 0 (the glass) of a piece drawn by `matrix`,
    // cast along the key light: an affine map of the piece's own rectangle.
    function onGlass(matrix, inset) {
      var m = matrix;
      var g = [
        m[0] + cast[0] * m[2], m[1] + cast[1] * m[2], 0, 0,
        m[4] + cast[0] * m[6], m[5] + cast[1] * m[6], 0, 0,
        0, 0, 1, 0,
        m[12] + cast[0] * m[14], m[13] + cast[1] * m[14], 0, 1
      ];
      return M.multiply(g, M.translate(inset, inset, 0));
    }
    function groundOpacity(height) { return light.contact(height, FOLD.ground).opacity; }
    // A turning panel's shadow on the sheet beneath it, along the key light.
    function castShadow(item, active, angle, u, origin, toward, layers, G) {
      var sin = Math.sin(angle), cos = Math.cos(angle);
      var v = toward === "down" ? [cast[0] * sin, cos + cast[1] * sin] :
        toward === "up" ? [cast[0] * sin, -cos + cast[1] * sin] : [-cos + cast[0] * sin, cast[1] * sin];
      // How much of it falls on the sheet that receives it rather than behind
      // the hinge, where the panel came from.
      var onto = toward === "down" ? -v[1] : toward === "up" ? v[1] : v[0];
      var area = Math.abs(u[0] * v[1] - u[1] * v[0]);
      var strength = active ? FOLD.cast * Math.pow(Math.max(0, sin), .75) * Math.max(0, Math.min(1, onto / .3, area / .3)) * layers : 0;
      put(item, "opacity", strength.toFixed(3));
      if (strength <= 0) return;
      var local = [u[0], u[1], 0, 0, v[0], v[1], 0, 0, 0, 0, 1, 0, origin[0], origin[1], origin[2], 1];
      put(item, "transform", M.css(M.multiply(G, local)));
    }

    function paint(w, alpha) {
      if (dirty) layout();
      var s = scale.at(alpha);
      var E = lift.at(alpha) * FOLD.lift;
      var G = M.chain(M.translate(shiftX.at(alpha), shiftY.at(alpha), E), M.scale(s, s, s));
      var tb = hinges.bottom.at(alpha), tt = hinges.top.at(alpha), th = hinges.half ? hinges.half.at(alpha) : 0;
      var rows = {
        mid: M.identity(),
        bottom: M.about(M.rotateX(tb), 0, y2, gap / 2),
        top: M.about(M.rotateX(-tt), 0, y1, gap)
      };
      var halfFold = M.about(M.rotateY(th), x1, 0, gap * 2.5);
      // A film in optical contact with the glass is invisible; it shows as a
      // sheet once air gets under it.
      detached = Math.max(detached, Math.min(1, lift.at(alpha) / .35));
      put(parts.camera, "perspective", FOLD.perspective + "px");
      put(parts.camera, "perspective-origin", eye[0].toFixed(1) + "px " + eye[1].toFixed(1) + "px");
      parts.pieces.forEach(function (piece, index) {
        if (!piece.shown) return;
        var spec = piece.spec, rect = piece.rect;
        var fold = spec.col === "L" ? M.multiply(halfFold, rows[spec.row]) : rows[spec.row];
        var matrix = M.chain(G, fold, M.translate(rect.x, rect.y, 0));
        put(piece, "transform", M.css(matrix));
        // Which side faces the eye, and how the key light falls on it.
        var normal = M.direction(fold, [0, 0, 1]);
        var centre = M.apply(matrix, [rect.w / 2, rect.h / 2, 0]);
        var back = normal[0] * (eye[0] - centre[0]) + normal[1] * (eye[1] - centre[1]) + normal[2] * (eye[2] - centre[2]) < 0;
        var tone = light.tone(back ? [-normal[0], -normal[1], -normal[2]] : normal);
        flag(piece.tone, "data-tone", tone < 0 ? "shade" : "shine");
        put(piece.tone, "opacity", Math.min(.32, tone < 0 ? -tone * FOLD.shade : tone * FOLD.shine).toFixed(3));
        put(piece.film, "opacity", detached.toFixed(3));
        // The lines show through the frosted film, faintly, from behind.
        put(piece.print, "opacity", back ? ".18" : "1");
        piece.marks.forEach(function (mark) {
          var hinge = hinges[mark.hinge];
          var made = formed(hinge);
          // The dashed crease marks a fold while it is open and fades as the
          // panel lies down; the olive inner fold stays.
          put(mark.crease, "opacity", Math.min(made, 1.4 * Math.sin(hinge.at(alpha))).toFixed(3));
          put(mark.liner, "opacity", (back ? made : 0).toFixed(3));
        });
        var ground = parts.grounds[index];
        var shadow = onGlass(matrix, ground.inset);
        put(ground, "transform", M.css(shadow));
        // A shadow squeezed thin by the projection is spread by the penumbra
        // in reality; its blur here is fixed, so it fades with its area.
        var area = Math.abs(shadow[0] * shadow[5] - shadow[1] * shadow[4]) / (s * s);
        put(ground, "opacity", (groundOpacity(centre[2]) * Math.min(1, area / .45)).toFixed(3));
      });
      castShadow(parts.casts.bottom, split.bottom, tb, [1, 0], [0, y2, gap / 2], "down", 1, G);
      castShadow(parts.casts.top, split.top, tt, [1, 0], [0, y1, gap * 1.5], "up", 1, G);
      castShadow(parts.casts.half, split.cols, th, [0, 1], [x1, y1, gap * 2.5], "left", 1.6, G);
    }
    world.paint(paint);

    return {
      world: world,
      onParked: function (fn) { if (done) fn(); else listeners.push(fn); }
    };
  }

  function playFold(layer, sheetNode, options, instant) {
    var compact = options.compact;
    var size = parkedSize(options.width, options.height, compact);
    var pad = options.pad || 0;
    prepareLayer(layer, sheetNode, options.width, options.height, compact);
    if (foldScene) { foldScene.world.destroy(); foldScene = null; }
    if (!Physics || !sheetNode) {
      // Without the physics module there is nothing to draw the letter with;
      // the thank-you follows at once.
      layer.hidden = true;
      return Promise.resolve();
    }
    var scene = foldScene = createFoldScene(layer, sheetNode, Object.assign({}, options, { instant: instant, pad: pad }));
    return new Promise(function (resolve) {
      scene.onParked(function () { park(layer, size, pad); resolve(); });
      scene.world.start();
    });
  }
  function runFold(layer, sheetNode, options) { return playFold(layer, sheetNode, options, false); }
  function runFoldInstant(layer, sheetNode, options) { return playFold(layer, sheetNode, options, true); }

  /* ---- Finale ---------------------------------------------------------- */
  function scrollTo(node, block, instant) {
    try { node.scrollIntoView({ block: block, behavior: instant ? "auto" : "smooth" }); } catch (error) { node.scrollIntoView(); }
  }
  function settle(instant) {
    // Both the parked letter and the heading stay on screen: the heading's
    // scroll margin reaches back to the top of the sheet, under the bar, but
    // never so far that the heading itself would leave a short viewport.
    if (!sentTitle) return;
    var offset = sentTitle.getBoundingClientRect().top - sheet.getBoundingClientRect().top;
    var room = window.innerHeight - sentTitle.offsetHeight - 24;
    var wanted = Math.max(navHeight() + 16, Math.min(navHeight() + 16 + Math.max(0, offset), room));
    // The page already keeps the bar clear through scroll-padding; the margin
    // adds only what is left.
    var padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    sentTitle.style.scrollMarginTop = Math.round(Math.max(0, wanted - padding)) + "px";
    // The view and the focus move to the heading unless the visitor has
    // already moved on elsewhere on the page while the letter folded.
    var active = document.activeElement;
    if (active && active !== document.body && !sheet.contains(active)) return;
    scrollTo(sentTitle, "start", instant);
    sentTitle.focus({ preventScroll: true });
  }

  function showSent() {
    var instant = reducedMotion();
    var compact = narrow();
    cancelFold();
    var run = foldRun;
    say(t.sentStatus);
    if (sentEmail) sentEmail.textContent = fields.email.value.trim();
    // The sheet comes into frame before it folds, and keeps its height while
    // the sheet folds so the page under it does not jump. Where it will rest
    // is known now, so the fold is framed for that place even if the scroll
    // is still finishing.
    var startBox = sheet.getBoundingClientRect();
    var scrollY = window.pageYOffset || 0;
    var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    var target = Math.min(maxScroll, Math.max(0, scrollY + startBox.top - (navHeight() + 16)));
    var restingTop = startBox.top - (target - scrollY);
    scrollTo(sheet, "start", instant);
    var started = false;
    var begin = function () {
      if (started || run !== foldRun) return;
      started = true;
      var box = sheet.getBoundingClientRect();
      var rules = measureRules(sheet, box);
      var print = measurePrint(sheet, box);
      var top = instant ? box.top : restingTop;
      var clear = Math.max(top, navHeight() + 12);
      sheet.style.minHeight = Math.round(box.height) + "px";
      sheet.setAttribute("data-state", "folding");
      if (written) written.hidden = true;
      if (foot) foot.hidden = true;
      form.hidden = true;
      if (sentCopy) sentCopy.hidden = true;
      if (sent) sent.hidden = false;
      var folded = fold ? (instant ? runFoldInstant : runFold)(fold, foldSheet, {
        width: box.width,
        height: box.height,
        compact: compact,
        rules: rules,
        print: print,
        // The visible room under the bar, and how far below the sheet's top it starts.
        room: window.innerHeight - clear - FOLD.margin,
        offset: clear - top,
        pad: status ? parseFloat(getComputedStyle(status).paddingLeft) || 0 : 0
      }) : Promise.resolve();
      folded.then(function () {
        if (run !== foldRun) return;
        if (sentCopy) sentCopy.hidden = false;
        sheet.setAttribute("data-state", "sent");
        // The sheet gives back the height it held, but never so much that
        // the page under it rises into view: what is on screen stays put.
        var floor = Math.round(window.innerHeight - sheet.getBoundingClientRect().top);
        sheet.style.minHeight = floor > 0 ? Math.min(Math.round(box.height), floor) + "px" : "";
        settle(instant);
      });
    };
    // The world starts at once: the layer scrolls with the sheet, so the eye
    // stays on the letter while the page settles under the bar.
    begin();
  }

  function reset() {
    // A quick second message must not be undone by a fold still in flight.
    cancelFold();
    // Name and address stay; the new message starts clean.
    topics.forEach(function (input) { input.checked = false; });
    if (fields.message) fields.message.value = "";
    if (fields.honeypot) fields.honeypot.value = "";
    ORDER.forEach(clearError);
    hideSummary();
    updateCounter();
    growMessage();
    say("");
    if (sent) sent.hidden = true;
    if (sentCopy) sentCopy.hidden = true;
    if (fold) { fold.hidden = true; fold.removeAttribute("data-fold-step"); fold.style.height = ""; fold.style.width = ""; }
    if (foldSheet) { foldSheet.style.width = ""; foldSheet.style.height = ""; }
    if (written) written.hidden = false;
    if (foot) foot.hidden = false;
    form.hidden = false;
    sheet.style.minHeight = "";
    sheet.setAttribute("data-state", "idle");
    prepareChallenge(true);
    resetCaptcha();
    var target = fields.name && fields.name.value.trim() ? (fields.email.value.trim() ? topics[0] : fields.email) : fields.name;
    if (target) {
      target.focus({ preventScroll: true });
      scrollTo(target.closest(".contact-field, .contact-topics") || target, "center", reducedMotion());
    }
  }
  if (again) again.addEventListener("click", reset);

  enableForm();
})();

(function () {
  "use strict";
  try {
    var root = document.querySelector("main[data-contact-glass]");
    var stage = root && root.querySelector("[data-contact-stage]");
    var art = stage && stage.querySelector("[data-contact-art]");
    var host = stage && stage.querySelector("[data-glass-scene]");
    if (!root || !stage || !art || !host) return;
    var frame = 0, destroyed = false, near = true, current = "";
    function on(target, name, handler, options) { target.addEventListener(name, handler, options || false); }
    function clamp(value) { return Math.max(0, Math.min(1, value)); }
    function smooth(value) { value = clamp(value); return value * value * (3 - 2 * value); }
    function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
    function request() { if (!frame && !destroyed && near && !document.hidden) frame = requestAnimationFrame(paint); }
    function paint() {
      frame = 0;
      if (destroyed || document.hidden) return;
      var scene = window.PortfolioHeroScene;
      // Before the renderer reports, only the picture shows; an unavailable
      // renderer, no JavaScript and a destroyed owner leave the picture alone.
      var verdict = !scene ? "off" : scene.status === "fallback" || scene.status === "destroyed" ? "off" : scene.status === "ready" ? "on" : "pending";
      if (verdict !== current) { root.dataset.contactGlass = verdict; current = verdict; }
      if (!scene || verdict === "off" || typeof scene.setCompactProgress !== "function") return;
      var box = stage.getBoundingClientRect();
      var travel = Math.max(1, stage.offsetHeight - art.offsetHeight);
      // The object meets the visitor three-quarters on and settles toward the
      // home page's resting angle as the letter scrolls past it; it never
      // turns edge-on.
      scene.setCompactProgress(.25 + .5 * smooth(-box.top / travel));
    }
    on(window, "scroll", request, { passive: true });
    on(window, "resize", request, { passive: true });
    on(window, "load", request, { once: true });
    on(window, "portfolio:heroready", request);
    on(window, "portfolio:motionchange", request);
    on(window, "pageshow", request);
    on(document, "visibilitychange", function () { if (document.hidden) stop(); else request(); });
    if (typeof IntersectionObserver === "function") {
      new IntersectionObserver(function (entries) {
        near = entries.some(function (entry) { return entry.isIntersecting; });
        if (near) request(); else stop();
      }, { rootMargin: "120px 0px" }).observe(stage);
    }
    if (typeof ResizeObserver === "function") new ResizeObserver(request).observe(stage);
    request();
  } catch (error) {
    var main = document.querySelector("main[data-contact-glass]");
    if (main) main.dataset.contactGlass = "off";
  }
})();
