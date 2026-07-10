
// TeachingHappensHere Version 5.0
// Launch Candidate & Installation Center
(function () {
  "use strict";

  const VERSION = "5.0";
  const ONBOARDING_KEY = "thh-v50:onboarding-complete";
  let deferredInstallPrompt = null;
  let overlay = null;

  const FEATURES = [
    ["Home Dashboard", "Your classroom command center"],
    ["Teach My Day", "Guided block-by-block teaching flow"],
    ["Live Teaching Workspace", "One-screen instructional workspace"],
    ["Lesson Builder", "Curriculum, groups, assessments, and print planning"],
    ["Classroom Systems", "Procedures, anchor charts, and coaching notes"],
    ["Classroom Launch", "First-week routine teaching support"],
    ["Small Groups", "Red, Yellow, Blue, and Green intervention structure"],
    ["Assessments & Data", "DIBELS, Open Court, and reteach connections"],
    ["Smart Print Center", "Print needs organized by teaching purpose"],
    ["Teacher Brain", "Searchable veteran-teacher reminders"],
    ["Resource Library", "File locations, status, and lesson connections"],
    ["Student Dashboard", "Student support overview"],
    ["Communication Hub", "Family messages, newsletters, and contact notes"],
    ["Universal Search", "Search the entire operating system"],
    ["Saved Progress", "Checklists, notes, drafts, and place-saving"],
    ["App Health", "Launch-readiness and file checks"],
    ["Backup & Transfer", "Move saved work between devices"]
  ];

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function browserName() {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "Microsoft Edge";
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Google Chrome";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    if (/Firefox\//.test(ua)) return "Firefox";
    return "Browser";
  }

  function platformName() {
    if (isIOS()) return /iPad/.test(navigator.userAgent) || navigator.platform === "MacIntel"
      ? "iPad"
      : "iPhone";
    if (/Windows/.test(navigator.userAgent)) return "Windows";
    if (/Macintosh/.test(navigator.userAgent)) return "Mac";
    if (/Android/.test(navigator.userAgent)) return "Android";
    return "Device";
  }

  function installInstructions() {
    if (isStandalone()) {
      return {
        title: "TeachingHappensHere is installed",
        steps: [
          "Open it from your Home Screen, Dock, Start menu, or Applications.",
          "Keep GitHub Pages available so updates can be downloaded.",
          "Use Backup & Transfer before changing devices."
        ]
      };
    }

    if (isIOS()) {
      return {
        title: `Install on this ${platformName()}`,
        steps: [
          "Open TeachingHappensHere in Safari.",
          "Tap the Share button.",
          "Scroll down and tap Add to Home Screen.",
          "Confirm the name and tap Add.",
          "Open the new TeachingHappensHere icon from the Home Screen."
        ]
      };
    }

    return {
      title: `Install using ${browserName()}`,
      steps: [
        "Look for the install icon in the browser address bar.",
        "Select Install or Install app.",
        "Confirm the installation.",
        "Open TeachingHappensHere from the desktop, Start menu, Dock, or Applications.",
        "If no install icon appears, use the browser menu and choose Install app or Apps."
      ]
    };
  }

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.id = "launchCandidateOverlay";
    overlay.className = "launch-candidate-overlay";

    overlay.innerHTML = `
      <section class="launch-candidate-dialog" role="dialog" aria-modal="true" aria-label="TeachingHappensHere launch center">
        <header class="launch-candidate-header">
          <div>
            <p class="eyebrow">Version ${VERSION} Launch Candidate</p>
            <h2>Welcome to TeachingHappensHere</h2>
            <p>Your classroom operating system is ready for installation, testing, and daily use.</p>
          </div>
          <button id="closeLaunchCandidate" aria-label="Close launch center">×</button>
        </header>

        <section class="launch-candidate-hero">
          <div class="launch-candidate-logo">THH</div>
          <div>
            <strong>Mrs. Parrish’s Scholar System</strong>
            <span id="launchDeviceSummary"></span>
          </div>
          <button id="installTeachingHappensHere">Install App</button>
        </section>

        <div class="launch-candidate-tabs">
          <button class="active" data-launch-tab="setup">First-Time Setup</button>
          <button data-launch-tab="install">Install</button>
          <button data-launch-tab="features">What’s Included</button>
          <button data-launch-tab="readiness">Launch Readiness</button>
        </div>

        <section id="launchSetupTab" class="launch-tab-panel"></section>
        <section id="launchInstallTab" class="launch-tab-panel hidden"></section>
        <section id="launchFeaturesTab" class="launch-tab-panel hidden"></section>
        <section id="launchReadinessTab" class="launch-tab-panel hidden"></section>

        <footer class="launch-candidate-footer">
          <span id="launchCandidateStatus">Launch Center ready</span>
          <div>
            <button id="finishOnboarding">Setup Complete</button>
            <button id="openMyClassroom">Open My Classroom</button>
          </div>
        </footer>
      </section>
    `;

    document.body.appendChild(overlay);

    document.getElementById("closeLaunchCandidate").addEventListener("click", closeCenter);
    document.getElementById("installTeachingHappensHere").addEventListener("click", installApp);
    document.getElementById("finishOnboarding").addEventListener("click", finishOnboarding);
    document.getElementById("openMyClassroom").addEventListener("click", openClassroom);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeCenter();
    });

    document.querySelectorAll("[data-launch-tab]").forEach(button => {
      button.addEventListener("click", () => showTab(button.dataset.launchTab));
    });
  }

  function showTab(tab) {
    const map = {
      setup: "launchSetupTab",
      install: "launchInstallTab",
      features: "launchFeaturesTab",
      readiness: "launchReadinessTab"
    };

    document.querySelectorAll("[data-launch-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.launchTab === tab);
    });

    document.querySelectorAll(".launch-tab-panel").forEach(panel => {
      panel.classList.add("hidden");
    });

    document.getElementById(map[tab]).classList.remove("hidden");
  }

  function renderSetup() {
    document.getElementById("launchSetupTab").innerHTML = `
      <div class="launch-candidate-section">
        <h3>First-Time Setup Checklist</h3>
        <div class="launch-setup-grid">
          ${[
            "Open App Health and resolve required file issues",
            "Test Universal Search with Ctrl/Command + K",
            "Open Teach My Day",
            "Open Live Teaching Workspace",
            "Confirm Classroom Systems load",
            "Confirm Smart Print Center loads",
            "Create a Backup & Transfer file",
            "Install TeachingHappensHere on this device",
            "Add available classroom resources",
            "Practice opening the app in installed mode"
          ].map((step, index) => `
            <label>
              <input type="checkbox" data-save-key="v50-setup-${index}">
              <span>${step}</span>
            </label>
          `).join("")}
        </div>
      </div>

      <div class="launch-candidate-section">
        <h3>Recommended Launch Order</h3>
        <div class="launch-order">
          <article><b>1</b><strong>Check</strong><span>Run App Health.</span></article>
          <article><b>2</b><strong>Protect</strong><span>Download a backup.</span></article>
          <article><b>3</b><strong>Install</strong><span>Add the app to the device.</span></article>
          <article><b>4</b><strong>Practice</strong><span>Open Teach My Day and Workspace.</span></article>
          <article><b>5</b><strong>Launch</strong><span>Use it during a real teaching block.</span></article>
        </div>
      </div>
    `;
  }

  function renderInstall() {
    const instructions = installInstructions();
    const installed = isStandalone();

    document.getElementById("launchInstallTab").innerHTML = `
      <div class="launch-candidate-section">
        <div class="install-status-card ${installed ? "installed" : ""}">
          <span>${installed ? "✓" : "＋"}</span>
          <div>
            <strong>${instructions.title}</strong>
            <p>${installed
              ? "The application is currently running in installed mode."
              : `Detected: ${platformName()} using ${browserName()}.`}</p>
          </div>
        </div>

        <ol class="installation-steps">
          ${instructions.steps.map(step => `<li>${step}</li>`).join("")}
        </ol>

        <button class="launch-primary-action" id="installFromInstructions">
          ${installed ? "Already Installed" : "Try Install Prompt"}
        </button>
      </div>

      <div class="launch-candidate-section">
        <h3>After Installation</h3>
        <div class="launch-after-install">
          <p>Open the installed app once while online so current files can be cached.</p>
          <p>Run App Health inside the installed app.</p>
          <p>Use Backup & Transfer before moving to another device.</p>
          <p>Refresh after each GitHub deployment to receive the newest version.</p>
        </div>
      </div>
    `;

    document.getElementById("installFromInstructions").addEventListener("click", installApp);
  }

  function renderFeatures() {
    document.getElementById("launchFeaturesTab").innerHTML = `
      <div class="launch-candidate-section">
        <h3>Version 5.0 Operating System</h3>
        <div class="launch-feature-grid">
          ${FEATURES.map(([title, description]) => `
            <article>
              <span>✓</span>
              <div><strong>${title}</strong><p>${description}</p></div>
            </article>
          `).join("")}
        </div>
      </div>
    `;
  }

  async function renderReadiness() {
    const serviceWorker = await checkServiceWorker();
    const manifest = Boolean(document.querySelector('link[rel="manifest"]'));
    const secure = window.isSecureContext;
    const storage = typeof localStorage !== "undefined";
    const search = Boolean(document.getElementById("universalSearchButton"));
    const health = Boolean(document.getElementById("appHealthButton"));
    const backup = Boolean(document.getElementById("backupExportButton"));

    const checks = [
      ["Secure HTTPS connection", secure],
      ["PWA manifest linked", manifest],
      ["Service worker registered", serviceWorker],
      ["Saved Progress available", storage],
      ["Universal Search detected", search],
      ["App Health detected", health],
      ["Backup & Transfer detected", backup],
      ["Installed app mode", isStandalone()]
    ];

    const readyCount = checks.filter(([, ready]) => ready).length;

    document.getElementById("launchReadinessTab").innerHTML = `
      <div class="launch-candidate-section">
        <div class="launch-readiness-score">
          <strong>${readyCount}/${checks.length}</strong>
          <span>Launch checks ready</span>
        </div>

        <div class="launch-readiness-grid">
          ${checks.map(([title, ready]) => `
            <article class="${ready ? "ready" : "needs-attention"}">
              <span>${ready ? "✓" : "!"}</span>
              <strong>${title}</strong>
              <small>${ready ? "Ready" : title === "Installed app mode" ? "Install when ready" : "Needs attention"}</small>
            </article>
          `).join("")}
        </div>

        <div class="launch-readiness-actions">
          <button id="openHealthFromLaunch">Open App Health</button>
          <button id="openBackupFromLaunch">Create Backup</button>
          <button id="refreshLaunchChecks">Run Checks Again</button>
        </div>
      </div>
    `;

    document.getElementById("openHealthFromLaunch").addEventListener("click", () => {
      closeCenter();
      document.getElementById("appHealthButton")?.click();
    });

    document.getElementById("openBackupFromLaunch").addEventListener("click", () => {
      closeCenter();
      document.getElementById("backupExportButton")?.click();
    });

    document.getElementById("refreshLaunchChecks").addEventListener("click", renderReadiness);
  }

  async function checkServiceWorker() {
    if (!("serviceWorker" in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(
        registration &&
        (registration.active || registration.waiting || registration.installing)
      );
    } catch {
      return false;
    }
  }

  function installApp() {
    if (isStandalone()) {
      setStatus("TeachingHappensHere is already installed.");
      showTab("install");
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(choice => {
        setStatus(choice.outcome === "accepted"
          ? "Installation accepted."
          : "Installation was dismissed.");
        deferredInstallPrompt = null;
        renderInstall();
      });
      return;
    }

    showTab("install");
    setStatus(isIOS()
      ? "Use Safari’s Share menu and choose Add to Home Screen."
      : "Use the browser’s Install app option.");
  }

  function finishOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setStatus("First-time setup marked complete.");
    setTimeout(closeCenter, 500);
  }

  function openClassroom() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    closeCenter();

    const teachButton = document.querySelector('[data-page="teachday"]');
    const dashboardButton = document.querySelector('[data-page="dashboard"]');

    (teachButton || dashboardButton)?.click();
  }

  function addButton() {
    if (document.getElementById("launchCandidateButton")) return;

    const button = document.createElement("button");
    button.id = "launchCandidateButton";
    button.className = "launch-candidate-button";
    button.innerHTML = `
      <span>★</span>
      <strong>Launch Center</strong>
      <small>v${VERSION}</small>
    `;
    button.addEventListener("click", openCenter);

    const backupButton = document.getElementById("backupExportButton");
    if (backupButton) {
      backupButton.insertAdjacentElement("afterend", button);
      return;
    }

    const healthButton = document.getElementById("appHealthButton");
    if (healthButton) {
      healthButton.insertAdjacentElement("afterend", button);
      return;
    }

    const nav = document.querySelector(".side-nav, .sidebar nav");
    nav?.insertAdjacentElement("afterend", button);
  }

  function openCenter() {
    overlay.classList.add("open");
    document.body.classList.add("launch-candidate-open");
    document.getElementById("launchDeviceSummary").textContent =
      `${platformName()} • ${browserName()} • ${isStandalone() ? "Installed" : "Browser mode"}`;
    renderReadiness();
    setStatus("Launch Center ready");
  }

  function closeCenter() {
    overlay.classList.remove("open");
    document.body.classList.remove("launch-candidate-open");
  }

  function setStatus(message) {
    const status = document.getElementById("launchCandidateStatus");
    if (status) status.textContent = message;
  }

  function restoreSetupChecks() {
    const stateValue = localStorage.getItem("thh-v46:state");
    if (!stateValue) return;

    try {
      const state = JSON.parse(stateValue);
      document.querySelectorAll("[data-save-key]").forEach((checkbox, index) => {
        const matching = Object.entries(state.checkboxes || {})
          .find(([key]) => key.includes(checkbox.dataset.saveKey));

        if (matching) checkbox.checked = Boolean(matching[1]);
      });
    } catch {}
  }

  function start() {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "style-additions-v5-0.css";
    document.head.appendChild(css);

    createOverlay();
    renderSetup();
    renderInstall();
    renderFeatures();
    renderReadiness();
    addButton();

    setTimeout(restoreSetupChecks, 500);

    document.addEventListener("keydown", event => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "l"
      ) {
        event.preventDefault();
        openCenter();
      }

      if (event.key === "Escape" && overlay.classList.contains("open")) {
        closeCenter();
      }
    });

    const completed = localStorage.getItem(ONBOARDING_KEY) === "true";
    if (!completed) {
      setTimeout(openCenter, 1200);
    }
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    setStatus("Install prompt is available.");
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    setStatus("TeachingHappensHere was installed.");
    renderInstall();
    renderReadiness();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
