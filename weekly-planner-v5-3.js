
(function(){
  "use strict";
  let data, overlay, activeTemplate, activeDay;

  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-v5-3.css";
    document.head.appendChild(css);

    try{
      data=await (await fetch("weekly-planner-v5-3.json",{cache:"no-store"})).json();
      build();
      addButton();
    }catch(error){console.warn("Version 5.3 could not load.",error)}
  }

  function build(){
    overlay=document.createElement("div");
    overlay.className="v53-overlay";
    overlay.innerHTML=`
      <section class="v53-dialog">
        <header>
          <div><p>VERSION 5.3</p><h2>Weekly Instructional Planner</h2><span>${esc(data.releaseStatus)}</span></div>
          <button id="v53Close">×</button>
        </header>

        <div class="v53-toolbar">
          <select id="v53Template"></select>
          <button id="v53SendWeek">Send Week to Teach My Day</button>
          <button id="v53Print">Print Week</button>
        </div>

        <div class="v53-week" id="v53WeekTabs"></div>

        <div class="v53-layout">
          <aside id="v53DaySummary"></aside>
          <main id="v53DayDetail"></main>
        </div>

        <footer><span id="v53Status">Ready</span><span>TeachingHappensHere v5.3</span></footer>
      </section>`;
    document.body.appendChild(overlay);

    const select=document.getElementById("v53Template");
    select.innerHTML=data.templates.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join("");
    select.onchange=()=>renderTemplate(select.value);
    document.getElementById("v53SendWeek").onclick=sendWeek;
    document.getElementById("v53Print").onclick=()=>window.print();
    document.getElementById("v53Close").onclick=close;
    overlay.onclick=e=>{if(e.target===overlay)close()};

    renderTemplate(data.templates[0].id);
  }

  function renderTemplate(id){
    activeTemplate=data.templates.find(t=>t.id===id);
    activeDay=activeTemplate.days[0];
    document.getElementById("v53Template").value=id;

    document.getElementById("v53WeekTabs").innerHTML=activeTemplate.days.map((d,i)=>`
      <button data-v53-day="${d.day}" class="${i===0?"active":""}">
        <strong>${d.day}</strong><span>${esc(d.focus)}</span>
      </button>`).join("");

    document.querySelectorAll("[data-v53-day]").forEach(b=>b.onclick=()=>renderDay(b.dataset.v53Day));
    renderDay(activeDay.day);
  }

  function renderDay(dayName){
    activeDay=activeTemplate.days.find(d=>d.day===dayName);
    document.querySelectorAll("[data-v53-day]").forEach(b=>b.classList.toggle("active",b.dataset.v53Day===dayName));

    document.getElementById("v53DaySummary").innerHTML=`
      <section>
        <p>${esc(activeTemplate.title)}</p>
        <h3>${esc(activeDay.day)}</h3>
        <strong>${esc(activeDay.focus)}</strong>
      </section>
      <section>
        <h4>Small Groups</h4>
        ${activeDay.smallGroups.map((item,i)=>`
          <label><input type="checkbox" data-save-key="v53-${activeTemplate.id}-${dayName}-group-${i}"> ${esc(item)}</label>`).join("")}
      </section>
      <section>
        <h4>Print & Prep</h4>
        ${activeDay.printNeeds.map((item,i)=>`
          <label><input type="checkbox" data-save-key="v53-${activeTemplate.id}-${dayName}-print-${i}"> ${esc(item)}</label>`).join("")}
      </section>
      <section>
        <h4>Assessment</h4>
        <p>${esc(activeDay.assessment)}</p>
      </section>`;

    document.getElementById("v53DayDetail").innerHTML=`
      <div class="v53-heading">
        <div><p>${esc(activeDay.day.toUpperCase())}</p><h2>${esc(activeDay.focus)}</h2></div>
        <button id="v53OpenContent">Open Lesson Content</button>
      </div>

      <section class="v53-blocks">
        ${activeDay.blocks.map((block,i)=>`
          <article>
            <div><strong>${esc(block.time)}</strong><span>${esc(block.subject)}</span></div>
            <label>
              <input type="checkbox" data-save-key="v53-${activeTemplate.id}-${dayName}-block-${i}">
              <p>${esc(block.task)}</p>
            </label>
            <textarea data-save-key="v53-${activeTemplate.id}-${dayName}-note-${i}" placeholder="Teacher note for this block..."></textarea>
          </article>`).join("")}
      </section>

      <section class="v53-reflection">
        <h3>Future Jennifer</h3>
        <textarea data-save-key="v53-${activeTemplate.id}-${dayName}-reflection" placeholder="What worked? What needs reteaching? What should change next time?"></textarea>
      </section>`;

    document.getElementById("v53OpenContent").onclick=()=>{
      close();
      document.getElementById("instructionalContentButton")?.click();
    };

    setTimeout(()=>window.dispatchEvent(new Event("input")),50);
  }

  function sendWeek(){
    const payload={
      version:"5.3",
      templateId:activeTemplate.id,
      templateTitle:activeTemplate.title,
      sentAt:new Date().toISOString(),
      days:activeTemplate.days
    };
    localStorage.setItem("thh-v53:active-week",JSON.stringify(payload));
    document.getElementById("v53Status").textContent="Week saved for Teach My Day.";

    close();
    document.querySelector('[data-page="teachday"]')?.click();

    setTimeout(()=>{
      const page=document.getElementById("teachday");
      if(!page)return;
      let notice=document.getElementById("v53TeachDayNotice");
      if(!notice){
        notice=document.createElement("div");
        notice.id="v53TeachDayNotice";
        notice.className="v53-teach-notice";
        page.prepend(notice);
      }
      notice.innerHTML=`<strong>${esc(activeTemplate.title)}</strong><span>Weekly plan saved and connected to Teach My Day.</span><button id="v53ReturnPlanner">Open Weekly Planner</button>`;
      document.getElementById("v53ReturnPlanner").onclick=open;
    },350);
  }

  function addButton(){
    const button=document.createElement("button");
    button.id="weeklyPlannerButton";
    button.className="v53-button";
    button.innerHTML="<span>5.3</span><strong>Weekly Planner</strong><small>Teach My Day</small>";
    button.onclick=open;

    const prior=document.getElementById("curriculumIntegrationButton");
    if(prior)prior.insertAdjacentElement("afterend",button);
    else document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",button);
  }

  function open(){overlay.classList.add("open");document.body.classList.add("v53-open")}
  function close(){overlay.classList.remove("open");document.body.classList.remove("v53-open")}

  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="w"){e.preventDefault();if(overlay)open()}
    if(e.key==="Escape"&&overlay?.classList.contains("open"))close()
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
