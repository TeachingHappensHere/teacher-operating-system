(() => {
  "use strict";

  const ROUTE = "dashboard";
  const VERSION = "24.0.0";
  const STATE_KEY = "tos-v240:dashboard";
  const LESSON_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const MICAH_SUPPORTS = ["Preferential seating", "Chunk directions and assignments", "Read directions aloud", "Movement breaks", "Graphic organizers", "Manipulatives", "Reduced writing", "Extended time", "Frequent teacher check-ins"];

  const SCHEDULE = [
    ["07:45", "08:10", "Breakfast", "teachday"],
    ["08:10", "08:20", "Morning Work", "teachday"],
    ["08:20", "08:30", "Morning Meeting", "teachday"],
    ["08:30", "08:40", "Heggerty", "teachday"],
    ["08:45", "09:30", "MOWR", "small-groups"],
    ["09:30", "09:50", "Open Court Phonics", "open-court"],
    ["09:50", "10:00", "Vocabulary", "open-court"],
    ["10:00", "10:50", "Reading & Responding", "open-court"],
    ["10:50", "11:35", "Lunch & Recess", "teachday"],
    ["11:35", "12:05", "Workout", "teachday"],
    ["12:05", "13:05", "Eureka Math²", "eureka-math"],
    ["13:05", "13:35", "Building the Foundation Writing", "afternoon-studios"],
    ["13:35", "14:00", "Social Studies", "afternoon-studios"],
    ["14:00", "14:15", "Recess", "teachday"],
    ["14:15", "14:35", "Science", "science-intelligence"],
    ["14:40", "15:00", "Pack-up", "teachday"],
    ["15:00", "15:30", "Dismissal", "teachday"]
  ];

  const QUICK_LINKS = [
    ["Open Court", "open-court", "📖"],
    ["UFLI Toolbox", "https://ufli.education.ufl.edu/foundations/toolbox/", "🔤"],
    ["Heggerty", "teachday", "👂"],
    ["Eureka Math²", "eureka-math", "➗"],
    ["ClassDojo", "https://www.classdojo.com/", "💬"],
    ["Planbook Export", "lesson-plans", "🗓️"],
    ["Amplify / DIBELS", "small-groups", "📊"],
    ["Google Classroom", "https://classroom.google.com/", "💻"]
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  let timer = null;
  let observer = null;
  let rendering = false;
  let state = readState();

  function readState() {
    try {
      return { previewDate: "", checks: {}, showFullSchedule: false, ...(JSON.parse(localStorage.getItem(STATE_KEY) || "{}")) };
    } catch {
      return { previewDate: "", checks: {}, showFullSchedule: false };
    }
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function currentRoute() {
    return location.hash.replace("#", "") || ROUTE;
  }

  function localISO(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function activeDate() {
    if (!state.previewDate) return new Date();
    const [year, month, day] = state.previewDate.split("-").map(Number);
    const now = new Date();
    return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
  }

  function minutes(time) {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }

  function nowMinutes(date = activeDate()) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function scheduleStatus(date = activeDate()) {
    const value = nowMinutes(date);
    let currentIndex = SCHEDULE.findIndex(([start, end]) => value >= minutes(start) && value < minutes(end));
    if (currentIndex < 0) {
      currentIndex = value < minutes(SCHEDULE[0][0]) ? 0 : SCHEDULE.length - 1;
    }
    const current = SCHEDULE[currentIndex];
    const next = SCHEDULE[currentIndex + 1] || null;
    const start = minutes(current[0]);
    const end = minutes(current[1]);
    const inBlock = value >= start && value < end;
    const remaining = inBlock ? Math.max(0, end - value) : 0;
    const progress = inBlock ? Math.min(100, Math.max(0, ((value - start) / (end - start)) * 100)) : (value >= end ? 100 : 0);
    return { currentIndex, current, next, remaining, progress, inBlock };
  }

  function formatClock(time) {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date(2026, 0, 1, hour, minute);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function dateLabel(date = activeDate()) {
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  }

  function mondayISO(date = activeDate()) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    const day = copy.getDay();
    copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
    return localISO(copy);
  }

  function todayLessons(date = activeDate()) {
    const store = window.TOS_LESSON_STORE;
    if (!store?.getModel) return [];
    const model = store.getModel();
    const day = LESSON_DAYS[date.getDay()];
    const week = mondayISO(date);
    return Object.entries(model.lessons || {})
      .filter(([id]) => id.startsWith(`${week}|`) && id.endsWith(`|${day}`))
      .map(([id, lesson]) => ({ id, subject: id.split("|")[1], ...lesson }))
      .filter(lesson => lesson.lessonTitle || lesson.objective || lesson.instruction);
  }

  function lessonForCurrentBlock(block, lessons) {
    const name = block[2].toLowerCase();
    const aliases = name.includes("reading") || name.includes("phonics") || name.includes("vocabulary") ? ["reading", "ela", "open-court"]
      : name.includes("math") ? ["math", "eureka"]
      : name.includes("writing") ? ["writing", "gum"]
      : name.includes("science") ? ["science"]
      : name.includes("social") ? ["social", "studies"]
      : name.includes("mowr") ? ["mowr", "small"] : [];
    return lessons.find(lesson => aliases.some(alias => String(lesson.subject).toLowerCase().includes(alias))) || null;
  }

  function materialsFrom(lesson) {
    if (!lesson?.materials) return "Add materials in Lesson Builder.";
    return String(lesson.materials).split(/\n|,/).map(item => item.trim()).filter(Boolean).slice(0, 4).join(" • ");
  }

  function standardsFrom(lessons) {
    const standards = lessons.map(lesson => lesson.standardId).filter(Boolean);
    return [...new Set(standards)].slice(0, 4);
  }

  function priorityItems(date, mode) {
    const friday = date.getDay() === 5;
    return [
      ["attendance", "Take attendance", "Open gradebook/attendance before instruction begins."],
      ["micah", "Review Micah’s supports", MICAH_SUPPORTS.slice(0, 4).join(" • ")],
      ["materials", "Check today’s materials", "Open the current lesson and confirm copies, books, and manipulatives."],
      ["homework", "Review homework and family messages", "Check ClassDojo and Google Classroom."],
      ...(friday ? [["friday", "Friday assessment routine", "Keep assessments brief and complete the compliment circle."]] : []),
      ...(mode === "preview" ? [["preview", "Preview mode is active", "Return to Today before teaching live."]] : [])
    ];
  }

  function modeFor(date) {
    const iso = localISO(date);
    if (state.previewDate) return "preview";
    if (iso >= "2026-07-27" && iso <= "2026-07-31") return "launch";
    if (iso >= "2026-08-03") return "core";
    return "prelaunch";
  }

  function navigate(target) {
    if (/^https?:\/\//.test(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
    } else {
      location.hash = target;
    }
  }

  function render() {
    if (currentRoute() !== ROUTE || rendering) return;
    const host = $("#pageHost");
    if (!host) return;
    rendering = true;

    const date = activeDate();
    const status = scheduleStatus(date);
    const lessons = todayLessons(date);
    const activeLesson = lessonForCurrentBlock(status.current, lessons);
    const standards = standardsFrom(lessons);
    const mode = modeFor(date);
    const priorities = priorityItems(date, mode);
    const visibleSchedule = state.showFullSchedule ? SCHEDULE : SCHEDULE.slice(Math.max(0, status.currentIndex - 1), status.currentIndex + 4);

    host.innerHTML = `
      <section id="tosDashboardV240" class="tos-dashboard-v240" data-mode="${esc(mode)}">
        <header class="v240-hero">
          <div>
            <p class="v240-eyebrow">${esc(dateLabel(date))}${state.previewDate ? " • PREVIEW MODE" : ""}</p>
            <h1>${esc(greeting())}, Mrs. Parrish</h1>
            <p>Your teaching day, priorities, lesson details, and essential tools are together in one place.</p>
          </div>
          <div class="v240-hero-actions">
            <button class="primary-button" data-go="teachday">Start Teach My Day</button>
            <button class="secondary-button" data-go="lesson-plans">Open Weekly Plans</button>
          </div>
        </header>

        <section class="v240-now-grid">
          <article class="panel v240-current-card">
            <div class="v240-card-heading"><span>TEACH NOW</span><strong>${esc(status.current[2])}</strong></div>
            <div class="v240-clock-row">
              <div><small>${esc(formatClock(status.current[0]))}–${esc(formatClock(status.current[1]))}</small><b>${status.inBlock ? `${status.remaining} min remaining` : "Not currently in session"}</b></div>
              <button data-go="${esc(status.current[3])}">Open</button>
            </div>
            <div class="v240-progress" aria-label="Current block progress"><i style="width:${status.progress.toFixed(1)}%"></i></div>
            <h2>${esc(activeLesson?.lessonTitle || status.current[2])}</h2>
            <p>${esc(activeLesson?.objective || "Open the lesson workspace to add today’s objective and teaching steps.")}</p>
          </article>

          <article class="panel v240-next-card">
            <span>NEXT LESSON</span>
            <strong>${esc(status.next?.[2] || "School day complete")}</strong>
            <p>${status.next ? `${esc(formatClock(status.next[0]))}–${esc(formatClock(status.next[1]))}` : "Prepare tomorrow’s lesson materials."}</p>
            ${status.next ? `<button data-go="${esc(status.next[3])}" class="secondary-button">Prepare Next</button>` : ""}
          </article>

          <article class="panel v240-materials-card">
            <span>MATERIALS READY</span>
            <strong>${esc(activeLesson ? "From today’s lesson" : "Lesson materials")}</strong>
            <p>${esc(materialsFrom(activeLesson))}</p>
            <button data-go="lesson-plans" class="secondary-button">Review Materials</button>
          </article>
        </section>

        <section class="v240-middle-grid">
          <article class="panel v240-priorities">
            <div class="v240-section-heading"><div><span>TODAY’S PRIORITIES</span><h2>What needs your attention</h2></div><button id="v240ResetChecks" class="text-button">Reset</button></div>
            <div class="v240-checklist">
              ${priorities.map(([id, title, detail]) => `
                <label class="${state.checks[`${localISO(date)}:${id}`] ? "done" : ""}">
                  <input type="checkbox" data-check="${esc(id)}" ${state.checks[`${localISO(date)}:${id}`] ? "checked" : ""}>
                  <span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span>
                </label>`).join("")}
            </div>
          </article>

          <article class="panel v240-supports">
            <div class="v240-section-heading"><div><span>STUDENT SUPPORT</span><h2>Micah G.</h2></div><button data-go="students" class="secondary-button">Student Center</button></div>
            <p>Use the supports that fit the current task. Accommodations should remain visible during instruction and assessment.</p>
            <div class="v240-support-tags">${MICAH_SUPPORTS.map(item => `<span>${esc(item)}</span>`).join("")}</div>
          </article>
        </section>

        <section class="panel v240-standards">
          <div class="v240-section-heading"><div><span>TODAY’S STANDARDS</span><h2>${standards.length ? "Standards pulled from saved lessons" : "No standards saved for today yet"}</h2></div><button data-go="lesson-plans" class="secondary-button">Edit Lessons</button></div>
          <div class="v240-standard-list">${standards.length ? standards.map(item => `<span>${esc(item)}</span>`).join("") : `<p>Add a Standard ID in Lesson Builder and it will appear here automatically.</p>`}</div>
        </section>

        <section class="panel v240-quick-launch">
          <div class="v240-section-heading"><div><span>QUICK LAUNCH</span><h2>Open your most-used teaching tools</h2></div></div>
          <div class="v240-launch-grid">
            ${QUICK_LINKS.map(([label, target, icon]) => `<button data-go="${esc(target)}"><span>${icon}</span><strong>${esc(label)}</strong></button>`).join("")}
          </div>
        </section>

        <section class="panel v240-schedule">
          <div class="v240-section-heading">
            <div><span>DAILY SCHEDULE</span><h2>${state.showFullSchedule ? "Full instructional day" : "Current schedule window"}</h2></div>
            <div class="v240-date-controls"><input id="v240PreviewDate" type="date" value="${esc(state.previewDate || localISO())}"><button id="v240Today" class="secondary-button">Today</button><button id="v240ScheduleToggle" class="secondary-button">${state.showFullSchedule ? "Show Current" : "Show Full Day"}</button></div>
          </div>
          <div class="v240-schedule-list">
            ${visibleSchedule.map(item => {
              const index = SCHEDULE.indexOf(item);
              return `<button class="${index === status.currentIndex ? "active" : ""}" data-go="${esc(item[3])}"><time>${esc(formatClock(item[0]))}–${esc(formatClock(item[1]))}</time><strong>${esc(item[2])}</strong>${index === status.currentIndex ? "<span>NOW</span>" : ""}</button>`;
            }).join("")}
          </div>
        </section>

        <footer class="v240-version">Teacher Dashboard ${VERSION}</footer>
      </section>`;

    $$('[data-go]', host).forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
    $$('[data-check]', host).forEach(input => input.addEventListener("change", () => {
      state.checks[`${localISO(date)}:${input.dataset.check}`] = input.checked;
      saveState();
      input.closest("label")?.classList.toggle("done", input.checked);
    }));
    $("#v240ResetChecks", host)?.addEventListener("click", () => {
      priorities.forEach(([id]) => delete state.checks[`${localISO(date)}:${id}`]);
      saveState();
      render();
    });
    $("#v240PreviewDate", host)?.addEventListener("change", event => {
      state.previewDate = event.target.value === localISO() ? "" : event.target.value;
      saveState();
      render();
    });
    $("#v240Today", host)?.addEventListener("click", () => { state.previewDate = ""; saveState(); render(); });
    $("#v240ScheduleToggle", host)?.addEventListener("click", () => { state.showFullSchedule = !state.showFullSchedule; saveState(); render(); });

    rendering = false;
  }

  function ensureDashboard() {
    if (currentRoute() !== ROUTE || rendering) return;
    const host = $("#pageHost");
    if (host && !$("#tosDashboardV240", host)) render();
  }

  function start() {
    const host = $("#pageHost");
    if (!host) return setTimeout(start, 50);
    observer?.disconnect();
    observer = new MutationObserver(() => requestAnimationFrame(ensureDashboard));
    observer.observe(host, { childList: true });
    clearInterval(timer);
    timer = setInterval(() => { if (currentRoute() === ROUTE) render(); }, 60000);
    render();
  }

  window.TOS_V240_RENDER_DASHBOARD = render;
  window.TOS_DASHBOARD_V240 = { version: VERSION, render };
  window.addEventListener("hashchange", () => { if (currentRoute() === ROUTE) setTimeout(render, 0); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
