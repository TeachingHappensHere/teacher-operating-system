(() => {
  "use strict";
  const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
  const SUBJECTS=["Morning Meeting","MOWR","Heggerty","Phonics","Vocabulary","Reading & Responding","Eureka Math²","Writing","Social Studies","Science"];
  const key="tos-v1-weekly-planner";
  const esc=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const load=()=>{try{return JSON.parse(localStorage.getItem(key)||"{}") }catch{return {}}};
  const save=d=>localStorage.setItem(key,JSON.stringify(d));
  function render(ctx={}){
    const host=document.getElementById("pageHost");if(!host)return;const data=load();const day=data.activeDay||"Monday";const subject=data.activeSubject||"Morning Meeting";const id=`${day}|${subject}`;const p=data.plans?.[id]||{};
    host.innerHTML=`<section class="planner-v1"><header class="planner-v1-hero"><div><p>WEEKLY PLANNER</p><h2>Plan once. Teach clearly.</h2><span>Objectives, standards, I Do, We Do, You Do, materials, assessment and links.</span></div><div><button id="plannerPrint" class="secondary-button">Print</button><button id="plannerSave" class="primary-button">Save Plan</button></div></header>
    <nav class="planner-day-tabs">${DAYS.map(d=>`<button class="${d===day?'active':''}" data-plan-day="${d}">${d}</button>`).join("")}</nav>
    <section class="planner-v1-layout"><aside class="planner-subjects">${SUBJECTS.map(s=>`<button class="${s===subject?'active':''}" data-plan-subject="${esc(s)}">${esc(s)}</button>`).join("")}</aside>
    <main class="planner-editor panel"><div class="planner-editor-heading"><div><span>${esc(day)}</span><h3>${esc(subject)}</h3></div><label class="planner-ready"><input id="planReady" type="checkbox" ${p.ready?'checked':''}> Ready to teach</label></div>
    <div class="planner-fields"><label class="wide">Objective<textarea data-field="objective" placeholder="Students will...">${esc(p.objective||"")}</textarea></label><label class="wide">Arizona Standard(s)<input data-field="standards" value="${esc(p.standards||"")}" placeholder="Example: 2.RL.1"></label>
    <label>I Do<textarea data-field="iDo">${esc(p.iDo||"")}</textarea></label><label>We Do<textarea data-field="weDo">${esc(p.weDo||"")}</textarea></label><label>You Do<textarea data-field="youDo">${esc(p.youDo||"")}</textarea></label>
    <label>Materials<textarea data-field="materials">${esc(p.materials||"")}</textarea></label><label>Assessment / Check for Understanding<textarea data-field="assessment">${esc(p.assessment||"")}</textarea></label><label>Notes / Differentiation<textarea data-field="notes">${esc(p.notes||"")}</textarea></label>
    <label class="wide">Lesson & Resource Links<textarea data-field="links" placeholder="Paste one link per line">${esc(p.links||"")}</textarea></label></div></main></section></section>`;
    const persist=()=>{const d=load();d.activeDay=day;d.activeSubject=subject;d.plans=d.plans||{};const item={};host.querySelectorAll("[data-field]").forEach(f=>item[f.dataset.field]=f.value);item.ready=host.querySelector("#planReady").checked;d.plans[id]=item;save(d);ctx.toast?.("Weekly plan saved.")};
    host.querySelectorAll("[data-plan-day]").forEach(b=>b.addEventListener("click",()=>{persist();const d=load();d.activeDay=b.dataset.planDay;save(d);render(ctx)}));
    host.querySelectorAll("[data-plan-subject]").forEach(b=>b.addEventListener("click",()=>{persist();const d=load();d.activeSubject=b.dataset.planSubject;save(d);render(ctx)}));
    host.querySelector("#plannerSave")?.addEventListener("click",persist);host.querySelector("#plannerPrint")?.addEventListener("click",()=>window.print());
  }
  window.TOS_V1_RENDER_WEEKLY_PLANNER=render;
})();
