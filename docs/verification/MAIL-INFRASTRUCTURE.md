# Mail infrastructure verification — 2026-11-11

Application source checkpoint: cc01a8249591569e98c1b26b3c00245755655b1e. No application deployment performed.

Owner explicitly authorized moving incoming and outgoing mail from Namecheap Private Email to existing FASTPANEL VPS 162.0.239.71. SSH host key matched the owner's existing trusted known_hosts record.

Completed:
- Preserved existing blake@giveholidays.com VPS mailbox and password.
- Created separate admin@giveholidays.com mailbox (1 GiB quota). Random credentials remain in root-only server configuration outside Git.
- Created auxiliary mail.giveholidays.com FASTPANEL site solely for certificate issuance; no duplicate application source.
- Issued Let's Encrypt mail.giveholidays.com certificate ID 15, expires 2027-02-09 20:56:47 UTC, and assigned it to Give Holidays email domain through FASTPANEL.
- Strict hostname/trust verification passed for HTTPS 443, SMTP TLS 465, IMAP TLS 993. SMTP authentication on 465 and STARTTLS 587 and IMAP authentication 993 passed. No message sent; external delivery/receipt remains untested.
- PTR for 162.0.239.71 resolves to mail.giveholidays.com; mail A resolves to the VPS. Global Exim hostname remains server.giveholidays.com (other hosted domains preserved).

Incomplete DNS cutover:
- DNS still returns priority-10 mx1.privateemail.com and mx2.privateemail.com. No Namecheap records changed.
- Native browser control cannot obtain window geometry/screenshots, even after owner restored the window and automation was reconnected. Read-only accessibility initially worked; subsequent reconnect reports unavailable.
- Once browser access works, change Mail Settings to Custom MX, @ priority 10 mail.giveholidays.com; publish VPS SPF and dkim._domainkey TXT matching current VPS selector dkim; configure monitoring-only DMARC. Existing default._domainkey public key matches VPS key but selector differs. Preserve old hosted mail/history and subscription until migration is verified.
- Apex A/www were absent on inspection. Website DNS/TLS, staging, PostgreSQL, scanning and exact-SHA production approval remain separate pending work.

Rollback: restore Mail Settings Private Email if a later cutover fails. Existing Namecheap mailbox/history has not been deleted or migrated. Mail certificate relation previously null; use FASTPANEL email-domain certificate settings to revert if required. No global mail-service identity changes made.

Temporary one-time panel login URL was accidentally printed during diagnostics, then consumed; resulting session token was never printed. Temporary server credential files were removed. SSH and SMTP passwords were never printed.

## DNS migration completed — 2026-11-11

This supersedes the incomplete DNS cutover section above. Owner opened the authenticated Namecheap page in the in-app browser, restoring control. Saved Custom MX: @ priority 10 mail.giveholidays.com. Added SPF @ `v=spf1 ip4:162.0.239.71 include:spf.privateemail.com ~all`, matching VPS DKIM at dkim._domainkey, and DMARC `_dmarc` `v=DMARC1; p=none; adkim=r; aspf=r`. Kept default._domainkey and mail A unchanged. Private Email SPF authorization retained during transition; no subscription or historical messages removed.

All four records and mail A verified against both authoritative Namecheap nameservers and public resolver 1.1.1.1. Namecheap UI confirmed saved settings. Screenshot stored privately at .local/verification/namecheap-mail-dns.png. End-to-end external message delivery/receipt and old-mail IMAP migration remain untested/pending. Website DNS/cutover unchanged.
