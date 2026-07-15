# TeachingHappensHere

## Version 12.0.1 — Live Teaching Stability Repair

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

Version 12.0.1 - Live Teaching Stability Repair

## Fixed

Live Teaching was glitching because two separate modules controlled the same route:

- Version 8.0 Live Teaching Timeline
- Version 12.0 Live Teaching Center

This repair:

- removes the complete Version 8.0 Live Teaching controller
- keeps Version 12.0 as the only Live Teaching renderer
- replaces the original legacy Teach My Day screen with a brief loading message
- preserves the Version 12 schedule, timer, notes, completion tracking, and reflection
- forces a fresh service-worker cache
- validates the complete JavaScript and JSON files

## After deployment

1. Wait for GitHub Pages to deploy.
2. Open the site in an incognito/private window.
3. Expand Today and open Live Teaching.
4. Leave the page open for at least 30 seconds.
5. Confirm the page remains stable without switching or flashing.
6. Test Start Teaching Day, the timer, and Complete & Go Next.
7. Hard-refresh the regular browser with Ctrl+Shift+R.
