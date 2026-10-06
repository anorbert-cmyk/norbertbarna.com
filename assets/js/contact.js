/** Contact page owners. Plain ES2018, no dependencies. Strings follow the
 *  document language.
 *  1. The glass: hero-scene.js renders the chevron in its own slot on the
 *     paper; this owner only tells it how far the stage has scrolled
 *     (the compact contract) and records its verdict on <main>.
 *  2. The form: validation, proof-of-work challenge, send, fold. */
(function () {
  "use strict";
  var root = document.querySelector("main[data-contact-glass]");
  var stage = root && root.querySelector("[data-contact-stage]");
  var art = stage && stage.querySelector("[data-contact-art]");
  var host = stage && stage.querySelector("[data-glass-scene]");
  if (!root || !stage || !art || !host) return;
  var frame = 0, destroyed = false, near = true, current = "";
  var listeners = new AbortController();
  function on(target, name, handler, options) {
    target.addEventListener(name, handler, Object.assign({ signal: listeners.signal }, options || {}));
  }
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
    scene.setCompactProgress(smooth(-box.top / travel));
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
})();

(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  var sheet = document.querySelector("[data-contact-sheet]");
  if (!form || !sheet) return;

  var isHungarian = /^hu(?:-|$)/i.test(document.documentElement.lang);
  var lang = isHungarian ? "hu" : "en";
  var linkedIn = "https://www.linkedin.com/in/barna-norbert/";
  var linkedInLink = function (label) {
    return "<a href=\"" + linkedIn + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + label + "</a>";
  };
  var STRINGS = {
    en: {
      nameShort: "Please tell me your name (at least 2 characters).",
      nameLong: "Your name can be at most 100 characters.",
      emailInvalid: "Please enter an email address I can answer to.",
      emailLong: "The email address can be at most 254 characters.",
      topic: "Please choose what you want to talk about.",
      messageShort: "Please write at least 20 characters so I know how I can help.",
      messageLong: "The message can be at most 5000 characters.",
      checking: "Checking you are human…",
      sending: "Sending…",
      sent: "Your message is sent.",
      rate: "Too many messages from here for now. Please try again later.",
      failed: "Sending failed. Please try again, or reach me on " + linkedInLink("LinkedIn") + ".",
      unsupported: "This browser cannot run the spam check. Please write to me on " + linkedInLink("LinkedIn") + ".",
      errorPrefix: "Error: ",
      summaryTitle: "There is a problem",
      remaining: function (n) { return n === 1 ? "You have 1 character left." : "You have " + n + " characters left."; },
      overLimit: function (n) { return "You are " + n + (n === 1 ? " character" : " characters") + " over the limit."; }
    },
    hu: {
      nameShort: "Add meg a neved (legalább 2 karakter).",
      nameLong: "A név legfeljebb 100 karakter lehet.",
      emailInvalid: "Adj meg egy e-mail-címet, amire válaszolhatok.",
      emailLong: "Az e-mail-cím legfeljebb 254 karakter lehet.",
      topic: "Válaszd ki, miről szeretnél beszélni.",
      messageShort: "Írj legalább 20 karaktert, hogy tudjam, miben segíthetek.",
      messageLong: "Az üzenet legfeljebb 5000 karakter lehet.",
      checking: "Ellenőrzöm, hogy nem robot vagy…",
      sending: "Küldés…",
      sent: "Az üzeneted elment.",
      rate: "Innen most túl sok üzenet érkezett. Próbáld újra később.",
      failed: "A küldés nem sikerült. Próbáld újra, vagy írj " + linkedInLink("LinkedInen") + ".",
      unsupported: "Ebben a böngészőben nem fut a spamszűrő. Írj inkább " + linkedInLink("LinkedInen") + ".",
      errorPrefix: "Hiba: ",
      summaryTitle: "Hiba van az űrlapon",
      remaining: function (n) { return "Még " + n + " karaktert írhatsz."; },
      overLimit: function (n) { return n + " karakterrel több a megengedettnél."; }
    }
  };
  var t = STRINGS[lang];
  var status = form.querySelector(".contact-status");

  /* ---- Status line ----------------------------------------------------- */
  function say(text, asHtml) {
    if (!status) return;
    if (asHtml) status.innerHTML = text; else status.textContent = text;
  }

  // The form has no native action: posting JSON needs the proof of work,
  // which needs fetch and SubtleCrypto. Without them the submit must not
  // leave the page for a raw API response; it offers LinkedIn instead.
  if (!window.fetch || !window.crypto || !window.crypto.subtle || typeof TextEncoder !== "function") {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      say(t.unsupported, true);
    });
    return;
  }

  var LIMITS = { nameMin: 2, nameMax: 100, emailMax: 254, messageMin: 20, messageMax: 5000 };
  // The server drops any message that arrives too soon after its challenge
  // was issued; an honest visitor needs this long anyway.
  var MIN_CHALLENGE_AGE = 3300;

  var fields = {
    name: form.querySelector("#contact-name"),
    email: form.querySelector("#contact-email"),
    message: form.querySelector("#contact-message"),
    honeypot: form.querySelector("#contact-website")
  };
  var topicGroup = form.querySelector(".contact-topics");
  var topics = Array.prototype.slice.call(form.querySelectorAll("input[name=\"topic\"]"));
  var submit = form.querySelector(".contact-submit");
  var counter = form.querySelector("[data-contact-count]");
  var counterBox = form.querySelector("#contact-message-counter");
  var summary = form.querySelector(".contact-error-summary");
  var summaryList = form.querySelector(".contact-error-summary-list");
  var counterLive = form.querySelector("[data-contact-count-live]");
  var sentEmail = sheet.querySelector("[data-contact-sent-email]");
  var written = sheet.querySelector("[data-contact-written]");
  var sent = sheet.querySelector(".contact-sent");
  var sentCopy = sheet.querySelector(".contact-sent-copy");
  var fold = sheet.querySelector("[data-contact-fold]");
  var sentTitle = sheet.querySelector(".contact-sent-title");
  var again = sheet.querySelector(".contact-again");

  function reducedMotion() {
    try {
      return document.documentElement.classList.contains("no-motion") ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) { return true; }
  }

  /* ---- Field errors ---------------------------------------------------- */
  function errorNode(key) { return form.querySelector("#contact-" + key + "-error"); }
  function controlFor(key) { return key === "topic" ? topicGroup : fields[key]; }
  function inputsFor(key) { return key === "topic" ? topics : [fields[key]]; }

  function describedBy(input, id, add) {
    var current = (input.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    var index = current.indexOf(id);
    if (add && index === -1) current.push(id);
    if (!add && index !== -1) current.splice(index, 1);
    if (current.length) input.setAttribute("aria-describedby", current.join(" "));
    else input.removeAttribute("aria-describedby");
  }

  function setError(key, message) {
    var node = errorNode(key);
    var control = controlFor(key);
    if (!node || !control) return;
    node.textContent = "";
    var prefix = document.createElement("span");
    prefix.className = "contact-sr";
    prefix.textContent = t.errorPrefix;
    node.appendChild(prefix);
    node.appendChild(document.createTextNode(message));
    node.hidden = false;
    control.setAttribute("data-invalid", "");
    inputsFor(key).forEach(function (input) {
      input.setAttribute("aria-invalid", "true");
      describedBy(input, node.id, true);
    });
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
    inputsFor(key).forEach(function (input) {
      input.removeAttribute("aria-invalid");
      describedBy(input, node.id, false);
    });
  }

  /* ---- Validation ------------------------------------------------------ */
  function emailLooksValid(value) {
    // One @, something on both sides, a dot in the host, no spaces.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= LIMITS.emailMax;
  }

  function validateField(key) {
    var value;
    switch (key) {
      case "name":
        value = fields.name.value.trim();
        if (value.length < LIMITS.nameMin) return t.nameShort;
        if (value.length > LIMITS.nameMax) return t.nameLong;
        return "";
      case "email":
        value = fields.email.value.trim();
        if (value.length > LIMITS.emailMax) return t.emailLong;
        if (!emailLooksValid(value)) return t.emailInvalid;
        return "";
      case "topic":
        return topics.some(function (input) { return input.checked; }) ? "" : t.topic;
      case "message":
        value = fields.message.value;
        if (value.trim().length < LIMITS.messageMin) return t.messageShort;
        if (value.length > LIMITS.messageMax) return t.messageLong;
        return "";
    }
    return "";
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
    try { summary.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" }); } catch (error) { /* ignore */ }
  }

  if (summaryList) {
    summaryList.addEventListener("click", function (event) {
      var link = event.target.closest("a[data-contact-field]");
      if (!link) return;
      event.preventDefault();
      focusField(link.getAttribute("data-contact-field"));
    });
  }

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

  /* ---- Counter --------------------------------------------------------- */
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
  if (fields.message) {
    fields.message.addEventListener("input", updateCounter);
    updateCounter();
  }

  /* ---- Proof of work --------------------------------------------------- */
  var encoder = new TextEncoder();
  var challenge = null;      // { token, nonce, receivedAt }
  var solving = null;        // Promise<{token, nonce, receivedAt}>
  var armed = false;

  function leadingZeroBits(bytes) {
    var bits = 0;
    for (var i = 0; i < bytes.length; i += 1) {
      var byte = bytes[i];
      if (byte === 0) { bits += 8; continue; }
      var n = 0;
      while ((byte & 0x80) === 0) { byte <<= 1; n += 1; }
      return bits + n;
    }
    return bits;
  }

  function yieldToBrowser() {
    return new Promise(function (resolve) { setTimeout(resolve, 0); });
  }

  async function solve(salt, difficulty) {
    var prefix = salt + ":";
    var nonce = 0;
    var batch = 0;
    for (;;) {
      var digest = await crypto.subtle.digest("SHA-256", encoder.encode(prefix + nonce));
      if (leadingZeroBits(new Uint8Array(digest)) >= difficulty) return nonce;
      nonce += 1;
      batch += 1;
      if (batch >= 400) { batch = 0; await yieldToBrowser(); }
    }
  }

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
      var nonce = await solve(data.salt, data.difficulty);
      var ready = { token: data.token, nonce: nonce, receivedAt: data.receivedAt };
      challenge = ready;
      return ready;
    })();
    // A failed background attempt must not poison the submit path: forget it
    // so submit can try again with a fresh request.
    solving.catch(function () { solving = null; });
    return solving;
  }

  function arm() {
    if (armed) return;
    armed = true;
    prepareChallenge(false);
  }
  form.addEventListener("focusin", arm, { once: true });
  setTimeout(arm, 1500);

  /* ---- Send ------------------------------------------------------------ */
  var busy = false;

  function setBusy(flag) {
    busy = flag;
    form.setAttribute("aria-busy", flag ? "true" : "false");
    if (submit) submit.disabled = flag;
  }

  function payload(ready) {
    var topic = topics.filter(function (input) { return input.checked; })[0];
    return {
      name: fields.name.value.trim(),
      email: fields.email.value.trim(),
      topic: topic ? topic.value : "",
      message: fields.message.value,
      hp_7f3: fields.honeypot ? fields.honeypot.value : "",
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

  async function send(allowRetry) {
    var ready = challenge;
    if (!ready) {
      say(t.checking);
      ready = await prepareChallenge(!solving);
    }
    // Never post before the challenge is old enough; the progress text stays
    // up while we wait, on the first try and on a retry alike.
    var wait = MIN_CHALLENGE_AGE - (Date.now() - (ready.receivedAt || 0));
    if (wait > 0) {
      say(t.checking);
      await new Promise(function (resolve) { setTimeout(resolve, wait); });
    }
    say(t.sending);
    var result = await post(ready);
    // The token is spent either way; the next message needs a fresh one.
    challenge = null;
    solving = null;

    if (result.status === 200 && result.data.ok === true) return { ok: true };
    if (result.status === 403 && result.data.error === "challenge" && allowRetry) {
      say(t.checking);
      return send(false);
    }
    if (result.status === 400 && result.data.error === "invalid") {
      var names = Array.isArray(result.data.fields) ? result.data.fields : [];
      var fallback = { name: t.nameShort, email: t.emailInvalid, topic: t.topic, message: t.messageShort };
      var marked = [];
      ORDER.forEach(function (name) {
        if (names.indexOf(name) === -1) return;
        // The server saw something the client check let through; its own
        // rule for that field is the honest message to show.
        setError(name, validateField(name) || fallback[name]);
        marked.push(name);
      });
      return { ok: false, kind: "invalid", fields: marked };
    }
    if (result.status === 429) return { ok: false, kind: "rate" };
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
      if (result.kind === "rate") { say(t.rate); return; }
      say(t.failed, true);
    }).catch(function () {
      setBusy(false);
      say(t.failed, true);
    });
  });

  /* ---- Fold ------------------------------------------------------------ */
  // The written page leaves the document and a decorative sheet of the same
  // size takes its place, lifts, folds in thirds, then in half, and parks
  // as a letter above the thank-you. Steps are classes; CSS transitions
  // carry them, and reduced motion applies the final step at once.
  var foldTimers = [];
  function later(fn, ms) { foldTimers.push(setTimeout(fn, ms)); }
  function cancelFold() { foldTimers.forEach(clearTimeout); foldTimers = []; }
  function narrow() {
    try { return window.matchMedia("(max-width: 991px)").matches; } catch (error) { return false; }
  }
  function step(name) {
    if (!fold) return;
    var steps = (fold.getAttribute("data-fold-step") || "").split(/\s+/).filter(Boolean);
    if (steps.indexOf(name) === -1) steps.push(name);
    fold.setAttribute("data-fold-step", steps.join(" "));
  }

  function showSent() {
    var instant = reducedMotion();
    var compact = narrow();
    say(t.sent);
    if (sentEmail) sentEmail.textContent = fields.email.value.trim();
    var height = sheet.getBoundingClientRect().height;
    var width = sheet.getBoundingClientRect().width;
    cancelFold();
    sheet.setAttribute("data-state", "sent");
    if (written) written.hidden = true;
    form.hidden = true;
    if (sent) sent.hidden = false;
    if (fold) {
      fold.removeAttribute("data-fold-step");
      fold.classList.toggle("is-narrow", compact);
      fold.style.height = height + "px";
      fold.hidden = false;
    }
    // The parked letter: a third of the sheet, scaled; its width follows.
    var scale = compact ? .62 : .72;
    var parkedHeight = Math.round(height / 3 * scale);
    var parkedWidth = Math.round((compact ? width : width / 2) * scale);
    var park = function () {
      if (!fold) return;
      step("park");
      fold.style.height = parkedHeight + "px";
      fold.style.width = parkedWidth + "px";
    };
    var finish = function () {
      if (sentCopy) sentCopy.hidden = false;
      if (sentTitle) {
        sentTitle.focus({ preventScroll: true });
        try { sentTitle.scrollIntoView({ block: "nearest", behavior: instant ? "auto" : "smooth" }); } catch (error) { /* older engines take no options */ }
      }
    };
    if (instant || !fold) {
      if (fold) { step("one"); step("two"); if (!compact) step("three"); park(); }
      finish();
      return;
    }
    if (sentCopy) sentCopy.hidden = true;
    void fold.offsetHeight;
    later(function () { step("lift"); }, 30);
    later(function () { step("one"); }, 340);
    later(function () { step("two"); }, 900);
    later(function () { if (!compact) step("three"); }, 1460);
    later(park, compact ? 1560 : 2080);
    later(finish, compact ? 2200 : 2720);
  }

  function reset() {
    // A quick second message must not be undone by a fold still in flight.
    cancelFold();
    form.reset();
    ORDER.forEach(clearError);
    hideSummary();
    updateCounter();
    say("");
    if (sent) sent.hidden = true;
    if (sentCopy) sentCopy.hidden = true;
    if (fold) { fold.hidden = true; fold.removeAttribute("data-fold-step"); fold.style.height = ""; fold.style.width = ""; }
    if (written) written.hidden = false;
    form.hidden = false;
    sheet.setAttribute("data-state", "idle");
    prepareChallenge(true);
    if (fields.name) {
      fields.name.focus({ preventScroll: true });
      try { fields.name.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" }); } catch (error) { /* ignore */ }
    }
  }
  if (again) again.addEventListener("click", reset);
})();
