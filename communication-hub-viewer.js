
(function(){
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "style-additions-v4-5.css";
  document.head.appendChild(css);

  async function loadCommunicationHub(){
    try{
      const response = await fetch("communication-hub.json", {cache:"no-store"});
      const data = await response.json();
      renderHub(data);
    }catch(error){
      console.warn("Communication Hub could not load.", error);
    }
  }

  function renderHub(data){
    const page = document.getElementById("communication");
    if(!page) return;

    page.classList.remove("placeholder");
    page.innerHTML = `
      <div class="systems-hero">
        <div>
          <p class="eyebrow">Version 4.5</p>
          <h2>Parent Communication Hub</h2>
          <p>Messages, contact notes, conference documentation, and weekly family updates.</p>
        </div>
      </div>

      <div class="communication-tabs">
        <button class="active" data-comm-tab="templates">Message Templates</button>
        <button data-comm-tab="log">Contact Log</button>
        <button data-comm-tab="newsletter">Newsletter Builder</button>
        <button data-comm-tab="quick">Quick Messages</button>
      </div>

      <section id="commTemplates" class="communication-section"></section>
      <section id="commLog" class="communication-section hidden"></section>
      <section id="commNewsletter" class="communication-section hidden"></section>
      <section id="commQuick" class="communication-section hidden"></section>
    `;

    renderTemplates(data);
    renderContactLog(data);
    renderNewsletter(data);
    renderQuickMessages(data);

    document.querySelectorAll("[data-comm-tab]").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-comm-tab]").forEach(b => b.classList.remove("active"));
        button.classList.add("active");

        const map = {
          templates: "commTemplates",
          log: "commLog",
          newsletter: "commNewsletter",
          quick: "commQuick"
        };

        document.querySelectorAll(".communication-section").forEach(section => {
          section.classList.add("hidden");
        });

        document.getElementById(map[button.dataset.commTab]).classList.remove("hidden");
      });
    });
  }

  function renderTemplates(data){
    const section = document.getElementById("commTemplates");
    section.innerHTML = `
      <div class="panel">
        <input id="communicationSearch" class="communication-search" placeholder="Search message templates...">
        <select id="communicationCategory">
          <option value="All">All Categories</option>
          ${data.categories.map(category => `<option value="${category}">${category}</option>`).join("")}
        </select>
      </div>
      <div id="communicationTemplateGrid" class="communication-grid"></div>
    `;

    const search = document.getElementById("communicationSearch");
    const category = document.getElementById("communicationCategory");

    function draw(){
      const q = search.value.toLowerCase().trim();
      const selected = category.value;
      const results = data.templates.filter(template =>
        (selected === "All" || template.category === selected) &&
        (!q || JSON.stringify(template).toLowerCase().includes(q))
      );

      document.getElementById("communicationTemplateGrid").innerHTML = results.map(template => `
        <article class="communication-card">
          <p class="eyebrow">${template.category}</p>
          <h3>${template.title}</h3>
          <p><strong>Subject:</strong> ${template.subject}</p>
          <textarea>${template.body}</textarea>
          <div class="communication-actions">
            <button onclick="copyCommunicationText(this)">Copy Message</button>
            <button onclick="window.print()">Print</button>
          </div>
        </article>
      `).join("");
    }

    search.addEventListener("input", draw);
    category.addEventListener("change", draw);
    draw();
  }

  function renderContactLog(data){
    const section = document.getElementById("commLog");
    section.innerHTML = `
      <div class="panel">
        <h3>Parent Contact Log</h3>
        <div class="contact-form">
          ${data.contactLogFields.map(field => `
            <label>
              <span>${field}</span>
              ${field === "Summary"
                ? `<textarea placeholder="${field}"></textarea>`
                : `<input placeholder="${field}">`
              }
            </label>
          `).join("")}
        </div>
        <button class="wide-button">Save Contact Note</button>
        <p class="communication-note">Current version provides the structure. Saved records will be added in a future database sprint.</p>
      </div>
    `;
  }

  function renderNewsletter(data){
    const newsletter = data.templates.find(t => t.id === "weekly-newsletter");
    const section = document.getElementById("commNewsletter");
    section.innerHTML = `
      <article class="communication-card newsletter-card">
        <p class="eyebrow">Weekly Newsletter</p>
        <h3>${newsletter.title}</h3>
        <input value="${newsletter.subject}">
        <textarea>${newsletter.body}</textarea>
        <div class="communication-actions">
          <button onclick="copyCommunicationText(this)">Copy Newsletter</button>
          <button onclick="window.print()">Print Newsletter</button>
        </div>
      </article>
    `;
  }

  function renderQuickMessages(data){
    const section = document.getElementById("commQuick");
    section.innerHTML = `
      <div class="communication-grid">
        ${data.quickMessages.map(message => `
          <article class="quick-message-card">
            <p>${message}</p>
            <button onclick="navigator.clipboard.writeText(${JSON.stringify(message)})">Copy</button>
          </article>
        `).join("")}
      </div>
    `;
  }

  window.copyCommunicationText = function(button){
    const card = button.closest(".communication-card");
    const textarea = card.querySelector("textarea");
    const subject = card.querySelector("input");
    const text = subject
      ? `Subject: ${subject.value}\n\n${textarea.value}`
      : textarea.value;

    navigator.clipboard.writeText(text).then(() => {
      const original = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => button.textContent = original, 1200);
    });
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", loadCommunicationHub);
  }else{
    loadCommunicationHub();
  }

  setTimeout(loadCommunicationHub, 800);
})();
