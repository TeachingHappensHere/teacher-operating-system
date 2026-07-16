
(() => {
  "use strict";

  const ROUTE = "dashboard";
  const STORE = "thh-v166:morning-command-center";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const PRINT_STORE = "thh-v74:print-center";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const STUDENT_STORE = "thh-v140:student-records";
  const ASSESSMENT_STORE = "thh-v142:assessment-records";
  const AFTERNOON_STORE = "thh-v83:afternoon-studios";

  const QUICK_LINKS = [
    ["Gradebook / Attendance","https://www.google.com/","attendance"],
    ["Chalkie","https://app.chalkie.ai/","chalkie"],
    ["UFLI Toolbox","https://ufli.education.ufl.edu/foundations/toolbox/","ufli"],
    ["ClassDojo","https://www.classdojo.com/","dojo"],
    ["Open Court","https://www.mheducation.com/","open-court"],
    ["Heggerty","https://heggerty.org/","heggerty"],
    ["Amplify","https://amplify.com/","amplify"],
    ["Eureka Math²","https://digital.greatminds.org/teacher?curriculaCode=em2&gradeCode=em2.g2&moduleCode=em2.g2.m1","eureka"],
    ["Beanstack","https://www.beanstack.com/","beanstack"],
    ["MobyMax","https://www.mobymax.com/","mobymax"],
    ["Google Drive","https://drive.google.com/","drive"]
  ];

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

  const START_CHECKLIST = [
    ["attendance","Attendance and breakfast count ready"],
    ["morningWork","Morning work displayed"],
    ["copies","Copies collected from Print Center"],
    ["technology","Smartboard and lesson links tested"],
    ["groups","MOWR groups reviewed"],
    ["messages","ClassDojo and important messages checked"]
  ];

  const END_CHECKLIST = [
    ["attendanceComplete","Attendance complete"],
    ["grades","Grades or assessment notes entered"],
    ["behavior","Behavior documentation complete"],
    ["roomReset","Classroom reset"],
    ["tomorrow","Tomorrow's first lesson ready"],
    ["dismissal","Dismissal changes cleared"]
  ];

  let state = {
    date: new Date().toISOString().slice(0,10),
    morningChecks: {},
    endChecks: {},
    notes: "",
    priorities: [],
    studentAlerts: [],
    expandedSchedule: false
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

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function route() {
    return location.hash.replace("#","") || "dashboard";
  }

  function todayName() {
    return new Date(`${state.date}T12:00:00`).toLocaleDateString("en-US",{weekday:"long"});
  }

  function longDate() {
    return new Date(`${state.date}T12:00:00`).toLocaleDateString("en-US",{
      weekday:"long",month:"long",day:"numeric",year:"numeric"
    });
  }

  function timeTo24(value) {
    let [h,m] = value.split(":").map(Number);
    if (h >= 1 && h <= 3) h += 12;
    return h * 60 + m;
  }

  function blockState() {
    const isToday = state.date === new Date().toISOString().slice(0,10);
    if (!isToday) return { current:null, next:SCHEDULE[0], selected:true };

    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const currentIndex = SCHEDULE.findIndex(([start,end]) =>
      mins >= timeTo24(start) && mins < timeTo24(end)
    );

    if (currentIndex >= 0) {
      return { current:SCHEDULE[currentIndex], next:SCHEDULE[currentIndex+1] || null };
    }

    return {
      current:null,
      next:SCHEDULE.find(([start]) => mins < timeTo24(start)) || null
    };
  }

  function planForDay() {
    const plan = read(WEEK_STORE,{});
    const day = todayName();
    if (plan.days?.[day]) return plan.days[day];
    if (plan[day]) return plan[day];
    return {};
  }

  function status() {
    const prints = read(PRINT_STORE,[]);
    const attachments = read(ATTACHMENT_STORE,[]);
    const assessments = read(ASSESSMENT_STORE,[]);
    const plan = planForDay();

    return {
      printPending: prints.filter(item => !item.complete).length,
      attachmentMissing: attachments.filter(item =>
        item.missingSource || item.status === "Missing Link" || (!(item.url || item.fileName) && item.print)
      ).length,
      assessmentAttention: assessments.filter(item =>
        ["Scheduled","Not Started","Needs Make-Up"].includes(item.status)
      ).length,
      planReady: Object.keys(plan).length > 0
    };
  }

  function lessonCards() {
    const plan = planForDay();
    return [
      ["ELA / Open Court", plan.reading || plan.ela || "Choose today's Open Court lesson", "open-court", ""],
      ["Math / Eureka Math²", plan.math || plan.eureka || "Choose today's Eureka Math² lesson", "eureka-math", ""],
      ["Science", plan.science || "Choose today's science workbook section", "afternoon-studios", "science"],
      ["Writing / Social Studies", plan.afternoon || plan.writing || plan.socialStudies || "Choose today's afternoon lesson", "afternoon-studios", ""]
    ];
  }

  function studentAlerts() {
    const students = read(STUDENT_STORE,[]);
    const saved = Array.isArray(state.studentAlerts) ? state.studentAlerts : [];
    const generated = students
      .filter(student => student.alert || student.healthNote || student.scheduleNote)
      .map(student => ({
        id:`student-${student.id || student.name}`,
        text:`${student.name}: ${student.alert || student.healthNote || student.scheduleNote}`,
        source:"Student Profile"
      }));
    return [...saved, ...generated];
  }

  function readinessPercent() {
    const morning = state.morningChecks[state.date] || {};
    const done = START_CHECKLIST.filter(([key]) => morning[key]).length;
    const st = status();
    let score = done / START_CHECKLIST.length;
    if (st.planReady) score += .2;
    if (!st.printPending) score += .1;
    if (!st.attachmentMissing) score += .1;
    return Math.min(100, Math.round(score * 72));
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $("#pageHost");
    if (!host) return;

    const block = blockState();
    const st = status();
    const lessons = lessonCards();
    const alerts = studentAlerts();
    const morning = state.morningChecks[state.date] || {};
    const ending = state.endChecks[state.date] || {};
    const percent = readinessPercent();

    host.innerHTML = `
      <section id="v166CommandCenter">
        <section class="v166-hero">
          <div>
            <p>MORNING COMMAND CENTER</p>
            <h1>Good morning, Mrs. Parrish</h1>
            <span>${esc(longDate())}</span>
            <strong>${block.current
              ? `Now: ${esc(block.current[2])} until ${block.current[1]}`
              : block.next
                ? `Next: ${esc(block.next[2])} at ${block.next[0]}`
                : "The instructional day is complete."}</strong>
          </div>
          <div class="v166-hero-actions">
            <button id="v166StartDay" class="primary-button">Start Teaching</button>
            <button data-v166-go="intelligence-engine" class="secondary-button">Teacher Intelligence</button>
          </div>
        </section>

        <section class="panel v166-date-row">
          <label><span>Working Date</span><input id="v166Date" type="date" value="${esc(state.date)}"></label>
          <article><span>READINESS</span><strong>${percent}%</strong><div><b style="width:${percent}%"></b></div></article>
          <article><span>PLAN STATUS</span><strong>${st.planReady ? "Ready" : "Needs Planning"}</strong></article>
          <article><span>PRINTING</span><strong>${st.printPending ? `${st.printPending} waiting` : "Ready"}</strong></article>
        </section>

        <section class="v166-main-grid">
          <article class="panel v166-now-card">
            <span>CURRENT / NEXT BLOCK</span>
            <h2>${esc(block.current?.[2] || block.next?.[2] || "Day Complete")}</h2>
            <p>${block.current
              ? `${block.current[0]}–${block.current[1]}`
              : block.next
                ? `Begins at ${block.next[0]}`
                : "No more scheduled blocks."}</p>
            <button class="primary-button" data-v166-go="${esc((block.current || block.next)?.[3] || "lesson-plans")}">
              Open Workspace
            </button>
          </article>

          <article class="panel v166-priorities">
            <div class="v166-section-head">
              <div><span>TODAY'S PRIORITIES</span><h2>What needs your attention</h2></div>
              <button id="v166AddPriority" class="text-button">+ Add</button>
            </div>
            <div class="v166-list">
              ${priorityItems(st).join("") || `<div class="v166-ready">✓ No urgent priorities.</div>`}
              ${(state.priorities || []).map((item,index) => `
                <div class="v166-list-item">
                  <span>${esc(item)}</span>
                  <button data-v166-delete-priority="${index}">×</button>
                </div>`).join("")}
            </div>
          </article>

          <article class="panel v166-alerts">
            <div class="v166-section-head">
              <div><span>STUDENT ALERTS</span><h2>Important reminders</h2></div>
              <button id="v166AddAlert" class="text-button">+ Add</button>
            </div>
            <div class="v166-list">
              ${alerts.length
                ? alerts.map((item,index) => `
                  <div class="v166-list-item">
                    <span><strong>${esc(item.text)}</strong><small>${esc(item.source || "Daily Note")}</small></span>
                    ${item.source === "Student Profile" ? "" : `<button data-v166-delete-alert="${index}">×</button>`}
                  </div>`).join("")
                : `<div class="v166-empty">No student alerts added for today.</div>`}
            </div>
          </article>
        </section>

        <section class="v166-section">
          <div class="v166-section-head">
            <div><span>TODAY'S LESSONS</span><h2>One-click teaching studios</h2></div>
            <button data-v166-go="lesson-plans" class="secondary-button">Weekly Planning</button>
          </div>
          <div class="v166-lessons">
            ${lessons.map(([label,title,routeName,studio]) => `
              <article class="panel">
                <span>${esc(label)}</span>
                <h3>${esc(title)}</h3>
                <button class="primary-button" data-v166-go="${esc(routeName)}" ${studio ? `data-v166-studio="${studio}"` : ""}>Open Lesson</button>
              </article>`).join("")}
          </div>
        </section>

        <section class="v166-middle-grid">
          <article class="panel v166-checklist">
            <div class="v166-section-head">
              <div><span>BEFORE STUDENTS ARRIVE</span><h2>Morning setup</h2></div>
              <button id="v166ResetMorning" class="text-button">Reset</button>
            </div>
            <div>
              ${START_CHECKLIST.map(([key,label]) => `
                <label class="${morning[key] ? "done" : ""}">
                  <input type="checkbox" data-v166-morning="${key}" ${morning[key] ? "checked" : ""}>
                  <span>${esc(label)}</span>
                </label>`).join("")}
            </div>
          </article>

          <article class="panel v166-quick-launch">
            <div class="v166-section-head">
              <div><span>ONE-CLICK LAUNCH</span><h2>Open your teaching tools</h2></div>
              <button id="v166OpenAll" class="primary-button">Open All</button>
            </div>
            <div>
              ${QUICK_LINKS.map(([label,url,key]) => `
                <button data-v166-external="${esc(url)}" title="${esc(label)}">
                  <span>${iconFor(key)}</span><strong>${esc(label)}</strong>
                </button>`).join("")}
            </div>
          </article>
        </section>

        <section class="panel v166-schedule">
          <div class="v166-section-head">
            <div><span>TODAY'S SCHEDULE</span><h2>Instructional timeline</h2></div>
            <button id="v166ToggleSchedule" class="secondary-button">${state.expandedSchedule ? "Show Less" : "Show Full Day"}</button>
          </div>
          <div class="${state.expandedSchedule ? "expanded" : ""}">
            ${scheduleMarkup(block)}
          </div>
        </section>

        <section class="v166-bottom-grid">
          <article class="panel v166-notes">
            <div class="v166-section-head">
              <div><span>DAILY NOTES</span><h2>Keep this open all day</h2></div>
              <button id="v166SaveNotes" class="secondary-button">Save Notes</button>
            </div>
            <textarea id="v166Notes" placeholder="Early dismissals, materials to copy, alternate videos, parent follow-up...">${esc(state.notes || "")}</textarea>
          </article>

          <article class="panel v166-end-day">
            <div class="v166-section-head">
              <div><span>END OF DAY</span><h2>Close out and prepare tomorrow</h2></div>
            </div>
            <div>
              ${END_CHECKLIST.map(([key,label]) => `
                <label class="${ending[key] ? "done" : ""}">
                  <input type="checkbox" data-v166-end="${key}" ${ending[key] ? "checked" : ""}>
                  <span>${esc(label)}</span>
                </label>`).join("")}
            </div>
            <button id="v166FinishDay" class="primary-button">Finish Day</button>
          </article>
        </section>
      </section>
    `;

    wire();
  }

  function priorityItems(st) {
    const items = [];
    if (!st.planReady) items.push(priority("Today's lesson plan needs preparation","lesson-plans","high"));
    if (st.printPending) items.push(priority(`${st.printPending} print item${st.printPending === 1 ? "" : "s"} waiting`,"print-center","medium"));
    if (st.attachmentMissing) items.push(priority(`${st.attachmentMissing} attachment${st.attachmentMissing === 1 ? "" : "s"} need a source`,"attachments","high"));
    if (st.assessmentAttention) items.push(priority(`${st.assessmentAttention} assessment item${st.assessmentAttention === 1 ? "" : "s"} need attention`,"assessments","medium"));
    return items;
  }

  function priority(text, routeName, severity) {
    return `<button class="v166-priority-item ${severity}" data-v166-go="${routeName}"><span>${esc(text)}</span><strong>Open</strong></button>`;
  }

  function iconFor(key) {
    return ({
      attendance:"✓",chalkie:"C",ufli:"U",dojo:"D","open-court":"OC",
      heggerty:"H",amplify:"A",eureka:"E",beanstack:"B",mobymax:"M",drive:"G"
    })[key] || "↗";
  }

  function scheduleMarkup(block) {
    const current = block.current?.[2];
    const next = block.next?.[2];
    const rows = state.expandedSchedule
      ? SCHEDULE
      : SCHEDULE.filter(row => row[2] === current || row[2] === next).slice(0,2);

    const visible = rows.length ? rows : SCHEDULE.slice(-2);

    return visible.map(([start,end,title]) => `
      <article class="${title === current ? "current" : title === next ? "next" : ""}">
        <span>${start}–${end}</span>
        <strong>${esc(title)}</strong>
        <small>${title === current ? "Now" : title === next ? "Next" : ""}</small>
      </article>`).join("");
  }

  function openRoute(destination, studio) {
    if (studio) {
      const saved = read(AFTERNOON_STORE,{});
      saved.activeStudio = studio;
      localStorage.setItem(AFTERNOON_STORE,JSON.stringify(saved));
      window.__THH_REQUESTED_AFTERNOON_STUDIO__ = studio;
    }
    location.hash = destination;
  }

  function wire() {
    $("#v166Date")?.addEventListener("change", event => {
      state.date = event.target.value;
      save();
      render();
    });

    $("#v166StartDay")?.addEventListener("click", () => {
      const block = blockState();
      openRoute((block.current || block.next)?.[3] || "teachday");
    });

    $$("[data-v166-go]").forEach(button => {
      button.addEventListener("click", () => openRoute(button.dataset.v166Go, button.dataset.v166Studio));
    });

    $$("[data-v166-external]").forEach(button => {
      button.addEventListener("click", () => window.open(button.dataset.v166External,"_blank","noopener"));
    });

    $("#v166OpenAll")?.addEventListener("click", () => {
      QUICK_LINKS.forEach(([,url],index) => {
        setTimeout(() => window.open(url,"_blank","noopener"), index * 120);
      });
      notify("Opening daily teaching tools.");
    });

    $$("[data-v166-morning]").forEach(input => {
      input.addEventListener("change", () => {
        state.morningChecks[state.date] = state.morningChecks[state.date] || {};
        state.morningChecks[state.date][input.dataset.v166Morning] = input.checked;
        save();
        render();
      });
    });

    $$("[data-v166-end]").forEach(input => {
      input.addEventListener("change", () => {
        state.endChecks[state.date] = state.endChecks[state.date] || {};
        state.endChecks[state.date][input.dataset.v166End] = input.checked;
        save();
        render();
      });
    });

    $("#v166ResetMorning")?.addEventListener("click", () => {
      state.morningChecks[state.date] = {};
      save();
      render();
    });

    $("#v166AddPriority")?.addEventListener("click", () => {
      const value = prompt("Add today's priority:");
      if (!value) return;
      state.priorities.push(value);
      save();
      render();
    });

    $("#v166AddAlert")?.addEventListener("click", () => {
      const value = prompt("Add a student alert or reminder:");
      if (!value) return;
      state.studentAlerts.push({text:value,source:"Daily Note"});
      save();
      render();
    });

    $$("[data-v166-delete-priority]").forEach(button => {
      button.addEventListener("click", () => {
        state.priorities.splice(Number(button.dataset.v166DeletePriority),1);
        save();
        render();
      });
    });

    $$("[data-v166-delete-alert]").forEach(button => {
      button.addEventListener("click", () => {
        state.studentAlerts.splice(Number(button.dataset.v166DeleteAlert),1);
        save();
        render();
      });
    });

    $("#v166ToggleSchedule")?.addEventListener("click", () => {
      state.expandedSchedule = !state.expandedSchedule;
      save();
      render();
    });

    $("#v166SaveNotes")?.addEventListener("click", () => {
      state.notes = $("#v166Notes")?.value || "";
      save();
      notify("Daily notes saved.");
    });

    $("#v166FinishDay")?.addEventListener("click", () => {
      const checks = state.endChecks[state.date] || {};
      const complete = END_CHECKLIST.every(([key]) => checks[key]);
      if (!complete) {
        notify("Complete the end-of-day checklist first.");
        return;
      }
      notify("Day complete. Tomorrow is ready to prepare.");
      setTimeout(() => openRoute("lesson-plans"), 900);
    });
  }

  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"),1800);
  }

  function takeControl() {
    if (route() !== ROUTE) return;
    setTimeout(render,25);
    setTimeout(render,250);
  }

  state = { ...state, ...read(STORE,{}) };
  if (!state.morningChecks) state.morningChecks = {};
  if (!state.endChecks) state.endChecks = {};
  if (!Array.isArray(state.priorities)) state.priorities = [];
  if (!Array.isArray(state.studentAlerts)) state.studentAlerts = [];

  window.THH_RENDER_MORNING_COMMAND_CENTER = render;
  window.addEventListener("hashchange",takeControl);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",takeControl);
  } else {
    takeControl();
  }
})();
