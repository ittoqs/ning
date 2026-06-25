@echo off
setlocal

:: Memeriksa hak administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo =======================================================
    echo PERINGATAN: Script ini harus dijalankan sebagai Administrator!
    echo Silakan klik kanan file ini dan pilih "Run as administrator".
    echo =======================================================
    pause
    exit /b 1
)

:: Berpindah ke direktori tempat script ini berada (folder proyek)
cd /d "%~dp0"

echo ==========================================
echo 1. Memeriksa instalasi Node.js...
echo ==========================================
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js belum terinstal. Mengunduh Node.js versi terbaru (LTS)...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.12.2/node-v20.12.2-x64.msi' -OutFile '%TEMP%\node_installer.msi'"
    echo Menginstal Node.js... (Mohon tunggu beberapa saat)
    msiexec /i "%TEMP%\node_installer.msi" /quiet /norestart

    :: Menambahkan Node.js ke PATH untuk sesi saat ini agar perintah npm dapat dikenali
    set "PATH=%PATH%;C:\Program Files\nodejs"
    echo Instalasi Node.js selesai.
) else (
    echo Node.js sudah terinstal.
)

echo.
echo ==========================================
echo 2. Memeriksa dependencies npm...
echo ==========================================
if not exist "node_modules\" (
    echo node_modules tidak ditemukan. Menjalankan npm install...
    call npm install
) else (
    echo Dependencies sudah terinstal (node_modules ditemukan).
)

echo.
echo ==========================================
echo 3. Membuat shortcut di Desktop...
echo ==========================================
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Ning.lnk"
set "ICON_PATH=%~dp0src-tauri\icons\icon.ico"
set "WORKING_DIR=%~dp0"

:: Membuat shortcut menggunakan PowerShell
powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $shortcut = $wshell.CreateShortcut('%SHORTCUT_PATH%'); $shortcut.TargetPath = 'cmd.exe'; $shortcut.Arguments = '/k npm run dev'; $shortcut.WorkingDirectory = '%WORKING_DIR%'; $shortcut.IconLocation = '%ICON_PATH%'; $shortcut.Save()"

if exist "%SHORTCUT_PATH%" (
    echo Shortcut 'Ning' berhasil dibuat di Desktop.
) else (
    echo Gagal membuat shortcut.
)

echo.
echo ==========================================
echo 4. Menjalankan aplikasi (npm run dev)...
echo ==========================================
call npm run dev
