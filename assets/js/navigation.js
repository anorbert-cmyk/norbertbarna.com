/** Independent mobile navigation; intentionally has no animation dependency. */
(function () {
  "use strict";

  function initNavigation() {
    var root = document.documentElement;
    var primaryNavigation = document.querySelector(".nav-menu");
    var menuButton = document.querySelector(".menu-button");
    if (!primaryNavigation || !menuButton || menuButton.dataset.navigationReady === "true") return;

    menuButton.dataset.navigationReady = "true";
    root.classList.add("nav-enhanced");
    if (!primaryNavigation.id) primaryNavigation.id = "primary-navigation";
    menuButton.setAttribute("aria-controls", primaryNavigation.id);

    function setMenuOpen(isOpen) {
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.classList.toggle("w--open", isOpen);
      if (isOpen) primaryNavigation.setAttribute("data-nav-menu-open", "");
      else primaryNavigation.removeAttribute("data-nav-menu-open");
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    }

    menuButton.addEventListener("click", function () {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });
    primaryNavigation.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenuOpen(false);
      });
    });
    document.addEventListener("click", function (event) {
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (!event.target.closest(".navbar")) setMenuOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || menuButton.getAttribute("aria-expanded") !== "true") return;
      setMenuOpen(false);
      menuButton.focus();
    });

    var compactNavigation = window.matchMedia("(max-width: 991px)");
    var closeAtDesktop = function (event) {
      if (!event.matches) setMenuOpen(false);
    };
    if (typeof compactNavigation.addEventListener === "function") {
      compactNavigation.addEventListener("change", closeAtDesktop);
    } else if (typeof compactNavigation.addListener === "function") {
      compactNavigation.addListener(closeAtDesktop);
    }
    setMenuOpen(false);
  }

  /** Assemble the mail href from split parts so a bundle scrape is not one literal. */
  function footerMailHref() {
    var scheme = ["mai", "lto"].join("");
    var user = ["ano", "rbert"].join("");
    var host = ["pm", ".", "me"].join("");
    return scheme + ":" + user + "@" + host;
  }

  function initFooterMail() {
    document.querySelectorAll("a.footer-email").forEach(function (link) {
      if (link.dataset.mailReady === "true") return;
      link.dataset.mailReady = "true";
      function openMail(event) {
        if (event) event.preventDefault();
        var href = footerMailHref();
        link.setAttribute("href", href);
        try {
          window.location.assign(href);
        } catch (err) {
          /* sandboxed documents may block assign */
        }
      }
      link.addEventListener("click", openMail);
      link.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openMail(event);
      });
    });
  }

  function init() {
    initNavigation();
    initFooterMail();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
