(() => {
  "use strict";

  const DATA_URL = "sprint2a-command-center.json";
  const FAVORITES_KEY = "thh-s2a:favorites";
  const CUSTOM_LINKS_KEY = "thh-s2a:custom-links";
  const DEFAULT_FAVORITES = ["chalkie", "classdojo", "today-plan", "ufli", "eureka"];
  let dataPromise;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch(DATA_URL, { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error("Command Center data could not load.");
        return response.json();
      });
    }
    return dataPromise;
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getFavorites() {
    return new Set(readJson(FAVORITES_KEY, DEFAULT_FAVORITES));
  }

  function saveFavorites(set) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
  }

  function getCustomLinks() {
    return readJson(CUSTOM_LINKS_KEY, {});
  }

  function allItems(data) {
    return [...data.openFirst, ...data.sections.flatMap(section => section.items)];
  }

  function resolvedItem(item, customLinks) {
    if (item.kind !== "setup") return item;
    const url = customLinks[item.id];
    return url ? { ...item, kind: "external", url } : item;
  }

  function itemButton(item, favorites, customLinks, compact = false) {
    const resolved = resolvedItem(item, customLinks);
    const favorite = favorites.has(item.id);
    const action = resolved.kind === "internal"
      ? `data-command-route="${esc(resolved.route)}"`
      : resolved.kind === "external"
        ? `data-command-url="${esc(resolved.url)}"`
        : `data-command-setup="${esc(resolved.id)}"`;
    return `
      <article class="s2a-resource-card${compact ? " is-compact" : ""}" data-resource-id="${esc(item.id)}">
        <button class="s2a-favorite" type="button" data-favorite-id="${esc(item.id)}" aria-label="${favorite ? "Remove from" : "Add to"} favorites" aria-pressed="${favorite}">${favorite ? "★" : "☆"}</button>
        <button class="s2a-resource-main" type="button" ${action}>
          ${item.icon ? `<span class="s2a-resource-icon">${esc(item.icon)}</span>` : ""}
          <span><strong>${esc(item.title)}</strong><small>${esc(item.description || "")}</small></span>
          <em>${resolved.kind === "external" ? "↗" : resolved.kind === "setup" ? "+ Link" : "Open"}</em>
        </button>
      </article>`;
  }

  function dashboardHero(day, modeTitle, modeDescription) {
    const destination = day.mode === "core-instruction" ? "teachday" : "classroom-launch";
    const buttonText = day.mode === "core-instruction" ? "Start Teaching" : "Open Classroom Launch";
    return `
      <header class="s2a-hero">
        <div>
          <p>SPRINT 2A • TEACHER COMMAND CENTER</p>
          <h2>${esc(modeTitle)}</h2>
          <span>${esc(modeDescription)}</span>
        </div>
        <button class="primary-button" data-command-route="${destination}">${buttonText}</button>
      </header>`;
  }

  async function renderDashboard(context = {}) {
    const data = await loadData();
    await window.TOSCalendar.load();
    const stored = window.TOSState.get();
    const selected = stored.previewDate || window.TOSCalendar.iso(new Date());
    const day = window.TOSCalendar.details(selected);
    const modeCopy = {
      prelaunch: ["Pre-Launch Preparation", "Prepare the room, resources, routines, and first-week materials."],
      "classroom-launch": ["Classroom Launch", "Teach routines, relationships, procedures, and academic readiness—without beginning Unit 1."],
      transition: ["Launch Transition", "Review launch progress and prepare for core instruction."],
      "core-instruction": ["Core Instruction", "Open Court Unit 1 begins with The Mice Who Lived in a Shoe."]
    };
    const [modeTitle, modeDescription] = modeCopy[day.mode];
    const favorites = getFavorites();
    const customLinks = getCustomLinks();
    const items = allItems(data);
    const favoriteItems = [...favorites].map(id => items.find(item => item.id === id)).filter(Boolean).slice(0, 8);
    const host = document.getElementById("pageHost");
    if (!host) return;

    host.innerHTML = `
      <section class="s2a-command-center" data-mode="${esc(day.mode)}">
        ${dashboardHero(day, modeTitle, modeDescription)}
        <section class="s2a-datebar">
          <label>Preview Date<input id="s2aPreviewDate" type="date" value="${esc(day.date)}"></label>
          <div><span>Active School Mode</span><strong>${esc(day.label)}</strong></div>
          <button class="secondary-button" id="s2aUseToday">Use Today</button>
        </section>
        <section class="s2a-metrics">
          <article><span>Class Roster</span><strong><span id="s2aRosterCount">${window.TOS_SPRINT2A_STUDENTS?.activeCount?.() || 0}</span> Students</strong><small>Student details stay in this browser.</small></article>
          <article><span>Current Pillar</span><strong>Heart</strong><small>August 2026</small></article>
          <article><span>Writing</span><strong>Building the Foundation</strong><small>Separate from Open Court grammar.</small></article>
          <article><span>Reading Groups</span><strong>Red • Yellow • Green • Blue</strong><small>Ready for beginning-of-year data.</small></article>
        </section>
        <section class="s2a-section">
          <div class="s2a-section-heading"><div><p>OPEN FIRST</p><h3>Teacher Launchpad</h3></div><button class="text-button" data-command-route="resources">View all resources</button></div>
          <div class="s2a-open-first">${data.openFirst.map(item => itemButton(item, favorites, customLinks, true)).join("")}</div>
        </section>
        <section class="s2a-dashboard-grid">
          <article class="panel s2a-today-panel"><div class="s2a-panel-title"><h3>Today at a Glance</h3><button class="text-button" data-command-route="teachday">Open timeline</button></div><div class="s2a-schedule">${[
            ["7:45–8:10", "Breakfast"], ["8:10–8:20", "Morning Work"], ["8:20–8:30", "Morning Meeting"],
            ["8:30–8:40", "Heggerty"], ["8:45–9:30", "MOWR"], ["9:30–9:50", "Open Court Phonics"],
            ["9:50–10:00", "Vocabulary"], ["10:00–10:50", "Reading & Responding"], ["12:05–1:05", "Eureka Math²"],
            ["1:05–1:35", "Building the Foundation Writing"], ["1:35–2:00", "Social Studies"], ["2:15–2:35", "Science"]
          ].map(([time, subject]) => `<div><strong>${esc(time)}</strong><span>${esc(subject)}</span></div>`).join("")}</div></article>
          <article class="panel s2a-favorites-panel"><div class="s2a-panel-title"><h3>Favorites</h3><span>${favoriteItems.length}/8 shown</span></div><div class="s2a-favorite-list">${favoriteItems.length ? favoriteItems.map(item => itemButton(item, favorites, customLinks, true)).join("") : `<div class="s2a-empty"><strong>No favorites yet.</strong><span>Tap a star in the Resource Hub.</span></div>`}</div></article>
          <article class="panel s2a-guardrail"><h3>Instructional Guardrail</h3><strong>${day.mode === "core-instruction" ? "Unit 1 is active." : "Unit 1 remains locked until August 3."}</strong><p>${day.isIDay ? "This is the first iDay. MobyMax work is completed at home." : "The dashboard and Start Teaching use the same active date."}</p></article>
        </section>
      </section>`;

    wire(host, context, () => renderDashboard(context));
    host.querySelector("#s2aPreviewDate")?.addEventListener("change", event => {
      window.TOSState.set({ previewDate: event.target.value }, "preview-date");
      renderDashboard(context);
    });
    host.querySelector("#s2aUseToday")?.addEventListener("click", () => {
      window.TOSState.set({ previewDate: null }, "today");
      renderDashboard(context);
    });
  }

  async function renderResources(context = {}) {
    const data = await loadData();
    const favorites = getFavorites();
    const customLinks = getCustomLinks();
    const host = document.getElementById("pageHost");
    if (!host) return;
    host.innerHTML = `
      <section class="s2a-resource-hub">
        <header class="s2a-resource-hero">
          <div><p>SPRINT 2A • RESOURCE HUB</p><h2>Everything you teach from, organized by your day.</h2><span>Star the resources you use most. External sites always open in a new tab.</span></div>
          <label class="s2a-resource-search"><span>⌕</span><input id="s2aResourceSearch" type="search" placeholder="Search resources..."></label>
        </header>
        <section class="s2a-section" data-resource-section="favorites">
          <div class="s2a-section-heading"><div><p>YOUR SHORTLIST</p><h3>Favorites</h3></div><span class="s2a-count">${favorites.size} saved</span></div>
          <div class="s2a-resource-grid">${allItems(data).filter(item => favorites.has(item.id)).map(item => itemButton(item, favorites, customLinks)).join("") || `<div class="s2a-empty"><strong>No favorites yet.</strong><span>Select ☆ on any resource.</span></div>`}</div>
        </section>
        ${data.sections.map(section => `
          <section class="s2a-section" data-resource-section="${esc(section.id)}">
            <div class="s2a-section-heading"><div><p>${esc(section.icon)} RESOURCE COLLECTION</p><h3>${esc(section.title)}</h3></div><span class="s2a-count">${section.items.length} resources</span></div>
            <div class="s2a-resource-grid">${section.items.map(item => itemButton(item, favorites, customLinks)).join("")}</div>
          </section>`).join("")}
      </section>`;
    wire(host, context, () => renderResources(context));
    host.querySelector("#s2aResourceSearch")?.addEventListener("input", event => {
      const query = event.target.value.trim().toLowerCase();
      host.querySelectorAll(".s2a-resource-card").forEach(card => {
        card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query);
      });
      host.querySelectorAll("[data-resource-section]").forEach(section => {
        const cards = [...section.querySelectorAll(".s2a-resource-card")];
        section.hidden = Boolean(query) && cards.length > 0 && cards.every(card => card.hidden);
      });
    });
  }

  function wire(host, context, rerender) {
    host.querySelectorAll("[data-command-route]").forEach(button => button.addEventListener("click", () => {
      const route = button.dataset.commandRoute;
      (context.navigate || window.TOS_APP_BRIDGE?.navigate)?.(route);
    }));
    host.querySelectorAll("[data-command-url]").forEach(button => button.addEventListener("click", () => {
      window.open(button.dataset.commandUrl, "_blank", "noopener,noreferrer");
    }));
    host.querySelectorAll("[data-command-setup]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.commandSetup;
      const current = getCustomLinks()[id] || "";
      const value = window.prompt("Paste the secure website link for this resource:", current);
      if (!value?.trim()) return;
      try {
        const url = new URL(value.trim());
        if (!/^https?:$/.test(url.protocol)) throw new Error();
        const links = getCustomLinks();
        links[id] = url.href;
        localStorage.setItem(CUSTOM_LINKS_KEY, JSON.stringify(links));
        window.TOS_APP_BRIDGE?.toast?.("Resource link saved in this browser.");
        rerender();
      } catch {
        window.alert("Please enter a complete web address beginning with https://");
      }
    }));
    host.querySelectorAll("[data-favorite-id]").forEach(button => button.addEventListener("click", event => {
      event.stopPropagation();
      const favorites = getFavorites();
      const id = button.dataset.favoriteId;
      favorites.has(id) ? favorites.delete(id) : favorites.add(id);
      saveFavorites(favorites);
      rerender();
    }));
  }

  window.TOS_SPRINT1_RENDER_DASHBOARD = renderDashboard;
  window.TOS_SPRINT2A_RENDER_RESOURCES = renderResources;
})();
