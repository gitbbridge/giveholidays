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

## Private CARA verification checkpoint

The current suite contains 27 passing isolated tests across public inquiries and the private portal. Added coverage includes anonymous/role denial, five-attempt email-code lockout, single-use invitations, revocation and expiry, CSRF/origin controls, optimistic draft conflicts, all four normalized rate structures and associated terms, cross-hotel PDF/file denial, forced PostgreSQL row-level policies, quarantine, private notes, revision/version preservation, execution/legal/evidence gates, multi-file PDF/DOCX/legacy-DOC signature handling and 10 MB limits, and snapshot backup restoration into a separate isolated PostgreSQL instance. Legacy DOC validation uses a type-gate fixture; real document safety and ClamAV behavior still require staging verification.

Local browser walkthrough: administrator email verification through a private capture mailbox; approval of a fictional hotel inquiry; creation of a locally captured invitation; hotel email verification; both private submission choices; all 12 online steps; repeatable room/rate fields; four rate structures and calendar ranges; on-request inventory; recurring blackout; booking, payment, cancellation, breakfast benefit and contractual fields; editable review; saved submission confirmation; authorized proposal PDF download. The saved draft survived reload. A rapid-edit/calendar issue found by the browser walkthrough was corrected and the flow was completed afterward.

All 129 nonempty values read from the submitted browser review were found in the downloaded proposal PDF. The nine-page unit fixture PDF was rendered and all pages visually inspected; the browser proposal includes the full approved private content and has 11 pages. Private screenshots, PDF samples, captured test mail and browser evidence remain only in ignored .local/verification and .local/test-mail. No real email was sent to the configured business administrator or hotels.

Build privacy check confirms private form and guidance strings are absent from public output; separate private bundles require server authorization. Anonymous direct Vite filesystem requests for the ignored requirements and private approved JSON returned 403. Original/public logo hashes remain equal. The public layout and screenshot boundaries remain preserved.

Public checkpoint SHA is 5cae05cd10ee4601cf2d3c491f75854b40948b79; the CARA handoff commit is recorded in Git and the final report. Actual PostgreSQL service integration and pg_dump/pg_restore, production SMTP delivery, ClamAV scanning, staging, FASTPANEL and TLS are pending. Legal review is pending. This checkpoint is a locally verified implementation, not a production release.
