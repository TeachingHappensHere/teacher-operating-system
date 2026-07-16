
#v1602TeacherIntelligence{max-width:1500px;margin:0 auto}
.v1602-week-row{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px;align-items:end;margin-bottom:10px}
.v1602-week-row label{display:grid;gap:6px;font-weight:700}
.v1602-week-row article span,.v1602-week-row article strong,.v1602-week-row article small{display:block}
.v1602-week-row article span,.v1602-summary span{color:var(--accent);font-size:9px;font-weight:900}
.v1602-week-row article strong{margin:4px 0}.v1602-week-row article small{color:var(--muted)}
.v1602-progress{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin-bottom:10px}
.v1602-progress div{height:10px;overflow:hidden;border-radius:999px;background:#eadfcf}
.v1602-progress b{display:block;height:100%;background:#5c9a63}
.v1602-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:10px}
.v1602-card{display:flex;flex-direction:column;min-height:220px}
.v1602-card.complete{border-top:5px solid #5c9a63;background:#f7fcf5}
.v1602-card>span{color:var(--accent);font-size:9px;font-weight:900}
.v1602-card h3{margin:6px 0}.v1602-card p{color:var(--muted);line-height:1.4}.v1602-card button{margin-top:auto}
.v1602-launch{border-left:6px solid #c9902c;background:#fffaf0;margin-bottom:10px}
.v1602-launch>span{color:var(--accent);font-size:9px;font-weight:900}
.v1602-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.v1602-summary h3{margin:5px 0}
.v1602-rules{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.v1602-rules article{padding:10px;border-radius:9px;background:#fff8ed}
.v1602-rules strong,.v1602-rules span{display:block}.v1602-rules span{margin-top:4px;color:var(--muted)}
@media(max-width:1100px){.v1602-grid{grid-template-columns:repeat(3,1fr)}.v1602-rules{grid-template-columns:1fr 1fr}}
@media(max-width:800px){.v1602-week-row{grid-template-columns:1fr}.v1602-grid,.v1602-summary,.v1602-rules{grid-template-columns:1fr}}
