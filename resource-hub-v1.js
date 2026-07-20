(() => {
  "use strict";
  const STORAGE_KEY = "mrs-parrish-resource-hub-v1";
  const defaults = [
    {id:"classdojo",title:"ClassDojo",category:"Communication",icon:"💬",url:"https://www.classdojo.com/",description:"Family communication, announcements, and classroom updates."},
    {id:"google-classroom",title:"Google Classroom",category:"Teaching Platforms",icon:"🖥️",url:"",description:"Assignments, make-up work, and digital student materials."},
    {id:"chalkie",title:"Chalkie",category:"Teaching Platforms",icon:"✨",url:"",description:"Interactive lesson slides and classroom presentations."},
    {id:"open-court",title:"Open Court Reading",category:"Literacy",icon:"📖",url:"",description:"Reading, phonics, vocabulary, comprehension, and grammar resources."},
    {id:"ufli",title:"UFLI Foundations Toolbox",category:"Literacy",icon:"🔤",url:"https://ufli.education.ufl.edu/foundations/toolbox/",description:"Foundational skills lessons, decodables, and instructional supports."},
    {id:"heggerty",title:"Heggerty",category:"Literacy",icon:"👂",url:"",description:"Daily phonemic-awareness routines and lesson materials."},
    {id:"amplify",title:"Amplify mCLASS / DIBELS",category:"Student Data",icon:"📊",url:"",description:"Benchmarking, progress monitoring, and reading data."},
    {id:"eureka",title:"Eureka Math²",category:"Math",icon:"➗",url:"",description:"Daily math lessons, digital materials, and assessments."},
    {id:"icivics",title:"iCivics",category:"Social Studies",icon:"🏛️",url:"https://www.icivics.org/",description:"Civics and social studies lessons and activities."},
    {id:"beanstack",title:"Beanstack",category:"Reading Practice",icon:"📚",url:"",description:"Student reading logs and reading challenges."},
    {id:"mobymax",title:"MobyMax",category:"Student Practice",icon:"🎯",url:"",description:"iDay practice, intervention, and skill reinforcement."},
    {id:"google-drive",title:"Google Drive",category:"Teacher Files",icon:"📁",url:"https://drive.google.com/",description:"Curriculum folders, planning files, and shared school resources."}
  ];
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  function load(){
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length) {
        const byId = new Map(saved.map(item => [item.id,item]));
        return defaults.map(item => ({...item,...(byId.get(item.id)||{})})).concat(saved.filter(item => !defaults.some(base => base.id === item.id)));
      }
    } catch (error) { console.warn("Resource Hub data could not be read.", error); }
    return defaults.map(item => ({...item}));
  }
  function save(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  function safeUrl(url){
    const value = String(url || "").trim();
    if (!value) return "";
    try { const parsed = new URL(value); return ["http:","https:"].includes(parsed.protocol) ? parsed.href : ""; } catch { return ""; }
  }
  window.TOS_SPRINT2A_RENDER_RESOURCES = function({ toast }){
    let resources = load();
    let active = "All";
    const host = document.getElementById("pageHost");
    const categories = () => ["All",...Array.from(new Set(resources.map(item => item.category))).sort()];
    const render = () => {
      const visible = active === "All" ? resources : resources.filter(item => item.category === active);
      host.innerHTML = `<section class="resource-hub">
        <div class="resource-hero"><div><span class="eyebrow">RESOURCE HUB</span><h2>Everything you open during the school day</h2><p>Launch your teaching platforms from one place. Missing links can be added once and will stay saved on this device.</p></div><div class="resource-toolbar"><button id="resourceAdd" class="primary-button">+ Add Resource</button><button id="resourceReset" class="secondary-button">Reset Defaults</button></div></div>
        <div class="resource-filter" aria-label="Resource categories">${categories().map(cat => `<button data-resource-filter="${esc(cat)}" class="${cat===active?'active':''}">${esc(cat)}</button>`).join("")}</div>
        <div class="resource-grid-v1">${visible.map(item => `<article class="resource-card-v1 ${safeUrl(item.url)?'':'missing-link'}"><div class="resource-icon">${esc(item.icon || '🔗')}</div><div class="resource-category">${esc(item.category)}</div><h3>${esc(item.title)}</h3><p>${esc(item.description || '')}</p><div class="resource-card-actions"><a href="${esc(safeUrl(item.url) || '#')}" target="_blank" rel="noopener noreferrer">${safeUrl(item.url)?'Open':'Add Link'}</a><button data-resource-edit="${esc(item.id)}">Edit</button></div></article>`).join("") || `<div class="resource-empty-v1">No resources in this category.</div>`}</div>
      </section><div id="resourceModal" class="resource-modal-v1" hidden><form id="resourceForm" class="resource-modal-card-v1"><h3 id="resourceModalTitle">Edit Resource</h3><input type="hidden" id="resourceId"><label>Name<input id="resourceTitle" required></label><label>Category<input id="resourceCategory" required></label><label>Web address<input id="resourceUrl" type="url" placeholder="https://..."></label><label>Icon<input id="resourceIcon" maxlength="4" placeholder="🔗"></label><label>Description<textarea id="resourceDescription"></textarea></label><div class="resource-modal-actions"><button type="button" id="resourceCancel" class="secondary-button">Cancel</button><button type="submit" class="primary-button">Save</button></div></form></div>`;
      wire();
    };
    const openEditor = item => {
      const modal = document.getElementById("resourceModal");
      document.getElementById("resourceModalTitle").textContent = item ? "Edit Resource" : "Add Resource";
      document.getElementById("resourceId").value = item?.id || "";
      document.getElementById("resourceTitle").value = item?.title || "";
      document.getElementById("resourceCategory").value = item?.category || "Teacher Tools";
      document.getElementById("resourceUrl").value = item?.url || "";
      document.getElementById("resourceIcon").value = item?.icon || "🔗";
      document.getElementById("resourceDescription").value = item?.description || "";
      modal.hidden = false;
      document.getElementById("resourceTitle").focus();
    };
    const closeEditor = () => { document.getElementById("resourceModal").hidden = true; };
    function wire(){
      document.querySelectorAll("[data-resource-filter]").forEach(button => button.addEventListener("click", () => { active = button.dataset.resourceFilter; render(); }));
      document.querySelectorAll("[data-resource-edit]").forEach(button => button.addEventListener("click", () => openEditor(resources.find(item => item.id === button.dataset.resourceEdit))));
      document.getElementById("resourceAdd").addEventListener("click", () => openEditor(null));
      document.getElementById("resourceReset").addEventListener("click", () => { if (!confirm("Reset the Resource Hub to its default list?")) return; resources = defaults.map(item => ({...item})); save(resources); active = "All"; render(); toast("Resource Hub reset."); });
      document.getElementById("resourceCancel").addEventListener("click", closeEditor);
      document.getElementById("resourceModal").addEventListener("click", event => { if (event.target.id === "resourceModal") closeEditor(); });
      document.getElementById("resourceForm").addEventListener("submit", event => {
        event.preventDefault();
        const id = document.getElementById("resourceId").value || `custom-${Date.now()}`;
        const item = {id,title:document.getElementById("resourceTitle").value.trim(),category:document.getElementById("resourceCategory").value.trim(),url:safeUrl(document.getElementById("resourceUrl").value),icon:document.getElementById("resourceIcon").value.trim() || "🔗",description:document.getElementById("resourceDescription").value.trim()};
        const index = resources.findIndex(entry => entry.id === id);
        if (index >= 0) resources[index] = item; else resources.push(item);
        save(resources); active = item.category; closeEditor(); render(); toast("Resource saved.");
      });
    }
    render();
  };
})();
