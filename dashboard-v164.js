(() => {
  "use strict";

  const ROUTE = "dashboard";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";
  const STUDENT_STORE = "thh-v140:student-records";
  const GROUP_STORE = "thh-v141:group-plans";
  const ASSESSMENT_STORE = "thh-v142:assessment-records";
  const STATE_STORE = "thh-v164:dashboard";
  const PREVIEW_STORE = "thh-v170rc2:preview-date";
  const LAUNCH_PROGRESS = "thh-v168:classroom-launch-progress";
  const LAUNCH_START = "2026-07-27";
  const LAUNCH_END = "2026-07-31";
  const CORE_START = "2026-08-03";

  const SCHEDULE = [
    ["7:45","8:10","Breakfast","breakfast"],["8:10","8:20","Morning Work","morning"],
    ["8:20","9:15","MOWR","mowr"],["9:15","9:25","Heggerty","heggerty"],
    ["9:25","9:45","Phonics","phonics"],["9:45","9:55","Vocabulary","vocabulary"],
    ["9:55","10:45","Reading (Open Court)","reading"],["10:45","11:10","Lunch & Recess","lunch"],
    ["11:10","11:40","Writing","writing"],["11:40","12:40","Math","math"],
    ["12:40","1:15","Workout","workout"],["1:15","1:20","Recess","recess"],
    ["1:20","1:40","Math 2","math2"],["1:40","2:15","Science","science"],
    ["2:15","2:55","Social Studies","socialStudies"],["2:55","3:00","Pack-up / Bus Dismissal","packup"],
    ["3:00","3:30","Dismissal","dismissal"]
  ];

  let state = { scheduleExpanded:false };
  let launchData = { days:[] };
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  function read(k,f){try{return JSON.parse(localStorage.getItem(k)||"null")??f}catch{return f}}
  function save(){localStorage.setItem(STATE_STORE,JSON.stringify(state))}
  function route(){return location.hash.replace("#","")||"dashboard"}
  function localDate(){const n=new Date();return new Date(n.getTime()-n.getTimezoneOffset()*60000).toISOString().slice(0,10)}
  function activeDate(){return localStorage.getItem(PREVIEW_STORE)||localDate()}
  function mode(date=activeDate()){return date>=LAUNCH_START&&date<=LAUNCH_END?"launch":date>=CORE_START?"core":"prelaunch"}
  function dateObj(date=activeDate()){return new Date(date+"T12:00:00")}
  function dayName(date=activeDate()){return dateObj(date).toLocaleDateString("en-US",{weekday:"long"})}
  function longDate(date=activeDate()){return dateObj(date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
  function launchDay(date=activeDate()){return launchData.days?.find(d=>d.date===date)||null}
  function timeTo24(v){let[h,m]=v.split(":").map(Number);if(h>=1&&h<=3)h+=12;return h*60+m}
  function currentBlock(){const now=new Date(),mins=now.getHours()*60+now.getMinutes(),blocks=SCHEDULE.map(([start,end,title,key])=>({start,end,title,key,startMinutes:timeTo24(start),endMinutes:timeTo24(end)}));const active=blocks.find(b=>mins>=b.startMinutes&&mins<b.endMinutes);if(active){const i=blocks.indexOf(active);return{active,next:blocks[i+1]||null}}return{active:null,next:blocks.find(b=>mins<b.startMinutes)||null}}
  function plan(){return read(WEEK_STORE,{days:{}})}
  function dayPlan(){return plan().days?.[dayName()]||{}}
  function attentionItems(){const a=read(ATTACHMENT_STORE,[]),p=read(PRINT_STORE,[]),ass=read(ASSESSMENT_STORE,[]),items=[];const ma=a.filter(x=>x.status==="Missing Link"||(!(x.url||x.fileName)&&x.print)).length;if(ma)items.push({label:`${ma} attachment${ma===1?"":"s"} need a file or link`,route:"attachments"});const pp=p.filter(x=>!x.complete).length;if(pp)items.push({label:`${pp} print item${pp===1?" is":"s are"} waiting`,route:"print-center"});const ia=ass.filter(x=>["Not Started","Needs Make-Up","Scheduled"].includes(x.status)).length;if(ia)items.push({label:`${ia} assessment record${ia===1?"":"s"} need attention`,route:"assessments"});if(mode()==="core"&&Object.keys(dayPlan()).length<3)items.push({label:"Today's core lesson plan is not fully prepared",route:"lesson-plans"});return items}
  function launchCounts(day){const s=read(LAUNCH_PROGRESS,{completed:{},procedures:{},prep:{}});if(!day)return{done:0,total:0};const done=day.blocks.filter(b=>s.completed?.[b.id]).length+day.procedures.filter((_,i)=>s.procedures?.[`${day.day}-${i}`]).length+day.prep.filter((_,i)=>s.prep?.[`${day.day}-${i}`]).length;return{done,total:day.blocks.length+day.procedures.length+day.prep.length}}
  function lessonCard(label,title,detail,target){return `<article class="v164-lesson-card"><span>${esc(label)}</span><strong>${esc(title)}</strong><p>${esc(detail||"")}</p><button data-go="${target}">Open</button></article>`}
  function lessonCards(){const m=mode(),d=launchDay(),today=dayPlan();if(m==="prelaunch")return[
    lessonCard("PRE-LAUNCH","Prepare Classroom Launch","Review the complete July 27–31 plan and first-week resources.","classroom-launch"),
    lessonCard("READINESS","Teacher Intelligence","Check plans, printing, attachments, and preparation gaps.","teacher-intelligence"),
    lessonCard("PLANNING","Curriculum Automation","Preview launch week and the August 3 core start.","curriculum-automation"),
    lessonCard("RESOURCES","Print & Attachments","Finish first-week copies and linked materials.","print-center")].join("");
    if(m==="launch"&&d)return d.blocks.slice(0,4).map(b=>lessonCard(`${b.subject} • DAY ${d.day}`,b.title,b.objective,"classroom-launch")).join("");
    return [
      lessonCard("ELA / OPEN COURT",today.reading||"Unit 1, Lesson 1 — The Mice Who Lived in a Shoe","Core curriculum begins August 3.","open-court"),
      lessonCard("MATH / EUREKA MATH²",today.math||"Select today's Eureka Math² lesson","","eureka-math"),
      lessonCard("SCIENCE",today.science||"Select today's science lesson","","science-intelligence"),
      lessonCard("WRITING / SOCIAL STUDIES",today.socialStudies||today.writing||"Select today's writing or social studies lesson","","afternoon-studios")].join("")}
  function statusCopy(){const m=mode(),d=launchDay();if(m==="prelaunch")return{tag:"PRE-LAUNCH PREPARATION",title:"Classroom Launch begins July 27",text:"Prepare procedures, copies, first-week resources, and the classroom environment."};if(m==="launch"&&d)return{tag:`CLASSROOM LAUNCH • DAY ${d.day}`,title:d.theme,text:d.focus};return{tag:"CORE INSTRUCTION",title:"Curriculum begins August 3",text:"Open Court Unit 1 begins with “The Mice Who Lived in a Shoe.”"}}
  function startRoute(){return mode()==="launch"?"classroom-launch":"teaching-engine"}
  function render(){if(route()!==ROUTE)return;const host=$("#pageHost");if(!host)return;const block=currentBlock(),attention=attentionItems(),students=read(STUDENT_STORE,[]),groups=read(GROUP_STORE,{}),status=statusCopy(),d=launchDay(),lc=launchCounts(d);
    host.innerHTML=`<section id="v72Dashboard" class="v164-dashboard">
      <section class="v164-preview"><label><span>PREVIEW DATE</span><input id="v164PreviewDate" type="date" value="${activeDate()}"></label><button id="v164UseToday" class="secondary-button">Use Today</button></section>
      <section class="v164-hero"><div><p>${esc(longDate())}</p><h1>Good morning, Mrs. Parrish</h1><span>${esc(status.tag)}</span><div class="v164-mode"><strong>${esc(status.title)}</strong><p>${esc(status.text)}</p></div></div><div class="v164-hero-actions"><button id="v164StartTeaching" class="primary-button">Start Teaching</button><button data-go="calendar" class="secondary-button">Calendar</button></div></section>
      <section class="v164-top-grid"><article class="panel v164-next-card"><span>${mode()==="launch"?"LAUNCH PROGRESS":"CURRENT / NEXT BLOCK"}</span><h2>${mode()==="launch"&&d?`${lc.done}/${lc.total} items complete`:esc(block.active?.title||block.next?.title||"Day Complete")}</h2><p>${mode()==="launch"&&d?`Day ${d.day}: ${esc(d.theme)}`:block.active?`${block.active.start}–${block.active.end}`:block.next?`Begins at ${block.next.start}`:"No more scheduled blocks today."}</p></article><article class="panel v164-ready-card ${attention.length?"needs-attention":"ready"}"><span>READINESS</span><h2>${attention.length?`${attention.length} area${attention.length===1?"":"s"} need attention`:"You're ready for today"}</h2><p>${attention.length?"Finish the preparation items below.":"Plans, materials, and teaching tools are ready."}</p></article><article class="panel v164-quick-card"><span>QUICK LAUNCH</span><div><button data-go="${startRoute()}">Live Teaching</button><button data-go="communication">ClassDojo / Messages</button><button data-go="students">Students</button></div></article></section>
      <section class="panel v164-schedule"><div class="v164-section-heading"><div><span>TODAY'S SCHEDULE</span><h2>Instructional Timeline</h2></div><button id="v164ScheduleToggle" class="secondary-button">${state.scheduleExpanded?"Show Less":"Show Full Day"}</button></div><div class="v164-schedule-strip ${state.scheduleExpanded?"expanded":""}">${scheduleMarkup(block)}</div></section>
      <section class="v164-section"><div class="v164-section-heading"><div><span>${esc(status.tag)}</span><h2>Open only what you need</h2></div><button data-go="${mode()==="launch"?"classroom-launch":"lesson-plans"}" class="secondary-button">${mode()==="launch"?"Open Full Launch Day":"Weekly Planning"}</button></div><div class="v164-lessons">${lessonCards()}</div></section>
      <section class="v164-middle-grid"><article class="panel v164-attention"><div class="v164-section-heading"><div><span>NEEDS YOUR ATTENTION</span><h2>${attention.length?"Finish these items":"Everything is ready"}</h2></div></div><div class="v164-attention-list">${attention.length?attention.map(i=>`<button data-go="${i.route}"><b>!</b><span>${esc(i.label)}</span><strong>Open</strong></button>`).join(""):`<div class="v164-all-ready"><b>✓</b><span>No preparation alerts for today.</span></div>`}</div></article><article class="panel v164-groups"><div class="v164-section-heading"><div><span>SMALL GROUPS & INTERVENTION</span><h2>Today's support</h2></div></div><div class="v164-group-summary">${["Red","Yellow","Green","Blue"].map(color=>{const count=students.filter(s=>(s.readingGroup||"").startsWith(color)).length;return`<article><strong>${color}</strong><span>${count} student${count===1?"":"s"}</span><small>Plan available</small></article>`}).join("")}</div><div class="button-row"><button data-go="small-groups" class="primary-button">Open Small Groups</button><button data-go="intervention" class="secondary-button">Intervention</button></div></article></section>
      <section class="v164-compartments">${compartment("Plan the Week","planning",[["Teacher Intelligence","teacher-intelligence"],["Curriculum Automation","curriculum-automation"],["Classroom Launch","classroom-launch"],["Weekly Planning","lesson-plans"],["Daily Lesson Packets","production"]])}${compartment("Curriculum","curriculum",[["Open Court Intelligence","open-court"],["Eureka Math Intelligence","eureka-math"],["Science Intelligence","science-intelligence"],["Writing, Science & Social Studies","afternoon-studios"]])}${compartment("Students & Data","students",[["Student Profiles","students"],["Small Groups","small-groups"],["Intervention","intervention"],["Assessments & Data","assessments"],["Communication","communication"]])}${compartment("Resources & Printing","resources",[["Lesson Attachments","attachments"],["Print Center","print-center"],["Forms & Printables","forms"],["Resources","resources"]])}</section>
    </section>`;wire()}
  function scheduleMarkup(block){const now=block.active?.key,next=block.next?.key,visible=state.scheduleExpanded?SCHEDULE:SCHEDULE.filter(x=>x[3]===now||x[3]===next).slice(0,2),use=visible.length?visible:SCHEDULE.slice(-2);return use.map(([s,e,t,k])=>`<article class="${k===now?"current":k===next?"next":""}"><span>${s}–${e}</span><strong>${esc(t)}</strong><small>${k===now?"Now":k===next?"Next":""}</small></article>`).join("")}
  function compartment(title,key,items){return`<details class="panel v164-details" data-compartment="${key}"><summary><span>${esc(title)}</span><strong>${items.length} tools</strong></summary><div class="v164-tool-grid">${items.map(([l,r])=>`<button data-go="${r}">${esc(l)}</button>`).join("")}</div></details>`}
  function wire(){$("#v164StartTeaching")?.addEventListener("click",()=>location.hash=startRoute());$("#v164ScheduleToggle")?.addEventListener("click",()=>{state.scheduleExpanded=!state.scheduleExpanded;save();render()});$("#v164PreviewDate")?.addEventListener("change",e=>{if(e.target.value)localStorage.setItem(PREVIEW_STORE,e.target.value);render()});$("#v164UseToday")?.addEventListener("click",()=>{localStorage.removeItem(PREVIEW_STORE);render()});$$('[data-go]').forEach(b=>b.addEventListener("click",()=>location.hash=b.dataset.go))}
  async function init(){state={...state,...read(STATE_STORE,{})};try{const r=await fetch("classroom-launch-v168.json",{cache:"no-store"});if(r.ok)launchData=await r.json()}catch(e){console.error(e)}takeControl()}
  function takeControl(){if(route()!==ROUTE)return;setTimeout(render,20);setTimeout(render,180)}
  window.THH_RENDER_CALM_DASHBOARD=render;window.THH_ACTIVE_SCHOOL_DATE=activeDate;window.addEventListener("hashchange",takeControl);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();