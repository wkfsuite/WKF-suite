# 📦 GUIDA INSTALLAZIONE NUOVE SEDI
## Sistema Gestione Permessi v1.0.0

### 🎯 **File per Nuove Installazioni**
- **Setup Installer**: `Gestione Permessi-Setup-1.0.0.exe` (177MB)
- **Database**: Completamente pulito, solo utente admin predefinito
- **Configurazione**: Pronta all'uso, nessun dato precedente

---

### 🚀 **Installazione Rapida**

1. **Download e Installazione**
   ```
   - Scaricare: Gestione Permessi-Setup-1.0.0.exe
   - Eseguire come Amministratore
   - Seguire procedura guidata
   - Installazione automatica in: C:\Program Files\Gestione Permessi\
   ```

2. **Primo Avvio**
   ```
   - Avviare dal menu Start: "Gestione Permessi"
   - O dal desktop se creato link
   - Server si avvia automaticamente
   ```

---

### 🔐 **Credenziali Predefinite**

**ADMIN INIZIALE:**
- **Username**: `admin`
- **Password**: `admin123`
- **Matricola**: `ADM001`
- **Ruolo**: Amministratore

> ⚠️ **IMPORTANTE**: Cambiare la password al primo accesso!

---

### 🌐 **Accesso al Sistema**

**URL Locali:**
- **Desktop**: `http://localhost:3000`
- **Rete aziendale**: `http://IP-PC:3000`

**Mobile (stesso WiFi):**
- Trovare IP PC: `ipconfig` → IPv4 Wi-Fi
- Browser mobile: `http://IP-PC:3000`

---

### 👥 **Configurazione Iniziale**

#### 1. **Cambio Password Admin**
```
1. Login con admin/admin123
2. Dashboard Admin → Gestione Utenti
3. Modifica password amministratore
```

#### 2. **Creazione Utenti**
```
RUOLI DISPONIBILI:
- admin: Accesso completo sistema
- supervisore: Approva richieste, statistiche
- segreteria: Gestione richieste, stampe
- dipendente: Solo richieste personali (timeout 5 min)
```

#### 3. **Configurazione WiFi**
```
1. Admin → WiFi QR Code
2. Inserire credenziali WiFi aziendali
3. Genera QR per auto-connessione dipendenti
```

---

### 📱 **Configurazione Mobile**

#### **Test Connettività**
1. PC e mobile su stesso WiFi
2. Aprire: `http://IP-PC:3000/mobile-test.html`
3. Verificare tutti test verdi

#### **Problemi Comuni**
- **Firewall Windows**: Aggiungere eccezione per "Gestione Permessi"
- **Antivirus**: Escludere cartella installazione
- **Router**: Disabilitare "Isolamento AP" se presente

---

### 🛠️ **Manutenzione Database**

#### **Backup Automatico**
```
- Database: data/database.sqlite
- Backup automatici in: data/backup/
- Conservare backup prima di aggiornamenti
```

#### **Reset Completo** (se necessario)
```
1. Fermare applicazione
2. Eliminare: data/database.sqlite
3. Riavviare app → database si ricreerà pulito
4. Rifare configurazione utenti
```

---

### 📊 **Monitoraggio Sistema**

#### **Dashboard Admin**
- **Statistiche**: Richieste per periodo
- **Utenti Attivi**: Dipendenti registrati
- **Monitor Server**: Errori, performance
- **Logs**: File in logs/monitor.log

#### **Controlli Periodici**
- Backup database mensili
- Pulizia logs vecchi
- Aggiornamento password utenti
- Verifica connettività mobile

---

### 🔧 **Risoluzione Problemi**

#### **Server Non Parte**
```
1. Verificare porta 3000 libera
2. Eseguire come Amministratore
3. Controllare logs: logs/monitor.log
```

#### **Mobile Non Si Connette**
```
1. Stesso WiFi PC-mobile
2. Firewall Windows → Aggiungi eccezione
3. Test: http://IP-PC:3000/api/ping
4. Cache browser: Ctrl+F5
```

#### **Database Corrotto**
```
1. Stop applicazione
2. Backup: data/database.sqlite
3. Riavvio → auto-riparazione
4. Se persiste: reset completo
```

---

### 📞 **Supporto Tecnico**

#### **File Logs Utili**
- `logs/monitor.log` - Server events
- `data/database-backup-*.sqlite` - Backup automatici

#### **Informazioni Sistema**
```
- Versione: 1.0.0
- Database: SQLite3
- Framework: Node.js + Express
- Mobile: Progressive Web App
```

#### **Comandi Utili**
```
- Test server: curl http://localhost:3000/api/ping
- Info database: logs nella console applicazione
- Reset cache: Cancella dati browser
```

---

### ✅ **Checklist Post-Installazione**

- [ ] Installazione completata senza errori
- [ ] Primo accesso admin/admin123 riuscito
- [ ] Password admin cambiata
- [ ] Almeno un supervisore creato
- [ ] Configurazione WiFi inserita
- [ ] Test mobile connection OK
- [ ] Firewall configurato correttamente
- [ ] Backup iniziale database creato

---

**🎉 Sistema pronto per la produzione!**

> **Nota**: Questo setup è stato preparato con database completamente pulito, ideale per nuove sedi senza dati precedenti.