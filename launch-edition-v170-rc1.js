
(() => {
  "use strict";

  const BUILD = "17.0-RC1";
  const LAUNCH_START = "2026-07-27";
  const LAUNCH_END = "2026-07-31";
  const CORE_START = "2026-08-03";
  const PREVIEW_STORE = "thh-v170rc1:preview-date";
  const LAUNCH_ROUTE = "classroom-launch";
  const ENGINE_ROUTE = "teaching-engine";
  const DASHBOARD_ROUTE = "dashboard";

  let launchData = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function localDate(date = new Date()) {
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0,10);
  }

  function activeDate() {
    return localStorage.getItem(PREVIEW_STORE) || localDate();
  }

  function route() {
    return location.hash.replace("#","") || DASHBOARD_ROUTE;
  }

  function modeFor(date) {
    if (date >= LAUNCH_START && date <= LAUNCH_END) return "launch";
    if (date >= CORE_START) return "core";
    return "prelaunch";
  }

  function launchDayFor(date) {
    return launchData?.days?.find(day => day.date === date) || null;
  }

  function prettyDate(date) {
    return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday:"long", month:"long", day:"numeric", year:"numeric"
    });
  }

  function removeDuplicateNavigation() {
    const labels = ["Teacher Intelligence","Classroom Launch"];
    labels.forEach(label => {
      const matches = $$("button, a").filter(element =>
        element.textContent?.trim() === label
      );
      matches.slice(1).forEach(element => element.remove());
    });

    $$("button, a").filter(element =>
      /First-Week Builder/i.test(element.textContent || "")
    ).forEach(element => element.remove());
  }

  function wireLaunchNavigation() {
    $$("[data-route]").forEach(element => {
      const label = element.textContent?.trim() || "";
      if (/Classroom Launch/i.test(label)) {
        element.dataset.route = LAUNCH_ROUTE;
        element.onclick = () => location.hash = LAUNCH_ROUTE;
      }
    });
  }

  function findStartTeachingButton() {
    return $$("button, a").find(element =>
      element.textContent?.trim() === "Start Teaching"
    );
  }

  function wireStartTeaching() {
    const button = findStartTeachingButton();
    if (!button) return;

    const mode = modeFor(activeDate());
    button.onclick = event => {
      event.preventDefault();
      location.hash = mode === "launch" ? LAUNCH_ROUTE : ENGINE_ROUTE;
    };
  }

  function replaceDashboardLessonCards(mode, day) {
    const headings = $$("h1,h2,h3,strong").filter(element =>
      /Open only what you need/i.test(element.textContent || "")
    );
    const sectionHeading = headings[0];
    if (!sectionHeading) return;

    const section = sectionHeading.closest("section, article, div");
    if (!section) return;

    const cards = $$("article, .card, [class*='lesson']", section)
      .filter(card => /Open Lesson/i.test(card.textContent || ""));

    if (!cards.length) return;

    if (mode === "prelaunch") {
      const content = [
        ["PRE-LAUNCH","Prepare Classroom Launch","Review July 27–31 plans and materials."],
        ["PLANNING","Teacher Intelligence","Check readiness, printing, and attachments."],
        ["RESOURCES","Classroom Launch","Open the five-day launch experience."],
        ["CALENDAR","Upcoming Start","Classroom Launch begins July 27, 2026."]
      ];
      cards.slice(0,4).forEach((card,index) => {
        const [eyebrow,title,detail] = content[index];
        card.innerHTML = `
          <div class="v170rc1-card">
            <span>${esc(eyebrow)}</span>
            <strong>${esc(title)}</strong>
            <p>${esc(detail)}</p>
            <button data-v170-go="${index === 1 ? "teacher-intelligence" : LAUNCH_ROUTE}">Open</button>
          </div>`;
      });
      return;
    }

    if (mode === "launch" && day) {
      const blocks = day.blocks || [];
      cards.slice(0,4).forEach((card,index) => {
        const block = blocks[index] || blocks[0];
        card.innerHTML = `
          <div class="v170rc1-card">
            <span>CLASSROOM LAUNCH • DAY ${day.day}</span>
            <strong>${esc(block?.title || day.theme)}</strong>
            <p>${esc(block?.objective || day.focus)}</p>
            <button data-v170-go="${LAUNCH_ROUTE}">Open Day ${day.day}</button>
          </div>`;
      });
      return;
    }

    if (mode === "core") {
      // Leave existing curriculum cards intact after the official core start.
    }
  }

  function updateDashboardHeader(mode, day) {
    if (route() !== DASHBOARD_ROUTE) return;

    const h1 = $$("h1").find(element =>
      /Good morning|Good afternoon|Good evening/i.test(element.textContent || "")
    );
    if (!h1) return;

    const parent = h1.parentElement;
    if (!parent) return;

    let status = $("#v170rc1Status", parent);
    if (!status) {
      status = document.createElement("div");
      status.id = "v170rc1Status";
      status.className = "v170rc1-status";
      parent.appendChild(status);
    }

    const date = activeDate();
    if (mode === "launch" && day) {
      status.innerHTML = `
        <span>CLASSROOM LAUNCH • DAY ${day.day}</span>
        <strong>${esc(day.theme)}</strong>
        <p>${esc(day.focus)}</p>`;
    } else if (mode === "core") {
      status.innerHTML = `
        <span>CORE INSTRUCTION</span>
        <strong>Curriculum Week 1</strong>
        <p>Open Court Unit 1 begins with “The Mice Who Lived in a Shoe.”</p>`;
    } else {
      status.innerHTML = `
        <span>PRE-LAUNCH PREPARATION</span>
        <strong>Classroom Launch begins July 27</strong>
        <p>Use this time to prepare procedures, copies, resources, and your first-week environment.</p>`;
    }

    let preview = $("#v170rc1Preview");
    if (!preview) {
      preview = document.createElement("section");
      preview.id = "v170rc1Preview";
      preview.className = "v170rc1-preview";
      preview.innerHTML = `
        <label>
          <span>PREVIEW ANOTHER DATE</span>
          <input type="date">
        </label>
        <button type="button">Use Today</button>`;
      const dashboard = $("#pageHost") || document.body;
      dashboard.prepend(preview);

      $("input", preview).addEventListener("change", event => {
        if (event.target.value) {
          localStorage.setItem(PREVIEW_STORE, event.target.value);
          refresh();
        }
      });

      $("button", preview).addEventListener("click", () => {
        localStorage.removeItem(PREVIEW_STORE);
        refresh();
      });
    }

    $("input", preview).value = date;
    replaceDashboardLessonCards(mode, day);
  }

  function hideIncorrectUnitOneBeforeCore(mode) {
    if (mode === "core") return;

    $$("*").filter(element => {
      const text = element.childNodes.length === 1 ? element.textContent?.trim() : "";
      return /The Mice Who Lived in a Shoe|Unit 1,\s*Lesson 1/i.test(text || "");
    }).forEach(element => {
      const card = element.closest("article, .card, [class*='lesson']");
      if (card) card.dataset.v170HiddenUnitOne = "true";
    });
  }

  function syncClassroomLaunchDay(day) {
    if (!day || route() !== LAUNCH_ROUTE) return;

    const prefs = {
      ...(JSON.parse(localStorage.getItem("thh-v168:classroom-launch-preferences") || "{}")),
      selectedDay: day.day
    };
    localStorage.setItem(
      "thh-v168:classroom-launch-preferences",
      JSON.stringify(prefs)
    );

    if (window.THH_CLASSROOM_LAUNCH_V168?.render) {
      window.THH_CLASSROOM_LAUNCH_V168.render();
    }
  }

  function wireIntegrationButtons() {
    $$("[data-v170-go]").forEach(button => {
      button.onclick = () => location.hash = button.dataset.v170Go;
    });
  }

  function refresh() {
    removeDuplicateNavigation();
    wireLaunchNavigation();
    wireStartTeaching();

    const date = activeDate();
    const mode = modeFor(date);
    const day = launchDayFor(date);

    updateDashboardHeader(mode, day);
    hideIncorrectUnitOneBeforeCore(mode);
    syncClassroomLaunchDay(day);
    wireIntegrationButtons();

    document.documentElement.dataset.teacherOsBuild = BUILD;
    document.documentElement.dataset.schoolMode = mode;
  }

  async function boot() {
    try {
      const response = await fetch("classroom-launch-v168.json", { cache:"no-store" });
      if (response.ok) launchData = await response.json();
    } catch (error) {
      console.error("Launch Edition could not load Classroom Launch data.", error);
    }

    refresh();

    const observer = new MutationObserver(() => {
      clearTimeout(window.__v170rc1RefreshTimer);
      window.__v170rc1RefreshTimer = setTimeout(refresh, 40);
    });

    observer.observe(document.body, { childList:true, subtree:true });
  }

  window.THH_LAUNCH_EDITION_RC1 = {
    refresh,
    activeDate,
    modeFor
  };

  window.addEventListener("hashchange", () => setTimeout(refresh, 20));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
