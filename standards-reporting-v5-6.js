
(function(){
  "use strict";

  const STORAGE_KEY="thh-v56:standards-reporting";
  let data, state, overlay, activeStandardId;

  const esc=value=>String(value??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-v5-6.css";
    document.head.appendChild(css);

    try{
      data=await (await fetch("standards-reporting-v5-6.json",{cache:"no-store"})).json();
      loadState();
      build();
      addButton();
    }catch(error){
      console.warn("Version 5.6 could not load.",error);
    }
  }

  function loadState(){
    try{
      state=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
    }catch{
      state=null;
    }

    if(!state){
      state={
        standards:JSON.parse(JSON.stringify(data.defaultStandards)),
        reportingPeriod:"Quarter 1",
        studentName:"",
        reportNotes:"",
        snapshots:[]
      };
      saveState();
    }
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
    updateStats();
  }

  function build(){
    overlay=document.createElement("div");
    overlay.className="v56-overlay";
    overlay.innerHTML=`
      <section class="v56-dialog">
        <header>
          <div>
            <p>VERSION 5.6</p>
            <h2>Standards, Evidence & Progress Reporting</h2>
            <span>${esc(data.releaseStatus)}</span>
          </div>
          <button id="v56Close">×</button>
        </header>

        <div id="v56Stats" class="v56-stats"></div>

        <div class="v56-toolbar">
          <select id="v56Period">
            ${["Quarter 1","Quarter 2","Quarter 3","Quarter 4","Semester 1","Semester 2","Year-End"].map(period=>
              `<option ${period===state.reportingPeriod?"selected":""}>${period}</option>`).join("")}
          </select>
          <input id="v56Search" placeholder="Search standards, subjects, lessons, or evidence...">
          <button id="v56AddStandard">Add Standard</button>
          <button id="v56Snapshot">Save Snapshot</button>
          <button id="v56Export">Export Summary</button>
        </div>

        <div class="v56-layout">
          <aside id="v56StandardList"></aside>
          <main id="v56Detail"></main>
        </div>

        <footer>
          <span id="v56Status">Ready</span>
          <span>TeachingHappensHere v5.6</span>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    document.getElementById("v56Close").onclick=close;
    document.getElementById("v56Period").onchange=event=>{
      state.reportingPeriod=event.target.value;
      saveState();
      setStatus("Reporting period updated.");
    };
    document.getElementById("v56Search").oninput=renderStandardList;
    document.getElementById("v56AddStandard").onclick=addStandard;
    document.getElementById("v56Snapshot").onclick=saveSnapshot;
    document.getElementById("v56Export").onclick=exportSummary;
    overlay.onclick=event=>{if(event.target===overlay)close()};

    updateStats();
    renderStandardList();
    if(state.standards[0])renderStandard(state.standards[0].id);
  }

  function updateStats(){
    const stats=document.getElementById("v56Stats");
    if(!stats)return;

    const counts={};
    data.progressLevels.forEach(level=>counts[level]=0);
    state.standards.forEach(standard=>counts[standard.status]=(counts[standard.status]||0)+1);

    const evidenceCount=state.standards.reduce((sum,standard)=>sum+(standard.evidence||[]).length,0);
    const missingEvidence=state.standards.filter(standard=>!(standard.evidence||[]).length).length;

    stats.innerHTML=`
      <article><strong>${state.standards.length}</strong><span>Standards</span></article>
      <article><strong>${evidenceCount}</strong><span>Evidence Records</span></article>
      <article><strong>${counts["Secure"]||0}</strong><span>Secure</span></article>
      <article><strong>${counts["Developing"]||0}</strong><span>Developing</span></article>
      <article><strong>${counts["Beginning"]||0}</strong><span>Beginning</span></article>
      <article class="${missingEvidence?"warning":""}"><strong>${missingEvidence}</strong><span>Missing Evidence</span></article>`;
  }

  function renderStandardList(){
    const query=(document.getElementById("v56Search")?.value||"").toLowerCase().trim();
    const filtered=state.standards.filter(standard=>
      !query||JSON.stringify(standard).toLowerCase().includes(query)
    );

    document.getElementById("v56StandardList").innerHTML=filtered.map(standard=>`
      <button data-v56-standard="${standard.id}" class="${standard.id===activeStandardId?"active":""}">
        <span class="v56-level level-${slug(standard.status)}"></span>
        <div>
          <strong>${esc(standard.title)}</strong>
          <small>${esc(standard.subject)} • ${esc(standard.status)}</small>
          <code>${esc(standard.code)}</code>
        </div>
      </button>`).join("") || `<p class="v56-empty">No matching standards.</p>`;

    document.querySelectorAll("[data-v56-standard]").forEach(button=>{
      button.onclick=()=>renderStandard(button.dataset.v56Standard);
    });
  }

  function progressOptions(selected){
    return data.progressLevels.map(level=>
      `<option ${level===selected?"selected":""}>${esc(level)}</option>`
    ).join("");
  }

  function renderStandard(id){
    activeStandardId=id;
    const standard=state.standards.find(item=>item.id===id);
    if(!standard)return;

    renderStandardList();

    document.getElementById("v56Detail").innerHTML=`
      <div class="v56-heading">
        <div>
          <p>${esc(standard.subject.toUpperCase())}</p>
          <h2>${esc(standard.title)}</h2>
          <code>${esc(standard.code)}</code>
        </div>
        <button id="v56DeleteStandard">Delete</button>
      </div>

      <section class="v56-section">
        <h3>Standard Information</h3>
        <div class="v56-form-grid">
          <label>
            <span>Subject</span>
            <select id="v56Subject">
              ${data.subjectAreas.map(subject=>
                `<option ${subject===standard.subject?"selected":""}>${esc(subject)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Standard Code</span>
            <input id="v56Code" value="${esc(standard.code)}">
          </label>
          <label>
            <span>Progress Level</span>
            <select id="v56Progress">${progressOptions(standard.status)}</select>
          </label>
          <label class="wide">
            <span>Standard Title</span>
            <input id="v56Title" value="${esc(standard.title)}">
          </label>
          <label class="wide">
            <span>Description</span>
            <textarea id="v56Description">${esc(standard.description)}</textarea>
          </label>
        </div>
      </section>

      <div class="v56-two">
        <section class="v56-section">
          <div class="v56-section-title">
            <div>
              <h3>Connected Lessons</h3>
              <p>Lessons or units where this standard was taught.</p>
            </div>
            <button id="v56AddLesson">Add Lesson</button>
          </div>
          <div class="v56-chip-list">
            ${(standard.lessons||[]).map((lesson,index)=>`
              <span>${esc(lesson)}<button data-remove-lesson="${index}">×</button></span>
            `).join("") || "<p>No connected lessons yet.</p>"}
          </div>
        </section>

        <section class="v56-section">
          <h3>Coverage Alert</h3>
          <div class="v56-coverage-alert ${(standard.evidence||[]).length?"ready":"missing"}">
            <strong>${(standard.evidence||[]).length?"Evidence Available":"Evidence Needed"}</strong>
            <p>${(standard.evidence||[]).length
              ? `${standard.evidence.length} evidence record(s) support this standard.`
              : "Add student work, observation, an assessment, or another evidence source."}</p>
          </div>
        </section>
      </div>

      <section class="v56-section">
        <div class="v56-section-title">
          <div>
            <h3>Instructional Evidence</h3>
            <p>Record what demonstrates student understanding.</p>
          </div>
          <button id="v56AddEvidence">Add Evidence</button>
        </div>

        <div class="v56-evidence-list">
          ${(standard.evidence||[]).map((evidence,index)=>`
            <article>
              <div>
                <strong>${esc(evidence.date)} • ${esc(evidence.type)}</strong>
                <span>${esc(evidence.lesson||"No lesson entered")}</span>
              </div>
              <p>${esc(evidence.note)}</p>
              <button data-remove-evidence="${index}">Delete</button>
            </article>
          `).join("") || "<p>No evidence records yet.</p>"}
        </div>
      </section>

      <section class="v56-section">
        <h3>Student Progress Comment</h3>
        <div class="v56-comment-controls">
          <input id="v56StudentName" placeholder="Student name" value="${esc(state.studentName||"")}">
          <select id="v56CommentLevel">
            ${["Beginning","Developing","Approaching","Secure","Extending"].map(level=>
              `<option ${level===standard.status?"selected":""}>${level}</option>`).join("")}
          </select>
          <button id="v56GenerateComment">Generate Comment</button>
        </div>
        <textarea id="v56GeneratedComment" class="v56-comment"></textarea>
        <div class="v56-actions">
          <button id="v56CopyComment">Copy Comment</button>
          <button id="v56SendConference">Send to Student Support</button>
          <button onclick="window.print()">Print Standard Report</button>
        </div>
      </section>

      <section class="v56-section">
        <h3>Teacher Reporting Notes</h3>
        <textarea id="v56ReportNotes" class="v56-report-notes" placeholder="Class patterns, reteach needs, quarterly notes, or administrative evidence...">${esc(standard.reportNotes||"")}</textarea>
      </section>

      <section class="v56-actions v56-save-actions">
        <button id="v56SaveStandard">Save Standard</button>
        <button id="v56SendPlanner">Send to Weekly Planner</button>
        <button id="v56SendAssessments">Send to Assessment & Reteach</button>
      </section>`;

    wireStandard(standard);
    generateComment(standard);
  }

  function wireStandard(standard){
    document.getElementById("v56SaveStandard").onclick=()=>saveStandard(standard.id);
    document.getElementById("v56DeleteStandard").onclick=()=>deleteStandard(standard.id);
    document.getElementById("v56AddLesson").onclick=()=>addLesson(standard.id);
    document.getElementById("v56AddEvidence").onclick=()=>addEvidence(standard.id);
    document.getElementById("v56GenerateComment").onclick=()=>generateComment(standard);
    document.getElementById("v56CopyComment").onclick=copyComment;
    document.getElementById("v56SendConference").onclick=()=>sendConference(standard);
    document.getElementById("v56SendPlanner").onclick=()=>sendSync("planner",standard);
    document.getElementById("v56SendAssessments").onclick=()=>sendSync("assessment",standard);

    document.querySelectorAll("[data-remove-lesson]").forEach(button=>{
      button.onclick=()=>removeLesson(standard.id,Number(button.dataset.removeLesson));
    });

    document.querySelectorAll("[data-remove-evidence]").forEach(button=>{
      button.onclick=()=>removeEvidence(standard.id,Number(button.dataset.removeEvidence));
    });
  }

  function saveStandard(id){
    const standard=state.standards.find(item=>item.id===id);
    standard.subject=document.getElementById("v56Subject").value;
    standard.code=document.getElementById("v56Code").value.trim();
    standard.status=document.getElementById("v56Progress").value;
    standard.title=document.getElementById("v56Title").value.trim()||"Untitled Standard";
    standard.description=document.getElementById("v56Description").value.trim();
    standard.reportNotes=document.getElementById("v56ReportNotes").value.trim();
    state.studentName=document.getElementById("v56StudentName").value.trim();

    saveState();
    renderStandardList();
    renderStandard(id);
    setStatus("Standard saved.");
  }

  function addStandard(){
    const id="standard-"+Date.now();
    state.standards.unshift({
      id,
      subject:"Reading Literature",
      code:"Add current Arizona standard code",
      title:"New Standard",
      description:"",
      status:"Not Yet Assessed",
      lessons:[],
      evidence:[],
      reportNotes:""
    });
    saveState();
    renderStandardList();
    renderStandard(id);
    setStatus("New standard created.");
  }

  function deleteStandard(id){
    const standard=state.standards.find(item=>item.id===id);
    if(!confirm(`Delete "${standard.title}"?`))return;

    state.standards=state.standards.filter(item=>item.id!==id);
    saveState();
    activeStandardId=state.standards[0]?.id;
    renderStandardList();

    if(activeStandardId)renderStandard(activeStandardId);
    else document.getElementById("v56Detail").innerHTML="<p>No standards entered.</p>";

    setStatus("Standard deleted.");
  }

  function addLesson(id){
    const lesson=prompt("Enter the lesson, unit, or activity name:");
    if(!lesson?.trim())return;

    const standard=state.standards.find(item=>item.id===id);
    standard.lessons=standard.lessons||[];
    standard.lessons.push(lesson.trim());

    saveState();
    renderStandard(id);
    setStatus("Lesson connected.");
  }

  function removeLesson(id,index){
    const standard=state.standards.find(item=>item.id===id);
    standard.lessons.splice(index,1);
    saveState();
    renderStandard(id);
  }

  function addEvidence(id){
    const type=prompt(
      "Enter evidence type:\n" + data.evidenceTypes.join(", "),
      "Teacher observation"
    );
    if(!type?.trim())return;

    const lesson=prompt("Enter the connected lesson or assessment:","")||"";
    const note=prompt("Describe the evidence briefly:");
    if(!note?.trim())return;

    const standard=state.standards.find(item=>item.id===id);
    standard.evidence=standard.evidence||[];
    standard.evidence.unshift({
      date:new Date().toLocaleDateString(),
      type:type.trim(),
      lesson:lesson.trim(),
      note:note.trim()
    });

    saveState();
    renderStandard(id);
    setStatus("Evidence added.");
  }

  function removeEvidence(id,index){
    const standard=state.standards.find(item=>item.id===id);
    standard.evidence.splice(index,1);
    saveState();
    renderStandard(id);
  }

  function generateComment(standard){
    const student=document.getElementById("v56StudentName")?.value.trim()||"[Student Name]";
    const level=document.getElementById("v56CommentLevel")?.value||"Developing";
    const templates=data.commentTemplates[level]||data.commentTemplates.Developing;
    const template=templates[Math.floor(Math.random()*templates.length)];

    const comment=template
      .replaceAll("[Student Name]",student)
      .replaceAll("[skill]",standard.title.toLowerCase());

    document.getElementById("v56GeneratedComment").value=comment;
  }

  async function copyComment(){
    await navigator.clipboard.writeText(
      document.getElementById("v56GeneratedComment").value
    );
    setStatus("Progress comment copied.");
  }

  function sendConference(standard){
    const payload={
      version:"5.6",
      createdAt:new Date().toISOString(),
      studentName:document.getElementById("v56StudentName").value.trim(),
      standardTitle:standard.title,
      subject:standard.subject,
      level:document.getElementById("v56CommentLevel").value,
      comment:document.getElementById("v56GeneratedComment").value,
      evidence:standard.evidence,
      reportNotes:document.getElementById("v56ReportNotes").value.trim()
    };

    localStorage.setItem("thh-v56:conference-report",JSON.stringify(payload));
    close();
    document.getElementById("studentSupportFamilyButton")?.click();
    setStatus("Progress summary sent to Student Support.");
  }

  function sendSync(destination,standard){
    const payload={
      version:"5.6",
      createdAt:new Date().toISOString(),
      destination,
      standardId:standard.id,
      title:standard.title,
      subject:standard.subject,
      code:standard.code,
      status:standard.status,
      lessons:standard.lessons,
      evidenceCount:(standard.evidence||[]).length
    };

    localStorage.setItem(
      destination==="planner"?"thh-v56:planner-standard":"thh-v56:assessment-standard",
      JSON.stringify(payload)
    );

    close();

    if(destination==="planner"){
      document.getElementById("weeklyPlannerButton")?.click();
    }else{
      document.getElementById("assessmentReteachButton")?.click();
    }
  }

  function saveSnapshot(){
    const snapshot={
      id:"snapshot-"+Date.now(),
      date:new Date().toLocaleDateString(),
      period:state.reportingPeriod,
      standards:state.standards.map(standard=>({
        id:standard.id,
        subject:standard.subject,
        title:standard.title,
        status:standard.status,
        evidenceCount:(standard.evidence||[]).length
      }))
    };

    state.snapshots=state.snapshots||[];
    state.snapshots.unshift(snapshot);
    saveState();
    setStatus(`Snapshot saved for ${state.reportingPeriod}.`);
  }

  function exportSummary(){
    const summary={
      application:"TeachingHappensHere",
      version:"5.6",
      exportedAt:new Date().toISOString(),
      reportingPeriod:state.reportingPeriod,
      standards:state.standards,
      snapshots:state.snapshots||[]
    };

    const blob=new Blob([JSON.stringify(summary,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download=`TeachingHappensHere-standards-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);

    setStatus("Standards summary exported.");
  }

  function addButton(){
    const button=document.createElement("button");
    button.id="standardsReportingButton";
    button.className="v56-button";
    button.innerHTML="<span>5.6</span><strong>Standards & Reports</strong><small>Evidence</small>";
    button.onclick=open;

    const prior=document.getElementById("studentSupportFamilyButton");
    if(prior)prior.insertAdjacentElement("afterend",button);
    else document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",button);
  }

  function open(){
    overlay.classList.add("open");
    document.body.classList.add("v56-open");
    updateStats();
  }

  function close(){
    overlay.classList.remove("open");
    document.body.classList.remove("v56-open");
  }

  function setStatus(message){
    const status=document.getElementById("v56Status");
    if(status)status.textContent=message;
  }

  function slug(text){
    return String(text||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  }

  document.addEventListener("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="e"){
      event.preventDefault();
      if(overlay)open();
    }
    if(event.key==="Escape"&&overlay?.classList.contains("open"))close();
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
