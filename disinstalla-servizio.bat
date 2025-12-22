@echo off
title Disinstallazione Servizio - Gestione Permessi
cls

echo ================================================
echo   DISINSTALLAZIONE SERVIZIO WINDOWS
echo   Gestione Permessi Aziendali
echo ================================================
echo.

REM Verifica privilegi amministratore
net session >nul 2>&1
if errorlevel 1 (
    echo ERRORE: Esegui come Amministratore!
    echo.
    echo Tasto destro su questo file ^> "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

echo Privilegi amministratore: OK
echo.

REM Crea script di disinstallazione
echo Preparazione disinstallazione...

echo var Service = require('node-windows').Service; > disinstalla-servizio.js
echo. >> disinstalla-servizio.js
echo var svc = new Service({ >> disinstalla-servizio.js
echo   name: 'GestionePermessi', >> disinstalla-servizio.js
echo   script: require('path').join(__dirname, 'server.js') >> disinstalla-servizio.js
echo }); >> disinstalla-servizio.js
echo. >> disinstalla-servizio.js
echo svc.on('uninstall', function(){ >> disinstalla-servizio.js
echo   console.log('Servizio disinstallato con successo!'); >> disinstalla-servizio.js
echo }); >> disinstalla-servizio.js
echo. >> disinstalla-servizio.js
echo svc.uninstall(); >> disinstalla-servizio.js

echo Disinstallazione servizio...
node disinstalla-servizio.js

echo.
echo ================================================
echo DISINSTALLAZIONE COMPLETATA!
echo ================================================
echo.
echo Il servizio "GestionePermessi" e' stato rimosso.
echo Il server non si avviera' piu' automaticamente.
echo.
echo Per riavviarlo manualmente: avvia-server.bat
echo.
pause

REM Pulisce file temporaneo
del disinstalla-servizio.js >nul 2>&1