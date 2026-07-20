(() => {
  "use strict";
  const DAYS = [
    {title:"Day 1 — Belong & Learn the Room", focus:"Safety, connection, entering, seating, carpet, attention signal, restroom, lunch and dismissal.", read:"First Day Jitters", routines:["Welcome at the door and practice entering","Introduce seats, supplies and personal spaces","Teach carpet expectations and attention signal","Tour the classroom and key school locations","Practice restroom, hallway, lunch and dismissal routines","Create the first draft of our Class Promise"]},
    {title:"Day 2 — Practice Transitions", focus:"Move calmly and quickly between classroom spaces and activities.", read:"A Letter from Your Teacher", routines:["Repractice entering and morning routine","Model and practice table-to-carpet transitions","Teach pencil, paper and supply procedures","Practice partner talk and active listening","Teach recess expectations and line-up","Reflect: What helped our class work as a team?"]},
    {title:"Day 3 — Build Independence", focus:"Students begin completing familiar routines with less teacher prompting.", read:"Oh, the Places You'll Go!", routines:["Students complete arrival routine with visual supports","Introduce classroom jobs","Practice asking for help and solving small problems","Teach early-finisher choices","Practice independent work stamina","Compliment circle and routine reflection"]},
    {title:"Day 4 — Academic Routines", focus:"Learn how reading, writing and math will look without beginning Open Court Unit 1.", read:"Teacher-selected picture book", routines:["Practice whole-group response signals","Model how to use notebooks and folders","Practice turn-and-talk with sentence frames","Introduce math tools and cleanup","Practice reading-center movement","Complete a low-stakes academic readiness activity"]},
    {title:"Day 5 — Review, Celebrate & Reteach", focus:"Strengthen weak routines, celebrate growth and prepare for academics on August 3.", read:"Class favorite reread", routines:["Students demonstrate arrival routine","Reteach the two routines needing most support","Finalize and sign the Class Promise","Practice a full morning transition sequence","Celebrate classroom community growth","Preview Monday: academics begin August 3"]}
  ];
  const esc = s => String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const key = "tos-v1-launch";
  const load = () => { try { return JSON.parse(localStorage.getItem(key) || "{}") } catch { return {} } };
  const save = data => localStorage.setItem(key, JSON.stringify(data));
  function render(ctx={}) {
    const host = document.getElementById("pageHost"); if (!host) return;
    const data = load(); const active = Math.min(5, Math.max(1, Number(data.activeDay || 1))); const day = DAYS[active-1];
    host.innerHTML = `<section class="launch-v1">
      <header class="launch-v1-hero"><div><p>CLASSROOM LAUNCH • JULY 27–31</p><h2>${esc(day.title)}</h2><span>${esc(day.focus)}</span></div><div class="launch-v1-badges"><strong>25 students</strong><span>1 starts August 3</span></div></header>
      <nav class="launch-v1-tabs">${DAYS.map((d,i)=>`<button class="${i+1===active?'active':''}" data-launch-day="${i+1}">Day ${i+1}</button>`).join("")}</nav>
      <section class="launch-v1-grid">
        <article class="panel launch-v1-plan"><div class="panel-heading"><div><span>TODAY'S FOCUS</span><h3>${esc(day.title)}</h3></div><button id="launchPrint" class="secondary-button">Print Day</button></div>
          <p class="launch-focus">${esc(day.focus)}</p><div class="launch-read"><span>READ ALOUD</span><strong>${esc(day.read)}</strong></div>
          <div class="launch-routines">${day.routines.map((r,i)=>`<label><input type="checkbox" data-launch-check="${active}-${i}" ${data.checks?.[`${active}-${i}`]?'checked':''}><span>${esc(r)}</span></label>`).join("")}</div>
        </article>
        <aside class="launch-v1-side">
          <article class="panel"><h3>Daily Non-Negotiables</h3><ul><li>Greet every student by name.</li><li>Model, practice, notice, reteach.</li><li>Keep directions short and visual.</li><li>End with reflection and celebration.</li></ul></article>
          <article class="panel"><h3>Teacher Notes</h3><textarea id="launchNotes" placeholder="What should I remember or reteach?">${esc(data.notes?.[active] || "")}</textarea><button id="saveLaunchNotes" class="primary-button">Save Notes</button></article>
          <article class="panel launch-guardrail"><strong>Academic Guardrail</strong><p>Open Court Unit 1 does not begin before August 3.</p></article>
        </aside>
      </section></section>`;
    host.querySelectorAll("[data-launch-day]").forEach(b=>b.addEventListener("click",()=>{const d=load();d.activeDay=Number(b.dataset.launchDay);save(d);render(ctx)}));
    host.querySelectorAll("[data-launch-check]").forEach(c=>c.addEventListener("change",()=>{const d=load();d.checks=d.checks||{};d.checks[c.dataset.launchCheck]=c.checked;save(d)}));
    host.querySelector("#saveLaunchNotes")?.addEventListener("click",()=>{const d=load();d.notes=d.notes||{};d.notes[active]=host.querySelector("#launchNotes").value;save(d);ctx.toast?.("Launch notes saved.")});
    host.querySelector("#launchPrint")?.addEventListener("click",()=>window.print());
  }
  window.TOS_V1_RENDER_CLASSROOM_LAUNCH = render;
})();
