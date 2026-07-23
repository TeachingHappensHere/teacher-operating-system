# Changelog

## 24.0.0 — Teacher Dashboard 2.0

- Added a live **Teach Now** card with the current schedule block, countdown, and progress bar.
- Added the next lesson, lesson materials, and saved lesson objective display.
- Added daily priority checkboxes saved by date.
- Added Micah G.’s classroom accommodation reminder panel.
- Added automatic standards display from lessons saved through `TOS_LESSON_STORE`.
- Added quick-launch buttons for core teaching tools and internal workspaces.
- Added a current/full schedule view and date preview control.
- Added responsive layouts for desktop, iPad, and phone.
- Updated the PWA build and service-worker cache to 24.0.0.

## 23.0.0 — Operational Lesson Engine

- Added explicit **Save Now** control.
- Added debounced autosave with visible Saving/Saved status.
- Added **Duplicate Day** for copying one lesson to another weekday.
- Added **Delete Day** with confirmation.
- Added downloadable JSON lesson backups.
- Added a shared `window.TOS_LESSON_STORE` API so planner, Diamond Board, Teacher Mode, print, and future modules can read and write the same lesson records.
- Added storage normalization and save-error handling.
- Updated build and service-worker cache versions.
