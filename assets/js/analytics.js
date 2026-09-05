/* Consent-gated, minimal PostHog Capture API transport. No SDK, queue or replay.
 * API/session contract: https://posthog.com/docs/api/capture
 * https://posthog.com/docs/data/sessions#custom-session-ids
 * Delivery is best effort. A completed transmission cannot be recalled.
 */
(function () {
  'use strict';
  if (window.PortfolioAnalyticsConfig?.enabled !== true) return;
  if (window.PortfolioAnalyticsReady) return;
  window.PortfolioAnalyticsReady = true;
  var ENDPOINT = 'https://eu.i.posthog.com/i/v0/e/';
  // Public, write-only ingestion key, NOT a personal/secret API key.
  var PROJECT_KEY = 'phc_A6NZzdAmwhiRd9yXKevru3nqDWX5eqmNvzhxMHCn4T3Q';
  var SESSION_KEY = 'bn-analytics-session-v1';
  var RELEASE = 'consent-v1-20260905';
  var ROUTES = ['/', '/works', '/ai-integration', '/hu/ai-integracio', '/privacy', '/hu/adatvedelem', '/work/raiffeisen', '/work/instructure', '/work/bitpanda', '/work/benker', '/work/sportsgambit', '/work/kineticare', '/work/onrobot'];
  var SOURCES = ['direct', 'google', 'bing', 'linkedin', 'chatgpt', 'perplexity', 'claude', 'gemini', 'copilot', 'other'];
  var CHANNELS = ['direct_or_unknown', 'organic_search', 'social_referral', 'ai_referral', 'paid', 'other_referral'];
  var pending = new Set();
  var pageviewAttempted = false;
  var forceNewSession = false;
  var withdrawn = false;
  var hidden = false;
  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var supportedHost = local || (location.hostname === 'www.barnanorbert.com' && location.protocol === 'https:');
  var path = location.pathname;
  var isTest = local || new URLSearchParams(location.search).get('analytics_test') === '1';

  function allowed() {
    try {
      return supportedHost && ROUTES.indexOf(path) !== -1 && !withdrawn && !hidden &&
        navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1' &&
        !/bot|crawler|spider|headless|lighthouse|pagespeed/i.test(navigator.userAgent) &&
        !!window.PortfolioConsent && window.PortfolioConsent.hasConsent() === true;
    } catch (_) { return false; }
  }
  function uuid7(now) {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    var time = BigInt(now);
    for (var i = 5; i >= 0; i--) { bytes[i] = Number(time & 255n); time >>= 8n; }
    bytes[6] = (bytes[6] & 15) | 112;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.from(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }
  function classify(host) {
    if (host === 'chatgpt.com' || host === 'chat.openai.com') return 'chatgpt';
    if (host === 'perplexity.ai' || host.endsWith('.perplexity.ai')) return 'perplexity';
    if (host === 'claude.ai') return 'claude';
    if (host === 'gemini.google.com') return 'gemini';
    if (host === 'copilot.microsoft.com') return 'copilot';
    if (/^(www\.)?google\.(com|hu|co\.uk|de|at)$/.test(host)) return 'google';
    if (host === 'bing.com' || host === 'www.bing.com') return 'bing';
    if (host === 'linkedin.com' || host === 'www.linkedin.com' || host === 'lnkd.in') return 'linkedin';
    return 'other';
  }
  function attribution() {
    var params = new URLSearchParams(location.search);
    var raw = (params.get('utm_source') || '').toLowerCase();
    var source = SOURCES.indexOf(raw) !== -1 ? raw : classify(raw);
    var ref = '';
    try { ref = new URL(document.referrer).hostname; } catch (_) { /* no referrer */ }
    if (!raw) source = ref && ref !== 'www.barnanorbert.com' && ref !== location.hostname ? classify(ref) : 'direct';
    var medium = (params.get('utm_medium') || '').toLowerCase();
    var channel = ['cpc', 'ppc', 'paid', 'paid_search', 'paid_social', 'display'].indexOf(medium) !== -1 ? 'paid' :
      ['chatgpt', 'perplexity', 'claude', 'gemini', 'copilot'].indexOf(source) !== -1 ? 'ai_referral' :
      ['google', 'bing'].indexOf(source) !== -1 ? 'organic_search' :
      source === 'linkedin' ? 'social_referral' : source === 'direct' ? 'direct_or_unknown' : 'other_referral';
    return { source: source, channel: channel };
  }
  function session(now) {
    try {
      var revision = window.PortfolioConsent.getRevision();
      // A persisted, random grant generation survives navigation without timestamp collisions.
      if (typeof revision !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(revision)) return null;
      var saved = sessionStorage.getItem(SESSION_KEY);
      var s;
      try { s = saved ? JSON.parse(saved) : null; } catch (_) { s = null; }
      var valid = !forceNewSession && s && s.version === 1 && s.consentRevision === revision && typeof s.id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(s.id) &&
        Number.isFinite(s.started) && Number.isFinite(s.lastSeen) && s.started <= s.lastSeen && s.lastSeen <= now &&
        parseInt(s.id.replace(/-/g, '').slice(0, 12), 16) === s.started &&
        now - s.lastSeen < 30 * 60 * 1000 && now - s.started < 24 * 60 * 60 * 1000 &&
        SOURCES.indexOf(s.source) !== -1 && CHANNELS.indexOf(s.channel) !== -1 && s.isTest === isTest;
      if (!valid) {
        var a = attribution();
        s = { version: 1, consentRevision: revision, id: uuid7(now), started: now, lastSeen: now, source: a.source, channel: a.channel, isTest: isTest };
      }
      s.lastSeen = now;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      forceNewSession = false;
      return s;
    } catch (_) { return null; }
  }
  function stop() {
    pending.forEach(function (controller) { controller.abort(); });
    pending.clear();
  }
  function revoke() {
    withdrawn = true;
    forceNewSession = true;
    stop();
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) { /* remains fail closed */ }
  }
  function capture(event, placement) {
    if (!allowed()) return;
    var now = Date.now();
    var s = session(now);
    if (!s || !allowed() || typeof fetch !== 'function' || typeof AbortController !== 'function') return;
    var properties = {
      $process_person_profile: false,
      $geoip_disable: true,
      $session_id: s.id,
      $current_url: 'https://www.barnanorbert.com' + path,
      $pathname: path,
      $host: 'www.barnanorbert.com',
      $device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      acquisition_source: s.source,
      acquisition_channel: s.channel,
      page_language: path.startsWith('/hu/') ? 'hu' : 'en',
      page_type: path.includes('ai-integ') ? 'service' : path.startsWith('/work/') ? 'case_study' : path === '/' ? 'home' : path === '/works' ? 'work_index' : 'privacy',
      is_test: isTest,
      consent_version: 1,
      site_release: RELEASE
    };
    if (event === 'contact_intent') properties.cta_location = placement;
    var controller = new AbortController();
    pending.add(controller);
    var timer = setTimeout(function () { controller.abort(); }, 5000);
    try {
      Promise.resolve(fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: PROJECT_KEY, distinct_id: s.id, event: event, timestamp: new Date(now).toISOString(), properties: properties }),
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        keepalive: false,
        redirect: 'error'
      })).catch(function () { /* deliberately no retry or persistent queue */ }).finally(function () {
        clearTimeout(timer); pending.delete(controller);
      });
    } catch (_) { clearTimeout(timer); pending.delete(controller); }
  }
  function pageview() {
    // Exactly one attempted view per real document, not per consent change.
    // Regrant starts a fresh session; a contact without a new view is not a funnel conversion.
    if (!allowed() || pageviewAttempted) return;
    pageviewAttempted = true;
    capture('$pageview');
  }
  document.addEventListener('portfolio:consent-change', function () {
    if (!window.PortfolioConsent || !window.PortfolioConsent.hasConsent()) revoke();
    else { withdrawn = false; pageview(); }
  });
  // Capture phase does not cancel, replace or delay the native Email handler.
  document.addEventListener('click', function (event) {
    var button = event.target instanceof Element ? event.target.closest('button.footer-email') : null;
    if (!button) return;
    var placement = button.closest('footer') ? 'footer' : button.closest('.navbar, header') ? 'navigation' : 'content';
    capture('contact_intent', placement);
  }, true);
  window.addEventListener('pagehide', function () { hidden = true; stop(); });
  window.addEventListener('pageshow', function () { hidden = false; if (!allowed()) revoke(); });
  if (!window.PortfolioConsent || !window.PortfolioConsent.hasConsent()) revoke();
  else pageview();
}());
