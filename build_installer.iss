[Setup]
; ==============================================================================
; DEZZ GRAPHICS - ULTIMATE PATTERN HUB INSTALLER SCRIPT
; ==============================================================================
AppName=Ultimate Pattern Hub by DEZZ
AppVersion=1.0
AppPublisher=DEZZ Graphics
; ไม่ต้องสร้างหน้าต่างเลือกโฟลเดอร์ใน Start Menu
DisableProgramGroupPage=yes
; ปิดหน้าต่างให้ผู้ใช้เลือกปลายทางติดตั้งเอง (บังคับลงในโฟลเดอร์ CEP)
DisableDirPage=yes
; กำหนดปลายทางติดตั้งให้ไปที่ %APPDATA%\Adobe\CEP\extensions\UltimatePatternHub
DefaultDirName={userappdata}\Adobe\CEP\extensions\UltimatePatternHub
; กำหนดชื่อไฟล์ .exe ที่จะได้หลังจาก Compile เสร็จ
OutputBaseFilename=UltimatePatternHub_Installer
; บีบอัดไฟล์ให้มีขนาดเล็กที่สุด
Compression=lzma2/ultra64
SolidCompression=yes
PrivilegesRequired=lowest

[Files]
; สมมติว่าไฟล์ที่ Obfuscate แล้วและพร้อมแพ็กเกจอยู่ในโฟลเดอร์ dist\
; (หากคุณเอาไฟล์ทั้งหมดไว้ในโฟลเดอร์เดียวกันกับสคริปต์นี้ ให้เปลี่ยน Source เป็น "Source: "*"; Excludes: "keygen_dezz.html, build_installer.iss, .git\*"; )
Source: "dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Registry]
; เปิดโหมดนักพัฒนา (PlayerDebugMode) สำหรับ CSXS.8 ถึง CSXS.12 เพื่อให้รองรับ Illustrator ทุกเวอร์ชัน
Root: HKCU; Subkey: "Software\Adobe\CSXS.8"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.9"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue

[Messages]
SetupAppTitle=Setup - Ultimate Pattern Hub by DEZZ
SetupWindowTitle=Setup - Ultimate Pattern Hub by DEZZ
WelcomeLabel1=Welcome to the Ultimate Pattern Hub Setup Wizard
WelcomeLabel2=This will install Ultimate Pattern Hub (Extension for Adobe Illustrator) on your computer.%n%nClick Next to continue.

[Code]
// (Optional) คุณสามารถเพิ่มโค้ดเช็คว่าปิดโปรแกรม Illustrator อยู่หรือไม่ตรงส่วนนี้ในอนาคตได้
