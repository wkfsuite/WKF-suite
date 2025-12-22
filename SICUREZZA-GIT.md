# 🔒 Guida Sicurezza Git - WKF Suite

## ✅ Protezione Implementata

Il file `.gitignore` è stato configurato per proteggere:

### 🔑 Credenziali e Chiavi Stripe
- `Chiave privata.txt`
- `Chiave pubblicabile.txt`
- `chiave live.txt`
- `Set your secret key. Remember to s.txt`
- `whsec.txt`
- `public/stripe-upgrade.js` (versione con chiavi hardcoded)

### 📦 File di Build
- Tutti i file `.zip`, `.tar.gz`, `.exe`
- Cartelle `release/` e `release-opensource/`
- Build Android/iOS

### 🗄️ Database e Dati Sensibili
- File `.sqlite` e `.db` in `data/`
- File `.env` con variabili d'ambiente
- Chiavi di licenza `*.key`

---

## 🚀 Prima di Fare il Primo Commit

### 1. Verifica File Protetti

Esegui questo comando per vedere quali file verranno committati:

```bash
git status
```

**NON DEVONO APPARIRE:**
- ❌ `Chiave*.txt`
- ❌ `chiave*.txt`
- ❌ `public/stripe-upgrade.js` (se contiene chiavi LIVE)
- ❌ File `.env`
- ❌ File `.zip`, `.tar.gz`, `.exe`

### 2. Crea il File .env

```bash
cp .env.example .env
```

Poi modifica `.env` con le tue chiavi reali (NON verrà committato)

### 3. Usa la Versione Pulita di stripe-upgrade.js

```bash
# Sostituisci il file con chiavi hardcoded con la versione sicura
cp release-opensource/public/stripe-upgrade.js public/stripe-upgrade.js
```

Oppure modifica manualmente [public/stripe-upgrade.js](public/stripe-upgrade.js:15) per usare:

```javascript
publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_PUBLISHABLE_KEY_HERE',
```

---

## ⚠️ Se Hai Già Committato File Sensibili

### Rimuovi File dalla History Git

**ATTENZIONE:** Questo riscrive la history. Fallo SOLO se non hai ancora pushato su repository pubblici!

```bash
# Rimuovi file specifici dalla history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch 'Chiave*.txt' 'chiave*.txt' 'Set your secret*.txt' 'public/stripe-upgrade.js'" \
  --prune-empty --tag-name-filter cat -- --all

# Forza il push (SOLO se necessario)
git push origin --force --all
```

### Revoca le Chiavi Stripe Esposte

Se hai pushato chiavi su repository pubblico:

1. **Vai su Stripe Dashboard**: https://dashboard.stripe.com/apikeys
2. **Revoca le chiavi** esposte (clicca sui "..." → "Roll key")
3. **Genera nuove chiavi**
4. **Aggiorna il file `.env`** locale con le nuove chiavi

---

## 📋 Checklist Pre-Commit

Prima di ogni `git commit`:

- [ ] Esegui `git status` e verifica che non ci siano file sensibili
- [ ] Controlla che `.gitignore` sia aggiornato
- [ ] Verifica che `public/stripe-upgrade.js` usi variabili d'ambiente o placeholder
- [ ] Assicurati che file `.txt` con chiavi non siano in staging

---

## 🔐 Comandi Sicurezza Rapidi

### Verifica Cosa Stai Per Committare

```bash
git diff --cached
```

### Rimuovi File Accidentalmente Aggiunti

```bash
git reset HEAD <nome-file>
```

### Cerca Chiavi Stripe nel Repository

```bash
# Cerca chiavi LIVE hardcoded
git grep "pk_live_"
git grep "sk_live_"

# Cerca webhook secrets
git grep "whsec_"
```

**NESSUN RISULTATO = SICURO ✅**

---

## 📚 File Sicuri da Committare

✅ **Commit questi:**
- `.gitignore`
- `.env.example` (template senza chiavi)
- `README.md` e documentazione
- Codice sorgente (senza chiavi hardcoded)
- File di configurazione template

❌ **NON committare:**
- `.env` (chiavi reali)
- File `.txt` con credenziali
- Build compilati (`.exe`, `.zip`)
- Database con dati reali

---

## 🆘 In Caso di Leak

Se scopri di aver esposto chiavi pubblicamente:

1. **IMMEDIATO:** Revoca chiavi su Stripe Dashboard
2. Genera nuove chiavi
3. Rimuovi file dalla history Git (vedi sopra)
4. Aggiorna `.env` locale
5. Cambia eventuali password correlate

---

## 📞 Supporto

Per dubbi sulla sicurezza:
- Documentazione Stripe: https://stripe.com/docs/keys
- GitHub Security: https://docs.github.com/en/code-security

**RICORDA:** È sempre meglio prevenire che curare! 🛡️
