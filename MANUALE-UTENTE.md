# 📋 MANUALE UTENTE - Gestione Permessi Aziendali

## 🎯 **Panoramica Sistema**
Il sistema **Gestione Permessi Aziendali** permette ai dipendenti di richiedere permessi online e ai supervisori di approvarli/rifiutarli in tempo reale.

**Accesso**: `http://[IP-SERVER]:3000` (esempio: `http://192.168.1.51:3000`)

---

## 👥 **RUOLI E ACCESSI**

### **🔧 AMMINISTRATORE**
- **Username**: `admin` / **Password**: `admin123`
- **Funzioni complete del sistema**

### **👨‍💼 SUPERVISORE** 
- **Username**: `luigi` / **Password**: `super123`
- **Approva/rifiuta richieste permessi**

### **📞 SEGRETERIA**
- **Username**: `maria` / **Password**: `segreteria123` 
- **Inserisce permessi per conto dei dipendenti**

### **👤 DIPENDENTI**
- **Auto-registrazione** oppure account creati da admin
- **Gestiscono solo i propri permessi**

---

## 📝 **COME REGISTRARSI (Dipendenti)**

1. **Vai su**: `http://[IP-SERVER]:3000`
2. **Click**: "Registrati qui"
3. **Compila il form**:
   - **Username**: Almeno 3 caratteri, solo lettere/numeri/._-
   - **Password**: Minimo 8 caratteri con maiuscola+minuscola+numero
   - **Ruolo**: Seleziona "Dipendente"
   - **Matricola**: Codice dipendente aziendale (es: D001)
4. **Click**: "Crea Account"
5. **Redirect automatico** al login dopo 2.5 secondi

---

## 🔐 **COME FARE LOGIN**

1. **Vai alla pagina login**: `http://[IP-SERVER]:3000`
2. **Inserisci credenziali**:
   - Username e password
3. **Click**: "Accedi"
4. **Redirect automatico** alla dashboard del tuo ruolo:
   - **Admin/Supervisore/Segreteria** → Dashboard completa
   - **Dipendenti** → Dashboard semplificata

---

## 📋 **RICHIEDERE UN PERMESSO (Dipendenti)**

### **Dalla Dashboard Dipendente**:
1. **Sezione "Richiedi Nuovo Permesso"**
2. **Seleziona tipo**:
   - **Giornaliero**: Permesso per un giorno intero
   - **Più giorni**: Permesso per un periodo (dal/al)
   - **Ore**: Permesso per alcune ore in un giorno
3. **Compila campi** che appaiono in base al tipo:
   - **Date**: Calendario per selezionare giorni
   - **Orari**: Ora inizio/fine per permessi a ore
   - **Data inserimento**: Quando vuoi che inizi il permesso
   - **Note**: Motivazione o dettagli aggiuntivi
4. **Click**: "Invia Richiesta"
5. **Notifica verde**: Conferma invio con tipo permesso
6. **Refresh automatico**: Lista "I Miei Permessi" si aggiorna

### **Tipi Permesso Dettaglio**:

**🗓️ GIORNALIERO**:
- Permesso per un'intera giornata
- **Campi**: Data + Note + Data inserimento

**📅 PIÙ GIORNI**: 
- Permesso per periodo (es: ferie)
- **Campi**: Dal/Al + Note + Data inserimento

**🕐 ORE**:
- Permesso per alcune ore in un giorno
- **Campi**: Data + Ora inizio/fine + Note + Data inserimento

---

## ✅ **APPROVARE/RIFIUTARE PERMESSI (Supervisore/Admin)**

### **Dalla Dashboard**:
1. **Sezione "Tutte le Richieste Permessi"**
2. **Visualizzi lista** con tutti i permessi pendenti
3. **Per ogni richiesta**:
   - **Informazioni**: Nome, tipo, date, note, stato
   - **Pulsanti azione**:
     - **"✅ Approva"**: Approva la richiesta
     - **"❌ Rifiuta"**: Rifiuta con possibilità di aggiungere motivo

### **Processo Approvazione**:
1. **Click**: "✅ Approva"
2. **Notifica verde**: "Richiesta [ID] approvata"  
3. **Stato cambia**: da "in attesa" a "approvata"
4. **Lista si aggiorna** automaticamente

