let dashboard = null;

async function loadDashboard(){
  const response = await fetch("dashboard-data.json");
  dashboard = await response.json();

  document.getElementById("pillar").textContent = dashboard.currentPillar;
  document.getElementById("lessonStatus").textContent = dashboard.today.lesson;
  document.getElementById("printCount").textContent = dashboard.printCenter.length + " items";
  document.getElementById("todaySummary").textContent = `${dashboard.today.focus} • ${dashboard.today.lesson}`;

  document.getElementById("scheduleList").innerHTML = dashboard.schedule
    .map(item => `<li><strong>${item[0]}</strong> ${item[1]}</li>`)
    .join("");

  document.getElementById("printChecklist").innerHTML = dashboard.printCenter
    .map(item => `<label class="check-item"><input type="checkbox"> ${item}</label>`)
    .join("");

  document.getElementById("quickActions").innerHTML = dashboard.quickActions
    .map(action => `<button data-page="${action.target}">${action.label}</button>`)
    .join("");

  document.getElementById("brainReminder").innerHTML = dashboard.teacherBrain
    .slice(0,3)
    .map(note => `<div class="brain-note">⭐ ${note}</div>`)
    .join("");

  const planningMarkup = dashboard.planningStatus
    .map(p => `<div class="plan-card"><strong>${p.week}</strong><span>${p.status}</span></div>`)
    .join("");
  document.getElementById("planningCards").innerHTML = planningMarkup;
  document.getElementById("planningPageCards").innerHTML = planningMarkup;

  document.getElementById("todayReading").textContent = dashboard.today.lesson;
  document.getElementById("todayWriting").textContent = dashboard.today.writing;
  document.getElementById("todayScience").textContent = dashboard.today.science;

  document.getElementById("brainList").innerHTML = dashboard.teacherBrain
    .map(note => `<div class="brain-note">⭐ ${note}</div>`)
    .join("");

  bindPageButtons();
}

function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.querySelectorAll("[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === id));
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo({top:0, behavior:"smooth"});
}

function bindPageButtons(){
  document.querySelectorAll("[data-page]").forEach(b => {
    b.onclick = () => showPage(b.dataset.page);
  });
}

document.getElementById("menu")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("open"));

document.getElementById("topSearch")?.addEventListener("focus", () => showPage("search"));

bindPageButtons();
loadDashboard();
