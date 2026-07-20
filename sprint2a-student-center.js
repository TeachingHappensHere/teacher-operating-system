(() => {
  "use strict";

  const STORAGE_KEY = "thh-s2a:student-roster";
  const VERSION = 4;
  const GROUPS = ["Unassigned", "Red", "Yellow", "Green", "Blue"];
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const now = () => new Date().toISOString();
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function blankRoster() {
    return { version: VERSION, initialized: false, students: [], archived: [], seating: [], lastBackupAt: "" };
  }

  function normalizeGroup(value) {
    const text = String(value || "").toLowerCase();
    return GROUPS.find(group => group.toLowerCase() === text) || GROUPS.find(group => text.includes(group.toLowerCase())) || "Unassigned";
  }

  function normalizeStudent(student, index = 0, source = "import") {
    if (typeof student === "string") student = { name: student };
    const name = String(student?.name || student?.studentName || student?.fullName || "").trim();
    if (!name || /sample student|student placeholder/i.test(name)) return null;
    return {
      id: String(student?.id || uid(`student-${index}`)),
      name,
      birthday: String(student?.birthday || student?.birthdate || student?.dob || ""),
      group: normalizeGroup(student?.group || student?.readingGroup),
      status: "Active",
      dibels: String(student?.dibels || student?.benchmark || "Benchmark pending"),
      intervention: String(student?.intervention || student?.support || ""),
      classroomJob: String(student?.classroomJob || student?.job || ""),
      attendance: String(student?.attendance || ""),
      familyContact: String(student?.familyContact || ""),
      notes: String(student?.notes || student?.notesText || student?.teacherNotes || student?.nextStep || student?.goal || ""),
      createdAt: String(student?.createdAt || now()),
      updatedAt: now(),
      migratedFrom: source
    };
  }

  function dedupe(students) {
    const seen = new Set();
    return students.filter(Boolean).filter(student => {
      const key = student.name.toLowerCase().replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function extractStudentArrays(value, results, path = "root", depth = 0) {
    if (depth > 7 || value == null) return;
    if (Array.isArray(value)) {
      const normalized = value.map((item, index) => normalizeStudent(item, index, path)).filter(Boolean);
      if (normalized.length >= 2) results.push(...normalized);
      value.forEach((item, index) => extractStudentArrays(item, results, `${path}[${index}]`, depth + 1));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => {
        if (/student|roster|class|profile|pupil|scholar/i.test(key)) extractStudentArrays(item, results, `${path}.${key}`, depth + 1);
        else if (depth < 3) extractStudentArrays(item, results, `${path}.${key}`, depth + 1);
      });
    }
  }

  function scanBrowserForEarlierRoster() {
    const candidates = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || key === STORAGE_KEY) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        extractStudentArrays(parsed, candidates, key);
      } catch {}
    }
    return dedupe(candidates);
  }

  function migrateEarlierRoster() {
    const students = scanBrowserForEarlierRoster();
    if (!students.length) return blankRoster();
    const roster = { ...blankRoster(), initialized: true, students, seating: students.map(student => student.id), migratedAt: now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(roster));
    return roster;
  }

  function readRoster() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || !Array.isArray(saved.students)) return migrateEarlierRoster();
      const roster = { ...blankRoster(), ...saved, version: VERSION };
      roster.students = dedupe(roster.students.map((student, index) => normalizeStudent(student, index, student.migratedFrom || "saved roster")));
      roster.archived = Array.isArray(saved.archived) ? saved.archived : [];
      roster.seating = Array.isArray(saved.seating) ? saved.seating.filter(id => roster.students.some(student => student.id === id)) : [];
      roster.students.forEach(student => { if (!roster.seating.includes(student.id)) roster.seating.push(student.id); });
      return roster;
    } catch {
      return migrateEarlierRoster();
    }
  }

  function writeRoster(roster) {
    const clean = { ...blankRoster(), ...roster, version: VERSION, initialized: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent("tos:student-roster-changed", { detail: clean }));
  }


  function activeCount() { return readRoster().students.length; }
  function sortStudents(students) { return [...students].sort((a, b) => (a.name || "").localeCompare(b.name || "")); }
  function createStudent(name) { return normalizeStudent({ name }, 0, "manual entry"); }
  function monthDay(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$|^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    return match[2] ? { month: Number(match[2]), day: Number(match[3]) } : { month: Number(match[4]), day: Number(match[5]) };
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 500);
  }

  function studentCard(student) {
    return `<article class="s2a-student-card" data-student-id="${esc(student.id)}">
      <div class="s2a-student-avatar group-${esc(student.group.toLowerCase())}">${esc((student.name || "?").charAt(0).toUpperCase())}</div>
      <button class="s2a-student-open" data-open-student="${esc(student.id)}">
        <strong>${esc(student.name)}</strong><span>${esc(student.group)} group • ${esc(student.dibels || "Benchmark pending")}</span>
        <small>${student.birthday ? `Birthday: ${esc(student.birthday)}` : "Birthday not entered"}${student.intervention ? ` • ${esc(student.intervention)}` : ""}</small>
      </button>
      <div class="s2a-student-actions"><button data-edit-student="${esc(student.id)}">Edit</button><button data-archive-student="${esc(student.id)}">Archive</button></div>
    </article>`;
  }

  function editDialog(student) {
    const dialog = document.createElement("dialog");
    dialog.className = "s2a-student-dialog";
    dialog.innerHTML = `<form method="dialog"><header><div><p>PRIVATE LOCAL PROFILE</p><h3>${student ? "Edit Student" : "Add Student"}</h3></div><button value="cancel" aria-label="Close">×</button></header>
      <label>Student Name<input name="name" required maxlength="90" value="${esc(student?.name || "")}"></label>
      <div class="s2a-dialog-grid"><label>Birthday<input name="birthday" type="date" value="${esc(student?.birthday || "")}"></label><label>Reading Group<select name="group">${GROUPS.map(group => `<option${student?.group === group ? " selected" : ""}>${group}</option>`).join("")}</select></label></div>
      <div class="s2a-dialog-grid"><label>DIBELS / Benchmark<input name="dibels" value="${esc(student?.dibels || "Benchmark pending")}"></label><label>Intervention<input name="intervention" value="${esc(student?.intervention || "")}" placeholder="UFLI daily, fluency, etc."></label></div>
      <div class="s2a-dialog-grid"><label>Classroom Job<input name="classroomJob" value="${esc(student?.classroomJob || "")}"></label><label>Attendance Note<input name="attendance" value="${esc(student?.attendance || "")}"></label></div>
      <label>Family Contact Note<input name="familyContact" value="${esc(student?.familyContact || "")}" placeholder="Conference date or brief note - no sensitive details needed"></label>
      <label>Teacher Notes<textarea name="notes" rows="4">${esc(student?.notes || "")}</textarea></label>
      <footer><button value="cancel" class="secondary-button">Cancel</button><button value="save" class="primary-button">Save Student</button></footer></form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("close", () => dialog.remove(), { once: true });
    dialog.showModal();
    return dialog;
  }

  function profilePanel(student) {
    return `<section class="s2a-profile-panel"><button class="text-button" data-close-profile>← Back to roster</button>
      <div class="s2a-profile-heading"><div class="s2a-profile-avatar group-${esc(student.group.toLowerCase())}">${esc(student.name.charAt(0))}</div><div><p>STUDENT PROFILE</p><h2>${esc(student.name)}</h2><span>${esc(student.group)} reading group</span></div><button class="primary-button" data-edit-student="${esc(student.id)}">Edit Profile</button></div>
      <div class="s2a-profile-grid">
        <article><span>Birthday</span><strong>${esc(student.birthday || "Not entered")}</strong></article>
        <article><span>DIBELS</span><strong>${esc(student.dibels || "Benchmark pending")}</strong></article>
        <article><span>Intervention</span><strong>${esc(student.intervention || "None entered")}</strong></article>
        <article><span>Classroom Job</span><strong>${esc(student.classroomJob || "Not assigned")}</strong></article>
        <article><span>Attendance</span><strong>${esc(student.attendance || "No note")}</strong></article>
        <article><span>Family Contact</span><strong>${esc(student.familyContact || "No note")}</strong></article>
      </div><article class="s2a-notes-card"><span>Teacher Notes</span><p>${esc(student.notes || "No notes entered.")}</p></article></section>`;
  }

  function birthdaysPanel(students) {
    const withDates = students.map(student => ({ student, md: monthDay(student.birthday) })).filter(item => item.md).sort((a, b) => a.md.month - b.md.month || a.md.day - b.md.day);
    return `<section class="s2a-panel"><div class="s2a-section-heading"><div><p>CLASSROOM CELEBRATIONS</p><h3>Birthday Calendar</h3></div></div>
      <div class="s2a-birthday-grid">${withDates.length ? withDates.map(({ student, md }) => `<article><span>${new Date(2026, md.month - 1, 1).toLocaleString("en-US", { month: "short" })}</span><strong>${md.day}</strong><p>${esc(student.name)}</p></article>`).join("") : `<div class="s2a-student-empty"><strong>No birthdays entered.</strong></div>`}</div></section>`;
  }

  function groupsPanel(students) {
    return `<section class="s2a-groups-grid">${GROUPS.slice(1).map(group => { const members = students.filter(student => student.group === group); return `<article class="s2a-group-column group-border-${group.toLowerCase()}"><header><h3>${group} Group</h3><strong>${members.length}</strong></header>${members.length ? members.map(student => `<button data-open-student="${esc(student.id)}">${esc(student.name)}</button>`).join("") : `<p>No students assigned.</p>`}</article>`; }).join("")}</section>`;
  }

  function seatingPanel(roster) {
    const ordered = roster.seating.map(id => roster.students.find(student => student.id === id)).filter(Boolean);
    return `<section class="s2a-panel"><div class="s2a-section-heading"><div><p>FLEXIBLE CLASSROOM LAYOUT</p><h3>Seating Chart</h3></div><span>Drag names to rearrange. Changes save automatically.</span></div>
      <div id="s2aSeatGrid" class="s2a-seat-grid">${ordered.map((student, index) => `<button draggable="true" data-seat-id="${esc(student.id)}"><small>Seat ${index + 1}</small><strong>${esc(student.name)}</strong><span>${esc(student.group)}</span></button>`).join("")}</div></section>`;
  }

  function backupPanel(roster) {
    return `<section class="s2a-panel s2a-backup-panel"><div><p>PRIVATE DATA SAFETY</p><h3>Roster Backup & Recovery</h3><span>Student records are local to this browser. Download a private backup before clearing browser data or changing devices.</span></div>
      <div class="s2a-backup-actions"><button id="s2aExportRoster" class="primary-button">Download Private Backup</button><button id="s2aImportRoster" class="secondary-button">Import Roster File</button><button id="s2aScanStorage" class="secondary-button">Scan Browser for Earlier Roster</button><input id="s2aRosterFile" type="file" accept="application/json,.json" hidden></div>
      <div class="s2a-privacy-note"><strong>Do not upload the private roster JSON to GitHub.</strong><span>Keep it on your own computer or secure drive and import it through this page.</span></div></section>`;
  }

  function render(context = {}) {
    const host = document.getElementById("pageHost");
    if (!host) return;
    const roster = readRoster();
    const students = sortStudents(roster.students);
    const archived = sortStudents(roster.archived);
    const activeTab = sessionStorage.getItem("thh-s2a:student-tab") || "roster";
    const openId = sessionStorage.getItem("thh-s2a:open-student");
    const openStudent = students.find(student => student.id === openId);

    if (openStudent) {
      host.innerHTML = profilePanel(openStudent);
      wireCommon(host, roster, context, () => render(context));
      host.querySelector("[data-close-profile]")?.addEventListener("click", () => { sessionStorage.removeItem("thh-s2a:open-student"); render(context); });
      return;
    }

    host.innerHTML = `<section class="s2a-student-center">
      <header class="s2a-student-hero"><div><p>SPRINT 2A • BATCH 2</p><h2>Student Data & Classroom Profiles</h2><span>Roster, groups, birthdays, seating, and private backups stay in this browser.</span></div><button id="s2aAddStudent" class="primary-button">Add Student</button></header>
      <section class="s2a-student-metrics"><article><span>Active Students</span><strong>${students.length}</strong><small>Current enrollment</small></article><article><span>Archived</span><strong>${archived.length}</strong><small>Enrollment history</small></article><article><span>Assigned to Groups</span><strong>${students.filter(student => student.group !== "Unassigned").length}</strong><small>Red • Yellow • Green • Blue</small></article></section>
      <nav class="s2a-tabs">${[["roster","Roster"],["groups","Reading Groups"],["birthdays","Birthdays"],["seating","Seating Chart"],["backup","Backup & Recovery"]].map(([id,label]) => `<button class="${activeTab === id ? "active" : ""}" data-student-tab="${id}">${label}</button>`).join("")}</nav>
      ${activeTab === "roster" ? `<section class="s2a-student-toolbar"><label><span>⌕</span><input id="s2aStudentSearch" type="search" placeholder="Search students..."></label><div><button id="s2aImportRosterQuick" class="secondary-button">Import Roster</button><button id="s2aToggleArchived" class="text-button">Show archived (${archived.length})</button></div></section><section id="s2aStudentList" class="s2a-student-list">${students.length ? students.map(studentCard).join("") : `<div class="s2a-student-empty"><strong>No students are listed.</strong><span>Use Import Roster to merge the complete private roster file. Existing students and notes will be preserved.</span><div><button id="s2aEmptyImport" class="primary-button">Import Roster</button><button id="s2aEmptyScan" class="secondary-button">Scan Browser</button></div></div>`}</section><section id="s2aArchivedSection" class="s2a-archived-section" hidden><div class="s2a-section-heading"><div><p>ENROLLMENT HISTORY</p><h3>Archived Students</h3></div></div><div class="s2a-student-list">${archived.length ? archived.map(student => `<article class="s2a-student-card is-archived"><div class="s2a-student-avatar">${esc(student.name.charAt(0))}</div><div class="s2a-student-summary"><strong>${esc(student.name)}</strong><span>Archived</span></div><div class="s2a-student-actions"><button data-restore-student="${esc(student.id)}">Restore</button><button class="danger" data-delete-student="${esc(student.id)}">Delete</button></div></article>`).join("") : `<div class="s2a-student-empty"><strong>No archived students.</strong></div>`}</div></section>` : ""}
      ${activeTab === "groups" ? groupsPanel(students) : ""}${activeTab === "birthdays" ? birthdaysPanel(students) : ""}${activeTab === "seating" ? seatingPanel(roster) : ""}${activeTab === "backup" ? backupPanel(roster) : ""}
      <input id="s2aSharedRosterFile" type="file" accept="application/json,.json" hidden>
    </section>`;

    const rerender = () => render(context);
    host.querySelectorAll("[data-student-tab]").forEach(button => button.addEventListener("click", () => { sessionStorage.setItem("thh-s2a:student-tab", button.dataset.studentTab); rerender(); }));
    host.querySelector("#s2aAddStudent")?.addEventListener("click", () => openEdit(null, roster, context, rerender));
    host.querySelector("#s2aStudentSearch")?.addEventListener("input", event => { const q = event.target.value.toLowerCase(); host.querySelectorAll("#s2aStudentList .s2a-student-card").forEach(card => card.hidden = q && !card.textContent.toLowerCase().includes(q)); });
    host.querySelector("#s2aToggleArchived")?.addEventListener("click", event => { const section = host.querySelector("#s2aArchivedSection"); section.hidden = !section.hidden; event.currentTarget.textContent = `${section.hidden ? "Show" : "Hide"} archived (${archived.length})`; });
    wireCommon(host, roster, context, rerender);
    wireImport(host, context, rerender);
    wireBackup(host, roster, context, rerender);
    wireSeating(host, roster, context, rerender);
  }

  function openEdit(student, roster, context, rerender) {
    const dialog = editDialog(student);
    dialog.addEventListener("close", () => {
      if (dialog.returnValue !== "save") return;
      const data = new FormData(dialog.querySelector("form"));
      const target = student || createStudent(String(data.get("name") || ""));
      ["name","birthday","group","dibels","intervention","classroomJob","attendance","familyContact","notes"].forEach(key => target[key] = String(data.get(key) || "").trim());
      target.group = normalizeGroup(target.group); target.updatedAt = now();
      if (!student) { roster.students.push(target); roster.seating.push(target.id); }
      writeRoster(roster); context.toast?.(student ? "Student profile updated." : "Student added."); rerender();
    }, { once: true });
  }

  function wireCommon(host, roster, context, rerender) {
    host.querySelectorAll("[data-open-student]").forEach(button => button.addEventListener("click", () => { sessionStorage.setItem("thh-s2a:open-student", button.dataset.openStudent); rerender(); }));
    host.querySelectorAll("[data-edit-student]").forEach(button => button.addEventListener("click", () => { const student = roster.students.find(item => item.id === button.dataset.editStudent); if (student) openEdit(student, roster, context, rerender); }));
    host.querySelectorAll("[data-archive-student]").forEach(button => button.addEventListener("click", () => { const index = roster.students.findIndex(item => item.id === button.dataset.archiveStudent); if (index < 0) return; const [student] = roster.students.splice(index, 1); roster.archived.push({ ...student, status: "Archived", archivedAt: now() }); roster.seating = roster.seating.filter(id => id !== student.id); writeRoster(roster); rerender(); }));
    host.querySelectorAll("[data-restore-student]").forEach(button => button.addEventListener("click", () => { const index = roster.archived.findIndex(item => item.id === button.dataset.restoreStudent); if (index < 0) return; const [student] = roster.archived.splice(index, 1); roster.students.push({ ...student, status: "Active" }); roster.seating.push(student.id); writeRoster(roster); rerender(); }));
    host.querySelectorAll("[data-delete-student]").forEach(button => button.addEventListener("click", () => { if (!confirm("Permanently remove this archived record from this browser?")) return; roster.archived = roster.archived.filter(item => item.id !== button.dataset.deleteStudent); writeRoster(roster); rerender(); }));
  }

  function wireImport(host, context, rerender) {
    const input = host.querySelector("#s2aSharedRosterFile");
    const trigger = () => input?.click();
    ["#s2aImportRosterQuick", "#s2aEmptyImport", "#s2aImportRoster"].forEach(selector => host.querySelector(selector)?.addEventListener("click", trigger));
    input?.addEventListener("change", async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const source = Array.isArray(parsed) ? parsed : (parsed.students || parsed.roster || []);
        const imported = dedupe(source.map((student, index) => normalizeStudent(student, index, "private roster import")));
        if (!imported.length) throw new Error("No student records were found in that file.");
        const current = readRoster();
        const existing = new Map(current.students.map(student => [student.name.toLowerCase().replace(/\s+/g, " ").trim(), student]));
        let added = 0;
        let updated = 0;
        imported.forEach(student => {
          const key = student.name.toLowerCase().replace(/\s+/g, " ").trim();
          const match = existing.get(key);
          if (match) {
            Object.assign(match, student, { id: match.id });
            updated += 1;
          } else {
            current.students.push(student);
            existing.set(key, student);
            added += 1;
          }
        });
        current.students = dedupe(current.students);
        current.seating = current.students.map(student => student.id);
        writeRoster(current);
        context.toast?.(`Roster repaired: ${added} added, ${updated} matched, ${current.students.length} active.`);
        rerender();
      } catch (error) { alert(`Roster import failed: ${error.message}`); }
    });
  }

  function wireBackup(host, roster, context, rerender) {
    host.querySelector("#s2aExportRoster")?.addEventListener("click", () => { const payload = { type: "mrs-parrish-private-roster-backup", exportedAt: now(), version: VERSION, students: roster.students, archived: roster.archived, seating: roster.seating }; downloadJson(`mrs-parrish-private-roster-${new Date().toISOString().slice(0,10)}.json`, payload); roster.lastBackupAt = now(); writeRoster(roster); context.toast?.("Private roster backup downloaded."); });
    const scan = () => { const found = scanBrowserForEarlierRoster(); if (!found.length) return alert("No earlier student roster was found in this browser. Use Import Roster with the private roster file."); const current = readRoster(); const names = new Set(current.students.map(student => student.name.toLowerCase())); found.forEach(student => { if (!names.has(student.name.toLowerCase())) current.students.push(student); }); current.seating = current.students.map(student => student.id); writeRoster(current); context.toast?.(`${found.length} earlier student records found.`); rerender(); };
    ["#s2aScanStorage", "#s2aEmptyScan"].forEach(selector => host.querySelector(selector)?.addEventListener("click", scan));
  }

  function wireSeating(host, roster, context, rerender) {
    let dragged = null;
    host.querySelectorAll("[data-seat-id]").forEach(seat => {
      seat.addEventListener("dragstart", () => { dragged = seat.dataset.seatId; seat.classList.add("dragging"); });
      seat.addEventListener("dragend", () => seat.classList.remove("dragging"));
      seat.addEventListener("dragover", event => event.preventDefault());
      seat.addEventListener("drop", event => { event.preventDefault(); const target = seat.dataset.seatId; if (!dragged || dragged === target) return; const from = roster.seating.indexOf(dragged), to = roster.seating.indexOf(target); roster.seating.splice(from, 1); roster.seating.splice(to, 0, dragged); writeRoster(roster); context.toast?.("Seating chart updated."); rerender(); });
    });
  }

  window.TOS_SPRINT2A_STUDENTS = { render, activeCount, readRoster, scanBrowserForEarlierRoster };
})();
