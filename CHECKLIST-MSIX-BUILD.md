# ✅ CHECKLIST COMPLETA - Pacchetto MSIX WKF Suite v1.1.1

**Data creazione:** 2025-10-19
**Target:** Windows 10/11 Microsoft Store + Sideload
**Versione app:** 1.1.1
**Build finale:** WKF-Suite-v1.1.1.msix

---

## 📋 FASE 1: PREPARAZIONE AMBIENTE (30 minuti)

### ☐ 1.1 Software Necessario

- [ ] **Visual Studio 2022** (o 2019)
  - Scarica: https://visualstudio.microsoft.com/downloads/
  - Componenti richiesti:
    - ✓ "Universal Windows Platform development"
    - ✓ "Desktop development with C++"
    - ✓ Windows 10/11 SDK (ultima versione)

- [ ] **Windows SDK** (standalone se no VS)
  - Download: https://developer.microsoft.com/windows/downloads/windows-sdk/
  - Versione minima: 10.0.19041.0 (Windows 10 2004)

- [ ] **MSIX Packaging Tool** (opzionale ma utile)
  - Dal Microsoft Store: https://www.microsoft.com/store/productId/9N5LW3JBCXKF
  - Per conversione app esistenti

- [ ] **Node.js** e dipendenze aggiornate
  ```bash
  node --version  # v18+ raccomandato
  npm install     # Aggiorna dipendenze
  ```

### ☐ 1.2 Certificato Code Signing

**OPZIONE A - Certificato Self-Signed (per TEST)**
```powershell
# Crea certificato di test (valido 1 anno)
New-SelfSignedCertificate -Type Custom -Subject "CN=WKF Suite, O=Your Company, C=IT" `
  -KeyUsage DigitalSignature -FriendlyName "WKF Suite Cert" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

# Esporta certificato (.pfx)
# Vai a: certmgr.msc → Personal → Certificates
# Tasto destro sul cert → Export → Include private key
# Password: [SCEGLI PASSWORD SICURA]
# Salva come: wkf-suite-cert.pfx
```

**OPZIONE B - Certificato Commerciale (per PRODUZIONE)**
- [ ] Acquista certificato da CA autorizzata:
  - DigiCert: https://www.digicert.com/code-signing/
  - Sectigo: https://sectigo.com/ssl-certificates-tls/code-signing
  - GlobalSign: https://www.globalsign.com/en/code-signing-certificate
- [ ] Tipo: EV Code Signing Certificate (per Microsoft Store)
- [ ] Costo: ~€250-500/anno
- [ ] Tempo attivazione: 3-7 giorni

### ☐ 1.3 Developer Account (per Microsoft Store)

- [ ] Registrazione Microsoft Partner Center
  - URL: https://partner.microsoft.com/dashboard/
  - Costo: $19 (una tantum) per account individuale
  - Costo: $99 (una tantum) per azienda
  - Tempo approvazione: 24-48 ore

---

## 📋 FASE 2: CONFIGURAZIONE PROGETTO (45 minuti)

### ☐ 2.1 Backup Corrente

```bash
# Crea backup prima delle modifiche
git status
git add .
git commit -m "Backup pre-MSIX build v1.1.1"
git tag v1.1.1-pre-msix
```

### ☐ 2.2 Aggiorna package.json per MSIX

```json
{
  "version": "1.1.1",
  "build": {
    "appId": "com.wkfsuite.app",
    "productName": "WKF Suite",

    // AGGIUNGI configurazione MSIX
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "appx",  // ← MSIX/APPX target
          "arch": ["x64"]
        }
      ],
      "publisherName": "CN=WKF Suite, O=Your Company, C=IT",
      "certificateFile": "./certs/wkf-suite-cert.pfx",
      "certificatePassword": "${env.WIN_CSC_PASSWORD}"
    },

    "appx": {
      "applicationId": "WKFSuite",
      "displayName": "WKF Suite",
      "publisherDisplayName": "Your Company Name",
      "identityName": "YourCompany.WKFSuite",
      "backgroundColor": "#F5C842",
      "languages": ["it-IT", "en-US"],
      "addAutoLaunchExtension": false,
      "showNameOnTiles": true
    }
  }
}
```

### ☐ 2.3 Crea/Aggiorna Package.appxmanifest

**Posizione:** `./Package.appxmanifest` (root del progetto)

```xml
<?xml version="1.0" encoding="utf-8"?>
<Package
  xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
  xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
  xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities">

  <Identity
    Name="YourCompany.WKFSuite"
    Version="1.1.1.0"
    Publisher="CN=WKF Suite, O=Your Company, C=IT"
    ProcessorArchitecture="x64" />

  <Properties>
    <DisplayName>WKF Suite</DisplayName>
    <PublisherDisplayName>Your Company</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
    <Description>Sistema gestione permessi aziendali con funzionalità avanzate</Description>
  </Properties>

  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.22621.0" />
  </Dependencies>

  <Resources>
    <Resource Language="it-IT" />
    <Resource Language="en-US" />
  </Resources>

  <Applications>
    <Application Id="WKFSuite" Executable="WKF Suite.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements
        DisplayName="WKF Suite"
        Description="Gestione Permessi Aziendali"
        BackgroundColor="#F5C842"
        Square150x150Logo="Assets\Square150x150Logo.png"
        Square44x44Logo="Assets\Square44x44Logo.png">
        <uap:DefaultTile
          Wide310x150Logo="Assets\Wide310x150Logo.png"
          Square310x310Logo="Assets\Square310x310Logo.png"
          Square71x71Logo="Assets\Square71x71Logo.png"
          ShortName="WKF Suite">
        </uap:DefaultTile>
      </uap:VisualElements>
    </Application>
  </Applications>

  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
    <Capability Name="internetClient" />
    <Capability Name="internetClientServer" />
    <Capability Name="privateNetworkClientServer" />
  </Capabilities>