### **Processo Rifiuto**:
1. **Click**: "❌ Rifiuta"
2. **Popup**: Chiede motivo del rifiuto (opzionale)
3. **Conferma**: Rifiuto registrato
4. **Notifica rossa**: "Richiesta [ID] rifiutata"
5. **Note aggiornate**: Con motivo del rifiuto

---

## 📊 **VISUALIZZARE REPORT**

### **Admin/Supervisore**:
1. **Dashboard** → **"📊 Report & Statistiche"**
2. **Filtri disponibili**:
   - **Data dal/al**: Periodo da analizzare
   - **Dipendente**: Specifico dipendente (opzionale)
3. **Click**: "🔄 Aggiorna Report"

### **Dipendenti**:
1. **Dashboard** → **"📊 I Miei Report"** 
2. **Vedono solo le proprie statistiche**

### **Cosa Contengono i Report**:
- **📈 Statistiche**: Totale, Approvate, Rifiutate, In Attesa
- **📊 Grafici**:
  - **Distribuzione Stati**: Donut chart con percentuali
  - **Permessi per Mese**: Trend temporale
  - **Tipologie Permessi**: Bar chart per tipo
- **📋 Tabella Dettaglio**: Lista completa richieste

---

## 🖨️ **SCARICARE PDF REPORT**

1. **Vai su Report** (vedi sezione sopra)
2. **Imposta filtri** desiderati
3. **Click**: "📊 Scarica PDF Report"  
4. **Attesa**: "Generazione PDF in corso..."
5. **Download automatico**: File `report-permessi-YYYY-MM-DD.pdf`

### **Contenuto PDF**:
- **Header**: Logo aziendale + data generazione
- **Statistiche**: Box colorati con numeri
- **Tabella**: Dettaglio di tutte le richieste filtrate
- **Formato**: Professionale per stampa/condivisione

---

## 📱 **ACCESSO DA CELLULARE**

### **Via Browser Mobile**:
1. **Connetti** al WiFi aziendale
2. **Apri browser** → `http://[IP-SERVER]:3000`
3. **Interface responsive**: Si adatta automaticamente
4. **Funzioni identiche**: Tutte le funzioni disponibili

### **Via QR Code WiFi**:
1. **Admin genera QR**: Dashboard → "📱 QR WiFi Dipendenti"
2. **Scansiona QR Code**:
   - **Android**: Fotocamera o app QR
   - **iPhone**: Fotocamera nativa
3. **Connessione automatica**: WiFi + accesso diretto all'app

### **Ottimizzazioni Mobile**:
- **Font 16px**: Niente zoom automatico iOS
- **Bottoni full-width**: Facili da toccare
- **Tabelle scrollabili**: Scorrimento orizzontale
- **Notifiche toast**: Visibili su schermo piccolo

---

## 📞 **SEGRETERIA - Inserire Permessi per Dipendenti**

### **Dashboard Segreteria**:
1. **Login**: `maria` / `segreteria123`
2. **Sezione**: "Inserisci Permesso per Dipendente"
3. **Campi aggiuntivi**:
   - **Matricola Dipendente**: Seleziona dipendente
   - **Altri campi**: Identici al form dipendente
4. **Note automatiche**: "(Inserita da segreteria: maria)"
5. **Permesso creato**: A nome del dipendente selezionato

---

## 🔧 **CONFIGURAZIONE WIFI (Solo Admin)**

### **Prima configurazione**:
1. **Login admin**: `admin` / `admin123`
2. **Click**: "Configurazione WiFi"
3. **Inserisci**:
   - **SSID**: Nome rete WiFi aziendale
   - **Password**: Password WiFi aziendale  
4. **Click**: "Salva Configurazione"
5. **Notifica verde**: "WiFi configurato correttamente"

### **Generare QR Code**:
1. **Dashboard Admin** → **"📱 QR WiFi Dipendenti"**
2. **Sistema genera** QR automaticamente
3. **Opzioni**:
   - **🖨️ Stampa QR**: Per distribuzione fisica
   - **📱 Condividi**: Via email/chat
