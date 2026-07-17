(() => {
  "use strict";

  const BUILD = "17.0.2";
  const PREVIEW_KEY = "thh-rc2:preview-date";
  const LAUNCH_DATA_URL = "classroom-launch-v171.json";
  const LAUNCH_START = "2026-07-27";
  const LAUNCH_END = "2026-07-31";
  const CORE_START = "2026-08-03";
  const DASHBOARD = "dashboard";
  const LAUNCH = "classroom-launch";
  const ENGINE = "teaching-engine";
  let launchData = null;
  let rendering = false;
  let refreshTimer = 0;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const route = () => location.hash.replace(/^#/, "") || DASHBOARD;
  const todayISO = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const activeDate = () => localStorage.getItem(PREVIEW_KEY) || todayISO();
  const modeFor = date => date >= CORE_START ? "core" : date >= LAUNCH_START && date <= LAUNCH_END ? "launch" : "prelaunch";
  const dateLong = date => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" });
  const weekday = date => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday:"long" });

  function navigate(target) {
    location.hash = target;
  }

  function removeLegacyNavigation() {
    $$('[data-route="first-week-builder"], [href="#first-week-builder"]').forEach(node => node.remove());
    $$('button, a').forEach(node => {
      if (/^First-Week Builder$/i.test(node.textContent?.trim() || "")) node.remove();
    });
  }

  function ensureLaunchNavigation() {
    const nav = $("#mainNav");
    if (!nav || $('[data-route="classroom-launch"]', nav)) return;
    const button = document.createElement("button");
    button.className = "nav-button";
    button.dataset.route = LAUNCH;
    button.innerHTML = '<span>🚀</span><strong>Classroom Launch</strong>';
    button.addEventListener("click", () => navigate(LAUNCH));
    const dashboardButton = $('[data-route="dashboard"]', nav);
    dashboardButton?.insertAdjacentElement("afterend", button);
  }

  function dashboardCards(mode, date) {
    if (mode === "prelaunch") {
      return [
        ["PREPARE", "Classroom Launch Week", "Review the July 27–31 routines and materials.", LAUNCH, "Open Launch Plans"],
        ["PRINTING", "Copies and Materials", "Finish copies, anchor charts, name tags, and room materials.", "print-center", "Open Print Center"],
        ["PLANNING", "Teacher Intelligence", "Check plans, resources, attachments, and readiness.", "teacher-intelligence", "Check Readiness"],
        ["CALENDAR", "Core Curriculum Starts August 3", "Open Court Unit 1 remains locked until Monday, August 3.", "calendar", "Open Calendar"]
      ];
    }
    if (mode === "launch") {
      const day = launchData?.days?.[weekday(date)] || launchData?.days?.Monday;
      const blocks = day?.blocks || [];
      return blocks.slice(0, 4).map((block, index) => [
        `DAY ${date.slice(-2).replace(/^0/, "")} • ${block.time || "CLASSROOM LAUNCH"}`,
        block.title || day?.theme || "Classroom Launch",
        block.objective || day?.focus || "Teach, model, practice, and reflect on classroom routines.",
        LAUNCH,
        `Open Day ${Math.max(1, Math.min(5, Number(date.slice(-2)) - 26))}`
      ]);
    }
    return [
      ["ELA / OPEN COURT", "Unit 1, Lesson 1", "The Mice Who Lived in a Shoe", "open-court", "Open Lesson"],
      ["MATH / EUREKA MATH²", "Module 1, Lesson 1", "Begin the first core math lesson.", "eureka-math", "Open Lesson"],
      ["WRITING", "Building the Foundation", "Use Building the Foundation for writing instruction.", "afternoon-studios", "Open Writing"],
      ["SCIENCE / SOCIAL STUDIES", "Core Instruction", "Open the aligned afternoon curriculum resources.", "science-intelligence", "Open Curriculum"]
    ];
  }

  function statusCopy(mode, date) {
    if (mode === "launch") {
      const day = launchData?.days?.[weekday(date)] || launchData?.days?.Monday;
      return {
        eyebrow: "CLASSROOM LAUNCH — NO CORE CURRICULUM",
        title: day?.theme || "Classroom Launch",
        detail: day?.focus || "Teach routines, expectations, procedures, and classroom community."
      };
    }
    if (mode === "core") {
      return {
        eyebrow: "CORE INSTRUCTION",
        title: "Curriculum Week 1",
        detail: "Open Court Unit 1, Eureka Math², Building the Foundation Writing, Science, and Social Studies begin."
      };
    }
    return {
      eyebrow: "PRE-LAUNCH PREPARATION",
      title: "Classroom Launch begins July 27",
      detail: "Prepare the classroom, copies, procedures, materials, and first-week resources."
    };
  }

  function renderDashboard() {
    if (route() !== DASHBOARD) return;
    const host = $("#pageHost");
    if (!host) return;
    const date = activeDate();
    const mode = modeFor(date);
    const status = statusCopy(mode, date);
    const cards = dashboardCards(mode, date);
    rendering = true;
    host.innerHTML = `
      <section id="rc2Dashboard" class="rc2-shell" data-build="${BUILD}">
        <section class="rc2-preview panel">
          <div><span>PREVIEW DATE</span><strong>${esc(dateLong(date))}</strong></div>
          <label><span>Choose a date</span><input id="rc2PreviewDate" type="date" value="${esc(date)}"></label>
          <button id="rc2UseToday" class="secondary-button">Use Today</button>
        </section>

        <section class="rc2-hero">
          <div>
            <p>${esc(status.eyebrow)}</p>
            <h1>${esc(status.title)}</h1>
            <span>${esc(status.detail)}</span>
          </div>
          <div class="rc2-actions">
            <button id="rc2StartTeaching" class="primary-button">${mode === "launch" ? "Start Classroom Launch" : "Start Teaching"}</button>
            <button data-rc2-go="calendar" class="secondary-button">Calendar</button>
          </div>
        </section>

        <section class="rc2-state-grid">
          <article class="panel"><span>SCHOOL MODE</span><strong>${mode === "prelaunch" ? "Pre-Launch" : mode === "launch" ? "Classroom Launch" : "Core Instruction"}</strong><p>${esc(dateLong(date))}</p></article>
          <article class="panel"><span>CURRICULUM STATUS</span><strong>${mode === "core" ? "Unlocked" : "Locked until August 3"}</strong><p>${mode === "core" ? "Unit 1 is active." : "Do not begin Open Court Unit 1 yet."}</p></article>
          <article class="panel"><span>START TEACHING</span><strong>${mode === "launch" ? "Launch Day Plan" : mode === "core" ? "Teaching Engine" : "Preparation Mode"}</strong><p>The button opens the correct workflow for this date.</p></article>
        </section>

        <section class="rc2-section">
          <div class="rc2-heading"><div><span>TODAY'S WORKSPACE</span><h2>Open only what you need</h2></div><button data-rc2-go="lesson-plans" class="secondary-button">Weekly Planning</button></div>
          <div class="rc2-card-grid">
            ${cards.map(([eyebrow,title,detail,target,label]) => `
              <article class="rc2-card panel">
                <span>${esc(eyebrow)}</span><strong>${esc(title)}</strong><p>${esc(detail)}</p>
                <button data-rc2-go="${esc(target)}">${esc(label)}</button>
              </article>`).join("")}
          </div>
        </section>

        <section class="rc2-bottom-grid">
          <article class="panel"><span>CURRICULUM GUARD</span><h2>${mode === "core" ? "Core instruction is active" : "Unit 1 is protected"}</h2><p>${mode === "core" ? "The Mice Who Lived in a Shoe begins August 3, 2026." : "July 27–31 is reserved for Classroom Launch. The Mice Who Lived in a Shoe must not appear as today's lesson."}</p></article>
          <article class="panel"><span>RELEASE</span><h2>Version 17.0 RC2</h2><p>Dashboard controller is active and connected to the school calendar.</p></article>
        </section>
      </section>`;
    wireDashboard(mode);
    document.documentElement.dataset.teacherOsBuild = BUILD;
    document.documentElement.dataset.schoolMode = mode;
    setTimeout(() => { rendering = false; }, 0);
  }

  function wireDashboard(mode) {
    $("#rc2PreviewDate")?.addEventListener("change", event => {
      if (event.target.value) localStorage.setItem(PREVIEW_KEY, event.target.value);
      renderDashboard();
    });
    $("#rc2UseToday")?.addEventListener("click", () => {
      localStorage.removeItem(PREVIEW_KEY);
      renderDashboard();
    });
    $("#rc2StartTeaching")?.addEventListener("click", () => {
      if (mode === "launch") navigate(LAUNCH);
      else if (mode === "core") navigate(ENGINE);
      else navigate(LAUNCH);
    });
    $$('[data-rc2-go]').forEach(button => button.addEventListener("click", () => navigate(button.dataset.rc2Go)));
  }

  function renderLaunch() {
    if (route() !== LAUNCH) return;
    const host = $("#pageHost");
    if (!host || !launchData) return;
    let date = activeDate();
    if (date < LAUNCH_START || date > LAUNCH_END) date = LAUNCH_START;
    const dayName = weekday(date);
    const day = launchData.days?.[dayName] || launchData.days?.Monday;
    const dayNumber = Math.max(1, Math.min(5, Number(date.slice(-2)) - 26));
    rendering = true;
    host.innerHTML = `
      <section id="rc2Launch" class="rc2-shell">
        <section class="rc2-hero rc2-launch-hero"><div><p>CLASSROOM LAUNCH • DAY ${dayNumber}</p><h1>${esc(day?.theme || dayName)}</h1><span>${esc(day?.focus || "Teach routines and classroom community.")}</span></div><div class="rc2-actions"><button data-rc2-go="dashboard" class="secondary-button">Back to Dashboard</button><button onclick="window.print()" class="primary-button">Print Day Plan</button></div></section>
        <section class="rc2-preview panel"><div><span>LAUNCH DATE</span><strong>${esc(dateLong(date))}</strong></div><label><span>Select launch day</span><input id="rc2LaunchDate" type="date" min="${LAUNCH_START}" max="${LAUNCH_END}" value="${date}"></label></section>
        <section class="rc2-launch-summary">
          <article class="panel"><span>READ ALOUD</span><strong>${esc(day?.readAloud || "First-week read aloud")}</strong></article>
          <article class="panel"><span>PILLAR</span><strong>${esc(day?.pillar || "Heart")}</strong></article>
          <article class="panel"><span>TOUR / FOCUS</span><strong>${esc(day?.tour || day?.focus || "Classroom routines")}</strong></article>
        </section>
        <section class="rc2-block-list">
          ${(day?.blocks || []).map(block => `<article class="panel rc2-launch-block"><div><span>${esc(block.time || "")}</span><h2>${esc(block.title || "Classroom Launch")}</h2></div><p><strong>Objective:</strong> ${esc(block.objective || "")}</p>${block.procedures?.length ? `<div class="rc2-tags">${block.procedures.map(item => `<span>${esc(item)}</span>`).join("")}</div>` : ""}${block.teacher ? `<p><strong>Teacher:</strong> ${esc(block.teacher)}</p>` : ""}${block.students ? `<p><strong>Students:</strong> ${esc(block.students)}</p>` : ""}</article>`).join("")}
        </section>
      </section>`;
    $("#rc2LaunchDate")?.addEventListener("change", event => {
      localStorage.setItem(PREVIEW_KEY, event.target.value);
      renderLaunch();
    });
    $$('[data-rc2-go]').forEach(button => button.addEventListener("click", () => navigate(button.dataset.rc2Go)));
    setTimeout(() => { rendering = false; }, 0);
  }

  function enforce() {
    removeLegacyNavigation();
    ensureLaunchNavigation();
    if (route() === DASHBOARD) {
      if (!$("#rc2Dashboard")) renderDashboard();
    } else if (route() === LAUNCH) {
      if (!$("#rc2Launch")) renderLaunch();
    }
  }

  function scheduleEnforce() {
    if (rendering) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(enforce, 25);
  }

  async function boot() {
    try {
      const response = await fetch(LAUNCH_DATA_URL, { cache:"no-store" });
      if (response.ok) launchData = await response.json();
    } catch (error) {
      console.error("RC2 could not load Classroom Launch data.", error);
    }
    enforce();
    new MutationObserver(scheduleEnforce).observe(document.body, { childList:true, subtree:true });
    window.addEventListener("hashchange", () => setTimeout(enforce, 10));
  }

  window.THH_RC2 = { renderDashboard, renderLaunch, activeDate, modeFor, build:BUILD };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
