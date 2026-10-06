/** Contact page owners. Plain ES2018, no dependencies. Strings follow the
 *  document language.
 *  1. The proof of work: a compact pure-JS SHA-256 run in short time slices,
 *     exposed as window.PortfolioContactPow so it can be verified in Node.
 *  2. The form: validation that mirrors the server's rules, the challenge,
 *     send, and the finale. The fold motion lives in one function,
 *     runFold(), which receives the layer and sheet and resolves when the
 *     sheet has parked; reduced motion takes runFoldInstant() instead.
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
    loadTimeout: 10000
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
      still: "Still working…",
      sending: "Sending…",
      sentStatus: "Thank you, your message is on its way.",
      rate: "Too many messages have come from your network recently. What you wrote is still here. Try again later, or write to me on " + linkedInLink("LinkedIn") + ".",
      failed: "Your message was not sent. What you wrote is still here. Try again, or write to me on " + linkedInLink("LinkedIn") + ".",
      unavailable: "The form is paused for now. What you wrote is still here. Write to me on " + linkedInLink("LinkedIn") + " instead.",
      unsupported: "This browser cannot run the spam check, so the form cannot send. Write to me on " + linkedInLink("LinkedIn") + " instead.",
      captchaWaiting: "Waiting for the human check to finish…",
      captchaExpired: "The human check expired. It will refresh on its own; then send again.",
      captchaError: "The human check could not load. Check your connection and try again, or write to me on " + linkedInLink("LinkedIn") + ".",
      captchaFailed: "The human check did not go through. It has refreshed; send again.",
      captchaUnavailable: "The human check is not available right now. Your message is still here. Try again in a minute, or write to me on " + linkedInLink("LinkedIn") + ".",
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
      still: "Még dolgozom rajta…",
      sending: "Küldés…",
      sentStatus: "Köszönöm, az üzeneted elment.",
      rate: "A hálózatodról az utóbbi időben túl sok üzenet érkezett. Amit írtál, itt maradt. Próbáld újra később, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
      failed: "Az üzeneted nem ment el. Amit írtál, itt maradt. Próbáld újra, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
      unavailable: "Az űrlap most szünetel. Amit írtál, itt maradt. Írj nekem inkább " + linkedInLink("LinkedInen") + ".",
      unsupported: "Ebben a böngészőben nem fut le a spamszűrő, ezért az űrlap nem tudja elküldeni az üzenetet. Írj nekem inkább " + linkedInLink("LinkedInen") + ".",
      captchaWaiting: "Várakozás az emberellenőrzésre…",
      captchaExpired: "Lejárt az emberellenőrzés. Magától frissül, utána küldd el újra.",
      captchaError: "Nem töltött be az emberellenőrzés. Ellenőrizd a kapcsolatot és próbáld újra, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
      captchaFailed: "Nem sikerült az emberellenőrzés. Frissült, küldd el újra.",
      captchaUnavailable: "Az emberellenőrzés most nem érhető el. Az üzeneted itt maradt. Próbáld újra egy perc múlva, vagy írj nekem " + linkedInLink("LinkedInen") + ".",
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

  function say(text, asHtml) {
    if (!status) return;
    if (asHtml) status.innerHTML = text; else status.textContent = text;
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
  var captcha = { token: null, widget: null, failed: false, waiters: [] };
  function siteKey() {
    return TURNSTILE.hosts.indexOf(location.hostname) !== -1 ? TURNSTILE.production : TURNSTILE.test;
  }
  function settleWaiters(error) {
    var waiters = captcha.waiters;
    captcha.waiters = [];
    waiters.forEach(function (waiter) { if (error) waiter.reject(error); else waiter.resolve(captcha.token); });
  }
  function captchaReady(token) {
    captcha.token = token || null;
    captcha.failed = false;
    if (captcha.token) settleWaiters(null);
  }
  function captchaExpired() {
    captcha.token = null;
    resetCaptcha();
    if (!busy) say(t.captchaExpired);
  }
  function captchaError() {
    captcha.token = null;
    captcha.failed = true;
    say(t.captchaError, true);
    settleWaiters(new Error("captcha"));
  }
  function resetCaptcha() {
    captcha.token = null;
    try { if (window.turnstile && captcha.widget !== null) window.turnstile.reset(captcha.widget); } catch (error) { /* the widget is gone */ }
  }
  function renderCaptcha() {
    if (!checkBox || !window.turnstile || captcha.widget !== null) return;
    try {
      captcha.widget = window.turnstile.render(checkBox, {
        sitekey: siteKey(),
        action: "contact",
        theme: "light",
        language: lang,
        appearance: "always",
        "response-field": false,
        callback: captchaReady,
        "expired-callback": captchaExpired,
        "error-callback": captchaError,
        "timeout-callback": captchaExpired
      });
    } catch (error) { captchaError(); }
  }
  // The script loads async; render as soon as it is there, and give up with
  // a clear message rather than a dead button if it never arrives.
  (function awaitTurnstile() {
    if (!checkBox) return;
    var script = document.querySelector("[data-contact-turnstile-script]");
    var started = Date.now();
    if (script) script.addEventListener("error", captchaError, { once: true });
    (function poll() {
      if (captcha.failed) return;
      if (window.turnstile) { renderCaptcha(); return; }
      if (Date.now() - started > TURNSTILE.loadTimeout) { captchaError(); return; }
      setTimeout(poll, 150);
    })();
  })();
  // Resolves with a token: at once when one is held, or when the check
  // completes; rejects if the check cannot load.
  function ensureCaptcha() {
    if (captcha.token) return Promise.resolve(captcha.token);
    if (captcha.failed) return Promise.reject(new Error("captcha"));
    say(t.captchaWaiting);
    return new Promise(function (resolve, reject) { captcha.waiters.push({ resolve: resolve, reject: reject }); });
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
  // where they are writing.
  form.addEventListener("focusin", function (event) {
    var target = event.target.closest(".contact-field, .contact-topic, .contact-actions");
    if (!target) return;
    var box = target.getBoundingClientRect();
    if (box.top >= navHeight() + 8 && box.bottom <= window.innerHeight - 8) return;
    try { target.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }); } catch (error) { /* ignore */ }
  });

  // Validate a field once the visitor leaves it, and clear its error as soon
  // as they fix it. Never scold while the field is still being typed into.
  ["name", "email", "message"].forEach(function (key) {
    var input = fields[key];
    if (!input) return;
    input.addEventListener("blur", function () {
      if (input.value.trim() === "" && !controlFor(key).hasAttribute("data-invalid")) return;
      var message = validateField(key);
      if (message) setError(key, message); else clearError(key);
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
    if (submitLabel) submitLabel.textContent = flag ? t.sending : idleLabel;
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
    // The human check must have answered before anything is posted.
    try { await ensureCaptcha(); } catch (error) { return { ok: false, kind: "captchaError" }; }
    if (!ready) {
      say(t.checking);
      stillTimer = setTimeout(function () { if (busy) say(t.still); }, STILL_WORKING_AFTER);
      try { ready = await prepareChallenge(!solving); } finally { clearTimeout(stillTimer); }
    }
    // Never post before the challenge is old enough; the progress text stays
    // up while we wait, on the first try and on a retry alike.
    var age = MIN_CHALLENGE_AGE - (Date.now() - (ready.receivedAt || 0));
    if (age > 0) { say(t.checking); await wait(age); }
    say(t.sending);
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
      if (result.kind === "captchaError") { say(t.captchaError, true); return; }
      if (result.kind === "captchaFailed") { say(t.captchaFailed); return; }
      if (result.kind === "captchaUnavailable") { say(t.captchaUnavailable, true); return; }
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
  // receives the decorative layer and its sheet, drives the steps through
  // the stylesheet's transitions, and resolves once the sheet has parked;
  // runFoldInstant() is the reduced-motion path. Both leave the layer in
  // the same final state. Replace runFold() to change the choreography.
  var foldTimers = [];
  function later(fn, ms) { foldTimers.push(setTimeout(fn, ms)); }
  function cancelFold() { foldTimers.forEach(clearTimeout); foldTimers = []; }
  function step(layer, name) {
    var steps = (layer.getAttribute("data-fold-step") || "").split(/\s+/).filter(Boolean);
    if (steps.indexOf(name) === -1) steps.push(name);
    layer.setAttribute("data-fold-step", steps.join(" "));
  }
  function parkedSize(width, height, compact) {
    var scale = compact ? .62 : .72;
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
  function park(layer, size) {
    step(layer, "park");
    layer.style.height = size.height + "px";
    layer.style.width = size.width + "px";
  }
  function runFold(layer, sheetNode, options) {
    var compact = options.compact;
    var size = parkedSize(options.width, options.height, compact);
    prepareLayer(layer, sheetNode, options.width, options.height, compact);
    void layer.offsetHeight;
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        layer.removeEventListener("transitionend", onEnd);
        resolve();
      }
      function onEnd(event) {
        if (event.target === layer && event.propertyName === "height") finish();
      }
      layer.addEventListener("transitionend", onEnd);
      later(function () { step(layer, "lift"); }, 30);
      later(function () { step(layer, "one"); }, 340);
      later(function () { step(layer, "two"); }, 900);
      later(function () { if (!compact) step(layer, "three"); }, 1460);
      later(function () { park(layer, size); }, compact ? 1560 : 2080);
      // The height transition ends the sequence; a lost event must not.
      later(finish, (compact ? 1560 : 2080) + 1200);
    });
  }
  function runFoldInstant(layer, sheetNode, options) {
    var compact = options.compact;
    prepareLayer(layer, sheetNode, options.width, options.height, compact);
    step(layer, "one"); step(layer, "two"); if (!compact) step(layer, "three");
    park(layer, parkedSize(options.width, options.height, compact));
    return Promise.resolve();
  }

  /* ---- Finale ---------------------------------------------------------- */
  function scrollTo(node, block, instant) {
    try { node.scrollIntoView({ block: block, behavior: instant ? "auto" : "smooth" }); } catch (error) { node.scrollIntoView(); }
  }
  function settle(instant) {
    // Both the parked letter and the heading stay on screen: the heading's
    // scroll margin reaches back to the top of the sheet, under the bar.
    if (!sentTitle) return;
    var offset = sentTitle.getBoundingClientRect().top - sheet.getBoundingClientRect().top;
    sentTitle.style.scrollMarginTop = Math.round(navHeight() + 16 + Math.max(0, offset)) + "px";
    scrollTo(sentTitle, "start", instant);
    sentTitle.focus({ preventScroll: true });
  }

  function showSent() {
    var instant = reducedMotion();
    var compact = narrow();
    cancelFold();
    say(t.sentStatus);
    if (sentEmail) sentEmail.textContent = fields.email.value.trim();
    // The sheet comes into frame before it folds, and keeps its height while
    // the sheet folds so the page under it does not jump.
    scrollTo(sheet, "start", instant);
    var begin = function () {
      var box = sheet.getBoundingClientRect();
      sheet.style.minHeight = Math.round(box.height) + "px";
      sheet.setAttribute("data-state", "folding");
      if (written) written.hidden = true;
      if (foot) foot.hidden = true;
      form.hidden = true;
      if (sentCopy) sentCopy.hidden = true;
      if (sent) sent.hidden = false;
      var run = (instant || !fold) ? runFoldInstant : runFold;
      var finished = fold ? run(fold, foldSheet, { width: box.width, height: box.height, compact: compact }) : Promise.resolve();
      finished.then(function () {
        if (sentCopy) sentCopy.hidden = false;
        sheet.setAttribute("data-state", "sent");
        sheet.style.minHeight = "";
        settle(instant);
      });
    };
    if (instant) begin(); else later(begin, 420);
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
