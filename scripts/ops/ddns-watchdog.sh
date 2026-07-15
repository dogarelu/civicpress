#!/usr/bin/env bash
set -euo pipefail

# Checks if domain A record matches current WAN IPv4.
# If mismatched and AUTO_UPDATE=1, calls update-cpanel-root-a.sh.
#
# Required env vars:
#   DOMAIN
# Optional env vars:
#   DNS_HOST (default: DOMAIN), AUTO_UPDATE (0/1), ALERT_EMAIL, LOG_PREFIX

DOMAIN="${DOMAIN:-}"
DNS_HOST="${DNS_HOST:-${DOMAIN}}"
AUTO_UPDATE="${AUTO_UPDATE:-0}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
LOG_PREFIX="${LOG_PREFIX:-ddns-watchdog}"

if [[ -z "$DOMAIN" ]]; then
  echo "Missing required env var: DOMAIN" >&2
  exit 1
fi

CURRENT_IP="$(curl -4fsS https://api.ipify.org)"
DNS_IP="$(dig +short "${DNS_HOST}" A | head -n 1 | tr -d '[:space:]')"

if [[ -z "$DNS_IP" ]]; then
  MSG="${LOG_PREFIX}: no DNS A record resolved for ${DNS_HOST}"
  echo "$MSG" >&2
  if [[ -n "$ALERT_EMAIL" ]]; then
    printf '%s\n' "$MSG" | mail -s "[${LOG_PREFIX}] DNS resolution failure" "$ALERT_EMAIL" || true
  fi
  exit 2
fi

if [[ "$CURRENT_IP" == "$DNS_IP" ]]; then
  echo "${LOG_PREFIX}: OK ${DNS_HOST}=${DNS_IP}"
  exit 0
fi

MSG="${LOG_PREFIX}: drift detected for ${DNS_HOST}: DNS=${DNS_IP} WAN=${CURRENT_IP}"
echo "$MSG"

if [[ "$AUTO_UPDATE" == "1" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  TARGET_IP="$CURRENT_IP" DOMAIN="$DOMAIN" "${SCRIPT_DIR}/update-cpanel-root-a.sh"
  DNS_IP_AFTER="$(dig +short "${DNS_HOST}" A | head -n 1 | tr -d '[:space:]')"
  echo "${LOG_PREFIX}: post-update ${DNS_HOST}=${DNS_IP_AFTER}"
fi

if [[ -n "$ALERT_EMAIL" ]]; then
  printf '%s\n' "$MSG" | mail -s "[${LOG_PREFIX}] DNS drift" "$ALERT_EMAIL" || true
fi
