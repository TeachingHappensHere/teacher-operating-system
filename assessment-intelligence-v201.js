(() => {
  'use strict';

  const ROUTE = 'assessments';
  const STUDENT_STORE = 'thh:v20:student-intelligence';
  const ASSESS_STORE = 'thh:v20.1:assessment-intelligence';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const uid = p => `${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const route = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  const today = () => new Date().toISOString().slice(0,10);

  const DEFAULT_TYPES = ['DIBELS ORF','DIBELS Maze','Open Court Phonics','Open Court Vocabulary','Open Court Comprehension','Open Court GUM','Eureka Math²','Writing Rubric','Science','Social Studies'];
  const SUBJECTS = ['Reading','Phonics','Vocabulary','Grammar','Writing','Math','Science','Social Studies'];

  function assessmentState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ASSESS_STORE) || 'null');
      if (parsed && Array.isArray(parsed.assessments)) {
        parsed.filters ||= { assessmentId:'', group:'', search:'' };
        parsed.settings ||= { masteryCut:80, approachingCut:60 };
        return parsed;
      }
    } catch {}
    return { version:1, assessments:[], filters:{assessmentId:'',group:'',search:''}, settings:{masteryCut:80,approachingCut:60} };
  }
  function saveAssess(s) { localStorage.setItem(ASSESS_STORE, JSON.stringify(s)); }
  function studentState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STUDENT_STORE) || 'null');
      if (parsed && Array.isArray(parsed.students)) return parsed;
    } catch {}
    return { students:[] };
  }
  function saveStudents(s) { localStorage.setItem(STUDENT_STORE, JSON.stringify(s)); }
  function activeStudents(s) { return (s.students || []).filter(x => x.status !== 'Archived').sort((a,b)=>nameOf(a).localeCompare(nameOf(b))); }
  function nameOf(s) { return [s.preferredName || s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed student'; }
  function number(v) { const n = Number(String(v ?? '').replace('%','').trim()); return Number.isFinite(n) ? n : null; }
  function percent(score,max) { const s=number(score), m=number(max); if(s===null) return null; if(m && m>0) return Math.round((s/m)*1000)/10; return Math.round(s*10)/10; }
  function mastery(p, settings) {
    if (p === null) return {key:'missing',label:'Not entered'};
    if (p >= settings.masteryCut) return {key:'mastered',label:'Mastered'};
    if (p >= settings.approachingCut) return {key:'approaching',label:'Approaching'};
    return {key:'reteach',label:'Reteach'};
  }

  function injectNavigation() {
    const nav = $('#mainNav');
    if (!nav || nav.querySelector(`[data-route="${ROUTE}"]`)) return;
    const button = document.createElement('button');
    button.className='nav-item'; button.dataset.route=ROUTE;
    button.innerHTML='<span class="nav-icon">📊</span><span>Assessments</span>';
    button.addEventListener('click',()=>location.hash=`#${ROUTE}`);
    const students = nav.querySelector('[data-route="students"]');
    students ? students.insertAdjacentElement('afterend',button) : nav.appendChild(button);
  }

  function selectedAssessment(state) {
    return state.assessments.find(a=>a.id===state.filters.assessmentId) || state.assessments[0] || null;
  }
  function recordsFor(a) { return a?.records && typeof a.records === 'object' ? a.records : {}; }
  function summary(a, students, settings) {
    const values=students.map(s=>percent(recordsFor(a)[s.id]?.score, a?.maxScore)).filter(v=>v!==null);
    const cats=values.map(v=>mastery(v,settings).key);
    return {
      entered:values.length,
      average:values.length ? Math.round(values.reduce((x,y)=>x+y,0)/values.length*10)/10 : null,
      mastered:cats.filter(x=>x==='mastered').length,
      approaching:cats.filter(x=>x==='approaching').length,
      reteach:cats.filter(x=>x==='reteach').length,
      missing:students.length-values.length
    };
  }

  function render() {
    if (route() !== ROUTE) return;
    const host=$('#pageHost'); if(!host) return;
    const state=assessmentState(), roster=studentState(), students=activeStudents(roster), assessment=selectedAssessment(state);
    if(assessment && state.filters.assessmentId!==assessment.id){state.filters.assessmentId=assessment.id;saveAssess(state);}
    const stats=summary(assessment,students,state.settings);
    host.innerHTML=`<section class="ai-shell" aria-label="Assessment Intelligence Center">
      <header class="ai-hero">
        <div><p class="ai-eyebrow">Version 20.1 · Assessment Intelligence</p><h2>Assessment Center</h2><p>Record results once, view class mastery, identify reteaching groups, and connect evidence back to each student profile.</p></div>
        <div class="ai-actions"><button id="aiExport" class="ai-secondary">Export CSV</button><button id="aiNew" class="ai-primary">+ New Assessment</button></div>
      </header>

      ${students.length ? '' : `<div class="ai-warning"><strong>No active students found.</strong><span>Add or import students in Student Center before entering class assessment data.</span><button data-go-students>Open Students</button></div>`}

      <div class="ai-toolbar">
        <label>Assessment<select id="aiAssessmentSelect"><option value="">Choose an assessment</option>${state.assessments.map(a=>`<option value="${esc(a.id)}" ${assessment?.id===a.id?'selected':''}>${esc(a.title)} · ${esc(a.date)}</option>`).join('')}</select></label>
        <label>Reading group<select id="aiGroup"><option value="">All groups</option>${['Red','Yellow','Green','Blue'].map(g=>`<option ${state.filters.group===g?'selected':''}>${g}</option>`).join('')}</select></label>
        <label>Search<input id="aiSearch" type="search" value="${esc(state.filters.search)}" placeholder="Student name"></label>
        ${assessment?`<button id="aiEdit" class="ai-secondary">Edit Setup</button><button id="aiDelete" class="ai-danger">Delete</button>`:''}
      </div>

      ${assessment ? assessmentWorkspace(assessment,students,state,stats) : emptyState()}
      ${assessmentDialog()}
      ${noteDialog()}
    </section>`;
    wire(state,roster,assessment);
  }

  function emptyState(){return `<section class="ai-empty"><div>📊</div><h3>Create your first assessment</h3><p>Set the assessment title, subject, date, skill or standard, and maximum score. Then enter results for the whole class from one table.</p><button id="aiEmptyNew" class="ai-primary">Create Assessment</button></section>`;}

  function assessmentWorkspace(a,students,state,stats){
    const filtered=students.filter(s=>{
      if(state.filters.group && s.readingGroup!==state.filters.group)return false;
      if(state.filters.search && !nameOf(s).toLowerCase().includes(state.filters.search.toLowerCase()))return false;
      return true;
    });
    const rec=recordsFor(a);
    return `<section class="ai-workspace">
      <div class="ai-assessment-head"><div><p class="ai-eyebrow">${esc(a.subject)} · ${esc(a.type)}</p><h3>${esc(a.title)}</h3><p>${esc(a.skill || 'No skill or standard entered')} · ${esc(a.date)}${a.maxScore?` · ${esc(a.maxScore)} points`:''}</p></div><span class="ai-status">${stats.entered}/${students.length} entered</span></div>
      <div class="ai-stats">
        ${stat('Class Average',stats.average===null?'—':`${stats.average}%`,'Across entered scores')}
        ${stat('Mastered',stats.mastered,`≥ ${state.settings.masteryCut}%`)}
        ${stat('Approaching',stats.approaching,`${state.settings.approachingCut}–${state.settings.masteryCut-0.1}%`)}
        ${stat('Reteach',stats.reteach,`< ${state.settings.approachingCut}%`)}
        ${stat('Missing',stats.missing,'Not entered')}
      </div>
      <div class="ai-main-grid">
        <article class="ai-card ai-gradebook">
          <div class="ai-card-head"><div><p class="ai-eyebrow">Whole-Class Entry</p><h3>Gradebook</h3></div><div class="ai-inline-actions"><button id="aiSaveAll" class="ai-primary">Save All Scores</button></div></div>
          <div class="ai-table-wrap"><table><thead><tr><th>Student</th><th>Group</th><th>Score</th><th>Percent</th><th>Mastery</th><th>Notes</th></tr></thead><tbody>
            ${filtered.length?filtered.map(s=>gradeRow(s,a,rec[s.id],state.settings)).join(''):`<tr><td colspan="6" class="ai-none">No students match the current filters.</td></tr>`}
          </tbody></table></div>
        </article>
        <aside class="ai-side">
          ${masteryPanel(a,students,state)}
          <article class="ai-card"><div class="ai-card-head"><div><p class="ai-eyebrow">Instructional Response</p><h3>Next Steps</h3></div></div>
            <label>Whole-class reflection<textarea id="aiReflection" rows="5" placeholder="What did students understand? What needs reteaching?">${esc(a.reflection||'')}</textarea></label>
            <label>Planned response<textarea id="aiNextSteps" rows="5" placeholder="Small groups, spiral review, intervention, extension...">${esc(a.nextSteps||'')}</textarea></label>
            <button id="aiSaveReflection" class="ai-secondary ai-full">Save Reflection</button>
          </article>
        </aside>
      </div>
    </section>`;
  }
  function stat(label,value,note){return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;}
  function gradeRow(s,a,r={},settings){const p=percent(r.score,a.maxScore),m=mastery(p,settings);return `<tr data-row="${esc(s.id)}"><td><strong>${esc(nameOf(s))}</strong>${s.iep||s.plan504||s.ell?`<small>${[s.iep?'IEP':'',s.plan504?'504':'',s.ell?'EL':''].filter(Boolean).join(' · ')}</small>`:''}</td><td><span class="ai-group group-${esc((s.readingGroup||'none').toLowerCase())}">${esc(s.readingGroup||'—')}</span></td><td><input class="ai-score" data-student="${esc(s.id)}" inputmode="decimal" value="${esc(r.score??'')}" placeholder="—"></td><td class="ai-percent">${p===null?'—':`${p}%`}</td><td><span class="ai-mastery ${m.key}">${m.label}</span></td><td><button class="ai-note ${r.note?'has-note':''}" data-note-student="${esc(s.id)}" title="Add score note">${r.note?'📝':'＋'}</button></td></tr>`;}
  function masteryPanel(a,students,state){const groups={mastered:[],approaching:[],reteach:[],missing:[]},rec=recordsFor(a);students.forEach(s=>groups[mastery(percent(rec[s.id]?.score,a.maxScore),state.settings).key].push(s));return `<article class="ai-card"><div class="ai-card-head"><div><p class="ai-eyebrow">Automatic Grouping</p><h3>Mastery Groups</h3></div></div>${[['reteach','Reteach First'],['approaching','Approaching'],['mastered','Extension'],['missing','Missing Data']].map(([k,label])=>`<details ${k==='reteach'?'open':''}><summary><span>${label}</span><strong>${groups[k].length}</strong></summary><div class="ai-name-list">${groups[k].length?groups[k].map(s=>`<button data-open-student="${esc(s.id)}">${esc(nameOf(s))}</button>`).join(''):'<span>None</span>'}</div></details>`).join('')}</article>`;}

  function assessmentDialog(){return `<dialog id="aiAssessmentDialog" class="ai-dialog"><form id="aiAssessmentForm" method="dialog"><input type="hidden" name="id"><div class="ai-dialog-head"><div><p class="ai-eyebrow">Assessment Setup</p><h3 id="aiDialogTitle">New Assessment</h3></div><button value="cancel" aria-label="Close">×</button></div><div class="ai-form-grid"><label>Title<input name="title" required placeholder="Open Court Lesson 1 Comprehension"></label><label>Date<input name="date" type="date" required value="${today()}"></label><label>Subject<select name="subject">${SUBJECTS.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Assessment type<input name="type" list="aiTypes" required placeholder="DIBELS ORF"><datalist id="aiTypes">${DEFAULT_TYPES.map(x=>`<option value="${x}">`).join('')}</datalist></label><label>Maximum score<input name="maxScore" inputmode="decimal" placeholder="100 or item total"></label><label>Unit / lesson<input name="unit" placeholder="Unit 1 · Lesson 1"></label></div><label>Skill or Arizona standard<input name="skill" placeholder="Main idea and key details · 2.RL.2"></label><label>Description / administration notes<textarea name="description" rows="3"></textarea></label><div class="ai-dialog-actions"><button value="cancel" class="ai-secondary">Cancel</button><button type="submit" value="default" class="ai-primary">Save Assessment</button></div></form></dialog>`;}
  function noteDialog(){return `<dialog id="aiNoteDialog" class="ai-dialog"><form id="aiNoteForm" method="dialog"><input type="hidden" name="studentId"><div class="ai-dialog-head"><div><p class="ai-eyebrow">Score Evidence</p><h3 id="aiNoteTitle">Student Note</h3></div><button value="cancel">×</button></div><label>Observation or error pattern<textarea name="note" rows="5" placeholder="What did you notice about this student's work?"></textarea></label><div class="ai-dialog-actions"><button value="cancel" class="ai-secondary">Cancel</button><button type="submit" value="default" class="ai-primary">Save Note</button></div></form></dialog>`;}

  function wire(state,roster,a){
    $('[data-go-students]')?.addEventListener('click',()=>location.hash='#students');
    $('#aiNew')?.addEventListener('click',()=>openAssessmentDialog());
    $('#aiEmptyNew')?.addEventListener('click',()=>openAssessmentDialog());
    $('#aiEdit')?.addEventListener('click',()=>openAssessmentDialog(a));
    $('#aiAssessmentSelect')?.addEventListener('change',e=>{state.filters.assessmentId=e.target.value;saveAssess(state);render();});
    $('#aiGroup')?.addEventListener('change',e=>{state.filters.group=e.target.value;saveAssess(state);render();});
    $('#aiSearch')?.addEventListener('input',e=>{state.filters.search=e.target.value;saveAssess(state);render();});
    $('#aiDelete')?.addEventListener('click',()=>{if(a&&confirm(`Delete ${a.title}? This removes its class score sheet.`)){state.assessments=state.assessments.filter(x=>x.id!==a.id);state.filters.assessmentId=state.assessments[0]?.id||'';saveAssess(state);render();}});
    $('#aiAssessmentForm')?.addEventListener('submit',e=>saveAssessmentForm(e,state));
    $$('.ai-score').forEach(input=>input.addEventListener('input',()=>previewRow(input,a,state.settings)));
    $('#aiSaveAll')?.addEventListener('click',()=>saveScores(state,roster,a));
    $$('.ai-note').forEach(b=>b.addEventListener('click',()=>openNote(b.dataset.noteStudent,a,roster)));
    $('#aiNoteForm')?.addEventListener('submit',e=>saveNote(e,state,a));
    $('#aiSaveReflection')?.addEventListener('click',()=>{a.reflection=$('#aiReflection').value;a.nextSteps=$('#aiNextSteps').value;saveAssess(state);toast('Reflection and next steps saved.');});
    $('#aiExport')?.addEventListener('click',()=>exportCsv(state,roster,a));
    $$('[data-open-student]').forEach(b=>b.addEventListener('click',()=>{const ss=studentState();ss.selectedStudentId=b.dataset.openStudent;saveStudents(ss);location.hash='#students';}));
  }
  function openAssessmentDialog(a=null){const d=$('#aiAssessmentDialog'),f=$('#aiAssessmentForm');if(!d||!f)return;f.reset();$('#aiDialogTitle').textContent=a?'Edit Assessment':'New Assessment';const values=a||{id:'',title:'',date:today(),subject:'Reading',type:'',maxScore:'',unit:'',skill:'',description:''};Object.keys(values).forEach(k=>{if(f.elements[k])f.elements[k].value=values[k]??'';});d.showModal();}
  function saveAssessmentForm(e,state){e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));let a=state.assessments.find(x=>x.id===data.id);if(!a){a={id:uid('assessment'),records:{},createdAt:new Date().toISOString()};state.assessments.unshift(a);}Object.assign(a,{title:data.title.trim(),date:data.date,subject:data.subject,type:data.type.trim(),maxScore:data.maxScore.trim(),unit:data.unit.trim(),skill:data.skill.trim(),description:data.description.trim(),updatedAt:new Date().toISOString()});state.filters.assessmentId=a.id;saveAssess(state);$('#aiAssessmentDialog').close();render();}
  function previewRow(input,a,settings){const tr=input.closest('tr'),p=percent(input.value,a.maxScore),m=mastery(p,settings);tr.querySelector('.ai-percent').textContent=p===null?'—':`${p}%`;const el=tr.querySelector('.ai-mastery');el.className=`ai-mastery ${m.key}`;el.textContent=m.label;}
  function saveScores(state,roster,a){if(!a)return;a.records||={};$$('.ai-score').forEach(input=>{const id=input.dataset.student;a.records[id]||={};a.records[id].score=input.value.trim();a.records[id].updatedAt=new Date().toISOString();syncStudentAssessment(roster,id,a,a.records[id],state.settings);});a.updatedAt=new Date().toISOString();saveAssess(state);saveStudents(roster);toast('Class scores saved and student profiles updated.');render();}
  function syncStudentAssessment(roster,id,a,r,settings){const s=roster.students.find(x=>x.id===id);if(!s)return;s.assessments=Array.isArray(s.assessments)?s.assessments:[];const key=`v201:${a.id}`,p=percent(r.score,a.maxScore),m=mastery(p,settings);let item=s.assessments.find(x=>x.externalId===key);if(!item){item={id:uid('assessment-record'),externalId:key};s.assessments.push(item);}Object.assign(item,{date:a.date,title:a.title,skill:a.skill,score:r.score,result:p===null?'Not entered':`${p}% · ${m.label}${r.note?` · ${r.note}`:''}`,subject:a.subject,type:a.type,updatedAt:new Date().toISOString()});s.updatedAt=new Date().toISOString();}
  function openNote(studentId,a,roster){const f=$('#aiNoteForm'),s=roster.students.find(x=>x.id===studentId);f.elements.studentId.value=studentId;f.elements.note.value=a.records?.[studentId]?.note||'';$('#aiNoteTitle').textContent=`${nameOf(s)} · Score Note`;$('#aiNoteDialog').showModal();}
  function saveNote(e,state,a){e.preventDefault();const data=new FormData(e.currentTarget),id=String(data.get('studentId'));a.records||={};a.records[id]||={};a.records[id].note=String(data.get('note')||'').trim();saveAssess(state);$('#aiNoteDialog').close();render();}
  function exportCsv(state,roster,a){if(!a){toast('Choose an assessment first.');return;}const rows=[['Assessment','Date','Subject','Type','Skill','Student','Reading Group','Score','Maximum','Percent','Mastery','Note']];activeStudents(roster).forEach(s=>{const r=a.records?.[s.id]||{},p=percent(r.score,a.maxScore),m=mastery(p,state.settings);rows.push([a.title,a.date,a.subject,a.type,a.skill,nameOf(s),s.readingGroup||'',r.score||'',a.maxScore||'',p??'',m.label,r.note||'']);});const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${a.title.replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'assessment'}-${a.date}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function toast(msg){const t=$('#toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}else alert(msg);}

  function takeControl(){injectNavigation();if(route()===ROUTE){setTimeout(render,20);setTimeout(render,220);}}
  window.addEventListener('hashchange',takeControl);
  window.addEventListener('storage',e=>{if((e.key===STUDENT_STORE||e.key===ASSESS_STORE)&&route()===ROUTE)render();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',takeControl);else takeControl();
  window.THH_ASSESSMENT_INTELLIGENCE_V201={render};
})();
