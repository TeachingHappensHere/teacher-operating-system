
(() => {
  "use strict";

  const ROUTE = "dashboard";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const STUDENT_STORE = "thh-v140:student-records";
  const GROUP_STORE = "thh-v141:group-plans";
  const ASSESSMENT_STORE = "thh-v142:assessment-records";
  const STATE_STORE = "thh-v164:dashboard";

  const SCHEDULE = [
    ["7:45","8:10","Breakfast","breakfast"],
    ["8:10","8:20","Morning Work","morning"],
    ["8:20","9:15","MOWR","mowr"],
    ["9:15","9:25","Heggerty","heggerty"],
    ["9:25","9:45","Phonics","phonics"],
    ["9:45","9:55","Vocabulary","vocabulary"],
    ["9:55","10:45","Reading (Open Court)","reading"],
    ["10:45","11:10","Lunch & Recess","lunch"],
    ["11:10","11:40","Writing","writing"],
    ["11:40","12:40","Math","math"],
    ["12:40","1:15","Workout","workout"],
    ["1:15","1:20","Recess","recess"],
    ["1:20","1:40","Math 2","math2"],
    ["1:40","2:15","Science","science"],
    ["2:15","2:55","Social Studies","socialStudies"],
    ["2:55","3:00","Pack-up / Bus Dismissal","packup"],
    ["3:00","3:30","Dismissal","dismissal"]
  ];

  let state = { scheduleExpanded: false };

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

  function saveState() {
    localStorage.setItem(STATE_STORE, JSON.stringify(state));
  }

  function route() {
    return location.hash.replace("#","") || "dashboard";
  }

  function todayName() {
    return new Date().toLocaleDateString("en-US", { weekday:"long" });
  }

  function todayLong() {
    return new Date().toLocaleDateString("en-US", {
      weekday:"long", month:"long", day:"numeric", year:"numeric"
    });
  }

  function minutes(value) {
    const [h, m] = value.split(":").map(Number);
    return ((h % 12) * 60) + m + (h >= 7 && h < 12 ? 0 : h < 7 ? 720 : 0);
  }

  function currentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function currentBlock() {
    const now = currentMinutes();
    const blocks = SCHEDULE.map(([start,end,title,key]) => ({
      start,end,title,key,
      startMinutes: timeTo24(start),
      endMinutes: timeTo24(end)
    }));

    const active = blocks.find(block => now >= block.startMinutes && now < block.endMinutes);
    if (active) {
      const index = blocks.indexOf(active);
      return { active, next: blocks[index + 1] || null };
    }

    const next = blocks.find(block => now < block.startMinutes);
    return { active: null, next: next || null };
  }

  function timeTo24(value) {
    let [h, m] = value.split(":").map(Number);
    if (h >= 1 && h <= 3) h += 12;
    return h * 60 + m;
  }

  function plan() {
    return read(WEEK_STORE, { days:{} });
  }

  function dayPlan() {
    const p = plan();
    return p.days?.[todayName()] || {};
  }

  function attentionItems() {
    const attachments = read(ATTACHMENT_STORE, []);
    const prints = read(PRINT_STORE, []);
    const assessments = read(ASSESSMENT_STORE, []);
    const items = [];

    const missingAttachments = attachments.filter(item =>
      item.status === "Missing Link" || (!(item.url || item.fileName) && item.print)
    ).length;
    if (missingAttachments) items.push({
      type:"attachments",
      label:`${missingAttachments} attachment${missingAttachments === 1 ? "" : "s"} need a file or link`,
      route:"attachments"
    });

    const pendingPrints = prints.filter(item => !item.complete).length;
    if (pendingPrints) items.push({
      type:"printing",
      label:`${pendingPrints} print item${pendingPrints === 1 ? "" : "s"} are waiting`,
      route:"print-center"
    });

    const incompleteAssessments = assessments.filter(item =>
      ["Not Started","Needs Make-Up","Scheduled"].includes(item.status)
    ).length;
    if (incompleteAssessments) items.push({
      type:"assessments",
      label:`${incompleteAssessments} assessment record${incompleteAssessments === 1 ? "" : "s"} need attention`,
      route:"assessments"
    });

    const today = dayPlan();
    if (!today || Object.keys(today).length < 3) items.push({
      type:"planning",
      label:"Today's lesson plan is not fully prepared",
      route:"lesson-plans"
    });

    return items;
  }

  function lessonCard(label, key, routeName, fallback) {
    const today = dayPlan();
    const value = today[key] || fallback;
    return `
      <article class="v164-lesson-card">
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <button data-go="${routeName}">Open Lesson</button>
      </article>`;
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $("#pageHost");
    if (!host) return;

    const block = currentBlock();
    const attention = attentionItems();
    const students = read(STUDENT_STORE, []);
    const groups = read(GROUP_STORE, {});
    const today = dayPlan();

    host.innerHTML = `
      <section id="v72Dashboard" class="v164-dashboard">
        <section class="v164-hero">
          <div>
            <p>${esc(todayLong())}</p>
            <h1>Good morning, Mrs. Parrish</h1>
            <span>${block.active
              ? `Now: ${esc(block.active.title)} until ${block.active.end}`
              : block.next
                ? `Next: ${esc(block.next.title)} at ${block.next.start}`
                : "The instructional day is complete."}</span>
          </div>
          <div class="v164-hero-actions">
            <button id="v164StartTeaching" class="primary-button">Start Teaching</button>
            <button data-go="calendar" class="secondary-button">Calendar</button>
          </div>
        </section>

        <section class="v164-top-grid">
          <article class="panel v164-next-card">
            <span>CURRENT / NEXT BLOCK</span>
            <h2>${esc(block.active?.title || block.next?.title || "Day Complete")}</h2>
            <p>${block.active
              ? `${block.active.start}–${block.active.end}`
              : block.next
                ? `Begins at ${block.next.start}`
                : "No more scheduled blocks today."}</p>
            ${block.next && block.active ? `<small>Next: ${esc(block.next.title)} at ${block.next.start}</small>` : ""}
          </article>

          <article class="panel v164-ready-card ${attention.length ? "needs-attention" : "ready"}">
            <span>READINESS</span>
            <h2>${attention.length ? `${attention.length} area${attention.length === 1 ? "" : "s"} need attention` : "You're ready for today"}</h2>
            <p>${attention.length ? "Open the attention panel below to finish preparation." : "Plans, materials, and teaching tools are ready."}</p>
          </article>

          <article class="panel v164-quick-card">
            <span>QUICK LAUNCH</span>
            <div>
              <button data-go="teachday">Live Teaching</button>
              <button data-go="communication">ClassDojo / Messages</button>
              <button data-go="students">Students</button>
            </div>
          </article>
        </section>

        <section class="panel v164-schedule">
          <div class="v164-section-heading">
            <div>
              <span>TODAY'S SCHEDULE</span>
              <h2>Instructional Timeline</h2>
            </div>
            <button id="v164ScheduleToggle" class="secondary-button">${state.scheduleExpanded ? "Show Less" : "Show Full Day"}</button>
          </div>
          <div class="v164-schedule-strip ${state.scheduleExpanded ? "expanded" : ""}">
            ${scheduleMarkup(block)}
          </div>
        </section>

        <section class="v164-section">
          <div class="v164-section-heading">
            <div>
              <span>TODAY'S LESSONS</span>
              <h2>Open only what you need</h2>
            </div>
            <button data-go="lesson-plans" class="secondary-button">Weekly Planning</button>
          </div>
          <div class="v164-lessons">
            ${lessonCard("ELA / Open Court","reading","open-court", "Select today's Open Court lesson")}
            ${lessonCard("Math / Eureka Math²","math","eureka-math", "Select today's Eureka Math² lesson")}
            ${lessonCard("Science","science","afternoon-studios", "Select today's science workbook section")}
            ${lessonCard("Social Studies","socialStudies","afternoon-studios", "Select today's Arizona Social Studies, iCivics, or 180 Days lesson")}
          </div>
        </section>

        <section class="v164-middle-grid">
          <article class="panel v164-attention">
            <div class="v164-section-heading">
              <div>
                <span>NEEDS YOUR ATTENTION</span>
                <h2>${attention.length ? "Finish these items" : "Everything is ready"}</h2>
              </div>
            </div>
            <div class="v164-attention-list">
              ${attention.length
                ? attention.map(item => `
                  <button data-go="${item.route}">
                    <b>!</b><span>${esc(item.label)}</span><strong>Open</strong>
                  </button>`).join("")
                : `<div class="v164-all-ready"><b>✓</b><span>No preparation alerts for today.</span></div>`
              }
            </div>
          </article>

          <article class="panel v164-groups">
            <div class="v164-section-heading">
              <div>
                <span>SMALL GROUPS & INTERVENTION</span>
                <h2>Today's support</h2>
              </div>
            </div>
            <div class="v164-group-summary">
              ${["Red","Yellow","Green","Blue"].map(color => {
                const full = Object.keys(groups).find(key => key.startsWith(color + " —") && key.endsWith("|" + todayName()));
                const studentCount = students.filter(student => (student.readingGroup || "").startsWith(color)).length;
                return `<article><strong>${color}</strong><span>${studentCount} student${studentCount === 1 ? "" : "s"}</span><small>${full ? "Plan ready" : "Plan available"}</small></article>`;
              }).join("")}
            </div>
            <div class="button-row">
              <button data-go="small-groups" class="primary-button">Open Small Groups</button>
              <button data-go="intervention" class="secondary-button">Intervention</button>
            </div>
          </article>
        </section>

        <section class="v164-compartments">
          ${compartment("Plan the Week","planning",[
            ["Teacher Intelligence","intelligence-engine"],
            ["Workflow Hub","workflow-hub"],
            ["Lesson Builder","lesson-builder"],
            ["Weekly Planning","lesson-plans"],
            ["Daily Lesson Packets","production"]
          ])}
          ${compartment("Curriculum","curriculum",[
            ["Open Court Intelligence","open-court"],
            ["Eureka Math Intelligence","eureka-math"],
            ["Science Intelligence","science-intelligence"],
            ["Writing, Science & Social Studies","afternoon-studios"]
          ])}
          ${compartment("Students & Data","students",[
            ["Student Profiles","students"],
            ["Small Groups","small-groups"],
            ["Intervention","intervention"],
            ["Assessments & Data","assessments"],
            ["Communication","communication"]
          ])}
          ${compartment("Resources & Printing","resources",[
            ["Lesson Attachments","attachments"],
            ["Print Center","print-center"],
            ["Forms & Printables","forms"],
            ["Resources","resources"]
          ])}
          <details class="panel v164-details" id="v164SystemDetails">
            <summary><span>System Details</span><strong>Show background status cards</strong></summary>
            <div id="v164LegacyCards"></div>
          </details>
        </section>
      </section>
    `;

    wire();
    captureLegacyCards();
  }

  function scheduleMarkup(block) {
    const nowKey = block.active?.key;
    const nextKey = block.next?.key;
    const visible = state.scheduleExpanded
      ? SCHEDULE
      : SCHEDULE.filter(item => item[3] === nowKey || item[3] === nextKey).slice(0,2);

    const use = visible.length ? visible : SCHEDULE.slice(-2);
    return use.map(([start,end,title,key]) => `
      <article class="${key === nowKey ? "current" : key === nextKey ? "next" : ""}">
        <span>${start}–${end}</span>
        <strong>${esc(title)}</strong>
        <small>${key === nowKey ? "Now" : key === nextKey ? "Next" : ""}</small>
      </article>`).join("");
  }

  function compartment(title, key, items) {
    return `
      <details class="panel v164-details" data-compartment="${key}">
        <summary><span>${esc(title)}</span><strong>${items.length} tools</strong></summary>
        <div class="v164-tool-grid">
          ${items.map(([label, routeName]) => `<button data-go="${routeName}">${esc(label)}</button>`).join("")}
        </div>
      </details>`;
  }

  function wire() {
    $("#v164StartTeaching")?.addEventListener("click", () => location.hash = "teachday");
    $("#v164ScheduleToggle")?.addEventListener("click", () => {
      state.scheduleExpanded = !state.scheduleExpanded;
      saveState();
      render();
    });

    $$("[data-go]").forEach(button => {
      button.addEventListener("click", () => {
        const destination = button.dataset.go;
        const lessonLabel = button.closest(".v164-lesson-card")
          ?.querySelector("span")
          ?.textContent
          ?.trim();

        const requestedStudio =
          lessonLabel === "Science" ? "science" :
          lessonLabel === "Social Studies" ? "socialStudies" :
          null;

        if (requestedStudio && destination === "afternoon-studios") {
          try {
            const key = "thh-v83:afternoon-studios";
            const saved = JSON.parse(localStorage.getItem(key) || "{}");
            saved.activeStudio = requestedStudio;
            localStorage.setItem(key, JSON.stringify(saved));
          } catch {}
          window.__THH_REQUESTED_AFTERNOON_STUDIO__ = requestedStudio;
        }

        location.hash = destination;
      });
    });

    new MutationObserver(() => captureLegacyCards()).observe($("#v72Dashboard"), {
      childList:true
    });
  }

  function captureLegacyCards() {
    const dashboard = $("#v72Dashboard");
    const container = $("#v164LegacyCards");
    if (!dashboard || !container) return;

    [...dashboard.children].forEach(child => {
      const allowed = [
        "v164-hero","v164-top-grid","v164-schedule","v164-section",
        "v164-middle-grid","v164-compartments"
      ];
      if (!allowed.some(className => child.classList?.contains(className))) {
        container.appendChild(child);
      }
    });
  }

  function takeControl() {
    if (route() !== ROUTE) return;
    setTimeout(render, 30);
    setTimeout(render, 300);
    setTimeout(captureLegacyCards, 700);
  }

  try {
    state = { ...state, ...read(STATE_STORE, {}) };
  } catch {}

  window.THH_RENDER_CALM_DASHBOARD = render;
  window.addEventListener("hashchange", takeControl);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", takeControl);
  } else {
    takeControl();
  }
})();