4. **QR Code contiene**:
   - Credenziali WiFi automatiche
   - Link diretto alla webapp

---

## 🔔 **NOTIFICHE SISTEMA**

### **Tipi Notifiche** (Toast colorati):
- **🟢 Verde (Successo)**:
  - Login effettuato
  - Permesso inviato
  - Report generato
  - QR Code creato
- **🔴 Rosso (Errore)**:
  - Errori validazione
  - Permesso rifiutato  
  - Errori server
- **🟡 Giallo (Attenzione)**:
  - Permesso in elaborazione
- **🔵 Blu (Info)**:
  - Informazioni generali

### **Durata Notifiche**:
- **Successo**: 4 secondi
- **Errore**: 6 secondi  
- **Info**: 4 secondi
- **Click X**: Chiusura manuale

---

## 💾 **I TUOI DATI**

### **Cosa Viene Salvato**:
- **Account**: Username, ruolo, matricola (password hashata)
- **Permessi**: Tutte le richieste con storico
- **WiFi**: Solo SSID/password aziendale (solo admin vede)
- **Sessioni**: Cookie temporanei per login

### **Privacy e Sicurezza**:
- **Password criptate**: Hash bcrypt sicuro
- **Sessioni protette**: Timeout automatico
- **Dati locali**: Database SQLite sul server aziendale
- **Niente cloud**: Tutti i dati rimangono in azienda

---

## ❌ **LOGOUT**

### **Da Desktop**:
1. **Click**: "Logout" (in alto a destra)
2. **Redirect**: Pagina login automatico
3. **Sessione chiusa**: Devi rifare login per accedere

### **Da Mobile**:
- **Procedura identica** al desktop
- **Raccomandato**: Logout sempre quando finito

---

## 🆘 **PROBLEMI COMUNI**

### **"Non riesco ad accedere"**:
- **Verifica credenziali**: Username/password corretti
- **Verifica rete**: Stesso WiFi del server
- **Prova IP diverso**: Chiedi IP corretto all'admin

### **"Pagina non si carica"**:  
- **Server attivo?**: Verifica con admin se PC server è acceso
- **WiFi OK?**: Sei connesso alla rete aziendale
- **URL corretto?**: `http://[IP]:3000` (non https)

### **"Permesso non inviato"**:
- **Campi obbligatori**: Controlla tutti i campi richiesti
- **Date valide**: Date non nel passato per permessi futuri
- **Connessione**: Prova ricaricare pagina

### **"Non vedo le notifiche"**:
- **Browser compatibile**: Chrome, Firefox, Safari recenti
- **JavaScript abilitato**: Necessario per notifiche
- **Cache browser**: Prova Ctrl+F5 per refresh

### **Password dimenticata**:
- **Contatta admin**: Solo admin può reset password
- **Nessun reset automatico**: Per sicurezza

---

## 📞 **SUPPORTO E CONTATTI**

### **Per Problemi Tecnici**:
1. **Admin di sistema** (gestisce server PC)
2. **IT aziendale** 
3. **Supervisore** (per problemi permessi)

### **Per Problemi Permessi**:
1. **Supervisore diretto**
2. **Segreteria** (può inserire permessi per te)
3. **Admin** (accesso completo)

### **Informazioni Sistema**:
- **Versione**: 1.0.0
- **Supporto**: Windows 10/11, Android 7+, iOS 12+
- **Browser**: Chrome, Firefox, Safari, Edge
- **Rete**: WiFi aziendale richiesta

---

## ⚡ **CONSIGLI RAPIDI**

### **✅ Da Fare**:
- **Logout sempre** quando finito
- **Descrizioni dettagliate** nelle note permessi
- **Richieste in anticipo** per permettere approvazione
- **Controlla email/notifiche** per aggiornamenti stato

### **❌ Da Evitare**:
- **Condividere password** con colleghi
- **Multiple richieste identiche** (evita duplicati)
- **Richieste urgenti** senza preavviso
- **Browser molto vecchi** (aggiorna se problemi)

---

🎯 **Il sistema è attivo 24/7 fintanto che il PC admin rimane acceso!**