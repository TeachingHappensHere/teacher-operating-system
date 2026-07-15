# Mrs. Parrish’s Teacher Operating System

## Version 13.1 — Direct Renderer Integration Fix

This release was repaired directly from the currently deployed GitHub repository.

### Fixed
- The central router now calls the Version 12.2 Print Center renderer directly.
- Print Center uses the permanent `print-center` route.
- Forms & Printables remains on the separate `forms` route.
- The older Forms page heading now correctly says **Forms & Printables** instead of **Print Center**.
- The obsolete Print Center route bridge was removed.
- A fresh service-worker cache is included.

### Upload
Upload the complete contents of this repository ZIP to the GitHub repository root. Existing supporting files are preserved.

### Commit message
`Version 13.1 - Direct Print Center Renderer Integration`

### Test
1. Open the deployed site in an incognito/private window.
2. Open **Resources & Administration → Print Center**.
3. Confirm the title is **Print Center & Weekly Packet Queue**.
4. Confirm **Import from Attachments** is visible.
5. Open **Forms & Printables** and confirm its title is **Forms & Printables**.
