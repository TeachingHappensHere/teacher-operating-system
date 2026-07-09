async function load(){
  const res = await fetch("attachments-data.json");
  const data = await res.json();

  document.getElementById("buckets").innerHTML = data.resourceBuckets
    .map(bucket => `<div class="bucket">📁 ${bucket}</div>`)
    .join("");

  document.getElementById("lessons").innerHTML = data.lessons.map(lesson => `
    <article class="lesson-card">
      <h3>${lesson.lesson}: ${lesson.title}</h3>
      <div class="lesson-meta">${lesson.unit}</div>
      <div class="attachments">
        ${lesson.attachments.map(att => `
          <div class="attachment">
            <strong>${att.name}</strong>
            <span class="badge">${att.type}</span>
            <p>Status: ${att.status}</p>
            <div class="actions">
              <button class="primary">Open</button>
              <button class="secondary">Print</button>
              <button class="secondary">Preview</button>
            </div>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("");
}
load();
