# 🔐 Sicurezza Chiavi Stripe - WKF Suite

## ⚠️ PROBLEMA RILEVATO E RISOLTO (v1.1.0 → v1.1.1)

### 🚨 Problema Originale

**Le chiavi Stripe LIVE erano hardcoded nel file `server.js`:**

```javascript
// ❌ CODICE NON SICURO (rimosso nella v1.1.1)
secretKey: process.env.STRIPE_SECRET_KEY || 'sk_live_51S9rDJFX...',
publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_live_51S9rDJFX...',
```

### ✅ Fix Applicato (v1.1.1)

**Chiavi ora caricate SOLO da variabili d'ambiente:**

```javascript
// ✅ CODICE SICURO (v1.1.1+)
secretKey: process.env.STRIPE_SECRET_KEY,
publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
```

---

## 🛡️ AZIONI OBBLIGATORIE PER LA SICUREZZA

### 1. ⚠️ RIGENERARE LE CHIAVI STRIPE (IMPORTANTE!)

**Le vecchie chiavi potrebbero essere state esposte. Rigenerale immediatamente:**

#### Passaggi:

1. **Login Stripe Dashboard**: https://dashboard.stripe.com/apikeys

2. **Invalida le vecchie chiavi**:
   - Click su "..." accanto alle chiavi esistenti
   - Seleziona "Roll key" o "Revoke"

3. **Genera nuove chiavi**:
   - Secret Key: `sk_live_...` (MANTIENI PRIVATA!)
   - Publishable Key: `pk_live_...` (può essere pubblica)

4. **Aggiorna il file `.env`**:
   ```bash
   STRIPE_SECRET_KEY=sk_live_NUOVA_CHIAVE_QUI
   STRIPE_PUBLISHABLE_KEY=pk_live_NUOVA_CHIAVE_QUI
   ```

5. **Riavvia il server**:
   ```bash
   npm start
   ```

### 2. 🔒 Webhook Secret

**Rigenera anche il Webhook Secret:**

1. Vai su: https://dashboard.stripe.com/webhooks
2. Elimina il vecchio endpoint webhook
3. Crea nuovo endpoint: `https://tuo-dominio.com/api/stripe-webhook`
4. Copia il nuovo secret: `whsec_...`
5. Aggiorna `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_NUOVO_SECRET_QUI
   ```

### 3. 📋 Verifica Sicurezza

**Controlla che tutto sia configurato correttamente:**

```bash
# 1. Verifica che .env NON sia committato
git status | grep .env
# Output atteso: nessun output (file ignorato)

# 2. Verifica che .env.example sia sicuro
grep -i "sk_live\|pk_live" .env.example
# Output atteso: nessun output (solo placeholder)

# 3. Verifica che server.js non abbia chiavi hardcoded
grep -i "sk_live\|pk_live" server.js
# Output atteso: nessun output
```

---

## 📖 BEST PRACTICES SICUREZZA

### ✅ DO (Fai)

1. **Usa sempre variabili d'ambiente** per credenziali sensibili
2. **`.env` deve essere nel `.gitignore`** (già configurato)
3. **Usa `.env.example`** con placeholder per documentazione
4. **Rigenera chiavi** se sospetti esposizione
5. **Usa chiavi TEST** in sviluppo: `sk_test_...` / `pk_test_...`
6. **Monitora Stripe Dashboard** per attività sospette

### ❌ DON'T (Non fare)

1. **MAI hardcodare chiavi** nel codice sorgente
2. **MAI committare file `.env`** in git
3. **MAI condividere chiavi** via email/chat
4. **MAI usare stesse chiavi** in dev e production
5. **MAI loggare chiavi** nei console.log
6. **MAI esporre chiavi SECRET** nel frontend

---

## 🔍 CONTROLLO REPOSITORY GIT

### Verifica se chiavi erano nel repository:

```bash
# Cerca in tutta la history del repository
git log --all --full-history --source -- "*env*" "*stripe*"

# Se trovi commit con chiavi, considera:
# 1. Riscrivere la history (PERICOLOSO - solo se repo privato)
# 2. Rigenerare tutte le chiavi (RACCOMANDATO)
# 3. Rendere il repository privato se pubblico
```

### Se hai committato chiavi per errore:

```bash
# NON fare push se le chiavi sono nei commit locali!
# 1. Rigenera le chiavi su Stripe Dashboard (PRIMA COSA)
# 2. Poi pulisci la history (opzionale):
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

---

## 🎯 CHECKLIST POST-FIX

- [ ] ✅ Fix v1.1.1 applicato (chiavi rimosse da server.js)
- [ ] ⚠️ Chiavi Stripe rigenerate su Stripe Dashboard
- [ ] 📝 File `.env` aggiornato con nuove chiavi
- [ ] 🔒 Webhook secret rigenerato e aggiornato
- [ ] ✔️ Server riavviato e funzionante
- [ ] 🧪 Test pagamento con carte test Stripe
- [ ] 📊 Monitoraggio Stripe Dashboard attivo
- [ ] 🔐 Repository reso privato (se era pubblico)

---

## 🆘 SUPPORTO

### Se hai dubbi sulla sicurezza:

1. **Documentazione Stripe**: https://stripe.com/docs/keys
2. **Best Practices**: https://stripe.com/docs/security/guide
3. **Revocare chiavi**: https://dashboard.stripe.com/apikeys

### Contatti Emergency:

- **Stripe Support**: https://support.stripe.com/
- **Se sospetti frode**: Contatta immediatamente Stripe Support

---

## 📋 CHANGE LOG SICUREZZA

### v1.1.1 (2025-10-19)
- ✅ **FIX CRITICO**: Rimosse chiavi Stripe hardcoded da `server.js`
- ✅ Aggiunto warning sicurezza nel codice
- ✅ Aggiornato `.env.example` con istruzioni chiare
- ✅ Creata documentazione sicurezza
- ⚠️ **AZIONE RICHIESTA**: Rigenerare tutte le chiavi Stripe

### v1.1.0 (2025-10-19)
- ❌ **PROBLEMA**: Chiavi LIVE esposte nel codice sorgente
- 🔴 **RISCHIO**: Potenziale accesso non autorizzato

---

## ⚡ QUICK FIX COMMANDS

```bash
# 1. Verifica fix applicato
git diff server.js | grep -A5 -B5 "STRIPE_CONFIG"

# 2. Test che server richieda variabili d'ambiente
npm start
# Se vedi: "⚠️ Stripe non configurato" = OK, chiavi non hardcoded

# 3. Dopo aver rigenerato chiavi, test funzionamento:
curl -X POST http://localhost:3001/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"productType":"wkf-suite-pro"}'
# Output atteso: {"sessionId":"cs_live_...","url":"https://checkout.stripe.com/..."}
```

---

**🔐 MANTIENI QUESTO DOCUMENTO RISERVATO - Contiene informazioni sensibili sulla sicurezza del sistema**
