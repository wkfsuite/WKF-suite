# WKF Suite Licensing System

Sistema di licensing completo per WKF Suite con vendita web e validazione offline.

## 🏗️ Architettura

```
WKF Suite EXE (Standalone)
├── license.key (file di testo con license key)
├── server.js (con license manager integrato)
└── public/ (dashboard con upgrade UI)

Website di vendita
├── index.html (landing page)
├── checkout.html (Stripe integration)
├── success.html (post-pagamento)
└── api/
    ├── webhook-stripe.js
    └── generate-license.js
```

## ✨ Caratteristiche

### 🔐 Validazione License
- **Offline**: Nessuna connessione internet richiesta dopo attivazione
- **Sicura**: Algoritmo checksum per prevenire key false
- **Semplice**: File `license.key` nella cartella dell'EXE

### 💳 Sistema di Vendita
- **Stripe Integration**: Checkout sicuro e professionale
- **Email Automatica**: License key inviata istantaneamente
- **One-time Payment**: €20 pagamento unico, no abbonamenti

### 🎨 UI/UX
- **Status Badge**: Mostra FREE/PRO nel dashboard
- **Upgrade Prompts**: Modal elegante per funzioni PRO
- **Feature Gating**: Disabilita automaticamente funzioni PRO per utenti FREE

## 🚀 Come Funziona

### 1. Download & Run (FREE)
```
Utente scarica WKF Suite.exe → Funziona immediatamente in modalità FREE
```

### 2. Upgrade Process
```
Click "Upgrade to PRO" → Stripe Checkout (€20) → Email con license key → Copia license.key → Riavvio → PRO attivato
```

### 3. License Validation
```javascript
// All'avvio dell'EXE
1. Cerca license.key nella stessa cartella
2. Se esiste: valida checksum
3. Se valida: modalità PRO
4. Se invalida/mancante: modalità FREE
```

## 📁 File Structure

### WKF Suite EXE
```
WKF Suite.exe
license.key          # File contenente la license key (se PRO)
data/
├── database.sqlite
└── transactions.log
```

### Website
```
website/
├── index.html       # Landing page con download FREE
├── checkout.html    # Stripe checkout
├── success.html     # Pagina di conferma
├── download/
│   └── wkf-suite.exe
└── api/
    ├── webhook-stripe.js      # Gestisce pagamenti Stripe
    └── generate-license.js    # Genera e invia license key
```

## 🔑 License Key Format

```
XXXXXXXX-XXXXXXXX-XXXXXXXX-CHECKSUM
```

- **24 caratteri hex**: Generati da hash di email + timestamp + salt
- **8 caratteri checksum**: Validazione offline
- **Esempio**: `A1B2C3D4-E5F6789A-B1C2D3E4-F5A6B789`

## ⚙️ Configurazione

### Environment Variables
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_ENDPOINT_SECRET=whsec_...

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin
ADMIN_KEY=your-secret-admin-key
```

### Stripe Setup
1. Crea account Stripe
2. Aggiungi webhook endpoint: `/api/stripe-webhook`
3. Eventi da ascoltare: `checkout.session.completed`
4. Configura product per €20

## 🎯 Features FREE vs PRO

### FREE (€0)
- ✅ Gestione utenti illimitati
- ✅ Richieste permessi base
- ✅ Dashboard semplice
- ✅ QR Code Wi-Fi
- ✅ Database SQLite locale
- ✅ Modalità offline

### PRO (€20 one-time)
- ✅ **Tutto di FREE +**
- ⭐ **Email notifiche automatiche**
- ⭐ **Analytics avanzate con grafici**
- ⭐ **Report PDF personalizzati**
- ⭐ **Template email personalizzati**
- ⭐ **Branding personalizzato**
- ⭐ **Supporto prioritario**
- ⭐ **Backup automatici**

## 🔧 API Endpoints

### License Management
```javascript
GET    /api/license/status           // Status corrente
POST   /api/license/activate         // Attiva license key
POST   /api/license/deactivate       // Disattiva license key
GET    /api/license/features/:feature // Verifica singola feature
```

### Payment & Generation
```javascript
POST   /api/create-checkout-session  // Crea sessione Stripe
POST   /api/stripe-webhook           // Webhook Stripe
GET    /api/payment-status/:sessionId // Status pagamento
POST   /api/generate-manual-license  // Genera license manuale (admin)
```

## 📧 Email Template

Quando un cliente acquista PRO, riceve automaticamente:

```
🏢 WKF Suite PRO - La tua License Key è pronta!

La tua License Key: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX

ISTRUZIONI ATTIVAZIONE:
1. Crea file "license.key" nella cartella di WKF Suite.exe
2. Incolla la license key nel file
3. Riavvia WKF Suite → Vedrai "PRO" nel titolo

FUNZIONI SBLOCCATE:
✅ Email automatiche
✅ Analytics avanzate
✅ Report PDF personalizzati
✅ Supporto prioritario
```

## 🛡️ Sicurezza

### License Key
- **Non crackabile facilmente**: Checksum validation
- **No hardcoded keys**: Tutto generato dinamicamente
- **Offline validation**: Funziona senza internet

### Payment
- **Stripe PCI Compliant**: Nessun dato di pagamento memorizzato
- **Webhook verification**: Signature validation
- **Transaction logging**: Audit trail completo

## 🚀 Deployment

### 1. Website (Vercel/Netlify)
```bash
# Deploy website di vendita
cd website/
vercel --prod
```

### 2. EXE Distribution
```bash
# Build WKF Suite con licensing
npm run build-win
# Upload a download/wkf-suite.exe
```

### 3. Stripe Configuration
1. Setup webhook endpoint
2. Configure payment success redirect
3. Test checkout flow

## 📊 Analytics & Tracking

### Download Tracking
```javascript
// Traccia download FREE
fetch('/api/track-download', {
  method: 'POST',
  body: JSON.stringify({ version: 'free' })
});
```

### Conversion Tracking
```javascript
// Traccia conversioni PRO
gtag('event', 'purchase', {
  transaction_id: session_id,
  value: 20,
  currency: 'EUR'
});
```

### Metrics da Monitorare
- **Download FREE**: Quanti scaricano la versione gratuita
- **Conversion Rate**: FREE → PRO %
- **Support Tickets**: Volume richieste aiuto
- **Feature Usage**: Quali funzioni PRO sono più usate

## 🛟 Supporto Clienti

### Self-Service
- **License key validation**: Feedback immediato nell'UI
- **Istruzioni chiare**: Step-by-step nella email
- **Modal di aiuto**: Nell'applicazione

### Support Prioritario (PRO)
- **Email**: navib30@ik.me
- **Response Time**: 24h per clienti PRO
- **Remote assistance**: Se necessario

## 📈 Roadmap & Improvements

### Fase 1 (Attuale)
- ✅ Sistema base FREE/PRO
- ✅ Stripe integration
- ✅ Email automatiche
- ✅ UI upgrade prompts

### Fase 2 (Prossima)
- 🔄 Auto-update per PRO users
- 🔄 Usage analytics per admin
- 🔄 Reseller program
- 🔄 Corporate licensing

### Fase 3 (Futura)
- 🔄 Multi-language support
- 🔄 Mobile app PRO features
- 🔄 API access for PRO
- 🔄 White-label licensing

## 🎯 Vantaggi Commerciali

### Per il Business
- **Revenue Stream**: €20 × conversioni
- **Low Maintenance**: Sistema automatico
- **Scalable**: No limiti geografici
- **Professional**: Checkout Stripe professionale

### Per l'Utente
- **Try Before Buy**: Versione FREE completa
- **One-time Payment**: No abbonamenti ricorrenti
- **Instant Access**: Attivazione immediata
- **Offline**: Funziona sempre, anche offline

### Per le PMI
- **Affordable**: €20 molto accessibile
- **No IT Skills**: Semplicissimo da attivare
- **Complete Solution**: Tutto incluso
- **Italian Support**: Supporto in italiano

---

## 📞 Contatti

**Sviluppatore**: navib30@ik.me
**Website**: https://wkfsuite.com
**Support**: Clienti PRO hanno supporto prioritario

**Note**: Sistema testato e ready per produzione. Configurazione Stripe richiesta per pagamenti live.