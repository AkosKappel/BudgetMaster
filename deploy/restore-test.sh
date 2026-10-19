#!/usr/bin/env bash
# Restore test (H-02): restores the newest dump from BACKUP_DIR into a throwaway Postgres
# container (no network, no port, deleted afterwards) and checks that the data is there.
# Run from the deploy folder, for example once a month: ./restore-test.sh
# Production is never touched; only the dump file is read.
set -euo pipefail

backup_dir="${BACKUP_DIR:-$HOME/backups/budgetmaster}"
dump=$(ls -1t "$backup_dir"/budgetmaster-*.dump 2>/dev/null | head -n 1 || true)
if [[ -z "$dump" ]]; then
  echo "No budgetmaster-*.dump in $backup_dir" >&2
  exit 1
fi

name="budgetmaster-restore-test-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Restoring $(basename "$dump") ($(du -h "$dump" | cut -f1))"
docker run -d --name "$name" --network none --memory 512m \
  -e POSTGRES_PASSWORD=restore-test -e POSTGRES_DB=budgetmaster \
  postgres:18 >/dev/null

# Over TCP: during its first start the image runs a temporary server on the socket only.
for _ in $(seq 1 60); do
  docker exec "$name" pg_isready -h 127.0.0.1 -U postgres -d budgetmaster >/dev/null 2>&1 && break
  sleep 1
done

started=$(date +%s)
docker exec -i "$name" pg_restore -U postgres -d budgetmaster --no-owner --exit-on-error <"$dump"
echo "Restored in $(($(date +%s) - started)) s"

query() { docker exec "$name" psql -U postgres -d budgetmaster -tAc "$1"; }
users=$(query 'select count(*) from "user"')
spaces=$(query 'select count(*) from space')
transactions=$(query 'select count(*) from transaction')
latest=$(query 'select coalesce(max(created_at)::date::text, $$none$$) from transaction')
migrations=$(query 'select count(*) from drizzle.__drizzle_migrations')

echo "Users: $users, spaces: $spaces, transactions: $transactions (latest entered $latest), migrations: $migrations"
if [[ "$users" -eq 0 || "$spaces" -eq 0 || "$migrations" -eq 0 ]]; then
  echo "FAIL: the restored database is missing data" >&2
  exit 1
fi
echo "Restore test passed"
