# TeachingHappensHere

## Version 4.9 — Backup, Export & Device Transfer Center

### Upload/add

- `backup-export.js`
- `style-additions-v4-9.css`
- `service-worker.js`
- `README.md`

### Add this script to `index.html`

Place it after `app-health.js` and immediately before `</body>`:

```html
<script src="backup-export.js"></script>
```

### Commit message

`Version 4.9 - Backup Export and Device Transfer`

### Features

- Downloads a full JSON backup of TeachingHappensHere browser data
- Imports that backup on another computer, iPad, or browser
- Preserves saved notes, drafts, checklists, and current selections
- Downloads a readable status report without exposing full saved note content
- Shows saved record counts and browser-storage size
- Shows the current saved location in the operating system
- Clears only saved progress or all app browser data
- Does not delete or modify GitHub repository files
- Shortcut: `Ctrl + Shift + B` or `Command + Shift + B`

### Privacy

The JSON backup may contain saved notes and drafts. Store it in a private location and do not share it publicly.
