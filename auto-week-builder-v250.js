(function(){
  'use strict';
  const VERSION='25.0.0';
  const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const STORIES={
    cowardlyLion:{
      title:'The Cowardly Lion',
      standardId:'2.RL.1',
      standardDesc:'Ask and answer who, what, where, when, why, and how questions to demonstrate understanding of key details.',
      vocabulary:['character','setting','detail','question','answer','predict'],
      essentialQuestion:'How do questions help us understand important details in a story?',
      daily:[
        ['Preview and Predict','Students will use the title, illustrations, and story clues to make and explain a prediction.','I can make a prediction and explain which story clues helped me.','Preview the title and illustrations. Model a prediction using a think-aloud. Students turn and talk using “I predict ___ because ___.” Read the opening and revisit predictions.','Listen for evidence-based predictions and collect one oral response from each partnership.'],
        ['Characters and Setting','Students will ask and answer who and where questions to identify the characters and setting.','I can ask and answer questions about the characters and setting.','Model who and where questions. Create a class chart for characters and setting. Reread selected pages, then guide partners to ask and answer one question each.','Students complete a quick character-and-setting response.'],
        ['Key Details','Students will ask and answer what and when questions to identify key details in sequence.','I can use what and when questions to find key details.','Model how to stop after a section and ask what happened and when. Sequence three events together. Students identify a key detail and explain where it appears in the text.','Students place three events in order and explain one detail.'],
        ['Why and How','Students will ask and answer why and how questions to explain character actions and events.','I can answer why and how questions using details from the story.','Model a why question about a character action and answer with text evidence. Guide students through a how question. Partners respond using “I know because the story says/shows ___.”','Students answer one why or how question with a supporting detail.'],
        ['Review and Respond','Students will use all six question words to demonstrate understanding of key story details.','I can ask and answer questions to show that I understand the story.','Review who, what, where, when, why, and how. Students generate questions in teams, trade questions, and answer with story details. Complete the weekly comprehension check.','Weekly comprehension response and teacher observation checklist.']
      ]
    }
  };
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const mondayISO=()=>{const d=new Date();const diff=(d.getDay()+6)%7;d.setDate(d.getDate()-diff);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  function buildLesson(story,index){
    const [focus,objective,ican,instruction,evidence]=story.daily[index];
    return {
      lessonTitle:`${story.title} — ${focus}`,
      objective,ican,standardId:story.standardId,standardDesc:story.standardDesc,
      instruction:`I Do: ${instruction.split('. ')[0]}.\n\nWe Do: ${instruction.split('. ').slice(1,3).join('. ')}.\n\nYou Do: ${instruction.split('. ').slice(3).join('. ') || 'Students complete the day’s response independently.'}\n\nClosure: Revisit the essential question and share one key detail.`,
      ell:'Preteach vocabulary with visuals and gestures; provide sentence frames; allow partner rehearsal before whole-group responses.',
      iep:'Preferential seating; chunk directions and assignments; read directions aloud; provide movement breaks, graphic organizers, manipulatives, reduced writing, extended time, modified assessment as needed, and teacher check-ins. (Micah G.)',
      s504:'No active 504 accommodation profile is currently assigned. Continue universal classroom supports and add individual accommodations when documented.',
      materials:'Open Court student text, teacher edition/slides, vocabulary cards, question-word chart, response page, pencils, highlighters.',
      strategies:'I Do, We Do, You Do; think-aloud; turn-and-talk; guided practice; text-dependent questioning; formative checks for understanding.',
      evidence,homework:'Read for 20–30 minutes and practice the weekly vocabulary.',notes:'',
      contentVocabulary:story.vocabulary.join('\n'),academicVocabulary:'ask\nanswer\nevidence\ndetail\npredict',
      essentialQuestion:story.essentialQuestion,
      weeklyTask:'Ask and answer who, what, where, when, why, and how questions about The Cowardly Lion.',
      skills:'Questioning, identifying key details, prediction, character, setting, sequencing.'
    };
  }
  function render(){
    const host=document.querySelector('#pageHost');if(!host)return;
    host.innerHTML=`<section class="awb-shell">
      <header class="awb-hero"><div><p>VERSION 25 • CURRICULUM INTELLIGENCE</p><h2>Auto Week Builder</h2><span>Choose the story once, review the plan, and save five Reading lessons to the Subject Planner.</span></div><div class="awb-badge">5-Day Builder</div></header>
      <section class="awb-controls">
        <label>Open Court Story<select id="awbStory"><option value="cowardlyLion">The Cowardly Lion</option></select></label>
        <label>Week of Monday<input id="awbWeek" type="date" value="${mondayISO()}"></label>
        <button class="awb-primary" id="awbPreview">Build Preview</button>
      </section>
      <div id="awbMessage" class="awb-message">Nothing has been saved yet. Review the five-day preview before saving.</div>
      <section id="awbPreviewHost" class="awb-days"></section>
      <footer class="awb-footer"><button id="awbSave" class="awb-primary" disabled>Save All 5 Days to Reading Planner</button><button id="awbOpenPlanner">Open Subject Planner</button></footer>
    </section>`;
    document.querySelector('#awbPreview').addEventListener('click',preview);
    document.querySelector('#awbSave').addEventListener('click',saveWeek);
    document.querySelector('#awbOpenPlanner').addEventListener('click',()=>{location.hash='lesson-plans'});
    preview();
  }
  function preview(){
    const story=STORIES[document.querySelector('#awbStory').value];
    const html=DAYS.map((day,i)=>{const l=buildLesson(story,i);return `<article class="awb-day"><div class="awb-day-head"><strong>${day}</strong><span>${esc(l.lessonTitle)}</span></div><dl><dt>Objective</dt><dd>${esc(l.objective)}</dd><dt>I Can</dt><dd>${esc(l.ican)}</dd><dt>Assessment</dt><dd>${esc(l.evidence)}</dd></dl><details><summary>View instructional sequence</summary><pre>${esc(l.instruction)}</pre></details></article>`}).join('');
    document.querySelector('#awbPreviewHost').innerHTML=html;
    document.querySelector('#awbSave').disabled=false;
    document.querySelector('#awbMessage').textContent='Preview ready. Saving will replace Reading lessons for this selected week.';
  }
  function saveWeek(){
    const store=window.TOS_LESSON_STORE;
    if(!store){alert('The Subject Planner lesson store is not available. Refresh the app and try again.');return}
    const week=document.querySelector('#awbWeek').value;
    if(!week){alert('Choose the Monday for this instructional week.');return}
    const story=STORIES[document.querySelector('#awbStory').value];
    if(!confirm(`Save ${story.title} Reading lessons for the week of ${week}? Existing Reading lessons for these five days will be replaced.`))return;
    DAYS.forEach((day,i)=>store.saveLesson(week,'reading',day,buildLesson(story,i)));
    document.querySelector('#awbMessage').innerHTML=`✓ Saved five Reading lessons for the week of <strong>${esc(week)}</strong>. Open the Subject Planner to review or export them.`;
    window.TOS_APP_BRIDGE?.toast?.('Five Reading lessons saved to the Subject Planner.');
  }
  window.TOS_V250_RENDER_AUTO_WEEK_BUILDER=render;
  window.TOS_V250={version:VERSION,stories:Object.keys(STORIES)};
})();
