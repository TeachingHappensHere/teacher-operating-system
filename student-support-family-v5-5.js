
(function(){
  "use strict";
  let data, overlay;
  let profiles = [];

  const STORAGE_KEY = "thh-v55:student-support-profiles";

  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-v5-5.css";
    document.head.appendChild(css);

    try{
      data=await (await fetch("student-support-family-v5-5.json",{cache:"no-store"})).json();
      loadProfiles();
      build();
      addButton();
    }catch(error){
      console.warn("Version 5.5 could not load.",error);
    }
  }

  function loadProfiles(){
    try{
      profiles=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    }catch{
      profiles=[];
    }

    if(!profiles.length){
      profiles=[{
        id:"sample-student",
        ...data.sampleProfile,
        notes:[],
        communications:[]
      }];
      saveProfiles();
    }
  }

  function saveProfiles(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(profiles));
    updateStats();
  }

  function build(){
    overlay=document.createElement("div");
    overlay.className="v55-overlay";
    overlay.innerHTML=`
      <section class="v55-dialog">
        <header>
          <div>
            <p>VERSION 5.5</p>
            <h2>Student Support & Family Communication</h2>
            <span>${esc(data.releaseStatus)}</span>
          </div>
          <button id="v55Close">×</button>
        </header>

        <div id="v55Stats" class="v55-stats"></div>

        <div class="v55-toolbar">
          <input id="v55Search" placeholder="Search student profiles, skills, groups, or notes...">
          <button id="v55AddStudent">Add Student Profile</button>
          <button id="v55Print">Print Current Summary</button>
        </div>

        <div class="v55-layout">
          <aside id="v55StudentList"></aside>
          <main id="v55Detail"></main>
        </div>

        <footer>
          <span id="v55Status">Ready</span>
          <span>TeachingHappensHere v5.5</span>
        </footer>
      </section>`;
    document.body.appendChild(overlay);

    document.getElementById("v55Close").onclick=close;
    document.getElementById("v55AddStudent").onclick=addStudent;
    document.getElementById("v55Print").onclick=()=>window.print();
    document.getElementById("v55Search").oninput=renderStudentList;
    overlay.onclick=e=>{if(e.target===overlay)close()};

    updateStats();
    renderStudentList();
    if(profiles[0])renderProfile(profiles[0].id);
  }

  function updateStats(){
    const stats=document.getElementById("v55Stats");
    if(!stats)return;

    const groups={};
    profiles.forEach(profile=>{
      groups[profile.group]=(groups[profile.group]||0)+1;
    });

    stats.innerHTML=`
      <article><strong>${profiles.length}</strong><span>Student Profiles</span></article>
      <article><strong>${groups["Red Group"]||0}</strong><span>Red Group</span></article>
      <article><strong>${groups["Yellow Group"]||0}</strong><span>Yellow Group</span></article>
      <article><strong>${groups["Blue Group"]||0}</strong><span>Blue Group</span></article>
      <article><strong>${groups["Green Group"]||0}</strong><span>Green Group</span></article>
      <article><strong>${profiles.reduce((sum,p)=>sum+(p.communications||[]).length,0)}</strong><span>Communication Notes</span></article>`;
  }

  function renderStudentList(){
    const query=(document.getElementById("v55Search")?.value||"").toLowerCase().trim();
    const filtered=profiles.filter(profile=>!query||JSON.stringify(profile).toLowerCase().includes(query));

    document.getElementById("v55StudentList").innerHTML=filtered.map((profile,index)=>`
      <button data-v55-student="${profile.id}" class="${index===0?"active":""}">
        <strong>${esc(profile.name)}</strong>
        <span>${esc(profile.group)}</span>
        <small>${esc(profile.primarySkill)} • ${esc(profile.progressLevel)}</small>
      </button>`).join("") || `<p class="v55-empty">No matching profiles.</p>`;

    document.querySelectorAll("[data-v55-student]").forEach(button=>{
      button.onclick=()=>renderProfile(button.dataset.v55Student);
    });
  }

  function options(values,selected){
    return values.map(value=>`<option ${value===selected?"selected":""}>${esc(value)}</option>`).join("");
  }

  function supportChecks(profile){
    return data.supportOptions.map((support,index)=>`
      <label>
        <input type="checkbox" data-support="${esc(support)}" ${profile.supports.includes(support)?"checked":""}>
        <span>${esc(support)}</span>
      </label>`).join("");
  }

  function renderProfile(id){
    const profile=profiles.find(item=>item.id===id);
    if(!profile)return;

    document.querySelectorAll("[data-v55-student]").forEach(button=>{
      button.classList.toggle("active",button.dataset.v55Student===id);
    });

    document.getElementById("v55Detail").innerHTML=`
      <div class="v55-heading">
        <div>
          <p>STUDENT SUPPORT PROFILE</p>
          <h2>${esc(profile.name)}</h2>
          <span>${esc(profile.group)} • ${esc(profile.primarySkill)} • ${esc(profile.progressLevel)}</span>
        </div>
        <button id="v55DeleteStudent">Delete Profile</button>
      </div>

      <section class="v55-section">
        <h3>Profile Information</h3>
        <div class="v55-form-grid">
          <label>
            <span>Student Name</span>
            <input id="v55Name" value="${esc(profile.name)}">
          </label>
          <label>
            <span>Reading Group</span>
            <select id="v55Group">${options(data.groupOptions,profile.group)}</select>
          </label>
          <label>
            <span>Primary Skill</span>
            <select id="v55Skill">${options(data.skillOptions,profile.primarySkill)}</select>
          </label>
          <label>
            <span>Progress Level</span>
            <select id="v55Progress">${options(data.progressLevels,profile.progressLevel)}</select>
          </label>
          <label class="v55-wide">
            <span>Instructional Goal</span>
            <textarea id="v55Goal">${esc(profile.goal)}</textarea>
          </label>
          <label>
            <span>Follow-Up Date</span>
            <input id="v55FollowUp" type="date" value="${esc(profile.followUpDate||"")}">
          </label>
        </div>
      </section>

      <section class="v55-section">
        <h3>Current Supports</h3>
        <div class="v55-support-grid" id="v55Supports">${supportChecks(profile)}</div>
      </section>

      <div class="v55-two">
        <section class="v55-section">
          <h3>Strengths</h3>
          <textarea id="v55Strengths">${esc(profile.strengths||"")}</textarea>
        </section>
        <section class="v55-section">
          <h3>Assessment & Classroom Evidence</h3>
          <textarea id="v55Evidence">${esc(profile.evidence||"")}</textarea>
        </section>
      </div>

      <div class="v55-two">
        <section class="v55-section">
          <h3>Next Instructional Step</h3>
          <textarea id="v55NextStep">${esc(profile.nextStep||"")}</textarea>
        </section>
        <section class="v55-section">
          <h3>Home Practice Suggestion</h3>
          <textarea id="v55HomePractice">${esc(profile.homePractice||"")}</textarea>
        </section>
      </div>

      <section class="v55-section">
        <div class="v55-section-title">
          <div>
            <h3>Progress Notes</h3>
            <p>Keep entries factual, instructional, and concise.</p>
          </div>
          <button id="v55AddProgressNote">Add Note</button>
        </div>
        <div id="v55ProgressNotes" class="v55-note-list">
          ${(profile.notes||[]).map(note=>`
            <article>
              <strong>${esc(note.date)}</strong>
              <p>${esc(note.text)}</p>
            </article>`).join("") || "<p>No progress notes yet.</p>"}
        </div>
      </section>

      <section class="v55-section">
        <div class="v55-section-title">
          <div>
            <h3>Family Communication</h3>
            <p>Generate a message from the current support profile.</p>
          </div>
          <select id="v55CommunicationTemplate">
            ${data.communicationTemplates.map(template=>`
              <option value="${template.id}">${esc(template.title)}</option>`).join("")}
          </select>
        </div>

        <input id="v55FamilyName" placeholder="Family name or greeting">
        <textarea id="v55GeneratedMessage" class="v55-message"></textarea>

        <div class="v55-actions">
          <button id="v55GenerateMessage">Generate Message</button>
          <button id="v55CopyMessage">Copy Message</button>
          <button id="v55SaveCommunication">Save Communication Note</button>
          <button id="v55OpenCommunicationHub">Open Communication Hub</button>
        </div>

        <div class="v55-note-list">
          ${(profile.communications||[]).map(note=>`
            <article>
              <strong>${esc(note.date)} • ${esc(note.templateTitle)}</strong>
              <p>${esc(note.summary)}</p>
            </article>`).join("") || "<p>No communication notes yet.</p>"}
        </div>
      </section>

      <section class="v55-actions v55-bottom-actions">
        <button id="v55SaveProfile">Save Student Profile</button>
        <button id="v55SendSmallGroups">Send to Small Groups</button>
        <button id="v55SendTeachDay">Send to Teach My Day</button>
        <button id="v55PrepareConference">Prepare Conference Summary</button>
      </section>`;

    wireProfile(profile);
    generateMessage(profile);
  }

  function wireProfile(profile){
    document.getElementById("v55SaveProfile").onclick=()=>saveProfile(profile.id);
    document.getElementById("v55DeleteStudent").onclick=()=>deleteProfile(profile.id);
    document.getElementById("v55AddProgressNote").onclick=()=>addProgressNote(profile.id);
    document.getElementById("v55GenerateMessage").onclick=()=>generateMessage(profile);
    document.getElementById("v55CopyMessage").onclick=copyMessage;
    document.getElementById("v55SaveCommunication").onclick=()=>saveCommunication(profile.id);
    document.getElementById("v55OpenCommunicationHub").onclick=()=>{
      close();
      document.querySelector('[data-page="communication"]')?.click();
    };
    document.getElementById("v55SendSmallGroups").onclick=()=>sendSupport(profile.id,"smallgroups");
    document.getElementById("v55SendTeachDay").onclick=()=>sendSupport(profile.id,"teachday");
    document.getElementById("v55PrepareConference").onclick=()=>prepareConference(profile.id);
    document.getElementById("v55CommunicationTemplate").onchange=()=>generateMessage(profile);
  }

  function currentFormProfile(profile){
    const supports=[...document.querySelectorAll("#v55Supports input:checked")].map(input=>input.dataset.support);

    return {
      ...profile,
      name:document.getElementById("v55Name").value.trim()||"Unnamed Student",
      group:document.getElementById("v55Group").value,
      primarySkill:document.getElementById("v55Skill").value,
      progressLevel:document.getElementById("v55Progress").value,
      goal:document.getElementById("v55Goal").value.trim(),
      followUpDate:document.getElementById("v55FollowUp").value,
      supports,
      strengths:document.getElementById("v55Strengths").value.trim(),
      evidence:document.getElementById("v55Evidence").value.trim(),
      nextStep:document.getElementById("v55NextStep").value.trim(),
      homePractice:document.getElementById("v55HomePractice").value.trim()
    };
  }

  function saveProfile(id){
    const index=profiles.findIndex(profile=>profile.id===id);
    profiles[index]=currentFormProfile(profiles[index]);
    saveProfiles();
    renderStudentList();
    renderProfile(id);
    setStatus("Student profile saved.");
  }

  function addStudent(){
    const id="student-"+Date.now();
    profiles.unshift({
      id,
      name:"New Student",
      group:"No Current Reading Group",
      primarySkill:"Phonics & Decoding",
      progressLevel:"Beginning",
      goal:"",
      supports:[],
      strengths:"",
      evidence:"",
      nextStep:"",
      homePractice:"",
      followUpDate:"",
      notes:[],
      communications:[]
    });
    saveProfiles();
    renderStudentList();
    renderProfile(id);
    setStatus("New student profile created.");
  }

  function deleteProfile(id){
    const profile=profiles.find(item=>item.id===id);
    if(!confirm(`Delete the support profile for ${profile.name}?`))return;
    profiles=profiles.filter(item=>item.id!==id);
    saveProfiles();
    renderStudentList();
    if(profiles[0])renderProfile(profiles[0].id);
    else document.getElementById("v55Detail").innerHTML="<p>No student profiles.</p>";
    setStatus("Student profile deleted.");
  }

  function addProgressNote(id){
    const text=prompt("Enter a brief progress note:");
    if(!text?.trim())return;

    const profile=profiles.find(item=>item.id===id);
    profile.notes=profile.notes||[];
    profile.notes.unshift({
      date:new Date().toLocaleDateString(),
      text:text.trim()
    });
    saveProfiles();
    renderProfile(id);
    setStatus("Progress note added.");
  }

  function replaceTokens(text,profile,familyName){
    return text
      .replaceAll("[Student Name]",profile.name)
      .replaceAll("[Family Name]",familyName||"Family")
      .replaceAll("[skill or goal]",profile.goal||profile.primarySkill)
      .replaceAll("[specific example]",profile.evidence||"recent classroom work")
      .replaceAll("[strength or effort]",profile.strengths||"continued effort")
      .replaceAll("[school support]",profile.supports.join(", ")||"small-group instruction")
      .replaceAll("[skill area]",profile.primarySkill)
      .replaceAll("[goal]",profile.goal||profile.primarySkill)
      .replaceAll("[intervention or small-group support]",profile.supports.join(", ")||profile.group)
      .replaceAll("[progress note]",profile.progressLevel)
      .replaceAll("[next step]",profile.nextStep||"continued targeted practice")
      .replaceAll("[home practice suggestion]",profile.homePractice||"brief reading practice")
      .replaceAll("[strength]",profile.strengths||"classroom participation")
      .replaceAll("[evidence]",profile.evidence||"classroom observation and student work")
      .replaceAll("[supports]",profile.supports.join(", ")||"targeted classroom support")
      .replaceAll("[progress]",profile.progressLevel)
      .replaceAll("[skill]",profile.primarySkill)
      .replaceAll("[home activity]",profile.homePractice||"brief practice connected to the current skill");
  }

  function generateMessage(profile){
    const latest=currentFormProfile(profile);
    const template=data.communicationTemplates.find(item=>item.id===document.getElementById("v55CommunicationTemplate").value);
    const familyName=document.getElementById("v55FamilyName").value.trim();

    document.getElementById("v55GeneratedMessage").value=
      `Subject: ${replaceTokens(template.subject,latest,familyName)}\n\n${replaceTokens(template.body,latest,familyName)}`;
  }

  async function copyMessage(){
    const message=document.getElementById("v55GeneratedMessage").value;
    await navigator.clipboard.writeText(message);
    setStatus("Family message copied.");
  }

  function saveCommunication(id){
    const profile=profiles.find(item=>item.id===id);
    const template=data.communicationTemplates.find(item=>item.id===document.getElementById("v55CommunicationTemplate").value);
    const message=document.getElementById("v55GeneratedMessage").value.trim();

    if(!message)return;

    profile.communications=profile.communications||[];
    profile.communications.unshift({
      date:new Date().toLocaleDateString(),
      templateTitle:template.title,
      summary:message.slice(0,220)+(message.length>220?"…":"")
    });

    saveProfiles();
    renderProfile(id);
    setStatus("Communication note saved.");
  }

  function sendSupport(id,destination){
    const profile=profiles.find(item=>item.id===id);
    const current=currentFormProfile(profile);
    const payload={
      version:"5.5",
      createdAt:new Date().toISOString(),
      destination,
      studentName:current.name,
      group:current.group,
      skill:current.primarySkill,
      goal:current.goal,
      supports:current.supports,
      nextStep:current.nextStep,
      followUpDate:current.followUpDate
    };

    localStorage.setItem(
      destination==="smallgroups"?"thh-v55:small-group-support":"thh-v55:teachday-support",
      JSON.stringify(payload)
    );

    close();

    if(destination==="smallgroups"){
      document.querySelector('[data-page="smallgroups"]')?.click();
      setTimeout(()=>showNotice("smallgroups",payload),350);
    }else{
      document.querySelector('[data-page="teachday"]')?.click();
      setTimeout(()=>showNotice("teachday",payload),350);
    }
  }

  function showNotice(pageId,payload){
    const page=document.getElementById(pageId);
    if(!page)return;

    let notice=page.querySelector(".v55-sync-notice");
    if(!notice){
      notice=document.createElement("div");
      notice.className="v55-sync-notice";
      page.prepend(notice);
    }

    notice.innerHTML=`
      <strong>${esc(payload.studentName)} • ${esc(payload.group)}</strong>
      <span>${esc(payload.skill)} — ${esc(payload.nextStep||payload.goal)}</span>`;
  }

  function prepareConference(id){
    const profile=profiles.find(item=>item.id===id);
    const current=currentFormProfile(profile);
    const template=data.communicationTemplates.find(item=>item.id==="conference-preparation");
    document.getElementById("v55CommunicationTemplate").value=template.id;
    generateMessage(current);
    document.getElementById("v55GeneratedMessage").scrollIntoView({behavior:"smooth",block:"center"});
    setStatus("Conference summary prepared.");
  }

  function addButton(){
    const button=document.createElement("button");
    button.id="studentSupportFamilyButton";
    button.className="v55-button";
    button.innerHTML="<span>5.5</span><strong>Student Support</strong><small>Family Sync</small>";
    button.onclick=open;

    const prior=document.getElementById("assessmentReteachButton");
    if(prior)prior.insertAdjacentElement("afterend",button);
    else document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",button);
  }

  function open(){
    overlay.classList.add("open");
    document.body.classList.add("v55-open");
  }

  function close(){
    overlay.classList.remove("open");
    document.body.classList.remove("v55-open");
  }

  function setStatus(message){
    const status=document.getElementById("v55Status");
    if(status)status.textContent=message;
  }

  document.addEventListener("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==="s"){
      event.preventDefault();
      if(overlay)open();
    }
    if(event.key==="Escape"&&overlay?.classList.contains("open"))close();
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);
  else start();
})();
