const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Lettura tabella company_settings...\n');

db.get("SELECT * FROM company_settings WHERE id = 1", (err, row) => {
  if (err) {
    console.error('❌ Errore:', err);
  } else if (!row) {
    console.log('⚠️  Nessun record trovato in company_settings');
  } else {
    console.log('✅ Record trovato:');
    console.log(JSON.stringify(row, null, 2));
  }

  db.close();
});
