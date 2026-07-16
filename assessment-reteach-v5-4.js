
(function(){
  "use strict";
  let data, overlay, activeSkill;

  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-v5-4.css";
    document.head.appendChild(css);

    try{
      data=await (await fetch("assessment-reteach-v5-4.json",{cache:"no-store"})).json();
      build();
      addButton();
    }catch(error){console.warn("Version 5.4 could not load.",error)}
  }

  function build(){
    overlay=document.createElement("div");
    overlay.className="v54-overlay";
    overlay.innerHTML=`
      <section class="v54-dialog">
        <header>
          <div><p>VERSION 5.4</p><h2>Assessment, Reteach & Small-Group Sync</h2><span>${esc(data.releaseStatus)}</span></div>
          <button id="v54Close">×</button>
        </header>

        <div class="v54-toolbar">
          <select id="v54Skill"></select>
          <input id="v54Lesson" placeholder="Lesson or assessment name">
          <input id="v54Score" type="number" min="0" max="100" placeholder="Class or group score %">
          <button id="v54Analyze">Analyze Results</button>
        </div>

        <div class="v54-layout">
          <aside id="v54SkillList"></aside>
          <main id="v54Detail"></main>
        </div>

        <footer><span id="v54Status">Ready</span><span>TeachingHappensHere v5.4</span></footer>
      </section>`;
    document.body.appendChild(overlay);

    document.getElementById("v54Skill").innerHTML=data.skillAreas.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join("");
    document.getElementById("v54SkillList").innerHTML=data.skillAreas.map((s,i)=>`
      <button data-v54-skill="${s.id}" class="${i===0?"active":""}">
        <strong>${esc(s.title)}</strong><span>${esc(s.description)}</span>
      </button>`).join("");

    document.querySelectorAll("[data-v54-skill]").forEach(b=>b.onclick=()=>selectSkill(b.dataset.v54Skill));
    document.getElementById("v54Skill").onchange=e=>selectSkill(e.target.value);
    document.getElementById("v54Analyze").onclick=analyze;
    document.getElementById("v54Close").onclick=close;
    overlay.onclick=e=>{if(e.target===overlay)close()};

    selectSkill(data.skillAreas[0].id);
  }

  function selectSkill(id){
    activeSkill=data.skillAreas.find(s=>s.id===id);
    document.getElementById("v54Skill").value=id;
    document.querySelectorAll("[data-v54-skill]").forEach(b=>b.classList.toggle("active",b.dataset.v54Skill===id));
    renderEmpty();
  }

  function levelFor(score){
    if(score>=activeSkill.thresholds.secure)return "secure";
    if(score>=activeSkill.thresholds.developing)return "developing";
    return "reteach";
  }

  function renderEmpty(){
    document.getElementById("v54Detail").innerHTML=`
      <div class="v54-heading">
        <div><p>SKILL AREA</p><h2>${esc(activeSkill.title)}</h2><span>${esc(activeSkill.description)}</span></div>
        <b>Secure: ${activeSkill.thresholds.secure}%+</b>
      </div>

      <section class="v54-section">
        <h3>Decision Bands</h3>
        <div class="v54-bands">
          ${["secure","developing","reteach"].map(level=>{
            const recommendation=activeSkill.recommendations[level];
            return `<article class="${level}">
              <strong>${level==="secure"?"Secure":level==="developing"?"Developing":"Needs Reteach"}</strong>
              <span>Recommended ${esc(recommendation.group)} Group</span>
              <p>${esc(recommendation.action)}</p>
            </article>`;
          }).join("")}
        </div>
      </section>

      <section class="v54-section">
        <h3>Assessment Sources</h3>
        <div class="v54-source-grid">${data.assessmentSources.map(x=>`<span>${esc(x)}</span>`).join("")}</div>
      </section>`;
  }

  function analyze(){
    const score=Number(document.getElementById("v54Score").value);
    const lesson=document.getElementById("v54Lesson").value.trim()||"Current assessment";
    if(!Number.isFinite(score)||score<0||score>100){
      document.getElementById("v54Status").textContent="Enter a score from 0 to 100.";
      return;
    }

    const level=levelFor(score);
    const recommendation=activeSkill.recommendations[level];
    const label=level==="secure"?"Secure":level==="developing"?"Developing":"Needs Reteach";

    document.getElementById("v54Detail").innerHTML=`
      <div class="v54-heading">
        <div><p>${esc(lesson.toUpperCase())}</p><h2>${esc(activeSkill.title)}</h2><span>Assessment result: ${score}%</span></div>
        <b class="${level}">${label}</b>
      </div>

      <section class="v54-result ${level}">
        <div class="v54-score"><strong>${score}%</strong><span>${label}</span></div>
        <div>
          <h3>Recommended ${esc(recommendation.group)} Group</h3>
          <p>${esc(recommendation.action)}</p>
        </div>
      </section>

      <div class="v54-two">
        <section class="v54-section">
          <h3>Intervention Tools</h3>
          ${recommendation.tools.map((tool,i)=>`
            <label><input type="checkbox" data-save-key="v54-${activeSkill.id}-${level}-tool-${i}"> ${esc(tool)}</label>`).join("")}
        </section>

        <section class="v54-section">
          <h3>Next-Step Checklist</h3>
          ${[
            "Confirm the result with student work or observation",
            "Place students in the recommended group",
            "Prepare materials",
            "Teach the targeted support",
            "Check progress after instruction",
            "Adjust the group if needed"
          ].map((step,i)=>`
            <label><input type="checkbox" data-save-key="v54-${activeSkill.id}-${level}-step-${i}"> ${esc(step)}</label>`).join("")}
        </section>
      </div>

      <section class="v54-section">
        <h3>Teacher Notes</h3>
        <textarea data-save-key="v54-${activeSkill.id}-${lesson}-notes" placeholder="Students, patterns noticed, misconceptions, and follow-up date..."></textarea>
      </section>

      <section class="v54-actions">
        <button id="v54SendPlanner">Send to Weekly Planner</button>
        <button id="v54SendTeachDay">Send to Teach My Day</button>
        <button onclick="window.print()">Print Reteach Plan</button>
      </section>`;

    document.getElementById("v54SendPlanner").onclick=()=>saveDecision("planner",lesson,score,level,recommendation);
    document.getElementById("v54SendTeachDay").onclick=()=>saveDecision("teachday",lesson,score,level,recommendation);
    document.getElementById("v54Status").textContent=`${activeSkill.title}: ${label}.`;
  }

  function saveDecision(destination,lesson,score,level,recommendation){
    const payload={
      version:"5.4",
      destination,
      createdAt:new Date().toISOString(),
      lesson,
      score,
      level,
      skillId:activeSkill.id,
      skillTitle:activeSkill.title,
      group:recommendation.group,
      action:recommendation.action,
      tools:recommendation.tools
    };

    const key=destination==="planner"?"thh-v54:planner-next-step":"thh-v54:teachday-next-step";
    localStorage.setItem(key,JSON.stringify(payload));

    close();
    if(destination==="planner"){
      document.getElementById("weeklyPlannerButton")?.click();
      setTimeout(()=>notice("v54PlannerNotice","Weekly Planner",payload),350);
    }else{
      document.querySelector('[data-page="teachday"]')?.click();
      setTimeout(()=>notice("v54TeachDayNotice","Teach My Day",payload),350);
    }
  }

  function notice(id,title,payload){
    const target=title==="Teach My Day"?document.getElementById("teachday"):document.querySelector(".v53-dialog");
    if(!target)return;
    let box=document.getElementById(id);
    if(!box){
      box=document.createElement("div");
      box.id=id;
      box.className="v54-notice";
      target.prepend(box);
    }
    box.innerHTML=`
      <strong>${esc(payload.skillTitle)}: ${esc(payload.level)}</strong>
      <span>${esc(payload.group)} Group — ${esc(payload.action)}</span>`;
  }

  function addButton(){
    const button=document.createElement("button");
    button.id="assessmentReteachButton";
    button.className="v54-button";
    button.innerHTML="<span>5.4</span><strong>Assessment & Reteach</strong><small>Small Groups</small>";
    button.onclick=open;

    const prior=document.getElementById("weeklyPlannerButton");
    if(prior)prior.insertAdjacentElement("afterend",button);
    else document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",button);
  }

  function open(){overlay.classList.add("open");document.body.classList.add("v54-open")}
  function close(){overlay.classList.remove("open");document.body.classList.remove("v54-open")}

  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="a"){e.preventDefault();if(overlay)open()}
    if(e.key==="Escape"&&overlay?.classList.contains("open"))close()
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
