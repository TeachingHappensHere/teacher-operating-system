
(function(){
  "use strict";

  const STORAGE_KEY="thh-v57:daily-command-state";
  let data, overlay, state;

  const esc=value=>String(value??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-v5-7.css";
    document.head.appendChild(css);

    try{
      data=await (await fetch("daily-command-center-v5-7.json",{cache:"no-store"})).json();
      loadState();
      build();
      addButton();
      addDashboardShortcut();
    }catch(error){
      console.warn("Version 5.7 could not load.",error);
    }
  }

  function todayKey(){
    return new Date().toISOString().slice(0,10);
  }

  function loadState(){
    try{
      state=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");
    }catch{
      state={};
    }

    if(!state.days)state.days={};
    if(!state.days[todayKey()]){
      state.days[todayKey()]={
        tasks:[],
        reflection:"",
        completedSections:{},
        customNotes:"",
        createdAt:new Date().toISOString()
      };
      saveState();
    }
  }

  function dayState(){
    return state.days[todayKey()];
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  }

  function safeJSON(key){
    try{
      return JSON.parse(localStorage.getItem(key)||"null");
    }catch{
      return null;
    }
  }

  function getWeeklyPlan(){
    return safeJSON("thh-v53:active-week");
  }

  function getReteach(){
    return safeJSON("thh-v54:teachday-next-step") || safeJSON("thh-v54:planner-next-step");
  }

  function getStudentSupport(){
    return safeJSON("thh-v55:teachday-support") || safeJSON("thh-v55:small-group-support");
  }

  function getStandardAlert(){
    return safeJSON("thh-v56:assessment-standard") || safeJSON("thh-v56:planner-standard");
  }

  function getConferenceReport(){
    return safeJSON("thh-v56:conference-report");
  }

  function currentWeekDay(){
    return new Date().toLocaleDateString("en-US",{weekday:"long"});
  }

  function currentWeeklyDay(){
    const week=getWeeklyPlan();
    if(!week?.days?.length)return null;

    const name=currentWeekDay();
    return week.days.find(day=>day.day===name) || week.days[0];
  }

  function build(){
    overlay=document.createElement("div");
    overlay.className="v57-overlay";
    overlay.innerHTML=`
      <section class="v57-dialog">
        <header>
          <div>
            <p>VERSION 5.7</p>
            <h2>Daily Command Center</h2>
            <span>${esc(data.releaseStatus)}</span>
          </div>
          <button id="v57Close">×</button>
        </header>

        <div class="v57-datebar">
          <div>
            <strong id="v57Today"></strong>
            <span id="v57Greeting"></span>
          </div>
          <div class="v57-date-actions">
            <button id="v57Refresh">Refresh Sources</button>
            <button id="v57Print">Print Daily Brief</button>
            <button id="v57ResetDay">Reset Today</button>
          </div>
        </div>

        <div id="v57Stats" class="v57-stats"></div>

        <main id="v57Content" class="v57-content"></main>

        <footer>
          <span id="v57Status">Ready</span>
          <span>TeachingHappensHere v5.7</span>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    document.getElementById("v57Close").onclick=close;
    document.getElementById("v57Refresh").onclick=render;
    document.getElementById("v57Print").onclick=()=>window.print();
    document.getElementById("v57ResetDay").onclick=resetToday;
    overlay.onclick=event=>{if(event.target===overlay)close()};

    render();
  }

  function teachingBlocks(day){
    if(!day?.blocks?.length){
      return `<div class="v57-empty">
        <strong>No weekly plan is connected yet.</strong>
        <p>Open Weekly Planner and choose Send Week to Teach My Day.</p>
        <button data-open-system="weeklyPlannerButton">Open Weekly Planner</button>
      </div>`;
    }

    return day.blocks.map((block,index)=>`
      <article class="v57-teaching-block">
        <label>
          <input type="checkbox" data-v57-task="teaching-${index}"
            ${isDone(`teaching-${index}`)?"checked":""}>
          <div>
            <strong>${esc(block.time)} • ${esc(block.subject)}</strong>
            <p>${esc(block.task)}</p>
          </div>
        </label>
      </article>`).join("");
  }

  function priorityCards(){
    const cards=[];
    const reteach=getReteach();
    const student=getStudentSupport();
    const standard=getStandardAlert();
    const week=getWeeklyPlan();

    if(reteach){
      cards.push({
        id:"priority-reteach",
        priority:"High",
        title:`Reteach: ${reteach.skillTitle||reteach.title||"Skill Support"}`,
        text:`${reteach.group||""} ${reteach.action||""}`.trim(),
        button:"assessmentReteachButton",
        linkText:"Open Assessment & Reteach"
      });
    }

    if(student){
      cards.push({
        id:"priority-student",
        priority:"High",
        title:`Follow Up: ${student.studentName||"Student"}`,
        text:`${student.group||""} • ${student.skill||""} • ${student.nextStep||student.goal||""}`,
        button:"studentSupportFamilyButton",
        linkText:"Open Student Support"
      });
    }

    if(standard){
      cards.push({
        id:"priority-standard",
        priority:"Medium",
        title:`Standards Evidence: ${standard.title||"Standard"}`,
        text:`${standard.subject||""} • ${standard.status||""} • Evidence: ${standard.evidenceCount??0}`,
        button:"standardsReportingButton",
        linkText:"Open Standards & Reports"
      });
    }

    if(week){
      cards.push({
        id:"priority-week",
        priority:"Medium",
        title:week.templateTitle||"Active Weekly Plan",
        text:`Connected ${new Date(week.sentAt).toLocaleDateString()}`,
        button:"weeklyPlannerButton",
        linkText:"Open Weekly Planner"
      });
    }

    if(!cards.length){
      return `<div class="v57-empty"><strong>No synced priorities yet.</strong><p>As you send plans and next steps from other systems, they will appear here.</p></div>`;
    }

    return cards.map(card=>`
      <article class="v57-priority priority-${card.priority.toLowerCase()}">
        <label>
          <input type="checkbox" data-v57-task="${card.id}" ${isDone(card.id)?"checked":""}>
          <div>
            <span>${esc(card.priority)} Priority</span>
            <strong>${esc(card.title)}</strong>
            <p>${esc(card.text)}</p>
          </div>
        </label>
        <button data-open-system="${card.button}">${esc(card.linkText)}</button>
      </article>`).join("");
  }

  function printTasks(day){
    const items=[...(day?.printNeeds||[])];

    const reteach=getReteach();
    if(reteach?.tools)items.push(...reteach.tools);

    const student=getStudentSupport();
    if(student?.supports)items.push(...student.supports);

    const unique=[...new Set(items.filter(Boolean))];

    if(!unique.length){
      return `<div class="v57-empty"><strong>No print or preparation items are synced.</strong></div>`;
    }

    return unique.map((item,index)=>`
      <label class="v57-check">
        <input type="checkbox" data-v57-task="print-${index}" ${isDone(`print-${index}`)?"checked":""}>
        <span>${esc(item)}</span>
      </label>`).join("");
  }

  function studentFollowUp(){
    const support=getStudentSupport();
    const conference=getConferenceReport();

    if(!support&&!conference){
      return `<div class="v57-empty"><strong>No student follow-up is synced.</strong><p>Send a profile from Student Support or a conference report from Standards & Reports.</p></div>`;
    }

    return `
      ${support?`
        <article class="v57-followup-card">
          <strong>${esc(support.studentName||"Student")}</strong>
          <p><b>Group:</b> ${esc(support.group||"")}</p>
          <p><b>Skill:</b> ${esc(support.skill||"")}</p>
          <p><b>Goal:</b> ${esc(support.goal||"")}</p>
          <p><b>Next Step:</b> ${esc(support.nextStep||"")}</p>
          <p><b>Follow-Up:</b> ${esc(support.followUpDate||"Not set")}</p>
        </article>`:""}
      ${conference?`
        <article class="v57-followup-card">
          <strong>${esc(conference.studentName||"Conference Student")}</strong>
          <p><b>Standard:</b> ${esc(conference.standardTitle||"")}</p>
          <p><b>Level:</b> ${esc(conference.level||"")}</p>
          <p>${esc(conference.comment||"")}</p>
        </article>`:""}`;
  }

  function assessmentPanel(){
    const reteach=getReteach();

    if(!reteach){
      return `<div class="v57-empty"><strong>No assessment action is synced.</strong><p>Analyze a result in Assessment & Reteach and send it to Teach My Day.</p></div>`;
    }

    return `
      <div class="v57-assessment-card">
        <div class="v57-score-ring">
          <strong>${reteach.score??"—"}${reteach.score!==undefined?"%":""}</strong>
          <span>${esc(reteach.level||"Next Step")}</span>
        </div>
        <div>
          <h3>${esc(reteach.skillTitle||reteach.title||"Assessment Follow-Up")}</h3>
          <p><b>Recommended Group:</b> ${esc(reteach.group||"")}</p>
          <p>${esc(reteach.action||"")}</p>
          <div class="v57-chip-row">${(reteach.tools||[]).map(tool=>`<span>${esc(tool)}</span>`).join("")}</div>
        </div>
      </div>`;
  }

  function standardsPanel(){
    const standard=getStandardAlert();

    if(!standard){
      return `<div class="v57-empty"><strong>No standards alert is synced.</strong><p>Send a standard from Standards & Reports.</p></div>`;
    }

    return `
      <article class="v57-standard-card">
        <span>${esc(standard.subject||"Standard")}</span>
        <h3>${esc(standard.title||"")}</h3>
        <code>${esc(standard.code||"")}</code>
        <p><b>Status:</b> ${esc(standard.status||"")}</p>
        <p><b>Evidence Records:</b> ${standard.evidenceCount??0}</p>
        <p><b>Connected Lessons:</b> ${(standard.lessons||[]).map(esc).join(", ")||"None recorded"}</p>
      </article>`;
  }

  function communicationPanel(){
    const student=getStudentSupport();
    const due=student?.followUpDate;

    return `
      <div class="v57-communication-grid">
        <article>
          <strong>Positive Message</strong>
          <p>Send one positive family message today.</p>
          <label class="v57-check">
            <input type="checkbox" data-v57-task="communication-positive"
              ${isDone("communication-positive")?"checked":""}>
            <span>Positive message completed</span>
          </label>
        </article>
        <article>
          <strong>Instructional Follow-Up</strong>
          <p>${student
            ? `${esc(student.studentName||"Student")} • Follow-up ${esc(due||"date not set")}`
            : "No student follow-up is currently synced."}</p>
          <button data-open-system="studentSupportFamilyButton">Open Student Support</button>
        </article>
        <article>
          <strong>Communication Hub</strong>
          <p>Create a Dojo message, email, newsletter, or conference note.</p>
          <button data-page-target="communication">Open Communication Hub</button>
        </article>
      </div>`;
  }

  function reflectionPanel(){
    return `
      <div class="v57-reflection-prompts">
        ${data.reflectionPrompts.map(prompt=>`<span>${esc(prompt)}</span>`).join("")}
      </div>
      <textarea id="v57Reflection" placeholder="End-of-day reflection...">${esc(dayState().reflection||"")}</textarea>
      <textarea id="v57CustomNotes" placeholder="Tomorrow's preparation, reminders, and Future Jennifer notes...">${esc(dayState().customNotes||"")}</textarea>
      <button id="v57SaveReflection">Save Reflection</button>`;
  }

  function section(id,title,body,buttonId="",buttonText=""){
    return `
      <section class="v57-section" data-v57-section="${id}">
        <header>
          <div>
            <label>
              <input type="checkbox" data-v57-section-complete="${id}"
                ${dayState().completedSections[id]?"checked":""}>
              <h2>${esc(title)}</h2>
            </label>
          </div>
          ${buttonId?`<button data-open-system="${buttonId}">${esc(buttonText)}</button>`:""}
        </header>
        <div class="v57-section-body">${body}</div>
      </section>`;
  }

  function render(){
    const weeklyDay=currentWeeklyDay();
    const date=new Date();

    document.getElementById("v57Today").textContent=date.toLocaleDateString("en-US",{
      weekday:"long",month:"long",day:"numeric",year:"numeric"
    });

    const hour=date.getHours();
    document.getElementById("v57Greeting").textContent=
      hour<12?"Good morning, Mrs. Parrish.":hour<17?"Good afternoon, Mrs. Parrish.":"Good evening, Mrs. Parrish.";

    document.getElementById("v57Content").innerHTML=[
      section("teaching","Today's Teaching",teachingBlocks(weeklyDay),"weeklyPlannerButton","Open Weekly Planner"),
      section("priorities","Priority Actions",priorityCards()),
      section("print","Print & Prep",printTasks(weeklyDay),"curriculumIntegrationButton","Open Resources"),
      section("students","Student Follow-Ups",studentFollowUp(),"studentSupportFamilyButton","Open Student Support"),
      section("assessment","Assessment & Reteach",assessmentPanel(),"assessmentReteachButton","Open Assessment"),
      section("standards","Standards Evidence",standardsPanel(),"standardsReportingButton","Open Standards"),
      section("communication","Family Communication",communicationPanel()),
      section("reflection","End-of-Day Reflection",reflectionPanel())
    ].join("");

    wire();
    updateStats();
    setStatus("Daily Command Center refreshed.");
  }

  function wire(){
    document.querySelectorAll("[data-v57-task]").forEach(input=>{
      input.onchange=()=>{
        setDone(input.dataset.v57Task,input.checked);
        updateStats();
      };
    });

    document.querySelectorAll("[data-v57-section-complete]").forEach(input=>{
      input.onchange=()=>{
        dayState().completedSections[input.dataset.v57SectionComplete]=input.checked;
        saveState();
        updateStats();
      };
    });

    document.querySelectorAll("[data-open-system]").forEach(button=>{
      button.onclick=()=>{
        close();
        document.getElementById(button.dataset.openSystem)?.click();
      };
    });

    document.querySelectorAll("[data-page-target]").forEach(button=>{
      button.onclick=()=>{
        close();
        document.querySelector(`[data-page="${button.dataset.pageTarget}"]`)?.click();
      };
    });

    document.getElementById("v57SaveReflection").onclick=()=>{
      dayState().reflection=document.getElementById("v57Reflection").value.trim();
      dayState().customNotes=document.getElementById("v57CustomNotes").value.trim();
      saveState();
      setStatus("Reflection saved.");
    };
  }

  function isDone(id){
    return dayState().tasks.includes(id);
  }

  function setDone(id,done){
    const tasks=new Set(dayState().tasks);
    if(done)tasks.add(id);else tasks.delete(id);
    dayState().tasks=[...tasks];
    saveState();
  }

  function updateStats(){
    const stats=document.getElementById("v57Stats");
    if(!stats)return;

    const taskInputs=[...document.querySelectorAll("[data-v57-task]")];
    const completed=taskInputs.filter(input=>input.checked).length;
    const sectionsCompleted=Object.values(dayState().completedSections).filter(Boolean).length;
    const reteach=getReteach();
    const student=getStudentSupport();
    const standard=getStandardAlert();

    stats.innerHTML=`
      <article><strong>${completed}/${taskInputs.length}</strong><span>Tasks Complete</span></article>
      <article><strong>${sectionsCompleted}/${data.defaultSections.length}</strong><span>Sections Complete</span></article>
      <article class="${reteach?"alert":""}"><strong>${reteach?1:0}</strong><span>Reteach Alerts</span></article>
      <article class="${student?"alert":""}"><strong>${student?1:0}</strong><span>Student Follow-Ups</span></article>
      <article class="${standard?"alert":""}"><strong>${standard?1:0}</strong><span>Standards Alerts</span></article>
      <article><strong>${currentWeeklyDay()?.blocks?.length||0}</strong><span>Teaching Blocks</span></article>`;
  }

  function resetToday(){
    if(!confirm("Reset today's completed tasks, section checks, and reflection?"))return;

    state.days[todayKey()]={
      tasks:[],
      reflection:"",
      completedSections:{},
      customNotes:"",
      createdAt:new Date().toISOString()
    };
    saveState();
    render();
  }

  function addButton(){
    const button=document.createElement("button");
    button.id="dailyCommandCenterButton";
    button.className="v57-button";
    button.innerHTML="<span>5.7</span><strong>Daily Command Center</strong><small>Today</small>";
    button.onclick=open;

    const prior=document.getElementById("standardsReportingButton");
    if(prior)prior.insertAdjacentElement("afterend",button);
    else document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",button);
  }

  function addDashboardShortcut(){
    const dashboard=document.getElementById("dashboard");
    if(!dashboard||document.getElementById("v57DashboardCard"))return;

    const card=document.createElement("section");
    card.id="v57DashboardCard";
    card.className="v57-dashboard-card";
    card.innerHTML=`
      <div>
        <p>DAILY COMMAND CENTER</p>
        <h2>What needs your attention today?</h2>
        <span>Teaching blocks, student follow-ups, reteach, standards, communication, and preparation.</span>
      </div>
      <button>Open Today's Command Center</button>`;

    card.querySelector("button").onclick=open;
    dashboard.prepend(card);
  }

  function open(){
    overlay.classList.add("open");
    document.body.classList.add("v57-open");
    render();
  }

  function close(){
    overlay.classList.remove("open");
    document.body.classList.remove("v57-open");
  }

  function setStatus(message){
    const status=document.getElementById("v57Status");
    if(status)status.textContent=message;
  }

  document.addEventListener("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="d"){
      event.preventDefault();
      if(overlay)open();
    }
    if(event.key==="Escape"&&overlay?.classList.contains("open"))close();
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
