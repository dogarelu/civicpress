#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OPS_DIR="$ROOT_DIR/scripts/ops"

if [[ ! -f "$OPS_DIR/ddns-watchdog.env" ]]; then
  echo "Missing $OPS_DIR/ddns-watchdog.env"
  echo "Create it from $OPS_DIR/ddns-watchdog.env.example first."
  exit 1
fi

chmod +x "$OPS_DIR/ddns-watchdog.sh"
chmod +x "$OPS_DIR/update-cpanel-root-a.sh"

sudo cp "$OPS_DIR/ddns-watchdog.service" /etc/systemd/system/ddns-watchdog.service
sudo cp "$OPS_DIR/ddns-watchdog.timer" /etc/systemd/system/ddns-watchdog.timer
sudo systemctl daemon-reload
sudo systemctl enable --now ddns-watchdog.timer

echo "Installed and started ddns-watchdog.timer"
echo "Check status with:"
echo "  systemctl status ddns-watchdog.timer"
echo "  systemctl status ddns-watchdog.service"
echo "  journalctl -u ddns-watchdog.service -n 100 --no-pager"
