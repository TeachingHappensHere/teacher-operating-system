# Changelog

## 23.0.0 — Sprint 23 Lesson Engine

- Added explicit **Save Lesson** control.
- Added reliable debounced browser autosave with visible Saving/Autosaved status.
- Added **Duplicate Lesson** to copy the current lesson to another weekday.
- Added confirmed **Delete Lesson** with deleted records retained internally for recovery.
- Added stable lesson IDs, created timestamps, updated timestamps, and schema version 23.
- Added a shared `window.TOS_LESSON_ENGINE` API so Planner, Diamond Board, Classroom Display, and future Teacher Mode use the same lesson records.
- Added programmatic save, read, list, duplicate, delete, backup export, and backup import functions.
- Added lesson-change events (`tos:lesson-model-changed`) for connected modules.
- Updated cache-busting and service-worker cache version.
