
// TeachingHappensHere Version 4.6
// Saved Progress & Personalization Engine
(function () {
  "use strict";

  const STORAGE_PREFIX = "thh-v46:";
  const STATE_KEY = `${STORAGE_PREFIX}state`;
  let saveTimer = null;

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
    } catch (error) {
      console.warn("Saved progress could not be read.", error);
      return {};
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      updateSaveIndicator("Saved");
    } catch (error) {
      console.warn("Saved progress could not be written.", error);
      updateSaveIndicator("Save unavailable");
    }
  }

  function elementKey(element, index) {
    if (element.dataset.saveKey) return element.dataset.saveKey;
    if (element.id) return `id:${element.id}`;

    const page = element.closest(".page");
    const pageId = page ? page.id : "global";
    const card = element.closest(
      ".system-section, .launch-section, .print-item, .communication-card, .student-card, article"
    );

    let context = "";
    if (card) {
      const heading = card.querySelector("h2, h3, strong");
      context = heading ? heading.textContent.trim().slice(0, 80) : "";
    }

    const label = element.closest("label");
    const labelText = label ? label.textContent.trim().slice(0, 100) : "";
    const placeholder = element.getAttribute("placeholder") || "";
    const name = element.getAttribute("name") || "";
    const type = element.type || element.tagName.toLowerCase();

    return [
      pageId,
      context,
      labelText,
      placeholder,
      name,
      type,
      index
    ].join("|");
  }

  function collectState() {
    const state = loadState();

    state.fields = state.fields || {};
    state.checkboxes = state.checkboxes || {};
    state.selects = state.selects || {};

    const fields = document.querySelectorAll(
      "textarea, input:not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit'])"
    );

    fields.forEach((element, index) => {
      const key = elementKey(element, index);
      if (
        element.id === "brainSearch" ||
        element.id === "systemsSearch" ||
        element.id === "resourceSearch" ||
        element.id === "communicationSearch"
      ) {
        return;
      }
      state.fields[key] = element.value;
    });

    document.querySelectorAll("input[type='checkbox']").forEach((element, index) => {
      state.checkboxes[elementKey(element, index)] = element.checked;
    });

    document.querySelectorAll("select").forEach((element, index) => {
      if (
        element.id === "systemsCategory" ||
        element.id === "communicationCategory" ||
        element.id === "studentFilter"
      ) {
        return;
      }
      state.selects[elementKey(element, index)] = element.value;
    });

    const activePage = document.querySelector(".page.active");
    if (activePage) state.activePage = activePage.id;

    const activeLesson = document.querySelector("[data-lesson].active");
    if (activeLesson) state.activeLesson = activeLesson.dataset.lesson;

    const activeWorkspace = document.querySelector("[data-workspace].active");
    if (activeWorkspace) state.activeWorkspace = activeWorkspace.dataset.workspace;

    const activeSystem = document.querySelector("[data-system].active");
    if (activeSystem) state.activeSystem = activeSystem.dataset.system;

    const activeLaunch = document.querySelector("[data-launch].active");
    if (activeLaunch) state.activeLaunch = activeLaunch.dataset.launch;

    const activeBlock = document.querySelector("[data-block].active");
    if (activeBlock) state.activeBlock = activeBlock.dataset.block;

    saveState(state);
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    updateSaveIndicator("Saving…");
    saveTimer = setTimeout(collectState, 350);
  }

  function restoreState() {
    const state = loadState();

    const fields = document.querySelectorAll(
      "textarea, input:not([type='checkbox']):not([type='radio']):not([type='button']):not([type='submit'])"
    );

    fields.forEach((element, index) => {
      const key = elementKey(element, index);
      if (Object.prototype.hasOwnProperty.call(state.fields || {}, key)) {
        element.value = state.fields[key];
      }
    });

    document.querySelectorAll("input[type='checkbox']").forEach((element, index) => {
      const key = elementKey(element, index);
      if (Object.prototype.hasOwnProperty.call(state.checkboxes || {}, key)) {
        element.checked = Boolean(state.checkboxes[key]);
      }
    });

    document.querySelectorAll("select").forEach((element, index) => {
      const key = elementKey(element, index);
      if (
        Object.prototype.hasOwnProperty.call(state.selects || {}, key) &&
        [...element.options].some(option => option.value === state.selects[key])
      ) {
        element.value = state.selects[key];
      }
    });

    restoreNavigation(state);
    updateSaveIndicator("Saved");
  }

  function clickSelector(selector) {
    const element = document.querySelector(selector);
    if (element) element.click();
  }

  function restoreNavigation(state) {
    setTimeout(() => {
      if (state.activePage && typeof window.showPage === "function") {
        window.showPage(state.activePage);
      } else if (state.activePage) {
        clickSelector(`[data-page="${CSS.escape(state.activePage)}"]`);
      }

      if (state.activeLesson) {
        clickSelector(`[data-lesson="${CSS.escape(state.activeLesson)}"]`);
      }
      if (state.activeWorkspace) {
        clickSelector(`[data-workspace="${CSS.escape(state.activeWorkspace)}"]`);
      }
      if (state.activeSystem) {
        clickSelector(`[data-system="${CSS.escape(state.activeSystem)}"]`);
      }
      if (state.activeLaunch !== undefined) {
        clickSelector(`[data-launch="${CSS.escape(String(state.activeLaunch))}"]`);
      }
      if (state.activeBlock !== undefined) {
        clickSelector(`[data-block="${CSS.escape(String(state.activeBlock))}"]`);
      }

      setTimeout(restoreStateWithoutNavigation, 300);
    }, 150);
  }

  function restoreStateWithoutNavigation() {
    const state = loadState();

    document.querySelectorAll("textarea, input, select").forEach((element, index) => {
      if (element.type === "checkbox") {
        const key = elementKey(element, index);
        if (Object.prototype.hasOwnProperty.call(state.checkboxes || {}, key)) {
          element.checked = Boolean(state.checkboxes[key]);
        }
        return;
      }

      const key = elementKey(element, index);
      if (element.tagName === "SELECT") {
        if (
          Object.prototype.hasOwnProperty.call(state.selects || {}, key) &&
          [...element.options].some(option => option.value === state.selects[key])
        ) {
          element.value = state.selects[key];
        }
      } else if (Object.prototype.hasOwnProperty.call(state.fields || {}, key)) {
        element.value = state.fields[key];
      }
    });
  }

  function updateSaveIndicator(message) {
    const indicator = document.getElementById("savedProgressIndicator");
    if (indicator) indicator.textContent = message;
  }

  function addToolbar() {
    if (document.getElementById("savedProgressToolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "savedProgressToolbar";
    toolbar.className = "saved-progress-toolbar";
    toolbar.innerHTML = `
      <div>
        <strong>Saved Progress</strong>
        <span id="savedProgressIndicator">Ready</span>
      </div>
      <button id="saveProgressNow" type="button">Save Now</button>
      <button id="resetSavedProgress" type="button">Reset</button>
    `;

    document.body.appendChild(toolbar);

    document.getElementById("saveProgressNow").addEventListener("click", collectState);
    document.getElementById("resetSavedProgress").addEventListener("click", () => {
      const confirmed = window.confirm(
        "Reset all saved checklists, notes, drafts, and current selections on this device?"
      );
      if (!confirmed) return;

      localStorage.removeItem(STATE_KEY);
      window.location.reload();
    });
  }

  function addListeners() {
    document.addEventListener("input", event => {
      if (event.target.matches("textarea, input, select")) scheduleSave();
    });

    document.addEventListener("change", event => {
      if (event.target.matches("textarea, input, select")) scheduleSave();
    });

    document.addEventListener("click", event => {
      if (
        event.target.closest(
          "[data-page], [data-lesson], [data-workspace], [data-system], [data-launch], [data-block], [data-build]"
        )
      ) {
        setTimeout(() => {
          restoreStateWithoutNavigation();
          scheduleSave();
        }, 250);
      }
    });

    window.addEventListener("beforeunload", collectState);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") collectState();
    });
  }

  function observeDynamicContent() {
    const observer = new MutationObserver(() => {
      clearTimeout(observer.restoreTimer);
      observer.restoreTimer = setTimeout(restoreStateWithoutNavigation, 180);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function start() {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "style-additions-v4-6.css";
    document.head.appendChild(css);

    addToolbar();
    addListeners();
    observeDynamicContent();

    setTimeout(restoreState, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
