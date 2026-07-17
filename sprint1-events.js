(() => {
  "use strict";
  const target = new EventTarget();
  window.TOSEvents = Object.freeze({
    on(type, listener) { target.addEventListener(type, listener); return () => target.removeEventListener(type, listener); },
    emit(type, detail = {}) { target.dispatchEvent(new CustomEvent(type, { detail })); }
  });
})();
