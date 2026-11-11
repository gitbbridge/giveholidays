# Production deployment verification — 2026-11-11

Owner explicitly approved exact release 1b4540fc1d3dbf310a17bcecad818d82b28fc465, production database initialization, DNS cutover and apex/www SSL. Deployed that unchanged artifact (SHA256 038f976663d08e0e0f3327a1e44c7fd537eac4585364a96276007913a1c898d6) to existing FASTPANEL VPS162.0.239.71, site ID1, canonical https://giveholidays.com.

Runtime: /srv/giveholidays/current points to SHA-named release under /srv/giveholidays/releases. giveholidays.service runs as unprivileged giveholidays user on loopback3001. Separate giveholidays_production PostgreSQL database, migration owner gh_prod_owner and non-owner NOSUPERUSER/NOBYPASSRLS runtime gh_prod_app. Compiled migrations applied under exact-release authorization. Private files/content outside release; root-only configuration /etc/giveholidays/production.env. SMTP admin account configured with business administrator blake@giveholidays.com; no test redirection or staging data in production. Initial database and private configuration backups saved privately on VPS. Legal review remains false.

DNS: apex and www A162.0.239.71 saved in Namecheap; existing mail records preserved. Native HTTP certificate prevalidation failed despite accessible challenge files. Owner created suspended forced-DNS request17; supplied verification records were published and verified against authoritative/public resolvers, then request resumed through FASTPANEL API.

Issued FASTPANEL certificate17 giveholidays.com_2026-11-11-23-26_19, Let's Encrypt YR1, SAN apex+www, expires2027-02-09 22:31:07 UTC. TLS paths in /var/www/httpd-cert retain FASTPANEL ownership. Final TLS/proxy/canonical redirects saved using FASTPANEL's /api/sites/1/configuration interface; manual_changes=true and action=null verified. This persists the proxy in panel configuration, rather than relying only on disk edits. Never reset manual changes or regenerate this site without preserving the saved proxy; doing so can restore the old static placeholder. Saved rollback/original config and live proxy copy in root-only /root/giveholidays-launch-backup.

Verified after final panel save:
- Strict trusted TLS handshake and hostname verification passed for both apex and www.
- HTTP apex, HTTP www, HTTPS www redirect to canonical HTTPS apex.
- /api/health and /api/ready report exact approved SHA; readiness true.
- Home, hotel-partners, admin-entry, access, privacy-policy, terms-and-conditions return200.
- Anonymous cara/admin pages, private assets and private/admin APIs return401; .env and backend-source paths404.
- Browser loads live approved layout, official logo/images; no TEST MODE banner and no certificate warning. Screenshot private at .local/verification/production-live.png.
- Nginx, application, Exim, Dovecot and PostgreSQL active. No fictional production inquiries/hotels inserted. Full write/OTP/proposal/upload/PDF workflow was verified in isolated staging; production checks deliberately read-only.

Operational follow-ups: certificate17 currently force_dns_validation=true. DNS challenges are order-specific; these TXT values cannot authorize future renewals. Renewal requires fresh DNS validation records or configuring and verifying an automated renewal method before expiry. Do not claim unattended renewal verified. Scheduled encrypted off-server backups remain pending; initial on-VPS backup and isolated staging restore are verified. Historical Namecheap messages remain unmigrated. Legal review remains pending. Current VPS is961 MiB RAM plus2 GiB swap; no concurrency load test claim.

Application release is1b4540fc1d3dbf310a17bcecad818d82b28fc465; later repository commits document infrastructure only. Staging remains isolated at staging.giveholidays.com. Rollback: restore retained prior site configuration if needed, validate nginx before reload, and stop/repoint application as appropriate; do not restore databases or delete live data as part of a file-only rollback.
