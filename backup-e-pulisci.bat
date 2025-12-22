@echo off
chcp 65001 >nul
echo ========================================
echo  BACKUP E PULIZIA PROGETTO WKF Suite
echo ========================================
echo.

:: Crea nome backup con data e ora
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_NAME=backup_%datetime:~0,8%_%datetime:~8,6%

echo [1/3] Creazione backup in: %BACKUP_NAME%
echo.

:: Crea cartella backup
if not exist "%BACKUP_NAME%" mkdir "%BACKUP_NAME%"

:: Backup completo (escludi node_modules e .git per velocità)
echo Copia file in corso...
xcopy /E /I /Y /EXCLUDE:backup-exclude.txt . "%BACKUP_NAME%" >nul 2>&1

echo.
echo ✓ Backup completato in: %BACKUP_NAME%
echo.
echo ========================================
echo [2/3] ELIMINAZIONE FILE INUTILI
echo ========================================
echo.

:: File .bat di test e debug
echo Eliminazione file di test .bat...
del /F /Q "check-dependencies.bat" 2>nul
del /F /Q "compare-servers.bat" 2>nul
del /F /Q "copy-sqlite3-binding.bat" 2>nul
del /F /Q "debug-direct.bat" 2>nul
del /F /Q "debug-exe.bat" 2>nul
del /F /Q "debug-step-by-step.bat" 2>nul
del /F /Q "deep-mobile-debug.bat" 2>nul
del /F /Q "diagnose-mobile-issue.bat" 2>nul
del /F /Q "fix-all-bugs.bat" 2>nul
del /F /Q "fix-all-issues.bat" 2>nul
del /F /Q "fix-corporate-wifi.bat" 2>nul
del /F /Q "fix-firefox-ssl.bat" 2>nul
del /F /Q "fix-firewall.bat" 2>nul
del /F /Q "fix-mobile-quick.bat" 2>nul
del /F /Q "fix-server-timeout.bat" 2>nul
del /F /Q "quick-test.bat" 2>nul
del /F /Q "rebuild-mobile-fix.bat" 2>nul
del /F /Q "test-basic-mobile.bat" 2>nul
del /F /Q "test-different-approaches.bat" 2>nul
del /F /Q "test-firewall-check.bat" 2>nul
del /F /Q "test-from-anywhere.bat" 2>nul
del /F /Q "test-minimal.bat" 2>nul
del /F /Q "test-mobile-connectivity.bat" 2>nul
del /F /Q "test-mobile-fixed.bat" 2>nul
del /F /Q "test-pkg.bat" 2>nul

:: File installazione duplicati
echo Eliminazione script installazione duplicati...
del /F /Q "INSTALLA-AUTOFIX.bat" 2>nul
del /F /Q "installa-clean.bat" 2>nul
del /F /Q "INSTALLA-DB-VUOTO.bat" 2>nul
del /F /Q "installa-debug.bat" 2>nul
del /F /Q "INSTALLA-FINALE-FUNZIONANTE.bat" 2>nul
del /F /Q "INSTALLA-PORTABLE.bat" 2>nul
del /F /Q "INSTALLA-PULITO.bat" 2>nul
del /F /Q "CREA-MSIX.bat" 2>nul
del /F /Q "CREA-MSIX-SIMPLE.bat" 2>nul
del /F /Q "Build-MSIX.ps1" 2>nul

:: File .js di test
echo Eliminazione file di test JavaScript...
del /F /Q "test-database-fixes.js" 2>nul
del /F /Q "test-licensing.js" 2>nul
del /F /Q "test-pro-activation.js" 2>nul
del /F /Q "test-startup.js" 2>nul
del /F /Q "check-deps.js" 2>nul

:: Script di pulizia
echo Eliminazione script di pulizia temporanei...
del /F /Q "clean_db.js" 2>nul
del /F /Q "clean-build.js" 2>nul
del /F /Q "clean-for-deployment.js" 2>nul
del /F /Q "final-clean-deployment.js" 2>nul
del /F /Q "prepare-clean-installation.js" 2>nul
del /F /Q "prepare-deployment.js" 2>nul

:: File .txt inutili
echo Eliminazione file .txt temporanei...
del /F /Q "Nuovo Documento di testo.txt" 2>nul
del /F /Q "app google.txt" 2>nul
del /F /Q "build finale.txt" 2>nul
del /F /Q "Chiave privata.txt" 2>nul
del /F /Q "Chiave pubblicabile.txt" 2>nul
del /F /Q "chiave live.txt" 2>nul
del /F /Q "Set your secret key. Remember to s.txt" 2>nul
del /F /Q "whsec.txt" 2>nul
del /F /Q "nul" 2>nul

:: Documentazione duplicata
echo Eliminazione documentazione duplicata...
del /F /Q "# Installazione WKF Suite.txt" 2>nul
del /F /Q "# WKF Suite - Guida Configurazione.txt" 2>nul
del /F /Q "# WKF Suite.md" 2>nul
del /F /Q "README WKF Suite.md" 2>nul
del /F /Q "FIX-ENOENT.md" 2>nul
del /F /Q "GUIDA-MOBILE-FIX.md" 2>nul
del /F /Q "ISTRUZIONI-DEBUG.md" 2>nul
del /F /Q "QUICK-FIX-IPv4.md" 2>nul
del /F /Q "BUILD-GUIDE.md" 2>nul
del /F /Q "SETUP-PKG.md" 2>nul

:: File build obsoleti
echo Eliminazione file build obsoleti...
del /F /Q "build-exe.js" 2>nul
del /F /Q "electron-minimal.js" 2>nul
del /F /Q "server-simple.js" 2>nul
del /F /Q "pkg-config.json" 2>nul
del /F /Q "pkg-entry.js" 2>nul
del /F /Q "Package.appxmanifest" 2>nul
del /F /Q "error.html" 2>nul
del /F /Q "status.md" 2>nul
del /F /Q "query.sql" 2>nul
del /F /Q "monitor.js" 2>nul
del /F /Q "mobile-config.js" 2>nul

:: Archivi
echo Eliminazione archivi vecchi...
del /F /Q "node-portable.zip" 2>nul
del /F /Q "WKF-Suite-OpenSource-v1.0.0.tar.gz" 2>nul
del /F /Q "WKF-Suite-v1.0.0.tar.gz" 2>nul
del /F /Q "WKF-Suite-v1.0.0.zip" 2>nul

echo.
echo ✓ File eliminati
echo.
echo ========================================
echo [3/3] RIEPILOGO
echo ========================================
echo.
echo ✓ Backup salvato in: %BACKUP_NAME%
echo ✓ File inutili eliminati
echo ✓ Progetto pulito!
echo.
echo Se qualcosa va storto, ripristina da: %BACKUP_NAME%
echo.
pause
