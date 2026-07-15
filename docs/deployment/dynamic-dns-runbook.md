# CivicPress dynamic DNS watchdog (cPanel)

This setup keeps the apex/root `A` record for `civicpress.ro` in sync with your residential WAN IP.

## 1) Create cPanel API token

In cPanel:

- open **Manage API Tokens**
- create a token with Zone Editor permissions
- copy the token value

## 2) Create watchdog env file

```bash
cp /home/dan-dogaru/civicpress/scripts/ops/ddns-watchdog.env.example \
  /home/dan-dogaru/civicpress/scripts/ops/ddns-watchdog.env
```

Edit `/home/dan-dogaru/civicpress/scripts/ops/ddns-watchdog.env`:

- `DOMAIN="civicpress.ro"`
- `DNS_HOST="civicpress.ro"`
- `AUTO_UPDATE="1"`
- `CPANEL_HOST="<your cpanel host>"` (example: `cpanel.hosting.tld`)
- `CPANEL_USER="<your cpanel username>"`
- `CPANEL_API_TOKEN="<token>"`

## 3) Test manually

```bash
chmod +x /home/dan-dogaru/civicpress/scripts/ops/ddns-watchdog.sh
chmod +x /home/dan-dogaru/civicpress/scripts/ops/update-cpanel-root-a.sh
source /home/dan-dogaru/civicpress/scripts/ops/ddns-watchdog.env
/home/dan-dogaru/civicpress/scripts/ops/ddns-watchdog.sh
```

Expected output:

- `OK` if DNS matches WAN IP
- `drift detected ...` then `Updated ...` if update was needed

## 4) Install timer

```bash
chmod +x /home/dan-dogaru/civicpress/scripts/ops/install-ddns-watchdog.sh
/home/dan-dogaru/civicpress/scripts/ops/install-ddns-watchdog.sh
```

This installs:

- `/etc/systemd/system/ddns-watchdog.service`
- `/etc/systemd/system/ddns-watchdog.timer`

The timer runs every 2 minutes.

## 5) Monitor

```bash
systemctl status ddns-watchdog.timer
systemctl status ddns-watchdog.service
journalctl -u ddns-watchdog.service -n 100 --no-pager
```

## Notes

- Keep DNS TTL for `civicpress.ro` at `300` for faster propagation.
- `www.civicpress.ro` should stay `CNAME` to your dynamic DNS hostname.
- If cPanel API format differs on your host, the updater script may need minor parameter name adjustments.
