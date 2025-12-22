# WKF Suite - Gestione Licenze

Guida pratica per la gestione quotidiana delle licenze WKF Suite.

## 🔑 GENERAZIONE MANUALE LICENZE

### Script Veloce
```bash
cd C:\Users\navib\OneDrive\Documenti\testwebapp\permessi_webapp\permessi_webapp

# Genera license key per un cliente
node -e "
const LM = require('./license-manager');
const email = process.argv[1] || 'cliente@example.com';
const key = LM.generateLicenseKey(email);
console.log('Email:', email);
console.log('License Key:', key);
console.log('Formato file license.key:');
console.log(key);
" "cliente@email.com"
```

### Genera per Email Specifica
```bash
# Sostituisci l'email del cliente
node -e "
const LM = require('./license-manager');
const key = LM.generateLicenseKey('mario.rossi@azienda.it');
console.log('🔑 License Key per mario.rossi@azienda.it:');
console.log(key);
"
```

---

## 📧 INVIO MANUALE LICENSE KEY

### Template Email da Copiare

```
Oggetto: 🎉 WKF Suite PRO - La tua License Key è pronta!

Caro Cliente,

Grazie per aver acquistato WKF Suite PRO!

🔑 LA TUA LICENSE KEY:
[INCOLLA QUI LA LICENSE KEY GENERATA]

📋 ISTRUZIONI ATTIVAZIONE:

1. Scarica WKF Suite dal nostro sito se non l'hai già fatto
2. Esegui WKF Suite.exe (dovrebbe mostrare "WKF Suite FREE")
3. Nella stessa cartella dove hai WKF Suite.exe:
   - Crea un nuovo file di testo
   - Rinominalo in "license.key" (senza estensione .txt)
   - Apri il file con Blocco Note
   - Incolla la license key sopra
   - Salva il file
4. Chiudi e riapri WKF Suite
5. Ora dovrebbe mostrare "WKF Suite PRO" nel titolo!

🎁 FUNZIONI PRO SBLOCCATE:
✅ Email notifiche automatiche per approvazioni/rifiuti
✅ Dashboard analytics avanzate con grafici
✅ Report PDF personalizzati con logo aziendale
✅ Template email personalizzati
✅ Backup automatici del database
✅ Supporto prioritario via email

🛟 SUPPORTO:
Come cliente PRO hai diritto al supporto prioritario!
Email: navib30@ik.me
Risposta garantita entro 24 ore lavorative.

💡 SUGGERIMENTI:
- Configura le email SMTP nell'area admin per ricevere notifiche
- Esplora i nuovi grafici nella dashboard
- Personalizza i template email per la tua azienda

Grazie per aver scelto WKF Suite PRO!

Il Team WKF Suite
https://wkfsuite.com
```

---

## 🔍 VERIFICA LICENZE

### Controllo Validità
```bash
# Verifica se una license key è valida
node -e "
const LM = require('./license-manager');
const lm = new LM();
const key = process.argv[1] || 'A1B2C3D4-E5F6789A-B1C2D3E4-F5A6B789';
const valid = lm.validateLicenseKey(key);
console.log('License Key:', key);
console.log('Valida:', valid ? '✅ SÌ' : '❌ NO');
" "INSERISCI-LICENSE-KEY-QUI"
```

### Test Completo Licenza
```bash
# Test completo di una license key
node -e "
const fs = require('fs');
const LM = require('./license-manager');

// Test license key
const testKey = process.argv[1] || 'A1B2C3D4-E5F6789A-B1C2D3E4-F5A6B789';
const lm = new LM();

console.log('🧪 TEST LICENSE KEY');
console.log('Key:', testKey);
console.log('Format valid:', /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(testKey));
console.log('Checksum valid:', lm.validateLicenseKey(testKey));

// Test attivazione
console.log('\n📁 TEST ATTIVAZIONE');
const success = lm.saveLicenseKey(testKey);
console.log('Attivazione:', success ? '✅ SUCCESS' : '❌ FAILED');

if (success) {
  const info = lm.getLicenseInfo();
  console.log('Status:', info.status);
  console.log('Features:', info.features.length);
  console.log('App Title:', lm.getAppTitle());
}

// Cleanup
lm.removeLicenseKey();
" "INSERISCI-LICENSE-KEY-QUI"
```

---

## 📊 REPORT VENDITE

### Controlla Log Transazioni
```bash
# Mostra ultime transazioni
tail -n 20 C:\Users\navib\OneDrive\Documenti\testwebapp\permessi_webapp\permessi_webapp\transactions.log
```

### Statistiche Veloci
```bash
# Conta transazioni per giorno
node -e "
const fs = require('fs');
const logFile = './transactions.log';

if (!fs.existsSync(logFile)) {
  console.log('Nessun file transactions.log trovato');
  process.exit(0);
}

const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n').filter(line => line.trim());

console.log('📊 STATISTICHE VENDITE');
console.log('Totale transazioni:', lines.length);

if (lines.length > 0) {
  const transactions = lines.map(line => {
    try { return JSON.parse(line); } catch(e) { return null; }
  }).filter(Boolean);

  const total = transactions.reduce((sum, t) => sum + (t.amount || 2000), 0) / 100;
  console.log('Fatturato totale: €' + total.toFixed(2));

  const today = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter(t => t.timestamp.startsWith(today));
  console.log('Vendite oggi:', todayTransactions.length);
}
"
```

