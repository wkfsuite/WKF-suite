# 📦 WKF Suite - Guida Microsoft Store Submission

## 🎯 Obiettivo

Pubblicare **WKF Suite v1.0.1** sul Microsoft Store come applicazione MSIX con PWA integrata.

---

## ✅ Checklist Pre-Submission

### File Pronti:
- [x] `Package.appxmanifest` - Configurato
- [x] `Assets/` - 7 icone create
- [x] `public/manifest.json` - PWA configurata
- [x] `public/service-worker.js` - v1.0.1
- [x] Logo e icone tutte le dimensioni
- [ ] Build exe - Da creare con `npm run build-win`
- [ ] Certificato firma - Da ottenere da Partner Center

### Requisiti Microsoft:
- [ ] Account Microsoft Partner Center attivo
- [ ] Developer account verificato ($19/anno per individui, $99/anno per aziende)
- [ ] App validata da Store policies
- [ ] Screenshot e materiale marketing

---

## 📋 Specifiche Tecniche

### Informazioni App

| Campo | Valore |
|-------|--------|
| **Nome** | WKF Suite - Gestione Permessi |
| **Nome Breve** | WKF Suite |
| **Versione** | 1.0.1.0 |
| **Publisher** | WKF Suite |
| **Identity** | WKFSuite.GestionePermessi |
| **Piattaforma** | Windows 10/11 Desktop |
| **Min Version** | 10.0.17763.0 (October 2018 Update) |
| **Architecture** | x64 |

### Dimensioni Assets Richieste

| Asset | Dimensione | File | Stato |
|-------|------------|------|-------|
| Square 44x44 | 44×44 px | Square44x44Logo.png | ✅ |
| Square 71x71 | 71×71 px | Square71x71Logo.png | ✅ |
| Square 150x150 | 150×150 px | Square150x150Logo.png | ✅ |
| Square 310x310 | 310×310 px | Square310x310Logo.png | ✅ |
| Wide 310x150 | 310×150 px | Wide310x150Logo.png | ✅ |
| Store Logo | 300×300 px | StoreLogo.png | ✅ |
| Splash Screen | 620×300 px | SplashScreen.png | ✅ |

**Nota:** Le dimensioni attuali potrebbero non essere perfette. Ottimizzale con:
- Photoshop / GIMP
- Online: https://www.photopea.com/
- Tool MS: https://www.microsoft.com/store/productId/9NBLGGH5L9XT

---

## 🔨 Step-by-Step: Creazione Pacchetto MSIX

### 1. Build Applicazione

```bash
# Build exe Electron
npm run build-win
```

**Output:** `dist/win-unpacked/WKF-Suite.exe`

### 2. Verifica Preparazione

```powershell
# Esegui script di validazione
.\Build-MSIX-Prepare.ps1
```

Controlla che tutto sia ✅ verde.

### 3. Installa Windows SDK (se non presente)

Download: https://developer.microsoft.com/windows/downloads/windows-sdk/

**Componenti necessari:**
- Windows SDK Signing Tools for Desktop Apps
- Windows SDK for UWP Managed Apps

### 4. Crea Pacchetto MSIX

```powershell
# Trova MakeAppx.exe
$sdkPath = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"

# Crea pacchetto
& "$sdkPath\MakeAppx.exe" pack /d "dist\win-unpacked" /p "WKF-Suite-v1.0.1.msix" /l

# Output: WKF-Suite-v1.0.1.msix
```

**Nota:** Sostituisci `10.0.22621.0` con la tua versione SDK.

### 5. Ottieni Certificato Store

**Opzione A: Test Locale (Self-Signed)**

```powershell
# Crea certificato di test
$cert = New-SelfSignedCertificate -Type Custom -Subject "CN=WKF Suite" -KeyUsage DigitalSignature -FriendlyName "WKF Suite Test" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

# Esporta certificato
$pwd = ConvertTo-SecureString -String "password123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "WKFSuite-Test.pfx" -Password $pwd
```

**Opzione B: Certificato Store (Produzione)**

1. Vai su **Microsoft Partner Center**
2. App → Identity → View certificate
3. Download certificato `.pfx`

### 6. Firma Pacchetto

```powershell
# Con certificato test
& "$sdkPath\SignTool.exe" sign /fd SHA256 /a /f "WKFSuite-Test.pfx" /p "password123" "WKF-Suite-v1.0.1.msix"

# Con certificato Store
& "$sdkPath\SignTool.exe" sign /fd SHA256 /a /f "StoreCertificate.pfx" /p "StorePassword" "WKF-Suite-v1.0.1.msix"
```

### 7. Verifica Pacchetto

```powershell
# Valida pacchetto
& "$sdkPath\MakeAppx.exe" validate /v "WKF-Suite-v1.0.1.msix"

# Output: Deve dire "Validation succeeded"
```

