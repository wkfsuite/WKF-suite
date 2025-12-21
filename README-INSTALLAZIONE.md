# 🏢 Gestione Permessi Aziendali - Guida Installazione

## 📋 Panoramica Sistema
Sistema completo per la gestione dei permessi dipendenti con:
- ✅ **Server Node.js** (PC Admin sempre acceso)
- ✅ **Interfaccia Web** (Browser PC + Mobile)
- ✅ **App Android** (APK personalizzabile)
- ✅ **QR Code WiFi** per accesso automatico dipendenti

---

## 🖥️ INSTALLAZIONE PC ADMIN (Windows)

### Opzione 1: **EXE Desktop App** (Raccomandato)
1. **Scarica l'installer**: `gestione-permessi-setup.exe`
2. **Esegui come amministratore** → Installa
3. **Avvia** dal desktop o menu Start
4. Il server si avvia **automaticamente** in background
5. **System Tray**: Icona sempre presente per controllo server

### Opzione 2: **Servizio Windows** (Avvio automatico con Windows)
1. **Estrai** tutti i file in una cartella (es: `C:\GestionePermessi`)
2. **Tasto destro** su `installa-servizio.bat` → "Esegui come amministratore"
3. Il servizio si installa e **si avvia automaticamente con Windows**
4. **Controlli servizio**:
   - Avvia: `net start GestionePermessi`
   - Ferma: `net stop GestionePermessi`
   - Riavvia: `net stop GestionePermessi & net start GestionePermessi`

### Opzione 3: **Manuale** (Avvio manuale)
1. **Installa Node.js** da https://nodejs.org
2. **Estrai** tutti i file in una cartella
3. **Doppio click** su `avvia-server.bat`
4. **Mantieni la finestra aperta** (server attivo)

---

## 🌐 CONFIGURAZIONE RETE

### **Prima configurazione Admin**:
1. **Avvia server** (una delle opzioni sopra)
2. **Apri browser** → `http://localhost:3000`
3. **Login**: `admin` / `admin123`
4. **Vai su "Configurazione WiFi"**
5. **Inserisci**:
   - SSID: Nome WiFi aziendale
   - Password: Password WiFi aziendale
6. **Salva** → Sistema pronto!

### **Accesso da altri PC**:
- **URL**: `http://[IP-PC-ADMIN]:3000`
- **Esempio**: `http://192.168.1.51:3000`
- L'IP viene mostrato all'avvio del server

---

## 📱 ACCESSO DIPENDENTI (Mobile)

### **Via QR Code WiFi** (Automatico):
1. **Admin genera QR Code**: Dashboard → "📱 QR WiFi Dipendenti"
2. **Stampa QR Code** e distribuisci ai dipendenti
3. **Dipendenti scansionano QR**:
   - Si connettono automaticamente al WiFi aziendale
   - Accedono direttamente alla webapp

### **Via Browser Mobile**:
1. **Connetti** al WiFi aziendale
2. **Apri browser** → `http://[IP-PC-ADMIN]:3000`
3. **Registra account** o usa credenziali esistenti

### **Via App Android** (APK):
1. **Compila APK** con Capacitor (vedi sezione sviluppo)
2. **Installa APK** sui dispositivi
3. **Configura IP server** nel file di configurazione APK

---

## 👥 UTENTI E RUOLI

### **Utenti Predefiniti**:
| Username | Password | Ruolo | Funzioni |
|----------|----------|-------|----------|
| `admin` | `admin123` | Amministratore | Tutto + Configurazione WiFi |
| `luigi` | `super123` | Supervisore | Approva/Rifiuta permessi |
| `maria` | `segreteria123` | Segreteria | Vede e inserisce permessi dipendenti |

### **Registrazione Nuovi Utenti**:
- **Dipendenti**: Possono auto-registrarsi
- **Altri ruoli**: Solo admin può creare

---

## ⚙️ CONTROLLO E MANUTENZIONE

