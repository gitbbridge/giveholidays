# Verification — public website checkpoint, 2026-11-11

Executed: protected original/published logo hash checks; TypeScript and ESLint; Vite production build and compiled Node backend build. Eight isolated HTTP/PostgreSQL/email-transport tests passed covering transactional persistence, validation/spam/origin controls, partnership fields, SQL parameterization, anonymous read denial, request/rate limits, notification delivery state and retry behavior.

Browser: desktop full-page capture matches 1920 x 5501 reference dimensions. Viewport override 1935 x 1080 yields a 1920-pixel content capture after the 15-pixel scrollbar. Section starts agree with reference: About 1307, How It Works 1925, Nonprofits 2415, Travel Partners 3073, Commitment 3773, Gather 4209, Contact 4552, Footer 5258.

Responsive widths 320, 768 and 1440 showed no horizontal overflow. Mobile menu opened and closed after Contact navigation. Both public forms accepted fictional example.test inquiries through the local API. After stopping the server and reopening the isolated local database, one contact inquiry, one partnership inquiry and two pending notification jobs persisted. No real emails were sent. Privacy link and document title were verified.

Artifacts: desktop-final.png; desktop-comparison.png (reference left, recreation right); mobile-final.png; mobile-form-result.png; browser-checks.json; visual-metrics.json. Mean raw channel difference is approximately 8.00 / 5.86 / 6.17 on a 0-255 scale. This is evidence, not an acceptance score. Residual differences include the separately approved logo source, photo compression, icon/font rendering, small positioning and color profiles. Owner visual acceptance is pending.

Not executed: real PostgreSQL service connectivity, real SMTP delivery, staging isolation, backup restoration, FASTPANEL/Nginx configuration, DNS cutover, TLS/renewal and production deployment. Production dependencies audit clean. Full audit reports moderate development-only ESLint/TypeScript-ESLint minimatch advisories; no forced incompatible downgrade was applied.

Source ZIP: C:\Users\inboxblake\Downloads\give-vacation-good.zip
SHA-256: 1d08c87b9ed226840e14d6cd1073fc8a1fa6e8fe74ff6a6829a3725e88d8c542
Original Arial/Helvetica stack and four Unsplash source photos are retained. Original archive instructions/authentication/platform code were not imported.

CARA is not included in this public checkpoint. Its separate confidential requirements were located after this verification and remain ignored by Git. No live or production-ready claim is made.
