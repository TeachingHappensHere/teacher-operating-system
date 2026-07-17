
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
    const registered = (config.routeRegistryV13 || []).some(item => item.id === route);
    renderRoute(registered ? route : (config.frameworkV13?.fallbackRoute || "dashboard"));
  }

  function renderRoute(route) {
    state.route = route;
    saveState();
    $$(".nav-button").forEach(button => button.classList.toggle("active", button.dataset.route === route));
    $$("#mobileNav [data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === route));

    const renderers = {
      dashboard: renderDashboard,
      teachday: () => {
        $("#pageHost").innerHTML = `
          <section id="v120RouteLoading" class="v120-route-loading">
            <strong>Opening Live Teaching Center…</strong>
          </section>`;
      },
      "lesson-builder": renderLessonBuilder,
      "classroom-launch": renderClassroomLaunch,
      "lesson-plans": renderLessonPlans,
      "small-groups": () => {
        if (typeof window.THH_RENDER_SMALL_GROUPS === "function") {
          window.THH_RENDER_SMALL_GROUPS();
          return;
        }

        renderFeatureLoading("Small Groups");

        let attempts = 0;
        const waitForSmallGroups = window.setInterval(() => {
          attempts += 1;

          if (location.hash.replace("#", "") !== "small-groups") {
            window.clearInterval(waitForSmallGroups);
            return;
          }

          if (typeof window.THH_RENDER_SMALL_GROUPS === "function") {
            window.clearInterval(waitForSmallGroups);
            window.THH_RENDER_SMALL_GROUPS();
            return;
          }

          if (attempts >= 50) {
            window.clearInterval(waitForSmallGroups);
            $("#pageHost").innerHTML = `
              <section class="v150-module-error">
                <strong>Small Groups did not finish loading.</strong>
                <span>Refresh the page once or open Health for diagnostics.</span>
              </section>`;
          }
        }, 100);
      },
      intervention: () => {
        if (typeof window.THH_RENDER_INTERVENTION === "function") {
          window.THH_RENDER_INTERVENTION();
          return;
        }

        renderFeatureLoading("Intervention Center");

        let attempts = 0;
        const waitForModule = window.setInterval(() => {
          attempts += 1;

          if (location.hash.replace("#", "") !== "intervention") {
            window.clearInterval(waitForModule);
            return;
          }

          if (typeof window.THH_RENDER_INTERVENTION === "function") {
            window.clearInterval(waitForModule);
            window.THH_RENDER_INTERVENTION();
            return;
          }

          if (attempts >= 80) {
            window.clearInterval(waitForModule);
            $("#pageHost").innerHTML = `
              <section class="v150-module-error">
                <strong>Intervention Center did not finish loading.</strong>
                <span>Open Health for diagnostics or refresh the page once.</span>
              </section>`;
          }
        }, 100);
      },
      assessments: () => {
        if (typeof window.THH_RENDER_ASSESSMENTS === "function") {
          window.THH_RENDER_ASSESSMENTS();
          return;
        }

        renderFeatureLoading("Assessments & Progress Monitoring");

        let attempts = 0;
        const waitForModule = window.setInterval(() => {
          attempts += 1;

          if (location.hash.replace("#", "") !== "assessments") {
            window.clearInterval(waitForModule);
            return;
          }

          if (typeof window.THH_RENDER_ASSESSMENTS === "function") {
            window.clearInterval(waitForModule);
            window.THH_RENDER_ASSESSMENTS();
            return;
          }

          if (attempts >= 80) {
            window.clearInterval(waitForModule);
            $("#pageHost").innerHTML = `
              <section class="v150-module-error">
                <strong>Assessments & Progress Monitoring did not finish loading.</strong>
                <span>Open Health for diagnostics or refresh the page once.</span>
              </section>`;
          }
        }, 100);
      },
      "classroom-systems": renderClassroomSystems,
      students: () => {
        if (typeof window.THH_RENDER_STUDENT_DATA === "function") {
          window.THH_RENDER_STUDENT_DATA();
          return;
        }

        renderFeatureLoading("Student Data & Support Center");

        let attempts = 0;
        const waitForModule = window.setInterval(() => {
          attempts += 1;

          if (location.hash.replace("#", "") !== "students") {
            window.clearInterval(waitForModule);
            return;
          }

          if (typeof window.THH_RENDER_STUDENT_DATA === "function") {
            window.clearInterval(waitForModule);
            window.THH_RENDER_STUDENT_DATA();
            return;
          }

          if (attempts >= 80) {
            window.clearInterval(waitForModule);
            $("#pageHost").innerHTML = `
              <section class="v150-module-error">
                <strong>Student Data & Support Center did not finish loading.</strong>
                <span>Open Health for diagnostics or refresh the page once.</span>
              </section>`;
          }
        }, 100);
      },
      communication: () => {
        if (typeof window.THH_RENDER_COMMUNICATION === "function") {
          window.THH_RENDER_COMMUNICATION();
          return;
        }

        renderFeatureLoading("Family Communication Studio");

        let attempts = 0;
        const waitForModule = window.setInterval(() => {
          attempts += 1;

          if (location.hash.replace("#", "") !== "communication") {
            window.clearInterval(waitForModule);
            return;
          }

          if (typeof window.THH_RENDER_COMMUNICATION === "function") {
            window.clearInterval(waitForModule);
            window.THH_RENDER_COMMUNICATION();
            return;
          }

          if (attempts >= 80) {
            window.clearInterval(waitForModule);
            $("#pageHost").innerHTML = `
              <section class="v150-module-error">
                <strong>Family Communication Studio did not finish loading.</strong>
                <span>Open Health for diagnostics or refresh the page once.</span>
              </section>`;
          }
        }, 100);
      },
      calendar: renderCalendar,
      resources: renderResources,
      forms: renderForms,
      "teacher-brain": renderTeacherBrain,
      health: renderHealth,
      settings: renderSettings,
      "live-workspace": () => renderFeatureLoading("Live Workspace"),
      "intelligence-engine": () => {
        if (typeof window.THH_RENDER_TEACHER_INTELLIGENCE === "function") {
          window.THH_RENDER_TEACHER_INTELLIGENCE();
          return;
        }

        renderFeatureLoading("Teacher Intelligence");

        let attempts = 0;
        const waitForTeacherIntelligence = window.setInterval(() => {
          attempts += 1;

          if (location.hash.replace("#", "") !== "intelligence-engine") {
            window.clearInterval(waitForTeacherIntelligence);
            return;
          }

          if (typeof window.THH_RENDER_TEACHER_INTELLIGENCE === "function") {
            window.clearInterval(waitForTeacherIntelligence);
            window.THH_RENDER_TEACHER_INTELLIGENCE();
            return;
          }

          if (attempts >= 80) {
            window.clearInterval(waitForTeacherIntelligence);
            $("#pageHost").innerHTML = `
              <section class="v150-module-error">
                <strong>Teacher Intelligence did not finish loading.</strong>
                <span>Refresh once or open Health for diagnostics.</span>
              </section>`;
          }
        }, 100);
      },
      "workflow-hub": () => renderFeatureLoading("Workflow Hub"),
      production: () => renderFeatureLoading("Daily Lesson Packets"),
      "first-week-builder": () => renderFeatureLoading("First-Week Builder"),
      "curriculum-week-1": () => renderFeatureLoading("Curriculum Week 1"),
      "open-court": () => renderFeatureLoading("Open Court Curriculum"),
      "eureka-math": () => renderFeatureLoading("Eureka Math²"),
      "afternoon-studios": () => renderFeatureLoading("Writing, Science & Social Studies"),
      attachments: () => renderFeatureLoading("Lesson Attachments"),
      "print-center": () => {
        if (typeof window.THH_RENDER_PRINT_CENTER === "function") {
          window.THH_RENDER_PRINT_CENTER();
        } else {
          renderFeatureLoading("Print Center");
          window.setTimeout(() => {
            if (location.hash.replace("#", "") === "print-center" &&
                typeof window.THH_RENDER_PRINT_CENTER === "function") {
              window.THH_RENDER_PRINT_CENTER();
            }
          }, 100);
        }
      },
      "school-year-settings": () => renderFeatureLoading("School-Year Dates")
    };

    (renderers[route] || renderDashboard)();
    $("#pageHost").focus({ preventScroll: true });
  }

  function renderFeatureLoading(title) {
    $("#pageHost").innerHTML = `
      <section class="v130-route-loading" data-feature-loading="${esc(title)}">
        <div class="v130-loading-mark">●</div>
        <strong>Opening ${esc(title)}…</strong>
        <span>The application framework is connecting the dedicated module.</span>
      </section>`;
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
    if (typeof window.THH_RENDER_ASSESSMENTS === "function") {
      window.THH_RENDER_ASSESSMENTS();
      return;
    }

    renderFeatureLoading("Assessments & Progress Monitoring");

    let attempts = 0;
    const waitForAssessmentModule = window.setInterval(() => {
      attempts += 1;

      if (location.hash.replace("#", "") !== "assessments") {
        window.clearInterval(waitForAssessmentModule);
        return;
      }

      if (typeof window.THH_RENDER_ASSESSMENTS === "function") {
        window.clearInterval(waitForAssessmentModule);
        window.THH_RENDER_ASSESSMENTS();
        return;
      }

      if (attempts >= 50) {
        window.clearInterval(waitForAssessmentModule);
        $("#pageHost").innerHTML = `
          <section class="v150-module-error">
            <strong>Assessments module did not finish loading.</strong>
            <span>Refresh the page once. If this continues, open Health for diagnostics.</span>
          </section>`;
      }
    }, 100);
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
      ${pageHeader("FORMS & PRINTABLES", "Forms & Printables", "Classroom forms, student support pages, routines, and planning sheets.")}
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
