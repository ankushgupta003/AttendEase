; AttendEase Server Installer (Windows)
; Requires NSIS and Node.js installed on server machine.

!include "MUI2.nsh"
!include "nsDialogs.nsh"

RequestExecutionLevel admin

Name "AttendEase Server"
OutFile "AttendEase-Server-Setup.exe"
InstallDir "$PROGRAMFILES\\AttendEase Server"
InstallDirRegKey HKLM "Software\\AttendEaseServer" "InstallDir"

!define SERVICE_NAME "AttendEaseServer"

Var Dialog
Var FieldHost
Var FieldPort
Var FieldDb
Var FieldUser
Var FieldPass

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
Page custom PgSqlPageCreate PgSqlPageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"
  WriteRegStr HKLM "Software\\AttendEaseServer" "InstallDir" "$INSTDIR"

  ; Copy backend server executable
  File "..\\backend-postgres\\dist\\attendease-server.exe"

  ; Write config from installer inputs
  FileOpen $0 "$INSTDIR\\config.env" w
  FileWrite $0 "DATABASE_URL=postgresql://$FieldUser:$FieldPass@$FieldHost:$FieldPort/$FieldDb$\r$\n"
  FileWrite $0 "PORT=5000$\r$\n"
  FileClose $0

  ; Install Windows service (requires Node.js)
  ExecWait 'sc create "${SERVICE_NAME}" binPath= "\"$INSTDIR\\attendease-server.exe\" --config \"$INSTDIR\\config.env\"" start= auto'
  ExecWait 'sc start "${SERVICE_NAME}"'
SectionEnd

Section "Uninstall"
  ExecWait 'sc stop "${SERVICE_NAME}"'
  ExecWait 'sc delete "${SERVICE_NAME}"'
  Delete "$INSTDIR\\config.env"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKLM "Software\\AttendEaseServer"
SectionEnd

Function PgSqlPageCreate
  nsDialogs::Create 1018
  Pop $Dialog

  ${NSD_CreateLabel} 0 0 100% 12u "PostgreSQL Connection"
  Pop $0

  ${NSD_CreateLabel} 0 16u 30% 12u "Host"
  Pop $0
  ${NSD_CreateText} 32% 14u 68% 12u "localhost"
  Pop $FieldHost

  ${NSD_CreateLabel} 0 32u 30% 12u "Port"
  Pop $0
  ${NSD_CreateText} 32% 30u 68% 12u "5432"
  Pop $FieldPort

  ${NSD_CreateLabel} 0 48u 30% 12u "Database"
  Pop $0
  ${NSD_CreateText} 32% 46u 68% 12u "attendease"
  Pop $FieldDb

  ${NSD_CreateLabel} 0 64u 30% 12u "Username"
  Pop $0
  ${NSD_CreateText} 32% 62u 68% 12u "postgres"
  Pop $FieldUser

  ${NSD_CreateLabel} 0 80u 30% 12u "Password"
  Pop $0
  ${NSD_CreatePassword} 32% 78u 68% 12u ""
  Pop $FieldPass

  nsDialogs::Show
FunctionEnd

Function PgSqlPageLeave
  ${NSD_GetText} $FieldHost $FieldHost
  ${NSD_GetText} $FieldPort $FieldPort
  ${NSD_GetText} $FieldDb $FieldDb
  ${NSD_GetText} $FieldUser $FieldUser
  ${NSD_GetText} $FieldPass $FieldPass
FunctionEnd
