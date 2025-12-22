@echo off
echo ========================================
echo Creazione pacchetti SourceForge
echo ========================================
echo.

set VERSION=1.1.1
set RELEASE_DIR=release-opensource
set OUTPUT_DIR=.

echo [1/3] Verifica cartella release...
if not exist "%RELEASE_DIR%" (
    echo ERRORE: Cartella %RELEASE_DIR% non trovata!
    pause
    exit /b 1
)

echo.
echo [2/3] Creazione archivio ZIP per Windows...
powershell -Command "Compress-Archive -Path '%RELEASE_DIR%\*' -DestinationPath '%OUTPUT_DIR%\WKF-Suite-v%VERSION%.zip' -Force"

if %ERRORLEVEL% EQU 0 (
    echo [OK] ZIP creato: WKF-Suite-v%VERSION%.zip
) else (
    echo [ERRORE] Creazione ZIP fallita!
)

echo.
echo [3/3] Creazione archivio TAR.GZ per Linux/Mac...
tar --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [SKIP] tar non disponibile - solo ZIP creato
    goto :done
)

cd "%RELEASE_DIR%"
tar -czf "..\WKF-Suite-v%VERSION%.tar.gz" *
cd ..

if exist "WKF-Suite-v%VERSION%.tar.gz" (
    echo [OK] TAR.GZ creato: WKF-Suite-v%VERSION%.tar.gz
) else (
    echo [SKIP] TAR.GZ non creato - usa solo ZIP
)

:done
echo.
echo ========================================
echo Creazione completata!
echo ========================================
dir WKF-Suite-v%VERSION%.*
echo.
echo Carica questi file su SourceForge
pause
