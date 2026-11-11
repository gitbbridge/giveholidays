# Project continuity — 2026-11-11

Canonical directory: C:\Users\inboxblake\development\CAL\Giveholidays.com
Official repository: https://github.com/gitbbridge/giveholidays
Development branch: codex/development. Current SHA: git rev-parse HEAD.
Production SHA: unknown; no deployment from this repository.

## Authorization and protected source

Blake approved infrastructure setup and reconfirmed the canonical directory. The public recreation was completed and visually verified before CARA implementation. Public checkpoint commit: 5cae05cd10ee4601cf2d3c491f75854b40948b79. Preserve its design and source wording. The original logo and screenshot remain unchanged, with checksums enforced. The owner-supplied source ZIP supplied the public components, exact Arial styles and original photos.

The approved CARA requirements are GiveHolidays_CARA_Approved_Requirements.txt in the project root, ignored because this repository is public. SHA-256: 663b573de30bb9a353d64cc05b251596737fcab0575534b34c6697e001ba9d1d. The later security update requires private invitations; earlier public CARA form instructions are superseded. Actual approved messages and clause checklist are prepared in ignored .local/private-content/cara.json. Do not publish them in Git, public bundles, static assets, screenshots or release archives.

## Implemented

Public site: faithful source port, responsive navigation, locally hosted original photos and unchanged logo, Gather relationship, public hotel inquiry, supplied legal routes, metadata/sitemap, independent form API and transactional notification outbox.

Private system: email-verified administrator allowlist (initial blake@giveholidays.com), cryptographically secure expiring single-use hotel invitations, email challenges, revocation, hashed server sessions, HttpOnly/SameSite cookies, CSRF/origin checks, role authorization, hotel isolation and forced database row-level policies. Private frontend assets are built separately and served only after authorization.

CARA: upload and guided online options; property/contact/room fields; all four seasonal rate structures with date ranges and room-specific values; allocations with explicit units; unavailable versus restricted dates and recurrence; booking, payment, cancellation, amenities and breakfast options; private approved messaging and proposed clauses; autosaved versioned drafts; editable review; immutable submission snapshots; branded proposal PDFs; no automatic signature/acceptance. Administrator review, invitation controls, notes, revision requests, statuses, private document/PDF downloads, contract export and audit records are implemented. Approval for signature/execution is blocked pending legal approval, and execution additionally requires scanned existing executed evidence plus explicit confirmation.

Security/operations: file signatures and size limits, private persistent storage, quarantine and ClamAV integration, encrypted notification jobs/retries, separate local test mailbox, transactional migrations, build privacy check, release packaging with exact SHA, readiness/version reporting, service/Nginx examples, backup and isolated restore scripts, rollback procedure.

## Verification and limits

See docs/verification/RESULTS.md. Local compile, lint, build, isolated security/SQL/notification tests, backup restore, browser public forms and a full private 12-step fictional proposal/PDF walkthrough were executed. Private evidence remains ignored in .local/verification. There is no production-ready or live claim.

The production PostgreSQL service/role/migrations, actual SMTP receipt, real malware scanner, staging domain/isolation, server backup restoration, FASTPANEL/Nginx/TLS, and DNS routing remain unverified. Legal review is not approved; LEGAL_REVIEW_APPROVED=false. Full audit reports development-tool minimatch advisories; production dependency audit is clean.

## Next task

Owner review of the website and portal preview; obtain authorized SSH/FASTPANEL access and SMTP details (requested asynchronously), inspect the existing destination, configure isolated staging and run external integration checks. Only after those pass should a concrete exact-SHA production release be proposed for approval. Do not change DNS or disable the old live site prematurely.

## Mail infrastructure update — 2026-11-11

SSH access verified. VPS mail certificate installed and admin@giveholidays.com created; existing blake mailbox preserved. TLS and SMTP/IMAP authentication passed without sending mail. Owner authorized full VPS MX migration, but Namecheap browser automation failed even after window restoration; DNS still routes inbound mail to Private Email. See verification/MAIL-INFRASTRUCTURE.md for completed checks, pending DNS records and rollback. Website/staging deployment remains pending; no repository release is live.

## Mail DNS migration completed — 2026-11-11

Supersedes the preceding browser blocker: owner opened Namecheap in the in-app browser. Custom MX now points to mail.giveholidays.com; VPS SPF, matching dkim selector and non-enforcing DMARC published. All records verified on both authoritative nameservers and 1.1.1.1. Existing VPS blake mailbox and historical Namecheap mail retained. End-to-end message delivery and historical mail migration remain pending. No website release deployed.

Mail delivery test: owner-authorized message reached blake@auctionintel.us and owner confirmed receipt. SMTP 587 TLS and unauthenticated relay rejection passed from local computer. Recipient is hosted on same VPS; external-provider delivery remains untested. Port 25 timed out from local computer; inbound reply not yet found. See mail verification report for exact scope and limits.

Return-path update: the owner's reply is now verified in admin@giveholidays.com INBOX, matching the original test Message-ID. Bidirectional mail test passed via authenticated SMTP and read-only IMAP. Roundcube UI not tested; off-server delivery remains unverified.
