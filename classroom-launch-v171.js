
(() => {
  "use strict";

  const START = "2026-07-27";
  const END = "2026-07-31";
  const CORE_START = "2026-08-03";
  const ROUTE = "dashboard";
  const STORE = "thh-v171:classroom-launch";
  const WEEK_STORE = "thh-v73:weekly-plan";

  let data = null;
  let state = {
    date: new Date().toISOString().slice(0,10),
    completed: {},
    notes: {}
  };

  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function read(key,fallback){
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  function save(){ localStorage.setItem(STORE, JSON.stringify(state)); }
  function route(){ return location.hash.replace("#","") || "dashboard"; }
  function isLaunchDate(value){ return value >= START && value <= END; }
  function dayName(value){ return new Date(`${value}T12:00:00`).toLocaleDateString("en-US",{weekday:"long"}); }
  function longDate(value){ return new Date(`${value}T12:00:00`).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}); }

  function dayPlan(){
    return data?.days?.[dayName(state.date)] || data?.days?.Monday || {focus:"",blocks:{}};
  }

  function saveToWeeklyPlanning(){
    const plan = read(WEEK_STORE,{});
    if (!plan.days) plan.days = {};
    const day = dayName(state.date);
    const launch = dayPlan();

    plan.days[day] = {
      ...(plan.days[day] || {}),
      classroomLaunch: true,
      noCoreCurriculum: true,
      weeklyObjective: "Students will learn and practice classroom routines, expectations, rules, consequences, and schedule procedures.",
      reading: "Classroom Launch: read aloud, listening stamina, partner talk, and book-care routines.",
      readingObjective: launch.blocks["Reading"] || "",
      math: "Classroom Launch: math routines, materials, partner roles, and simple review games. No Eureka Math² lesson.",
      mathObjective: launch.blocks["Math"] || "",
      science: "Classroom Launch: safety, observation, questions, materials, and cleanup. No science workbook lesson.",
      scienceObjective: launch.blocks["Science"] || "",
      socialStudies: "Classroom Launch: classroom community, rules, responsibilities, and problem solving. No formal curriculum lesson.",
      afternoon: "Classroom Launch: routines and community building. No core curriculum.",
      launchFocus: launch.focus,
      launchBlocks: launch.blocks
    };

    localStorage.setItem(WEEK_STORE,JSON.stringify(plan));
  }

  function render(){
    if (route() !== ROUTE || !isLaunchDate(state.date)) return;
    const host = $("#pageHost");
    if (!host) return;

    const launch = dayPlan();
    const checks = state.completed[state.date] || {};
    const entries = Object.entries(launch.blocks || {});
    const completeCount = entries.filter(([key]) => checks[key]).length;
    const percent = entries.length ? Math.round((completeCount / entries.length) * 100) : 0;

    host.innerHTML = `
      <section id="v171ClassroomLaunch">
        <section class="v171-hero">
          <div>
            <p>CLASSROOM LAUNCH — NO CORE CURRICULUM</p>
            <h1>${esc(longDate(state.date))}</h1>
            <span>${esc(launch.focus)}</span>
            <strong>Students follow the normal schedule while learning how to succeed in each block.</strong>
          </div>
          <div class="v171-actions">
            <button id="v171SavePlan" class="primary-button">Send to Weekly Planning</button>
            <button id="v171OpenLaunch" class="secondary-button">Open Classroom Launch</button>
          </div>
        </section>

        <section class="panel v171-status">
          <label><span>Launch Date</span><input id="v171Date" type="date" min="${START}" max="${END}" value="${esc(state.date)}"></label>
          <article><span>CORE CURRICULUM</span><strong>Locked until August 3</strong></article>
          <article><span>ROUTINES COMPLETE</span><strong>${percent}%</strong><div><b style="width:${percent}%"></b></div></article>
        </section>

        <section class="v171-notice">
          <strong>No Open Court, Eureka Math², science workbook, social studies curriculum, formal phonics, vocabulary, or writing-curriculum lessons should appear this week.</strong>
          <span>Each scheduled block is used to teach and practice the routines for that subject or transition.</span>
        </section>

        <section class="v171-blocks">
          ${entries.map(([block,description]) => `
            <article class="panel ${checks[block] ? "complete" : ""}">
              <label>
                <input type="checkbox" data-v171-block="${esc(block)}" ${checks[block] ? "checked" : ""}>
                <span>${esc(block)}</span>
              </label>
              <p>${esc(description)}</p>
              <button class="secondary-button" data-v171-practice="${esc(block)}">Practice This Block</button>
            </article>`).join("")}
        </section>

        <section class="v171-bottom">
          <article class="panel">
            <h2>Rules, Expectations & Consequences</h2>
            <div class="v171-tags">
              <span>Be safe</span><span>Be respectful</span><span>Be responsible</span>
              <span>Follow directions</span><span>Use voice levels</span><span>Try again after mistakes</span>
            </div>
            <p>Use positive reinforcement, reminders, reteaching, reflection, logical consequences, and opportunities to repair harm.</p>
          </article>

          <article class="panel">
            <div class="v171-section-head"><h2>Teacher Notes</h2><button id="v171SaveNotes" class="secondary-button">Save Notes</button></div>
            <textarea id="v171Notes" placeholder="Which routines need more practice? Which students need extra support?">${esc(state.notes[state.date] || "")}</textarea>
          </article>
        </section>
      </section>
    `;

    wire();
  }

  function wire(){
    $("#v171Date")?.addEventListener("change",event => {
      state.date = event.target.value;
      save();
      render();
    });

    $("#v171SavePlan")?.addEventListener("click",() => {
      saveToWeeklyPlanning();
      notify("Classroom Launch plan sent to Weekly Planning.");
    });

    $("#v171OpenLaunch")?.addEventListener("click",() => {
      location.hash = "classroom-launch";
    });

    $$("[data-v171-block]").forEach(input => {
      input.addEventListener("change",() => {
        state.completed[state.date] = state.completed[state.date] || {};
        state.completed[state.date][input.dataset.v171Block] = input.checked;
        save();
        render();
      });
    });

    $$("[data-v171-practice]").forEach(button => {
      button.addEventListener("click",() => {
        notify(`Ready to practice: ${button.dataset.v171Practice}`);
      });
    });

    $("#v171SaveNotes")?.addEventListener("click",() => {
      state.notes[state.date] = $("#v171Notes")?.value || "";
      save();
      notify("Classroom Launch notes saved.");
    });
  }

  function notify(message){
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"),1800);
  }

  function protectCoreRoutes(){
    if (!isLaunchDate(state.date)) return;
    const r = route();
    const blocked = ["open-court","eureka-math","science-intelligence"];
    if (blocked.includes(r)){
      location.hash = "dashboard";
      setTimeout(() => notify("Core curriculum is locked during Classroom Launch Week."),150);
    }
  }

  async function init(){
    try {
      data = await fetch("classroom-launch-v171.json",{cache:"no-store"}).then(r => r.json());
    } catch {
      data = {days:{}};
    }

    state = {...state,...read(STORE,{})};
    if (!state.completed) state.completed = {};
    if (!state.notes) state.notes = {};

    // When arriving during launch week, use the actual launch date when possible.
    const today = new Date().toISOString().slice(0,10);
    if (isLaunchDate(today)) state.date = today;
    if (!isLaunchDate(state.date)) state.date = START;

    protectCoreRoutes();
    if (route() === ROUTE) {
      setTimeout(render,30);
      setTimeout(render,300);
    }
  }

  window.addEventListener("hashchange",() => {
    protectCoreRoutes();
    if (route() === ROUTE) {
      setTimeout(render,30);
      setTimeout(render,300);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init);
  } else {
    init();
  }
})();
