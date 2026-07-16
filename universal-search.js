
// TeachingHappensHere Version 4.7
// Universal Search & Command Center
(function () {
  "use strict";

  const DATA_SOURCES = [
    ["lesson-engine.json", "Lessons"],
    ["classroom-systems.json", "Classroom Systems"],
    ["teacher-brain.json", "Teacher Brain"],
    ["resource-files.json", "Resources"],
    ["assessment-data.json", "Assessments"],
    ["small-groups.json", "Small Groups"],
    ["communication-hub.json", "Communication"],
    ["planner-engine.json", "Planner"],
    ["teach-my-day.json", "Teach My Day"],
    ["classroom-launch.json", "Classroom Launch"]
  ];

  let searchIndex = [];
  let dialog = null;

  async function loadJSON(file) {
    try {
      const response = await fetch(file, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function cleanText(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function item(title, subtitle, body, type, page, keywords = [], meta = {}) {
    return {
      title: cleanText(title),
      subtitle: cleanText(subtitle),
      body: cleanText(body),
      type,
      page,
      keywords: keywords.map(cleanText),
      meta,
      searchable: cleanText([
        title,
        subtitle,
        body,
        type,
        page,
        ...keywords,
        JSON.stringify(meta)
      ].join(" ")).toLowerCase()
    };
  }

  function buildLessonItems(data) {
    return (data?.units || []).flatMap(unit =>
      (unit.lessons || []).map(lesson =>
        item(
          `${lesson.lesson}: ${lesson.title}`,
          unit.title || "Lesson Engine",
          [
            `Phonics: ${lesson.phonics || ""}`,
            `Reading: ${lesson.readingSkill || ""}`,
            `Grammar: ${lesson.grammar || ""}`,
            `Writing: ${lesson.writing || ""}`,
            `Vocabulary: ${(lesson.vocabulary || []).join(", ")}`
          ].join(" • "),
          "Lesson",
          "lessons",
          lesson.vocabulary || [],
          { lessonId: lesson.id }
        )
      )
    );
  }

  function buildSystemItems(data) {
    return (data?.systems || []).map(system =>
      item(
        system.title,
        system.category,
        [
          Array.isArray(system.anchorChart)
            ? system.anchorChart.join(" ")
            : system.anchorChart,
          system.objective,
          system.iDo || system.teachingScript,
          system.weDo,
          system.youDo,
          system.reteachReminder,
          system.micaylaNote
        ].filter(Boolean).join(" • "),
        "Classroom System",
        "classroom",
        [
          ...(system.whatToPraise || []),
          ...(system.commonMistakes || []),
          ...(system.reteachMoments || [])
        ],
        { systemId: system.id }
      )
    );
  }

  function buildBrainItems(data) {
    return (data?.sections || []).flatMap(section =>
      (section.notes || []).map(note =>
        item(
          note.title,
          `${section.title} • ${note.category || ""}`,
          note.note,
          "Teacher Brain",
          "brain",
          note.tags || [],
          { connectedTo: note.connectedTo }
        )
      )
    );
  }

  function buildResourceItems(data) {
    return (data?.resources || []).map(resource =>
      item(
        resource.title,
        `${resource.subject} • ${resource.status}`,
        `${resource.unit} • ${resource.lesson} • ${resource.filePath}`,
        "Resource",
        "resources",
        resource.connectedTo || [],
        { resourceId: resource.id, status: resource.status }
      )
    );
  }

  function buildAssessmentItems(data) {
    const types = (data?.assessmentTypes || []).map(assessment =>
      item(
        assessment.title,
        assessment.category,
        `${assessment.whenToUse} • ${(assessment.skills || []).join(", ")} • ${assessment.teacherBrain || ""}`,
        "Assessment",
        "assessments",
        assessment.connectedTo || [],
        { assessmentId: assessment.id }
      )
    );

    const unit = (data?.unit1Assessments || []).map(assessment =>
      item(
        `${assessment.lesson}: ${assessment.title}`,
        "Open Court Unit 1 Assessment Map",
        `Assessments: ${(assessment.assessments || []).join(", ")} • Reteach: ${(assessment.reteachWatch || []).join(", ")}`,
        "Assessment Map",
        "assessments",
        assessment.reteachWatch || []
      )
    );

    return [...types, ...unit];
  }

  function buildSmallGroupItems(data) {
    const groups = (data?.groups || []).map(group =>
      item(
        group.name,
        `${group.level} • ${group.priority}`,
        `${group.teacherTable} • Focus: ${(group.focus || []).join(", ")} • DIBELS: ${(group.dibelsConnection || []).join(", ")}`,
        "Small Group",
        "smallgroups",
        [
          ...(group.materials || []),
          ...(group.printPrep || [])
        ],
        { groupId: group.id }
      )
    );

    const tools = (data?.interventionTools || []).map(tool =>
      item(
        tool.title,
        "Intervention Tool",
        `${tool.purpose} • Use when: ${tool.useWhen}`,
        "Intervention",
        "intervention",
        tool.materials || []
      )
    );

    return [...groups, ...tools];
  }

  function buildCommunicationItems(data) {
    return (data?.templates || []).map(template =>
      item(
        template.title,
        template.category,
        `${template.subject} • ${template.body}`,
        "Communication Template",
        "communication",
        [template.id],
        { templateId: template.id }
      )
    );
  }

  function buildPlannerItems(data) {
    return (data?.sections || []).flatMap(section =>
      (section.items || []).map(entry =>
        item(
          entry,
          section.title,
          "Planner and calendar item",
          "Planner",
          "calendar"
        )
      )
    );
  }

  function buildTeachDayItems(data) {
    return (data?.blocks || []).map((block, index) =>
      item(
        block.title,
        `${block.time} • ${block.type}`,
        `${block.goal} • Materials: ${(block.materials || []).join(", ")} • Teacher Brain: ${block.teacherBrain || ""}`,
        "Teach My Day",
        "teachday",
        [
          ...(block.print || []),
          ...(block.materials || [])
        ],
        { blockIndex: index }
      )
    );
  }

  function buildLaunchItems(data) {
    return (data?.launchDays || []).map((day, index) =>
      item(
        `${day.day}: ${day.focus}`,
        "Classroom Launch",
        `${day.goal} • Systems: ${(day.systems || []).join(", ")} • ${day.teacherBrain || ""}`,
        "Classroom Launch",
        "launch",
        day.systems || [],
        { launchIndex: index }
      )
    );
  }

  function buildItems(file, data) {
    switch (file) {
      case "lesson-engine.json":
        return buildLessonItems(data);
      case "classroom-systems.json":
        return buildSystemItems(data);
      case "teacher-brain.json":
        return buildBrainItems(data);
      case "resource-files.json":
        return buildResourceItems(data);
      case "assessment-data.json":
        return buildAssessmentItems(data);
      case "small-groups.json":
        return buildSmallGroupItems(data);
      case "communication-hub.json":
        return buildCommunicationItems(data);
      case "planner-engine.json":
        return buildPlannerItems(data);
      case "teach-my-day.json":
        return buildTeachDayItems(data);
      case "classroom-launch.json":
        return buildLaunchItems(data);
      default:
        return [];
    }
  }

  async function buildIndex() {
    const results = await Promise.all(
      DATA_SOURCES.map(async ([file]) => [file, await loadJSON(file)])
    );

    searchIndex = results.flatMap(([file, data]) =>
      data ? buildItems(file, data) : []
    );

    updateCount();
  }

  function scoreResult(entry, terms) {
    let score = 0;
    const title = entry.title.toLowerCase();
    const subtitle = entry.subtitle.toLowerCase();

    terms.forEach(term => {
      if (title === term) score += 100;
      if (title.startsWith(term)) score += 45;
      if (title.includes(term)) score += 25;
      if (subtitle.includes(term)) score += 12;
      if (entry.searchable.includes(term)) score += 5;
    });

    return score;
  }

  function search(query) {
    const terms = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!terms.length) {
      return searchIndex.slice(0, 18);
    }

    return searchIndex
      .filter(entry => terms.every(term => entry.searchable.includes(term)))
      .map(entry => ({ ...entry, score: scoreResult(entry, terms) }))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 40);
  }

  function updateCount() {
    const count = document.getElementById("universalSearchCount");
    if (count) count.textContent = `${searchIndex.length} searchable items`;
  }

  function openPage(page) {
    const button = document.querySelector(`[data-page="${CSS.escape(page)}"]`);
    if (button) {
      button.click();
    } else if (typeof window.showPage === "function") {
      window.showPage(page);
    }
  }

  function openResult(result) {
    closeDialog();
    openPage(result.page);

    setTimeout(() => {
      if (result.meta.lessonId) {
        document.querySelector(`[data-lesson="${CSS.escape(result.meta.lessonId)}"]`)?.click();
      }
      if (result.meta.systemId) {
        document.querySelector(`[data-system="${CSS.escape(result.meta.systemId)}"]`)?.click();
      }
      if (result.meta.blockIndex !== undefined) {
        document.querySelector(`[data-block="${result.meta.blockIndex}"]`)?.click();
      }
      if (result.meta.launchIndex !== undefined) {
        document.querySelector(`[data-launch="${result.meta.launchIndex}"]`)?.click();
      }

      const target =
        document.querySelector(".page.active h2") ||
        document.querySelector(".page.active");

      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 350);
  }

  function renderResults(query) {
    const results = search(query);
    const container = document.getElementById("universalSearchResults");
    if (!container) return;

    container.innerHTML = results.length
      ? results.map((result, index) => `
          <button class="universal-result" data-result-index="${index}">
            <div class="universal-result-top">
              <span class="universal-result-type">${escapeHTML(result.type)}</span>
              <span>${escapeHTML(result.subtitle)}</span>
            </div>
            <strong>${escapeHTML(result.title)}</strong>
            <p>${escapeHTML(result.body).slice(0, 220)}${result.body.length > 220 ? "…" : ""}</p>
          </button>
        `).join("")
      : `<div class="universal-empty">
          <strong>No results found.</strong>
          <p>Try a lesson title, vocabulary word, routine, assessment, student support, or resource name.</p>
        </div>`;

    container.querySelectorAll("[data-result-index]").forEach(button => {
      button.addEventListener("click", () => {
        openResult(results[Number(button.dataset.resultIndex)]);
      });
    });
  }

  function escapeHTML(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createDialog() {
    if (dialog) return;

    dialog = document.createElement("div");
    dialog.id = "universalSearchDialog";
    dialog.className = "universal-search-backdrop";
    dialog.innerHTML = `
      <section class="universal-search-dialog" role="dialog" aria-modal="true" aria-label="Universal search">
        <header>
          <div>
            <p class="eyebrow">Version 4.7</p>
            <h2>Search TeachingHappensHere</h2>
          </div>
          <button id="closeUniversalSearch" aria-label="Close search">×</button>
        </header>

        <div class="universal-search-input-wrap">
          <span>⌕</span>
          <input
            id="universalSearchInput"
            autocomplete="off"
            placeholder="Search lessons, vocabulary, routines, resources, assessments..."
          >
          <kbd>Esc</kbd>
        </div>

        <div class="universal-search-meta">
          <span id="universalSearchCount">Building search index…</span>
          <span>Ctrl/⌘ + K</span>
        </div>

        <div id="universalSearchResults" class="universal-search-results"></div>
      </section>
    `;

    document.body.appendChild(dialog);

    document.getElementById("closeUniversalSearch").addEventListener("click", closeDialog);
    document.getElementById("universalSearchInput").addEventListener("input", event => {
      renderResults(event.target.value);
    });

    dialog.addEventListener("click", event => {
      if (event.target === dialog) closeDialog();
    });
  }

  function openDialog() {
    createDialog();
    dialog.classList.add("open");
    document.body.classList.add("search-open");

    const input = document.getElementById("universalSearchInput");
    input.value = "";
    renderResults("");
    updateCount();

    setTimeout(() => input.focus(), 50);
  }

  function closeDialog() {
    if (!dialog) return;
    dialog.classList.remove("open");
    document.body.classList.remove("search-open");
  }

  function addCommandButton() {
    if (document.getElementById("universalSearchButton")) return;

    const button = document.createElement("button");
    button.id = "universalSearchButton";
    button.className = "universal-search-button";
    button.innerHTML = `
      <span>⌕</span>
      <strong>Search</strong>
      <kbd>Ctrl K</kbd>
    `;
    button.addEventListener("click", openDialog);

    const sidebar = document.querySelector(".sidebar");
    const navigation = sidebar?.querySelector(".side-nav, nav");

    if (navigation) {
      navigation.insertAdjacentElement("afterend", button);
    } else {
      document.body.appendChild(button);
    }
  }

  function addKeyboardShortcuts() {
    document.addEventListener("keydown", event => {
      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (shortcut) {
        event.preventDefault();
        openDialog();
      }

      if (event.key === "Escape") {
        closeDialog();
      }
    });
  }

  async function start() {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "style-additions-v4-7.css";
    document.head.appendChild(css);

    createDialog();
    addCommandButton();
    addKeyboardShortcuts();
    await buildIndex();
    renderResults("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
