(() => {
  "use strict";

  const MODE_KEY = "thh-v181:schedule-mode";
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function minutesValue(text) {
    const [hourText, minuteText] = text.split(":");
    let hour = Number(hourText);
    const minute = Number(minuteText);
    if (hour < 7) hour += 12;
    return hour * 60 + minute;
  }

  function currentMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  function mode() {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "full" || saved === "half") return saved;
    return new Date().getDay() === 5 ? "half" : "full";
  }

  function schedule() {
    const master = window.THH_MASTER_SCHEDULE;
    if (!master) return [];
    return mode() === "half"
      ? master.halfDaySchedule2026_2027 || []
      : master.fullDaySchedule2026_2027 || [];
  }

  function status(items) {
    const now = currentMinutes();
    if (!items.length) return { current: null, next: null, index: -1, percent: 0 };

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const start = minutesValue(item[0]);
      const end = minutesValue(item[1]);
      if (now >= start && now < end) {
        return {
          current: item,
          next: items[index + 1] || null,
          index,
          percent: Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)),
          remaining: end - now
        };
      }
    }

    const firstStart = minutesValue(items[0][0]);
    if (now < firstStart) return { current: null, next: items[0], index: -1, percent: 0, remaining: firstStart - now };
    return { current: null, next: null, index: items.length, percent: 100, remaining: 0 };
  }

  function cardMarkup(items) {
    const live = status(items);
    const isHalf = mode() === "half";
    if (!live.current && live.next) {
      return `
        <div class="v182-copy">
          <p>${isHalf ? "FRIDAY HALF DAY" : "MONDAY–THURSDAY"}</p>
          <h3>Day begins with ${esc(live.next[2])}</h3>
          <span>${esc(live.next[0])}–${esc(live.next[1])} · Starts in ${live.remaining} minutes</span>
        </div>
        <button type="button" data-v182-open>Open Today</button>`;
    }
    if (!live.current) {
      return `
        <div class="v182-copy">
          <p>${isHalf ? "FRIDAY HALF DAY" : "MONDAY–THURSDAY"}</p>
          <h3>Teaching day complete</h3>
          <span>All scheduled blocks are finished for today.</span>
        </div>
        <button type="button" data-v182-open>Review Day</button>`;
    }
    return `
      <div class="v182-copy">
        <p>${isHalf ? "FRIDAY HALF DAY" : "LIVE TEACHING"}</p>
        <h3>Now: ${esc(live.current[2])}</h3>
        <span>${esc(live.current[0])}–${esc(live.current[1])} · ${live.remaining} minutes remaining</span>
        <div class="v182-progress" aria-label="Current block progress"><i style="width:${live.percent.toFixed(1)}%"></i></div>
        <small>${live.next ? `Next: ${esc(live.next[0])} ${esc(live.next[2])}` : "Final scheduled block"}</small>
      </div>
      <button type="button" data-v182-open>Teach This Block</button>`;
  }

  function openTeachDay() {
    location.hash = "teachday";
  }

  function installCard() {
    const host = $("#pageHost");
    if (!host) return;
    let card = $("#v182LiveTimeline");
    if (!card) {
      card = document.createElement("section");
      card.id = "v182LiveTimeline";
      card.className = "v182-live-card";
      card.addEventListener("click", event => {
        if (event.target.closest("[data-v182-open]")) openTeachDay();
      });
      host.prepend(card);
    }
    card.innerHTML = cardMarkup(schedule());
  }

  function markActiveRows() {
    const items = schedule();
    const live = status(items);
    document.querySelectorAll(".v181-row").forEach(row => row.classList.remove("v182-current", "v182-complete"));
    document.querySelectorAll(".v181-row").forEach((row, index) => {
      if (index < live.index) row.classList.add("v182-complete");
      if (index === live.index && live.current) row.classList.add("v182-current");
    });
  }

  function refresh() {
    installCard();
    markActiveRows();
  }

  function start() {
    refresh();
    setInterval(refresh, 30000);
    window.addEventListener("storage", refresh);
    window.addEventListener("hashchange", () => setTimeout(refresh, 50));
    new MutationObserver(() => setTimeout(refresh, 0)).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
