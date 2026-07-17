
(() => {
  "use strict";
  const ROUTE = "teaching-engine";
  const STORE_PREFIX = "thh-v165:teaching-engine:";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const ASSESSMENT_STORE = "thh-v142:assessment-records";
  const GROUP_STORE = "thh-v141:group-plans";
  const BLOCKS = [
    { id:"breakfast", start:"7:45", end:"8:10", title:"Breakfast", icon:"🥣", category:"Arrival", description:"Welcome students, support breakfast routines, and prepare for the instructional day." },
    { id:"morning-work", start:"8:10", end:"8:20", title:"Morning Work", icon:"✏️", category:"Launch", description:"Students complete the morning task while you take attendance and prepare materials." },
    { id:"mowr", start:"8:20", end:"9:15", title:"MOWR", icon:"📚", category:"Literacy", description:"Teacher table, UFLI, reading intervention, decodables, fluency, and small-group rotations." },
    { id:"heggerty", start:"9:15", end:"9:25", title:"Heggerty", icon:"👂", category:"Literacy", description:"Daily phonemic-awareness instruction immediately after MOWR." },
    { id:"phonics", start:"9:25", end:"9:45", title:"Open Court Phonics", icon:"🔤", category:"Literacy", description:"Sound/spelling work, blending, decoding, dictation, and high-frequency words." },
    { id:"vocabulary", start:"9:45", end:"9:55", title:"Open Court Vocabulary", icon:"💬", category:"Literacy", description:"Introduce and practice the lesson's vocabulary." },
    { id:"reading", start:"9:55", end:"10:45", title:"Reading & Responding", icon:"📖", category:"Literacy", description:"Read aloud, main selection, comprehension, discussion, and Open Court science connections." },
    { id:"lunch-recess", start:"10:45", end:"11:10", title:"Lunch & Recess", icon:"🍎", category:"Transition", description:"Lunch, recess, supervision, and transition back to class." },
    { id:"writing", start:"11:10", end:"11:40", title:"Writing", icon:"✍️", category:"Language Arts", description:"Building the Foundation writing curriculum. Open Court writing is not used." },
    { id:"math", start:"11:40", end:"12:40", title:"Eureka Math²", icon:"➗", category:"Math", description:"Core Eureka Math² lesson." },
    { id:"workout", start:"12:40", end:"1:15", title:"Workout", icon:"🏃", category:"Movement", description:"Class workout and movement block." },
    { id:"recess", start:"1:15", end:"1:20", title:"Recess", icon:"☀️", category:"Transition", description:"Brief recess and transition." },
    { id:"math-2", start:"1:20", end:"1:40", title:"Math 2", icon:"🧮", category:"Math", description:"Math recap, practice, intervention, or extension." },
    { id:"science", start:"1:40", end:"2:15", title:"Science", icon:"🔬", category:"Science", description:"Arizona science standards, McGraw-Hill workbook, investigations, and Open Court science connections." },
    { id:"social-studies", start:"2:15", end:"2:55", title:"Social Studies", icon:"🌎", category:"Social Studies", description:"Arizona social studies, iCivics, 180 Days, and Open Court cross-curricular connections." },
    { id:"pack-up", start:"2:55", end:"3:00", title:"Pack-Up", icon:"🎒", category:"Closing", description:"Organize materials and prepare for dismissal." },
    { id:"dismissal", start:"3:00", end:"3:30", title:"Dismissal", icon:"🚌", category:"Closing", description:"Bus, parent pickup, and end-of-day dismissal routines." }
  ];

  let literacyConfig = { blocks: {} };
  let afternoonConfig = { blocks: {} };
  let teacherIntelligenceConfig = { rules: {}, messages: {} };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  const dateKey = () => new Date().toISOString().slice(0,10);
  const storeKey = () => STORE_PREFIX + dateKey();
  const defaultState = () => ({ started:false, activeIndex:0, completed:{}, startedAt:null, lastOpenedAt:null });

  function readState() {
    try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(storeKey()) || "{}") }; }
    catch { return defaultState(); }
  }

  let state = readState();

  function readLocal(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function saveState() {
    state.lastOpenedAt = new Date().toISOString();
    localStorage.setItem(storeKey(), JSON.stringify(state));
  }

  const route = () => location.hash.replace("#","") || "dashboard";
  const todayLong = () => new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const completedCount = () => BLOCKS.filter(block => state.completed[block.id]).length;
  const progressPercent = () => Math.round((completedCount() / BLOCKS.length) * 100);
  const firstIncompleteIndex = () => {
    const index = BLOCKS.findIndex(block => !state.completed[block.id]);
    return index >= 0 ? index : BLOCKS.length - 1;
  };

  function injectNavigation() {
    const install = () => {
      if ($('[data-route="teaching-engine"]')) return;
      const groups = $$(".v110-nav-group");
      const todayGroup = groups.find(group => $(".v110-nav-heading span", group)?.textContent?.trim().toLowerCase() === "today");
      const body = todayGroup ? $(".v110-nav-body", todayGroup) : $("#mainNav");
      if (!body) { setTimeout(install, 120); return; }
      const button = document.createElement("button");
      button.className = "v110-route";
      button.dataset.route = ROUTE;
      button.innerHTML = `<span>▶️</span><strong>Teaching Engine</strong>`;
      button.addEventListener("click", () => location.hash = ROUTE);
      body.prepend(button);
    };
    install();
  }

  function startDay() {
    state.started = true;
    state.startedAt = state.startedAt || new Date().toISOString();
    state.activeIndex = firstIncompleteIndex();
    saveState();
    render();
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $("#pageHost");
    if (!host) return;
    state.started ? renderWorkspace(host) : renderLaunch(host);
  }

  function renderLaunch(host) {
    const resume = completedCount() > 0 || state.startedAt;
    host.innerHTML = `
      <section id="v165TeachingEngine" class="v165-engine">
        <section class="v165-launch-hero">
          <p>VERSION 16.5 • SPRINT 1</p>
          <h1>${resume ? "Resume Your Teaching Day" : "Start Your Teaching Day"}</h1>
          <span>${esc(todayLong())}</span>
          <div class="v165-launch-focus"><b>${BLOCKS.length}</b><span>instructional and transition blocks organized in your actual teaching order</span></div>
          <button id="v165StartDay" class="primary-button">${resume ? "Resume My Day" : "Start My Day"}</button>
          <button data-go="dashboard" class="secondary-button">Return to Dashboard</button>
        </section>
        <section class="v165-launch-grid">
          <article class="panel"><span>YOUR LITERACY ORDER</span><h3>MOWR → Heggerty → Phonics → Vocabulary → Reading</h3><p>The shell reflects the corrected sequence you use in class.</p></article>
          <article class="panel"><span>CURRICULUM RULE</span><h3>Building the Foundation replaces Open Court Writing</h3><p>Open Court science connections remain part of your science planning.</p></article>
          <article class="panel"><span>AUTOMATIC RESUME</span><h3>Your place is saved on this device</h3><p>Close the application and reopen it without losing the current block or progress.</p></article>
        </section>
        <section class="panel v165-preview">
          <div class="v165-heading"><div><span>TODAY'S TEACHING SEQUENCE</span><h2>Daily Timeline</h2></div></div>
          <div class="v165-preview-list">
            ${BLOCKS.map((block,index)=>`<article><b>${index+1}</b><span>${esc(block.start)}–${esc(block.end)}</span><strong>${block.icon} ${esc(block.title)}</strong></article>`).join("")}
          </div>
        </section>
      </section>`;
    $("#v165StartDay")?.addEventListener("click", startDay);
    $$("[data-go]").forEach(button => button.addEventListener("click",()=>location.hash=button.dataset.go));
  }

  function renderWorkspace(host) {
    const active = BLOCKS[state.activeIndex] || BLOCKS[0];
    const isComplete = Boolean(state.completed[active.id]);
    const percent = progressPercent();
    host.innerHTML = `
      <section id="v165TeachingEngine" class="v165-engine">
        <section class="v165-work-header">
          <div><p>${esc(todayLong())}</p><h1>Daily Teaching Engine</h1><span>${completedCount()} of ${BLOCKS.length} blocks complete</span></div>
          <div class="button-row"><button data-go="dashboard" class="secondary-button">Dashboard</button><button id="v165ResetDay" class="secondary-button">Reset Today</button></div>
        </section>
        <section class="panel v165-progress-panel">
          <div class="v165-heading"><div><span>TODAY'S PROGRESS</span><h2>${percent}% Complete</h2></div><strong>${completedCount()} / ${BLOCKS.length}</strong></div>
          <div class="v165-progress-track"><b style="width:${percent}%"></b></div>
        </section>
        <section class="v165-workspace-grid">
          <aside class="panel v165-timeline">
            <div class="v165-heading"><div><span>DAILY TIMELINE</span><h2>Teaching Order</h2></div></div>
            <div class="v165-timeline-list">
              ${BLOCKS.map((block,index)=>timelineItem(block,index)).join("")}
            </div>
          </aside>
          <main class="panel v165-current-block">
            <div class="v165-block-label"><span>${esc(active.category)}</span><strong>${esc(active.start)}–${esc(active.end)}</strong></div>
            <div class="v165-block-title"><b>${active.icon}</b><div><p>NOW TEACHING</p><h2>${esc(active.title)}</h2></div></div>
            <p class="v165-description">${esc(active.description)}</p>
            ${renderTeacherIntelligence(active)}
            ${renderConnectedWorkspace(active) || `
              <section class="v165-shell-notice"><span>SPRINT 1 SHELL</span><h3>This block remains ready for its curriculum connection.</h3><p>This block remains available for a future specialized connection.</p></section>
              <section class="v165-placeholder-grid">
                <article><span>OBJECTIVE</span><strong>Curriculum connection pending</strong></article>
                <article><span>MATERIALS</span><strong>Lesson attachments will appear here</strong></article>
                <article><span>TEACHER GUIDE</span><strong>Step-by-step prompts will appear here</strong></article>
                <article><span>STUDENT TASK</span><strong>Independent and group tasks will appear here</strong></article>
              </section>`}
            <section class="v165-controls">
              <button id="v165Previous" class="secondary-button" ${state.activeIndex===0?"disabled":""}>← Previous</button>
              <button id="v165Complete" class="${isComplete?"secondary-button":"primary-button"}">${isComplete?"Reopen This Block":"Mark Complete"}</button>
              <button id="v165Next" class="primary-button" ${state.activeIndex===BLOCKS.length-1?"disabled":""}>Next →</button>
            </section>
          </main>
        </section>
      </section>`;
    wireWorkspace();
    setTimeout(()=>$(".v165-timeline-list button.active")?.scrollIntoView({block:"nearest",behavior:"smooth"}),50);
  }

  function timelineItem(block,index) {
    const active = index===state.activeIndex;
    const complete = Boolean(state.completed[block.id]);
    return `<button class="${active?"active":""} ${complete?"complete":""}" data-index="${index}"><span>${complete?"✓":index+1}</span><div><small>${esc(block.start)}–${esc(block.end)}</small><strong>${block.icon} ${esc(block.title)}</strong></div></button>`;
  }

  function wireWorkspace() {
    $$("[data-index]").forEach(button=>button.addEventListener("click",()=>{state.activeIndex=Number(button.dataset.index);saveState();render();}));
    $("#v165Previous")?.addEventListener("click",()=>{state.activeIndex=Math.max(0,state.activeIndex-1);saveState();render();});
    $("#v165Next")?.addEventListener("click",()=>{state.activeIndex=Math.min(BLOCKS.length-1,state.activeIndex+1);saveState();render();});
    $("#v165Complete")?.addEventListener("click",()=>{
      const block=BLOCKS[state.activeIndex];
      state.completed[block.id]=!state.completed[block.id];
      if(state.completed[block.id] && state.activeIndex<BLOCKS.length-1) state.activeIndex+=1;
      saveState();render();
    });
    $("#v165ResetDay")?.addEventListener("click",()=>{
      if(!window.confirm("Reset today's Teaching Engine progress?")) return;
      state=defaultState();localStorage.removeItem(storeKey());render();
    });
    $$("[data-go]").forEach(button=>button.addEventListener("click",()=>location.hash=button.dataset.go));
    $$("[data-external]").forEach(button=>button.addEventListener("click",()=>window.open(button.dataset.external,"_blank","noopener")));
  }

  async function loadLiteracyConfig() {
    try {
      const response = await fetch("morning-literacy-v1652.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Morning Literacy data failed: ${response.status}`);
      literacyConfig = await response.json();
    } catch (error) {
      console.error(error);
      literacyConfig = { blocks: {} };
    }
  }

  async function loadAfternoonConfig() {
    try {
      const response = await fetch("afternoon-curriculum-v1653.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Afternoon Curriculum data failed: ${response.status}`);
      afternoonConfig = await response.json();
    } catch (error) {
      console.error(error);
      afternoonConfig = { blocks: {} };
    }
  }


  async function loadTeacherIntelligenceConfig() {
    try {
      const response = await fetch("teacher-intelligence-v1654.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`Teacher Intelligence data failed: ${response.status}`);
      teacherIntelligenceConfig = await response.json();
    } catch (error) {
      console.error(error);
      teacherIntelligenceConfig = { rules: {}, messages: {} };
    }
  }

  function intelligenceFor(block) {
    const plan = readLocal(WEEK_STORE, { days: {} });
    const attachments = readLocal(ATTACHMENT_STORE, []);
    const prints = readLocal(PRINT_STORE, []);
    const assessments = readLocal(ASSESSMENT_STORE, []);
    const groups = readLocal(GROUP_STORE, {});
    const weekday = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const dayPlan = plan.days?.[weekday] || {};

    const subjectMap = {
      "morning-work": "morningWork",
      "mowr": "mowr",
      "heggerty": "heggerty",
      "phonics": "phonics",
      "vocabulary": "vocabulary",
      "reading": "reading",
      "writing": "writing",
      "math": "math",
      "math-2": "math2",
      "science": "science",
      "social-studies": "socialStudies"
    };

    const planKey = subjectMap[block.id];
    const planReady = !planKey || Boolean(dayPlan[planKey] || dayPlan[block.id]);

    const pendingPrints = Array.isArray(prints)
      ? prints.filter(item => !item.complete && (!item.day || item.day === weekday)).length
      : 0;

    const missingAttachments = Array.isArray(attachments)
      ? attachments.filter(item =>
          (item.status === "Missing Link" || (!(item.url || item.fileName) && item.print)) &&
          (!item.day || item.day === weekday)
        ).length
      : 0;

    const assessmentAttention = Array.isArray(assessments)
      ? assessments.filter(item =>
          ["Not Started", "Needs Make-Up", "Scheduled"].includes(item.status)
        ).length
      : 0;

    const groupReady = Object.keys(groups || {}).some(key => key.endsWith("|" + weekday));

    const alerts = [];

    if (!planReady) {
      alerts.push({
        type: "planning",
        label: teacherIntelligenceConfig.messages?.noPlan || "This block does not yet have a connected daily plan.",
        route: teacherIntelligenceConfig.rules?.planning?.route || "lesson-plans",
        priority: "high"
      });
    }

    if (pendingPrints > 0) {
      alerts.push({
        type: "printing",
        label: `${pendingPrints} ${pendingPrints === 1 ? "print item is" : "print items are"} waiting.`,
        route: teacherIntelligenceConfig.rules?.printQueue?.route || "print-center",
        priority: "high"
      });
    }

    if (missingAttachments > 0) {
      alerts.push({
        type: "attachments",
        label: `${missingAttachments} ${missingAttachments === 1 ? "attachment needs" : "attachments need"} a file or link.`,
        route: teacherIntelligenceConfig.rules?.attachments?.route || "attachments",
        priority: "high"
      });
    }

    if (assessmentAttention > 0 && ["phonics","vocabulary","reading","math","science"].includes(block.id)) {
      alerts.push({
        type: "assessments",
        label: `${assessmentAttention} assessment ${assessmentAttention === 1 ? "record needs" : "records need"} attention.`,
        route: teacherIntelligenceConfig.rules?.assessments?.route || "assessments",
        priority: "medium"
      });
    }

    if (block.id === "mowr") {
      alerts.push({
        type: "groups",
        label: groupReady
          ? (teacherIntelligenceConfig.messages?.smallGroupsReady || "Small-group support is available.")
          : (teacherIntelligenceConfig.messages?.smallGroupsMissing || "Today's small-group plan may need preparation."),
        route: teacherIntelligenceConfig.rules?.smallGroups?.route || "small-groups",
        priority: groupReady ? "low" : "medium",
        ready: groupReady
      });
    }

    return {
      planReady,
      pendingPrints,
      missingAttachments,
      assessmentAttention,
      groupReady,
      alerts
    };
  }

  function renderTeacherIntelligence(block) {
    const info = intelligenceFor(block);
    const highPriority = info.alerts.filter(alert => alert.priority === "high").length;
    const ready = highPriority === 0 && info.planReady;

    return `
      <section class="v1654-intelligence ${ready ? "ready" : "attention"}">
        <div class="v1654-intelligence-heading">
          <div>
            <span>TEACHER INTELLIGENCE</span>
            <h3>${ready
              ? (teacherIntelligenceConfig.messages?.allReady || "You're ready for this block.")
              : `${info.alerts.length} item${info.alerts.length === 1 ? "" : "s"} to review`}</h3>
          </div>
          <b>${ready ? "✓" : "!"}</b>
        </div>

        <div class="v1654-status-grid">
          <article class="${info.planReady ? "ready" : "attention"}">
            <span>PLAN</span>
            <strong>${info.planReady ? "Ready" : "Needs Review"}</strong>
          </article>
          <article class="${info.pendingPrints === 0 ? "ready" : "attention"}">
            <span>PRINTING</span>
            <strong>${info.pendingPrints === 0 ? "Clear" : `${info.pendingPrints} Waiting`}</strong>
          </article>
          <article class="${info.missingAttachments === 0 ? "ready" : "attention"}">
            <span>ATTACHMENTS</span>
            <strong>${info.missingAttachments === 0 ? "Ready" : `${info.missingAttachments} Missing`}</strong>
          </article>
          <article class="${info.assessmentAttention === 0 ? "ready" : "attention"}">
            <span>ASSESSMENTS</span>
            <strong>${info.assessmentAttention === 0 ? "Clear" : `${info.assessmentAttention} Open`}</strong>
          </article>
        </div>

        ${info.alerts.length ? `
          <div class="v1654-alert-list">
            ${info.alerts.map(alert => `
              <button data-go="${esc(alert.route)}" class="${alert.ready ? "ready" : alert.priority}">
                <b>${alert.ready ? "✓" : alert.priority === "high" ? "!" : "•"}</b>
                <span>${esc(alert.label)}</span>
                <strong>Open</strong>
              </button>`).join("")}
          </div>` : `
          <div class="v1654-all-ready">
            <b>✓</b>
            <span>No preparation alerts for this block.</span>
          </div>`}
      </section>`;
  }

  function connectedDetails(blockId) {
    return literacyConfig.blocks?.[blockId] || afternoonConfig.blocks?.[blockId] || null;
  }

  function renderConnectedWorkspace(block) {
    const details = connectedDetails(block.id);
    if (!details) return null;
    const groups = details.groups || [];
    const links = details.quickLinks || [];
    return `
      <section class="v1652-literacy-workspace">
        <section class="v1652-info-grid">
          <article><span>OBJECTIVE</span><strong>${esc(details.objective || "")}</strong></article>
          <article><span>MATERIALS</span><ul>${(details.materials || []).map(item => `<li>${esc(item)}</li>`).join("")}</ul></article>
        </section>
        <section class="v1652-teacher-flow"><span>TEACHER FLOW</span><ol>${(details.teacherSteps || []).map(step => `<li>${esc(step)}</li>`).join("")}</ol></section>
        ${groups.length ? `<section class="v1652-group-grid">${groups.map(group => `<article><strong>${esc(group.name)}</strong><span>${esc(group.focus)}</span></article>`).join("")}</section>` : ""}
        <section class="v1652-student-task"><span>STUDENT TASK</span><strong>${esc(details.studentTask || "")}</strong></section>
        <section class="v1652-quick-links">${links.map(link => link.url ? `<button data-external="${esc(link.url)}">${esc(link.label)} ↗</button>` : `<button data-go="${esc(link.route)}">${esc(link.label)}</button>`).join("")}</section>
      </section>`;
  }

  function takeControl() {
    injectNavigation();
    if(route()!==ROUTE) return;
    state=readState();
    setTimeout(render,25);
    setTimeout(render,250);
  }

  window.THH_RENDER_TEACHING_ENGINE=render;
  window.addEventListener("hashchange",takeControl);
  async function boot() { await loadLiteracyConfig(); takeControl(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
})();
