"""Create a disk image, retrying temporary macOS disk-image service contention."""
import pathlib
import subprocess
import sys
import time


def temporary_disk_error(message):
    return any(term in message.lower() for term in ('resource busy', 'resource temporarily unavailable'))


def create_image(source, image, volume, attempts=5):
    image = pathlib.Path(image)
    command = ['hdiutil', 'create', '-volname', volume, '-srcfolder', str(source),
               '-ov', '-format', 'UDZO', str(image)]
    for attempt in range(attempts):
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode == 0:
            if result.stdout:
                print(result.stdout, end='')
            return
        if not temporary_disk_error(result.stderr) or attempt == attempts - 1:
            if result.stderr:
                print(result.stderr, file=sys.stderr, end='')
            raise subprocess.CalledProcessError(result.returncode, command,
                                                output=result.stdout, stderr=result.stderr)
        # Delete only this attempt's partial output. Never detach other volumes
        # or restart the runner's global disk-image service.
        image.unlink(missing_ok=True)
        time.sleep(2 * (attempt + 1))
