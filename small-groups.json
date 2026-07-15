
(() => {
  "use strict";

  const STORE = "thh-v162:sidebar";
  const MOBILE_BREAKPOINT = 760;

  let state = {
    collapsed: false,
    pinned: true
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function load() {
    try {
      state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
    } catch {}
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function desktop() {
    return window.innerWidth > MOBILE_BREAKPOINT;
  }

  function waitForSidebar() {
    const sidebar = $("#sidebar");
    const nav = $("#mainNav");

    if (!sidebar || !nav) {
      window.setTimeout(waitForSidebar, 100);
      return;
    }

    installControls(sidebar);
    observeNavigation(nav);
    applyState();
    scrollActiveIntoView(false);
  }

  function installControls(sidebar) {
    if ($("#v162SidebarControls")) return;

    const controls = document.createElement("div");
    controls.id = "v162SidebarControls";
    controls.className = "v162-sidebar-controls";
    controls.innerHTML = `
      <button id="v162SidebarToggle" type="button" aria-label="Collapse sidebar" title="Collapse sidebar">
        <span aria-hidden="true">◀</span>
        <strong>Collapse</strong>
      </button>
      <button id="v162SidebarPin" type="button" aria-label="Unpin sidebar" title="Keep sidebar open">
        <span aria-hidden="true">📌</span>
      </button>
    `;

    const brand = $(".brand", sidebar);
    if (brand) brand.insertAdjacentElement("afterend", controls);
    else sidebar.prepend(controls);

    $("#v162SidebarToggle").addEventListener("click", () => {
      state.collapsed = !state.collapsed;
      if (!state.collapsed) state.pinned = true;
      save();
      applyState();
    });

    $("#v162SidebarPin").addEventListener("click", () => {
      state.pinned = !state.pinned;
      if (!state.pinned) state.collapsed = true;
      save();
      applyState();
    });

    sidebar.addEventListener("mouseenter", () => {
      if (desktop() && !state.pinned && state.collapsed) {
        document.body.classList.add("v162-sidebar-peek");
      }
    });

    sidebar.addEventListener("mouseleave", () => {
      document.body.classList.remove("v162-sidebar-peek");
    });

    sidebar.addEventListener("focusin", () => {
      if (desktop() && !state.pinned && state.collapsed) {
        document.body.classList.add("v162-sidebar-peek");
      }
    });

    sidebar.addEventListener("focusout", event => {
      if (!sidebar.contains(event.relatedTarget)) {
        document.body.classList.remove("v162-sidebar-peek");
      }
    });

    window.addEventListener("resize", () => {
      document.body.classList.remove("v162-sidebar-peek");
      applyState();
    });

    window.addEventListener("hashchange", () => {
      window.setTimeout(() => scrollActiveIntoView(true), 120);
    });
  }

  function applyState() {
    const collapsed = desktop() && state.collapsed;

    document.body.classList.toggle("v162-sidebar-collapsed", collapsed);
    document.body.classList.toggle("v162-sidebar-pinned", state.pinned);
    document.body.classList.toggle("v162-sidebar-unpinned", !state.pinned);

    const toggle = $("#v162SidebarToggle");
    const pin = $("#v162SidebarPin");

    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      toggle.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
      toggle.querySelector("span").textContent = collapsed ? "▶" : "◀";
      toggle.querySelector("strong").textContent = collapsed ? "Expand" : "Collapse";
    }

    if (pin) {
      pin.setAttribute("aria-pressed", String(state.pinned));
      pin.setAttribute("aria-label", state.pinned ? "Unpin sidebar" : "Pin sidebar open");
      pin.title = state.pinned ? "Sidebar stays open" : "Pin sidebar open";
      pin.querySelector("span").textContent = state.pinned ? "📌" : "📍";
    }

    updateTooltips();
  }

  function observeNavigation(nav) {
    new MutationObserver(() => {
      updateTooltips();
      window.setTimeout(() => scrollActiveIntoView(false), 40);
    }).observe(nav, { childList: true, subtree: true });
  }

  function updateTooltips() {
    $$(".v110-route").forEach(button => {
      const label = $("strong", button)?.textContent?.trim();
      if (label) {
        button.title = label;
        button.setAttribute("aria-label", label);
      }
    });

    $$(".v110-nav-heading").forEach(button => {
      const label = $("span", button)?.textContent?.trim();
      if (label) button.title = label;
    });
  }

  function scrollActiveIntoView(smooth) {
    const active = $(".v110-route.active");
    const scroller = $("#mainNav");
    if (!active || !scroller) return;

    active.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: smooth ? "smooth" : "auto"
    });
  }

  load();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForSidebar);
  } else {
    waitForSidebar();
  }
})();
