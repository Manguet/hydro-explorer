// sw.js — CLASSIC SCRIPT, à la racine de src/
importScripts('./js/cache-manager.js');

// SYNC: valeur identique à config.js:CACHE_SHELL_NAME (duplication volontaire — classic script ne peut pas importer les ES modules)
const CACHE_SHELL = 'hydro-shell-v2';

// Calcul du chemin de base (gère localhost et GitHub Pages /sous-chemin/)
const SCOPE = self.registration.scope; // ex: 'http://localhost:8081/' ou 'https://user.github.io/hydro-explorer/'

const SHELL_ASSETS = [
  SCOPE,
  SCOPE + 'index.html',
  SCOPE + 'offline.html',
  SCOPE + 'manifest.json',
  SCOPE + 'css/main.css',
  SCOPE + 'css/components.css',
  SCOPE + 'js/app.js',
  SCOPE + 'js/api.js',
  SCOPE + 'js/map.js',
  SCOPE + 'js/chart.js',
  SCOPE + 'js/filters.js',
  SCOPE + 'js/export.js',
  SCOPE + 'js/config.js',
  SCOPE + 'js/utils.js',
  SCOPE + 'js/db.js',
  SCOPE + 'js/pwa.js',
  SCOPE + 'js/cache-manager.js',
  SCOPE + 'assets/icon-192.png',
  SCOPE + 'assets/icon-512.png',
  // CDN
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
  'https://cdn.plot.ly/plotly-basic-2.32.0.min.js',
];

// ===== INSTALL : précache shell + tuiles IGN =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => precacheTiles())   // défini dans cache-manager.js
      .catch((err) => console.warn('[SW] Install partiel :', err))
      .finally(() => self.skipWaiting()) // toujours activé, même si le précache échoue partiellement
  );
});

// ===== ACTIVATE : supprimer les anciens caches =====
self.addEventListener('activate', (event) => {
  const KNOWN_CACHES = [CACHE_SHELL, 'hydro-tiles-v1']; // SYNC: 'hydro-tiles-v1' = config.js:CACHE_TILES_NAME
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !KNOWN_CACHES.includes(k))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ===== FETCH : stratégies de cache =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hub'eau API → ne pas intercepter (géré par IndexedDB côté app)
  if (url.hostname === 'hubeau.eaufrance.fr') return;

  // Navigation HTML → Cache First + fallback offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request)
        .then((r) => r || fetch(request))
        .catch(() => caches.match(SCOPE + 'offline.html'))
    );
    return;
  }

  // Tuiles IGN → Cache First + mise en cache à la demande (zoom > 8)
  if (url.hostname === 'data.geopf.fr') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open('hydro-tiles-v1')
              .then((c) => c.put(request, response.clone()))
              .catch((err) => console.warn('[SW] Tile cache failed:', err));
          }
          return response;
        }).catch(() => undefined);
      })
    );
    return;
  }

  // Tout le reste (CSS, JS, CDN) → Cache First
  event.respondWith(
    caches.match(request)
      .then((r) => r || fetch(request))
      .catch(() => undefined)
  );
});
