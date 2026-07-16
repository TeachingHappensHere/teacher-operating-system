
(() => {
  "use strict";

  const ROUTE = "intelligence-engine";
  const STORE = "thh-v1602:teacher-intelligence";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const LIVE_STORE = "thh-v90:teach-day";
  const GROUP_STORE = "thh-v141:group-plans";

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
  const GROUPS = [
    "Red — Far Below Level",
    "Yellow — Below Level",
    "Green — Benchmark",
    "Blue — Above Level"
  ];

  let state = {
    selectedWeek: "2026-08-03",
    completed: {}
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function load() {
    try {
      state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
    } catch {}
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function currentRoute() {
    return location.hash.replace("#","") || "dashboard";
  }

  function addDays(value, amount) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return date.toISOString().slice(0,10);
  }

  function weeks() {
    const result = [{
      start: "2026-07-27",
      end: "2026-07-31",
      label: "Classroom Launch Week",
      type: "launch",
      curriculumWeek: null
    }];

    let date = "2026-08-03";
    for (let number = 1; number <= 43; number += 1) {
      result.push({
        start: date,
        end: addDays(date, 4),
        label: `Curriculum Week ${number}`,
        type: "curriculum",
        curriculumWeek: number
      });
      date = addDays(date, 7);
    }

    return result;
  }

  function selectedWeek() {
    return weeks().find(week => week.start === state.selectedWeek)
      || weeks().find(week => week.start === "2026-08-03");
  }

  function formatDate(value, short = false) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", short
      ? { month:"short", day:"numeric" }
      : { month:"short", day:"numeric", year:"numeric" });
  }

  function render() {
    if (currentRoute() !== ROUTE) return;

    const host = $("#pageHost");
    if (!host) return;

    const week = selectedWeek();
    const completed = state.completed[week.start] || {};
    const steps = ["planning","attachments","printing","live","groups"];
    const percent = Math.round((steps.filter(step => completed[step]).length / steps.length) * 100);

    host.innerHTML = `
      <section id="v1602TeacherIntelligence">
        <section class="page-header">
          <div>
            <p>VERSION 16.0.2</p>
            <h2>Teacher Intelligence — Build My Week</h2>
            <span>An isolated weekly command center that does not alter the application router.</span>
          </div>
          <button id="v1602BuildAll" class="primary-button">Build My Week</button>
        </section>

        <section class="panel v1602-week-row">
          <label>
            <span>School Week</span>
            <select id="v1602Week">
              ${weeks().map(item => `
                <option value="${item.start}" ${item.start === week.start ? "selected" : ""}>
                  ${formatDate(item.start)} — ${esc(item.label)}
                </option>
              `).join("")}
            </select>
          </label>

          <article>
            <span>WEEK</span>
            <strong>${esc(week.label)}</strong>
            <small>${formatDate(week.start)}–${formatDate(week.end, true)}</small>
          </article>

          <article>
            <span>CURRICULUM</span>
            <strong>${week.type === "launch" ? "Locked" : "Active"}</strong>
            <small>${week.type === "launch" ? "Routines and classroom culture only" : "Core curriculum may be prepared"}</small>
          </article>
        </section>

        <section class="v1602-progress">
          <div><b style="width:${percent}%"></b></div>
          <strong>${percent}%</strong>
        </section>

        ${week.type === "launch" ? launchView() : workflowView(week, completed)}

        <section class="panel v1602-rules">
          <article><strong>July 27–31</strong><span>Classroom Launch only</span></article>
          <article><strong>August 3</strong><span>Curriculum Week 1</span></article>
          <article><strong>Open Court</strong><span>The Mice Who Lived in a Shoe starts August 3</span></article>
          <article><strong>Week Protection</strong><span>Only one record per Monday date</span></article>
        </section>
      </section>
    `;

    wire();
  }

  function launchView() {
    return `
      <section class="panel v1602-launch">
        <span>CLASSROOM LAUNCH WEEK</span>
        <h3>Teach routines, procedures, belonging, and independence.</h3>
        <p>Core curriculum remains locked until Monday, August 3, 2026.</p>
        <button id="v1602OpenLaunch" class="primary-button">Open Classroom Launch</button>
      </section>
    `;
  }

  function workflowView(week, completed) {
    return `
      <section class="v1602-grid">
        ${card("planning","Weekly Planning",completed.planning)}
        ${card("attachments","Lesson Attachments",completed.attachments)}
        ${card("printing","Print Center",completed.printing)}
        ${card("live","Live Teaching",completed.live)}
        ${card("groups","Small Groups",completed.groups)}
      </section>

      <section class="v1602-summary">
        <article class="panel">
          <span>OPEN COURT</span>
          <h3>${week.curriculumWeek === 1 ? "Unit 1, Lesson 1" : `Curriculum Week ${week.curriculumWeek}`}</h3>
          <p>${week.curriculumWeek === 1 ? "The Mice Who Lived in a Shoe" : "Open Court sequence to be mapped in Open Court Intelligence"}</p>
        </article>
        <article class="panel">
          <span>EUREKA MATH²</span>
          <h3>Math sequence pending</h3>
          <p>Eureka lesson mapping will be completed in Eureka Math Intelligence.</p>
        </article>
      </section>
    `;
  }

  function card(step, title, complete) {
    return `
      <article class="panel v1602-card ${complete ? "complete" : ""}">
        <span>${complete ? "COMPLETE" : "READY"}</span>
        <h3>${esc(title)}</h3>
        <p>Prepare the connected ${esc(title.toLowerCase())} records for this week.</p>
        <button data-step="${step}" class="${complete ? "secondary-button" : "primary-button"}">
          ${complete ? "Run Again" : "Run Step"}
        </button>
      </article>
    `;
  }

  function wire() {
    $("#v1602Week")?.addEventListener("change", event => {
      state.selectedWeek = event.target.value;
      save();
      render();
    });

    $("#v1602BuildAll")?.addEventListener("click", () => {
      const week = selectedWeek();
      if (week.type === "launch") return notify("Curriculum is locked during Classroom Launch Week.");
      ["planning","attachments","printing","live","groups"].forEach(step => runStep(step, false));
      save();
      notify("Weekly workflow prepared.");
      render();
    });

    $("#v1602OpenLaunch")?.addEventListener("click", () => location.hash = "classroom-launch");

    $$("[data-step]").forEach(button => {
      button.addEventListener("click", () => runStep(button.dataset.step, true));
    });
  }

  function runStep(step, rerender) {
    const week = selectedWeek();
    if (week.type === "launch") return notify("Curriculum is locked during Classroom Launch Week.");

    if (step === "planning") buildPlanning(week);
    if (step === "attachments") buildAttachments(week);
    if (step === "printing") buildPrintQueue(week);
    if (step === "live") buildLive(week);
    if (step === "groups") buildGroups(week);

    state.completed[week.start] = state.completed[week.start] || {};
    state.completed[week.start][step] = true;
    save();

    if (rerender) {
      notify("Step prepared.");
      render();
    }
  }

  function buildPlanning(week) {
    const plan = {
      version: "16.0.2",
      title: week.label,
      weekOf: week.start,
      curriculumWeek: week.curriculumWeek,
      days: {}
    };

    DAYS.forEach((day, index) => {
      plan.days[day] = {
        day,
        reading: week.curriculumWeek === 1 ? "The Mice Who Lived in a Shoe" : "Open Court weekly story",
        openCourtLesson: week.curriculumWeek === 1 ? "Unit 1, Lesson 1" : `Curriculum Week ${week.curriculumWeek}`,
        phonics: "Open Court phonics sequence",
        vocabulary: "Open Court weekly vocabulary",
        heggerty: "Daily phonemic awareness",
        mowr: "UFLI, teacher table, fluency, vocabulary, and writing centers",
        writing: "Writing Building the Foundation / Open Court GUM",
        math: `Eureka Math² lesson ${index + 1} — mapping pending`,
        science: "Select the current Arizona science lesson",
        socialStudies: "Select the aligned Arizona Social Studies lesson",
        assessment: day === "Friday" ? "Weekly assessments" : "Teacher observation"
      };
    });

    localStorage.setItem(WEEK_STORE, JSON.stringify(plan));
  }

  function buildAttachments(week) {
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(ATTACHMENT_STORE) || "[]");
      if (!Array.isArray(existing)) existing = [];
    } catch {}

    const titles = [
      ["Open Court","Skills Practice"],
      ["Open Court","Assessment"],
      ["Phonics","Practice"],
      ["Vocabulary","Practice"],
      ["Writing / GUM","Student Page"],
      ["Eureka Math²","Student Materials"],
      ["Eureka Math²","Exit Ticket"],
      ["Science","Student Page"],
      ["Social Studies","Student Page"]
    ];

    const generated = [];
    DAYS.forEach(day => {
      titles.forEach(([category, title], index) => generated.push({
        id: `v1602-${week.start}-${day}-${index}`.toLowerCase(),
        title: `${category} ${title}`,
        day,
        category,
        type: "Student Page",
        lesson: week.label,
        url: "",
        fileName: "",
        notes: "Add the authorized school-provided resource.",
        print: true,
        copies: 33,
        status: "Missing Link",
        teacherOnly: false
      }));
    });

    const ids = new Set(generated.map(item => item.id));
    localStorage.setItem(
      ATTACHMENT_STORE,
      JSON.stringify([...existing.filter(item => !ids.has(item.id)), ...generated])
    );
  }

  function buildPrintQueue(week) {
    let attachments = [];
    let queue = [];
    try { attachments = JSON.parse(localStorage.getItem(ATTACHMENT_STORE) || "[]"); } catch {}
    try { queue = JSON.parse(localStorage.getItem(PRINT_STORE) || "[]"); } catch {}
    if (!Array.isArray(attachments)) attachments = [];
    if (!Array.isArray(queue)) queue = [];

    attachments.filter(item => item.id?.includes(week.start)).forEach(item => {
      const record = {
        id: `print-${item.id}`,
        source: "Teacher Intelligence 16.0.2",
        day: item.day,
        title: item.title,
        category: item.category,
        section: "Student Copies",
        copies: item.copies || 33,
        notes: item.notes,
        url: item.url || "",
        complete: false,
        missingSource: !item.url
      };
      const index = queue.findIndex(existing => existing.id === record.id);
      if (index >= 0) queue[index] = { ...record, complete: queue[index].complete };
      else queue.push(record);
    });

    localStorage.setItem(PRINT_STORE, JSON.stringify(queue));
  }

  function buildLive(week) {
    localStorage.setItem(LIVE_STORE, JSON.stringify({
      day: "Monday",
      weekOf: week.start,
      title: week.label,
      preparedAt: new Date().toISOString()
    }));
  }

  function buildGroups(week) {
    let plans = {};
    try { plans = JSON.parse(localStorage.getItem(GROUP_STORE) || "{}"); } catch {}
    if (!plans || typeof plans !== "object" || Array.isArray(plans)) plans = {};

    GROUPS.forEach(group => DAYS.forEach(day => {
      const key = `${group}|${day}`;
      plans[key] = {
        ...(plans[key] || {}),
        group,
        day,
        curriculumWeek: week.curriculumWeek,
        objective: plans[key]?.objective || "",
        skill: plans[key]?.skill || groupFocus(group),
        text: plans[key]?.text || "",
        materials: plans[key]?.materials || "",
        assessment: plans[key]?.assessment || "Teacher observation and brief progress evidence",
        notes: plans[key]?.notes || "",
        complete: Boolean(plans[key]?.complete)
      };
    }));

    localStorage.setItem(GROUP_STORE, JSON.stringify(plans));
  }

  function groupFocus(group) {
    if (group.startsWith("Red")) return "Intensive decoding, accuracy, and controlled-text reading";
    if (group.startsWith("Yellow")) return "Strategic decoding, word recognition, and supported fluency";
    if (group.startsWith("Green")) return "Benchmark fluency, comprehension, and grade-level application";
    return "Above-level comprehension, prosody, vocabulary, and extension";
  }

  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function takeControl() {
    if (currentRoute() !== ROUTE) return;
    window.setTimeout(render, 25);
    window.setTimeout(render, 250);
  }

  load();
  window.THH_RENDER_TEACHER_INTELLIGENCE = render;
  window.addEventListener("hashchange", takeControl);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", takeControl);
  } else {
    takeControl();
  }
})();
