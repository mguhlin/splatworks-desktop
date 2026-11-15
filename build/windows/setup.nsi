Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!ifndef VERSION
  !error "VERSION is required"
!endif
Name "SplatWorks Desktop"
VIProductVersion "${NUMERIC_VERSION}"
VIAddVersionKey "ProductName" "SplatWorks Desktop"
VIAddVersionKey "FileDescription" "SplatWorks Desktop Installer"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "DrawSplat Developer(s)"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\Programs\SplatWorks Desktop"
InstallDirRegKey HKCU "Software\SplatWorks\Desktop" "InstallLocation"
RequestExecutionLevel user
ManifestDPIAware true
SetCompressor /SOLID lzma
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!ifdef SIGN_SCRIPT
  !uninstfinalize 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${SIGN_SCRIPT}" -Path "%1"'
!endif
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "This installer requires 64-bit Windows."
    Abort
  ${EndIf}
FunctionEnd
Section "Application"
  SetShellVarContext current
  SetRegView 64
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 == ""
  ${OrIf} $0 == "0.0.0.0"
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
  ${If} $0 == ""
  ${OrIf} $0 == "0.0.0.0"
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File /oname=WebView2RuntimeInstaller.exe "${RUNTIME}"
    DetailPrint "Installing the included Microsoft WebView2 runtime"
    ExecWait '"$PLUGINSDIR\WebView2RuntimeInstaller.exe" /silent /install' $1
    ${If} $1 != 0
    ${AndIf} $1 != 3010
      MessageBox MB_ICONSTOP "Microsoft WebView2 could not be installed. Contact your administrator or install the runtime separately, then run setup again."
      SetErrorLevel 1
      Abort
    ${EndIf}
  ${EndIf}
  SetOutPath "$INSTDIR"
  File /r "${STAGE}\*.*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\SplatWorks\Desktop" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "DisplayName" "SplatWorks Desktop"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "Publisher" "SplatWorks"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "DisplayIcon" "$INSTDIR\SplatWorks-Desktop.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "QuietUninstallString" '$\"$INSTDIR\Uninstall.exe$\" /S'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop" "NoRepair" 1
  CreateShortcut "$SMPROGRAMS\SplatWorks Desktop.lnk" "$INSTDIR\SplatWorks-Desktop.exe"
  CreateShortcut "$DESKTOP\SplatWorks Desktop.lnk" "$INSTDIR\SplatWorks-Desktop.exe"
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  SetRegView 64
  Delete "$INSTDIR\Uninstall.exe"
  !include "${UNINSTALL_FILES}"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\SplatWorks Desktop.lnk"
  Delete "$DESKTOP\SplatWorks Desktop.lnk"
  DeleteRegKey HKCU "Software\SplatWorks\Desktop"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SplatWorksDesktop"
SectionEnd
