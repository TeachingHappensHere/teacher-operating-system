
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




/* Version 8.1 — Open Court Curriculum Intelligence */
(()=>{"use strict";
const KEY="thh-v81:open-court",WEEK="thh-v73:weekly-plan",ATT="thh-v74:attachments";
let cfg,state={unit:1,lesson:1,paths:{},ready:{},notes:{},results:[]};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
async function start(){cfg=await fetch("tos-data.json",{cache:"no-store"}).then(r=>r.json());try{state={...state,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{};wait()}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function wait(){if(!$("#pageHost")||!$("#mainNav"))return setTimeout(wait,100);nav();window.addEventListener("hashchange",route);new MutationObserver(route).observe($("#pageHost"),{childList:true,subtree:true});route()}
function nav(){if($('[data-route="open-court"]'))return;const b=document.createElement("button");b.className="nav-button";b.dataset.route="open-court";b.innerHTML="<span>📚</span><strong>Open Court Curriculum</strong>";b.onclick=()=>location.hash="open-court";const a=$('[data-route="lesson-builder"]');a?a.insertAdjacentElement("afterend",b):$("#mainNav").appendChild(b)}
function route(){const r=location.hash.replace("#","")||"dashboard";if(r==="open-court"&&!$("#v81"))setTimeout(render,0);if(r==="dashboard")setTimeout(dash,0);if(r==="lesson-plans")setTimeout(planCard,0);if(r==="health")setTimeout(health,0)}
function unit(){return cfg.openCourtUnits.find(x=>x.unit===Number(state.unit))||cfg.openCourtUnits[0]}
function lesson(){return unit().lessons.find(x=>x.lesson===Number(state.lesson))||unit().lessons[0]}
function key(x){return `u${state.unit}-l${state.lesson}-${x}`}
function render(){const h=$("#pageHost"),u=unit(),l=lesson();h.innerHTML=`<section id="v81">
<section class="page-header"><div><p>VERSION 8.1</p><h2>Open Court Curriculum Intelligence</h2><span>Six units, Skills Practice, assessments, fluency, answer keys, and Friday mode.</span></div><div class="button-row"><button id="sendPlan" class="secondary-button">Send to Weekly Planning</button><button id="friday" class="primary-button">Friday Assessment Mode</button></div></section>
<nav class="v81-units">${cfg.openCourtUnits.map(x=>`<button data-u="${x.unit}" class="${x.unit===Number(state.unit)?"active":""}">Unit ${x.unit}</button>`).join("")}</nav>
<section class="v81-layout">
<aside class="panel v81-lessons"><h3>Unit ${u.unit}</h3>${u.lessons.map(x=>`<button data-l="${x.lesson}" class="${x.lesson===Number(state.lesson)?"active":""}"><span>Lesson ${x.lesson}</span><strong>${esc(x.title)}</strong></button>`).join("")}</aside>
<main class="v81-main">
<section class="v81-hero"><div><p>UNIT ${u.unit} • LESSON ${l.lesson}</p><h1>${esc(l.title)}</h1><span>Skills Practice Book ${l.skillsPracticeBook} • Assessment Book ${l.assessmentBook}</span></div><b>Assessment p. ${l.assessmentStartPage}</b></section>
<section class="v81-resources">${cfg.openCourtResourceTypes.map(r=>resource(r,l)).join("")}</section>
<section class="panel"><h3>Authorized Source Paths</h3>${cfg.openCourtSourceFiles.map(s=>source(s)).join("")}<article class="v81-source"><div><strong>Unit ${u.unit} Assessment</strong><span>Starts on page ${u.unitAssessmentStartPage}</span></div></article></section>
<section class="panel"><h3>Lesson Notes</h3><textarea id="ocNotes">${esc(state.notes[`u${u.unit}-l${l.lesson}`]||"")}</textarea><button id="saveNotes" class="primary-button">Save Notes</button></section>
</main>
<aside class="panel v81-map"><h3>Assessment Map</h3>${["Phonics","Word Analysis","Vocabulary","Comprehension","Grammar, Usage & Mechanics","Analyzing the Selection","Writing","Oral Fluency","Unit Assessment"].map(x=>`<label><input type="checkbox" data-r="${esc(x)}" ${state.ready[key(x)]?"checked":""}><span>${esc(x)}</span></label>`).join("")}<button id="score" class="primary-button">Enter Score</button></aside>
</section></section>`;wire()}
function resource(r,l){const done=!!state.ready[key(r)];return `<article class="v81-card ${done?"done":""}"><span>${done?"✓ Ready":"Resource"}</span><h3>${esc(r)}</h3><p>${r.includes("Assessment")?`Assessment Book ${l.assessmentBook}, page ${l.assessmentStartPage}.`:"Skills Practice and lesson materials."}</p><div><button data-ready="${esc(r)}" class="secondary-button">${done?"Mark Not Ready":"Mark Ready"}</button><button data-link="${esc(r)}" class="primary-button">Add to Attachments</button></div></article>`}
function source(s){const p=state.paths[s.key]||"";return `<article class="v81-source"><div><strong>${esc(s.title)}</strong><span>Units ${esc(s.units)}</span></div><input data-path="${s.key}" value="${esc(p)}" placeholder="Authorized URL or GitHub path">${p?`<a href="${esc(p)}" target="_blank">Open</a>`:"<b>Path needed</b>"}</article>`}
function wire(){
$$("[data-u]").forEach(b=>b.onclick=()=>{state.unit=Number(b.dataset.u);state.lesson=1;save();render()});
$$("[data-l]").forEach(b=>b.onclick=()=>{state.lesson=Number(b.dataset.l);save();render()});
$$("[data-ready]").forEach(b=>b.onclick=()=>{state.ready[key(b.dataset.ready)]=!state.ready[key(b.dataset.ready)];save();render()});
$$("[data-r]").forEach(i=>i.onchange=()=>{state.ready[key(i.dataset.r)]=i.checked;save()});
$$("[data-path]").forEach(i=>i.onchange=()=>{state.paths[i.dataset.path]=i.value.trim();save();render()});
$$("[data-link]").forEach(b=>b.onclick=()=>addAttachment(b.dataset.link));
$("#saveNotes").onclick=()=>{state.notes[`u${state.unit}-l${state.lesson}`]=$("#ocNotes").value.trim();save();toast("Lesson notes saved.")};
$("#sendPlan").onclick=sendPlan;$("#friday").onclick=fridayMode;$("#score").onclick=score}
function addAttachment(name){let a=[];try{a=JSON.parse(localStorage.getItem(ATT)||"[]")}catch{};const l=lesson();if(!a.some(x=>x.lesson===`Unit ${state.unit}, Lesson ${state.lesson}`&&x.title===name))a.unshift({id:`oc-${Date.now()}`,day:"Monday",lesson:`Unit ${state.unit}, Lesson ${state.lesson}`,title:name,category:name.includes("Assessment")?"Assessment":"Open Court",type:name==="Answer Key"?"Teacher Guide":"Printable Page",url:"",notes:`${l.title} — ${name}`,print:name!=="Answer Key",copies:1,status:"Missing"});localStorage.setItem(ATT,JSON.stringify(a));toast("Added to Lesson Attachments.");setTimeout(()=>location.hash="attachments",500)}
function sendPlan(){let w;try{w=JSON.parse(localStorage.getItem(WEEK)||"null")}catch{};if(!w?.days)return toast("Build Weekly Planning first.");const d=prompt("Send to which day?","Monday");if(!d||!w.days[d])return;const l=lesson();w.days[d].openCourtLesson=`Unit ${state.unit}, Lesson ${state.lesson} — ${l.title}`;w.days[d].reading=l.title;w.days[d].assessment=`Assessment Book ${l.assessmentBook}, page ${l.assessmentStartPage}`;w.days[d].attachments=`Skills Practice Book ${l.skillsPracticeBook}: Unit ${state.unit}, Lesson ${state.lesson}\nAssessment Book ${l.assessmentBook}: page ${l.assessmentStartPage}${l.oralFluency?"\nOral Fluency Assessment":""}`;localStorage.setItem(WEEK,JSON.stringify(w));toast(`Sent to ${d}.`);setTimeout(()=>location.hash="lesson-plans",500)}
function fridayMode(){const l=lesson();localStorage.setItem("thh-v81:friday-assessment",JSON.stringify({unit:state.unit,lesson:state.lesson,title:l.title,assessmentBook:l.assessmentBook,assessmentStartPage:l.assessmentStartPage,oralFluency:l.oralFluency}));localStorage.setItem("thh-v80:live-teaching",JSON.stringify({modeOverride:"half",selectedBlock:"phonicsTest",completed:{},notes:{},currentDate:new Date().toISOString().slice(0,10),autoAdvance:false}));toast("Friday Assessment Mode prepared.");setTimeout(()=>location.hash="teachday",500)}
function score(){const skill=prompt("Skill:","Comprehension");if(!skill)return;const score=Number(prompt("Score percentage:","")||0);state.results.unshift({id:Date.now(),unit:state.unit,lesson:state.lesson,title:lesson().title,skill,score,date:new Date().toISOString()});save();toast("Score saved.")}
function dash(){const d=$("#v72Dashboard");if(!d||$("#v81Dash"))return;const l=lesson(),ready=cfg.openCourtResourceTypes.filter(x=>state.ready[key(x)]).length,c=document.createElement("section");c.id="v81Dash";c.className="v81-injected";c.innerHTML=`<div><p>OPEN COURT CURRICULUM</p><h3>Unit ${state.unit}, Lesson ${state.lesson}: ${esc(l.title)}</h3><span>${ready}/${cfg.openCourtResourceTypes.length} resource categories ready.</span></div><button>Open Curriculum</button>`;c.querySelector("button").onclick=()=>location.hash="open-court";d.prepend(c)}
function planCard(){const s=$("#v73PlanningStudio");if(!s||$("#v81Plan"))return;const l=lesson(),c=document.createElement("section");c.id="v81Plan";c.className="v81-injected";c.innerHTML=`<div><p>OPEN COURT MAP</p><h3>Selected: Unit ${state.unit}, Lesson ${state.lesson}</h3><span>${esc(l.title)}</span></div><button>Open Map</button>`;c.querySelector("button").onclick=()=>location.hash="open-court";$(".v73-planning-header",s)?.insertAdjacentElement("afterend",c)}
function health(){const h=$("#pageHost");if(!h||$("#v81Health"))return;const paths=Object.values(state.paths).filter(Boolean).length,p=document.createElement("section");p.id="v81Health";p.className="panel";p.innerHTML=`<h3>Version 8.1 Open Court Health</h3><div class="health-grid">${hi("Units",cfg.openCourtUnits.length===6,`${cfg.openCourtUnits.length}/6`)}${hi("Lessons",cfg.openCourtUnits.flatMap(x=>x.lessons).length===36,"36/36")}${hi("Source paths",paths>=4,`${paths}/4 linked`)}${hi("Stored results",true,`${state.results.length}`)}</div><button class="secondary-button">Open Curriculum</button>`;p.querySelector("button").onclick=()=>location.hash="open-court";h.appendChild(p)}
function hi(t,o,d){return `<article class="${o?"ready":"missing"}"><strong>${o?"✓":"!"}</strong><div><span>${t}</span><small>${d}</small></div></article>`}
function toast(m){const t=$("#toast");if(!t)return;t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();

/* Version 8.2 — Eureka Math² Daily Math Studio & Module 1 Integration */
(() => {
  "use strict";

  const STATE_KEY = "thh-v82:eureka-math";
  const WEEK_KEY = "thh-v73:weekly-plan";
  const ATTACHMENT_KEY = "thh-v74:attachments";
  const TEACH_DAY_KEY = "thh-v73:teach-day";

  let config = null;
  let state = {
    selectedModule: 1,
    selectedLesson: 1,
    lessons: {},
    assessmentResults: [],
    moduleNotes: {},
    portalLinks: {}
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => response.json());
      try {
        state = { ...state, ...JSON.parse(localStorage.getItem(STATE_KEY) || "{}") };
      } catch {}
      ensureLesson();
      waitForShell();
    } catch (error) {
      console.warn("Version 8.2 could not start.", error);
    }
  }

  function save() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function lessonKey(module = state.selectedModule, lesson = state.selectedLesson) {
    return `m${module}-l${lesson}`;
  }

  function blankLesson(module, lesson) {
    return {
      module,
      lesson,
      title: `Module ${module}, Lesson ${lesson}`,
      objective: "",
      standards: "",
      fluency: "",
      applicationProblem: "",
      conceptDevelopment: "",
      studentDebrief: "",
      exitTicket: "",
      homework: "",
      materials: "",
      teacherNotes: "",
      math2Focus: "Spiral Review",
      math2Plan: "",
      intervention: "",
      enrichment: "",
      assessmentType: "Exit Ticket",
      complete: false
    };
  }

  function ensureLesson() {
    const key = lessonKey();
    if (!state.lessons[key]) state.lessons[key] = blankLesson(state.selectedModule, state.selectedLesson);
    save();
  }

  function currentLesson() {
    ensureLesson();
    return state.lessons[lessonKey()];
  }

  function weeklyPlan() {
    try {
      return JSON.parse(localStorage.getItem(WEEK_KEY) || "null");
    } catch {
      return null;
    }
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    addNavigation();
    window.addEventListener("hashchange", route);

    new MutationObserver(() => {
      const current = location.hash.replace("#","") || "dashboard";
      if (current === "eureka-math" && !$("#v82MathStudio")) renderMathStudio();
      if (current === "lesson-plans") setTimeout(injectWeeklyMathCard, 0);
      if (current === "teachday") setTimeout(injectTeachDayMathCard, 0);
      if (current === "assessments") setTimeout(injectAssessmentCard, 0);
      if (current === "dashboard") setTimeout(injectDashboardCard, 0);
      if (current === "health") setTimeout(injectHealth, 0);
    }).observe($("#pageHost"), { childList: true, subtree: true });

    route();
  }

  function addNavigation() {
    if ($('[data-route="eureka-math"]')) return;

    const openCourt = $('[data-route="open-court"]');
    const button = document.createElement("button");
    button.className = "nav-button";
    button.dataset.route = "eureka-math";
    button.innerHTML = "<span>➗</span><strong>Eureka Math²</strong>";
    button.addEventListener("click", () => location.hash = "eureka-math");

    if (openCourt) openCourt.insertAdjacentElement("afterend", button);
    else $("#mainNav").appendChild(button);
  }

  function route() {
    const current = location.hash.replace("#","") || "dashboard";
    if (current === "eureka-math") setTimeout(renderMathStudio, 0);
    if (current === "lesson-plans") setTimeout(injectWeeklyMathCard, 0);
    if (current === "teachday") setTimeout(injectTeachDayMathCard, 0);
    if (current === "assessments") setTimeout(injectAssessmentCard, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "health") setTimeout(injectHealth, 0);
  }

  function portalUrl(module = state.selectedModule) {
    const explicit = state.portalLinks[`module-${module}`];
    if (explicit) return explicit;
    return `https://digital.greatminds.org/teacher?curriculaCode=em2&gradeCode=em2.g2&moduleCode=em2.g2.m${module}`;
  }

  function renderMathStudio() {
    const host = $("#pageHost");
    if (!host) return;

    const lesson = currentLesson();
    const module = config.eurekaMath.modules.find(item => item.module === Number(state.selectedModule))
      || config.eurekaMath.modules[0];

    host.innerHTML = `
      <section id="v82MathStudio">
        <section class="page-header">
          <div>
            <p>VERSION 8.2</p>
            <h2>Eureka Math² Daily Math Studio</h2>
            <span>Plan the 60-minute math lesson, the 20-minute Math 2 block, exit tickets, and differentiated support.</span>
          </div>
          <div class="button-row">
            <a href="${esc(portalUrl())}" target="_blank" rel="noopener" class="secondary-button">Open Great Minds Portal</a>
            <button id="v82SendPlanning" class="primary-button">Send to Weekly Planning</button>
          </div>
        </section>

        <nav class="v82-module-tabs">
          ${config.eurekaMath.modules.map(item => `
            <button data-v82-module="${item.module}" class="${item.module === Number(state.selectedModule) ? "active" : ""}">
              <strong>Module ${item.module}</strong>
              <span>${esc(item.title)}</span>
            </button>`).join("")}
        </nav>

        <section class="v82-lesson-selector panel">
          <label>
            <span>Lesson Number</span>
            <input id="v82LessonNumber" type="number" min="1" max="60" value="${esc(state.selectedLesson)}">
          </label>
          <label class="wide">
            <span>Lesson Title</span>
            <input data-v82-field="title" value="${esc(lesson.title)}">
          </label>
          <label>
            <span>Status</span>
            <select id="v82LessonStatus">
              <option ${!lesson.complete ? "selected" : ""}>In Progress</option>
              <option ${lesson.complete ? "selected" : ""}>Ready to Teach</option>
            </select>
          </label>
          <button id="v82LoadLesson" class="secondary-button">Load Lesson</button>
        </section>

        <section class="v82-layout">
          <aside class="panel v82-section-nav">
            <h3>Math Lesson Sections</h3>
            ${[
              ["overview","Overview"],
              ["fluency","Fluency"],
              ["application","Application Problem"],
              ["concept","Concept Development"],
              ["debrief","Student Debrief"],
              ["exit","Exit Ticket"],
              ["homework","Homework"],
              ["math2","Math 2"],
              ["support","Intervention & Enrichment"],
              ["assessment","Assessment"]
            ].map(([id,label]) => `<button data-v82-section="${id}">${esc(label)}</button>`).join("")}
          </aside>

          <main class="v82-main">
            ${section("overview","Lesson Overview",`
              <div class="v82-form-grid">
                ${textField("objective","Objective",lesson.objective,"wide")}
                ${textField("standards","Arizona Standards",lesson.standards,"wide")}
                ${textField("materials","Materials",lesson.materials)}
                ${textField("teacherNotes","Teacher Notes",lesson.teacherNotes)}
              </div>
            `)}

            ${section("fluency","Fluency",`
              <div class="v82-component">
                <span>Suggested time: 10 minutes</span>
                ${textArea("fluency","Fluency Practice",lesson.fluency)}
              </div>
            `)}

            ${section("application","Application Problem",`
              <div class="v82-component">
                <span>Suggested time: 10 minutes</span>
                ${textArea("applicationProblem","Application Problem",lesson.applicationProblem)}
              </div>
            `)}

            ${section("concept","Concept Development",`
              <div class="v82-component">
                <span>Suggested time: 25 minutes</span>
                ${textArea("conceptDevelopment","Concept Development",lesson.conceptDevelopment)}
              </div>
            `)}

            ${section("debrief","Student Debrief",`
              <div class="v82-component">
                <span>Suggested time: 10 minutes</span>
                ${textArea("studentDebrief","Debrief Questions and Discussion",lesson.studentDebrief)}
              </div>
            `)}

            ${section("exit","Exit Ticket",`
              <div class="v82-component">
                <span>Suggested time: 5 minutes</span>
                ${textArea("exitTicket","Exit Ticket / Evidence",lesson.exitTicket)}
                <button id="v82AddExitAttachment" class="secondary-button">Add Exit Ticket to Attachments</button>
              </div>
            `)}

            ${section("homework","Homework",`
              <div class="v82-component">
                ${textArea("homework","Homework / Family Practice",lesson.homework)}
              </div>
            `)}

            ${section("math2","Math 2 — 20-Minute Follow-Up",`
              <div class="v82-form-grid">
                <label><span>Math 2 Focus</span><select data-v82-field="math2Focus">
                  ${config.eurekaMath.math2Options.map(option => `
                    <option ${option === lesson.math2Focus ? "selected" : ""}>${esc(option)}</option>
                  `).join("")}
                </select></label>
                ${textArea("math2Plan","Math 2 Plan",lesson.math2Plan,"wide")}
              </div>
            `)}

            ${section("support","Intervention & Enrichment",`
              <div class="v82-form-grid">
                ${textArea("intervention","Intervention / Reteach",lesson.intervention)}
                ${textArea("enrichment","Enrichment / Extension",lesson.enrichment)}
              </div>
            `)}

            ${section("assessment","Assessment & Data",`
              <div class="v82-form-grid">
                <label><span>Assessment Type</span><select data-v82-field="assessmentType">
                  ${config.eurekaMath.assessmentTypes.map(option => `
                    <option ${option === lesson.assessmentType ? "selected" : ""}>${esc(option)}</option>
                  `).join("")}
                </select></label>
                <label><span>Class Average or Score %</span><input id="v82AssessmentScore" type="number" min="0" max="100"></label>
              </div>
              <div class="button-row">
                <button id="v82SaveAssessment" class="primary-button">Save Assessment Result</button>
                <button id="v82AddAssessmentAttachment" class="secondary-button">Add Assessment to Attachments</button>
              </div>
              <div class="v82-results">${renderResults()}</div>
            `)}
          </main>

          <aside class="panel v82-summary">
            <h3>Lesson Summary</h3>
            <article><span>Module</span><strong>${esc(module.module)}</strong></article>
            <article><span>Lesson</span><strong>${esc(state.selectedLesson)}</strong></article>
            <article><span>Main Math Block</span><strong>11:40–12:40</strong></article>
            <article><span>Math 2 Block</span><strong>1:20–1:40</strong></article>
            <article><span>Status</span><strong>${lesson.complete ? "Ready" : "In Progress"}</strong></article>
            <button id="v82PrintLesson" class="secondary-button">Print Math Lesson</button>
            <button id="v82SendTeachDay" class="primary-button">Send to Teach My Day</button>
          </aside>
        </section>
      </section>
    `;

    wireMathStudio();
  }

  function section(id, title, body) {
    return `<section id="v82-${id}" class="panel v82-section"><h3>${esc(title)}</h3>${body}</section>`;
  }

  function textField(key, label, value, className = "") {
    return `<label class="${className}"><span>${esc(label)}</span><input data-v82-field="${key}" value="${esc(value)}"></label>`;
  }

  function textArea(key, label, value, className = "") {
    return `<label class="${className}"><span>${esc(label)}</span><textarea data-v82-field="${key}">${esc(value)}</textarea></label>`;
  }

  function renderResults() {
    const results = state.assessmentResults.filter(item =>
      item.module === Number(state.selectedModule) &&
      item.lesson === Number(state.selectedLesson)
    );

    if (!results.length) return "<p>No assessment results saved for this lesson.</p>";

    return results.map(item => `
      <article>
        <strong>${esc(item.type)} — ${esc(item.score)}%</strong>
        <span>${new Date(item.date).toLocaleString()}</span>
      </article>`).join("");
  }

  function wireMathStudio() {
    $$("[data-v82-module]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedModule = Number(button.dataset.v82Module);
        state.selectedLesson = 1;
        ensureLesson();
        save();
        renderMathStudio();
      });
    });

    $$("[data-v82-section]").forEach(button => {
      button.addEventListener("click", () => {
        $(`#v82-${button.dataset.v82Section}`)?.scrollIntoView({behavior:"smooth",block:"start"});
      });
    });

    $$("[data-v82-field]").forEach(control => {
      control.addEventListener("input", () => {
        currentLesson()[control.dataset.v82Field] = control.value;
        save();
      });
      control.addEventListener("change", () => {
        currentLesson()[control.dataset.v82Field] = control.value;
        save();
      });
    });

    $("#v82LoadLesson")?.addEventListener("click", () => {
      state.selectedLesson = Math.max(1, Number($("#v82LessonNumber").value) || 1);
      ensureLesson();
      save();
      renderMathStudio();
    });

    $("#v82LessonStatus")?.addEventListener("change", event => {
      currentLesson().complete = event.target.value === "Ready to Teach";
      save();
      renderMathStudio();
    });

    $("#v82SendPlanning")?.addEventListener("click", sendToWeeklyPlanning);
    $("#v82SendTeachDay")?.addEventListener("click", sendToTeachDay);
    $("#v82PrintLesson")?.addEventListener("click", () => window.print());
    $("#v82AddExitAttachment")?.addEventListener("click", () => addAttachment("Exit Ticket","Assessment"));
    $("#v82AddAssessmentAttachment")?.addEventListener("click", () => addAttachment(currentLesson().assessmentType,"Assessment"));
    $("#v82SaveAssessment")?.addEventListener("click", saveAssessmentResult);
  }

  function sendToWeeklyPlanning() {
    const week = weeklyPlan();
    if (!week?.days) {
      toast("Build Weekly Planning first.");
      setTimeout(() => location.hash = "lesson-plans", 700);
      return;
    }

    const day = prompt("Send this math lesson to which day?", "Monday");
    if (!day || !week.days[day]) return;

    const lesson = currentLesson();
    week.days[day].math = [
      lesson.title,
      lesson.objective,
      lesson.fluency ? `Fluency: ${lesson.fluency}` : "",
      lesson.applicationProblem ? `Application Problem: ${lesson.applicationProblem}` : "",
      lesson.conceptDevelopment ? `Concept Development: ${lesson.conceptDevelopment}` : "",
      lesson.studentDebrief ? `Student Debrief: ${lesson.studentDebrief}` : "",
      lesson.exitTicket ? `Exit Ticket: ${lesson.exitTicket}` : ""
    ].filter(Boolean).join("\n\n");

    week.days[day].math2 = `${lesson.math2Focus}\n${lesson.math2Plan}`.trim();
    week.days[day].materials = [week.days[day].materials, lesson.materials].filter(Boolean).join("\n");
    week.days[day].assessment = [week.days[day].assessment, `${lesson.assessmentType}: ${lesson.exitTicket}`].filter(Boolean).join("\n");

    localStorage.setItem(WEEK_KEY, JSON.stringify(week));
    toast(`Math lesson sent to ${day}.`);
    setTimeout(() => location.hash = "lesson-plans", 600);
  }

  function sendToTeachDay() {
    const lesson = currentLesson();
    const existing = (() => {
      try { return JSON.parse(localStorage.getItem(TEACH_DAY_KEY) || "{}"); }
      catch { return {}; }
    })();

    localStorage.setItem(TEACH_DAY_KEY, JSON.stringify({
      ...existing,
      math: lesson.title,
      mathObjective: lesson.objective,
      math2: `${lesson.math2Focus}\n${lesson.math2Plan}`.trim(),
      mathMaterials: lesson.materials,
      mathExitTicket: lesson.exitTicket,
      eurekaModule: state.selectedModule,
      eurekaLesson: state.selectedLesson,
      sentAt: new Date().toISOString()
    }));

    toast("Eureka Math² lesson sent to Teach My Day.");
    setTimeout(() => location.hash = "teachday", 500);
  }

  function addAttachment(title, category) {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(ATTACHMENT_KEY) || "[]");
    } catch {}

    const lesson = currentLesson();
    items.unshift({
      id: `em2-${Date.now()}`,
      day: "Monday",
      lesson: `Eureka Math² Module ${state.selectedModule}, Lesson ${state.selectedLesson}`,
      title: `${lesson.title} — ${title}`,
      category: "Eureka Math²",
      type: category === "Assessment" ? "Assessment" : "Printable Page",
      url: portalUrl(),
      notes: title === "Exit Ticket" ? lesson.exitTicket : `${lesson.assessmentType}`,
      print: true,
      copies: 1,
      status: "Linked"
    });

    localStorage.setItem(ATTACHMENT_KEY, JSON.stringify(items));
    toast(`${title} added to Lesson Attachments.`);
    setTimeout(() => location.hash = "attachments", 500);
  }

  function saveAssessmentResult() {
    const score = Number($("#v82AssessmentScore").value);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      toast("Enter a score from 0 to 100.");
      return;
    }

    state.assessmentResults.unshift({
      id: Date.now(),
      module: Number(state.selectedModule),
      lesson: Number(state.selectedLesson),
      type: currentLesson().assessmentType,
      score,
      date: new Date().toISOString()
    });
    save();
    renderMathStudio();
    toast("Math assessment result saved.");
  }

  function injectWeeklyMathCard() {
    const studio = $("#v73PlanningStudio");
    if (!studio || $("#v82WeeklyMath")) return;

    const lesson = currentLesson();
    const card = document.createElement("section");
    card.id = "v82WeeklyMath";
    card.className = "v82-injected-card";
    card.innerHTML = `
      <div>
        <p>EUREKA MATH²</p>
        <h3>Module ${state.selectedModule}, Lesson ${state.selectedLesson}</h3>
        <span>${esc(lesson.title)}</span>
      </div>
      <button>Open Math Studio</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "eureka-math";

    const header = $(".v73-planning-header", studio);
    header?.insertAdjacentElement("afterend", card);
  }

  function injectTeachDayMathCard() {
    const host = $("#pageHost");
    if (!host || $("#v82TeachDayMath")) return;

    const lesson = currentLesson();
    const header = $(".page-header", host);
    if (!header) return;

    const card = document.createElement("section");
    card.id = "v82TeachDayMath";
    card.className = "v82-injected-card";
    card.innerHTML = `
      <div>
        <p>TODAY'S EUREKA MATH²</p>
        <h3>Module ${state.selectedModule}, Lesson ${state.selectedLesson}</h3>
        <span>${esc(lesson.title)} • Math 2: ${esc(lesson.math2Focus)}</span>
      </div>
      <button>Open Math Studio</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "eureka-math";
    header.insertAdjacentElement("afterend", card);
  }

  function injectAssessmentCard() {
    const host = $("#pageHost");
    if (!host || $("#v82AssessmentCard")) return;

    const results = state.assessmentResults;
    const average = results.length
      ? Math.round(results.reduce((sum,item) => sum + Number(item.score || 0), 0) / results.length)
      : 0;

    const header = $(".page-header", host);
    if (!header) return;

    const card = document.createElement("section");
    card.id = "v82AssessmentCard";
    card.className = "v82-injected-card";
    card.innerHTML = `
      <div>
        <p>EUREKA MATH² ASSESSMENTS</p>
        <h3>${results.length} saved result(s)</h3>
        <span>${results.length ? `Average recorded score: ${average}%` : "No math scores recorded yet."}</span>
      </div>
      <button>Open Math Studio</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "eureka-math";
    header.insertAdjacentElement("afterend", card);
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v82DashboardCard")) return;

    const lesson = currentLesson();
    const card = document.createElement("section");
    card.id = "v82DashboardCard";
    card.className = "v82-dashboard-card";
    card.innerHTML = `
      <div>
        <p>EUREKA MATH² DAILY STUDIO</p>
        <h3>Module ${state.selectedModule}, Lesson ${state.selectedLesson}</h3>
        <span>${esc(lesson.title)} • ${lesson.complete ? "Ready to teach" : "Planning in progress"}</span>
      </div>
      <div>
        <a href="${esc(portalUrl())}" target="_blank" rel="noopener">Great Minds</a>
        <button>Open Math Studio</button>
      </div>
    `;
    card.querySelector("button").onclick = () => location.hash = "eureka-math";
    dashboard.prepend(card);
  }

  function injectHealth() {
    const host = $("#pageHost");
    if (!host || $("#v82Health")) return;

    const lessons = Object.keys(state.lessons).length;
    const ready = Object.values(state.lessons).filter(item => item.complete).length;

    const panel = document.createElement("section");
    panel.id = "v82Health";
    panel.className = "panel v82-health-panel";
    panel.innerHTML = `
      <h3>Version 8.2 Eureka Math² Health</h3>
      <div class="health-grid">
        ${healthItem("Great Minds portal", true, "Grade 2 Module 1 link connected")}
        ${healthItem("Math modules", config.eurekaMath.modules.length === 6, `${config.eurekaMath.modules.length}/6 available`)}
        ${healthItem("Saved math lessons", lessons > 0, `${lessons} lesson record(s)`)}
        ${healthItem("Ready math lessons", ready > 0, `${ready} ready`)}
      </div>
      <button class="secondary-button">Open Eureka Math²</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "eureka-math";
    host.appendChild(panel);
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


/* Version 8.3 — Writing, Science & Social Studies Daily Studios */
(() => {
  "use strict";

  const STATE_KEY = "thh-v83:afternoon-studios";
  const WEEK_KEY = "thh-v73:weekly-plan";
  const ATTACHMENT_KEY = "thh-v74:attachments";
  const TEACH_DAY_KEY = "thh-v73:teach-day";

  let config = null;
  let state = {
    activeStudio: "writing",
    lessons: {
      writing: {},
      science: {},
      socialStudies: {}
    },
    selectedLessons: {
      writing: 1,
      science: 1,
      socialStudies: 1
    },
    assessmentResults: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => response.json());
      try {
        state = { ...state, ...JSON.parse(localStorage.getItem(STATE_KEY) || "{}") };
      } catch {}
      ensureLesson("writing");
      ensureLesson("science");
      ensureLesson("socialStudies");
      waitForShell();
    } catch (error) {
      console.warn("Version 8.3 could not start.", error);
    }
  }

  function save() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function lessonKey(studio, lessonNumber = state.selectedLessons[studio]) {
    return `${studio}-lesson-${lessonNumber}`;
  }

  function blankLesson(studio, number) {
    const common = {
      studio,
      lessonNumber: number,
      title: `${studioTitle(studio)} Lesson ${number}`,
      date: "",
      objective: "",
      standards: "",
      vocabulary: "",
      materials: "",
      attachments: "",
      differentiation: "",
      assessment: "",
      teacherNotes: "",
      complete: false
    };

    if (studio === "writing") {
      return {
        ...common,
        genre: "Narrative",
        prompt: "",
        mentorText: "",
        miniLesson: "",
        teacherModel: "",
        guidedWriting: "",
        independentWriting: "",
        gum: "",
        conferenceFocus: "",
        publishing: "",
        rubric: ""
      };
    }

    if (studio === "science") {
      return {
        ...common,
        unit: "Matter",
        phenomenon: "",
        question: "",
        investigation: "",
        explanation: "",
        studentEvidence: "",
        notebookResponse: "",
        safety: ""
      };
    }

    return {
      ...common,
      unit: "Civics & Community",
      essentialQuestion: "",
      backgroundKnowledge: "",
      source: "",
      teacherModel: "",
      guidedPractice: "",
      studentTask: "",
      reflection: ""
    };
  }

  function ensureLesson(studio) {
    state.lessons[studio] = state.lessons[studio] || {};
    const key = lessonKey(studio);
    if (!state.lessons[studio][key]) {
      state.lessons[studio][key] = blankLesson(studio, state.selectedLessons[studio] || 1);
    }
    save();
  }

  function currentLesson(studio = state.activeStudio) {
    ensureLesson(studio);
    return state.lessons[studio][lessonKey(studio)];
  }

  function studioTitle(studio) {
    return config.afternoonStudios?.[studio]?.title || studio;
  }

  function weeklyPlan() {
    try {
      return JSON.parse(localStorage.getItem(WEEK_KEY) || "null");
    } catch {
      return null;
    }
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    addNavigation();
    window.addEventListener("hashchange", route);

    new MutationObserver(() => {
      const current = location.hash.replace("#","") || "dashboard";
      if (current === "afternoon-studios" && !$("#v83Studios")) renderStudio();
      if (current === "lesson-plans") setTimeout(injectPlanningCard, 0);
      if (current === "teachday") setTimeout(injectTeachDayCards, 0);
      if (current === "production") setTimeout(injectPacketCard, 0);
      if (current === "assessments") setTimeout(injectAssessmentCard, 0);
      if (current === "dashboard") setTimeout(injectDashboardCard, 0);
      if (current === "health") setTimeout(injectHealth, 0);
    }).observe($("#pageHost"), { childList: true, subtree: true });

    route();
  }

  function addNavigation() {
    if ($('[data-route="afternoon-studios"]')) return;

    const math = $('[data-route="eureka-math"]');
    const button = document.createElement("button");
    button.className = "nav-button";
    button.dataset.route = "afternoon-studios";
    button.innerHTML = "<span>✎</span><strong>Writing, Science & SS</strong>";
    button.addEventListener("click", () => location.hash = "afternoon-studios");

    if (math) math.insertAdjacentElement("afterend", button);
    else $("#mainNav").appendChild(button);
  }

  function route() {
    const current = location.hash.replace("#","") || "dashboard";
    if (current === "afternoon-studios") setTimeout(renderStudio, 0);
    if (current === "lesson-plans") setTimeout(injectPlanningCard, 0);
    if (current === "teachday") setTimeout(injectTeachDayCards, 0);
    if (current === "production") setTimeout(injectPacketCard, 0);
    if (current === "assessments") setTimeout(injectAssessmentCard, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "health") setTimeout(injectHealth, 0);
  }

  function renderStudio() {
    const host = $("#pageHost");
    if (!host) return;

    const studio = state.activeStudio;
    const lesson = currentLesson(studio);
    const studioConfig = config.afternoonStudios[studio];

    host.innerHTML = `
      <section id="v83Studios">
        <section class="page-header">
          <div>
            <p>VERSION 8.3</p>
            <h2>Writing, Science & Social Studies Daily Studios</h2>
            <span>Plan the complete afternoon instructional sequence and connect it to the rest of the Teacher Operating System.</span>
          </div>
          <div class="button-row">
            <button id="v83SendPlanning" class="secondary-button">Send to Weekly Planning</button>
            <button id="v83SendTeachDay" class="primary-button">Send to Teach My Day</button>
          </div>
        </section>

        <nav class="v83-studio-tabs">
          ${[
            ["writing","Writing / GUM","11:10–11:40"],
            ["science","Science","1:40–2:15"],
            ["socialStudies","Social Studies","2:15–2:55"]
          ].map(([id,label,time]) => `
            <button data-v83-studio="${id}" class="${id === studio ? "active" : ""}">
              <strong>${label}</strong>
              <span>${time}</span>
            </button>`).join("")}
        </nav>

        <section class="v83-lesson-selector panel">
          <label>
            <span>Lesson Number</span>
            <input id="v83LessonNumber" type="number" min="1" max="200" value="${esc(state.selectedLessons[studio])}">
          </label>
          <label class="wide">
            <span>Lesson Title</span>
            <input data-v83-field="title" value="${esc(lesson.title)}">
          </label>
          <label>
            <span>Status</span>
            <select id="v83Status">
              <option ${!lesson.complete ? "selected" : ""}>In Progress</option>
              <option ${lesson.complete ? "selected" : ""}>Ready to Teach</option>
            </select>
          </label>
          <button id="v83LoadLesson" class="secondary-button">Load Lesson</button>
        </section>

        <section class="v83-layout">
          <aside class="panel v83-section-nav">
            <h3>${esc(studioConfig.title)}</h3>
            ${sectionLinks(studio)}
          </aside>

          <main class="v83-main">
            ${commonOverview(lesson, studio)}
            ${studio === "writing" ? writingSections(lesson) : ""}
            ${studio === "science" ? scienceSections(lesson) : ""}
            ${studio === "socialStudies" ? socialStudiesSections(lesson) : ""}
            ${supportSection(lesson, studio)}
            ${assessmentSection(lesson, studio)}
          </main>

          <aside class="panel v83-summary">
            <h3>Lesson Summary</h3>
            <article><span>Studio</span><strong>${esc(studioConfig.title)}</strong></article>
            <article><span>Schedule</span><strong>${esc(studioConfig.schedule)}</strong></article>
            <article><span>Lesson</span><strong>${esc(state.selectedLessons[studio])}</strong></article>
            <article><span>Status</span><strong>${lesson.complete ? "Ready" : "In Progress"}</strong></article>
            <article><span>Program</span><strong>${esc(studioConfig.program)}</strong></article>
            <button id="v83AddAttachment" class="secondary-button">Add to Attachments</button>
            <button id="v83PrintLesson" class="primary-button">Print Lesson</button>
          </aside>
        </section>
      </section>
    `;

    wireStudio();
  }

  function sectionLinks(studio) {
    const links = [["overview","Overview"]];
    if (studio === "writing") {
      links.push(
        ["mini","Mini-Lesson"],
        ["model","Model & Guided Writing"],
        ["independent","Independent Writing"],
        ["gum","Grammar / GUM"],
        ["conference","Conference & Publishing"]
      );
    } else if (studio === "science") {
      links.push(
        ["engage","Phenomenon & Question"],
        ["investigate","Investigation"],
        ["explain","Explanation & Evidence"],
        ["notebook","Notebook & Vocabulary"]
      );
    } else {
      links.push(
        ["question","Essential Question"],
        ["source","Background & Source"],
        ["instruction","Model & Guided Practice"],
        ["task","Student Task & Reflection"]
      );
    }
    links.push(["support","Differentiation"],["assessment","Assessment"]);
    return links.map(([id,label]) => `<button data-v83-section="${id}">${esc(label)}</button>`).join("");
  }

  function commonOverview(lesson, studio) {
    const studioConfig = config.afternoonStudios[studio];
    let extra = "";

    if (studio === "writing") {
      extra = `
        <label><span>Genre</span><select data-v83-field="genre">
          ${studioConfig.genres.map(item => `<option ${item === lesson.genre ? "selected" : ""}>${esc(item)}</option>`).join("")}
        </select></label>
        <label><span>Writing Prompt</span><input data-v83-field="prompt" value="${esc(lesson.prompt)}"></label>`;
    } else {
      extra = `
        <label><span>Unit</span><select data-v83-field="unit">
          ${studioConfig.units.map(item => `<option ${item === lesson.unit ? "selected" : ""}>${esc(item)}</option>`).join("")}
        </select></label>`;
    }

    return section("overview","Lesson Overview",`
      <div class="v83-form-grid">
        <label><span>Date</span><input data-v83-field="date" type="date" value="${esc(lesson.date)}"></label>
        ${extra}
        ${field("objective","Objective",lesson.objective,"wide")}
        ${field("standards","Arizona Standards",lesson.standards,"wide")}
        ${field("materials","Materials",lesson.materials)}
        ${field("vocabulary","Vocabulary",lesson.vocabulary)}
        ${field("teacherNotes","Teacher Notes",lesson.teacherNotes,"wide")}
      </div>
    `);
  }

  function writingSections(lesson) {
    return `
      ${section("mini","Mini-Lesson",`
        <div class="v83-form-grid">
          ${field("mentorText","Mentor Text or Model",lesson.mentorText)}
          ${field("miniLesson","Teaching Point / Mini-Lesson",lesson.miniLesson)}
        </div>
      `)}
      ${section("model","Teacher Model & Guided Writing",`
        <div class="v83-form-grid">
          ${field("teacherModel","Teacher Model",lesson.teacherModel)}
          ${field("guidedWriting","Shared or Guided Writing",lesson.guidedWriting)}
        </div>
      `)}
      ${section("independent","Independent Writing",`
        <div class="v83-form-grid">
          ${field("independentWriting","Independent Writing Task",lesson.independentWriting,"wide")}
        </div>
      `)}
      ${section("gum","Grammar, Usage & Mechanics",`
        <div class="v83-form-grid">
          ${field("gum","GUM Skill, Model, and Practice",lesson.gum,"wide")}
        </div>
      `)}
      ${section("conference","Conference, Publishing & Sharing",`
        <div class="v83-form-grid">
          ${field("conferenceFocus","Conference Focus",lesson.conferenceFocus)}
          ${field("publishing","Publishing or Sharing",lesson.publishing)}
          ${field("rubric","Rubric or Success Criteria",lesson.rubric,"wide")}
        </div>
      `)}
    `;
  }

  function scienceSections(lesson) {
    return `
      ${section("engage","Phenomenon & Question",`
        <div class="v83-form-grid">
          ${field("phenomenon","Phenomenon / Engage",lesson.phenomenon)}
          ${field("question","Investigation Question",lesson.question)}
          ${field("safety","Safety Considerations",lesson.safety,"wide")}
        </div>
      `)}
      ${section("investigate","Investigation / Explore",`
        <div class="v83-form-grid">
          ${field("investigation","Investigation, Materials, and Student Actions",lesson.investigation,"wide")}
        </div>
      `)}
      ${section("explain","Explanation & Student Evidence",`
        <div class="v83-form-grid">
          ${field("explanation","Teacher Explanation",lesson.explanation)}
          ${field("studentEvidence","Student Evidence / Claim",lesson.studentEvidence)}
        </div>
      `)}
      ${section("notebook","Science Notebook & Vocabulary",`
        <div class="v83-form-grid">
          ${field("notebookResponse","Notebook Response",lesson.notebookResponse,"wide")}
        </div>
      `)}
    `;
  }

  function socialStudiesSections(lesson) {
    return `
      ${section("question","Essential Question",`
        <div class="v83-form-grid">
          ${field("essentialQuestion","Essential Question",lesson.essentialQuestion,"wide")}
        </div>
      `)}
      ${section("source","Background Knowledge & Source",`
        <div class="v83-form-grid">
          ${field("backgroundKnowledge","Background Knowledge",lesson.backgroundKnowledge)}
          ${field("source","Primary or Secondary Source",lesson.source)}
        </div>
      `)}
      ${section("instruction","Teacher Model & Guided Practice",`
        <div class="v83-form-grid">
          ${field("teacherModel","Teacher Model",lesson.teacherModel)}
          ${field("guidedPractice","Guided Practice",lesson.guidedPractice)}
        </div>
      `)}
      ${section("task","Student Task & Reflection",`
        <div class="v83-form-grid">
          ${field("studentTask","Student Task",lesson.studentTask)}
          ${field("reflection","Reflection / Discussion",lesson.reflection)}
        </div>
      `)}
    `;
  }

  function supportSection(lesson, studio) {
    const supports = studio === "writing"
      ? config.writingSupports
      : studio === "science"
        ? config.scienceSupports
        : config.socialStudiesSupports;

    return section("support","Differentiation & Access",`
      <div class="v83-form-grid">
        ${field("differentiation","EL, IEP, 504, and Universal Supports",lesson.differentiation,"wide")}
      </div>
      <div class="v83-support-chips">
        ${supports.map(item => `<button type="button" data-v83-support="${esc(item)}">${esc(item)}</button>`).join("")}
      </div>
    `);
  }

  function assessmentSection(lesson, studio) {
    const results = state.assessmentResults.filter(item =>
      item.studio === studio &&
      item.lessonNumber === Number(state.selectedLessons[studio])
    );

    return section("assessment","Assessment & Evidence",`
      <div class="v83-form-grid">
        ${field("assessment","Assessment, Rubric, Exit Ticket, or Evidence",lesson.assessment,"wide")}
        <label><span>Class Average or Score %</span><input id="v83Score" type="number" min="0" max="100"></label>
      </div>
      <div class="button-row">
        <button id="v83SaveAssessment" class="primary-button">Save Result</button>
        <button id="v83AssessmentAttachment" class="secondary-button">Add Assessment to Attachments</button>
      </div>
      <div class="v83-results">
        ${results.length ? results.map(item => `
          <article><strong>${esc(item.score)}%</strong><span>${new Date(item.date).toLocaleString()}</span></article>
        `).join("") : "<p>No scores saved for this lesson.</p>"}
      </div>
    `);
  }

  function section(id, title, body) {
    return `<section id="v83-${id}" class="panel v83-section"><h3>${esc(title)}</h3>${body}</section>`;
  }

  function field(key, label, value, className = "") {
    return `<label class="${className}"><span>${esc(label)}</span><textarea data-v83-field="${key}">${esc(value)}</textarea></label>`;
  }

  function wireStudio() {
    const studio = state.activeStudio;

    $$("[data-v83-studio]").forEach(button => {
      button.addEventListener("click", () => {
        state.activeStudio = button.dataset.v83Studio;
        ensureLesson(state.activeStudio);
        save();
        renderStudio();
      });
    });

    $$("[data-v83-section]").forEach(button => {
      button.addEventListener("click", () => {
        $(`#v83-${button.dataset.v83Section}`)?.scrollIntoView({ behavior:"smooth", block:"start" });
      });
    });

    $$("[data-v83-field]").forEach(control => {
      const update = () => {
        currentLesson()[control.dataset.v83Field] = control.value;
        save();
      };
      control.addEventListener("input", update);
      control.addEventListener("change", update);
    });

    $$("[data-v83-support]").forEach(button => {
      button.addEventListener("click", () => {
        const field = $('[data-v83-field="differentiation"]');
        const current = field.value.trim();
        field.value = current ? `${current}\n• ${button.dataset.v83Support}` : `• ${button.dataset.v83Support}`;
        currentLesson().differentiation = field.value;
        save();
      });
    });

    $("#v83LoadLesson")?.addEventListener("click", () => {
      state.selectedLessons[studio] = Math.max(1, Number($("#v83LessonNumber").value) || 1);
      ensureLesson(studio);
      save();
      renderStudio();
    });

    $("#v83Status")?.addEventListener("change", event => {
      currentLesson().complete = event.target.value === "Ready to Teach";
      save();
      renderStudio();
    });

    $("#v83SendPlanning")?.addEventListener("click", sendToWeeklyPlanning);
    $("#v83SendTeachDay")?.addEventListener("click", sendToTeachDay);
    $("#v83AddAttachment")?.addEventListener("click", () => addAttachment(false));
    $("#v83AssessmentAttachment")?.addEventListener("click", () => addAttachment(true));
    $("#v83PrintLesson")?.addEventListener("click", () => window.print());
    $("#v83SaveAssessment")?.addEventListener("click", saveAssessment);
  }

  function sendToWeeklyPlanning() {
    const week = weeklyPlan();
    if (!week?.days) {
      toast("Build Weekly Planning first.");
      setTimeout(() => location.hash = "lesson-plans", 700);
      return;
    }

    const day = prompt("Send this lesson to which day?", "Monday");
    if (!day || !week.days[day]) return;

    const studio = state.activeStudio;
    const lesson = currentLesson();

    if (studio === "writing") {
      week.days[day].writing = buildWritingText(lesson);
    } else if (studio === "science") {
      week.days[day].science = buildScienceText(lesson);
    } else {
      week.days[day].socialStudies = buildSocialText(lesson);
    }

    week.days[day].standards = [week.days[day].standards, lesson.standards].filter(Boolean).join("\n");
    week.days[day].materials = [week.days[day].materials, lesson.materials].filter(Boolean).join("\n");
    week.days[day].differentiation = [week.days[day].differentiation, lesson.differentiation].filter(Boolean).join("\n");
    week.days[day].assessment = [week.days[day].assessment, lesson.assessment].filter(Boolean).join("\n");

    localStorage.setItem(WEEK_KEY, JSON.stringify(week));
    toast(`${studioTitle(studio)} sent to ${day}.`);
    setTimeout(() => location.hash = "lesson-plans", 600);
  }

  function sendToTeachDay() {
    let current = {};
    try {
      current = JSON.parse(localStorage.getItem(TEACH_DAY_KEY) || "{}");
    } catch {}

    const studio = state.activeStudio;
    const lesson = currentLesson();

    if (studio === "writing") current.writing = buildWritingText(lesson);
    if (studio === "science") current.science = buildScienceText(lesson);
    if (studio === "socialStudies") current.socialStudies = buildSocialText(lesson);

    current[`${studio}LessonTitle`] = lesson.title;
    current[`${studio}Materials`] = lesson.materials;
    current[`${studio}Assessment`] = lesson.assessment;
    current.sentAt = new Date().toISOString();

    localStorage.setItem(TEACH_DAY_KEY, JSON.stringify(current));
    toast(`${studioTitle(studio)} sent to Teach My Day.`);
    setTimeout(() => location.hash = "teachday", 500);
  }

  function buildWritingText(lesson) {
    return [
      lesson.title,
      lesson.genre ? `Genre: ${lesson.genre}` : "",
      lesson.prompt ? `Prompt: ${lesson.prompt}` : "",
      lesson.miniLesson ? `Mini-Lesson: ${lesson.miniLesson}` : "",
      lesson.teacherModel ? `Teacher Model: ${lesson.teacherModel}` : "",
      lesson.guidedWriting ? `Guided Writing: ${lesson.guidedWriting}` : "",
      lesson.independentWriting ? `Independent Writing: ${lesson.independentWriting}` : "",
      lesson.gum ? `GUM: ${lesson.gum}` : "",
      lesson.conferenceFocus ? `Conference Focus: ${lesson.conferenceFocus}` : ""
    ].filter(Boolean).join("\n\n");
  }

  function buildScienceText(lesson) {
    return [
      lesson.title,
      lesson.unit ? `Unit: ${lesson.unit}` : "",
      lesson.phenomenon ? `Phenomenon: ${lesson.phenomenon}` : "",
      lesson.question ? `Question: ${lesson.question}` : "",
      lesson.investigation ? `Investigation: ${lesson.investigation}` : "",
      lesson.explanation ? `Explanation: ${lesson.explanation}` : "",
      lesson.studentEvidence ? `Evidence: ${lesson.studentEvidence}` : "",
      lesson.notebookResponse ? `Notebook: ${lesson.notebookResponse}` : ""
    ].filter(Boolean).join("\n\n");
  }

  function buildSocialText(lesson) {
    return [
      lesson.title,
      lesson.unit ? `Unit: ${lesson.unit}` : "",
      lesson.essentialQuestion ? `Essential Question: ${lesson.essentialQuestion}` : "",
      lesson.backgroundKnowledge ? `Background: ${lesson.backgroundKnowledge}` : "",
      lesson.source ? `Source: ${lesson.source}` : "",
      lesson.teacherModel ? `Teacher Model: ${lesson.teacherModel}` : "",
      lesson.guidedPractice ? `Guided Practice: ${lesson.guidedPractice}` : "",
      lesson.studentTask ? `Student Task: ${lesson.studentTask}` : "",
      lesson.reflection ? `Reflection: ${lesson.reflection}` : ""
    ].filter(Boolean).join("\n\n");
  }

  function addAttachment(assessmentOnly) {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(ATTACHMENT_KEY) || "[]");
    } catch {}

    const studio = state.activeStudio;
    const lesson = currentLesson();
    const category = studio === "writing" ? "Writing / GUM" : studio === "science" ? "Science" : "Social Studies";

    items.unshift({
      id: `v83-${Date.now()}`,
      day: "Monday",
      lesson: lesson.title,
      title: assessmentOnly ? `${lesson.title} — Assessment` : lesson.title,
      category: assessmentOnly ? "Assessment" : category,
      type: assessmentOnly ? "Assessment" : "Printable Page",
      url: "",
      notes: assessmentOnly ? lesson.assessment : lesson.attachments,
      print: true,
      copies: 1,
      status: "Missing"
    });

    localStorage.setItem(ATTACHMENT_KEY, JSON.stringify(items));
    toast("Added to Lesson Attachments.");
    setTimeout(() => location.hash = "attachments", 500);
  }

  function saveAssessment() {
    const score = Number($("#v83Score").value);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      toast("Enter a score from 0 to 100.");
      return;
    }

    state.assessmentResults.unshift({
      id: Date.now(),
      studio: state.activeStudio,
      lessonNumber: Number(state.selectedLessons[state.activeStudio]),
      title: currentLesson().title,
      score,
      date: new Date().toISOString()
    });
    save();
    renderStudio();
    toast("Assessment result saved.");
  }

  function injectPlanningCard() {
    const studio = $("#v73PlanningStudio");
    if (!studio || $("#v83PlanningCard")) return;

    const ready = ["writing","science","socialStudies"].filter(type => currentLesson(type).complete).length;
    const card = document.createElement("section");
    card.id = "v83PlanningCard";
    card.className = "v83-injected-card";
    card.innerHTML = `
      <div>
        <p>AFTERNOON CURRICULUM STUDIOS</p>
        <h3>${ready}/3 selected lessons ready</h3>
        <span>Writing, Science, and Social Studies planning.</span>
      </div>
      <button>Open Studios</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "afternoon-studios";
    $(".v73-planning-header", studio)?.insertAdjacentElement("afterend", card);
  }

  function injectTeachDayCards() {
    const host = $("#pageHost");
    if (!host || $("#v83TeachDayCard")) return;

    const header = $(".page-header", host);
    if (!header) return;

    const card = document.createElement("section");
    card.id = "v83TeachDayCard";
    card.className = "v83-injected-card";
    card.innerHTML = `
      <div>
        <p>AFTERNOON INSTRUCTION</p>
        <h3>Writing, Science & Social Studies</h3>
        <span>Open the selected daily lesson studios and connected resources.</span>
      </div>
      <button>Open Studios</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "afternoon-studios";
    header.insertAdjacentElement("afterend", card);
  }

  function injectPacketCard() {
    const host = $("#pageHost");
    if (!host || $("#v83PacketCard")) return;

    const header = $(".page-header", host);
    if (!header) return;

    const card = document.createElement("section");
    card.id = "v83PacketCard";
    card.className = "v83-injected-card";
    card.innerHTML = `
      <div>
        <p>AFTERNOON PACKET CONTENT</p>
        <h3>Writing, Science & Social Studies lesson records</h3>
        <span>Send completed studio lessons into Weekly Planning to include them in Daily Lesson Packets.</span>
      </div>
      <button>Open Studios</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "afternoon-studios";
    header.insertAdjacentElement("afterend", card);
  }

  function injectAssessmentCard() {
    const host = $("#pageHost");
    if (!host || $("#v83AssessmentCard")) return;

    const header = $(".page-header", host);
    if (!header) return;

    const results = state.assessmentResults;
    const average = results.length
      ? Math.round(results.reduce((sum,item) => sum + item.score, 0) / results.length)
      : 0;

    const card = document.createElement("section");
    card.id = "v83AssessmentCard";
    card.className = "v83-injected-card";
    card.innerHTML = `
      <div>
        <p>WRITING, SCIENCE & SOCIAL STUDIES DATA</p>
        <h3>${results.length} result(s) saved</h3>
        <span>${results.length ? `Average recorded score: ${average}%` : "No results saved yet."}</span>
      </div>
      <button>Open Studios</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "afternoon-studios";
    header.insertAdjacentElement("afterend", card);
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v83DashboardCard")) return;

    const ready = ["writing","science","socialStudies"].filter(type => currentLesson(type).complete).length;
    const card = document.createElement("section");
    card.id = "v83DashboardCard";
    card.className = "v83-dashboard-card";
    card.innerHTML = `
      <div>
        <p>AFTERNOON CURRICULUM STUDIOS</p>
        <h3>${ready}/3 selected lessons ready</h3>
        <span>Writing 11:10 • Science 1:40 • Social Studies 2:15</span>
      </div>
      <button>Open Studios</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "afternoon-studios";
    dashboard.prepend(card);
  }

  function injectHealth() {
    const host = $("#pageHost");
    if (!host || $("#v83Health")) return;

    const lessonCount = Object.values(state.lessons)
      .reduce((sum, group) => sum + Object.keys(group || {}).length, 0);
    const readyCount = Object.values(state.lessons)
      .flatMap(group => Object.values(group || {}))
      .filter(item => item.complete).length;

    const panel = document.createElement("section");
    panel.id = "v83Health";
    panel.className = "panel v83-health-panel";
    panel.innerHTML = `
      <h3>Version 8.3 Afternoon Curriculum Health</h3>
      <div class="health-grid">
        ${healthItem("Writing Studio", true, "11:10–11:40")}
        ${healthItem("Science Studio", true, "1:40–2:15")}
        ${healthItem("Social Studies Studio", true, "2:15–2:55")}
        ${healthItem("Saved lesson records", lessonCount > 0, `${lessonCount} saved • ${readyCount} ready`)}
      </div>
      <button class="secondary-button">Open Studios</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "afternoon-studios";
    host.appendChild(panel);
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

/* Version 8.4 — Stable First-Week Builder */
(() => {
  "use strict";
  const STORE="thh-v84:first-week", WEEK="thh-v73:weekly-plan", PRINT="thh-v74:print-center";
  let cfg,state={generated:false,ready:{},notes:{},prep:{}};
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  async function start(){cfg=await fetch("tos-data.json",{cache:"no-store"}).then(r=>r.json());try{state={...state,...JSON.parse(localStorage.getItem(STORE)||"{}")}}catch{};wait()}
  function save(){localStorage.setItem(STORE,JSON.stringify(state))}
  function wait(){if(!$("#pageHost")||!$("#mainNav"))return setTimeout(wait,100);addNav();window.addEventListener("hashchange",route);new MutationObserver(route).observe($("#pageHost"),{childList:true,subtree:true});route()}
  function addNav(){if($('[data-route="first-week-builder"]'))return;const b=document.createElement("button");b.className="nav-button";b.dataset.route="first-week-builder";b.innerHTML="<span>5</span><strong>First-Week Builder</strong>";b.onclick=()=>location.hash="first-week-builder";const a=$('[data-route="classroom-launch"]');a?a.insertAdjacentElement("afterend",b):$("#mainNav").appendChild(b)}
  function route(){const r=location.hash.replace("#","")||"dashboard";if(r==="first-week-builder"&&!$("#v84"))setTimeout(render,0);if(r==="dashboard")setTimeout(dash,0);if(r==="lesson-plans")setTimeout(planCard,0);if(r==="health")setTimeout(health,0)}
  function render(){const h=$("#pageHost"),days=cfg.firstWeekBuilder.days;h.innerHTML=`<section id="v84"><section class="page-header"><div><p>VERSION 8.4</p><h2>Stable First-Week Builder</h2><span>Prepare Monday through Friday and send the complete week to Weekly Planning.</span></div><div class="button-row"><button id="gen" class="primary-button">Generate First Week</button><button id="reset" class="secondary-button">Reset</button></div></section>${state.generated?`<section class="v84-summary"><div><p>FIRST-WEEK PACK</p><h3>${Object.values(state.ready).filter(Boolean).length}/5 days ready</h3><span>${esc(cfg.firstWeekBuilder.title)} • Pillar: ${esc(cfg.firstWeekBuilder.pillar)}</span></div><div class="button-row"><button id="send" class="primary-button">Send All Days to Weekly Planning</button><button id="prep" class="secondary-button">Build Preparation Queue</button><button id="print" class="secondary-button">Print</button></div></section><section class="v84-grid">${Object.entries(days).map(([d,x])=>card(d,x)).join("")}</section><section class="v84-bottom"><section class="panel"><h3>Preparation Checklist</h3><div class="v84-prep">${cfg.firstWeekBuilder.preparation.map((x,i)=>`<label><input type="checkbox" data-prep="${i}" ${state.prep[i]?"checked":""}><span>${esc(x)}</span></label>`).join("")}</div></section><section class="panel"><h3>Week Notes</h3><textarea id="weekNotes">${esc(state.notes.week||"")}</textarea><button id="saveNotes" class="primary-button">Save Notes</button></section></section>`:`<div class="empty-state"><strong>The first-week pack has not been generated.</strong><p>Select Generate First Week.</p></div>`}</section>`;wire()}
  function card(d,x){return `<article class="panel v84-card ${state.ready[d]?"ready":""}"><div class="v84-head"><div><span>${esc(d)}</span><h3>${esc(x[0])}</h3></div><label><input type="checkbox" data-ready="${d}" ${state.ready[d]?"checked":""}> Ready</label></div><div class="v84-read"><span>Read Aloud</span><strong>${esc(x[1])}</strong></div><h4>Routines</h4><ul>${x[2].map(r=>`<li>${esc(r)}</li>`).join("")}</ul><textarea data-notes="${d}">${esc(state.notes[d]||"")}</textarea><button data-copy="${d}" class="secondary-button">Copy Planbook Text</button></article>`}
  function wire(){
    $("#gen")?.addEventListener("click",()=>{state.generated=true;save();render()});
    $("#reset")?.addEventListener("click",()=>{state={generated:false,ready:{},notes:{},prep:{}};save();render()});
    $$("[data-ready]").forEach(i=>i.onchange=()=>{state.ready[i.dataset.ready]=i.checked;save();render()});
    $$("[data-notes]").forEach(i=>i.onchange=()=>{state.notes[i.dataset.notes]=i.value.trim();save()});
    $$("[data-prep]").forEach(i=>i.onchange=()=>{state.prep[i.dataset.prep]=i.checked;save()});
    $$("[data-copy]").forEach(b=>b.onclick=()=>copyText(b.dataset.copy));
    $("#send")?.addEventListener("click",sendWeek);$("#prep")?.addEventListener("click",buildPrep);$("#print")?.addEventListener("click",()=>window.print());
    $("#saveNotes")?.addEventListener("click",()=>{state.notes.week=$("#weekNotes").value.trim();save();toast("Week notes saved.")});
  }
  function text(day){const x=cfg.firstWeekBuilder.days[day];return `${day.toUpperCase()} — FIRST WEEK OF SCHOOL\n\nCLASSROOM LAUNCH FOCUS\n${x[0]}\n\nREAD ALOUD\n${x[1]}\n\nROUTINES AND PROCEDURES\n${x[2].map(r=>"• "+r).join("\n")}\n\nOBJECTIVE\nStudents will practice classroom routines, build community, and increase independence.\n\nI DO\nModel each routine clearly.\n\nWE DO\nPractice together and discuss what success looks and sounds like.\n\nYOU DO\nStudents complete the routine independently.\n\nDIFFERENTIATION\nUse visuals, gestures, sentence frames, oral rehearsal, partner support, repeated directions, and approved accommodations.\n\nASSESSMENT\nTeacher observation of routine independence and participation.`}
  async function copyText(day){const t=text(day);try{await navigator.clipboard.writeText(t)}catch{const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();document.execCommand("copy");a.remove()}toast(`${day} Planbook text copied.`)}
  function sendWeek(){let w;try{w=JSON.parse(localStorage.getItem(WEEK)||"null")}catch{};if(!w?.days)w={title:cfg.firstWeekBuilder.title,weekOf:"",pillar:cfg.firstWeekBuilder.pillar,days:{},printQueue:[]};Object.entries(cfg.firstWeekBuilder.days).forEach(([d,x])=>w.days[d]={...(w.days[d]||{}),day:d,focus:x[0],launchRoutine:x[0],morningMeeting:`${x[1]}\n${x[2].join("\n")}`,objective:"Students will practice classroom routines, build community, and increase independence.",iDo:"Model each routine clearly.",weDo:"Practice together.",youDo:"Students complete routines independently.",differentiation:"Visuals, gestures, sentence frames, partner support, repeated directions, and approved accommodations.",assessment:"Teacher observation.",notes:state.notes[d]||"",complete:!!state.ready[d]});w.updatedAt=new Date().toISOString();localStorage.setItem(WEEK,JSON.stringify(w));toast("All five days sent to Weekly Planning.");setTimeout(()=>location.hash="lesson-plans",600)}
  function buildPrep(){let q=[];try{q=JSON.parse(localStorage.getItem(PRINT)||"[]")}catch{};const items=cfg.firstWeekBuilder.preparation.map((title,i)=>({id:`v84-prep-${i}`,source:"First-Week Builder",day:"Before Monday",title,category:"Classroom Launch",copies:1,notes:"",url:"",complete:!!state.prep[i]}));q=[...q.filter(x=>!String(x.id).startsWith("v84-prep-")),...items];localStorage.setItem(PRINT,JSON.stringify(q));toast("Preparation checklist added to the Print Center.");setTimeout(()=>location.hash="forms",600)}
  function dash(){const d=$("#v72Dashboard");if(!d||$("#v84Dash"))return;const c=document.createElement("section");c.id="v84Dash";c.className="v84-injected";c.innerHTML=`<div><p>FIRST-WEEK BUILDER</p><h3>${state.generated?`${Object.values(state.ready).filter(Boolean).length}/5 days ready`:"Generate Monday through Friday"}</h3><span>Classroom routines, Planbook text, and preparation.</span></div><button>Open Builder</button>`;c.querySelector("button").onclick=()=>location.hash="first-week-builder";d.prepend(c)}
  function planCard(){const s=$("#v73PlanningStudio");if(!s||$("#v84Plan"))return;const c=document.createElement("section");c.id="v84Plan";c.className="v84-injected";c.innerHTML=`<div><p>FIRST-WEEK PACK</p><h3>${state.generated?"Five-day launch pack available":"Generate the first week"}</h3><span>Send all five days into Weekly Planning together.</span></div><button>Open Builder</button>`;c.querySelector("button").onclick=()=>location.hash="first-week-builder";$(".v73-planning-header",s)?.insertAdjacentElement("afterend",c)}
  function health(){const h=$("#pageHost");if(!h||$("#v84Health"))return;const p=document.createElement("section");p.id="v84Health";p.className="panel";p.innerHTML=`<h3>Version 8.4 First-Week Builder Health</h3><div class="health-grid"><article class="ready"><strong>✓</strong><div><span>Builder configuration</span><small>Connected</small></div></article><article class="${Object.keys(cfg.firstWeekBuilder.days).length===5?"ready":"missing"}"><strong>${Object.keys(cfg.firstWeekBuilder.days).length===5?"✓":"!"}</strong><div><span>Five daily templates</span><small>${Object.keys(cfg.firstWeekBuilder.days).length}/5</small></div></article></div><button class="secondary-button">Open Builder</button>`;p.querySelector("button").onclick=()=>location.hash="first-week-builder";h.appendChild(p)}
  function toast(m){const t=$("#toast");if(!t)return;t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();



/* Version 8.6 — Curriculum Start-Date Guard & Launch Week Lock */
(() => {
  "use strict";

  const SETTINGS_KEY = "thh-v86:school-year";
  const WEEK_STORE = "thh-v73:weekly-plan";

  let config = null;
  let settings = {
    curriculumStartDate: "2026-08-03",
    launchWeekStart: "2026-07-27",
    launchWeekEnd: "2026-07-31",
    enforceStartDate: true
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
        settings = {
          ...settings,
          ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")
        };
      } catch {}

      const schoolYear = config.schoolYear2026_2027 || {};
      settings.curriculumStartDate = schoolYear.curriculumStartDate || settings.curriculumStartDate;
      settings.launchWeekStart = schoolYear.launchWeekStart || settings.launchWeekStart;
      settings.launchWeekEnd = schoolYear.launchWeekEnd || settings.launchWeekEnd;
      saveSettings();

      protectSavedWeeklyPlan();
      waitForShell();
    } catch (error) {
      console.warn("Version 8.6 could not start.", error);
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = parseDate(value);
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function isBeforeCurriculumStart(value) {
    const date = parseDate(value);
    const start = parseDate(settings.curriculumStartDate);
    if (!date || !start) return false;
    return date < start;
  }

  function isLaunchWeek(value) {
    const date = parseDate(value);
    const start = parseDate(settings.launchWeekStart);
    const end = parseDate(settings.launchWeekEnd);
    if (!date || !start || !end) return false;
    return date >= start && date <= end;
  }

  function protectSavedWeeklyPlan() {
    if (!settings.enforceStartDate) return;

    let week = null;
    try {
      week = JSON.parse(localStorage.getItem(WEEK_STORE) || "null");
    } catch {}

    if (!week?.days) return;

    const weekOf = week.weekOf || "";
    if (!weekOf || !isBeforeCurriculumStart(weekOf)) return;

    Object.values(week.days).forEach(day => {
      if (!day) return;

      const openCourtText = String(day.openCourtLesson || "");
      const readingText = String(day.reading || "");
      const mathText = String(day.math || "");

      if (
        openCourtText.includes("The Mice Who Lived in a Shoe") ||
        openCourtText.includes("Unit 1, Lesson 1") ||
        readingText.includes("The Mice Who Lived in a Shoe")
      ) {
        day.openCourtLesson = "";
        day.reading = "";
      }

      if (
        mathText.includes("Module 1, Lesson 1") ||
        mathText.includes("Eureka Math² Module 1")
      ) {
        day.math = "";
        day.math2 = "";
      }

      day.focus = day.focus || "Classroom Launch Week";
      day.launchRoutine = day.launchRoutine || "Routines, procedures, community, and readiness";
      day.notes = [
        day.notes || "",
        "Curriculum pacing is locked until August 3, 2026."
      ].filter(Boolean).join("\n");
    });

    week.title = "Classroom Launch Week";
    week.pillar = week.pillar || "Heart";
    week.updatedAt = new Date().toISOString();
    localStorage.setItem(WEEK_STORE, JSON.stringify(week));
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    addSettingsNavigation();
    window.addEventListener("hashchange", handleRoute);

    new MutationObserver(() => {
      const route = location.hash.replace("#", "") || "dashboard";
      if (route === "school-year-settings" && !$("#v86Settings")) renderSettings();
      if (route === "dashboard") setTimeout(injectDashboardBanner, 0);
      if (route === "first-week-builder") setTimeout(lockFirstWeekBuilder, 0);
      if (route === "lesson-plans") setTimeout(injectPlanningGuard, 0);
      if (route === "open-court") setTimeout(injectOpenCourtGuard, 0);
      if (route === "eureka-math") setTimeout(injectEurekaGuard, 0);
      if (route === "health") setTimeout(injectHealthCard, 0);
    }).observe($("#pageHost"), { childList: true, subtree: true });

    handleRoute();
  }

  function addSettingsNavigation() {
    if ($('[data-route="school-year-settings"]')) return;

    const settingsButton = $('[data-route="settings"]');
    const button = document.createElement("button");
    button.className = "nav-button";
    button.dataset.route = "school-year-settings";
    button.innerHTML = "<span>📅</span><strong>School-Year Dates</strong>";
    button.addEventListener("click", () => {
      location.hash = "school-year-settings";
    });

    if (settingsButton) settingsButton.insertAdjacentElement("beforebegin", button);
    else $("#mainNav").appendChild(button);
  }

  function handleRoute() {
    const route = location.hash.replace("#", "") || "dashboard";

    if (route === "school-year-settings") setTimeout(renderSettings, 0);
    if (route === "dashboard") setTimeout(injectDashboardBanner, 0);
    if (route === "first-week-builder") setTimeout(lockFirstWeekBuilder, 0);
    if (route === "lesson-plans") setTimeout(injectPlanningGuard, 0);
    if (route === "open-court") setTimeout(injectOpenCourtGuard, 0);
    if (route === "eureka-math") setTimeout(injectEurekaGuard, 0);
    if (route === "health") setTimeout(injectHealthCard, 0);
  }

  function renderSettings() {
    const host = $("#pageHost");
    if (!host) return;

    host.innerHTML = `
      <section id="v86Settings">
        <section class="page-header">
          <div>
            <p>VERSION 8.6</p>
            <h2>School-Year Dates & Curriculum Guard</h2>
            <span>Protect Launch Week and prevent curriculum from beginning before the approved date.</span>
          </div>
        </section>

        <section class="v86-date-grid">
          <article class="panel">
            <span>LAUNCH WEEK BEGINS</span>
            <strong>${esc(formatDate(settings.launchWeekStart))}</strong>
            <p>Classroom routines, procedures, belonging, transitions, and readiness.</p>
          </article>

          <article class="panel">
            <span>LAUNCH WEEK ENDS</span>
            <strong>${esc(formatDate(settings.launchWeekEnd))}</strong>
            <p>No regular Open Court or Eureka Math² pacing during this week.</p>
          </article>

          <article class="panel v86-curriculum-start">
            <span>CORE CURRICULUM BEGINS</span>
            <strong>${esc(formatDate(settings.curriculumStartDate))}</strong>
            <p>Open Court Unit 1, Lesson 1 and Eureka Math² Module 1, Lesson 1 begin here.</p>
          </article>
        </section>

        <section class="panel v86-settings-form">
          <h3>Curriculum Start-Date Settings</h3>

          <div class="v86-form-grid">
            <label>
              <span>Launch Week Start</span>
              <input id="v86LaunchStart" type="date" value="${esc(settings.launchWeekStart)}">
            </label>

            <label>
              <span>Launch Week End</span>
              <input id="v86LaunchEnd" type="date" value="${esc(settings.launchWeekEnd)}">
            </label>

            <label>
              <span>Curriculum Start Date</span>
              <input id="v86CurriculumStart" type="date" value="${esc(settings.curriculumStartDate)}">
            </label>
          </div>

          <label class="v86-toggle">
            <input id="v86Enforce" type="checkbox" ${settings.enforceStartDate ? "checked" : ""}>
            <span>Prevent Open Court and Eureka Math² from being assigned before the curriculum start date.</span>
          </label>

          <button id="v86SaveSettings" class="primary-button">Save School-Year Dates</button>
        </section>

        <section class="panel">
          <h3>Curriculum Start Sequence</h3>
          <div class="v86-sequence">
            <article>
              <span>OPEN COURT</span>
              <strong>Unit 1, Lesson 1</strong>
              <p>The Mice Who Lived in a Shoe</p>
            </article>
            <article>
              <span>EUREKA MATH²</span>
              <strong>Module 1, Lesson 1</strong>
              <p>Regular math pacing begins August 3, 2026.</p>
            </article>
            <article>
              <span>FOUNDATIONAL READING</span>
              <strong>Regular pacing begins</strong>
              <p>Heggerty, phonics, vocabulary, UFLI, and MOWR align to the curriculum week.</p>
            </article>
          </div>
        </section>
      </section>
    `;

    $("#v86SaveSettings")?.addEventListener("click", () => {
      settings.launchWeekStart = $("#v86LaunchStart").value;
      settings.launchWeekEnd = $("#v86LaunchEnd").value;
      settings.curriculumStartDate = $("#v86CurriculumStart").value;
      settings.enforceStartDate = $("#v86Enforce").checked;
      saveSettings();
      protectSavedWeeklyPlan();
      renderSettings();
      toast("School-year dates saved.");
    });
  }

  function injectDashboardBanner() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v86StartBanner")) return;

    const banner = document.createElement("section");
    banner.id = "v86StartBanner";
    banner.className = "v86-start-banner";
    banner.innerHTML = `
      <div>
        <p>2026–2027 CURRICULUM START</p>
        <h3>Core curriculum begins Monday, August 3, 2026</h3>
        <span>July 27–31 is reserved for Classroom Launch Week. “The Mice Who Lived in a Shoe” begins August 3.</span>
      </div>
      <button>Review Dates</button>
    `;

    banner.querySelector("button").addEventListener("click", () => {
      location.hash = "school-year-settings";
    });

    dashboard.prepend(banner);
  }

  function lockFirstWeekBuilder() {
    const builder = $("#v84");
    if (!builder || $("#v86LaunchLock")) return;

    const banner = document.createElement("section");
    banner.id = "v86LaunchLock";
    banner.className = "v86-launch-lock";
    banner.innerHTML = `
      <div>
        <p>LAUNCH WEEK LOCKED</p>
        <h3>July 27–31, 2026 is routines and community week</h3>
        <span>Regular Open Court and Eureka Math² lessons begin August 3, 2026.</span>
      </div>
    `;

    const header = $(".page-header", builder);
    header?.insertAdjacentElement("afterend", banner);
  }

  function injectPlanningGuard() {
    const studio = $("#v73PlanningStudio");
    if (!studio || $("#v86PlanningGuard")) return;

    const weekOf = $("#v73WeekOf")?.value || "";
    const guarded = settings.enforceStartDate && weekOf && isBeforeCurriculumStart(weekOf);

    const card = document.createElement("section");
    card.id = "v86PlanningGuard";
    card.className = guarded ? "v86-warning-card" : "v86-ready-card";
    card.innerHTML = guarded
      ? `
        <div>
          <p>CURRICULUM START-DATE GUARD</p>
          <h3>This week is before August 3, 2026</h3>
          <span>Use Classroom Launch lessons only. Open Court Unit 1, Lesson 1 must not begin yet.</span>
        </div>
        <button>Open First-Week Builder</button>
      `
      : `
        <div>
          <p>CURRICULUM START-DATE GUARD</p>
          <h3>Curriculum pacing is available</h3>
          <span>Open Court Unit 1, Lesson 1 begins on or after August 3, 2026.</span>
        </div>
        <button>Review Dates</button>
      `;

    card.querySelector("button").addEventListener("click", () => {
      location.hash = guarded ? "first-week-builder" : "school-year-settings";
    });

    const header = $(".v73-planning-header", studio);
    header?.insertAdjacentElement("afterend", card);
  }

  function injectOpenCourtGuard() {
    const page = $("#v81");
    if (!page || $("#v86OpenCourtGuard")) return;

    const guard = document.createElement("section");
    guard.id = "v86OpenCourtGuard";
    guard.className = "v86-curriculum-guard";
    guard.innerHTML = `
      <div>
        <p>OPEN COURT START DATE</p>
        <h3>Unit 1, Lesson 1 begins August 3, 2026</h3>
        <span>The Mice Who Lived in a Shoe is the first curriculum selection of the school year.</span>
      </div>
    `;

    const header = $(".page-header", page);
    header?.insertAdjacentElement("afterend", guard);
  }

  function injectEurekaGuard() {
    const page = $("#v82MathStudio");
    if (!page || $("#v86EurekaGuard")) return;

    const guard = document.createElement("section");
    guard.id = "v86EurekaGuard";
    guard.className = "v86-curriculum-guard";
    guard.innerHTML = `
      <div>
        <p>EUREKA MATH² START DATE</p>
        <h3>Module 1, Lesson 1 begins August 3, 2026</h3>
        <span>July 27–31 remains focused on math routines, manipulatives, discussion expectations, and readiness.</span>
      </div>
    `;

    const header = $(".page-header", page);
    header?.insertAdjacentElement("afterend", guard);
  }

  function injectHealthCard() {
    const host = $("#pageHost");
    if (!host || $("#v86HealthCard")) return;

    const panel = document.createElement("section");
    panel.id = "v86HealthCard";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 8.6 Curriculum-Date Health</h3>
      <div class="health-grid">
        ${healthItem("Launch Week start", settings.launchWeekStart === "2026-07-27", formatDate(settings.launchWeekStart))}
        ${healthItem("Launch Week end", settings.launchWeekEnd === "2026-07-31", formatDate(settings.launchWeekEnd))}
        ${healthItem("Curriculum start", settings.curriculumStartDate === "2026-08-03", formatDate(settings.curriculumStartDate))}
        ${healthItem("Start-date enforcement", settings.enforceStartDate, settings.enforceStartDate ? "Enabled" : "Disabled")}
      </div>
      <button class="secondary-button">Review School-Year Dates</button>
    `;

    panel.querySelector("button").addEventListener("click", () => {
      location.hash = "school-year-settings";
    });

    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div>
          <span>${esc(title)}</span>
          <small>${esc(detail)}</small>
        </div>
      </article>
    `;
  }

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();


/* Version 8.7 — Curriculum Week 1 Builder & August 3 Launch */
(() => {
  "use strict";

  const STORE = "thh-v87:curriculum-week-1";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const PRINT_STORE = "thh-v74:print-center";

  let config = null;
  let state = {
    generated: false,
    days: {},
    heggertyFocus: "",
    ufliFocus: "",
    phonicsFocus: "",
    vocabularyFocus: "",
    writingProgram: "Building the Foundation / GUM",
    scienceUnit: "",
    socialStudiesUnit: "",
    ready: {},
    notes: {}
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
        state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
      } catch {}
      waitForShell();
    } catch (error) {
      console.warn("Version 8.7 could not start.", error);
    }
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    addNavigation();
    window.addEventListener("hashchange", route);

    new MutationObserver(() => {
      const current = location.hash.replace("#", "") || "dashboard";
      if (current === "curriculum-week-1" && !$("#v87Builder")) renderBuilder();
      if (current === "dashboard") setTimeout(injectDashboardCard, 0);
      if (current === "lesson-plans") setTimeout(injectPlanningCard, 0);
      if (current === "health") setTimeout(injectHealthCard, 0);
    }).observe($("#pageHost"), { childList: true, subtree: true });

    route();
  }

  function addNavigation() {
    if ($('[data-route="curriculum-week-1"]')) return;

    const firstWeek = $('[data-route="first-week-builder"]');
    const button = document.createElement("button");
    button.className = "nav-button";
    button.dataset.route = "curriculum-week-1";
    button.innerHTML = "<span>1</span><strong>Curriculum Week 1</strong>";
    button.addEventListener("click", () => {
      location.hash = "curriculum-week-1";
    });

    if (firstWeek) firstWeek.insertAdjacentElement("afterend", button);
    else $("#mainNav").appendChild(button);
  }

  function route() {
    const current = location.hash.replace("#", "") || "dashboard";
    if (current === "curriculum-week-1") setTimeout(renderBuilder, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "lesson-plans") setTimeout(injectPlanningCard, 0);
    if (current === "health") setTimeout(injectHealthCard, 0);
  }

  function generateDay(day, details, index) {
    const mathLesson = Number(config.curriculumWeek1.eureka.startingLesson) + index;

    return {
      day,
      date: details.date,
      openCourtLesson: "Unit 1, Lesson 1 — The Mice Who Lived in a Shoe",
      reading: details.readingFocus,
      heggerty: state.heggertyFocus || "Enter the current Heggerty week and daily focus.",
      ufli: state.ufliFocus || "Enter the current UFLI lesson or aligned foundational skill.",
      phonics: state.phonicsFocus || "Use the Open Court Unit 1 Lesson 1 phonics skill and aligned practice.",
      vocabulary: state.vocabularyFocus || "Introduce and practice the Unit 1 Lesson 1 vocabulary.",
      writing: `${state.writingProgram}\n${details.writingFocus}`,
      math: `Eureka Math² Module 1, Lesson ${mathLesson}`,
      math2: "Spiral review, fact fluency, exit-ticket review, or small-group reteach.",
      science: `${state.scienceUnit || "Selected science unit"}\n${details.scienceFocus}`,
      socialStudies: `${state.socialStudiesUnit || "Selected social studies unit"}\n${details.socialStudiesFocus}`,
      differentiation: config.curriculumWeek1.defaultSupports,
      assessment: day === "Friday"
        ? "Complete approved weekly phonics, vocabulary, spelling, GUM, reading, math, science, and social studies checks as scheduled."
        : "Use observation, oral response, student work, and subject-specific exit tickets.",
      materials: "",
      notes: state.notes[day] || "",
      ready: Boolean(state.ready[day])
    };
  }

  function generateWeek() {
    const days = {};
    Object.entries(config.curriculumWeek1.days).forEach(([day, details], index) => {
      days[day] = generateDay(day, details, index);
    });
    state.days = days;
    state.generated = true;
    save();
    renderBuilder();
    toast("Curriculum Week 1 generated for August 3–7, 2026.");
  }

  function renderBuilder() {
    const host = $("#pageHost");
    if (!host) return;

    const readyCount = Object.values(state.ready).filter(Boolean).length;

    host.innerHTML = `
      <section id="v87Builder">
        <section class="page-header">
          <div>
            <p>VERSION 8.7</p>
            <h2>Curriculum Week 1 Builder</h2>
            <span>Build the first regular curriculum week beginning Monday, August 3, 2026.</span>
          </div>
          <div class="button-row">
            <button id="v87Generate" class="primary-button">Generate August 3 Week</button>
            <button id="v87Reset" class="secondary-button">Reset</button>
          </div>
        </section>

        <section class="v87-start-card">
          <div>
            <p>CURRICULUM START</p>
            <h3>Monday, August 3, 2026</h3>
            <span>Open Court Unit 1, Lesson 1: The Mice Who Lived in a Shoe</span>
          </div>
          <div>
            <strong>Eureka Math²</strong>
            <span>Module 1 begins this week</span>
          </div>
        </section>

        <section class="panel v87-setup">
          <h3>Week 1 Curriculum Setup</h3>
          <div class="v87-setup-grid">
            ${input("heggertyFocus","Heggerty Week / Focus",state.heggertyFocus)}
            ${input("ufliFocus","UFLI Lesson / Skill",state.ufliFocus)}
            ${input("phonicsFocus","Phonics Focus",state.phonicsFocus)}
            ${input("vocabularyFocus","Vocabulary Focus",state.vocabularyFocus)}
            ${input("writingProgram","Writing Program / Unit",state.writingProgram)}
            ${input("scienceUnit","Science Unit",state.scienceUnit)}
            ${input("socialStudiesUnit","Social Studies Unit",state.socialStudiesUnit)}
          </div>
        </section>

        ${state.generated ? `
          <section class="v87-summary">
            <div>
              <p>CURRICULUM WEEK 1</p>
              <h3>${readyCount}/5 days ready</h3>
              <span>August 3–7, 2026 • Pillar: ${esc(config.curriculumWeek1.pillar)}</span>
            </div>
            <div class="button-row">
              <button id="v87SendWeek" class="primary-button">Send All 5 Days to Weekly Planning</button>
              <button id="v87BuildPrint" class="secondary-button">Build Week 1 Print Queue</button>
              <button id="v87Print" class="secondary-button">Print Week</button>
            </div>
          </section>

          <section class="v87-days">
            ${Object.entries(state.days).map(([day, item]) => dayCard(day, item)).join("")}
          </section>
        ` : `
          <div class="empty-state">
            <strong>Curriculum Week 1 has not been generated.</strong>
            <p>Enter the known curriculum details, then choose Generate August 3 Week.</p>
          </div>
        `}
      </section>
    `;

    wireBuilder();
  }

  function input(key, label, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <input data-v87-setting="${key}" value="${esc(value)}">
      </label>
    `;
  }

  function dayCard(day, item) {
    return `
      <article class="panel v87-day-card ${state.ready[day] ? "ready" : ""}">
        <div class="v87-day-heading">
          <div>
            <span>${esc(day)} • ${esc(formatDate(item.date))}</span>
            <h3>${esc(item.openCourtLesson)}</h3>
          </div>
          <label>
            <input type="checkbox" data-v87-ready="${day}" ${state.ready[day] ? "checked" : ""}>
            Ready
          </label>
        </div>

        <div class="v87-subject-grid">
          ${editable(day,"reading","Reading",item.reading)}
          ${editable(day,"phonics","Phonics",item.phonics)}
          ${editable(day,"vocabulary","Vocabulary",item.vocabulary)}
          ${editable(day,"heggerty","Heggerty",item.heggerty)}
          ${editable(day,"ufli","UFLI / MOWR",item.ufli)}
          ${editable(day,"writing","Writing",item.writing)}
          ${editable(day,"math","Math",item.math)}
          ${editable(day,"math2","Math 2",item.math2)}
          ${editable(day,"science","Science",item.science)}
          ${editable(day,"socialStudies","Social Studies",item.socialStudies)}
          ${editable(day,"assessment","Assessment",item.assessment)}
          ${editable(day,"materials","Materials",item.materials)}
        </div>

        <label class="v87-notes">
          <span>Teacher Notes</span>
          <textarea data-v87-field="${day}" data-v87-key="notes">${esc(item.notes || "")}</textarea>
        </label>

        <button data-v87-copy="${day}" class="secondary-button">Copy Planbook Text</button>
      </article>
    `;
  }

  function editable(day, key, label, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <textarea data-v87-field="${day}" data-v87-key="${key}">${esc(value)}</textarea>
      </label>
    `;
  }

  function wireBuilder() {
    $$("[data-v87-setting]").forEach(control => {
      control.addEventListener("input", () => {
        state[control.dataset.v87Setting] = control.value;
        save();
      });
    });

    $("#v87Generate")?.addEventListener("click", generateWeek);

    $("#v87Reset")?.addEventListener("click", () => {
      state.generated = false;
      state.days = {};
      state.ready = {};
      state.notes = {};
      save();
      renderBuilder();
    });

    $$("[data-v87-ready]").forEach(input => {
      input.addEventListener("change", () => {
        state.ready[input.dataset.v87Ready] = input.checked;
        if (state.days[input.dataset.v87Ready]) {
          state.days[input.dataset.v87Ready].ready = input.checked;
        }
        save();
        renderBuilder();
      });
    });

    $$("[data-v87-field]").forEach(field => {
      field.addEventListener("input", () => {
        const day = field.dataset.v87Field;
        const key = field.dataset.v87Key;
        if (!state.days[day]) return;
        state.days[day][key] = field.value;
        if (key === "notes") state.notes[day] = field.value;
        save();
      });
    });

    $$("[data-v87-copy]").forEach(button => {
      button.addEventListener("click", () => copyPlanbook(button.dataset.v87Copy));
    });

    $("#v87SendWeek")?.addEventListener("click", sendToWeeklyPlanning);
    $("#v87BuildPrint")?.addEventListener("click", buildPrintQueue);
    $("#v87Print")?.addEventListener("click", () => window.print());
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString("en-US", { month:"short", day:"numeric" });
  }

  function planbookText(day) {
    const item = state.days[day];
    return [
      `${day.toUpperCase()} — ${item.date}`,
      "",
      "OPEN COURT",
      item.openCourtLesson,
      "",
      "READING",
      item.reading,
      "",
      "HEGGERTY",
      item.heggerty,
      "",
      "UFLI / MOWR",
      item.ufli,
      "",
      "PHONICS",
      item.phonics,
      "",
      "VOCABULARY",
      item.vocabulary,
      "",
      "WRITING",
      item.writing,
      "",
      "EUREKA MATH²",
      item.math,
      "",
      "MATH 2",
      item.math2,
      "",
      "SCIENCE",
      item.science,
      "",
      "SOCIAL STUDIES",
      item.socialStudies,
      "",
      "DIFFERENTIATION",
      item.differentiation,
      "",
      "ASSESSMENT",
      item.assessment,
      "",
      "MATERIALS",
      item.materials,
      "",
      "TEACHER NOTES",
      item.notes
    ].join("\n");
  }

  async function copyPlanbook(day) {
    const text = planbookText(day);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    toast(`${day} Planbook text copied.`);
  }

  function sendToWeeklyPlanning() {
    if (!state.generated) return;

    let week = null;
    try {
      week = JSON.parse(localStorage.getItem(WEEK_STORE) || "null");
    } catch {}

    if (!week?.days) {
      week = {
        title: config.curriculumWeek1.title,
        weekOf: config.curriculumWeek1.weekOf,
        pillar: config.curriculumWeek1.pillar,
        days: {},
        printQueue: []
      };
    }

    Object.entries(state.days).forEach(([day, item]) => {
      week.days[day] = {
        ...(week.days[day] || {}),
        day,
        date: item.date,
        focus: item.openCourtLesson,
        openCourtLesson: item.openCourtLesson,
        heggerty: item.heggerty,
        ufli: item.ufli,
        mowr: item.ufli,
        phonics: item.phonics,
        vocabulary: item.vocabulary,
        reading: item.reading,
        writing: item.writing,
        math: item.math,
        math2: item.math2,
        science: item.science,
        socialStudies: item.socialStudies,
        differentiation: item.differentiation,
        assessment: item.assessment,
        materials: item.materials,
        notes: item.notes,
        complete: Boolean(state.ready[day])
      };
    });

    week.title = config.curriculumWeek1.title;
    week.weekOf = config.curriculumWeek1.weekOf;
    week.pillar = config.curriculumWeek1.pillar;
    week.updatedAt = new Date().toISOString();

    localStorage.setItem(WEEK_STORE, JSON.stringify(week));
    toast("Curriculum Week 1 sent to Weekly Planning.");
    setTimeout(() => {
      location.hash = "lesson-plans";
    }, 650);
  }

  function buildPrintQueue() {
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem(PRINT_STORE) || "[]");
    } catch {}

    const items = Object.entries(state.days).flatMap(([day, item], index) => [
      {
        id: `v87-oc-${index}`,
        source: "Curriculum Week 1",
        day,
        title: `${item.openCourtLesson} materials`,
        category: "Open Court",
        copies: 1,
        notes: "Add the authorized Skills Practice and lesson resources.",
        url: "",
        complete: false
      },
      {
        id: `v87-math-${index}`,
        source: "Curriculum Week 1",
        day,
        title: `${item.math} materials and exit ticket`,
        category: "Eureka Math²",
        copies: 1,
        notes: "",
        url: "",
        complete: false
      }
    ]);

    queue = [
      ...queue.filter(item => !String(item.id).startsWith("v87-")),
      ...items
    ];

    localStorage.setItem(PRINT_STORE, JSON.stringify(queue));
    toast("Curriculum Week 1 items added to the Print Center.");
    setTimeout(() => {
      location.hash = "forms";
    }, 650);
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v87DashboardCard")) return;

    const ready = Object.values(state.ready).filter(Boolean).length;
    const card = document.createElement("section");
    card.id = "v87DashboardCard";
    card.className = "v87-dashboard-card";
    card.innerHTML = `
      <div>
        <p>CURRICULUM WEEK 1</p>
        <h3>${state.generated ? `${ready}/5 days ready` : "Build August 3–7, 2026"}</h3>
        <span>The Mice Who Lived in a Shoe begins Monday, August 3.</span>
      </div>
      <button>Open Week 1 Builder</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      location.hash = "curriculum-week-1";
    });
    dashboard.prepend(card);
  }

  function injectPlanningCard() {
    const studio = $("#v73PlanningStudio");
    if (!studio || $("#v87PlanningCard")) return;

    const card = document.createElement("section");
    card.id = "v87PlanningCard";
    card.className = "v87-injected-card";
    card.innerHTML = `
      <div>
        <p>AUGUST 3 CURRICULUM LAUNCH</p>
        <h3>${state.generated ? "Curriculum Week 1 is ready to review" : "Build the first curriculum week"}</h3>
        <span>Open Court Unit 1 Lesson 1 and Eureka Math² Module 1 begin this week.</span>
      </div>
      <button>Open Builder</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      location.hash = "curriculum-week-1";
    });
    $(".v73-planning-header", studio)?.insertAdjacentElement("afterend", card);
  }

  function injectHealthCard() {
    const host = $("#pageHost");
    if (!host || $("#v87HealthCard")) return;

    const dayCount = state.generated ? Object.keys(state.days).length : 0;
    const panel = document.createElement("section");
    panel.id = "v87HealthCard";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 8.7 Curriculum Week 1 Health</h3>
      <div class="health-grid">
        ${healthItem("Week start", config.curriculumWeek1.weekOf === "2026-08-03", "August 3, 2026")}
        ${healthItem("Open Court start", config.curriculumWeek1.openCourt.title === "The Mice Who Lived in a Shoe", config.curriculumWeek1.openCourt.title)}
        ${healthItem("Generated days", dayCount === 5, `${dayCount}/5`)}
        ${healthItem("Eureka sequence", config.curriculumWeek1.eureka.module === 1, "Module 1")}
      </div>
      <button class="secondary-button">Open Curriculum Week 1</button>
    `;
    panel.querySelector("button").addEventListener("click", () => {
      location.hash = "curriculum-week-1";
    });
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>
    `;
  }

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();



/* Version 10.0 — Teacher Intelligence Engine Foundation */
(() => {
  "use strict";

  const STORE = "thh-v100:intelligence-engine";
  const WEEK_STORE = "thh-v73:weekly-plan";

  let config = null;
  let state = {
    selectedWeek: "2026-07-27",
    weeks: {},
    exceptions: [],
    curriculumOverrides: {},
    generatedAt: ""
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(r => r.json());
      try {
        state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
      } catch {}
      ensureCoreWeeks();
      waitForShell();
    } catch (error) {
      console.warn("Version 10.0 could not start.", error);
    }
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function ensureCoreWeeks() {
    if (!state.weeks["2026-07-27"]) {
      state.weeks["2026-07-27"] = {
        ...config.yearPlannerDefaultsV10.launchWeek,
        status: "Protected",
        pillar: "Heart",
        curriculumLocked: true
      };
    }

    if (!state.weeks["2026-08-03"]) {
      state.weeks["2026-08-03"] = {
        ...config.yearPlannerDefaultsV10.curriculumWeek1,
        status: "Ready to Build",
        pillar: "Heart",
        curriculumLocked: false,
        openCourtUnit: 1,
        openCourtLesson: 1,
        eurekaModule: 1,
        eurekaStartingLesson: 1,
        heggerty: config.curriculumRegistryV10.heggerty.defaultFocus,
        ufli: config.curriculumRegistryV10.ufli.defaultFocus,
        writing: config.curriculumRegistryV10.writing.defaultProgram,
        science: config.curriculumRegistryV10.science.defaultFocus,
        socialStudies: config.curriculumRegistryV10.socialStudies.defaultFocus
      };
    }

    save();
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    window.addEventListener("hashchange", route);

    new MutationObserver(() => {
      const current = location.hash.replace("#", "") || "dashboard";
      if (current === "intelligence-engine" && !$("#v100Engine")) renderEngine();
      if (current === "dashboard") setTimeout(injectDashboardCard, 0);
      if (current === "lesson-plans") setTimeout(injectPlanningCard, 0);
      if (current === "health") setTimeout(injectHealthCard, 0);
    }).observe($("#pageHost"), { childList: true, subtree: true });

    route();
  }

  function route() {
    const current = location.hash.replace("#", "") || "dashboard";
    if (current === "intelligence-engine") setTimeout(renderEngine, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "lesson-plans") setTimeout(injectPlanningCard, 0);
    if (current === "health") setTimeout(injectHealthCard, 0);
  }

  function sortedWeeks() {
    return Object.values(state.weeks).sort((a, b) => a.weekOf.localeCompare(b.weekOf));
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function currentWeek() {
    return state.weeks[state.selectedWeek] || sortedWeeks()[0];
  }

  function renderEngine() {
    const host = $("#pageHost");
    if (!host) return;

    const week = currentWeek();
    const registry = config.curriculumRegistryV10;

    host.innerHTML = `
      <section id="v100Engine">
        <section class="page-header">
          <div>
            <p>VERSION 10.0</p>
            <h2>Teacher Intelligence Engine</h2>
            <span>One curriculum registry, one school-year timeline, and one source of truth for weekly planning.</span>
          </div>
          <div class="button-row">
            <button id="v100GenerateYear" class="primary-button">Generate School-Year Weeks</button>
            <button id="v100SendWeek" class="secondary-button">Send Selected Week to Planning</button>
          </div>
        </section>

        <section class="v100-start-rules">
          <article>
            <span>LAUNCH WEEK</span>
            <strong>July 27–31, 2026</strong>
            <p>Routines, procedures, community, and readiness only.</p>
          </article>
          <article class="curriculum">
            <span>CORE CURRICULUM START</span>
            <strong>August 3, 2026</strong>
            <p>The Mice Who Lived in a Shoe and Eureka Math² Module 1 begin.</p>
          </article>
          <article>
            <span>CENTRAL REGISTRY</span>
            <strong>${config.teacherIntelligenceEngine.curriculumAreas.length} curriculum areas</strong>
            <p>All weekly assignments reference one shared registry.</p>
          </article>
        </section>

        <section class="v100-layout">
          <aside class="panel v100-week-list">
            <div class="v100-list-heading">
              <h3>School-Year Weeks</h3>
              <button id="v100AddWeek">Add Week</button>
            </div>
            <div>
              ${sortedWeeks().map(item => `
                <button data-v100-week="${esc(item.weekOf)}" class="${item.weekOf === state.selectedWeek ? "active" : ""}">
                  <span>${esc(formatDate(item.weekOf))}</span>
                  <strong>${esc(item.title)}</strong>
                  <small>${esc(item.weekType)}</small>
                </button>
              `).join("")}
            </div>
          </aside>

          <main class="v100-main">
            ${week ? weekEditor(week) : `
              <div class="empty-state">
                <strong>No week selected.</strong>
              </div>
            `}
          </main>

          <aside class="panel v100-registry">
            <h3>Curriculum Registry</h3>
            ${registryCard("Open Court", registry.openCourt.startDate, "Unit 1, Lesson 1", registry.openCourt.startTitle)}
            ${registryCard("Eureka Math²", registry.eurekaMath.startDate, "Module 1, Lesson 1", "Regular pacing begins")}
            ${registryCard("Heggerty", registry.heggerty.startDate, "Foundational Reading", registry.heggerty.defaultFocus)}
            ${registryCard("UFLI", registry.ufli.startDate, "Foundational Reading", registry.ufli.defaultFocus)}
            ${registryCard("Writing / GUM", registry.writing.startDate, "Writing", registry.writing.defaultProgram)}
            ${registryCard("Science", registry.science.startDate, "Science", registry.science.defaultFocus)}
            ${registryCard("Social Studies", registry.socialStudies.startDate, "Social Studies", registry.socialStudies.defaultFocus)}
          </aside>
        </section>
      </section>
    `;

    wireEngine();
  }

  function registryCard(title, date, label, detail) {
    return `
      <article>
        <span>${esc(title)}</span>
        <strong>${esc(label)}</strong>
        <small>Starts ${esc(formatDate(date))}</small>
        <p>${esc(detail)}</p>
      </article>
    `;
  }

  function weekEditor(week) {
    return `
      <section class="panel v100-week-editor ${week.curriculumLocked ? "locked" : ""}">
        <div class="v100-week-heading">
          <div>
            <p>${esc(week.weekType)}</p>
            <h2>${esc(week.title)}</h2>
            <span>Week of ${esc(formatDate(week.weekOf))}</span>
          </div>
          <b>${week.curriculumLocked ? "Curriculum Locked" : esc(week.status || "Draft")}</b>
        </div>

        <div class="v100-form-grid">
          ${textField("title", "Week Title", week.title)}
          ${selectField("weekType", "Week Type", config.teacherIntelligenceEngine.defaultWeekTypes, week.weekType)}
          ${textField("pillar", "Pillar", week.pillar || "Heart")}
          ${textField("status", "Status", week.status || "Draft")}
        </div>

        ${week.curriculumLocked ? `
          <section class="v100-lock-message">
            <strong>Launch Week is protected.</strong>
            <p>Open Court, Eureka Math², and regular curriculum pacing are unavailable before August 3, 2026.</p>
          </section>
        ` : `
          <section class="v100-curriculum-editor">
            <h3>Weekly Curriculum Assignment</h3>
            <div class="v100-form-grid">
              ${numberField("openCourtUnit", "Open Court Unit", week.openCourtUnit || 1, 1, 6)}
              ${numberField("openCourtLesson", "Open Court Lesson", week.openCourtLesson || 1, 1, 6)}
              ${numberField("eurekaModule", "Eureka Module", week.eurekaModule || 1, 1, 6)}
              ${numberField("eurekaStartingLesson", "Starting Math Lesson", week.eurekaStartingLesson || 1, 1, 60)}
              ${textField("heggerty", "Heggerty Focus", week.heggerty || "")}
              ${textField("ufli", "UFLI Focus", week.ufli || "")}
              ${textField("writing", "Writing / GUM", week.writing || "")}
              ${textField("science", "Science", week.science || "")}
              ${textField("socialStudies", "Social Studies", week.socialStudies || "")}
            </div>
          </section>
        `}

        <label class="v100-notes">
          <span>Week Notes</span>
          <textarea data-v100-field="notes">${esc(week.notes || "")}</textarea>
        </label>

        <div class="button-row">
          <button id="v100SaveWeek" class="primary-button">Save Week</button>
          ${week.curriculumLocked ? "" : `<button id="v100BuildAssignment" class="secondary-button">Build Automatic Assignment</button>`}
          <button id="v100DeleteWeek" class="danger-button">Delete Week</button>
        </div>
      </section>
    `;
  }

  function textField(key, label, value) {
    return `<label><span>${esc(label)}</span><input data-v100-field="${key}" value="${esc(value || "")}"></label>`;
  }

  function numberField(key, label, value, min, max) {
    return `<label><span>${esc(label)}</span><input data-v100-field="${key}" type="number" min="${min}" max="${max}" value="${esc(value)}"></label>`;
  }

  function selectField(key, label, options, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <select data-v100-field="${key}">
          ${options.map(option => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function wireEngine() {
    $$("[data-v100-week]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedWeek = button.dataset.v100Week;
        save();
        renderEngine();
      });
    });

    $("#v100AddWeek")?.addEventListener("click", addWeek);
    $("#v100GenerateYear")?.addEventListener("click", generateYear);
    $("#v100SendWeek")?.addEventListener("click", sendSelectedWeek);
    $("#v100SaveWeek")?.addEventListener("click", saveCurrentWeek);
    $("#v100BuildAssignment")?.addEventListener("click", buildAssignment);
    $("#v100DeleteWeek")?.addEventListener("click", deleteCurrentWeek);
  }

  function collectWeekFields() {
    const week = currentWeek();
    $$("[data-v100-field]").forEach(control => {
      const key = control.dataset.v100Field;
      week[key] = control.type === "number" ? Number(control.value) : control.value;
    });
    return week;
  }

  function saveCurrentWeek() {
    const week = collectWeekFields();
    state.weeks[week.weekOf] = week;
    save();
    renderEngine();
    toast("Week saved.");
  }

  function buildAssignment() {
    const week = collectWeekFields();
    const unit = config.openCourtUnits.find(item => item.unit === Number(week.openCourtUnit));
    const lesson = unit?.lessons?.find(item => item.lesson === Number(week.openCourtLesson));

    week.openCourt = lesson
      ? `Unit ${week.openCourtUnit}, Lesson ${week.openCourtLesson} — ${lesson.title}`
      : `Unit ${week.openCourtUnit}, Lesson ${week.openCourtLesson}`;

    week.eureka = `Module ${week.eurekaModule}, starting Lesson ${week.eurekaStartingLesson}`;
    week.status = "Assignment Built";
    state.weeks[week.weekOf] = week;
    save();
    renderEngine();
    toast("Automatic weekly assignment built.");
  }

  function addWeek() {
    const weekOf = prompt("Enter the Monday date for this week (YYYY-MM-DD):", "");
    if (!weekOf) return;

    if (state.weeks[weekOf]) {
      state.selectedWeek = weekOf;
      save();
      renderEngine();
      return;
    }

    state.weeks[weekOf] = {
      weekOf,
      title: "New Planning Week",
      weekType: "Custom Week",
      pillar: "Heart",
      status: "Draft",
      curriculumLocked: weekOf < config.teacherIntelligenceEngine.curriculumStartDate,
      notes: ""
    };
    state.selectedWeek = weekOf;
    save();
    renderEngine();
  }

  function generateYear() {
    const start = new Date("2026-07-27T12:00:00");
    const end = new Date("2027-05-31T12:00:00");
    let cursor = new Date(start);
    let curriculumWeek = 0;

    while (cursor <= end) {
      const weekOf = cursor.toISOString().slice(0,10);

      if (!state.weeks[weekOf]) {
        const locked = weekOf < config.teacherIntelligenceEngine.curriculumStartDate;
        if (!locked) curriculumWeek += 1;

        state.weeks[weekOf] = {
          weekOf,
          title: locked ? "Classroom Launch Week" : `Curriculum Week ${curriculumWeek}`,
          weekType: locked ? "Launch Week" : "Curriculum Week",
          pillar: "Heart",
          status: locked ? "Protected" : "Draft",
          curriculumLocked: locked,
          openCourtUnit: 1,
          openCourtLesson: 1,
          eurekaModule: 1,
          eurekaStartingLesson: Math.max(1, ((curriculumWeek - 1) * 5) + 1),
          heggerty: config.curriculumRegistryV10.heggerty.defaultFocus,
          ufli: config.curriculumRegistryV10.ufli.defaultFocus,
          writing: config.curriculumRegistryV10.writing.defaultProgram,
          science: config.curriculumRegistryV10.science.defaultFocus,
          socialStudies: config.curriculumRegistryV10.socialStudies.defaultFocus,
          notes: ""
        };
      }

      cursor.setDate(cursor.getDate() + 7);
    }

    state.generatedAt = new Date().toISOString();
    save();
    renderEngine();
    toast("School-year planning weeks generated.");
  }

  function deleteCurrentWeek() {
    const week = currentWeek();
    if (!week || ["2026-07-27","2026-08-03"].includes(week.weekOf)) {
      toast("The Launch Week and Curriculum Week 1 records are protected.");
      return;
    }

    if (!confirm(`Delete ${week.title}?`)) return;
    delete state.weeks[week.weekOf];
    state.selectedWeek = "2026-08-03";
    save();
    renderEngine();
  }

  function sendSelectedWeek() {
    const week = currentWeek();
    if (!week) return;

    const days = {};
    const dayNames = config.teacherIntelligenceEngine.weekdays;

    dayNames.forEach((day, index) => {
      days[day] = week.curriculumLocked
        ? {
            day,
            focus: "Classroom Launch Week",
            launchRoutine: "Routines, procedures, community, transitions, independence, and readiness.",
            morningMeeting: "Community building and classroom procedure practice.",
            reading: "",
            math: "",
            differentiation: config.curriculumWeek1?.defaultSupports || "",
            assessment: "Teacher observation and informal readiness checks.",
            notes: week.notes || "",
            complete: false
          }
        : {
            day,
            focus: week.openCourt || `Open Court Unit ${week.openCourtUnit}, Lesson ${week.openCourtLesson}`,
            openCourtLesson: week.openCourt || `Unit ${week.openCourtUnit}, Lesson ${week.openCourtLesson}`,
            heggerty: week.heggerty || "",
            ufli: week.ufli || "",
            mowr: week.ufli || "",
            phonics: "Use the aligned Open Court phonics skill and authorized Skills Practice.",
            vocabulary: "Use the aligned Open Court weekly vocabulary.",
            reading: week.openCourt || "",
            writing: week.writing || "",
            math: `Eureka Math² Module ${week.eurekaModule}, Lesson ${Number(week.eurekaStartingLesson) + index}`,
            math2: "Spiral review, fact fluency, exit-ticket review, or small-group reteach.",
            science: week.science || "",
            socialStudies: week.socialStudies || "",
            differentiation: config.curriculumWeek1?.defaultSupports || "",
            assessment: day === "Friday"
              ? "Complete approved weekly assessments and record evidence."
              : "Use observation, oral response, student work, and exit tickets.",
            materials: "",
            notes: week.notes || "",
            complete: false
          };
    });

    const payload = {
      title: week.title,
      weekOf: week.weekOf,
      pillar: week.pillar || "Heart",
      days,
      printQueue: [],
      updatedAt: new Date().toISOString(),
      source: "Teacher Intelligence Engine"
    };

    localStorage.setItem(WEEK_STORE, JSON.stringify(payload));
    toast(`${week.title} sent to Weekly Planning.`);
    setTimeout(() => location.hash = "lesson-plans", 650);
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v100DashboardCard")) return;

    const card = document.createElement("section");
    card.id = "v100DashboardCard";
    card.className = "v100-dashboard-card";
    card.innerHTML = `
      <div>
        <p>TEACHER INTELLIGENCE ENGINE</p>
        <h3>${sortedWeeks().length} school-year week record(s)</h3>
        <span>Central curriculum registry and automatic weekly assignments.</span>
      </div>
      <button>Open Intelligence Engine</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "intelligence-engine";
    dashboard.prepend(card);
  }

  function injectPlanningCard() {
    const studio = $("#v73PlanningStudio");
    if (!studio || $("#v100PlanningCard")) return;

    const card = document.createElement("section");
    card.id = "v100PlanningCard";
    card.className = "v100-injected-card";
    card.innerHTML = `
      <div>
        <p>CENTRAL WEEK ASSIGNMENT</p>
        <h3>${esc(currentWeek()?.title || "No week selected")}</h3>
        <span>Build or revise the selected week from the Teacher Intelligence Engine.</span>
      </div>
      <button>Open Engine</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "intelligence-engine";
    $(".v73-planning-header", studio)?.insertAdjacentElement("afterend", card);
  }

  function injectHealthCard() {
    const host = $("#pageHost");
    if (!host || $("#v100HealthCard")) return;

    const panel = document.createElement("section");
    panel.id = "v100HealthCard";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 10.0 Intelligence Engine Health</h3>
      <div class="health-grid">
        ${healthItem("Curriculum registry", Boolean(config.curriculumRegistryV10), `${config.teacherIntelligenceEngine.curriculumAreas.length} areas`)}
        ${healthItem("Launch Week protection", Boolean(state.weeks["2026-07-27"]?.curriculumLocked), "July 27–31")}
        ${healthItem("Curriculum Week 1", Boolean(state.weeks["2026-08-03"]), "August 3")}
        ${healthItem("School-year weeks", sortedWeeks().length > 2, `${sortedWeeks().length} generated`)}
      </div>
      <button class="secondary-button">Open Intelligence Engine</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "intelligence-engine";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>
    `;
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


/* =====================================================================
   Version 11.0 — Clean Stable Foundation
   This module is the authoritative navigation and dashboard-cleanup layer.
   ===================================================================== */
(() => {
  "use strict";

  const NAV_KEY = "thh-v110:navigation";
  const DASHBOARD_KEY = "thh-v110:dashboard";
  let config = null;
  let navState = {};
  let dashboardState = { focusMode: false };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function bootV11() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`tos-data.json returned ${response.status}`);
        return response.json();
      });

      try {
        navState = JSON.parse(localStorage.getItem(NAV_KEY) || "{}");
      } catch {
        navState = {};
      }

      try {
        dashboardState = {
          ...dashboardState,
          ...JSON.parse(localStorage.getItem(DASHBOARD_KEY) || "{}")
        };
      } catch {}

      waitForShell();
    } catch (error) {
      console.error("Version 11.0 failed to initialize.", error);
    }
  }

  function waitForShell() {
    if (!document.querySelector("#mainNav") || !document.querySelector("#pageHost")) {
      window.setTimeout(waitForShell, 100);
      return;
    }

    window.setTimeout(buildAuthoritativeNavigation, 800);
    window.setTimeout(buildAuthoritativeNavigation, 1800);

    window.addEventListener("hashchange", () => {
      updateActiveRoute();
      openCurrentGroup();
      if (currentRoute() === "dashboard") window.setTimeout(cleanDashboard, 60);
    });

    new MutationObserver(() => {
      if (!document.querySelector("#v110Navigation")) {
        window.setTimeout(buildAuthoritativeNavigation, 120);
      }
      if (currentRoute() === "dashboard") {
        window.setTimeout(cleanDashboard, 80);
      }
    }).observe(document.body, { childList: true, subtree: true });

    if (currentRoute() === "dashboard") window.setTimeout(cleanDashboard, 80);
  }

  function navigationGroups() {
    return config.navigationV11 || [];
  }

  function buildAuthoritativeNavigation() {
    const nav = document.querySelector("#mainNav");
    if (!nav) return;

    const wrapper = document.createElement("div");
    wrapper.id = "v110Navigation";
    wrapper.className = "v110-navigation";

    navigationGroups().forEach(group => {
      if (typeof navState[group.id] !== "boolean") {
        navState[group.id] = Boolean(group.open);
      }

      const section = document.createElement("section");
      section.className = "v110-nav-group";
      section.dataset.group = group.id;

      const heading = document.createElement("button");
      heading.type = "button";
      heading.className = "v110-nav-heading";
      heading.setAttribute("aria-expanded", String(navState[group.id]));
      heading.innerHTML = `
        <span>${escapeHtml(group.title)}</span>
        <b aria-hidden="true">${navState[group.id] ? "−" : "+"}</b>
      `;

      const body = document.createElement("div");
      body.className = "v110-nav-body";
      body.hidden = !navState[group.id];

      group.items.forEach(([route, label, icon]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nav-button v110-route";
        button.dataset.route = route;
        button.innerHTML = `
          <span aria-hidden="true">${escapeHtml(icon)}</span>
          <strong>${escapeHtml(label)}</strong>
        `;
        button.addEventListener("click", () => {
          location.hash = route;
          document.body.classList.remove("nav-open");
        });
        body.appendChild(button);
      });

      heading.addEventListener("click", () => {
        navState[group.id] = !navState[group.id];
        body.hidden = !navState[group.id];
        heading.setAttribute("aria-expanded", String(navState[group.id]));
        heading.querySelector("b").textContent = navState[group.id] ? "−" : "+";
        localStorage.setItem(NAV_KEY, JSON.stringify(navState));
      });

      section.append(heading, body);
      wrapper.appendChild(section);
    });

    nav.replaceChildren(wrapper);
    localStorage.setItem(NAV_KEY, JSON.stringify(navState));
    updateActiveRoute();
    openCurrentGroup();
  }

  function currentRoute() {
    return location.hash.replace("#", "") || "dashboard";
  }

  function updateActiveRoute() {
    const route = currentRoute();
    $$(".v110-route").forEach(button => {
      const active = button.dataset.route === route;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function openCurrentGroup() {
    const route = currentRoute();
    const group = navigationGroups().find(item =>
      item.items.some(([itemRoute]) => itemRoute === route)
    );
    if (!group) return;

    navState[group.id] = true;
    localStorage.setItem(NAV_KEY, JSON.stringify(navState));

    const section = document.querySelector(
      `.v110-nav-group[data-group="${group.id}"]`
    );
    if (!section) return;

    const heading = document.querySelector(".v110-nav-heading", section);
    const body = document.querySelector(".v110-nav-body", section);
    body.hidden = false;
    heading.setAttribute("aria-expanded", "true");
    heading.querySelector("b").textContent = "−";
  }

  function cleanDashboard() {
    const dashboard = document.querySelector("#v72Dashboard");
    if (!dashboard) return;

    removeDuplicateStatusCards(dashboard);
    installCleanCommandCenter(dashboard);
    rebuildCurriculumShortcuts(dashboard);
    applyDashboardFocusMode();
  }

  function removeDuplicateStatusCards(dashboard) {
    const cards = $$(
      [
        "#v80DashboardLive",
        "#v73DashboardPlanning",
        "#v84DashboardCard",
        "#v81Dashboard",
        "#v82DashboardCard",
        "#v83DashboardCard",
        "#v74DashboardAttachmentCard",
        "#v75DashboardCard",
        "#v86StartBanner",
        "#v87DashboardCard",
        "#v100DashboardCard"
      ].join(","),
      dashboard
    );

    const seen = new Set();
    cards.forEach(card => {
      const text = card.textContent.replace(/\s+/g, " ").trim();
      const signature = text.slice(0, 90);
      if (seen.has(signature)) {
        card.remove();
      } else {
        seen.add(signature);
        card.classList.add("v110-status-source");
      }
    });
  }

  function installCleanCommandCenter(dashboard) {
    let command = document.querySelector("#v110CommandCenter", dashboard);

    if (!command) {
      command = document.createElement("section");
      command.id = "v110CommandCenter";
      command.className = "v110-command-center";
      dashboard.prepend(command);
    }

    const sources = $$(".v110-status-source", dashboard).filter(card =>
      card.id !== "v110CommandCenter"
    );

    command.innerHTML = `
      <div class="v110-command-heading">
        <div>
          <p>TEACHER OPERATING SYSTEM</p>
          <h2>Today’s Command Center</h2>
          <span>Planning, curriculum, production, and teaching status in one compact view.</span>
        </div>
        <button id="v110FocusButton" type="button">
          ${dashboardState.focusMode ? "Show Full Dashboard" : "Focus on Command Center"}
        </button>
      </div>
      <div class="v110-command-grid"></div>
    `;

    const grid = document.querySelector(".v110-command-grid", command);

    sources.forEach(card => {
      card.classList.add("v110-command-card");
      grid.appendChild(card);
    });

    document.querySelector("#v110FocusButton", command)?.addEventListener("click", () => {
      dashboardState.focusMode = !dashboardState.focusMode;
      localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboardState));
      applyDashboardFocusMode();
      cleanDashboard();
    });
  }

  function rebuildCurriculumShortcuts(dashboard) {
    const existing =
      document.querySelector(".v72-curriculum-card", dashboard) ||
      [...dashboard.querySelectorAll("section,article,div")].find(element =>
        /Curriculum Resources/i.test(element.textContent || "")
      );

    if (!existing || existing.dataset.v110Cleaned === "true") return;
    existing.dataset.v110Cleaned = "true";
    existing.classList.add("v110-curriculum-shortcuts");

    const heading = [...existing.querySelectorAll("h2,h3,h4,strong")]
      .find(element => /Curriculum Resources/i.test(element.textContent || ""));

    const titleMarkup = heading
      ? `<h3>${escapeHtml(heading.textContent.trim())}</h3>`
      : "<h3>Curriculum Resources</h3>";

    existing.innerHTML = `
      ${titleMarkup}
      <div class="v110-shortcut-grid">
        ${(config.curriculumShortcutsV11 || []).map(item => `
          <button type="button" data-v110-route="${escapeHtml(item.route)}">
            <span>${escapeHtml(item.category)}</span>
            <strong>${escapeHtml(item.label)}</strong>
          </button>
        `).join("")}
      </div>
    `;

    $$("[data-v110-route]", existing).forEach(button => {
      button.addEventListener("click", () => {
        location.hash = button.dataset.v110Route;
      });
    });
  }

  function applyDashboardFocusMode() {
    document.body.classList.toggle(
      "v110-dashboard-focus",
      Boolean(dashboardState.focusMode)
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootV11);
  } else {
    bootV11();
  }
})();


/* =====================================================================
   Version 11.1 — System Connection Audit & Workflow Hub
   ===================================================================== */
(() => {
  "use strict";

  const STORE = "thh-v111:workflow";
  let config = null;
  let state = {
    checkedAt: "",
    manualChecks: {},
    notes: ""
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`tos-data.json returned ${response.status}`);
        return response.json();
      });

      try {
        state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
      } catch {}

      waitForShell();
    } catch (error) {
      console.error("Version 11.1 failed to initialize.", error);
    }
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    window.addEventListener("hashchange", route);
    new MutationObserver(route).observe($("#pageHost"), { childList: true, subtree: true });
    route();
  }

  function route() {
    const current = location.hash.replace("#", "") || "dashboard";
    if (current === "workflow-hub" && !$("#v111WorkflowHub")) setTimeout(renderHub, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "health") setTimeout(injectHealthPanel, 0);
  }

  function stages() {
    return config.workflowHubV111?.stages || [];
  }

  function routeExists(route) {
    return (config.navigationV11 || [])
      .flatMap(group => group.items || [])
      .some(item => item[0] === route);
  }

  function hasStorage(keys) {
    return (keys || []).some(key => {
      const value = localStorage.getItem(key);
      return value && value !== "{}" && value !== "[]" && value !== "null";
    });
  }

  function stageStatus(stage) {
    const routeReady = routeExists(stage.route);
    const dataReady = hasStorage(stage.storageKeys);
    const manual = Boolean(state.manualChecks[stage.id]);

    return {
      routeReady,
      dataReady,
      manual,
      complete: routeReady && (dataReady || manual)
    };
  }

  function overallProgress() {
    const all = stages();
    if (!all.length) return 0;
    const complete = all.filter(stage => stageStatus(stage).complete).length;
    return Math.round((complete / all.length) * 100);
  }

  function renderHub() {
    const host = $("#pageHost");
    if (!host) return;

    const progress = overallProgress();
    const requiredRoutes = config.workflowHubV111?.requiredRoutes || [];
    const missingRoutes = requiredRoutes.filter(route => !routeExists(route));

    host.innerHTML = `
      <section id="v111WorkflowHub">
        <section class="page-header">
          <div>
            <p>VERSION 11.1</p>
            <h2>System Connection Audit & Workflow Hub</h2>
            <span>Follow the full weekly workflow and verify that every major system is connected.</span>
          </div>
          <div class="button-row">
            <button id="v111RunAudit" class="primary-button">Run Connection Audit</button>
            <button id="v111PrintAudit" class="secondary-button">Print Audit</button>
          </div>
        </section>

        <section class="v111-progress-card">
          <div>
            <p>WEEKLY WORKFLOW READINESS</p>
            <h3>${progress}% connected</h3>
            <span>${stages().filter(stage => stageStatus(stage).complete).length}/${stages().length} stages ready</span>
          </div>
          <div class="v111-progress-track">
            <span style="width:${progress}%"></span>
          </div>
        </section>

        <section class="v111-stage-grid">
          ${stages().map(stage => stageCard(stage)).join("")}
        </section>

        <section class="v111-audit-grid">
          <section class="panel">
            <h3>Route Audit</h3>
            <div class="v111-route-list">
              ${requiredRoutes.map(route => `
                <article class="${routeExists(route) ? "ready" : "missing"}">
                  <strong>${routeExists(route) ? "✓" : "!"}</strong>
                  <div>
                    <span>${esc(route)}</span>
                    <small>${routeExists(route) ? "Registered" : "Missing from navigation registry"}</small>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>

          <section class="panel">
            <h3>Audit Notes</h3>
            <textarea id="v111Notes" placeholder="Record anything that needs attention...">${esc(state.notes || "")}</textarea>
            <button id="v111SaveNotes" class="primary-button">Save Audit Notes</button>

            <div class="v111-audit-summary">
              <article>
                <span>Last Audit</span>
                <strong>${state.checkedAt ? new Date(state.checkedAt).toLocaleString() : "Not run yet"}</strong>
              </article>
              <article class="${missingRoutes.length ? "missing" : "ready"}">
                <span>Missing Routes</span>
                <strong>${missingRoutes.length}</strong>
              </article>
            </div>
          </section>
        </section>
      </section>
    `;

    wireHub();
  }

  function stageCard(stage) {
    const status = stageStatus(stage);

    return `
      <article class="panel v111-stage-card ${status.complete ? "complete" : ""}">
        <div class="v111-stage-heading">
          <div>
            <span>${status.complete ? "READY" : "ACTION NEEDED"}</span>
            <h3>${esc(stage.title)}</h3>
          </div>
          <b>${status.complete ? "✓" : "!"}</b>
        </div>

        <p>${esc(stage.description)}</p>

        <dl>
          <div>
            <dt>Page</dt>
            <dd>${status.routeReady ? "Connected" : "Missing"}</dd>
          </div>
          <div>
            <dt>Saved Data</dt>
            <dd>${status.dataReady ? "Found" : "Not found yet"}</dd>
          </div>
        </dl>

        <label class="v111-manual-check">
          <input type="checkbox" data-v111-check="${esc(stage.id)}" ${status.manual ? "checked" : ""}>
          <span>I tested this step successfully</span>
        </label>

        <button data-v111-open="${esc(stage.route)}" class="primary-button">
          Open ${esc(stage.title.replace(/^\d+\.\s*/, ""))}
        </button>
      </article>
    `;
  }

  function wireHub() {
    $$("[data-v111-open]").forEach(button => {
      button.addEventListener("click", () => {
        location.hash = button.dataset.v111Open;
      });
    });

    $$("[data-v111-check]").forEach(input => {
      input.addEventListener("change", () => {
        state.manualChecks[input.dataset.v111Check] = input.checked;
        save();
        renderHub();
      });
    });

    $("#v111RunAudit")?.addEventListener("click", () => {
      state.checkedAt = new Date().toISOString();
      save();
      renderHub();
      toast("Connection audit completed.");
    });

    $("#v111PrintAudit")?.addEventListener("click", () => window.print());

    $("#v111SaveNotes")?.addEventListener("click", () => {
      state.notes = $("#v111Notes").value.trim();
      save();
      toast("Audit notes saved.");
    });
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v111DashboardCard")) return;

    const card = document.createElement("section");
    card.id = "v111DashboardCard";
    card.className = "v111-dashboard-card";
    card.innerHTML = `
      <div>
        <p>WORKFLOW CONNECTION AUDIT</p>
        <h3>${overallProgress()}% connected</h3>
        <span>Verify curriculum, planning, attachments, packets, and live teaching.</span>
      </div>
      <button>Open Workflow Hub</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "workflow-hub";
    dashboard.prepend(card);
  }

  function injectHealthPanel() {
    const host = $("#pageHost");
    if (!host || $("#v111HealthPanel")) return;

    const requiredRoutes = config.workflowHubV111?.requiredRoutes || [];
    const missingRoutes = requiredRoutes.filter(route => !routeExists(route));

    const panel = document.createElement("section");
    panel.id = "v111HealthPanel";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 11.1 Connection Health</h3>
      <div class="health-grid">
        ${healthItem("Workflow stages", stages().length === 5, `${stages().length}/5`)}
        ${healthItem("Required routes", missingRoutes.length === 0, `${requiredRoutes.length - missingRoutes.length}/${requiredRoutes.length}`)}
        ${healthItem("Overall readiness", overallProgress() >= 80, `${overallProgress()}%`)}
        ${healthItem("Audit record", Boolean(state.checkedAt), state.checkedAt ? new Date(state.checkedAt).toLocaleDateString() : "Not run")}
      </div>
      <button class="secondary-button">Open Workflow Hub</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "workflow-hub";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div>
          <span>${esc(title)}</span>
          <small>${esc(detail)}</small>
        </div>
      </article>
    `;
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


/* =====================================================================
   Version 11.2 — One-Click Weekly Workflow & Guided Handoff
   ===================================================================== */
(() => {
  "use strict";

  const STORE = "thh-v112:weekly-workflow";
  const ENGINE_STORE = "thh-v100:intelligence-engine";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const LIVE_STORE = "thh-v90:teach-day";

  let config = null;
  let state = {
    selectedWeek: "2026-08-03",
    completed: {},
    lastRun: "",
    log: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => response.json());
      try {
        state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
      } catch {}
      waitForShell();
    } catch (error) {
      console.error("Version 11.2 failed to initialize.", error);
    }
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function intelligenceState() {
    try {
      return JSON.parse(localStorage.getItem(ENGINE_STORE) || "{}");
    } catch {
      return {};
    }
  }

  function availableWeeks() {
    const engine = intelligenceState();
    const weeks = Object.values(engine.weeks || {});
    if (!weeks.length) {
      return [
        {
          weekOf: "2026-07-27",
          title: "Classroom Launch Week",
          weekType: "Launch Week",
          curriculumLocked: true,
          pillar: "Heart"
        },
        {
          weekOf: "2026-08-03",
          title: "Curriculum Week 1",
          weekType: "Curriculum Week",
          curriculumLocked: false,
          pillar: "Heart",
          openCourtUnit: 1,
          openCourtLesson: 1,
          openCourt: "Unit 1, Lesson 1 — The Mice Who Lived in a Shoe",
          eurekaModule: 1,
          eurekaStartingLesson: 1,
          heggerty: "Enter the current Heggerty week and lesson.",
          ufli: "Enter the aligned UFLI lesson or foundational skill.",
          writing: "Building the Foundation / Open Court GUM",
          science: "Select the current Arizona science unit and lesson.",
          socialStudies: "Select the current Arizona Social Studies, iCivics, or 180 Days lesson."
        }
      ];
    }
    return weeks.sort((a,b) => a.weekOf.localeCompare(b.weekOf));
  }

  function selectedWeek() {
    return availableWeeks().find(week => week.weekOf === state.selectedWeek) || availableWeeks()[0];
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    window.addEventListener("hashchange", route);
    new MutationObserver(route).observe($("#pageHost"), { childList:true, subtree:true });
    route();
  }

  function route() {
    const current = location.hash.replace("#","") || "dashboard";
    if (current === "workflow-hub") setTimeout(injectGuidedWorkflow, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "health") setTimeout(injectHealthPanel, 0);
  }

  function injectGuidedWorkflow() {
    const hub = $("#v111WorkflowHub");
    if (!hub || $("#v112GuidedWorkflow")) return;

    const section = document.createElement("section");
    section.id = "v112GuidedWorkflow";
    section.className = "v112-guided-workflow";
    section.innerHTML = renderGuidedWorkflow();

    const header = $(".page-header", hub);
    header?.insertAdjacentElement("afterend", section);
    wireGuidedWorkflow();
  }

  function renderGuidedWorkflow() {
    const week = selectedWeek();
    const steps = config.weeklyWorkflowV112?.steps || [];
    const progress = Math.round(
      (steps.filter(step => state.completed[step.id]).length / Math.max(steps.length,1)) * 100
    );

    return `
      <section class="v112-header-card">
        <div>
          <p>ONE-CLICK WEEKLY WORKFLOW</p>
          <h3>${esc(week.title)}</h3>
          <span>Week of ${esc(formatDate(week.weekOf))} • ${esc(week.weekType)}</span>
        </div>
        <div class="v112-header-actions">
          <select id="v112WeekSelect">
            ${availableWeeks().map(item => `
              <option value="${esc(item.weekOf)}" ${item.weekOf === week.weekOf ? "selected" : ""}>
                ${esc(formatDate(item.weekOf))} — ${esc(item.title)}
              </option>
            `).join("")}
          </select>
          <button id="v112RunAll" class="primary-button">Run Full Weekly Workflow</button>
        </div>
      </section>

      <section class="v112-progress">
        <div class="v112-progress-track"><span style="width:${progress}%"></span></div>
        <strong>${progress}% complete</strong>
      </section>

      <section class="v112-step-grid">
        ${steps.map((step,index) => `
          <article class="panel v112-step ${state.completed[step.id] ? "complete" : ""}">
            <div class="v112-step-number">${index + 1}</div>
            <div>
              <span>${state.completed[step.id] ? "COMPLETE" : "READY"}</span>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.description)}</p>
            </div>
            <button data-v112-step="${esc(step.id)}" class="${state.completed[step.id] ? "secondary-button" : "primary-button"}">
              ${state.completed[step.id] ? "Run Again" : "Run Step"}
            </button>
          </article>
        `).join("")}
      </section>

      <section class="panel v112-summary-card">
        <h3>Selected Week Summary</h3>
        <div class="v112-summary-grid">
          <article><span>Open Court</span><strong>${esc(week.openCourt || "Launch Week — no core curriculum")}</strong></article>
          <article><span>Eureka Math²</span><strong>${week.curriculumLocked ? "Launch Week — no core sequence" : `Module ${week.eurekaModule || 1}, starting Lesson ${week.eurekaStartingLesson || 1}`}</strong></article>
          <article><span>Writing</span><strong>${esc(week.writing || "Launch routines and readiness")}</strong></article>
          <article><span>Science</span><strong>${esc(week.science || "Observation and readiness activities")}</strong></article>
          <article><span>Social Studies</span><strong>${esc(week.socialStudies || "Classroom community and routines")}</strong></article>
          <article><span>Last Workflow Run</span><strong>${state.lastRun ? new Date(state.lastRun).toLocaleString() : "Not run yet"}</strong></article>
        </div>
      </section>
    `;
  }

  function wireGuidedWorkflow() {
    $("#v112WeekSelect")?.addEventListener("change", event => {
      state.selectedWeek = event.target.value;
      state.completed = {};
      save();
      refreshGuidedWorkflow();
    });

    $$("[data-v112-step]").forEach(button => {
      button.addEventListener("click", () => runStep(button.dataset.v112Step));
    });

    $("#v112RunAll")?.addEventListener("click", runAll);
  }

  function refreshGuidedWorkflow() {
    const old = $("#v112GuidedWorkflow");
    if (!old) return;
    old.innerHTML = renderGuidedWorkflow();
    wireGuidedWorkflow();
  }

  function runStep(stepId) {
    const week = selectedWeek();

    if (stepId === "select") {
      completeStep("select", `Selected ${week.title}.`);
      return;
    }

    if (stepId === "plan") {
      buildWeeklyPlan(week);
      completeStep("plan", `${week.title} sent to Weekly Planning.`);
      return;
    }

    if (stepId === "attachments") {
      buildAttachments(week);
      completeStep("attachments", "Attachment checklist created.");
      return;
    }

    if (stepId === "print") {
      buildPrintQueue(week);
      completeStep("print", "Print queue created.");
      return;
    }

    if (stepId === "teach") {
      prepareLiveTeaching(week);
      completeStep("teach", "Monday prepared for Live Teaching.");
    }
  }

  function runAll() {
    const week = selectedWeek();
    buildWeeklyPlan(week);
    buildAttachments(week);
    buildPrintQueue(week);
    prepareLiveTeaching(week);

    (config.weeklyWorkflowV112?.steps || []).forEach(step => {
      state.completed[step.id] = true;
    });
    state.lastRun = new Date().toISOString();
    state.log.unshift({
      date: state.lastRun,
      weekOf: week.weekOf,
      title: week.title,
      action: "Full weekly workflow completed"
    });
    save();
    refreshGuidedWorkflow();
    toast(`${week.title} completed through Live Teaching.`);
  }

  function completeStep(stepId, message) {
    state.completed[stepId] = true;
    state.lastRun = new Date().toISOString();
    state.log.unshift({
      date: state.lastRun,
      weekOf: selectedWeek().weekOf,
      title: selectedWeek().title,
      action: message
    });
    save();
    refreshGuidedWorkflow();
    toast(message);
  }

  function buildWeeklyPlan(week) {
    const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
    const days = {};

    dayNames.forEach((day,index) => {
      if (week.curriculumLocked) {
        days[day] = {
          day,
          focus: "Classroom Launch Week",
          launchRoutine: "Routines, procedures, community, transitions, independence, and readiness.",
          morningMeeting: "Community building and classroom procedure practice.",
          reading: "",
          writing: "First-week writing and classroom-community activity.",
          math: "Math routines, manipulatives, discussion expectations, and readiness.",
          science: "Observation and science-notebook routines.",
          socialStudies: "Classroom community, rules, and responsibilities.",
          differentiation: "Visuals, gestures, sentence frames, partner support, repeated directions, and approved accommodations.",
          assessment: "Teacher observation and informal readiness checks.",
          materials: "",
          notes: week.notes || "",
          complete: false
        };
      } else {
        days[day] = {
          day,
          focus: week.openCourt || `Unit ${week.openCourtUnit || 1}, Lesson ${week.openCourtLesson || 1}`,
          openCourtLesson: week.openCourt || `Unit ${week.openCourtUnit || 1}, Lesson ${week.openCourtLesson || 1}`,
          heggerty: week.heggerty || "",
          ufli: week.ufli || "",
          mowr: week.ufli || "",
          phonics: "Use the aligned Open Court phonics skill and authorized Skills Practice.",
          vocabulary: "Use the aligned Open Court weekly vocabulary.",
          reading: week.openCourt || "",
          writing: week.writing || "",
          math: `Eureka Math² Module ${week.eurekaModule || 1}, Lesson ${(week.eurekaStartingLesson || 1) + index}`,
          math2: "Spiral review, fact fluency, exit-ticket review, or small-group reteach.",
          science: week.science || "",
          socialStudies: week.socialStudies || "",
          differentiation: config.curriculumWeek1?.defaultSupports || "Visuals, sentence frames, partner support, chunked directions, manipulatives, and approved accommodations.",
          assessment: day === "Friday"
            ? "Complete approved weekly assessments and record evidence."
            : "Use observation, oral response, student work, and exit tickets.",
          materials: "",
          notes: week.notes || "",
          complete: false
        };
      }
    });

    localStorage.setItem(WEEK_STORE, JSON.stringify({
      title: week.title,
      weekOf: week.weekOf,
      pillar: week.pillar || "Heart",
      days,
      printQueue: [],
      updatedAt: new Date().toISOString(),
      source: "Version 11.2 One-Click Workflow"
    }));
  }

  function buildAttachments(week) {
    let items = [];
    try {
      items = JSON.parse(localStorage.getItem(ATTACHMENT_STORE) || "[]");
    } catch {}

    const dayNames = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
    const types = config.weeklyWorkflowV112?.defaultAttachmentTypes || [];

    const generated = [];
    dayNames.forEach(day => {
      types.forEach((type,index) => {
        generated.push({
          id: `v112-${week.weekOf}-${day}-${index}`,
          day,
          lesson: week.curriculumLocked ? "Classroom Launch Week" : (week.openCourt || week.title),
          title: type,
          category: categoryFor(type),
          type: type.includes("Assessment") || type.includes("Exit Ticket") ? "Assessment" : "Printable Page",
          url: "",
          notes: week.curriculumLocked ? "Use only launch-week or readiness materials." : "Add the authorized school-provided resource.",
          print: true,
          copies: 1,
          status: "Missing"
        });
      });
    });

    const prefix = `v112-${week.weekOf}-`;
    items = [...items.filter(item => !String(item.id).startsWith(prefix)), ...generated];
    localStorage.setItem(ATTACHMENT_STORE, JSON.stringify(items));
  }

  function categoryFor(type) {
    if (type.includes("Open Court") || type.includes("Vocabulary") || type.includes("Phonics")) return "Open Court";
    if (type.includes("Eureka")) return "Eureka Math²";
    if (type.includes("Writing")) return "Writing / GUM";
    if (type.includes("Science")) return "Science";
    if (type.includes("Social Studies")) return "Social Studies";
    return "Assessment";
  }

  function buildPrintQueue(week) {
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem(PRINT_STORE) || "[]");
    } catch {}

    const attachments = (() => {
      try {
        return JSON.parse(localStorage.getItem(ATTACHMENT_STORE) || "[]");
      } catch {
        return [];
      }
    })();

    const generated = attachments
      .filter(item => String(item.id).startsWith(`v112-${week.weekOf}-`))
      .map(item => ({
        id: `print-${item.id}`,
        source: "Version 11.2 Weekly Workflow",
        day: item.day,
        title: item.title,
        category: item.category,
        copies: item.copies || 1,
        notes: item.notes || "",
        url: item.url || "",
        complete: false
      }));

    queue = [
      ...queue.filter(item => !String(item.id).startsWith(`print-v112-${week.weekOf}-`)),
      ...generated
    ];

    localStorage.setItem(PRINT_STORE, JSON.stringify(queue));
  }

  function prepareLiveTeaching(week) {
    const weeklyPlan = (() => {
      try {
        return JSON.parse(localStorage.getItem(WEEK_STORE) || "{}");
      } catch {
        return {};
      }
    })();

    const monday = weeklyPlan.days?.Monday || {};
    localStorage.setItem(LIVE_STORE, JSON.stringify({
      day: "Monday",
      weekOf: week.weekOf,
      title: week.title,
      dayType: "Full Day",
      source: "Version 11.2 One-Click Workflow",
      monday,
      blocks: [],
      preparedAt: new Date().toISOString()
    }));
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v112DashboardCard")) return;

    const complete = Object.values(state.completed).filter(Boolean).length;
    const card = document.createElement("section");
    card.id = "v112DashboardCard";
    card.className = "v112-dashboard-card";
    card.innerHTML = `
      <div>
        <p>ONE-CLICK WEEKLY WORKFLOW</p>
        <h3>${complete}/5 workflow steps complete</h3>
        <span>${esc(selectedWeek()?.title || "Select a week")} → Planning → Attachments → Packets → Teaching</span>
      </div>
      <button>Open Workflow Hub</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "workflow-hub";
    dashboard.prepend(card);
  }

  function injectHealthPanel() {
    const host = $("#pageHost");
    if (!host || $("#v112HealthPanel")) return;

    const planReady = Boolean(localStorage.getItem(WEEK_STORE));
    const attachmentReady = Boolean(localStorage.getItem(ATTACHMENT_STORE));
    const printReady = Boolean(localStorage.getItem(PRINT_STORE));
    const liveReady = Boolean(localStorage.getItem(LIVE_STORE));

    const panel = document.createElement("section");
    panel.id = "v112HealthPanel";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 11.2 Weekly Workflow Health</h3>
      <div class="health-grid">
        ${healthItem("Weekly Planning handoff", planReady, planReady ? "Ready" : "Not generated")}
        ${healthItem("Attachment checklist", attachmentReady, attachmentReady ? "Ready" : "Not generated")}
        ${healthItem("Print queue", printReady, printReady ? "Ready" : "Not generated")}
        ${healthItem("Live Teaching handoff", liveReady, liveReady ? "Ready" : "Not generated")}
      </div>
      <button class="secondary-button">Open Workflow Hub</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "workflow-hub";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>
    `;
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


/* Version 11.2.1 — Navigation Stability Repair */
(() => {
  "use strict";

  function stabilizeNavigation() {
    const nav = document.querySelector("#mainNav");
    if (!nav) {
      window.setTimeout(stabilizeNavigation, 100);
      return;
    }

    nav.dataset.navigationOwner = "version-11";

    // Version 11 remains the only navigation controller. No animation is
    // applied to group open/close state, preventing visual flicker.
    document.documentElement.classList.add("v1121-stable-navigation");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stabilizeNavigation);
  } else {
    stabilizeNavigation();
  }
})();


/* =====================================================================
   Version 12.0 — Live Teaching Center
   ===================================================================== */
(() => {
  "use strict";

  const STORE = "thh-v120:live-teaching";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const PREPARED_STORE = "thh-v90:teach-day";

  let config = null;
  let state = {
    selectedDay: "Monday",
    dayType: "Full Day",
    activeIndex: 0,
    completed: {},
    blockNotes: {},
    quickTimerSeconds: 300,
    timerEndsAt: null,
    pausedSeconds: null,
    reflection: "",
    attendanceComplete: false,
    behaviorNotes: [],
    studentNotes: [],
    startedAt: "",
    endedAt: ""
  };

  let timerInterval = null;

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
        state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
      } catch {}

      loadPreparedDay();
      waitForShell();
    } catch (error) {
      console.error("Version 12.0 failed to initialize.", error);
    }
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function loadPreparedDay() {
    try {
      const prepared = JSON.parse(localStorage.getItem(PREPARED_STORE) || "null");
      if (prepared?.day) state.selectedDay = prepared.day;
      if (prepared?.dayType) state.dayType = prepared.dayType;
    } catch {}
    save();
  }

  function weeklyPlan() {
    try {
      return JSON.parse(localStorage.getItem(WEEK_STORE) || "{}");
    } catch {
      return {};
    }
  }

  function schedule() {
    const source = state.dayType === "Half Day"
      ? config.liveTeachingV120.halfDaySchedule
      : config.liveTeachingV120.fullDaySchedule;

    return source.map(([start, end, subject], index) => ({
      id: `${state.dayType}-${index}-${subject}`,
      start,
      end,
      subject,
      ...detailsForSubject(subject)
    }));
  }

  function dayPlan() {
    return weeklyPlan().days?.[state.selectedDay] || {};
  }

  function detailsForSubject(subject) {
    const day = dayPlan();
    const normalized = subject.toLowerCase();

    if (normalized.includes("mowr")) {
      return lessonDetails(day.mowr, day.mowr, day.materials, day.assessment);
    }
    if (normalized.includes("heggerty")) {
      return lessonDetails(day.heggerty, day.heggerty, day.materials, day.assessment);
    }
    if (normalized === "phonics" || normalized.includes("phonics test")) {
      return lessonDetails(day.phonics, day.phonics, day.materials, day.assessment);
    }
    if (normalized.includes("vocabulary")) {
      return lessonDetails(day.vocabulary, day.vocabulary, day.materials, day.assessment);
    }
    if (normalized.includes("reading")) {
      return lessonDetails(day.reading || day.openCourtLesson, day.reading, day.materials, day.assessment);
    }
    if (normalized.includes("writing") || normalized.includes("grammar")) {
      return lessonDetails(day.writing, day.writing, day.materials, day.assessment);
    }
    if (normalized === "math" || normalized.includes("math / tests")) {
      return lessonDetails(day.math, day.math, day.materials, day.assessment);
    }
    if (normalized.includes("math 2")) {
      return lessonDetails(day.math2, day.math2, day.materials, day.assessment);
    }
    if (normalized.includes("science") && normalized.includes("social studies")) {
      return lessonDetails(
        [day.science, day.socialStudies].filter(Boolean).join("\n\n"),
        [day.science, day.socialStudies].filter(Boolean).join("\n\n"),
        day.materials,
        day.assessment
      );
    }
    if (normalized.includes("science")) {
      return lessonDetails(day.science, day.science, day.materials, day.assessment);
    }
    if (normalized.includes("social studies")) {
      return lessonDetails(day.socialStudies, day.socialStudies, day.materials, day.assessment);
    }

    return lessonDetails(
      day.launchRoutine || day.focus || "",
      day.launchRoutine || "",
      day.materials || "",
      day.assessment || "Teacher observation."
    );
  }

  function lessonDetails(title, lesson, materials, assessment) {
    return {
      title: String(title || "").split("\n")[0] || "Routine / Transition",
      lesson: lesson || "",
      materials: materials || "",
      assessment: assessment || ""
    };
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    window.addEventListener("hashchange", route);
    new MutationObserver(route).observe($("#pageHost"), { childList: true, subtree: true });
    route();
  }

  function route() {
    const current = location.hash.replace("#","") || "dashboard";
    if (current === "teachday" && !$("#v120LiveTeaching")) setTimeout(renderLiveTeaching, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "workflow-hub") setTimeout(injectWorkflowStatus, 0);
    if (current === "health") setTimeout(injectHealthPanel, 0);
  }

  function renderLiveTeaching() {
    stopTimerInterval();

    const host = $("#pageHost");
    if (!host) return;

    const blocks = schedule();
    if (state.activeIndex >= blocks.length) state.activeIndex = Math.max(0, blocks.length - 1);

    const current = blocks[state.activeIndex];
    const next = blocks[state.activeIndex + 1] || null;
    const progress = Math.round(
      (Object.values(state.completed).filter(Boolean).length / Math.max(blocks.length, 1)) * 100
    );

    host.innerHTML = `
      <section id="v120LiveTeaching">
        <section class="page-header">
          <div>
            <p>VERSION 12.0</p>
            <h2>Live Teaching Center</h2>
            <span>Keep this screen open while teaching and advance through the day one block at a time.</span>
          </div>
          <div class="button-row">
            <select id="v120DaySelect">
              ${["Monday","Tuesday","Wednesday","Thursday","Friday"].map(day => `
                <option ${day === state.selectedDay ? "selected" : ""}>${day}</option>
              `).join("")}
            </select>
            <select id="v120DayType">
              <option ${state.dayType === "Full Day" ? "selected" : ""}>Full Day</option>
              <option ${state.dayType === "Half Day" ? "selected" : ""}>Half Day</option>
            </select>
            <button id="v120StartDay" class="primary-button">
              ${state.startedAt ? "Day Started" : "Start Teaching Day"}
            </button>
          </div>
        </section>

        <section class="v120-status-strip">
          <article>
            <span>NOW</span>
            <strong>${esc(current.subject)}</strong>
            <small>${esc(current.start)}–${esc(current.end)}</small>
          </article>
          <article>
            <span>NEXT</span>
            <strong>${next ? esc(next.subject) : "End of Day"}</strong>
            <small>${next ? `${esc(next.start)}–${esc(next.end)}` : "No additional blocks"}</small>
          </article>
          <article>
            <span>DAY PROGRESS</span>
            <strong>${progress}%</strong>
            <small>${Object.values(state.completed).filter(Boolean).length}/${blocks.length} completed</small>
          </article>
          <article>
            <span>ATTENDANCE</span>
            <strong>${state.attendanceComplete ? "Complete" : "Not Taken"}</strong>
            <small>${state.attendanceComplete ? "Recorded for today" : "Use the quick action below"}</small>
          </article>
        </section>

        <section class="v120-layout">
          <aside class="panel v120-schedule">
            <h3>Today's Schedule</h3>
            <div>
              ${blocks.map((block,index) => `
                <button data-v120-block="${index}" class="${index === state.activeIndex ? "active" : ""} ${state.completed[block.id] ? "complete" : ""}">
                  <span>${esc(block.start)}</span>
                  <strong>${esc(block.subject)}</strong>
                  <small>${state.completed[block.id] ? "Complete" : esc(block.end)}</small>
                </button>
              `).join("")}
            </div>
          </aside>

          <main class="v120-main">
            <section class="panel v120-current">
              <div class="v120-current-heading">
                <div>
                  <p>${esc(current.start)}–${esc(current.end)}</p>
                  <h2>${esc(current.subject)}</h2>
                  <span>${esc(current.title)}</span>
                </div>
                <div class="v120-timer" id="v120TimerDisplay">${formatSeconds(timerRemaining())}</div>
              </div>

              <div class="v120-detail-grid">
                <article>
                  <span>LESSON / OBJECTIVE</span>
                  <div>${formatText(current.lesson || "No lesson details have been entered yet.")}</div>
                </article>
                <article>
                  <span>MATERIALS</span>
                  <div>${formatText(current.materials || "No materials have been entered yet.")}</div>
                </article>
                <article>
                  <span>ASSESSMENT / EVIDENCE</span>
                  <div>${formatText(current.assessment || "Teacher observation.")}</div>
                </article>
                <article>
                  <span>TEACHER NOTES</span>
                  <textarea id="v120BlockNotes" placeholder="Notes for this block...">${esc(state.blockNotes[current.id] || "")}</textarea>
                </article>
              </div>

              <div class="v120-control-row">
                <button id="v120Previous" class="secondary-button" ${state.activeIndex === 0 ? "disabled" : ""}>Previous Block</button>
                <button id="v120TimerStart" class="secondary-button">Start Timer</button>
                <button id="v120TimerPause" class="secondary-button">Pause Timer</button>
                <button id="v120CompleteBlock" class="primary-button">
                  ${state.completed[current.id] ? "Mark Incomplete" : "Complete & Go Next"}
                </button>
              </div>
            </section>

            <section class="panel v120-next-card">
              <div>
                <p>COMING UP NEXT</p>
                <h3>${next ? esc(next.subject) : "End of Day Reflection"}</h3>
                <span>${next ? `${esc(next.start)}–${esc(next.end)} • ${esc(next.title)}` : "Complete your reflection and close the teaching day."}</span>
              </div>
              ${next ? `<button id="v120GoNext" class="secondary-button">Open Next Block</button>` : ""}
            </section>
          </main>

          <aside class="v120-tools">
            <section class="panel">
              <h3>Quick Actions</h3>
              <div class="v120-action-grid">
                ${config.liveTeachingV120.quickActions.map(([id,label]) => `
                  <button data-v120-action="${esc(id)}">${esc(label)}</button>
                `).join("")}
              </div>
            </section>

            <section class="panel">
              <h3>Quick Timer</h3>
              <div class="v120-quick-times">
                ${[60,180,300,600,1200].map(seconds => `
                  <button data-v120-time="${seconds}">${seconds < 60 ? seconds : seconds / 60}${seconds < 60 ? " sec" : " min"}</button>
                `).join("")}
              </div>
            </section>

            <section class="panel">
              <h3>End-of-Day Reflection</h3>
              <textarea id="v120Reflection" placeholder="What worked? What needs reteaching?">${esc(state.reflection || "")}</textarea>
              <button id="v120SaveReflection" class="secondary-button">Save Reflection</button>
              <button id="v120EndDay" class="primary-button">End Teaching Day</button>
            </section>
          </aside>
        </section>
      </section>
    `;

    wireLiveTeaching();
    startTimerInterval();
  }

  function formatText(value) {
    return esc(value).replaceAll("\n", "<br>");
  }

  function wireLiveTeaching() {
    $("#v120DaySelect")?.addEventListener("change", event => {
      state.selectedDay = event.target.value;
      state.activeIndex = 0;
      save();
      renderLiveTeaching();
    });

    $("#v120DayType")?.addEventListener("change", event => {
      state.dayType = event.target.value;
      state.activeIndex = 0;
      state.completed = {};
      save();
      renderLiveTeaching();
    });

    $("#v120StartDay")?.addEventListener("click", () => {
      if (!state.startedAt) state.startedAt = new Date().toISOString();
      state.endedAt = "";
      save();
      renderLiveTeaching();
      toast("Teaching day started.");
    });

    $$("[data-v120-block]").forEach(button => {
      button.addEventListener("click", () => {
        saveCurrentBlockNote();
        state.activeIndex = Number(button.dataset.v120Block);
        resetBlockTimer();
        save();
        renderLiveTeaching();
      });
    });

    $("#v120BlockNotes")?.addEventListener("input", event => {
      const current = schedule()[state.activeIndex];
      state.blockNotes[current.id] = event.target.value;
      save();
    });

    $("#v120Previous")?.addEventListener("click", () => {
      saveCurrentBlockNote();
      state.activeIndex = Math.max(0, state.activeIndex - 1);
      resetBlockTimer();
      save();
      renderLiveTeaching();
    });

    $("#v120GoNext")?.addEventListener("click", () => {
      saveCurrentBlockNote();
      state.activeIndex = Math.min(schedule().length - 1, state.activeIndex + 1);
      resetBlockTimer();
      save();
      renderLiveTeaching();
    });

    $("#v120CompleteBlock")?.addEventListener("click", () => {
      saveCurrentBlockNote();
      const blocks = schedule();
      const current = blocks[state.activeIndex];

      if (state.completed[current.id]) {
        state.completed[current.id] = false;
      } else {
        state.completed[current.id] = true;
        if (state.activeIndex < blocks.length - 1) state.activeIndex += 1;
      }

      resetBlockTimer();
      save();
      renderLiveTeaching();
    });

    $("#v120TimerStart")?.addEventListener("click", startTimer);
    $("#v120TimerPause")?.addEventListener("click", pauseTimer);

    $$("[data-v120-time]").forEach(button => {
      button.addEventListener("click", () => {
        state.quickTimerSeconds = Number(button.dataset.v120Time);
        state.timerEndsAt = null;
        state.pausedSeconds = state.quickTimerSeconds;
        save();
        updateTimerDisplay();
      });
    });

    $$("[data-v120-action]").forEach(button => {
      button.addEventListener("click", () => handleAction(button.dataset.v120Action));
    });

    $("#v120SaveReflection")?.addEventListener("click", () => {
      state.reflection = $("#v120Reflection").value.trim();
      save();
      toast("Reflection saved.");
    });

    $("#v120EndDay")?.addEventListener("click", () => {
      state.reflection = $("#v120Reflection").value.trim();
      state.endedAt = new Date().toISOString();
      save();
      toast("Teaching day completed.");
      renderLiveTeaching();
    });
  }

  function saveCurrentBlockNote() {
    const current = schedule()[state.activeIndex];
    const field = $("#v120BlockNotes");
    if (current && field) {
      state.blockNotes[current.id] = field.value;
    }
  }

  function handleAction(action) {
    if (action === "attendance") {
      state.attendanceComplete = true;
      save();
      renderLiveTeaching();
      toast("Attendance marked complete.");
      return;
    }

    if (action === "behavior") {
      const note = prompt("Enter the behavior note:");
      if (note) {
        state.behaviorNotes.unshift({ note, date: new Date().toISOString() });
        save();
        toast("Behavior note saved.");
      }
      return;
    }

    if (action === "student-note") {
      const note = prompt("Enter the student note:");
      if (note) {
        state.studentNotes.unshift({ note, date: new Date().toISOString() });
        save();
        toast("Student note saved.");
      }
      return;
    }

    if (action === "timer") {
      startTimer();
      return;
    }

    if (action === "materials") {
      const current = schedule()[state.activeIndex];
      alert(current.materials || "No materials have been entered for this block.");
      return;
    }

    if (action === "reflection") {
      $("#v120Reflection")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function timerRemaining() {
    if (state.timerEndsAt) {
      return Math.max(0, Math.ceil((new Date(state.timerEndsAt).getTime() - Date.now()) / 1000));
    }
    if (typeof state.pausedSeconds === "number") return Math.max(0, state.pausedSeconds);
    return state.quickTimerSeconds || 300;
  }

  function startTimer() {
    const remaining = timerRemaining();
    state.timerEndsAt = new Date(Date.now() + remaining * 1000).toISOString();
    state.pausedSeconds = null;
    save();
    updateTimerDisplay();
  }

  function pauseTimer() {
    state.pausedSeconds = timerRemaining();
    state.timerEndsAt = null;
    save();
    updateTimerDisplay();
  }

  function resetBlockTimer() {
    state.timerEndsAt = null;
    state.pausedSeconds = state.quickTimerSeconds || 300;
  }

  function startTimerInterval() {
    stopTimerInterval();
    timerInterval = setInterval(updateTimerDisplay, 1000);
  }

  function stopTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function updateTimerDisplay() {
    const display = $("#v120TimerDisplay");
    if (!display) return;
    const remaining = timerRemaining();
    display.textContent = formatSeconds(remaining);

    if (remaining <= 0 && state.timerEndsAt) {
      state.timerEndsAt = null;
      state.pausedSeconds = 0;
      save();
      display.classList.add("finished");
      toast("Timer complete.");
    }
  }

  function formatSeconds(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${String(minutes).padStart(2,"0")}:${String(remainder).padStart(2,"0")}`;
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v120DashboardCard")) return;

    const blocks = schedule();
    const current = blocks[state.activeIndex] || blocks[0];
    const card = document.createElement("section");
    card.id = "v120DashboardCard";
    card.className = "v120-dashboard-card";
    card.innerHTML = `
      <div>
        <p>LIVE TEACHING CENTER</p>
        <h3>${state.startedAt && !state.endedAt ? `Now: ${esc(current.subject)}` : "Ready for the teaching day"}</h3>
        <span>${esc(state.selectedDay)} • ${esc(state.dayType)} • ${Object.values(state.completed).filter(Boolean).length}/${blocks.length} complete</span>
      </div>
      <button>Open Live Teaching</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "teachday";
    dashboard.prepend(card);
  }

  function injectWorkflowStatus() {
    const hub = $("#v111WorkflowHub");
    if (!hub || $("#v120WorkflowStatus")) return;

    const card = document.createElement("section");
    card.id = "v120WorkflowStatus";
    card.className = "v120-workflow-status";
    card.innerHTML = `
      <div>
        <p>LIVE TEACHING MODULE</p>
        <h3>Dedicated teaching screen installed</h3>
        <span>Schedule, timers, lesson details, notes, and completion tracking are ready.</span>
      </div>
      <button>Open Live Teaching</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "teachday";
    $(".page-header", hub)?.insertAdjacentElement("afterend", card);
  }

  function injectHealthPanel() {
    const host = $("#pageHost");
    if (!host || $("#v120HealthPanel")) return;

    const planReady = Boolean(weeklyPlan().days?.[state.selectedDay]);
    const panel = document.createElement("section");
    panel.id = "v120HealthPanel";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 12.0 Live Teaching Health</h3>
      <div class="health-grid">
        ${healthItem("Full-day schedule", config.liveTeachingV120.fullDaySchedule.length === 18, `${config.liveTeachingV120.fullDaySchedule.length} blocks`)}
        ${healthItem("Half-day schedule", config.liveTeachingV120.halfDaySchedule.length === 13, `${config.liveTeachingV120.halfDaySchedule.length} blocks`)}
        ${healthItem("Selected-day plan", planReady, planReady ? state.selectedDay : "No plan found")}
        ${healthItem("Live teaching storage", true, "Connected")}
      </div>
      <button class="secondary-button">Open Live Teaching</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "teachday";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>
    `;
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


/* Version 12.0.1 — Live Teaching Stability Guard */
(() => {
  "use strict";

  function stabilize() {
    document.documentElement.classList.add("v1201-live-stable");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stabilize);
  } else {
    stabilize();
  }
})();

/* Version 12.1 — Lesson Attachments Center */
(() => {
"use strict";
const STORE="thh-v74:attachments",PRINT="thh-v74:print-center",WEEK="thh-v73:weekly-plan",UI="thh-v121:attachments-ui";
let cfg,items=[],ui={day:"All",category:"All",status:"All",search:"",selected:[]};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
async function start(){cfg=await fetch("tos-data.json",{cache:"no-store"}).then(r=>r.json());try{items=JSON.parse(localStorage.getItem(STORE)||"[]");if(!Array.isArray(items))items=[]}catch{items=[]}try{ui={...ui,...JSON.parse(localStorage.getItem(UI)||"{}")}}catch{};normalize();wait()}
function normalize(){items=items.map((x,i)=>({id:x.id||`att-${Date.now()}-${i}`,title:x.title||"Untitled Resource",day:x.day||"Monday",category:x.category||"Other",type:x.type||"PDF",lesson:x.lesson||"",url:x.url||"",fileName:x.fileName||"",notes:x.notes||"",print:!!x.print,copies:Math.max(1,+x.copies||cfg.lessonAttachmentsV121.defaultCopies),status:x.status||(x.url||x.fileName?"Linked":"Missing Link"),teacherOnly:!!x.teacherOnly,createdAt:x.createdAt||new Date().toISOString(),updatedAt:x.updatedAt||new Date().toISOString()}));saveItems()}
function saveItems(){localStorage.setItem(STORE,JSON.stringify(items))}function saveUi(){localStorage.setItem(UI,JSON.stringify(ui))}
function plan(){try{return JSON.parse(localStorage.getItem(WEEK)||"{}")}catch{return{}}}
function wait(){if(!$("#pageHost")||!$("#mainNav"))return setTimeout(wait,100);window.addEventListener("hashchange",route);new MutationObserver(route).observe($("#pageHost"),{childList:true,subtree:true});route()}
function route(){const r=location.hash.slice(1)||"dashboard";if(r==="attachments"&&!$("#v121Attachments"))setTimeout(render);if(r==="dashboard")setTimeout(dash);if(r==="lesson-plans")setTimeout(planCard);if(r==="workflow-hub")setTimeout(workflow);if(r==="health")setTimeout(health)}
function filtered(){const q=ui.search.toLowerCase().trim();return items.filter(x=>(ui.day==="All"||x.day===ui.day)&&(ui.category==="All"||x.category===ui.category)&&(ui.status==="All"||x.status===ui.status)&&(!q||[x.title,x.lesson,x.category,x.type,x.notes,x.url,x.fileName].join(" ").toLowerCase().includes(q)))}
function stats(){return{total:items.length,linked:items.filter(x=>x.url||x.fileName).length,missing:items.filter(x=>!x.url&&!x.fileName).length,print:items.filter(x=>x.print).length}}
function render(){const h=$("#pageHost"),st=stats(),list=filtered();h.innerHTML=`<section id="v121Attachments"><section class="page-header"><div><p>VERSION 12.1</p><h2>Lesson Attachments Center</h2><span>Organize weekly curriculum resources, connect authorized links, and prepare items for printing.</span></div><div class="button-row"><button id="add" class="primary-button">Add Resource</button><button id="generate" class="secondary-button">Generate from Weekly Plan</button></div></section>
<section class="v121-stat-grid">${stat("Total Resources",st.total)}${stat("Linked",st.linked)}${stat("Missing Links",st.missing)}${stat("Print Selected",st.print)}</section>
<section class="panel v121-toolbar"><div class="v121-filter-grid">${sel("day","Day",["All",...cfg.lessonAttachmentsV121.days],ui.day)}${sel("cat","Category",["All",...cfg.lessonAttachmentsV121.categories],ui.category)}${sel("status","Status",["All",...cfg.lessonAttachmentsV121.statusOptions],ui.status)}<label><span>Search</span><input id="search" value="${esc(ui.search)}" placeholder="Search resources"></label></div><div class="v121-toolbar-actions"><button id="selectVisible" class="secondary-button">Select Visible</button><button id="clear" class="secondary-button">Clear Selection</button><button id="sendPrint" class="primary-button">Send Selected to Print Center</button><button id="deleteSelected" class="danger-button">Delete Selected</button></div></section>
<section class="v121-selection-bar ${ui.selected.length?"show":""}"><strong>${ui.selected.length} selected</strong><span>Selected resources can be sent to Print Center.</span></section>
<section class="v121-resource-grid">${list.length?list.map(card).join(""):'<div class="empty-state"><strong>No matching resources.</strong><p>Add a resource or generate from Weekly Planning.</p></div>'}</section></section>`;wire()}
function stat(a,b){return`<article><span>${esc(a)}</span><strong>${b}</strong><small>Weekly resource status</small></article>`}
function sel(id,label,opts,val){return`<label><span>${label}</span><select id="${id}">${opts.map(x=>`<option ${x===val?"selected":""}>${esc(x)}</option>`).join("")}</select></label>`}
function card(x){const linked=!!(x.url||x.fileName),selected=ui.selected.includes(x.id);return`<article class="panel v121-resource ${selected?"selected":""} ${linked?"linked":"missing"}"><div class="v121-resource-heading"><label><input type="checkbox" data-select="${x.id}" ${selected?"checked":""}></label><div><span>${esc(x.day)} • ${esc(x.category)}</span><h3>${esc(x.title)}</h3><small>${esc(x.type)}${x.lesson?` • ${esc(x.lesson)}`:""}</small></div><b>${linked?"✓":"!"}</b></div><dl><div><dt>Status</dt><dd>${esc(x.status)}</dd></div><div><dt>Copies</dt><dd>${x.teacherOnly?"Teacher copy":x.copies}</dd></div><div><dt>Printing</dt><dd>${x.print?"Selected":"Not selected"}</dd></div></dl><div class="v121-source"><span>SOURCE</span>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">Open linked resource ↗</a>`:x.fileName?`<strong>${esc(x.fileName)}</strong>`:"<em>No link or path added.</em>"}</div>${x.notes?`<p class="v121-notes">${esc(x.notes)}</p>`:""}<div class="v121-card-actions"><button data-edit="${x.id}" class="secondary-button">Edit</button><button data-print="${x.id}" class="${x.print?"primary-button":"secondary-button"}">${x.print?"Remove from Print":"Add to Print"}</button>${x.url?`<a href="${esc(x.url)}" target="_blank" class="primary-button">Open</a>`:""}</div></article>`}
function wire(){$("#day").onchange=e=>{ui.day=e.target.value;saveUi();render()};$("#cat").onchange=e=>{ui.category=e.target.value;saveUi();render()};$("#status").onchange=e=>{ui.status=e.target.value;saveUi();render()};$("#search").onchange=e=>{ui.search=e.target.value;saveUi();render()};$("#add").onclick=()=>editor();$("#generate").onclick=generate;$$("[data-select]").forEach(i=>i.onchange=()=>{ui.selected=i.checked?[...new Set([...ui.selected,i.dataset.select])]:ui.selected.filter(id=>id!==i.dataset.select);saveUi();render()});$$("[data-edit]").forEach(b=>b.onclick=()=>editor(b.dataset.edit));$$("[data-print]").forEach(b=>b.onclick=()=>{const x=items.find(i=>i.id===b.dataset.print);x.print=!x.print;if(x.print&&(x.url||x.fileName))x.status="Ready to Print";saveItems();render()});$("#selectVisible").onclick=()=>{ui.selected=[...new Set([...ui.selected,...filtered().map(x=>x.id)])];saveUi();render()};$("#clear").onclick=()=>{ui.selected=[];saveUi();render()};$("#sendPrint").onclick=sendPrint;$("#deleteSelected").onclick=delSelected}
function editor(id=""){const old=items.find(x=>x.id===id),x=old||{id:`att-${Date.now()}`,title:"",day:ui.day==="All"?"Monday":ui.day,category:ui.category==="All"?"Open Court":ui.category,type:"PDF",lesson:"",url:"",fileName:"",notes:"",print:false,copies:cfg.lessonAttachmentsV121.defaultCopies,status:"Missing Link",teacherOnly:false,createdAt:new Date().toISOString()};$("#pageHost").innerHTML=`<section id="v121Editor"><section class="page-header"><div><p>LESSON RESOURCE</p><h2>${old?"Edit":"Add"} Resource</h2><span>Add an authorized link or repository path.</span></div><button id="cancel" class="secondary-button">Cancel</button></section><section class="panel v121-editor"><div class="v121-editor-grid"><label class="wide"><span>Resource Title</span><input id="title" value="${esc(x.title)}"></label>${editSel("eday","Day",cfg.lessonAttachmentsV121.days,x.day)}${editSel("ecat","Category",cfg.lessonAttachmentsV121.categories,x.category)}${editSel("etype","Type",cfg.lessonAttachmentsV121.resourceTypes,x.type)}${editSel("estatus","Status",cfg.lessonAttachmentsV121.statusOptions,x.status)}<label class="wide"><span>Lesson Connection</span><input id="lesson" value="${esc(x.lesson)}"></label><label class="wide"><span>Web / Drive / GitHub Link</span><input id="url" value="${esc(x.url)}"></label><label class="wide"><span>Local Filename or Repository Path</span><input id="file" value="${esc(x.fileName)}"></label><label><span>Student Copies</span><input id="copies" type="number" min="1" value="${x.copies}"></label><label class="v121-check"><input id="teacher" type="checkbox" ${x.teacherOnly?"checked":""}><span>Teacher only</span></label><label class="v121-check"><input id="eprint" type="checkbox" ${x.print?"checked":""}><span>Add to Print Center</span></label><label class="wide"><span>Notes</span><textarea id="notes">${esc(x.notes)}</textarea></label></div><div class="button-row"><button id="save" class="primary-button">Save Resource</button>${old?'<button id="delete" class="danger-button">Delete Resource</button>':""}</div></section></section>`;$("#cancel").onclick=render;$("#save").onclick=()=>{Object.assign(x,{title:$("#title").value.trim()||"Untitled Resource",day:$("#eday").value,category:$("#ecat").value,type:$("#etype").value,status:$("#estatus").value,lesson:$("#lesson").value.trim(),url:$("#url").value.trim(),fileName:$("#file").value.trim(),copies:Math.max(1,+$("#copies").value||33),teacherOnly:$("#teacher").checked,print:$("#eprint").checked,notes:$("#notes").value.trim(),updatedAt:new Date().toISOString()});if(!x.url&&!x.fileName)x.status="Missing Link";else if(x.print)x.status="Ready to Print";else if(x.status==="Missing Link")x.status="Linked";if(!old)items.unshift(x);saveItems();render();toast("Resource saved.")};$("#delete")?.addEventListener("click",()=>{if(confirm(`Delete "${x.title}"?`)){items=items.filter(i=>i.id!==x.id);saveItems();render()}})}
function editSel(id,label,opts,val){return`<label><span>${label}</span><select id="${id}">${opts.map(x=>`<option ${x===val?"selected":""}>${esc(x)}</option>`).join("")}</select></label>`}
function generate(){const p=plan(),days=p.days||{};if(!Object.keys(days).length){toast("Build Weekly Planning first.");setTimeout(()=>location.hash="lesson-plans",600);return}const gen=[];Object.entries(days).forEach(([day,d])=>{[["Open Court","Skills Practice",d.openCourtLesson||d.reading,"Open Court Skills Practice"],["Open Court","Assessment",d.openCourtLesson||d.reading,"Open Court Lesson Assessment"],["Phonics","Student Page",d.phonics,"Phonics / Spelling Practice"],["Vocabulary","Student Page",d.vocabulary,"Vocabulary Practice"],["Writing / GUM","Student Page",d.writing,"Writing / GUM Page"],["Eureka Math²","Student Page",d.math,`${d.math||"Eureka Math²"} Materials`],["Eureka Math²","Exit Ticket",d.math,`${d.math||"Eureka Math²"} Exit Ticket`],["Science","Student Page",d.science,"Science Student Page"],["Social Studies","Student Page",d.socialStudies,"Social Studies Student Page"]].forEach(([category,type,lesson,title],i)=>{if(!lesson&&["Phonics","Vocabulary"].includes(category))return;gen.push({id:`generated-${p.weekOf||"week"}-${day}-${category}-${i}`.toLowerCase().replace(/[^a-z0-9-]/g,"-"),title,day,category,type,lesson:String(lesson||p.title||"").split("\n")[0],url:"",fileName:"",notes:"Add the authorized school-provided resource.",print:true,copies:cfg.lessonAttachmentsV121.defaultCopies,status:"Missing Link",teacherOnly:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})})});const ids=new Set(gen.map(x=>x.id));items=[...items.filter(x=>!ids.has(x.id)),...gen];saveItems();render();toast(`${gen.length} resource records created.`)}
function sendPrint(){const selected=items.filter(x=>ui.selected.includes(x.id));if(!selected.length)return toast("Select at least one resource.");let q=[];try{q=JSON.parse(localStorage.getItem(PRINT)||"[]")}catch{};selected.forEach(x=>{x.print=true;x.status=x.url||x.fileName?"Ready to Print":"Missing Link";const rec={id:`print-${x.id}`,source:"Lesson Attachments Center",day:x.day,title:x.title,category:x.category,copies:x.teacherOnly?1:x.copies,notes:x.notes,url:x.url||x.fileName,complete:false};const i=q.findIndex(y=>y.id===rec.id);i>=0?q[i]=rec:q.push(rec)});saveItems();localStorage.setItem(PRINT,JSON.stringify(q));ui.selected=[];saveUi();render();toast(`${selected.length} resource(s) sent to Print Center.`)}
function delSelected(){if(!ui.selected.length)return toast("Select at least one resource.");if(confirm(`Delete ${ui.selected.length} selected resource(s)?`)){const ids=new Set(ui.selected);items=items.filter(x=>!ids.has(x.id));ui.selected=[];saveItems();saveUi();render()}}
function dash(){const d=$("#v72Dashboard");if(!d||$("#v121Dash"))return;const s=stats(),c=document.createElement("section");c.id="v121Dash";c.className="v121-dashboard-card";c.innerHTML=`<div><p>LESSON ATTACHMENTS CENTER</p><h3>${s.total} resources • ${s.missing} missing links</h3><span>${s.print} selected for printing.</span></div><button>Open Attachments</button>`;c.querySelector("button").onclick=()=>location.hash="attachments";d.prepend(c)}
function planCard(){const p=$("#v73PlanningStudio");if(!p||$("#v121Plan"))return;const s=stats(),c=document.createElement("section");c.id="v121Plan";c.className="v121-injected-card";c.innerHTML=`<div><p>WEEKLY RESOURCE CHECKLIST</p><h3>${s.total} resources • ${s.missing} need links</h3><span>Generate resources from the current weekly plan.</span></div><button>Open Attachments</button>`;c.querySelector("button").onclick=()=>location.hash="attachments";$(".v73-planning-header",p)?.after(c)}
function workflow(){const h=$("#v111WorkflowHub");if(!h||$("#v121Workflow"))return;const s=stats(),c=document.createElement("section");c.id="v121Workflow";c.className="v121-workflow-card";c.innerHTML=`<div><p>LESSON ATTACHMENTS MODULE</p><h3>${s.missing?`${s.missing} resources need links`:"Attachment checklist ready"}</h3><span>${s.total} resource records available.</span></div><button>Open Attachments</button>`;c.querySelector("button").onclick=()=>location.hash="attachments";$(".page-header",h)?.after(c)}
function health(){const h=$("#pageHost");if(!h||$("#v121Health"))return;const s=stats(),p=document.createElement("section");p.id="v121Health";p.className="panel";p.innerHTML=`<h3>Version 12.1 Lesson Attachments Health</h3><div class="health-grid"><article class="ready"><strong>✓</strong><div><span>Storage</span><small>${s.total} records</small></div></article><article class="${s.missing?"missing":"ready"}"><strong>${s.missing?"!":"✓"}</strong><div><span>Linked resources</span><small>${s.linked}/${s.total}</small></div></article><article class="${s.print?"ready":"missing"}"><strong>${s.print?"✓":"!"}</strong><div><span>Print selections</span><small>${s.print}</small></div></article></div><button class="secondary-button">Open Attachments</button>`;p.querySelector("button").onclick=()=>location.hash="attachments";h.appendChild(p)}
function toast(m){const t=$("#toast");if(!t)return;t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();

/* =====================================================================
   Version 12.2 — Print Center & Weekly Packet Queue
   ===================================================================== */
(() => {
  "use strict";

  const STORE = "thh-v74:print-center";
  const ATTACHMENTS_STORE = "thh-v74:attachments";
  const UI_STORE = "thh-v122:print-ui";

  let config = null;
  let queue = [];
  let ui = {
    day: "All",
    category: "All",
    status: "All",
    search: "",
    selected: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => response.json());

      try {
        queue = JSON.parse(localStorage.getItem(STORE) || "[]");
        if (!Array.isArray(queue)) queue = [];
      } catch {
        queue = [];
      }

      try {
        ui = { ...ui, ...JSON.parse(localStorage.getItem(UI_STORE) || "{}") };
      } catch {}

      normalizeQueue();
      waitForShell();
    } catch (error) {
      console.error("Version 12.2 failed to initialize.", error);
    }
  }

  function normalizeQueue() {
    queue = queue.map((item, index) => ({
      id: item.id || `print-${Date.now()}-${index}`,
      source: item.source || "Manual Entry",
      day: item.day || "Before Monday",
      title: item.title || "Untitled Print Item",
      category: item.category || "Other",
      section: item.section || inferSection(item),
      copies: Math.max(1, Number(item.copies) || config.printCenterV122.defaultCopies),
      notes: item.notes || "",
      url: item.url || "",
      complete: Boolean(item.complete),
      missingSource: item.missingSource ?? !Boolean(item.url),
      teacherOnly: Boolean(item.teacherOnly),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    }));
    saveQueue();
  }

  function inferSection(item) {
    if (item.teacherOnly || Number(item.copies) === 1) return "Teacher Materials";
    if (String(item.category).includes("Assessment")) return "Assessments";
    if (String(item.notes).toLowerCase().includes("small group")) return "Small Group / Intervention";
    return "Student Copies";
  }

  function saveQueue() {
    localStorage.setItem(STORE, JSON.stringify(queue));
  }

  function saveUi() {
    localStorage.setItem(UI_STORE, JSON.stringify(ui));
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    window.addEventListener("hashchange", route);
    new MutationObserver(route).observe($("#pageHost"), { childList:true, subtree:true });
    route();
  }

  function route() {
    const current = location.hash.replace("#","") || "dashboard";
    if (current === "print-center" && !$("#v122PrintCenter")) setTimeout(renderPrintCenter, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "workflow-hub") setTimeout(injectWorkflowCard, 0);
    if (current === "health") setTimeout(injectHealthPanel, 0);
  }

  function filteredQueue() {
    const query = ui.search.trim().toLowerCase();

    return queue.filter(item => {
      const dayMatch = ui.day === "All" || item.day === ui.day;
      const categoryMatch = ui.category === "All" || item.category === ui.category;
      const statusMatch =
        ui.status === "All" ||
        (ui.status === "Complete" && item.complete) ||
        (ui.status === "Pending" && !item.complete) ||
        (ui.status === "Missing Source" && item.missingSource);
      const searchMatch = !query || [
        item.title, item.category, item.section, item.notes, item.source, item.url
      ].join(" ").toLowerCase().includes(query);

      return dayMatch && categoryMatch && statusMatch && searchMatch;
    });
  }

  function stats() {
    return {
      total: queue.length,
      pending: queue.filter(item => !item.complete).length,
      complete: queue.filter(item => item.complete).length,
      missing: queue.filter(item => item.missingSource).length,
      copies: queue.filter(item => !item.complete).reduce((sum, item) => sum + Number(item.copies || 0), 0)
    };
  }

  function renderPrintCenter() {
    const host = $("#pageHost");
    if (!host) return;

    const summary = stats();
    const filtered = filteredQueue();

    host.innerHTML = `
      <section id="v122PrintCenter">
        <section class="page-header">
          <div>
            <p>VERSION 12.2</p>
            <h2>Print Center & Weekly Packet Queue</h2>
            <span>Organize student copies, teacher materials, assessments, and daily packet preparation.</span>
          </div>
          <div class="button-row">
            <button id="v122Import" class="primary-button">Import from Attachments</button>
            <button id="v122Add" class="secondary-button">Add Print Item</button>
            <button id="v122PrintPage" class="secondary-button">Print Queue</button>
          </div>
        </section>

        <section class="v122-stat-grid">
          ${statCard("Total Items", summary.total, "All items in the queue")}
          ${statCard("Pending", summary.pending, "Items still needing preparation")}
          ${statCard("Completed", summary.complete, "Items already printed or prepared")}
          ${statCard("Missing Sources", summary.missing, "Items without a working link or path")}
          ${statCard("Copies Remaining", summary.copies, "Total pending copy count")}
        </section>

        <section class="panel v122-toolbar">
          <div class="v122-filter-grid">
            ${selectControl("v122Day", "Day", ["All", ...config.printCenterV122.days], ui.day)}
            ${selectControl("v122Category", "Category", ["All", ...config.printCenterV122.categories], ui.category)}
            ${selectControl("v122Status", "Status", ["All","Pending","Complete","Missing Source"], ui.status)}
            <label>
              <span>Search</span>
              <input id="v122Search" value="${esc(ui.search)}" placeholder="Search print items">
            </label>
          </div>

          <div class="v122-toolbar-actions">
            <button id="v122SelectVisible" class="secondary-button">Select Visible</button>
            <button id="v122ClearSelection" class="secondary-button">Clear Selection</button>
            <button id="v122CompleteSelected" class="primary-button">Mark Selected Complete</button>
            <button id="v122ReopenSelected" class="secondary-button">Mark Selected Pending</button>
            <button id="v122DeleteSelected" class="danger-button">Delete Selected</button>
          </div>
        </section>

        <section class="v122-day-overview">
          ${config.printCenterV122.days.map(day => dayOverview(day)).join("")}
        </section>

        <section class="v122-queue-grid">
          ${filtered.length
            ? filtered.map(printCard).join("")
            : `<div class="empty-state">
                <strong>No matching print items.</strong>
                <p>Import from Lesson Attachments or add an item manually.</p>
              </div>`
          }
        </section>
      </section>
    `;

    wirePrintCenter();
  }

  function statCard(label, number, detail) {
    return `
      <article>
        <span>${esc(label)}</span>
        <strong>${number}</strong>
        <small>${esc(detail)}</small>
      </article>
    `;
  }

  function selectControl(id, label, options, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <select id="${id}">
          ${options.map(option => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function dayOverview(day) {
    const dayItems = queue.filter(item => item.day === day);
    const complete = dayItems.filter(item => item.complete).length;
    const missing = dayItems.filter(item => item.missingSource).length;

    return `
      <button data-v122-day-overview="${esc(day)}" class="${ui.day === day ? "active" : ""}">
        <span>${esc(day)}</span>
        <strong>${complete}/${dayItems.length} complete</strong>
        <small>${missing ? `${missing} missing source(s)` : "Sources ready"}</small>
      </button>
    `;
  }

  function printCard(item) {
    const selected = ui.selected.includes(item.id);

    return `
      <article class="panel v122-print-card ${item.complete ? "complete" : ""} ${item.missingSource ? "missing" : ""} ${selected ? "selected" : ""}">
        <div class="v122-card-heading">
          <label>
            <input type="checkbox" data-v122-select="${esc(item.id)}" ${selected ? "checked" : ""}>
          </label>
          <div>
            <span>${esc(item.day)} • ${esc(item.category)}</span>
            <h3>${esc(item.title)}</h3>
            <small>${esc(item.section)} • Source: ${esc(item.source)}</small>
          </div>
          <b>${item.complete ? "✓" : item.missingSource ? "!" : "•"}</b>
        </div>

        <dl>
          <div>
            <dt>Copies</dt>
            <dd>${item.teacherOnly ? "1 teacher copy" : item.copies}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>${item.complete ? "Complete" : "Pending"}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>${item.missingSource ? "Missing" : "Ready"}</dd>
          </div>
        </dl>

        <div class="v122-source">
          ${item.url
            ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">Open resource ↗</a>`
            : `<em>Add the missing source in Lesson Attachments or edit this item.</em>`
          }
        </div>

        ${item.notes ? `<p>${esc(item.notes)}</p>` : ""}

        <div class="v122-card-actions">
          <button data-v122-edit="${esc(item.id)}" class="secondary-button">Edit</button>
          <button data-v122-toggle="${esc(item.id)}" class="${item.complete ? "secondary-button" : "primary-button"}">
            ${item.complete ? "Mark Pending" : "Mark Complete"}
          </button>
          ${item.url ? `<a href="${esc(item.url)}" target="_blank" rel="noopener" class="primary-button">Open</a>` : ""}
        </div>
      </article>
    `;
  }

  function wirePrintCenter() {
    $("#v122Day")?.addEventListener("change", event => {
      ui.day = event.target.value;
      saveUi();
      renderPrintCenter();
    });

    $("#v122Category")?.addEventListener("change", event => {
      ui.category = event.target.value;
      saveUi();
      renderPrintCenter();
    });

    $("#v122Status")?.addEventListener("change", event => {
      ui.status = event.target.value;
      saveUi();
      renderPrintCenter();
    });

    $("#v122Search")?.addEventListener("change", event => {
      ui.search = event.target.value;
      saveUi();
      renderPrintCenter();
    });

    $("#v122Import")?.addEventListener("click", importFromAttachments);
    $("#v122Add")?.addEventListener("click", () => renderEditor());
    $("#v122PrintPage")?.addEventListener("click", () => window.print());

    $$("[data-v122-day-overview]").forEach(button => {
      button.addEventListener("click", () => {
        ui.day = button.dataset.v122DayOverview;
        saveUi();
        renderPrintCenter();
      });
    });

    $$("[data-v122-select]").forEach(input => {
      input.addEventListener("change", () => {
        const id = input.dataset.v122Select;
        ui.selected = input.checked
          ? [...new Set([...ui.selected, id])]
          : ui.selected.filter(itemId => itemId !== id);
        saveUi();
        renderPrintCenter();
      });
    });

    $$("[data-v122-edit]").forEach(button => {
      button.addEventListener("click", () => renderEditor(button.dataset.v122Edit));
    });

    $$("[data-v122-toggle]").forEach(button => {
      button.addEventListener("click", () => {
        const item = queue.find(record => record.id === button.dataset.v122Toggle);
        if (!item) return;
        item.complete = !item.complete;
        item.updatedAt = new Date().toISOString();
        saveQueue();
        renderPrintCenter();
      });
    });

    $("#v122SelectVisible")?.addEventListener("click", () => {
      ui.selected = [...new Set([...ui.selected, ...filteredQueue().map(item => item.id)])];
      saveUi();
      renderPrintCenter();
    });

    $("#v122ClearSelection")?.addEventListener("click", () => {
      ui.selected = [];
      saveUi();
      renderPrintCenter();
    });

    $("#v122CompleteSelected")?.addEventListener("click", () => updateSelected(true));
    $("#v122ReopenSelected")?.addEventListener("click", () => updateSelected(false));
    $("#v122DeleteSelected")?.addEventListener("click", deleteSelected);
  }

  function importFromAttachments() {
    let attachments = [];
    try {
      attachments = JSON.parse(localStorage.getItem(ATTACHMENTS_STORE) || "[]");
      if (!Array.isArray(attachments)) attachments = [];
    } catch {
      attachments = [];
    }

    const printable = attachments.filter(item => item.print);

    if (!printable.length) {
      toast("No resources are marked for printing in Lesson Attachments.");
      setTimeout(() => location.hash = "attachments", 700);
      return;
    }

    printable.forEach(item => {
      const record = {
        id: `print-${item.id}`,
        source: "Lesson Attachments Center",
        day: item.day || "Before Monday",
        title: item.title,
        category: item.category || "Other",
        section: item.teacherOnly ? "Teacher Materials" : inferSection(item),
        copies: item.teacherOnly ? 1 : Math.max(1, Number(item.copies) || config.printCenterV122.defaultCopies),
        notes: item.notes || "",
        url: item.url || item.fileName || "",
        complete: false,
        missingSource: !(item.url || item.fileName),
        teacherOnly: Boolean(item.teacherOnly),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const index = queue.findIndex(existing => existing.id === record.id);
      if (index >= 0) {
        record.complete = queue[index].complete;
        record.createdAt = queue[index].createdAt;
        queue[index] = record;
      } else {
        queue.push(record);
      }
    });

    saveQueue();
    renderPrintCenter();
    toast(`${printable.length} attachment item(s) imported.`);
  }

  function renderEditor(id = "") {
    const host = $("#pageHost");
    const existing = queue.find(item => item.id === id);
    const item = existing || {
      id: `print-manual-${Date.now()}`,
      source: "Manual Entry",
      day: ui.day === "All" ? "Before Monday" : ui.day,
      title: "",
      category: ui.category === "All" ? "Other" : ui.category,
      section: "Student Copies",
      copies: config.printCenterV122.defaultCopies,
      notes: "",
      url: "",
      complete: false,
      missingSource: true,
      teacherOnly: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    host.innerHTML = `
      <section id="v122PrintEditor">
        <section class="page-header">
          <div>
            <p>PRINT ITEM</p>
            <h2>${existing ? "Edit" : "Add"} Print Item</h2>
            <span>Set the day, section, copy count, and source.</span>
          </div>
          <button id="v122Cancel" class="secondary-button">Cancel</button>
        </section>

        <section class="panel v122-editor">
          <div class="v122-editor-grid">
            <label class="wide">
              <span>Item Title</span>
              <input id="v122Title" value="${esc(item.title)}">
            </label>

            ${editorSelect("v122EditDay", "Day", config.printCenterV122.days, item.day)}
            ${editorSelect("v122EditCategory", "Category", config.printCenterV122.categories, item.category)}
            ${editorSelect("v122EditSection", "Packet Section", config.printCenterV122.packetSections, item.section)}

            <label>
              <span>Copies</span>
              <input id="v122Copies" type="number" min="1" value="${item.copies}">
            </label>

            <label class="wide">
              <span>Link or Repository Path</span>
              <input id="v122Url" value="${esc(item.url)}">
            </label>

            <label class="v122-check">
              <input id="v122TeacherOnly" type="checkbox" ${item.teacherOnly ? "checked" : ""}>
              <span>Teacher-only resource</span>
            </label>

            <label class="v122-check">
              <input id="v122Complete" type="checkbox" ${item.complete ? "checked" : ""}>
              <span>Already printed or prepared</span>
            </label>

            <label class="wide">
              <span>Notes</span>
              <textarea id="v122Notes">${esc(item.notes)}</textarea>
            </label>
          </div>

          <div class="button-row">
            <button id="v122Save" class="primary-button">Save Print Item</button>
            ${existing ? `<button id="v122Delete" class="danger-button">Delete Print Item</button>` : ""}
          </div>
        </section>
      </section>
    `;

    $("#v122Cancel")?.addEventListener("click", renderPrintCenter);
    $("#v122Save")?.addEventListener("click", () => {
      Object.assign(item, {
        title: $("#v122Title").value.trim() || "Untitled Print Item",
        day: $("#v122EditDay").value,
        category: $("#v122EditCategory").value,
        section: $("#v122EditSection").value,
        copies: Math.max(1, Number($("#v122Copies").value) || config.printCenterV122.defaultCopies),
        url: $("#v122Url").value.trim(),
        teacherOnly: $("#v122TeacherOnly").checked,
        complete: $("#v122Complete").checked,
        notes: $("#v122Notes").value.trim(),
        missingSource: !$("#v122Url").value.trim(),
        updatedAt: new Date().toISOString()
      });

      if (item.teacherOnly) item.copies = 1;
      if (!existing) queue.unshift(item);
      saveQueue();
      renderPrintCenter();
      toast("Print item saved.");
    });

    $("#v122Delete")?.addEventListener("click", () => {
      if (!confirm(`Delete "${item.title}"?`)) return;
      queue = queue.filter(record => record.id !== item.id);
      ui.selected = ui.selected.filter(selectedId => selectedId !== item.id);
      saveQueue();
      saveUi();
      renderPrintCenter();
      toast("Print item deleted.");
    });
  }

  function editorSelect(id, label, options, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <select id="${id}">
          ${options.map(option => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function updateSelected(complete) {
    const selectedIds = new Set(ui.selected);
    if (!selectedIds.size) {
      toast("Select at least one print item.");
      return;
    }

    queue.forEach(item => {
      if (selectedIds.has(item.id)) {
        item.complete = complete;
        item.updatedAt = new Date().toISOString();
      }
    });

    saveQueue();
    ui.selected = [];
    saveUi();
    renderPrintCenter();
    toast(complete ? "Selected items marked complete." : "Selected items marked pending.");
  }

  function deleteSelected() {
    if (!ui.selected.length) {
      toast("Select at least one print item.");
      return;
    }

    if (!confirm(`Delete ${ui.selected.length} selected print item(s)?`)) return;

    const selectedIds = new Set(ui.selected);
    queue = queue.filter(item => !selectedIds.has(item.id));
    ui.selected = [];
    saveQueue();
    saveUi();
    renderPrintCenter();
    toast("Selected print items deleted.");
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v122DashboardCard")) return;

    const summary = stats();
    const card = document.createElement("section");
    card.id = "v122DashboardCard";
    card.className = "v122-dashboard-card";
    card.innerHTML = `
      <div>
        <p>PRINT CENTER</p>
        <h3>${summary.pending} pending • ${summary.missing} missing sources</h3>
        <span>${summary.copies} copies remain in the weekly queue.</span>
      </div>
      <button>Open Print Center</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "print-center";
    dashboard.prepend(card);
  }

  function injectWorkflowCard() {
    const hub = $("#v111WorkflowHub");
    if (!hub || $("#v122WorkflowCard")) return;

    const summary = stats();
    const card = document.createElement("section");
    card.id = "v122WorkflowCard";
    card.className = "v122-workflow-card";
    card.innerHTML = `
      <div>
        <p>PRINT CENTER MODULE</p>
        <h3>${summary.pending ? `${summary.pending} items still pending` : "Weekly print queue complete"}</h3>
        <span>${summary.missing} item(s) still need a source.</span>
      </div>
      <button>Open Print Center</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "print-center";
    $(".page-header", hub)?.insertAdjacentElement("afterend", card);
  }

  function injectHealthPanel() {
    const host = $("#pageHost");
    if (!host || $("#v122HealthPanel")) return;

    const summary = stats();
    const panel = document.createElement("section");
    panel.id = "v122HealthPanel";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 12.2 Print Center Health</h3>
      <div class="health-grid">
        ${healthItem("Print queue", queue.length > 0, `${queue.length} items`)}
        ${healthItem("Missing sources", summary.missing === 0, `${summary.missing} missing`)}
        ${healthItem("Pending work", summary.pending === 0, `${summary.pending} pending`)}
        ${healthItem("Attachments connection", Boolean(localStorage.getItem(ATTACHMENTS_STORE)), "Connected")}
      </div>
      <button class="secondary-button">Open Print Center</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "print-center";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>
    `;
  }

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1900);
  }

  window.THH_RENDER_PRINT_CENTER = renderPrintCenter;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();


/* Version 13.1 — Direct Print Center Renderer Integration */
(() => {
  "use strict";
  function openDirectly() {
    if (location.hash.replace("#", "") !== "print-center") return;
    if (typeof window.THH_RENDER_PRINT_CENTER === "function") {
      window.THH_RENDER_PRINT_CENTER();
    }
  }
  window.addEventListener("hashchange", openDirectly);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", openDirectly);
  else openDirectly();
})();

/* =====================================================================
   Version 13.0 — Stable Application Framework & Route Registry
   ===================================================================== */
(() => {
  "use strict";

  const STATE_KEY = "thh-v130:framework";
  let cfg = null;
  let state = { lastRoute: "dashboard", visits: {}, errors: [] };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function boot() {
    try {
      cfg = await fetch("tos-data.json", { cache: "no-store" }).then(r => r.json());
      try { state = { ...state, ...JSON.parse(localStorage.getItem(STATE_KEY) || "{}") }; } catch {}
      document.documentElement.classList.add("v130-framework");
      wait();
    } catch (error) {
      console.error("Version 13 framework failed.", error);
    }
  }

  function save() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function registered(route) {
    return (cfg.routeRegistryV13 || []).some(item => item.id === route);
  }

  function current() {
    return location.hash.replace("#", "") || "dashboard";
  }

  function wait() {
    if (!$("#pageHost") || !$("#mainNav")) return setTimeout(wait, 100);
    window.addEventListener("hashchange", handleRoute);
    window.addEventListener("error", recordError);
    handleRoute();
  }

  function handleRoute() {
    const route = current();

    if (!registered(route)) {
      location.hash = cfg.frameworkV13?.fallbackRoute || "dashboard";
      return;
    }

    state.lastRoute = route;
    state.visits[route] = (state.visits[route] || 0) + 1;
    save();

    document.body.dataset.route = route;
    $$(".v110-route").forEach(button => {
      button.classList.toggle("active", button.dataset.route === route);
    });

    if (route === "dashboard") setTimeout(injectFrameworkCard, 80);
    if (route === "health") setTimeout(injectFrameworkHealth, 80);
  }

  function recordError(event) {
    state.errors.unshift({
      message: event.message || "Unknown application error",
      route: current(),
      date: new Date().toISOString()
    });
    state.errors = state.errors.slice(0, 20);
    save();
  }

  function injectFrameworkCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v130FrameworkCard")) return;

    const card = document.createElement("section");
    card.id = "v130FrameworkCard";
    card.className = "v130-framework-card";
    card.innerHTML = `
      <div>
        <p>APPLICATION FRAMEWORK</p>
        <h3>${(cfg.routeRegistryV13 || []).length} permanent routes registered</h3>
        <span>Print Center and Forms & Printables now use separate routes.</span>
      </div>
      <button>Open Print Center</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "print-center";
    dashboard.prepend(card);
  }

  function injectFrameworkHealth() {
    const host = $("#pageHost");
    if (!host || $("#v130FrameworkHealth")) return;

    const printReady = registered("print-center");
    const formsReady = registered("forms");
    const panel = document.createElement("section");
    panel.id = "v130FrameworkHealth";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 13 Application Framework Health</h3>
      <div class="health-grid">
        ${healthItem("Route registry", true, `${(cfg.routeRegistryV13 || []).length} routes`)}
        ${healthItem("Print Center route", printReady, "print-center")}
        ${healthItem("Forms route", formsReady, "forms")}
        ${healthItem("Runtime errors", state.errors.length === 0, `${state.errors.length} recorded`)}
      </div>
      <div class="button-row">
        <button id="v130OpenPrint" class="secondary-button">Open Print Center</button>
        <button id="v130OpenForms" class="secondary-button">Open Forms & Printables</button>
      </div>
    `;
    $("#v130OpenPrint", panel).onclick = () => location.hash = "print-center";
    $("#v130OpenForms", panel).onclick = () => location.hash = "forms";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `<article class="${ok ? "ready" : "missing"}"><strong>${ok ? "✓" : "!"}</strong><div><span>${esc(title)}</span><small>${esc(detail)}</small></div></article>`;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* =====================================================================
   Version 14.0 — Student Data & Support Center
   Local browser storage only.
   ===================================================================== */
(() => {
  "use strict";

  const STORE = "thh-v140:student-records";
  const UI_STORE = "thh-v140:student-ui";
  const CONTACT_STORE = "thh-v140:contact-log";

  let config = null;
  let records = [];
  let contacts = [];
  let ui = {
    search: "",
    group: "All",
    support: "All",
    tier: "All",
    view: "cards",
    selectedId: ""
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
    // Register immediately so the router can always open the page.
    window.THH_RENDER_STUDENT_DATA = renderCenter;

    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`Configuration request failed: ${response.status}`);
        return response.json();
      });
    } catch (error) {
      console.warn("Student Data is using fallback configuration.", error);
      config = {
        studentDataCenterV140: {
          privacyNotice: "Student records are stored only in this browser's local storage.",
          supportFlags: ["IEP","504","EL","Speech","Intervention","Health Plan","Gifted / Extension"],
          readingGroups: [
            "Red — Far Below Level",
            "Yellow — Below Level",
            "Green — Benchmark",
            "Blue — Above Level",
            "Not Assigned"
          ],
          interventionTiers: ["Tier 1","Tier 2","Tier 3","Monitoring Only","Not Assigned"],
          defaultAccommodations: [
            "Preferential seating",
            "Directions repeated or clarified",
            "Chunked assignments",
            "Extended time",
            "Small-group testing",
            "Visual supports",
            "Sentence frames",
            "Movement breaks"
          ]
        }
      };
    }

    try {
      records = JSON.parse(localStorage.getItem(STORE) || "[]");
      if (!Array.isArray(records)) records = [];
    } catch {
      records = [];
    }

    try {
      contacts = JSON.parse(localStorage.getItem(CONTACT_STORE) || "[]");
      if (!Array.isArray(contacts)) contacts = [];
    } catch {
      contacts = [];
    }

    try {
      ui = { ...ui, ...JSON.parse(localStorage.getItem(UI_STORE) || "{}") };
    } catch {}

    normalize();
    waitForShell();
  }

  function normalize() {
    records = records.map((record, index) => ({
      id: record.id || `student-${Date.now()}-${index}`,
      displayName: record.displayName || record.name || "Unnamed Student",
      studentNumber: record.studentNumber || "",
      grade: record.grade || "2",
      readingGroup: record.readingGroup || "Not Assigned",
      interventionTier: record.interventionTier || "Not Assigned",
      interventionMinutes: Number(record.interventionMinutes) || 0,
      supportFlags: Array.isArray(record.supportFlags) ? record.supportFlags : [],
      accommodations: Array.isArray(record.accommodations) ? record.accommodations : [],
      dibelsComposite: record.dibelsComposite || "",
      orfWords: record.orfWords || "",
      orfAccuracy: record.orfAccuracy || "",
      maze: record.maze || "",
      nwfCls: record.nwfCls || "",
      readingLevel: record.readingLevel || "",
      mathBenchmark: record.mathBenchmark || "",
      strengths: record.strengths || "",
      needs: record.needs || "",
      goals: record.goals || "",
      teacherNotes: record.teacherNotes || "",
      lastUpdated: record.lastUpdated || new Date().toISOString()
    }));
    saveRecords();
  }

  function saveRecords() {
    localStorage.setItem(STORE, JSON.stringify(records));
  }

  function saveContacts() {
    localStorage.setItem(CONTACT_STORE, JSON.stringify(contacts));
  }

  function saveUi() {
    localStorage.setItem(UI_STORE, JSON.stringify(ui));
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    window.addEventListener("hashchange", route);
    route();
  }

  function route() {
    const current = location.hash.replace("#", "") || "dashboard";
    if (current === "students") setTimeout(renderCenter, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "small-groups") setTimeout(injectGroupingCard, 0);
    if (current === "intervention") setTimeout(injectInterventionCard, 0);
    if (current === "health") setTimeout(injectHealthPanel, 0);
  }

  function filteredRecords() {
    const query = ui.search.trim().toLowerCase();

    return records.filter(record => {
      const groupMatch = ui.group === "All" || record.readingGroup === ui.group;
      const tierMatch = ui.tier === "All" || record.interventionTier === ui.tier;
      const supportMatch = ui.support === "All" || record.supportFlags.includes(ui.support);
      const searchMatch = !query || [
        record.displayName,
        record.studentNumber,
        record.readingGroup,
        record.interventionTier,
        record.supportFlags.join(" "),
        record.strengths,
        record.needs,
        record.goals
      ].join(" ").toLowerCase().includes(query);

      return groupMatch && tierMatch && supportMatch && searchMatch;
    });
  }

  function statistics() {
    return {
      total: records.length,
      iep504: records.filter(record =>
        record.supportFlags.includes("IEP") || record.supportFlags.includes("504")
      ).length,
      el: records.filter(record => record.supportFlags.includes("EL")).length,
      intervention: records.filter(record =>
        record.supportFlags.includes("Intervention") ||
        ["Tier 2", "Tier 3"].includes(record.interventionTier)
      ).length,
      intensive: records.filter(record => record.readingGroup.includes("Red")).length
    };
  }

  function renderCenter() {
    if (location.hash.replace("#", "") !== "students") return;

    const host = $("#pageHost");
    if (!host) return;

    const stats = statistics();
    const filtered = filteredRecords();

    host.innerHTML = `
      <section id="v140StudentCenter">
        <section class="page-header">
          <div>
            <p>VERSION 14.0</p>
            <h2>Student Data & Support Center</h2>
            <span>Academic screening, reading groups, intervention, accommodations, and teacher notes.</span>
          </div>
          <div class="button-row">
            <button id="v140AddStudent" class="primary-button">Add Student</button>
            <button id="v140Export" class="secondary-button">Export Local Backup</button>
          </div>
        </section>

        <section class="v140-privacy">
          <strong>Local browser storage only</strong>
          <span>${esc(config.studentDataCenterV140.privacyNotice)}</span>
        </section>

        <section class="v140-stat-grid">
          ${statCard("Students", stats.total, "Local student profiles")}
          ${statCard("IEP / 504", stats.iep504, "Profiles with formal supports")}
          ${statCard("English Learners", stats.el, "Profiles marked EL")}
          ${statCard("Intervention", stats.intervention, "Tier 2, Tier 3, or intervention flag")}
          ${statCard("Red Group", stats.intensive, "Intensive reading support")}
        </section>

        <section class="panel v140-toolbar">
          <div class="v140-filter-grid">
            <label>
              <span>Search</span>
              <input id="v140Search" value="${esc(ui.search)}" placeholder="Search student, group, support, or goal">
            </label>
            ${selectControl("v140Group", "Reading Group", ["All", ...config.studentDataCenterV140.readingGroups], ui.group)}
            ${selectControl("v140Tier", "Intervention Tier", ["All", ...config.studentDataCenterV140.interventionTiers], ui.tier)}
            ${selectControl("v140Support", "Support Flag", ["All", ...config.studentDataCenterV140.supportFlags], ui.support)}
          </div>
        </section>

        <section class="v140-student-grid">
          ${filtered.length
            ? filtered.map(studentCard).join("")
            : `<div class="empty-state">
                <strong>No matching student profiles.</strong>
                <p>Add a student profile or adjust the filters.</p>
              </div>`
          }
        </section>
      </section>
    `;

    wireCenter();
  }

  function statCard(label, value, detail) {
    return `
      <article>
        <span>${esc(label)}</span>
        <strong>${value}</strong>
        <small>${esc(detail)}</small>
      </article>
    `;
  }

  function selectControl(id, label, options, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <select id="${id}">
          ${options.map(option => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function studentCard(record) {
    const contactCount = contacts.filter(contact => contact.studentId === record.id).length;
    const recommendation = groupingRecommendation(record);

    return `
      <article class="panel v140-student-card">
        <div class="v140-student-heading">
          <div>
            <span>${esc(record.readingGroup)}</span>
            <h3>${esc(record.displayName)}</h3>
            <small>${record.studentNumber ? `Student ID: ${esc(record.studentNumber)}` : "No student ID entered"}</small>
          </div>
          <b>${esc(initials(record.displayName))}</b>
        </div>

        <div class="v140-flags">
          ${record.supportFlags.length
            ? record.supportFlags.map(flag => `<span>${esc(flag)}</span>`).join("")
            : `<em>No support flags</em>`
          }
        </div>

        <div class="v140-score-grid">
          ${scoreItem("ORF", record.orfWords || "—")}
          ${scoreItem("Accuracy", record.orfAccuracy ? `${record.orfAccuracy}%` : "—")}
          ${scoreItem("Maze", record.maze || "—")}
          ${scoreItem("Math", record.mathBenchmark ? `${record.mathBenchmark}%` : "—")}
        </div>

        <div class="v140-recommendation">
          <span>TEACHER REVIEW SUGGESTION</span>
          <strong>${esc(recommendation)}</strong>
        </div>

        <dl>
          <div><dt>Tier</dt><dd>${esc(record.interventionTier)}</dd></div>
          <div><dt>Minutes</dt><dd>${record.interventionMinutes || 0} weekly</dd></div>
          <div><dt>Contacts</dt><dd>${contactCount}</dd></div>
        </dl>

        ${record.goals ? `<p><strong>Goal:</strong> ${esc(record.goals)}</p>` : ""}

        <div class="v140-card-actions">
          <button data-v140-view="${esc(record.id)}" class="primary-button">Open Profile</button>
          <button data-v140-contact="${esc(record.id)}" class="secondary-button">Add Contact Note</button>
        </div>
      </article>
    `;
  }

  function scoreItem(label, value) {
    return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
  }

  function initials(name) {
    return String(name).split(/\s+/).filter(Boolean).slice(0, 2)
      .map(part => part[0]?.toUpperCase() || "").join("") || "ST";
  }

  function groupingRecommendation(record) {
    const accuracy = Number(record.orfAccuracy);
    const words = Number(record.orfWords);

    if (record.readingGroup !== "Not Assigned") return record.readingGroup;
    if (accuracy && accuracy < 90) return "Consider Red or Yellow decoding/accuracy support";
    if (words && words < 50) return "Consider Yellow strategic fluency support";
    if (words && words >= 90 && accuracy >= 95) return "Consider Green extension/prosody";
    if (words) return "Consider Blue developing-fluency support";
    return "Enter current screening data before assigning a group";
  }

  function wireCenter() {
    $("#v140Search")?.addEventListener("change", event => {
      ui.search = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v140Group")?.addEventListener("change", event => {
      ui.group = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v140Tier")?.addEventListener("change", event => {
      ui.tier = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v140Support")?.addEventListener("change", event => {
      ui.support = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v140AddStudent")?.addEventListener("click", () => renderEditor());
    $("#v140Export")?.addEventListener("click", exportBackup);

    $$("[data-v140-view]").forEach(button => {
      button.addEventListener("click", () => renderProfile(button.dataset.v140View));
    });

    $$("[data-v140-contact]").forEach(button => {
      button.addEventListener("click", () => renderContactEditor(button.dataset.v140Contact));
    });
  }

  function renderProfile(id) {
    const record = records.find(item => item.id === id);
    if (!record) return renderCenter();

    const studentContacts = contacts
      .filter(contact => contact.studentId === id)
      .sort((a, b) => b.date.localeCompare(a.date));

    $("#pageHost").innerHTML = `
      <section id="v140StudentProfile">
        <section class="page-header">
          <div>
            <p>STUDENT PROFILE</p>
            <h2>${esc(record.displayName)}</h2>
            <span>${esc(record.readingGroup)} • ${esc(record.interventionTier)}</span>
          </div>
          <div class="button-row">
            <button id="v140Back" class="secondary-button">Back to Students</button>
            <button id="v140Edit" class="primary-button">Edit Profile</button>
          </div>
        </section>

        <section class="v140-profile-layout">
          <main>
            <section class="panel">
              <h3>Academic Screening</h3>
              <div class="v140-profile-score-grid">
                ${profileScore("DIBELS Composite", record.dibelsComposite)}
                ${profileScore("ORF Words Correct", record.orfWords)}
                ${profileScore("ORF Accuracy", record.orfAccuracy ? `${record.orfAccuracy}%` : "")}
                ${profileScore("Maze", record.maze)}
                ${profileScore("NWF CLS", record.nwfCls)}
                ${profileScore("Reading Level", record.readingLevel)}
                ${profileScore("Math Benchmark", record.mathBenchmark ? `${record.mathBenchmark}%` : "")}
              </div>
            </section>

            <section class="panel">
              <h3>Strengths, Needs & Goals</h3>
              ${textSection("Strengths", record.strengths)}
              ${textSection("Instructional Needs", record.needs)}
              ${textSection("Current Goals", record.goals)}
              ${textSection("Teacher Notes", record.teacherNotes)}
            </section>

            <section class="panel">
              <div class="v140-section-heading">
                <h3>Family / Caregiver Contact Log</h3>
                <button id="v140AddContact" class="secondary-button">Add Contact Note</button>
              </div>
              <div class="v140-contact-list">
                ${studentContacts.length
                  ? studentContacts.map(contactCard).join("")
                  : `<p>No contact notes have been recorded.</p>`
                }
              </div>
            </section>
          </main>

          <aside>
            <section class="panel">
              <h3>Support Profile</h3>
              <div class="v140-profile-flags">
                ${record.supportFlags.length
                  ? record.supportFlags.map(flag => `<span>${esc(flag)}</span>`).join("")
                  : `<em>No support flags</em>`
                }
              </div>
              <dl>
                <div><dt>Reading Group</dt><dd>${esc(record.readingGroup)}</dd></div>
                <div><dt>Intervention Tier</dt><dd>${esc(record.interventionTier)}</dd></div>
                <div><dt>Weekly Minutes</dt><dd>${record.interventionMinutes}</dd></div>
              </dl>
            </section>

            <section class="panel">
              <h3>Accommodations & Supports</h3>
              <ul>
                ${record.accommodations.length
                  ? record.accommodations.map(item => `<li>${esc(item)}</li>`).join("")
                  : `<li>No accommodations entered.</li>`
                }
              </ul>
            </section>

            <section class="panel v140-caution">
              <strong>Teacher review required</strong>
              <p>Grouping suggestions are organizational supports only. Use current assessment evidence, team decisions, and formal plans.</p>
            </section>
          </aside>
        </section>
      </section>
    `;

    $("#v140Back")?.addEventListener("click", renderCenter);
    $("#v140Edit")?.addEventListener("click", () => renderEditor(id));
    $("#v140AddContact")?.addEventListener("click", () => renderContactEditor(id));
  }

  function profileScore(label, value) {
    return `<article><span>${esc(label)}</span><strong>${esc(value || "Not entered")}</strong></article>`;
  }

  function textSection(label, value) {
    return `<article class="v140-text-section"><span>${esc(label)}</span><p>${esc(value || "Not entered")}</p></article>`;
  }

  function contactCard(contact) {
    return `
      <article>
        <div>
          <strong>${esc(contact.method)}</strong>
          <span>${new Date(contact.date).toLocaleString()}</span>
        </div>
        <p>${esc(contact.note)}</p>
      </article>
    `;
  }

  function renderEditor(id = "") {
    const existing = records.find(record => record.id === id);
    const record = existing || {
      id: `student-${Date.now()}`,
      displayName: "",
      studentNumber: "",
      grade: "2",
      readingGroup: "Not Assigned",
      interventionTier: "Not Assigned",
      interventionMinutes: 0,
      supportFlags: [],
      accommodations: [],
      dibelsComposite: "",
      orfWords: "",
      orfAccuracy: "",
      maze: "",
      nwfCls: "",
      readingLevel: "",
      mathBenchmark: "",
      strengths: "",
      needs: "",
      goals: "",
      teacherNotes: "",
      lastUpdated: new Date().toISOString()
    };

    $("#pageHost").innerHTML = `
      <section id="v140StudentEditor">
        <section class="page-header">
          <div>
            <p>LOCAL STUDENT PROFILE</p>
            <h2>${existing ? "Edit" : "Add"} Student</h2>
            <span>Use local browser storage only. Do not add student records to GitHub files.</span>
          </div>
          <button id="v140Cancel" class="secondary-button">Cancel</button>
        </section>

        <section class="panel v140-editor">
          <div class="v140-editor-grid">
            <label class="wide">
              <span>Student Display Name</span>
              <input id="v140Name" value="${esc(record.displayName)}" placeholder="Use the level of identification appropriate for your device">
            </label>

            <label>
              <span>Student Number / Local ID</span>
              <input id="v140Number" value="${esc(record.studentNumber)}">
            </label>

            <label>
              <span>Grade</span>
              <input id="v140Grade" value="${esc(record.grade)}">
            </label>

            ${editorSelect("v140ReadingGroup", "Reading Group", config.studentDataCenterV140.readingGroups, record.readingGroup)}
            ${editorSelect("v140TierEdit", "Intervention Tier", config.studentDataCenterV140.interventionTiers, record.interventionTier)}

            <label>
              <span>Intervention Minutes per Week</span>
              <input id="v140Minutes" type="number" min="0" value="${record.interventionMinutes}">
            </label>

            <label>
              <span>DIBELS Composite</span>
              <input id="v140Dibels" value="${esc(record.dibelsComposite)}">
            </label>

            <label>
              <span>ORF Words Correct</span>
              <input id="v140OrfWords" type="number" min="0" value="${esc(record.orfWords)}">
            </label>

            <label>
              <span>ORF Accuracy %</span>
              <input id="v140OrfAccuracy" type="number" min="0" max="100" value="${esc(record.orfAccuracy)}">
            </label>

            <label>
              <span>Maze Score</span>
              <input id="v140Maze" value="${esc(record.maze)}">
            </label>

            <label>
              <span>NWF CLS</span>
              <input id="v140Nwf" value="${esc(record.nwfCls)}">
            </label>

            <label>
              <span>Reading Level</span>
              <input id="v140ReadingLevel" value="${esc(record.readingLevel)}">
            </label>

            <label>
              <span>Math Benchmark %</span>
              <input id="v140Math" type="number" min="0" max="100" value="${esc(record.mathBenchmark)}">
            </label>

            <fieldset class="wide">
              <legend>Support Flags</legend>
              <div class="v140-check-grid">
                ${config.studentDataCenterV140.supportFlags.map(flag => `
                  <label>
                    <input type="checkbox" data-v140-flag="${esc(flag)}" ${record.supportFlags.includes(flag) ? "checked" : ""}>
                    <span>${esc(flag)}</span>
                  </label>
                `).join("")}
              </div>
            </fieldset>

            <fieldset class="wide">
              <legend>Accommodations & Supports</legend>
              <div class="v140-check-grid">
                ${config.studentDataCenterV140.defaultAccommodations.map(item => `
                  <label>
                    <input type="checkbox" data-v140-accommodation="${esc(item)}" ${record.accommodations.includes(item) ? "checked" : ""}>
                    <span>${esc(item)}</span>
                  </label>
                `).join("")}
              </div>
            </fieldset>

            ${textArea("v140Strengths", "Strengths", record.strengths)}
            ${textArea("v140Needs", "Instructional Needs", record.needs)}
            ${textArea("v140Goals", "Current Goals", record.goals)}
            ${textArea("v140TeacherNotes", "Teacher Notes", record.teacherNotes)}
          </div>

          <div class="button-row">
            <button id="v140SaveStudent" class="primary-button">Save Student Profile</button>
            ${existing ? `<button id="v140DeleteStudent" class="danger-button">Delete Student Profile</button>` : ""}
          </div>
        </section>
      </section>
    `;

    $("#v140Cancel")?.addEventListener("click", existing ? () => renderProfile(id) : renderCenter);
    $("#v140SaveStudent")?.addEventListener("click", () => saveEditor(record, existing));
    $("#v140DeleteStudent")?.addEventListener("click", () => {
      if (!confirm(`Delete the local profile for "${record.displayName}"?`)) return;
      records = records.filter(item => item.id !== record.id);
      contacts = contacts.filter(contact => contact.studentId !== record.id);
      saveRecords();
      saveContacts();
      renderCenter();
      toast("Student profile deleted.");
    });
  }

  function editorSelect(id, label, options, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <select id="${id}">
          ${options.map(option => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function textArea(id, label, value) {
    return `
      <label class="wide">
        <span>${esc(label)}</span>
        <textarea id="${id}">${esc(value)}</textarea>
      </label>
    `;
  }

  function saveEditor(record, existing) {
    const supportFlags = $$("[data-v140-flag]:checked").map(input => input.dataset.v140Flag);
    const accommodations = $$("[data-v140-accommodation]:checked")
      .map(input => input.dataset.v140Accommodation);

    Object.assign(record, {
      displayName: $("#v140Name").value.trim() || "Unnamed Student",
      studentNumber: $("#v140Number").value.trim(),
      grade: $("#v140Grade").value.trim() || "2",
      readingGroup: $("#v140ReadingGroup").value,
      interventionTier: $("#v140TierEdit").value,
      interventionMinutes: Math.max(0, Number($("#v140Minutes").value) || 0),
      supportFlags,
      accommodations,
      dibelsComposite: $("#v140Dibels").value.trim(),
      orfWords: $("#v140OrfWords").value.trim(),
      orfAccuracy: $("#v140OrfAccuracy").value.trim(),
      maze: $("#v140Maze").value.trim(),
      nwfCls: $("#v140Nwf").value.trim(),
      readingLevel: $("#v140ReadingLevel").value.trim(),
      mathBenchmark: $("#v140Math").value.trim(),
      strengths: $("#v140Strengths").value.trim(),
      needs: $("#v140Needs").value.trim(),
      goals: $("#v140Goals").value.trim(),
      teacherNotes: $("#v140TeacherNotes").value.trim(),
      lastUpdated: new Date().toISOString()
    });

    if (!existing) records.unshift(record);
    saveRecords();
    renderProfile(record.id);
    toast("Student profile saved.");
  }

  function renderContactEditor(studentId) {
    const record = records.find(item => item.id === studentId);
    if (!record) return renderCenter();

    $("#pageHost").innerHTML = `
      <section id="v140ContactEditor">
        <section class="page-header">
          <div>
            <p>CONTACT NOTE</p>
            <h2>${esc(record.displayName)}</h2>
            <span>Record a brief professional family or caregiver contact note.</span>
          </div>
          <button id="v140ContactCancel" class="secondary-button">Cancel</button>
        </section>

        <section class="panel v140-contact-editor">
          <label>
            <span>Contact Method</span>
            <select id="v140ContactMethod">
              <option>ClassDojo</option>
              <option>Phone</option>
              <option>Email</option>
              <option>Conference</option>
              <option>In Person</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            <span>Note</span>
            <textarea id="v140ContactNote" placeholder="Document the purpose, key information, and follow-up."></textarea>
          </label>

          <button id="v140SaveContact" class="primary-button">Save Contact Note</button>
        </section>
      </section>
    `;

    $("#v140ContactCancel")?.addEventListener("click", () => renderProfile(studentId));
    $("#v140SaveContact")?.addEventListener("click", () => {
      const note = $("#v140ContactNote").value.trim();
      if (!note) return toast("Enter a contact note first.");

      contacts.unshift({
        id: `contact-${Date.now()}`,
        studentId,
        method: $("#v140ContactMethod").value,
        note,
        date: new Date().toISOString()
      });

      saveContacts();
      renderProfile(studentId);
      toast("Contact note saved.");
    });
  }

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: "14.0",
      records,
      contacts
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teacher-os-student-backup-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Local student-data backup created.");
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v140DashboardCard")) return;

    const stats = statistics();
    const card = document.createElement("section");
    card.id = "v140DashboardCard";
    card.className = "v140-dashboard-card";
    card.innerHTML = `
      <div>
        <p>STUDENT DATA CENTER</p>
        <h3>${stats.total} profiles • ${stats.intervention} receiving intervention</h3>
        <span>${stats.intensive} student(s) currently assigned to intensive reading support.</span>
      </div>
      <button>Open Student Data</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "students";
    dashboard.prepend(card);
  }

  function injectGroupingCard() {
    const host = $("#pageHost");
    if (!host || $("#v140GroupingCard")) return;

    const groups = config.studentDataCenterV140.readingGroups
      .filter(group => group !== "Not Assigned")
      .map(group => ({
        group,
        count: records.filter(record => record.readingGroup === group).length
      }));

    const card = document.createElement("section");
    card.id = "v140GroupingCard";
    card.className = "panel v140-connected-card";
    card.innerHTML = `
      <div>
        <p>STUDENT DATA CONNECTION</p>
        <h3>Current Reading Groups</h3>
        <span>${["Red — Far Below Level","Yellow — Below Level","Green — Benchmark","Blue — Above Level"]
          .map(groupName => {
            const item = groups.find(group => group.group === groupName);
            return `${groupName.split(" — ")[0]}: ${item?.count || 0}`;
          }).join(" • ")}</span>
      </div>
      <button>Open Student Profiles</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "students";
    host.prepend(card);
  }

  function injectInterventionCard() {
    const host = $("#pageHost");
    if (!host || $("#v140InterventionCard")) return;

    const count = records.filter(record =>
      ["Tier 2", "Tier 3"].includes(record.interventionTier)
    ).length;

    const card = document.createElement("section");
    card.id = "v140InterventionCard";
    card.className = "panel v140-connected-card";
    card.innerHTML = `
      <div>
        <p>STUDENT DATA CONNECTION</p>
        <h3>${count} Tier 2 or Tier 3 profile(s)</h3>
        <span>Review minutes, goals, and current screening evidence in Student Data.</span>
      </div>
      <button>Open Student Data</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "students";
    host.prepend(card);
  }

  function injectHealthPanel() {
    const host = $("#pageHost");
    if (!host || $("#v140HealthPanel")) return;

    const stats = statistics();
    const panel = document.createElement("section");
    panel.id = "v140HealthPanel";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 14.0 Student Data Health</h3>
      <div class="health-grid">
        ${healthItem("Local storage", true, `${stats.total} profiles`)}
        ${healthItem("Direct route renderer", typeof window.THH_RENDER_STUDENT_DATA === "function", "Connected")}
        ${healthItem("Reading groups", records.some(record => record.readingGroup !== "Not Assigned"), "Teacher assigned")}
        ${healthItem("Local backup", true, "Export available")}
      </div>
      <button class="secondary-button">Open Student Data</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "students";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `
      <article class="${ok ? "ready" : "missing"}">
        <strong>${ok ? "✓" : "!"}</strong>
        <div><span>${esc(title)}</span><small>${esc(detail)}</small></div>
      </article>
    `;
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

/* Version 14.1 — Intervention & Small-Group Center */
(() => {
"use strict";
const STUDENTS="thh-v140:student-records",PLANS="thh-v141:group-plans",NOTES="thh-v141:progress-notes",UI="thh-v141:ui";
let cfg,students=[],plans={},notes=[],ui={group:"Red — Far Below Level",day:"Monday",tier:"All"};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const FALLBACK_GROUP_CONFIG = {
  readingGroups: [
    {
      name: "Red — Far Below Level",
      frequency: "Daily",
      minutes: 15,
      focus: "Intensive decoding, phoneme-grapheme mapping, accuracy, and controlled-text reading"
    },
    {
      name: "Yellow — Below Level",
      frequency: "3–4 times weekly",
      minutes: 12,
      focus: "Strategic decoding, accuracy, word recognition, phrasing, and supported fluency"
    },
    {
      name: "Green — Benchmark",
      frequency: "1–2 times weekly",
      minutes: 10,
      focus: "Benchmark-level fluency, comprehension, vocabulary, and grade-level application"
    },
    {
      name: "Blue — Above Level",
      frequency: "1–2 times weekly",
      minutes: 10,
      focus: "Above-level prosody, deeper comprehension, vocabulary, author’s craft, and extension"
    }
  ],
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  measures: [
    "ORF Words Correct",
    "ORF Accuracy %",
    "Maze",
    "NWF CLS",
    "Phonics Skill Check",
    "Teacher Observation"
  ]
};

async function start(){
  // Register route renderers immediately so the central router never waits
  // on data repair or network loading.
  window.THH_RENDER_SMALL_GROUPS = renderGroups;
  window.THH_RENDER_INTERVENTION = renderIntervention;

  try {
    cfg = await fetch("tos-data.json", { cache: "no-store" }).then(response => {
      if (!response.ok) throw new Error(`Configuration request failed: ${response.status}`);
      return response.json();
    });
  } catch (error) {
    console.warn("Version 14.1 is using fallback group configuration.", error);
    cfg = {};
  }

  cfg.interventionCenterV141 = validateGroupConfig(
    cfg.interventionCenterV141 || FALLBACK_GROUP_CONFIG
  );

  try {
    const value = JSON.parse(localStorage.getItem(STUDENTS) || "[]");
    students = Array.isArray(value) ? value : [];
  } catch {
    students = [];
  }

  try {
    const value = JSON.parse(localStorage.getItem(PLANS) || "{}");
    plans = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    plans = {};
  }

  try {
    const value = JSON.parse(localStorage.getItem(NOTES) || "[]");
    notes = Array.isArray(value) ? value : [];
  } catch {
    notes = [];
  }

  try {
    const value = JSON.parse(localStorage.getItem(UI) || "{}");
    ui = value && typeof value === "object" && !Array.isArray(value)
      ? { ...ui, ...value }
      : ui;
  } catch {}

  repairUiSelection();
  ensure();
  window.addEventListener("hashchange", route);
  route();
}

function validateGroupConfig(value) {
  const groups = Array.isArray(value?.readingGroups)
    ? value.readingGroups.filter(group => group && typeof group.name === "string")
    : [];

  const days = Array.isArray(value?.days) && value.days.length
    ? value.days
    : FALLBACK_GROUP_CONFIG.days;

  const measures = Array.isArray(value?.measures) && value.measures.length
    ? value.measures
    : FALLBACK_GROUP_CONFIG.measures;

  return {
    readingGroups: groups.length ? groups : FALLBACK_GROUP_CONFIG.readingGroups,
    days,
    measures
  };
}

function repairUiSelection() {
  const names = cfg.interventionCenterV141.readingGroups.map(group => group.name);

  if (!names.includes(ui.group)) {
    ui.group = names[0] || "Red — Far Below Level";
  }

  if (!cfg.interventionCenterV141.days.includes(ui.day)) {
    ui.day = cfg.interventionCenterV141.days[0] || "Monday";
  }
}

function save(){
  localStorage.setItem(PLANS, JSON.stringify(plans));
  localStorage.setItem(NOTES, JSON.stringify(notes));
  localStorage.setItem(UI, JSON.stringify(ui));
}

function ensure(){
  const validPlans = {};

  cfg.interventionCenterV141.readingGroups.forEach(group => {
    cfg.interventionCenterV141.days.forEach(day => {
      const key = `${group.name}|${day}`;
      const existing = plans[key];

      validPlans[key] = existing && typeof existing === "object" && !Array.isArray(existing)
        ? {
            objective: String(existing.objective || ""),
            skill: String(existing.skill || group.focus || ""),
            text: String(existing.text || ""),
            materials: String(existing.materials || ""),
            assessment: String(existing.assessment || "Teacher observation and brief progress evidence"),
            notes: String(existing.notes || ""),
            complete: Boolean(existing.complete)
          }
        : {
            objective: "",
            skill: group.focus || "",
            text: "",
            materials: "",
            assessment: "Teacher observation and brief progress evidence",
            notes: "",
            complete: false
          };
    });
  });

  plans = validPlans;
  save();
}
function route(){const r=location.hash.slice(1)||"dashboard";if(r==="small-groups")setTimeout(renderGroups);if(r==="intervention")setTimeout(renderIntervention);if(r==="dashboard")setTimeout(dash);if(r==="health")setTimeout(health)}
function members(group){return students.filter(s=>s.readingGroup===group)}
function renderGroups(){
  if(location.hash.slice(1)!=="small-groups") return;

  if (!cfg?.interventionCenterV141) {
    cfg = { interventionCenterV141: FALLBACK_GROUP_CONFIG };
  }

  cfg.interventionCenterV141 = validateGroupConfig(cfg.interventionCenterV141);
  repairUiSelection();
  ensure();

  const g = cfg.interventionCenterV141.readingGroups.find(x => x.name === ui.group)
    || cfg.interventionCenterV141.readingGroups[0];
  const p = plans[`${g.name}|${ui.day}`];
  const m = members(g.name);
  ui.group = g.name;
$("#pageHost").innerHTML=`<section id="v141Groups"><section class="page-header"><div><p>VERSION 14.1</p><h2>Small-Group & MOWR Center</h2><span>Teacher-table plans connected to Student Data reading groups.</span></div><div class="button-row"><button id="students" class="secondary-button">Open Student Data</button><button id="print" class="secondary-button">Print Group Plan</button></div></section><section class="v141-group-tabs">${cfg.interventionCenterV141.readingGroups.map(x=>`<button data-group="${esc(x.name)}" class="${x.name===ui.group?"active":""}"><strong>${esc(x.name)}</strong><span>${members(x.name).length} students • ${esc(x.frequency)}</span></button>`).join("")}</section><section class="v141-layout"><aside class="panel v141-group-roster-panel"><h3>${esc(ui.group)}</h3><p>${esc(g.focus)}</p><div class="v141-roster">${m.length?m.map(s=>`<article><strong>${esc(s.displayName)}</strong><span>${esc(s.interventionTier||"Not Assigned")}</span></article>`).join(""):"<p>No students assigned.</p>"}</div></aside><main class="panel v141-planning-panel"><div class="v141-heading"><div><p>${esc(ui.day)}</p><h2>${esc(ui.group)}</h2><span>${g.minutes} recommended minutes</span></div><label class="v141-day-control"><span>Planning Day</span><select id="day">${cfg.interventionCenterV141.days.map(d=>`<option ${d===ui.day?"selected":""}>${d}</option>`).join("")}</select></label></div><div class="v141-plan-grid">${area("objective","Objective",p.objective)}${area("skill","Skill / Focus",p.skill)}${area("text","Text / Decodable",p.text)}${area("materials","Materials",p.materials)}${area("assessment","Progress Evidence",p.assessment)}${area("notes","Teacher Notes",p.notes)}</div><div class="button-row"><button id="save" class="primary-button">Save Group Plan</button><button id="complete" class="${p.complete?"secondary-button":"primary-button"}">${p.complete?"Mark Incomplete":"Mark Complete"}</button><button id="progress" class="secondary-button">Add Progress Note</button></div></main><aside class="panel v141-weekly-status-panel"><h3>Weekly Status</h3><div class="v141-status">${cfg.interventionCenterV141.days.map(d=>{const x=plans[`${ui.group}|${d}`];return`<article class="${x.complete?"complete":""}"><strong>${d}</strong><span>${x.complete?"Complete":"Pending"}</span></article>`}).join("")}</div></aside></section></section>`;wireGroups()}
function area(id,label,val){return`<label><span>${label}</span><textarea id="${id}">${esc(val)}</textarea></label>`}
function wireGroups(){$("#students").onclick=()=>location.hash="students";$("#print").onclick=()=>print();$$("[data-group]").forEach(b=>b.onclick=()=>{ui.group=b.dataset.group;save();renderGroups()});$("#day").onchange=e=>{ui.day=e.target.value;save();renderGroups()};$("#save").onclick=()=>savePlan(true);$("#complete").onclick=()=>{savePlan(false);const p=plans[`${ui.group}|${ui.day}`];p.complete=!p.complete;save();renderGroups()};$("#progress").onclick=()=>renderProgress()}
function savePlan(show){const p=plans[`${ui.group}|${ui.day}`];["objective","skill","text","materials","assessment","notes"].forEach(k=>p[k]=$(`#${k}`).value.trim());save();if(show)toast("Group plan saved.")}
function interventionList(){return students.filter(s=>(s.supportFlags||[]).includes("Intervention")||["Tier 2","Tier 3","Monitoring Only"].includes(s.interventionTier)).filter(s=>ui.tier==="All"||s.interventionTier===ui.tier)}
function renderIntervention(){if(location.hash.slice(1)!=="intervention")return;const list=interventionList(),t2=students.filter(s=>s.interventionTier==="Tier 2").length,t3=students.filter(s=>s.interventionTier==="Tier 3").length;$("#pageHost").innerHTML=`<section id="v141Intervention"><section class="page-header"><div><p>VERSION 14.1</p><h2>Intervention Center</h2><span>Review tiers, minutes, goals, and progress evidence.</span></div><button id="openStudents" class="secondary-button">Open Student Data</button></section><section class="v141-stats">${stat("Profiles",list.length)}${stat("Tier 2",t2)}${stat("Tier 3",t3)}${stat("Progress Notes",notes.length)}</section><section class="panel v141-toolbar"><label><span>Tier Filter</span><select id="tier">${["All","Tier 2","Tier 3","Monitoring Only"].map(x=>`<option ${x===ui.tier?"selected":""}>${x}</option>`).join("")}</select></label><button id="addProgress" class="primary-button">Add Progress Note</button></section><section class="v141-cards">${list.length?list.map(card).join(""):'<div class="empty-state"><strong>No matching intervention profiles.</strong></div>'}</section><section class="panel"><h3>Recent Progress Notes</h3><div class="v141-notes">${notes.length?notes.slice(0,12).map(noteCard).join(""):"<p>No notes recorded.</p>"}</div></section></section>`;$("#openStudents").onclick=()=>location.hash="students";$("#tier").onchange=e=>{ui.tier=e.target.value;save();renderIntervention()};$("#addProgress").onclick=()=>renderProgress();$$("[data-progress]").forEach(b=>b.onclick=()=>renderProgress(b.dataset.progress))}
function stat(a,b){return`<article><span>${a}</span><strong>${b}</strong></article>`}
function card(s){return`<article class="panel v141-card"><div><span>${esc(s.interventionTier)}</span><h3>${esc(s.displayName)}</h3><small>${esc(s.readingGroup)}</small></div><dl><div><dt>Minutes</dt><dd>${s.interventionMinutes||0}</dd></div><div><dt>ORF</dt><dd>${esc(s.orfWords||"—")}</dd></div><div><dt>Accuracy</dt><dd>${s.orfAccuracy?esc(s.orfAccuracy)+"%":"—"}</dd></div></dl><p><strong>Goal:</strong> ${esc(s.goals||"Not entered")}</p><p><strong>Need:</strong> ${esc(s.needs||"Not entered")}</p><button data-progress="${s.id}" class="primary-button">Add Progress Note</button></article>`}
function noteCard(n){const s=students.find(x=>x.id===n.studentId);return`<article><div><strong>${esc(s?.displayName||"Student")}</strong><span>${new Date(n.date).toLocaleDateString()}</span></div><small>${esc(n.measure)}: ${esc(n.result||"Observation")}</small><p>${esc(n.note)}</p></article>`}
function renderProgress(id=""){const eligible=students.filter(s=>s.readingGroup!=="Not Assigned"||["Tier 2","Tier 3","Monitoring Only"].includes(s.interventionTier));$("#pageHost").innerHTML=`<section><section class="page-header"><div><p>PROGRESS EVIDENCE</p><h2>Add Progress Note</h2></div><button id="cancel" class="secondary-button">Cancel</button></section><section class="panel v141-progress-editor"><label><span>Student</span><select id="student"><option value="">Select</option>${eligible.map(s=>`<option value="${s.id}" ${s.id===id?"selected":""}>${esc(s.displayName)}</option>`).join("")}</select></label><label><span>Measure</span><select id="measure">${cfg.interventionCenterV141.measures.map(x=>`<option>${esc(x)}</option>`).join("")}</select></label><label><span>Result</span><input id="result"></label><label class="wide"><span>Observation / Next Step</span><textarea id="note"></textarea></label><button id="saveProgress" class="primary-button">Save Progress Note</button></section></section>`;$("#cancel").onclick=()=>location.hash="intervention";$("#saveProgress").onclick=()=>{const sid=$("#student").value,note=$("#note").value.trim();if(!sid)return toast("Select a student.");if(!note)return toast("Enter an observation.");notes.unshift({id:`progress-${Date.now()}`,studentId:sid,measure:$("#measure").value,result:$("#result").value.trim(),note,date:new Date().toISOString()});save();location.hash="intervention";toast("Progress note saved.")}}
function dash(){const d=$("#v72Dashboard");if(!d||$("#v141Dash"))return;const c=document.createElement("section");c.id="v141Dash";c.className="v141-dashboard-card";c.innerHTML=`<div><p>SMALL GROUPS & INTERVENTION</p><h3>${students.length} profiles • ${interventionList().length} intervention profiles</h3><span>Teacher-table plans and progress evidence are connected.</span></div><div class="button-row"><button id="groups">Small Groups</button><button id="int">Intervention</button></div>`;$("#groups",c).onclick=()=>location.hash="small-groups";$("#int",c).onclick=()=>location.hash="intervention";d.prepend(c)}
function health(){const h=$("#pageHost");if(!h||$("#v141Health"))return;const p=document.createElement("section");p.id="v141Health";p.className="panel";p.innerHTML=`<h3>Version 14.1 Grouping Health</h3><div class="health-grid"><article class="ready"><strong>✓</strong><div><span>Small Groups</span><small>Connected</small></div></article><article class="ready"><strong>✓</strong><div><span>Intervention</span><small>Connected</small></div></article><article class="${students.some(s=>s.readingGroup!=="Not Assigned")?"ready":"missing"}"><strong>!</strong><div><span>Assigned Students</span><small>${students.filter(s=>s.readingGroup!=="Not Assigned").length}</small></div></article></div>`;h.appendChild(p)}
function toast(m){const t=$("#toast");if(!t)return;t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();

/* =====================================================================
   Version 14.2 — Assessments & Progress Monitoring Center
   ===================================================================== */
(() => {
  "use strict";

  const STUDENT_STORE = "thh-v140:student-records";
  const PROGRESS_STORE = "thh-v141:progress-notes";
  const ASSESSMENT_STORE = "thh-v142:assessment-records";
  const UI_STORE = "thh-v142:assessment-ui";

  let config = null;
  let students = [];
  let interventionNotes = [];
  let records = [];
  let ui = {
    student: "All",
    type: "All",
    window: "All",
    status: "All",
    search: "",
    selectedId: ""
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    // Register immediately so Assessments cannot remain on a loading page.
    window.THH_RENDER_ASSESSMENTS = renderCenter;

    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`Configuration request failed: ${response.status}`);
        return response.json();
      });
    } catch (error) {
      console.warn("Assessments is using fallback configuration.", error);
      config = {
        assessmentCenterV142: {
          assessmentTypes: [
            "DIBELS Composite","ORF Words Correct","ORF Accuracy %","Maze","NWF CLS",
            "Open Court Reading","Open Court Phonics","Vocabulary","Spelling",
            "Grammar / GUM","Eureka Math²","Science","Social Studies",
            "Writing Rubric","Teacher Observation","Other"
          ],
          windows: [
            "Beginning of Year","Quarter 1","Quarter 2","Middle of Year",
            "Quarter 3","Quarter 4","End of Year","Weekly","Custom"
          ],
          statusOptions: ["Not Started","Scheduled","In Progress","Complete","Needs Make-Up"],
          scoreFormats: ["Number","Percentage","Words Correct","Rubric 1–4","Level / Letter","Pass / Needs Support"]
        }
      };
    }

    try {
      students = JSON.parse(localStorage.getItem(STUDENT_STORE) || "[]");
      if (!Array.isArray(students)) students = [];
    } catch {
      students = [];
    }

    try {
      interventionNotes = JSON.parse(localStorage.getItem(PROGRESS_STORE) || "[]");
      if (!Array.isArray(interventionNotes)) interventionNotes = [];
    } catch {
      interventionNotes = [];
    }

    try {
      records = JSON.parse(localStorage.getItem(ASSESSMENT_STORE) || "[]");
      if (!Array.isArray(records)) records = [];
    } catch {
      records = [];
    }

    try {
      ui = { ...ui, ...JSON.parse(localStorage.getItem(UI_STORE) || "{}") };
    } catch {}

    normalize();
    waitForShell();
  }

  function normalize() {
    records = records.map((record, index) => ({
      id: record.id || `assessment-${Date.now()}-${index}`,
      studentId: record.studentId || "",
      title: record.title || "Untitled Assessment",
      type: record.type || "Teacher Observation",
      window: record.window || "Weekly",
      date: record.date || new Date().toISOString().slice(0,10),
      score: record.score ?? "",
      scoreFormat: record.scoreFormat || "Number",
      benchmark: record.benchmark ?? "",
      status: record.status || "Not Started",
      notes: record.notes || "",
      source: record.source || "Manual Entry",
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString()
    }));
    saveRecords();
  }

  function saveRecords() {
    localStorage.setItem(ASSESSMENT_STORE, JSON.stringify(records));
  }

  function saveUi() {
    localStorage.setItem(UI_STORE, JSON.stringify(ui));
  }

  function waitForShell() {
    if (!$("#pageHost") || !$("#mainNav")) {
      setTimeout(waitForShell, 100);
      return;
    }

    window.addEventListener("hashchange", route);
    route();
  }

  function route() {
    const current = location.hash.replace("#", "") || "dashboard";
    if (current === "assessments") setTimeout(renderCenter, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "students") setTimeout(injectStudentDataCard, 0);
    if (current === "intervention") setTimeout(injectInterventionCard, 0);
    if (current === "health") setTimeout(injectHealthPanel, 0);
  }

  function studentName(id) {
    return students.find(student => student.id === id)?.displayName || "Unknown Student";
  }

  function filteredRecords() {
    const query = ui.search.trim().toLowerCase();

    return records.filter(record => {
      const studentMatch = ui.student === "All" || record.studentId === ui.student;
      const typeMatch = ui.type === "All" || record.type === ui.type;
      const windowMatch = ui.window === "All" || record.window === ui.window;
      const statusMatch = ui.status === "All" || record.status === ui.status;
      const searchMatch = !query || [
        record.title,
        record.type,
        record.window,
        record.notes,
        studentName(record.studentId)
      ].join(" ").toLowerCase().includes(query);

      return studentMatch && typeMatch && windowMatch && statusMatch && searchMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function statistics() {
    const complete = records.filter(record => record.status === "Complete").length;
    const missing = records.filter(record =>
      ["Not Started", "Needs Make-Up"].includes(record.status)
    ).length;
    const scoredStudents = new Set(
      records.filter(record => record.status === "Complete" && record.studentId)
        .map(record => record.studentId)
    ).size;

    return {
      total: records.length,
      complete,
      missing,
      scoredStudents,
      interventionEvidence: interventionNotes.length
    };
  }

  function renderCenter() {
    if (location.hash.replace("#", "") !== "assessments") return;

    const host = $("#pageHost");
    if (!host) return;

    const stats = statistics();
    const filtered = filteredRecords();

    host.innerHTML = `
      <section id="v142AssessmentCenter">
        <section class="page-header">
          <div>
            <p>VERSION 14.2</p>
            <h2>Assessments & Progress Monitoring</h2>
            <span>Track screening windows, weekly checks, benchmark scores, and intervention evidence.</span>
          </div>
          <div class="button-row">
            <button id="v142Add" class="primary-button">Add Assessment Record</button>
            <button id="v142ImportStudents" class="secondary-button">Build Screening Checklist</button>
            <button id="v142Export" class="secondary-button">Export Local Backup</button>
          </div>
        </section>

        <section class="v142-stat-grid">
          ${statCard("Assessment Records", stats.total, "All saved records")}
          ${statCard("Complete", stats.complete, "Scored or documented")}
          ${statCard("Missing / Make-Up", stats.missing, "Needs attention")}
          ${statCard("Students with Scores", stats.scoredStudents, `${students.length} local profiles`)}
          ${statCard("Intervention Notes", stats.interventionEvidence, "Connected progress evidence")}
        </section>

        <section class="panel v142-toolbar">
          <div class="v142-filter-grid">
            ${studentSelect("v142StudentFilter", "Student", ui.student, true)}
            ${selectControl("v142TypeFilter", "Assessment Type", ["All", ...config.assessmentCenterV142.assessmentTypes], ui.type)}
            ${selectControl("v142WindowFilter", "Window", ["All", ...config.assessmentCenterV142.windows], ui.window)}
            ${selectControl("v142StatusFilter", "Status", ["All", ...config.assessmentCenterV142.statusOptions], ui.status)}
            <label>
              <span>Search</span>
              <input id="v142Search" value="${esc(ui.search)}" placeholder="Search assessment, student, or notes">
            </label>
          </div>
        </section>

        <section class="v142-summary-strip">
          ${windowSummary("Beginning of Year")}
          ${windowSummary("Middle of Year")}
          ${windowSummary("End of Year")}
          ${windowSummary("Weekly")}
        </section>

        <section class="v142-record-grid">
          ${filtered.length
            ? filtered.map(recordCard).join("")
            : `<div class="empty-state">
                <strong>No matching assessment records.</strong>
                <p>Add a record or build a screening checklist from Student Data.</p>
              </div>`
          }
        </section>
      </section>
    `;

    wireCenter();
  }

  function statCard(label, value, detail) {
    return `<article><span>${esc(label)}</span><strong>${value}</strong><small>${esc(detail)}</small></article>`;
  }

  function studentSelect(id, label, value, includeAll = false) {
    return `
      <label>
        <span>${esc(label)}</span>
        <select id="${id}">
          ${includeAll ? `<option value="All" ${value === "All" ? "selected" : ""}>All</option>` : ""}
          ${students.map(student => `
            <option value="${esc(student.id)}" ${student.id === value ? "selected" : ""}>
              ${esc(student.displayName)}
            </option>
          `).join("")}
        </select>
      </label>
    `;
  }

  function selectControl(id, label, options, value) {
    return `
      <label>
        <span>${esc(label)}</span>
        <select id="${id}">
          ${options.map(option => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function windowSummary(windowName) {
    const windowRecords = records.filter(record => record.window === windowName);
    const complete = windowRecords.filter(record => record.status === "Complete").length;
    const percentage = windowRecords.length
      ? Math.round((complete / windowRecords.length) * 100)
      : 0;

    return `
      <article>
        <span>${esc(windowName)}</span>
        <strong>${complete}/${windowRecords.length} complete</strong>
        <div><b style="width:${percentage}%"></b></div>
      </article>
    `;
  }

  function recordCard(record) {
    const comparison = compareScore(record);

    return `
      <article class="panel v142-record-card ${record.status === "Complete" ? "complete" : ""} ${record.status === "Needs Make-Up" ? "makeup" : ""}">
        <div class="v142-record-heading">
          <div>
            <span>${esc(record.window)} • ${esc(record.type)}</span>
            <h3>${esc(record.title)}</h3>
            <small>${esc(studentName(record.studentId))} • ${formatDate(record.date)}</small>
          </div>
          <b>${record.status === "Complete" ? "✓" : record.status === "Needs Make-Up" ? "!" : "•"}</b>
        </div>

        <div class="v142-score-panel">
          <article>
            <span>SCORE</span>
            <strong>${esc(formatScore(record))}</strong>
          </article>
          <article>
            <span>BENCHMARK</span>
            <strong>${esc(record.benchmark || "Not entered")}</strong>
          </article>
          <article class="${comparison.className}">
            <span>REVIEW</span>
            <strong>${esc(comparison.label)}</strong>
          </article>
        </div>

        <dl>
          <div><dt>Status</dt><dd>${esc(record.status)}</dd></div>
          <div><dt>Source</dt><dd>${esc(record.source)}</dd></div>
          <div><dt>Updated</dt><dd>${formatDate(record.updatedAt.slice(0,10))}</dd></div>
        </dl>

        ${record.notes ? `<p>${esc(record.notes)}</p>` : ""}

        <div class="v142-card-actions">
          <button data-v142-edit="${esc(record.id)}" class="primary-button">Open Record</button>
          <button data-v142-complete="${esc(record.id)}" class="secondary-button">
            ${record.status === "Complete" ? "Reopen" : "Mark Complete"}
          </button>
        </div>
      </article>
    `;
  }

  function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatScore(record) {
    if (record.score === "" || record.score === null || record.score === undefined) return "Not entered";
    if (record.scoreFormat === "Percentage") return `${record.score}%`;
    if (record.scoreFormat === "Rubric 1–4") return `${record.score}/4`;
    return String(record.score);
  }

  function compareScore(record) {
    const score = Number(record.score);
    const benchmark = Number(record.benchmark);

    if (record.status !== "Complete") {
      return { label: "Pending", className: "pending" };
    }

    if (!Number.isFinite(score) || !Number.isFinite(benchmark)) {
      return { label: "Teacher review", className: "review" };
    }

    if (score >= benchmark) {
      return { label: "At / above", className: "ready" };
    }

    return { label: "Below benchmark", className: "missing" };
  }

  function wireCenter() {
    $("#v142StudentFilter")?.addEventListener("change", event => {
      ui.student = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v142TypeFilter")?.addEventListener("change", event => {
      ui.type = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v142WindowFilter")?.addEventListener("change", event => {
      ui.window = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v142StatusFilter")?.addEventListener("change", event => {
      ui.status = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v142Search")?.addEventListener("change", event => {
      ui.search = event.target.value;
      saveUi();
      renderCenter();
    });

    $("#v142Add")?.addEventListener("click", () => renderEditor());
    $("#v142ImportStudents")?.addEventListener("click", buildScreeningChecklist);
    $("#v142Export")?.addEventListener("click", exportBackup);

    $$("[data-v142-edit]").forEach(button => {
      button.addEventListener("click", () => renderEditor(button.dataset.v142Edit));
    });

    $$("[data-v142-complete]").forEach(button => {
      button.addEventListener("click", () => {
        const record = records.find(item => item.id === button.dataset.v142Complete);
        if (!record) return;
        record.status = record.status === "Complete" ? "In Progress" : "Complete";
        record.updatedAt = new Date().toISOString();
        saveRecords();
        renderCenter();
      });
    });
  }

  function renderEditor(id = "") {
    const existing = records.find(record => record.id === id);
    const record = existing || {
      id: `assessment-${Date.now()}`,
      studentId: students[0]?.id || "",
      title: "",
      type: "Teacher Observation",
      window: "Weekly",
      date: new Date().toISOString().slice(0,10),
      score: "",
      scoreFormat: "Number",
      benchmark: "",
      status: "Not Started",
      notes: "",
      source: "Manual Entry",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    $("#pageHost").innerHTML = `
      <section id="v142AssessmentEditor">
        <section class="page-header">
          <div>
            <p>ASSESSMENT RECORD</p>
            <h2>${existing ? "Edit" : "Add"} Assessment</h2>
            <span>Record brief assessment evidence for local teacher use.</span>
          </div>
          <button id="v142Cancel" class="secondary-button">Cancel</button>
        </section>

        <section class="panel v142-editor">
          <div class="v142-editor-grid">
            ${studentSelect("v142EditStudent", "Student", record.studentId)}

            <label class="wide">
              <span>Assessment Title</span>
              <input id="v142Title" value="${esc(record.title)}" placeholder="Example: Week 2 Open Court Reading Check">
            </label>

            ${selectControl("v142EditType", "Assessment Type", config.assessmentCenterV142.assessmentTypes, record.type)}
            ${selectControl("v142EditWindow", "Assessment Window", config.assessmentCenterV142.windows, record.window)}
            ${selectControl("v142EditFormat", "Score Format", config.assessmentCenterV142.scoreFormats, record.scoreFormat)}
            ${selectControl("v142EditStatus", "Status", config.assessmentCenterV142.statusOptions, record.status)}

            <label>
              <span>Date</span>
              <input id="v142Date" type="date" value="${esc(record.date)}">
            </label>

            <label>
              <span>Score / Result</span>
              <input id="v142Score" value="${esc(record.score)}">
            </label>

            <label>
              <span>Benchmark / Target</span>
              <input id="v142Benchmark" value="${esc(record.benchmark)}">
            </label>

            <label>
              <span>Source</span>
              <input id="v142Source" value="${esc(record.source)}">
            </label>

            <label class="wide">
              <span>Notes / Instructional Next Step</span>
              <textarea id="v142Notes">${esc(record.notes)}</textarea>
            </label>
          </div>

          <div class="button-row">
            <button id="v142Save" class="primary-button">Save Assessment Record</button>
            ${existing ? `<button id="v142Delete" class="danger-button">Delete Assessment Record</button>` : ""}
          </div>
        </section>
      </section>
    `;

    $("#v142Cancel")?.addEventListener("click", renderCenter);
    $("#v142Save")?.addEventListener("click", () => saveEditor(record, existing));
    $("#v142Delete")?.addEventListener("click", () => {
      if (!confirm(`Delete "${record.title}"?`)) return;
      records = records.filter(item => item.id !== record.id);
      saveRecords();
      renderCenter();
      toast("Assessment record deleted.");
    });
  }

  function saveEditor(record, existing) {
    Object.assign(record, {
      studentId: $("#v142EditStudent").value,
      title: $("#v142Title").value.trim() || "Untitled Assessment",
      type: $("#v142EditType").value,
      window: $("#v142EditWindow").value,
      scoreFormat: $("#v142EditFormat").value,
      status: $("#v142EditStatus").value,
      date: $("#v142Date").value,
      score: $("#v142Score").value.trim(),
      benchmark: $("#v142Benchmark").value.trim(),
      source: $("#v142Source").value.trim() || "Manual Entry",
      notes: $("#v142Notes").value.trim(),
      updatedAt: new Date().toISOString()
    });

    if (!existing) records.unshift(record);
    saveRecords();
    renderCenter();
    toast("Assessment record saved.");
  }

  function buildScreeningChecklist() {
    if (!students.length) {
      toast("Add student profiles before building the checklist.");
      setTimeout(() => location.hash = "students", 700);
      return;
    }

    const windowName = prompt(
      "Enter the screening window:",
      "Beginning of Year"
    );
    if (!windowName) return;

    const types = ["DIBELS Composite", "ORF Words Correct", "ORF Accuracy %", "Maze"];
    const generated = [];

    students.forEach(student => {
      types.forEach(type => {
        const id = `screen-${windowName}-${student.id}-${type}`
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-");

        generated.push({
          id,
          studentId: student.id,
          title: `${windowName} ${type}`,
          type,
          window: windowName,
          date: new Date().toISOString().slice(0,10),
          score: "",
          scoreFormat: type.includes("%") ? "Percentage" : "Number",
          benchmark: "",
          status: "Scheduled",
          notes: "",
          source: "Student Data Screening Checklist",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    });

    const ids = new Set(generated.map(record => record.id));
    records = [
      ...records.filter(record => !ids.has(record.id)),
      ...generated
    ];

    saveRecords();
    renderCenter();
    toast(`${generated.length} screening records created.`);
  }

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: "14.2",
      assessmentRecords: records,
      interventionNotes
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teacher-os-assessment-backup-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Assessment backup created.");
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v142DashboardCard")) return;

    const stats = statistics();
    const card = document.createElement("section");
    card.id = "v142DashboardCard";
    card.className = "v142-dashboard-card";
    card.innerHTML = `
      <div>
        <p>ASSESSMENTS & PROGRESS</p>
        <h3>${stats.complete}/${stats.total} records complete</h3>
        <span>${stats.missing} assessment(s) still need attention.</span>
      </div>
      <button>Open Assessments</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "assessments";
    dashboard.prepend(card);
  }

  function injectStudentDataCard() {
    const center = $("#v140StudentCenter");
    if (!center || $("#v142StudentDataCard")) return;

    const stats = statistics();
    const card = document.createElement("section");
    card.id = "v142StudentDataCard";
    card.className = "v142-connected-card";
    card.innerHTML = `
      <div>
        <p>ASSESSMENT CONNECTION</p>
        <h3>${stats.scoredStudents} student(s) have completed assessment records</h3>
        <span>${stats.missing} record(s) remain incomplete or need make-up.</span>
      </div>
      <button>Open Assessments</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "assessments";
    $(".page-header", center)?.insertAdjacentElement("afterend", card);
  }

  function injectInterventionCard() {
    const center = $("#v141Intervention");
    if (!center || $("#v142InterventionCard")) return;

    const card = document.createElement("section");
    card.id = "v142InterventionCard";
    card.className = "v142-connected-card";
    card.innerHTML = `
      <div>
        <p>ASSESSMENT CONNECTION</p>
        <h3>${interventionNotes.length} intervention progress note(s)</h3>
        <span>Compare progress evidence with screening and weekly assessment records.</span>
      </div>
      <button>Open Assessments</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "assessments";
    $(".page-header", center)?.insertAdjacentElement("afterend", card);
  }

  function injectHealthPanel() {
    const host = $("#pageHost");
    if (!host || $("#v142HealthPanel")) return;

    const stats = statistics();
    const panel = document.createElement("section");
    panel.id = "v142HealthPanel";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 14.2 Assessment Health</h3>
      <div class="health-grid">
        ${healthItem("Direct renderer", typeof window.THH_RENDER_ASSESSMENTS === "function", "Connected")}
        ${healthItem("Student connection", students.length > 0, `${students.length} profiles`)}
        ${healthItem("Assessment records", records.length > 0, `${records.length} records`)}
        ${healthItem("Missing / make-up", stats.missing === 0, `${stats.missing} remaining`)}
      </div>
      <button class="secondary-button">Open Assessments</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "assessments";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `<article class="${ok ? "ready" : "missing"}"><strong>${ok ? "✓" : "!"}</strong><div><span>${esc(title)}</span><small>${esc(detail)}</small></div></article>`;
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


/* =====================================================================
   Version 15.0 — Core Refactor & Stabilization
   ===================================================================== */
(() => {
  "use strict";

  const BUILD = "15.0.0";
  const STATE_KEY = "thh-v150:framework-health";
  const GROUP_MIGRATION_KEY = "thh-v150:group-migration";

  let state = {
    build: BUILD,
    routeChecks: {},
    errors: [],
    migratedGroups: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function boot() {
    try {
      state = { ...state, ...JSON.parse(localStorage.getItem(STATE_KEY) || "{}") };
    } catch {}

    migrateReadingGroups();
    document.documentElement.dataset.build = BUILD;
    document.documentElement.classList.add("v150-stable-framework");

    window.addEventListener("hashchange", verifyRoute);
    window.addEventListener("error", recordError);
    verifyRoute();
  }

  function save() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function migrateReadingGroups() {
    if (localStorage.getItem(GROUP_MIGRATION_KEY) === BUILD) return;

    const studentKey = "thh-v140:student-records";
    const planKey = "thh-v141:group-plans";
    const uiKey = "thh-v141:ui";

    const mapping = {
      "Red — Intensive": "Red — Far Below Level",
      "Yellow — Strategic": "Yellow — Below Level",
      "Green — Extension": "Green — Benchmark",
      "Blue — Developing Fluency": "Blue — Above Level"
    };

    try {
      const students = JSON.parse(localStorage.getItem(studentKey) || "[]");
      if (Array.isArray(students)) {
        students.forEach(student => {
          if (mapping[student.readingGroup]) student.readingGroup = mapping[student.readingGroup];
        });
        localStorage.setItem(studentKey, JSON.stringify(students));
      }
    } catch {}

    try {
      const plans = JSON.parse(localStorage.getItem(planKey) || "{}");
      const migrated = {};

      Object.entries(plans).forEach(([key, value]) => {
        let newKey = key;
        Object.entries(mapping).forEach(([oldGroup, newGroup]) => {
          if (newKey.startsWith(`${oldGroup}|`)) {
            newKey = newKey.replace(oldGroup, newGroup);
          }
        });
        migrated[newKey] = {
          ...value,
          group: mapping[value?.group] || value?.group
        };
      });

      localStorage.setItem(planKey, JSON.stringify(migrated));
    } catch {}

    try {
      const ui = JSON.parse(localStorage.getItem(uiKey) || "{}");
      if (mapping[ui.group]) ui.group = mapping[ui.group];
      if (mapping[ui.selectedGroup]) ui.selectedGroup = mapping[ui.selectedGroup];
      localStorage.setItem(uiKey, JSON.stringify(ui));
    } catch {}

    localStorage.setItem(GROUP_MIGRATION_KEY, BUILD);
    state.migratedGroups = true;
    save();
  }

  function verifyRoute() {
    const route = location.hash.replace("#", "") || "dashboard";
    const expected = {
      teachday: "v120LiveTeaching",
      attachments: "v121Attachments",
      "print-center": "v122PrintCenter",
      students: "v140StudentCenter",
      "small-groups": "v141Groups",
      intervention: "v141Intervention",
      assessments: "v142AssessmentCenter"
    };

    if (!expected[route]) return;

    window.setTimeout(() => {
      const ready = Boolean(document.querySelector(`#${expected[route]}`));
      state.routeChecks[route] = {
        ready,
        checkedAt: new Date().toISOString(),
        expectedElement: expected[route]
      };
      save();

      if (route === "assessments" && !ready &&
          typeof window.THH_RENDER_ASSESSMENTS === "function") {
        window.THH_RENDER_ASSESSMENTS();
      }
    }, 500);
  }

  function recordError(event) {
    state.errors.unshift({
      route: location.hash.replace("#", "") || "dashboard",
      message: event.message || "Unknown runtime error",
      date: new Date().toISOString()
    });
    state.errors = state.errors.slice(0, 25);
    save();
  }

  window.THH_V15_FRAMEWORK_STATE = () => structuredClone(state);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


/* =====================================================================
   Version 15.0.1 — Reading Group Order Repair
   ===================================================================== */
(() => {
  "use strict";

  const ORDER = [
    "Red — Far Below Level",
    "Yellow — Below Level",
    "Green — Benchmark",
    "Blue — Above Level"
  ];

  const SHORT = {
    "Red — Far Below Level": "Red",
    "Yellow — Below Level": "Yellow",
    "Green — Benchmark": "Green",
    "Blue — Above Level": "Blue"
  };

  function records() {
    try {
      const value = JSON.parse(localStorage.getItem("thh-v140:student-records") || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function counts() {
    const list = records();
    return ORDER.map(group => ({
      group,
      label: SHORT[group],
      count: list.filter(student => student.readingGroup === group).length
    }));
  }

  function summaryText() {
    return counts().map(item => `${item.label}: ${item.count}`).join(" • ");
  }

  function repairVisibleSummaries() {
    const route = location.hash.replace("#", "") || "dashboard";

    const candidates = [
      "#v140GroupingCard span",
      "#v140StudentDataCard span",
      ".v140-connected-card span",
      "[data-reading-group-summary]"
    ];

    candidates.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (/Red:.*Yellow:.*(Blue|Green):/.test(element.textContent || "")) {
          element.textContent = summaryText();
        }
      });
    });

    if (route === "small-groups") {
      const tabs = [...document.querySelectorAll("[data-group], [data-v141-group]")];
      const orderIndex = label => {
        const text = label.textContent || "";
        return ORDER.findIndex(group => text.includes(SHORT[group]));
      };

      tabs
        .sort((a, b) => orderIndex(a) - orderIndex(b))
        .forEach(tab => tab.parentElement?.appendChild(tab));
    }
  }

  function migrateLegacyAssignments() {
    const key = "thh-v140:student-records";
    const mapping = {
      "Red — Intensive": "Red — Far Below Level",
      "Yellow — Strategic": "Yellow — Below Level",
      "Green — Extension": "Green — Benchmark",
      "Blue — Developing Fluency": "Blue — Above Level"
    };

    try {
      const list = records();
      let changed = false;

      list.forEach(student => {
        if (mapping[student.readingGroup]) {
          student.readingGroup = mapping[student.readingGroup];
          changed = true;
        }
      });

      if (changed) localStorage.setItem(key, JSON.stringify(list));
    } catch {}
  }

  function start() {
    migrateLegacyAssignments();
    window.addEventListener("hashchange", () => setTimeout(repairVisibleSummaries, 150));

    new MutationObserver(() => {
      setTimeout(repairVisibleSummaries, 0);
    }).observe(document.body, { childList: true, subtree: true });

    repairVisibleSummaries();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();


/* Version 15.0.2 — Small Groups Startup Diagnostics */
(() => {
  "use strict";

  const KEY = "thh-v1502:small-groups-health";

  function save(value) {
    localStorage.setItem(KEY, JSON.stringify(value));
  }

  function check() {
    const state = {
      checkedAt: new Date().toISOString(),
      smallGroupsRenderer: typeof window.THH_RENDER_SMALL_GROUPS === "function",
      interventionRenderer: typeof window.THH_RENDER_INTERVENTION === "function",
      route: location.hash.replace("#", "") || "dashboard"
    };

    save(state);

    if (state.route === "small-groups" && state.smallGroupsRenderer &&
        !document.querySelector("#v141Groups")) {
      window.THH_RENDER_SMALL_GROUPS();
    }

    if (state.route === "intervention" && state.interventionRenderer &&
        !document.querySelector("#v141Intervention")) {
      window.THH_RENDER_INTERVENTION();
    }
  }

  window.addEventListener("hashchange", () => setTimeout(check, 250));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(check, 250));
  } else {
    setTimeout(check, 250);
  }
})();


/* =====================================================================
   Version 15.0.3 — Direct Communication Renderer
   ===================================================================== */
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function renderCommunicationDirect() {
    if (location.hash.replace("#", "") !== "communication") return;

    const host = $("#pageHost");
    if (!host) return;

    host.innerHTML = `
      <section id="v1503Communication">
        <section class="page-header">
          <div>
            <p>COMMUNICATION</p>
            <h2>Family Communication Studio</h2>
            <span>Create a positive update, intervention note, home-practice message, or classroom announcement.</span>
          </div>
        </section>

        <section class="panel v1503-communication-form">
          <label>
            <span>Message Type</span>
            <select id="v1503MessageType">
              <option>Positive Progress</option>
              <option>Intervention Update</option>
              <option>Home Practice</option>
              <option>Classroom Announcement</option>
              <option>Attendance Follow-Up</option>
              <option>Conference Follow-Up</option>
            </select>
          </label>

          <label>
            <span>Student or Topic</span>
            <input id="v1503MessageSubject" placeholder="Student name or classroom topic">
          </label>

          <label class="wide">
            <span>Message</span>
            <textarea id="v1503MessageBody" placeholder="Write or generate a family message..."></textarea>
          </label>

          <div class="button-row wide">
            <button id="v1503GenerateMessage" class="secondary-button">Generate Starter</button>
            <button id="v1503CopyMessage" class="primary-button">Copy Message</button>
            <button id="v1503ClearMessage" class="secondary-button">Clear</button>
          </div>
        </section>
      </section>
    `;

    $("#v1503GenerateMessage").onclick = generateStarter;
    $("#v1503CopyMessage").onclick = copyMessage;
    $("#v1503ClearMessage").onclick = () => {
      $("#v1503MessageSubject").value = "";
      $("#v1503MessageBody").value = "";
    };
  }

  function generateStarter() {
    const subject = $("#v1503MessageSubject").value.trim() || "your child";
    const type = $("#v1503MessageType").value;

    const starters = {
      "Positive Progress": `Hello,\n\nI wanted to share a positive update about ${subject}. I have noticed strong effort and growth during our recent classroom work. I am proud of the progress being made and will continue encouraging this success.\n\nWarmly,\nMrs. Parrish`,
      "Intervention Update": `Hello,\n\nI wanted to share an update about the support ${subject} is receiving. We are currently focusing on a specific instructional goal through small-group practice and frequent feedback. I will continue monitoring progress and share important updates.\n\nWarmly,\nMrs. Parrish`,
      "Home Practice": `Hello,\n\nThis week, ${subject} is practicing an important classroom skill. A short, positive practice session at home can help reinforce the learning. Thank you for partnering with us.\n\nWarmly,\nMrs. Parrish`,
      "Classroom Announcement": `Hello families,\n\nI am writing to share an important classroom update about ${subject}. Please review the information and contact me with any questions.\n\nWarmly,\nMrs. Parrish`,
      "Attendance Follow-Up": `Hello,\n\nI am checking in regarding ${subject}'s recent attendance. Consistent attendance helps students participate in daily instruction and classroom routines. Please let me know how I can support a successful return to class.\n\nWarmly,\nMrs. Parrish`,
      "Conference Follow-Up": `Hello,\n\nThank you for meeting with me to discuss ${subject}. I appreciate our partnership. I will continue supporting the goals we discussed and will share updates as we move forward.\n\nWarmly,\nMrs. Parrish`
    };

    $("#v1503MessageBody").value = starters[type] || "";
  }

  async function copyMessage() {
    const message = $("#v1503MessageBody").value;
    if (!message.trim()) return notify("Write or generate a message first.");

    try {
      await navigator.clipboard.writeText(message);
      notify("Message copied.");
    } catch {
      $("#v1503MessageBody").select();
      document.execCommand("copy");
      notify("Message copied.");
    }
  }

  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  window.THH_RENDER_COMMUNICATION = renderCommunicationDirect;

  window.addEventListener("hashchange", () => {
    if (location.hash.replace("#", "") === "communication") {
      setTimeout(renderCommunicationDirect, 0);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (location.hash.replace("#", "") === "communication") renderCommunicationDirect();
    });
  } else if (location.hash.replace("#", "") === "communication") {
    renderCommunicationDirect();
  }
})();


/* Version 15.0.3 — Students & Data Route Watchdog */
(() => {
  "use strict";

  const ROUTES = {
    intervention: ["THH_RENDER_INTERVENTION", "v141Intervention"],
    assessments: ["THH_RENDER_ASSESSMENTS", "v142AssessmentCenter"],
    students: ["THH_RENDER_STUDENT_DATA", "v140StudentCenter"],
    communication: ["THH_RENDER_COMMUNICATION", "v1503Communication"]
  };

  function recover() {
    const route = location.hash.replace("#", "") || "dashboard";
    const entry = ROUTES[route];
    if (!entry) return;

    const [rendererName, elementId] = entry;
    if (document.getElementById(elementId)) return;

    const renderer = window[rendererName];
    if (typeof renderer === "function") {
      try {
        renderer();
      } catch (error) {
        console.error(`Route recovery failed for ${route}.`, error);
      }
    }
  }

  window.addEventListener("hashchange", () => {
    setTimeout(recover, 150);
    setTimeout(recover, 600);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(recover, 150);
      setTimeout(recover, 600);
    });
  } else {
    setTimeout(recover, 150);
  }
})();


/* =====================================================================
   Version 16.0 — Teacher Intelligence: Build My Week
   ===================================================================== */
(() => {
  "use strict";

  const INTELLIGENCE_STORE = "thh-v100:intelligence-engine";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENTS_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const LIVE_STORE = "thh-v90:teach-day";
  const GROUP_PLAN_STORE = "thh-v141:group-plans";
  const RUN_STORE = "thh-v160:build-my-week";

  let config = null;
  let state = {
    selectedWeek: "2026-08-03",
    runs: {},
    lastRun: "",
    status: {}
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
  const GROUPS = [
    "Red — Far Below Level",
    "Yellow — Below Level",
    "Green — Benchmark",
    "Blue — Above Level"
  ];

  async function start() {
    window.THH_RENDER_TEACHER_INTELLIGENCE = renderCommandCenter;

    try {
      config = await fetch("tos-data.json", { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`Configuration failed: ${response.status}`);
        return response.json();
      });
    } catch (error) {
      console.warn("Teacher Intelligence is using fallback configuration.", error);
      config = {
        teacherIntelligenceV160: {
          curriculumStartDate: "2026-08-03",
          launchWeekStart: "2026-07-27",
          launchWeekEnd: "2026-07-31",
          defaultCopies: 33
        }
      };
    }

    try {
      state = { ...state, ...JSON.parse(localStorage.getItem(RUN_STORE) || "{}") };
    } catch {}

    if (state.selectedWeek < "2026-08-03") state.selectedWeek = "2026-08-03";
    save();
    window.addEventListener("hashchange", route);
    route();
  }

  function save() {
    localStorage.setItem(RUN_STORE, JSON.stringify(state));
  }

  function intelligenceState() {
    try {
      return JSON.parse(localStorage.getItem(INTELLIGENCE_STORE) || "{}");
    } catch {
      return {};
    }
  }

  function availableWeeks() {
    const engine = intelligenceState();
    const weeks = Object.values(engine.weeks || {})
      .filter(week => week?.weekOf)
      .sort((a, b) => a.weekOf.localeCompare(b.weekOf));

    const deduped = new Map();

    weeks.forEach(week => {
      const date = week.weekOf;
      if (!deduped.has(date)) deduped.set(date, week);
    });

    if (!deduped.has("2026-08-03")) {
      deduped.set("2026-08-03", {
        weekOf: "2026-08-03",
        title: "Curriculum Week 1",
        curriculumWeek: 1,
        pillar: "Heart",
        curriculumLocked: false,
        openCourtUnit: 1,
        openCourtLesson: 1,
        eurekaModule: 1,
        eurekaStartingLesson: 1
      });
    }

    return [...deduped.values()]
      .filter(week => week.weekOf >= "2026-08-03")
      .sort((a, b) => a.weekOf.localeCompare(b.weekOf))
      .map((week, index) => ({
        ...week,
        curriculumWeek: index + 1,
        title: `Curriculum Week ${index + 1}`
      }));
  }

  function selectedWeek() {
    return availableWeeks().find(week => week.weekOf === state.selectedWeek)
      || availableWeeks()[0];
  }

  function route() {
    const current = location.hash.replace("#", "") || "dashboard";
    if (current === "intelligence-engine") setTimeout(renderCommandCenter, 0);
    if (current === "dashboard") setTimeout(injectDashboardCard, 0);
    if (current === "health") setTimeout(injectHealthCard, 0);
  }

  function renderCommandCenter() {
    if (location.hash.replace("#", "") !== "intelligence-engine") return;

    const host = $("#pageHost");
    if (!host) return;

    const week = selectedWeek();
    if (!week) {
      host.innerHTML = `<div class="empty-state"><strong>No curriculum weeks are available.</strong></div>`;
      return;
    }

    const run = state.runs[week.weekOf] || {};
    const completion = workflowCompletion(run);

    host.innerHTML = `
      <section id="v160TeacherIntelligence">
        <section class="page-header">
          <div>
            <p>VERSION 16.0</p>
            <h2>Teacher Intelligence — Build My Week</h2>
            <span>Select a curriculum week and prepare the connected teaching workflow.</span>
          </div>
          <div class="button-row">
            <button id="v160OpenWorkflow" class="secondary-button">Open Workflow Hub</button>
            <button id="v160RunAll" class="primary-button">Build My Week</button>
          </div>
        </section>

        <section class="v160-week-selector panel">
          <label>
            <span>Curriculum Week</span>
            <select id="v160WeekSelect">
              ${availableWeeks().map(item => `
                <option value="${esc(item.weekOf)}" ${item.weekOf === week.weekOf ? "selected" : ""}>
                  ${formatDate(item.weekOf)} — Curriculum Week ${item.curriculumWeek}
                </option>
              `).join("")}
            </select>
          </label>
          <div>
            <span>SELECTED WEEK</span>
            <strong>Curriculum Week ${week.curriculumWeek}</strong>
            <small>Week of ${formatDate(week.weekOf)} • ${esc(week.pillar || "Heart")}</small>
          </div>
          <div>
            <span>WORKFLOW STATUS</span>
            <strong>${completion}% complete</strong>
            <small>${Object.values(run.steps || {}).filter(Boolean).length}/6 steps prepared</small>
          </div>
        </section>

        <section class="v160-progress">
          <div><b style="width:${completion}%"></b></div>
          <strong>${completion}%</strong>
        </section>

        <section class="v160-workflow-grid">
          ${workflowCard(1, "Select School Week", true, "The selected curriculum week is ready.", "v160SelectStep")}
          ${workflowCard(2, "Build Weekly Planning", run.steps?.planning, "Create Monday–Friday planning records.", "v160BuildPlanning")}
          ${workflowCard(3, "Create Attachment Checklist", run.steps?.attachments, "Prepare weekly curriculum resource records.", "v160BuildAttachments")}
          ${workflowCard(4, "Prepare Print Queue", run.steps?.printing, "Send printable resources to the weekly queue.", "v160BuildPrint")}
          ${workflowCard(5, "Prepare Live Teaching", run.steps?.liveTeaching, "Send Monday into the live teaching workspace.", "v160BuildLive")}
          ${workflowCard(6, "Prepare Small Groups", run.steps?.smallGroups, "Create group-plan records for all four reading groups.", "v160BuildGroups")}
        </section>

        <section class="v160-summary-grid">
          <article class="panel">
            <span>OPEN COURT</span>
            <h3>Unit ${week.openCourtUnit || 1}, Lesson ${week.openCourtLesson || week.curriculumWeek}</h3>
            <p>${esc(openCourtTitle(week))}</p>
          </article>
          <article class="panel">
            <span>EUREKA MATH²</span>
            <h3>Module ${week.eurekaModule || 1}</h3>
            <p>Starting Lesson ${week.eurekaStartingLesson || week.curriculumWeek}</p>
          </article>
          <article class="panel">
            <span>WEEKLY OUTPUTS</span>
            <h3>${outputCount(week.weekOf)} connected records</h3>
            <p>Planning, attachments, printing, teaching, and groups.</p>
          </article>
        </section>

        <section class="panel v160-actions">
          <h3>Open Connected Modules</h3>
          <div class="button-row">
            <button data-route-go="lesson-plans" class="secondary-button">Weekly Planning</button>
            <button data-route-go="attachments" class="secondary-button">Lesson Attachments</button>
            <button data-route-go="print-center" class="secondary-button">Print Center</button>
            <button data-route-go="teachday" class="secondary-button">Live Teaching</button>
            <button data-route-go="small-groups" class="secondary-button">Small Groups</button>
          </div>
        </section>
      </section>
    `;

    wire();
  }

  function workflowCard(number, title, complete, description, buttonId) {
    return `
      <article class="panel v160-workflow-card ${complete ? "complete" : ""}">
        <b>${number}</b>
        <span>${complete ? "COMPLETE" : "READY"}</span>
        <h3>${esc(title)}</h3>
        <p>${esc(description)}</p>
        <button id="${buttonId}" class="${complete ? "secondary-button" : "primary-button"}">
          ${complete ? "Run Again" : "Run Step"}
        </button>
      </article>
    `;
  }

  function wire() {
    $("#v160WeekSelect").onchange = event => {
      state.selectedWeek = event.target.value;
      save();
      renderCommandCenter();
    };

    $("#v160OpenWorkflow").onclick = () => location.hash = "workflow-hub";
    $("#v160RunAll").onclick = buildAll;
    $("#v160SelectStep").onclick = () => toast("Selected week confirmed.");
    $("#v160BuildPlanning").onclick = buildPlanning;
    $("#v160BuildAttachments").onclick = buildAttachments;
    $("#v160BuildPrint").onclick = buildPrintQueue;
    $("#v160BuildLive").onclick = buildLiveTeaching;
    $("#v160BuildGroups").onclick = buildSmallGroups;

    $$("[data-route-go]").forEach(button => {
      button.onclick = () => location.hash = button.dataset.routeGo;
    });
  }

  function currentRun() {
    const week = selectedWeek();
    if (!state.runs[week.weekOf]) {
      state.runs[week.weekOf] = {
        weekOf: week.weekOf,
        steps: {},
        updatedAt: ""
      };
    }
    return state.runs[week.weekOf];
  }

  function markStep(step) {
    const run = currentRun();
    run.steps[step] = true;
    run.updatedAt = new Date().toISOString();
    state.lastRun = run.updatedAt;
    save();
  }

  function workflowCompletion(run) {
    const completed = Object.values(run.steps || {}).filter(Boolean).length + 1;
    return Math.round((completed / 6) * 100);
  }

  function buildAll() {
    buildPlanning(false);
    buildAttachments(false);
    buildPrintQueue(false);
    buildLiveTeaching(false);
    buildSmallGroups(false);
    toast("Connected weekly workflow prepared.");
    renderCommandCenter();
  }

  function buildPlanning(renderAfter = true) {
    const week = selectedWeek();
    const plan = {
      version: "16.0",
      title: `Curriculum Week ${week.curriculumWeek}`,
      weekOf: week.weekOf,
      pillar: week.pillar || "Heart",
      days: {}
    };

    DAYS.forEach((day, index) => {
      plan.days[day] = {
        day,
        complete: false,
        focus: `${day} — Curriculum Week ${week.curriculumWeek}`,
        openCourtLesson: `Unit ${week.openCourtUnit || 1}, Lesson ${week.openCourtLesson || week.curriculumWeek}`,
        reading: openCourtTitle(week),
        phonics: "Open Court phonics sequence",
        vocabulary: "Open Court weekly vocabulary",
        heggerty: "Daily phonemic awareness",
        mowr: "UFLI, teacher table, fluency, vocabulary, and writing centers",
        writing: "Writing Building the Foundation / Open Court GUM",
        math: `Eureka Math² Module ${week.eurekaModule || 1}, Lesson ${(week.eurekaStartingLesson || week.curriculumWeek) + index}`,
        math2: "Math recap, fluency, or exit-ticket review",
        science: "Select the current Arizona science lesson and resource",
        socialStudies: "Select the aligned Arizona Social Studies / iCivics lesson",
        materials: "",
        assessment: day === "Friday" ? "Weekly assessments and teacher review" : "Teacher observation and exit evidence",
        differentiation: "Use student profiles, accommodations, EL supports, and current reading groups."
      };
    });

    localStorage.setItem(WEEK_STORE, JSON.stringify(plan));
    markStep("planning");
    if (renderAfter) {
      toast("Weekly Planning prepared.");
      renderCommandCenter();
    }
  }

  function buildAttachments(renderAfter = true) {
    const week = selectedWeek();
    const categories = [
      ["Open Court","Skills Practice","Open Court Skills Practice"],
      ["Open Court","Assessment","Open Court Weekly Assessment"],
      ["Phonics","Student Page","Phonics / Spelling Practice"],
      ["Vocabulary","Student Page","Vocabulary Practice"],
      ["Writing / GUM","Student Page","Writing / GUM Page"],
      ["Eureka Math²","Student Page","Eureka Math² Student Materials"],
      ["Eureka Math²","Exit Ticket","Eureka Math² Exit Ticket"],
      ["Science","Student Page","Science Student Page"],
      ["Social Studies","Student Page","Social Studies Student Page"]
    ];

    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(ATTACHMENTS_STORE) || "[]");
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }

    const generated = [];
    DAYS.forEach(day => {
      categories.forEach(([category, type, title], index) => {
        generated.push({
          id: `v160-${week.weekOf}-${day}-${category}-${index}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
          title,
          day,
          category,
          type,
          lesson: `Curriculum Week ${week.curriculumWeek}`,
          url: "",
          fileName: "",
          notes: "Add the authorized school-provided resource.",
          print: true,
          copies: config.teacherIntelligenceV160?.defaultCopies || 33,
          status: "Missing Link",
          teacherOnly: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    });

    const ids = new Set(generated.map(item => item.id));
    existing = [...existing.filter(item => !ids.has(item.id)), ...generated];
    localStorage.setItem(ATTACHMENTS_STORE, JSON.stringify(existing));
    markStep("attachments");

    if (renderAfter) {
      toast("Attachment checklist prepared.");
      renderCommandCenter();
    }
  }

  function buildPrintQueue(renderAfter = true) {
    let attachments = [];
    let queue = [];

    try {
      attachments = JSON.parse(localStorage.getItem(ATTACHMENTS_STORE) || "[]");
      if (!Array.isArray(attachments)) attachments = [];
    } catch {}

    try {
      queue = JSON.parse(localStorage.getItem(PRINT_STORE) || "[]");
      if (!Array.isArray(queue)) queue = [];
    } catch {}

    const week = selectedWeek();
    const weekAttachments = attachments.filter(item =>
      item.id?.includes(week.weekOf) && item.print
    );

    weekAttachments.forEach(item => {
      const record = {
        id: `print-${item.id}`,
        source: "Teacher Intelligence 16.0",
        day: item.day,
        title: item.title,
        category: item.category,
        section: item.teacherOnly ? "Teacher Materials" : "Student Copies",
        copies: item.teacherOnly ? 1 : item.copies,
        notes: item.notes,
        url: item.url || item.fileName || "",
        complete: false,
        missingSource: !(item.url || item.fileName),
        teacherOnly: Boolean(item.teacherOnly),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const index = queue.findIndex(existing => existing.id === record.id);
      if (index >= 0) queue[index] = { ...record, complete: queue[index].complete };
      else queue.push(record);
    });

    localStorage.setItem(PRINT_STORE, JSON.stringify(queue));
    markStep("printing");

    if (renderAfter) {
      toast("Print queue prepared.");
      renderCommandCenter();
    }
  }

  function buildLiveTeaching(renderAfter = true) {
    const week = selectedWeek();
    localStorage.setItem(LIVE_STORE, JSON.stringify({
      day: "Monday",
      dayType: "Full Day",
      weekOf: week.weekOf,
      title: `Curriculum Week ${week.curriculumWeek}`,
      preparedAt: new Date().toISOString()
    }));
    markStep("liveTeaching");

    if (renderAfter) {
      toast("Monday prepared for Live Teaching.");
      renderCommandCenter();
    }
  }

  function buildSmallGroups(renderAfter = true) {
    let plans = {};
    try {
      plans = JSON.parse(localStorage.getItem(GROUP_PLAN_STORE) || "{}");
      if (!plans || typeof plans !== "object" || Array.isArray(plans)) plans = {};
    } catch {
      plans = {};
    }

    GROUPS.forEach(group => {
      DAYS.forEach(day => {
        const key = `${group}|${day}`;
        plans[key] = {
          ...(plans[key] || {}),
          group,
          day,
          objective: plans[key]?.objective || "",
          skill: plans[key]?.skill || groupFocus(group),
          text: plans[key]?.text || "",
          materials: plans[key]?.materials || "",
          assessment: plans[key]?.assessment || "Teacher observation and brief progress evidence",
          notes: plans[key]?.notes || "",
          complete: Boolean(plans[key]?.complete),
          updatedAt: new Date().toISOString()
        };
      });
    });

    localStorage.setItem(GROUP_PLAN_STORE, JSON.stringify(plans));
    markStep("smallGroups");

    if (renderAfter) {
      toast("Small-group plans prepared.");
      renderCommandCenter();
    }
  }

  function groupFocus(group) {
    if (group.startsWith("Red")) return "Intensive decoding, accuracy, and controlled-text reading";
    if (group.startsWith("Yellow")) return "Strategic decoding, word recognition, and supported fluency";
    if (group.startsWith("Green")) return "Benchmark fluency, comprehension, and grade-level application";
    return "Above-level comprehension, prosody, vocabulary, and extension";
  }

  function outputCount(weekOf) {
    let total = 0;
    try {
      const plan = JSON.parse(localStorage.getItem(WEEK_STORE) || "{}");
      if (plan.weekOf === weekOf) total += Object.keys(plan.days || {}).length;
    } catch {}

    try {
      const attachments = JSON.parse(localStorage.getItem(ATTACHMENTS_STORE) || "[]");
      total += attachments.filter(item => item.id?.includes(weekOf)).length;
    } catch {}

    return total;
  }

  function openCourtTitle(week) {
    if (week.weekOf === "2026-08-03") return "The Mice Who Lived in a Shoe";
    return week.openCourtTitle || "Select the current Open Court weekly story";
  }

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function injectDashboardCard() {
    const dashboard = $("#v72Dashboard");
    if (!dashboard || $("#v160DashboardCard")) return;

    const week = selectedWeek();
    const card = document.createElement("section");
    card.id = "v160DashboardCard";
    card.className = "v160-dashboard-card";
    card.innerHTML = `
      <div>
        <p>TEACHER INTELLIGENCE</p>
        <h3>Build Curriculum Week ${week?.curriculumWeek || 1}</h3>
        <span>Prepare planning, attachments, printing, teaching, and groups.</span>
      </div>
      <button>Open Build My Week</button>
    `;
    card.querySelector("button").onclick = () => location.hash = "intelligence-engine";
    dashboard.prepend(card);
  }

  function injectHealthCard() {
    const host = $("#pageHost");
    if (!host || $("#v160HealthCard")) return;

    const panel = document.createElement("section");
    panel.id = "v160HealthCard";
    panel.className = "panel";
    panel.innerHTML = `
      <h3>Version 16.0 Teacher Intelligence Health</h3>
      <div class="health-grid">
        ${healthItem("Direct renderer", typeof window.THH_RENDER_TEACHER_INTELLIGENCE === "function", "Connected")}
        ${healthItem("Curriculum Week 1", availableWeeks()[0]?.weekOf === "2026-08-03", "August 3, 2026")}
        ${healthItem("Connected modules", true, "Planning, attachments, print, live teaching, groups")}
        ${healthItem("Reading group order", true, "Red, Yellow, Green, Blue")}
      </div>
      <button class="secondary-button">Open Teacher Intelligence</button>
    `;
    panel.querySelector("button").onclick = () => location.hash = "intelligence-engine";
    host.appendChild(panel);
  }

  function healthItem(title, ok, detail) {
    return `<article class="${ok ? "ready" : "missing"}"><strong>${ok ? "✓" : "!"}</strong><div><span>${esc(title)}</span><small>${esc(detail)}</small></div></article>`;
  }

  function toast(message) {
    const element = $("#toast");
    if (!element) return;
    element.textContent = message;
    element.classList.add("show");
    setTimeout(() => element.classList.remove("show"), 1900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
