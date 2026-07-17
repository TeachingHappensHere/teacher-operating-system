(() => {
  "use strict";
  function report() {
    return {
      build: document.querySelector('meta[name="teacher-os-build"]')?.content || "unknown",
      calendar: Boolean(window.TOSCalendar), state: Boolean(window.TOSState), storage: Boolean(window.TOSStorage),
      events: Boolean(window.TOSEvents), dashboard: typeof window.TOS_SPRINT1_RENDER_DASHBOARD === "function",
      route: location.hash.replace("#", "") || "dashboard", serviceWorker: "serviceWorker" in navigator
    };
  }
  window.TOSDiagnostics = Object.freeze({ report });
  window.addEventListener("error", event => console.error("[TOS Sprint 1]", event.error || event.message));
})();
