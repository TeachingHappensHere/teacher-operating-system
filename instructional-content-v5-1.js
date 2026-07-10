
// TeachingHappensHere Version 5.1
// Complete Instructional Content Engine
(function () {
  "use strict";

  let contentData = null;
  let overlay = null;

  async function loadContent() {
    try {
      const response = await fetch("instructional-content-v5-1.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Instructional content file could not load.");
      contentData = await response.json();
      addButton();
      createOverlay();
    } catch (error) {
      console.warn("Version 5.1 instructional content was not loaded.", error);
    }
  }

  function lessons() {
    return contentData?.units?.flatMap(unit => unit.lessons || []) || [];
  }

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "instructionalContentOverlay";
    overlay.className = "instructional-content-overlay";
    overlay.innerHTML = `
      <section class="instructional-content-dialog" role="dialog" aria-modal="true" aria-label="Complete instructional content">
        <header>
          <div>
            <p class="eyebrow">Version 5.1 Consolidated Release</p>
            <h2>Complete Instructional Content</h2>
            <p>Open Court Unit 1, instructional supports, groups, assessments, print needs, attachments, and Teacher Brain.</p>
          </div>
          <button id="closeInstructionalContent" aria-label="Close instructional content">×</button>
        </header>

        <div class="instructional-content-toolbar">
          <input id="instructionalContentSearch" placeholder="Search lessons, skills, vocabulary, supports...">
          <select id="instructionalLessonSelect"></select>
          <button id="printInstructionalLesson">Print Lesson</button>
        </div>

        <div class="instructional-content-layout">
          <aside id="instructionalLessonList"></aside>
          <main id="instructionalLessonDetail"></main>
        </div>

        <footer>
          <span>${escapeHTML(contentData.releaseStatus || "")}</span>
          <span>TeachingHappensHere v5.1</span>
        </footer>
      </section>
    `;

    document.body.appendChild(overlay);

    const list = lessons();
    const select = document.getElementById("instructionalLessonSelect");
    select.innerHTML = list.map(lesson =>
      `<option value="${lesson.id}">Lesson ${lesson.lessonNumber}: ${escapeHTML(lesson.title)}</option>`
    ).join("");

    document.getElementById("instructionalLessonList").innerHTML = list.map((lesson, index) => `
      <button data-v51-lesson="${lesson.id}" class="${index === 0 ? "active" : ""}">
        <strong>Lesson ${lesson.lessonNumber}</strong>
        <span>${escapeHTML(lesson.title)}</span>
        <small>${escapeHTML(lesson.status)}</small>
      </button>
    `).join("");

    document.querySelectorAll("[data-v51-lesson]").forEach(button => {
      button.addEventListener("click", () => renderLesson(button.dataset.v51Lesson));
    });

    select.addEventListener("change", () => renderLesson(select.value));
    document.getElementById("instructionalContentSearch").addEventListener("input", filterLessons);
    document.getElementById("printInstructionalLesson").addEventListener("click", () => window.print());
    document.getElementById("closeInstructionalContent").addEventListener("click", closeCenter);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeCenter();
    });

    if (list[0]) renderLesson(list[0].id);
  }

  function section(title, content, className = "") {
    return `
      <section class="v51-section ${className}">
        <h3>${title}</h3>
        ${content}
      </section>
    `;
  }

  function checklist(items) {
    if (!items?.length) return "<p>No items entered yet.</p>";
    return items.map((entry, index) => `
      <label class="v51-check">
        <input type="checkbox" data-save-key="v51-${slug(entry)}-${index}">
        <span>${escapeHTML(entry)}</span>
      </label>
    `).join("");
  }

  function chips(items) {
    if (!items?.length) return "<p>No items entered yet.</p>";
    return `<div class="v51-chips">${items.map(item => `<span>${escapeHTML(item)}</span>`).join("")}</div>`;
  }

  function renderLesson(id) {
    const lesson = lessons().find(entry => entry.id === id);
    if (!lesson) return;

    document.querySelectorAll("[data-v51-lesson]").forEach(button => {
      button.classList.toggle("active", button.dataset.v51Lesson === id);
    });

    document.getElementById("instructionalLessonSelect").value = id;

    const vocabulary = (lesson.vocabulary || []).map(entry => `
      <article class="v51-vocabulary-card">
        <strong>${escapeHTML(entry.word)}</strong>
        <p>${escapeHTML(entry.studentDefinition || "")}</p>
        <small>${escapeHTML(entry.support || "")}</small>
      </article>
    `).join("") || "<p>Vocabulary will be added from the teacher materials.</p>";

    const groupCards = Object.entries(lesson.smallGroups || {}).map(([group, plan]) => `
      <article class="v51-group-card ${group}">
        <strong>${escapeHTML(group.toUpperCase())}</strong>
        <p>${escapeHTML(plan)}</p>
      </article>
    `).join("");

    const differentiation = Object.entries(lesson.differentiation || {}).map(([type, supports]) => `
      <article class="v51-support-card">
        <strong>${escapeHTML(type)}</strong>
        ${checklist(supports)}
      </article>
    `).join("");

    const attachments = (lesson.attachments || []).map(file => `
      <article class="v51-attachment-card">
        <div>
          <strong>${escapeHTML(file.title)}</strong>
          <code>${escapeHTML(file.path)}</code>
          <span>${escapeHTML(file.status)}</span>
        </div>
        <a href="${escapeAttribute(file.path)}" target="_blank" rel="noopener">Open</a>
      </article>
    `).join("") || "<p>No attachment paths entered yet.</p>";

    document.getElementById("instructionalLessonDetail").innerHTML = `
      <div class="v51-lesson-heading">
        <div>
          <p class="eyebrow">Open Court Unit 1 • Lesson ${lesson.lessonNumber}</p>
          <h2>${escapeHTML(lesson.title)}</h2>
          <span class="v51-status">${escapeHTML(lesson.status)}</span>
        </div>
        <button data-page="workspace" id="openV51Workspace">Open Live Workspace</button>
      </div>

      <div class="v51-overview-grid">
        ${section("Objective", `<p>${escapeHTML(lesson.objective)}</p>`, "objective")}
        ${section("Learning Target", `<p>${escapeHTML(lesson.learningTarget)}</p>`, "target")}
        ${section("Success Criteria", checklist(lesson.successCriteria), "success")}
      </div>

      ${section("Standards Alignment", checklist(lesson.standards))}
      ${section("Phonics", `<p>${escapeHTML(lesson.phonics || "")}</p>`)}
      ${section("Vocabulary", `<div class="v51-vocabulary-grid">${vocabulary}</div>`)}
      <div class="v51-three-column">
        ${section("I Do", checklist(lesson.iDo), "ido")}
        ${section("We Do", checklist(lesson.weDo), "wedo")}
        ${section("You Do", checklist(lesson.youDo), "youdo")}
      </div>
      <div class="v51-two-column">
        ${section("Reading Skill", `<p>${escapeHTML(lesson.readingSkill || "")}</p>`)}
        ${section("Grammar / GUM", `<p>${escapeHTML(lesson.grammar || "")}</p>`)}
      </div>
      ${section("Writing Connection", `<p>${escapeHTML(lesson.writingConnection || "")}</p>`)}
      ${section("Teacher Brain", checklist(lesson.teacherBrain), "teacher-brain")}
      ${section("Small Groups", `<div class="v51-group-grid">${groupCards}</div>`)}
      ${section("Differentiation", `<div class="v51-support-grid">${differentiation}</div>`)}
      <div class="v51-two-column">
        ${section("Assessment", checklist(lesson.assessment))}
        ${section("Print Needs", checklist(lesson.printNeeds))}
      </div>
      ${section("Attachments", `<div class="v51-attachment-grid">${attachments}</div>`)}
    `;

    document.getElementById("openV51Workspace").addEventListener("click", () => {
      closeCenter();
      document.querySelector('[data-page="workspace"]')?.click();
      setTimeout(() => {
        document.querySelector(`[data-workspace="${CSS.escape(id)}"]`)?.click();
      }, 350);
    });
  }

  function filterLessons(event) {
    const query = event.target.value.toLowerCase().trim();

    document.querySelectorAll("[data-v51-lesson]").forEach(button => {
      const lesson = lessons().find(entry => entry.id === button.dataset.v51Lesson);
      button.hidden = Boolean(query) &&
        !JSON.stringify(lesson).toLowerCase().includes(query);
    });
  }

  function addButton() {
    if (document.getElementById("instructionalContentButton")) return;

    const button = document.createElement("button");
    button.id = "instructionalContentButton";
    button.className = "instructional-content-button";
    button.innerHTML = `
      <span>5.1</span>
      <strong>Instructional Content</strong>
      <small>Unit 1</small>
    `;
    button.addEventListener("click", openCenter);

    const launchButton = document.getElementById("launchCandidateButton");
    if (launchButton) {
      launchButton.insertAdjacentElement("afterend", button);
      return;
    }

    const nav = document.querySelector(".side-nav, .sidebar nav");
    nav?.insertAdjacentElement("afterend", button);
  }

  function openCenter() {
    overlay.classList.add("open");
    document.body.classList.add("instructional-content-open");
  }

  function closeCenter() {
    overlay.classList.remove("open");
    document.body.classList.remove("instructional-content-open");
  }

  function slug(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  function escapeHTML(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(text) {
    return escapeHTML(text);
  }

  function start() {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "style-additions-v5-1.css";
    document.head.appendChild(css);

    loadContent();

    document.addEventListener("keydown", event => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "i"
      ) {
        event.preventDefault();
        if (overlay) openCenter();
      }

      if (event.key === "Escape" && overlay?.classList.contains("open")) {
        closeCenter();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
