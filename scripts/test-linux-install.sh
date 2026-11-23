#!/usr/bin/env bash
set -euo pipefail
slug=$(python3 -c 'import json;print(json.load(open("frontend/app.json"))["slug"])')
python3 - <<'PY_VERSION'
import json,pathlib,subprocess
package=next(pathlib.Path('output/release').glob('*.deb'))
installed=subprocess.check_output(['dpkg-deb','-f',str(package),'Version'],text=True).strip()
if '~' in installed:
    stable=installed.split('~')[0]
    subprocess.run(['dpkg','--compare-versions',installed,'lt',stable],check=True)
    if json.load(open('frontend/app.json'))['id']=='desktop':
        subprocess.run(['dpkg','--compare-versions',stable,'gt','1.0.0-rc.3'],check=True)
PY_VERSION
sudo apt-get install -y ./output/release/*.deb
test -x /usr/bin/$slug
test -f /usr/share/applications/$slug.desktop
mkdir -p output/installed-native
trap 'sudo chown -R "$(id -u):$(id -g)" output/installed-native' EXIT
sudo -E unshare --net -- bash -c 'ip link set lo up; xvfb-run -a dbus-run-session -- timeout 240 "$1" --smoke-test "$PWD/output/installed-native"' _ "/usr/bin/$slug"
sudo chown -R "$(id -u):$(id -g)" output/installed-native
python3 scripts/verify-native.py output/installed-native
sudo apt-get remove -y "$slug"
test ! -e /usr/bin/$slug
python3 - <<'PY'
import json,pathlib
pathlib.Path('output/native/linux-installer.json').write_text(json.dumps({'passed':True,'checks':['package-manager install','launcher and desktop entry','installed native smoke without networking','package-manager removal']},indent=2)+'\n')
PY
