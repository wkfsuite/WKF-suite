# 🏢 **Sistema Gestione Permessi Aziendale**

## 📋 **Overview**
Sistema completo per la gestione dei permessi aziendali con:
- **App Desktop** per PC aziendali (Admin, Segreteria, Supervisori)
- **App Android** per smartphone dipendenti
- **Rete locale** aziendale con server centralizzato

---

## 🖥️ **App Desktop Windows (.exe)**

### **Generazione File EXE**
```bash
# Installa dipendenze
npm install

# Genera file EXE
npm run build-win
# Output: dist/Gestione Permessi Setup 1.0.0.exe
```

### **Installazione PC Aziendali**
1. Esegui `Gestione Permessi Setup 1.0.0.exe`
2. Segui wizard installazione
3. **IMPORTANTE**: Installa su PC che farà da server centrale (es: PC Admin)

### **Avvio Sistema**
1. Doppio click icona "Gestione Permessi" 
2. L'app avvia automaticamente il server interno
3. Console mostra IP rete aziendale (es: `192.168.1.100:3000`)
4. **Annota questo IP** per configurare app Android

---

## 📱 **App Android (.apk)**

### **Prerequisiti**
- Android Studio installato
- SDK Android configurato

### **Configurazione Pre-Build**
1. Apri `capacitor.config.ts`
2. Modifica IP server:
```typescript
server: {
  url: 'http://192.168.1.100:3000', // IP dal PC server
}
```

### **Generazione APK**
```bash
# Se hai problemi con dipendenze Capacitor:
npm install -g @capacitor/cli@latest

# Aggiungi Android (solo prima volta)
npx cap add android

# Copia file web
npx cap copy

# Apri progetto in Android Studio
npx cap open android

# In Android Studio:
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### **Distribuzione APK**
1. APK generato in: `android/app/build/outputs/apk/debug/app-debug.apk`
2. Trasferisci su smartphone dipendenti
3. Installa abilitando "Sorgenti sconosciute"

---

## 🌐 **Setup Rete Aziendale**

### **1. PC Server Centrale (Admin)**
```bash
# Testa server in rete
npm run test-network

# Console mostrerà:
# Server avviato su http://localhost:3000
# Accessibile in rete aziendale su http://192.168.1.100:3000
# CONFIGURAZIONE RETE AZIENDALE:
# - PC Server (questo): http://192.168.1.100:3000
# - Altri PC: Aprire http://192.168.1.100:3000 nel browser
# - App Android: Configurare IP 192.168.1.100:3000
```

### **2. Altri PC Aziendali**
**Opzione A**: Installare app desktop (raccomandata)
**Opzione B**: Aprire browser su `http://IP_SERVER:3000`

### **3. Smartphone Dipendenti**
- App Android si collega automaticamente all'IP configurato
- Deve essere sulla stessa WiFi aziendale

---

## 👥 **Ruoli e Funzionalità**

### **🔧 Amministratore**
- Configura WiFi aziendale
- Approva/rifiuta richieste permessi
- Vede tutte le richieste
- Gestisce utenti

### **👔 Supervisore**
- Approva/rifiuta richieste permessi  
- Vede tutte le richieste
- Non può configurare WiFi

### **📋 Segreteria**
- Vede tutte le richieste (sola lettura)
- Inserisce richieste per conto dipendenti
- Non può approvare/rifiutare

### **👤 Dipendente**
- Inserisce proprie richieste permessi
- Vede solo le proprie richieste
- Scarica PDF dei permessi

---

## 🚀 **Workflow Implementazione**

### **Fase 1: Setup Server**
1. Installa app desktop su PC Admin
2. Avvia app → annota IP mostrato
3. Testa accesso da altri PC: `http://IP:3000`

### **Fase 2: Config Android**
1. Modifica `capacitor.config.ts` con IP corretto
2. Builda APK con Android Studio
3. Installa su smartphone dipendenti

### **Fase 3: Deploy Aziendale**
1. Distribuisci installer PC a Admin/Segreteria/Supervisori
2. Distribuisci APK a dipendenti
3. Verifica connettività rete aziendale

### **Fase 4: Test Sistema**
1. Login con account predefiniti
2. Test creazione/approvazione richieste
3. Test sincronizzazione tra dispositivi

---

## 🔧 **Troubleshooting**

### **Server non accessibile da rete**
- Controlla firewall Windows (abilita porta 3000)
- Verifica router aziendale
- Testa con: `telnet IP_SERVER 3000`

### **App Android non si collega**
- Verifica stesso WiFi del server
- Ricompila APK con IP aggiornato
- Testa browser mobile: `http://IP_SERVER:3000`

### **Database non sincronizzato**
- Tutti i dispositivi devono puntare allo stesso server
- Riavvia server se necessario

---

## 🌟 **Account Predefiniti**
```
Admin: admin / admin123
Supervisore: luigi / super123  
Segreteria: maria / segreteria123
```

**Il sistema è pronto per il deployment aziendale!** 🎉