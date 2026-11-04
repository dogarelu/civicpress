#!/usr/bin/env bash
# Open a shell on the CivicPress VPS, or run a remote command.
#
#   ./scripts/ops/vps-ssh.sh
#   ./scripts/ops/vps-ssh.sh systemctl status nginx
#
# Uses the SSH key at ~/.ssh/civicpress_vps (override with CIVICPRESS_VPS_KEY).
# The root password is not stored in this script.

set -euo pipefail

HOST="185.181.243.162"
USER_NAME="root"
PORT="22"
KEY="${CIVICPRESS_VPS_KEY:-$HOME/.ssh/civicpress_vps}"

if [[ ! -f "$KEY" ]]; then
  echo "SSH key not found: $KEY" >&2
  echo "Generate one with: ssh-keygen -t ed25519 -f \"$KEY\" -N \"\"" >&2
  exit 1
fi

exec ssh \
  -i "$KEY" \
  -p "$PORT" \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=accept-new \
  "${USER_NAME}@${HOST}" \
  "$@"
