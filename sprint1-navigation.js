(() => {
  "use strict";
  const obsolete = new Set(["first-week-builder", "firstweek", "launch-builder"]);
  function clean() {
    document.querySelectorAll("[data-route]").forEach(button => {
      if (obsolete.has(button.dataset.route)) button.remove();
    });
    const nav = document.getElementById("mainNav");
    if (!nav || nav.querySelector('[data-route="classroom-launch"]')) return;
    const button = document.createElement("button");
    button.className = "nav-button";
    button.dataset.route = "classroom-launch";
    button.innerHTML = "<span>🚀</span><strong>Classroom Launch</strong>";
    button.addEventListener("click", () => window.TOS_APP_BRIDGE?.navigate("classroom-launch"));
    nav.prepend(button);
  }
  document.addEventListener("DOMContentLoaded", () => { clean(); setTimeout(clean, 200); });
  window.TOSNavigation = Object.freeze({ clean });
})();
