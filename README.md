# TeachingHappensHere

## Version 11.2.1 — Navigation Stability Repair

This is a full replacement repair release.

## Upload all nine files

- index.html
- app.js
- style.css
- service-worker.js
- tos-data.json
- manifest.json
- icon-192.svg
- icon-512.svg
- README.md

## Commit message

Version 11.2.1 - Navigation Stability Repair

## Fixed

The Planning section flashed open and closed because older Version 8.5 and Version 9.0 navigation controllers were still running alongside Version 11.

This release:

- removes the complete Version 8.5 navigation controller
- removes the complete Version 9.0 navigation controller
- keeps Version 11 as the only sidebar controller
- preserves Workflow Hub and all Version 11.2 features
- disables navigation animations that could look like flickering
- forces a fresh service-worker cache

## After deployment

1. Wait for GitHub Pages to deploy.
2. Open the site in an incognito/private window.
3. Expand and collapse Planning several times.
4. Confirm it stays open or closed without flashing.
5. Open Workflow Hub and verify the one-click weekly workflow.
6. Hard-refresh the regular browser with Ctrl+Shift+R.
