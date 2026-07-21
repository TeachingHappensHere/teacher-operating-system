(function(){
  'use strict';
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const SUBJECTS={reading:['📚','Reading'],math:['🔢','Math'],writing:['✍️','Writing'],science:['🔬','Science'],'social-studies':['🌎','Social Studies'],mowr:['🧠','MOWR'],heggerty:['🔤','Heggerty'],'morning-meeting':['☀️','Morning Meeting']};
  let activeDay='Monday';
  let activeSubject='reading';
  let activeWeek='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const lines=v=>String(v||'').split(/\n|,/).map(x=>x.trim()).filter(Boolean);
  function getModel(){return window.TOS_V210?.getModel?.()||{lessons:{}}}
  function lesson(day=activeDay){const m=getModel();return m.lessons?.[`${activeWeek}|${activeSubject}|${day}`]||{}}
  function label(){return SUBJECTS[activeSubject]||['📘','Lesson']}
  function weekText(){const d=new Date(`${activeWeek}T12:00:00`);if(Number.isNaN(d.getTime()))return '';const e=new Date(d);e.setDate(e.getDate()+4);return `${d.toLocaleDateString(undefined,{month:'long',day:'numeric'})}–${e.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}`}
  function open(opts={}){activeSubject=opts.subject||getModel().subject||'reading';activeWeek=opts.weekStart||getModel().weekStart||'';activeDay=opts.day||'Monday';render();document.body.classList.add('cd-open')}
  function close(){document.querySelector('#tosClassroomDisplay')?.remove();document.body.classList.remove('cd-open')}
  function render(){
    document.querySelector('#tosClassroomDisplay')?.remove();
    const l=lesson();const [icon,name]=label();
    const overlay=document.createElement('section');overlay.id='tosClassroomDisplay';overlay.className='cd-overlay';overlay.innerHTML=`
      <header class="cd-toolbar">
        <div class="cd-brand"><span>${icon}</span><div><strong>${esc(name)} Diamond Board</strong><small>Week of ${esc(weekText())}</small></div></div>
        <div class="cd-toolbar-actions"><button id="cdPrint">🖨 Print</button><button id="cdFullscreen">⛶ Full Screen</button><button id="cdClose" class="cd-close">✕ Close</button></div>
      </header>
      <nav class="cd-days">${DAYS.map(d=>`<button data-cd-day="${d}" class="${d===activeDay?'active':''}">${d}</button>`).join('')}</nav>
      <main class="cd-stage">
        <section class="cd-hero">
          <div class="cd-kicker">TODAY'S LEARNING</div>
          <h1>${esc(l.lessonTitle||`${name} — ${activeDay}`)}</h1>
          <div class="cd-i-can"><span>I CAN…</span><strong>${esc(l.ican||'Add the required I Can statement in the lesson planner.')}</strong></div>
        </section>
        <section class="cd-grid">
          ${card('🎯 Objective',l.objective||'Add the learning objective.')}
          ${card('📖 Standard',`<strong>${esc(l.standardId||'Standard ID')}</strong><br>${esc(l.standardDesc||'Add the Arizona standard description.')}`,true)}
          ${vocabCard(l)}
          ${card('❓ Essential Question',l.essentialQuestion||lesson('Monday').essentialQuestion||'Add the weekly essential question.')}
          ${card('🧠 Today’s Task / Skill',l.skills||l.instruction||'Add today’s task or skill focus.')}
          ${card('✅ Evidence of Learning',l.evidence||'Add the exit ticket, observation, discussion, or student product.')}
        </section>
        <section class="cd-week-strip">${DAYS.map(d=>{const x=lesson(d);return `<article class="${d===activeDay?'active':''}"><strong>${d}</strong><span>${esc(x.lessonTitle||x.skills||'Lesson focus')}</span></article>`}).join('')}</section>
      </main>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#cdClose').onclick=close;
    overlay.querySelector('#cdPrint').onclick=()=>window.print();
    overlay.querySelector('#cdFullscreen').onclick=()=>overlay.requestFullscreen?.();
    overlay.querySelectorAll('[data-cd-day]').forEach(b=>b.onclick=()=>{activeDay=b.dataset.cdDay;render()});
    document.addEventListener('keydown',escapeOnce,{once:true});
  }
  function escapeOnce(e){if(e.key==='Escape'&&!document.fullscreenElement)close();else document.addEventListener('keydown',escapeOnce,{once:true})}
  function card(title,content,html=false){return `<article class="cd-card"><h2>${title}</h2><div>${html?content:esc(content)}</div></article>`}
  function vocabCard(l){const c=lines(l.contentVocabulary||lesson('Monday').contentVocabulary);const a=lines(l.academicVocabulary||lesson('Monday').academicVocabulary);return `<article class="cd-card cd-vocab"><h2>🔤 Vocabulary</h2><div class="cd-vocab-cols"><div><strong>Content</strong>${c.length?`<ul>${c.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Add content vocabulary.</p>'}</div><div><strong>Academic</strong>${a.length?`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Add academic vocabulary.</p>'}</div></div></article>`}
  window.TOS_V211_CLASSROOM_DISPLAY={open,close};
})();
