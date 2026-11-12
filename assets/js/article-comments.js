/** Reader comments under an article. Plain ES2018, no dependencies.
 *  The release file (assets/js/comments.<hash>.js, built from this file, written by
 *  scripts/build-writing.mjs) starts with the proof-of-work owner from
 *  contact.js, so window.PortfolioContactPow exists before this runs.
 *  The section stays hidden until the server says comments are open; a
 *  comment appears only after the author approves it in the admin. */
(function () {
  "use strict";
  var root = document.querySelector("[data-comments]");
  if (!root || typeof fetch !== "function") return;
  var page = root.getAttribute("data-page");
  var copy = JSON.parse(root.getAttribute("data-copy") || "{}");
  var list = root.querySelector("[data-comments-list]");
  var form = root.querySelector("form");
  var status = root.querySelector("[data-comments-status]");
  var replyNote = root.querySelector("[data-comments-replying]");
  var submit = form.querySelector("button[type=submit]");
  var parentId = null;
  var challenge = null;
  var lang = document.documentElement.lang || "en";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function dateOf(iso) {
    try { return new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso)); } catch (_) { return iso.slice(0, 10); }
  }
  function say(text, kind) {
    status.textContent = text || "";
    if (kind) status.setAttribute("data-kind", kind); else status.removeAttribute("data-kind");
  }

  function item(comment, canReply) {
    var node = el("li", "writing-comment" + (comment.author ? " writing-comment-author" : ""));
    var head = el("p", "writing-comment-meta");
    head.appendChild(el("strong", "", comment.name));
    if (comment.author) head.appendChild(el("span", "writing-comment-badge", copy.author));
    var time = el("time", "", dateOf(comment.at));
    time.setAttribute("datetime", comment.at.slice(0, 10));
    head.appendChild(time);
    node.appendChild(head);
    comment.body.split(/\n{2,}/).forEach(function (paragraph) { node.appendChild(el("p", "writing-comment-body", paragraph)); });
    if (canReply) {
      var reply = el("button", "writing-comment-reply", copy.reply);
      reply.type = "button";
      reply.addEventListener("click", function () {
        parentId = comment.id;
        replyNote.hidden = false;
        replyNote.querySelector("span").textContent = copy.replyingTo.replace("{name}", comment.name);
        form.querySelector("textarea").focus();
      });
      node.appendChild(reply);
    }
    return node;
  }

  function render(comments) {
    list.textContent = "";
    var top = comments.filter(function (comment) { return !comment.parentId; });
    root.querySelector("[data-comments-count]").textContent = comments.length ? " (" + comments.length + ")" : "";
    if (!top.length) { list.hidden = true; root.querySelector("[data-comments-empty]").hidden = false; return; }
    list.hidden = false;
    root.querySelector("[data-comments-empty]").hidden = true;
    top.forEach(function (comment) {
      var node = item(comment, true);
      var replies = comments.filter(function (other) { return other.parentId === comment.id; });
      if (replies.length) {
        var nested = el("ol", "writing-comment-replies");
        replies.forEach(function (reply) { nested.appendChild(item(reply, false)); });
        node.appendChild(nested);
      }
      list.appendChild(node);
    });
  }

  function load() {
    return fetch("/api/comments?page=" + encodeURIComponent(page), { headers: { Accept: "application/json" }, credentials: "omit" })
      .then(function (response) { return response.ok ? response.json() : { enabled: false }; })
      .then(function (data) {
        if (!data.enabled) return;
        render(data.comments || []);
        root.hidden = false;
      })
      .catch(function () { /* the article reads fine without comments */ });
  }

  // The challenge is fetched and solved when the reader starts writing, so
  // nobody who only reads pays for it.
  function prepare() {
    if (challenge) return challenge;
    challenge = fetch("/api/comments/challenge", { headers: { Accept: "application/json" }, credentials: "omit" })
      .then(function (response) { if (!response.ok) throw new Error("challenge"); return response.json(); })
      .then(function (data) {
        return window.PortfolioContactPow.solve(data.salt, data.difficulty).then(function (solved) { return { token: data.token, nonce: String(solved.nonce) }; });
      })
      .catch(function (error) { challenge = null; throw error; });
    return challenge;
  }
  form.addEventListener("focusin", function () { prepare().catch(function () {}); }, { once: true });

  root.querySelector("[data-comments-cancel]").addEventListener("click", function () { parentId = null; replyNote.hidden = true; });

  function fieldError(name, code) {
    var messages = copy.errors[name] || {};
    return messages[code] || copy.errors.generic;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = form.elements.name.value.trim();
    var body = form.elements.body.value.trim();
    if (name.length < 2) { say(fieldError("name", name ? "short" : "empty"), "error"); form.elements.name.focus(); return; }
    if (body.length < 5) { say(fieldError("body", body ? "short" : "empty"), "error"); form.elements.body.focus(); return; }
    submit.disabled = true;
    say(copy.sending);
    prepare()
      .then(function (ready) {
        return fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "omit",
          body: JSON.stringify({ page: page, name: name, body: body, website: form.elements.website.value, parentId: parentId, token: ready.token, nonce: ready.nonce })
        });
      })
      .then(function (response) { return response.json().catch(function () { return {}; }).then(function (data) { return { status: response.status, data: data }; }); })
      .then(function (result) {
        challenge = null;
        if (result.status === 200 && result.data.ok) {
          form.reset();
          parentId = null;
          replyNote.hidden = true;
          say(copy.sent, "success");
          return;
        }
        if (result.status === 422 && result.data.fields) {
          var first = Object.keys(result.data.fields)[0];
          say(fieldError(first, result.data.fields[first]), "error");
        } else if (result.status === 429) say(copy.errors.rate, "error");
        else if (result.status === 503) say(copy.errors.closed, "error");
        else say(copy.errors.generic, "error");
      })
      .catch(function () { challenge = null; say(copy.errors.generic, "error"); })
      .then(function () { submit.disabled = false; });
  });

  load();
})();