</Package>
```

### ☐ 2.4 Prepara Asset Immagini

**Crea cartella:** `./Assets/`

**Immagini richieste:**
- [ ] Square44x44Logo.png (44x44px) - Icona piccola
- [ ] Square71x71Logo.png (71x71px) - Tile piccolo
- [ ] Square150x150Logo.png (150x150px) - Tile medio
- [ ] Square310x310Logo.png (310x310px) - Tile grande
- [ ] Wide310x150Logo.png (310x150px) - Tile largo
- [ ] StoreLogo.png (50x50px) - Logo store

**Tool per creare asset:**
- UWP Tile Generator: https://github.com/shenchauhan/UWP-Tile-Generator
- Oppure usa Photoshop/GIMP con template

### ☐ 2.5 Variabili d'Ambiente per Build

```bash
# Crea file .env.build (NON commitare!)
WIN_CSC_PASSWORD=password_certificato_pfx
MSIX_PUBLISHER=CN=WKF Suite, O=Your Company, C=IT
```

Aggiungi a `.gitignore`:
```
.env.build
certs/*.pfx
```

---

## 📋 FASE 3: BUILD MSIX (20 minuti)

### ☐ 3.1 Pre-Build Checklist

- [ ] Versione aggiornata (package.json: 1.1.1)
- [ ] Certificato presente in `./certs/wkf-suite-cert.pfx`
- [ ] Password certificato in variabile ambiente
- [ ] Asset immagini presenti in `./Assets/`
- [ ] `.env` ESCLUSO dal build (package.json:58-59)
- [ ] Test locale funzionante (`npm start`)

### ☐ 3.2 Build Comando

```bash
# Opzione 1: electron-builder (raccomandato)
set WIN_CSC_PASSWORD=tua_password_cert
npm run build-win

# Opzione 2: Build solo MSIX
npx electron-builder --win appx

# Opzione 3: Build senza firma (per test)
npx electron-builder --win appx --publish never
```

### ☐ 3.3 Verifica Output

**Output atteso:**
```
dist/
├── WKF-Suite-v1.1.1.appx      (< 150MB)
├── WKF-Suite-v1.1.1.msix      (< 150MB)
└── win-unpacked/              (cartella temporanea)
```

### ☐ 3.4 Verifica Contenuto Pacchetto

```bash
# Estrai e ispeziona (ZIP-like)
cd dist
mkdir msix-check
tar -xf WKF-Suite-v1.1.1.msix -C msix-check

# VERIFICA CRITICA: .env NON deve essere presente!
ls msix-check/.env
# Output atteso: "No such file or directory"

# Verifica files inclusi
ls -R msix-check/
```

---

## 📋 FASE 4: TEST INSTALLAZIONE (30 minuti)

### ☐ 4.1 Test Certificato Self-Signed

**Installa certificato prima dell'app:**
```powershell
# Importa certificato in Trusted Root
Import-Certificate -FilePath ".\certs\wkf-suite-cert.pfx" `
  -CertStoreLocation Cert:\LocalMachine\Root `
  -Password (ConvertTo-SecureString "password_cert" -AsPlainText -Force)
```

### ☐ 4.2 Installa MSIX

**Metodo 1: PowerShell**
```powershell
Add-AppxPackage -Path ".\dist\WKF-Suite-v1.1.1.msix"
```

**Metodo 2: Click destro**
- Tasto destro su file .msix
- "Install" (se certificato trusted)

### ☐ 4.3 Test Funzionalità

- [ ] **Launch app** da Start Menu
- [ ] **Server avvia** correttamente
- [ ] **Login** funziona
- [ ] **Dashboard** si carica
- [ ] **Database** si crea in posizione corretta
- [ ] **Licenza PRO** viene riconosciuta
- [ ] **Stripe** funziona (se configurato)
- [ ] **PWA** installabile
- [ ] **Report PDF** generabili
- [ ] **Analytics** (solo PRO) funzionano

### ☐ 4.4 Test Percorsi File

```javascript
// Verifica in console browser (F12)
console.log('Database:', process.env.APPDATA);
// Windows MSIX: C:\Users\[USER]\AppData\Local\Packages\[AppId]\LocalCache\
```

### ☐ 4.5 Disinstalla e Reinstalla Test

```powershell
# Disinstalla
Get-AppxPackage "*WKFSuite*" | Remove-AppxPackage

# Reinstalla
Add-AppxPackage -Path ".\dist\WKF-Suite-v1.1.1.msix"

# Verifica dati persistono
# Database dovrebbe essere in LocalState/LocalCache
```

---

## 📋 FASE 5: SICUREZZA E COMPLIANCE (20 minuti)

### ☐ 5.1 Security Checklist

- [ ] **.env NON incluso** nel pacchetto
- [ ] **Certificato code-signed** valido
- [ ] **Chiavi Stripe** solo in .env locale
- [ ] **Passwords** non hardcoded
- [ ] **SSL certificati** non inclusi (o generic self-signed)
- [ ] **License.key** non inclusa
- [ ] **Database** vuoto o con dati demo

### ☐ 5.2 Privacy Policy e Terms

- [ ] Crea `PRIVACY-POLICY.md`
  - Dati raccolti (email, nomi, richieste permessi)
  - Storage locale (database SQLite)
  - Stripe payment processing
  - No tracking/analytics esterni

- [ ] Crea `TERMS-OF-SERVICE.md`
  - Licenza software
  - Limitazioni uso
  - Supporto e garanzie

- [ ] Link in app: Settings → About → Privacy Policy

### ☐ 5.3 Microsoft Store Requirements

- [ ] **Age Rating:** Business/Productivity (esegui questionnaire)
- [ ] **Screenshots:** Minimo 1, massimo 10 (1366x768 o superiore)
- [ ] **App Description:**
  - Titolo: max 200 caratteri
  - Short description: max 200 caratteri
  - Full description: max 10.000 caratteri
- [ ] **Keywords:** max 7 keywords
- [ ] **Support contact:** Email o URL
- [ ] **Privacy Policy URL:** Obbligatorio se raccoglie dati

---

## 📋 FASE 6: DISTRIBUZIONE (variabile)

### ☐ 6.1 OPZIONE A: Sideload (Intranet Aziendale)

**Per distribuzione interna senza Store:**

```powershell
# 1. Su ogni PC, abilita sideloading
Set-ItemProperty -Path HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock `
  -Name AllowAllTrustedApps -Value 1

# 2. Installa certificato aziendale
# (esegui come Admin)

# 3. Distribuisci .msix via:
# - Network share
# - Email (attento: antivirus potrebbe bloccare)
# - USB
# - Intune/SCCM
```

**Guida utente:**
```markdown
INSTALLAZIONE WKF SUITE v1.1.1

1. Doppio click su WKF-Suite-v1.1.1.msix
2. Click "Install"
3. Attendi completamento
4. Cerca "WKF Suite" nel menu Start
5. Al primo avvio, configura file .env con chiavi Stripe
```

### ☐ 6.2 OPZIONE B: Microsoft Store (Pubblico)

**Submission steps:**

1. **Login Partner Center**
   - https://partner.microsoft.com/dashboard/

2. **Create New App**
   - Apps and games → New product → MSIX or PWA app
   - Reserve app name: "WKF Suite"

3. **Upload Packages**
   - Packages → Upload .msix
   - Sistema verifica firma e manifest

4. **Store Listing**
   - Description (IT + EN)
   - Screenshots (minimo 1)
   - Keywords
   - Age rating
   - Privacy policy URL

5. **Pricing**
   - Free o Paid (es. €20)
   - Trial disponibile?

6. **Submit for Certification**
   - Tempo review: 24-48 ore
   - Potrebbero richiedere modifiche

7. **Pubblicazione**
   - Dopo approvazione: live in 4-6 ore

### ☐ 6.3 OPZIONE C: SourceForge + Documentazione

**Mantieni anche distribuzione tradizionale:**

- [ ] Carica .msix su SourceForge
- [ ] Aggiungi README-MSIX.md con istruzioni
- [ ] Spiega differenze NSIS vs MSIX:
  - NSIS: Setup classico, più flessibile
  - MSIX: Modern, auto-update, sandbox

---

## 📋 FASE 7: DOCUMENTAZIONE (30 minuti)

### ☐ 7.1 README-MSIX-INSTALL.md

```markdown
# Installazione WKF Suite v1.1.1 (MSIX)

## Requisiti
- Windows 10 (build 17763+) o Windows 11
- 200 MB spazio disco
- Certificato trusted (per sideload)

## Installazione

### Da Microsoft Store
1. Cerca "WKF Suite"
2. Click "Get" / "Install"
3. Lancia da Start Menu

### Sideload (Aziendale)
1. Installa certificato: [istruzioni]
2. Doppio click su .msix
3. Conferma installazione

## Configurazione Iniziale
1. Al primo avvio, modifica .env:
   - Posizione: %LOCALAPPDATA%\Packages\[AppId]\LocalState\.env
2. Inserisci chiavi Stripe
3. Riavvia applicazione

## Disinstallazione
Settings → Apps → WKF Suite → Uninstall
```

### ☐ 7.2 MICROSOFT-STORE-GUIDE.md

```markdown
# Guida Microsoft Store - WKF Suite

## Store Listing Copy

**Title:**
WKF Suite - Gestione Permessi Aziendali

**Short Description:**
Sistema completo per gestire richieste di permesso dei dipendenti con approvazione workflow e report avanzati.

**Full Description:**
[Copia descrizione dettagliata con features, screenshots, benefits]

**Keywords:**
- gestione permessi
- ferie dipendenti
- workflow approvazione
- report aziendali
- HR software
- time off management
- employee management

**Category:**
Business → Productivity → Business Management

**Age Rating:**
Everyone / Business use
```

### ☐ 7.3 Aggiorna Documentazione Esistente

- [ ] README.md - Aggiungi sezione MSIX
- [ ] INSTALLAZIONE-WINDOWS.md - Aggiungi metodo MSIX
- [ ] QUICK-START.md - Link a store

---

## 📋 FASE 8: MAINTENANCE E UPDATE (continuo)

### ☐ 8.1 Strategia Update

**Auto-update MSIX:**
- [ ] Microsoft Store: automatico
- [ ] Sideload: distribuisci nuova versione
- [ ] electron-updater: configura per .msix

### ☐ 8.2 Versioning

```
v1.1.1 → v1.1.2 (patch)
v1.1.x → v1.2.0 (feature)
v1.x.x → v2.0.0 (breaking)
```

**In Package.appxmanifest:**
```xml
<Identity Version="1.1.1.0" />
<!-- Version format: Major.Minor.Build.Revision -->
```

### ☐ 8.3 Telemetry (opzionale)

```javascript
// Traccia usage metrics
const usage = {
  version: '1.1.1',
  installMethod: 'msix',
  launchCount: 0,
  lastLaunch: new Date()
};
```

---

## 📋 CHECKLIST FINALE PRE-RELEASE

### ☐ CRITICAL

- [ ] ✅ Versione 1.1.1 in tutti i file
- [ ] ✅ .env ESCLUSO da build
- [ ] ✅ Certificato code-signed valido
- [ ] ✅ Test installazione OK
- [ ] ✅ Test funzionalità complete OK
- [ ] ✅ No errori in Event Viewer
- [ ] ✅ Stripe funzionante (test mode)
- [ ] ✅ Database si crea correttamente

### ☐ IMPORTANT

- [ ] 📸 Screenshots per store (minimo 3)
- [ ] 📝 Privacy policy pubblicata
- [ ] 📝 Terms of service pubblicati
- [ ] 📧 Email supporto configurata
- [ ] 🏷️ Store metadata completo
- [ ] 🧪 Test su PC pulito (VM)

### ☐ NICE TO HAVE

- [ ] 🎥 Video demo (30-60 sec)
- [ ] 📖 Documentazione utente PDF
- [ ] 🌍 Localizzazione EN oltre IT
- [ ] 💬 FAQ page
- [ ] 🎨 Promotional assets per store

---

## 🛠️ TROUBLESHOOTING COMUNE

### Build Fails

**Error: "Invalid publisher"**
- Verifica publisher name in package.json e manifest combacino
- Formato: `CN=Name, O=Company, C=Country`

**Error: "Certificate not found"**
- Verifica percorso certificato corretto
- Verifica password in variabile ambiente

**Error: "Assets not found"**
- Verifica cartella `./Assets/` esista
- Tutte le immagini PNG devono essere presenti

### Install Fails

**Error: "Certificate not trusted"**
```powershell
# Installa cert come trusted root
Import-Certificate -FilePath cert.cer -CertStoreLocation Cert:\LocalMachine\Root
```

**Error: "This app can't run on your PC"**
- Verifica architettura: x64 vs ARM
- Verifica Windows version (min: 10.0.17763)

**Error: "App didn't start"**
- Check Event Viewer: Windows Logs → Application
- Verifica path dependencies (SQLite, Node binaries)

### Runtime Issues

**Database not found**
- MSIX usa sandbox path
- Verifica: `%LOCALAPPDATA%\Packages\[AppId]\LocalState\`

**Port already in use**
- MSIX app in sandbox, ma porta è globale
- Usa porta diversa o killa processo esistente

---

## 📞 SUPPORTO E RISORSE

### Documentazione Microsoft
- MSIX Overview: https://docs.microsoft.com/windows/msix/
- Store Policies: https://docs.microsoft.com/windows/uwp/publish/store-policies
- Packaging Tool: https://docs.microsoft.com/windows/msix/packaging-tool/

### electron-builder MSIX
- Docs: https://www.electron.build/configuration/appx
- Examples: https://github.com/electron-userland/electron-builder/tree/master/test/fixtures

### Community
- Stack Overflow: [msix] [electron-builder]
- Reddit: r/electronjs
- Discord: Electron community

---

## ✅ COMPLETION

**Una volta completata questa checklist:**

1. ✅ Hai un pacchetto MSIX funzionante
2. ✅ Testato e sicuro
3. ✅ Pronto per distribuzione (Store o Sideload)
4. ✅ Documentazione completa
5. ✅ Strategia update definita

**Next steps:**
- Monitor store reviews/feedback
- Plan v1.2.0 features
- Setup telemetry/analytics
- Marketing e promozione

---

**🎉 Buon build! Domani è il giorno giusto per creare un pacchetto MSIX perfetto!**

📅 **Tempo stimato totale:** 2-3 ore (prima volta), 30 min (successive)
