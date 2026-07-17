(() => {
  "use strict";
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const schedule = [
    ["7:45–8:10", "Breakfast"], ["8:10–8:20", "Morning Work"], ["8:20–8:30", "Morning Meeting"],
    ["8:30–8:40", "Heggerty"], ["8:45–9:30", "MOWR"], ["9:30–9:50", "Open Court Phonics"],
    ["9:50–10:00", "Vocabulary"], ["10:00–10:50", "Reading & Responding"], ["12:05–1:05", "Eureka Math²"],
    ["1:05–1:35", "Building the Foundation Writing"], ["1:35–2:00", "Social Studies"], ["2:15–2:35", "Science"]
  ];
  const modeCopy = {
    prelaunch: ["Pre-Launch Preparation", "Prepare the room, resources, routines, and first-week materials."],
    "classroom-launch": ["Classroom Launch", "Teach routines, relationships, procedures, and academic readiness—without beginning Unit 1."],
    transition: ["Launch Transition", "Review launch progress and prepare for core instruction."],
    "core-instruction": ["Core Instruction", "Open Court Unit 1 begins with The Mice Who Lived in a Shoe."]
  };
  function destination(mode) { return mode === "core-instruction" ? "teachday" : "classroom-launch"; }
  async function render(context = {}) {
    await window.TOSCalendar.load();
    const stored = window.TOSState.get();
    const selected = stored.previewDate || window.TOSCalendar.iso(new Date());
    const day = window.TOSCalendar.details(selected);
    window.TOSState.set({ activeDate: day.date, mode: day.mode }, "dashboard-render");
    const [title, description] = modeCopy[day.mode];
    const host = document.getElementById("pageHost");
    if (!host) return;
    host.innerHTML = `
      <section id="sprint1Dashboard" class="s1-dashboard" data-mode="${esc(day.mode)}">
        <header class="s1-hero">
          <div><p>SPRINT 1 • CORE ARCHITECTURE</p><h2>${esc(title)}</h2><span>${esc(description)}</span></div>
          <button class="primary-button" id="s1StartTeaching">${day.mode === "core-instruction" ? "Start Teaching" : "Open Classroom Launch"}</button>
        </header>
        <section class="s1-controls">
          <label>Preview Date<input id="s1PreviewDate" type="date" value="${esc(day.date)}"></label>
          <div><span>Active School Mode</span><strong>${esc(day.label)}</strong></div>
          <button class="secondary-button" id="s1Today">Use Today</button>
        </section>
        <section class="s1-metrics">
          <article><span>School Year</span><strong>2026–2027</strong></article>
          <article><span>Current Pillar</span><strong>Heart</strong></article>
          <article><span>Writing</span><strong>Building the Foundation</strong></article>
          <article><span>Reading Groups</span><strong>Red • Yellow • Green • Blue</strong></article>
        </section>
        <section class="s1-grid">
          <article class="panel"><h3>Today at a Glance</h3><div class="s1-schedule">${schedule.map(([time, subject]) => `<div><strong>${esc(time)}</strong><span>${esc(subject)}</span></div>`).join("")}</div></article>
          <article class="panel"><h3>Open Only What You Need</h3><div class="s1-actions">
            <button data-s1-route="lesson-plans">Lesson Plans</button><button data-s1-route="small-groups">Small Groups</button>
            <button data-s1-route="assessments">Assessments</button><button data-s1-route="calendar">Calendar</button>
            <button data-s1-route="resources">Resources</button><button data-s1-route="health">System Health</button>
          </div></article>
          <article class="panel s1-status"><h3>Instructional Guardrail</h3><strong>${day.mode === "core-instruction" ? "Unit 1 is active." : "Unit 1 remains locked until August 3."}</strong><p>${day.isIDay ? "This is the first iDay. MobyMax work is completed at home." : "The dashboard and Start Teaching use the same active date."}</p></article>
        </section>
      </section>`;
    host.querySelector("#s1StartTeaching")?.addEventListener("click", () => context.navigate?.(destination(day.mode)));
    host.querySelector("#s1PreviewDate")?.addEventListener("change", event => { window.TOSState.set({ previewDate: event.target.value }, "preview-date"); render(context); });
    host.querySelector("#s1Today")?.addEventListener("click", () => { window.TOSState.set({ previewDate: null }, "today"); render(context); });
    host.querySelectorAll("[data-s1-route]").forEach(button => button.addEventListener("click", () => context.navigate?.(button.dataset.s1Route)));
  }
  window.TOS_SPRINT1_RENDER_DASHBOARD = render;
})();
