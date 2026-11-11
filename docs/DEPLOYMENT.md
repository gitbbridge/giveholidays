# Production and staging deployment

The existing approved destination is FASTPANEL VPS 162.0.239.71, giveholidays.com. No server change has been made. All paths in ops/*.example must be replaced with verified paths from that existing site. Do not create a duplicate hosting project or overwrite FASTPANEL-managed TLS configuration.

## Artifact

After a clean committed checkout passes npm run check, run npm run release:package. It rebuilds both frontends and the compiled Node server, scans public output for private content, and creates a SHA-addressed tar.gz plus checksum in ignored .local/releases. Packaging refuses an uncommitted tree or overwriting an existing release folder.

The artifact contains dist/, build/server/, build/private/, the unchanged official logo used by PDF generation, package manifests and release.json. It contains no .env, supplier data, private approved content, uploaded documents, source requirement files or test mailbox. Unpack releases outside every publicly served web root. Deploy the artifact from this canonical repository; the server directory is a release artifact, not another development source. Ensure no existing Nginx static-file regex or alias bypasses backend authorization for private assets; the example uses a ^~ proxy location for this reason.

## Persistent configuration

Use an unprivileged application service user, Node.js >=22.12, and a separate PostgreSQL database. Keep database data, documents, private content and secrets outside versioned release folders. The runtime PostgreSQL role must be a non-owner, non-superuser, without BYPASSRLS; production startup refuses privileged roles. Use separate migration-owner credentials, then grant only required table operations and schema usage to the runtime role. Do not expose PostgreSQL to the public internet.

Required production variables: NODE_ENV=production, APP_ENV=production, PUBLIC_ORIGIN=https://giveholidays.com, PORT=3001, DATABASE_URL, PRIVATE_SECRET, ADMIN_EMAILS=blake@giveholidays.com, ADMIN_EMAIL=blake@giveholidays.com, CARA_CONTENT_PATH, PRIVATE_DOCUMENT_DIR, SMTP_HOST, SMTP_PORT, SMTP_SECURE, MAIL_FROM; SMTP_USER and SMTP_PASSWORD when required. Set CLAMSCAN_PATH to the verified scanner executable. PRIVATE_SECRET must decode to exactly 32 random bytes and must be preserved for encrypted notification jobs and challenge verification. Store it outside Git and back it up through the approved secret store.

The approved private CARA content is currently prepared at .local/private-content/cara.json. Transfer it securely to the private persistent content path; never place it in dist/, public/, the artifact, or the public repository. Retain the original ignored requirements document and this private JSON in encrypted business backups. No actual wording or projections are stored in public code or configuration.

Never set TEST_MAIL_DIR or LOCAL_DATABASE_DIR in production. Production startup rejects test mailbox capture. Staging must use APP_ENV=staging, VITE_APP_ENV=staging during the build, a separate database/secret/document directory, and EMAIL_REDIRECT_TO pointing to a test-only mailbox. A staging banner is displayed, and email is forcibly redirected. No payment or fulfillment capability exists.

LEGAL_REVIEW_APPROVED remains false until counsel approves the actual contractual template. The administrator cannot move proposals to Approved for Signature or Executed while false. Executed additionally requires a scanned existing executed agreement plus explicit confirmation of both parties' execution. No signatures or contract acceptance are generated automatically.

## Server preparation and rehearsal

1. Verify SSH/FASTPANEL access, the existing site ID, web root, application service user, Nginx configuration, domain associations and current release. Obtain an isolated staging URL and verify its TLS.
2. Provision isolated staging PostgreSQL and SMTP/test recipient. Install current ClamAV definitions and verify real malware/clean-file behavior. Without a scanner, uploads are quarantined and cannot be downloaded or submitted as accepted upload proposals. Scanner flags follow the official ClamAV manual: https://docs.clamav.net/manual/Usage/Scanning.html and https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamscan.1.in
3. Verify artifact checksum, unpack into a new release directory named for its SHA, install locked production dependencies with npm ci --omit=dev, and configure a service using ops/giveholidays.service.example with the verified paths. Do not overwrite an existing release or persistent data.
4. Back up the database and private documents. Apply compiled migrations with npm run migrate using separate migration-owner credentials. Production requires explicit migration approval and CONFIRM_PRODUCTION_MIGRATION=approved. Migrations run transactionally with a database advisory lock and are not run automatically on application start.
5. Merge the reviewed Nginx location snippet into the existing FASTPANEL site. Forward requests to the loopback-only application. Preserve FASTPANEL's certificate blocks and email DNS. Redirect www to the canonical apex HTTPS origin so strict Origin validation remains consistent.
6. Verify /api/health reports the intended release SHA and /api/ready reports database readiness. Repeat public forms, real test email receipt, invitations, revocation/expiry, hotel isolation, uploads/scans/downloads, PDFs, administrator workflows and backup restore against staging. Local tests are not substitutes for these external checks.

## Production release and rollback

Before switching production: verify the exact committed SHA and remote synchronization, passing CI/build/staging results, destination, persistent configuration, backups and rollback artifact; review the concrete change and obtain explicit owner approval of that SHA. Switch the verified current release pointer atomically using the server's existing supported release method, then restart the application service. Retain the old artifact and configuration. Never mutate production data as a test.

Verify HTTPS apex and www, the reported release SHA, public routes, form/email receipt and private access boundaries. Do not disable the old live site or change routing before target verification and owner approval. If verification fails, stop further releases, restore the prior release pointer/artifact and configuration, restart and verify again. Never use a destructive Git reset as rollback. Database restore is a separate approved operation; restoring application files does not reverse data changes.

Proposed eventual DNS target is the already approved server, but exact DNS changes require inspection of current records and verified target operation first. Preserve existing email records. Use FASTPANEL Let's Encrypt after routing is correct; verify both hostnames and renewal rather than assuming success.

## Backups and restoration

ops/backup.sh uses a private PostgreSQL service configuration instead of command-line credentials and saves a custom-format database backup plus the private document archive and checksums. Protect local backups with restrictive permissions, encrypt before off-server transfer, and back up the encryption secret and approved content separately. Schedule against the verified host only after operational approval; monitor failures and storage capacity.

ops/restore-test.sh refuses any database except an explicitly selected empty giveholidays_restore_test database. It verifies checksums and restores without deleting existing data. Restore documents separately to a test-only directory and compare each database sha256 with its file; verify versions, rates, access control and PDF downloads. Never run the restore rehearsal against production. A local embedded PostgreSQL snapshot/restore is tested; an actual server pg_dump/pg_restore rehearsal remains pending.
