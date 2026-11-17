import hashlib
import importlib.util
import pathlib
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('verify_packages',pathlib.Path(__file__).resolve().parents[1]/'verify-packages.py')
packages=importlib.util.module_from_spec(spec);spec.loader.exec_module(packages)


class PackageContractTests(unittest.TestCase):
    def artifact(self,folder,name):
        file=folder/name;file.write_bytes(b'synthetic package')
        file.with_name(name+'.sha256').write_text(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+name+'\n')

    def test_valid_checksums_do_not_hide_a_missing_installer(self):
        with tempfile.TemporaryDirectory() as directory:
            folder=pathlib.Path(directory)
            self.artifact(folder,'AudioSplat-1.0.0-rc.1-windows-amd64.zip')
            self.assertEqual(packages.verify(folder),1)
            with self.assertRaisesRegex(AssertionError,'Missing required distribution artifact'):
                packages.verify(folder,'windows','AudioSplat','1.0.0-rc.1')

    def test_all_supported_platform_package_sets_are_verified(self):
        for platform,suffix,endings in [('linux','amd64',['.deb','.tar.gz']),('windows','amd64',['-setup.exe','.zip','-webview2.json']),('macos','universal',['.dmg','.zip'])]:
            with self.subTest(platform=platform),tempfile.TemporaryDirectory() as directory:
                folder=pathlib.Path(directory)
                for ending in endings:self.artifact(folder,f'AudioSplat-1.0.0-rc.1-{platform}-{suffix}'+ending)
                self.assertEqual(packages.verify(folder,platform,'AudioSplat','1.0.0-rc.1'),len(endings))
