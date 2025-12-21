# WKF Suite - Gestione Permessi

[![Licenza](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**WKF Suite - Gestione Permessi** è un'applicazione web self-hosted progettata per semplificare la gestione delle richieste di ferie e permessi all'interno di un'azienda. Sostituisce i fogli di calcolo e i processi manuali con un'interfaccia web intuitiva, accessibile da PC e dispositivi mobili.

L'applicazione è costruita per essere sicura, con i dati che risiedono interamente sull'infrastruttura aziendale, e flessibile, con un sistema di licenze che sblocca funzionalità PRO.

## 🚀 Download e Installazione

### Versione FREE
- **Gestione Utenti**: Crea e gestisci account per admin, supervisori, segreteria e dipendenti.
- **Richieste Permessi**: I dipendenti possono inviare richieste di ferie, permessi giornalieri o a ore.
- **Dashboard di Approvazione**: I manager possono approvare o rifiutare le richieste con un click.
- **Database Locale**: Utilizza SQLite per una configurazione a zero-installazione. I dati restano in azienda.
- **QR Code WiFi**: Genera un QR code per condividere facilmente l'accesso alla rete WiFi aziendale.
- **Accesso Mobile**: Interfaccia responsive per l'accesso da smartphone e tablet.

### Versione PRO (con licenza)
- **Notifiche Email**: Invio automatico di email per nuove richieste, approvazioni e rifiuti.
- **Analytics Avanzate**: Dashboard con grafici e statistiche sull'utilizzo dei permessi.

## ✨## 🛠️ Stack Tecnologico

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript (con jQuery)
- **Database**: SQLite 3
- **Deployment**:
  - **Standalone**: Empacchettato come eseguibile Windows con `pkg`.
  - **Desktop App**: Wrapper Electron per un'esperienza desktop integrata.
  - **Servizio Windows**: Script per installare l'app come servizio di sistema con `node-windows`.

## 🚀 Installazione e Avvio (per Sviluppatori)

1.  **Clona il repository:**
    ```bash
    git clone https://github.com/tuo-username/tuo-repository.git
    cd tuo-repository
    ```

## 🏢 Perfetto per

- **Piccole e medie imprese** (10-50 dipendenti)
- **Aziende** che vogliono dati locali (niente cloud)
- **Organizzazioni** che cercano gestione semplice dei permessi
- **Team** che passano da Excel a software digitale

4.  **Avvia il server di sviluppo:**
    ```bash
    node server.js
    ```

5.  **Accedi all'applicazione:**
    Apri il browser e vai su `http://localhost:3000`.

## 💻 Requisiti di Sistema

Il progetto include diversi script per il deployment:
- `deploy-anywhere.bat`: Crea una versione portatile dell'applicazione in una cartella specificata.
- `installa-servizio.bat`: Installa l'applicazione come servizio Windows che si avvia automaticamente.
- `electron-main.js`: Entry point per l'applicazione desktop Electron.
