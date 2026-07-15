# Teacher Operating System

## Version 15.0.2 — Small Groups Startup Repair

Upload the complete extracted repository to the GitHub repository root.

### Commit message
Version 15.0.2 - Small Groups Startup Repair

### Fixed
- Registers Small Groups and Intervention renderers immediately.
- Prevents data-loading problems from leaving a permanent loading screen.
- Validates and repairs malformed saved group-plan data.
- Repairs invalid saved day or group selections.
- Uses a built-in fallback group configuration when `tos-data.json` cannot load.
- Keeps the correct Red, Yellow, Green, Blue hierarchy.
- Adds direct startup diagnostics and route recovery.
- Updates the application and service-worker cache versions.

### Test
1. Open Small Groups.
2. Confirm the Small-Group & MOWR Center appears instead of the loading screen.
3. Confirm group tabs display Red, Yellow, Green, Blue.
4. Select each group and each weekday.
5. Save a test group plan.
6. Open Intervention and confirm it also loads.
