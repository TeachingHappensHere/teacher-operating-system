
// Version 4.3 - Resource Library Viewer
(function(){
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "style-additions-v4-3.css";
  document.head.appendChild(css);

  async function loadResourceLibrary(){
    try{
      const res = await fetch("resource-files.json", {cache:"no-store"});
      const data = await res.json();
      renderResourceLibrary(data);
    }catch(err){
      console.warn("Resource library not loaded yet.", err);
    }
  }

  function statusClass(status){
    return (status || "").toLowerCase().replaceAll(" ","-");
  }

  function renderResourceLibrary(data){
    const resourcePage = document.getElementById("resources");
    if(!resourcePage) return;

    const resources = data.resources || [];
    const needsUpload = resources.filter(r => r.status === "Needs Upload").length;
    const ready = resources.filter(r => r.status === "Ready for File").length;
    const links = resources.filter(r => r.status === "Needs Link").length;
    const favorites = resources.filter(r => r.status === "Teacher Favorite").length;

    resourcePage.innerHTML = `
      <div class="systems-hero">
        <div>
          <p class="eyebrow">Version 4.3</p>
          <h2>Resource Library Viewer</h2>
          <p>Track files, folders, links, upload status, and lesson connections.</p>
        </div>
      </div>

      <div class="resource-stats">
        <article><strong>${resources.length}</strong><span>Total Resources</span></article>
        <article><strong>${needsUpload}</strong><span>Need Upload</span></article>
        <article><strong>${ready}</strong><span>Ready for File</span></article>
        <article><strong>${links}</strong><span>Need Link</span></article>
        <article><strong>${favorites}</strong><span>Teacher Favorites</span></article>
      </div>

      <section class="panel">
        <h3>Recommended Folder Structure</h3>
        <div class="folder-grid">
          ${Object.entries(data.folderPlan || {}).map(([folder,desc]) => `
            <div class="folder-card">
              <strong>${folder}</strong>
              <p>${desc}</p>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="panel">
        <h3>Resource Search</h3>
        <input id="resourceSearch" class="resource-search" placeholder="Search resources, subjects, lessons, statuses...">
      </section>

      <section class="resource-grid" id="resourceGrid"></section>
    `;

    const input = document.getElementById("resourceSearch");
    input.addEventListener("input", () => renderCards(resources, input.value));
    renderCards(resources, "");
  }

  function renderCards(resources, query){
    const q = (query || "").toLowerCase().trim();
    const filtered = resources.filter(r => !q || JSON.stringify(r).toLowerCase().includes(q));
    const grid = document.getElementById("resourceGrid");
    if(!grid) return;

    grid.innerHTML = filtered.map(r => `
      <article class="resource-card">
        <div class="resource-top">
          <p class="eyebrow">${r.subject} • ${r.type}</p>
          <span class="status-pill ${statusClass(r.status)}">${r.status}</span>
        </div>
        <h3>${r.title}</h3>
        <p><strong>Unit:</strong> ${r.unit}</p>
        <p><strong>Lesson:</strong> ${r.lesson}</p>
        <p><strong>File Path:</strong></p>
        <code>${r.filePath}</code>
        <p><strong>Connects to:</strong></p>
        <div class="chips">
          ${(r.connectedTo || []).map(c => `<span class="chip">${c}</span>`).join("")}
        </div>
        <div class="resource-actions">
          <button disabled>Open</button>
          <button disabled>Preview</button>
          <button disabled>Print</button>
        </div>
      </article>
    `).join("") || `<div class="panel"><p>No resources match that search.</p></div>`;
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", loadResourceLibrary);
  } else {
    loadResourceLibrary();
  }

  window.addEventListener("hashchange", loadResourceLibrary);
  setTimeout(loadResourceLibrary, 800);
})();
