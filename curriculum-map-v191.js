(() => {
  'use strict';

  const ROUTE = 'curriculum-map';
  const STORE = 'thh:v19:planning-framework';
  const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const SUBJECTS = ['Reading','Phonics','Heggerty','Tier II','Writing','Math','Science','Social Studies'];
  const DEFAULT_COPIES = [
    'Weekly reading packet',
    'Spelling / vocabulary practice',
    'Math problem set or practice',
    'Science notebook page',
    'Social Studies activity',
    'Friday assessments'
  ];

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const route = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  const clone = value => JSON.parse(JSON.stringify(value));

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE) || 'null');
      return value && Array.isArray(value.weeks) ? value : null;
    } catch { return null; }
  }

  function save(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function selectedWeek(state) {
    return state?.weeks?.find(w => w.id === state.selectedWeekId) || state?.weeks?.[0] || null;
  }

  function injectNavigation() {
    const nav = $('#mainNav');
    if (!nav || nav.querySelector(`[data-route="${ROUTE}"]`)) return;
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.route = ROUTE;
    button.innerHTML = '<span class="nav-icon">🧭</span><span>Curriculum Map</span>';
    button.addEventListener('click', () => { location.hash = `#${ROUTE}`; });
    const planning = nav.querySelector('[data-route="planning-center"]');
    planning ? planning.insertAdjacentElement('afterend', button) : nav.appendChild(button);
  }

  function scheduleRows(day) {
    const master = window.THH_MASTER_SCHEDULE;
    const raw = day === 'Friday' ? master?.halfDaySchedule2026_2027 : master?.fullDaySchedule2026_2027;
    if (!Array.isArray(raw)) return [];
    return raw.map(([start,end,title,key]) => ({ start, end, title, key }));
  }

  function frameworkFor(week, day, subject) {
    const story = week.anchorText || week.openCourt?.story || 'Weekly anchor text';
    const base = {
      Reading: {
        title: `Open Court: ${story}`,
        objective: 'Students will read, discuss, and respond to the weekly text using grade-level comprehension strategies.',
        essentialQuestion: week.essentialQuestion || 'How does this text connect to our weekly big idea?',
        successCriteria: 'I can use details from the text to explain my thinking.',
        materials: 'Open Court Teacher Edition, student anthology, vocabulary resources, response materials',
        iDo: 'Model the daily comprehension skill and think aloud using the weekly text.',
        weDo: 'Read and discuss a selected section together; identify evidence that supports the daily focus.',
        youDo: 'Students complete an oral or written response using text evidence.',
        checksForUnderstanding: 'Turn-and-talk, response signals, targeted questioning, and quick written response.',
        assessment: day === 'Friday' ? 'Weekly Open Court comprehension and vocabulary assessments.' : 'Daily observation and student response.',
        differentiation: 'Use sentence frames, partner reading, audio support, chunked text, and extension questions as needed.'
      },
      Phonics: {
        title: week.phonics ? `Phonics: ${week.phonics}` : 'Core Phonics / UFLI',
        objective: 'Students will accurately read and spell words containing the weekly phonics pattern.',
        successCriteria: 'I can read and spell words with today’s sound-spelling pattern.',
        materials: 'Sound cards, word chains, whiteboards, decodable text',
        iDo: 'Explicitly model the sound-spelling pattern and word reading process.',
        weDo: 'Blend, segment, and build words together.',
        youDo: 'Students read and write words, then apply the skill in connected text.',
        checksForUnderstanding: 'Individual response, whiteboard checks, and word-reading accuracy.',
        assessment: day === 'Friday' ? 'Weekly phonics/spelling assessment.' : 'Quick decoding and encoding check.'
      },
      Heggerty: {
        title: 'Heggerty Phonemic Awareness',
        objective: 'Students will manipulate sounds orally through blending, segmenting, deleting, and substituting phonemes.',
        successCriteria: 'I can listen to and change sounds in words.',
        materials: 'Heggerty lesson script and hand motions',
        iDo: 'Model the first response and gesture for each new task.',
        weDo: 'Complete oral phonemic-awareness routines with teacher pacing.',
        youDo: 'Students respond independently and chorally.',
        checksForUnderstanding: 'Listen for accurate oral responses and note students needing reteach.'
      },
      'Tier II': {
        title: 'Tier II Reading Intervention',
        objective: 'Students will practice targeted decoding, accuracy, fluency, or comprehension skills in flexible groups.',
        successCriteria: 'I can use today’s strategy to read more accurately and smoothly.',
        materials: 'UFLI/Sound Partners lesson, decodable text, progress-monitoring materials',
        iDo: 'Model the target skill for the group.',
        weDo: 'Practice the skill with immediate corrective feedback.',
        youDo: 'Students apply the skill in words, sentences, and connected text.',
        checksForUnderstanding: 'Record accuracy, prompting level, and next-step notes.',
        differentiation: 'Red daily; Yellow 3–4 times weekly; Blue 2 times weekly; Green 1–2 times weekly.'
      },
      Writing: {
        title: week.writingGenre ? `Writing: ${week.writingGenre}` : 'Building the Foundation Writing',
        objective: 'Students will plan, draft, revise, or edit writing connected to the weekly focus.',
        successCriteria: 'I can use the writing strategy taught today in my own work.',
        materials: 'Mentor text, writing notebook, model, rubric or checklist',
        iDo: 'Model the writing strategy through a teacher think-aloud.',
        weDo: 'Create or revise a shared example together.',
        youDo: 'Students apply the strategy independently while the teacher confers.',
        checksForUnderstanding: 'Conference notes, student share, and checklist review.',
        assessment: day === 'Friday' ? 'Writing product or weekly grammar assessment.' : 'Daily writing sample and conference evidence.'
      },
      Math: {
        title: week.mathFocus ? `Eureka Math²: ${week.mathFocus}` : 'Eureka Math² Lesson',
        objective: 'Students will build conceptual understanding and solve grade-level problems using models and precise reasoning.',
        successCriteria: 'I can explain my strategy and show my thinking.',
        materials: 'Eureka Math² lesson materials, manipulatives, problem set, exit ticket',
        iDo: 'Launch the lesson and model the new concept or representation.',
        weDo: 'Solve examples together and compare strategies.',
        youDo: 'Students complete the problem set or independent practice.',
        checksForUnderstanding: 'Cold call, whiteboards, partner explanation, and exit ticket.',
        assessment: 'Exit ticket and observation of mathematical reasoning.',
        differentiation: 'Provide manipulatives, visual models, reduced problem sets, and extension tasks as needed.'
      },
      Science: {
        title: week.scienceConnection || 'Science Investigation',
        objective: 'Students will investigate a grade-level science concept and explain observations using evidence.',
        successCriteria: 'I can make an observation and explain what it shows.',
        materials: 'Science text, notebook page, investigation materials, vocabulary cards',
        iDo: 'Introduce the phenomenon, question, and safety expectations.',
        weDo: 'Observe, investigate, and record evidence together.',
        youDo: 'Students complete a notebook response or application task.',
        checksForUnderstanding: 'Notebook check, oral explanation, and vocabulary use.',
        assessment: day === 'Friday' ? 'Science vocabulary/content assessment.' : 'Notebook response or exit question.'
      },
      'Social Studies': {
        title: week.socialStudiesConnection || 'Social Studies Connection',
        objective: 'Students will connect the weekly text to civics, history, geography, or economics concepts.',
        successCriteria: 'I can explain how people, places, or communities connect to our weekly topic.',
        materials: 'Map, primary/secondary source, iCivics or 180 Days resource, notebook page',
        iDo: 'Model how to examine the source, map, or civic concept.',
        weDo: 'Discuss evidence and complete a shared organizer.',
        youDo: 'Students complete an individual response or application activity.',
        checksForUnderstanding: 'Discussion, map/source analysis, and written response.',
        assessment: day === 'Friday' ? 'Social Studies vocabulary/content assessment.' : 'Daily response or organizer.'
      }
    };
    return base[subject] || {};
  }

  function buildWeek() {
    const state = load();
    const week = selectedWeek(state);
    if (!week) return;
    week.copies = Array.isArray(week.copies) && week.copies.length ? week.copies : DEFAULT_COPIES.map((title,index) => ({ id:`copy-${index}`, title, done:false, quantity:34 }));
    week.lessons.forEach(lesson => {
      const template = frameworkFor(week, lesson.day, lesson.subject);
      Object.entries(template).forEach(([key,value]) => {
        if (key === 'standards') return;
        if (!lesson[key]) lesson[key] = value;
      });
      if (!lesson.essentialQuestion) lesson.essentialQuestion = week.essentialQuestion || '';
      if (!lesson.vocabulary && ['Reading','Science','Social Studies'].includes(lesson.subject)) lesson.vocabulary = week.vocabulary || '';
      if (!lesson.accommodations) lesson.accommodations = 'Provide visuals, repeated directions, chunked tasks, sentence frames, extended time, and small-group support according to student needs.';
    });
    save(state);
    render();
    $('#toast') && ($('#toast').textContent = 'Weekly framework added without replacing your existing lesson content.');
  }

  function subjectStats(week) {
    return SUBJECTS.map(subject => {
      const lessons = week.lessons.filter(l => l.subject === subject);
      const ready = lessons.filter(l => l.status === 'ready').length;
      const complete = lessons.filter(l => l.objective && l.iDo && l.weDo && l.youDo).length;
      return { subject, ready, complete, total: lessons.length };
    });
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $('#pageHost');
    if (!host) return;
    const state = load();
    const week = selectedWeek(state);
    if (!week) {
      host.innerHTML = '<section class="cm-shell"><div class="cm-empty"><h2>Open Planning Center first</h2><p>Create or select a week, then return to Curriculum Map.</p><button id="cmOpenPlanning">Open Planning Center</button></div></section>';
      $('#cmOpenPlanning')?.addEventListener('click',()=>location.hash='#planning-center');
      return;
    }
    const stats = subjectStats(week);
    const copies = Array.isArray(week.copies) ? week.copies : [];
    host.innerHTML = `
      <section class="cm-shell" aria-label="Curriculum Map">
        <header class="cm-hero">
          <div><p class="cm-eyebrow">Teacher Operating System · Version 19.1</p><h2>Weekly Curriculum Map</h2><p>Connect the instructional framework, school schedule, lesson sequence, and preparation list in one view.</p></div>
          <div class="cm-actions"><button id="cmBuildWeek" class="cm-primary">Build Week from Framework</button><button id="cmOpenPlanning" class="cm-secondary">Open Lesson Studio</button></div>
        </header>

        <article class="cm-card cm-week-summary">
          <div><span>Week</span><strong>${esc(week.label)}</strong></div>
          <div><span>Anchor Text</span><strong>${esc(week.anchorText || 'Not entered')}</strong></div>
          <div><span>Big Idea</span><strong>${esc(week.bigIdea || 'Not entered')}</strong></div>
          <div><span>Essential Question</span><strong>${esc(week.essentialQuestion || 'Not entered')}</strong></div>
        </article>

        <div class="cm-layout">
          <article class="cm-card">
            <div class="cm-card-head"><div><p class="cm-eyebrow">Pacing</p><h3>Schedule-Aligned Week</h3></div></div>
            <div class="cm-days">
              ${DAY_NAMES.map(day => `
                <section class="cm-day">
                  <h4>${day}${day==='Friday'?' · Assessment Day':''}</h4>
                  ${scheduleRows(day).filter(r => !['lunchRecess','lunch','transition','workout','recess','packup','dismissal','breakfast'].includes(r.key)).map(r => `<div class="cm-slot"><time>${esc(r.start)}–${esc(r.end)}</time><span>${esc(r.title)}</span></div>`).join('')}
                </section>`).join('')}
            </div>
          </article>

          <article class="cm-card">
            <div class="cm-card-head"><div><p class="cm-eyebrow">Coverage</p><h3>Subject Readiness</h3></div></div>
            <div class="cm-subject-stats">
              ${stats.map(s => `<div class="cm-stat"><div><strong>${esc(s.subject)}</strong><span>${s.complete}/${s.total} framework complete · ${s.ready}/${s.total} ready</span></div><div class="cm-mini"><i style="width:${Math.round(s.complete/s.total*100)}%"></i></div></div>`).join('')}
            </div>
          </article>
        </div>

        <div class="cm-layout cm-bottom">
          <article class="cm-card">
            <div class="cm-card-head"><div><p class="cm-eyebrow">Preparation</p><h3>Copy & Materials Queue</h3></div><button id="cmAddCopy" class="cm-text-button">+ Add item</button></div>
            <div id="cmCopyList" class="cm-copy-list">
              ${copies.length ? copies.map((item,index) => `<label class="cm-copy-item"><input type="checkbox" data-copy-check="${index}" ${item.done?'checked':''}><span><strong>${esc(item.title || item)}</strong><small>${item.quantity ? `${esc(item.quantity)} copies` : 'Preparation item'}</small></span><button type="button" data-copy-remove="${index}" aria-label="Remove item">×</button></label>`).join('') : '<p class="cm-muted">Use “Build Week from Framework” to create the starter copy queue.</p>'}
            </div>
          </article>

          <article class="cm-card">
            <div class="cm-card-head"><div><p class="cm-eyebrow">Connections</p><h3>Cross-Curricular Alignment</h3></div></div>
            <dl class="cm-connections">
              <div><dt>Reading</dt><dd>${esc(week.anchorText || 'Add anchor text')}</dd></div>
              <div><dt>Writing</dt><dd>${esc(week.writingGenre || 'Add writing focus')}</dd></div>
              <div><dt>Science</dt><dd>${esc(week.scienceConnection || 'Add science connection')}</dd></div>
              <div><dt>Social Studies</dt><dd>${esc(week.socialStudiesConnection || 'Add Social Studies connection')}</dd></div>
              <div><dt>Math</dt><dd>${esc(week.mathFocus || 'Add math focus')}</dd></div>
              <div><dt>Assessments</dt><dd>${esc(week.assessments || 'Add weekly assessments')}</dd></div>
            </dl>
          </article>
        </div>
      </section>`;
    wire();
  }

  function wire() {
    $('#cmBuildWeek')?.addEventListener('click', buildWeek);
    $('#cmOpenPlanning')?.addEventListener('click',()=>location.hash='#planning-center');
    $$('[data-copy-check]').forEach(input => input.addEventListener('change', () => {
      const state=load(), week=selectedWeek(state), index=Number(input.dataset.copyCheck);
      if (week && week.copies[index]) {
        if (typeof week.copies[index] === 'string') week.copies[index] = { title:week.copies[index], done:input.checked, quantity:34 };
        else week.copies[index].done=input.checked;
        save(state);
      }
    }));
    $$('[data-copy-remove]').forEach(button => button.addEventListener('click', e => {
      e.preventDefault();
      const state=load(), week=selectedWeek(state);
      week?.copies?.splice(Number(button.dataset.copyRemove),1);
      save(state); render();
    }));
    $('#cmAddCopy')?.addEventListener('click', () => {
      const title = prompt('What needs to be copied or prepared?');
      if (!title?.trim()) return;
      const state=load(), week=selectedWeek(state);
      week.copies = Array.isArray(week.copies) ? week.copies : [];
      week.copies.push({ id:`copy-${Date.now()}`, title:title.trim(), done:false, quantity:34 });
      save(state); render();
    });
  }

  function takeControl() {
    injectNavigation();
    if (route() === ROUTE) { setTimeout(render,20); setTimeout(render,220); }
  }

  window.THH_CURRICULUM_MAP_V191 = { render, buildWeek };
  window.addEventListener('hashchange', takeControl);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', takeControl);
  else takeControl();
})();
