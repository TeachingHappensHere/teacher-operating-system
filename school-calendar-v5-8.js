
(function(){
  "use strict";

  const STORAGE_KEY="thh-v58:calendar-events";
  let data, events=[], overlay, selectedDate=new Date();

  const esc=value=>String(value??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-v5-8.css";
    document.head.appendChild(css);

    try{
      data=await (await fetch("school-calendar-v5-8.json",{cache:"no-store"})).json();
      loadEvents();
      build();
      addButton();
      addDashboardCard();
    }catch(error){
      console.warn("Version 5.8 could not load.",error);
    }
  }

  function loadEvents(){
    try{
      events=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    }catch{
      events=[];
    }

    if(!events.length){
      events=data.sampleEvents.map(item=>({...item}));
      saveEvents();
    }
  }

  function saveEvents(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(events));
    syncUpcoming();
  }

  function build(){
    overlay=document.createElement("div");
    overlay.className="v58-overlay";
    overlay.innerHTML=`
      <section class="v58-dialog">
        <header>
          <div>
            <p>VERSION 5.8</p>
            <h2>School Calendar, Deadlines & Event Sync</h2>
            <span>${esc(data.releaseStatus)}</span>
          </div>
          <button id="v58Close">×</button>
        </header>

        <div id="v58Stats" class="v58-stats"></div>

        <div class="v58-toolbar">
          <button id="v58PrevMonth">←</button>
          <strong id="v58MonthLabel"></strong>
          <button id="v58NextMonth">→</button>
          <button id="v58Today">Today</button>
          <button id="v58AddEvent">Add Event</button>
          <button id="v58AgendaView">Agenda View</button>
          <button id="v58Print">Print</button>
        </div>

        <div class="v58-layout">
          <main>
            <div id="v58Calendar" class="v58-calendar"></div>
          </main>
          <aside id="v58Agenda"></aside>
        </div>

        <footer>
          <span id="v58Status">Ready</span>
          <span>TeachingHappensHere v5.8</span>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    document.getElementById("v58Close").onclick=close;
    document.getElementById("v58PrevMonth").onclick=()=>changeMonth(-1);
    document.getElementById("v58NextMonth").onclick=()=>changeMonth(1);
    document.getElementById("v58Today").onclick=()=>{
      selectedDate=new Date();
      render();
    };
    document.getElementById("v58AddEvent").onclick=addEvent;
    document.getElementById("v58AgendaView").onclick=showAgendaOnly;
    document.getElementById("v58Print").onclick=()=>window.print();
    overlay.onclick=event=>{if(event.target===overlay)close()};

    render();
  }

  function validDate(value){
    return value && !Number.isNaN(new Date(value+"T12:00:00").getTime());
  }

  function dateKey(date){
    const year=date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,"0");
    const day=String(date.getDate()).padStart(2,"0");
    return `${year}-${month}-${day}`;
  }

  function sameMonth(value,date){
    if(!validDate(value))return false;
    const eventDate=new Date(value+"T12:00:00");
    return eventDate.getFullYear()===date.getFullYear() &&
      eventDate.getMonth()===date.getMonth();
  }

  function monthEvents(){
    return events.filter(event=>sameMonth(event.date,selectedDate));
  }

  function futureEvents(){
    const today=new Date();
    today.setHours(0,0,0,0);

    return events
      .filter(event=>validDate(event.date))
      .map(event=>({...event,dateObject:new Date(event.date+"T12:00:00")}))
      .filter(event=>event.dateObject>=today)
      .sort((a,b)=>a.dateObject-b.dateObject);
  }

  function daysUntil(value){
    if(!validDate(value))return null;
    const today=new Date();
    today.setHours(0,0,0,0);
    const target=new Date(value+"T12:00:00");
    target.setHours(0,0,0,0);
    return Math.ceil((target-today)/(1000*60*60*24));
  }

  function render(){
    document.getElementById("v58MonthLabel").textContent=
      selectedDate.toLocaleDateString("en-US",{month:"long",year:"numeric"});

    renderCalendar();
    renderAgenda();
    updateStats();
    syncUpcoming();
  }

  function renderCalendar(){
    const year=selectedDate.getFullYear();
    const month=selectedDate.getMonth();
    const first=new Date(year,month,1);
    const last=new Date(year,month+1,0);
    const startDay=first.getDay();
    const cells=[];

    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(day=>{
      cells.push(`<div class="v58-weekday">${day}</div>`);
    });

    for(let index=0;index<startDay;index+=1){
      cells.push(`<div class="v58-day empty"></div>`);
    }

    for(let day=1;day<=last.getDate();day+=1){
      const current=new Date(year,month,day);
      const key=dateKey(current);
      const dayEvents=events.filter(event=>event.date===key);
      const isToday=key===dateKey(new Date());

      cells.push(`
        <button class="v58-day ${isToday?"today":""}" data-v58-date="${key}">
          <strong>${day}</strong>
          <div>
            ${dayEvents.slice(0,3).map(event=>`
              <span class="type-${slug(event.type)}">${esc(event.title)}</span>
            `).join("")}
            ${dayEvents.length>3?`<small>+${dayEvents.length-3} more</small>`:""}
          </div>
        </button>`);
    }

    document.getElementById("v58Calendar").innerHTML=cells.join("");

    document.querySelectorAll("[data-v58-date]").forEach(button=>{
      button.onclick=()=>showDate(button.dataset.v58Date);
    });
  }

  function renderAgenda(){
    const upcoming=futureEvents().slice(0,12);

    document.getElementById("v58Agenda").innerHTML=`
      <section class="v58-agenda-header">
        <p>UPCOMING</p>
        <h3>Next Events & Deadlines</h3>
      </section>

      <div class="v58-agenda-list">
        ${upcoming.map(event=>{
          const countdown=daysUntil(event.date);
          return `
            <article class="priority-${event.priority.toLowerCase()}">
              <div>
                <span>${countdown===0?"Today":countdown===1?"Tomorrow":`${countdown} days`}</span>
                <strong>${esc(event.title)}</strong>
                <small>${new Date(event.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})} • ${esc(event.type)}</small>
              </div>
              <button data-v58-edit="${event.id}">Open</button>
            </article>`;
        }).join("") || `<p>No dated events yet.</p>`}
      </div>

      <section class="v58-recurring">
        <h3>Recurring Planning Ideas</h3>
        ${data.recurringIdeas.map(item=>`<span>${esc(item)}</span>`).join("")}
      </section>`;

    document.querySelectorAll("[data-v58-edit]").forEach(button=>{
      button.onclick=()=>editEvent(button.dataset.v58Edit);
    });
  }

  function showDate(date){
    const dayEvents=events.filter(event=>event.date===date);
    const readable=new Date(date+"T12:00:00").toLocaleDateString("en-US",{
      weekday:"long",month:"long",day:"numeric",year:"numeric"
    });

    document.getElementById("v58Agenda").innerHTML=`
      <section class="v58-agenda-header">
        <p>SELECTED DATE</p>
        <h3>${esc(readable)}</h3>
        <button id="v58AddForDate">Add Event</button>
      </section>
      <div class="v58-agenda-list">
        ${dayEvents.map(event=>eventCard(event)).join("") || `<p>No events for this date.</p>`}
      </div>
      <button id="v58BackUpcoming" class="v58-back">Back to Upcoming Events</button>`;

    document.getElementById("v58AddForDate").onclick=()=>addEvent(date);
    document.getElementById("v58BackUpcoming").onclick=renderAgenda;
    wireEventCards();
  }

  function eventCard(event){
    return `
      <article class="v58-full-event priority-${event.priority.toLowerCase()}">
        <span>${esc(event.type)} • ${esc(event.priority)} Priority</span>
        <h3>${esc(event.title)}</h3>
        <p>${esc(event.description||"")}</p>
        <div class="v58-prep-list">
          ${(event.prep||[]).map((item,index)=>`
            <label>
              <input type="checkbox" data-v58-prep="${event.id}-${index}">
              ${esc(item)}
            </label>`).join("")}
        </div>
        <div>
          <button data-v58-edit="${event.id}">Edit</button>
          <button data-v58-open-system="${event.connectedSystem||""}">Open Connected System</button>
          <button data-v58-delete="${event.id}">Delete</button>
        </div>
      </article>`;
  }

  function wireEventCards(){
    document.querySelectorAll("[data-v58-edit]").forEach(button=>{
      button.onclick=()=>editEvent(button.dataset.v58Edit);
    });
    document.querySelectorAll("[data-v58-delete]").forEach(button=>{
      button.onclick=()=>deleteEvent(button.dataset.v58Delete);
    });
    document.querySelectorAll("[data-v58-open-system]").forEach(button=>{
      button.onclick=()=>{
        const id=button.dataset.v58OpenSystem;
        if(!id)return;
        close();
        document.getElementById(id)?.click();
      };
    });
  }

  function addEvent(defaultDate=""){
    const id="event-"+Date.now();
    events.push({
      id,
      title:"New Event",
      date:defaultDate,
      endDate:"",
      type:"Classroom Event",
      priority:"Medium",
      description:"",
      prep:[],
      connectedSystem:""
    });
    saveEvents();
    editEvent(id);
  }

  function editEvent(id){
    const event=events.find(item=>item.id===id);
    if(!event)return;

    document.getElementById("v58Agenda").innerHTML=`
      <section class="v58-agenda-header">
        <p>EDIT EVENT</p>
        <h3>${esc(event.title)}</h3>
      </section>

      <section class="v58-event-form">
        <label>
          <span>Title</span>
          <input id="v58EventTitle" value="${esc(event.title)}">
        </label>
        <label>
          <span>Date</span>
          <input id="v58EventDate" type="date" value="${esc(event.date||"")}">
        </label>
        <label>
          <span>End Date</span>
          <input id="v58EventEndDate" type="date" value="${esc(event.endDate||"")}">
        </label>
        <label>
          <span>Event Type</span>
          <select id="v58EventType">
            ${data.eventTypes.map(type=>`<option ${type===event.type?"selected":""}>${esc(type)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select id="v58EventPriority">
            ${data.priorityLevels.map(level=>`<option ${level===event.priority?"selected":""}>${level}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Connected System</span>
          <select id="v58EventSystem">
            ${[
              ["","None"],
              ["dailyCommandCenterButton","Daily Command Center"],
              ["weeklyPlannerButton","Weekly Planner"],
              ["assessmentReteachButton","Assessment & Reteach"],
              ["studentSupportFamilyButton","Student Support"],
              ["standardsReportingButton","Standards & Reports"],
              ["curriculumIntegrationButton","Curriculum Integration"],
              ["classroomLaunchButton","Classroom Launch"],
              ["launchCandidateButton","Launch Center"]
            ].map(([value,label])=>`<option value="${value}" ${value===event.connectedSystem?"selected":""}>${label}</option>`).join("")}
          </select>
        </label>
        <label class="wide">
          <span>Description</span>
          <textarea id="v58EventDescription">${esc(event.description||"")}</textarea>
        </label>
        <label class="wide">
          <span>Preparation Items — one per line</span>
          <textarea id="v58EventPrep">${esc((event.prep||[]).join("\n"))}</textarea>
        </label>

        <div class="v58-form-actions">
          <button id="v58SaveEvent">Save Event</button>
          <button id="v58CancelEvent">Cancel</button>
        </div>
      </section>`;

    document.getElementById("v58SaveEvent").onclick=()=>{
      event.title=document.getElementById("v58EventTitle").value.trim()||"Untitled Event";
      event.date=document.getElementById("v58EventDate").value;
      event.endDate=document.getElementById("v58EventEndDate").value;
      event.type=document.getElementById("v58EventType").value;
      event.priority=document.getElementById("v58EventPriority").value;
      event.connectedSystem=document.getElementById("v58EventSystem").value;
      event.description=document.getElementById("v58EventDescription").value.trim();
      event.prep=document.getElementById("v58EventPrep").value
        .split("\n").map(item=>item.trim()).filter(Boolean);

      saveEvents();
      render();
      setStatus("Event saved.");
    };

    document.getElementById("v58CancelEvent").onclick=renderAgenda;
  }

  function deleteEvent(id){
    const event=events.find(item=>item.id===id);
    if(!confirm(`Delete "${event.title}"?`))return;

    events=events.filter(item=>item.id!==id);
    saveEvents();
    render();
    setStatus("Event deleted.");
  }

  function changeMonth(amount){
    selectedDate=new Date(selectedDate.getFullYear(),selectedDate.getMonth()+amount,1);
    render();
  }

  function showAgendaOnly(){
    selectedDate=new Date();
    renderAgenda();
  }

  function updateStats(){
    const upcoming=futureEvents();
    const next7=upcoming.filter(event=>daysUntil(event.date)<=7).length;
    const high=upcoming.filter(event=>event.priority==="High").length;
    const assessments=upcoming.filter(event=>event.type==="Assessment").length;
    const noSchool=upcoming.filter(event=>event.type==="No School"||event.type==="iDay").length;

    document.getElementById("v58Stats").innerHTML=`
      <article><strong>${events.length}</strong><span>Total Events</span></article>
      <article><strong>${monthEvents().length}</strong><span>This Month</span></article>
      <article class="${next7?"alert":""}"><strong>${next7}</strong><span>Next 7 Days</span></article>
      <article class="${high?"alert":""}"><strong>${high}</strong><span>High Priority</span></article>
      <article><strong>${assessments}</strong><span>Assessments</span></article>
      <article><strong>${noSchool}</strong><span>iDays / No School</span></article>`;
  }

  function syncUpcoming(){
    const upcoming=futureEvents().slice(0,10).map(event=>({
      id:event.id,
      title:event.title,
      date:event.date,
      type:event.type,
      priority:event.priority,
      description:event.description,
      prep:event.prep,
      connectedSystem:event.connectedSystem,
      daysUntil:daysUntil(event.date)
    }));

    localStorage.setItem("thh-v58:upcoming-events",JSON.stringify(upcoming));
  }

  function addButton(){
    const button=document.createElement("button");
    button.id="schoolCalendarButton";
    button.className="v58-button";
    button.innerHTML="<span>5.8</span><strong>School Calendar</strong><small>Deadlines</small>";
    button.onclick=open;

    const prior=document.getElementById("dailyCommandCenterButton");
    if(prior)prior.insertAdjacentElement("afterend",button);
    else document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",button);
  }

  function addDashboardCard(){
    const dashboard=document.getElementById("dashboard");
    if(!dashboard||document.getElementById("v58DashboardCard"))return;

    const upcoming=futureEvents()[0];
    const card=document.createElement("section");
    card.id="v58DashboardCard";
    card.className="v58-dashboard-card";
    card.innerHTML=`
      <div>
        <p>SCHOOL CALENDAR</p>
        <h3>${upcoming?esc(upcoming.title):"Add your first dated event"}</h3>
        <span>${upcoming
          ? `${new Date(upcoming.date+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric"})} • ${daysUntil(upcoming.date)} day(s)`
          : "Track iDays, assessments, conferences, assemblies, and deadlines."}</span>
      </div>
      <button>Open Calendar</button>`;
    card.querySelector("button").onclick=open;

    const commandCard=document.getElementById("v57DashboardCard");
    if(commandCard)commandCard.insertAdjacentElement("afterend",card);
    else dashboard.prepend(card);
  }

  function open(){
    overlay.classList.add("open");
    document.body.classList.add("v58-open");
    render();
  }

  function close(){
    overlay.classList.remove("open");
    document.body.classList.remove("v58-open");
  }

  function setStatus(message){
    const status=document.getElementById("v58Status");
    if(status)status.textContent=message;
  }

  function slug(text){
    return String(text||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  }

  document.addEventListener("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="c"){
      event.preventDefault();
      if(overlay)open();
    }
    if(event.key==="Escape"&&overlay?.classList.contains("open"))close();
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
