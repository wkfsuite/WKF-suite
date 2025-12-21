# 📱 WKF Suite - Guida Progressive Web App (PWA)

## ✨ Cos'è la PWA?

WKF Suite è ora disponibile come **Progressive Web App** (PWA), che permette di:

- ✅ **Installare l'app** su smartphone, tablet e PC
- ✅ **Funzionare offline** (con limitazioni)
- ✅ **Accesso rapido** dall'home screen
- ✅ **Notifiche push** per aggiornamenti
- ✅ **Esperienza nativa** come un'app dal Play Store

## 📲 Come Installare WKF Suite

### Android (Chrome/Edge)

1. Apri Chrome o Edge
2. Vai su `http://IP-SERVER:3000`
3. Fai login normalmente
4. Vedrai un **banner** o **bottone "Installa App"**
5. Clicca su "Installa"
6. L'app comparirà nella home screen

**Alternativa:**
- Menu browser (⋮) → "Installa app" o "Aggiungi a Home"

### iOS (Safari)

1. Apri Safari
2. Vai su `http://IP-SERVER:3000`
3. Fai login normalmente
4. Tocca il bottone **Condividi** 📤 (al centro in basso)
5. Scorri e tocca **"Aggiungi a Home"**
6. Conferma "Aggiungi"

**Nota:** Su iOS il bottone "Installa App" mostrerà le istruzioni

### Windows/macOS (Chrome/Edge)

1. Apri il browser
2. Vai su `http://IP-SERVER:3000`
3. Vedrai un'icona ➕ nella barra degli indirizzi
4. Clicca sull'icona e poi "Installa"
5. L'app si aprirà in una finestra dedicata

## 🎯 Funzionalità PWA

### ✅ Cosa Funziona Offline

- Visualizzazione ultime richieste caricate
- Interfaccia utente completa
- Login (se già effettuato)
- Cache delle pagine visitate

### ❌ Cosa NON Funziona Offline

- Invio nuove richieste
- Approvazione/rifiuto richieste
- Sincronizzazione dati in tempo reale
- Export calendario
- Report PDF

**Le richieste inviate offline verranno sincronizzate quando torni online**

## 🔔 Notifiche Push

Per ricevere notifiche quando una richiesta viene approvata/rifiutata:

1. Installa la PWA sul dispositivo
2. Alla prima apertura, il browser chiederà il permesso per le notifiche
3. Clicca "Consenti" / "Allow"

**Nota:** Le notifiche funzionano solo se la PWA è installata

## 🔄 Aggiornamenti

WKF Suite si aggiorna automaticamente:

- Quando rilevi una nuova versione, vedrai un banner "🔄 Nuova versione disponibile"
- Clicca "Aggiorna Ora" per installare l'aggiornamento
- L'app si ricaricherà con le nuove funzionalità

## 🗑️ Disinstallare l'App

### Android

1. Tieni premuto sull'icona WKF Suite
2. Seleziona "Disinstalla" o "Rimuovi"

**Oppure:**
- Impostazioni → App → WKF Suite → Disinstalla

### iOS

1. Tieni premuto sull'icona WKF Suite
2. Tocca "Rimuovi app"
3. Conferma "Elimina"

### Windows/macOS

1. Apri WKF Suite come PWA
2. Menu (⋮) → "Disinstalla WKF Suite"

**Oppure:**
- Settings → Apps → WKF Suite → Uninstall (Windows)
- Applications → Trascina WKF Suite nel Cestino (macOS)

## 🛠️ Risoluzione Problemi

### Il bottone "Installa App" non compare

**Possibili cause:**
- App già installata
- Browser non supportato (usa Chrome/Edge/Safari)
- Connessione HTTPS non disponibile (necessaria per alcune funzionalità)

**Soluzione:** Usa il menu del browser → "Installa app"

### L'app non funziona offline

**Causa:** Prima apertura o cache non ancora salvata

**Soluzione:**
1. Usa l'app online almeno una volta
2. Visita tutte le pagine che vuoi usare offline
3. La cache verrà aggiornata automaticamente

### Le notifiche non arrivano

**Verifica:**
1. Permessi notifiche abilitati
2. App installata (non solo aggiunta ai preferiti)
3. Browser supporta le notifiche push

**iOS:** Le notifiche push NON sono supportate da Safari

### L'app non si aggiorna

**Soluzione:**
1. Chiudi completamente l'app
2. Riapri l'app
3. Se vedi il banner aggiornamento, clicca "Aggiorna Ora"
4. In alternativa, disinstalla e reinstalla

## 📊 Vantaggi PWA vs Browser

| Funzionalità | Browser | PWA Installata |
|--------------|---------|----------------|
| Accesso rapido | ❌ | ✅ |
| Icona home screen | ❌ | ✅ |
| Funziona offline | ⚠️ Limitato | ✅ |
| Notifiche push | ❌ | ✅ (Android) |
| Schermo intero | ❌ | ✅ |
| Aggiornamenti auto | ❌ | ✅ |
| Cache intelligente | ❌ | ✅ |

## 🔐 Sicurezza e Privacy

- ✅ Tutti i dati restano sul server aziendale locale
- ✅ Nessun dato viene inviato a servizi esterni
- ✅ La cache viene criptata dal browser
- ✅ Le credenziali seguono le stesse regole di sicurezza del browser

## 🌐 Requisiti Sistema

### Browser Supportati

- ✅ Chrome 90+ (Android/Windows/macOS/Linux)
- ✅ Edge 90+ (Windows/macOS)
- ✅ Safari 15+ (iOS/macOS) - Notifiche limitate
- ✅ Firefox 100+ (Android/Windows/macOS/Linux)
- ✅ Samsung Internet 15+ (Android)

### Sistema Operativo

- ✅ Android 8.0+
- ✅ iOS 15.0+
- ✅ Windows 10+
- ✅ macOS 11+
- ✅ Linux (tutte le distribuzioni recenti)

## 💡 Suggerimenti

1. **Usa WiFi aziendale**: Per prestazioni ottimali
2. **Abilita notifiche**: Per ricevere aggiornamenti in tempo reale
3. **Aggiorna regolarmente**: Accetta gli aggiornamenti quando disponibili
4. **Installa su tutti i dispositivi**: Smartphone, tablet e PC
5. **Aggiungi scorciatoie**: Usa i collegamenti rapidi per "Nuova Richiesta" e "Report"

## 🚀 Novità PWA

### Versione 1.0.0

- ✅ Installazione come app nativa
- ✅ Service Worker per cache offline
- ✅ Notifiche push (Android)
- ✅ Banner installazione intelligente
- ✅ Icone adaptive per tutti i dispositivi
- ✅ Shortcuts per azioni rapide
- ✅ Aggiornamenti automatici
- ✅ Indicator stato online/offline

## 📞 Supporto

Per problemi o domande sulla PWA:

1. Verifica questa guida
2. Controlla che il server sia accessibile
3. Prova a disinstallare e reinstallare l'app
4. Contatta l'amministratore di sistema

---

**Buon lavoro con WKF Suite! 🎉**
