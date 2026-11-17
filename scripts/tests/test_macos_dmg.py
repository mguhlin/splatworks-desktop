import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from macos_dmg import create_image


class DiskImageTests(unittest.TestCase):
    def test_busy_service_retries_and_removes_only_partial_image(self):
        with tempfile.TemporaryDirectory() as folder:
            image = pathlib.Path(folder)/'preview.dmg'
            neighbor = pathlib.Path(folder)/'keep.dmg'
            image.write_text('partial'); neighbor.write_text('keep')
            with patch('macos_dmg.subprocess.run', side_effect=[
                subprocess.CompletedProcess([], 1, '', 'hdiutil: create failed - Resource busy'),
                subprocess.CompletedProcess([], 0, 'created\n', '')
            ]) as run, patch('macos_dmg.time.sleep') as sleep:
                create_image(folder, image, 'Preview')
            self.assertEqual(run.call_count, 2)
            sleep.assert_called_once_with(2)
            self.assertFalse(image.exists())
            self.assertEqual(neighbor.read_text(), 'keep')

    def test_permanent_errors_stop_immediately(self):
        with patch('macos_dmg.subprocess.run', return_value=subprocess.CompletedProcess([], 1, '', 'No space left on device')) as run, patch('macos_dmg.time.sleep') as sleep:
            with self.assertRaises(subprocess.CalledProcessError):
                create_image('source', 'output.dmg', 'Preview')
            self.assertEqual(run.call_count, 1)
            sleep.assert_not_called()

    def test_temporary_failures_have_a_bounded_retry_count(self):
        with patch('macos_dmg.subprocess.run', return_value=subprocess.CompletedProcess([], 1, '', 'Resource temporarily unavailable')) as run, patch('macos_dmg.time.sleep') as sleep:
            with self.assertRaises(subprocess.CalledProcessError):
                create_image('source', 'output.dmg', 'Preview', attempts=3)
            self.assertEqual(run.call_count, 3)
            self.assertEqual(sleep.call_count, 2)
