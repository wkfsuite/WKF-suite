# 📱 WKF Suite - PWA Technical Documentation

## 🏗️ Architettura PWA

### File Structure

```
permessi_webapp/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── service-worker.js          # Service Worker con cache strategy
│   ├── pwa-install.js             # Install manager e registrazione SW
│   ├── icons/                     # Icone PWA
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-192x192.png
│   │   └── icon-512x512.png
│   └── *.html                     # Pagine con meta tags PWA
```

## 📄 Manifest.json

### Proprietà Principali

```json
{
  "name": "WKF Suite - Gestione Permessi",
  "short_name": "WKF Suite",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#F5C842",
  "background_color": "#F5C842"
}
```

### Icons

- **72x72**: Android older devices
- **96x96**: Android standard
- **128x128**: Chrome Web Store
- **144x144**: Windows 10 tiles
- **192x192**: Standard Android/Chrome
- **512x512**: High-res splash screens

**Purpose:**
- `any`: Supporto generale
- `maskable`: Adaptive icons Android

### Shortcuts

```json
{
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "/dashboard.html"
    },
    {
      "name": "Nuova Richiesta",
      "url": "/dashboardDipendente.html"
    }
  ]
}
```

## 🔧 Service Worker

### Cache Strategy

**Network First** per API:
- `/api/*` endpoints
- Sempre dati freschi
- Fallback su cache se offline

**Cache First** per Assets:
- HTML, CSS, JS files
- Immagini, icone
- Font (se presenti)
- Velocità massima

### Versioning

```javascript
const CACHE_VERSION = 'wkf-suite-v1.0.0';
```

**Aggiornare la versione per forzare cache refresh**

### Lifecycle

1. **Install**: Cache assets iniziali
2. **Activate**: Rimuove cache vecchie
3. **Fetch**: Gestisce richieste con strategia appropriata

### Background Sync

```javascript
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-richieste') {
    event.waitUntil(syncRichieste());
  }
});
```

**TODO:** Implementare queue con IndexedDB per richieste offline

## 📲 PWA Install Manager

### Funzionalità

1. **Registrazione Service Worker**
   ```javascript
   navigator.serviceWorker.register('/service-worker.js')
   ```

2. **Cattura beforeinstallprompt**
   ```javascript
   window.addEventListener('beforeinstallprompt', (e) => {
     e.preventDefault();
     deferredPrompt = e;
   });
   ```

3. **Install Prompt**
   - Bottone "Installa App" nell'header
   - Banner dismissible
   - Istruzioni per iOS/Safari

4. **Update Detection**
   - Controlla aggiornamenti ogni 30 minuti
   - Banner "Nuova versione disponibile"
   - Aggiornamento con skipWaiting

5. **Online/Offline Detection**
   - Banner rosso quando offline
   - Toast quando torna online

## 🎨 UI Components

### Install Button

```html
<button id="pwa-install-btn" style="display: none;">
  📱 Installa App
</button>
```

**Visibilità:**
- Hidden by default
- Shown quando `beforeinstallprompt` fires
- Hidden dopo installazione

### Install Banner

```html
<div id="pwa-install-banner" style="display: none;">
  <!-- Messaggio installazione -->
</div>
```

**Comportamento:**
- Dismissible con localStorage
- Riappare dopo 7 giorni se dismissed
- Hidden se app installata

### Offline Banner

```html
<div id="offline-banner">
  📡 Sei offline
</div>
```

**Trigger:** `window.offline` event

## 🔔 Push Notifications

