(() => {
  "use strict";

  const STORAGE_KEY = "thh-s2a:student-roster";
  const VERSION = 1;

  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function blankRoster() {
    return { version: VERSION, initialized: false, students: [], archived: [] };
  }

  function normalizeGroup(value) {
    const text = String(value || "").toLowerCase();
    if (text.includes("red")) return "Red";
    if (text.includes("yellow")) return "Yellow";
    if (text.includes("green")) return "Green";
    if (text.includes("blue")) return "Blue";
    return "Unassigned";
  }

  function normalizeLegacyStudent(student, index = 0) {
    const name = String(student?.name || student?.studentName || "").trim();
    if (!name || name.toLowerCase().includes("sample student")) return null;
    return {
      id: String(student?.id || `student-migrated-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`),
      name,
      birthday: String(student?.birthday || student?.birthdate || ""),
      group: normalizeGroup(student?.group || student?.readingGroup),
      status: "Active",
      notes: String(student?.notesText || student?.teacherNotes || student?.nextStep || student?.goal || ""),
      createdAt: String(student?.createdAt || new Date().toISOString()),
      migratedFrom: "earlier TOS roster"
    };
  }

  function migrateEarlierRoster() {
    const candidates = [];

    try {
      const v7 = JSON.parse(localStorage.getItem("thh-v7:state") || "null");
      if (Array.isArray(v7?.students)) candidates.push(...v7.students);
    } catch {}

    try {
      const v55 = JSON.parse(localStorage.getItem("thh-v55:student-support-profiles") || "null");
      if (Array.isArray(v55)) candidates.push(...v55);
    } catch {}

    const seen = new Set();
    const students = candidates
      .map(normalizeLegacyStudent)
      .filter(Boolean)
      .filter(student => {
        const key = student.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (!students.length) return blankRoster();

    const migrated = { version: VERSION, initialized: true, students, archived: [], migratedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  function readRoster() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Array.isArray(saved.students) && Array.isArray(saved.archived)) {
        return { ...blankRoster(), ...saved };
      }
      return migrateEarlierRoster();
    } catch {
      return migrateEarlierRoster();
    }
  }

  function writeRoster(roster) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...roster, version: VERSION }));
    window.dispatchEvent(new CustomEvent("tos:student-roster-changed", { detail: roster }));
  }

  function activeCount() {
    return readRoster().students.length;
  }

  function sortStudents(students) {
    return [...students].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  function createStudent(name) {
    return {
      id: `student-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: name.trim(),
      birthday: "",
      group: "Unassigned",
      status: "Active",
      notes: "",
      createdAt: new Date().toISOString()
    };
  }

  function studentCard(student) {
    return `
      <article class="s2a-student-card" data-student-id="${esc(student.id)}">
        <div class="s2a-student-avatar">${esc((student.name || "?").charAt(0).toUpperCase())}</div>
        <div class="s2a-student-summary">
          <strong>${esc(student.name || "Unnamed Student")}</strong>
          <span>${esc(student.group || "Unassigned")} reading group</span>
          <small>${student.birthday ? `Birthday: ${esc(student.birthday)}` : "Birthday not entered"}</small>
        </div>
        <div class="s2a-student-actions">
          <button type="button" data-edit-student="${esc(student.id)}">Edit</button>
          <button type="button" data-archive-student="${esc(student.id)}">Archive</button>
        </div>
      </article>`;
  }

  function archivedCard(student) {
    return `
      <article class="s2a-student-card is-archived">
        <div class="s2a-student-avatar">${esc((student.name || "?").charAt(0).toUpperCase())}</div>
        <div class="s2a-student-summary"><strong>${esc(student.name || "Unnamed Student")}</strong><span>Archived student</span></div>
        <div class="s2a-student-actions">
          <button type="button" data-restore-student="${esc(student.id)}">Restore</button>
          <button type="button" class="danger" data-delete-student="${esc(student.id)}">Delete</button>
        </div>
      </article>`;
  }

  function editDialog(student) {
    const dialog = document.createElement("dialog");
    dialog.className = "s2a-student-dialog";
    dialog.innerHTML = `
      <form method="dialog">
        <header><div><p>LOCAL STUDENT PROFILE</p><h3>${student ? "Edit Student" : "Add Student"}</h3></div><button value="cancel" aria-label="Close">×</button></header>
        <label>Student Name<input name="name" required maxlength="80" value="${esc(student?.name || "")}"></label>
        <div class="s2a-dialog-grid">
          <label>Birthday<input name="birthday" type="date" value="${esc(student?.birthday || "")}"></label>
          <label>Reading Group<select name="group">
            ${["Unassigned", "Red", "Yellow", "Green", "Blue"].map(group => `<option${student?.group === group ? " selected" : ""}>${group}</option>`).join("")}
          </select></label>
        </div>
        <label>Teacher Notes<textarea name="notes" rows="4" placeholder="Private classroom notes stored only in this browser.">${esc(student?.notes || "")}</textarea></label>
        <footer><button value="cancel" class="secondary-button">Cancel</button><button value="save" class="primary-button">Save Student</button></footer>
      </form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
    dialog.querySelector("input[name=name]")?.focus();
    return dialog;
  }

  function render(context = {}) {
    const host = document.getElementById("pageHost");
    if (!host) return;
    const roster = readRoster();
    const students = sortStudents(roster.students);
    const archived = sortStudents(roster.archived);

    host.innerHTML = `
      <section class="s2a-student-center">
        <header class="s2a-student-hero">
          <div><p>SPRINT 2A • STUDENT FOUNDATION</p><h2>Student Roster & Classroom Profiles</h2><span>Names, birthdays, groups, and notes stay in this browser and are never stored in the GitHub files.</span></div>
          <button id="s2aAddStudent" class="primary-button">Add Student</button>
        </header>
        <section class="s2a-student-metrics">
          <article><span>Active Students</span><strong>${students.length}</strong><small>Current classroom enrollment</small></article>
          <article><span>Archived</span><strong>${archived.length}</strong><small>Withdrawn or transferred students</small></article>
          <article><span>Reading Groups</span><strong>4</strong><small>Red • Yellow • Green • Blue</small></article>
        </section>
        ${!roster.initialized ? `<section class="s2a-roster-start"><div><strong>Set up this year's roster</strong><p>Your current class has 25 students. Add names one at a time, or paste a list without publishing it online.</p></div><button id="s2aPasteRoster" class="secondary-button">Paste Roster List</button></section>` : ""}
        <section class="s2a-student-toolbar">
          <label><span>⌕</span><input id="s2aStudentSearch" type="search" placeholder="Search students..."></label>
          <button id="s2aToggleArchived" class="text-button" aria-expanded="false">Show archived (${archived.length})</button>
        </section>
        <section id="s2aStudentList" class="s2a-student-list">
          ${students.length ? students.map(studentCard).join("") : `<div class="s2a-student-empty"><strong>No student names entered yet.</strong><span>Add a student or paste your roster. The information will remain local to this device.</span></div>`}
        </section>
        <section id="s2aArchivedSection" class="s2a-archived-section" hidden>
          <div class="s2a-section-heading"><div><p>ENROLLMENT HISTORY</p><h3>Archived Students</h3></div></div>
          <div class="s2a-student-list">${archived.length ? archived.map(archivedCard).join("") : `<div class="s2a-student-empty"><strong>No archived students.</strong></div>`}</div>
        </section>
      </section>`;

    function rerender() { render(context); }

    host.querySelector("#s2aAddStudent")?.addEventListener("click", () => {
      const dialog = editDialog(null);
      dialog.addEventListener("close", () => {
        if (dialog.returnValue !== "save") return;
        const form = new FormData(dialog.querySelector("form"));
        const name = String(form.get("name") || "").trim();
        if (!name) return;
        const current = readRoster();
        const student = createStudent(name);
        student.birthday = String(form.get("birthday") || "");
        student.group = String(form.get("group") || "Unassigned");
        student.notes = String(form.get("notes") || "");
        current.students.push(student);
        current.initialized = true;
        writeRoster(current);
        context.toast?.("Student added to this browser.");
        rerender();
      }, { once: true });
    });

    host.querySelector("#s2aPasteRoster")?.addEventListener("click", () => {
      const pasted = window.prompt("Paste one student name per line. Names will be stored only in this browser:");
      if (!pasted) return;
      const names = [...new Set(pasted.split(/\r?\n|,/).map(name => name.trim()).filter(Boolean))];
      if (!names.length) return;
      const current = readRoster();
      const existing = new Set(current.students.map(student => student.name.toLowerCase()));
      names.forEach(name => { if (!existing.has(name.toLowerCase())) current.students.push(createStudent(name)); });
      current.initialized = true;
      writeRoster(current);
      context.toast?.(`${names.length} roster name${names.length === 1 ? "" : "s"} processed.`);
      rerender();
    });

    host.querySelector("#s2aToggleArchived")?.addEventListener("click", event => {
      const section = host.querySelector("#s2aArchivedSection");
      section.hidden = !section.hidden;
      event.currentTarget.setAttribute("aria-expanded", String(!section.hidden));
      event.currentTarget.textContent = `${section.hidden ? "Show" : "Hide"} archived (${archived.length})`;
    });

    host.querySelector("#s2aStudentSearch")?.addEventListener("input", event => {
      const query = event.target.value.trim().toLowerCase();
      host.querySelectorAll("#s2aStudentList .s2a-student-card").forEach(card => {
        card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query);
      });
    });

    host.querySelectorAll("[data-edit-student]").forEach(button => button.addEventListener("click", () => {
      const current = readRoster();
      const student = current.students.find(item => item.id === button.dataset.editStudent);
      if (!student) return;
      const dialog = editDialog(student);
      dialog.addEventListener("close", () => {
        if (dialog.returnValue !== "save") return;
        const form = new FormData(dialog.querySelector("form"));
        student.name = String(form.get("name") || student.name).trim();
        student.birthday = String(form.get("birthday") || "");
        student.group = String(form.get("group") || "Unassigned");
        student.notes = String(form.get("notes") || "");
        writeRoster(current);
        context.toast?.("Student profile updated.");
        rerender();
      }, { once: true });
    }));

    host.querySelectorAll("[data-archive-student]").forEach(button => button.addEventListener("click", () => {
      const current = readRoster();
      const index = current.students.findIndex(item => item.id === button.dataset.archiveStudent);
      if (index < 0) return;
      const [student] = current.students.splice(index, 1);
      current.archived.push({ ...student, status: "Archived", archivedAt: new Date().toISOString() });
      writeRoster(current);
      context.toast?.("Student archived.");
      rerender();
    }));

    host.querySelectorAll("[data-restore-student]").forEach(button => button.addEventListener("click", () => {
      const current = readRoster();
      const index = current.archived.findIndex(item => item.id === button.dataset.restoreStudent);
      if (index < 0) return;
      const [student] = current.archived.splice(index, 1);
      current.students.push({ ...student, status: "Active", archivedAt: undefined });
      writeRoster(current);
      context.toast?.("Student restored to the active roster.");
      rerender();
    }));

    host.querySelectorAll("[data-delete-student]").forEach(button => button.addEventListener("click", () => {
      if (!window.confirm("Permanently remove this archived student from this browser?")) return;
      const current = readRoster();
      current.archived = current.archived.filter(item => item.id !== button.dataset.deleteStudent);
      writeRoster(current);
      rerender();
    }));
  }

  window.TOS_SPRINT2A_STUDENTS = { render, activeCount, readRoster };
})();
