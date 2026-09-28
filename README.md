# Cycafe website

Static CSC dashboard with browser-local photo, signature and PDF tools. Account data uses Firebase Authentication, Firestore and Storage.

## Develop and preview

Requires Node.js 24 and Python 3.

```sh
npm ci
npm test
npm run build
npm start
```

Open http://localhost:8080. Rebuild after changing HTML or JavaScript so Tailwind discovers any new utility classes. `assets/utilities.css` is committed so a simple static server at the repository root also works without a build.

Navigation uses hash URLs (for example `/#/services`), supporting refresh, bookmarks and deployments under a repository subdirectory without server rewrites. Private workspaces prompt for login. Photo/PDF processing stays in the browser; PDF engines load on the first file operation and require connectivity then. Icons and Firebase also require connectivity. The local chat assistant uses bundled guidance; optional external models require user-supplied provider keys.

## Deploy

The existing GitHub Pages workflows publish the repository root. Compiled `assets/utilities.css` is committed, so this site works with that deployment without installing dependencies in CI. Run `npm test` and `npm run build` before committing changes to utility classes.

The local build also creates an allowlisted `dist/` directory that excludes backups, local scripts, tests and Firebase rules. Switching Pages to publish only `dist/` and consolidating the existing workflows requires a GitHub credential with workflow permissions; those workflow changes are not included in this branch. Keep canonical and sitemap URLs aligned if the public domain changes.

Firebase rules are deployed separately to your configured project using `firebase deploy --only firestore:rules,storage`. The PAN application feature requires both rules: records are under `users/{uid}/panApplications`, and attachments under `users/{uid}/pan-applications/{applicationId}/{fileName}`. Ownership checks restrict access to the operator; attachments allow JPG, PNG, WEBP or PDF up to 5 MB. No production deployment is performed by the build.

## Verification

`npm test` covers routing, auth gates, safe chat formatting and storage failure handling. Browser verification should cover all routes at mobile and desktop widths, modal keyboard navigation, photo processing and PDF import/export. Signed-in database and upload operations require a separate authorized test Firebase environment; unit tests do not establish that production rules are deployed.
