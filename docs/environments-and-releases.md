# Environments and releases

Implementation now uses React, Vite, TypeScript, Express, PostgreSQL and SMTP. Administrator access is an explicit email allowlist with expiring verification codes; hotel access uses administrator-approved, single-use invitations plus email verification. No Base44 service is used. The authorized initial administrator and notification address is blake@giveholidays.com.

Development runs from the canonical checkout. Optional embedded PostgreSQL persists fictional data in ignored .local; a private test mailbox captures messages locally without external email. Confidential approved CARA wording, uploaded files, private screenshots and local configuration stay outside Git. Vite filesystem access denies these private locations as well as backend and private-build directories.

Staging uses the same application with a separate PostgreSQL database, private file/content paths, secret, test-only mail redirection, and VITE_APP_ENV=staging / APP_ENV=staging. The staging banner is implemented. The staging URL and external services are not yet configured. No payment or fulfillment feature exists.

Production remains the existing FASTPANEL server 162.0.239.71 and giveholidays.com. Server access, verified site/web-root configuration, database service and role, SMTP, malware scanner and HTTPS remain external prerequisites. Current production SHA is unknown; no application release has been deployed. Mail TLS, SMTP/IMAP authentication and VPS mail DNS are verified; see verification/MAIL-INFRASTRUCTURE.md.

The complete production build, packaging, runtime configuration, Nginx/service examples, migration approval, backup/restore and rollback procedures are in docs/DEPLOYMENT.md. Commits and GitHub synchronization never constitute deployment. Exact release approval and passing staging verification are required before production cutover.

Tests and browser evidence are recorded in docs/verification/RESULTS.md. Real PostgreSQL network/service integration, SMTP receipt, scanner behavior and server backup restoration require staging verification; local isolated tests do not substitute for these checks.

