SPRINT 2A ROSTER RECOVERY — v18.2.2

Replace these three files in the root of the GitHub repository:
- sprint2a-student-center.js
- index.html
- service-worker.js

What this fixes:
- Automatically recovers students stored by earlier TOS versions.
- Checks both thh-v7:state and thh-v55:student-support-profiles.
- Deduplicates students by name.
- Preserves reading groups where possible.
- Keeps all student data local to the browser.

After deployment:
1. Wait for GitHub Pages to finish publishing.
2. Close every open TOS tab.
3. Reopen the TOS and refresh once.
4. Open Students. Earlier students should be restored automatically.

Do not clear browser site data before confirming recovery, because the old roster is stored there.