---

## 🚀 Submission su Partner Center

### 1. Crea Nuova App

1. Vai su: https://partner.microsoft.com/dashboard
2. **Apps and games** → **New product** → **App**
3. **Name:** "WKF Suite - Gestione Permessi"
4. Conferma disponibilità nome

### 2. Completa Product Identity

Aggiorna `Package.appxmanifest` con identity dello Store:

```xml
<Identity
  Name="12345.WKFSuiteGestionePermessi"  <!-- Da Partner Center -->
  Publisher="CN=..."  <!-- Da Partner Center -->
  Version="1.0.1.0" />
```

### 3. Prepara Listing Store

#### Descrizione (Italiano)

```
WKF Suite - Sistema Completo di Gestione Permessi Aziendali

Gestisci facilmente permessi, ferie e assenze dei dipendenti con WKF Suite, l'app completa per aziende moderne.

🎯 FUNZIONALITÀ PRINCIPALI:
• 📝 Richiesta permessi rapida e intuitiva
• ✅ Approvazione/rifiuto con un click
• 📊 Dashboard con statistiche real-time
• 📅 Export calendario (Google, Outlook, iPhone)
• 📱 Progressive Web App - Funziona anche offline
• 📄 Report PDF personalizzabili
• 🔔 Notifiche push per aggiornamenti
• 👥 Multi-ruolo: Admin, Supervisore, Segreteria, Dipendente

💼 PERFETTO PER:
• Piccole e medie imprese
• Uffici con gestione assenze complessa
• Team che necessitano di workflow approvazioni
• Aziende che vogliono digitalizzare i permessi

🚀 TECNOLOGIE:
• Progressive Web App integrata
• Database locale sicuro
• Server Express.js incluso
• Interfaccia responsive moderna
• Funzionalità offline

📥 FACILE DA USARE:
1. Installa l'app
2. Avvia il server locale
3. Accedi con le credenziali
4. Inizia a gestire i permessi!

✨ Include anche app mobile installabile su smartphone per accesso rapido.

Ideale per PMI che cercano una soluzione completa, sicura e facile da usare per la gestione dei permessi aziendali.
```

#### Caratteristiche Brevi

- Gestione completa permessi aziendali
- Dashboard intuitiva con statistiche
- Export calendario iCal
- Progressive Web App integrata
- Multi-ruolo e workflow approvazioni
- Report PDF personalizzati
- Funziona offline
- Database locale sicuro

#### Keywords (Max 7)

1. gestione permessi
2. ferie dipendenti
3. workflow aziendale
4. pwa
5. gestione assenze
6. calendario permessi
7. hr management

### 4. Screenshot Store

**Richiesti:** Minimo 1, raccomandati 4-10

**Dimensioni:**
- Desktop: 1920×1080 o 1366×768
- Tablet: 1366×768
- Mobile: 720×1280

**Cosa fotografare:**
1. Login screen
2. Dashboard admin con statistiche
3. Dashboard dipendente - richiesta permesso
4. Lista richieste con approvazione
5. Report e calendario
6. Vista mobile PWA

**Tool:** Windows Snipping Tool o `Win + Shift + S`

### 5. Upload Pacchetto

1. **Partner Center** → Tua app → **Packages**
2. Click **Upload packages**
3. Upload `WKF-Suite-v1.0.1.msix`
4. Aspetta validazione automatica
5. Risolvi eventuali errori

### 6. Pricing & Availability

- **Pricing:** Gratuito (o €X.XX se a pagamento)
- **Markets:** Seleziona paesi (Italia, Europa, etc.)
- **Visibility:** Public
- **Release Date:** Manual release o Automatic

### 7. Age Ratings

**Questionnaire:**
- Violence: No
- Sexual Content: No
- Language: No
- Controlled Substances: No
- Medical Information: No

**Result:** Age 3+ (PEGI 3)

### 8. Properties

- **Category:** Business / Productivity
- **Subcategory:** Business management
- **Privacy Policy URL:** (Opzionale ma consigliato)
- **Support Contact:** email@tuodominio.it
- **Copyright:** © 2025 WKF Suite

### 9. Submit for Review

1. Rivedi tutto il listing
2. Click **Submit for certification**
3. Aspetta review (1-3 giorni lavorativi)

---

## ⚙️ Configurazione Avanzata MSIX

### Package.appxmanifest Completo

Il file `Package.appxmanifest` include:

- **Identity**: Nome unico app e publisher
- **Properties**: Display name, logo, descrizione
- **Dependencies**: Windows 10/11 Desktop
- **Resources**: Lingue supportate (IT, EN)
- **VisualElements**: Tile, colori, splash screen
- **Capabilities**: Full trust, network access

### Capabilities Richieste

