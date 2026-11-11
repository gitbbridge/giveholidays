# Give Holidays

Canonical source: C:\Users\inboxblake\development\CAL\Giveholidays.com
Official repository: https://github.com/gitbbridge/giveholidays
Owner: Blake. Infrastructure setup approved on 2026-11-11.

React, Vite, TypeScript and independent Node/PostgreSQL backend. Original public website components and CSS were ported from the owner-supplied source ZIP. The official logo remains unchanged; photos are hosted locally. No Base44 application dependency remains.

## Local preview

Requires Node.js >=22.12. Run npm ci. Copy .env.example to .env only if .env does not already exist. In separate terminals run npm run dev:api and npm run dev. Open http://127.0.0.1:5173.

The optional local PostgreSQL engine stores isolated development data in ignored .local/development-db. Without SMTP configuration, notifications remain queued and no email is sent. Production requires an external PostgreSQL service; local storage is disabled in production.

## Checks and build

Run npm run check and npm run build. The build emits dist/ (frontend) and build/server/ (compiled Node backend). Production starts with npm start; building needs development dependencies, while compiled production runtime supports npm ci --omit=dev. Set NODE_ENV=production and all required database/origin/SMTP environment variables. Run npm run migrate after building against the selected database; production migrations require explicit release approval and CONFIRM_PRODUCTION_MIGRATION=approved.

## Project records

Read AGENTS.md, docs/PROJECT-STATUS.md, docs/environments-and-releases.md and docs/master-build-brief.txt before work. See docs/verification/RESULTS.md and the saved screenshot comparison for executed verification. The public source ZIP remains in Downloads; only relevant public components were ported into this application.

main is the protected release branch; codex/development is the development branch. Git commits/pushes never deploy. Production remains the existing FASTPANEL server 162.0.239.71 and giveholidays.com; no DNS or live-server changes have been made.

Confidential CARA requirements and runtime files must remain outside Git because this repository is public. Do not commit local data, secrets, hotel rates, documents, agreement wording or invitation credentials. CARA implementation follows the public website verification checkpoint.
