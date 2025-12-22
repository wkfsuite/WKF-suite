# 📱 APK ANDROID - Guida Completa
## Creazione App Mobile per Gestione Permessi

---

## 🎯 **PANORAMICA APK**

Il sistema è già pronto per diventare un'**App Android nativa** usando **Capacitor**.  
L'APK accederà al server Node.js esattamente come la versione browser.

**Vantaggi APK**:
- 📱 App nativa Android (non browser)
- 🚀 Performance migliori  
- 📲 Icona nel launcher
- 🔔 Notifiche push (future)
- 📱 Camera integrata per QR Code
- 🎨 UI completamente personalizzabile

---

## 🛠️ **PREREQUISITI SVILUPPO**

### **Software Richiesto**:
1. **Node.js** (già installato ✅)
2. **Android Studio** - https://developer.android.com/studio
3. **Java 17+** - Incluso in Android Studio
4. **Android SDK** - Installato con Android Studio

### **Configurazione Android Studio**:
1. **Installa Android Studio**
2. **SDK Manager** → Installa:
   - Android SDK Platform 34 (Android 14)
   - Android SDK Build-Tools 34.0.0
   - Android Emulator (per test)
3. **AVD Manager** → Crea dispositivo virtuale per test

---

## 📦 **CAPACITOR GIÀ CONFIGURATO**

Il progetto ha già **Capacitor configurato** in `package.json`:

```json
{
  "devDependencies": {
    "@capacitor/android": "^7.4.3",
    "@capacitor/cli": "^7.4.3", 
    "@capacitor/core": "^7.4.3"
  }
}
```

File di configurazione presente: `capacitor.config.ts`

---

## 🚀 **BUILD APK - PASSO PASSO**

### **1️⃣ Preparazione Iniziale**:
```bash
# Verifica installazione Capacitor
npx cap doctor

# Sincronizza progetto 
npx cap sync android
```

### **2️⃣ Configurazione IP Server**:
Modifica `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.azienda.permessi',
  appName: 'Gestione Permessi',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.51:3000',  // ← IP DEL TUO SERVER
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
```

### **3️⃣ Prima Build**:
```bash
# Apri progetto in Android Studio
npx cap open android

# OPPURE build da comando
npx cap run android --target emulator
```

### **4️⃣ Build Release (APK finale)**:
In **Android Studio**:
1. **Build** → **Generate Signed Bundle/APK**
2. **APK** → **Next**  
3. **Create new keystore** (prima volta) o usa esistente
4. **Release** → **Finish**
5. **APK generato** in: `android/app/build/outputs/apk/release/`

---

## 🎨 **PERSONALIZZAZIONE APK**

### **Icona App**:
1. **Crea icona**: 512x512px PNG
2. **Sostituisci**: `android/app/src/main/res/mipmap-*/*.png`
3. **Tool online**: https://icon.kitchen/ (genera tutti formati)

### **Nome App**:
Modifica `android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">Permessi Azienda</string>
    <string name="title_activity_main">Gestione Permessi</string>
</resources>
```

### **Colori App**:
Modifica `android/app/src/main/res/values/colors.xml`:
```xml
<resources>
    <color name="colorPrimary">#4f7cff</color>
    <color name="colorPrimaryDark">#3d5bff</color>  
    <color name="colorAccent">#4f7cff</color>
</resources>
```

### **Package Name** (importante):
Modifica in `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  appId: 'com.tuaazienda.permessi',  // ← Cambio qui
  // ...
};
```

---

## ⚙️ **CONFIGURAZIONI AVANZATE**

### **Permessi Android**:
File `android/app/src/main/AndroidManifest.xml`:
```xml
<!-- Già configurati automaticamente -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

<!-- Per camera QR Code future -->
<uses-permission android:name="android.permission.CAMERA" />
```

### **Orientamento Schermo**:
In `AndroidManifest.xml`, nella sezione `<activity>`:
```xml
android:screenOrientation="portrait"
```

### **Versione App**:
Modifica `android/app/build.gradle`:
```gradle
defaultConfig {
    versionCode 1          // Numero versione (incrementa ad ogni release)
    versionName "1.0.0"    // Versione mostrata agli utenti
}
```

---

## 🧪 **TESTING APK**

### **Emulatore Android Studio**:
1. **AVD Manager** → Start emulatore
2. **Terminal**: `npx cap run android --target emulator`
3. **App si installa** automaticamente nell'emulatore

### **Dispositivo Reale**:
1. **Abilita Developer Options** su dispositivo Android
2. **USB Debugging** → ON
3. **Connetti USB** al PC
4. **Terminal**: `npx cap run android --target device`

