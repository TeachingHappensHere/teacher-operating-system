(() => {
  "use strict";
  const KEY = "mrs-parrish-tos-v192";
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const schedule = [
    {time:"7:45–8:10",start:"07:45",end:"08:10",title:"Breakfast",icon:"🍎",route:"dashboard"},
    {time:"8:10–8:20",start:"08:10",end:"08:20",title:"Morning Work",icon:"✏️",route:"lesson-plans"},
    {time:"8:20–8:30",start:"08:20",end:"08:30",title:"Morning Meeting",icon:"❤️",route:"classroom-launch"},
    {time:"8:30–8:40",start:"08:30",end:"08:40",title:"Heggerty",icon:"👂",route:"resources"},
    {time:"8:45–9:30",start:"08:45",end:"09:30",title:"MOWR",icon:"👥",route:"small-groups"},
    {time:"9:30–9:50",start:"09:30",end:"09:50",title:"Open Court Phonics",icon:"🔤",route:"lesson-plans"},
    {time:"9:50–10:00",start:"09:50",end:"10:00",title:"Vocabulary",icon:"💬",route:"lesson-plans"},
    {time:"10:00–10:50",start:"10:00",end:"10:50",title:"Reading & Responding",icon:"📚",route:"lesson-plans"},
    {time:"10:50–11:15",start:"10:50",end:"11:15",title:"Lunch",icon:"🥪",route:"dashboard"},
    {time:"11:15–11:35",start:"11:15",end:"11:35",title:"Recess",icon:"☀️",route:"dashboard"},
    {time:"11:35–12:05",start:"11:35",end:"12:05",title:"Workout",icon:"🏃",route:"dashboard"},
    {time:"12:05–1:05",start:"12:05",end:"13:05",title:"Eureka Math²",icon:"➗",route:"lesson-plans"},
    {time:"1:05–1:35",start:"13:05",end:"13:35",title:"Building the Foundation Writing",icon:"✍️",route:"lesson-plans"},
    {time:"1:35–2:00",start:"13:35",end:"14:00",title:"Social Studies",icon:"🌎",route:"lesson-plans"},
    {time:"2:00–2:15",start:"14:00",end:"14:15",title:"Recess",icon:"☀️",route:"dashboard"},
    {time:"2:15–2:35",start:"14:15",end:"14:35",title:"Science",icon:"🔬",route:"lesson-plans"},
    {time:"2:40–3:00",start:"14:40",end:"15:00",title:"Pack-Up",icon:"🎒",route:"classroom-systems"},
    {time:"3:00–3:30",start:"15:00",end:"15:30",title:"Dismissal",icon:"👋",route:"dashboard"}
  ];
  const launchTasks = ["Attendance and lunch count","Welcome students at the door","Teach the daily routine or procedure","Read aloud and community discussion","Practice transitions","Send family Dojo update","Prepare tomorrow's materials"];
  function read(){try{return {...{checks:{},notes:"",active:0},...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return {checks:{},notes:"",active:0}}}
  function write(s){localStorage.setItem(KEY,JSON.stringify(s))}
  function mins(t){const [h,m]=t.split(":").map(Number);return h*60+m}
  function currentIndex(){const n=new Date(), now=n.getHours()*60+n.getMinutes(); let idx=schedule.findIndex(x=>now>=mins(x.start)&&now<mins(x.end)); if(idx<0) idx=now<mins(schedule[0].start)?0:schedule.length-1; return idx}
  function dateText(){return new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric"}).format(new Date())}
  function navigate(route){window.TOS_APP_BRIDGE?.navigate(route)}
  function quickButtons(){return `<button data-go="classroom-launch">🚀 Launch Week</button><button data-go="lesson-plans">🗓 Weekly Planner</button><button data-go="resources">🔗 Resources</button><button data-go="students">👥 25 Students</button>`}
  async function renderDashboard(context={}){
    const host=document.getElementById("pageHost"); if(!host)return;
    const s=read(), idx=currentIndex(), cur=schedule[idx], next=schedule[Math.min(idx+1,schedule.length-1)];
    host.innerHTML=`<section class="fc-shell">
      <header class="fc-hero"><div><p>CLASSROOM COMMAND CENTER</p><h2>Good morning, Mrs. Parrish.</h2><span>${esc(dateText())} • Heart • 25 students</span></div><button class="fc-primary" id="fcTeach">▶ Teach Today</button></header>
      <section class="fc-now"><div><small>CURRENT / NEXT</small><h3>${cur.icon} ${esc(cur.title)}</h3><p>${esc(cur.time)} · Next: ${esc(next.title)}</p></div><button data-go="${cur.route}">Open</button></section>
      <section class="fc-grid"><article class="fc-card"><div class="fc-title"><h3>Today's Checklist</h3><span>${Object.values(s.checks).filter(Boolean).length}/${launchTasks.length}</span></div><div class="fc-checks">${launchTasks.map((t,i)=>`<label><input type="checkbox" data-check="${i}" ${s.checks[i]?"checked":""}><span>${esc(t)}</span></label>`).join("")}</div><button class="fc-link" id="fcReset">Reset checklist</button></article>
      <article class="fc-card"><h3>Teacher Notes</h3><textarea id="fcNotes" placeholder="Copies, reminders, parent follow-up…">${esc(s.notes)}</textarea><small>Saved automatically on this device.</small></article>
      <article class="fc-card"><h3>Quick Launch</h3><div class="fc-actions">${quickButtons()}</div></article>
      <article class="fc-card"><div class="fc-title"><h3>Today's Schedule</h3><button class="fc-link" id="fcPrint">Print</button></div><div class="fc-mini-schedule">${schedule.map((x,i)=>`<button class="${i===idx?"is-current":""}" data-block="${i}"><strong>${x.time}</strong><span>${x.icon} ${esc(x.title)}</span></button>`).join("")}</div></article></section></section>`;
    host.querySelector("#fcTeach")?.addEventListener("click",()=>context.navigate?.("teachday")||navigate("teachday"));
    host.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>context.navigate?.(b.dataset.go)||navigate(b.dataset.go)));
    host.querySelectorAll("[data-block]").forEach(b=>b.addEventListener("click",()=>{const q=read();q.active=Number(b.dataset.block);write(q);context.navigate?.("teachday")||navigate("teachday")}));
    host.querySelectorAll("[data-check]").forEach(c=>c.addEventListener("change",()=>{const q=read();q.checks[c.dataset.check]=c.checked;write(q)}));
    host.querySelector("#fcNotes")?.addEventListener("input",e=>{const q=read();q.notes=e.target.value;write(q)});
    host.querySelector("#fcReset")?.addEventListener("click",()=>{const q=read();q.checks={};write(q);renderDashboard(context)});
    host.querySelector("#fcPrint")?.addEventListener("click",()=>window.print());
  }
  function renderTeachDay(context={}){
    const host=document.getElementById("pageHost");if(!host)return; const s=read(); let idx=Number.isInteger(s.active)?s.active:currentIndex(); idx=Math.max(0,Math.min(idx,schedule.length-1)); const b=schedule[idx];
    const completed=s.completed||{}; const count=Object.values(completed).filter(Boolean).length;
    host.innerHTML=`<section class="fc-shell fc-teach"><header class="fc-teachbar"><button data-go="dashboard">← Dashboard</button><div><p>TEACH TODAY</p><h2>${b.icon} ${esc(b.title)}</h2><span>${esc(b.time)} · Block ${idx+1} of ${schedule.length}</span></div><strong>${Math.round(count/schedule.length*100)}%</strong></header>
      <div class="fc-progress"><i style="width:${count/schedule.length*100}%"></i></div>
      <section class="fc-teach-grid"><aside class="fc-timeline">${schedule.map((x,i)=>`<button data-select="${i}" class="${i===idx?"active":""} ${completed[i]?"done":""}"><strong>${x.time}</strong><span>${x.icon} ${esc(x.title)}</span></button>`).join("")}</aside>
      <main class="fc-focus"><article><small>WHAT TO DO NOW</small><h3>${esc(b.title)}</h3><p>${b.route==="classroom-launch"?"Open the Launch Center for the day's routines, procedures, and community-building plan.":b.route==="lesson-plans"?"Open today's lesson plan, teach the block, then return here and mark it complete.":b.route==="small-groups"?"Open your group plan and record only the notes you need for tomorrow.":"Use this block for the scheduled routine and transition."}</p><div class="fc-focus-actions"><button class="fc-primary" data-go="${b.route}">Open Workspace</button><button id="fcComplete">${completed[idx]?"✓ Completed":"Mark Complete"}</button></div></article>
      <article><h3>Quick Note for This Block</h3><textarea id="fcBlockNote" placeholder="What worked? What needs reteaching?">${esc((s.blockNotes||{})[idx]||"")}</textarea></article>
      <footer><button id="fcPrev" ${idx===0?"disabled":""}>← Previous</button><button id="fcNext" ${idx===schedule.length-1?"disabled":""}>Next →</button></footer></main></section></section>`;
    const setIdx=n=>{const q=read();q.active=n;write(q);renderTeachDay(context)};
    host.querySelectorAll("[data-go]").forEach(x=>x.addEventListener("click",()=>context.navigate?.(x.dataset.go)||navigate(x.dataset.go)));
    host.querySelectorAll("[data-select]").forEach(x=>x.addEventListener("click",()=>setIdx(Number(x.dataset.select))));
    host.querySelector("#fcPrev")?.addEventListener("click",()=>setIdx(idx-1)); host.querySelector("#fcNext")?.addEventListener("click",()=>setIdx(idx+1));
    host.querySelector("#fcComplete")?.addEventListener("click",()=>{const q=read();q.completed=q.completed||{};q.completed[idx]=!q.completed[idx];if(q.completed[idx]&&idx<schedule.length-1)q.active=idx+1;write(q);renderTeachDay(context)});
    host.querySelector("#fcBlockNote")?.addEventListener("input",e=>{const q=read();q.blockNotes=q.blockNotes||{};q.blockNotes[idx]=e.target.value;write(q)});
  }
  window.TOS_SPRINT1_RENDER_DASHBOARD=renderDashboard;
  window.TOS_V192_RENDER_TEACHDAY=renderTeachDay;
})();
