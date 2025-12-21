# ⚠️ DISCLAIMER LEGALE E LIMITAZIONE DI RESPONSABILITÀ
## Software Beta "Gestione Permessi Aziendali" v1.0.0-beta

---

## 🚨 **ATTENZIONE - SOFTWARE IN VERSIONE BETA**

Il presente software è rilasciato in **VERSIONE BETA** per scopi di testing e valutazione. **L'utilizzo è a vostro esclusivo rischio e pericolo.**

---

## 📜 **LIMITAZIONE DI RESPONSABILITÀ**

### **Esclusione Totale di Garanzie**

**IL SOFTWARE È FORNITO "COSÌ COM'È" SENZA GARANZIE DI ALCUN TIPO, ESPRESSE O IMPLICITE, INCLUSE MA NON LIMITATE A:**

- ❌ **Funzionamento corretto** del software
- ❌ **Compatibilità** con hardware/software esistente  
- ❌ **Sicurezza dei dati** memorizzati o trasmessi
- ❌ **Disponibilità continua** del servizio
- ❌ **Integrità delle informazioni** elaborate
- ❌ **Prestazioni** o **affidabilità** del sistema

### **Esclusione di Danni**

**IN NESSUN CASO GLI SVILUPPATORI, DISTRIBUTORI O FORNITORI SARANNO RESPONSABILI PER:**

🚫 **Danni Diretti:**
- Perdita di dati aziendali
- Malfunzionamenti hardware/software  
- Interruzioni di servizio
- Corruzione database

🚫 **Danni Indiretti:**
- Perdite economiche
- Mancati guadagni
- Perdita di produttività
- Danni reputazionali  
- Costi di ripristino sistemi

🚫 **Danni Conseguenti:**
- Blocco operazioni aziendali
- Violazioni privacy dipendenti
- Non conformità normative
- Sanzioni amministrative

**ANCHE SE PREVENTIVAMENTE INFORMATI DELLA POSSIBILITÀ DI TALI DANNI.**

---

## ⚠️ **RISCHI NOTI - VERSIONE BETA**

### **🔒 Sicurezza e Privacy:**
- **Database non crittografato**: Dati salvati in chiaro in SQLite
- **Trasmissioni HTTP**: No HTTPS/TLS di default  
- **Autenticazione base**: Password hashate ma sistema non hardened
- **Accesso rete locale**: Potenzialmente accessibile da tutta la LAN

### **💾 Stabilità e Affidabilità:**
- **Perdita dati possibile**: Backup manuali necessari
- **Errori applicativi**: Crash possibili durante uso intenso
- **Compatibilità limitata**: Testato su configurazioni limitate
- **Aggiornamenti breaking**: Versioni future potrebbero richiedere reset completo

### **🌐 Infrastruttura di Rete:**
- **Carico server**: Utilizzo intenso può impattare performance di rete
- **Porta aperta**: Porto 3000 esposto in rete locale
- **Single point of failure**: Dipendenza da singolo PC server

### **⚖️ Conformità Legale:**
- **GDPR non garantito**: Nessuna valutazione privacy formale
- **Audit trail limitato**: Log non completi per conformità
- **Diritto all'oblio**: Cancellazione dati non implementata completamente

---

## 📋 **TERMINI DI UTILIZZO BETA**

### **✅ Utilizzi Consentiti:**
- **Testing interno aziendale** con dati non critici
- **Prototipazione** processi di gestione permessi
- **Valutazione funzionalità** per futuri sviluppi
- **Training** e familiarizzazione utenti

### **❌ Utilizzi NON Consentiti:**
- **Produzione critica** senza sistemi di backup
- **Dati sensibili** senza misure sicurezza aggiuntive
- **Conformità legale obbligatoria** senza audit security
- **Sistemi mission-critical** senza ridondanza

### **🔒 Raccomandazioni Sicurezza:**

**OBBLIGATORIO:**
- ✅ **Backup giornalieri** del database SQLite
- ✅ **Rete isolata** o VLAN dedicata se possibile
- ✅ **Firewall configurato** per limitare accessi
- ✅ **Monitoraggio accessi** e attività sospette
- ✅ **Formazione utenti** su sicurezza password