### **Controlli Server**:
- **Status**: System tray → Menu contestuale
- **Riavvio**: System tray → "Riavvia Server"
- **Info rete**: Mostra IP e porte attive
- **Log**: Disponibili nella console

### **File Importanti**:
- **Database**: `data/database.sqlite` (backup periodici!)
- **Logo aziendale**: `public/logo.png` (sostituire con logo aziendale)
- **Configurazioni**: Salvate nel database SQLite

### **Backup Raccomandati**:
```bash
# Backup completo
copia cartella → GestionePermessi-Backup-YYYYMMDD

# Solo database
copia data/database.sqlite → database-backup-YYYYMMDD.sqlite
```

---

## 🚨 RISOLUZIONE PROBLEMI

### **Server non si avvia**:
1. **Verifica Node.js**: Comando `node --version`
2. **Installa dipendenze**: `npm install` nella cartella
3. **Porta occupata**: Cambia porta in `server.js` (default: 3000)
4. **Firewall**: Aggiungi eccezione per Node.js e porta 3000

### **Non accessibile da rete**:
1. **Firewall Windows**: Abilita porta 3000
2. **IP corretto**: Verifica IP mostrato all'avvio server
3. **Stessa rete**: PC e dispositivi sulla stessa rete WiFi/LAN

### **Database corrotto**:
1. **Ferma server**
2. **Elimina**: `data/database.sqlite`
3. **Riavvia server** → Database ricreato con utenti base

### **Reset completo**:
1. **Ferma server**
2. **Elimina cartella**: `data`
3. **Riavvia** → Sistema come nuovo

---

## 📱 SVILUPPO APK ANDROID

### **Prerequisiti**:
- **Android Studio** installato
- **Java 17+** installato
- **Android SDK** configurato

### **Build APK**:
```bash
# Installa Capacitor CLI
npm install -g @capacitor/cli

# Sincronizza
npx cap sync android

# Configura IP server nel file:
# android/app/src/main/assets/capacitor.config.json
{
  "server": {
    "url": "http://192.168.1.51:3000"
  }
}

# Build APK
npx cap run android --target emulator
# oppure apri Android Studio:
npx cap open android
```

### **Distribuzione APK**:
1. **Build release** in Android Studio
2. **Firma APK** con keystore aziendale  
3. **Distribuisci** via email/USB/server interno

---

## 📊 FUNZIONALITÀ COMPLETE

### **✅ Già Implementate**:
- 🔐 Autenticazione sicura (bcrypt)
- 📋 Gestione permessi (giornalieri/ore/più giorni)
- ✅ Approvazione/Rifiuto da supervisori
- 📊 Report e grafici statistiche
- 🖨️ PDF scaricabili con logo aziendale
- 📱 QR Code WiFi automatico
- 🔔 Notifiche toast eleganti
- 📱 UI responsive mobile
- 🎯 Sistema ruoli completo
- 💾 Database SQLite integrato

### **🔧 Personalizzazioni Possibili**:
- **Logo aziendale**: Sostituisci `public/logo.png`
- **Colori/Tema**: Modifica `public/styles.css`
- **Campi aggiuntivi**: Estendi database e form
- **Email notifiche**: Integra servizio SMTP
- **LDAP/Active Directory**: Integra autenticazione aziendale

---

## 📞 SUPPORTO

### **File Diagnostici**:
- **Log server**: Console durante avvio
- **Database**: `data/database.sqlite` (visualizzabile con DB Browser SQLite)
- **Configurazioni**: Tutte nel database

### **Informazioni Sistema**:
- **Versione**: 1.0.0
- **Tecnologie**: Node.js, Express, SQLite, Electron, Capacitor
- **Porte**: 3000 (HTTP Server)
- **Sistema**: Windows 10/11, Android 7+

---

**🎯 Il sistema è pronto per l'uso aziendale!**  
Una volta configurato il PC Admin, tutti i dipendenti possono accedere immediatamente via web o app mobile.