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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
  } else {
    initNavigation();
  }
})();
