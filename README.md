# TeachingHappensHere

## Version 4.6 — Saved Progress & Personalization Engine

### Upload/add

- `saved-progress.js`
- `style-additions-v4-6.css`
- `service-worker.js`
- `README.md`

### Add this script to `index.html`

Place it after the other viewer scripts and immediately before `</body>`:

```html
<script src="saved-progress.js"></script>
```

### Features

- Saves checklist completion on the current device
- Saves lesson reflections
- Saves communication drafts
- Saves student notes
- Remembers selected lesson, workspace lesson, classroom system, launch day, and Teach My Day block
- Adds a Save Now button
- Adds a Reset Saved Progress control
- Uses browser local storage; no student information is uploaded to a server

### Privacy note

This version saves information only in the browser on the device being used. Avoid entering sensitive student information on shared or unsecured devices.
