# TeachingHappensHere

## Version 13.0 — Stable Application Framework & Route Registry

This is a full replacement release. Upload all nine files together.

### Files
- index.html
- app.js
- style.css
- service-worker.js
- tos-data.json
- manifest.json
- icon-192.svg
- icon-512.svg
- README.md

### Commit message
Version 13.0 - Stable Application Framework and Route Registry

### What changed
- One central registry recognizes every application route.
- Valid feature routes no longer fall back to Dashboard or Forms.
- Print Center has the permanent route `print-center`.
- Forms & Printables remains on the separate route `forms`.
- The original router displays a neutral loading shell while the dedicated feature module opens.
- Navigation, Dashboard, Workflow Hub, and Health handoffs use the correct Print Center route.
- A framework health check reports registered routes and runtime errors.
- A fresh service-worker cache is included.

### Test after deployment
1. Open the site in an incognito/private window.
2. Expand Resources & Administration.
3. Confirm both Print Center and Forms & Printables appear.
4. Open Print Center.
5. Confirm the title is “Print Center & Weekly Packet Queue.”
6. Confirm “Import from Attachments” appears.
7. Open Forms & Printables and confirm its printable cards still appear.
8. Leave each page open for at least 30 seconds to confirm stability.
