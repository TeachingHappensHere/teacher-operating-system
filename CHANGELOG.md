# Changelog

## 23.0.0 — Operational Lesson Engine

- Added explicit **Save Now** control.
- Added debounced autosave with visible Saving/Saved status.
- Added **Duplicate Day** for copying one lesson to another weekday.
- Added **Delete Day** with confirmation.
- Added downloadable JSON lesson backups.
- Added a shared `window.TOS_LESSON_STORE` API so planner, Diamond Board, Teacher Mode, print, and future modules can read and write the same lesson records.
- Added storage normalization and save-error handling.
- Updated build and service-worker cache versions.
