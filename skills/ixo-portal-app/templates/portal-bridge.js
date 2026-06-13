(function () {
  "use strict";

  const PROTOCOL = "ixo.portal.iframe.v1";
  const VERSION = "1.0";
  // http://localhost:3000 is development-only; remove it from production builds.
  const ALLOWED_PORTAL_ORIGINS = new Set(["{{PORTAL_ORIGIN}}", "http://localhost:3000"]);
  const ACK_TIMEOUT_MS = 30000;

  let portalOrigin = null;
  let initPayload = null;
  const initHandlers = new Set();
  const navigateHandlers = new Set();
  const actionHandlers = new Set();
  const pendingAcks = new Map();

  function isPortalEnvelope(message) {
    return Boolean(message && message.protocol === PROTOCOL && message.version === VERSION && typeof message.type === "string");
  }

  function createRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getHostOrigin(payload) {
    return payload && payload.host && typeof payload.host.origin === "string" ? payload.host.origin : null;
  }

  function setPortalContext(payload) {
    const host = payload.host || {};
    const theme = host.theme || {};

    initPayload = payload;
    if (typeof host.locale === "string" && host.locale) {
      document.documentElement.lang = host.locale;
    }
    if (typeof theme.mode === "string" && theme.mode) {
      document.documentElement.dataset.portalTheme = theme.mode;
    }
  }

  function postToPortal(type, payload, requestId) {
    if (!portalOrigin) {
      return false;
    }

    window.parent.postMessage(
      {
        protocol: PROTOCOL,
        version: VERSION,
        type,
        requestId,
        payload
      },
      portalOrigin
    );

    return true;
  }

  function requestEvent(payload) {
    const requestId = createRequestId();

    const ack = new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        pendingAcks.delete(requestId);
        resolve({ status: "failed", message: "Portal request timed out" });
      }, ACK_TIMEOUT_MS);

      pendingAcks.set(requestId, (result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      });
    });

    const posted = postToPortal("EVENT", payload, requestId);
    if (!posted) {
      const resolve = pendingAcks.get(requestId);
      pendingAcks.delete(requestId);
      if (resolve) {
        resolve({ status: "failed", message: "Portal is not initialized" });
      }
      return Promise.resolve({ status: "failed", message: "Portal is not initialized" });
    }

    return ack;
  }

  function emitInit(payload) {
    initHandlers.forEach((handler) => handler(payload));
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!isPortalEnvelope(message)) return;

    if (message.type === "INIT") {
      const nextPortalOrigin = getHostOrigin(message.payload);
      if (!nextPortalOrigin || event.origin !== nextPortalOrigin) return;
      if (!ALLOWED_PORTAL_ORIGINS.has(nextPortalOrigin)) return;

      portalOrigin = nextPortalOrigin;
      setPortalContext(message.payload);
      emitInit(initPayload);
      return;
    }

    if (!portalOrigin || event.origin !== portalOrigin) return;

    if (message.type === "NAVIGATE") {
      navigateHandlers.forEach((handler) => handler(message.payload));
      return;
    }

    if (message.type === "ACTION") {
      actionHandlers.forEach((handler) => handler(message.payload));
      return;
    }

    if (message.type === "EVENT_ACK" && message.requestId) {
      const resolve = pendingAcks.get(message.requestId);
      if (resolve) {
        resolve(message.payload);
        pendingAcks.delete(message.requestId);
      }
    }
  });

  window.IxoPortalBridge = {
    getInitPayload() {
      return initPayload;
    },

    onInit(handler) {
      initHandlers.add(handler);
      if (initPayload) handler(initPayload);

      return () => initHandlers.delete(handler);
    },

    onNavigate(handler) {
      navigateHandlers.add(handler);

      return () => navigateHandlers.delete(handler);
    },

    onAction(handler) {
      actionHandlers.add(handler);

      return () => actionHandlers.delete(handler);
    },

    resize(size) {
      const rect = document.documentElement.getBoundingClientRect();
      const height = Math.max(1, Math.ceil((size && size.height) || document.documentElement.scrollHeight || rect.height));
      const width = size && size.width ? Math.ceil(size.width) : undefined;

      return postToPortal("RESIZE", width ? { height, width } : { height });
    },

    autoResize(target) {
      const node = target || document.body;
      if (typeof window.ResizeObserver !== "function") {
        window.IxoPortalBridge.resize();
        return () => {};
      }

      let frame = null;
      const observer = new ResizeObserver(() => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = null;
          window.IxoPortalBridge.resize();
        });
      });
      observer.observe(node);

      return () => {
        if (frame) window.cancelAnimationFrame(frame);
        observer.disconnect();
      };
    },

    navigate(payload) {
      return postToPortal("NAVIGATE", payload);
    },

    setDirty(dirty) {
      return requestEvent({ type: "dirtyState", dirty: Boolean(dirty) });
    },

    requestAssistantPrompt(prompt) {
      return requestEvent({ type: "assistantPrompt", prompt });
    },

    requestSignxTransaction(messages, memo) {
      return requestEvent({ type: "signxTransaction", messages, memo });
    },

    reportActionBlockStep(blockId, stepId, status, data) {
      return requestEvent({ type: "actionBlockStep", blockId, stepId, status, data });
    },

    requestAuthRefresh(reason) {
      return requestEvent({ type: "authRefreshRequest", reason });
    },

    reportAnalytics(name, properties) {
      return requestEvent({ type: "analytics", name, properties });
    },

    reportError(message, code, details) {
      return requestEvent({ type: "error", message, code, details });
    }
  };

  window.parent.postMessage(
    {
      protocol: PROTOCOL,
      version: VERSION,
      type: "READY",
      payload: {
        capabilities: ["resize", "navigate", "event"]
      }
    },
    "*"
  );
})();
