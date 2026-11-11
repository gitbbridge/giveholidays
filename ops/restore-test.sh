#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${RESTORE_PGSERVICE:?Select an isolated pre-created empty restore database}"
: "${BACKUP_PATH:?Set the private backup folder}"
if [[ "${RESTORE_TARGET_ENV:-}" != "test" ]]; then
  printf 'Restore is restricted to an explicitly selected test environment.\n' >&2; exit 1
fi
export PGSERVICE="$RESTORE_PGSERVICE"
db_name="$(psql -Atqc 'select current_database()')"
if [[ "$db_name" != "giveholidays_restore_test" ]]; then
  printf 'Refusing restore: target must be giveholidays_restore_test.\n' >&2; exit 1
fi
existing="$(psql -Atqc "select count(*) from information_schema.tables where table_schema='public'")"
if [[ "$existing" != "0" ]]; then
  printf 'Refusing restore: test database must be empty.\n' >&2; exit 1
fi
(cd "$BACKUP_PATH" && sha256sum -c SHA256SUMS)
pg_restore --dbname="service=${RESTORE_PGSERVICE}" --no-owner --exit-on-error "${BACKUP_PATH}/database.dump"
psql -v ON_ERROR_STOP=1 -c 'select count(*) as agreement_versions from agreement_versions; select count(*) as seasonal_rates from seasonal_rates;'
printf 'Database restored into isolated test database. Restore private files to a separate test-only directory and compare hashes before acceptance.\n'
