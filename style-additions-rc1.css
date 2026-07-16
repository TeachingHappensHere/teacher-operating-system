
(async function(){
 const css=document.createElement('link');
 css.rel='stylesheet';
 css.href='style-additions-v4-4.css';
 document.head.appendChild(css);
 try{
   const data=await (await fetch('student-dashboard.json',{cache:'no-store'})).json();
   const page=document.getElementById('students');
   if(!page) return;
   page.classList.remove('placeholder');
   page.innerHTML=`
   <div class="systems-hero">
     <div><p class="eyebrow">Version 4.4</p><h2>Student Dashboard</h2>
     <p>Your classroom at a glance.</p></div>
   </div>
   <div class="panel">
      <select id="studentFilter">
        ${data.filters.map(f=>`<option>${f}</option>`).join("")}
      </select>
   </div>
   <div class="student-grid">
     ${data.sampleCards.map(s=>`
      <article class="student-card">
        <h3>${s.name}</h3>
        <p><strong>Group:</strong> ${s.group}</p>
        <p><strong>Intervention:</strong> ${s.intervention}</p>
        <p><strong>DIBELS:</strong> ${s.dibels}</p>
        <p><strong>Attendance:</strong> ${s.attendance}</p>
        <p><strong>Family:</strong> ${s.familyContact}</p>
        <textarea placeholder="Private teacher notes">${s.notes}</textarea>
      </article>`).join("")}
   </div>`;
 }catch(e){console.warn(e)}
})();
