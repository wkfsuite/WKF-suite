# WKF Suite - Quick Start Guide

Guida rapida per iniziare subito con WKF Suite e il sistema di licensing.

## 🚀 SETUP RAPIDO (15 minuti)

### Step 1: Testa l'EXE (2 minuti)
```bash
# Vai alla cartella e testa WKF Suite
cd "C:\Users\navib\OneDrive\Documenti\testwebapp\permessi_webapp\permessi_webapp\dist\win-unpacked"

# Esegui WKF Suite (dovrebbe mostrare "FREE")
./WKF Suite.exe

# Testa license key (dovrebbe cambiare in "PRO")
echo "A1B2C3D4-E5F6789A-B1C2D3E4-F5A6B789" > license.key
# Riavvia WKF Suite
```

### Step 2: Configura Stripe (5 minuti)
1. **Registrati:** https://stripe.com
2. **Crea prodotto:** "WKF Suite PRO" - €20
3. **Copia chiavi:** Dashboard → Sviluppatori → Chiavi API
4. **Configura webhook:** URL = https://tuosito.com/api/stripe-webhook

### Step 3: Configura Email (3 minuti)
1. **Gmail:** Attiva 2-step verification
2. **Genera App Password:** https://myaccount.google.com/apppasswords
3. **Annota credenziali:**
   ```
   SMTP_HOST: smtp.gmail.com
   SMTP_PORT: 587
   SMTP_USER: tuaemail@gmail.com
   SMTP_PASS: [app-password-16-caratteri]
   ```

### Step 4: Deploy Website (5 minuti)
```bash
# Aggiorna checkout.html con le tue chiavi Stripe
# Deploy gratis su Vercel
cd website/
npx vercel --prod
```

---

## 🔑 GENERA LA TUA PRIMA LICENSE KEY

```bash
cd C:\Users\navib\OneDrive\Documenti\testwebapp\permessi_webapp\permessi_webapp

# Genera license key per test
node -e "
const LM = require('./license-manager');
const key = LM.generateLicenseKey('test@example.com');
console.log('🔑 TUA PRIMA LICENSE KEY:');
console.log(key);
console.log('\nCopia questa chiave in un file chiamato license.key');
"
```

---

## 📧 TEMPLATE EMAIL VELOCE

```
Oggetto: WKF Suite PRO - License Key

Ciao,

La tua license key WKF Suite PRO:
[INCOLLA QUI LA CHIAVE GENERATA]

ATTIVAZIONE:
1. Crea file "license.key" nella cartella di WKF Suite
2. Incolla la chiave nel file
3. Riavvia WKF Suite

Supporto: navib30@ik.me
```

---

## 🛠️ COMANDI UTILI

### Genera License Key per Cliente
```bash
node -e "console.log(require('./license-manager').generateLicenseKey('CLIENTE@EMAIL.COM'))"
```

### Verifica License Key
```bash
node -e "
const lm = new (require('./license-manager'))();
console.log('Valida:', lm.validateLicenseKey('CHIAVE-DA-TESTARE'));
"
```

### Check Vendite
```bash
# Conta transazioni
find . -name "transactions.log" -exec wc -l {} \;
```

---

## 🎯 CHECKLIST LANCIO

### Prima di vendere:
- [ ] WKF Suite EXE funziona (FREE mode)
- [ ] License key di test attiva PRO mode
- [ ] Website online con checkout Stripe
- [ ] Email SMTP configurate
- [ ] Webhook Stripe attivo
- [ ] Test completo: acquisto → email → attivazione

### Dopo il primo cliente:
- [ ] Verifica transazione in Stripe dashboard
- [ ] Controlla email license key ricevuta
- [ ] Supporta il cliente nell'attivazione
- [ ] Monitora feedback e problemi

---

## 📞 SUPPORTO EMERGENZE

**Problema: Cliente non riceve email**
- Controlla Stripe webhook logs
- Verifica SMTP settings
- Riinvia manualmente con template sopra

**Problema: License key non funziona**
- Verifica formato: 8-8-8-8 caratteri hex maiuscoli
- Controlla nome file: esattamente "license.key"
- Genera nuova chiave se necessario

**Problema: Stripe non processa**
- Verifica chiavi API (test vs live)
- Controlla webhook URL raggiungibile
- Testa con carte di prova Stripe

---

## 🎉 SEI PRONTO!

Con questa configurazione hai tutto il necessario per:
- ✅ Distribuire WKF Suite EXE
- ✅ Vendere upgrade PRO automaticamente
- ✅ Gestire clienti e supporto
- ✅ Monitorare vendite e fatturato

**Prossimi passi:**
1. Testa tutto il flusso end-to-end
2. Lancia su un piccolo gruppo di test
3. Raccogli feedback
4. Scala la distribuzione

**File importanti creati:**
- `STRIPE-SETUP-GUIDE.md` - Setup completo Stripe
- `LICENSE-MANAGEMENT.md` - Gestione quotidiana licenze
- `BUILD-GUIDE.md` - Build e distribuzione EXE
- `LICENSING-SYSTEM.md` - Documentazione tecnica completa

Buona fortuna con WKF Suite! 🚀