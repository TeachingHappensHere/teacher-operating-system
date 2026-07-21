(() => {
  'use strict';

  const ROUTE = 'planning-center';
  const STORE = 'thh:v19:planning-framework';
  const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const SUBJECTS = ['Reading','Math','Writing','Science','Social Studies','MOWR','Heggerty','Morning Meeting'];
  const SUBJECT_META = {
    'Reading': {icon:'📚', tone:'purple'},
    'Math': {icon:'➗', tone:'blue'},
    'Writing': {icon:'✍️', tone:'teal'},
    'Science': {icon:'🔬', tone:'green'},
    'Social Studies': {icon:'🌎', tone:'orange'},
    'MOWR': {icon:'🧠', tone:'rose'},
    'Heggerty': {icon:'🔤', tone:'sky'},
    'Morning Meeting': {icon:'☀️', tone:'gold'}
  };

  const defaultLesson = (subject, day) => ({
    id: `${day.toLowerCase()}-${subject.toLowerCase().replace(/\s+/g,'-')}`,
    day, subject, title:'', objective:'', iCanStatement:'', standards:[], standardDescription:'',
    essentialQuestion:'', successCriteria:'', vocabulary:'', academicVocabulary:'', materials:'',
    activatePriorKnowledge:'', iDo:'', weDo:'', youDo:'', checksForUnderstanding:'',
    assessment:'', differentiation:'', ellSupports:'', iepSupports:'', support504:'', homework:'',
    instructionalStrategies:'', resources:[], teacherNotes:'', reflection:'', status:'draft'
  });

  const seed = {
    version:'22.2.0', selectedWeekId:'2026-08-03', selectedDay:'Monday', selectedSubject:'Reading',
    weeks:[{
      id:'2026-08-03', startDate:'2026-08-03', label:'Week of August 3, 2026', mode:'core',
      theme:'Helping One Another', anchorText:'The Mice Who Lived in a Shoe',
      openCourt:{unit:1,lesson:1,story:'The Mice Who Lived in a Shoe'},
      bigIdea:'People work together to solve problems and build strong communities.',
      essentialQuestion:'How can working together help us solve a problem?', weeklyObjectives:'',
      vocabulary:'', academicVocabulary:'', highFrequencyWords:'', phonics:'', grammar:'', writingGenre:'',
      scienceConnection:'', socialStudiesConnection:'', mathFocus:'', assessments:'', projects:'',
      copies:[], resources:[], lessons:DAY_NAMES.flatMap(day=>SUBJECTS.map(subject=>defaultLesson(subject,day)))
    }]
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
  const route = ()=>location.hash.replace(/^#\/?/,'').split('?')[0] || 'dashboard';

  function normalizeLesson(raw, subject, day){ return {...defaultLesson(subject,day), ...(raw||{}), standards:Array.isArray(raw?.standards)?raw.standards:[]}; }
  function normalize(saved){
    if(!saved || !Array.isArray(saved.weeks)) return clone(seed);
    saved.version='22.2.0'; saved.selectedSubject=SUBJECTS.includes(saved.selectedSubject)?saved.selectedSubject:'Reading';
    saved.selectedDay=DAY_NAMES.includes(saved.selectedDay)?saved.selectedDay:'Monday';
    saved.weeks.forEach(w=>{
      w.academicVocabulary ||= '';
      const existing = Array.isArray(w.lessons)?w.lessons:[];
      w.lessons=DAY_NAMES.flatMap(day=>SUBJECTS.map(subject=>normalizeLesson(existing.find(l=>l.day===day&&l.subject===subject),subject,day)));
    });
    return saved;
  }
  function load(){ try{return normalize(JSON.parse(localStorage.getItem(STORE)||'null'));}catch{return clone(seed);} }
  let state=load();
  const save=()=>localStorage.setItem(STORE,JSON.stringify(state));
  const currentWeek=()=>state.weeks.find(w=>w.id===state.selectedWeekId)||state.weeks[0];
  const currentLesson=()=>currentWeek().lessons.find(l=>l.day===state.selectedDay&&l.subject===state.selectedSubject);

  function injectNavigation(){
    const nav=$('#mainNav'); if(!nav||nav.querySelector('[data-route="planning-center"]')) return;
    const button=document.createElement('button'); button.className='nav-item'; button.dataset.route=ROUTE;
    button.innerHTML='<span class="nav-icon">◇</span><span>Subject Planner<br>& Diamond Board</span>';
    button.addEventListener('click',()=>location.hash=`#${ROUTE}`);
    const plans=nav.querySelector('[data-route="lesson-plans"]'); plans?plans.insertAdjacentElement('afterend',button):nav.appendChild(button);
  }

  function lessonComplete(l){ return Boolean(l.iCanStatement&&l.objective&&l.standards.length&&(l.iDo||l.weDo||l.youDo)&&l.materials&&l.assessment&&(l.differentiation||l.ellSupports||l.iepSupports||l.support504)); }
  function completion(week){
    const scoped=week.lessons.filter(l=>l.subject===state.selectedSubject), ready=scoped.filter(lessonComplete).length;
    return {total:scoped.length,ready,percent:scoped.length?Math.round(ready/scoped.length*100):0};
  }
  function missing(l){
    const out=[]; if(!l.iCanStatement)out.push('I Can Statement'); if(!l.objective)out.push('Objective'); if(!l.standards.length)out.push('Standard');
    if(!(l.iDo||l.weDo||l.youDo))out.push('Instruction'); if(!l.materials)out.push('Materials'); if(!l.assessment)out.push('Assessment');
    if(!(l.differentiation||l.ellSupports||l.iepSupports||l.support504))out.push('Differentiation'); return out;
  }
  function subjectLessons(){ return DAY_NAMES.map(day=>currentWeek().lessons.find(l=>l.day===day&&l.subject===state.selectedSubject)); }
  function display(v,fallback='Add to lesson'){ return esc((v||'').trim()||fallback); }
  function listDisplay(v){
    const items=String(v||'').split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean).slice(0,6);
    return items.length?`<ul>${items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`:'<span class="db-empty">Add vocabulary</span>';
  }

  function render(){
    if(route()!==ROUTE)return; const host=$('#pageHost'); if(!host)return;
    const week=currentWeek(), lesson=currentLesson(), progress=completion(week), meta=SUBJECT_META[state.selectedSubject];
    host.innerHTML=`
      <section class="pf-shell pf-tone-${meta.tone}" aria-label="Subject Planner and Diamond Board">
        <header class="pf-hero">
          <div class="pf-title-wrap"><span class="pf-subject-icon">${meta.icon}</span><div><p class="pf-eyebrow">Teacher Operating System · Version 22.2</p><h2>${esc(state.selectedSubject)} Planner</h2><p>${esc(week.label)} · Plan once, then teach, display, print, and export.</p></div></div>
          <div class="pf-progress-card"><div><strong>${progress.percent}%</strong><span>Subject ready</span></div><div class="pf-meter"><i style="width:${progress.percent}%"></i></div><small>${progress.ready} of ${progress.total} days complete</small></div>
        </header>

        <div class="pf-toolbar">
          <label><span>Week</span><select id="pfWeekSelect">${state.weeks.map(w=>`<option value="${esc(w.id)}" ${w.id===week.id?'selected':''}>${esc(w.label)}</option>`).join('')}</select></label>
          <button id="pfDuplicateWeek" class="pf-secondary">Copy Week</button><button id="pfPrintBoard" class="pf-secondary">Print Board</button>
          <button id="pfClassroomDisplay" class="pf-secondary">Classroom Display</button><button id="pfExportWeek" class="pf-primary">Export Planbook Text</button>
        </div>

        <nav class="pf-subject-tabs" aria-label="Subjects">${SUBJECTS.map(s=>{const m=SUBJECT_META[s];return `<button data-pf-subject="${s}" class="${s===state.selectedSubject?'active':''}"><span>${m.icon}</span>${s}</button>`}).join('')}</nav>
        <nav class="pf-day-tabs" aria-label="Days">${DAY_NAMES.map(d=>`<button data-pf-day="${d}" class="${d===state.selectedDay?'active':''}"><strong>${d}</strong><span>${currentWeek().lessons.find(l=>l.day===d&&l.subject===state.selectedSubject)?.title||'Add lesson'}</span></button>`).join('')}</nav>

        <div class="pf-workspace">
          <aside class="pf-card pf-week-hub">
            <div class="pf-card-head"><div><p class="pf-eyebrow">Weekly Focus</p><h3>${esc(week.anchorText||state.selectedSubject)}</h3></div><span class="pf-mode">${week.mode==='launch'?'Launch':'Core'}</span></div>
            <div class="pf-anchor"><span>Unit / Theme</span><strong>${display(week.theme,'Add weekly theme')}</strong><small>${week.openCourt?.story?`Open Court: ${esc(week.openCourt.story)}`:'Weekly curriculum focus'}</small></div>
            <div class="pf-compact-fields">
              ${weekField('bigIdea','Big Idea',week.bigIdea)}${weekField('essentialQuestion','Essential Question',week.essentialQuestion)}
              ${weekField('weeklyObjectives','Weekly Objective',week.weeklyObjectives)}${weekField('vocabulary','Content Vocabulary',week.vocabulary)}
              ${weekField('academicVocabulary','Academic Vocabulary',week.academicVocabulary)}${weekField('assessments','Weekly Assessment',week.assessments)}
            </div>
            <div class="pf-week-map"><h4>Week at a Glance</h4>${subjectLessons().map(l=>`<button data-pf-day="${l.day}" class="${l.day===state.selectedDay?'active':''}"><span>${l.day.slice(0,3)}</span><strong>${esc(l.title||'Add lesson focus')}</strong><i>${lessonComplete(l)?'✓':'○'}</i></button>`).join('')}</div>
          </aside>

          <main class="pf-card pf-lesson-studio">
            <div class="pf-card-head"><div><p class="pf-eyebrow">Lesson Studio</p><h3>${esc(state.selectedDay)} · ${esc(state.selectedSubject)}</h3></div><button id="pfToggleReady" class="${lesson.status==='ready'?'pf-ready':'pf-secondary'}">${lesson.status==='ready'?'✓ Ready':'Mark Ready'}</button></div>
            <div class="pf-completeness"><div class="pf-meter"><i style="width:${lessonComplete(lesson)?100:Math.max(8,100-(missing(lesson).length*13))}%"></i></div><span>${lessonComplete(lesson)?'All required lesson elements are complete.':`Missing: ${missing(lesson).join(', ')}`}</span></div>
            ${section('learning','1. Learning Target',true,`
              <div class="pf-form-grid">${lessonField('iCanStatement','I Can Statement *',lesson.iCanStatement,'textarea','I can...')}${lessonField('objective','Objective *',lesson.objective,'textarea')}${lessonField('standards','Standard ID *',lesson.standards.join('\n'),'textarea')}${lessonField('standardDescription','Standard Description',lesson.standardDescription,'textarea')}${lessonField('essentialQuestion','Essential Question',lesson.essentialQuestion,'textarea')}${lessonField('successCriteria','Success Criteria',lesson.successCriteria,'textarea')}</div>`)}
            ${section('instruction','2. Lesson / Instruction (I Do, We Do, You Do)',true,`
              <div class="pf-form-grid">${lessonField('title','Lesson Title',lesson.title)}${lessonField('activatePriorKnowledge','Activate Prior Knowledge',lesson.activatePriorKnowledge,'textarea')}${lessonField('iDo','I Do *',lesson.iDo,'textarea')}${lessonField('weDo','We Do *',lesson.weDo,'textarea')}${lessonField('youDo','You Do *',lesson.youDo,'textarea')}${lessonField('checksForUnderstanding','Checks for Understanding',lesson.checksForUnderstanding,'textarea')}</div>`)}
            ${section('vocabulary','3. Vocabulary & Skills',false,`<div class="pf-form-grid">${lessonField('vocabulary','Content Vocabulary',lesson.vocabulary,'textarea')}${lessonField('academicVocabulary','Academic Vocabulary',lesson.academicVocabulary,'textarea')}${lessonField('instructionalStrategies','Instructional Strategies',lesson.instructionalStrategies,'textarea')}</div>`)}
            ${section('differentiation','4. Differentiation / Accommodations',false,`<div class="pf-form-grid">${lessonField('differentiation','General Differentiation *',lesson.differentiation,'textarea')}${lessonField('ellSupports','ELL Supports',lesson.ellSupports,'textarea')}${lessonField('iepSupports','IEP Supports',lesson.iepSupports,'textarea')}${lessonField('support504','504 Supports',lesson.support504,'textarea')}</div>`)}
            ${section('resources','5. Materials / Resources / Technology',false,`<div class="pf-form-grid">${lessonField('materials','Materials *',lesson.materials,'textarea')}${lessonField('resourcesText','Resources / Technology',lesson.resourcesText||'','textarea')}</div>`)}
            ${section('evidence','6. Evidence of Learning / Homework',false,`<div class="pf-form-grid">${lessonField('assessment','Assessment / Evidence *',lesson.assessment,'textarea')}${lessonField('homework','Homework',lesson.homework,'textarea')}</div>`)}
            ${section('reflection','7. Notes / Reflection',false,`<div class="pf-form-grid">${lessonField('teacherNotes','Teacher Notes',lesson.teacherNotes,'textarea')}${lessonField('reflection','Reflection',lesson.reflection,'textarea')}</div>`)}
          </main>

          <aside class="pf-card pf-board-panel">
            <div class="pf-card-head"><div><p class="pf-eyebrow">Live Classroom Output</p><h3>Weekly Diamond Board</h3></div><button id="pfExpandBoard" class="pf-secondary">Full Screen</button></div>
            ${diamondBoard(week)}
          </aside>
        </div>
      </section>`;
    wire();
  }

  function weekField(key,label,value){return `<label class="pf-field"><span>${label}</span><textarea data-week-field="${key}" rows="3">${esc(value)}</textarea></label>`;}
  function lessonField(key,label,value,type='input',placeholder=''){
    const tag=type==='textarea'?`<textarea data-lesson-field="${key}" rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`:`<input data-lesson-field="${key}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
    return `<label class="pf-field"><span>${label}</span>${tag}</label>`;
  }
  function section(id,title,open,body){return `<details class="pf-section" ${open?'open':''}><summary><span>${title}</span><b>⌄</b></summary><div class="pf-section-body">${body}</div></details>`;}
  function diamondBoard(week){
    const lessons=subjectLessons(), selected=currentLesson();
    const standard=selected.standards.join(', ')||lessons.find(l=>l.standards.length)?.standards.join(', ');
    const objective=selected.objective||lessons.find(l=>l.objective)?.objective||week.weeklyObjectives;
    const iCan=selected.iCanStatement||lessons.find(l=>l.iCanStatement)?.iCanStatement;
    const vocab=selected.vocabulary||week.vocabulary, academic=selected.academicVocabulary||week.academicVocabulary;
    const eq=selected.essentialQuestion||week.essentialQuestion;
    return `<div class="diamond-board" id="pfDiamondBoard">
      <header><span>${SUBJECT_META[state.selectedSubject].icon}</span><div><small>${esc(week.label)}</small><strong>${esc(state.selectedSubject)} Learning Board</strong></div></header>
      <div class="db-layout">
        <section class="db-left"><article><h4>STANDARD</h4><strong data-db="standard">${display(standard,'Add standard')}</strong><p data-db="standardDescription">${display(selected.standardDescription,'Add standard description')}</p></article><article><h4>OBJECTIVE</h4><p data-db="objective">${display(objective,'Add objective')}</p></article><article><h4>I CAN STATEMENT</h4><p data-db="iCanStatement">${display(iCan,'I can...')}</p></article></section>
        <section class="db-center"><div class="db-vocab"><div><h4>CONTENT VOCABULARY</h4><div data-db="vocabulary">${listDisplay(vocab)}</div></div><div><h4>ACADEMIC VOCABULARY</h4><div data-db="academicVocabulary">${listDisplay(academic)}</div></div></div>
          <div class="db-diamond">${lessons.slice(0,4).map((l,i)=>`<button data-pf-day="${l.day}" class="db-day db-day-${i+1} ${l.day===state.selectedDay?'active':''}"><strong>${l.day}</strong><span>${display(l.title||l.youDo||l.objective,'Add daily focus')}</span></button>`).join('')}<div class="db-core"><span>WEEKLY</span><strong>LEARNING</strong></div></div>
          <div class="db-friday" data-pf-day="Friday"><strong>FRIDAY</strong><span>${display(lessons[4].title||lessons[4].assessment||lessons[4].objective,'Assessment & Reflection')}</span></div>
        </section>
        <section class="db-right"><article><h4>ESSENTIAL QUESTION</h4><p data-db="essentialQuestion">${display(eq,'Add essential question')}</p></article><article><h4>SKILL FOCUS</h4><p data-db="successCriteria">${display(selected.successCriteria||selected.youDo,'Add skill or success criteria')}</p></article><article><h4>WHAT WE WILL DO</h4><p data-db="weeklyDoing">${display(week.bigIdea,'Add weekly learning summary')}</p></article></section>
      </div>
    </div>`;
  }

  function updateBoardLive(field,value){
    const node=$(`[data-db="${field}"]`); if(!node)return;
    if(field==='vocabulary'||field==='academicVocabulary') node.innerHTML=listDisplay(value); else node.textContent=value.trim()||({iCanStatement:'I can...',objective:'Add objective',essentialQuestion:'Add essential question',successCriteria:'Add skill or success criteria',standardDescription:'Add standard description'}[field]||'Add to lesson');
  }
  function wire(){
    $('#pfWeekSelect')?.addEventListener('change',e=>{state.selectedWeekId=e.target.value;save();render();});
    $$('[data-pf-day]').forEach(b=>b.addEventListener('click',()=>{state.selectedDay=b.dataset.pfDay;save();render();}));
    $$('[data-pf-subject]').forEach(b=>b.addEventListener('click',()=>{state.selectedSubject=b.dataset.pfSubject;save();render();}));
    $$('[data-week-field]').forEach(el=>el.addEventListener('input',()=>{currentWeek()[el.dataset.weekField]=el.value;save(); if(['vocabulary','academicVocabulary','essentialQuestion'].includes(el.dataset.weekField)) updateBoardLive(el.dataset.weekField,el.value);}));
    $$('[data-lesson-field]').forEach(el=>el.addEventListener('input',()=>{
      const l=currentLesson(),key=el.dataset.lessonField; l[key]=key==='standards'?el.value.split('\n').map(v=>v.trim()).filter(Boolean):el.value; save();
      if(key==='standards') updateBoardLive('standard',l.standards.join(', ')); else updateBoardLive(key,el.value);
    }));
    $('#pfToggleReady')?.addEventListener('click',()=>{const l=currentLesson();l.status=l.status==='ready'?'draft':'ready';save();render();});
    $('#pfDuplicateWeek')?.addEventListener('click',duplicateWeek); $('#pfExportWeek')?.addEventListener('click',exportWeek);
    $('#pfPrintBoard')?.addEventListener('click',()=>{document.body.classList.add('pf-print-board');window.print();setTimeout(()=>document.body.classList.remove('pf-print-board'),500);});
    $('#pfExpandBoard')?.addEventListener('click',()=>$('#pfDiamondBoard')?.requestFullscreen?.());
    $('#pfClassroomDisplay')?.addEventListener('click',()=>{ if(window.THH_CLASSROOM_DISPLAY_V211?.open) window.THH_CLASSROOM_DISPLAY_V211.open(); else $('#pfDiamondBoard')?.requestFullscreen?.(); });
  }
  function duplicateWeek(){const source=clone(currentWeek()),date=new Date(`${source.startDate}T12:00:00`);date.setDate(date.getDate()+7);const id=date.toISOString().slice(0,10);source.id=id;source.startDate=id;source.label=`Week of ${date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`;source.lessons.forEach(l=>{l.status='draft';l.reflection='';});state.weeks.push(source);state.selectedWeekId=id;save();render();}
  function exportWeek(){
    const w=currentWeek(),lines=[w.label,`Subject: ${state.selectedSubject}`,`Theme: ${w.theme}`,`Anchor Text: ${w.anchorText}`,`Big Idea: ${w.bigIdea}`,`Essential Question: ${w.essentialQuestion}`,''];
    subjectLessons().forEach(l=>{lines.push(l.day.toUpperCase(),`Lesson Title: ${l.title}`,`I Can Statement: ${l.iCanStatement}`,`Objective: ${l.objective}`,`Standard ID: ${l.standards.join(', ')}`,`Standard Description: ${l.standardDescription}`,`Lesson / Instruction: I Do—${l.iDo} | We Do—${l.weDo} | You Do—${l.youDo}`,`Differentiation / Accommodations: ${[l.differentiation,l.ellSupports,l.iepSupports,l.support504].filter(Boolean).join(' | ')}`,`Homework / Evidence of Learning: ${[l.homework,l.assessment].filter(Boolean).join(' | ')}`,`Materials / Resources / Technology: ${[l.materials,l.resourcesText].filter(Boolean).join(' | ')}`,`Instructional Strategies: ${l.instructionalStrategies}`,`Notes / Reflection: ${[l.teacherNotes,l.reflection].filter(Boolean).join(' | ')}`,'');});
    const blob=new Blob([lines.join('\n')],{type:'text/plain'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${w.id}-${state.selectedSubject.toLowerCase().replace(/\s+/g,'-')}-planbook.txt`;a.click();URL.revokeObjectURL(a.href);
  }
  function takeControl(){injectNavigation();if(route()===ROUTE){setTimeout(render,20);setTimeout(render,220);}}
  window.THH_PLANNING_FRAMEWORK_V190={render,getState:()=>clone(state)};
  window.addEventListener('hashchange',takeControl); if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',takeControl);else takeControl();
})();
