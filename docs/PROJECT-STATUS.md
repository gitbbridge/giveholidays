# Continuity — 2026-11-11

Canonical directory: C:\Users\inboxblake\development\CAL\Giveholidays.com
Official repository: https://github.com/gitbbridge/giveholidays
Development: codex/development. Resolve current SHA with git rev-parse HEAD.
Production commit: unknown; nothing deployed from this repository.

Blake explicitly approved infrastructure setup and reconfirmed the canonical directory. Approved logo and full-page screenshot remain unchanged in docs/reference/. The website recreation uses the owner-supplied give-vacation-good.zip public source components and CSS, ported to independent React/Vite/TypeScript. No Base44 API/runtime/authentication/media dependency remains.

Completed public checkpoint: full page, responsive navigation, local original images, Gather mark, hotel inquiry page, supplied privacy/terms pages, independent inquiry API, PostgreSQL SQL schema, notification outbox, local preview storage, isolated tests, production build and screenshot comparison. The privacy storage-provider paragraph was updated for independent PostgreSQL hosting.

Verification: see docs/verification/RESULTS.md. Visual review remains available through the side-by-side artifact. Exact pixels are not claimed. No real SMTP or production PostgreSQL integration has been verified. No staging or production deployment, backup restore, DNS, or HTTPS verification has been performed.

Approved CARA requirements are supplied at the project root as GiveHolidays_CARA_Approved_Requirements.txt. This confidential file is ignored by Git. Its later security update supersedes public-form language: only general partnership inquiries are public; guidance, agreement forms and documents require server-enforced authorization. The master brief requires website verification before CARA. Private implementation is next. Never embed confidential CARA content into public frontend assets or the public repository.

Initial administrator email is awaiting owner specification. Production server, isolated database, staging URL, and SMTP access/configuration remain pending. Preserve this public recreation while implementing the private portal.
