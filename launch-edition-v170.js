(() => {
  "use strict";

  const DASHBOARD = "dashboard";
  const LAUNCH_ROUTE = "classroom-launch";
  const LAUNCH_DATA_URL = "classroom-launch-v168.json";
  const LAUNCH_START = "2026-07-27";
  const LAUNCH_END = "2026-07-31";
  const CORE_START = "2026-08-03";
  const PREFS_STORE = "thh-v170:launch-edition";
  const LAUNCH_PROGRESS_STORE = "thh-v168:classroom-launch-progress";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const GENERATED_STORE = "thh-v167:generated-lessons";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";

  let launchData = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function route() {
    return location.hash.replace("#", "") || DASHBOARD;
  }

  function localDate(date = new Date()) {
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjusted.toISOString().slice(0, 10);
  }

  function prefs() {
    return read(PREFS_STORE, { previewDate: "", selectedLaunchDay: 1 });
  }

  function activeDate() {
    return prefs().previewDate || localDate();
  }

  function parseDate(value) {
    return new Date(value + "T12:00:00");
  }

  function longDate(value) {
    return parseDate(value).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
  }

  function weekday(value) {
    return parseDate(value).toLocaleDateString("en-US", { weekday: "long" });
  }

  function modeFor(date) {
    if (date < LAUNCH_START) return "prelaunch";
    if (date >= LAUNCH_START && date <= LAUNCH_END) return "launch";
    if (date < CORE_START) return "transition";
    return "core";
  }

  function launchDayFor(date) {
    if (!launchData?.days?.length) return null;
    return launchData.days.find(day => day.date === date)
      || launchData.days.find(day => day.day === Number(prefs().selectedLaunchDay || 1))
      || launchData.days[0];
  }

  function dayPlan(date) {
    const week = read(WEEK_STORE, { days: {} });
    return week.days?.[weekday(date)] || {};
  }

  function generatedLesson(date) {
    return read(GENERATED_STORE, {})[date] || null;
  }

  function currentScheduleBlock() {
    const schedule = [
      ["7:45","8:10","Breakfast"],["8:10","8:20","Morning Work"],
      ["8:20","9:15","MOWR"],["9:15","9:25","Heggerty"],
      ["9:25","9:45","Phonics"],["9:45","9:55","Vocabulary"],
      ["9:55","10:45","Reading"],["10:45","11:10","Lunch & Recess"],
      ["11:10","11:40","Writing"],["11:40","12:40","Math"],
      ["12:40","1:15","Workout"],["1:15","1:20","Recess"],
      ["1:20","1:40","Math 2"],["1:40","2:15","Science"],
      ["2:15","2:55","Social Studies"],["2:55","3:00","Pack-up"],
      ["3:00","3:30","Dismissal"]
    ];
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const toMinutes = value => {
      let [hour, minute] = value.split(":").map(Number);
      if (hour >= 1 && hour <= 3) hour += 12;
      return hour * 60 + minute;
    };
    const mapped = schedule.map(([start,end,title]) => ({start,end,title,startM:toMinutes(start),endM:toMinutes(end)}));
    const active = mapped.find(item => minutes >= item.startM && minutes < item.endM);
    const next = active ? mapped[mapped.indexOf(active)+1] : mapped.find(item => minutes < item.startM);
    return { active, next };
  }

  function attentionSummary() {
    const attachments = read(ATTACHMENT_STORE, []);
    const prints = read(PRINT_STORE, []);
    return {
      attachments: Array.isArray(attachments) ? attachments.filter(item => item.status === "Missing Link" || (!(item.url || item.fileName) && item.print)).length : 0,
      prints: Array.isArray(prints) ? prints.filter(item => !item.complete).length : 0
    };
  }

  function injectNavigation() {
    const install = () => {
      const existing = $('[data-route="classroom-launch"]');
      if (existing) {
        existing.onclick = () => location.hash = LAUNCH_ROUTE;
        return;
      }
      const groups = $$(".v110-nav-group");
      const planning = groups.find(group =>
        $(".v110-nav-heading span", group)?.textContent?.trim().toLowerCase() === "planning"
      );
      const body = planning ? $(".v110-nav-body", planning) : $("#mainNav");
      if (!body) return setTimeout(install, 120);
      const button = document.createElement("button");
      button.className = "v110-route";
      button.dataset.route = LAUNCH_ROUTE;
      button.innerHTML = "<span>♡</span><strong>Classroom Launch</strong>";
      button.onclick = () => location.hash = LAUNCH_ROUTE;
      body.prepend(button);
    };
    install();
  }

  function lessonCard(label, title, routeName, detail = "") {
    return `<article class="v170-lesson-card">
      <span>${esc(label)}</span>
      <strong>${esc(title)}</strong>
      ${detail ? `<p>${esc(detail)}</p>` : ""}
      <button data-go="${esc(routeName)}">Open</button>
    </article>`;
  }

  function renderDashboard() {
    if (route() !== DASHBOARD) return;
    const host = $("#pageHost");
    if (!host) return;

    const date = activeDate();
    const mode = modeFor(date);
    const block = currentScheduleBlock();
    const attention = attentionSummary();
    const totalAttention = attention.attachments + attention.prints;

    let banner = {};
    let cards = "";
    let startRoute = "teaching-engine";
    let nextLabel = block.active ? `Now: ${block.active.title} until ${block.active.end}` : block.next ? `Next: ${block.next.title} at ${block.next.start}` : "The instructional day is complete.";

    if (mode === "prelaunch") {
      banner = {
        eyebrow: "PRE-LAUNCH PREPARATION",
        title: "Your Classroom Launch is being prepared",
        subtitle: `Classroom Launch begins Monday, July 27. Core curriculum begins Monday, August 3.`
      };
      startRoute = LAUNCH_ROUTE;
      cards = [
        lessonCard("FIRST WEEK", "Preview Classroom Launch", LAUNCH_ROUTE, "Day 1–5 plans, procedures, resources, and preparation"),
        lessonCard("CURRICULUM", "Review Curriculum Automation", "curriculum-automation", "Confirm launch week and the August 3 core start"),
        lessonCard("PRODUCTION", `${attention.prints} print items waiting`, "print-center", "Prepare copies for the first week"),
        lessonCard("RESOURCES", `${attention.attachments} attachments need attention`, "attachments", "Connect missing files and links")
      ].join("");
    } else if (mode === "launch") {
      const launchDay = launchDayFor(date);
      banner = {
        eyebrow: `CLASSROOM LAUNCH • DAY ${launchDay?.day || ""}`,
        title: launchDay?.theme || "Classroom Launch",
        subtitle: launchDay?.focus || "Teach routines, expectations, relationships, and classroom systems."
      };
      startRoute = LAUNCH_ROUTE;
      nextLabel = `Launch Day ${launchDay?.day}: ${launchDay?.blocks?.[0]?.title || "Begin the day"}`;
      cards = (launchDay?.blocks || []).slice(0,4).map(item =>
        lessonCard(item.subject, item.title, LAUNCH_ROUTE, item.duration)
      ).join("");
    } else {
      const plan = dayPlan(date);
      const generated = generatedLesson(date);
      banner = {
        eyebrow: "CORE INSTRUCTION",
        title: "Good morning, Mrs. Parrish",
        subtitle: nextLabel
      };
      cards = [
        lessonCard("ELA / OPEN COURT", plan.reading || [generated?.openCourt, generated?.readingTitle].filter(Boolean).join(" — ") || "Select today's Open Court lesson", "open-court"),
        lessonCard("WRITING", plan.writing || generated?.writing || "Select today's Building the Foundation lesson", "afternoon-studios"),
        lessonCard("MATH / EUREKA MATH²", plan.math || generated?.math || "Select today's Eureka Math² lesson", "eureka-math"),
        lessonCard("SCIENCE / SOCIAL STUDIES", plan.science || generated?.science || plan.socialStudies || generated?.socialStudies || "Select today's content lesson", "science-intelligence")
      ].join("");
    }

    host.innerHTML = `<section id="v170LaunchDashboard" class="v170-dashboard ${mode}">
      <section class="v170-hero">
        <div>
          <p>${esc(banner.eyebrow)}</p>
          <h1>${esc(banner.title)}</h1>
          <span>${esc(banner.subtitle)}</span>
        </div>
        <div class="v170-hero-actions">
          <button id="v170Start" data-go="${startRoute}" class="primary-button">${mode === "core" ? "Start Teaching" : "Open Classroom Launch"}</button>
          <button data-go="calendar" class="secondary-button">Calendar</button>
        </div>
      </section>

      <section class="v170-date-control panel">
        <div>
          <span>ACTIVE DATE</span>
          <strong>${esc(longDate(date))}</strong>
          <small>${prefs().previewDate ? "Preview mode" : "Using today's date"}</small>
        </div>
        <label>
          <span>PREVIEW ANOTHER DATE</span>
          <input id="v170PreviewDate" type="date" value="${esc(date)}">
        </label>
        <button id="v170UseToday" class="secondary-button">Use Today</button>
      </section>

      <section class="v170-status-grid">
        <article class="panel"><span>CURRENT MODE</span><strong>${mode === "prelaunch" ? "Preparation" : mode === "launch" ? "Classroom Launch" : "Core Instruction"}</strong><p>${mode === "launch" ? "No core curriculum this week." : mode === "prelaunch" ? "Prepare resources and routines." : "Curriculum automation is active."}</p></article>
        <article class="panel"><span>CURRENT / NEXT BLOCK</span><strong>${esc(block.active?.title || block.next?.title || "Day Complete")}</strong><p>${esc(nextLabel)}</p></article>
        <article class="panel ${totalAttention ? "attention" : "ready"}"><span>READINESS</span><strong>${totalAttention ? `${totalAttention} items need attention` : "Ready"}</strong><p>${attention.prints} printing • ${attention.attachments} attachments</p></article>
      </section>

      <section class="v170-lessons-section">
        <div class="v170-heading"><div><span>${mode === "launch" ? "TODAY'S LAUNCH PLAN" : mode === "prelaunch" ? "GET READY FOR LAUNCH" : "TODAY'S LESSONS"}</span><h2>Open only what you need</h2></div><button data-go="teacher-intelligence" class="secondary-button">Teacher Intelligence</button></div>
        <div class="v170-lessons">${cards}</div>
      </section>

      <section class="v170-action-grid">
        <button data-go="${LAUNCH_ROUTE}"><span>♡</span><strong>Classroom Launch</strong><small>Day 1–5 experience</small></button>
        <button data-go="curriculum-automation"><span>⚙</span><strong>Curriculum Automation</strong><small>Assign lessons by date</small></button>
        <button data-go="teaching-engine"><span>▶</span><strong>Teaching Engine</strong><small>Teach the active day</small></button>
        <button data-go="teacher-intelligence"><span>🧠</span><strong>Teacher Intelligence</strong><small>Review readiness</small></button>
      </section>
    </section>`;

    wireDashboard();
  }

  function renderResource(filename) {
    return `<a href="${encodeURI(filename)}" target="_blank" rel="noopener"><strong>${esc(filename.replace(/\.(pdf|pptx)$/i, ""))}</strong><span>Open ↗</span></a>`;
  }

  function launchProgress() {
    return read(LAUNCH_PROGRESS_STORE, { completed:{}, procedures:{}, prep:{} });
  }

  function saveLaunchProgress(state) {
    write(LAUNCH_PROGRESS_STORE, state);
  }

  function renderLaunch() {
    if (route() !== LAUNCH_ROUTE || !launchData) return;
    const host = $("#pageHost");
    if (!host) return;

    const preference = prefs();
    const launchDate = activeDate() >= LAUNCH_START && activeDate() <= LAUNCH_END ? activeDate() : "";
    const byDate = launchDate ? launchData.days.find(item => item.date === launchDate) : null;
    const selected = byDate || launchData.days.find(item => item.day === Number(preference.selectedLaunchDay || 1)) || launchData.days[0];
    const state = launchProgress();
    const lessonsDone = selected.blocks.filter(block => state.completed[block.id]).length;
    const proceduresDone = selected.procedures.filter((_, index) => state.procedures[`${selected.day}-${index}`]).length;
    const prepDone = selected.prep.filter((_, index) => state.prep[`${selected.day}-${index}`]).length;
    const done = lessonsDone + proceduresDone + prepDone;
    const total = selected.blocks.length + selected.procedures.length + selected.prep.length;
    const percent = total ? Math.round(done / total * 100) : 0;

    host.innerHTML = `<section id="v170ClassroomLaunch" class="v170-launch">
      <section class="v170-launch-hero">
        <div><p>VERSION 17.0 • CLASSROOM LAUNCH</p><h1>${esc(selected.theme)}</h1><span>${esc(selected.focus)}</span></div>
        <div class="v170-progress"><strong>${percent}%</strong><span>complete</span><div><i style="width:${percent}%"></i></div></div>
      </section>

      <nav class="v170-day-tabs">${launchData.days.map(day => `<button data-launch-day="${day.day}" class="${day.day === selected.day ? "active" : ""}"><span>DAY ${day.day}</span><strong>${esc(longDate(day.date).replace(", 2026", ""))}</strong><small>${esc(day.theme)}</small></button>`).join("")}</nav>

      <section class="v170-launch-layout">
        <main><div class="v170-heading"><div><span>TEACH IN THIS ORDER</span><h2>Day ${selected.day} plan</h2></div><button id="v170CompleteLaunchDay" class="secondary-button">Mark Day Complete</button></div>
          <div class="v170-launch-blocks">${selected.blocks.map(block => `<article class="panel ${state.completed[block.id] ? "complete" : ""}"><header><label><input type="checkbox" data-launch-complete="${esc(block.id)}" ${state.completed[block.id] ? "checked" : ""}><span></span></label><div><p>${esc(block.subject)} • ${esc(block.duration)}</p><h3>${esc(block.title)}</h3></div></header><section><b>Objective</b><p>${esc(block.objective)}</p></section><section><b>Teacher Flow</b><ol>${block.steps.map(step => `<li>${esc(step)}</li>`).join("")}</ol></section><section class="v170-resources"><b>Resources</b>${block.resources.map(renderResource).join("")}</section></article>`).join("")}</div>
        </main>
        <aside>
          <section class="panel"><span>PROCEDURES</span><h2>Practice and review</h2><div class="v170-checks">${selected.procedures.map((item,index) => { const key=`${selected.day}-${index}`; return `<label class="${state.procedures[key] ? "complete" : ""}"><input type="checkbox" data-launch-list="procedures" data-launch-key="${key}" ${state.procedures[key] ? "checked" : ""}><span></span><strong>${esc(item)}</strong></label>`; }).join("")}</div></section>
          <section class="panel"><span>PREPARATION</span><h2>Before students arrive</h2><div class="v170-checks">${selected.prep.map((item,index) => { const key=`${selected.day}-${index}`; return `<label class="${state.prep[key] ? "complete" : ""}"><input type="checkbox" data-launch-list="prep" data-launch-key="${key}" ${state.prep[key] ? "checked" : ""}><span></span><strong>${esc(item)}</strong></label>`; }).join("")}</div></section>
          <section class="panel v170-lock"><strong>Core curriculum lock</strong><span>Open Court Unit 1 begins Monday, August 3, 2026.</span></section>
        </aside>
      </section>
    </section>`;

    wireLaunch(selected);
  }

  function wireDashboard() {
    $$('[data-go]').forEach(button => button.addEventListener("click", () => location.hash = button.dataset.go));
    $("#v170PreviewDate")?.addEventListener("change", event => {
      write(PREFS_STORE, { ...prefs(), previewDate: event.target.value });
      renderDashboard();
    });
    $("#v170UseToday")?.addEventListener("click", () => {
      write(PREFS_STORE, { ...prefs(), previewDate: "" });
      renderDashboard();
    });
  }

  function wireLaunch(selected) {
    $$('[data-launch-day]').forEach(button => button.addEventListener("click", () => {
      write(PREFS_STORE, { ...prefs(), selectedLaunchDay: Number(button.dataset.launchDay) });
      renderLaunch();
    }));
    $$('[data-launch-complete]').forEach(input => input.addEventListener("change", () => {
      const state = launchProgress();
      state.completed[input.dataset.launchComplete] = input.checked;
      saveLaunchProgress(state);
      renderLaunch();
    }));
    $$('[data-launch-list]').forEach(input => input.addEventListener("change", () => {
      const state = launchProgress();
      state[input.dataset.launchList][input.dataset.launchKey] = input.checked;
      saveLaunchProgress(state);
      renderLaunch();
    }));
    $("#v170CompleteLaunchDay")?.addEventListener("click", () => {
      const state = launchProgress();
      selected.blocks.forEach(block => state.completed[block.id] = true);
      selected.procedures.forEach((_,index) => state.procedures[`${selected.day}-${index}`] = true);
      selected.prep.forEach((_,index) => state.prep[`${selected.day}-${index}`] = true);
      saveLaunchProgress(state);
      renderLaunch();
    });
  }

  function takeControl() {
    injectNavigation();
    if (route() === DASHBOARD) {
      setTimeout(renderDashboard, 20);
      setTimeout(renderDashboard, 220);
    }
    if (route() === LAUNCH_ROUTE) {
      setTimeout(renderLaunch, 20);
      setTimeout(renderLaunch, 220);
    }
  }

  async function boot() {
    try {
      const response = await fetch(LAUNCH_DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`Launch data failed: ${response.status}`);
      launchData = await response.json();
    } catch (error) {
      console.error(error);
      launchData = { days: [] };
    }
    takeControl();
  }

  window.THH_LAUNCH_EDITION_V170 = { renderDashboard, renderLaunch, modeFor };
  window.addEventListener("hashchange", takeControl);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();