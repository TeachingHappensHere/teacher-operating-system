
(() => {
  "use strict";

  const APP_KEY = "thh-v7:state";
  let config = null;
  let state = {
    route: "dashboard",
    checks: {},
    notes: {},
    students: [],
    events: [],
    lessons: [],
    custom: { accent: "rose", compact: false }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function boot() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error("tos-data.json failed to load");
        return response.json();
      });
      loadState();
      migrateLegacyData();
      renderNavigation();
      wireShell();
      applySettings();
      routeFromHash();
      registerServiceWorker();
    } catch (error) {
      document.body.innerHTML = `<main class="fatal-error"><h1>Version 7.0 could not start</h1><p>${esc(error.message)}</p></main>`;
    }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(APP_KEY) || "null");
      if (saved) state = { ...state, ...saved };
    } catch {}
  }

  function saveState() {
    localStorage.setItem(APP_KEY, JSON.stringify(state));
  }

  function migrateLegacyData() {
    const migration = {};
    config.migrationKeys.forEach(key => {
      try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        if (value !== null) migration[key] = value;
      } catch {}
    });
    state.migration = migration;

    if (!state.events.length && Array.isArray(migration["thh-v58:calendar-events"])) {
      state.events = migration["thh-v58:calendar-events"];
    }
    if (!state.students.length && Array.isArray(migration["thh-v55:student-support-profiles"])) {
      state.students = migration["thh-v55:student-support-profiles"];
    }
    saveState();
  }

  function renderNavigation() {
    const nav = $("#mainNav");
    nav.innerHTML = config.navigation.map(([id, label, icon]) => `
      <button class="nav-button" data-route="${id}">
        <span>${esc(icon)}</span>
        <strong>${esc(label)}</strong>
      </button>
    `).join("");
  }

  function wireShell() {
    $$("[data-route]").forEach(button => {
      button.addEventListener("click", () => navigate(button.dataset.route));
    });

    $("#menuButton").addEventListener("click", () => document.body.classList.toggle("nav-open"));
    $("#quickHealthButton").addEventListener("click", () => navigate("health"));
    $("#customizeButton").addEventListener("click", () => navigate("settings"));

    $("#globalSearch").addEventListener("input", event => {
      const query = event.target.value.trim();
      if (query.length >= 2) renderSearch(query);
      else if (location.hash === "#search") navigate(state.route || "dashboard", false);
    });

    window.addEventListener("hashchange", routeFromHash);
    window.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        $("#globalSearch").focus();
      }
      if (event.key === "Escape") document.body.classList.remove("nav-open");
    });
  }

  function navigate(route, updateHash = true) {
    state.route = route;
    saveState();
    if (updateHash) location.hash = route;
    renderRoute(route);
    document.body.classList.remove("nav-open");
  }

  function routeFromHash() {
    const route = location.hash.replace("#", "") || state.route || "dashboard";
    renderRoute(config.navigation.some(item => item[0] === route) ? route : "dashboard");
  }

  function renderRoute(route) {
    state.route = route;
    saveState();
    $$(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.route === route));
    $$("#mobileNav [data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === route));

    const renderers = {
      dashboard: renderDashboard,
      teachday: renderTeachDay,
      "lesson-builder": renderLessonBuilder,
      "classroom-launch": renderClassroomLaunch,
      "lesson-plans": renderLessonPlans,
      "small-groups": renderSmallGroups,
      intervention: renderIntervention,
      assessments: renderAssessments,
      "classroom-systems": renderClassroomSystems,
      students: renderStudents,
      communication: renderCommunication,
      calendar: renderCalendar,
      resources: renderResources,
      forms: renderForms,
      "teacher-brain": renderTeacherBrain,
      health: renderHealth,
      settings: renderSettings
    };

    (renderers[route] || renderDashboard)();
    $("#pageHost").focus({ preventScroll: true });
  }

  function pageHeader(eyebrow, title, description, action = "") {
    return `
      <section class="page-header">
        <div>
          <p>${esc(eyebrow)}</p>
          <h2>${esc(title)}</h2>
          <span>${esc(description)}</span>
        </div>
        ${action}
      </section>`;
  }

  function card(title, body, extra = "") {
    return `<section class="panel ${extra}"><h3>${esc(title)}</h3>${body}</section>`;
  }

  function renderDashboard() {
    const migrated = Object.keys(state.migration || {}).length;
    const activeWeek = state.migration?.["thh-v53:active-week"];
    const reminders = state.migration?.["thh-v59:reminders"] || [];
    const today = new Date();

    $("#pageHost").innerHTML = `
      ${pageHeader("TEACHER OPERATING SYSTEM 7.0", `Good ${greeting()}, Mrs. Parrish!`, "One clean system for planning, teaching, students, communication, and classroom launch.",
        `<button class="primary-button" data-jump="teachday">Start My Day</button>`)}
      <section class="dashboard-grid">
        <article class="metric-card"><span>Current Pillar</span><strong>${esc(config.pillar)}</strong></article>
        <article class="metric-card"><span>Literacy</span><strong>Open Court Unit 1</strong></article>
        <article class="metric-card"><span>Planning</span><strong>${activeWeek ? "Week Connected" : "Ready to Build"}</strong></article>
        <article class="metric-card"><span>Migration</span><strong>${migrated} Sources Found</strong></article>
      </section>
      <section class="dashboard-main">
        ${card("Today at a Glance", `<div class="schedule-list">${config.schedule.map(([time, subject]) => `<div><strong>${esc(time)}</strong><span>${esc(subject)}</span></div>`).join("")}</div>`)}
        ${card("Teacher Shortcuts", `<div class="shortcut-grid">
          <button data-jump="lesson-plans">Lesson Plans</button>
          <button data-jump="small-groups">Small Groups</button>
          <button data-jump="assessments">Assessments</button>
          <button data-jump="calendar">Calendar</button>
          <button data-jump="resources">Resources</button>
          <button data-jump="communication">Communication</button>
        </div>`)}
        ${card("Launch Readiness", `<div class="launch-status">
          <strong>${reminders.filter(item => item.status === "Active").length}</strong>
          <span>active reminders migrated</span>
          <button class="secondary-button" data-jump="health">Run Health Check</button>
        </div>`)}
      </section>
      <section class="dashboard-lower">
        ${card("Curriculum Resources", `<div class="resource-chip-grid">${config.resourceLinks.slice(0,6).map(link => `<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.title)}</a>`).join("")}</div>`)}
        ${card("Classroom Launch", `<div class="launch-mini"><p>Teach routines deeply before increasing academic load.</p><button class="primary-button" data-jump="classroom-launch">Open First-Week Launch</button></div>`)}
        ${card("Today’s Reminder", `<blockquote>“The influence of a good teacher can never be erased.”</blockquote>`)}
      </section>
    `;
    wirePageLinks();
  }

  function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  }

  function renderTeachDay() {
    const activeWeek = state.migration?.["thh-v53:active-week"];
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const day = activeWeek?.days?.find(item => item.day === weekday) || activeWeek?.days?.[0];

    $("#pageHost").innerHTML = `
      ${pageHeader("TEACH MY DAY", weekday, day?.focus || "Use the standard daily schedule and add the active weekly plan.")}
      <section class="split-layout">
        ${card("Teaching Blocks", `<div class="task-list">${(day?.blocks || config.schedule.map(([time, subject]) => ({ time, subject, task: subject }))).map((block, index) => `
          <label><input type="checkbox" data-check="teachday-${index}"><div><strong>${esc(block.time)} • ${esc(block.subject)}</strong><span>${esc(block.task)}</span></div></label>
        `).join("")}</div>`)}
        ${card("Daily Notes", `<textarea data-note="teachday" placeholder="What must happen today?">${esc(state.notes.teachday || "")}</textarea><button class="primary-button" data-save-note="teachday">Save Notes</button>`)}
      </section>`;
    wireStateControls();
  }

  function renderLessonBuilder() {
    $("#pageHost").innerHTML = `
      ${pageHeader("LESSON BUILDER", "Build a Complete Lesson", "Create an I Do, We Do, You Do plan with supports and print needs.")}
      <section class="form-panel">
        <label>Lesson Title<input id="lessonTitle" placeholder="Open Court Unit 1, Lesson 1"></label>
        <label>Objective<textarea id="lessonObjective"></textarea></label>
        <div class="three-column">
          <label>I Do<textarea id="lessonIDo"></textarea></label>
          <label>We Do<textarea id="lessonWeDo"></textarea></label>
          <label>You Do<textarea id="lessonYouDo"></textarea></label>
        </div>
        <div class="two-column">
          <label>Small Groups<textarea id="lessonGroups"></textarea></label>
          <label>Differentiation<textarea id="lessonSupports"></textarea></label>
        </div>
        <label>Print & Preparation<textarea id="lessonPrint"></textarea></label>
        <button id="saveLesson" class="primary-button">Save Lesson Plan</button>
      </section>`;
    $("#saveLesson").addEventListener("click", () => {
      const lesson = {
        id: Date.now(),
        title: $("#lessonTitle").value.trim() || "Untitled Lesson",
        objective: $("#lessonObjective").value.trim(),
        iDo: $("#lessonIDo").value.trim(),
        weDo: $("#lessonWeDo").value.trim(),
        youDo: $("#lessonYouDo").value.trim(),
        groups: $("#lessonGroups").value.trim(),
        supports: $("#lessonSupports").value.trim(),
        print: $("#lessonPrint").value.trim(),
        createdAt: new Date().toISOString()
      };
      state.lessons.unshift(lesson);
      saveState();
      toast("Lesson plan saved.");
      navigate("lesson-plans");
    });
  }

  function renderClassroomLaunch() {
    $("#pageHost").innerHTML = `
      ${pageHeader("CLASSROOM LAUNCH", "First Week: Enter, Belong, Learn the Room", "A compact routine-launch workspace that replaces Version 3.2.")}
      <section class="launch-grid">
        ${card("Launch Checklist", `<div class="task-list">${config.firstDayRoutines.map((routine, index) => `
          <label><input type="checkbox" data-check="launch-${index}"><span>${esc(routine)}</span></label>
        `).join("")}</div>`)}
        ${card("Coach Notes", `<div class="coach-notes">
          <p>Teach fewer routines deeply rather than many routines quickly.</p>
          <p>Model incorrectly, let students notice, then model correctly.</p>
          <p>Practice routines when students are calm.</p>
          <p>Narrate the behavior you want repeated.</p>
          <p>Reteaching is part of classroom culture.</p>
        </div>`)}
      </section>
      <section class="panel">
        <h3>Day-by-Day Launch</h3>
        <div class="day-tabs">
          ${["Day 1 — Enter, Belong, Learn the Room","Day 2 — Practice Transitions","Day 3 — Build Independence","Day 4 — Academic Routines","Day 5 — Review, Celebrate, Reteach"].map((day, index) => `
            <button data-day="${index + 1}">${esc(day)}</button>
          `).join("")}
        </div>
        <textarea data-note="launch" placeholder="Launch notes for this week...">${esc(state.notes.launch || "")}</textarea>
        <button class="primary-button" data-save-note="launch">Save Launch Notes</button>
      </section>`;
    wireStateControls();
  }

  function renderLessonPlans() {
    $("#pageHost").innerHTML = `
      ${pageHeader("LESSON PLANS", "Saved Lesson Plans", "Plans created in the unified Version 7.0 Lesson Builder.",
        `<button class="primary-button" data-jump="lesson-builder">New Lesson</button>`)}
      <section class="card-list">
        ${state.lessons.length ? state.lessons.map(lesson => `
          <article class="list-card">
            <h3>${esc(lesson.title)}</h3>
            <p>${esc(lesson.objective || "No objective entered.")}</p>
            <small>${new Date(lesson.createdAt).toLocaleString()}</small>
          </article>`).join("") : `<div class="empty-state"><strong>No Version 7.0 lesson plans yet.</strong><p>Create the first plan in Lesson Builder.</p></div>`}
      </section>`;
    wirePageLinks();
  }

  function renderSmallGroups() {
    const support = state.migration?.["thh-v55:small-group-support"];
    $("#pageHost").innerHTML = `
      ${pageHeader("SMALL GROUPS", "Reading Group Organizer", "Plan Red, Yellow, Blue, and Green support.")}
      <section class="four-groups">
        ${["Red","Yellow","Blue","Green"].map(group => card(`${group} Group`, `
          <textarea data-note="group-${group}" placeholder="${group} group plan...">${esc(state.notes[`group-${group}`] || "")}</textarea>
          <button class="secondary-button" data-save-note="group-${group}">Save</button>
        `, `group-${group.toLowerCase()}`)).join("")}
      </section>
      ${support ? card("Migrated Student Support", `<p><strong>${esc(support.studentName || "")}</strong> • ${esc(support.group || "")}</p><p>${esc(support.nextStep || support.goal || "")}</p>`) : ""}`;
    wireStateControls();
  }

  function renderIntervention() {
    const reteach = state.migration?.["thh-v54:teachday-next-step"] || state.migration?.["thh-v54:planner-next-step"];
    $("#pageHost").innerHTML = `
      ${pageHeader("INTERVENTION", "Targeted Reading Support", "Connect UFLI, MOWR, fluency, vocabulary, and comprehension next steps.")}
      ${reteach ? card("Current Migrated Reteach Plan", `<h3>${esc(reteach.skillTitle || "")}</h3><p>${esc(reteach.group || "")}</p><p>${esc(reteach.action || "")}</p>`) : card("No Active Migrated Plan", "<p>Create a reteach action in Assessments & Data.</p>")}
      ${card("Intervention Notes", `<textarea data-note="intervention">${esc(state.notes.intervention || "")}</textarea><button class="primary-button" data-save-note="intervention">Save</button>`)}
    `;
    wireStateControls();
  }

  function renderAssessments() {
    $("#pageHost").innerHTML = `
      ${pageHeader("ASSESSMENTS & DATA", "Assessment Decision Center", "Record a score and select the instructional next step.")}
      <section class="assessment-entry">
        <label>Skill<select id="assessmentSkill"><option>Phonics & Decoding</option><option>Fluency</option><option>Vocabulary</option><option>Comprehension</option><option>Grammar</option><option>Writing</option><option>Math</option><option>Science</option></select></label>
        <label>Score %<input id="assessmentScore" type="number" min="0" max="100"></label>
        <button id="analyzeAssessment" class="primary-button">Analyze</button>
      </section>
      <section id="assessmentResult"></section>`;
    $("#analyzeAssessment").addEventListener("click", () => {
      const score = Number($("#assessmentScore").value);
      if (!Number.isFinite(score) || score < 0 || score > 100) return toast("Enter a score from 0 to 100.");
      const level = score >= 80 ? "Secure" : score >= 65 ? "Developing" : "Needs Reteach";
      const group = score >= 80 ? "Green" : score >= 65 ? "Blue or Yellow" : "Red";
      $("#assessmentResult").innerHTML = card(level, `<p>Recommended group: <strong>${group}</strong></p><p>${score >= 80 ? "Extend and apply." : score >= 65 ? "Use guided practice and immediate feedback." : "Use explicit intervention, modeling, and short decodable practice."}</p>`);
    });
  }

  function renderClassroomSystems() {
    $("#pageHost").innerHTML = `
      ${pageHeader("CLASSROOM SYSTEMS", "Routines, Procedures & Culture", "Keep the first-week systems visible and easy to print.")}
      <section class="routine-grid">${config.firstDayRoutines.map((routine, index) => `
        <article><strong>${esc(routine)}</strong><textarea data-note="routine-${index}" placeholder="Procedure steps...">${esc(state.notes[`routine-${index}`] || "")}</textarea><button data-save-note="routine-${index}">Save</button></article>
      `).join("")}</section>`;
    wireStateControls();
  }

  function renderStudents() {
    $("#pageHost").innerHTML = `
      ${pageHeader("STUDENTS", "Student Support Profiles", "Local browser storage only. Do not publish student data to GitHub.",
        `<button id="addStudent" class="primary-button">Add Student</button>`)}
      <section id="studentList" class="card-list">
        ${state.students.length ? state.students.map(student => `
          <article class="list-card"><h3>${esc(student.name || "Student")}</h3><p>${esc(student.group || "")} • ${esc(student.primarySkill || student.skill || "")}</p><p>${esc(student.nextStep || student.goal || "")}</p></article>
        `).join("") : `<div class="empty-state"><strong>No student profiles in Version 7.0.</strong><p>Migrated profiles will appear automatically when available.</p></div>`}
      </section>`;
    $("#addStudent").addEventListener("click", () => {
      const name = prompt("Student name:");
      if (!name?.trim()) return;
      state.students.unshift({ id: Date.now(), name: name.trim(), group: "No Current Group", primarySkill: "Phonics & Decoding", goal: "", nextStep: "" });
      saveState();
      renderStudents();
    });
  }

  function renderCommunication() {
    $("#pageHost").innerHTML = `
      ${pageHeader("COMMUNICATION", "Family Communication Studio", "Create a positive update, intervention note, or classroom message.")}
      <section class="form-panel">
        <label>Message Type<select id="messageType"><option>Positive Progress</option><option>Intervention Update</option><option>Home Practice</option><option>Classroom Announcement</option></select></label>
        <label>Student or Topic<input id="messageSubject"></label>
        <label>Message<textarea id="messageBody" placeholder="Write or generate a family message..."></textarea></label>
        <div class="button-row"><button id="generateMessage" class="secondary-button">Generate Starter</button><button id="copyMessage" class="primary-button">Copy Message</button></div>
      </section>`;
    $("#generateMessage").addEventListener("click", () => {
      const subject = $("#messageSubject").value.trim() || "your child";
      const type = $("#messageType").value;
      const starters = {
        "Positive Progress": `Hello,\n\nI wanted to share a positive update about ${subject}. I have noticed strong effort and growth during our recent classroom work. I am proud of the progress being made and will continue encouraging this success.\n\nWarmly,\nMrs. Parrish`,
        "Intervention Update": `Hello,\n\nI wanted to share an update about the support ${subject} is receiving. We are currently focusing on a specific instructional goal through small-group practice and frequent feedback. I will continue monitoring progress and share important updates.\n\nWarmly,\nMrs. Parrish`,
        "Home Practice": `Hello,\n\nThis week, ${subject} is practicing an important classroom skill. A short, positive practice session at home can help reinforce the learning. Reading together for 20–30 minutes is also valuable.\n\nThank you,\nMrs. Parrish`,
        "Classroom Announcement": `Hello families,\n\nI wanted to share an important classroom update about ${subject}. Please review the details and contact me with any questions.\n\nThank you,\nMrs. Parrish`
      };
      $("#messageBody").value = starters[type];
    });
    $("#copyMessage").addEventListener("click", async () => {
      await navigator.clipboard.writeText($("#messageBody").value);
      toast("Message copied.");
    });
  }

  function renderCalendar() {
    const sorted = [...state.events].filter(event => event.date).sort((a,b) => a.date.localeCompare(b.date));
    $("#pageHost").innerHTML = `
      ${pageHeader("CALENDAR", "School Calendar & Deadlines", "Track iDays, assessments, conferences, assemblies, and preparation.",
        `<button id="addEvent" class="primary-button">Add Event</button>`)}
      <section class="card-list">${sorted.length ? sorted.map(event => `
        <article class="list-card"><h3>${esc(event.title)}</h3><p>${esc(event.date)} • ${esc(event.type || "Event")}</p><p>${esc(event.description || "")}</p></article>
      `).join("") : `<div class="empty-state"><strong>No dated events yet.</strong><p>Add the current school-year dates.</p></div>`}</section>`;
    $("#addEvent").addEventListener("click", () => {
      const title = prompt("Event title:");
      if (!title?.trim()) return;
      const date = prompt("Date (YYYY-MM-DD):", new Date().toISOString().slice(0,10));
      state.events.push({ id: Date.now(), title: title.trim(), date: date || "", type: "Classroom Event", description: "" });
      saveState();
      renderCalendar();
    });
  }

  function renderResources() {
    $("#pageHost").innerHTML = `
      ${pageHeader("RESOURCES", "Curriculum & Resource Library", "Open public resources and track local curriculum files.")}
      <section class="resource-library">${config.resourceLinks.map(link => `
        <a href="${esc(link.url)}" target="_blank" rel="noopener"><span>${esc(link.category)}</span><strong>${esc(link.title)}</strong></a>
      `).join("")}</section>`;
  }

  function renderForms() {
    $("#pageHost").innerHTML = `
      ${pageHeader("FORMS & PRINTABLES", "Print Center", "Classroom forms, student support pages, routines, and planning sheets.")}
      <section class="resource-library">
        ${["Weekly Lesson Plan","Daily Teaching Brief","Small-Group Plan","Intervention Notes","Student Support Summary","Parent Conference Notes","Classroom Routines Checklist","First-Day Launch Checklist"].map(title => `
          <button onclick="window.print()"><span>Printable</span><strong>${esc(title)}</strong></button>
        `).join("")}
      </section>`;
  }

  function renderTeacherBrain() {
    $("#pageHost").innerHTML = `
      ${pageHeader("TEACHER BRAIN", "Future Jennifer", "Save the wisdom, reminders, and decisions you do not want to lose.")}
      <section class="form-panel">
        <textarea data-note="teacher-brain" class="large-note" placeholder="What should Future Jennifer remember?">${esc(state.notes["teacher-brain"] || "")}</textarea>
        <button class="primary-button" data-save-note="teacher-brain">Save Teacher Brain</button>
      </section>`;
    wireStateControls();
  }

  async function renderHealth() {
    $("#pageHost").innerHTML = `
      ${pageHeader("HEALTH", "Version 7.0 System Health", "This is the permanent Health page in the main navigation.",
        `<button id="runHealth" class="primary-button">Run Again</button>`)}
      <section id="healthResults" class="health-grid"><p>Running checks...</p></section>
      <section class="panel">
        <h3>Migration Summary</h3>
        <p>${Object.keys(state.migration || {}).length} legacy data sources were found in this browser.</p>
        <button id="exportBackup" class="secondary-button">Export Version 7 Backup</button>
      </section>`;

    $("#runHealth").addEventListener("click", renderHealth);
    $("#exportBackup").addEventListener("click", exportBackup);

    const results = await Promise.all(config.healthFiles.map(async file => {
      try {
        const response = await fetch(file + "?health=" + Date.now(), { cache: "no-store" });
        if (!response.ok) return { file, ok: false, message: `Missing (${response.status})` };
        if (file.endsWith(".json")) await response.clone().json();
        return { file, ok: true, message: "Ready" };
      } catch {
        return { file, ok: false, message: "Could not load" };
      }
    }));

    const controls = [
      { file: "Main navigation", ok: $$(".nav-button").length === config.navigation.length, message: `${$$(".nav-button").length}/${config.navigation.length} routes` },
      { file: "Health route", ok: Boolean($('[data-route="health"]')), message: "Visible in main navigation" },
      { file: "Service worker support", ok: "serviceWorker" in navigator, message: "Browser capability" },
      { file: "Local storage", ok: storageAvailable(), message: "Saved work capability" }
    ];

    const all = [...results, ...controls];
    $("#healthResults").innerHTML = all.map(item => `
      <article class="${item.ok ? "ready" : "missing"}"><strong>${item.ok ? "✓" : "!"}</strong><div><span>${esc(item.file)}</span><small>${esc(item.message)}</small></div></article>
    `).join("");
  }

  function renderSettings() {
    $("#pageHost").innerHTML = `
      ${pageHeader("SETTINGS", "Customize Version 7.0", "Choose the compactness and accent for this device.")}
      <section class="form-panel">
        <label>Accent
          <select id="accentSelect"><option value="rose">Rose</option><option value="sage">Sage</option><option value="blue">Blue</option><option value="lavender">Lavender</option></select>
        </label>
        <label class="toggle-row"><input id="compactToggle" type="checkbox"> Use compact cards and spacing</label>
        <button id="saveSettings" class="primary-button">Save Settings</button>
        <button id="resetVersion7" class="danger-button">Reset Version 7 Local Data</button>
      </section>`;
    $("#accentSelect").value = state.custom.accent || "rose";
    $("#compactToggle").checked = Boolean(state.custom.compact);
    $("#saveSettings").addEventListener("click", () => {
      state.custom.accent = $("#accentSelect").value;
      state.custom.compact = $("#compactToggle").checked;
      saveState();
      applySettings();
      toast("Settings saved.");
    });
    $("#resetVersion7").addEventListener("click", () => {
      if (!confirm("Reset Version 7 data on this device? Legacy data will not be deleted.")) return;
      localStorage.removeItem(APP_KEY);
      location.reload();
    });
  }

  function renderSearch(query) {
    const q = query.toLowerCase();
    const items = [
      ...config.navigation.map(([id, label]) => ({ type: "Page", title: label, route: id })),
      ...config.firstDayRoutines.map(title => ({ type: "Routine", title, route: "classroom-systems" })),
      ...config.resourceLinks.map(link => ({ type: "Resource", title: link.title, route: "resources" })),
      ...state.lessons.map(lesson => ({ type: "Lesson", title: lesson.title, route: "lesson-plans" })),
      ...state.students.map(student => ({ type: "Student", title: student.name, route: "students" }))
    ].filter(item => item.title.toLowerCase().includes(q));

    location.hash = "search";
    $("#pageHost").innerHTML = `
      ${pageHeader("SEARCH", `Results for “${query}”`, `${items.length} result(s)`)}
      <section class="card-list">${items.map(item => `
        <button class="search-result" data-search-route="${item.route}"><span>${esc(item.type)}</span><strong>${esc(item.title)}</strong></button>
      `).join("") || `<div class="empty-state"><strong>No results found.</strong></div>`}</section>`;
    $$("[data-search-route]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.searchRoute)));
  }

  function wirePageLinks() {
    $$("[data-jump]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.jump)));
  }

  function wireStateControls() {
    $$("[data-check]").forEach(input => {
      const key = input.dataset.check;
      input.checked = Boolean(state.checks[key]);
      input.addEventListener("change", () => {
        state.checks[key] = input.checked;
        saveState();
      });
    });

    $$("[data-save-note]").forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.saveNote;
      const field = $(`[data-note="${key}"]`);
      state.notes[key] = field?.value.trim() || "";
      saveState();
      toast("Saved.");
    }));
  }

  function applySettings() {
    document.documentElement.dataset.accent = state.custom?.accent || "rose";
    document.body.classList.toggle("compact", Boolean(state.custom?.compact));
  }

  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1800);
  }

  function storageAvailable() {
    try {
      localStorage.setItem("__test__", "1");
      localStorage.removeItem("__test__");
      return true;
    } catch {
      return false;
    }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify({
      application: "TeachingHappensHere",
      version: "7.0",
      exportedAt: new Date().toISOString(),
      state
    }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `TeachingHappensHere-v7-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    toast("Backup exported.");
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    try {
      await navigator.serviceWorker.register("service-worker.js");
    } catch (error) {
      console.warn("Service worker registration failed.", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* Version 7.2 — Dashboard & Classroom Launch Refinement */
(() => {
  "use strict";
  const KEY = "thh-v72:state";
  let config, state = { launchDay: 1, launchChecks: {}, materials: {}, launchNotes: "", todayMaterials: "", todayAttachments: "" };
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    config = await fetch("tos-data.json", {cache:"no-store"}).then(r => r.json());
    try { state = {...state, ...JSON.parse(localStorage.getItem(KEY) || "{}")}; } catch {}
    wait();
  }
  function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
  function wait(){
    if(!$("#pageHost") || !$("#mainNav")) return setTimeout(wait,100);
    patchNav();
    window.addEventListener("hashchange", route);
    new MutationObserver(route).observe($("#pageHost"), {childList:true,subtree:true});
    route();
  }
  function patchNav(){
    const nav=$("#mainNav");
    nav.innerHTML=config.navigation.map(([id,label,icon])=>`<button class="nav-button" data-route="${id}"><span>${esc(icon)}</span><strong>${esc(label)}</strong></button>`).join("");
    $$("[data-route]",nav).forEach(b=>b.onclick=()=>location.hash=b.dataset.route);
  }
  function route(){
    const current=location.hash.replace("#","") || "dashboard";
    if(current==="dashboard" && !$("#v72Dashboard")) setTimeout(dashboard,0);
    if(current==="classroom-launch" && !$("#v72Launch")) setTimeout(launch,0);
    if(current==="live-workspace" && !$("#v72Live")) setTimeout(live,0);
    if(current==="health" && !$("#v72Health")) setTimeout(health,0);
  }
  function activeDay(){
    try{
      const week=JSON.parse(localStorage.getItem("thh-v53:active-week")||"null");
      const weekday=new Date().toLocaleDateString("en-US",{weekday:"long"});
      return week?.days?.find(d=>d.day===weekday)||week?.days?.[0]||null;
    }catch{return null}
  }
  function jumpWire(){ $$("[data-jump]").forEach(b=>b.onclick=()=>location.hash=b.dataset.jump); }
  function bottom(title,items,route){ return `<section class="panel v72-bottom-card"><h3>${esc(title)}</h3>${items.map(x=>`<button data-jump="${route}">${esc(x)}</button>`).join("")}</section>`; }

  function dashboard(){
    const host=$("#pageHost"), day=activeDay();
    host.innerHTML=`<section id="v72Dashboard" class="v72-dashboard">
      <section class="v72-welcome">
        <div><p>Welcome, Mrs. Parrish! ♡</p><blockquote>“The influence of a good teacher can never be erased.”</blockquote><span>— Unknown</span>
          <div class="v72-quick-buttons">
            <button data-jump="live-workspace">★<small>Live Workspace</small></button>
            <button data-jump="teachday">▶<small>Teach My Day</small></button>
            <button data-jump="lesson-builder">✦<small>Lesson Builder</small></button>
            <button data-jump="calendar">▦<small>Calendar</small></button>
          </div>
        </div>
        <section class="v72-photo-panel"><div class="v72-photo-placeholder"><strong>Classroom Photo</strong><span>Replace this placeholder with your classroom image</span></div></section>
        <section class="v72-classroom-links"><h3>Mrs. Parrish’s Classroom ♡</h3>
          ${["Classroom Layout","Our Procedures","Classroom Expectations","Line-Up Routines","Small Group Organization","Supply List","Classroom Jobs"].map(x=>`<button data-jump="classroom-systems">♡ ${esc(x)}</button>`).join("")}
          <button class="v72-gallery">▧ View Photo Gallery</button>
        </section>
      </section>

      <section class="v72-today-strip">
        <article><span>TODAY'S FOCUS</span><strong>${esc(day?.focus||"Prepare the classroom and build the current week.")}</strong></article>
        <article><span>TODAY'S LESSON</span><strong>${esc(day?.openCourtLessonId||"Open Court Unit 1")}</strong></article>
        <article><span>TODAY'S MATERIALS</span><textarea id="v72Materials">${esc(state.todayMaterials)}</textarea></article>
        <article><span>TODAY'S ATTACHMENTS</span><textarea id="v72Attachments">${esc(state.todayAttachments)}</textarea></article>
      </section>

      <section class="v72-main-grid">
        <section class="panel"><div class="v72-panel-heading"><h3>Today at a Glance</h3><span>${new Date().toLocaleDateString()}</span></div>
          <div class="schedule-list">${config.schedule.map(([t,s])=>`<div><strong>${esc(t)}</strong><span>${esc(s)}</span></div>`).join("")}</div>
          <button class="v72-wide-button" data-jump="teachday">▶ Start Teaching</button>
        </section>
        <section class="panel"><h3>Teacher Shortcuts</h3><div class="v72-shortcuts">${["Take Attendance","Print Center","Behavior Tracker","Timer","Student Notes","Random Grouping","Quick Email","ClassDojo"].map(x=>`<button>${esc(x)}</button>`).join("")}</div>
          <div class="v72-links"><h3>Important Links</h3><a href="#">Champion Schools Teacher Resources ↗</a><a href="#">Our Grade Level Google Drive ↗</a><a href="#">School Website ↗</a><a href="#">District Portal ↗</a></div>
        </section>
        <section class="panel"><h3>Curriculum Resources</h3><div class="v72-curriculum">
          ${config.dashboardCurriculum.map(([title,cat],i)=>`<button data-jump="${title==="Health"?"health":"resources"}" class="resource-${i%5}"><span>${esc(cat)}</span><strong>${esc(title)}</strong></button>`).join("")}
        </div><button class="v72-wide-button" data-jump="resources">All Curriculum Resources ↗</button></section>
      </section>

      <section class="v72-bottom-grid">
        ${bottom("Student Data",["Data Tracker","Assessment Data","Progress Monitoring","Intervention Notes"],"assessments")}
        ${bottom("Communication",["Parent Contact Log","Newsletters","Parent Conference Notes","Email Templates"],"communication")}
        ${bottom("Classroom Inspiration",["Bulletin Board Ideas","Classroom Decor","Door Decor Ideas","Celebrations"],"resources")}
        ${bottom("Forms & Printables",["IEP / 504 / ELL Guide","Parent Forms","Behavior Forms","Miscellaneous Forms"],"forms")}
        ${bottom("Teacher Self-Care",["Self-Care Ideas","Encouragement","Gratitude","You've Got This!"],"health")}
      </section>
      <footer class="v72-footer">♡ Plan your work. Work your plan. And remember why you started. ♡</footer>
    </section>`;
    jumpWire();
    $("#v72Materials").onchange=e=>{state.todayMaterials=e.target.value.trim();save()};
    $("#v72Attachments").onchange=e=>{state.todayAttachments=e.target.value.trim();save()};
  }

  function launch(){
    const host=$("#pageHost"), days=config.classroomLaunchDays, selected=days[(state.launchDay||1)-1]||days[0];
    const total=config.firstDayRoutines.length, done=Object.values(state.launchChecks).filter(Boolean).length, percent=total?Math.round(done/total*100):0;
    host.innerHTML=`<section id="v72Launch">
      <section class="page-header"><div><p>CLASSROOM LAUNCH 7.2</p><h2>First-Week Classroom Launch Center</h2><span>Teach the room, routines, belonging, and independence before increasing academic load.</span></div><button class="primary-button" id="v72Start">Start ${esc(selected.day)}</button></section>
      <section class="v72-progress-panel"><div><strong>${percent}%</strong><span>Launch routines prepared</span></div><div class="v72-progress-track"><span style="width:${percent}%"></span></div><button id="v72Print">Print Launch Plan</button></section>
      <section class="v72-launch-top">
        <section class="panel"><h3>Launch Checklist</h3><div class="task-list">${config.firstDayRoutines.map((x,i)=>`<label><input type="checkbox" data-launch="${i}" ${state.launchChecks[i]?"checked":""}><span>${esc(x)}</span></label>`).join("")}</div></section>
        <section class="panel"><h3>Today's Launch Lesson</h3><p class="v72-day-label">${esc(selected.day)}</p><h2>${esc(selected.title)}</h2><div class="v72-goal"><strong>Goal</strong><p>${esc(selected.goal)}</p></div><div class="task-list">${selected.routines.map(x=>`<label><input type="checkbox"><span>${esc(x)}</span></label>`).join("")}</div></section>
        <section class="panel"><h3>Coach Notes</h3><div class="coach-notes"><p>Teach fewer routines deeply rather than many routines quickly.</p><p>Model incorrectly, let students notice, then model correctly.</p><p>Practice routines when students are calm.</p><p>Narrate the behavior you want repeated.</p><p>Reteaching is part of classroom culture.</p></div></section>
      </section>
      <section class="v72-launch-bottom">
        <section class="panel"><h3>Day-by-Day Launch</h3><div class="v72-day-list">${days.map((d,i)=>`<button data-day="${i+1}" class="${i+1===state.launchDay?"active":""}"><strong>${esc(d.day)}</strong><span>${esc(d.title)}</span></button>`).join("")}</div></section>
        <section class="panel"><h3>Printable Materials</h3><div class="v72-materials">${config.classroomLaunchMaterials.map((x,i)=>`<label><input type="checkbox" data-material="${i}" ${state.materials[i]?"checked":""}><span>${esc(x)}</span></label>`).join("")}</div></section>
        <section class="panel"><h3>Teacher Script & Notes</h3><textarea id="v72LaunchNotes">${esc(state.launchNotes)}</textarea><button class="primary-button" id="v72SaveNotes">Save Launch Notes</button></section>
      </section>
    </section>`;
    $$("[data-launch]").forEach(i=>i.onchange=()=>{state.launchChecks[i.dataset.launch]=i.checked;save();launch()});
    $$("[data-material]").forEach(i=>i.onchange=()=>{state.materials[i.dataset.material]=i.checked;save()});
    $$("[data-day]").forEach(b=>b.onclick=()=>{state.launchDay=Number(b.dataset.day);save();launch()});
    $("#v72SaveNotes").onclick=()=>{state.launchNotes=$("#v72LaunchNotes").value.trim();save();toast("Launch notes saved.")};
    $("#v72Print").onclick=()=>window.print();
    $("#v72Start").onclick=()=>$("#v72LaunchNotes").focus();
  }

  function live(){
    const host=$("#pageHost"), day=activeDay();
    host.innerHTML=`<section id="v72Live"><section class="page-header"><div><p>LIVE WORKSPACE</p><h2>Teach from one screen</h2><span>Today's lesson, schedule, materials, attachments, and notes.</span></div><button class="primary-button" data-jump="teachday">Open Teach My Day</button></section>
      <section class="v72-live-grid">
        <section class="panel"><h3>Today's Lesson</h3><h2>${esc(day?.focus||"Open Court Unit 1")}</h2><p>${esc(day?.openCourtLessonId||"Connect the active week in Weekly Planner.")}</p><button class="primary-button" data-jump="lesson-plans">Open Lesson Plans</button></section>
        <section class="panel"><h3>Materials</h3><p>${esc(state.todayMaterials||"No materials entered yet.")}</p><button class="secondary-button" data-jump="resources">Open Resources</button></section>
        <section class="panel"><h3>Attachments</h3><p>${esc(state.todayAttachments||"No attachments entered yet.")}</p><button class="secondary-button" data-jump="forms">Open Print Center</button></section>
        <section class="panel"><h3>Teaching Notes</h3><textarea id="v72LiveNotes"></textarea><button class="primary-button" id="v72SaveLive">Save Notes</button></section>
      </section></section>`;
    jumpWire();
    $("#v72SaveLive").onclick=()=>{localStorage.setItem("thh-v72:live-notes",JSON.stringify({date:new Date().toISOString(),notes:$("#v72LiveNotes").value.trim()}));toast("Teaching notes saved.")};
  }

  function health(){
    const host=$("#pageHost"); if(!host||$("#v72Health")) return;
    const panel=document.createElement("section"); panel.id="v72Health"; panel.className="panel v72-health-hub";
    panel.innerHTML=`<h3>Teacher Health & Self-Care</h3><div class="v72-health-grid">${["Water","Stretch Break","Lunch","Walking","Medication Reminder","Doctor Appointments","Gratitude","End-of-Day Reset"].map(x=>`<label><input type="checkbox"><span>${esc(x)}</span></label>`).join("")}</div><p class="v72-health-note">This personal wellness checklist stays on this device and is not a medical record.</p>`;
    host.appendChild(panel);
  }
  function toast(message){const t=$("#toast");if(!t)return;t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();

/* Version 7.3 — Weekly Planning Studio */
(()=>{"use strict";
const KEY="thh-v73:weekly-plan",SEND="thh-v73:teach-day";let cfg,plan,dayName="Monday";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function blank(day){return{day,date:"",openCourtLesson:cfg.unit1Lessons?.[0]||"",focus:cfg.firstWeekDailyFocus?.[day]||"",objective:"",standards:"",iDo:"",weDo:"",youDo:"",morningMeeting:"",heggerty:"",ufli:"",mowr:"",phonics:"",vocabulary:"",reading:"",writing:"",math:"",science:"",socialStudies:"",launchRoutine:cfg.firstWeekDailyFocus?.[day]||"",smallGroups:"",differentiation:"",assessment:"",materials:"",attachments:"",notes:"",complete:false}}
function load(){try{plan=JSON.parse(localStorage.getItem(KEY)||"null")}catch{};if(!plan){plan={title:"First Week of School",weekOf:"",pillar:"Heart",days:{},printQueue:[]};["Monday","Tuesday","Wednesday","Thursday","Friday"].forEach(d=>plan.days[d]=blank(d));save()}["Monday","Tuesday","Wednesday","Thursday","Friday"].forEach(d=>plan.days[d] ||= blank(d))}
function save(){localStorage.setItem(KEY,JSON.stringify(plan))}
async function start(){cfg=await fetch("tos-data.json",{cache:"no-store"}).then(r=>r.json());load();wait()}
function wait(){if(!$("#pageHost")||!$("#mainNav"))return setTimeout(wait,100);const b=$('[data-route="lesson-plans"] strong');if(b)b.textContent="Weekly Planning";window.addEventListener("hashchange",route);new MutationObserver(route).observe($("#pageHost"),{childList:true,subtree:true});route()}
function route(){const r=location.hash.replace("#","")||"dashboard";if(r==="lesson-plans"&&!$("#v73Studio"))setTimeout(render,0);if(r==="teachday")setTimeout(injectTeachDay,0);if(r==="dashboard")setTimeout(injectDashboard,0)}
function field(k,l,type="textarea",wide=""){const v=plan.days[dayName][k]||"";if(type==="select")return`<label class="${wide}"><span>${esc(l)}</span><select data-f="${k}">${cfg.unit1Lessons.map(x=>`<option ${x===v?"selected":""}>${esc(x)}</option>`).join("")}</select></label>`;if(type==="input")return`<label class="${wide}"><span>${esc(l)}</span><input data-f="${k}" value="${esc(v)}"></label>`;return`<label class="${wide}"><span>${esc(l)}</span><textarea data-f="${k}">${esc(v)}</textarea></label>`}
function section(id,title,body){return`<section class="panel v73-section" id="v73-${id}"><h3>${esc(title)}</h3>${body}</section>`}
function renderQueue(){return plan.printQueue.length?plan.printQueue.map((x,i)=>`<label><input type="checkbox" data-print="${i}" ${x.complete?"checked":""}><span><strong>${esc(x.day)}</strong> — ${esc(x.item)}</span></label>`).join(""):"<p>No print queue yet.</p>"}
function render(){const h=$("#pageHost"),d=plan.days[dayName];h.innerHTML=`<section id="v73Studio"><section class="page-header"><div><p>VERSION 7.3</p><h2>Weekly Planning & First-Week Production Studio</h2><span>Plan Monday through Friday and send each day into Teach My Day.</span></div><div class="v73-head"><button id="printWeek" class="secondary-button">Print Week</button><button id="sendDay" class="primary-button">Send ${dayName} to Teach My Day</button></div></section>
<section class="panel v73-settings"><label>Week Title<input id="weekTitle" value="${esc(plan.title)}"></label><label>Week Of<input id="weekOf" type="date" value="${esc(plan.weekOf)}"></label><label>Pillar<input id="pillar" value="${esc(plan.pillar)}"></label><button id="saveWeek" class="primary-button">Save Week</button></section>
<nav class="v73-days">${Object.keys(plan.days).map(n=>`<button data-day="${n}" class="${n===dayName?"active":""}"><strong>${n}</strong><span>${plan.days[n].complete?"✓ Ready":esc(plan.days[n].focus||"Plan Day")}</span></button>`).join("")}</nav>
<section class="v73-summary"><article><span>DAY</span><strong>${dayName}</strong></article><article><span>OPEN COURT</span><strong>${esc(d.openCourtLesson)}</strong></article><article><span>LAUNCH</span><strong>${esc(d.launchRoutine)}</strong></article><article><span>STATUS</span><strong>${d.complete?"Ready to Teach":"In Progress"}</strong></article></section>
<section class="v73-layout"><aside class="panel v73-nav">${[["overview","Overview"],["literacy","Literacy / ELA"],["math","Math"],["science","Science & Social Studies"],["groups","Groups & Differentiation"],["assessment","Assessment"],["prep","Print & Prep"],["notes","Teacher Notes"]].map(x=>`<button data-sec="${x[0]}">${x[1]}</button>`).join("")}<label><input id="ready" type="checkbox" ${d.complete?"checked":""}> Mark ${dayName} ready</label></aside><main class="v73-main">
${section("overview","Lesson Overview",`<div class="v73-grid">${field("date","Date","input")}${field("openCourtLesson","Open Court Unit 1 Lesson","select","wide")}${field("focus","Daily Focus","input")}${field("launchRoutine","Classroom Launch Routine","input")}${field("objective","Learning Objective","textarea","wide")}${field("standards","Standards","textarea","wide")}${field("iDo","I Do")}${field("weDo","We Do")}${field("youDo","You Do")}</div>`)}
${section("literacy","Literacy / ELA",`<div class="v73-grid">${field("morningMeeting","Morning Meeting")}${field("heggerty","Heggerty")}${field("ufli","UFLI")}${field("mowr","MOWR / Reading Intervention")}${field("phonics","Phonics")}${field("vocabulary","Vocabulary")}${field("reading","Open Court Reading","textarea","wide")}${field("writing","Writing / GUM","textarea","wide")}</div>`)}
${section("math","Eureka Math²",`<div class="v73-grid">${field("math","Math Lesson, Recap, and Supports","textarea","wide")}</div>`)}
${section("science","Science & Social Studies",`<div class="v73-grid">${field("science","Science")}${field("socialStudies","Social Studies")}</div>`)}
${section("groups","Small Groups & Differentiation",`<div class="v73-grid">${field("smallGroups","Small-Group Plan","textarea","wide")}${field("differentiation","EL / IEP / 504 / Universal Supports","textarea","wide")}</div><div class="v73-chips">${cfg.defaultSupports.map(x=>`<button data-support="${esc(x)}">${esc(x)}</button>`).join("")}</div>`)}
${section("assessment","Assessment & Evidence",`<div class="v73-grid">${field("assessment","Assessment, Exit Ticket, Progress Monitoring, or Evidence","textarea","wide")}</div>`)}
${section("prep","Print & Preparation",`<div class="v73-grid">${field("materials","Materials Needed")}${field("attachments","Attachments, Pages, and Links")}</div><div class="v73-actions"><button id="buildQueue" class="primary-button">Build Print Queue</button><button id="printDay" class="secondary-button">Print ${dayName}</button></div><div class="v73-queue">${renderQueue()}</div>`)}
${section("notes","Teacher Notes",`<div class="v73-grid">${field("notes","Notes for Future Jennifer","textarea","wide")}</div>`)}</main></section></section>`;wire()}
function wire(){$$("[data-day]").forEach(b=>b.onclick=()=>{dayName=b.dataset.day;render()});$$("[data-sec]").forEach(b=>b.onclick=()=>$("#v73-"+b.dataset.sec)?.scrollIntoView({behavior:"smooth"}));$$("[data-f]").forEach(c=>c.oninput=()=>{plan.days[dayName][c.dataset.f]=c.value;save()});$$("[data-support]").forEach(b=>b.onclick=()=>{const f=$('[data-f="differentiation"]');f.value=(f.value?f.value+"\n":"")+"• "+b.dataset.support;plan.days[dayName].differentiation=f.value;save()});$("#weekTitle").oninput=e=>plan.title=e.target.value;$("#weekOf").oninput=e=>plan.weekOf=e.target.value;$("#pillar").oninput=e=>plan.pillar=e.target.value;$("#saveWeek").onclick=()=>{save();toast("Weekly plan saved.")};$("#ready").onchange=e=>{plan.days[dayName].complete=e.target.checked;save();render()};$("#buildQueue").onclick=buildQueue;$("#printDay").onclick=()=>window.print();$("#printWeek").onclick=()=>window.print();$("#sendDay").onclick=sendDay;$$("[data-print]").forEach(i=>i.onchange=()=>{plan.printQueue[Number(i.dataset.print)].complete=i.checked;save()})}
function buildQueue(){const q=[];Object.values(plan.days).forEach(d=>[d.materials,d.attachments].filter(Boolean).join("\n").split("\n").map(x=>x.replace(/^[-•]\s*/,"").trim()).filter(Boolean).forEach(item=>q.push({day:d.day,item,complete:false})));plan.printQueue=q;save();render();toast(q.length+" item(s) added.")}
function blocks(d){return[["8:20–8:30","Morning Meeting",d.morningMeeting||d.launchRoutine],["8:30–8:40","Heggerty",d.heggerty],["8:45–9:30","MOWR",d.mowr],["9:30–9:50","Phonics",d.phonics],["9:50–10:00","Vocabulary",d.vocabulary],["10:00–10:50","Open Court Reading",d.reading||d.openCourtLesson],["12:05–1:05","Eureka Math²",d.math],["1:05–1:35","Writing / GUM",d.writing],["1:35–2:00","Social Studies",d.socialStudies],["2:15–2:35","Science",d.science]].map(x=>({time:x[0],subject:x[1],task:x[2]||"Add plan"}))}
function sendDay(){const d=plan.days[dayName],payload={version:"7.3",sentAt:new Date().toISOString(),weekTitle:plan.title,weekOf:plan.weekOf,pillar:plan.pillar,...d};localStorage.setItem(SEND,JSON.stringify(payload));localStorage.setItem("thh-v53:active-week",JSON.stringify({templateTitle:plan.title,sentAt:new Date().toISOString(),days:Object.values(plan.days).map(x=>({day:x.day,focus:x.focus,openCourtLessonId:x.openCourtLesson,blocks:blocks(x),printNeeds:x.materials.split("\n").filter(Boolean)}))}));toast(dayName+" sent to Teach My Day.");setTimeout(()=>location.hash="teachday",450)}
function injectTeachDay(){const h=$("#pageHost");if(!h||$("#v73Teach"))return;let d;try{d=JSON.parse(localStorage.getItem(SEND)||"null")}catch{};if(!d)return;const ph=$(".page-header",h);if(!ph)return;const c=document.createElement("section");c.id="v73Teach";c.className="panel v73-teach";c.innerHTML=`<div><p>VERSION 7.3 WEEKLY PLAN</p><h3>${esc(d.day)} — ${esc(d.openCourtLesson)}</h3><span>${esc(d.focus)}</span></div><button id="backPlan" class="secondary-button">Return to Weekly Planning</button>`;ph.insertAdjacentElement("afterend",c);$("#backPlan").onclick=()=>location.hash="lesson-plans"}
function injectDashboard(){const d=$("#v72Dashboard");if(!d||$("#v73Dash"))return;const ready=Object.values(plan.days).filter(x=>x.complete).length,c=document.createElement("section");c.id="v73Dash";c.className="v73-dash";c.innerHTML=`<div><p>WEEKLY PLANNING</p><h3>${ready}/5 days ready</h3><span>${esc(plan.title)} ${plan.weekOf?"• Week of "+esc(plan.weekOf):""}</span></div><button id="openStudio">Open Planning Studio</button>`;d.prepend(c);$("#openStudio").onclick=()=>location.hash="lesson-plans"}
function toast(m){const t=$("#toast");if(!t)return;t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();})();

/* Version 7.4 — Lesson Attachments & Print Center */
(()=>{"use strict";
const A='thh-v74:attachments',P='thh-v74:print-center',W='thh-v73:weekly-plan';
let cfg,items=[],queue=[],day='All',cat='All';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const save=()=>{localStorage.setItem(A,JSON.stringify(items));localStorage.setItem(P,JSON.stringify(queue))};
async function start(){cfg=await fetch('tos-data.json',{cache:'no-store'}).then(r=>r.json());try{items=JSON.parse(localStorage.getItem(A)||'[]');queue=JSON.parse(localStorage.getItem(P)||'[]')}catch{}if(!items.length){items=cfg.defaultAttachmentTemplates.map((x,i)=>({id:'template-'+i,day:'Monday',lesson:'',print:false,copies:1,...x}));save()}wait()}
function wait(){if(!$('#pageHost')||!$('#mainNav'))return setTimeout(wait,100);nav();window.addEventListener('hashchange',route);new MutationObserver(route).observe($('#pageHost'),{childList:true,subtree:true});route()}
function nav(){if($('[data-route="attachments"]'))return;const b=document.createElement('button');b.className='nav-button';b.dataset.route='attachments';b.innerHTML='<span>📎</span><strong>Lesson Attachments</strong>';b.onclick=()=>location.hash='attachments';const r=$('[data-route="resources"]');r?r.before(b):$('#mainNav').appendChild(b)}
function route(){const r=location.hash.slice(1)||'dashboard';if(r==='attachments'&&!$('#v74Attachments'))setTimeout(renderAttachments);if(r==='forms'&&!$('#v74PrintCenter'))setTimeout(renderPrint);if(r==='dashboard')setTimeout(dash);if(r==='lesson-plans')setTimeout(planCard);if(r==='health')setTimeout(health)}
function renderAttachments(){const host=$('#pageHost'), filtered=items.filter(x=>(day==='All'||x.day===day)&&(cat==='All'||x.category===cat));const missing=items.filter(x=>!x.url).length;
host.innerHTML=`<section id="v74Attachments"><section class="page-header"><div><p>VERSION 7.4</p><h2>Lesson Attachments & Resource Linking</h2><span>Connect lesson files, Drive links, websites, printables, pages, and teacher guides.</span></div><button id="addAtt" class="primary-button">Add Attachment</button></section>
<section class="v74-stats"><article><strong>${items.length}</strong><span>Total</span></article><article><strong>${items.length-missing}</strong><span>Linked</span></article><article class="${missing?'warning':''}"><strong>${missing}</strong><span>Missing Links</span></article><article><strong>${items.filter(x=>x.print).length}</strong><span>Marked to Print</span></article></section>
<section class="panel v74-toolbar"><select id="dayFilter">${['All','Monday','Tuesday','Wednesday','Thursday','Friday'].map(x=>`<option ${x===day?'selected':''}>${x}</option>`).join('')}</select><select id="catFilter"><option>All</option>${cfg.attachmentCategories.map(x=>`<option ${x===cat?'selected':''}>${esc(x)}</option>`).join('')}</select><input id="attSearch" placeholder="Search resources..."><button id="buildQueue" class="primary-button">Build Print Center</button></section>
<section class="v74-grid">${filtered.map(card).join('')||'<div class="empty-state"><strong>No matching attachments.</strong></div>'}</section></section>`;
$('#dayFilter').onchange=e=>{day=e.target.value;renderAttachments()};$('#catFilter').onchange=e=>{cat=e.target.value;renderAttachments()};$('#attSearch').oninput=e=>$$('.v74-card').forEach(c=>c.hidden=!c.textContent.toLowerCase().includes(e.target.value.toLowerCase()));$('#addAtt').onclick=()=>edit();$('#buildQueue').onclick=build;$$('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));$$('[data-del]').forEach(b=>b.onclick=()=>del(b.dataset.del));$$('[data-print]').forEach(i=>i.onchange=()=>{const x=items.find(a=>a.id===i.dataset.print);x.print=i.checked;save()})}
function card(x){const miss=!x.url;return `<article class="v74-card ${miss?'missing':'linked'}"><div class="v74-head"><div><span>${esc(x.category)} • ${esc(x.type)}</span><h3>${esc(x.title)}</h3></div><b>${miss?'Missing Link':'Linked'}</b></div><p>${esc(x.notes)}</p><small>${esc(x.day)} • ${esc(x.lesson||'No lesson')} • ${x.copies||1} copies</small><label><input type="checkbox" data-print="${x.id}" ${x.print?'checked':''}> Add to Print Center</label><div class="v74-actions">${x.url?`<a class="primary-button" target="_blank" rel="noopener" href="${esc(x.url)}">Open</a>`:''}<button class="secondary-button" data-edit="${x.id}">Edit</button><button class="danger-button" data-del="${x.id}">Delete</button></div></article>`}
function edit(id=''){const old=items.find(x=>x.id===id),x=old||{id:'att-'+Date.now(),title:'',category:'Open Court',type:'PDF',day:day==='All'?'Monday':day,lesson:'',url:'',notes:'',print:false,copies:1};$('#pageHost').innerHTML=`<section><section class="page-header"><div><p>LESSON RESOURCE</p><h2>${old?'Edit':'Add'} Attachment</h2><span>Add a public URL or GitHub resource path.</span></div><button id="cancel" class="secondary-button">Cancel</button></section><section class="form-panel v74-editor"><label>Title<input id="eTitle" value="${esc(x.title)}"></label><div class="two-column"><label>Category<select id="eCat">${cfg.attachmentCategories.map(v=>`<option ${v===x.category?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Type<select id="eType">${cfg.attachmentTypes.map(v=>`<option ${v===x.type?'selected':''}>${esc(v)}</option>`).join('')}</select></label></div><div class="two-column"><label>Day<select id="eDay">${['Monday','Tuesday','Wednesday','Thursday','Friday'].map(v=>`<option ${v===x.day?'selected':''}>${v}</option>`).join('')}</select></label><label>Copies<input id="eCopies" type="number" min="1" value="${x.copies||1}"></label></div><label>Lesson<input id="eLesson" value="${esc(x.lesson)}"></label><label>URL or GitHub Path<input id="eUrl" value="${esc(x.url)}"></label><label>Notes<textarea id="eNotes">${esc(x.notes)}</textarea></label><label><input id="ePrint" type="checkbox" ${x.print?'checked':''}> Add to Print Center</label><button id="saveAtt" class="primary-button">Save Attachment</button></section></section>`;$('#cancel').onclick=renderAttachments;$('#saveAtt').onclick=()=>{Object.assign(x,{title:$('#eTitle').value.trim()||'Untitled Resource',category:$('#eCat').value,type:$('#eType').value,day:$('#eDay').value,copies:Math.max(1,+$('#eCopies').value||1),lesson:$('#eLesson').value.trim(),url:$('#eUrl').value.trim(),notes:$('#eNotes').value.trim(),print:$('#ePrint').checked});if(!old)items.unshift(x);save();renderAttachments();toast('Attachment saved.')}}
function del(id){const x=items.find(a=>a.id===id);if(x&&confirm(`Delete "${x.title}"?`)){items=items.filter(a=>a.id!==id);save();renderAttachments()}}
function build(){queue=items.filter(x=>x.print).map(x=>({id:'a-'+x.id,source:'Attachment',day:x.day,title:x.title,category:x.category,copies:x.copies||1,notes:x.notes,url:x.url,complete:false}));try{const w=JSON.parse(localStorage.getItem(W)||'null');(w?.printQueue||[]).forEach((x,i)=>queue.push({id:'w-'+i,source:'Weekly Plan',day:x.day,title:x.item,category:'Weekly Plan',copies:1,notes:'',url:'',complete:!!x.complete}))}catch{}save();toast(`${queue.length} item(s) added.`);setTimeout(()=>location.hash='forms',400)}
function renderPrint(){const host=$('#pageHost'),done=queue.filter(x=>x.complete).length;host.innerHTML=`<section id="v74PrintCenter"><section class="page-header"><div><p>VERSION 7.4</p><h2>Print & Preparation Center</h2><span>One queue for weekly plans, resources, copies, and preparation.</span></div><div class="button-row"><button id="refreshQ" class="secondary-button">Refresh</button><button id="printQ" class="primary-button">Print Queue</button></div></section><section class="v74-stats"><article><strong>${queue.length}</strong><span>Total</span></article><article><strong>${done}</strong><span>Complete</span></article><article><strong>${queue.length-done}</strong><span>Remaining</span></article><article><strong>${queue.filter(x=>!x.url&&x.source==='Attachment').length}</strong><span>Missing Links</span></article></section><section class="v74-print-list">${queue.map(printItem).join('')||'<div class="empty-state"><strong>The print queue is empty.</strong></div>'}</section></section>`;$('#refreshQ').onclick=build;$('#printQ').onclick=()=>window.print();$$('[data-done]').forEach(i=>i.onchange=()=>{const x=queue.find(q=>q.id===i.dataset.done);x.complete=i.checked;save();i.closest('article').classList.toggle('complete',i.checked)});$$('[data-copies]').forEach(i=>i.onchange=()=>{const x=queue.find(q=>q.id===i.dataset.copies);x.copies=Math.max(1,+i.value||1);save()})}
function printItem(x){return `<article class="v74-print-item ${x.complete?'complete':''}"><label><input type="checkbox" data-done="${x.id}" ${x.complete?'checked':''}><div><span>${esc(x.day)} • ${esc(x.category)} • ${esc(x.source)}</span><strong>${esc(x.title)}</strong><small>${esc(x.notes)}</small></div></label><input data-copies="${x.id}" type="number" min="1" value="${x.copies||1}">${x.url?`<a class="secondary-button" target="_blank" href="${esc(x.url)}">Open</a>`:'<button class="secondary-button" onclick="location.hash=\'attachments\'">Add Link</button>'}</article>`}
function dash(){const d=$('#v72Dashboard');if(!d||$('#v74Dash'))return;const missing=items.filter(x=>!x.url).length,c=document.createElement('section');c.id='v74Dash';c.className='v74-dashboard';c.innerHTML=`<div><p>LESSON ATTACHMENTS & PRINT CENTER</p><h3>${items.length} resources • ${missing} missing links</h3><span>${queue.filter(x=>!x.complete).length} preparation item(s) remaining.</span></div><div><button data-go="attachments">Attachments</button><button data-go="forms">Print Center</button></div>`;d.prepend(c);$$('[data-go]',c).forEach(b=>b.onclick=()=>location.hash=b.dataset.go)}
function planCard(){const s=$('#v73PlanningStudio');if(!s||$('#v74PlanCard'))return;const c=document.createElement('section');c.id='v74PlanCard';c.className='v74-plan-card';c.innerHTML=`<div><p>LESSON ATTACHMENTS</p><h3>${items.length} resources • ${items.filter(x=>!x.url).length} missing links</h3></div><button id="openAtt">Open Attachments</button>`;$('.v73-planning-header',s)?.after(c);$('#openAtt').onclick=()=>location.hash='attachments'}
function health(){const h=$('#pageHost');if(!h||$('#v74Health'))return;const p=document.createElement('section');p.id='v74Health';p.className='panel';p.innerHTML=`<h3>Version 7.4 Resource Health</h3><div class="health-grid"><article class="ready"><strong>✓</strong><div><span>Attachment storage</span><small>${items.length} record(s)</small></div></article><article class="ready"><strong>✓</strong><div><span>Print Center</span><small>${queue.length} item(s)</small></div></article><article class="${items.some(x=>!x.url)?'missing':'ready'}"><strong>${items.some(x=>!x.url)?'!':'✓'}</strong><div><span>Missing links</span><small>${items.filter(x=>!x.url).length} missing</small></div></article></div>`;h.appendChild(p)}
function toast(m){const t=$('#toast');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();})();


/* Version 7.5 — Planbook Export, Daily Lesson Packets & Production Workflow */
(() => {
  "use strict";

  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PACKET_STORE = "thh-v75:packet-state";
  const TEACH_DAY_STORE = "thh-v73:teach-day";

  let config = null;
  let selectedDay = "Monday";
  let packetState = {
    checks: {},
    packetNotes: {},
    lastExportedDay: "",
    compactView: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => response.json());
      try {
        packetState = { ...packetState, ...JSON.parse(localStorage.getItem(PACKET_STORE) || "{}") };
      } catch {}
      waitForShell();
    } catch (error) {
      console.warn("Version 7.5 could not start.", error);
    }
  }

  function savePacketState() {
    localStorage.setItem(PACKET_STORE, JSON.stringify(packetState));
  }

  function weeklyPlan() {
    try {
      return JSON.parse(localStorage.getItem(WEEK_STORE) || "null");
    } catch {
      return null;
    }
  }

  function attachments() {
    try {
      return JSON.parse(localStorage.getItem(ATTACHMENT_STORE) || "[]");
    } catch {
      return [];
    }
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    addProductionNavigation();
    window.addEventListener("hashchange", handleRoute);

    new MutationObserver(() => {
      const route = location.hash.replace("#", "") || "dashboard";
      if (route === "production" && !$("#v75Production")) renderProduction();
      if (route === "lesson-plans") setTimeout(injectPlanningProductionCard, 0);
      if (route === "dashboard") setTimeout(injectDashboardProductionCard, 0);
      if (route === "teachday") setTimeout(injectTeachDayPacket, 0);
      if (route === "health") setTimeout(injectHealthChecks, 0);
    }).observe($("#pageHost"), { childList: true, subtree: true });

    handleRoute();
  }

  function addProductionNavigation() {
    if ($('[data-route="production"]')) return;

    const lessonPlans = $('[data-route="lesson-plans"]');
    const button = document.createElement("button");
    button.className = "nav-button";
    button.dataset.route = "production";
    button.innerHTML = "<span>▤</span><strong>Daily Lesson Packets</strong>";
    button.addEventListener("click", () => location.hash = "production");

    if (lessonPlans) lessonPlans.insertAdjacentElement("afterend", button);
    else $("#mainNav").appendChild(button);
  }

  function handleRoute() {
    const route = location.hash.replace("#", "") || "dashboard";
    if (route === "production") setTimeout(renderProduction, 0);
    if (route === "lesson-plans") setTimeout(injectPlanningProductionCard, 0);
    if (route === "dashboard") setTimeout(injectDashboardProductionCard, 0);
    if (route === "teachday") setTimeout(injectTeachDayPacket, 0);
    if (route === "health") setTimeout(injectHealthChecks, 0);
  }

  function renderProduction() {
    const host = $("#pageHost");
    if (!host) return;

    const week = weeklyPlan();
    if (!week?.days) {
      host.innerHTML = `
        <section id="v75Production">
          <section class="page-header">
            <div>
              <p>VERSION 7.5</p>
              <h2>Daily Lesson Packets</h2>
              <span>A weekly plan is required before packets can be produced.</span>
            </div>
            <button class="primary-button" id="v75OpenPlanning">Open Weekly Planning</button>
          </section>
          <div class="empty-state">
            <strong>No Version 7.3 weekly plan was found.</strong>
            <p>Build Monday through Friday in Weekly Planning, then return here.</p>
          </div>
        </section>`;
      $("#v75OpenPlanning")?.addEventListener("click", () => location.hash = "lesson-plans");
      return;
    }

    if (!week.days[selectedDay]) selectedDay = Object.keys(week.days)[0];
    const day = week.days[selectedDay];
    const dayAttachments = attachments().filter(item => item.day === selectedDay);
    const readiness = calculateReadiness(day, dayAttachments);
    const planbookText = buildPlanbookText(day, dayAttachments);

    host.innerHTML = `
      <section id="v75Production" class="${packetState.compactView ? "compact-production" : ""}">
        <section class="page-header">
          <div>
            <p>VERSION 7.5</p>
            <h2>Planbook Export & Daily Lesson Packets</h2>
            <span>Produce a classroom-ready packet from Weekly Planning and Lesson Attachments.</span>
          </div>
          <div class="button-row">
            <button id="v75CompactToggle" class="secondary-button">${packetState.compactView ? "Standard View" : "Compact iPad View"}</button>
            <button id="v75PrintPacket" class="primary-button">Print ${esc(selectedDay)} Packet</button>
          </div>
        </section>

        <nav class="v75-day-tabs">
          ${Object.keys(week.days).map(name => {
            const item = week.days[name];
            const result = calculateReadiness(item, attachments().filter(attachment => attachment.day === name));
            return `
              <button data-v75-day="${name}" class="${name === selectedDay ? "active" : ""}">
                <strong>${esc(name)}</strong>
                <span>${result.percent}% ready</span>
              </button>`;
          }).join("")}
        </nav>

        <section class="v75-readiness-strip">
          <article><span>DAY</span><strong>${esc(selectedDay)}</strong></article>
          <article><span>LESSON</span><strong>${esc(day.openCourtLesson || "Not selected")}</strong></article>
          <article><span>READINESS</span><strong>${readiness.percent}%</strong></article>
          <article class="${readiness.missing.length ? "warning" : "ready"}">
            <span>MISSING ITEMS</span><strong>${readiness.missing.length}</strong>
          </article>
        </section>

        <section class="v75-production-layout">
          <aside class="panel v75-production-sidebar">
            <h3>Packet Actions</h3>
            <button id="v75CopyPlanbook" class="primary-button">Copy Planbook Text</button>
            <button id="v75DownloadText" class="secondary-button">Download Text File</button>
            <button id="v75SendTeachDay" class="secondary-button">Send to Teach My Day</button>
            <button id="v75OpenAttachments" class="secondary-button">Open Attachments</button>
            <button id="v75OpenPlanning" class="secondary-button">Return to Weekly Planning</button>

            <h3>Ready-to-Teach Check</h3>
            <div class="v75-check-list">
              ${readiness.checks.map((check, index) => `
                <label class="${check.ok ? "complete" : ""}">
                  <input type="checkbox" data-v75-manual-check="${selectedDay}-${index}"
                    ${packetState.checks[`${selectedDay}-${index}`] || check.ok ? "checked" : ""}>
                  <span>${esc(check.label)}</span>
                </label>`).join("")}
            </div>
          </aside>

          <main class="v75-packet">
            <section class="v75-packet-title">
              <p>${esc(week.title || "Weekly Plan")} • ${esc(selectedDay)}</p>
              <h1>${esc(day.openCourtLesson || "Daily Lesson Packet")}</h1>
              <span>${esc(day.date || week.weekOf || "")} • Pillar: ${esc(week.pillar || "Heart")}</span>
            </section>

            ${packetSection("Daily Focus", `<p>${formatText(day.focus || day.launchRoutine || "Add the daily focus.")}</p>`)}
            ${packetSection("Standards & Objective", `
              <h4>Standards</h4><p>${formatText(day.standards || "Add standards.")}</p>
              <h4>Objective</h4><p>${formatText(day.objective || "Add the learning objective.")}</p>
            `)}
            ${packetSection("Instructional Release", `
              <div class="v75-release-grid">
                <article><h4>I Do</h4><p>${formatText(day.iDo || "Add teacher modeling.")}</p></article>
                <article><h4>We Do</h4><p>${formatText(day.weDo || "Add guided practice.")}</p></article>
                <article><h4>You Do</h4><p>${formatText(day.youDo || "Add independent practice.")}</p></article>
              </div>
            `)}
            ${packetSection("Daily Subject Blocks", renderSubjectBlocks(day))}
            ${packetSection("Small Groups & Differentiation", `
              <h4>Small Groups</h4><p>${formatText(day.smallGroups || "Add small-group plan.")}</p>
              <h4>Differentiation</h4><p>${formatText(day.differentiation || "Add EL, IEP, 504, and universal supports.")}</p>
            `)}
            ${packetSection("Assessment & Evidence", `<p>${formatText(day.assessment || "Add assessment or evidence.")}</p>`)}
            ${packetSection("Materials & Attachments", `
              <div class="v75-material-columns">
                <article><h4>Materials</h4><p>${formatText(day.materials || "No materials entered.")}</p></article>
                <article><h4>Attachments</h4>${renderAttachmentList(dayAttachments)}</article>
              </div>
            `)}
            ${packetSection("Teacher Notes", `
              <p>${formatText(day.notes || "No weekly-planning notes entered.")}</p>
              <textarea id="v75PacketNotes" placeholder="Additional packet notes...">${esc(packetState.packetNotes[selectedDay] || "")}</textarea>
              <button id="v75SavePacketNotes" class="secondary-button">Save Packet Notes</button>
            `)}
          </main>

          <aside class="panel v75-planbook-preview">
            <h3>Planbook Copy Preview</h3>
            <textarea id="v75PlanbookText" readonly>${esc(planbookText)}</textarea>
            ${readiness.missing.length ? `
              <div class="v75-missing-warning">
                <strong>Complete before teaching:</strong>
                <ul>${readiness.missing.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
              </div>` : `
              <div class="v75-ready-message"><strong>✓ Packet is ready to teach.</strong></div>`}
          </aside>
        </section>
      </section>
    `;

    wireProduction(day, dayAttachments, planbookText);
  }

  function packetSection(title, body) {
    return `<section class="v75-packet-section"><h3>${esc(title)}</h3>${body}</section>`;
  }

  function formatText(value) {
    return esc(value).replace(/\n/g, "<br>");
  }

  function renderSubjectBlocks(day) {
    return (config.planbookSubjects || []).map(([label, key]) => `
      <article class="v75-subject-block">
        <h4>${esc(label)}</h4>
        <p>${formatText(day[key] || "No plan entered.")}</p>
      </article>
    `).join("");
  }

  function renderAttachmentList(items) {
    if (!items.length) return "<p>No lesson attachments connected.</p>";
    return `<ul class="v75-attachment-list">${items.map(item => `
      <li>
        ${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>` : `<span>${esc(item.title)}</span>`}
        <small>${esc(item.category)} • ${esc(item.type)}${item.notes ? ` • ${esc(item.notes)}` : ""}</small>
      </li>`).join("")}</ul>`;
  }

  function calculateReadiness(day, dayAttachments) {
    const checks = (config.requiredDailyFields || []).map(([label, key]) => ({
      label,
      ok: Boolean(String(day[key] || "").trim())
    }));

    checks.push({
      label: "At least one subject block is planned",
      ok: (config.planbookSubjects || []).some(([, key]) => Boolean(String(day[key] || "").trim()))
    });
    checks.push({
      label: "Attachments reviewed",
      ok: dayAttachments.length > 0 && dayAttachments.every(item => Boolean(item.url?.trim()))
    });
    checks.push({
      label: "Day marked ready in Weekly Planning",
      ok: Boolean(day.complete)
    });

    const missing = checks.filter(check => !check.ok).map(check => check.label);
    const percent = Math.round((checks.filter(check => check.ok).length / checks.length) * 100);
    return { checks, missing, percent };
  }

  function buildPlanbookText(day, dayAttachments) {
    const lines = [
      `${selectedDay.toUpperCase()} — ${day.openCourtLesson || "DAILY LESSON"}`,
      "",
      `DAILY FOCUS`,
      day.focus || day.launchRoutine || "",
      "",
      `STANDARDS`,
      day.standards || "",
      "",
      `OBJECTIVE`,
      day.objective || "",
      "",
      `I DO`,
      day.iDo || "",
      "",
      `WE DO`,
      day.weDo || "",
      "",
      `YOU DO`,
      day.youDo || "",
      ""
    ];

    (config.planbookSubjects || []).forEach(([label, key]) => {
      lines.push(label.toUpperCase(), day[key] || "", "");
    });

    lines.push(
      "SMALL GROUPS",
      day.smallGroups || "",
      "",
      "DIFFERENTIATION",
      day.differentiation || "",
      "",
      "ASSESSMENT / EVIDENCE",
      day.assessment || "",
      "",
      "MATERIALS",
      day.materials || "",
      "",
      "ATTACHMENTS",
      dayAttachments.map(item => `${item.title}${item.url ? ` — ${item.url}` : " — LINK NEEDED"}`).join("\n"),
      "",
      "TEACHER NOTES",
      day.notes || ""
    );

    return lines.join("\n").trim();
  }

  function wireProduction(day, dayAttachments, planbookText) {
    $$("[data-v75-day]").forEach(button => {
      button.addEventListener("click", () => {
        selectedDay = button.dataset.v75Day;
        renderProduction();
      });
    });

    $$("[data-v75-manual-check]").forEach(input => {
      input.addEventListener("change", () => {
        packetState.checks[input.dataset.v75ManualCheck] = input.checked;
        savePacketState();
      });
    });

    $("#v75CompactToggle")?.addEventListener("click", () => {
      packetState.compactView = !packetState.compactView;
      savePacketState();
      renderProduction();
    });

    $("#v75PrintPacket")?.addEventListener("click", () => window.print());
    $("#v75OpenPlanning")?.addEventListener("click", () => location.hash = "lesson-plans");
    $("#v75OpenAttachments")?.addEventListener("click", () => location.hash = "attachments");
    $("#v75SendTeachDay")?.addEventListener("click", () => sendToTeachDay(day));
    $("#v75CopyPlanbook")?.addEventListener("click", () => copyPlanbook(planbookText));
    $("#v75DownloadText")?.addEventListener("click", () => downloadText(planbookText));

    $("#v75SavePacketNotes")?.addEventListener("click", () => {
      packetState.packetNotes[selectedDay] = $("#v75PacketNotes").value.trim();
      savePacketState();
      toast("Packet notes saved.");
    });
  }

  async function copyPlanbook(text) {
    try {
      await navigator.clipboard.writeText(text);
      packetState.lastExportedDay = selectedDay;
      savePacketState();
      toast(`${selectedDay} Planbook text copied.`);
    } catch {
      const field = $("#v75PlanbookText");
      field.select();
      document.execCommand("copy");
      toast(`${selectedDay} Planbook text copied.`);
    }
  }

  function downloadText(text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedDay.toLowerCase()}-planbook-lesson.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    packetState.lastExportedDay = selectedDay;
    savePacketState();
    toast("Planbook text downloaded.");
  }

  function sendToTeachDay(day) {
    const payload = {
      version: "7.5",
      sentAt: new Date().toISOString(),
      day: selectedDay,
      ...day
    };
    localStorage.setItem(TEACH_DAY_STORE, JSON.stringify(payload));
    toast(`${selectedDay} sent to Teach My Day.`);
    setTimeout(() => location.hash = "teachday", 500);
  }

  function injectPlanningProductionCard() {
    const studio = $("#v73PlanningStudio");
    if (!studio || $("#v75PlanningCard")) return;

    const week = weeklyPlan();
    if (!week?.days) return;

    const ready = Object.values(week.days).filter(day => {
      const result = calculateReadiness(day, attachments().filter(item => item.day === day.day));
      return result.percent >= 85;
    }).length;

    const card = document.createElement("section");
    card.id = "v75PlanningCard";
    card.className = "v75-planning-card";
    card.innerHTML = `
      <div>
        <p>DAILY LESSON PACKETS</p>
        <h3>${ready}/5 days production-ready</h3>
        <span>Generate Planbook text, packets, and ready-to-teach checks.</span>
      </div>
      <button id="v75OpenProduction">Open Production Studio</button>
    `;

    const header = $(".v73-planning-header", studio);
    header?.insertAdjacentElement("afterend", card);
    $("#v75OpenProduction")?.addEventListener("click", () => location.hash = "production");
  }

  function injectDashboardProductionCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v75DashboardCard")) return;

    const week = weeklyPlan();
    const days = week?.days ? Object.values(week.days) : [];
    const ready = days.filter(day => {
      const result = calculateReadiness(day, attachments().filter(item => item.day === day.day));
      return result.percent >= 85;
    }).length;

    const card = document.createElement("section");
    card.id = "v75DashboardCard";
    card.className = "v75-dashboard-card";
    card.innerHTML = `
      <div>
        <p>PLANBOOK & DAILY PACKETS</p>
        <h3>${ready}/${days.length || 5} days ready for production</h3>
        <span>${packetState.lastExportedDay ? `Last exported: ${esc(packetState.lastExportedDay)}` : "No Planbook day exported yet."}</span>
      </div>
      <button id="v75DashboardOpen">Open Daily Packets</button>
    `;
    dashboard.prepend(card);
    $("#v75DashboardOpen")?.addEventListener("click", () => location.hash = "production");
  }

  function injectTeachDayPacket() {
    const host = $("#pageHost");
    if (!host || $("#v75TeachDayPacket")) return;

    let day = null;
    try {
      day = JSON.parse(localStorage.getItem(TEACH_DAY_STORE) || "null");
    } catch {}
    if (!day) return;

    const header = $(".page-header", host);
    if (!header) return;

    const card = document.createElement("section");
    card.id = "v75TeachDayPacket";
    card.className = "v75-teachday-packet";
    card.innerHTML = `
      <div>
        <p>VERSION 7.5 PACKET</p>
        <h3>${esc(day.day)} production packet is active</h3>
        <span>${esc(day.openCourtLesson || day.focus || "")}</span>
      </div>
      <button id="v75ReturnPackets">Open Daily Packet</button>
    `;
    header.insertAdjacentElement("afterend", card);
    $("#v75ReturnPackets")?.addEventListener("click", () => {
      selectedDay = day.day || selectedDay;
      location.hash = "production";
    });
  }

  function injectHealthChecks() {
    const host = $("#pageHost");
    if (!host || $("#v75Health")) return;

    const week = weeklyPlan();
    const days = week?.days ? Object.values(week.days) : [];
    const noPlan = !week?.days;
    const missing = days.reduce((sum, day) => {
      return sum + calculateReadiness(day, attachments().filter(item => item.day === day.day)).missing.length;
    }, 0);

    const panel = document.createElement("section");
    panel.id = "v75Health";
    panel.className = "panel v75-health-panel";
    panel.innerHTML = `
      <h3>Version 7.5 Production Health</h3>
      <div class="health-grid">
        ${healthItem("Weekly plan detected", !noPlan, noPlan ? "Missing" : "Ready")}
        ${healthItem("Five planning days", days.length === 5, `${days.length}/5 found`)}
        ${healthItem("Missing daily content", missing === 0, `${missing} missing item(s)`)}
        ${healthItem("Planbook export support", Boolean(navigator.clipboard), "Clipboard and text download")}
      </div>
      <button id="v75HealthOpen" class="secondary-button">Open Daily Packets</button>
    `;
    host.appendChild(panel);
    $("#v75HealthOpen")?.addEventListener("click", () => location.hash = "production");
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>`;
  }

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();


/* Version 8.0 — Live Teaching Timeline & Assessment-Day Mode */
(() => {
  "use strict";

  const STATE_KEY = "thh-v80:live-teaching";
  const WEEK_KEY = "thh-v73:weekly-plan";
  const TEACH_DAY_KEY = "thh-v73:teach-day";
  const ATTACHMENT_KEY = "thh-v74:attachments";
  const PRINT_KEY = "thh-v74:print-center";

  let config = null;
  let state = {
    modeOverride: "",
    selectedBlock: "",
    completed: {},
    notes: {},
    timers: {},
    currentDate: "",
    autoAdvance: true
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => response.json());
      loadState();
      waitForShell();
      setInterval(updateLiveClock, 30000);
    } catch (error) {
      console.warn("Version 8.0 could not start.", error);
    }
  }

  function todayKey() {
    return new Date().toISOString().slice(0,10);
  }

  function loadState() {
    try {
      state = { ...state, ...JSON.parse(localStorage.getItem(STATE_KEY) || "{}") };
    } catch {}

    if (state.currentDate !== todayKey()) {
      state.completed = {};
      state.selectedBlock = "";
      state.currentDate = todayKey();
      saveState();
    }
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function weeklyPlan() {
    try {
      return JSON.parse(localStorage.getItem(WEEK_KEY) || "null");
    } catch {
      return null;
    }
  }

  function activeTeachDay() {
    try {
      return JSON.parse(localStorage.getItem(TEACH_DAY_KEY) || "null");
    } catch {
      return null;
    }
  }

  function attachments() {
    try {
      return JSON.parse(localStorage.getItem(ATTACHMENT_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function printCenter() {
    try {
      return JSON.parse(localStorage.getItem(PRINT_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    patchTeachDayLabel();
    addTimelineShortcut();
    window.addEventListener("hashchange", handleRoute);

    new MutationObserver(() => {
      const route = location.hash.replace("#","") || "dashboard";
      if (route === "teachday" && !$("#v80TeachDay")) renderLiveTeaching();
      if (route === "dashboard") setTimeout(injectDashboardLiveCard, 0);
      if (route === "health") setTimeout(injectHealthChecks, 0);
    }).observe($("#pageHost"), { childList: true, subtree: true });

    handleRoute();
  }

  function patchTeachDayLabel() {
    const button = $('[data-route="teachday"] strong');
    if (button) button.textContent = "Live Teaching";
  }

  function addTimelineShortcut() {
    const mobile = $("#mobileNav");
    const todayButton = $('[data-route="teachday"]', mobile);
    if (todayButton) todayButton.textContent = "Live";
  }

  function handleRoute() {
    const route = location.hash.replace("#","") || "dashboard";
    if (route === "teachday") setTimeout(renderLiveTeaching, 0);
    if (route === "dashboard") setTimeout(injectDashboardLiveCard, 0);
    if (route === "health") setTimeout(injectHealthChecks, 0);
  }

  function currentMode() {
    if (state.modeOverride) return state.modeOverride;
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return config.scheduleModeRules?.defaultWeekdays?.[weekday] || "full";
  }

  function schedule() {
    return currentMode() === "half"
      ? config.halfDaySchedule2026_2027
      : config.fullDaySchedule2026_2027;
  }

  function minutes(value) {
    const [hourText, minuteText] = value.split(":");
    let hour = Number(hourText);
    const minute = Number(minuteText);
    if (hour < 7) hour += 12;
    return hour * 60 + minute;
  }

  function currentMinute() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function activeBlockIndex(items = schedule()) {
    const now = currentMinute();
    const active = items.findIndex(([start,end]) => now >= minutes(start) && now < minutes(end));
    if (active >= 0) return active;

    const firstFuture = items.findIndex(([start]) => now < minutes(start));
    if (firstFuture >= 0) return firstFuture;
    return items.length - 1;
  }

  function selectedBlockIndex(items = schedule()) {
    if (state.selectedBlock) {
      const index = items.findIndex(item => item[3] === state.selectedBlock);
      if (index >= 0) return index;
    }
    return activeBlockIndex(items);
  }

  function activeDayPlan() {
    const direct = activeTeachDay();
    if (direct?.day) return direct;

    const week = weeklyPlan();
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
    return week?.days?.[weekday] || week?.days?.Monday || null;
  }

  function renderLiveTeaching() {
    const host = $("#pageHost");
    if (!host) return;

    const items = schedule();
    const index = selectedBlockIndex(items);
    const block = items[index];
    const next = items[index + 1] || null;
    const dayPlan = activeDayPlan();
    const dayName = dayPlan?.day || new Date().toLocaleDateString("en-US",{weekday:"long"});
    const dayAttachments = attachments().filter(item => item.day === dayName);
    const blockAttachments = filterAttachmentsForBlock(dayAttachments, block[3]);
    const printItems = printCenter().filter(item => item.day === dayName && !item.complete);
    const lessonText = blockLesson(dayPlan, block[3]);
    const resources = config.blockResources?.[block[3]] || [];
    const percent = Math.round((Object.values(state.completed).filter(Boolean).length / items.length) * 100);

    host.innerHTML = `
      <section id="v80TeachDay">
        <section class="page-header v80-live-header">
          <div>
            <p>VERSION 8.0 • ${currentMode() === "half" ? "ASSESSMENT DAY MODE" : "FULL DAY TEACHING MODE"}</p>
            <h2>${esc(dayName)} Live Teaching Timeline</h2>
            <span id="v80Clock">${new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</span>
          </div>
          <div class="v80-header-actions">
            <select id="v80ModeSelect">
              <option value="" ${!state.modeOverride ? "selected" : ""}>Automatic Mode</option>
              <option value="full" ${state.modeOverride === "full" ? "selected" : ""}>Full Day</option>
              <option value="half" ${state.modeOverride === "half" ? "selected" : ""}>Assessment Half Day</option>
            </select>
            <button id="v80ResetDay" class="secondary-button">Reset Day</button>
            <button id="v80PrintDay" class="primary-button">Print Timeline</button>
          </div>
        </section>

        <section class="v80-progress">
          <div><strong>${percent}%</strong><span>Day complete</span></div>
          <div class="v80-progress-track"><span style="width:${percent}%"></span></div>
          <label><input id="v80AutoAdvance" type="checkbox" ${state.autoAdvance ? "checked" : ""}> Auto-select current time block</label>
        </section>

        <section class="v80-live-layout">
          <aside class="panel v80-timeline">
            <div class="v80-timeline-heading">
              <h3>Teaching Timeline</h3>
              <span>${currentMode() === "half" ? "Half Day" : "Full Day"}</span>
            </div>
            <div class="v80-timeline-list">
              ${items.map((item, itemIndex) => timelineItem(item, itemIndex, index)).join("")}
            </div>
          </aside>

          <main class="v80-current-workspace">
            <section class="v80-now-card">
              <div>
                <p>NOW TEACHING</p>
                <h1>${esc(block[2])}</h1>
                <span>${esc(block[0])}–${esc(block[1])}</span>
              </div>
              <button id="v80CompleteCurrent" class="primary-button">
                ${state.completed[block[3]] ? "✓ Complete" : "Mark Complete"}
              </button>
            </section>

            <section class="v80-block-grid">
              <article class="panel">
                <h3>Today's Lesson</h3>
                <p>${formatText(lessonText || "No lesson content has been connected to this block.")}</p>
                <div class="v80-block-actions">
                  <button data-v80-route="production" class="secondary-button">Open Daily Packet</button>
                  <button data-v80-route="lesson-plans" class="secondary-button">Open Weekly Plan</button>
                </div>
              </article>

              <article class="panel">
                <h3>Block Resources</h3>
                <div class="v80-resource-tags">
                  ${resources.map(resource => `<span>${esc(resource)}</span>`).join("") || "<span>No mapped resources</span>"}
                </div>
                <div class="v80-block-actions">
                  <button data-v80-route="attachments" class="secondary-button">Open Attachments</button>
                  <button data-v80-route="resources" class="secondary-button">Open Resources</button>
                </div>
              </article>

              <article class="panel">
                <h3>Connected Attachments</h3>
                ${renderAttachments(blockAttachments)}
              </article>

              <article class="panel">
                <h3>Print & Preparation</h3>
                ${printItems.length
                  ? `<ul>${printItems.slice(0,8).map(item => `<li>${esc(item.title)}</li>`).join("")}</ul>`
                  : "<p>No remaining print tasks for this day.</p>"}
                <button data-v80-route="forms" class="secondary-button">Open Print Center</button>
              </article>
            </section>

            <section class="panel v80-live-notes">
              <div class="v80-note-heading">
                <h3>Live Teaching Notes</h3>
                <button id="v80SaveNotes" class="secondary-button">Save Notes</button>
              </div>
              <textarea id="v80Notes" placeholder="Student responses, changes, reteach needs, behavior patterns, and reminders...">${esc(state.notes[block[3]] || "")}</textarea>
            </section>

            <section class="v80-next-card">
              <div>
                <span>NEXT</span>
                <strong>${next ? `${next[0]}–${next[1]} ${next[2]}` : "End of teaching day"}</strong>
              </div>
              ${next ? `<button id="v80GoNext" class="secondary-button">Open Next Block</button>` : ""}
            </section>
          </main>
        </section>
      </section>
    `;

    wireLiveTeaching(items, index, block);
  }

  function timelineItem(item, itemIndex, selectedIndex) {
    const complete = Boolean(state.completed[item[3]]);
    const current = itemIndex === activeBlockIndex();
    const selected = itemIndex === selectedIndex;
    return `
      <button data-v80-block="${item[3]}" class="${complete ? "complete" : ""} ${current ? "current" : ""} ${selected ? "selected" : ""}">
        <span>${complete ? "✓" : current ? "▶" : "○"}</span>
        <div>
          <strong>${esc(item[2])}</strong>
          <small>${esc(item[0])}–${esc(item[1])}</small>
        </div>
      </button>`;
  }

  function blockLesson(day, key) {
    if (!day) return "";

    const map = {
      breakfast: "Attendance, breakfast count, student check-in, and morning reminders.",
      morningWork: day.morningWork || day.launchRoutine,
      mowr: day.mowr || day.smallGroups,
      heggerty: day.heggerty,
      phonics: day.phonics,
      vocabulary: day.vocabulary,
      reading: day.reading || day.openCourtLesson,
      writing: day.writing,
      math: day.math,
      workout: "Daily workout, equipment, safety, hydration, and heat considerations.",
      math2: day.math2 || day.math,
      science: day.science,
      socialStudies: day.socialStudies,
      packup: "Classroom jobs, homework, clean-up, bus preparation, and dismissal checks.",
      dismissal: "Dismissal and student release procedures.",
      phonicsTest: day.phonics || "Phonics assessment",
      vocabularyTest: day.vocabulary || "Vocabulary assessment",
      spellingTest: "Weekly spelling assessment",
      grammarTest: day.writing || "Grammar, Usage, and Mechanics assessment",
      readingTest: day.reading || day.openCourtLesson || "Reading assessment",
      mathTest: day.math || "Math assessment",
      scienceSocialTest: [day.science, day.socialStudies].filter(Boolean).join("\n") || "Science and Social Studies assessments",
      transition: "Make-up testing, restroom, movement, and preparation.",
      lunch: "Lunch and recess procedures.",
      lunchRecess: "Lunch recess procedures.",
      recess: "Recess expectations and return routine.",
      dismissalPrep: "Pack-up, end-of-day reflection, and dismissal preparation."
    };

    return map[key] || "";
  }

  function filterAttachmentsForBlock(items, key) {
    const categoryMap = {
      mowr: ["MOWR","UFLI"],
      heggerty: ["Heggerty"],
      phonics: ["Open Court","UFLI"],
      vocabulary: ["Open Court"],
      reading: ["Open Court","Assessment"],
      writing: ["Writing / GUM"],
      math: ["Eureka Math²"],
      math2: ["Eureka Math²"],
      science: ["Science"],
      socialStudies: ["Social Studies"],
      phonicsTest: ["Assessment","Open Court"],
      vocabularyTest: ["Assessment","Open Court"],
      spellingTest: ["Assessment","Open Court"],
      grammarTest: ["Assessment","Writing / GUM"],
      readingTest: ["Assessment","Open Court"],
      mathTest: ["Assessment","Eureka Math²"],
      scienceSocialTest: ["Assessment","Science","Social Studies"]
    };

    const categories = categoryMap[key] || [];
    return items.filter(item => categories.includes(item.category));
  }

  function renderAttachments(items) {
    if (!items.length) {
      return `<p>No attachments are linked specifically to this block.</p>
        <button data-v80-route="attachments" class="secondary-button">Link Resources</button>`;
    }

    return `<ul class="v80-attachment-list">${items.map(item => `
      <li>
        ${item.url
          ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>`
          : `<span>${esc(item.title)} — link needed</span>`}
        <small>${esc(item.category)} • ${esc(item.type)}</small>
      </li>`).join("")}</ul>`;
  }

  function formatText(value) {
    return esc(value).replace(/\n/g, "<br>");
  }

  function wireLiveTeaching(items, index, block) {
    $$("[data-v80-block]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedBlock = button.dataset.v80Block;
        state.autoAdvance = false;
        saveState();
        renderLiveTeaching();
      });
    });

    $$("[data-v80-route]").forEach(button => {
      button.addEventListener("click", () => location.hash = button.dataset.v80Route);
    });

    $("#v80ModeSelect")?.addEventListener("change", event => {
      state.modeOverride = event.target.value;
      state.selectedBlock = "";
      saveState();
      renderLiveTeaching();
    });

    $("#v80AutoAdvance")?.addEventListener("change", event => {
      state.autoAdvance = event.target.checked;
      if (state.autoAdvance) state.selectedBlock = "";
      saveState();
      renderLiveTeaching();
    });

    $("#v80CompleteCurrent")?.addEventListener("click", () => {
      state.completed[block[3]] = !state.completed[block[3]];
      saveState();

      if (state.completed[block[3]] && items[index + 1]) {
        state.selectedBlock = items[index + 1][3];
        saveState();
      }
      renderLiveTeaching();
    });

    $("#v80GoNext")?.addEventListener("click", () => {
      if (!items[index + 1]) return;
      state.selectedBlock = items[index + 1][3];
      state.autoAdvance = false;
      saveState();
      renderLiveTeaching();
    });

    $("#v80SaveNotes")?.addEventListener("click", () => {
      state.notes[block[3]] = $("#v80Notes").value.trim();
      saveState();
      toast("Live teaching notes saved.");
    });

    $("#v80ResetDay")?.addEventListener("click", () => {
      if (!confirm("Reset today's completed blocks and selected block?")) return;
      state.completed = {};
      state.selectedBlock = "";
      state.notes = {};
      saveState();
      renderLiveTeaching();
    });

    $("#v80PrintDay")?.addEventListener("click", () => window.print());
  }

  function updateLiveClock() {
    const clock = $("#v80Clock");
    if (clock) {
      clock.textContent = new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});
    }

    if (location.hash === "#teachday" && state.autoAdvance) {
      const items = schedule();
      const active = items[activeBlockIndex(items)];
      if (active && state.selectedBlock !== active[3]) {
        state.selectedBlock = "";
        saveState();
        renderLiveTeaching();
      }
    }
  }

  function injectDashboardLiveCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v80DashboardLive")) return;

    const items = schedule();
    const block = items[activeBlockIndex(items)];
    const next = items[activeBlockIndex(items) + 1];
    const card = document.createElement("section");
    card.id = "v80DashboardLive";
    card.className = "v80-dashboard-live";
    card.innerHTML = `
      <div>
        <p>${currentMode() === "half" ? "ASSESSMENT DAY MODE" : "LIVE TEACHING MODE"}</p>
        <h3>Now: ${esc(block?.[2] || "Teaching day complete")}</h3>
        <span>${next ? `Next: ${esc(next[0])} ${esc(next[2])}` : "No additional blocks scheduled."}</span>
      </div>
      <button id="v80OpenLive">Open Live Teaching</button>
    `;
    dashboard.prepend(card);
    $("#v80OpenLive")?.addEventListener("click", () => location.hash = "teachday");
  }

  function injectHealthChecks() {
    const host = $("#pageHost");
    if (!host || $("#v80Health")) return;

    const full = config.fullDaySchedule2026_2027 || [];
    const half = config.halfDaySchedule2026_2027 || [];
    const plan = activeDayPlan();

    const panel = document.createElement("section");
    panel.id = "v80Health";
    panel.className = "panel v80-health-panel";
    panel.innerHTML = `
      <h3>Version 8.0 Live Teaching Health</h3>
      <div class="health-grid">
        ${healthItem("Full-day schedule", full.length === 18, `${full.length} blocks`)}
        ${healthItem("Half-day schedule", half.length === 13, `${half.length} blocks`)}
        ${healthItem("Current daily plan", Boolean(plan), plan ? "Connected" : "Missing")}
        ${healthItem("Schedule mode", true, currentMode() === "half" ? "Assessment Half Day" : "Full Day")}
      </div>
      <button id="v80HealthOpen" class="secondary-button">Open Live Teaching</button>
    `;
    host.appendChild(panel);
    $("#v80HealthOpen")?.addEventListener("click", () => location.hash = "teachday");
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>`;
  }

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
