(function () {
  "use strict";

  /* Applies the Portal's design tokens to this document.
   *
   * Load this BEFORE portal-bridge.js. The bridge calls
   * window.IxoPortalTheme.applyInit(payload) on every INIT — including
   * re-INITs, which is how the Portal broadcasts a light/dark toggle —
   * so theme switching is a live update and never latches the first
   * payload.
   *
   * Host tokens are written as `--ixo-<key>` on <html>, overriding the
   * static baseline in ixo-tokens.css. Keys and values are validated
   * before they reach the CSSOM: the payload crosses an origin boundary
   * and is never assumed well-formed. */

  var VALID_KEY = /^[a-z][a-z0-9-]{0,63}$/;
  var INVALID_VALUE = /[;{}<>]|url\(|expression\(|@import/i;
  var MAX_VALUE_LENGTH = 256;

  var mode = null;
  var tokens = {};
  var handlers = new Set();
  var media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function systemMode() {
    return media && media.matches ? "dark" : "light";
  }

  function isSafeToken(key, value) {
    return (
      typeof key === "string" &&
      typeof value === "string" &&
      VALID_KEY.test(key) &&
      value.length > 0 &&
      value.length <= MAX_VALUE_LENGTH &&
      !INVALID_VALUE.test(value)
    );
  }

  function applyTokens(nextTokens) {
    var root = document.documentElement;
    var applied = {};

    Object.keys(nextTokens || {}).forEach(function (key) {
      var value = nextTokens[key];
      if (!isSafeToken(key, value)) return;
      root.style.setProperty("--ixo-" + key, value);
      applied[key] = value;
    });

    return applied;
  }

  function emit() {
    var snapshot = { mode: mode || systemMode(), tokens: tokens };
    handlers.forEach(function (handler) {
      handler(snapshot);
    });
  }

  function applyTheme(theme) {
    var nextMode = theme && (theme.mode === "light" || theme.mode === "dark") ? theme.mode : null;
    var changed = false;

    if (nextMode && nextMode !== mode) {
      mode = nextMode;
      document.documentElement.dataset.portalTheme = mode;
      changed = true;
    }

    if (theme && theme.tokens) {
      var applied = applyTokens(theme.tokens);
      if (JSON.stringify(applied) !== JSON.stringify(tokens)) {
        tokens = applied;
        changed = true;
      }
    }

    if (changed) emit();
    return changed;
  }

  if (media && typeof media.addEventListener === "function") {
    media.addEventListener("change", function () {
      // Only meaningful while standalone — once the host has told us the
      // scheme, ixo-tokens.css stops honouring the OS preference too.
      if (!mode) emit();
    });
  }

  window.IxoPortalTheme = {
    applyInit: function (payload) {
      var host = payload && payload.host ? payload.host : {};
      return applyTheme(host.theme);
    },

    applyTheme: applyTheme,

    getMode: function () {
      return mode || systemMode();
    },

    isHostThemed: function () {
      return mode !== null;
    },

    getTokens: function () {
      return Object.assign({}, tokens);
    },

    /* Resolved value of a single token, e.g. getToken("color-accent").
       Falls back to the computed baseline from ixo-tokens.css, which is
       what you want for canvas/chart colours before INIT lands. */
    getToken: function (key) {
      if (Object.prototype.hasOwnProperty.call(tokens, key)) return tokens[key];
      return window.getComputedStyle(document.documentElement).getPropertyValue("--ixo-" + key).trim();
    },

    onChange: function (handler) {
      handlers.add(handler);
      if (mode) handler({ mode: mode, tokens: tokens });

      return function () {
        handlers.delete(handler);
      };
    }
  };
})();
