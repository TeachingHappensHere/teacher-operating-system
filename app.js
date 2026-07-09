async function loadScholarDashboard(){
  const res = await fetch("scholar-dashboard.json", { cache: "no-store" });
  const data = await res.json();

  document.getElementById("welcomeTitle").textContent = `Welcome, ${data.teacherName}! ♡`;
  document.getElementById("quoteText").innerHTML = `“${data.quote}<br>”`;
  document.getElementById("quoteAuthor").textContent = `– ${data.quoteAuthor}`;
  document.getElementById("todayDate").textContent = data.date;

  document.getElementById("scheduleList").innerHTML = data.schedule
    .map(row => `<div class="schedule-row"><strong>${row[0]}</strong><span>${row[1]}</span></div>`)
    .join("");

  document.getElementById("curriculumGrid").innerHTML = data.curriculum
    .map(item => `<div class="curriculum-item"><span>${item[0]}</span><span>${item[1]}</span></div>`)
    .join("");

  document.getElementById("classroomLinks").innerHTML = data.classroomLinks
    .map(link => `<div>♡ ${link}</div>`)
    .join("");

  document.getElementById("shortcutGrid").innerHTML = data.teacherShortcuts
    .map(link => `<div>♡ ${link}</div>`)
    .join("");

  document.getElementById("importantLinks").innerHTML = data.importantLinks
    .map(link => `<p>${link} ↗</p>`)
    .join("");

  document.getElementById("lowerCards").innerHTML = Object.entries(data.lowerCards)
    .map(([title, items]) => `
      <article class="lower-card">
        <h3>${title}</h3>
        ${items.map(item => `<div>♡ ${item}</div>`).join("")}
      </article>
    `)
    .join("");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(console.error);
}

loadScholarDashboard();
