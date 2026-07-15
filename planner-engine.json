
(() => {
"use strict";
const ROUTE="open-court", STORE="thh-v161:open-court", WEEK="thh-v73:weekly-plan",
ATT="thh-v74:attachments", PRINT="thh-v74:print-center";
let cfg=null,state={week:1,done:{}};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const days=["Monday","Tuesday","Wednesday","Thursday","Friday"];
async function start(){
 window.THH_RENDER_OPEN_COURT_INTELLIGENCE=render;
 try{cfg=await fetch("tos-data.json",{cache:"no-store"}).then(r=>r.json())}catch{cfg={openCourtIntelligenceV161:{sequence:[]}}}
 try{state={...state,...JSON.parse(localStorage.getItem(STORE)||"{}")}}catch{}
 window.addEventListener("hashchange",take);take();
}
function seq(){return (cfg.openCourtIntelligenceV161?.sequence||[]).map(x=>({week:x[0],unit:x[1],lesson:x[2],title:x[3]}))}
function selected(){return seq().find(x=>x.week===Number(state.week))||seq()[0]}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function route(){return location.hash.slice(1)||"dashboard"}
function monday(n){const d=new Date("2026-08-03T12:00:00");d.setDate(d.getDate()+(n-1)*7);return d.toISOString().slice(0,10)}
function fmt(v){return new Date(v+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
function render(){
 if(route()!==ROUTE)return;
 const h=$("#pageHost"),l=selected();if(!h||!l)return;
 const done=state.done[l.week]||{}, pct=Math.round((["planning","attachments","printing"].filter(k=>done[k]).length/3)*100);
 h.innerHTML=`<section id="v161OpenCourt"><section class="page-header"><div><p>VERSION 16.1</p><h2>Open Court Intelligence</h2><span>Build the weekly story, skills, assessments, resources, and print needs.</span></div><div class="button-row"><button id="all" class="primary-button">Build Open Court Week</button><button id="teacher" class="secondary-button">Teacher Intelligence</button></div></section>
 <section class="panel v161-selector"><label><span>Open Court Week</span><select id="week">${seq().map(x=>`<option value="${x.week}" ${x.week===l.week?"selected":""}>Week ${x.week} — Unit ${x.unit}, Lesson ${x.lesson} — ${esc(x.title)}</option>`).join("")}</select></label><article><span>CURRICULUM WEEK</span><strong>Week ${l.week}</strong><small>${fmt(monday(l.week))}</small></article><article><span>SELECTION</span><strong>${esc(l.title)}</strong><small>Unit ${l.unit}, Lesson ${l.lesson}</small></article></section>
 <section class="v161-progress"><div><b style="width:${pct}%"></b></div><strong>${pct}%</strong></section>
 <section class="v161-workflow">${card("planning","Weekly Planning",done.planning)}${card("attachments","Lesson Attachments",done.attachments)}${card("printing","Print Center",done.printing)}</section>
 <section class="v161-components">${["Story / Selection","Phonics","Vocabulary","Comprehension","Skills Practice","Grammar / GUM","Friday Assessments","Teacher Materials"].map(x=>`<article class="panel"><span>${x}</span><strong>${detail(x,l)}</strong></article>`).join("")}</section>
 <section class="panel v161-days"><h3>Monday–Friday Outline</h3><div>${days.map(d=>`<article><span>${d}</span><strong>${dayText(d,l)}</strong></article>`).join("")}</div></section></section>`;
 wire();
}
function card(k,t,c){return `<article class="panel v161-card ${c?"complete":""}"><span>${c?"COMPLETE":"READY"}</span><h3>${t}</h3><p>Prepare the connected ${t.toLowerCase()} records.</p><button data-step="${k}" class="${c?"secondary-button":"primary-button"}">${c?"Run Again":"Run Step"}</button></article>`}
function detail(x,l){return({"Story / Selection":l.title,"Phonics":"Open Court weekly phonics sequence","Vocabulary":"Weekly selection vocabulary","Comprehension":"Selection comprehension and response","Skills Practice":"Weekly Skills Practice pages","Grammar / GUM":"Open Court GUM / grammar lesson","Friday Assessments":"Phonics, vocabulary, spelling, GUM, and reading","Teacher Materials":"Teacher guide, slides, anchor charts, and approved links"})[x]}
function dayText(d,l){return d==="Monday"?`Introduce ${l.title}`:d==="Tuesday"?"Reread, model comprehension, and complete Skills Practice":d==="Wednesday"?"Deepen comprehension, vocabulary, and written response":d==="Thursday"?"Review skills, grammar / GUM, and prepare for assessment":"Complete weekly assessments, feedback, and reteaching"}
function wire(){
 $("#week").onchange=e=>{state.week=Number(e.target.value);save();render()};
 $("#teacher").onclick=()=>location.hash="intelligence-engine";
 $("#all").onclick=()=>{["planning","attachments","printing"].forEach(k=>run(k,false));save();note("Open Court week prepared.");render()};
 $$("[data-step]").forEach(b=>b.onclick=()=>run(b.dataset.step,true));
}
function run(k,again){
 const l=selected(); if(k==="planning")planning(l);if(k==="attachments")attachments(l);if(k==="printing")printing(l);
 state.done[l.week]=state.done[l.week]||{};state.done[l.week][k]=true;save();if(again){note("Step prepared.");render()}
}
function planning(l){
 let p={};try{p=JSON.parse(localStorage.getItem(WEEK)||"{}")}catch{}
 p={...p,version:"16.1",title:`Curriculum Week ${l.week}`,weekOf:monday(l.week),curriculumWeek:l.week,openCourt:{unit:l.unit,lesson:l.lesson,title:l.title},days:p.days||{}};
 days.forEach(d=>p.days[d]={...(p.days[d]||{}),day:d,reading:l.title,openCourtLesson:`Unit ${l.unit}, Lesson ${l.lesson}`,phonics:"Open Court weekly phonics sequence",vocabulary:"Weekly selection vocabulary",comprehension:d==="Friday"?"Weekly reading assessment":"Selection comprehension and response",skillsPractice:"Open Court Skills Practice",grammar:"Open Court GUM / grammar",assessment:d==="Friday"?"Phonics, vocabulary, spelling, GUM, and reading assessments":"Teacher observation and daily response evidence"});
 localStorage.setItem(WEEK,JSON.stringify(p));
}
function attachments(l){
 let a=[];try{a=JSON.parse(localStorage.getItem(ATT)||"[]")}catch{}if(!Array.isArray(a))a=[];
 const w=monday(l.week),t=[["Teacher Materials","Teacher Guide / Slides",true,1],["Story / Selection","Selection Text",false,33],["Phonics","Phonics Practice",false,33],["Vocabulary","Vocabulary Practice",false,33],["Skills Practice","Skills Practice Pages",false,33],["Grammar / GUM","Grammar / GUM Page",false,33],["Assessment","Phonics Assessment",false,33],["Assessment","Vocabulary Assessment",false,33],["Assessment","Spelling Assessment",false,33],["Assessment","Grammar / GUM Assessment",false,33],["Assessment","Reading Comprehension Assessment",false,33]];
 const g=t.map((x,i)=>({id:`v161-${w}-${i}`,title:`${l.title} — ${x[1]}`,day:x[0]==="Assessment"?"Friday":"Before Monday",category:x[0],type:x[1],lesson:`Unit ${l.unit}, Lesson ${l.lesson}`,url:"",fileName:"",notes:"Add the authorized Open Court resource.",print:!x[2],copies:x[3],status:"Missing Link",teacherOnly:x[2]}));
 const ids=new Set(g.map(x=>x.id));localStorage.setItem(ATT,JSON.stringify([...a.filter(x=>!ids.has(x.id)),...g]));
}
function printing(l){
 let a=[],q=[];try{a=JSON.parse(localStorage.getItem(ATT)||"[]")}catch{}try{q=JSON.parse(localStorage.getItem(PRINT)||"[]")}catch{}if(!Array.isArray(a))a=[];if(!Array.isArray(q))q=[];
 const w=monday(l.week);a.filter(x=>x.id?.includes(w)&&x.print).forEach(x=>{const r={id:`print-${x.id}`,source:"Open Court Intelligence 16.1",day:x.day,title:x.title,category:"Open Court",section:x.teacherOnly?"Teacher Materials":"Student Copies",copies:x.teacherOnly?1:x.copies||33,notes:x.notes,url:x.url||x.fileName||"",complete:false,missingSource:!(x.url||x.fileName),teacherOnly:Boolean(x.teacherOnly)};const i=q.findIndex(y=>y.id===r.id);if(i>=0)q[i]={...r,complete:q[i].complete};else q.push(r)});localStorage.setItem(PRINT,JSON.stringify(q));
}
function note(m){const t=$("#toast");if(!t)return;t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function take(){if(route()===ROUTE){setTimeout(render,25);setTimeout(render,250)}}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
