
(function(){
  let data, overlay, current;

  const esc = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function start(){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="style-additions-v5-2.css";
    document.head.appendChild(css);

    try{
      data=await (await fetch("curriculum-resource-integration-v5-2.json",{cache:"no-store"})).json();
      build();
      addButton();
    }catch(error){console.warn("Version 5.2 failed to load.",error)}
  }

  function allResources(){
    return data.curriculumAreas.flatMap(area =>
      area.resources.map(resource => ({...resource, areaId:area.id}))
    );
  }

  function build(){
    overlay=document.createElement("div");
    overlay.className="v52-overlay";
    overlay.innerHTML=`
      <section class="v52-dialog">
        <header>
          <div><p>VERSION 5.2</p><h2>Curriculum & Resource Integration</h2><span>${esc(data.releaseStatus)}</span></div>
          <button id="v52Close">×</button>
        </header>
        <div id="v52Stats" class="v52-stats"></div>
        <div class="v52-toolbar">
          <input id="v52Search" placeholder="Search resources, files, folders, status...">
          <select id="v52Status"><option value="All">All Statuses</option></select>
          <button id="v52CheckAll">Check Displayed Paths</button>
        </div>
        <div class="v52-layout">
          <aside id="v52Areas"></aside>
          <main id="v52Detail"></main>
        </div>
        <footer><span id="v52Message">Ready</span><span>TeachingHappensHere v5.2</span></footer>
      </section>`;
    document.body.appendChild(overlay);

    const statuses=[...new Set(allResources().map(r=>r.status))];
    document.getElementById("v52Status").innerHTML += statuses.map(s=>`<option>${esc(s)}</option>`).join("");
    document.getElementById("v52Areas").innerHTML=data.curriculumAreas.map((a,i)=>`
      <button data-v52-area="${a.id}" class="${i===0?"active":""}">
        <span>${a.icon}</span><div><strong>${esc(a.title)}</strong><small>${esc(a.status)}</small></div>
      </button>`).join("");

    document.querySelectorAll("[data-v52-area]").forEach(b=>b.onclick=()=>renderArea(b.dataset.v52Area));
    document.getElementById("v52Search").oninput=filter;
    document.getElementById("v52Status").onchange=filter;
    document.getElementById("v52CheckAll").onclick=checkAll;
    document.getElementById("v52Close").onclick=close;
    overlay.onclick=e=>{if(e.target===overlay)close()};

    renderStats();
    renderArea(data.curriculumAreas[0].id);
  }

  function renderStats(){
    const resources=allResources();
    const folders=data.curriculumAreas.flatMap(a=>a.folders);
    document.getElementById("v52Stats").innerHTML=`
      <article><strong>${data.curriculumAreas.length}</strong><span>Curriculum Areas</span></article>
      <article><strong>${resources.length}</strong><span>Resource Slots</span></article>
      <article><strong>${folders.length}</strong><span>Folder Paths</span></article>
      <article><strong>${resources.filter(r=>r.status==="Needs Upload").length}</strong><span>Need Upload</span></article>
      <article><strong>${resources.filter(r=>r.status==="Ready for File").length}</strong><span>Ready for File</span></article>`;
  }

  function renderArea(id){
    current=data.curriculumAreas.find(a=>a.id===id);
    document.querySelectorAll("[data-v52-area]").forEach(b=>b.classList.toggle("active",b.dataset.v52Area===id));
    document.getElementById("v52Search").value="";
    document.getElementById("v52Status").value="All";
    renderDetail(current.resources);
  }

  function cards(resources){
    return resources.map(r=>`
      <article class="v52-card" data-path="${esc(r.path||"")}">
        <div><small>${esc(r.type)}</small><span>${esc(r.status)}</span></div>
        <h3>${esc(r.title)}</h3>
        ${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`:`<code>${esc(r.path)}</code>`}
        <section>
          ${r.url?`<a href="${esc(r.url)}" target="_blank" rel="noopener">Open</a>`:
          `<a href="${esc(r.path)}" target="_blank" rel="noopener">Open</a>
           <button data-copy="${esc(r.path)}">Copy Path</button>
           <button data-check="${esc(r.path)}">Check</button>`}
        </section>
        <p class="v52-result">${r.url?"Public link ready.":"Not checked yet."}</p>
      </article>`).join("") || "<p>No matching resources.</p>";
  }

  function renderDetail(resources){
    document.getElementById("v52Detail").innerHTML=`
      <div class="v52-heading">
        <div><p>${current.icon} CURRICULUM AREA</p><h2>${esc(current.title)}</h2><span>${esc(current.description)}</span></div>
        <b>${esc(current.status)}</b>
      </div>
      <section class="v52-section">
        <h3>Recommended GitHub Folders</h3>
        ${current.folders.map(f=>`<div class="v52-folder"><code>${esc(f)}</code><button data-copy="${esc(f)}">Copy</button></div>`).join("")}
      </section>
      <section class="v52-section">
        <div class="v52-section-title"><div><h3>Resources</h3><p>${resources.length} matching item(s)</p></div><button onclick="window.print()">Print List</button></div>
        <div id="v52Grid" class="v52-grid">${cards(resources)}</div>
      </section>
      <section class="v52-section">
        <h3>Status Definitions</h3>
        <div class="v52-definitions">${Object.entries(data.statusDefinitions).map(([k,v])=>`<article><strong>${esc(k)}</strong><p>${esc(v)}</p></article>`).join("")}</div>
      </section>`;
    wire();
  }

  function wire(){
    document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{
      await navigator.clipboard.writeText(b.dataset.copy);
      const old=b.textContent;b.textContent="Copied";setTimeout(()=>b.textContent=old,800);
    });
    document.querySelectorAll("[data-check]").forEach(b=>b.onclick=()=>checkOne(b.dataset.check,b.closest(".v52-card")));
  }

  function filter(){
    const q=document.getElementById("v52Search").value.toLowerCase().trim();
    const status=document.getElementById("v52Status").value;
    const resources=current.resources.filter(r=>(status==="All"||r.status===status)&&(!q||JSON.stringify(r).toLowerCase().includes(q)));
    renderDetail(resources);
  }

  async function checkOne(path,card){
    const result=card.querySelector(".v52-result");result.textContent="Checking…";
    try{
      const response=await fetch(path+"?check="+Date.now(),{cache:"no-store"});
      const ok=response.ok;
      result.textContent=ok?"File found.":`Not found (${response.status}).`;
      card.classList.toggle("found",ok);card.classList.toggle("missing",!ok);
    }catch{
      result.textContent="Could not load this path.";card.classList.add("missing");
    }
  }

  async function checkAll(){
    const cards=[...document.querySelectorAll(".v52-card[data-path]")].filter(c=>c.dataset.path);
    document.getElementById("v52Message").textContent=`Checking ${cards.length} path(s)…`;
    for(const card of cards) await checkOne(card.dataset.path,card);
    const found=cards.filter(c=>c.classList.contains("found")).length;
    document.getElementById("v52Message").textContent=`${found}/${cards.length} displayed files found.`;
  }

  function addButton(){
    const button=document.createElement("button");
    button.id="curriculumIntegrationButton";
    button.className="v52-button";
    button.innerHTML="<span>5.2</span><strong>Curriculum Integration</strong><small>Resources</small>";
    button.onclick=open;
    const prior=document.getElementById("instructionalContentButton");
    if(prior) prior.insertAdjacentElement("afterend",button);
    else document.querySelector(".side-nav,.sidebar nav")?.insertAdjacentElement("afterend",button);
  }

  function open(){overlay.classList.add("open");document.body.classList.add("v52-open")}
  function close(){overlay.classList.remove("open");document.body.classList.remove("v52-open")}

  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==="r"){e.preventDefault();if(overlay)open()}
    if(e.key==="Escape"&&overlay?.classList.contains("open"))close()
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
