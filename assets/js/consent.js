/** Optional analytics consent. No analytics, requests, cookies or SDK dependencies. */
(function () {
  "use strict";

  if (window.PortfolioAnalyticsConfig?.enabled !== true) return;
  if (window.PortfolioConsent) return;

  var STORAGE_KEY = "bn-analytics-consent-v1";
  var LIFETIME = 180 * 24 * 60 * 60 * 1000;
  var GENERATION_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  var decision = "unset";
  var timestamp = null;
  var generation = null;
  // A failed write must never reveal an older accepted record in this document.
  // Only a successful, explicit new decision can release this fail-closed latch.
  var localOverride = null;
  var storageError = false;
  var expiryTimer = null;
  var opened = false;
  var returnFocus = null;
  var banner;
  var space;
  var heading;
  var current;
  var status;
  var closeButton;
  var focusFrame = null;
  var isHungarian = /^hu(?:-|$)/i.test(document.documentElement.lang);
  var copy = isHungarian ? {
    title: "Választható látogatottságmérés",
    summary: "PostHog: oldallátogatások és kapcsolatfelvételi kattintások.",
    details: "Részletek",
    description: "Az engedélyeddel a PostHog segítségével mérem az oldallátogatásokat és a kapcsolatfelvételi linkek használatát. Nincs munkamenet-felvétel vagy hirdetési követés. Az oldal mérés nélkül is használható.",
    retention: "A döntésed ebben a böngészőben 180 napig érvényes. Az Analytics settings pontban bármikor módosíthatod.",
    privacy: "Adatvédelmi tájékoztató",
    privacyPath: "/hu/adatvedelem",
    reject: "Mérés elutasítása",
    accept: "Mérés engedélyezése",
    close: "Beállítások bezárása",
    enabled: "A mérés jelenleg engedélyezve van.",
    disabled: "A mérés jelenleg ki van kapcsolva.",
    error: "Ezen az oldalon a mérés kikapcsolva marad. A böngésző nem tudta elmenteni a döntésedet. Másik oldal megnyitásakor újra szükség lehet a választásodra."
  } : {
    title: "Optional analytics",
    summary: "Optional PostHog analytics for page visits and contact-link clicks.",
    details: "Details",
    description: "With your permission, I use PostHog to measure page visits and contact-link clicks. No session recordings or advertising tracking. The site works without analytics.",
    retention: "Your choice is valid in this browser for 180 days. Change it at any time in Analytics settings.",
    privacy: "Privacy details",
    privacyPath: "/privacy",
    reject: "Decline analytics",
    accept: "Allow analytics",
    close: "Close settings",
    enabled: "You have allowed analytics.",
    disabled: "You have declined analytics.",
    error: "Analytics is off on this page. Your browser could not save your choice. You may need to choose again on another page."
  };

  function parseRecord(raw) {
    try {
      var record = JSON.parse(raw);
      var now = Date.now();
      if (!record || typeof record !== "object" || Array.isArray(record) || record.version !== 1 ||
          (record.decision !== "accepted" && record.decision !== "rejected") ||
          !Number.isSafeInteger(record.timestamp) || record.timestamp < 0 ||
          record.timestamp > now || now - record.timestamp >= LIFETIME) return null;
      var expectedKeys = record.decision === "accepted" ? "decision,generation,timestamp,version" : "decision,timestamp,version";
      if (Object.keys(record).sort().join(",") !== expectedKeys) return null;
      // Legacy timestamp-only grants cannot identify a distinct consent epoch.
      // Existing three-field rejections remain valid; they authorize no tracking.
      if (record.decision === "accepted" &&
          (typeof record.generation !== "string" || !GENERATION_PATTERN.test(record.generation))) return null;
      return record;
    } catch (error) {
      return null;
    }
  }

  function notifyChange() {
    document.dispatchEvent(new CustomEvent("portfolio:consent-change", {
      detail: { accepted: decision === "accepted" }
    }));
  }

  function scheduleExpiry() {
    window.clearTimeout(expiryTimer);
    expiryTimer = null;
    if (timestamp === null) return;
    // Browser timers have a signed 32-bit delay; 180 days exceeds that limit.
    var remaining = timestamp + LIFETIME - Date.now();
    expiryTimer = window.setTimeout(function () { refresh(true); }, Math.min(Math.max(remaining, 1), 2147483647));
  }

  function keepFocusClear() {
    window.cancelAnimationFrame(focusFrame);
    focusFrame = window.requestAnimationFrame(function () {
      if (!banner || banner.hidden) return;
      var focused = document.activeElement;
      if (!focused || focused === document.body || banner.contains(focused)) return;
      var rect = focused.getBoundingClientRect();
      var bottom = banner.getBoundingClientRect().top - 8;
      var top = parseFloat(window.getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      // Never scroll a large skip-to-main target to its bottom. Only reveal
      // focused controls that fit between the existing navbar and the banner.
      if (!rect.height || rect.height > bottom - top - 8) return;
      if (rect.bottom > bottom) window.scrollBy({ top: rect.bottom - bottom, behavior: "instant" });
    });
  }

  function syncSpace() {
    if (!banner || !space) return;
    space.hidden = banner.hidden;
    if (banner.hidden) space.style.removeProperty("height");
    else {
      var height = Math.ceil(banner.getBoundingClientRect().height) + 16 + "px";
      if (space.style.height !== height) space.style.height = height;
      keepFocusClear();
    }
  }

  function render(restoreOnClose) {
    if (!banner) return;
    var visible = opened || decision === "unset";
    var wasVisible = !banner.hidden;
    var focusWasInside = banner.contains(document.activeElement);
    banner.hidden = !visible;
    status.hidden = !storageError;
    var errorText = storageError ? copy.error : "";
    if (status.textContent !== errorText) status.textContent = errorText;
    current.hidden = storageError || decision === "unset";
    var currentText = current.hidden ? "" : decision === "accepted" ? copy.enabled : copy.disabled;
    if (current.textContent !== currentText) current.textContent = currentText;
    closeButton.hidden = decision === "unset";
    document.querySelectorAll("button[data-consent-settings]").forEach(function (button) {
      button.hidden = false;
      button.setAttribute("aria-controls", banner.id);
      button.setAttribute("aria-expanded", String(visible));
    });
    syncSpace();
    // WebKit can move focus to body before a pointer-clicked Close fires.
    // Explicit closing must still return to the control that opened settings.
    if (!visible && wasVisible && (focusWasInside || restoreOnClose === true) && returnFocus && returnFocus.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
    if (!visible) returnFocus = null;
  }

  function applyDecision(next, savedAt, notify, force, savedGeneration) {
    var nextGeneration = next === "accepted" ? savedGeneration : null;
    var changed = decision !== next || generation !== nextGeneration;
    decision = next;
    timestamp = savedAt;
    generation = nextGeneration;
    scheduleExpiry();
    render();
    // Commit state before dispatch: listeners may call hasConsent synchronously.
    if (notify && (changed || force)) notifyChange();
  }

  function refresh(notify) {
    if (localOverride !== null) return;
    try {
      var storage = window.localStorage;
      var raw = storage.getItem(STORAGE_KEY);
      var record = parseRecord(raw);
      // Expiry is an authorization limit, not a guaranteed deletion deadline.
      // Clean up invalid/expired data on read; removal errors use the deny latch.
      if (raw !== null && !record) storage.removeItem(STORAGE_KEY);
      applyDecision(record ? record.decision : "unset", record ? record.timestamp : null, notify, false, record ? record.generation : null);
    } catch (error) {
      storageError = true;
      localOverride = "unset";
      applyDecision("unset", null, notify, false);
    }
  }

  function setDecision(next) {
    if (next !== "accepted" && next !== "rejected") return;
    var savedAt = Date.now();

    if (next === "rejected") {
      // Revoke before touching storage, including when setItem/removeItem throw.
      localOverride = "rejected";
      applyDecision("rejected", null, true, true);
    }

    try {
      var storage = window.localStorage;
      var record = { version: 1, decision: next, timestamp: savedAt };
      if (next === "accepted") {
        // A new cryptographic generation is persisted before notifying consumers.
        // Never fall back to timestamps or Math.random if secure entropy fails.
        if (!window.crypto || typeof window.crypto.randomUUID !== "function") throw new Error("Secure consent generation unavailable");
        record.generation = window.crypto.randomUUID();
        if (typeof record.generation !== "string" || !GENERATION_PATTERN.test(record.generation)) throw new Error("Invalid consent generation");
      }
      var encoded = JSON.stringify(record);
      storage.setItem(STORAGE_KEY, encoded);
      var raw = storage.getItem(STORAGE_KEY);
      var saved = parseRecord(raw);
      if (raw !== encoded || !saved) {
        throw new Error("Consent was not persisted");
      }
      localOverride = null;
      storageError = false;
      opened = false;
      applyDecision(next, savedAt, true, next === "accepted", saved.generation);
    } catch (error) {
      localOverride = next === "rejected" ? "rejected" : "unset";
      storageError = true;
      opened = true;
      // Removing just this key can prevent a stale grant on subsequent pages.
      // If all storage is blocked, the in-memory denial still applies immediately.
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (removeError) { /* fail closed */ }
      applyDecision(localOverride, null, true, next === "accepted");
    }
  }

  function open(trigger) {
    refresh(true);
    // A mouse-clicked button is not necessarily document.activeElement.
    if (trigger instanceof Element && trigger.matches("button[data-consent-settings]")) returnFocus = trigger;
    else if (banner && !banner.contains(document.activeElement)) returnFocus = document.activeElement;
    opened = true;
    render();
    // Focus moves only after an explicit settings request, never on initial load.
    if (heading) heading.focus({ preventScroll: true });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function mount() {
    if (banner || !document.body) return;
    banner = element("section", "consent-banner");
    banner.id = "portfolio-consent";
    banner.hidden = true;
    banner.lang = isHungarian ? "hu" : "en";
    banner.setAttribute("data-consent-banner", "");
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-labelledby", "portfolio-consent-title");
    var inner = element("div", "consent-inner");
    var text = element("div", "consent-copy");
    heading = element("h2", "consent-title", copy.title);
    heading.id = "portfolio-consent-title";
    heading.tabIndex = -1;
    text.appendChild(heading);
    current = element("p", "consent-current");
    current.setAttribute("role", "status");
    current.hidden = true;
    text.appendChild(current);
    text.appendChild(element("p", "consent-summary", copy.summary));
    var details = element("details", "consent-details");
    details.appendChild(element("summary", "", copy.details));
    details.appendChild(element("p", "consent-description", copy.description));
    details.appendChild(element("p", "consent-retention", copy.retention));
    details.addEventListener("toggle", syncSpace);
    text.appendChild(details);
    var privacy = element("a", "consent-privacy", copy.privacy);
    privacy.href = copy.privacyPath;
    text.appendChild(privacy);
    status = element("p", "consent-status");
    status.setAttribute("role", "status");
    status.hidden = true;
    text.appendChild(status);
    inner.appendChild(text);
    var actions = element("div", "consent-actions");
    ["rejected", "accepted"].forEach(function (value) {
      var button = element("button", "consent-choice", value === "accepted" ? copy.accept : copy.reject);
      button.type = "button";
      button.setAttribute("data-consent-decision", value);
      button.addEventListener("click", function () { setDecision(value); });
      actions.appendChild(button);
    });
    closeButton = element("button", "consent-close", copy.close);
    closeButton.type = "button";
    closeButton.addEventListener("click", function () {
      opened = false;
      render(true);
    });
    actions.appendChild(closeButton);
    inner.appendChild(actions);
    banner.appendChild(inner);
    // Component-owned space lets the last footer control scroll above the
    // overlay without changing the portfolio's body, footer or mesh styles.
    space = element("div", "consent-space");
    space.hidden = true;
    space.setAttribute("aria-hidden", "true");
    document.body.appendChild(space);
    document.body.appendChild(banner);
    if (typeof ResizeObserver === "function") new ResizeObserver(syncSpace).observe(banner);
    render();
  }

  window.PortfolioConsent = Object.freeze({
    hasConsent: function () { refresh(true); return decision === "accepted"; },
    getDecision: function () { refresh(true); return decision; },
    getRevision: function () { refresh(true); return decision === "accepted" ? generation : null; },
    open: open,
    setDecision: setDecision
  });

  document.addEventListener("click", function (event) {
    var trigger = event.target instanceof Element ? event.target.closest("button[data-consent-settings]") : null;
    if (trigger) open(trigger);
  });
  document.addEventListener("focusin", keepFocusClear);
  window.addEventListener("resize", syncSpace);
  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch (error) {
      storageError = true;
      localOverride = "unset";
      applyDecision("unset", null, true, false);
      return;
    }
    // Read current storage, not a potentially superseded event.newValue.
    refresh(true);
  });
  window.addEventListener("pageshow", function () { refresh(true); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") refresh(true);
  });

  refresh(false);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
