(() => {
  "use strict";
  function refreshDashboard() {
    if ((location.hash.replace("#", "") || "dashboard") !== "dashboard") return;
    const bridge = window.TOS_APP_BRIDGE;
    if (bridge) bridge.navigate("dashboard");
  }
  window.TOSEvents?.on("state:changed", event => {
    if (["preview-date", "today"].includes(event.detail.reason)) return;
  });
  window.addEventListener("pageshow", () => window.TOSNavigation?.clean());
  window.TOSSprint1 = Object.freeze({ refreshDashboard, version: "18.0.0-sprint1" });
})();
