
(() => {
  "use strict";
  const STORE = "thh-v83:afternoon-studios";
  const shortcuts = [
    ["✍️","Writing Studio","writing"],
    ["🔬","Science Studio","science"],
    ["🌎","Social Studies Studio","socialStudies"]
  ];

  function openStudio(studio) {
    let state = {};
    try { state = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch {}
    state.activeStudio = studio;
    localStorage.setItem(STORE, JSON.stringify(state));
    window.__THH_REQUESTED_AFTERNOON_STUDIO__ = studio;
    location.hash = "afternoon-studios";
  }

  function install() {
    const nav = document.querySelector("#mainNav");
    if (!nav) return setTimeout(install, 120);

    const group = [...document.querySelectorAll(".v110-nav-group")].find(item =>
      item.querySelector(".v110-nav-heading span")
        ?.textContent?.trim().toLowerCase() === "curriculum"
    );
    const body = group?.querySelector(".v110-nav-body") || nav;
    if (!body || body.querySelector("[data-v167-subject-shortcut]")) return;

    shortcuts.forEach(([icon,label,studio]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "v110-route v167-subject-shortcut";
      button.dataset.v167SubjectShortcut = studio;
      button.title = label;
      button.innerHTML = `<span>${icon}</span><strong>${label}</strong>`;
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openStudio(studio);
      });
      body.appendChild(button);
    });
  }

  window.addEventListener("hashchange", install);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
