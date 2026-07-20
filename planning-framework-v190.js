(() => {
  'use strict';

  const ROUTE = 'planning-center';
  const STORE = 'thh:v19:planning-framework';
  const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const SUBJECTS = ['Reading','Phonics','Heggerty','Tier II','Writing','Math','Science','Social Studies'];

  const defaultLesson = (subject, day) => ({
    id: `${day.toLowerCase()}-${subject.toLowerCase().replace(/\s+/g,'-')}`,
    day,
    subject,
    title: '',
    objective: '',
    standards: [],
    essentialQuestion: '',
    successCriteria: '',
    vocabulary: '',
    materials: '',
    activatePriorKnowledge: '',
    iDo: '',
    weDo: '',
    youDo: '',
    checksForUnderstanding: '',
    assessment: '',
    differentiation: '',
    accommodations: '',
    resources: [],
    teacherNotes: '',
    reflection: '',
    status: 'draft'
  });

  const seed = {
    version: '19.0.0',
    selectedWeekId: '2026-08-03',
    selectedDay: 'Monday',
    selectedSubject: 'Reading',
    weeks: [{
      id: '2026-08-03',
      startDate: '2026-08-03',
      label: 'Week of August 3, 2026',
      mode: 'core',
      theme: 'Helping One Another',
      anchorText: 'The Mice Who Lived in a Shoe',
      openCourt: { unit: 1, lesson: 1, story: 'The Mice Who Lived in a Shoe' },
      bigIdea: 'People work together to solve problems and build strong communities.',
      essentialQuestion: 'How can working together help us solve a problem?',
      weeklyObjectives: '',
      vocabulary: '',
      highFrequencyWords: '',
      phonics: '',
      grammar: '',
      writingGenre: '',
      scienceConnection: '',
      socialStudiesConnection: '',
      mathFocus: '',
      assessments: '',
      projects: '',
      copies: [],
      resources: [],
      lessons: DAY_NAMES.flatMap(day => SUBJECTS.map(subject => defaultLesson(subject, day)))
    }]
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!saved || !Array.isArray(saved.weeks)) return clone(seed);
      return saved;
    } catch { return clone(seed); }
  };
  let state = load();
  const save = () => localStorage.setItem(STORE, JSON.stringify(state));
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const route = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  const currentWeek = () => state.weeks.find(w => w.id === state.selectedWeekId) || state.weeks[0];
  const currentLesson = () => currentWeek().lessons.find(l => l.day === state.selectedDay && l.subject === state.selectedSubject);

  function injectNavigation() {
    const nav = $('#mainNav');
    if (!nav || nav.querySelector('[data-route="planning-center"]')) return;
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.route = ROUTE;
    button.innerHTML = '<span class="nav-icon">🗓️</span><span>Planning Center</span>';
    button.addEventListener('click', () => { location.hash = `#${ROUTE}`; });
    const plans = nav.querySelector('[data-route="lesson-plans"]');
    plans ? plans.insertAdjacentElement('afterend', button) : nav.appendChild(button);
  }

  function completion(week) {
    const total = week.lessons.length;
    const ready = week.lessons.filter(l => l.status === 'ready').length;
    return { total, ready, percent: total ? Math.round(ready / total * 100) : 0 };
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $('#pageHost');
    if (!host) return;
    const week = currentWeek();
    const lesson = currentLesson();
    const progress = completion(week);
    host.innerHTML = `
      <section class="pf-shell" aria-label="Planning Center">
        <header class="pf-hero">
          <div>
            <p class="pf-eyebrow">Teacher Operating System · Version 19.0</p>
            <h2>Connected Lesson Planning</h2>
            <p>Plan the week around the anchor text, then build each lesson with one consistent instructional framework.</p>
          </div>
          <div class="pf-progress-card">
            <strong>${progress.percent}% Ready</strong>
            <span>${progress.ready} of ${progress.total} lessons marked ready</span>
            <div class="pf-meter"><i style="width:${progress.percent}%"></i></div>
          </div>
        </header>

        <div class="pf-toolbar">
          <label>Week
            <select id="pfWeekSelect">${state.weeks.map(w => `<option value="${esc(w.id)}" ${w.id===week.id?'selected':''}>${esc(w.label)}</option>`).join('')}</select>
          </label>
          <button id="pfDuplicateWeek" class="pf-secondary">Duplicate Week</button>
          <button id="pfPrintWeek" class="pf-secondary">Print Week</button>
          <button id="pfExportWeek" class="pf-primary">Export Planbook Text</button>
        </div>

        <div class="pf-grid">
          <article class="pf-card pf-week-hub">
            <div class="pf-card-head"><div><p class="pf-eyebrow">Weekly Hub</p><h3>${esc(week.label)}</h3></div><span class="pf-mode">${week.mode === 'launch' ? 'Classroom Launch' : 'Core Instruction'}</span></div>
            <div class="pf-anchor">
              <span>Anchor Text</span>
              <strong>${esc(week.anchorText || 'Add weekly anchor text')}</strong>
              <small>Open Court Unit ${esc(week.openCourt?.unit || '')}, Lesson ${esc(week.openCourt?.lesson || '')}</small>
            </div>
            <div class="pf-form-grid">
              ${field('theme','Weekly Theme',week.theme)}
              ${field('bigIdea','Big Idea',week.bigIdea,'textarea')}
              ${field('essentialQuestion','Essential Question',week.essentialQuestion,'textarea')}
              ${field('weeklyObjectives','Weekly Objectives',week.weeklyObjectives,'textarea')}
              ${field('vocabulary','Vocabulary',week.vocabulary,'textarea')}
              ${field('highFrequencyWords','High-Frequency Words',week.highFrequencyWords,'textarea')}
              ${field('phonics','Phonics Focus',week.phonics,'textarea')}
              ${field('grammar','Grammar Focus',week.grammar,'textarea')}
              ${field('writingGenre','Writing Focus',week.writingGenre,'textarea')}
              ${field('mathFocus','Math Focus',week.mathFocus,'textarea')}
              ${field('scienceConnection','Science Connection',week.scienceConnection,'textarea')}
              ${field('socialStudiesConnection','Social Studies Connection',week.socialStudiesConnection,'textarea')}
              ${field('assessments','Assessments',week.assessments,'textarea')}
              ${field('projects','Projects / Extensions',week.projects,'textarea')}
            </div>
          </article>

          <article class="pf-card pf-lesson-studio">
            <div class="pf-card-head"><div><p class="pf-eyebrow">Lesson Studio</p><h3>${esc(state.selectedDay)} · ${esc(state.selectedSubject)}</h3></div><button id="pfToggleReady" class="${lesson.status==='ready'?'pf-ready':'pf-secondary'}">${lesson.status==='ready'?'✓ Ready':'Mark Ready'}</button></div>
            <div class="pf-tabs" role="tablist">${DAY_NAMES.map(d => `<button data-pf-day="${d}" class="${d===state.selectedDay?'active':''}">${d.slice(0,3)}</button>`).join('')}</div>
            <div class="pf-subjects">${SUBJECTS.map(s => `<button data-pf-subject="${s}" class="${s===state.selectedSubject?'active':''}">${s}</button>`).join('')}</div>
            <div class="pf-form-grid pf-lesson-fields">
              ${lessonField('title','Lesson Title',lesson.title)}
              ${lessonField('objective','Objective',lesson.objective,'textarea')}
              ${lessonField('standards','Arizona Standards',lesson.standards.join('\n'),'textarea')}
              ${lessonField('essentialQuestion','Essential Question',lesson.essentialQuestion,'textarea')}
              ${lessonField('successCriteria','Success Criteria',lesson.successCriteria,'textarea')}
              ${lessonField('vocabulary','Vocabulary',lesson.vocabulary,'textarea')}
              ${lessonField('materials','Materials',lesson.materials,'textarea')}
              ${lessonField('activatePriorKnowledge','Activate Prior Knowledge',lesson.activatePriorKnowledge,'textarea')}
              ${lessonField('iDo','I Do',lesson.iDo,'textarea')}
              ${lessonField('weDo','We Do',lesson.weDo,'textarea')}
              ${lessonField('youDo','You Do',lesson.youDo,'textarea')}
              ${lessonField('checksForUnderstanding','Checks for Understanding',lesson.checksForUnderstanding,'textarea')}
              ${lessonField('assessment','Assessment',lesson.assessment,'textarea')}
              ${lessonField('differentiation','Differentiation',lesson.differentiation,'textarea')}
              ${lessonField('accommodations','Accommodations / EL / IEP Supports',lesson.accommodations,'textarea')}
              ${lessonField('teacherNotes','Teacher Notes',lesson.teacherNotes,'textarea')}
              ${lessonField('reflection','Reflection',lesson.reflection,'textarea')}
            </div>
          </article>
        </div>

        <article class="pf-card pf-readiness">
          <div class="pf-card-head"><div><p class="pf-eyebrow">Planning Workflow</p><h3>Week Readiness</h3></div></div>
          <div class="pf-readiness-grid">
            ${readinessItem('Instruction','Objectives, standards, and lesson flow complete', week.lessons.filter(l=>l.objective&&l.iDo&&l.weDo&&l.youDo).length, week.lessons.length)}
            ${readinessItem('Materials','Materials and resources identified', week.lessons.filter(l=>l.materials).length, week.lessons.length)}
            ${readinessItem('Assessment','Checks and assessments planned', week.lessons.filter(l=>l.assessment||l.checksForUnderstanding).length, week.lessons.length)}
            ${readinessItem('Differentiation','Student supports documented', week.lessons.filter(l=>l.differentiation||l.accommodations).length, week.lessons.length)}
          </div>
        </article>
      </section>`;
    wire();
  }

  function field(key,label,value,type='input') {
    const tag = type === 'textarea' ? `<textarea data-week-field="${key}" rows="3">${esc(value)}</textarea>` : `<input data-week-field="${key}" value="${esc(value)}">`;
    return `<label class="pf-field"><span>${label}</span>${tag}</label>`;
  }
  function lessonField(key,label,value,type='input') {
    const tag = type === 'textarea' ? `<textarea data-lesson-field="${key}" rows="3">${esc(value)}</textarea>` : `<input data-lesson-field="${key}" value="${esc(value)}">`;
    return `<label class="pf-field"><span>${label}</span>${tag}</label>`;
  }
  function readinessItem(title,detail,done,total) {
    const pct = total ? Math.round(done/total*100) : 0;
    return `<div class="pf-readiness-item"><div><strong>${title}</strong><span>${detail}</span></div><b>${pct}%</b></div>`;
  }

  function wire() {
    $('#pfWeekSelect')?.addEventListener('change', e => { state.selectedWeekId=e.target.value; save(); render(); });
    $$('[data-pf-day]').forEach(b => b.addEventListener('click', () => { state.selectedDay=b.dataset.pfDay; save(); render(); }));
    $$('[data-pf-subject]').forEach(b => b.addEventListener('click', () => { state.selectedSubject=b.dataset.pfSubject; save(); render(); }));
    $$('[data-week-field]').forEach(el => el.addEventListener('input', () => { currentWeek()[el.dataset.weekField]=el.value; save(); }));
    $$('[data-lesson-field]').forEach(el => el.addEventListener('input', () => {
      const lesson=currentLesson();
      lesson[el.dataset.lessonField] = el.dataset.lessonField === 'standards' ? el.value.split('\n').map(v=>v.trim()).filter(Boolean) : el.value;
      save();
    }));
    $('#pfToggleReady')?.addEventListener('click', () => { const l=currentLesson(); l.status=l.status==='ready'?'draft':'ready'; save(); render(); });
    $('#pfPrintWeek')?.addEventListener('click', () => window.print());
    $('#pfDuplicateWeek')?.addEventListener('click', duplicateWeek);
    $('#pfExportWeek')?.addEventListener('click', exportWeek);
  }

  function duplicateWeek() {
    const source=clone(currentWeek());
    const date=new Date(`${source.startDate}T12:00:00`); date.setDate(date.getDate()+7);
    const id=date.toISOString().slice(0,10);
    source.id=id; source.startDate=id;
    source.label=`Week of ${date.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}`;
    source.lessons.forEach(l=>{l.status='draft';l.reflection='';});
    state.weeks.push(source); state.selectedWeekId=id; save(); render();
  }

  function exportWeek() {
    const w=currentWeek();
    const lines=[w.label,`Theme: ${w.theme}`,`Anchor Text: ${w.anchorText}`,`Big Idea: ${w.bigIdea}`,`Essential Question: ${w.essentialQuestion}`,''];
    DAY_NAMES.forEach(day=>{
      lines.push(day.toUpperCase());
      w.lessons.filter(l=>l.day===day).forEach(l=>{
        lines.push(`\n${l.subject}: ${l.title}`);
        if(l.objective) lines.push(`Objective: ${l.objective}`);
        if(l.standards.length) lines.push(`Standards: ${l.standards.join(', ')}`);
        if(l.iDo) lines.push(`I Do: ${l.iDo}`);
        if(l.weDo) lines.push(`We Do: ${l.weDo}`);
        if(l.youDo) lines.push(`You Do: ${l.youDo}`);
        if(l.assessment) lines.push(`Assessment: ${l.assessment}`);
      });
      lines.push('');
    });
    const blob=new Blob([lines.join('\n')],{type:'text/plain'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${w.id}-planbook-export.txt`; a.click(); URL.revokeObjectURL(a.href);
  }

  function takeControl() {
    injectNavigation();
    if (route() === ROUTE) { setTimeout(render, 20); setTimeout(render, 220); }
  }
  window.THH_PLANNING_FRAMEWORK_V190 = { render, getState:()=>clone(state) };
  window.addEventListener('hashchange', takeControl);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', takeControl); else takeControl();
})();
