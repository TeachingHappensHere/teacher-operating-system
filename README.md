# TeachingHappensHere

## RC1 — Classroom Launch Candidate

RC1 replaces the visible legacy Version 3.2 Classroom Launch entry with one Release Candidate launch path.

### Upload/add

- `release-candidate-rc1.json`
- `release-candidate-rc1.js`
- `style-additions-rc1.css`
- `service-worker.js`
- `README.md`

### Add this script to `index.html`

Place it after `classroom-launch-v6-0.js` and immediately before `</body>`:

```html
<script src="release-candidate-rc1.js"></script>
```

### Commit message

`RC1 - Classroom Launch Candidate`

### RC1 changes

- Hides the visible Version 3.2 Classroom Launch navigation entry
- Hides the old Version 3.2 launch page
- Creates one RC1 Classroom Launch button
- Creates one RC1 dashboard banner
- Routes Monday Planning and First Day into Version 6.0
- Adds a clearly visible Health tab
- Highlights Health inside Version 6.0
- Adds script and JSON health checks
- Checks core navigation controls
- Consolidates the service worker cache
- Keeps the existing modules and saved browser data intact
- Keyboard shortcut for Health: `Ctrl/Command + Shift + H`

### After deployment

1. Hard refresh the GitHub Pages site.
2. Open `RC1 Classroom Launch` in the sidebar.
3. Select `Health`.
4. Confirm all checks pass.
5. Open `Monday Planning`.
6. Test Weekly Planner, Unit 1, Daily Command Center, Calendar, and Reminders.
7. Test once on desktop and once on iPad.

### Important

RC1 hides the old launch interface at runtime rather than deleting the older source code. Permanent source cleanup should happen after RC1 passes testing.
