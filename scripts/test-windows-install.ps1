$ErrorActionPreference = 'Stop'
$root=Split-Path $PSScriptRoot -Parent
$setup=(Get-ChildItem "$root/output/release/*-setup.exe")[0].FullName
$install=Join-Path $env:RUNNER_TEMP 'SplatWorks installer test'
function Run-Wait($File,$Arguments) {
    $p=Start-Process -FilePath $File -ArgumentList $Arguments -PassThru
    if(-not $p.WaitForExit(300000)){$p.Kill();throw 'Installer or application timed out'}
    if($p.ExitCode -ne 0){throw "Process failed: $File ($($p.ExitCode))"}
}
Run-Wait $setup @('/S',"/D=$install")
if(-not(Test-Path "$install/SplatWorks-Desktop.exe")){throw 'Application not installed'}
if(-not(Test-Path "$install/Uninstall.exe")){throw 'Uninstaller not installed'}
if(-not(Test-Path ([Environment]::GetFolderPath('Programs')+'/SplatWorks Desktop.lnk'))){throw 'Start menu shortcut missing'}
$registry=Get-ItemProperty 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/SplatWorksDesktop'
if($registry.InstallLocation -ne $install){throw 'Uninstall registration is incorrect'}
# Upgrade in place; user files placed next to the app must survive uninstall.
Set-Content "$install/user-created-document.txt" 'preserve me'
Set-Content "$install/docs/user-notes.txt" 'keep my notes'
Run-Wait $setup @('/S',"/D=$install")
$report=Join-Path $root 'output/installed-native'
New-Item -ItemType Directory -Force $report | Out-Null
Run-Wait "$install/SplatWorks-Desktop.exe" @('--smoke-test',"`"$report`"")
$result=Get-Content "$report/native-smoke.json" -Raw | ConvertFrom-Json
if(-not $result.passed){throw 'Installed application smoke test failed'}
python3 "$root/scripts/verify-native.py" $report
if($LASTEXITCODE -ne 0){throw 'Installed application output verification failed'}
Run-Wait "$install/Uninstall.exe" @('/S',"_?=$install")
if(Test-Path "$install/SplatWorks-Desktop.exe"){throw 'Uninstall left the app executable behind'}
if(Test-Path 'HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/SplatWorksDesktop'){throw 'Uninstall registry entry remains'}
if((Get-Content "$install/user-created-document.txt" -Raw).Trim() -ne 'preserve me'){throw 'Uninstall changed user content'}
if((Get-Content "$install/docs/user-notes.txt" -Raw).Trim() -ne 'keep my notes'){throw 'Uninstall changed nested user content'}
@{passed=$true;checks=@('silent per-user install','shortcuts and uninstall registration','upgrade in place','installed native smoke','silent uninstall','user content preserved')} | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 "$root/output/native/windows-installer.json"