---

## 🛟 SUPPORTO CLIENTI

### Problemi Comuni

**1. "License key non funziona"**
```bash
# Controlla formato
node -e "
const key = 'CHIAVE-CLIENTE-QUI';
const format = /^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(key);
console.log('Formato corretto:', format);
if (!format) {
  console.log('❌ Formato errato. Deve essere: XXXX-XXXX-XXXX-XXXX (maiuscolo, solo cifre e lettere A-F)');
}
"
```

**Soluzioni standard:**
- Verifica che il file si chiami esattamente `license.key` (senza .txt)
- Controlla che la license key non abbia spazi prima o dopo
- Assicurati che WKF Suite.exe sia chiuso prima di creare il file
- Prova a ricreare il file da zero

**2. "Non vedo le funzioni PRO"**
- Verifica che il titolo mostri "WKF Suite PRO"
- Riavvia l'applicazione
- Controlla che il file license.key sia nella stessa cartella dell'exe
- Aggiorna la pagina nel browser (F5)

**3. "Email non funzionano"**
- Le email richiedono WKF Suite PRO attivo
- Configurare SMTP nell'area admin
- Testare connessione email dalle impostazioni

### Genera License Key per Supporto
```bash
# Per problemi di attivazione, genera nuova key
node -e "
const LM = require('./license-manager');
const email = 'CLIENTE-EMAIL-QUI';
const newKey = LM.generateLicenseKey(email + '_support_' + Date.now());
console.log('🆘 NUOVA LICENSE KEY DI SUPPORTO');
console.log('Cliente:', email);
console.log('License Key:', newKey);
console.log('Invia questa chiave al cliente con le istruzioni standard.');
"
```

---

## 💰 GESTIONE PAGAMENTI

### Controllo Pagamenti Stripe
1. Vai su https://dashboard.stripe.com/payments
2. Verifica stato transazioni
3. Per rimborsi: Dashboard → Pagamenti → Refund

### Rimborso e Revoca Licenza
```bash
# Se devi revocare una licenza (rimborso)
# Non c'è modo tecnico di revocare remotamente
# Ma puoi informare il cliente di eliminare license.key
```

### Report Mensili
```bash
# Genera report mensile
node -e "
const fs = require('fs');
const logFile = './transactions.log';

if (!fs.existsSync(logFile)) {
  console.log('Nessun log trovato');
  process.exit(0);
}

const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n').filter(line => line.trim());

const transactions = lines.map(line => {
  try { return JSON.parse(line); } catch(e) { return null; }
}).filter(Boolean);

const thisMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
const monthlyTransactions = transactions.filter(t =>
  t.timestamp.startsWith(thisMonth)
);

console.log('📅 REPORT MENSILE:', thisMonth);
console.log('Vendite questo mese:', monthlyTransactions.length);

const monthlyRevenue = monthlyTransactions.reduce((sum, t) =>
  sum + (t.amount || 2000), 0) / 100;
console.log('Fatturato mensile: €' + monthlyRevenue.toFixed(2));

if (monthlyTransactions.length > 0) {
  console.log('\n📧 CLIENTI QUESTO MESE:');
  monthlyTransactions.forEach((t, i) => {
    console.log(`${i+1}. ${t.email} - €${(t.amount/100).toFixed(2)} - ${t.timestamp.substring(0,10)}`);
  });
}
"
```

---

## 🔧 MAINTENANCE

### Backup Log Vendite
```bash
# Backup mensile
copy "transactions.log" "transactions_backup_$(date +%Y_%m).log"
```

### Pulizia Log Vecchi
```bash
# Mantieni solo ultimi 1000 record
node -e "
const fs = require('fs');
const logFile = './transactions.log';

if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length > 1000) {
    const recent = lines.slice(-1000);
    fs.writeFileSync(logFile, recent.join('\n') + '\n');
    console.log('Log pulito, mantenuti ultimi 1000 record');
  } else {
    console.log('Log OK, ' + lines.length + ' record');
  }
}
"
```

---

## 📋 CHECKLIST GESTIONE GIORNALIERA

### Mattina (5 minuti)
- [ ] Controlla nuove transazioni Stripe
- [ ] Verifica email supporto
- [ ] Check server website attivo

### Settimanale (10 minuti)
- [ ] Report vendite settimanali
- [ ] Backup log transazioni
- [ ] Aggiorna statistiche

### Mensile (30 minuti)
- [ ] Report fatturato mensile
- [ ] Analisi conversioni FREE→PRO
- [ ] Pianificazione miglioramenti
- [ ] Backup completo sistema

---

## 📞 CONTATTI RAPIDI

**Per problemi tecnici urgenti:**
- Email: navib30@ik.me
- Documentazione completa: STRIPE-SETUP-GUIDE.md

**Dashboard importanti:**
- Stripe: https://dashboard.stripe.com
- Website analytics: (se configurato)
- Server monitoring: (se configurato)

---

🎯 **Con queste procedure puoi gestire efficacemente tutte le licenze WKF Suite!**