(() => {
  "use strict";
  const defaults = {
    previewDate: null,
    activeDate: new Date().toISOString().slice(0, 10),
    mode: "prelaunch",
    launchProgress: {},
    lastRoute: "dashboard"
  };
  let state = { ...defaults, ...(window.TOSStorage?.read("state", {}) || {}) };
  const clone = value => JSON.parse(JSON.stringify(value));
  function get() { return clone(state); }
  function set(patch, reason = "update") {
    state = { ...state, ...(patch || {}) };
    window.TOSStorage?.write("state", state);
    window.TOSEvents?.emit("state:changed", { state: get(), reason });
    return get();
  }
  function reset() { state = { ...defaults }; return set(state, "reset"); }
  window.TOSState = Object.freeze({ get, set, reset });
})();
