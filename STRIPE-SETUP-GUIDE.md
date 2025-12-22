# WKF Suite - Guida Configurazione Stripe e Licensing

Guida completa per configurare i pagamenti Stripe e il sistema di licensing per WKF Suite.

## 🏪 PARTE 1: CONFIGURAZIONE STRIPE

### Step 1: Creazione Account Stripe

1. **Registrati su Stripe**
   - Vai su https://stripe.com
   - Clicca "Inizia ora" o "Start now"
   - Registrati con email aziendale
   - Completa la verifica dell'account

2. **Attivazione Account**
   - Fornisci dati aziendali
   - Aggiungi conto corrente per ricevere pagamenti
   - Verifica identità (potrebbero servire documenti)
   - Attiva account per pagamenti live

### Step 2: Configurazione Prodotto

1. **Accedi alla Dashboard Stripe**
   - Login su https://dashboard.stripe.com

2. **Crea il Prodotto WKF Suite PRO**
   ```
   Prodotti → Aggiungi Prodotto

   Nome: WKF Suite PRO
   Descrizione: Upgrade a WKF Suite PRO - Tutte le funzionalità avanzate
   Immagine: (carica logo WKF Suite se disponibile)
   ```

3. **Imposta Prezzo**
   ```
   Modello di prezzo: Pagamento unico
   Prezzo: €20.00 EUR
   Tipo fatturazione: Una tantum
   ```

### Step 3: Ottieni le Chiavi API

1. **Vai in Sviluppatori → Chiavi API**

2. **Copia le seguenti chiavi:**
   ```bash
   # MODALITÀ TEST (per sviluppo)
   STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
   STRIPE_SECRET_KEY_TEST=sk_test_...

   # MODALITÀ LIVE (per produzione)
   STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
   STRIPE_SECRET_KEY_LIVE=sk_live_...
   ```

### Step 4: Configura Webhook

1. **Vai in Sviluppatori → Webhook**

2. **Aggiungi endpoint:**
   ```
   URL endpoint: https://tuosito.com/api/stripe-webhook
   Eventi da ascoltare:
   - checkout.session.completed
   - payment_intent.succeeded
   - payment_intent.payment_failed
   ```

3. **Copia il Signing Secret:**
   ```bash
   STRIPE_ENDPOINT_SECRET=whsec_...
   ```

### Step 5: Testa Pagamenti

1. **Usa carte di test Stripe:**
   ```
   Carta Visa: 4242 4242 4242 4242
   Scadenza: qualsiasi data futura
   CVC: qualsiasi 3 cifre
   ```

2. **Verifica flusso completo:**
   - Checkout → Pagamento → Webhook → Email license key

---

## 📧 PARTE 2: CONFIGURAZIONE EMAIL SMTP

### Step 1: Configura Gmail per SMTP

1. **Attiva 2-Step Verification**
   - Vai su https://myaccount.google.com/security
   - Attiva "Verifica in due passaggi"

2. **Genera App Password**
   - Vai in "App passwords"
   - Seleziona "Mail" e "Altri"
   - Genera password per "WKF Suite"
   - Copia la password generata (16 caratteri)

### Step 2: Variabili Ambiente Email

```bash
# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuaemail@gmail.com
SMTP_PASS=xyz123abc456def7  # App password generata
```

---

## 🌐 PARTE 3: DEPLOY WEBSITE VENDITE

### Step 1: Prepara File Website

1. **Struttura directory:**
   ```
   website/
   ├── index.html (landing page)
   ├── checkout.html (Stripe checkout)
   ├── success.html (conferma pagamento)
   ├── download/
   │   └── wkf-suite.exe
   └── api/
       ├── webhook-stripe.js
       └── generate-license.js
   ```

2. **Aggiorna checkout.html con le tue chiavi:**
   ```javascript
   // Sostituisci questa riga in checkout.html
   const stripe = Stripe('pk_live_TUA_CHIAVE_PUBBLICA_QUI');
   ```

### Step 2: Deploy su Vercel (Gratuito)

1. **Installa Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd website/
   vercel login
   vercel --prod
   ```

3. **Configura variabili ambiente su Vercel:**
   - Vai su dashboard.vercel.com
   - Seleziona il progetto
   - Settings → Environment Variables
   - Aggiungi tutte le variabili Stripe e SMTP

### Step 3: Alternative Hosting

**Netlify (Gratuito):**
```bash
# Drag & drop della cartella website/ su netlify.com
# Configura variabili ambiente nelle impostazioni
```

**DigitalOcean/AWS:**
- Usa un server Node.js
- Configura HTTPS con Let's Encrypt
- Environment variables nel server

---

## 🔑 PARTE 4: SISTEMA LICENSING

### Come Funziona

1. **Cliente acquista su website**
2. **Stripe processa pagamento**
3. **Webhook genera license key**
4. **Email automatica con license key**
5. **Cliente attiva copiando license.key**

### Formato License Key

```
XXXXXXXX-XXXXXXXX-XXXXXXXX-CHECKSUM
Esempio: A1B2C3D4-E5F6789A-B1C2D3E4-F5A6B789
```

### Generazione License Key

```javascript
// Per generare manualmente una license key
const LicenseManager = require('./license-manager');
const licenseKey = LicenseManager.generateLicenseKey('cliente@email.com');
console.log('License Key:', licenseKey);
```

### Test License Key

```bash
# Testa una license key
cd C:\Users\navib\OneDrive\Documenti\testwebapp\permessi_webapp\permessi_webapp
node -e "
const LM = require('./license-manager');
const lm = new LM();
console.log('Valid:', lm.validateLicenseKey('A1B2C3D4-E5F6789A-B1C2D3E4-F5A6B789'));
"
```

---

## ⚙️ PARTE 5: CONFIGURAZIONE AMBIENTE

### Step 1: File .env (per sviluppo)

```bash
# .env file nella root del progetto
NODE_ENV=production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_ENDPOINT_SECRET=whsec_...

# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuaemail@gmail.com
SMTP_PASS=tuaapppassword

# Admin Configuration
ADMIN_KEY=tua-chiave-admin-segreta
```

### Step 2: Variabili Sistema (Windows)

```cmd
# Apri Command Prompt come Amministratore
setx STRIPE_SECRET_KEY "sk_live_..." /M
setx STRIPE_PUBLISHABLE_KEY "pk_live_..." /M
setx STRIPE_ENDPOINT_SECRET "whsec_..." /M
setx SMTP_HOST "smtp.gmail.com" /M
setx SMTP_PORT "587" /M
setx SMTP_USER "tuaemail@gmail.com" /M
setx SMTP_PASS "tuaapppassword" /M
```

### Step 3: Variabili Vercel/Netlify

**Vercel Dashboard:**
```
Settings → Environment Variables → Add
- STRIPE_SECRET_KEY: sk_live_...
- STRIPE_PUBLISHABLE_KEY: pk_live_...
- STRIPE_ENDPOINT_SECRET: whsec_...
- SMTP_HOST: smtp.gmail.com
- SMTP_PORT: 587
- SMTP_USER: tuaemail@gmail.com
- SMTP_PASS: tuaapppassword
```

---

## 🧪 PARTE 6: TESTING COMPLETO

### Test 1: Stripe Checkout

1. **Vai sul tuo sito web**
2. **Clicca "Upgrade to PRO"**
3. **Usa carta di test:** `4242 4242 4242 4242`
4. **Completa checkout**
5. **Verifica:** email ricevuta con license key

### Test 2: License Activation

1. **Scarica WKF Suite EXE dal sito**
2. **Esegui → dovrebbe mostrare "WKF Suite FREE"**
3. **Crea file license.key nella stessa cartella**
4. **Incolla license key ricevuta via email**
5. **Riavvia → dovrebbe mostrare "WKF Suite PRO"**

### Test 3: Funzionalità PRO

1. **Accedi come admin**
2. **Vai in Configurazione Email**
3. **Dovrebbe permettere configurazione (PRO only)**
4. **Test invio email dovrebbe funzionare**

---

## 📊 PARTE 7: MONITORAGGIO E ANALYTICS

### Dashboard Stripe

- **Transazioni:** dashboard.stripe.com/payments
- **Clienti:** dashboard.stripe.com/customers
- **Prodotti:** dashboard.stripe.com/products

### Google Analytics (Opzionale)

1. **Aggiungi codice tracking in website:**
   ```html
   <!-- Global site tag (gtag.js) - Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'GA_TRACKING_ID');
   </script>
   ```

2. **Track conversioni:**
   ```javascript
   // In success.html
   gtag('event', 'purchase', {
     'transaction_id': sessionId,
     'value': 20,
     'currency': 'EUR'
   });
   ```

---

## 🚨 PARTE 8: TROUBLESHOOTING

### Errori Comuni

**1. Webhook non ricevuto:**
- Verifica URL webhook in Stripe dashboard
- Controlla logs del server
- Testa endpoint manualmente

**2. Email non inviate:**
- Verifica credenziali SMTP
- Controlla cartella spam
- Testa connessione SMTP

**3. License key non funziona:**
- Verifica formato (8-8-8-8 caratteri hex)
- Controlla checksum
- Test con license key di esempio

**4. Pagamento non processato:**
- Verifica chiavi Stripe (test vs live)
- Controlla webhook signature
- Verifica eventi Stripe

### Log e Debugging

**1. Abilita logging:**
```javascript
// In server.js
console.log('Stripe webhook ricevuto:', event.type);
console.log('License key generata:', licenseKey);
```

**2. File log:**
```
C:\Users\navib\OneDrive\Documenti\testwebapp\permessi_webapp\permessi_webapp\
├── transactions.log (vendite)
├── failed-emails.log (email fallite)
└── error.log (errori)
```

---

## ✅ CHECKLIST FINALE

### Prima del lancio:
- [ ] Account Stripe attivato e verificato
- [ ] Prodotto WKF Suite PRO creato
- [ ] Chiavi API copiate e configurate
- [ ] Webhook configurato e testato
- [ ] Email SMTP funzionante
- [ ] Website deployato con HTTPS
- [ ] Test checkout completo effettuato
- [ ] License key validazione testata
- [ ] Funzionalità PRO verificate

### Dopo il lancio:
- [ ] Monitoraggio transazioni attivo
- [ ] Email di supporto configurata
- [ ] Analytics installate
- [ ] Backup database automatico
- [ ] Procedure supporto clienti definite

---

## 📞 SUPPORTO

**Per problemi tecnici:**
- Email: navib30@ik.me
- Documentazione: Questo file + LICENSING-SYSTEM.md

**Risorse Stripe:**
- Documentazione: https://stripe.com/docs
- Supporto: https://support.stripe.com

**Test Environment:**
- Stripe Test Mode: https://dashboard.stripe.com/test
- Carte di test: https://stripe.com/docs/testing

---

🎉 **Con questa configurazione, WKF Suite è pronto per vendere licenze PRO automaticamente!**