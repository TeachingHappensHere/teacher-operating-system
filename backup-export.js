
// TeachingHappensHere Version 4.9
// Backup, Export & Device Transfer Center
(function () {
  "use strict";

  const VERSION = "4.9";
  const STORAGE_PREFIX = "thh-";
  let overlay = null;

  function allTeachingHappensHereStorage() {
    const data = {};

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        data[key] = localStorage.getItem(key);
      }
    }

    return data;
  }

  function createBackupPayload() {
    return {
      application: "TeachingHappensHere",
      version: VERSION,
      exportedAt: new Date().toISOString(),
      location: window.location.href,
      userAgent: navigator.userAgent,
      storage: allTeachingHappensHereStorage()
    };
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function safeDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function exportBackup() {
    const payload = createBackupPayload();
    downloadFile(
      `TeachingHappensHere-backup-${safeDate()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    setStatus("Backup downloaded.");
    renderStorageSummary();
  }

  function exportReadableReport() {
    const payload = createBackupPayload();
    const state = parseSavedState(payload.storage["thh-v46:state"]);

    const report = [
      "TeachingHappensHere Backup & Status Report",
      "==========================================",
      "",
      `Exported: ${new Date(payload.exportedAt).toLocaleString()}`,
      `Application version: ${VERSION}`,
      `Current page: ${state.activePage || "Not recorded"}`,
      `Selected lesson: ${state.activeLesson || "Not recorded"}`,
      `Selected workspace lesson: ${state.activeWorkspace || "Not recorded"}`,
      `Selected classroom system: ${state.activeSystem || "Not recorded"}`,
      `Selected launch day: ${state.activeLaunch ?? "Not recorded"}`,
      `Selected Teach My Day block: ${state.activeBlock ?? "Not recorded"}`,
      "",
      `Saved text fields: ${Object.keys(state.fields || {}).length}`,
      `Saved checklist items: ${Object.keys(state.checkboxes || {}).length}`,
      `Saved selections: ${Object.keys(state.selects || {}).length}`,
      `TeachingHappensHere storage records: ${Object.keys(payload.storage).length}`,
      "",
      "Storage Keys",
      "------------",
      ...Object.keys(payload.storage).map(key => `- ${key}`),
      "",
      "Privacy Reminder",
      "----------------",
      "This report does not print full saved notes or student details.",
      "The JSON backup contains the saved browser data needed for restoration."
    ].join("\n");

    downloadFile(
      `TeachingHappensHere-status-${safeDate()}.txt`,
      report,
      "text/plain"
    );

    setStatus("Readable status report downloaded.");
  }

  function parseSavedState(value) {
    if (!value) return {};

    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  function chooseImportFile() {
    document.getElementById("backupImportFile").click();
  }

  function importBackup(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = event => {
      try {
        const payload = JSON.parse(event.target.result);

        if (
          payload.application !== "TeachingHappensHere" ||
          !payload.storage ||
          typeof payload.storage !== "object"
        ) {
          throw new Error("This is not a valid TeachingHappensHere backup.");
        }

        const keys = Object.keys(payload.storage);

        if (!keys.length) {
          throw new Error("The backup does not contain saved application data.");
        }

        const confirmed = window.confirm(
          `Import ${keys.length} saved record(s)? This will replace matching saved data on this device.`
        );

        if (!confirmed) return;

        keys.forEach(key => {
          if (key.startsWith(STORAGE_PREFIX)) {
            localStorage.setItem(key, payload.storage[key]);
          }
        });

        setStatus("Backup imported. Refreshing application…");
        setTimeout(() => window.location.reload(), 700);
      } catch (error) {
        setStatus(error.message || "Backup import failed.");
      }
    };

    reader.onerror = () => {
      setStatus("The selected backup file could not be read.");
    };

    reader.readAsText(file);
  }

  function clearSavedProgressOnly() {
    const confirmed = window.confirm(
      "Clear saved checklists, notes, drafts, and current selections on this device? Project files will not be changed."
    );

    if (!confirmed) return;

    localStorage.removeItem("thh-v46:state");
    setStatus("Saved progress cleared.");
    renderStorageSummary();
  }

  function clearAllTeachingHappensHereStorage() {
    const keys = Object.keys(allTeachingHappensHereStorage());

    if (!keys.length) {
      setStatus("No TeachingHappensHere browser data was found.");
      return;
    }

    const confirmed = window.confirm(
      `Remove all ${keys.length} TeachingHappensHere saved browser record(s) from this device? Export a backup first if needed.`
    );

    if (!confirmed) return;

    keys.forEach(key => localStorage.removeItem(key));
    setStatus("All TeachingHappensHere browser data cleared.");
    renderStorageSummary();
  }

  function storageSize(storage) {
    const characters = Object.entries(storage)
      .reduce((total, [key, value]) => total + key.length + String(value).length, 0);

    const bytes = characters * 2;

    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function renderStorageSummary() {
    const container = document.getElementById("backupStorageSummary");
    if (!container) return;

    const storage = allTeachingHappensHereStorage();
    const state = parseSavedState(storage["thh-v46:state"]);

    const fieldCount = Object.keys(state.fields || {}).length;
    const checklistCount = Object.keys(state.checkboxes || {}).length;
    const selectionCount = Object.keys(state.selects || {}).length;
    const completedCount = Object.values(state.checkboxes || {}).filter(Boolean).length;

    container.innerHTML = `
      <article>
        <strong>${Object.keys(storage).length}</strong>
        <span>Saved Records</span>
      </article>
      <article>
        <strong>${fieldCount}</strong>
        <span>Saved Text Fields</span>
      </article>
      <article>
        <strong>${completedCount}/${checklistCount}</strong>
        <span>Completed Checklists</span>
      </article>
      <article>
        <strong>${selectionCount}</strong>
        <span>Saved Selections</span>
      </article>
      <article>
        <strong>${storageSize(storage)}</strong>
        <span>Browser Storage Used</span>
      </article>
    `;

    const details = document.getElementById("backupCurrentPosition");
    if (details) {
      details.innerHTML = `
        <div><strong>Current page</strong><span>${escapeHTML(state.activePage || "Not saved yet")}</span></div>
        <div><strong>Lesson</strong><span>${escapeHTML(state.activeLesson || "Not saved yet")}</span></div>
        <div><strong>Workspace</strong><span>${escapeHTML(state.activeWorkspace || "Not saved yet")}</span></div>
        <div><strong>Classroom system</strong><span>${escapeHTML(state.activeSystem || "Not saved yet")}</span></div>
        <div><strong>Launch day</strong><span>${escapeHTML(state.activeLaunch ?? "Not saved yet")}</span></div>
        <div><strong>Teaching block</strong><span>${escapeHTML(state.activeBlock ?? "Not saved yet")}</span></div>
      `;
    }
  }

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "backupExportOverlay";
    overlay.className = "backup-overlay";

    overlay.innerHTML = `
      <section class="backup-dialog" role="dialog" aria-modal="true" aria-label="Backup and export center">
        <header>
          <div>
            <p class="eyebrow">Version ${VERSION}</p>
            <h2>Backup, Export & Device Transfer</h2>
            <p>Protect saved progress and move your TeachingHappensHere setup between devices.</p>
          </div>
          <button id="closeBackupCenter" aria-label="Close backup center">×</button>
        </header>

        <section id="backupStorageSummary" class="backup-stats"></section>

        <section class="backup-section">
          <h3>Protect Your Work</h3>
          <div class="backup-action-grid">
            <article>
              <div class="backup-icon">↓</div>
              <h4>Export Full Backup</h4>
              <p>Download saved progress, notes, drafts, checklists, and your current place in the app.</p>
              <button id="exportFullBackup">Download JSON Backup</button>
            </article>

            <article>
              <div class="backup-icon">↑</div>
              <h4>Import Backup</h4>
              <p>Restore a TeachingHappensHere backup on this computer, iPad, or another browser.</p>
              <button id="chooseBackupImport">Choose Backup File</button>
              <input id="backupImportFile" type="file" accept=".json,application/json" hidden>
            </article>

            <article>
              <div class="backup-icon">≡</div>
              <h4>Readable Status Report</h4>
              <p>Download a summary of saved counts and your current operating-system position.</p>
              <button id="exportStatusReport">Download Text Report</button>
            </article>
          </div>
        </section>

        <section class="backup-section">
          <h3>Current Saved Position</h3>
          <div id="backupCurrentPosition" class="backup-position"></div>
        </section>

        <section class="backup-section">
          <h3>Device Transfer Steps</h3>
          <ol class="backup-transfer-steps">
            <li>Open this center on the current device.</li>
            <li>Download the JSON backup.</li>
            <li>Move the file to the destination device using Drive, email, AirDrop, or Files.</li>
            <li>Open TeachingHappensHere on the destination device.</li>
            <li>Choose <strong>Import Backup</strong> and select the JSON file.</li>
            <li>The application refreshes with the restored saved progress.</li>
          </ol>
        </section>

        <section class="backup-section backup-danger-zone">
          <h3>Reset Options</h3>
          <p>These controls affect saved browser data only. They do not delete files from GitHub.</p>
          <div>
            <button id="clearProgressOnly">Clear Saved Progress Only</button>
            <button id="clearAllAppStorage">Clear All App Browser Data</button>
          </div>
        </section>

        <footer>
          <span id="backupStatus">Ready</span>
          <span>TeachingHappensHere v${VERSION}</span>
        </footer>
      </section>
    `;

    document.body.appendChild(overlay);

    document.getElementById("closeBackupCenter").addEventListener("click", closeCenter);
    document.getElementById("exportFullBackup").addEventListener("click", exportBackup);
    document.getElementById("chooseBackupImport").addEventListener("click", chooseImportFile);
    document.getElementById("exportStatusReport").addEventListener("click", exportReadableReport);
    document.getElementById("clearProgressOnly").addEventListener("click", clearSavedProgressOnly);
    document.getElementById("clearAllAppStorage").addEventListener("click", clearAllTeachingHappensHereStorage);

    document.getElementById("backupImportFile").addEventListener("change", event => {
      importBackup(event.target.files[0]);
      event.target.value = "";
    });

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeCenter();
    });
  }

  function addButton() {
    if (document.getElementById("backupExportButton")) return;

    const button = document.createElement("button");
    button.id = "backupExportButton";
    button.className = "backup-export-button";
    button.innerHTML = `
      <span>⇄</span>
      <strong>Backup & Transfer</strong>
      <small>v${VERSION}</small>
    `;
    button.addEventListener("click", openCenter);

    const healthButton = document.getElementById("appHealthButton");
    if (healthButton) {
      healthButton.insertAdjacentElement("afterend", button);
      return;
    }

    const searchButton = document.getElementById("universalSearchButton");
    if (searchButton) {
      searchButton.insertAdjacentElement("afterend", button);
      return;
    }

    const nav = document.querySelector(".side-nav, .sidebar nav");
    nav?.insertAdjacentElement("afterend", button);
  }

  function openCenter() {
    overlay.classList.add("open");
    document.body.classList.add("backup-open");
    renderStorageSummary();
    setStatus("Ready");
  }

  function closeCenter() {
    overlay.classList.remove("open");
    document.body.classList.remove("backup-open");
  }

  function setStatus(message) {
    const status = document.getElementById("backupStatus");
    if (status) status.textContent = message;
  }

  function escapeHTML(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function addKeyboardShortcut() {
    document.addEventListener("keydown", event => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "b"
      ) {
        event.preventDefault();
        openCenter();
      }

      if (event.key === "Escape" && overlay.classList.contains("open")) {
        closeCenter();
      }
    });
  }

  function start() {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "style-additions-v4-9.css";
    document.head.appendChild(css);

    createOverlay();
    addButton();
    addKeyboardShortcut();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
