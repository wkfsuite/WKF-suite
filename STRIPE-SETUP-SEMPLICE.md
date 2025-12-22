claude

# 💳 GUIDA PAGAMENTI DIRETTI - WKF Suite PRO

**Sistema di pagamento integrato SENZA SITO WEB - Solo Stripe Checkout**

## 🎯 Cosa fa questa soluzione:

1. **Bottone "Upgrade PRO"** appare automaticamente nella versione FREE
2. **Click → Apre Stripe Checkout** direttamente (pagina di pagamento Stripe)
3. **Pagamento → Genera License Key** automaticamente
4. **Copia License Key → App diventa PRO** immediatamente

**NO SITO WEB NECESSARIO!** Tutto funziona direttamente dall'applicazione.

---

## ⚡ SETUP VELOCE (3 passi)

### 1. 🔑 **Ottieni chiavi Stripe** (GRATUITO)

1. Vai su https://stripe.com → **Registrati GRATIS**
2. Dashboard Stripe → **Sviluppatori** → **Chiavi API**
3. Copia le chiavi:
   ```
   Chiave Pubblica: pk_test_51ABC...
   Chiave Segreta: sk_test_51ABC...
   ```

### 2. ⚙️ **Configura WKF Suite**

Apri il file `server.js` (righe 736-742) e inserisci le tue chiavi:

```javascript
// 🔑 CONFIGURAZIONE STRIPE - INSERISCI LE TUE CHIAVI QUI
const STRIPE_CONFIG = {
  // Modalità test (usa queste per testare)
  secretKey: 'sk_test_51ABC...', // 👈 La tua chiave segreta
  publishableKey: 'pk_test_...', // 👈 La tua chiave pubblica
};
```

**Importante:** Sostituisci anche nel file `public/stripe-upgrade.js` (riga 12):
```javascript
publishableKey: 'pk_test_51ABC...', // 👈 La tua chiave pubblica
```

### 3. 📦 **Installa Stripe**

```bash
cd "C:\percorso\tua\app"
npm install stripe
```

**FATTO!** 🎉

---

## 🚀 COME FUNZIONA PER L'UTENTE

### Per chi usa la versione FREE:

1. **Apre WKF Suite FREE** → Vede bottone "🚀 Upgrade a PRO - €20"
2. **Click sul bottone** → Si apre finestra con:
   - Lista funzionalità PRO
   - Prezzo €20.00
   - Bottone "💳 Paga con Stripe"

3. **Click "Paga"** → Si apre **Stripe Checkout** (pagina di pagamento sicura)
4. **Inserisce carta** → Paga €20
5. **Pagamento completato** → Riceve **License Key** (es: `A1B2C3D4-E5F67890-A1B2C3D4-E5F67890`)

6. **Copia License Key** → Crea file `license.key` nella cartella dell'app
7. **Riavvia WKF Suite** → **APP DIVENTA PRO!** 🎉

---

## 💰 GESTIONE PAGAMENTI

### I tuoi guadagni:
- **Stripe trattiene**: ~3% (€0.60 su €20)
- **Tu ricevi**: ~€19.40 direttamente sul tuo conto
- **Pagamenti automatici** ogni 2 giorni lavorativi

### Funzionalità PRO vendute:
- 📧 Notifiche email automatiche
- 📊 Analytics avanzate
- 🖨️ Report PDF professionali
- 🎨 Personalizzazione aziendale
- 💾 Backup automatici
- 🔧 Supporto prioritario

---

## 🔧 CONFIGURAZIONI AVANZATE (Opzionali)

### Cambiare prezzo:
File `server.js` (riga 766):
```javascript
amount: 2000, // €20.00 in centesimi (2000 = €20)
```

### Modalità LIVE (produzione):
1. **Stripe Dashboard** → Attiva account LIVE
2. **Ottieni chiavi LIVE**: `pk_live_...` e `sk_live_...`
3. **Sostituisci chiavi** in `server.js` e `stripe-upgrade.js`

### Personalizzare bottone:
File `public/stripe-upgrade.js` (riga 158):
```javascript
upgradeBtn.innerHTML = '🚀 La tua scritta - €20';
```

---

## 🧪 TEST (Carte di prova Stripe)

### Carte che funzionano:
- **Visa**: `4242 4242 4242 4242`
- **Mastercard**: `5555 5555 5555 4444`
- **Carta rifiutata**: `4000 0000 0000 0002`

**Scadenza**: Qualsiasi data futura (es: 12/25)
**CVC**: Qualsiasi 3 cifre (es: 123)

---

## ❓ RISOLUZIONE PROBLEMI

### **"Stripe non configurato"**
→ Hai inserito le chiavi Stripe nei file sopra indicati?

### **"Stripe non installato"**
→ Esegui: `npm install stripe`

### **Bottone non appare**
→ L'app è già PRO? Il bottone appare solo nella versione FREE

### **Pagamento non funziona**
→ Controlla:
1. Chiavi Stripe corrette in ENTRAMBI i file
2. Stripe installato: `npm list stripe`
3. Console browser per errori (F12)

---

## 📞 SUPPORTO STRIPE

- **Dashboard**: https://dashboard.stripe.com
- **Documentazione**: https://stripe.com/docs
- **Test carte**: https://stripe.com/docs/testing

---

## 🎉 VANTAGGI SOLUZIONE

✅ **Nessun sito web da creare**
✅ **Nessun hosting da pagare**
✅ **Nessun certificato SSL da configurare**
✅ **Pagamenti sicuri tramite Stripe**
✅ **Attivazione automatica istantanea**
✅ **Soldi direttamente sul tuo conto**

**Sistema di pagamento professionale in 3 passi! 🚀**