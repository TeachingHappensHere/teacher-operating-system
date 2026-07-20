(() => {
  'use strict';

  const ROUTE = 'students';
  const STORE = 'thh:v20:student-intelligence';
  const GROUP_ORDER = ['Red', 'Yellow', 'Green', 'Blue'];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const route = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  const today = () => new Date().toISOString().slice(0, 10);

  const blankStudent = () => ({
    id: uid('student'), firstName: '', lastName: '', preferredName: '', birthday: '',
    readingGroup: '', mathGroup: '', writingGroup: '', status: 'Active',
    ell: false, iep: false, plan504: false,
    accommodations: [], medicalAlerts: [], contacts: [], goals: [],
    notes: [], interventions: [], communications: [], assessments: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });

  function defaultState() {
    return { version: 1, selectedStudentId: null, students: [], attendance: {}, groupPlans: {}, filters: { search: '', group: '', flag: '' } };
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!parsed || !Array.isArray(parsed.students)) return defaultState();
      parsed.attendance ||= {}; parsed.groupPlans ||= {}; parsed.filters ||= {search:'',group:'',flag:''};
      parsed.students.forEach(normalizeStudent);
      return parsed;
    } catch { return defaultState(); }
  }

  function normalizeStudent(s) {
    Object.assign(s, {
      preferredName: s.preferredName || '', birthday: s.birthday || '', readingGroup: s.readingGroup || '',
      mathGroup: s.mathGroup || '', writingGroup: s.writingGroup || '', status: s.status || 'Active',
      ell: Boolean(s.ell), iep: Boolean(s.iep), plan504: Boolean(s.plan504),
      accommodations: Array.isArray(s.accommodations) ? s.accommodations : [],
      medicalAlerts: Array.isArray(s.medicalAlerts) ? s.medicalAlerts : [],
      contacts: Array.isArray(s.contacts) ? s.contacts : [], goals: Array.isArray(s.goals) ? s.goals : [],
      notes: Array.isArray(s.notes) ? s.notes : [], interventions: Array.isArray(s.interventions) ? s.interventions : [],
      communications: Array.isArray(s.communications) ? s.communications : [], assessments: Array.isArray(s.assessments) ? s.assessments : []
    });
  }

  function save(state) { localStorage.setItem(STORE, JSON.stringify(state)); }
  function nameOf(s) { return [s.preferredName || s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unnamed student'; }
  function initials(s) { return `${(s.preferredName || s.firstName || '?')[0]}${(s.lastName || '')[0] || ''}`.toUpperCase(); }
  function ageBirthdayText(value) {
    if (!value) return 'Birthday not entered';
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? 'Birthday not entered' : d.toLocaleDateString(undefined, { month:'long', day:'numeric' });
  }
  function activeStudents(state) { return state.students.filter(s => s.status !== 'Archived'); }
  function selectedStudent(state) { return state.students.find(s => s.id === state.selectedStudentId) || null; }
  function attendanceFor(state, id) { return state.attendance[today()]?.[id] || 'Unmarked'; }
  function groupCounts(students) { return GROUP_ORDER.map(group => ({ group, count: students.filter(s => s.readingGroup === group).length })); }

  function injectNavigation() {
    const nav = $('#mainNav');
    if (!nav || nav.querySelector(`[data-route="${ROUTE}"]`)) return;
    const button = document.createElement('button');
    button.className = 'nav-item'; button.dataset.route = ROUTE;
    button.innerHTML = '<span class="nav-icon">👥</span><span>Students</span>';
    button.addEventListener('click', () => { location.hash = `#${ROUTE}`; });
    const resources = nav.querySelector('[data-route="resource-center"]');
    resources ? resources.insertAdjacentElement('afterend', button) : nav.appendChild(button);
  }

  function filteredStudents(state) {
    const f = state.filters || {};
    const q = String(f.search || '').trim().toLowerCase();
    return activeStudents(state).filter(s => {
      const text = `${nameOf(s)} ${s.readingGroup} ${s.mathGroup}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (f.group && s.readingGroup !== f.group) return false;
      if (f.flag === 'iep' && !s.iep) return false;
      if (f.flag === '504' && !s.plan504) return false;
      if (f.flag === 'ell' && !s.ell) return false;
      if (f.flag === 'medical' && !s.medicalAlerts.length) return false;
      return true;
    }).sort((a,b) => nameOf(a).localeCompare(nameOf(b)));
  }

  function overview(state) {
    const students = activeStudents(state);
    const marked = students.map(s => attendanceFor(state, s.id));
    return {
      total: students.length,
      present: marked.filter(v => v === 'Present').length,
      absent: marked.filter(v => v === 'Absent').length,
      iep: students.filter(s => s.iep).length,
      plan504: students.filter(s => s.plan504).length,
      ell: students.filter(s => s.ell).length,
      medical: students.filter(s => s.medicalAlerts.length).length
    };
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $('#pageHost'); if (!host) return;
    const state = load();
    const stats = overview(state);
    const students = filteredStudents(state);
    const selected = selectedStudent(state);

    host.innerHTML = `<section class="si-shell" aria-label="Student Intelligence Center">
      <header class="si-hero">
        <div><p class="si-eyebrow">Sprint 20 · Student Intelligence</p><h2>Student Center</h2><p>Profiles, groups, supports, interventions, family communication, and instructional history in one place.</p></div>
        <div class="si-hero-actions"><button id="siImport" class="si-secondary">Import / Export</button><button id="siAddStudent" class="si-primary">+ Add Student</button></div>
      </header>

      <div class="si-stats">
        ${statCard('Students', stats.total, 'Active roster')}
        ${statCard('Present', stats.present, `${stats.absent} absent · today`)}
        ${statCard('IEP / 504', `${stats.iep} / ${stats.plan504}`, 'Support plans')}
        ${statCard('EL', stats.ell, 'Language supports')}
        ${statCard('Medical', stats.medical, 'Students with alerts')}
      </div>

      <div class="si-layout">
        <aside class="si-roster-panel">
          <div class="si-panel-head"><div><p class="si-eyebrow">Class Roster</p><h3>${stats.total} Students</h3></div><button id="siMarkAllPresent" class="si-text">Mark all present</button></div>
          <div class="si-filters"><input id="siSearch" type="search" value="${esc(state.filters.search || '')}" placeholder="Search students..."><div class="si-filter-row"><select id="siGroupFilter"><option value="">All reading groups</option>${GROUP_ORDER.map(g => `<option ${state.filters.group===g?'selected':''}>${g}</option>`).join('')}</select><select id="siFlagFilter"><option value="">All supports</option><option value="iep" ${state.filters.flag==='iep'?'selected':''}>IEP</option><option value="504" ${state.filters.flag==='504'?'selected':''}>504</option><option value="ell" ${state.filters.flag==='ell'?'selected':''}>EL</option><option value="medical" ${state.filters.flag==='medical'?'selected':''}>Medical alert</option></select></div></div>
          <div class="si-roster" id="siRoster">${students.length ? students.map(s => studentRow(s, state, selected?.id === s.id)).join('') : emptyRoster()}</div>
        </aside>

        <main class="si-main-panel">${selected ? profileView(selected, state) : classroomView(state)}</main>
      </div>

      ${studentDialog()}
      ${importDialog()}
      ${entryDialog()}
    </section>`;
    wire(state);
  }

  function statCard(label, value, note) { return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`; }
  function emptyRoster() { return '<div class="si-empty"><div>👥</div><strong>No students yet</strong><p>Add students one at a time or import a CSV roster.</p></div>'; }

  function studentRow(s, state, active) {
    const attendance = attendanceFor(state, s.id);
    const flags = [s.iep?'IEP':'', s.plan504?'504':'', s.ell?'EL':'', s.medicalAlerts.length?'MED':''].filter(Boolean);
    return `<button class="si-student-row ${active?'is-active':''}" data-student-id="${esc(s.id)}">
      <span class="si-avatar">${esc(initials(s))}</span><span class="si-student-copy"><strong>${esc(nameOf(s))}</strong><small>${esc(s.readingGroup || 'No reading group')}${flags.length ? ` · ${esc(flags.join(' · '))}` : ''}</small></span>
      <span class="si-attendance ${attendance.toLowerCase()}">${esc(attendance === 'Unmarked' ? '—' : attendance[0])}</span>
    </button>`;
  }

  function classroomView(state) {
    const students = activeStudents(state);
    const counts = groupCounts(students);
    const alerts = students.filter(s => s.medicalAlerts.length || s.iep || s.plan504 || s.ell);
    return `<section class="si-classroom-view">
      <div class="si-section-head"><div><p class="si-eyebrow">Classroom Overview</p><h3>Instructional Snapshot</h3></div><button id="siOpenGroupMode" class="si-primary">Open Small-Group Mode</button></div>
      <div class="si-group-grid">${counts.map(c => `<article class="si-group-card group-${c.group.toLowerCase()}"><div><span>${esc(c.group)} Group</span><strong>${c.count}</strong></div><p>${groupGuidance(c.group)}</p><button data-group-open="${esc(c.group)}">View group</button></article>`).join('')}</div>
      <div class="si-two-col">
        <article class="si-card"><div class="si-card-head"><div><p class="si-eyebrow">Supports</p><h3>Student Alerts</h3></div></div>${alerts.length ? `<div class="si-alert-list">${alerts.slice(0,10).map(s => `<button data-student-id="${esc(s.id)}"><strong>${esc(nameOf(s))}</strong><span>${[s.iep?'IEP':'',s.plan504?'504':'',s.ell?'EL':'',...s.medicalAlerts.map(a=>a.title)].filter(Boolean).join(' · ')}</span></button>`).join('')}</div>` : '<p class="si-muted">No instructional or medical alerts have been entered.</p>'}</article>
        <article class="si-card"><div class="si-card-head"><div><p class="si-eyebrow">Today</p><h3>Attendance</h3></div></div><div class="si-attendance-summary"><strong>${overview(state).present}</strong><span>present</span><strong>${overview(state).absent}</strong><span>absent</span><strong>${students.filter(s=>attendanceFor(state,s.id)==='Unmarked').length}</strong><span>unmarked</span></div><button id="siAttendanceMode" class="si-secondary si-full">Take Attendance</button></article>
      </div>
    </section>`;
  }

  function groupGuidance(group) {
    return ({Red:'Daily intensive decoding and accuracy support.',Yellow:'Three to four sessions weekly for developing skills.',Green:'Benchmark practice and comprehension extension.',Blue:'Advanced fluency, prosody, and enrichment.'})[group] || '';
  }

  function profileView(s, state) {
    const history = [...s.assessments.map(x=>({...x,kind:'Assessment'})), ...s.interventions.map(x=>({...x,kind:'Intervention'})), ...s.communications.map(x=>({...x,kind:'Communication'})), ...s.notes.map(x=>({...x,kind:'Note'}))]
      .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    return `<section class="si-profile">
      <header class="si-profile-head"><div class="si-profile-avatar">${esc(initials(s))}</div><div><p class="si-eyebrow">Student Profile</p><h3>${esc(nameOf(s))}</h3><p>${esc(ageBirthdayText(s.birthday))} · ${esc(s.status)}</p></div><div class="si-profile-actions"><button id="siEditStudent" class="si-secondary">Edit Profile</button><button id="siCloseProfile" class="si-text">Close</button></div></header>
      <div class="si-profile-grid">
        <article class="si-card"><div class="si-card-head"><h4>Instructional Placement</h4></div>${fieldLine('Reading group',s.readingGroup||'Not assigned')}${fieldLine('Math group',s.mathGroup||'Not assigned')}${fieldLine('Writing group',s.writingGroup||'Not assigned')}<button data-entry="assessment" class="si-secondary si-full">+ Record Assessment</button></article>
        <article class="si-card"><div class="si-card-head"><h4>Supports & Accommodations</h4></div><div class="si-chip-row">${[s.iep?'IEP':'',s.plan504?'504':'',s.ell?'EL':''].filter(Boolean).map(x=>`<span>${x}</span>`).join('') || '<small class="si-muted">No plans marked</small>'}</div>${listItems(s.accommodations,'No accommodations entered.')}<button data-entry="accommodation" class="si-secondary si-full">+ Add Accommodation</button></article>
        <article class="si-card"><div class="si-card-head"><h4>Medical & Safety</h4></div>${s.medicalAlerts.length ? s.medicalAlerts.map(a=>`<div class="si-medical"><strong>${esc(a.title)}</strong><p>${esc(a.details||'')}</p></div>`).join('') : '<p class="si-muted">No medical alerts entered.</p>'}<button data-entry="medical" class="si-secondary si-full">+ Add Medical Alert</button></article>
        <article class="si-card"><div class="si-card-head"><h4>Family Contacts</h4></div>${s.contacts.length ? s.contacts.map(c=>`<div class="si-contact"><strong>${esc(c.name)}</strong><p>${esc(c.relationship||'Contact')} · ${esc(c.phone||c.email||'No contact detail')}</p></div>`).join('') : '<p class="si-muted">No family contacts entered.</p>'}<button data-entry="contact" class="si-secondary si-full">+ Add Contact</button></article>
      </div>
      <div class="si-two-col si-lower">
        <article class="si-card"><div class="si-card-head"><div><p class="si-eyebrow">Goals</p><h4>Current Student Goals</h4></div><button data-entry="goal" class="si-text">+ Add</button></div>${s.goals.length ? s.goals.map((g,i)=>`<label class="si-goal"><input type="checkbox" data-goal-index="${i}" ${g.done?'checked':''}><span><strong>${esc(g.title)}</strong><small>${esc(g.targetDate?`Target ${g.targetDate}`:'No target date')}</small></span></label>`).join('') : '<p class="si-muted">No goals entered.</p>'}</article>
        <article class="si-card"><div class="si-card-head"><div><p class="si-eyebrow">History</p><h4>Student Timeline</h4></div><button data-entry="note" class="si-text">+ Note</button></div>${history.length ? `<div class="si-timeline">${history.slice(0,12).map(item=>`<div><span>${esc(item.date||'')}</span><strong>${esc(item.kind)}${item.skill?` · ${esc(item.skill)}`:''}</strong><p>${esc(item.summary||item.note||item.result||item.title||'')}</p></div>`).join('')}</div>` : '<p class="si-muted">Assessment, intervention, communication, and note history will appear here.</p>'}<div class="si-history-actions"><button data-entry="intervention" class="si-secondary">Intervention</button><button data-entry="communication" class="si-secondary">Communication</button></div></article>
      </div>
      <article class="si-card si-danger-zone"><button id="siArchiveStudent" class="si-text">Archive Student</button></article>
    </section>`;
  }

  function fieldLine(label,value){return `<div class="si-field-line"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;}
  function listItems(items,empty){return items.length?`<ul class="si-simple-list">${items.map(i=>`<li>${esc(i.title||i)}</li>`).join('')}</ul>`:`<p class="si-muted">${esc(empty)}</p>`;}

  function studentDialog() {
    return `<dialog id="siStudentDialog" class="si-dialog"><form id="siStudentForm" method="dialog"><input type="hidden" name="id"><div class="si-dialog-head"><div><p class="si-eyebrow">Student Profile</p><h3 id="siStudentDialogTitle">Add Student</h3></div><button value="cancel" aria-label="Close">×</button></div>
      <div class="si-form-grid"><label>First name<input name="firstName" required></label><label>Last name<input name="lastName" required></label><label>Preferred name<input name="preferredName"></label><label>Birthday<input type="date" name="birthday"></label></div>
      <div class="si-form-grid"><label>Reading group<select name="readingGroup"><option value="">Not assigned</option>${GROUP_ORDER.map(g=>`<option>${g}</option>`).join('')}</select></label><label>Math group<input name="mathGroup" placeholder="Group A"></label><label>Writing group<input name="writingGroup" placeholder="Group A"></label><label>Status<select name="status"><option>Active</option><option>Archived</option></select></label></div>
      <fieldset><legend>Instructional plans</legend><label class="si-check"><input type="checkbox" name="iep"> IEP</label><label class="si-check"><input type="checkbox" name="plan504"> 504 Plan</label><label class="si-check"><input type="checkbox" name="ell"> English Learner</label></fieldset>
      <div class="si-dialog-actions"><button value="cancel" class="si-secondary">Cancel</button><button type="submit" value="default" class="si-primary">Save Student</button></div></form></dialog>`;
  }

  function importDialog() {
    return `<dialog id="siImportDialog" class="si-dialog"><form method="dialog"><div class="si-dialog-head"><div><p class="si-eyebrow">Roster Portability</p><h3>Import or Export</h3></div><button value="cancel" aria-label="Close">×</button></div><p class="si-muted">CSV import accepts columns named First Name, Last Name, Birthday, Reading Group, Math Group, IEP, 504, and EL.</p><label>Paste CSV data<textarea id="siCsvInput" rows="9" placeholder="First Name,Last Name,Reading Group\nAva,Smith,Red"></textarea></label><div class="si-dialog-actions"><button id="siDownloadCsv" type="button" class="si-secondary">Export CSV</button><button id="siImportCsv" type="button" class="si-primary">Import CSV</button></div></form></dialog>`;
  }

  function entryDialog() {
    return `<dialog id="siEntryDialog" class="si-dialog"><form id="siEntryForm" method="dialog"><input type="hidden" name="type"><div class="si-dialog-head"><div><p class="si-eyebrow">Student Record</p><h3 id="siEntryTitle">Add Entry</h3></div><button value="cancel" aria-label="Close">×</button></div><div id="siEntryFields"></div><div class="si-dialog-actions"><button value="cancel" class="si-secondary">Cancel</button><button type="submit" value="default" class="si-primary">Save Entry</button></div></form></dialog>`;
  }

  function wire(state) {
    $('#siAddStudent')?.addEventListener('click',()=>openStudentDialog());
    $('#siEditStudent')?.addEventListener('click',()=>openStudentDialog(selectedStudent(state)));
    $('#siCloseProfile')?.addEventListener('click',()=>{state.selectedStudentId=null;save(state);render();});
    $('#siImport')?.addEventListener('click',()=>$('#siImportDialog')?.showModal());
    $('#siSearch')?.addEventListener('input',e=>{state.filters.search=e.target.value;save(state);render();});
    $('#siGroupFilter')?.addEventListener('change',e=>{state.filters.group=e.target.value;save(state);render();});
    $('#siFlagFilter')?.addEventListener('change',e=>{state.filters.flag=e.target.value;save(state);render();});
    $$('[data-student-id]').forEach(b=>b.addEventListener('click',()=>{state.selectedStudentId=b.dataset.studentId;save(state);render();}));
    $('#siMarkAllPresent')?.addEventListener('click',()=>{state.attendance[today()]={};activeStudents(state).forEach(s=>state.attendance[today()][s.id]='Present');save(state);render();});
    $('#siAttendanceMode')?.addEventListener('click',()=>cycleAttendanceForRoster(state));
    $('#siOpenGroupMode')?.addEventListener('click',()=>openFirstGroup(state));
    $$('[data-group-open]').forEach(b=>b.addEventListener('click',()=>openGroup(state,b.dataset.groupOpen)));
    $$('[data-entry]').forEach(b=>b.addEventListener('click',()=>openEntryDialog(b.dataset.entry)));
    $$('[data-goal-index]').forEach(input=>input.addEventListener('change',()=>{const s=selectedStudent(state);s.goals[Number(input.dataset.goalIndex)].done=input.checked;s.updatedAt=new Date().toISOString();save(state);render();}));
    $('#siArchiveStudent')?.addEventListener('click',()=>{const s=selectedStudent(state);if(!s)return;if(confirm(`Archive ${nameOf(s)}?`)){s.status='Archived';state.selectedStudentId=null;save(state);render();}});
    $('#siStudentForm')?.addEventListener('submit',e=>saveStudentForm(e,state));
    $('#siEntryForm')?.addEventListener('submit',e=>saveEntryForm(e,state));
    $('#siImportCsv')?.addEventListener('click',()=>importCsv(state));
    $('#siDownloadCsv')?.addEventListener('click',()=>downloadCsv(state));
  }

  function openStudentDialog(student = null) {
    const dialog=$('#siStudentDialog'), form=$('#siStudentForm'); if(!dialog||!form)return;
    const s=student||blankStudent(); $('#siStudentDialogTitle').textContent=student?'Edit Student':'Add Student';
    ['id','firstName','lastName','preferredName','birthday','readingGroup','mathGroup','writingGroup','status'].forEach(k=>{if(form.elements[k])form.elements[k].value=s[k]||'';});
    form.elements.iep.checked=Boolean(s.iep);form.elements.plan504.checked=Boolean(s.plan504);form.elements.ell.checked=Boolean(s.ell);dialog.showModal();
  }

  function saveStudentForm(event,state){event.preventDefault();const form=event.currentTarget,data=new FormData(form);let s=state.students.find(x=>x.id===data.get('id'));if(!s){s=blankStudent();state.students.push(s);}['firstName','lastName','preferredName','birthday','readingGroup','mathGroup','writingGroup','status'].forEach(k=>s[k]=String(data.get(k)||'').trim());s.iep=Boolean(data.get('iep'));s.plan504=Boolean(data.get('plan504'));s.ell=Boolean(data.get('ell'));s.updatedAt=new Date().toISOString();state.selectedStudentId=s.id;save(state);$('#siStudentDialog').close();render();}

  function entryFields(type){
    const defs={
      accommodation:`<label>Accommodation<input name="title" required placeholder="Read directions aloud"></label>`,
      medical:`<label>Alert title<input name="title" required placeholder="Asthma"></label><label>Details<textarea name="details" rows="3" placeholder="Inhaler location, restrictions, nurse instructions"></textarea></label>`,
      contact:`<div class="si-form-grid"><label>Name<input name="name" required></label><label>Relationship<input name="relationship"></label><label>Phone<input name="phone" inputmode="tel"></label><label>Email<input name="email" type="email"></label></div>`,
      goal:`<label>Goal<input name="title" required></label><label>Target date<input name="targetDate" type="date"></label>`,
      note:`<label>Date<input name="date" type="date" value="${today()}"></label><label>Note<textarea name="note" required rows="4"></textarea></label>`,
      intervention:`<div class="si-form-grid"><label>Date<input name="date" type="date" value="${today()}"></label><label>Skill<input name="skill" required placeholder="Phoneme deletion"></label></div><label>Strategy / lesson<input name="summary" required></label><label>Result / next step<textarea name="result" rows="3"></textarea></label>`,
      communication:`<div class="si-form-grid"><label>Date<input name="date" type="date" value="${today()}"></label><label>Method<select name="method"><option>ClassDojo</option><option>Phone</option><option>Email</option><option>Conference</option><option>Other</option></select></label></div><label>Summary<textarea name="summary" required rows="3"></textarea></label>`,
      assessment:`<div class="si-form-grid"><label>Date<input name="date" type="date" value="${today()}"></label><label>Assessment<input name="title" required placeholder="DIBELS ORF"></label><label>Skill / standard<input name="skill"></label><label>Score<input name="score"></label></div><label>Result / interpretation<textarea name="result" rows="3"></textarea></label>`
    };return defs[type]||'';
  }
  function openEntryDialog(type){const titles={accommodation:'Add Accommodation',medical:'Add Medical Alert',contact:'Add Family Contact',goal:'Add Student Goal',note:'Add Teacher Note',intervention:'Record Intervention',communication:'Log Family Communication',assessment:'Record Assessment'};$('#siEntryTitle').textContent=titles[type]||'Add Entry';$('#siEntryForm').elements.type.value=type;$('#siEntryFields').innerHTML=entryFields(type);$('#siEntryDialog').showModal();}
  function saveEntryForm(event,state){event.preventDefault();const s=selectedStudent(state);if(!s)return;const data=new FormData(event.currentTarget),type=String(data.get('type'));const obj=Object.fromEntries([...data.entries()].filter(([k])=>k!=='type'));obj.id=uid(type);if(type==='accommodation')s.accommodations.push(obj);else if(type==='medical')s.medicalAlerts.push(obj);else if(type==='contact')s.contacts.push(obj);else if(type==='goal')s.goals.push({...obj,done:false});else if(type==='note')s.notes.push(obj);else if(type==='intervention')s.interventions.push(obj);else if(type==='communication')s.communications.push(obj);else if(type==='assessment')s.assessments.push(obj);s.updatedAt=new Date().toISOString();save(state);$('#siEntryDialog').close();render();}

  function cycleAttendanceForRoster(state){const students=filteredStudents(state);state.attendance[today()]||={};students.forEach(s=>{const current=state.attendance[today()][s.id]||'Unmarked';state.attendance[today()][s.id]=current==='Unmarked'?'Present':current==='Present'?'Absent':'Unmarked';});save(state);render();}
  function openFirstGroup(state){const group=GROUP_ORDER.find(g=>activeStudents(state).some(s=>s.readingGroup===g));if(group)openGroup(state,group);else alert('Assign reading groups to students first.');}
  function openGroup(state,group){state.filters.group=group;state.filters.search='';state.selectedStudentId=null;save(state);render();setTimeout(()=>$('#siRoster')?.scrollIntoView({behavior:'smooth',block:'start'}),50);}

  function parseCsvLine(line){const out=[];let cur='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'){cur+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===','&&!quoted){out.push(cur.trim());cur='';}else cur+=c;}out.push(cur.trim());return out;}
  function truthy(v){return /^(1|yes|y|true|x)$/i.test(String(v||'').trim());}
  function importCsv(state){const text=$('#siCsvInput')?.value.trim();if(!text)return;const lines=text.split(/\r?\n/).filter(Boolean),headers=parseCsvLine(lines.shift()).map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,''));let added=0;for(const line of lines){const cells=parseCsvLine(line),row={};headers.forEach((h,i)=>row[h]=cells[i]||'');const first=row.firstname||row.first||'',last=row.lastname||row.last||'';if(!first&&!last)continue;const s=blankStudent();s.firstName=first;s.lastName=last;s.birthday=row.birthday||'';s.readingGroup=row.readinggroup||'';s.mathGroup=row.mathgroup||'';s.iep=truthy(row.iep);s.plan504=truthy(row['504']||row.plan504);s.ell=truthy(row.el||row.ell);state.students.push(s);added++;}save(state);$('#siImportDialog')?.close();render();alert(`${added} student${added===1?'':'s'} imported.`);}
  function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
  function downloadCsv(state){const rows=[['First Name','Last Name','Preferred Name','Birthday','Reading Group','Math Group','Writing Group','IEP','504','EL'],...activeStudents(state).map(s=>[s.firstName,s.lastName,s.preferredName,s.birthday,s.readingGroup,s.mathGroup,s.writingGroup,s.iep?'Yes':'No',s.plan504?'Yes':'No',s.ell?'Yes':'No'])];const blob=new Blob([rows.map(r=>r.map(csvEscape).join(',')).join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`student-roster-${today()}.csv`;a.click();URL.revokeObjectURL(url);}

  function takeControl(){injectNavigation();if(route()===ROUTE){setTimeout(render,20);setTimeout(render,220);}}
  window.addEventListener('hashchange',takeControl);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',takeControl);else takeControl();
  window.THH_STUDENT_INTELLIGENCE_V200={render,load};
})();
