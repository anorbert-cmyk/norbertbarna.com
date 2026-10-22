/** Independent mobile navigation; intentionally has no animation dependency. */
(function () {
  "use strict";

  // Every page is a visit, even when it has no optional arrival animation.
  // Keep the entry state separate from the marker we set for the next page,
  // so a direct first visit can still play the introduction once.
  var hasVisited = true;
  try {
    hasVisited = Boolean(sessionStorage.getItem("nb-arrival-seen-v2"));
    sessionStorage.setItem("nb-arrival-seen-v2", "1");
  } catch (error) {
    // Storage restrictions must leave the content immediately available.
    hasVisited = true;
  }
  window.PortfolioVisit = { firstArrival: !hasVisited };

  function initNavigation() {
    var root = document.documentElement;
    var pageLang = /^hu(?:-|$)/i.test(root.lang) ? "hu" : /^de(?:-|$)/i.test(root.lang) ? "de" : "en";
    var navLabels = {
      hu: { open: "Navigáció megnyitása", close: "Navigáció bezárása" },
      de: { open: "Navigation öffnen", close: "Navigation schließen" },
      en: { open: "Open navigation", close: "Close navigation" }
    }[pageLang];
    var primaryNavigation = document.querySelector(".nav-menu");
    var menuButton = document.querySelector(".menu-button");
    if (!primaryNavigation || !menuButton || menuButton.dataset.navigationReady === "true") return;

    menuButton.dataset.navigationReady = "true";
    root.classList.add("nav-enhanced");
    if (!primaryNavigation.id) primaryNavigation.id = "primary-navigation";
    menuButton.setAttribute("aria-controls", primaryNavigation.id);
    var compactNavigation = window.matchMedia("(max-width: 991px)");
    var lastFocusedControl = document.activeElement;
    document.addEventListener("focusin", function (event) {
      lastFocusedControl = event.target;
      // The compact menu is a non-modal disclosure over a locked page: when
      // Tab leaves it, it closes so the newly focused control is not behind it.
      if (menuButton.getAttribute("aria-expanded") === "true" && compactNavigation.matches &&
        !event.target.closest(".navbar")) setMenuOpen(false);
    });
    document.addEventListener("focusout", function (event) {
      var box = event.target.getBoundingClientRect();
      // An intentional blur from a still-visible control is not a breakpoint
      // loss. Forget it so a later resize cannot steal focus from the page.
      if (event.target === lastFocusedControl && box.width && box.height) {
        lastFocusedControl = null;
      }
    });

    function setMenuOpen(isOpen) {
      var restoreFocus = !isOpen && compactNavigation.matches &&
        primaryNavigation.contains(document.activeElement);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.classList.toggle("w--open", isOpen);
      if (isOpen) primaryNavigation.setAttribute("data-nav-menu-open", "");
      else primaryNavigation.removeAttribute("data-nav-menu-open");
      menuButton.setAttribute("aria-label", isOpen ? navLabels.close : navLabels.open);
      // The open compact menu locks the page behind it (compact-navigation.css
      // scrolls the menu itself); a desktop menu never does.
      root.toggleAttribute("data-menu-open", isOpen && compactNavigation.matches);
      if (!isOpen && typeof closeGroups === "function") closeGroups();
      // External links and mail leave this document in place. Never leave
      // keyboard focus on a control that has just become display:none.
      if (restoreFocus) menuButton.focus({ preventScroll: true });
    }

    menuButton.addEventListener("click", function () {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });
    // Disclosure groups (Services, Articles, the language menu): one open at
    // a time, Escape returns focus to its button, leaving the group closes it.
    var groups = Array.prototype.slice.call(primaryNavigation.querySelectorAll("[data-nav-group]"));
    function setGroupOpen(group, isOpen) {
      var toggle = group.querySelector("[data-nav-toggle]");
      var panel = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
      if (!toggle || !panel) return;
      toggle.setAttribute("aria-expanded", String(isOpen));
      panel.hidden = !isOpen;
      group.toggleAttribute("data-nav-group-open", isOpen);
    }
    function closeGroups(except) {
      groups.forEach(function (group) {
        if (group !== except) setGroupOpen(group, false);
      });
    }
    groups.forEach(function (group) {
      var toggle = group.querySelector("[data-nav-toggle]");
      if (!toggle) return;
      setGroupOpen(group, false);
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") !== "true";
        closeGroups(group);
        setGroupOpen(group, open);
      });
      group.addEventListener("keydown", function (event) {
        if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return;
        event.stopPropagation();
        setGroupOpen(group, false);
        toggle.focus();
      });
      group.addEventListener("focusout", function (event) {
        if (compactNavigation.matches || !event.relatedTarget || group.contains(event.relatedTarget)) return;
        setGroupOpen(group, false);
      });
    });
    primaryNavigation.querySelectorAll("a, button").forEach(function (control) {
      control.addEventListener("click", function () {
        if (control.hasAttribute("data-nav-toggle")) return;
        closeGroups();
        setMenuOpen(false);
      });
    });
    document.addEventListener("click", function (event) {
      var inside = event.target.closest(".navbar");
      if (!event.target.closest("[data-nav-group]")) closeGroups();
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (!inside) setMenuOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || menuButton.getAttribute("aria-expanded") !== "true") return;
      setMenuOpen(false);
      menuButton.focus();
    });

    var closeAtBreakpoint = function (event) {
      var active = document.activeElement;
      // A browser can drop focus to body as the media query hides a control,
      // before dispatching its change event. Remember only the last real focus.
      var previous = active === document.body ? lastFocusedControl : active;
      closeGroups();
      setMenuOpen(false);
      if (event.matches && primaryNavigation.contains(previous)) {
        menuButton.focus({ preventScroll: true });
      } else if (!event.matches && previous === menuButton) {
        var firstLink = primaryNavigation.querySelector("a[href], button");
        if (firstLink) firstLink.focus({ preventScroll: true });
      }
    };
    if (typeof compactNavigation.addEventListener === "function") {
      compactNavigation.addEventListener("change", closeAtBreakpoint);
    } else if (typeof compactNavigation.addListener === "function") {
      compactNavigation.addListener(closeAtBreakpoint);
    }
    setMenuOpen(false);
  }

  function initMastTextReflow() {
    var mast = document.querySelector(".home-mast");
    if (!mast || mast.dataset.reflowReady === "true") return;
    var copy = mast.querySelector(".home-banner-subtitle");
    var kicker = mast.querySelector(".hero-kicker");
    if (!copy || !kicker) return;
    mast.dataset.reflowReady = "true";
    function numericLength(style, property) {
      var value = parseFloat(style[property]);
      return Number.isFinite(value) ? value : 0;
    }
    function typographySnapshot(element, pseudo) {
      var style = getComputedStyle(element, pseudo);
      return {
        size: numericLength(style, "fontSize"),
        letter: numericLength(style, "letterSpacing"),
        word: numericLength(style, "wordSpacing"),
      };
    }
    function updateTextReflow() {
      // The hidden pseudo-elements resolve the current authored CSS scale.
      // A viewport change must not be compared with the previous breakpoint,
      // while overrides on real text still require the accessible layout.
      var baseCopy = typographySnapshot(copy, "::before");
      var baseKicker = typographySnapshot(kicker, "::before");
      var copyStyle = getComputedStyle(copy);
      var kickerStyle = getComputedStyle(kicker);
      // User text enlargement/spacing needs the same single-column reading
      // surface as compact screens. These typography checks do not depend on
      // the resulting column height, so the observer cannot oscillate layouts.
      var spaced = [[copyStyle, baseCopy], [kickerStyle, baseKicker]].some(function (entry) {
        var style = entry[0];
        var baseline = entry[1];
        var size = numericLength(style, "fontSize");
        return numericLength(style, "letterSpacing") > baseline.letter + size * .08 ||
          numericLength(style, "wordSpacing") > baseline.word + size * .12;
      });
      // Reflow on actual user enlargement, independent of the authored scale.
      var enlarged = numericLength(copyStyle, "fontSize") > baseCopy.size * 1.18 ||
        numericLength(kickerStyle, "fontSize") > baseKicker.size * 1.18;
      mast.toggleAttribute("data-text-reflow", enlarged || spaced);
    }
    updateTextReflow();
    var reflowFrame = 0;
    function scheduleTextReflow() {
      if (reflowFrame) return;
      reflowFrame = requestAnimationFrame(function () {
        reflowFrame = 0;
        updateTextReflow();
      });
    }
    if (typeof ResizeObserver === "function") {
      // Mutate layout outside ResizeObserver delivery (notably in WebKit).
      var observer = new ResizeObserver(scheduleTextReflow);
      observer.observe(copy);
      observer.observe(kicker);
    }
    window.addEventListener("resize", scheduleTextReflow, { passive: true });
  }

  function init() {
    initNavigation();
    initMastTextReflow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
