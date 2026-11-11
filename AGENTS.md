# Permanent project operating rules

Project: Give Holidays. Owner: Blake.
Canonical development directory: C:\Users\inboxblake\development\CAL\Giveholidays.com
Official repository: https://github.com/gitbbridge/giveholidays
Production: giveholidays.com on existing FASTPANEL server 162.0.239.71.

Read README.md, docs/PROJECT-STATUS.md, docs/environments-and-releases.md, and docs/project-governance-original.txt before work. The owner's latest explicit canonical path and repository supersede example paths in the original guide.

Before every coding task verify directory, branch, HEAD SHA (or unborn state), working-tree status, and requested scope. Stop if the source is ambiguous. Announce branch changes. Preserve uncommitted changes.

Maintain one canonical application and one official repository. Never use this chat's empty workspace or deployment checkouts as another application source. Never reset, force-push, delete work, overwrite approved work with older versions, or create duplicate application repositories without explicit authorization.

Preserve approved designs, functionality, terminology, and unrelated modules. Make localized changes and reuse components. No unsolicited redesigns, features, unrelated refactors, or automatic regeneration of approved sections. Architectural changes outside scope require authorization.

Use docs/reference/approved-logo.png unchanged; docs/reference/approved-website.png is the approved recreation reference. Preserve original files. Do not generate alternate branding.

Development occurs on codex/development or a disclosed codex/ task branch. main is the protected production-release branch. Never silently switch branches. Never stage unrelated files.

For completed work: inspect source, implement only requested scope, run relevant checks, inspect changed files, commit, record SHA in the verification report, report uncommitted changes, and push only to an authorized branch. GitHub synchronization never constitutes deployment.

Use one codebase with isolated development, staging, and production configurations. Keep secrets and credentials out of Git. Never mutate production databases in tests. Staging must use isolated data/auth, test payments, safe email, fictional records, a visible TEST MODE indicator, and no real fulfillment.

Do not change hosting destinations or DNS without authorization. No production deployment without explicit owner approval of the exact release. Verify staging, build, remote synchronization, target, and configuration before release; verify actual production commit/routes and critical workflows afterward. Follow the documented rollback process if verification fails.

Never claim unexecuted tests passed or an unverified release is live. Maintain docs/PROJECT-STATUS.md with completed work, outstanding tasks, known defects, test results, production state, and next authorized task. Connect approved features to implementation commits. Update these operating rules only when the owner explicitly approves changes.

Lifecycle: Verify source -> Implement -> Test -> Commit -> Preview -> Approve -> Deploy -> Verify.
Infrastructure setup was reviewed and approved by Blake on 2026-11-11. The canonical folder was explicitly reconfirmed. Follow docs/master-build-brief.txt for the authorized sequence: website recreation, visual verification, then CARA implementation. Use the separately supplied approved CARA wording and clause requirements; do not invent replacements.

This GitHub repository is public. Never commit actual supplier rates, agreements, private approved CARA guidance, original confidential requirements, private screenshots, test mailboxes, session/invitation credentials, or secrets. Keep them in ignored private storage and production persistent directories outside release artifacts. Serve private frontend assets and every private API only after backend authorization. Keep Vite filesystem access blocked for private/source-server/build/configuration directories as well.
