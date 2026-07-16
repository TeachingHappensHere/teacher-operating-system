
(() => {
  "use strict";

  const ROUTE = "intelligence-engine";
  const STORE = "thh-v165:teacher-intelligence";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const GROUP_STORE = "thh-v141:group-plans";
  const STUDENT_STORE = "thh-v140:student-records";
  const ASSESSMENT_STORE = "thh-v142:assessment-records";
  const LIVE_STORE = "thh-v90:teach-day";
  const AFTERNOON_STORE = "thh-v83:afternoon-studios";

  const SCHOOL = {
    launchStart: "2026-07-27",
    launchEnd: "2026-07-31",
    coreStart: "2026-08-03"
  };

  const SCHEDULE = [
    ["7:45","8:10","Breakfast","dashboard"],
    ["8:10","8:20","Morning Work","lesson-plans"],
    ["8:20","9:15","MOWR","small-groups"],
    ["9:15","9:25","Heggerty","resources"],
    ["9:25","9:45","Phonics","open-court"],
    ["9:45","9:55","Vocabulary","open-court"],
    ["9:55","10:45","Reading / Open Court","open-court"],
    ["10:45","11:10","Lunch & Recess","dashboard"],
    ["11:10","11:40","Writing","afternoon-studios"],
    ["11:40","12:40","Eureka Math²","eureka-math"],
    ["12:40","1:15","Workout","dashboard"],
    ["1:15","1:20","Recess","dashboard"],
    ["1:20","1:40","Math 2","eureka-math"],
    ["1:40","2:15","Science","afternoon-studios"],
    ["2:15","2:55","Social Studies","afternoon-studios"],
    ["2:55","3:00","Pack-up","dashboard"],
    ["3:00","3:30","Dismissal","dashboard"]
  ];

  const CHECKLIST = [
    ["attendance","Take attendance / verify breakfast count"],
    ["materials","Confirm today's lesson materials"],
    ["printing","Collect pages from the Print Center"],
    ["groups","Review today's MOWR groups"],
    ["communication","Check ClassDojo and important messages"],
    ["dismissal","Review dismissal changes"]
  ];

  let state = {
    selectedDate: new Date().toISOString().slice(0,10),
    checklist: {},
    notes: ""
  };

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

  function load() {
    state = { ...state, ...read(STORE, {}) };
    if (!state.selectedDate) state.selectedDate = new Date().toISOString().slice(0,10);
    if (!state.checklist || typeof state.checklist !== "object") state.checklist = {};
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function route() {
    return location.hash.replace("#","") || "dashboard";
  }

  function dateAtNoon(value) {
    return new Date(`${value}T12:00:00`);
  }

  function dateLabel(value, long = false) {
    return dateAtNoon(value).toLocaleDateString("en-US", long
      ? { weekday:"long", month:"long", day:"numeric", year:"numeric" }
      : { weekday:"short", month:"short", day:"numeric" });
  }

  function dayName(value = state.selectedDate) {
    return dateAtNoon(value).toLocaleDateString("en-US", { weekday:"long" });
  }

  function mondayFor(value) {
    const date = dateAtNoon(value);
    const day = date.getDay();
    const delta = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + delta);
    return date.toISOString().slice(0,10);
  }

  function schoolPhase() {
    const value = state.selectedDate;
    if (value < SCHOOL.launchStart) {
      return {
        type: "preparation",
        label: "Summer Preparation",
        message: `Classroom Launch begins ${dateLabel(SCHOOL.launchStart)}.`,
        route: "classroom-launch"
      };
    }
    if (value >= SCHOOL.launchStart && value <= SCHOOL.launchEnd) {
      return {
        type: "launch",
        label: "Classroom Launch Week",
        message: "Focus on rules, routines, expectations, belonging, and classroom procedures.",
        route: "classroom-launch"
      };
    }
    return {
      type: "curriculum",
      label: "Core Instruction",
      message: "Core curriculum is active. Open Court Unit 1, Lesson 1 begins August 3.",
      route: "curriculum-week"
    };
  }

  function toMinutes(value) {
    let [hour, minute] = value.split(":").map(Number);
    if (hour >= 1 && hour <= 3) hour += 12;
    return hour * 60 + minute;
  }

  function instructionalBlock() {
    const selectedIsToday = state.selectedDate === new Date().toISOString().slice(0,10);
    if (!selectedIsToday) {
      return { current: null, next: SCHEDULE[0], status: "planned" };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentIndex = SCHEDULE.findIndex(([start,end]) =>
      currentMinutes >= toMinutes(start) && currentMinutes < toMinutes(end)
    );

    if (currentIndex >= 0) {
      return {
        current: SCHEDULE[currentIndex],
        next: SCHEDULE[currentIndex + 1] || null,
        status: "active"
      };
    }

    const next = SCHEDULE.find(([start]) => currentMinutes < toMinutes(start));
    return { current: null, next: next || null, status: next ? "before" : "complete" };
  }

  function weeklyPlan() {
    const raw = read(WEEK_STORE, {});
    const day = dayName();

    if (raw.days && raw.days[day]) return raw.days[day];
    if (raw[day]) return raw[day];

    const monday = mondayFor(state.selectedDate);
    if (raw[monday]?.days?.[day]) return raw[monday].days[day];
    if (raw.weeks?.[monday]?.days?.[day]) return raw.weeks[monday].days[day];

    return {};
  }

  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function attachmentStatus() {
    const rows = normalizeList(read(ATTACHMENT_STORE, []));
    const selectedDay = dayName();
    const relevant = rows.filter(item =>
      !item.day || item.day === selectedDay || item.date === state.selectedDate
    );
    const missing = relevant.filter(item =>
      item.status === "Missing Link" ||
      item.missingSource ||
      (!(item.url || item.fileName) && item.print)
    );
    return { total: relevant.length, missing: missing.length };
  }

  function printStatus() {
    const rows = normalizeList(read(PRINT_STORE, []));
    const selectedDay = dayName();
    const relevant = rows.filter(item =>
      !item.day || item.day === selectedDay || item.date === state.selectedDate
    );
    return {
      total: relevant.length,
      pending: relevant.filter(item => !item.complete).length
    };
  }

  function assessmentStatus() {
    const rows = normalizeList(read(ASSESSMENT_STORE, []));
    const selectedDay = dayName();
    const relevant = rows.filter(item =>
      item.day === selectedDay ||
      item.date === state.selectedDate ||
      ["Scheduled","Not Started","Needs Make-Up"].includes(item.status)
    );
    return {
      total: relevant.length,
      attention: relevant.filter(item =>
        ["Scheduled","Not Started","Needs Make-Up"].includes(item.status)
      ).length
    };
  }

  function studentGroups() {
    const students = normalizeList(read(STUDENT_STORE, []));
    const aliases = {
      Red: ["Red","Red — Far Below Level"],
      Yellow: ["Yellow","Yellow — Below Level"],
      Green: ["Green","Green — Benchmark"],
      Blue: ["Blue","Blue — Above Level"]
    };

    return Object.entries(aliases).map(([color, names]) => ({
      color,
      count: students.filter(student => {
        const group = student.readingGroup || student.group || "";
        return names.some(name => group.startsWith(name));
      }).length
    }));
  }

  function groupPlanStatus() {
    const plans = read(GROUP_STORE, {});
    const selectedDay = dayName();
    const groups = ["Red","Yellow","Green","Blue"];
    return groups.map(color => {
      const ready = Object.keys(plans || {}).some(key =>
        key.startsWith(`${color} —`) && key.endsWith(`|${selectedDay}`)
      );
      return { color, ready };
    });
  }

  function lessonData() {
    const plan = weeklyPlan();
    return [
      {
        label: "ELA / Open Court",
        key: "reading",
        route: "open-court",
        title: plan.reading || plan.ela || plan.openCourt || "Choose today's Open Court lesson",
        objective: plan.readingObjective || plan.elaObjective || ""
      },
      {
        label: "Math / Eureka Math²",
        key: "math",
        route: "eureka-math",
        title: plan.math || plan.eureka || "Choose today's Eureka Math² lesson",
        objective: plan.mathObjective || ""
      },
      {
        label: "Science",
        key: "science",
        route: "afternoon-studios",
        title: plan.science || "Choose today's science lesson and workbook pages",
        objective: plan.scienceObjective || "",
        studio: "science"
      },
      {
        label: "Writing / Social Studies",
        key: "afternoon",
        route: "afternoon-studios",
        title: plan.afternoon || plan.writing || plan.socialStudies || "Choose today's writing or social studies lesson",
        objective: plan.afternoonObjective || plan.writingObjective || ""
      }
    ];
  }

  function readiness() {
    const plan = weeklyPlan();
    const lessons = lessonData();
    const attachments = attachmentStatus();
    const prints = printStatus();
    const assessments = assessmentStatus();
    const groupPlans = groupPlanStatus();

    const alerts = [];

    if (!Object.keys(plan).length) {
      alerts.push({
        type: "planning",
        title: "Today's plan is not prepared",
        detail: "Open Weekly Planning and add today's lessons.",
        route: "lesson-plans",
        severity: "high"
      });
    } else {
      const missingLessons = lessons.filter(item =>
        item.title.startsWith("Choose today's")
      ).length;
      if (missingLessons) {
        alerts.push({
          type: "planning",
          title: `${missingLessons} lesson area${missingLessons === 1 ? "" : "s"} still need a selection`,
          detail: "Complete the missing subject entries in Weekly Planning.",
          route: "lesson-plans",
          severity: "medium"
        });
      }
    }

    if (attachments.missing) {
      alerts.push({
        type: "attachments",
        title: `${attachments.missing} attachment${attachments.missing === 1 ? "" : "s"} need a source`,
        detail: "Add the PDF, GitHub path, or authorized URL.",
        route: "attachments",
        severity: "high"
      });
    }

    if (prints.pending) {
      alerts.push({
        type: "printing",
        title: `${prints.pending} print item${prints.pending === 1 ? "" : "s"} are waiting`,
        detail: "Open Print Center and mark completed copies.",
        route: "print-center",
        severity: "medium"
      });
    }

    if (assessments.attention) {
      alerts.push({
        type: "assessments",
        title: `${assessments.attention} assessment item${assessments.attention === 1 ? "" : "s"} need attention`,
        detail: "Review scheduled, unfinished, or make-up assessments.",
        route: "assessments",
        severity: "medium"
      });
    }

    const missingGroupPlans = groupPlans.filter(group => !group.ready).length;
    if (missingGroupPlans) {
      alerts.push({
        type: "groups",
        title: `${missingGroupPlans} small-group plan${missingGroupPlans === 1 ? "" : "s"} are not marked ready`,
        detail: "Review today's Red, Yellow, Green, and Blue group plans.",
        route: "small-groups",
        severity: "low"
      });
    }

    return { alerts, attachments, prints, assessments, groupPlans };
  }

  function checklistState() {
    if (!state.checklist[state.selectedDate]) {
      state.checklist[state.selectedDate] = {};
    }
    return state.checklist[state.selectedDate];
  }

  function completionPercent(alerts) {
    const checks = checklistState();
    const checklistDone = CHECKLIST.filter(([key]) => checks[key]).length;
    const checklistPercent = checklistDone / CHECKLIST.length;
    const readinessPercent = Math.max(0, 1 - Math.min(alerts.length, 5) / 5);
    return Math.round(((checklistPercent + readinessPercent) / 2) * 100);
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $("#pageHost");
    if (!host) return;

    const phase = schoolPhase();
    const block = instructionalBlock();
    const intelligence = readiness();
    const lessons = lessonData();
    const groups = studentGroups();
    const checks = checklistState();
    const percent = completionPercent(intelligence.alerts);

    host.innerHTML = `
      <section id="v165TeacherIntelligence">
        <section class="page-header v165-header">
          <div>
            <p>VERSION 16.5</p>
            <h2>Teacher Intelligence 2.0</h2>
            <span>Your daily teaching guide: what is happening now, what comes next, and what still needs preparation.</span>
          </div>
          <div class="button-row">
            <button id="v165TeachMyDay" class="primary-button">Teach My Day</button>
            <button id="v165Refresh" class="secondary-button">Refresh Intelligence</button>
          </div>
        </section>

        <section class="panel v165-date-bar">
          <label>
            <span>Working Date</span>
            <input id="v165Date" type="date" value="${esc(state.selectedDate)}">
          </label>
          <article class="v165-phase ${phase.type}">
            <span>SCHOOL PHASE</span>
            <strong>${esc(phase.label)}</strong>
            <small>${esc(phase.message)}</small>
          </article>
          <article>
            <span>DAY READINESS</span>
            <strong>${percent}% prepared</strong>
            <div class="v165-mini-progress"><b style="width:${percent}%"></b></div>
          </article>
        </section>

        <section class="v165-now-grid">
          <article class="panel v165-now">
            <span>${block.current ? "TEACH RIGHT NOW" : block.next ? "NEXT BLOCK" : "SCHEDULE STATUS"}</span>
            <h3>${esc(block.current?.[2] || block.next?.[2] || "Instructional day complete")}</h3>
            <p>${block.current
              ? `${block.current[0]}–${block.current[1]}`
              : block.next
                ? `Begins at ${block.next[0]}`
                : "No more scheduled blocks today."}</p>
            <div class="button-row">
              ${(block.current || block.next)
                ? `<button class="primary-button" data-v165-go="${esc((block.current || block.next)[3])}">Open Workspace</button>`
                : `<button class="secondary-button" data-v165-go="lesson-plans">Prepare Tomorrow</button>`}
            </div>
          </article>

          <article class="panel v165-next">
            <span>WHAT COMES NEXT</span>
            <h3>${esc(block.current && block.next ? block.next[2] : phase.label)}</h3>
            <p>${block.current && block.next
              ? `${block.next[0]}–${block.next[1]}`
              : esc(phase.message)}</p>
            <button class="secondary-button" data-v165-go="${esc(block.current && block.next ? block.next[3] : phase.route)}">
              Open Next
            </button>
          </article>

          <article class="panel v165-alert-summary ${intelligence.alerts.length ? "attention" : "ready"}">
            <span>PREPARATION STATUS</span>
            <h3>${intelligence.alerts.length
              ? `${intelligence.alerts.length} area${intelligence.alerts.length === 1 ? "" : "s"} need attention`
              : "Everything is ready"}</h3>
            <p>${intelligence.alerts.length
              ? "Use the priority list below to finish preparation."
              : "Your plan, materials, groups, and assessment records are ready."}</p>
          </article>
        </section>

        <section class="v165-section">
          <div class="v165-section-heading">
            <div>
              <span>TODAY'S LESSONS</span>
              <h3>Open the correct teaching studio</h3>
            </div>
            <button class="secondary-button" data-v165-go="lesson-plans">Edit Weekly Planning</button>
          </div>
          <div class="v165-lessons">
            ${lessons.map(item => lessonCard(item)).join("")}
          </div>
        </section>

        <section class="v165-middle-grid">
          <article class="panel v165-priority">
            <div class="v165-section-heading">
              <div>
                <span>PRIORITY LIST</span>
                <h3>${intelligence.alerts.length ? "Finish these before teaching" : "No urgent preparation items"}</h3>
              </div>
            </div>
            <div class="v165-alert-list">
              ${intelligence.alerts.length
                ? intelligence.alerts.map(alert => alertCard(alert)).join("")
                : `<div class="v165-all-ready"><b>✓</b><span>You are ready for ${esc(dateLabel(state.selectedDate))}.</span></div>`}
            </div>
          </article>

          <article class="panel v165-checklist">
            <div class="v165-section-heading">
              <div>
                <span>DAILY CHECKLIST</span>
                <h3>Keep the day moving</h3>
              </div>
              <button id="v165ResetChecklist" class="text-button">Reset</button>
            </div>
            <div class="v165-check-list">
              ${CHECKLIST.map(([key,label]) => `
                <label class="${checks[key] ? "done" : ""}">
                  <input type="checkbox" data-v165-check="${key}" ${checks[key] ? "checked" : ""}>
                  <span>${esc(label)}</span>
                </label>`).join("")}
            </div>
          </article>
        </section>

        <section class="v165-status-grid">
          <article class="panel">
            <span>ATTACHMENTS</span>
            <strong>${intelligence.attachments.missing ? `${intelligence.attachments.missing} missing` : "Ready"}</strong>
            <small>${intelligence.attachments.total} relevant record${intelligence.attachments.total === 1 ? "" : "s"}</small>
            <button class="secondary-button" data-v165-go="attachments">Open Attachments</button>
          </article>
          <article class="panel">
            <span>PRINT CENTER</span>
            <strong>${intelligence.prints.pending ? `${intelligence.prints.pending} waiting` : "Ready"}</strong>
            <small>${intelligence.prints.total} relevant print item${intelligence.prints.total === 1 ? "" : "s"}</small>
            <button class="secondary-button" data-v165-go="print-center">Open Print Center</button>
          </article>
          <article class="panel">
            <span>ASSESSMENTS</span>
            <strong>${intelligence.assessments.attention ? `${intelligence.assessments.attention} need attention` : "No alerts"}</strong>
            <small>${intelligence.assessments.total} relevant record${intelligence.assessments.total === 1 ? "" : "s"}</small>
            <button class="secondary-button" data-v165-go="assessments">Open Assessments</button>
          </article>
        </section>

        <section class="panel v165-groups">
          <div class="v165-section-heading">
            <div>
              <span>SMALL GROUP INTELLIGENCE</span>
              <h3>${esc(dayName())}'s reading groups</h3>
            </div>
            <button class="primary-button" data-v165-go="small-groups">Open Small Groups</button>
          </div>
          <div class="v165-group-grid">
            ${groups.map(group => {
              const plan = intelligence.groupPlans.find(item => item.color === group.color);
              return `
                <article class="${group.color.toLowerCase()}">
                  <strong>${group.color}</strong>
                  <span>${group.count} student${group.count === 1 ? "" : "s"}</span>
                  <small>${plan?.ready ? "Plan ready" : "Review plan"}</small>
                </article>`;
            }).join("")}
          </div>
        </section>

        <section class="panel v165-notes">
          <div class="v165-section-heading">
            <div>
              <span>TEACHER NOTES</span>
              <h3>Quick notes for this day</h3>
            </div>
            <button id="v165SaveNotes" class="secondary-button">Save Notes</button>
          </div>
          <textarea id="v165Notes" placeholder="Dismissal changes, student reminders, materials to locate, follow-up notes...">${esc(state.notes || "")}</textarea>
        </section>
      </section>
    `;

    wire();
  }

  function lessonCard(item) {
    return `
      <article class="panel v165-lesson-card">
        <span>${esc(item.label)}</span>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.objective || "Add the learning objective in Weekly Planning.")}</p>
        <button class="primary-button"
          data-v165-go="${esc(item.route)}"
          ${item.studio ? `data-v165-studio="${esc(item.studio)}"` : ""}>
          Open Lesson
        </button>
      </article>`;
  }

  function alertCard(alert) {
    return `
      <button class="${esc(alert.severity)}" data-v165-go="${esc(alert.route)}">
        <b>!</b>
        <span>
          <strong>${esc(alert.title)}</strong>
          <small>${esc(alert.detail)}</small>
        </span>
        <em>Open</em>
      </button>`;
  }

  function openRoute(destination, studio) {
    if (studio) {
      try {
        const saved = read(AFTERNOON_STORE, {});
        saved.activeStudio = studio;
        localStorage.setItem(AFTERNOON_STORE, JSON.stringify(saved));
      } catch {}
      window.__THH_REQUESTED_AFTERNOON_STUDIO__ = studio;
    }
    location.hash = destination;
  }

  function wire() {
    $("#v165Date")?.addEventListener("change", event => {
      state.selectedDate = event.target.value;
      save();
      render();
    });

    $("#v165Refresh")?.addEventListener("click", () => {
      notify("Teacher Intelligence refreshed.");
      render();
    });

    $("#v165TeachMyDay")?.addEventListener("click", () => {
      const block = instructionalBlock();
      const destination = (block.current || block.next)?.[3] || "teachday";
      openRoute(destination);
    });

    $$("[data-v165-go]").forEach(button => {
      button.addEventListener("click", () => {
        openRoute(button.dataset.v165Go, button.dataset.v165Studio);
      });
    });

    $$("[data-v165-check]").forEach(input => {
      input.addEventListener("change", () => {
        const checks = checklistState();
        checks[input.dataset.v165Check] = input.checked;
        save();
        render();
      });
    });

    $("#v165ResetChecklist")?.addEventListener("click", () => {
      state.checklist[state.selectedDate] = {};
      save();
      render();
    });

    $("#v165SaveNotes")?.addEventListener("click", () => {
      state.notes = $("#v165Notes")?.value || "";
      save();
      notify("Teacher notes saved.");
    });
  }

  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function takeControl() {
    if (route() !== ROUTE) return;
    setTimeout(render, 25);
    setTimeout(render, 250);
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
