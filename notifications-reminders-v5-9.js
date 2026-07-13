
(function(){
"use strict";
const STORE="thh-v59:reminders", HISTORY="thh-v59:history";
let data, reminders=[], history=[], overlay;
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const safe=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}};
const save=()=>{localStorage.setItem(STORE,JSON.stringify(reminders));localStorage.setItem(HISTORY,JSON.stringify(history));refreshBadge();};
const statusFor=r=>{
  if(r.status!=="Active")return r.status;
  const value=r.snoozedUntil||r.dueDate;
  if(!value)return"No Date";
  const due=new Date(value.includes("T")?value:value+"T12:00:00");
  const today=new Date();today.setHours(0,0,0,0);due.setHours(0,0,0,0);
  if(due<today)return"Overdue";
  if(due.getTime()===today.getTime())return"Due Today";
  const d=Math.ceil((due-today)/86400000);
  return d<=7?"Upcoming":"Scheduled";
};
async function start(){
  const css=document.createElement("link");css.rel="stylesheet";css.href="style-additions-v5-9.css";document.head.appendChild(css);
  data=await(await fetch("notifications-reminders-v5-9.json",{cache:"no-store"})).json();
  try{reminders=JSON.parse(localStorage.getItem(STORE)||"[]");history=JSON.parse(localStorage.getItem(HISTORY)||"[]")}catch{}
  if(!reminders.length){reminders=data.defaultReminders.map(x=>({...x,status:"Active",createdAt:new Date().toISOString(),snoozedUntil:""}));save()}
  importSources();build();addButton();addDashboardCard();refreshBadge();
}
function importSources(){
  const existing=new Set(reminders.map(r=>r.sourceKey).filter(Boolean));
  const upcoming=safe("thh-v58:upcoming-events")||[];
  upcoming.slice(0,10).forEach(e=>{
    const key="calendar-"+e.id;if(existing.has(key))return;
    reminders.push({id:"r-"+Date.now()+Math.random(),sourceKey:key,title:e.title,category:"Calendar",priority:e.priority||"Medium",dueDate:e.date||"",notes:e.description||"",connectedSystem:e.connectedSystem||"schoolCalendarButton",status:"Active",createdAt:new Date().toISOString(),snoozedUntil:""});
  });
  const reteach=safe("thh-v54:teachday-next-step")||safe("thh-v54:planner-next-step");
  if(reteach&&!existing.has("reteach-current"))reminders.push({id:"reteach-current",sourceKey:"reteach-current",title:"Reteach "+(reteach.skillTitle||"current skill"),category:"Assessment & Reteach",priority:"High",dueDate:"",notes:(reteach.group||"")+" "+(reteach.action||""),connectedSystem:"assessmentReteachButton",status:"Active",createdAt:new Date().toISOString(),snoozedUntil:""});
  const student=safe("thh-v55:teachday-support")||safe("thh-v55:small-group-support");
  if(student&&!existing.has("student-current"))reminders.push({id:"student-current",sourceKey:"student-current",title:"Follow up with "+(student.studentName||"student"),category:"Student Follow-Up",priority:"High",dueDate:student.followUpDate||"",notes:(student.skill||"")+" — "+(student.nextStep||student.goal||""),connectedSystem:"studentSupportFamilyButton",status:"Active",createdAt:new Date().toISOString(),snoozedUntil:""});
  const standard=safe("thh-v56:assessment-standard")||safe("thh-v56:planner-standard");
  if(standard&&!existing.has("standard-current"))reminders.push({id:"standard-current",sourceKey:"standard-current",title:"Add evidence for "+(standard.title||"current standard"),category:"Standards Evidence",priority:standard.evidenceCount===0?"High":"Medium",dueDate:"",notes:(standard.subject||"")+" • "+(standard.status||""),connectedSystem:"standardsReportingButton",status:"Active",createdAt:new Date().toISOString(),snoozedUntil:""});
  save();
}
function build(){
  overlay=document.createElement("div");overlay.className="v59-overlay";
  overlay.innerHTML=`<section class="v59-dialog">
  <header><div><p>VERSION 5.9</p><h2>Notifications, Reminders & Follow-Up</h2><span>${esc(data.releaseStatus)}</span></div><button id="v59Close">×</button></header>
  <div id="v59Stats" class="v59-stats"></div>
  <div class="v59-toolbar"><input id="v59Search" placeholder="Search reminders..."><select id="v59Category"><option value="All">All Categories</option>${data.categories.map(c=>`<option>${esc(c)}</option>`).join("")}</select><select id="v59Filter"><option>Active</option><option>Due Today</option><option>Overdue</option><option>Upcoming</option><option>Completed</option><option>Dismissed</option><option>All</option></select><button id="v59Add">Add Reminder</button><button id="v59Refresh">Refresh Sources</button><button id="v59Print">Print</button></div>
  <div class="v59-layout"><main id="v59List"></main><aside id="v59History"></aside></div>
  <footer><span id="v59Status">Ready</span><span>TeachingHappensHere v5.9</span></footer></section>`;
  document.body.appendChild(overlay);
  v59Close.onclick=close;v59Search.oninput=render;v59Category.onchange=render;v59Filter.onchange=render;v59Add.onclick=addReminder;v59Refresh.onclick=()=>{importSources();render()};v59Print.onclick=()=>window.print();overlay.onclick=e=>{if(e.target===overlay)close()};render();
}
function render(){
  const active=reminders.filter(r=>r.status==="Active");
  const overdue=active.filter(r=>statusFor(r)==="Overdue").length,today=active.filter(r=>statusFor(r)==="Due Today").length,upcoming=active.filter(r=>statusFor(r)==="Upcoming").length,high=active.filter(r=>r.priority==="High").length,complete=reminders.filter(r=>r.status==="Completed").length;
  v59Stats.innerHTML=`<article><strong>${active.length}</strong><span>Active</span></article><article class="${overdue?"alert":""}"><strong>${overdue}</strong><span>Overdue</span></article><article class="${today?"alert":""}"><strong>${today}</strong><span>Due Today</span></article><article><strong>${upcoming}</strong><span>Upcoming</span></article><article class="${high?"alert":""}"><strong>${high}</strong><span>High Priority</span></article><article><strong>${complete}</strong><span>Completed</span></article>`;
  const q=v59Search.value.toLowerCase().trim(),cat=v59Category.value,filter=v59Filter.value;
  const items=reminders.filter(r=>{
    const s=statusFor(r), c=cat==="All"||r.category===cat, text=!q||JSON.stringify(r).toLowerCase().includes(q);
    let f=filter==="All"||filter==="Active"&&r.status==="Active"||filter==="Completed"&&r.status==="Completed"||filter==="Dismissed"&&r.status==="Dismissed"||!["All","Active","Completed","Dismissed"].includes(filter)&&s===filter;
    return c&&text&&f;
  }).sort((a,b)=>({Overdue:0,"Due Today":1,Upcoming:2,Scheduled:3,"No Date":4}[statusFor(a)]??9)-({Overdue:0,"Due Today":1,Upcoming:2,Scheduled:3,"No Date":4}[statusFor(b)]??9));
  v59List.innerHTML=items.map(r=>`<article class="v59-reminder priority-${r.priority.toLowerCase()}"><div class="v59-top"><div><span>${esc(r.category)} • ${esc(r.priority)}</span><h3>${esc(r.title)}</h3></div><b>${esc(statusFor(r))}</b></div><p>${esc(r.notes||"")}</p><small>${r.dueDate?"Due: "+esc(r.dueDate):"No due date"}</small><div class="v59-actions">${r.status==="Active"?`<button data-complete="${r.id}">Complete</button><button data-snooze="${r.id}">Snooze</button><button data-edit="${r.id}">Edit</button><button data-open="${r.connectedSystem||""}">Open System</button><button data-dismiss="${r.id}">Dismiss</button>`:`<button data-restore="${r.id}">Restore</button><button data-delete="${r.id}">Delete</button>`}</div></article>`).join("")||"<p>No reminders match.</p>";
  wire();
  v59History.innerHTML=`<h3>Recent Activity</h3>${history.slice(0,20).map(h=>`<article><strong>${esc(h.action)}</strong><span>${esc(h.title)}</span><small>${new Date(h.date).toLocaleString()}</small></article>`).join("")||"<p>No history yet.</p>"}<button id="v59Clear">Clear History</button>`;
  v59Clear.onclick=()=>{if(confirm("Clear reminder history?")){history=[];save();render()}};
  refreshBadge();updateDashboardCard();
}
function log(action,item){history.unshift({date:new Date().toISOString(),action,title:item.title});history=history.slice(0,100)}
function change(id,status){const r=reminders.find(x=>x.id===id);if(!r)return;r.status=status;r.snoozedUntil="";log(status,r);save();render()}
function wire(){
  document.querySelectorAll("[data-complete]").forEach(b=>b.onclick=()=>change(b.dataset.complete,"Completed"));
  document.querySelectorAll("[data-dismiss]").forEach(b=>b.onclick=()=>change(b.dataset.dismiss,"Dismissed"));
  document.querySelectorAll("[data-restore]").forEach(b=>b.onclick=()=>change(b.dataset.restore,"Active"));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{const r=reminders.find(x=>x.id===b.dataset.delete);if(confirm(`Delete "${r.title}"?`)){reminders=reminders.filter(x=>x.id!==r.id);log("Deleted",r);save();render()}});
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editReminder(b.dataset.edit));
  document.querySelectorAll("[data-snooze]").forEach(b=>b.onclick=()=>snooze(b.dataset.snooze));
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{if(!b.dataset.open)return;close();document.getElementById(b.dataset.open)?.click()});
}
function snooze(id){
  const r=reminders.find(x=>x.id===id), answer=prompt(data.snoozeOptions.map((o,i)=>`${i+1}. ${o.label}`).join("\n"),"1"), option=data.snoozeOptions[Number(answer)-1];if(!option)return;
  r.snoozedUntil=new Date(Date.now()+option.hours*3600000).toISOString();log("Snoozed: "+option.label,r);save();render();
}
function addReminder(){const id="r-"+Date.now();reminders.unshift({id,title:"New Reminder",category:"Personal Reminder",priority:"Medium",dueDate:"",notes:"",connectedSystem:"",status:"Active",createdAt:new Date().toISOString(),snoozedUntil:""});save();editReminder(id)}
function editReminder(id){
  const r=reminders.find(x=>x.id===id);
  v59List.innerHTML=`<section class="v59-edit"><h2>Edit Reminder</h2><label>Title<input id="eTitle" value="${esc(r.title)}"></label><label>Category<select id="eCategory">${data.categories.map(c=>`<option ${c===r.category?"selected":""}>${esc(c)}</option>`).join("")}</select></label><label>Priority<select id="ePriority">${data.priorities.map(p=>`<option ${p===r.priority?"selected":""}>${p}</option>`).join("")}</select></label><label>Due Date<input id="eDue" type="date" value="${esc(r.dueDate||"")}"></label><label class="wide">Notes<textarea id="eNotes">${esc(r.notes||"")}</textarea></label><div><button id="eSave">Save</button><button id="eCancel">Cancel</button></div></section>`;
  eSave.onclick=()=>{r.title=eTitle.value.trim()||"Untitled Reminder";r.category=eCategory.value;r.priority=ePriority.value;r.dueDate=eDue.value;r.notes=eNotes.value.trim();log("Updated",r);save();render()};eCancel.onclick=render;
}
function refreshBadge(){const badge=document.getElementById("v59Badge");if(!badge)return;const count=reminders.filter(r=>r.status==="Active"&&(statusFor(r)==="Overdue"||statusFor(r)==="Due Today"||r.priority==="High")).length;badge.textContent=count;badge.hidden=!count}
function addButton(){
  const b=document.createElement("button");b.id="notificationsReminderButton";b.className="v59-button";b.innerHTML=`<span>5.9</span><strong>Reminders</strong><small>Follow-Up</small><b id="v59Badge" hidden>0</b>`;b.onclick=open;
  const prior=document.getElementById("schoolCalendarButton");prior?prior.insertAdjacentElement("afterend",b):document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",b);
}
function addDashboardCard(){
  const d=document.getElementById("dashboard");if(!d||document.getElementById("v59DashboardCard"))return;
  const card=document.createElement("section");card.id="v59DashboardCard";card.className="v59-dashboard-card";card.innerHTML=`<div><p>REMINDERS & FOLLOW-UP</p><h3 id="v59DashTitle">No urgent reminders</h3><span id="v59DashText">Upcoming actions will appear here.</span></div><button>Open Reminders</button>`;card.querySelector("button").onclick=open;
  const prior=document.getElementById("v58DashboardCard");prior?prior.insertAdjacentElement("afterend",card):d.prepend(card);updateDashboardCard();
}
function updateDashboardCard(){const urgent=reminders.filter(r=>r.status==="Active"&&["Overdue","Due Today"].includes(statusFor(r))),t=document.getElementById("v59DashTitle"),x=document.getElementById("v59DashText");if(!t)return;t.textContent=urgent.length?`${urgent.length} reminder${urgent.length===1?"":"s"} need attention`:"No urgent reminders";x.textContent=urgent.length?urgent.slice(0,3).map(r=>r.title).join(" • "):"Review upcoming follow-ups and preparation."}
function open(){overlay.classList.add("open");document.body.classList.add("v59-open");importSources();render()}
function close(){overlay.classList.remove("open");document.body.classList.remove("v59-open")}
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="n"){e.preventDefault();if(overlay)open()}if(e.key==="Escape"&&overlay?.classList.contains("open"))close()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
