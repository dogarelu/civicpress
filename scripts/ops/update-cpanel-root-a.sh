#!/usr/bin/env bash
set -euo pipefail

# Updates apex/root A record in cPanel Zone Editor via UAPI.
# Required env vars:
#   CPANEL_HOST, CPANEL_USER, CPANEL_API_TOKEN, DOMAIN
# Optional env vars:
#   TARGET_IP, TARGET_NAME, TTL

for v in CPANEL_HOST CPANEL_USER CPANEL_API_TOKEN DOMAIN; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing required env var: $v" >&2
    exit 1
  fi
done

TARGET_NAME="${TARGET_NAME:-${DOMAIN}.}"
TTL="${TTL:-300}"

if [[ -z "${TARGET_IP:-}" ]]; then
  TARGET_IP="$(curl -4fsS https://api.ipify.org)"
fi

AUTH_HEADER="Authorization: cpanel ${CPANEL_USER}:${CPANEL_API_TOKEN}"
BASE_URL="https://${CPANEL_HOST}:2083/execute/ZoneEdit"

FETCH_JSON="$(curl -fsS -H "$AUTH_HEADER" \
  "${BASE_URL}/fetchzone_records?domain=${DOMAIN}&name=${TARGET_NAME}&type=A")"

LINE_AND_IP="$(
  python3 -c '
import json
import sys

target = sys.argv[1].rstrip(".")
payload = json.loads(sys.argv[2])
records = payload.get("data") or []

def norm(name: str) -> str:
    return (name or "").rstrip(".").lower()

target_norm = norm(target)
for rec in records:
    if norm(rec.get("name")) != target_norm:
        continue
    if (rec.get("type") or "").upper() != "A":
        continue
    line = rec.get("line")
    ip = rec.get("address") or rec.get("record") or ""
    if line is not None:
        print(f"{line}|{ip}")
        raise SystemExit(0)

raise SystemExit(1)
' "$TARGET_NAME" "$FETCH_JSON"
)" || {
  echo "Could not find A record '${TARGET_NAME}' in zone '${DOMAIN}'." >&2
  echo "Verify cPanel DNS has an apex/root A record first." >&2
  exit 1
}

RECORD_LINE="${LINE_AND_IP%%|*}"
CURRENT_IP="${LINE_AND_IP#*|}"

if [[ "$CURRENT_IP" == "$TARGET_IP" ]]; then
  echo "No update needed: ${TARGET_NAME} already points to ${TARGET_IP}"
  exit 0
fi

curl -fsS -H "$AUTH_HEADER" \
  "${BASE_URL}/edit_zone_record?domain=${DOMAIN}&line=${RECORD_LINE}&name=${TARGET_NAME}&type=A&ttl=${TTL}&address=${TARGET_IP}" \
  >/dev/null

echo "Updated ${TARGET_NAME} A record: ${CURRENT_IP} -> ${TARGET_IP}"
