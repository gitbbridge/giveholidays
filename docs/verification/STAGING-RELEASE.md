# Staging verification and proposed production release — 2026-11-11

Proposed application release: 1b4540fc1d3dbf310a17bcecad818d82b28fc465 (verified synchronized on origin/codex/development). Artifact SHA-256: 038f976663d08e0e0f3327a1e44c7fd537eac4585364a96276007913a1c898d6. Source tree was clean before packaging. Documentation commits after this SHA do not change application behavior.

Verified destination: existing FASTPANEL VPS 162.0.239.71, existing apex site ID1, owner giveholidays_usr. Original Nginx configuration saved privately in /root/giveholidays-launch-backup. Production application is not running; apex/www DNS and production database unchanged.

Server preparation: official Node.js v22.23.5 Linux binary verified against vendor SHA-256; installed at /opt/giveholidays-node. PostgreSQL 16 installed and bound only to IPv4/IPv6 loopback. ClamAV 1.5.4 installed with definition version 28180; freshclam service enabled. Clean fixture accepted and EICAR fixture detected. VPS has 961 MiB RAM plus 2 GiB swap; scanner and application ran successfully during staged upload testing. Capacity under concurrent real traffic is not load-tested.

Staging URL: https://staging.giveholidays.com, FASTPANEL site ID12 with valid Let's Encrypt TLS. Same release with only staging public build environment flag; visible TEST MODE banner. Noindex header, HTTP-to-HTTPS redirect, ^~ proxy preventing static regex bypass. Unprivileged giveholidays-staging systemd service on loopback3002. Database giveholidays_staging with distinct migration owner and non-owner NOSUPERUSER/NOBYPASSRLS runtime role. Separate secret/content/documents paths. All email redirected to dedicated staging-test mailbox; no messages sent to fixture addresses.

Executed checks:
- npm run check: infrastructure/assets, TypeScript, lint and all27 tests passed; production build and public/private bundle boundary scan passed.
- HTTPS health/readiness report expected SHA and database ready.
- Browser website rendering and contact submission passed; success state visible. Public inquiry outbox marked sent, test mailbox delivery verified with Dovecot. Screenshot .local/verification/staging-website.png remains private.
- HTTPS administrator OTP and two hotel invitation/OTP flows passed with real SMTP outbox delivery.
- Anonymous private page/API/asset rejection; hotel isolation; hotel rejection from admin APIs; invitation/session revocation passed.
- Complete fictional draft with four seasonal rate structures submitted as immutable proposal. Branded PDF generated; cross-hotel PDF access rejected.
- Real ClamAV PDF upload accepted clean; downloaded bytes equal uploaded PDF; cross-hotel document access rejected.
- Legal review gate correctly rejects signature approval with HTTP409. Initial test harness expected403 incorrectly; corrected gate check passed separately. No application change was needed.
- Actual pg_dump/pg_restore into isolated giveholidays_restore_test passed (snapshot held1 agreement version and4 seasonal rate records). Private documents archive created. Snapshot preceded the second upload test; it does not include that later test document.

Prepared production artifact: /srv/giveholidays/releases/1b4540fc1d3dbf310a17bcecad818d82b28fc465 with locked production dependencies; private approved content/documents outside release. No live service/current pointer initialized. Legal review remains false.

Proposed cutover after exact-SHA approval: initialize isolated production owner/runtime roles/database and compiled migrations; generate production secrets and root-only environment with existing admin SMTP account and business administrator blake@giveholidays.com; start unprivileged loopback3001 service; verify before routing; set apex/www A records to162.0.239.71 preserving mail records; issue FASTPANEL apex/www Let's Encrypt certificate; merge guarded proxy into existing site and canonical HTTPS redirect; verify release, readiness, public routes and private boundaries externally. Retain prior configuration and artifact for rollback. No production test fixture data.

Pending: explicit owner approval of this exact SHA before production DB/deployment/DNS cutover; actual production verification and scheduled encrypted off-server backup configuration. Historical Namecheap mail migration and Gmail inbox-placement confirmation are separate from application release.

## Disk cleanup — 2026-11-11

Owner authorized purging unnecessary storage. Audited VPS and canonical project. Rotated journals and removed archived system journals older than14 days using journalctl; cleared apt download cache and root npm cache using native cache commands. Filesystem used bytes decreased from10,845,757,440 to9,119,719,424 (1,726,038,016 bytes recovered); usage55% to46%, available10,795,253,760 bytes. Journals now126.7 MiB. Retained application releases, configuration, backups, mail, databases, approved assets, scanner definitions and local development dependencies. Nginx, Exim, Dovecot, PostgreSQL and staging service all active; HTTPS staging readiness passed with intended release SHA. Local ignored test-folder deletion was blocked by execution policy before execution; folders preserved. Production release approval remains pending; no production cutover performed.
