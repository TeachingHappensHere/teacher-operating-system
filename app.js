async function loadData(){
  const response = await fetch("./tos-data.json");
  const data = await response.json();
  const l = data.lesson;

  text("lessonTitle", l.title);
  text("essentialQuestion", "Essential Question: " + l.essentialQuestion);
  text("storyType", l.storyType);
  text("readingSkill", l.readingSkill);
  text("grammar", l.grammar);
  text("writingConnection", l.writingConnection);
  text("objective", l.objective);

  chips("phonics", l.phonics);
  chips("vocab", l.vocabulary);
  list("standards", l.standards);
  list("wida", l.wida);
  list("beforeReading", l.beforeReading);
  list("duringReading", l.duringReading);
  list("afterReading", l.afterReading);
  list("teachTips", l.teachLikeMrsParrish);
  list("printList", l.printList);
  list("assessments", l.assessments);
  list("interventionList", l.intervention);
  list("interventionPageList", l.intervention);
  list("reflectionPrompts", l.reflectionPrompts);

  const assessmentCards = document.getElementById("assessmentCards");
  assessmentCards.innerHTML = l.assessments.map(a => `<article><h3>${a}</h3><p>Connected to ${l.unit}, ${l.lesson}: ${l.title}</p></article>`).join("");

  const planbookGrid = document.getElementById("planbookGrid");
  planbookGrid.innerHTML = Object.entries(l.planbook).map(([key, value]) => `
    <div class="planbook-card">
      <h3>${label(key)}</h3>
      <p>${value}</p>
    </div>
  `).join("");
}

function text(id, value){ const el = document.getElementById(id); if(el) el.textContent = value; }
function list(id, items){ const el = document.getElementById(id); if(el) el.innerHTML = items.map(i => `<li>${i}</li>`).join(""); }
function chips(id, items){ const el = document.getElementById(id); if(el) el.innerHTML = items.map(i => `<span class="chip">${i}</span>`).join(""); }
function label(key){ return key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()); }

function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.querySelectorAll("[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === id));
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo({top:0, behavior:"smooth"});
}

document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
document.getElementById("menu")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("open"));

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(console.error));
}

loadData();