```xml
<Capabilities>
  <rescap:Capability Name="runFullTrust" />
  <Capability Name="internetClient" />
  <Capability Name="internetClientServer" />
  <Capability Name="privateNetworkClientServer" />
</Capabilities>
```

**Spiegazione:**
- `runFullTrust`: Necessario per app desktop Win32
- `internetClient`: Connessione internet in uscita
- `internetClientServer`: Server Express locale
- `privateNetworkClientServer`: Rete aziendale locale

---

## 🧪 Test Pre-Submission

### 1. Test Installazione Locale

```powershell
# Installa certificato test
Import-PfxCertificate -FilePath "WKFSuite-Test.pfx" -CertStoreLocation Cert:\LocalMachine\TrustedPeople -Password (ConvertTo-SecureString "password123" -AsPlainText -Force)

# Installa app
Add-AppxPackage -Path "WKF-Suite-v1.0.1.msix"

# Disinstalla (dopo test)
Remove-AppxPackage -Package "WKFSuite.GestionePermessi_1.0.1.0_x64__..."
```

### 2. Test Funzionalità

- [ ] App si avvia correttamente
- [ ] Server Express parte su porta 3000
- [ ] Login funziona
- [ ] Dashboard carica
- [ ] PWA installabile
- [ ] Export calendario funziona
- [ ] Report PDF generabili
- [ ] Database salva dati

### 3. Test Compliance Store

**Usa Windows App Certification Kit:**

```powershell
# Download WACK se non presente
# Incluso in Windows SDK

# Esegui test
appcert test -appxpackagepath "WKF-Suite-v1.0.1.msix" -reportoutputpath "WKF-Suite-Report.xml"
```

**Deve passare:**
- Security tests
- Performance tests
- Supported API tests
- Windows runtime metadata tests

---

## 🚨 Troubleshooting Comune

### Errore: "Package failed signature validation"

**Soluzione:** Firma di nuovo il pacchetto con certificato corretto

### Errore: "App requires capabilities not allowed"

**Soluzione:** Verifica che `runFullTrust` sia nella lista approvata

### Errore: "Invalid package identity"

**Soluzione:** Usa l'Identity esatta da Partner Center

### Errore: "Screenshot dimensions invalid"

**Soluzione:** Ridimensiona screenshot a 1920×1080 o 1366×768

### Errore: "App crashes on launch"

**Soluzione:**
1. Verifica tutti i file necessari sono nel pacchetto
2. Test exe standalone funziona?
3. Check log eventi Windows

---

## 📊 Post-Submission

### Monitoring

Dopo approvazione, monitora:
- **Downloads**: Quante persone installano
- **Reviews**: Feedback utenti
- **Crashes**: Eventuali errori runtime
- **Engagement**: Tempo utilizzo app

### Aggiornamenti

Per rilasciare v1.0.2:

1. Incrementa versione in `Package.appxmanifest`
2. Build nuova versione
3. Crea nuovo .msix
4. Upload su Partner Center (stessa app)
5. Submit nuovo update

**Gli utenti riceveranno aggiornamento automatico via Store!**

---

## 📚 Risorse Utili

### Microsoft Docs
- Partner Center: https://partner.microsoft.com/dashboard
- MSIX Packaging: https://docs.microsoft.com/windows/msix/
- Store Policies: https://docs.microsoft.com/windows/uwp/publish/store-policies
- App Certification: https://docs.microsoft.com/windows/uwp/publish/the-app-certification-process

### Tool
- Windows SDK: https://developer.microsoft.com/windows/downloads/windows-sdk/
- MSIX Packaging Tool: https://www.microsoft.com/store/productId/9N5LW3JBCXKF
- Visual Studio 2022: https://visualstudio.microsoft.com/

### Community
- Stack Overflow: https://stackoverflow.com/questions/tagged/msix
- Microsoft Q&A: https://docs.microsoft.com/answers/topics/windows-msix.html

---

## ✅ Checklist Finale

Prima di submit:

- [ ] Build exe funzionante
- [ ] Package.appxmanifest configurato con Identity Store
- [ ] Tutte le icone Assets presenti e dimensioni corrette
- [ ] Pacchetto MSIX creato e firmato
- [ ] WACK test passati
- [ ] Screenshot caricati (minimo 4)
- [ ] Descrizione Store completa
- [ ] Keywords aggiunte
- [ ] Privacy policy (se necessaria)
- [ ] Contact info corrette
- [ ] Pricing configurato
- [ ] Age rating completato
- [ ] Test installazione locale OK

---

## 🎉 Congratulazioni!

Se hai seguito tutti gli step, WKF Suite è pronta per lo Store!

**Tempo stimato review:** 1-3 giorni lavorativi
**Costo account:** $19/anno (individual) o $99/anno (company)

Una volta approvata, l'app sarà visibile a milioni di utenti Windows!

**Buona fortuna con la submission! 🚀**
