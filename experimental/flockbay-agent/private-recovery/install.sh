set -eu
base=/var/lib/picard-flockbay-recovery
install -d -m 700 "$base"
install -d -m 755 /opt/picard-flockbay-recovery
if test -e "$base/source"; then
  echo recovery_snapshot_already_exists
  exit 1
fi
cp -a /opt/picard-flockbay-agent/v1 "$base/source"
cp /etc/systemd/system/picard-flockbay-agent.service "$base/agent.service"
python3 - <<'PY'
from pathlib import Path
c = Path('/etc/caddy/Caddyfile').read_text()
start = c.index('    @developmentRead {')
end = c.index('    @read {', start)
Path('/var/lib/picard-flockbay-recovery/routes.txt').write_text(c[start:end])
PY
install -m 644 /home/opc/picard-flockbay-install/recovery/reconcile.py /opt/picard-flockbay-recovery/reconcile.py
cat > /etc/systemd/system/picard-flockbay-reconcile.service <<'EOF'
[Unit]
Description=Private Picard Flockbay integration recovery
After=board-event-relay.service
[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /opt/picard-flockbay-recovery/reconcile.py
UMask=0077
TimeoutStartSec=180
EOF
install -d -m 755 /etc/systemd/system/board-event-relay.service.d
cat > /etc/systemd/system/board-event-relay.service.d/flockbay-recovery.conf <<'EOF'
[Service]
ExecStartPost=+/usr/bin/systemctl --no-block start picard-flockbay-reconcile.service
EOF
systemctl daemon-reload
systemctl start picard-flockbay-reconcile.service
cat "$base/status.json"
