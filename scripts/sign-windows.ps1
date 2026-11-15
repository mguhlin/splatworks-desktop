param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
if ($env:SIGN_RELEASE -ne 'true') { throw 'Signing must be explicitly enabled' }
$tools = Get-ChildItem 'C:/Program Files (x86)/Windows Kits/10/bin/*/x64/signtool.exe' | Sort-Object FullName -Descending
if (-not $tools) { throw 'Windows SDK SignTool is required' }
$signTool = $tools[0].FullName
$argsList = @('sign','/fd','SHA256','/tr','http://timestamp.acs.microsoft.com','/td','SHA256')
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('splatworks-sign-' + [guid]::NewGuid())
New-Item -ItemType Directory $temp | Out-Null
try {
    if ($env:WINDOWS_SIGNING_PROVIDER -eq 'azure') {
        foreach ($name in @('AZURE_SIGNING_ENDPOINT','AZURE_SIGNING_ACCOUNT','AZURE_SIGNING_PROFILE')) { if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing signing configuration: $name" } }
        $sdk = Join-Path (Split-Path $PSScriptRoot -Parent) 'output/toolchain/Microsoft.Trusted.Signing.Client.1.0.95'
        if (-not (Test-Path $sdk)) {
            nuget install Microsoft.Trusted.Signing.Client -Version 1.0.95 -OutputDirectory (Split-Path $sdk) -NonInteractive | Out-Null
            if ($LASTEXITCODE -ne 0) { throw 'Could not install the pinned Azure signing client' }
        }
        $metadata = @{ Endpoint=$env:AZURE_SIGNING_ENDPOINT; CodeSigningAccountName=$env:AZURE_SIGNING_ACCOUNT; CertificateProfileName=$env:AZURE_SIGNING_PROFILE }
        $config = Join-Path $temp 'metadata.json'
        $metadata | ConvertTo-Json | Set-Content -Encoding utf8 $config
        $argsList += @('/dlib',(Join-Path $sdk 'bin/x64/Azure.CodeSigning.Dlib.dll'),'/dmdf',$config)
    } elseif ($env:WINDOWS_CERTIFICATE_PFX) {
        $pfx = Join-Path $temp 'identity.pfx'
        [System.IO.File]::WriteAllBytes($pfx,[Convert]::FromBase64String($env:WINDOWS_CERTIFICATE_PFX))
        $argsList += @('/f',$pfx,'/p',$env:WINDOWS_CERTIFICATE_PASSWORD)
    } elseif ($env:WINDOWS_CERTIFICATE_THUMBPRINT) {
        $argsList += @('/sha1',$env:WINDOWS_CERTIFICATE_THUMBPRINT,'/s','My')
    } else { throw 'Configure Azure signing, a PFX identity, or an installed signing certificate' }
    & $signTool @argsList $Path | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Authenticode signing failed' }
    & $signTool verify /pa /all $Path | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Authenticode verification failed' }
} finally { Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue }
