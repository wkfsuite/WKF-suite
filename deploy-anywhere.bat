@echo off
echo ========================================
echo DEPLOY GESTIONE PERMESSI - OVUNQUE
echo ========================================
echo.

echo Questo script crea una cartella portatile che funziona
echo da qualsiasi posizione senza installation.
echo.

set /p target_path="Inserisci il percorso di destinazione (es: C:\Apps\GestionePermessi): "
if "%target_path%"=="" (
    echo ❌ ERRORE: Percorso non inserito!
    pause
    exit /b 1
)

echo.
echo 📁 Percorso destinazione: %target_path%
echo.

if exist "%target_path%" (
    echo ⚠️  ATTENZIONE: Directory esistente!
    set /p overwrite="Sovrascrivere? Tutti i dati verranno persi! (s/n): "
    if /i not "%overwrite%"=="s" (
        echo ❌ Operazione annullata.
        pause
        exit /b 1
    )
    echo Rimozione directory esistente...
    rmdir /s /q "%target_path%" 2>nul
)

echo [1] Creazione directory...
mkdir "%target_path%" 2>nul
mkdir "%target_path%\public" 2>nul

echo [2] Copia eseguibile...
if not exist "dist\Gestione-Permessi.exe" (
    echo ❌ ERRORE: Eseguibile non trovato!
    echo Esegui prima: pkg server.js --target node18-win-x64 --output dist/Gestione-Permessi.exe
    pause
    exit /b 1
)

copy "dist\Gestione-Permessi.exe" "%target_path%\" >nul
echo ✅ Eseguibile copiato

echo [3] Copia file web...
xcopy /E /I /Q "public\*" "%target_path%\public\" >nul
echo ✅ File web copiati

echo [4] Creazione script avvio...
echo @echo off > "%target_path%\AVVIA.bat"
echo title Gestione Permessi >> "%target_path%\AVVIA.bat"
echo echo. >> "%target_path%\AVVIA.bat"
echo echo ========================================= >> "%target_path%\AVVIA.bat"
echo echo       GESTIONE PERMESSI SERVER >> "%target_path%\AVVIA.bat"
echo echo ========================================= >> "%target_path%\AVVIA.bat"
echo echo. >> "%target_path%\AVVIA.bat"
echo echo Avvio server in corso... >> "%target_path%\AVVIA.bat"
echo echo. >> "%target_path%\AVVIA.bat"
echo "%%~dp0Gestione-Permessi.exe" >> "%target_path%\AVVIA.bat"

echo [5] Creazione README...
echo. > "%target_path%\README.txt"
echo GESTIONE PERMESSI - VERSIONE PORTATILE >> "%target_path%\README.txt"
echo ======================================== >> "%target_path%\README.txt"
echo. >> "%target_path%\README.txt"
echo AVVIO: >> "%target_path%\README.txt"
echo   Doppio click su AVVIA.bat >> "%target_path%\README.txt"
echo   (oppure direttamente su Gestione-Permessi.exe) >> "%target_path%\README.txt"
echo. >> "%target_path%\README.txt"
echo ACCESSO WEB: >> "%target_path%\README.txt"
echo   http://localhost:3000 >> "%target_path%\README.txt"
echo   (la porta potrebbe cambiare se occupata) >> "%target_path%\README.txt"
echo. >> "%target_path%\README.txt"
echo MOBILE: >> "%target_path%\README.txt"
echo   Verifica l'IP mostrato all'avvio >> "%target_path%\README.txt"
echo   es: http://192.168.1.177:3000 >> "%target_path%\README.txt"
echo. >> "%target_path%\README.txt"
echo UTENTI PREDEFINITI: >> "%target_path%\README.txt"
echo   admin / admin123 (amministratore) >> "%target_path%\README.txt"
echo   maria / segreteria123 (segreteria) >> "%target_path%\README.txt"
echo   luigi / super123 (supervisore) >> "%target_path%\README.txt"
echo. >> "%target_path%\README.txt"
echo DATABASE: >> "%target_path%\README.txt"
echo   Si crea automaticamente in data\database.sqlite >> "%target_path%\README.txt"
echo   Inizializzazione automatica al primo avvio >> "%target_path%\README.txt"
echo. >> "%target_path%\README.txt"
echo TROUBLESHOOTING: >> "%target_path%\README.txt"
echo   - Per mobile: disabilita temporaneamente firewall >> "%target_path%\README.txt"
echo   - Se il database si corrompe: elimina cartella data >> "%target_path%\README.txt"
echo   - Verra' ricreato automaticamente al prossimo avvio >> "%target_path%\README.txt"
echo. >> "%target_path%\README.txt"
echo Versione: %date% %time% >> "%target_path%\README.txt"

echo.
echo ✅ DEPLOY COMPLETATO!
echo.
echo 📂 Cartella: %target_path%
echo 🚀 Avvio: AVVIA.bat
echo 📖 Istruzioni: README.txt
echo.

set /p test_now="Vuoi testare l'installazione ora? (s/n): "
if /i "%test_now%"=="s" (
    echo.
    echo 🧪 Test in corso...
    cd /d "%target_path%"
    start "" "AVVIA.bat"
    echo ✅ Test avviato! Controlla la finestra del server.
) else (
    echo ℹ️  Per testare: vai in %target_path% ed esegui AVVIA.bat
)

echo.
echo 🎉 DEPLOY TERMINATO!
pause