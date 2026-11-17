# Developer signing and release

Unsigned release candidates run all automated checks and produce installable
packages. Stable tags require signing credentials and a completed physical-device
validation record. No signing identity or private key is included in the source
or application.

## Windows

The workflow signs the application, generated uninstaller, and setup executable,
then verifies Authenticode before packaging checksums. Choose one provider:

**Azure Artifact Signing (default):** set repository variables
`WINDOWS_SIGNING_PROVIDER=azure`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
`AZURE_SUBSCRIPTION_ID`, `AZURE_SIGNING_ENDPOINT`, `AZURE_SIGNING_ACCOUNT`, and
`AZURE_SIGNING_PROFILE`. Configure the application's federated identity for the
approved GitHub release refs and grant its identity the certificate-profile signer
role. The workflow uses GitHub OIDC through `azure/login`; no Azure client secret
is needed. Restrict federated trust to the intended release refs, excluding pull
requests. The SignTool client SDK is pinned to Microsoft.Trusted.Signing.Client
1.0.95.

**An existing exportable signing identity:** set variable
`WINDOWS_SIGNING_PROVIDER=pfx` and secrets `WINDOWS_CERTIFICATE_PFX` (Base64 PFX)
and `WINDOWS_CERTIFICATE_PASSWORD`. Existing certificates installed in the
runner's user certificate store can instead use variable
`WINDOWS_CERTIFICATE_THUMBPRINT`. Hardware-backed identities require a runner
with the appropriate certificate provider already configured. Certificates must
be valid for publicly trusted code signing; self-signed certificates do not
establish publisher trust for other users.

SignTool uses SHA-256 file digests and an RFC 3161 timestamp. Secrets are written
only to a temporary signing directory and removed in `finally`. Signing errors
stop the build rather than producing a stable unsigned release.

## Mac

Set secrets `MACOS_CERTIFICATE_P12` (Base64 Developer ID Application identity),
`MACOS_CERTIFICATE_PASSWORD`, and `APPLE_API_KEY_P8` (Base64 App Store Connect API
private key). Set variables `MACOS_SIGNING_IDENTITY` (certificate identity or
fingerprint), `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER_ID`.

The script imports the identity into a temporary keychain, enables hardened
runtime, signs and verifies the app, submits it with `notarytool`, staples the
ticket, and validates the staple. The packaged DMG is signed, notarized, and
stapled separately. Keychains and temporary credentials are removed after each
signing phase. Unsigned candidates use an ad hoc hardened-runtime signature so
that the same runtime restrictions are exercised before a Developer ID is added.

## Validate identities before a stable tag

Run **Desktop builds → Run workflow → sign_release=true** against the release
commit. Download the resulting signed artifacts and complete physical-device
validation in `VALIDATION.md`. Keep signing credentials in GitHub secrets; do not
paste them into chat, source files, issues, or release notes.

Once physical validation is complete, set repository variable
`PHYSICAL_VALIDATION_APPROVED=true`. This records the maintainer's approval;
automation does not assert that hardware validation happened. Reset it when a
change warrants revalidation. Push a stable semantic tag such as `v1.0.0` only
after approving the release commit. Stable tags automatically enable signing and
fail if approval or signing credentials are absent. Prerelease tags such as
`v1.0.0-rc.1` publish as prereleases.

GitHub releases remain the manual update channel. A subsequent release replaces
the application through its installer; an automatic updater is outside the 1.0
scope.

## Standalone tool releases

The **Standalone tools** workflow reuses these signing providers and credential
names for GIFsplat, CipherSplat, QRSplat, ImageSplat, AudioSplat and VideoSplat. Dispatch that workflow
with `sign_release=true` to produce signed candidates. Each app has a separate
bundle identifier and installer registration. Complete the per-app checks in
[STANDALONE.md](STANDALONE.md), then set
`STANDALONE_PHYSICAL_VALIDATION_APPROVED=true` before a stable `tools-v…` tag.
The core suite's approval variable does not approve standalone tools.

## Inspect 1.0 prerequisites

Run `python3 scripts/release-readiness.py` from the repository, or add `--json`
for a machine-readable report. The command reads repository variable values and
secret names through `gh`; it never retrieves or prints secret values. It reports
missing signing configuration and the separate core/standalone physical approvals.
Configuration presence alone does not prove certificate validity, successful
notarization, or physical-device results. Validate a signed candidate before
approving the applicable stable release.
