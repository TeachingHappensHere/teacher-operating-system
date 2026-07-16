# Teacher Operating System

## Version 16.4.1 — Science Tab Stabilization

### Commit message
Version 16.4.1 - Fix Science Studio Tab

### Fixed
- Science tab flashing and returning to Writing
- Duplicate afternoon-studio renderer conflict
- Selected studio persists in local storage
- Writing, Science, and Social Studies tabs use explicit button behavior
- Tab clicks no longer bubble into competing handlers
- Active-tab focus and selected-state styling

### Test
1. Open Writing, Science & Social Studies Daily Studios.
2. Select Science.
3. Confirm the Science workspace remains open.
4. Select Social Studies and then Writing.
5. Return to Science.
6. Refresh while Science is selected and confirm Science remains selected.
