#!/usr/bin/env bash
set -euo pipefail

# Hosted EC2 mirrors can throttle large media dependencies. Keep Ubuntu's signed
# repositories, using the main HTTPS mirror when that EC2 mirror is configured.
sudo python3 - <<'PY'
import pathlib, re
paths = [pathlib.Path('/etc/apt/sources.list')]
paths += list(pathlib.Path('/etc/apt').glob('apt-mirrors*.txt'))
directory = pathlib.Path('/etc/apt/sources.list.d')
paths += list(directory.glob('*.list')) + list(directory.glob('*.sources'))
for path in paths:
    if not path.is_file():
        continue
    original = path.read_text()
    updated = re.sub(r'https?://[a-z0-9-]+\.ec2\.archive\.ubuntu\.com/ubuntu',
                     'https://archive.ubuntu.com/ubuntu', original)
    if updated != original:
        path.write_text(updated)
PY
sudo apt-get update
# Install the codecs explicitly. Optional recommendations include speech models
# that the application does not use and are not needed by native qualification.
sudo apt-get install -y --no-install-recommends \
  libgtk-3-dev libwebkit2gtk-4.1-dev \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad \
  gstreamer1.0-plugins-ugly gstreamer1.0-libav \
  build-essential pkg-config xvfb xauth dbus-x11
