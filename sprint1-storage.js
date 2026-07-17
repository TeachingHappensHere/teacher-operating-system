(() => {
  "use strict";
  const PREFIX = "mrs-parrish-tos:s1:";
  function read(key, fallback = null) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value === null ? fallback : JSON.parse(value);
    } catch { return fallback; }
  }
  function write(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return value;
  }
  function remove(key) { localStorage.removeItem(PREFIX + key); }
  window.TOSStorage = Object.freeze({ read, write, remove, prefix: PREFIX });
})();
