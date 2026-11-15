#!/usr/bin/env bash
set -euo pipefail
sudo apt-get install -y ./output/release/*.deb
test -x /usr/bin/splatworks-desktop
test -f /usr/share/applications/splatworks-desktop.desktop
mkdir -p output/installed-native
sudo -E unshare --net -- bash -c 'ip link set lo up; xvfb-run -a dbus-run-session -- timeout 240 /usr/bin/splatworks-desktop --smoke-test "$PWD/output/installed-native"'
sudo chown -R "$(id -u):$(id -g)" output/installed-native
python3 - <<'PY'
import json,pathlib
r=json.loads(pathlib.Path('output/installed-native/native-smoke.json').read_text())
assert r['passed'],r
PY
sudo apt-get remove -y splatworks-desktop
test ! -e /usr/bin/splatworks-desktop
python3 - <<'PY'
import json,pathlib
pathlib.Path('output/native/linux-installer.json').write_text(json.dumps({'passed':True,'checks':['package-manager install','launcher and desktop entry','installed native smoke without networking','package-manager removal']},indent=2)+'\n')
PY
