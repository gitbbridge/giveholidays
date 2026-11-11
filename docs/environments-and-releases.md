# Environment and release plan

## Selected services

Frontend direction: React, TypeScript, Vite; application scaffolding deferred until setup approval. Hosting: existing FASTPANEL server 162.0.239.71. Domain: giveholidays.com. Hosting site identifier, web root, SSH access, runtime support, TLS, and existing domain mapping have not been inspected. Database, authentication, email, payments, and CARA requirements are undecided. No external services have been provisioned.

## Environment isolation

Development: canonical local checkout, development-only configuration, no production credentials. Node infrastructure check is runnable now.
Staging: URL pending owner selection and access; same release code, separate database/authentication, payment test mode, test-only email and fictional accounts. Implement visible TEST MODE and prevent real charges/fulfillment before workflow testing.
Production: existing FASTPANEL destination and domain above; exact current production commit unknown. No application has been deployed from this repository.

## Testing

Configured now: dependency-free infrastructure integrity and approved-asset SHA-256 checks, runnable locally and in GitHub Actions.
Pending application implementation: TypeScript, lint, unit/integration/API, database/auth/authorization, browser end-to-end and responsive checks, production build. Add payment success/failure/abandonment, signatures, idempotency, refunds and reconciliation if payments enter scope. None of these application tests has been executed.

## Release procedure (pending server verification)

1. Verify canonical directory, clean status, branch, release SHA and GitHub synchronization.
2. Pass applicable isolated staging tests and production build. Expected frontend build command after scaffolding: npm run build; not available yet.
3. Verify actual FASTPANEL site identifier, domain mapping, web root, runtime, environment variable names, TLS, and backups using authorized access. Do not expose credentials.
4. Review exact artifact and changes; obtain explicit owner approval of that SHA and production release.
5. Deploy built artifact from that same SHA to the verified existing site using a server-supported atomic release mechanism, to be confirmed after access. Never create another hosting project or change DNS implicitly.
6. Verify domain, release SHA, routes, authentication and critical workflows. Record result and release SHA.

## Rollback procedure (must be rehearsed in staging)

Retain the prior verified release artifact, SHA and configuration. If release verification fails, stop further releases and restore the previous artifact using the verified server release mechanism; verify domain, SHA and workflows and record the incident. Never use destructive Git resets. Database rollback requires a separately approved backup/migration plan; do not assume restoring application files reverses data changes.
