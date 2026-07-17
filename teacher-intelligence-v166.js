
(() => {
  "use strict";

  const ROUTE = "teacher-intelligence";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const ASSESSMENT_STORE = "thh-v142:assessment-records";
  const GROUP_STORE = "thh-v141:group-plans";
  const STUDENT_STORE = "thh-v140:student-records";
  const ENGINE_PREFIX = "thh-v165:teaching-engine:";
  const GENERATED_CURRICULUM_STORE = "thh-v167:generated-lessons";

  let config = { rules: {} };

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

  function route() {
    return location.hash.replace("#","") || "dashboard";
  }

  function weekday() {
    return new Date().toLocaleDateString("en-US", { weekday:"long" });
  }

  function dateKey() {
    return new Date().toISOString().slice(0,10);
  }

  function todayLong() {
    return new Date().toLocaleDateString("en-US", {
      weekday:"long", month:"long", day:"numeric", year:"numeric"
    });
  }

  function injectNavigation() {
    const install = () => {
      if ($('[data-route="teacher-intelligence"]')) return;

      const groups = $$(".v110-nav-group");
      const planning = groups.find(group =>
        $(".v110-nav-heading span", group)?.textContent?.trim().toLowerCase() === "planning"
      );
      const body = planning ? $(".v110-nav-body", planning) : $("#mainNav");

      if (!body) {
        setTimeout(install, 120);
        return;
      }

      const button = document.createElement("button");
      button.className = "v110-route";
      button.dataset.route = ROUTE;
      button.innerHTML = `<span>🧠</span><strong>Teacher Intelligence</strong>`;
      button.addEventListener("click", () => location.hash = ROUTE);
      body.prepend(button);
    };

    install();
  }

  function buildSnapshot() {
    const day = weekday();
    const plan = read(WEEK_STORE, { days:{} });
    const dayPlan = plan.days?.[day] || {};
    const attachments = read(ATTACHMENT_STORE, []);
    const prints = read(PRINT_STORE, []);
    const assessments = read(ASSESSMENT_STORE, []);
    const groups = read(GROUP_STORE, {});
    const students = read(STUDENT_STORE, []);
    const engine = read(ENGINE_PREFIX + dateKey(), {
      started:false, completed:{}, activeIndex:0
    });
    const generatedCurriculum = read(GENERATED_CURRICULUM_STORE, {});
    const generatedToday = generatedCurriculum[dateKey()] || null;

    const curriculumKeys = [
      ["reading","ELA / Open Court"],
      ["writing","Writing"],
      ["math","Eureka Math²"],
      ["science","Science"],
      ["socialStudies","Social Studies"]
    ];

    const curriculum = curriculumKeys.map(([key,label]) => ({
      key,
      label,
      ready: Boolean(dayPlan[key] || generatedToday),
      value: dayPlan[key] || (key === "reading" ? [generatedToday?.openCourt, generatedToday?.readingTitle].filter(Boolean).join(" — ") : key === "writing" ? generatedToday?.writing : key === "math" ? generatedToday?.math : key === "science" ? generatedToday?.science : key === "socialStudies" ? generatedToday?.socialStudies : "") || ""
    }));

    const pendingPrints = Array.isArray(prints)
      ? prints.filter(item => !item.complete && (!item.day || item.day === day)).length
      : 0;

    const missingAttachments = Array.isArray(attachments)
      ? attachments.filter(item =>
          (item.status === "Missing Link" || (!(item.url || item.fileName) && item.print)) &&
          (!item.day || item.day === day)
        ).length
      : 0;

    const assessmentAttention = Array.isArray(assessments)
      ? assessments.filter(item =>
          ["Not Started","Needs Make-Up","Scheduled"].includes(item.status)
        ).length
      : 0;

    const groupKeys = Object.keys(groups || {}).filter(key => key.endsWith("|" + day));
    const groupReady = groupKeys.length > 0;

    const completedBlocks = Object.values(engine.completed || {}).filter(Boolean).length;
    const totalBlocks = 17;

    const checks = [
      ...curriculum.map(item => item.ready),
      pendingPrints === 0,
      missingAttachments === 0,
      assessmentAttention === 0,
      groupReady
    ];

    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

    const actions = [];

    curriculum.filter(item => !item.ready).forEach(item => {
      actions.push({
        priority:"high",
        title:`Prepare ${item.label}`,
        detail:"No connected plan was found for today.",
        route:item.key === "reading" ? "open-court"
          : item.key === "math" ? "eureka-math"
          : item.key === "science" ? "science-intelligence"
          : item.key === "writing" || item.key === "socialStudies" ? "afternoon-studios"
          : "lesson-plans"
      });
    });

    if (pendingPrints) {
      actions.push({
        priority:"high",
        title:"Finish Print Queue",
        detail:`${pendingPrints} item${pendingPrints === 1 ? "" : "s"} waiting.`,
        route:"print-center"
      });
    }

    if (missingAttachments) {
      actions.push({
        priority:"high",
        title:"Attach Missing Files",
        detail:`${missingAttachments} attachment${missingAttachments === 1 ? "" : "s"} need a file or link.`,
        route:"attachments"
      });
    }

    if (!groupReady) {
      actions.push({
        priority:"medium",
        title:"Prepare Small Groups",
        detail:"No group plan was found for today.",
        route:"small-groups"
      });
    }

    if (assessmentAttention) {
      actions.push({
        priority:"medium",
        title:"Review Assessments",
        detail:`${assessmentAttention} record${assessmentAttention === 1 ? "" : "s"} need attention.`,
        route:"assessments"
      });
    }

    if (curriculum.some(item => !item.ready)) {
      actions.unshift({priority:"high",title:"Run Curriculum Automation",detail:"Generate or update today's curriculum assignments.",route:"curriculum-automation"});
    }

    if (!actions.length) {
      actions.push({
        priority:"ready",
        title:"Today's Preparation Is Ready",
        detail:"No major readiness gaps were detected.",
        route:"teaching-engine"
      });
    }

    return {
      day,
      dayPlan,
      curriculum,
      pendingPrints,
      missingAttachments,
      assessmentAttention,
      groupReady,
      groupCount: groupKeys.length,
      students: Array.isArray(students) ? students.length : 0,
      engineStarted: Boolean(engine.started),
      completedBlocks,
      totalBlocks,
      score,
      actions
    };
  }

  function statusClass(score) {
    const ready = Number(config.rules?.readyScoreThreshold || 85);
    const warning = Number(config.rules?.warningScoreThreshold || 60);
    return score >= ready ? "ready" : score >= warning ? "warning" : "attention";
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $("#pageHost");
    if (!host) return;

    const s = buildSnapshot();
    const status = statusClass(s.score);

    host.innerHTML = `
      <section id="v166TeacherIntelligence" class="v166-intelligence">
        <section class="v166-hero">
          <div>
            <p>VERSION 16.6</p>
            <h1>Teacher Intelligence</h1>
            <span>${esc(todayLong())}</span>
          </div>
          <div class="button-row">
            <button data-go="teaching-engine" class="primary-button">Open Teaching Engine</button>
            <button id="v166Refresh" class="secondary-button">Refresh Readiness</button>
          </div>
        </section>

        <section class="v166-summary-grid">
          <article class="panel v166-score ${status}">
            <span>READINESS SCORE</span>
            <strong>${s.score}%</strong>
            <p>${status === "ready"
              ? "Your day is mostly prepared."
              : status === "warning"
                ? "A few items need preparation."
                : "Several areas need attention before teaching."}</p>
          </article>

          <article class="panel">
            <span>TEACHING ENGINE</span>
            <strong>${s.engineStarted ? `${s.completedBlocks}/${s.totalBlocks} complete` : "Not started"}</strong>
            <p>${s.engineStarted ? "Your teaching progress is saved." : "Start the engine when you are ready to teach."}</p>
          </article>

          <article class="panel">
            <span>STUDENT SUPPORT</span>
            <strong>${s.groupReady ? `${s.groupCount} group plan${s.groupCount === 1 ? "" : "s"}` : "Needs preparation"}</strong>
            <p>${s.students ? `${s.students} student record${s.students === 1 ? "" : "s"} available.` : "Student records can be added later."}</p>
          </article>

          <article class="panel">
            <span>PRODUCTION</span>
            <strong>${s.pendingPrints + s.missingAttachments} open item${s.pendingPrints + s.missingAttachments === 1 ? "" : "s"}</strong>
            <p>${s.pendingPrints} printing • ${s.missingAttachments} attachments</p>
          </article>
        </section>

        <section class="panel v166-actions">
          <div class="v166-heading">
            <div>
              <span>RECOMMENDED NEXT ACTIONS</span>
              <h2>What needs your attention</h2>
            </div>
          </div>
          <div class="v166-action-list">
            ${s.actions.map((action,index) => `
              <button data-go="${esc(action.route)}" class="${esc(action.priority)}">
                <b>${action.priority === "ready" ? "✓" : index + 1}</b>
                <div>
                  <strong>${esc(action.title)}</strong>
                  <span>${esc(action.detail)}</span>
                </div>
                <em>Open</em>
              </button>`).join("")}
          </div>
        </section>

        <section class="v166-main-grid">
          <article class="panel">
            <div class="v166-heading">
              <div>
                <span>CURRICULUM READINESS</span>
                <h2>Today's core lessons</h2>
              </div>
            </div>
            <div class="v166-check-list">
              ${s.curriculum.map(item => `
                <article class="${item.ready ? "ready" : "missing"}">
                  <b>${item.ready ? "✓" : "!"}</b>
                  <div>
                    <strong>${esc(item.label)}</strong>
                    <span>${item.ready ? esc(String(item.value).slice(0,120)) : "No connected plan found."}</span>
                  </div>
                </article>`).join("")}
            </div>
          </article>

          <article class="panel">
            <div class="v166-heading">
              <div>
                <span>READINESS DETAILS</span>
                <h2>Production and support</h2>
              </div>
            </div>
            <div class="v166-detail-grid">
              ${detailCard("Print Queue", s.pendingPrints === 0, s.pendingPrints === 0 ? "Clear" : `${s.pendingPrints} waiting`, "print-center")}
              ${detailCard("Lesson Attachments", s.missingAttachments === 0, s.missingAttachments === 0 ? "Ready" : `${s.missingAttachments} missing`, "attachments")}
              ${detailCard("Assessments", s.assessmentAttention === 0, s.assessmentAttention === 0 ? "Clear" : `${s.assessmentAttention} open`, "assessments")}
              ${detailCard("Small Groups", s.groupReady, s.groupReady ? `${s.groupCount} ready` : "Needs planning", "small-groups")}
            </div>
          </article>
        </section>

        <section class="panel v166-note">
          <strong>Current limitation</strong>
          <span>Version 16.6 reads the plans and resources currently stored in the system. Exact automatic district pacing will be added after the Padlet pacing guides are mapped and verified.</span>
        </section>
      </section>
    `;

    wire();
  }

  function detailCard(label, ready, value, target) {
    return `
      <button data-go="${target}" class="${ready ? "ready" : "attention"}">
        <b>${ready ? "✓" : "!"}</b>
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
      </button>`;
  }

  function wire() {
    $$("[data-go]").forEach(button => {
      button.addEventListener("click", () => location.hash = button.dataset.go);
    });

    $("#v166Refresh")?.addEventListener("click", render);
  }

  function takeControl() {
    injectNavigation();
    if (route() !== ROUTE) return;
    setTimeout(render, 25);
    setTimeout(render, 250);
  }

  async function boot() {
    try {
      const response = await fetch("teacher-intelligence-v166.json", { cache:"no-store" });
      if (response.ok) config = await response.json();
    } catch (error) {
      console.error(error);
    }

    takeControl();
  }

  window.THH_RENDER_TEACHER_INTELLIGENCE_V166 = render;
  window.addEventListener("hashchange", takeControl);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
