#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${PGSERVICE:?Select the verified source database through a private pg_service.conf}"
: "${BACKUP_DIR:?Use private persistent backup storage}"
: "${PRIVATE_DOCUMENT_DIR:?Set the persistent private document directory}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_target="${BACKUP_DIR}/${stamp}"
mkdir -p -- "$backup_target"
pg_dump --format=custom --no-owner --file="${backup_target}/database.dump"
tar -czf "${backup_target}/documents.tar.gz" -C "$PRIVATE_DOCUMENT_DIR" .
(cd "$backup_target" && sha256sum database.dump documents.tar.gz > SHA256SUMS)
printf 'Backup created: %s\n' "$backup_target"
# Encrypt before off-server transfer. Back up PRIVATE_SECRET and approved content
# separately using the approved secret store; they are intentionally not bundled here.
