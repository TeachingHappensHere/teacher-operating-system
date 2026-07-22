(function(){
  'use strict';

  const VERSION='23.1.0';
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
      'Allow alternative responses or dictated responses when reading demands would prevent demonstration of understanding.'
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
      'Adjust the number of concepts assessed and the mastery criteria in accordance with the IEP.'
    ]
  };

  function unique(items){return [...new Set(items.filter(Boolean))];}
  function supportsFor(subject){
    const key=String(subject||'').toLowerCase();
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
  function currentSubject(){return window.TOS_V210?.getModel?.().subject||'reading';}
  function applyToCurrentLesson(){
    const field=document.querySelector('[data-field="iep"]');
    if(!field)return false;
    const supportText=formatted(currentSubject());
    field.value=supportText;
    field.dispatchEvent(new Event('input',{bubbles:true}));
    field.dispatchEvent(new Event('change',{bubbles:true}));
    window.TOS_APP_BRIDGE?.toast?.('Micah G. accommodations applied to this lesson.');
    return true;
  }
  function enhancePlanner(){
    const field=document.querySelector('[data-field="iep"]');
    if(!field||document.querySelector('#tosApplyMicah'))return;
    const wrap=document.createElement('div');
    wrap.className='sa-actions';
    wrap.innerHTML='<button type="button" id="tosApplyMicah" class="sa-apply">Apply Micah G. IEP Supports</button><small>Uses only the active classroom accommodations profile.</small>';
    field.insertAdjacentElement('afterend',wrap);
    wrap.querySelector('#tosApplyMicah').addEventListener('click',applyToCurrentLesson);
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
    applyToCurrentLesson
  };
})();
