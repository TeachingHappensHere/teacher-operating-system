# TeachingHappensHere

## Version 4.7 — Universal Search & Command Center

### Upload/add

- `universal-search.js`
- `style-additions-v4-7.css`
- `service-worker.js`
- `README.md`

### Add this script to `index.html`

Place it after `saved-progress.js` and immediately before `</body>`:

```html
<script src="universal-search.js"></script>
```

### Features

- Searches lessons, vocabulary, phonics, and reading skills
- Searches classroom routines and anchor-chart content
- Searches Teacher Brain notes
- Searches resources and attachment status
- Searches assessments and reteach areas
- Searches small groups and intervention tools
- Searches communication templates
- Searches Teach My Day, Classroom Launch, and planner items
- Opens the correct operating-system section from a search result
- Keyboard shortcut: `Ctrl + K` on Windows or `Command + K` on Mac/iPad keyboard

### Notes

The search engine reads the JSON files already in the repository. Missing optional files are ignored instead of breaking the application.
