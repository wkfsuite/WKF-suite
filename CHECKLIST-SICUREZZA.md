# 🛡️ CHECKLIST SICUREZZA - Versione Beta
## Protezione Infrastrutture Aziendali

---

## ⚠️ **PRIMA DI INSTALLARE - VALUTAZIONE RISCHI**

### **🏢 Ambiente Aziendale:**
- [ ] **Rete isolata/VLAN**: Sistema su rete separata da sistemi critici
- [ ] **Firewall configurato**: Regole specifiche per porta 3000
- [ ] **Backup infrastruttura**: Sistemi critici già protetti
- [ ] **Piano disaster recovery**: Procedure ripristino esistenti
- [ ] **Responsabile IT**: Persona competente identificata

### **💻 PC Server (Admin):**
- [ ] **Antivirus aggiornato**: Protezione real-time attiva
- [ ] **Windows aggiornato**: Patch sicurezza recenti
- [ ] **Account dedicato**: Utente specifico per il servizio (non admin generale)
- [ ] **Disco disponibile**: Almeno 10GB liberi per logs/database
- [ ] **RAM sufficiente**: Minimo 4GB per stabilità sistema

---

## 🔒 **CONFIGURAZIONI SICUREZZA OBBLIGATORIE**

### **1️⃣ Firewall Windows:**
```cmd
# Apri Command Prompt come Amministratore
netsh advfirewall firewall add rule name="Gestione Permessi Server" dir=in action=allow protocol=TCP localport=3000

# Solo se necessario accesso da specifici IP:
netsh advfirewall firewall add rule name="Gestione Permessi Restricted" dir=in action=allow protocol=TCP localport=3000 remoteip=192.168.1.0/24
```

### **2️⃣ Utente Servizio Windows:**
```cmd
# Crea utente dedicato (come Amministratore)
net user GestionePermessiSvc P@ssw0rd123! /add /comment:"Servizio Gestione Permessi"
net localgroup "Users" GestionePermessiSvc /add

# Nega logon interattivo per sicurezza
ntrights +r SeDenyInteractiveLogonRight -u GestionePermessiSvc
```

### **3️⃣ Cartella Protetta:**
- **Percorso**: `C:\GestionePermessi\` (non in Documents/Desktop)
- **Permessi**: Solo utente servizio + admin
- **Esclusione antivirus**: Cartella `data\` per performance database

---

## 💾 **BACKUP AUTOMATICI - CONFIGURAZIONE**

### **Script Backup Giornaliero** (`backup-automatico.bat`):
```batch
@echo off
set DATA_DIR=C:\GestionePermessi\data
set BACKUP_DIR=C:\GestionePermessi\backup
set OGGI=%date:~6,4%-%date:~3,2%-%date:~0,2%

mkdir "%BACKUP_DIR%" 2>nul
mkdir "%BACKUP_DIR%\%OGGI%" 2>nul

copy "%DATA_DIR%\database.sqlite" "%BACKUP_DIR%\%OGGI%\database_%OGGI%.sqlite"
copy "%DATA_DIR%\*.log" "%BACKUP_DIR%\%OGGI%\" 2>nul

# Mantieni solo ultimi 7 giorni
forfiles /p "%BACKUP_DIR%" /m *.* /d -7 /c "cmd /c rmdir /s /q @path" 2>nul

echo Backup completato: %BACKUP_DIR%\%OGGI%
```

### **Scheduled Task Windows:**
```cmd
# Esegui come Amministratore - Backup giornaliero alle 02:00
schtasks /create /tn "Backup Gestione Permessi" /tr "C:\GestionePermessi\backup-automatico.bat" /sc daily /st 02:00 /ru SYSTEM
```

---

## 🌐 **HARDENING RETE**

### **✅ Configurazioni Raccomandate:**

**Router/Switch Aziendale:**
- [ ] **Port Security**: Limita MAC address su porte switch
- [ ] **VLAN Separation**: Isola traffico gestione permessi
- [ ] **QoS Rules**: Priorità bassa per traffico non critico

**Access Point WiFi:**
- [ ] **WPA3/WPA2 Enterprise**: Mai WEP o Open
- [ ] **MAC Filtering**: Solo dispositivi autorizzati
- [ ] **Guest Network**: Rete separata per ospiti
- [ ] **Bandwidth Limiting**: Limiti per evitare saturazione

### **🚫 Porte da NON Esporre:**
- **3000**: Solo rete locale, mai internet
- **22/3389**: SSH/RDP solo se necessario con key/VPN
- **Database**: Mai esporre SQLite direttamente

---

## 👤 **GESTIONE UTENTI SICURA**

### **Policy Password Minime:**
- [ ] **8+ caratteri** con maiuscole/minuscole/numeri
- [ ] **Cambio obbligatorio ogni 90 giorni** (politica aziendale)
- [ ] **No password comuni** (123456, password, etc.)
- [ ] **Account lock**: 5 tentativi falliti = blocco temporaneo

### **Controllo Accessi:**
```sql
-- Query controllo accessi sospetti (esegui su database.sqlite)
SELECT username, COUNT(*) as tentativi_login, MAX(createdAt) as ultimo_accesso 
FROM utenti 
WHERE createdAt > datetime('now', '-24 hours') 
GROUP BY username 
HAVING COUNT(*) > 10;
```

### **Audit Periodici:**
- [ ] **Settimanale**: Verifica utenti attivi vs dipendenti attuali
- [ ] **Mensile**: Review ruoli e permessi assegnati
- [ ] **Ex-dipendenti**: Disattivazione immediata account

---

## 📊 **MONITORING E ALERT**

### **Metriche da Monitorare:**
- 🖥️ **CPU/RAM Server**: > 80% per più di 10 minuti
- 💾 **Spazio disco**: < 1GB disponibile
- 🌐 **Connessioni**: > 50 connessioni simultanee
- ⚠️ **Errori applicazione**: > 10 errori/ora
- 🔐 **Login falliti**: > 20 tentativi/ora

### **Script Monitoring** (`monitor-server.ps1`):
```powershell
# Controllo risorse sistema
$cpu = Get-Counter "\Processor(_Total)\% Processor Time"
$ram = Get-Counter "\Memory\% Committed Bytes In Use"
$disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DeviceID -eq "C:"}

