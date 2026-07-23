(function(){
  'use strict';
  const VERSION='24.1.0';
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const SUBJECTS=[['reading','Reading'],['math','Math'],['writing','Writing'],['science','Science'],['social-studies','Social Studies'],['mowr','MOWR'],['heggerty','Heggerty'],['morning-meeting','Morning Meeting']];
  const OPEN_COURT=[
    {id:'cowardly-lion',title:'The Cowardly Lion',standardId:'2.RL.1',standardDesc:'Ask and answer who, what, where, when, why, and how questions to demonstrate understanding of key details.',vocab:'character, setting, detail, question, answer, predict',skill:'ask and answer questions about key details'},
    {id:'mice-shoe',title:'The Mice Who Lived in a Shoe',standardId:'2.RL.1',standardDesc:'Ask and answer who, what, where, when, why, and how questions to demonstrate understanding of key details.',vocab:'character, setting, detail, question, answer, predict',skill:'ask and answer questions about story details'},
    {id:'ants-aphids',title:'Ants and Aphids Work Together',standardId:'2.RI.1',standardDesc:'Ask and answer who, what, where, when, why, and how questions to demonstrate understanding of key details in a text.',vocab:'cooperate, insect, protect, nectar, colony',skill:'identify key details in an informational text'},
    {id:'bat-birds-beasts',title:'The Bat, Birds, and Beasts',standardId:'2.RL.2',standardDesc:'Recount stories and determine their central message, lesson, or moral.',vocab:'fable, moral, conflict, choice, consequence',skill:'recount a fable and identify its moral'}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const mondayISO=()=>{const d=new Date(),diff=(d.getDay()+6)%7;d.setDate(d.getDate()-diff);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  const field=(id,label,type='input',placeholder='')=>`<label class="lb-field"><span>${label}</span>${type==='textarea'?`<textarea id="${id}" placeholder="${esc(placeholder)}"></textarea>`:`<input id="${id}" placeholder="${esc(placeholder)}">`}</label>`;
  function render(){
    const host=document.querySelector('#pageHost'); if(!host)return;
    host.innerHTML=`<section class="lb-shell">
      <header class="lb-hero"><div><p>VERSION ${VERSION} • AUTOMATED PLANNING</p><h2>Lesson Builder 2.1</h2><span>Select a lesson, generate the instructional plan, then send it directly to the weekly subject planner.</span></div><button id="lbOpenPlanner" class="lb-btn secondary">Open Weekly Planner</button></header>
      <section class="lb-grid">
        <article class="lb-panel">
          <h3>1. Choose the lesson</h3>
          <div class="lb-row"><label>Template<select id="lbTemplate"><option value="open-court">Open Court Reading</option><option value="custom">Custom Lesson</option></select></label><label>Open Court story<select id="lbStory">${OPEN_COURT.map(x=>`<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select></label></div>
          <div class="lb-row"><label>Week of<input id="lbWeek" type="date" value="${mondayISO()}"></label><label>Day<select id="lbDay">${DAYS.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Subject<select id="lbSubject">${SUBJECTS.map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select></label></div>
          ${field('lbTitle','Lesson title')}
          <button id="lbGenerate" class="lb-btn primary">Generate Lesson Plan</button>
        </article>
        <article class="lb-panel lb-preview">
          <div class="lb-panel-head"><h3>2. Review and adjust</h3><span id="lbStatus">Ready</span></div>
          ${field('lbStandardId','Arizona standard ID')}
          ${field('lbStandardDesc','Standard description','textarea')}
          ${field('lbObjective','Teacher objective','textarea')}
          ${field('lbICan','Student “I Can” statement','textarea')}
          ${field('lbEssential','Essential question','textarea')}
          ${field('lbVocabulary','Vocabulary')}
          ${field('lbInstruction','I Do • We Do • You Do • Closure','textarea')}
          ${field('lbSupports','Differentiation and accommodations','textarea')}
          ${field('lbMaterials','Materials and preparation','textarea')}
          ${field('lbEvidence','Assessment / exit ticket','textarea')}
          ${field('lbNotes','Teacher notes','textarea')}
          <div class="lb-actions"><button id="lbSave" class="lb-btn primary">Save to Weekly Planner</button><button id="lbCopy" class="lb-btn secondary">Copy Planbook Text</button></div>
        </article>
      </section>
    </section>`;
    wire(); fillPreset();
  }
  function value(id){return document.getElementById(id)?.value.trim()||''}
  function set(id,v){const el=document.getElementById(id);if(el)el.value=v||''}
  function preset(){return OPEN_COURT.find(x=>x.id===document.getElementById('lbStory').value)||OPEN_COURT[0]}
  function fillPreset(){const p=preset();set('lbTitle',p.title);generate(false)}
  function generate(show=true){
    const p=preset(), title=value('lbTitle')||p.title, skill=p.skill;
    set('lbStandardId',p.standardId);set('lbStandardDesc',p.standardDesc);
    set('lbObjective',`Students will ${skill} and explain their thinking using evidence from ${title}.`);
    set('lbICan',`I can ${skill} and use details from the text to explain my answer.`);
    set('lbEssential',`How do key details help us understand ${title}?`);set('lbVocabulary',p.vocab);
    set('lbInstruction',`I Do: Model how to ask a question before, during, and after reading. Think aloud while locating a key detail in the text.\n\nWe Do: Read a section together. Ask and answer who, what, where, when, why, and how questions. Record answers with text evidence.\n\nYou Do: Students independently answer questions about the text and underline or cite the detail that supports each answer.\n\nClosure: Students share one question, answer, and supporting detail with a partner.`);
    set('lbSupports',`ELL: Preview vocabulary with visuals and provide sentence frames.\nIEP — Micah G.: Preferential seating, chunk directions, read directions aloud, provide movement breaks, graphic organizers, manipulatives, reduced writing, extended time, modified assessment as needed, and teacher check-ins.\n504: No active classroom profile currently loaded.`);
    set('lbMaterials',`Open Court text: ${title}; vocabulary cards; question-word anchor chart; student response page; pencils; highlighters; graphic organizer.`);
    set('lbEvidence',`Exit ticket: Write one question about the text, answer it, and include one supporting detail. Teacher checks responses for accuracy and use of evidence.`);
    set('lbNotes','Use I Do, We Do, You Do. Pause for checks for understanding before independent practice.');
    document.getElementById('lbStatus').textContent=show?'Generated':'Ready';
    if(show)window.TOS_APP_BRIDGE?.toast?.('Lesson plan generated.');
  }
  function lessonData(){return {lessonTitle:value('lbTitle'),standardId:value('lbStandardId'),standardDesc:value('lbStandardDesc'),objective:value('lbObjective'),ican:value('lbICan'),essentialQuestion:value('lbEssential'),contentVocabulary:value('lbVocabulary'),academicVocabulary:'question, answer, evidence, detail',instruction:value('lbInstruction'),ell:'Preview vocabulary with visuals and sentence frames.',iep:'Micah G.: preferential seating; chunk directions; read directions aloud; movement breaks; graphic organizers; manipulatives; reduced writing; extended time; modified assessment as needed; teacher check-ins.',s504:'No active classroom profile currently loaded.',materials:value('lbMaterials'),strategies:'Explicit modeling; think aloud; guided practice; turn-and-talk; independent practice; formative checks for understanding.',evidence:value('lbEvidence'),homework:'Review weekly vocabulary and read for 20–30 minutes.',notes:value('lbNotes'),skills:preset().skill,weeklyTask:`Read ${value('lbTitle')} and demonstrate understanding through questions, answers, and text evidence.`}}
  function save(){
    const store=window.TOS_LESSON_STORE;if(!store?.saveLesson){window.TOS_APP_BRIDGE?.toast?.('Weekly lesson store is unavailable.');return}
    store.saveLesson(value('lbWeek'),document.getElementById('lbSubject').value,document.getElementById('lbDay').value,lessonData());
    document.getElementById('lbStatus').textContent='Saved';window.TOS_APP_BRIDGE?.toast?.('Saved to the weekly subject planner.');
  }
  function planbookText(){const l=lessonData();return `${value('lbTitle')}\n\nSTANDARD\n${l.standardId} — ${l.standardDesc}\n\nOBJECTIVE\n${l.objective}\n\nI CAN\n${l.ican}\n\nVOCABULARY\n${l.contentVocabulary}\n\nINSTRUCTION\n${l.instruction}\n\nDIFFERENTIATION / ACCOMMODATIONS\nELL: ${l.ell}\nIEP: ${l.iep}\n504: ${l.s504}\n\nMATERIALS\n${l.materials}\n\nASSESSMENT\n${l.evidence}\n\nNOTES\n${l.notes}`}
  function wire(){
    document.getElementById('lbStory').onchange=fillPreset;document.getElementById('lbGenerate').onclick=()=>generate(true);document.getElementById('lbSave').onclick=save;
    document.getElementById('lbOpenPlanner').onclick=()=>window.TOS_APP_BRIDGE?.navigate?.('lesson-plans');
    document.getElementById('lbCopy').onclick=async()=>{try{await navigator.clipboard.writeText(planbookText());window.TOS_APP_BRIDGE?.toast?.('Planbook text copied.')}catch{window.TOS_APP_BRIDGE?.toast?.('Copy was blocked by the browser.')}};
  }
  window.TOS_V241_RENDER_LESSON_BUILDER=render;
  window.TOS_V241={version:VERSION,render};
})();
