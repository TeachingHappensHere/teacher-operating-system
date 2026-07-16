
(function () {
  "use strict";

  const VERSION = "4.8";
  const FILES = [
    ["index.html", "Application shell", true],
    ["style.css", "Core design", true],
    ["app.js", "Main application", true],
    ["manifest.json", "PWA manifest", true],
    ["service-worker.js", "Offline support", true],
    ["scholar-dashboard.json", "Dashboard data", true],
    ["lesson-engine.json", "Lesson Engine", true],
    ["classroom-systems.json", "Classroom Systems", true],
    ["teach-my-day.json", "Teach My Day", true],
    ["classroom-launch.json", "Classroom Launch", true],
    ["print-center.json", "Print Center", true],
    ["teacher-brain.json", "Teacher Brain", true],
    ["small-groups.json", "Small Groups", true],
    ["assessment-data.json", "Assessments", true],
    ["planner-engine.json", "Planner", true],
    ["lesson-builder.json", "Lesson Builder", true],
    ["teaching-workspace.json", "Live Workspace", true],
    ["resource-files.json", "Resources", true],
    ["communication-hub.json", "Communication Hub", true],
    ["student-dashboard.json", "Student Dashboard", true],
    ["saved-progress.js", "Saved Progress", true],
    ["universal-search.js", "Universal Search", true],
    ["resource-files-viewer.js", "Resource Viewer", false],
    ["student-dashboard-viewer.js", "Student Viewer", false],
    ["communication-hub-viewer.js", "Communication Viewer", false]
  ];

  let results = [];
  let overlay;

  async function checkFile([file, label, required]) {
    try {
      const response = await fetch(file + "?health=" + Date.now(), { cache: "no-store" });
      let ok = response.ok;
      let detail = ok ? "Loaded successfully" : `${response.status} ${response.statusText}`;

      if (ok && file.endsWith(".json")) {
        try {
          await response.clone().json();
          detail = "Loaded and valid JSON";
        } catch {
          ok = false;
          detail = "Invalid JSON";
        }
      }
      return { file, label, required, ok, detail };
    } catch {
      return { file, label, required, ok: false, detail: "Could not load" };
    }
  }

  async function runChecks() {
    setStatus("Running checks…");
    results = await Promise.all(FILES.map(checkFile));
    renderFiles();
    await renderEnvironment();
    setStatus("Checks complete");
  }

  function totals() {
    const required = results.filter(r => r.required);
    const optional = results.filter(r => !r.required);
    return {
      requiredReady: required.filter(r => r.ok).length,
      requiredTotal: required.length,
      optionalReady: optional.filter(r => r.ok).length,
      optionalTotal: optional.length,
      issues: required.filter(r => !r.ok).length
    };
  }

  function renderFiles() {
    const t = totals();
    document.getElementById("healthStats").innerHTML = `
      <article><strong>${t.requiredReady}/${t.requiredTotal}</strong><span>Required Files</span></article>
      <article><strong>${t.optionalReady}/${t.optionalTotal}</strong><span>Optional Files</span></article>
      <article class="${t.issues ? "danger" : "success"}"><strong>${t.issues}</strong><span>Required Issues</span></article>
      <article><strong>v${VERSION}</strong><span>Health Center</span></article>
    `;

    document.getElementById("healthFileResults").innerHTML = results.map(r => `
      <article class="health-file ${r.ok ? "healthy" : r.required ? "missing" : "optional"}">
        <b>${r.ok ? "✓" : r.required ? "!" : "–"}</b>
        <div><strong>${escapeHTML(r.label)}</strong><code>${escapeHTML(r.file)}</code><small>${escapeHTML(r.detail)}</small></div>
        <span>${r.ok ? "Ready" : r.required ? "Required" : "Optional"}</span>
      </article>
    `).join("");
  }

  async function renderEnvironment() {
    let worker = false;
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        worker = Boolean(registration && (registration.active || registration.waiting || registration.installing));
      } catch {}
    }

    const checks = [
      ["Secure Context", window.isSecureContext, window.isSecureContext ? "HTTPS is active." : "PWA features require HTTPS."],
      ["Service Worker", worker, worker ? "Registered." : "Not currently registered."],
      ["Manifest Link", Boolean(document.querySelector('link[rel="manifest"]')), "Manifest link in page."],
      ["Saved Progress", typeof localStorage !== "undefined", "Browser storage available."],
      ["Universal Search", Boolean(document.getElementById("universalSearchButton")), "Search button detected."],
      ["Installed Mode", matchMedia("(display-mode: standalone)").matches || navigator.standalone === true, "Browser mode is normal before installation."]
    ];

    document.getElementById("healthEnvironment").innerHTML = checks.map(([name, ok, detail], index) => `
      <article class="${ok ? "healthy" : index === 5 ? "warning" : "missing"}">
        <b>${ok ? "✓" : index === 5 ? "○" : "!"}</b>
        <div><strong>${name}</strong><small>${detail}</small></div>
      </article>
    `).join("");
  }

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.className = "health-overlay";
    overlay.innerHTML = `
      <section class="health-dialog">
        <header>
          <div><p>VERSION 4.8</p><h2>App Health & Launch Readiness</h2><span>Verify files, PWA support, and launch readiness.</span></div>
          <button id="closeHealth">×</button>
        </header>

        <div id="healthStats" class="health-stats"></div>

        <section class="health-section">
          <div class="health-title"><div><h3>Environment</h3><p>Browser and PWA checks.</p></div><button id="rerunHealth">Run Again</button></div>
          <div id="healthEnvironment" class="health-environment"></div>
        </section>

        <section class="health-section">
          <h3>Project Files</h3>
          <div id="healthFileResults"></div>
        </section>

        <section class="health-section">
          <h3>Launch Checklist</h3>
          <div class="launch-checks">
            ${[
              "Dashboard loads without errors",
              "Teach My Day opens",
              "Lesson Engine opens Unit 1",
              "Classroom Systems search works",
              "Print Center displays items",
              "Teacher Brain search works",
              "Student Dashboard opens",
              "Communication Hub opens",
              "Universal Search opens",
              "Saved Progress remains after refresh",
              "App installs on iPad/iPhone/computer"
            ].map(text => `<label><input type="checkbox"> ${text}</label>`).join("")}
          </div>
        </section>

        <section class="health-actions">
          <button id="refreshHealthApp">Refresh App</button>
          <button id="clearHealthCaches">Clear App Caches</button>
          <button id="copyHealthReport">Copy Report</button>
        </section>

        <footer><span id="healthStatus">Ready</span><span>TeachingHappensHere v4.8</span></footer>
      </section>
    `;
    document.body.appendChild(overlay);

    document.getElementById("closeHealth").onclick = close;
    document.getElementById("rerunHealth").onclick = runChecks;
    document.getElementById("refreshHealthApp").onclick = () => location.reload();
    document.getElementById("clearHealthCaches").onclick = clearCaches;
    document.getElementById("copyHealthReport").onclick = copyReport;
    overlay.onclick = event => { if (event.target === overlay) close(); };
  }

  function addButton() {
    const button = document.createElement("button");
    button.id = "appHealthButton";
    button.className = "app-health-button";
    button.innerHTML = "<span>✓</span><strong>App Health</strong><small>v4.8</small>";
    button.onclick = open;

    const search = document.getElementById("universalSearchButton");
    if (search) search.insertAdjacentElement("afterend", button);
    else document.querySelector(".side-nav, .sidebar nav")?.insertAdjacentElement("afterend", button);
  }

  function open() {
    overlay.classList.add("open");
    document.body.classList.add("health-open");
    runChecks();
  }

  function close() {
    overlay.classList.remove("open");
    document.body.classList.remove("health-open");
  }

  async function clearCaches() {
    if (!("caches" in window)) return setStatus("Cache API unavailable.");
    if (!confirm("Clear cached application files? Saved notes will remain.")) return;
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    setStatus("Caches cleared. Refresh the app.");
  }

  async function copyReport() {
    const t = totals();
    const report = [
      "TeachingHappensHere Health Report",
      `Version: ${VERSION}`,
      `Required files: ${t.requiredReady}/${t.requiredTotal}`,
      `Optional files: ${t.optionalReady}/${t.optionalTotal}`,
      "",
      ...results.filter(r => !r.ok).map(r => `${r.required ? "REQUIRED" : "OPTIONAL"}: ${r.file} — ${r.detail}`)
    ].join("\n");

    try {
      await navigator.clipboard.writeText(report);
      setStatus("Report copied.");
    } catch {
      setStatus("Could not copy report.");
    }
  }

  function setStatus(text) {
    const status = document.getElementById("healthStatus");
    if (status) status.textContent = text;
  }

  function escapeHTML(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function start() {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "style-additions-v4-8.css";
    document.head.appendChild(css);

    createOverlay();
    addButton();

    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        open();
      }
      if (event.key === "Escape") close();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
