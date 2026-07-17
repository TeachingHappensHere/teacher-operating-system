(() => {
  "use strict";

  const ROUTE = "dashboard";
  const STATE_KEY = "thh-v170-rc3:dashboard";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const STUDENT_STORE = "thh-v140:student-records";
  const GROUP_STORE = "thh-v141:group-plans";

  const LAUNCH_START = "2026-07-27";
  const LAUNCH_END = "2026-07-31";
  const CORE_START = "2026-08-03";

  const SCHEDULE = [
    ["7:45", "8:10", "Breakfast"],
    ["8:10", "8:20", "Morning Work"],
    ["8:20", "8:30", "Morning Meeting"],
    ["8:30", "8:40", "Heggerty"],
    ["8:45", "9:30", "MOWR"],
    ["9:30", "9:50", "Open Court Phonics"],
    ["9:50", "10:00", "Vocabulary"],
    ["10:00", "10:50", "Reading & Responding"],
    ["10:50", "11:35", "Lunch & Recess"],
    ["11:35", "12:05", "Workout"],
    ["12:05", "1:05", "Eureka Math²"],
    ["1:05", "1:35", "Building the Foundation Writing"],
    ["1:35", "2:00", "Social Studies"],
    ["2:00", "2:15", "Recess"],
    ["2:15", "2:35", "Science"],
    ["2:40", "3:00", "Pack-up"],
    ["3:00", "3:30", "Dismissal"]
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  let rendering = false;
  let observer;
  let state = read(STATE_KEY, { previewDate: "", fullSchedule: false });

  function read(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function save() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function currentRoute() {
    return location.hash.replace("#", "") || ROUTE;
  }

  function localISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function activeISO() {
    return state.previewDate || localISO();
  }

  function dateFromISO(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  function modeFor(iso) {
    if (iso >= LAUNCH_START && iso <= LAUNCH_END) return "launch";
    if (iso >= CORE_START) return "core";
    return "prelaunch";
  }

  function launchDay(iso) {
    return Math.max(1, Math.min(5, Math.round((dateFromISO(iso) - dateFromISO(LAUNCH_START)) / 86400000) + 1));
  }

  function dateLabel(iso) {
    return dateFromISO(iso).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
  }

  function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  }

  function weeklyDay(iso) {
    const plan = read(WEEK_STORE, { days: {} });
    const name = dateFromISO(iso).toLocaleDateString("en-US", { weekday: "long" });
    return plan.days?.[name] || {};
  }

  function launchContent(day) {
    const days = {
      1: {
        title: "Enter, Belong, and Learn the Room",
        focus: "Welcome students, build safety and belonging, and explicitly teach how to enter, unpack, listen, and move through the classroom.",
        lessons: [
          ["Morning Community", "Teacher introduction, student introductions, classroom tour, and class promise", "classroom-launch"],
          ["Open Court Getting Started", "Back to School, workshop expectations, concepts about print, and phonemic awareness", "classroom-launch"],
          ["Getting to Know You", "Complete the first-week community activity and practice partner talk", "classroom-launch"],
          ["Math Launch", "Introduce math materials, productive struggle, and partner routines", "classroom-launch"]
        ]
      },
      2: {
        title: "Practice Transitions",
        focus: "Reteach movement, carpet expectations, restroom procedures, materials, and attention signals.",
        lessons: [
          ["Morning Community", "Review expectations and practice entering the room", "classroom-launch"],
          ["Open Court Getting Started", "Phonemic awareness, phonics, high-frequency words, and dictation", "classroom-launch"],
          ["Class Procedures", "Model, practice, and reflect on classroom procedures", "classroom-launch"],
          ["Math Routines", "Practice tools, partner talk, and showing work", "classroom-launch"]
        ]
      },
      3: {
        title: "Build Independence",
        focus: "Students practice routines with less teacher prompting and begin independent work habits.",
        lessons: [
          ["Morning Community", "Student-led review of classroom agreements", "classroom-launch"],
          ["Open Court Getting Started", "Continue foundational routines and Little Red Riding Hood", "classroom-launch"],
          ["If I Built a School", "Read, discuss, and begin the school-design response", "classroom-launch"],
          ["Build a School Challenge", "Plan and create collaboratively using taught material routines", "classroom-launch"]
        ]
      },
      4: {
        title: "Academic Routines",
        focus: "Practice the structures students will use during literacy, math, writing, science, and social studies.",
        lessons: [
          ["Literacy Practice", "Rehearse MOWR rotations, partner reading, and response routines", "classroom-launch"],
          ["Writing Launch", "Introduce Building the Foundation notebooks, conferencing, and student pages", "classroom-launch"],
          ["Math Practice", "Complete the first-week math lesson and practice explaining thinking", "classroom-launch"],
          ["Assessment Routines", "Introduce calm, honest assessment expectations", "classroom-launch"]
        ]
      },
      5: {
        title: "Review, Celebrate, and Reteach",
        focus: "Celebrate growth, assess routines, and reteach anything students still need before core instruction begins.",
        lessons: [
          ["Community Reflection", "Compliment circle and reflection on being a classroom family", "classroom-launch"],
          ["Back-to-School Assessments", "Complete brief baseline assessments using practiced routines", "classroom-launch"],
          ["Procedure Review", "Students demonstrate routines and solve common classroom scenarios", "classroom-launch"],
          ["Launch Celebration", "Celebrate the first week and preview Monday's core curriculum", "classroom-launch"]
        ]
      }
    };
    return days[day];
  }

  function coreLessons(iso) {
    const day = weeklyDay(iso);
    return [
      ["Morning Literacy", day.morning || "Morning Work, MOWR, Heggerty, phonics, and vocabulary", "teachday"],
      ["Open Court Reading", day.reading || "Unit 1, Lesson 1 — The Mice Who Lived in a Shoe", "open-court"],
      ["Eureka Math²", day.math || "Module 1 — connect today's lesson", "eureka-math"],
      ["Building the Foundation Writing", day.writing || "Use the Building the Foundation lesson sequence", "afternoon-studios"],
      ["Science", day.science || "Arizona Science with Open Court Science Connections", "science-intelligence"],
      ["Social Studies", day.socialStudies || "Connect Arizona social studies to the weekly Open Court text", "afternoon-studios"]
    ];
  }

  function prelaunchLessons() {
    return [
      ["Prepare Classroom Launch", "Review July 27–31 plans and first-week resources", "classroom-launch"],
      ["Teacher Intelligence", "Check plans, printing, attachments, and preparation gaps", "intelligence-engine"],
      ["Curriculum Automation", "Review the August 3 core-instruction week", "workflow-hub"],
      ["Print & Attachments", "Finish first-week copies and linked resources", "attachments"]
    ];
  }

  function render() {
    if (currentRoute() !== ROUTE || rendering) return;
    const host = $("#pageHost");
    if (!host) return;

    rendering = true;
    const iso = activeISO();
    const mode = modeFor(iso);
    const previewing = Boolean(state.previewDate);
    let title;
    let subtitle;
    let lessons;
    let startRoute;

    if (mode === "launch") {
      const content = launchContent(launchDay(iso));
      title = `Classroom Launch — Day ${launchDay(iso)}`;
      subtitle = `${content.title}. ${content.focus}`;
      lessons = content.lessons;
      startRoute = "classroom-launch";
    } else if (mode === "core") {
      title = "Core Instruction";
      subtitle = "Open Court Unit 1 begins with The Mice Who Lived in a Shoe. Building the Foundation is used for writing.";
      lessons = coreLessons(iso);
      startRoute = "teaching-engine";
    } else {
      title = "Pre-Launch Preparation";
      subtitle = "Prepare the classroom and first-week materials. Core curriculum does not begin until August 3.";
      lessons = prelaunchLessons();
      startRoute = "classroom-launch";
    }

    const students = read(STUDENT_STORE, []);
    const groups = read(GROUP_STORE, {});

    host.innerHTML = `
      <section id="v170Rc3Dashboard" class="v170rc3-dashboard" data-mode="${mode}">
        <section class="v170rc3-hero">
          <div>
            <p>${esc(dateLabel(iso))}${previewing ? " • Previewing" : ""}</p>
            <h1>${esc(greeting())}, Mrs. Parrish</h1>
            <span>${esc(title)} — ${esc(subtitle)}</span>
          </div>
          <div class="v170rc3-actions">
            <button id="v170Rc3Start" class="primary-button">${mode === "launch" ? "Open Classroom Launch" : mode === "core" ? "Start Teaching" : "Prepare Launch Week"}</button>
            <button data-go="calendar" class="secondary-button">Calendar</button>
          </div>
        </section>

        <section class="panel v170rc3-datebar">
          <div>
            <span>PREVIEW DATE</span>
            <strong>Test the school-year experience</strong>
          </div>
          <label>
            <input id="v170Rc3PreviewDate" type="date" value="${esc(iso)}">
          </label>
          <button id="v170Rc3UseToday" class="secondary-button">Use Today</button>
        </section>

        <section class="v170rc3-status-grid">
          <article class="panel"><span>ACTIVE MODE</span><strong>${esc(title)}</strong><small>${mode === "prelaunch" ? "Before July 27" : mode === "launch" ? "July 27–31" : "August 3 and later"}</small></article>
          <article class="panel"><span>CURRICULUM RULE</span><strong>${mode === "core" ? "Core instruction is active" : "Core instruction is protected"}</strong><small>${mode === "core" ? "Unit 1 may appear" : "Unit 1 must not appear yet"}</small></article>
          <article class="panel"><span>WRITING</span><strong>Building the Foundation</strong><small>Open Court Writing is not used</small></article>
        </section>

        <section class="panel v170rc3-lessons-section">
          <div class="v170rc3-heading">
            <div><span>TODAY'S WORKFLOW</span><h2>Open only what you need</h2></div>
            <button data-go="lesson-plans" class="secondary-button">Weekly Planning</button>
          </div>
          <div class="v170rc3-lessons">
            ${lessons.map(([label, text, route]) => `
              <article>
                <span>${esc(label)}</span>
                <strong>${esc(text)}</strong>
                <button data-go="${esc(route)}">Open</button>
              </article>`).join("")}
          </div>
        </section>

        <section class="panel v170rc3-schedule">
          <div class="v170rc3-heading">
            <div><span>DAILY SCHEDULE</span><h2>${mode === "launch" ? "Practice routines inside the real school day" : "Instructional timeline"}</h2></div>
            <button id="v170Rc3ScheduleToggle" class="secondary-button">${state.fullSchedule ? "Show Less" : "Show Full Day"}</button>
          </div>
          <div class="v170rc3-schedule-grid ${state.fullSchedule ? "expanded" : ""}">
            ${(state.fullSchedule ? SCHEDULE : SCHEDULE.slice(0, 6)).map(([start, end, subject]) => `
              <article><span>${start}–${end}</span><strong>${esc(subject)}</strong></article>
            `).join("")}
          </div>
        </section>

        <section class="v170rc3-bottom-grid">
          <article class="panel">
            <span>SMALL GROUP ORDER</span>
            <h2>Red • Yellow • Green • Blue</h2>
            <p>${students.length} student profile${students.length === 1 ? "" : "s"} connected. ${Object.keys(groups).length} group-plan record${Object.keys(groups).length === 1 ? "" : "s"} available.</p>
            <button data-go="small-groups" class="secondary-button">Open Small Groups</button>
          </article>
          <article class="panel">
            <span>QUICK TOOLS</span>
            <div class="v170rc3-tool-grid">
              <button data-go="intelligence-engine">Teacher Intelligence</button>
              <button data-go="workflow-hub">Curriculum Automation</button>
              <button data-go="attachments">Attachments</button>
              <button data-go="print-center">Print Center</button>
              <button data-go="communication">Communication</button>
              <button data-go="health">System Health</button>
            </div>
          </article>
        </section>
      </section>`;

    $("#v170Rc3Start")?.addEventListener("click", () => { location.hash = startRoute; });
    $("#v170Rc3PreviewDate")?.addEventListener("change", event => {
      state.previewDate = event.target.value;
      save();
      render();
    });
    $("#v170Rc3UseToday")?.addEventListener("click", () => {
      state.previewDate = "";
      save();
      render();
    });
    $("#v170Rc3ScheduleToggle")?.addEventListener("click", () => {
      state.fullSchedule = !state.fullSchedule;
      save();
      render();
    });
    $$('[data-go]', host).forEach(button => {
      button.addEventListener("click", () => { location.hash = button.dataset.go; });
    });

    rendering = false;
  }

  function enforceSingleRenderer() {
    if (currentRoute() !== ROUTE) return;
    const host = $("#pageHost");
    if (!host) return;
    const root = $("#v170Rc3Dashboard", host);
    if (!root || host.children.length !== 1 || host.firstElementChild !== root) {
      render();
    }
  }

  function start() {
    const host = $("#pageHost");
    if (!host) return setTimeout(start, 50);
    observer?.disconnect();
    observer = new MutationObserver(() => {
      if (!rendering) requestAnimationFrame(enforceSingleRenderer);
    });
    observer.observe(host, { childList: true });
    render();
  }

  window.THH_RENDER_DASHBOARD_RC3 = render;
  window.addEventListener("hashchange", () => {
    if (currentRoute() === ROUTE) setTimeout(render, 0);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
