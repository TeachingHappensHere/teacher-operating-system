# Teacher Operating System

## Version 15.0 — Core Refactor & Stabilization

This package contains the complete repository. Extract it and upload all contents to the GitHub repository root.

### Commit message
Version 15.0 - Core Refactor and Stabilization

### Repairs included
- Permanently removes the obsolete Assessment Decision Center page.
- Makes Version 14.2 Assessments & Progress Monitoring the only assessment renderer.
- Adds a persistent module-loading check instead of an 80-millisecond one-time handoff.
- Cache-busts `app.js` and `style.css` with Version 15 query parameters.
- Uses network-first loading for core application files.
- Migrates existing local reading groups:
  - Red = far below level
  - Yellow = below level
  - Green = benchmark
  - Blue = above level / highest group
- Migrates saved student group assignments and teacher-table plan keys.
- Preserves browser-saved student, assessment, intervention, planning, attachment, and print data.
- Adds framework route diagnostics.

### First deployment test
1. Wait for GitHub Pages to finish deploying.
2. Open the site in a private/incognito window.
3. Open Assessments & Data.
4. Confirm the title is **Assessments & Progress Monitoring**.
5. Confirm **Build Screening Checklist** appears.
6. Open Small Groups and verify the order is Red, Yellow, Green, Blue.
7. Confirm Blue is identified as above level and Green as benchmark.
8. Test Print Center, Live Teaching, Students, Small Groups, Intervention, and Assessments.
9. Hard-refresh the regular browser with Ctrl+Shift+R.