if ($cpu.CounterSamples[0].CookedValue -gt 80) {
    Write-EventLog -LogName Application -Source "GestionePermessi" -EventID 1001 -EntryType Warning -Message "CPU usage high: $($cpu.CounterSamples[0].CookedValue)%"
}
```

---

## 🚨 **PIANO EMERGENZA**

### **Procedura Incident Response:**

**1️⃣ Rilevamento Problema:**
- [ ] **Stop immediato servizio**: `net stop GestionePermessi`
- [ ] **Isola PC da rete**: Disconnetti cavo/WiFi
- [ ] **Backup d'emergenza**: Copia cartella `data\` su USB

**2️⃣ Assessment Danni:**
- [ ] **Verifica integrità database**: Apri con DB Browser SQLite
- [ ] **Check log errori**: File `error.html` o console output
- [ ] **Scan malware**: Scansione completa antivirus
- [ ] **Verifica accessi**: Chi era loggato durante incidente

**3️⃣ Recovery:**
- [ ] **Ripristino database**: Da backup più recente
- [ ] **Patch/fix problema**: Se identificato
- [ ] **Test funzionalità**: Tutti i moduli principali
- [ ] **Restart servizio**: Solo dopo verifica completa

### **Contatti Emergenza:**
```
IT Manager: [NOME] - [TELEFONO] - [EMAIL]
Admin Sistema: [NOME] - [TELEFONO] - [EMAIL]
Fornitore Software: [CONTATTO] - [SUPPORTO EMAIL]
```

---

## 🔍 **SECURITY TESTING**

### **Test Penetration Base:**
- [ ] **SQL Injection**: Test input forms con caratteri speciali
- [ ] **XSS Testing**: Script injection nei campi note
- [ ] **Brute Force**: Test multiple password errate
- [ ] **Session Hijacking**: Verifica timeout sessioni
- [ ] **File Access**: Tentativo accesso diretto a `/data/`

### **Vulnerability Assessment:**
```cmd
# Scan porte aperte (da PC diverso in rete)
nmap -sV -sC 192.168.1.51

# Test connettività
telnet 192.168.1.51 3000

# Verifica SSL/TLS se implementato
openssl s_client -connect 192.168.1.51:3000
```

---

## 📋 **CHECKLIST PRE-PRODUZIONE**

### **✅ Prima di Rilasciare agli Utenti:**
- [ ] **Disclaimer firmato** da responsabile aziendale
- [ ] **Backup strategy** implementata e testata
- [ ] **Firewall rules** attive e verificate
- [ ] **User training** completato
- [ ] **Emergency procedures** documentate
- [ ] **Monitoring tools** configurati
- [ ] **Performance testing** eseguito con carico simulato
- [ ] **Recovery testing** da backup eseguito con successo

### **📝 Documentazione Richiesta:**
- [ ] **Network diagram** con dettagli sicurezza
- [ ] **User access matrix** ruoli e permessi
- [ ] **Backup/restore procedures** testate
- [ ] **Incident response plan** con contatti
- [ ] **Change management** processo aggiornamenti

---

## ⚖️ **COMPLIANCE E AUDIT**

### **GDPR Considerations:**
- [ ] **Data mapping**: Documenta quali dati personali gestisce
- [ ] **Consent tracking**: Se necessario per dipendenti
- [ ] **Right to erasure**: Procedura cancellazione dati
- [ ] **Data breach notification**: Piano entro 72h se richiesto

### **Audit Trail:**
- [ ] **Log accessi**: Chi, quando, cosa ha fatto
- [ ] **Change tracking**: Modifiche configurazione
- [ ] **Backup verification**: Restore test mensili
- [ ] **Security reviews**: Trimestrale minimo

---

**🛡️ RICORDA: La sicurezza è un processo continuo, non un evento una tantum!**

**📞 In caso di dubbi su sicurezza: FERMARE il sistema e consultare esperti IT prima di procedere.**