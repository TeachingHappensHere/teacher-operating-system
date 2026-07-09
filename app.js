async function loadDashboard(){
  const res = await fetch("dashboard-redesign.json");
  const data = await res.json();

  document.getElementById("todayDate").textContent = data.date;

  document.getElementById("schedule").innerHTML = data.schedule
    .map(row => `<div class="schedule-row"><strong>${row[0]}</strong><span>${row[1]}</span></div>`)
    .join("");

  document.getElementById("curriculum").innerHTML = data.curriculum
    .map(item => `<div class="curriculum-item"><span>${item[0]}</span><span>${item[1]}</span></div>`)
    .join("");

  document.getElementById("classroomLinks").innerHTML = data.classroomLinks
    .map(link => `<div>♡ ${link}</div>`)
    .join("");

  document.getElementById("shortcuts").innerHTML = data.shortcuts
    .map(link => `<div>♡ ${link}</div>`)
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
loadDashboard();
