
(function(){
  "use strict";

  let config;
  let overlay;

  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-rc1.css";
    document.head.appendChild(css);

    try{
      config=await (await fetch("release-candidate-rc1.json",{cache:"no-store"})).json();
      removeLegacyLaunch();
      createRC1Shell();
      createSidebarButton();
      createDashboardBanner();
      patchVersion60Tabs();
      registerHealthShortcut();
    }catch(error){
      console.warn("RC1 could not initialize.",error);
    }
  }

  function normalize(text){
    return String(text||"").replace(/\s+/g," ").trim().toLowerCase();
  }

  function removeLegacyLaunch(){
    const candidates=[...document.querySelectorAll("button,a,[data-page],.nav-item,.sidebar-item,li")];

    candidates.forEach(element=>{
      const text=normalize(element.textContent);
      const isLegacy=
        text==="classroom launch" ||
        text.includes("classroom launch mode") ||
        text.includes("version 3.2");

      if(!isLegacy)return;

      const isV60 =
        element.id==="classroomLaunchV60Button" ||
        element.closest("#classroomLaunchV60Button") ||
        text.includes("6.0");

      if(isV60)return;

      if(element.matches("[data-page]")){
        element.hidden=true;
        element.setAttribute("aria-hidden","true");
        element.dataset.rc1LegacyHidden="true";
      }else if(
        element.matches("button,a,.nav-item,.sidebar-item,li") &&
        element.textContent.trim().length < 120
      ){
        element.hidden=true;
        element.setAttribute("aria-hidden","true");
        element.dataset.rc1LegacyHidden="true";
      }
    });

    const oldPage=[...document.querySelectorAll(".page,section[id],main[id]")].find(element=>{
      const text=normalize(element.textContent);
      return text.includes("version 3.2") && text.includes("classroom launch mode");
    });

    if(oldPage){
      oldPage.hidden=true;
      oldPage.classList.remove("active");
      oldPage.dataset.rc1LegacyHidden="true";
    }
  }

  function createSidebarButton(){
    if(document.getElementById("rc1LaunchButton"))return;

    const button=document.createElement("button");
    button.id="rc1LaunchButton";
    button.className="rc1-launch-button";
    button.innerHTML=`
      <span>RC1</span>
      <strong>Classroom Launch</strong>
      <small>Health + Go Live</small>`;
    button.onclick=openRC1;

    const v60=document.getElementById("classroomLaunchV60Button");
    if(v60){
      v60.hidden=true;
      v60.insertAdjacentElement("afterend",button);
    }else{
      const nav=document.querySelector(".side-nav,.sidebar nav,.sidebar");
      nav?.appendChild(button);
    }
  }

  function createDashboardBanner(){
    const dashboard=document.getElementById("dashboard");
    if(!dashboard || document.getElementById("rc1DashboardBanner"))return;

    const banner=document.createElement("section");
    banner.id="rc1DashboardBanner";
    banner.className="rc1-dashboard-banner";
    banner.innerHTML=`
      <div>
        <p>RELEASE CANDIDATE 1</p>
        <h2>Classroom Launch is ready for final testing.</h2>
        <span>Open Teacher Home, Monday Planning, First Day, Systems, or Health from one place.</span>
      </div>
      <button>Open RC1</button>`;
    banner.querySelector("button").onclick=openRC1;

    const v60Card=document.getElementById("v60HomeCard") || document.getElementById("v60TeacherHome");
    if(v60Card)v60Card.hidden=true;

    dashboard.prepend(banner);
  }

  function createRC1Shell(){
    overlay=document.createElement("div");
    overlay.id="rc1Overlay";
    overlay.className="rc1-overlay";
    overlay.innerHTML=`
      <section class="rc1-dialog" role="dialog" aria-modal="true" aria-label="Release Candidate 1">
        <header>
          <div>
            <p>RELEASE CANDIDATE 1</p>
            <h2>Classroom Launch Candidate</h2>
            <span>${esc(config.releaseStatus)}</span>
          </div>
          <button id="rc1Close">×</button>
        </header>

        <nav class="rc1-tabs">
          <button data-rc1-tab="home" class="active">Teacher Home</button>
          <button data-rc1-tab="monday">Monday Planning</button>
          <button data-rc1-tab="firstday">First Day</button>
          <button data-rc1-tab="systems">Systems</button>
          <button data-rc1-tab="health">Health</button>
        </nav>

        <main id="rc1Content"></main>

        <footer>
          <span id="rc1Status">Ready</span>
          <div>
            <button id="rc1OpenV60">Open Version 6.0</button>
            <button id="rc1OpenHealth">Run Health</button>
          </div>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    document.getElementById("rc1Close").onclick=closeRC1;
    document.getElementById("rc1OpenV60").onclick=openV60;
    document.getElementById("rc1OpenHealth").onclick=()=>showTab("health");
    overlay.onclick=event=>{if(event.target===overlay)closeRC1()};

    document.querySelectorAll("[data-rc1-tab]").forEach(button=>{
      button.onclick=()=>showTab(button.dataset.rc1Tab);
    });

    showTab("home");
  }

  function showTab(tab){
    document.querySelectorAll("[data-rc1-tab]").forEach(button=>{
      button.classList.toggle("active",button.dataset.rc1Tab===tab);
    });

    if(tab==="home")renderHome();
    if(tab==="monday")openV60Tab("monday");
    if(tab==="firstday")openV60Tab("firstday");
    if(tab==="systems")renderSystems();
    if(tab==="health")renderHealth();
  }

  function renderHome(){
    const content=document.getElementById("rc1Content");
    content.innerHTML=`
      <section class="rc1-hero">
        <div>
          <p>TEACHER HOME</p>
          <h1>One launch screen. One clean navigation path.</h1>
          <span>The old Version 3.2 launch entry is hidden. RC1 now routes you to Version 6.0 and Health.</span>
        </div>
        <button id="rc1StartMonday">Start Monday Planning</button>
      </section>

      <section class="rc1-summary">
        <article>
          <strong>1</strong>
          <h3>Launch Entry</h3>
          <p>Duplicate classroom-launch buttons are removed.</p>
        </article>
        <article>
          <strong>5</strong>
          <h3>Primary Tabs</h3>
          <p>Teacher Home, Monday, First Day, Systems, and Health.</p>
        </article>
        <article>
          <strong>RC1</strong>
          <h3>Testing Stage</h3>
          <p>Use this release for final launch verification.</p>
        </article>
      </section>

      <section class="rc1-section">
        <h2>Launch Order</h2>
        <div class="rc1-checklist">
          ${[
            "Open Health and confirm required files",
            "Open Monday Planning and build the current week",
            "Open Instructional Content and verify Unit 1",
            "Check Curriculum Integration for missing files",
            "Test Daily Command Center",
            "Create a backup",
            "Test on desktop and iPad"
          ].map((item,index)=>`
            <label>
              <input type="checkbox" data-rc1-check="${index}">
              <span>${esc(item)}</span>
            </label>`).join("")}
        </div>
      </section>`;

    document.getElementById("rc1StartMonday").onclick=()=>openV60Tab("monday");
  }

  function renderSystems(){
    const systems=[
      ["classroomLaunchV60Button","Version 6.0 Classroom Launch"],
      ["dailyCommandCenterButton","Daily Command Center"],
      ["weeklyPlannerButton","Weekly Planner"],
      ["instructionalContentButton","Instructional Content"],
      ["curriculumIntegrationButton","Curriculum Integration"],
      ["assessmentReteachButton","Assessment & Reteach"],
      ["studentSupportFamilyButton","Student Support"],
      ["standardsReportingButton","Standards & Reports"],
      ["schoolCalendarButton","School Calendar"],
      ["notificationsReminderButton","Reminders"],
      ["backupExportButton","Backup & Transfer"]
    ];

    document.getElementById("rc1Content").innerHTML=`
      <section class="rc1-section">
        <h2>Connected Systems</h2>
        <div class="rc1-system-grid">
          ${systems.map(([id,title])=>`
            <button data-rc1-system="${id}">
              <strong>${esc(title)}</strong>
              <span>${document.getElementById(id)?"Detected":"Not detected"}</span>
            </button>`).join("")}
        </div>
      </section>`;

    document.querySelectorAll("[data-rc1-system]").forEach(button=>{
      button.onclick=()=>{
        closeRC1();
        const target=document.getElementById(button.dataset.rc1System);
        if(target)target.click();
      };
    });
  }

  async function renderHealth(){
    const content=document.getElementById("rc1Content");
    content.innerHTML=`
      <section class="rc1-section">
        <div class="rc1-section-heading">
          <div>
            <h2>RC1 Health Check</h2>
            <p>Scripts, JSON files, Version 6.0, and core controls.</p>
          </div>
          <button id="rc1RunAgain">Run Again</button>
        </div>
        <div id="rc1HealthResults" class="rc1-health-grid"></div>
      </section>`;

    document.getElementById("rc1RunAgain").onclick=renderHealth;

    const fileChecks=[
      ...config.requiredScripts.map(file=>checkFile(file,"Script")),
      ...config.requiredData.map(file=>checkFile(file,"Data"))
    ];

    const results=await Promise.all(fileChecks);

    const controls=[
      ["Version 6.0 button",Boolean(document.getElementById("classroomLaunchV60Button"))],
      ["Weekly Planner button",Boolean(document.getElementById("weeklyPlannerButton"))],
      ["Instructional Content button",Boolean(document.getElementById("instructionalContentButton"))],
      ["Daily Command Center button",Boolean(document.getElementById("dailyCommandCenterButton"))],
      ["Legacy Version 3.2 hidden",Boolean(document.querySelector("[data-rc1-legacy-hidden='true']"))]
    ].map(([name,ok])=>({name,type:"Control",ok,message:ok?"Ready":"Not detected"}));

    const all=[...results,...controls];
    const passed=all.filter(item=>item.ok).length;

    document.getElementById("rc1HealthResults").innerHTML=all.map(item=>`
      <article class="${item.ok?"ready":"missing"}">
        <strong>${item.ok?"✓":"!"}</strong>
        <div>
          <span>${esc(item.name)}</span>
          <small>${esc(item.type)} • ${esc(item.message)}</small>
        </div>
      </article>`).join("");

    document.getElementById("rc1Status").textContent=`${passed}/${all.length} RC1 checks passed.`;
  }

  async function checkFile(name,type){
    try{
      const response=await fetch(name+"?rc1="+Date.now(),{cache:"no-store"});
      if(!response.ok)return{name,type,ok:false,message:`Missing (${response.status})`};

      if(name.endsWith(".json")){
        try{await response.clone().json()}
        catch{return{name,type,ok:false,message:"Invalid JSON"}}
      }

      return{name,type,ok:true,message:"Ready"};
    }catch{
      return{name,type,ok:false,message:"Could not load"};
    }
  }

  function patchVersion60Tabs(){
    const observer=new MutationObserver(()=>{
      const v60=document.querySelector(".v60-overlay.open");
      if(!v60)return;

      const healthButton=v60.querySelector("[data-tab='health'],[data-v60-tab='health']");
      if(healthButton){
        healthButton.classList.add("rc1-health-highlight");
        healthButton.setAttribute("title","Run launch health checks");
      }
    });

    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  }

  function openV60(){
    closeRC1();
    const button=document.getElementById("classroomLaunchV60Button");
    if(button){
      button.click();
      return;
    }
    document.getElementById("rc1Status").textContent="Version 6.0 button was not detected.";
  }

  function openV60Tab(tab){
    closeRC1();
    const button=document.getElementById("classroomLaunchV60Button");
    if(!button)return;

    button.click();

    setTimeout(()=>{
      const target=document.querySelector(
        `.v60-overlay [data-tab="${tab}"], .v60-overlay [data-v60-tab="${tab}"]`
      );
      target?.click();
    },200);
  }

  function registerHealthShortcut(){
    document.addEventListener("keydown",event=>{
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="h"){
        event.preventDefault();
        openRC1();
        showTab("health");
      }

      if(event.key==="Escape"&&overlay?.classList.contains("open"))closeRC1();
    });
  }

  function openRC1(){
    removeLegacyLaunch();
    overlay.classList.add("open");
    document.body.classList.add("rc1-open");
  }

  function closeRC1(){
    overlay.classList.remove("open");
    document.body.classList.remove("rc1-open");
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
