// Script Node.js per aggiungere meta tags PWA a tutte le pagine HTML
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Meta tags PWA da aggiungere
const pwaMeta = `
  <!-- PWA Meta Tags -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#F5C842">

  <!-- iOS Meta Tags -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="WKF Suite">
  <link rel="apple-touch-icon" href="/icons/icon-180x180.png">

  <!-- Android/Chrome Meta Tags -->
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="application-name" content="WKF Suite">
`;

// Script PWA da aggiungere prima di </body>
const pwaScript = `  <script src="pwa-install.js" defer></script>\n`;

// Funzione per processare file HTML
function addPWAtoHTML(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Salta se già contiene manifest.json
    if (content.includes('manifest.json')) {
      console.log(`⏭️  Saltato (già aggiornato): ${path.basename(filePath)}`);
      return;
    }

    // Aggiungi meta tags PWA dopo il tag <title>
    if (content.includes('</title>')) {
      content = content.replace('</title>', `</title>${pwaMeta}`);
    }

    // Aggiungi script PWA prima di </body> se non già presente
    if (!content.includes('pwa-install.js') && content.includes('</body>')) {
      content = content.replace('</body>', `${pwaScript}</body>`);
    }

    // Salva file modificato
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Aggiornato: ${path.basename(filePath)}`);

  } catch (error) {
    console.error(`❌ Errore processando ${filePath}:`, error.message);
  }
}

// Trova tutti i file HTML nella cartella public
function processAllHTML() {
  const files = fs.readdirSync(publicDir);

  console.log('🔄 Aggiunta meta tags PWA a tutte le pagine HTML...\n');

  files.forEach(file => {
    if (file.endsWith('.html') && file !== 'pwa-meta.html') {
      const filePath = path.join(publicDir, file);
      addPWAtoHTML(filePath);
    }
  });

  console.log('\n✅ Processo completato!');
}

// Esegui
processAllHTML();
