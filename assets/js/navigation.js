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
    function updateTextReflow() {
      var copyStyle = getComputedStyle(copy);
      var kickerStyle = getComputedStyle(kicker);
      var copySize = parseFloat(copyStyle.fontSize);
      var kickerSize = parseFloat(kickerStyle.fontSize);
      // User text enlargement/spacing needs the same single-column reading
      // surface as compact screens. These typography checks do not depend on
      // the resulting column height, so the observer cannot oscillate layouts.
      // Version B ships the kicker at .16em tracking. That is not user spacing.
      // Extra tracking (above .20em) or dek tracking still switches layout.
      var spaced =
        parseFloat(copyStyle.letterSpacing) > copySize * .08 ||
        parseFloat(copyStyle.wordSpacing) > copySize * .12 ||
        parseFloat(kickerStyle.letterSpacing) > kickerSize * .20 ||
        parseFloat(kickerStyle.wordSpacing) > kickerSize * .12;
      // Shipped CSS is 13px for the kicker and 20–22px for the deck. Allow
      // subpixel rounding, but reflow even modest user enlargement.
      var enlarged = copySize > 22.1 || kickerSize > 13.1;
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