### **APK Release**:
1. **Copia APK** su dispositivo (USB/email/cloud)
2. **Installa** → Potrebbe richiedere "Installa da origini sconosciute"
3. **Test completo** funzionalità

---

## 🔄 **AGGIORNAMENTI APK**

### **Dopo Modifiche Server**:
```bash
# Sincronizza modifiche
npx cap sync android

# Rebuild APK
npx cap run android
```

### **Versioning**:
1. **Incrementa versionCode** in `build.gradle`
2. **Incrementa versionName** per utenti
3. **Rebuild APK** con nuova versione
4. **Ridistribuisci** agli utenti

---

## 📋 **CHECKLIST PRE-RILASCIO**

### **✅ Configurazione**:
- [ ] IP server corretto in `capacitor.config.ts`
- [ ] Nome app personalizzato
- [ ] Icona app caricata  
- [ ] Package name aziendale
- [ ] Versione corretta

### **✅ Testing**:
- [ ] Login funziona
- [ ] Richiesta permessi funziona
- [ ] Report accessibili
- [ ] UI responsive su mobile
- [ ] Notifiche toast visibili
- [ ] Logout funziona

### **✅ Build**:
- [ ] APK release generato  
- [ ] APK firmato con keystore
- [ ] Dimensione APK ragionevole (~10-50MB)
- [ ] Installazione su device reale OK

---

## 📤 **DISTRIBUZIONE APK**

### **Opzioni Distribuzione**:

**1. Distribuzione Interna**:
- **Email aziendale** con APK allegato
- **Server interno** per download
- **USB** diretto su dispositivi

**2. Google Play Console (Interno)**:
- **Internal Testing Track** per dipendenti
- **Controllo accessi** via email
- **Aggiornamenti automatici**

**3. MDM Aziendale**:
- **Mobile Device Management** se disponibile
- **Installazione centralizzata**
- **Controllo policy aziendali**

### **Istruzioni per Utenti**:
```
📱 INSTALLAZIONE APK GESTIONE PERMESSI

1. Scarica APK da [fonte aziendale]
2. Impostazioni → Sicurezza → "Origini sconosciute" → ON  
3. Tocca file APK → Installa
4. Apri app → Configura IP server (se necessario)
5. Login con credenziali aziendali

⚠️ IMPORTANTE: Connettiti al WiFi aziendale prima dell'uso!
```

---

## 🔮 **FUNZIONALITÀ FUTURE**

### **Possibili Miglioramenti**:
- 📸 **Camera QR Code**: Scansione WiFi integrata
- 🔔 **Push Notifications**: Notifiche stato permessi
- 📍 **Geolocalizzazione**: Verifica presenza in ufficio
- 🌙 **Dark Mode**: Tema scuro
- 💾 **Offline Mode**: Cache richieste senza rete
- 🔄 **Auto-sync**: Sincronizzazione automatica
- 📊 **Widget**: Statistiche rapide su home screen

### **Integrazioni Aziendali**:
- 🔐 **SSO/LDAP**: Login aziendale unificato
- 📧 **Email SMTP**: Notifiche automatiche via email
- 📊 **ERP Integration**: Collegamento sistemi HR
- 🗓️ **Calendar**: Integrazione calendario aziendale

---

## 📞 **SUPPORTO SVILUPPO APK**

### **Documentazione Ufficiale**:
- **Capacitor**: https://capacitorjs.com/docs
- **Android Studio**: https://developer.android.com/studio/intro
- **Capacitor Android**: https://capacitorjs.com/docs/android

### **Tool Utili**:
- **Icon Kitchen**: Generatore icone Android
- **APK Analyzer**: Analisi dimensioni APK (Android Studio)
- **Device File Explorer**: Debug file APK

---

---

## 📋 **RIEPILOGO FILE PRONTI PER APK**

**✅ Configurazione completa:**
- ✅ `capacitor.config.json` - Configurazione Capacitor 
- ✅ `mobile-config.js` - Gestione IP server per mobile
- ✅ `package.json` - Dipendenze Capacitor già presenti

**✅ File interfaccia mobile (cartella public/):**
- ✅ `index.html` - Pagina principale
- ✅ `login.html` - Login mobile
- ✅ `dashboardDipendente.html` - Dashboard dipendenti mobile
- ✅ `report.html` - Report mobile
- ✅ `styles.css` - Stili responsive per mobile
- ✅ `toast.js` - Sistema notifiche mobile
- ✅ `logo.png` - Logo aziendale
- ✅ Tutti i file `.js` necessari

**🔧 Da fare solo:**
1. Modifica IP server in `mobile-config.js`
2. Comandi Capacitor per build APK

---

🚀 **Il sistema è pronto per diventare un'app Android professionale!**  
**Tutti i file sono pronti - serve solo il build APK con i comandi sopra.**