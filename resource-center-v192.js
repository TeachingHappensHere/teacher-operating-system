(() => {
  'use strict';

  const ROUTE = 'resource-center';
  const STORE = 'thh:v19:planning-framework';
  const RESOURCE_TYPES = ['Slides','Video','Printable','Assessment','Teacher Guide','Student Page','Anchor Chart','Website','Other'];
  const SUBJECTS = ['Reading','Phonics','Heggerty','Tier II','Writing','Math','Science','Social Studies','Classroom'];

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const route = () => location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function load() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!state || !Array.isArray(state.weeks)) return null;
      state.resourceLibrary ||= [];
      return state;
    } catch { return null; }
  }

  function save(state) { localStorage.setItem(STORE, JSON.stringify(state)); }
  function selectedWeek(state) { return state?.weeks?.find(w => w.id === state.selectedWeekId) || state?.weeks?.[0] || null; }
  function lessonLabel(lesson) { return `${lesson.day} · ${lesson.subject}${lesson.title ? ` · ${lesson.title}` : ''}`; }
  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return ['http:','https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function injectNavigation() {
    const nav = $('#mainNav');
    if (!nav || nav.querySelector(`[data-route="${ROUTE}"]`)) return;
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.dataset.route = ROUTE;
    button.innerHTML = '<span class="nav-icon">📎</span><span>Resources</span>';
    button.addEventListener('click', () => { location.hash = `#${ROUTE}`; });
    const curriculum = nav.querySelector('[data-route="curriculum-map"]');
    curriculum ? curriculum.insertAdjacentElement('afterend', button) : nav.appendChild(button);
  }

  function ensureWeekData(week) {
    week.resources ||= [];
    week.attachmentChecklist ||= [];
    week.lessons.forEach(lesson => { lesson.resources ||= []; });
  }

  function allWeekResources(week, state) {
    const direct = week.resources || [];
    const lesson = (week.lessons || []).flatMap(l => (l.resources || []).map(r => ({...r, lessonId:l.id, lessonLabel:lessonLabel(l)})));
    const libraryIds = new Set([...direct, ...lesson].map(r => r.libraryId).filter(Boolean));
    const library = (state.resourceLibrary || []).filter(r => libraryIds.has(r.id)).map(r => ({...r, fromLibrary:true}));
    return [...direct, ...lesson, ...library].filter((item,index,array) => array.findIndex(other => (other.id || other.libraryId) === (item.id || item.libraryId)) === index);
  }

  function readiness(week) {
    const lessons = week.lessons || [];
    const planned = lessons.filter(l => l.objective || l.iDo || l.weDo || l.youDo);
    const attached = planned.filter(l => Array.isArray(l.resources) && l.resources.length);
    const checklist = week.attachmentChecklist || [];
    const complete = checklist.filter(i => i.done).length;
    const lessonPct = planned.length ? Math.round(attached.length / planned.length * 100) : 0;
    const checklistPct = checklist.length ? Math.round(complete / checklist.length * 100) : 100;
    return { lessonPct, checklistPct, attached:attached.length, planned:planned.length, complete, total:checklist.length, overall:Math.round((lessonPct + checklistPct)/2) };
  }

  function resourceCard(resource, context='week') {
    const href = safeUrl(resource.url);
    return `<article class="rc-resource" data-resource-id="${esc(resource.id || resource.libraryId || '')}">
      <div class="rc-resource-icon">${resource.type === 'Video' ? '▶' : resource.type === 'Slides' ? '▣' : resource.type === 'Printable' ? '🖨' : resource.type === 'Assessment' ? '✓' : '↗'}</div>
      <div class="rc-resource-body">
        <div class="rc-resource-head"><strong>${esc(resource.title || 'Untitled resource')}</strong><span>${esc(resource.type || 'Other')}</span></div>
        <p>${esc(resource.subject || 'General')}${resource.lessonLabel ? ` · ${esc(resource.lessonLabel)}` : ''}</p>
        ${resource.notes ? `<small>${esc(resource.notes)}</small>` : ''}
      </div>
      <div class="rc-resource-actions">
        ${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open</a>` : '<span class="rc-no-link">No link</span>'}
        <button type="button" data-resource-remove="${esc(resource.id || resource.libraryId || '')}" data-resource-context="${esc(context)}" aria-label="Remove resource">×</button>
      </div>
    </article>`;
  }

  function render() {
    if (route() !== ROUTE) return;
    const host = $('#pageHost');
    if (!host) return;
    const state = load();
    const week = selectedWeek(state);
    if (!state || !week) {
      host.innerHTML = '<section class="rc-shell"><div class="rc-empty"><h2>Create a planning week first</h2><p>The Resource & Attachment Center connects resources to the currently selected week.</p><button id="rcOpenPlanning">Open Planning Center</button></div></section>';
      $('#rcOpenPlanning')?.addEventListener('click',()=>location.hash='#planning-center');
      return;
    }
    ensureWeekData(week);
    save(state);
    const stats = readiness(week);
    const resources = allWeekResources(week,state);
    const library = state.resourceLibrary || [];

    host.innerHTML = `<section class="rc-shell" aria-label="Resource and Attachment Center">
      <header class="rc-hero">
        <div><p class="rc-eyebrow">Teacher Operating System · Version 19.2</p><h2>Resource & Attachment Center</h2><p>Attach slides, videos, printables, assessments, and teacher materials directly to the week and daily lessons.</p></div>
        <div class="rc-hero-actions"><button id="rcAddResource" class="rc-primary">+ Add Resource</button><button id="rcOpenPlanning" class="rc-secondary">Open Lesson Studio</button></div>
      </header>

      <article class="rc-summary">
        <div><span>Selected Week</span><strong>${esc(week.label || 'Current week')}</strong></div>
        <div><span>Anchor Text</span><strong>${esc(week.anchorText || 'Not entered')}</strong></div>
        <div><span>Lesson Attachments</span><strong>${stats.attached}/${stats.planned} planned lessons</strong></div>
        <div><span>Resource Readiness</span><strong>${stats.overall}%</strong></div>
      </article>

      <div class="rc-grid">
        <article class="rc-card rc-main">
          <div class="rc-card-head"><div><p class="rc-eyebrow">Weekly Resources</p><h3>Launch Everything From One Place</h3></div><div class="rc-filter"><input id="rcSearch" type="search" placeholder="Search resources..."><select id="rcSubjectFilter"><option value="">All subjects</option>${SUBJECTS.map(s=>`<option>${esc(s)}</option>`).join('')}</select></div></div>
          <div id="rcResourceList" class="rc-resource-list">${resources.length ? resources.map(r=>resourceCard(r, r.lessonId ? 'lesson' : 'week')).join('') : '<div class="rc-empty-inline"><strong>No resources attached yet.</strong><p>Add a resource and connect it to the full week or a specific daily lesson.</p></div>'}</div>
        </article>

        <aside class="rc-side">
          <article class="rc-card">
            <div class="rc-card-head"><div><p class="rc-eyebrow">Readiness</p><h3>Attachment Check</h3></div></div>
            <div class="rc-meter"><span style="width:${stats.lessonPct}%"></span></div><p class="rc-meter-label">${stats.lessonPct}% of planned lessons have a resource</p>
            <div class="rc-meter"><span style="width:${stats.checklistPct}%"></span></div><p class="rc-meter-label">${stats.complete}/${stats.total} preparation items complete</p>
          </article>

          <article class="rc-card">
            <div class="rc-card-head"><div><p class="rc-eyebrow">Preparation</p><h3>Attachment Checklist</h3></div><button id="rcAddChecklist" class="rc-text">+ Add</button></div>
            <div id="rcChecklist" class="rc-checklist">${week.attachmentChecklist.length ? week.attachmentChecklist.map((item,index)=>`<label><input type="checkbox" data-check-index="${index}" ${item.done?'checked':''}><span>${esc(item.title)}</span><button type="button" data-check-remove="${index}">×</button></label>`).join('') : '<p class="rc-muted">Add reminders such as “attach Friday assessment” or “link Chalkie slides.”</p>'}</div>
          </article>

          <article class="rc-card">
            <div class="rc-card-head"><div><p class="rc-eyebrow">Reusable</p><h3>Resource Library</h3></div></div>
            <p class="rc-muted">Save frequently used links once, then attach them to future weeks.</p>
            <div class="rc-library-count"><strong>${library.length}</strong><span>saved resources</span></div>
            <button id="rcViewLibrary" class="rc-secondary rc-full">View Library</button>
          </article>
        </aside>
      </div>

      <dialog id="rcResourceDialog" class="rc-dialog">
        <form method="dialog" id="rcResourceForm">
          <div class="rc-dialog-head"><div><p class="rc-eyebrow">New Attachment</p><h3>Add Resource</h3></div><button value="cancel" aria-label="Close">×</button></div>
          <label>Resource title<input name="title" required maxlength="100" placeholder="Open Court lesson slides"></label>
          <div class="rc-form-grid"><label>Type<select name="type">${RESOURCE_TYPES.map(t=>`<option>${esc(t)}</option>`).join('')}</select></label><label>Subject<select name="subject">${SUBJECTS.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label></div>
          <label>Web link<input name="url" inputmode="url" placeholder="https://..."></label>
          <label>Attach to<select name="target"><option value="week">Entire week</option>${week.lessons.map(l=>`<option value="lesson:${esc(l.id)}">${esc(lessonLabel(l))}</option>`).join('')}</select></label>
          <label>Notes<textarea name="notes" rows="3" placeholder="Teacher pages, printing notes, or setup reminders"></textarea></label>
          <label class="rc-inline-check"><input type="checkbox" name="saveLibrary" checked> Save in reusable Resource Library</label>
          <div class="rc-dialog-actions"><button value="cancel" class="rc-secondary">Cancel</button><button type="submit" value="default" class="rc-primary">Save Resource</button></div>
        </form>
      </dialog>

      <dialog id="rcLibraryDialog" class="rc-dialog rc-library-dialog">
        <form method="dialog"><div class="rc-dialog-head"><div><p class="rc-eyebrow">Reusable Resources</p><h3>Resource Library</h3></div><button value="cancel" aria-label="Close">×</button></div>
          <div class="rc-library-list">${library.length ? library.map(item=>`<article><div><strong>${esc(item.title)}</strong><p>${esc(item.type)} · ${esc(item.subject)}</p></div><div>${safeUrl(item.url)?`<a href="${esc(safeUrl(item.url))}" target="_blank" rel="noopener noreferrer">Open</a>`:''}<button type="button" data-library-attach="${esc(item.id)}">Attach to week</button></div></article>`).join('') : '<p class="rc-muted">Your reusable library is empty.</p>'}</div>
        </form>
      </dialog>
    </section>`;
    wire(state,week);
  }

  function wire(state,week) {
    $('#rcOpenPlanning')?.addEventListener('click',()=>location.hash='#planning-center');
    const resourceDialog = $('#rcResourceDialog');
    $('#rcAddResource')?.addEventListener('click',()=>resourceDialog?.showModal());
    $('#rcViewLibrary')?.addEventListener('click',()=>$('#rcLibraryDialog')?.showModal());

    $('#rcResourceForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const url = safeUrl(data.get('url'));
      const item = { id:uid('resource'), title:String(data.get('title')||'').trim(), type:String(data.get('type')||'Other'), subject:String(data.get('subject')||'Classroom'), url, notes:String(data.get('notes')||'').trim(), createdAt:new Date().toISOString() };
      if (!item.title) return;
      if (data.get('saveLibrary')) {
        const libraryItem = {...item,id:uid('library')};
        state.resourceLibrary.push(libraryItem);
        item.libraryId = libraryItem.id;
      }
      const target = String(data.get('target')||'week');
      if (target.startsWith('lesson:')) {
        const lesson = week.lessons.find(l=>l.id===target.slice(7));
        if (lesson) { lesson.resources ||= []; lesson.resources.push(item); }
      } else week.resources.push(item);
      save(state); resourceDialog.close(); render();
    });

    $('#rcAddChecklist')?.addEventListener('click',()=>{
      const title = prompt('Preparation reminder:');
      if (!title?.trim()) return;
      week.attachmentChecklist.push({id:uid('check'),title:title.trim(),done:false}); save(state); render();
    });
    $$('[data-check-index]').forEach(input=>input.addEventListener('change',()=>{ week.attachmentChecklist[Number(input.dataset.checkIndex)].done=input.checked; save(state); render(); }));
    $$('[data-check-remove]').forEach(button=>button.addEventListener('click',()=>{ week.attachmentChecklist.splice(Number(button.dataset.checkRemove),1); save(state); render(); }));

    $$('[data-resource-remove]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.resourceRemove;
      week.resources = (week.resources||[]).filter(r=>(r.id||r.libraryId)!==id);
      week.lessons.forEach(l=>{ l.resources=(l.resources||[]).filter(r=>(r.id||r.libraryId)!==id); });
      save(state); render();
    }));

    const applyFilters=()=>{
      const q=($('#rcSearch')?.value||'').toLowerCase(); const subject=$('#rcSubjectFilter')?.value||'';
      $$('.rc-resource').forEach(card=>{ const text=card.textContent.toLowerCase(); card.hidden=Boolean((q&&!text.includes(q))||(subject&&!text.includes(subject.toLowerCase()))); });
    };
    $('#rcSearch')?.addEventListener('input',applyFilters); $('#rcSubjectFilter')?.addEventListener('change',applyFilters);

    $$('[data-library-attach]').forEach(button=>button.addEventListener('click',()=>{
      const item=state.resourceLibrary.find(r=>r.id===button.dataset.libraryAttach); if(!item)return;
      if (!(week.resources||[]).some(r=>r.libraryId===item.id)) week.resources.push({id:uid('resource'),libraryId:item.id,title:item.title,type:item.type,subject:item.subject,url:item.url,notes:item.notes||''});
      save(state); $('#rcLibraryDialog')?.close(); render();
    }));
  }

  function takeControl() { injectNavigation(); if (route() === ROUTE) { setTimeout(render,20); setTimeout(render,220); } }
  window.addEventListener('hashchange',takeControl);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',takeControl); else takeControl();
  window.THH_RESOURCE_CENTER_V192 = { render };
})();
