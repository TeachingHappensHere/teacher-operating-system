# Emergency Restore — Version 8.3

This repair restores the last verified working application after the Version 9.0 JavaScript failure.

## Replace these files

- app.js
- style.css
- service-worker.js
- tos-data.json
- README.md

## Commit message

Emergency Restore - Return to Verified Version 8.3

## Important

This repair does not erase local browser data. Version 9 local-storage records may remain in the browser, but Version 8.3 will ignore them.

## After deployment

1. Wait for GitHub Pages to finish deploying.
2. Open the site in an incognito/private window.
3. Confirm that the dashboard loads.
4. In the normal browser, press Ctrl+Shift+R.
5. If the normal browser is still blank, clear only the site's cached files or unregister its service worker, then reload.
