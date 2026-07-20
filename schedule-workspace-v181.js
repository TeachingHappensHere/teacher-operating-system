(() => {
  "use strict";

  const KEY = "thh-v181:schedule-mode";
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function minutesBetween(start, end) {
    const parse = text => {
      const [h, m] = text.split(":").map(Number);
      let hour = h;
      if (hour < 7) hour += 12;
      return hour * 60 + m;
    };
    return Math.max(0, parse(end) - parse(start));
  }

  function scheduleFor(mode) {
    const master = window.THH_MASTER_SCHEDULE;
    if (!master) return [];
    return mode === "half"
      ? master.halfDaySchedule2026_2027 || []
      : master.fullDaySchedule2026_2027 || [];
  }

  function defaultMode() {
    const day = new Date().getDay();
    return day === 5 ? "half" : "full";
  }

  function selectedMode() {
    return localStorage.getItem(KEY) || defaultMode();
  }

  function instructionalMinutes(items) {
    const nonInstructional = new Set([
      "breakfast", "lunchRecess", "lunch", "transition", "workout",
      "recess", "packup", "dismissal"
    ]);
    return items.reduce((sum, [start, end, , id]) =>
      nonInstructional.has(id) ? sum : sum + minutesBetween(start, end), 0);
  }

  function renderRows(items) {
    return items.map(([start, end, title, id]) => `
      <div class="v181-row" data-block="${esc(id)}">
        <div class="v181-time"><strong>${esc(start)}</strong><span>${esc(end)}</span></div>
        <div class="v181-block"><strong>${esc(title)}</strong><small>${minutesBetween(start, end)} minutes</small></div>
      </div>`).join("");
  }

  function openWorkspace() {
    let modal = $("#v181ScheduleModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "v181ScheduleModal";
      modal.className = "v181-modal";
      modal.innerHTML = `
        <section class="v181-dialog" role="dialog" aria-modal="true" aria-labelledby="v181Title">
          <header>
            <div>
              <p>2026–2027 MASTER SCHEDULE</p>
              <h2 id="v181Title">Second Grade Schedule</h2>
            </div>
            <button type="button" class="v181-close" aria-label="Close schedule">×</button>
          </header>
          <div class="v181-tabs" role="tablist">
            <button type="button" data-mode="full">Monday–Thursday</button>
            <button type="button" data-mode="half">Friday Half Day</button>
          </div>
          <div id="v181Summary" class="v181-summary"></div>
          <div id="v181Rows" class="v181-rows"></div>
          <footer>
            <span>Schedule source: Version 18.0 master schedule</span>
            <button type="button" id="v181Print">Print Schedule</button>
          </footer>
        </section>`;
      document.body.appendChild(modal);
      modal.addEventListener("click", event => {
        if (event.target === modal || event.target.closest(".v181-close")) closeWorkspace();
        const tab = event.target.closest("[data-mode]");
        if (tab) setMode(tab.dataset.mode);
      });
      $("#v181Print", modal)?.addEventListener("click", () => window.print());
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("open")) closeWorkspace();
      });
    }
    modal.classList.add("open");
    document.body.classList.add("v181-modal-open");
    renderWorkspace();
  }

  function closeWorkspace() {
    $("#v181ScheduleModal")?.classList.remove("open");
    document.body.classList.remove("v181-modal-open");
  }

  function setMode(mode) {
    localStorage.setItem(KEY, mode === "half" ? "half" : "full");
    renderWorkspace();
    updateDashboardCard();
  }

  function renderWorkspace() {
    const modal = $("#v181ScheduleModal");
    if (!modal) return;
    const mode = selectedMode();
    const items = scheduleFor(mode);
    modal.querySelectorAll("[data-mode]").forEach(button => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $("#v181Summary", modal).innerHTML = `
      <article><strong>${items.length}</strong><span>Daily blocks</span></article>
      <article><strong>${instructionalMinutes(items)}</strong><span>Instructional minutes</span></article>
      <article><strong>${mode === "half" ? "12:00" : "3:00"}</strong><span>Student dismissal</span></article>`;
    $("#v181Rows", modal).innerHTML = renderRows(items);
  }

  function updateDashboardCard() {
    const host = $("#pageHost");
    if (!host) return;
    let card = $("#v181ScheduleCard");
    if (!card) {
      card = document.createElement("section");
      card.id = "v181ScheduleCard";
      card.className = "v181-dashboard-card";
      card.addEventListener("click", openWorkspace);
      host.prepend(card);
    }
    const mode = selectedMode();
    const items = scheduleFor(mode);
    card.innerHTML = `
      <div>
        <p>MASTER SCHEDULE</p>
        <h3>${mode === "half" ? "Friday Half Day" : "Monday–Thursday Full Day"}</h3>
        <span>${items.length} blocks · ${instructionalMinutes(items)} instructional minutes</span>
      </div>
      <button type="button">View Schedule</button>`;
  }

  function installQuickButton() {
    if ($("#v181ScheduleButton")) return;
    const button = document.createElement("button");
    button.id = "v181ScheduleButton";
    button.className = "v181-fab";
    button.type = "button";
    button.innerHTML = "🕒 <span>Schedule</span>";
    button.addEventListener("click", openWorkspace);
    document.body.appendChild(button);
  }

  function start() {
    installQuickButton();
    updateDashboardCard();
    const observer = new MutationObserver(() => updateDashboardCard());
    const host = $("#pageHost");
    if (host) observer.observe(host, { childList: true, subtree: false });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
