(function(){
  'use strict';

  const VERSION='23.3.0';
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const SUBJECTS={
    reading:'Reading',math:'Math',writing:'Writing',science:'Science',
    'social-studies':'Social Studies',mowr:'MOWR',heggerty:'Heggerty',
    'morning-meeting':'Morning Meeting'
  };

  function esc(value=''){
    return String(value).replace(/[&<>"']/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[ch]));
  }

  function csvCell(value=''){
    const text=String(value??'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    return `"${text.replace(/"/g,'""')}"`;
  }

  function dateForDay(weekStart,day){
    const offset=Math.max(0,DAYS.indexOf(day));
    const date=new Date(`${weekStart}T12:00:00`);
    date.setDate(date.getDate()+offset);
    return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
  }

  function complete(l={}){
    return Boolean(l.objective&&l.ican&&l.standardId&&l.standardDesc&&l.instruction&&l.ell&&l.iep&&l.s504&&l.materials&&l.strategies&&l.evidence);
  }

  function headers(){
    return [
      'Date','Day','Subject','Lesson Title','Standard ID','Standard Description',
      'Objective','I Can Statement','Lesson / Instruction','ELL Supports',
      'IEP Supports','504 Accommodations','Materials / Resources / Technology',
      'Instructional Strategies','Assessment / Evidence of Learning','Homework',
      'Notes / Reflection'
    ];
  }

  function resolvedIEP(subject,lesson={}){
    return String(lesson.iep||'').trim()||window.TOS_ACCOMMODATIONS?.formatted?.(subject)||'';
  }

  function resolved504(lesson={}){
    return String(lesson.s504||'').trim()||window.TOS_ACCOMMODATIONS?.no504Text||'';
  }

  function lessonRow(weekStart,subject,day,lesson={}){
    return [
      dateForDay(weekStart,day),day,SUBJECTS[subject]||subject,lesson.lessonTitle||'',
      lesson.standardId||'',lesson.standardDesc||'',lesson.objective||'',lesson.ican||'',
      lesson.instruction||'',lesson.ell||'',resolvedIEP(subject,lesson),resolved504(lesson),lesson.materials||'',
      lesson.strategies||'',lesson.evidence||'',lesson.homework||'',lesson.notes||''
    ];
  }

  function rowsForCurrentSubject(){
    const store=window.TOS_LESSON_STORE;
    const model=window.TOS_V210?.getModel?.()||store?.getModel?.();
    if(!store||!model)throw new Error('Lesson store is not available.');
    return DAYS.map(day=>({
      weekStart:model.weekStart,
      subject:model.subject,
      day,
      lesson:store.getLesson(model.weekStart,model.subject,day)
    }));
  }

  function rowsForWholeWeek(){
    const store=window.TOS_LESSON_STORE;
    const model=window.TOS_V210?.getModel?.()||store?.getModel?.();
    if(!store||!model)throw new Error('Lesson store is not available.');
    const rows=[];
    Object.keys(SUBJECTS).forEach(subject=>DAYS.forEach(day=>{
      const lesson=store.getLesson(model.weekStart,subject,day);
      const hasContent=Object.values(lesson||{}).some(value=>typeof value==='string'&&value.trim());
      if(hasContent)rows.push({weekStart:model.weekStart,subject,day,lesson});
    }));
    return rows;
  }

  function toCSV(records){
    const lines=[headers().map(csvCell).join(',')];
    records.forEach(r=>lines.push(lessonRow(r.weekStart,r.subject,r.day,r.lesson).map(csvCell).join(',')));
    return '\ufeff'+lines.join('\r\n');
  }

  function download(records,filename){
    const csv=toCSV(records);
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),750);
  }

  function statusSummary(records){
    const completeCount=records.filter(r=>complete(r.lesson)).length;
    return {completeCount,incompleteCount:records.length-completeCount,total:records.length};
  }

  function previewRows(records){
    if(!records.length)return '<tr><td colspan="5" class="pb-empty">No saved lessons were found for this week.</td></tr>';
    return records.map(r=>`<tr>
      <td>${esc(dateForDay(r.weekStart,r.day))}</td>
      <td>${esc(r.day)}</td>
      <td>${esc(SUBJECTS[r.subject]||r.subject)}</td>
      <td>${esc(r.lesson.lessonTitle||'Untitled lesson')}</td>
      <td><span class="pb-badge ${complete(r.lesson)?'ok':'warn'}">${complete(r.lesson)?'Complete':'Needs review'}</span></td>
    </tr>`).join('');
  }

  function open(){
    let current=[];let whole=[];
    try{current=rowsForCurrentSubject();whole=rowsForWholeWeek();}
    catch(error){window.TOS_APP_BRIDGE?.toast?.(error.message);return;}
    document.querySelector('#tosPlanbookModal')?.remove();
    const model=window.TOS_V210?.getModel?.()||{};
    const summary=statusSummary(current);
    const overlay=document.createElement('div');
    overlay.id='tosPlanbookModal';overlay.className='pb-overlay';
    overlay.innerHTML=`<section class="pb-modal" role="dialog" aria-modal="true" aria-labelledby="pbTitle">
      <header class="pb-head"><div><p>VERSION ${VERSION}</p><h2 id="pbTitle">Planbook CSV Export</h2><span>Week of ${esc(model.weekStart||'')}</span></div><button type="button" class="pb-close" aria-label="Close">×</button></header>
      <div class="pb-summary"><div><strong>${summary.total}</strong><span>days</span></div><div><strong>${summary.completeCount}</strong><span>complete</span></div><div><strong>${summary.incompleteCount}</strong><span>need review</span></div></div>
      <div class="pb-note"><strong>Before importing:</strong> Review Planbook's column-mapping screen. This CSV preserves every lesson field in a separate column so you can map the data without retyping it.</div>
      <div class="pb-table-wrap"><table><thead><tr><th>Date</th><th>Day</th><th>Subject</th><th>Lesson</th><th>Status</th></tr></thead><tbody>${previewRows(current)}</tbody></table></div>
      <footer class="pb-actions"><button type="button" class="pb-btn" data-action="cancel">Cancel</button><button type="button" class="pb-btn" data-action="week" ${whole.length?'':'disabled'}>Download Whole Week (${whole.length})</button><button type="button" class="pb-btn primary" data-action="subject">Download ${esc(SUBJECTS[model.subject]||model.subject||'Subject')} CSV</button></footer>
    </section>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    overlay.querySelector('.pb-close').onclick=close;
    overlay.querySelector('[data-action="cancel"]').onclick=close;
    overlay.querySelector('[data-action="subject"]').onclick=()=>{
      download(current,`${model.subject||'subject'}-${model.weekStart||'week'}-planbook.csv`);
      window.TOS_APP_BRIDGE?.toast?.('Planbook CSV downloaded.');close();
    };
    overlay.querySelector('[data-action="week"]').onclick=()=>{
      if(!whole.length)return;
      download(whole,`all-subjects-${model.weekStart||'week'}-planbook.csv`);
      window.TOS_APP_BRIDGE?.toast?.('Whole-week Planbook CSV downloaded.');close();
    };
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    overlay.tabIndex=-1;overlay.focus();
  }

  window.TOS_PLANBOOK_EXPORT={version:VERSION,open,toCSV,rowsForCurrentSubject,rowsForWholeWeek};
})();
