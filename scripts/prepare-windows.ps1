$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $root 'output/toolchain/WebView2RuntimeInstallerX64.exe'
New-Item -ItemType Directory -Force (Split-Path $runtime) | Out-Null
Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $runtime
$signature = Get-AuthenticodeSignature $runtime
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') { throw 'Microsoft runtime publisher verification failed' }
$metadata = @{ filename = (Split-Path $runtime -Leaf); sha256 = (Get-FileHash $runtime -Algorithm SHA256).Hash.ToLower(); version = (Get-Item $runtime).VersionInfo.FileVersion; publisher = $signature.SignerCertificate.Subject }
$metadata | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path (Split-Path $runtime) 'runtime.json')
$nsis = Get-Command makensis -ErrorAction SilentlyContinue
if (-not $nsis) {
    $candidate = Join-Path ${env:ProgramFiles(x86)} 'NSIS/makensis.exe'
    if (-not (Test-Path $candidate)) { choco install nsis --yes --no-progress; if ($LASTEXITCODE -ne 0) { throw 'NSIS installation failed' } }
    if ($env:GITHUB_PATH) { (Split-Path $candidate) | Out-File -Append -Encoding utf8 $env:GITHUB_PATH }
}
