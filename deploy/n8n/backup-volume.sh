#!/usr/bin/env sh
set -eu

# Run from deploy/n8n on the host. This briefly stops n8n so the SQLite
# database and credential store are copied consistently. Keep backups private.
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${1:-./backup-n8n-${STAMP}.tar.gz}"
TMP="$(mktemp)"
WAS_STOPPED=0

cleanup() {
  if [ "$WAS_STOPPED" -eq 1 ]; then
    docker compose start n8n >/dev/null 2>&1 || true
  fi
  rm -f "$TMP"
}
trap cleanup EXIT INT TERM

docker compose stop n8n
WAS_STOPPED=1
docker run --rm -v radar_n8n_data:/data:ro alpine:3.22 tar -C /data -czf - . > "$TMP"
test -s "$TMP"
mv "$TMP" "$OUT"
chmod 600 "$OUT"
docker compose start n8n
WAS_STOPPED=0
printf 'Backup created: %s\n' "$OUT"
printf 'Reminder: back up .env and N8N_ENCRYPTION_KEY separately in a secure password manager.\n'
