// test-suite.js - Test sistematico WKF Suite v1.1.0
// Test per identificare conflitti tra feature

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';
const HTTPS_URL = 'https://localhost:8443';

// Colori per output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test risultati
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper per fare richieste HTTP
function testEndpoint(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      rejectUnauthorized: false // Per HTTPS self-signed
    };

    const lib = urlObj.protocol === 'https:' ? https : http;

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test 1: Server risponde
async function testServerAlive() {
  log('\n[TEST 1] Server risponde...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/`);
    if (response.statusCode === 200) {
      log('✅ Server risponde correttamente', 'green');
      results.passed++;
      results.tests.push({ name: 'Server Alive', status: 'PASS' });
      return true;
    }
  } catch (error) {
    log(`❌ Server non risponde: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Server Alive', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 2: Manifest PWA accessibile
async function testPWAManifest() {
  log('\n[TEST 2] PWA Manifest accessibile...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/manifest.json`);
    if (response.statusCode === 200) {
      const manifest = JSON.parse(response.body);
      if (manifest.name && manifest.icons) {
        log('✅ PWA Manifest valido', 'green');
        results.passed++;
        results.tests.push({ name: 'PWA Manifest', status: 'PASS' });
        return true;
      }
    }
  } catch (error) {
    log(`❌ PWA Manifest non valido: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'PWA Manifest', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 3: Service Worker accessibile
async function testServiceWorker() {
  log('\n[TEST 3] Service Worker accessibile...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/service-worker.js`);
    if (response.statusCode === 200 && response.body.includes('service-worker')) {
      log('✅ Service Worker file presente', 'green');
      results.passed++;
      results.tests.push({ name: 'Service Worker', status: 'PASS' });
      return true;
    }
  } catch (error) {
    log(`❌ Service Worker non trovato: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Service Worker', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 4: Icone PWA presenti
async function testPWAIcons() {
  log('\n[TEST 4] Icone PWA presenti...', 'blue');
  const iconSizes = ['192x192', '512x512'];
  let allPresent = true;

  for (const size of iconSizes) {
    try {
      const response = await testEndpoint(`${BASE_URL}/icons/icon-${size}.png`);
      if (response.statusCode !== 200) {
        log(`❌ Icona ${size} non trovata`, 'red');
        allPresent = false;
      }
    } catch (error) {
      log(`❌ Errore verifica icona ${size}: ${error.message}`, 'red');
      allPresent = false;
    }
  }

  if (allPresent) {
    log('✅ Tutte le icone PWA presenti', 'green');
    results.passed++;
    results.tests.push({ name: 'PWA Icons', status: 'PASS' });
    return true;
  } else {
    results.failed++;
    results.tests.push({ name: 'PWA Icons', status: 'FAIL' });
    return false;
  }
}

// Test 5: License status API
async function testLicenseAPI() {
  log('\n[TEST 5] License Status API...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/api/license/status`);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      log(`✅ License API funziona - Status: ${data.status}`, 'green');
      results.passed++;
      results.tests.push({ name: 'License API', status: 'PASS', data: data.status });
      return true;
    }
  } catch (error) {
    log(`❌ License API non funziona: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'License API', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 6: Stripe Public Key API
async function testStripePublicKey() {
  log('\n[TEST 6] Stripe Public Key API...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/api/stripe/public-key`);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      if (data.publicKey) {
        log('✅ Stripe Public Key API funziona', 'green');
        results.passed++;
        results.tests.push({ name: 'Stripe Public Key', status: 'PASS' });
        return true;
      }
    }
  } catch (error) {
    log(`❌ Stripe Public Key non disponibile: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Stripe Public Key', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 7: Stripe Checkout Session Creation (CRITICO)
async function testStripeCheckout() {
  log('\n[TEST 7] Stripe Checkout Session Creation (CRITICO)...', 'blue');
  try {
    const response = await testEndpoint(
      `${BASE_URL}/api/create-checkout-session`,
      'POST',
      {
        productType: 'wkf-suite-pro',
        returnUrl: `${BASE_URL}/upgrade-success.html`
      }
    );

    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      if (data.sessionId && data.url) {
        log('✅ ✅ ✅ STRIPE CHECKOUT FUNZIONA! ✅ ✅ ✅', 'green');
        log(`   Session ID: ${data.sessionId.substring(0, 20)}...`, 'green');
        results.passed++;
        results.tests.push({ name: 'Stripe Checkout', status: 'PASS' });
        return true;
      }
    }
  } catch (error) {
    log(`❌ ❌ ❌ STRIPE CHECKOUT FALLITO! ❌ ❌ ❌`, 'red');
    log(`   Errore: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Stripe Checkout', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 8: Dashboard HTML carica
async function testDashboardHTML() {
  log('\n[TEST 8] Dashboard HTML carica...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/dashboard.html`);
    if (response.statusCode === 200 && response.body.includes('Dashboard')) {
      log('✅ Dashboard HTML serve correttamente', 'green');
      results.passed++;
      results.tests.push({ name: 'Dashboard HTML', status: 'PASS' });
      return true;
    }
  } catch (error) {
    log(`❌ Dashboard HTML non carica: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Dashboard HTML', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 9: Login page carica
async function testLoginPage() {
  log('\n[TEST 9] Login page carica...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/login.html`);
    if (response.statusCode === 200) {
      log('✅ Login page carica', 'green');
      results.passed++;
      results.tests.push({ name: 'Login Page', status: 'PASS' });
      return true;
    }
  } catch (error) {
    log(`❌ Login page non carica: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Login Page', status: 'FAIL', error: error.message });
    return false;
  }
}

// Test 10: Upgrade page carica
async function testUpgradePage() {
  log('\n[TEST 10] Upgrade page (Stripe) carica...', 'blue');
  try {
    const response = await testEndpoint(`${BASE_URL}/upgrade.html`);
    if (response.statusCode === 200 && response.body.includes('Stripe')) {
      log('✅ Upgrade page carica con Stripe', 'green');
      results.passed++;
      results.tests.push({ name: 'Upgrade Page', status: 'PASS' });
      return true;
    }
  } catch (error) {
    log(`❌ Upgrade page non carica: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Upgrade Page', status: 'FAIL', error: error.message });
    return false;
  }
}

// Report finale
function printReport() {
  log('\n' + '='.repeat(60), 'blue');
  log('📊 REPORT TEST SUITE - WKF Suite v1.1.0', 'blue');
  log('='.repeat(60), 'blue');

  log(`\n✅ Test Passati: ${results.passed}`, 'green');
  log(`❌ Test Falliti: ${results.failed}`, 'red');
  log(`📈 Percentuale Successo: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`, 'yellow');

  log('\n📋 Dettagli Test:', 'blue');
  results.tests.forEach((test, index) => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    const color = test.status === 'PASS' ? 'green' : 'red';
    log(`  ${index + 1}. ${icon} ${test.name}`, color);
    if (test.error) {
      log(`     └─ Errore: ${test.error}`, 'red');
    }
    if (test.data) {
      log(`     └─ Data: ${test.data}`, 'yellow');
    }
  });

  log('\n' + '='.repeat(60), 'blue');

  // Analisi problemi
  if (results.failed > 0) {
    log('\n⚠️  PROBLEMI RILEVATI:', 'yellow');
    log('Esegui debug incrementale seguendo la guida.', 'yellow');
  } else {
    log('\n🎉 TUTTI I TEST PASSATI!', 'green');
    log('Sistema funzionante correttamente.', 'green');
  }

  log('');
}

// Esegui test suite
async function runTests() {
  log('\n🚀 Avvio Test Suite WKF Suite v1.1.0\n', 'blue');
  log('⏱️  Attendi completamento di tutti i test...\n', 'yellow');

  await testServerAlive();
  await testPWAManifest();
  await testServiceWorker();
  await testPWAIcons();
  await testLicenseAPI();
  await testStripePublicKey();
  await testStripeCheckout(); // TEST CRITICO
  await testDashboardHTML();
  await testLoginPage();
  await testUpgradePage();

  printReport();

  process.exit(results.failed > 0 ? 1 : 0);
}

// Avvia test
runTests().catch(error => {
  log(`\n❌ Errore critico test suite: ${error.message}`, 'red');
  process.exit(1);
});
