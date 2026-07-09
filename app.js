let scholar, lessons;

async function init(){
  scholar = await (await fetch("scholar-dashboard.json",{cache:"no-store"})).json();
  lessons = await (await fetch("lesson-engine.json",{cache:"no-store"})).json();
  loadDashboard();
  renderLessonList();
  renderResources();
  bindRoutes();
}
function bindRoutes(){
  document.querySelectorAll("[data-page]").forEach(btn => btn.onclick = () => showPage(btn.dataset.page));
}
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
  document.querySelectorAll(".side-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  if(id==="print") renderPrintCenter();
  window.scrollTo({top:0,behavior:"smooth"});
}
function loadDashboard(){
  document.getElementById("welcomeTitle").textContent = `Welcome, ${scholar.teacherName}! ♡`;
  document.getElementById("quoteText").innerHTML = `“${scholar.quote}<br>”`;
  document.getElementById("quoteAuthor").textContent = `– ${scholar.quoteAuthor}`;
  document.getElementById("todayDate").textContent = scholar.date;
  document.getElementById("scheduleList").innerHTML = scholar.schedule.map(r=>`<div class="schedule-row"><strong>${r[0]}</strong><span>${r[1]}</span></div>`).join("");
  document.getElementById("curriculumGrid").innerHTML = scholar.curriculum.map(i=>`<button class="curriculum-item" data-page="${i[2]}"><span>${i[0]}</span><span>${i[1]}</span></button>`).join("");
  document.getElementById("classroomLinks").innerHTML = scholar.classroomLinks.map(l=>`<div>♡ ${l}</div>`).join("");
  document.getElementById("shortcutGrid").innerHTML = scholar.teacherShortcuts.map(s=>`<button data-page="${s[1]}">♡ ${s[0]}</button>`).join("");
  document.getElementById("importantLinks").innerHTML = scholar.importantLinks.map(l=>`<p>${l} ↗</p>`).join("");
  document.getElementById("lowerCards").innerHTML = Object.entries(scholar.lowerCards).map(([title,items])=>`<article class="lower-card"><h3>${title}</h3>${items.map(i=>`<button>${i}</button>`).join("")}</article>`).join("");
  bindRoutes();
}
function renderLessonList(){
  const all = lessons.units[0].lessons;
  document.getElementById("lessonList").innerHTML = all.map((l,i)=>`<button class="${i===0?'active':''}" data-lesson="${l.id}"><strong>${l.lesson}</strong><br>${l.title}</button>`).join("");
  document.querySelectorAll("[data-lesson]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-lesson]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");renderLesson(btn.dataset.lesson);});
  renderLesson(all[0].id);
}
function renderLesson(id){
  const lesson = lessons.units[0].lessons.find(l=>l.id===id);
  document.getElementById("lessonDetail").innerHTML = `
    <h2>${lesson.lesson}: ${lesson.title}</h2>
    <div class="panel"><h3>Focus</h3><p><b>Phonics:</b> ${lesson.phonics}</p><p><b>Reading:</b> ${lesson.readingSkill}</p><p><b>Grammar:</b> ${lesson.grammar}</p><p><b>Writing:</b> ${lesson.writing}</p></div>
    <div class="panel"><h3>Vocabulary</h3><div class="chips">${lesson.vocabulary.map(v=>`<span class="chip">${v}</span>`).join("")}</div></div>
    <div class="panel"><h3>Teach It Like Mrs. Parrish</h3><ul>${lesson.teacherTips.map(t=>`<li>${t}</li>`).join("")}</ul></div>
    <div class="panel"><h3>Attachments</h3><div class="attachment-grid">${lesson.attachments.map(a=>`<div class="attachment"><strong>${a.name}</strong><p>${a.type} • ${a.status}</p><button ${a.file?'':'disabled'}>${a.file?'Open':'Pending'}</button><button>Print</button></div>`).join("")}</div></div>
  `;
}
function renderResources(){
  document.getElementById("resourceCards").innerHTML = scholar.curriculum.map(i=>`<article><h3>${i[0]} ${i[1]}</h3><p>Connected to the dashboard and ready for lesson routing.</p></article>`).join("");
}
function renderPrintCenter(){
  const allAttachments = lessons.units[0].lessons.flatMap(l=>l.attachments.map(a=>({...a, lesson:l.lesson, title:l.title})));
  document.getElementById("printCenter").innerHTML = allAttachments.map(a=>`<article><h3>${a.name}</h3><p>${a.lesson}: ${a.title}</p><p>${a.type} • ${a.status}</p></article>`).join("");
}
if("serviceWorker" in navigator){navigator.serviceWorker.register("./service-worker.js").catch(console.error)}
init();
