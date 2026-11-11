# Give Holidays

Canonical source: `C:\Users\inboxblake\development\CAL\Giveholidays.com`
Official repository: https://github.com/gitbbridge/giveholidays
Owner: Blake

Infrastructure only. Website recreation and CARA implementation await owner approval of this setup.

## Development

Node.js 22 or newer is required. Run `npm ci`, then `npm run check`.
No application features, framework dependencies, or preview server have been created.
The selected frontend direction is React + TypeScript + Vite, subject to setup review; dependencies and application scaffolding follow approval.
Database, authentication, payments, email, and CARA services remain pending requirements and isolated environment configuration.

## Branches

`main` is the production-release branch. `codex/development` is the development branch.
Commits and pushes never deploy the application. Production releases require explicit owner approval.

## Project records

- AGENTS.md: permanent operating rules
- docs/project-governance-original.txt: original owner-supplied guide; the canonical path and repository above supersede its examples
- docs/environments-and-releases.md: environment isolation, deployment, rollback, testing plan
- docs/PROJECT-STATUS.md: continuity and remaining work
- docs/reference/: original approved logo and visual reference, unchanged

Production destination: existing FASTPANEL server at `162.0.239.71`, domain `giveholidays.com`. No hosting or DNS changes are authorized by this setup.
