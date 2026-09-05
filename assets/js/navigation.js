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
    var compactNavigation = window.matchMedia("(max-width: 991px)");
    var lastFocusedControl = document.activeElement;
    document.addEventListener("focusin", function (event) {
      lastFocusedControl = event.target;
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
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
      // External links and mail leave this document in place. Never leave
      // keyboard focus on a control that has just become display:none.
      if (restoreFocus) menuButton.focus({ preventScroll: true });
    }

    menuButton.addEventListener("click", function () {
      setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });
    primaryNavigation.querySelectorAll("a, button.footer-email").forEach(function (control) {
      control.addEventListener("click", function () {
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

    var closeAtBreakpoint = function (event) {
      var active = document.activeElement;
      // A browser can drop focus to body as the media query hides a control,
      // before dispatching its change event. Remember only the last real focus.
      var previous = active === document.body ? lastFocusedControl : active;
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

  /** Assemble the mail href from split parts so a bundle scrape is not one literal. */
  function footerMailHref() {
    var scheme = ["mai", "lto"].join("");
    var user = ["ano", "rbert"].join("");
    var host = ["pm", ".", "me"].join("");
    return scheme + ":" + user + "@" + host;
  }

  function initFooterMail() {
    document.querySelectorAll("button.footer-email").forEach(function (button) {
      if (button.dataset.mailReady === "true") return;
      button.dataset.mailReady = "true";
      button.addEventListener("click", function () {
        try {
          window.location.assign(footerMailHref());
        } catch (err) {
          /* sandboxed documents may block assign */
        }
      });
    });
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
    function typographySnapshot(element) {
      var style = getComputedStyle(element);
      return {
        size: numericLength(style, "fontSize"),
        letter: numericLength(style, "letterSpacing"),
        word: numericLength(style, "wordSpacing"),
      };
    }
    // Compare later changes with the authored mast typography. This keeps the
    // deliberate tracked name treatment from masquerading as user text spacing.
    var baseCopy = typographySnapshot(copy);
    var baseKicker = typographySnapshot(kicker);
    function updateTextReflow() {
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
    initFooterMail();
    initMastTextReflow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
