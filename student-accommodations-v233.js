(function(){
  'use strict';

  const VERSION='23.3.0';
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const PROFILE={
    id:'micah-g',
    displayName:'Micah G.',
    planType:'IEP',
    active:true,
    universal:[
      'Maintain a consistent daily routine and use preferential seating.',
      'Read directions aloud, repeat or clarify as needed, and check for understanding before independent work.',
      'Chunk assignments into smaller parts and present steps one at a time.',
      'Use clear visual supports, anchor charts, graphic organizers, sentence starters, and teacher modeling.',
      'Provide frequent check-ins, immediate feedback, positive reinforcement, and reminders to slow down and check work.',
      'Allow movement or sensory breaks and provide a quiet area for independent work when needed.',
      'Allow extended time and ample response time.'
    ],
    reading:[
      'Limit the amount of required reading when appropriate.',
      'Provide explicit phonics modeling, guided blending practice, visual cues, and repeated practice with CVC words.',
      'Allow alternative or dictated responses when reading demands would prevent demonstration of understanding.'
    ],
    writing:[
      'Reduce writing demands to short 3–5 word sentences when appropriate.',
      'Provide a sentence model, spacing tools, adapted or lined paper, and opportunities to dictate responses.',
      'Break writing into manageable steps and allow additional time.'
    ],
    math:[
      'Use manipulatives, number lines, number charts, whiteboards, and visual models.',
      'Break calculations into short steps and prompt Micah to complete every part and check his work.',
      'Use simplified or alternative assignments and assessments when required by the IEP.'
    ],
    assessment:[
      'Provide reduced, simplified, reformatted, or alternative assessments as needed.',
      'Allow extra testing time and individual administration when needed.',
      'Adjust the number of concepts assessed and mastery criteria in accordance with the IEP.'
    ]
  };

  function unique(items){return [...new Set(items.filter(Boolean))];}
  function subjectKey(subject){return String(subject||'reading').toLowerCase();}
  function supportsFor(subject){
    const key=subjectKey(subject);
    const items=[...PROFILE.universal];
    if(['reading','mowr','heggerty'].includes(key))items.push(...PROFILE.reading);
    if(key==='writing')items.push(...PROFILE.writing);
    if(key==='math')items.push(...PROFILE.math);
    items.push(...PROFILE.assessment);
    return unique(items);
  }
  function formatted(subject){
    return `${PROFILE.displayName} (${PROFILE.planType})\n${supportsFor(subject).map(item=>`• ${item}`).join('\n')}`;
  }
  function currentModel(){return window.TOS_V210?.getModel?.()||window.TOS_LESSON_STORE?.getModel?.()||{};}
  function currentSubject(){return currentModel().subject||'reading';}
  function fillField(field,text){
    if(!field)return false;
    field.value=text;
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function applyToCurrentLesson(){
    const applied=fillField(document.querySelector('[data-field="iep"]'),formatted(currentSubject()));
    if(applied)window.TOS_APP_BRIDGE?.toast?.('Micah G. IEP supports applied.');
    return applied;
  }
  function applyNo504(){
    const applied=fillField(document.querySelector('[data-field="s504"]'),'No active 504 accommodations are assigned to students in this class at this time.');
    if(applied)window.TOS_APP_BRIDGE?.toast?.('504 status added.');
    return applied;
  }
  function applyToSubjectWeek(){
    const store=window.TOS_LESSON_STORE;
    const model=currentModel();
    if(!store||!model.weekStart||!model.subject)return false;
    DAYS.forEach(day=>{
      const lesson=store.getLesson(model.weekStart,model.subject,day);
      lesson.iep=formatted(model.subject);
      if(!String(lesson.s504||'').trim())lesson.s504='No active 504 accommodations are assigned to students in this class at this time.';
      store.saveLesson(model.weekStart,model.subject,day,lesson);
    });
    window.TOS_V210_RENDER_SUBJECT_PLANNER?.();
    window.TOS_APP_BRIDGE?.toast?.('IEP supports applied to all five days.');
    return true;
  }
  function enhancePlanner(){
    const iep=document.querySelector('[data-field="iep"]');
    const s504=document.querySelector('[data-field="s504"]');
    if(iep&&!document.querySelector('#tosAccommodationActions')){
      const wrap=document.createElement('div');
      wrap.id='tosAccommodationActions';
      wrap.className='sa-actions';
      wrap.innerHTML=`<div class="sa-status"><strong>Active support profile:</strong> ${PROFILE.displayName} (${PROFILE.planType})</div>
        <div class="sa-buttons">
          <button type="button" id="tosApplyMicah" class="sa-apply">Apply to This Lesson</button>
          <button type="button" id="tosApplyMicahWeek" class="sa-apply secondary">Apply to All 5 Days</button>
        </div>`;
      iep.insertAdjacentElement('afterend',wrap);
      wrap.querySelector('#tosApplyMicah').addEventListener('click',applyToCurrentLesson);
      wrap.querySelector('#tosApplyMicahWeek').addEventListener('click',applyToSubjectWeek);
    }
    if(s504&&!document.querySelector('#tosNo504Action')){
      const wrap=document.createElement('div');
      wrap.id='tosNo504Action';
      wrap.className='sa-actions compact';
      wrap.innerHTML='<button type="button" class="sa-apply secondary">Add “No Active 504” Status</button>';
      s504.insertAdjacentElement('afterend',wrap);
      wrap.querySelector('button').addEventListener('click',applyNo504);
    }
  }

  const observer=new MutationObserver(enhancePlanner);
  function start(){enhancePlanner();observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  window.TOS_ACCOMMODATIONS={
    version:VERSION,
    listActive:()=>[structuredClone(PROFILE)],
    getProfile:id=>id===PROFILE.id?structuredClone(PROFILE):null,
    supportsFor,
    formatted,
    applyToCurrentLesson,
    applyToSubjectWeek,
    no504Text:'No active 504 accommodations are assigned to students in this class at this time.'
  };
})();
