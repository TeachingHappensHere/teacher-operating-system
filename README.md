# Teacher Operating System

## Version 15.0.3 — Students & Data Route Recovery

Upload the complete extracted repository to the GitHub repository root.

### Commit message
Version 15.0.3 - Students and Data Route Recovery

### Fixed together
- Intervention
- Assessments & Data
- Students
- Communication

### Repairs
- Registers Student Data and Assessments renderers before data loading.
- Uses persistent route waits instead of one short timeout.
- Keeps Intervention's immediate renderer and strengthens its recovery.
- Gives Communication a dedicated direct renderer.
- Adds a watchdog that retries all four routes after navigation.
- Adds fallback configuration when `tos-data.json` cannot load.
- Updates application and service-worker cache versions.

### Test after deployment
1. Open Intervention.
2. Open Assessments & Data.
3. Open Students.
4. Open Communication.
5. Leave each page open for 20 seconds.
6. Confirm no page stays blank or on a permanent loading screen.