**RACCOMANDATO:**
- 🔒 **Reverse proxy HTTPS** (nginx/Apache)
- 🛡️ **Antivirus aggiornato** su PC server
- 📊 **Monitoring sistema** (CPU/RAM/Disco)
- 🔄 **Procedure disaster recovery**
- 📝 **Log personalizzati** per audit

---

## 🏢 **RESPONSABILITÀ DELL'AZIENDA UTILIZZATRICE**

### **Prima dell'Installazione:**
- 📋 **Valutazione rischi** interna approfondita
- 🔒 **Policy sicurezza** adeguate al contesto
- 💾 **Strategia backup** dati critici
- 📞 **Piano emergenza** in caso di malfunzionamenti
- 👥 **Formazione personale** su rischi e procedure

### **Durante l'Utilizzo:**
- 👀 **Monitoraggio costante** del sistema  
- 🔄 **Backup regolari** (giornalieri raccomandati)
- 📊 **Controllo performance** rete e server
- 🚨 **Gestione incidenti** secondo procedure interne
- 📝 **Documentazione modifiche** e configurazioni

### **Gestione Utenti:**
- 🔐 **Password policy** rigorose
- 👤 **Controllo accessi** e privilegi
- 📚 **Training sicurezza** periodico
- 🚪 **Procedura revoca accessi** per ex-dipendenti
- 📊 **Audit utilizzo** regolari

---

## ⚖️ **CLAUSOLE LEGALI**

### **Limitazione Temporale:**
La presente limitazione di responsabilità rimane valida per **tutta la durata di utilizzo** del software in versione BETA e per **24 mesi successivi** alla dismissione.

### **Giurisdizione:**
Eventuali controversie saranno soggette alla giurisdizione del foro di **[INSERIRE FORO COMPETENTE]** e alla legge italiana.

### **Separabilità:**
Se una clausola dovesse essere dichiarata nulla o inefficace, le restanti rimangono valide ed efficaci.

### **Modifica Termini:**
I presenti termini possono essere modificati unilateralmente. L'utilizzo continuato del software dopo le modifiche costituisce accettazione.

---

## 📞 **SUPPORTO E ASSISTENZA**

### **⚠️ Supporto Limitato:**
- **Supporto tecnico**: Solo best-effort, senza SLA
- **Correzione bug**: Quando possibile, senza tempistiche garantite  
- **Aggiornamenti**: Irregolari e potenzialmente breaking
- **Documentazione**: Fornita "as-is" senza garanzie completezza

### **🚨 Escalation Problemi:**
1. **Problemi minori**: Segnalazione via email/ticket
2. **Problemi critici**: Immediato shutdown sistema + contatto urgente
3. **Security breach**: Isolamento rete + assessment security + notifica autorità se necessario

---

## ✍️ **ACCETTAZIONE TERMINI**

**L'INSTALLAZIONE, CONFIGURAZIONE O UTILIZZO DEL SOFTWARE COSTITUISCE ACCETTAZIONE ESPLICITA E INCONDIZIONATA DI TUTTI I TERMINI SOPRA ELENCATI.**

**L'azienda utilizzatrice dichiara di:**
- ✅ Aver letto e compreso tutti i rischi
- ✅ Accettare integralmente la limitazione di responsabilità
- ✅ Disporre delle competenze tecniche necessarie
- ✅ Aver implementato misure di sicurezza adeguate
- ✅ Utilizzare il software esclusivamente in ambiente controllato

---

## 🆔 **IDENTIFICAZIONE VERSIONE**

- **Software**: Gestione Permessi Aziendali
- **Versione**: 1.0.0-beta
- **Data Release**: [DATA CORRENTE]
- **Codice Build**: [HASH COMMIT SE DISPONIBILE]
- **Ambiente Target**: Rete aziendale locale Windows/Android

---

**⚠️ ATTENZIONE: UTILIZZARE SOLO DOPO AVER LETTO, COMPRESO E ACCETTATO INTEGRALMENTE QUANTO SOPRA.**

**🚫 SE NON ACCETTI QUESTI TERMINI, NON INSTALLARE O UTILIZZARE IL SOFTWARE.**

---

*Documento generato automaticamente - Verificare applicabilità legale nel proprio ordinamento*