let library = null;
let currentCategory = "All";

async function loadLibrary(){
  const response = await fetch("document-library.json");
  library = await response.json();
  document.getElementById("docCount").textContent = library.documents.length;
  renderCategories();
  renderLibrary();
  renderFilteredSections();
}

function showPage(id){
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.querySelectorAll("[data-page]").forEach(b => b.classList.toggle("active", b.dataset.page === id));
  document.querySelector(".sidebar")?.classList.remove("open");
  window.scrollTo({top:0, behavior:"smooth"});
}

document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
document.getElementById("menu")?.addEventListener("click", () => document.querySelector(".sidebar")?.classList.toggle("open"));

function renderCategories(){
  const cats = ["All", ...library.categories];
  document.getElementById("categoryTabs").innerHTML = cats.map(cat => `<button class="${cat===currentCategory?'active':''}" data-cat="${cat}">${cat}</button>`).join("");
  document.querySelectorAll("[data-cat]").forEach(btn => btn.addEventListener("click", () => {
    currentCategory = btn.dataset.cat;
    renderCategories();
    renderLibrary();
  }));
}

function docCard(doc){
  return `<article class="doc-card">
    <h3>${doc.title}</h3>
    <div class="meta">${doc.category} • ${doc.unit} • ${doc.lesson}</div>
    <span class="badge">${doc.type}</span>
    <span class="badge">${doc.status}</span>
    <div>${doc.tags.slice(0,5).map(t => `<span class="badge">${t}</span>`).join("")}</div>
    <div class="actions">
      <button class="primary">Open</button>
      <button class="secondary">Preview</button>
      <button class="secondary">Print</button>
    </div>
  </article>`;
}

function renderLibrary(){
  const docs = currentCategory === "All" ? library.documents : library.documents.filter(d => d.category === currentCategory);
  document.getElementById("libraryGrid").innerHTML = docs.map(docCard).join("");
}

function searchDocs(term){
  const q = term.toLowerCase().trim();
  if(!q) return library.documents;
  return library.documents.filter(d =>
    d.title.toLowerCase().includes(q) ||
    d.category.toLowerCase().includes(q) ||
    d.unit.toLowerCase().includes(q) ||
    d.lesson.toLowerCase().includes(q) ||
    d.type.toLowerCase().includes(q) ||
    d.tags.some(t => t.toLowerCase().includes(q))
  );
}

function runSearch(term){
  document.getElementById("searchResults").innerHTML = searchDocs(term).map(docCard).join("") || "<p>No matches yet.</p>";
}

document.getElementById("searchBox")?.addEventListener("input", e => runSearch(e.target.value));
document.getElementById("globalSearch")?.addEventListener("input", e => {
  showPage("search");
  document.getElementById("searchBox").value = e.target.value;
  runSearch(e.target.value);
});

function renderFilteredSections(){
  document.getElementById("literacyDocs").innerHTML = library.documents.filter(d => d.category === "Open Court Reading").map(docCard).join("");
  document.getElementById("attachmentDocs").innerHTML = library.documents.filter(d => ["Open Court Reading","Assessment Center"].includes(d.category)).map(docCard).join("");
  document.getElementById("brainDocs").innerHTML = library.documents.filter(d => d.category === "Teacher Brain").map(docCard).join("");
  runSearch("");
}

loadLibrary();
