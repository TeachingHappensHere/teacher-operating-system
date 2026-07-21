(function(){
  'use strict';
  const VERSION='21.1.0';
  const KEY='thh:subject-planner:v210';
  const SUBJECTS=[
    ['reading','📚','Reading'],['math','🔢','Math'],['writing','✍️','Writing'],['science','🔬','Science'],['social-studies','🌎','Social Studies'],['mowr','🧠','MOWR'],['heggerty','🔤','Heggerty'],['morning-meeting','☀️','Morning Meeting']
  ];
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const DEFAULTS={subject:'reading',day:'Monday',weekStart:nextMondayISO(),lessons:{}};
  let model=load();

  function nextMondayISO(){const d=new Date();const diff=(d.getDay()+6)%7;d.setDate(d.getDate()-diff);return localISO(d)}
  function localISO(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}
  function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function load(){try{return {...DEFAULTS,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return structuredClone(DEFAULTS)}}
  function save(){localStorage.setItem(KEY,JSON.stringify(model));window.TOS_APP_BRIDGE?.toast?.('Lesson saved.');}
  function lessonKey(subject=model.subject,day=model.day){return `${model.weekStart}|${subject}|${day}`}
  function blank(){return {objective:'',ican:'',standardId:'',standardDesc:'',lessonTitle:'',instruction:'',ell:'',iep:'',s504:'',materials:'',strategies:'',evidence:'',homework:'',notes:'',contentVocabulary:'',academicVocabulary:'',essentialQuestion:'',weeklyTask:'',skills:'',updatedAt:''}}
  function lesson(subject=model.subject,day=model.day){const k=lessonKey(subject,day);model.lessons[k]=model.lessons[k]||blank();return model.lessons[k]}
  function subjectName(){return SUBJECTS.find(s=>s[0]===model.subject)?.[2]||'Reading'}
  function generatedICan(obj){let text=(obj.objective||'').trim();if(!text)return '';text=text.replace(/^students?\s+(will|are able to|can)\s+/i,'').replace(/^the student\s+(will|can)\s+/i,'');text=text.charAt(0).toLowerCase()+text.slice(1);text=text.replace(/\.$/,'');return `I can ${text}.`}
  function complete(obj){return Boolean(obj.objective&&obj.ican&&obj.standardId&&obj.standardDesc&&obj.instruction&&obj.ell&&obj.iep&&obj.s504&&obj.materials&&obj.strategies&&obj.evidence)}
  function lines(value){return String(value||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean)}
  function weekLabel(){const d=new Date(`${model.weekStart}T12:00:00`);const end=new Date(d);end.setDate(end.getDate()+4);return `${d.toLocaleDateString(undefined,{month:'short',day:'numeric'})} – ${end.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`}

  function render(){
    const host=document.querySelector('#pageHost');if(!host)return;
    const l=lesson();
    host.innerHTML=`<div class="sp-shell">
      <section class="sp-top">
        <div class="sp-title-row"><div class="sp-title"><h2>${SUBJECTS.find(s=>s[0]===model.subject)?.[1]} ${esc(subjectName())} Planner</h2><p>Plan by subject. Teach by day. Enter it once.</p></div><div class="sp-actions"><button class="sp-btn" id="spCopyWeek">Copy Week</button><button class="sp-btn" id="spExport">Export to Planbook</button><button class="sp-btn" id="spClassroomDisplay">▣ Classroom Display</button><button class="sp-btn primary" id="spBoardFocus">◇ Diamond Board</button></div></div>
        <div class="sp-subjects">${SUBJECTS.map(([id,icon,name])=>`<button class="sp-subject ${id===model.subject?'active':''}" data-subject="${id}">${icon} ${name}</button>`).join('')}</div>
        <div class="sp-week-row"><div class="sp-week-control"><button class="sp-btn" data-week-shift="-7">←</button><input id="spWeek" type="date" value="${model.weekStart}"><strong>Week of ${weekLabel()}</strong><button class="sp-btn" data-week-shift="7">→</button></div><span class="sp-status">✓ Autosaves in this browser</span></div>
      </section>
      <section class="sp-editor">
        <div class="sp-editor-head"><h3>${esc(model.day)} — ${esc(l.lessonTitle||'New Lesson')}</h3><span class="sp-status" id="spSaved">${l.updatedAt?'✓ Saved':'Not saved yet'}</span></div>
        <div class="sp-day-tabs">${DAYS.map(d=>`<button class="sp-day ${d===model.day?'active':''}" data-day="${d}">${d}<br><small>${lesson(model.subject,d).lessonTitle||'Lesson'}</small></button>`).join('')}</div>
        <form class="sp-form" id="spForm">
          ${section('1. Objective & I Can Statement',objectiveFields(l),false)}
          ${section('2. Lesson / Instruction (I Do, We Do, You Do)',field('instruction','Lesson / Instruction',l.instruction,true,'Describe the opening, I Do, We Do, You Do, checks for understanding, and closure.'),false)}
          ${section('3. Differentiation / Accommodations (ELL, IEP, 504)',diffFields(l),false)}
          ${section('4. Materials / Resources / Technology',field('materials','Materials / Resources / Technology',l.materials,true,'Add materials, links, pages, slides, technology, and manipulatives.'),true)}
          ${section('5. Instructional Strategies',field('strategies','Instructional Strategies',l.strategies,true,'Examples: modeling, think-pair-share, guided practice, cooperative learning, centers.'),true)}
          ${section('6. Assessment / Evidence of Learning',field('evidence','Homework / Evidence of Learning',l.evidence,true,'Exit ticket, observation, student product, discussion, quiz, or other evidence.'),true)}
          ${section('7. Homework',field('homework','Homework',l.homework,false,'Enter homework or type “None.”'),true)}
          ${section('8. Notes / Reflection',field('notes','Notes / Reflection',l.notes,false,'What worked? What needs reteaching? What should change next time?'),true)}
          ${section('9. Diamond Board Details',diamondFields(l),true)}
        </form>
        <div id="spComplete" class="sp-complete ${complete(l)?'':'sp-incomplete'}">${complete(l)?'✓ All required fields are complete.':'Complete the required fields before exporting to Planbook.'}</div>
      </section>
      <section class="sp-board" id="spBoard">
        <div class="sp-board-head"><div><h3>Weekly Diamond Board — ${esc(subjectName())}</h3><small>Week of ${weekLabel()}</small></div><div class="sp-actions"><button class="sp-btn" id="spPrint">🖨 Print</button></div></div>
        <div class="sp-board-wrap"><div class="sp-board-canvas" id="spBoardCanvas">${boardHTML()}</div></div>
      </section>
    </div>`;
    wire();
  }

  function section(title,body,collapsed){return `<section class="sp-section ${collapsed?'collapsed':''}"><button type="button" class="sp-section-head"><span>${title}</span><span>⌄</span></button><div class="sp-section-body">${body}</div></section>`}
  function field(name,label,value,required,help,cls=''){return `<div class="sp-field"><label class="${required?'sp-required':''}" for="sp-${name}">${label}</label><textarea id="sp-${name}" class="${cls}" data-field="${name}" ${required?'required':''}>${esc(value)}</textarea>${help?`<div class="sp-help">${help}</div>`:''}</div>`}
  function input(name,label,value,required,cls=''){return `<div class="sp-field"><label class="${required?'sp-required':''}" for="sp-${name}">${label}</label><input id="sp-${name}" class="${cls}" data-field="${name}" value="${esc(value)}" ${required?'required':''}></div>`}
  function objectiveFields(l){return `<div class="sp-grid-2">${input('lessonTitle','Lesson Title',l.lessonTitle,false)}${input('standardId','Arizona Standard ID',l.standardId,true)}${field('objective','Objective (Learning Target)',l.objective,true,'Write what students will learn and do.')}${field('standardDesc','Standard Description',l.standardDesc,true,'Full description of the selected Arizona standard.')}</div><div class="sp-field"><label class="sp-required">I Can Statement</label><textarea class="sp-i-can" data-field="ican" required>${esc(l.ican)}</textarea><button type="button" class="sp-generate" id="spGenerateICan">✨ Generate from Objective</button><div class="sp-help">The TOS creates a student-friendly statement. You may edit it before saving.</div></div>`}
  function diffFields(l){return `<div class="sp-diff-grid"><div class="sp-diff"><h5>ELL Supports *</h5>${field('ell','English Learner Differentiation',l.ell,true,'Visuals, vocabulary pre-teaching, sentence frames, modeling, partner talk, gestures, language support.')}</div><div class="sp-diff"><h5>IEP Supports *</h5>${field('iep','IEP Differentiation',l.iep,true,'Chunking, small group, manipulatives, repeated directions, extended time, reduced response load when appropriate.')}</div><div class="sp-diff"><h5>504 Accommodations *</h5>${field('s504','504 Accommodations',l.s504,true,'Preferential seating, movement breaks, visual schedule, extended time, assistive technology, individual accommodations.')}</div></div>`}
  function diamondFields(l){return `<div class="sp-grid-2">${field('contentVocabulary','Content Vocabulary',l.contentVocabulary,false,'One word per line or comma-separated.')}${field('academicVocabulary','Academic Vocabulary',l.academicVocabulary,false,'One word per line or comma-separated.')}${field('essentialQuestion','Essential Question(s)',l.essentialQuestion,false,'Weekly essential or compelling question.')}${field('weeklyTask','What Students Will Do This Week',l.weeklyTask,false,'Summarize the weekly work for students.')}${field('skills','Skills / Task',l.skills,false,'Skills, task, or success criteria.')}</div>`}

  function boardHTML(){
    const first=lesson(model.subject,'Monday');
    const vocabContent=lines(first.contentVocabulary);const vocabAcademic=lines(first.academicVocabulary);
    return `<div class="sp-board-col">
      ${paper('Standard',`<strong>${esc(first.standardId||'Add Standard ID')}</strong><p>${esc(first.standardDesc||'Add the standard description in Monday’s lesson.')}</p>`)}
      ${paper('Objective',`<p>${esc(first.objective||'Add Monday’s objective.')}</p>`)}
      ${paper('I Can Statement',`<p><strong>${esc(first.ican||'Generate the required I Can statement.')}</strong></p>`)}
    </div>
    <div class="sp-board-col">
      ${paper('Vocabulary',`<div class="sp-vocab"><div><strong>Content Vocabulary</strong>${listHTML(vocabContent)}</div><div><strong>Academic Vocabulary</strong>${listHTML(vocabAcademic)}</div></div>`)}
      <div class="sp-diamond"><div class="sp-diamond-grid">${['Monday','Tuesday','Thursday','Wednesday'].map(d=>{const x=lesson(model.subject,d);return `<div class="sp-diamond-cell"><div><strong>${d.toUpperCase()}</strong><span>${esc(x.skills||x.lessonTitle||x.ican||'Add daily focus')}</span></div></div>`}).join('')}</div></div>
      <div class="sp-friday"><strong>FRIDAY</strong><div>${esc(lesson(model.subject,'Friday').evidence||lesson(model.subject,'Friday').skills||'Assessment & Reflection')}</div></div>
    </div>
    <div class="sp-board-col">
      ${paper('Essential Question',`<p>${esc(first.essentialQuestion||'Add the essential question.')}</p>`)}
      ${paper('Skills / Task',`<p>${esc(first.skills||'Add the weekly skills or task.')}</p>`)}
      ${paper('What We Will Be Doing This Week',`<p>${esc(first.weeklyTask||weeklySummary())}</p>`)}
    </div>`
  }
  function paper(title,body){return `<article class="sp-paper"><h4>${title}</h4>${body}</article>`}
  function listHTML(items){return items.length?`<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p class="sp-board-empty">Add vocabulary</p>'}
  function weeklySummary(){const vals=DAYS.map(d=>lesson(model.subject,d).lessonTitle||lesson(model.subject,d).skills).filter(Boolean);return vals.length?vals.join('; '):'Add each day’s lesson focus to build the weekly summary.'}

  function wire(){
    document.querySelectorAll('[data-subject]').forEach(b=>b.onclick=()=>{model.subject=b.dataset.subject;model.day='Monday';saveSilent();render()});
    document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{model.day=b.dataset.day;saveSilent();render()});
    document.querySelectorAll('.sp-section-head').forEach(b=>b.onclick=()=>b.closest('.sp-section').classList.toggle('collapsed'));
    document.querySelectorAll('[data-field]').forEach(el=>{el.addEventListener('input',()=>{const l=lesson();l[el.dataset.field]=el.value;l.updatedAt=new Date().toISOString();saveSilent();refreshLive()});el.addEventListener('change',refreshLive)});
    document.querySelector('#spGenerateICan').onclick=()=>{const l=lesson();l.ican=generatedICan(l);l.updatedAt=new Date().toISOString();save();render()};
    document.querySelector('#spWeek').onchange=e=>{model.weekStart=e.target.value||nextMondayISO();saveSilent();render()};
    document.querySelectorAll('[data-week-shift]').forEach(b=>b.onclick=()=>{const d=new Date(`${model.weekStart}T12:00:00`);d.setDate(d.getDate()+Number(b.dataset.weekShift));model.weekStart=localISO(d);saveSilent();render()});
    document.querySelector('#spPrint').onclick=()=>window.print();
    document.querySelector('#spBoardFocus').onclick=()=>document.querySelector('#spBoard').scrollIntoView({behavior:'smooth'});
    document.querySelector('#spClassroomDisplay').onclick=()=>window.TOS_V211_CLASSROOM_DISPLAY?.open?.({subject:model.subject,weekStart:model.weekStart});
    document.querySelector('#spCopyWeek').onclick=copyWeek;
    document.querySelector('#spExport').onclick=exportPlanbook;
  }
  function saveSilent(){localStorage.setItem(KEY,JSON.stringify(model))}
  function refreshLive(){const l=lesson();document.querySelector('#spSaved').textContent='✓ Saved';const c=document.querySelector('#spComplete');c.className=`sp-complete ${complete(l)?'':'sp-incomplete'}`;c.textContent=complete(l)?'✓ All required fields are complete.':'Complete the required fields before exporting to Planbook.';document.querySelector('#spBoardCanvas').innerHTML=boardHTML()}
  function copyWeek(){const next=prompt('Copy this subject week to another Monday (YYYY-MM-DD):','');if(!next)return;DAYS.forEach(d=>{model.lessons[`${next}|${model.subject}|${d}`]={...lesson(model.subject,d),updatedAt:new Date().toISOString()}});save();}
  function exportPlanbook(){const missing=DAYS.filter(d=>!complete(lesson(model.subject,d)));if(missing.length&&!confirm(`${missing.join(', ')} are incomplete. Export anyway?`))return;const text=DAYS.map(d=>planbookText(d,lesson(model.subject,d))).join('\n\n==============================\n\n');navigator.clipboard?.writeText(text).then(()=>window.TOS_APP_BRIDGE?.toast?.('Planbook-ready week copied to clipboard.')).catch(()=>downloadText(text));}
  function planbookText(day,l){return `${subjectName()} — ${day}\nLesson Title: ${l.lessonTitle||''}\n\nOBJECTIVE\n${l.objective}\n\nI CAN STATEMENT\n${l.ican}\n\nLESSON / INSTRUCTION\n${l.instruction}\n\nDIFFERENTIATION / ACCOMMODATIONS\nELL: ${l.ell}\nIEP: ${l.iep}\n504: ${l.s504}\n\nHOMEWORK / EVIDENCE OF LEARNING\n${l.evidence}${l.homework?`\nHomework: ${l.homework}`:''}\n\nMATERIALS / RESOURCES / TECHNOLOGY\n${l.materials}\n\nNOTES / REFLECTION\n${l.notes}\n\nINSTRUCTIONAL STRATEGIES\n${l.strategies}\n\nSTANDARD ID\n${l.standardId}\n\nSTANDARD DESCRIPTION\n${l.standardDesc}`}
  function downloadText(text){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'}));a.download=`${model.subject}-${model.weekStart}-planbook.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}

  window.TOS_V210_RENDER_SUBJECT_PLANNER=render;
  window.TOS_V210={version:VERSION,render,getModel:()=>JSON.parse(JSON.stringify(model))};
})();
