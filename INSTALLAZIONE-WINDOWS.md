# Installazione Applicazione Windows Standalone

## File Generato
- **Nome**: `Gestione Permessi-Setup-1.0.0.exe`
- **Dimensione**: ~96 MB
- **Percorso**: `dist/Gestione Permessi-Setup-1.0.0.exe`

## Caratteristiche dell'Applicazione
✅ **Standalone**: Non richiede installazione separata di Node.js o altri componenti  
✅ **Database Embedded**: SQLite viene creato automaticamente nella cartella di installazione  
✅ **Installer Windows**: Installer NSIS con opzioni di personalizzazione  
✅ **System Tray**: L'applicazione resta attiva in background  
✅ **Autostart Server**: Il server Node.js si avvia automaticamente  

## Processo di Installazione

1. **Doppio click** su `Gestione Permessi-Setup-1.0.0.exe`
2. Seguire la procedura guidata di installazione
3. Scegliere la cartella di installazione (opzionale)
4. L'installer creerà:
   - Shortcut sul Desktop
   - Voce nel Menu Start
   - Cartella programma con eseguibile
   - Database SQLite nella cartella `/data`

## Struttura Post-Installazione
```
C:\Programmi\Gestione Permessi\
├── Gestione Permessi.exe    # Applicazione principale
├── resources/                # Risorse dell'app
├── data/                     # Database SQLite (creato al primo avvio)
│   └── database.sqlite
└── [altri file di sistema]
```

## Funzionamento
- **Primo avvio**: Il database viene creato automaticamente
- **Server**: Si avvia su `http://localhost:3000`
- **Accesso rete**: Altri PC possono accedere tramite l'IP del PC host
- **System Tray**: Click destro per opzioni aggiuntive

## Note Tecniche
- **Tecnologie**: Electron + Node.js + SQLite
- **Porta**: 3000 (HTTP) / 8443 (HTTPS)
- **Database**: SQLite embedded nella cartella di installazione
- **Ambiente**: Automaticamente impostato su produzione

## Disinstallazione
- Pannello di Controllo → Programmi → "Gestione Permessi"
- Oppure eseguire il file uninstaller dalla cartella di installazione