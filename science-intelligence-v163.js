
(() => {
  "use strict";

  const ROUTE = "science-intelligence";
  const STORE = "thh-v163:science-intelligence";
  const WEEK_STORE = "thh-v73:weekly-plan";
  const ATTACHMENT_STORE = "thh-v74:attachments";
  const PRINT_STORE = "thh-v74:print-center";

  let config = { library: [], defaultCopies: 33 };
  let state = {
    selectedId: "science-001",
    selectedDay: "Monday",
    objective: "",
    standard: "",
    materials: "",
    teacherNotes: "",
    completed: {}
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start() {
    window.THH_RENDER_SCIENCE_INTELLIGENCE = render;

    try {
      config = await fetch("science-intelligence-v163.json", { cache: "no-store" })
        .then(response => {
          if (!response.ok) throw new Error(`Science library failed: ${response.status}`);
          return response.json();
        });
    } catch (error) {
      console.error(error);
      config = { library: [], defaultCopies: 33 };
    }

    try {
      state = { ...state, ...JSON.parse(localStorage.getItem(STORE) || "{}") };
    } catch {}

    injectNavigation();
    window.addEventListener("hashchange", takeControl);
    takeControl();
  }

  function save() {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function route() {
    return location.hash.replace("#","") || "dashboard";
  }

  function selected() {
    return config.library.find(item => item.id === state.selectedId) || config.library[0];
  }

  function injectNavigation() {
    const install = () => {
      if ($('[data-route="science-intelligence"]')) return;

      const groups = $$(".v110-nav-group");
      const curriculumGroup = groups.find(group =>
        $(".v110-nav-heading span", group)?.textContent?.trim().toLowerCase() === "curriculum"
      );

      const body = curriculumGroup ? $(".v110-nav-body", curriculumGroup) : $("#mainNav");
      if (!body) {
        setTimeout(install, 120);
        return;
      }

      const button = document.createElement("button");
      button.className = "v110-route";
      button.dataset.route = "science-intelligence";
      button.innerHTML = `<span>🔬</span><strong>Science Intelligence</strong>`;
      button.addEventListener("click", () => location.hash = ROUTE);
      body.appendChild(button);
    };

    install();
  }

  function render() {
    if (route() !== ROUTE) return;

    const host = $("#pageHost");
    if (!host) return;

    const item = selected();
    if (!item) {
      host.innerHTML = `
        <section class="v150-module-error">
          <strong>Science workbook library could not be loaded.</strong>
          <span>Refresh once or open Health for diagnostics.</span>
        </section>`;
      return;
    }

    const status = state.completed[item.id] || {};
    const completedCount = ["planning","attachments","printing"].filter(key => status[key]).length;
    const percent = Math.round((completedCount / 3) * 100);

    host.innerHTML = `
      <section id="v163ScienceIntelligence">
        <section class="page-header">
          <div>
            <p>VERSION 16.3</p>
            <h2>Science Intelligence</h2>
            <span>Choose a corrected workbook section and connect it to planning, attachments, and printing.</span>
          </div>
          <div class="button-row">
            <button id="v163BuildAll" class="primary-button">Build Science Lesson</button>
            <button id="v163OpenPdf" class="secondary-button">Open Workbook PDF ↗</button>
          </div>
        </section>

        <section class="panel v163-selector">
          <label>
            <span>Workbook Section</span>
            <select id="v163Section">
              ${config.library.map(section => `
                <option value="${esc(section.id)}" ${section.id === item.id ? "selected" : ""}>
                  ${esc(section.unit)} — ${esc(section.title)} — pages ${esc(section.sourcePages)}
                </option>
              `).join("")}
            </select>
          </label>

          <label>
            <span>Planning Day</span>
            <select id="v163Day">
              ${["Monday","Tuesday","Wednesday","Thursday","Friday"].map(day => `
                <option ${day === state.selectedDay ? "selected" : ""}>${day}</option>
              `).join("")}
            </select>
          </label>

          <article>
            <span>WORKBOOK FILE</span>
            <strong>${esc(item.file.split("/").pop())}</strong>
            <small>Corrected and right side up</small>
          </article>
        </section>

        <section class="v163-progress">
          <div><b style="width:${percent}%"></b></div>
          <strong>${percent}% complete</strong>
        </section>

        <section class="v163-overview">
          <article class="panel v163-topic-card">
            <span>${esc(item.unit)}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.summary)}</p>
            <div class="v163-topic-tags">
              ${item.topics.map(topic => `<b>${esc(topic)}</b>`).join("")}
            </div>
          </article>

          <article class="panel v163-details-card">
            <label>
              <span>Arizona Standard</span>
              <input id="v163Standard" value="${esc(state.standard)}" placeholder="Example: 2.P1U1.1">
            </label>
            <label>
              <span>Learning Objective</span>
              <textarea id="v163Objective" placeholder="Students will...">${esc(state.objective)}</textarea>
            </label>
            <label>
              <span>Materials</span>
              <textarea id="v163Materials" placeholder="Workbook pages, science notebook, materials...">${esc(state.materials)}</textarea>
            </label>
            <label>
              <span>Teacher Notes</span>
              <textarea id="v163TeacherNotes" placeholder="Phenomenon, vocabulary, supports, and reminders...">${esc(state.teacherNotes)}</textarea>
            </label>
          </article>
        </section>

        <section class="v163-workflow">
          ${workflowCard("planning","Weekly Planning",status.planning,"Send the selected science section to the chosen day.")}
          ${workflowCard("attachments","Lesson Attachments",status.attachments,"Create a connected workbook PDF record.")}
          ${workflowCard("printing","Print Center",status.printing,"Prepare a class-set print record.")}
        </section>

        <section class="panel v163-library">
          <h3>Complete Science Workbook Library</h3>
          <div>
            ${config.library.map(section => libraryCard(section, section.id === item.id)).join("")}
          </div>
        </section>
      </section>
    `;

    wire();
  }

  function workflowCard(key, title, complete, description) {
    return `
      <article class="panel v163-workflow-card ${complete ? "complete" : ""}">
        <span>${complete ? "COMPLETE" : "READY"}</span>
        <h3>${esc(title)}</h3>
        <p>${esc(description)}</p>
        <button data-v163-step="${key}" class="${complete ? "secondary-button" : "primary-button"}">
          ${complete ? "Run Again" : "Run Step"}
        </button>
      </article>`;
  }

  function libraryCard(section, active) {
    return `
      <button class="${active ? "active" : ""}" data-v163-section="${esc(section.id)}">
        <span>${esc(section.unit)} • pages ${esc(section.sourcePages)}</span>
        <strong>${esc(section.title)}</strong>
        <small>${esc(section.topics.join(" • "))}</small>
      </button>`;
  }

  function wire() {
    $("#v163Section").addEventListener("change", event => {
      state.selectedId = event.target.value;
      saveForm();
      render();
    });

    $("#v163Day").addEventListener("change", event => {
      state.selectedDay = event.target.value;
      saveForm();
    });

    ["v163Standard","v163Objective","v163Materials","v163TeacherNotes"].forEach(id => {
      $("#" + id).addEventListener("input", saveForm);
    });

    $("#v163OpenPdf").addEventListener("click", () => {
      window.open(selected().file, "_blank", "noopener");
    });

    $("#v163BuildAll").addEventListener("click", () => {
      ["planning","attachments","printing"].forEach(step => runStep(step, false));
      save();
      notify("Science lesson prepared.");
      render();
    });

    $$("[data-v163-step]").forEach(button => {
      button.addEventListener("click", () => runStep(button.dataset.v163Step, true));
    });

    $$("[data-v163-section]").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedId = button.dataset.v163Section;
        save();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function saveForm() {
    state.standard = $("#v163Standard")?.value || state.standard;
    state.objective = $("#v163Objective")?.value || state.objective;
    state.materials = $("#v163Materials")?.value || state.materials;
    state.teacherNotes = $("#v163TeacherNotes")?.value || state.teacherNotes;
    state.selectedDay = $("#v163Day")?.value || state.selectedDay;
    save();
  }

  function runStep(step, rerender) {
    saveForm();
    const item = selected();

    if (step === "planning") sendToPlanning(item);
    if (step === "attachments") sendToAttachments(item);
    if (step === "printing") sendToPrintCenter(item);

    state.completed[item.id] = state.completed[item.id] || {};
    state.completed[item.id][step] = true;
    save();

    if (rerender) {
      notify(`${stepLabel(step)} prepared.`);
      render();
    }
  }

  function scienceLessonText(item) {
    return [
      `${item.unit}: ${item.title}`,
      state.standard ? `Arizona Standard: ${state.standard}` : "",
      state.objective ? `Objective: ${state.objective}` : "",
      `Workbook pages: ${item.sourcePages}`,
      `Topics: ${item.topics.join(", ")}`,
      state.materials ? `Materials: ${state.materials}` : "",
      state.teacherNotes ? `Teacher Notes: ${state.teacherNotes}` : ""
    ].filter(Boolean).join("\n");
  }

  function sendToPlanning(item) {
    let plan = {};
    try {
      plan = JSON.parse(localStorage.getItem(WEEK_STORE) || "{}");
    } catch {}

    if (!plan.days || typeof plan.days !== "object") plan.days = {};
    if (!plan.days[state.selectedDay]) plan.days[state.selectedDay] = { day: state.selectedDay };

    plan.days[state.selectedDay].science = scienceLessonText(item);
    plan.days[state.selectedDay].scienceWorkbook = {
      id: item.id,
      title: item.title,
      unit: item.unit,
      sourcePages: item.sourcePages,
      file: item.file
    };

    localStorage.setItem(WEEK_STORE, JSON.stringify(plan));
  }

  function sendToAttachments(item) {
    let attachments = [];
    try {
      attachments = JSON.parse(localStorage.getItem(ATTACHMENT_STORE) || "[]");
      if (!Array.isArray(attachments)) attachments = [];
    } catch {
      attachments = [];
    }

    const record = {
      id: `science-v163-${item.id}-${state.selectedDay}`.toLowerCase(),
      title: `${item.title} — Workbook Pages ${item.sourcePages}`,
      day: state.selectedDay,
      category: "Science",
      type: "Workbook PDF",
      lesson: `${item.unit}: ${item.title}`,
      url: item.file,
      fileName: item.file.split("/").pop(),
      notes: state.teacherNotes || item.summary,
      print: true,
      copies: config.defaultCopies || 33,
      status: "Ready",
      teacherOnly: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const index = attachments.findIndex(existing => existing.id === record.id);
    if (index >= 0) attachments[index] = { ...attachments[index], ...record };
    else attachments.push(record);

    localStorage.setItem(ATTACHMENT_STORE, JSON.stringify(attachments));
  }

  function sendToPrintCenter(item) {
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem(PRINT_STORE) || "[]");
      if (!Array.isArray(queue)) queue = [];
    } catch {
      queue = [];
    }

    const record = {
      id: `print-science-v163-${item.id}-${state.selectedDay}`.toLowerCase(),
      source: "Science Intelligence 16.3",
      day: state.selectedDay,
      title: `${item.title} — Workbook Pages ${item.sourcePages}`,
      category: "Science",
      section: "Student Copies",
      copies: config.defaultCopies || 33,
      notes: state.teacherNotes || item.summary,
      url: item.file,
      complete: false,
      missingSource: false,
      teacherOnly: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const index = queue.findIndex(existing => existing.id === record.id);
    if (index >= 0) queue[index] = { ...record, complete: queue[index].complete };
    else queue.push(record);

    localStorage.setItem(PRINT_STORE, JSON.stringify(queue));
  }

  function stepLabel(step) {
    return ({
      planning: "Weekly Planning",
      attachments: "Lesson Attachments",
      printing: "Print Center"
    })[step] || step;
  }

  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function takeControl() {
    injectNavigation();
    if (route() !== ROUTE) return;
    setTimeout(render, 25);
    setTimeout(render, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
