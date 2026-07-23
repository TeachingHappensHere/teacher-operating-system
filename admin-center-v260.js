(function(){
  'use strict';
  const VERSION='26.0.0';
  const KEY='thh:admin-center:v260';
  const DEFAULTS={
    profile:{teacher:'Mrs. Parrish',school:'Champion Schools San Tan Valley',grade:'2nd Grade',year:'2026–2027'},
    dates:{schoolStart:'2026-07-27',coreStart:'2026-08-03',schoolEnd:'2027-05-28',firstIDay:'2026-08-07'},
    schedule:[
      ['07:45','08:10','Breakfast'],['08:10','08:20','Morning Work'],['08:20','08:30','Morning Meeting'],
      ['08:30','08:40','Heggerty'],['08:45','09:30','MOWR'],['09:30','09:50','Phonics'],
      ['09:50','10:00','Vocabulary'],['10:00','10:50','Reading'],['10:50','11:15','Lunch'],
      ['11:15','11:35','Recess'],['11:35','12:05','Workout'],['12:05','13:05','Math'],
      ['13:05','13:35','Writing'],['13:35','14:00','Social Studies'],['14:00','14:15','Recess'],
      ['14:15','14:35','Science'],['14:40','15:00','Pack Up'],['15:00','15:30','Dismissal']
    ].map((x,i)=>({id:`block-${i+1}`,start:x[0],end:x[1],title:x[2]})),
    links:[
      ['Attendance / Gradebook',''],['Chalkie',''],['UFLI','https://ufli.education.ufl.edu/foundations/toolbox/'],
      ['ClassDojo',''],['Open Court',''],['Heggerty',''],['Amplify',''],['Eureka Math²',''],
      ['Beanstack',''],['MobyMax',''],['Google Drive','']
    ].map((x,i)=>({id:`link-${i+1}`,title:x[0],url:x[1]})),
    curriculum:[
      {id:'oc-cowardly-lion',program:'Open Court',unit:'Unit 1',title:'The Cowardly Lion',standard:'2.RL.1',objective:'Ask and answer questions to demonstrate understanding of key details.',vocabulary:'character, setting, detail, question, answer, predict'},
    ],
    preferences:{compact:false,showTips:true}
  };
  let model=load();
  let tab='overview';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function normalize(raw){
    const next={...clone(DEFAULTS),...(raw&&typeof raw==='object'?raw:{})};
    next.profile={...DEFAULTS.profile,...(next.profile||{})}; next.dates={...DEFAULTS.dates,...(next.dates||{})};
    next.schedule=Array.isArray(next.schedule)?next.schedule:clone(DEFAULTS.schedule);
    next.links=Array.isArray(next.links)?next.links:clone(DEFAULTS.links);
    next.curriculum=Array.isArray(next.curriculum)?next.curriculum:clone(DEFAULTS.curriculum);
    next.preferences={...DEFAULTS.preferences,...(next.preferences||{})}; return next;
  }
  function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return clone(DEFAULTS);}}
  function persist(message='Admin Center saved.'){
    localStorage.setItem(KEY,JSON.stringify(model));
    window.dispatchEvent(new CustomEvent('tos:admin-config-changed',{detail:clone(model)}));
    window.TOS_APP_BRIDGE?.toast?.(message);
  }
  function stats(){return {blocks:model.schedule.length,links:model.links.filter(x=>x.url).length,curriculum:model.curriculum.length};}
  function render(){
    const host=$('#pageHost'); if(!host)return;
    const s=stats();
    host.innerHTML=`<div class="ac-shell">
      <section class="ac-hero"><div><p>VERSION ${VERSION} • SYSTEM CONTROL</p><h2>⚙ Admin Center</h2><span>Manage your classroom settings without editing code.</span></div><div class="ac-hero-actions"><button class="ac-btn" id="acExport">Export Backup</button><label class="ac-btn ac-file">Import Backup<input id="acImport" type="file" accept="application/json"></label><button class="ac-btn primary" id="acSave">Save All</button></div></section>
      <nav class="ac-tabs" aria-label="Admin Center sections">${[['overview','Overview'],['profile','School & Dates'],['schedule','Bell Schedule'],['links','Quick Links'],['curriculum','Curriculum'],['data','Backup & Reset']].map(([id,label])=>`<button data-ac-tab="${id}" class="${tab===id?'active':''}">${label}</button>`).join('')}</nav>
      <main class="ac-content">${tab==='overview'?overview(s):tab==='profile'?profile():tab==='schedule'?schedule():tab==='links'?links():tab==='curriculum'?curriculum():dataTools()}</main>
    </div>`;
    wire();
  }
  function overview(s){return `<section class="ac-grid ac-overview">
    ${card('📅','School year',`${fmt(model.dates.schoolStart)} – ${fmt(model.dates.schoolEnd)}`,'profile')}
    ${card('⏰','Schedule blocks',String(s.blocks),'schedule')}
    ${card('🔗','Active quick links',String(s.links),'links')}
    ${card('📚','Curriculum records',String(s.curriculum),'curriculum')}
    <article class="ac-panel ac-wide"><div class="ac-panel-head"><div><span>LAUNCH GUARDRAILS</span><h3>Protected instructional dates</h3></div></div><div class="ac-checks"><p><strong>Classroom launch:</strong> ${fmt(model.dates.schoolStart)}</p><p><strong>Core instruction:</strong> ${fmt(model.dates.coreStart)}</p><p><strong>First iDay:</strong> ${fmt(model.dates.firstIDay)}</p><p><strong>School ends:</strong> ${fmt(model.dates.schoolEnd)}</p></div></article>
    <article class="ac-panel ac-wide"><div class="ac-panel-head"><div><span>HOW THIS WORKS</span><h3>Your settings stay private on this device</h3></div></div><p class="ac-help">Changes save in your browser and are available to other TOS modules through the Admin Configuration service. Export a backup before changing devices or clearing browser data.</p></article>
  </section>`;}
  function card(icon,title,value,target){return `<button class="ac-stat" data-ac-tab="${target}"><span>${icon}</span><strong>${esc(value)}</strong><small>${esc(title)}</small></button>`;}
  function profile(){return `<section class="ac-grid"><article class="ac-panel"><div class="ac-panel-head"><div><span>CLASSROOM PROFILE</span><h3>Teacher and school</h3></div></div><div class="ac-form-grid">
    ${input('acTeacher','Teacher name',model.profile.teacher)}${input('acSchool','School',model.profile.school)}${input('acGrade','Grade',model.profile.grade)}${input('acYear','School year',model.profile.year)}
  </div></article><article class="ac-panel"><div class="ac-panel-head"><div><span>IMPORTANT DATES</span><h3>School-year guardrails</h3></div></div><div class="ac-form-grid">
    ${input('acSchoolStart','First student day',model.dates.schoolStart,'date')}${input('acCoreStart','Core instruction begins',model.dates.coreStart,'date')}${input('acFirstIDay','First iDay',model.dates.firstIDay,'date')}${input('acSchoolEnd','Last student day',model.dates.schoolEnd,'date')}
  </div><p class="ac-help">Open Court Unit 1 and Eureka Math² core instruction should not begin before the core instruction date.</p></article></section>`;}
  function input(id,label,value,type='text'){return `<label><span>${esc(label)}</span><input id="${id}" type="${type}" value="${esc(value)}"></label>`;}
  function schedule(){return `<section class="ac-panel"><div class="ac-panel-head"><div><span>DAILY SCHEDULE</span><h3>Bell schedule</h3></div><button class="ac-btn" id="acAddBlock">+ Add Block</button></div><div class="ac-table-wrap"><table class="ac-table"><thead><tr><th>Start</th><th>End</th><th>Block</th><th></th></tr></thead><tbody>${model.schedule.map((b,i)=>`<tr data-id="${b.id}"><td><input data-field="start" type="time" value="${esc(b.start)}"></td><td><input data-field="end" type="time" value="${esc(b.end)}"></td><td><input data-field="title" value="${esc(b.title)}"></td><td><button class="ac-icon danger" data-delete-block="${i}" aria-label="Delete ${esc(b.title)}">×</button></td></tr>`).join('')}</tbody></table></div><p class="ac-help">Schedule edits are stored as the Admin Center master schedule. A later synchronization step can push this configuration into every timeline view.</p></section>`;}
  function links(){return `<section class="ac-panel"><div class="ac-panel-head"><div><span>OPEN FIRST</span><h3>Dashboard quick links</h3></div><button class="ac-btn" id="acAddLink">+ Add Link</button></div><div class="ac-list">${model.links.map((x,i)=>`<article class="ac-row" data-id="${x.id}"><input data-field="title" aria-label="Link name" value="${esc(x.title)}"><input data-field="url" type="url" aria-label="Web address" placeholder="https://…" value="${esc(x.url)}"><button class="ac-icon danger" data-delete-link="${i}" aria-label="Delete ${esc(x.title)}">×</button></article>`).join('')}</div></section>`;}
  function curriculum(){return `<section class="ac-panel"><div class="ac-panel-head"><div><span>CURRICULUM REGISTRY</span><h3>Editable curriculum records</h3></div><button class="ac-btn" id="acAddCurriculum">+ Add Record</button></div><div class="ac-curriculum">${model.curriculum.map((x,i)=>`<article class="ac-record" data-id="${x.id}"><div class="ac-record-head"><strong>${esc(x.title||'New curriculum record')}</strong><button class="ac-icon danger" data-delete-curriculum="${i}">×</button></div><div class="ac-form-grid three">${small('program','Program',x.program)}${small('unit','Unit',x.unit)}${small('title','Story / Lesson',x.title)}${small('standard','Standard',x.standard)}<label class="span-all"><span>Objective</span><textarea data-field="objective">${esc(x.objective)}</textarea></label><label class="span-all"><span>Vocabulary</span><textarea data-field="vocabulary">${esc(x.vocabulary)}</textarea></label></div></article>`).join('')}</div></section>`;}
  function small(field,label,value){return `<label><span>${label}</span><input data-field="${field}" value="${esc(value)}"></label>`;}
  function dataTools(){return `<section class="ac-grid"><article class="ac-panel"><div class="ac-panel-head"><div><span>BACKUP</span><h3>Move settings safely</h3></div></div><p class="ac-help">Export creates a JSON copy of your Admin Center settings. Import restores that file on another device.</p><div class="ac-stack"><button class="ac-btn primary" id="acExport2">Export Admin Backup</button><label class="ac-btn ac-file">Import Admin Backup<input id="acImport2" type="file" accept="application/json"></label></div></article><article class="ac-panel ac-danger-zone"><div class="ac-panel-head"><div><span>DANGER ZONE</span><h3>Reset Admin Center</h3></div></div><p class="ac-help">This resets only Admin Center settings. It does not delete lesson plans, student profiles, or assessments.</p><button class="ac-btn danger" id="acReset">Reset to Defaults</button></article></section>`;}
  function wire(){
    $$('[data-ac-tab]').forEach(b=>b.onclick=()=>{capture();tab=b.dataset.acTab;render();});
    $('#acSave')?.addEventListener('click',()=>{capture();persist();render();});
    $('#acExport')?.addEventListener('click',exportData); $('#acExport2')?.addEventListener('click',exportData);
    $('#acImport')?.addEventListener('change',importData); $('#acImport2')?.addEventListener('change',importData);
    $('#acAddBlock')?.addEventListener('click',()=>{capture();model.schedule.push({id:uid('block'),start:'08:00',end:'08:30',title:'New Block'});render();});
    $$('[data-delete-block]').forEach(b=>b.onclick=()=>{capture();model.schedule.splice(Number(b.dataset.deleteBlock),1);render();});
    $('#acAddLink')?.addEventListener('click',()=>{capture();model.links.push({id:uid('link'),title:'New Resource',url:''});render();});
    $$('[data-delete-link]').forEach(b=>b.onclick=()=>{capture();model.links.splice(Number(b.dataset.deleteLink),1);render();});
    $('#acAddCurriculum')?.addEventListener('click',()=>{capture();model.curriculum.push({id:uid('curriculum'),program:'',unit:'',title:'',standard:'',objective:'',vocabulary:''});render();});
    $$('[data-delete-curriculum]').forEach(b=>b.onclick=()=>{capture();model.curriculum.splice(Number(b.dataset.deleteCurriculum),1);render();});
    $('#acReset')?.addEventListener('click',()=>{if(!confirm('Reset Admin Center settings to defaults?'))return;model=clone(DEFAULTS);persist('Admin Center reset.');render();});
  }
  function capture(){
    if(tab==='profile'){
      const val=id=>$(id)?.value||''; model.profile={teacher:val('#acTeacher'),school:val('#acSchool'),grade:val('#acGrade'),year:val('#acYear')};
      model.dates={schoolStart:val('#acSchoolStart'),coreStart:val('#acCoreStart'),firstIDay:val('#acFirstIDay'),schoolEnd:val('#acSchoolEnd')};
    }
    if(tab==='schedule')model.schedule=$$('.ac-table tbody tr').map(r=>({id:r.dataset.id,start:$('[data-field="start"]',r).value,end:$('[data-field="end"]',r).value,title:$('[data-field="title"]',r).value}));
    if(tab==='links')model.links=$$('.ac-row').map(r=>({id:r.dataset.id,title:$('[data-field="title"]',r).value,url:$('[data-field="url"]',r).value}));
    if(tab==='curriculum')model.curriculum=$$('.ac-record').map(r=>{const get=f=>$(`[data-field="${f}"]`,r).value;return{id:r.dataset.id,program:get('program'),unit:get('unit'),title:get('title'),standard:get('standard'),objective:get('objective'),vocabulary:get('vocabulary')}});
  }
  function exportData(){capture();const payload={application:'TeachingHappensHere Admin Center',version:VERSION,exportedAt:new Date().toISOString(),config:model};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download=`tos-admin-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);window.TOS_APP_BRIDGE?.toast?.('Admin backup downloaded.');}
  async function importData(event){const file=event.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());model=normalize(parsed.config||parsed);persist('Admin backup imported.');render();}catch(error){console.error(error);alert('That file is not a valid Admin Center backup.');}event.target.value='';}
  function fmt(v){if(!v)return 'Not set';const d=new Date(`${v}T12:00:00`);return Number.isNaN(d.getTime())?v:d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
  window.TOS_ADMIN_CONFIG={version:VERSION,key:KEY,get:()=>clone(model),save:patch=>{model=normalize({...model,...patch});persist();return clone(model);},reset:()=>{model=clone(DEFAULTS);persist();return clone(model);}};
  window.TOS_V260_RENDER_ADMIN_CENTER=render;
})();