### Service Worker Handler

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192x192.png'
  });
});
```

### Notification Click

```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  clients.openWindow(event.notification.data.url);
});
```

**Nota:** Richiede HTTPS o localhost per funzionare

## 🧪 Testing

### Chrome DevTools

1. **Application Tab** → Manifest
   - Verifica manifest.json caricato correttamente
   - Check icons presenti

2. **Application Tab** → Service Workers
   - Verifica SW registrato
   - Test offline mode
   - Force update

3. **Lighthouse**
   ```bash
   npm install -g lighthouse
   lighthouse http://localhost:3000 --view
   ```

   **Target Score:** 90+/100 per PWA

### Installability Checklist

- ✅ HTTPS o localhost
- ✅ manifest.json valido
- ✅ Service Worker registrato
- ✅ Icons 192x192 e 512x512
- ✅ start_url risponde con 200
- ✅ display: standalone o fullscreen

### Offline Testing

```javascript
// Chrome DevTools → Network → Throttling → Offline
// Oppure Application → Service Workers → Offline
```

**Test:**
1. Vai online, visita tutte le pagine
2. Vai offline
3. Ricarica pagine → Devono funzionare da cache
4. Prova API calls → Devono usare cache

## 📊 Cache Management

### Cached Resources

```javascript
const urlsToCache = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/dashboardDipendente.html',
  '/styles.css',
  // ... altri asset
];
```

### Cache Size

- **Limite teorico**: ~50MB per dominio
- **Uso attuale**: ~2-5MB
- **Strategia:** Cache solo essenziale

### Clear Cache

```javascript
// Developer console
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});
```

## 🔐 Security Considerations

### Same-Origin Policy

- Service Worker deve essere servito dallo stesso origin
- Scope limitato a `/` (tutte le pagine)

### HTTPS

**Produzione:** HTTPS obbligatorio
**Sviluppo:** localhost funziona senza HTTPS

### Content Security Policy

Aggiungi al server.js se necessario:

```javascript
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline';"
  );
  next();
});
```

## 🚀 Deployment

### Server Setup

**Node.js già configurato** ✅

Il server Express serve automaticamente:
- `manifest.json` da `/manifest.json`
- Service Worker da `/service-worker.js`
- Icons da `/icons/*`

### HTTPS (Opzionale)

WKF Suite supporta già HTTPS se certificati presenti in `ssl/`:

```javascript
// server.js
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsServer = https.createServer(httpsOptions, app);
  httpsServer.listen(BASE_HTTPS_PORT, HOST, () => {
    console.log(`🔒 HTTPS server: https://${HOST}:${BASE_HTTPS_PORT}`);
  });
}
```

### Build Process

**Nessun build necessario** - PWA funziona con file sorgente

Per ottimizzare (opzionale):
```bash
# Minify Service Worker
npx terser service-worker.js -o service-worker.min.js
```

## 📈 Performance

### Metrics

- **First Contentful Paint**: < 2s
- **Time to Interactive**: < 3.5s
- **Speed Index**: < 4s

### Optimization

1. **Preload critical resources**
   ```html
   <link rel="preload" href="styles.css" as="style">
   ```

2. **Lazy load images**
   ```html
   <img loading="lazy" src="image.png">
   ```

3. **Defer non-critical JS**
   ```html
   <script src="pwa-install.js" defer></script>
   ```

## 🐛 Debugging

### Common Issues

**SW non si registra:**
```javascript
// Check console errors
navigator.serviceWorker.register('/service-worker.js')
  .catch(err => console.error('SW registration failed:', err));
```

**Cache non si aggiorna:**
```javascript
// Force update
registration.update();
// Oppure incrementa CACHE_VERSION
```

**Install prompt non appare:**
- Verifica HTTPS
- Check manifest valido
- Assicurati che app non sia già installata

### Logging

Service Worker logs in Chrome DevTools:
```
Chrome → DevTools → Console → Filter: service-worker.js
```

## 🔄 Update Strategy

### Service Worker Update

1. User apre app
2. SW check for updates (ogni 24h o manualmente)
3. Se nuovo SW disponibile, installa in background
4. Mostra banner "Aggiorna"
5. User clicca → `skipWaiting()` → Reload

### Force Update

```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  reg.update();
});
```

## 📱 Platform-Specific

### Android

- ✅ Full PWA support
- ✅ Add to Home Screen
- ✅ Push notifications
- ✅ Background sync
- ✅ Standalone mode

### iOS

- ⚠️ Limited PWA support
- ✅ Add to Home Screen
- ❌ No push notifications
- ❌ Limited background sync
- ✅ Standalone mode

### Desktop

- ✅ Chrome/Edge full support
- ✅ Install as app
- ✅ Window integration
- ⚠️ Firefox limited support

## 📚 Resources

### Documentation

- [MDN Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Google PWA Checklist](https://web.dev/pwa-checklist/)

### Tools

- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox) (per PWA avanzate)

## 🎯 Roadmap

### Prossime Feature

- [ ] IndexedDB per offline queue
- [ ] Background sync completo
- [ ] Cache strategie avanzate
- [ ] PWA Analytics
- [ ] App shortcuts dinamici
- [ ] Share Target API
- [ ] File System Access API (Desktop)

---

**WKF Suite PWA - Built with ❤️**
