export const BB_BROWSER_GRAB_ISOLATED_WORLD_ID = 1001;

export const BB_BROWSER_GRAB_AWAIT_SCRIPT = `(() => {
  const HOST_ID = "__bb-grab-host";
  const STYLE_KEYS = ${JSON.stringify([
    "display",
    "position",
    "color",
    "backgroundColor",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "padding",
    "margin",
    "border",
    "borderRadius",
    "width",
    "height",
  ])};

  function removeHost() {
    const existing = document.getElementById(HOST_ID);
    if (existing !== null) {
      existing.remove();
    }
  }

  if (typeof window.__bbGrabAbort === "function") {
    window.__bbGrabAbort();
  }
  removeHost();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("data-bb-grab", "host");
  host.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:all;cursor:crosshair;";
  const shadow = host.attachShadow({ mode: "closed" });
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;display:none;border:2px solid #2563eb;background:rgba(37,99,235,0.14);pointer-events:none;box-sizing:border-box;";
  shadow.appendChild(box);
  document.documentElement.appendChild(host);

  function cssEscape(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
  }

  function cssPath(el) {
    if (el.id) {
      return "#" + cssEscape(el.id);
    }
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 6) {
      let part = node.tagName.toLowerCase();
      if (node.classList && node.classList.length > 0) {
        const classes = Array.from(node.classList).slice(0, 2).map(cssEscape);
        part += "." + classes.join(".");
      }
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
    }
    return parts.join(" > ");
  }

  function pickFromPoint(x, y) {
    host.style.pointerEvents = "none";
    const el = document.elementFromPoint(x, y);
    host.style.pointerEvents = "all";
    if (!el || el === host || host.contains(el)) {
      return null;
    }
    return el;
  }

  function updateBox(el) {
    if (!el) {
      box.style.display = "none";
      return;
    }
    const rect = el.getBoundingClientRect();
    box.style.display = "block";
    box.style.left = rect.left + "px";
    box.style.top = rect.top + "px";
    box.style.width = Math.max(0, rect.width) + "px";
    box.style.height = Math.max(0, rect.height) + "px";
  }

  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      host.removeEventListener("mousemove", onMove, true);
      host.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey, true);
      window.__bbGrabAbort = undefined;
      removeHost();
      resolve(value);
    };

    window.__bbGrabAbort = () => {
      settle({ cancelled: true });
    };

    function onMove(event) {
      event.preventDefault();
      event.stopPropagation();
      updateBox(pickFromPoint(event.clientX, event.clientY));
    }

    function onClick(event) {
      event.preventDefault();
      event.stopPropagation();
      const el = pickFromPoint(event.clientX, event.clientY);
      if (!el) {
        settle({ cancelled: true });
        return;
      }
      const computed = getComputedStyle(el);
      const css = {};
      for (let i = 0; i < STYLE_KEYS.length; i += 1) {
        const key = STYLE_KEYS[i];
        css[key] = String(computed[key] || "");
      }
      const rect = el.getBoundingClientRect();
      const html = String(el.outerHTML || "").slice(0, 4096);
      settle({
        tagName: el.tagName.toLowerCase(),
        selector: cssPath(el).slice(0, 512),
        html,
        css,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      });
    }

    function onKey(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        settle({ cancelled: true });
      }
    }

    host.addEventListener("mousemove", onMove, true);
    host.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey, true);
  });
})();`;

export const BB_BROWSER_GRAB_CANCEL_SCRIPT =
  "typeof window.__bbGrabAbort === 'function' && window.__bbGrabAbort();";
