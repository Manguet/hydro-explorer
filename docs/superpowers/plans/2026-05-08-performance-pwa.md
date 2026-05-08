# Performance & PWA — Plan d'implémentation

> **Pour les agents automatiques :** SUB-SKILL REQUIS : Utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox (`- [ ]`) pour le suivi.

**Goal:** Rendre Hydro Explorer installable comme PWA, utilisable entièrement hors-ligne (tuiles IGN zoom 3→8 précachées, stations et observations dans IndexedDB), avec optimisations Lighthouse > 90.

**Architecture:** Service Worker classique (`sw.js`) pour le cache statique (shell, CDN, tuiles IGN). IndexedDB via `db.js` pour les données Hub'eau avec TTL (stations 24h, observations 30min). Séparation stricte : Cache API = ressources, IndexedDB = données. Aucun build step — compatible GitHub Pages statique.

**Tech Stack:** Service Worker API, Cache API, IndexedDB API, Web App Manifest, JS ES modules (app), classic script (SW + cache-manager)

---

## Structure des fichiers

```
src/
├── manifest.json          (CRÉER) — PWA manifest : nom, icônes, display standalone
├── sw.js                  (CRÉER) — Service Worker : install, activate, fetch
├── offline.html           (CRÉER) — Page fallback quand navigation directe hors-ligne
├── assets/
│   ├── icon-192.png       (CRÉER) — Icône PWA 192×192
│   └── icon-512.png       (CRÉER) — Icône PWA 512×512
├── js/
│   ├── cache-manager.js   (CRÉER) — Précache tuiles IGN zoom 3→8 (classic script)
│   ├── db.js              (CRÉER) — Wrapper IndexedDB : stations + observations
│   └── pwa.js             (CRÉER) — Install prompt + badge offline
├── css/main.css           (MODIFIER) — Styles badge offline + bandeau install
├── index.html             (MODIFIER) — Manifest, preconnect, badge, banner, SW registration
├── js/config.js           (MODIFIER) — Constantes TTL et cache
└── js/app.js              (MODIFIER) — Intégration db.js dans loadStations/onStationClick
```

### Conventions
- `sw.js` et `cache-manager.js` sont des **classic scripts** (pas d'ES modules) — `importScripts()` incompatible avec `type="module"`
- `db.js` et `pwa.js` sont des **ES modules** importés par l'app
- Les URLs dans le SW utilisent `self.registration.scope` comme base pour fonctionner aussi bien en localhost qu'en GitHub Pages avec sous-chemin

---

## Tâche 1 — config.js : constantes de cache

**Fichiers :**
- Modifier : `src/js/config.js`

- [ ] **Étape 1 : Ajouter les constantes à la fin de `src/js/config.js`**

Ajouter après la ligne `export const DEFAULT_PERIOD_DAYS = 30;` :

```javascript
// ===== Cache & PWA =====
export const CACHE_SHELL_NAME = 'hydro-shell-v1';
export const CACHE_TILES_NAME = 'hydro-tiles-v1';
export const STATIONS_TTL_MS = 24 * 3_600_000;      // 24 heures
export const OBSERVATIONS_TTL_MS = 30 * 60_000;     // 30 minutes
export const TILE_ZOOM_MIN = 3;
export const TILE_ZOOM_MAX = 8;
// Bounding box France métropolitaine pour le précache des tuiles
export const FRANCE_BBOX = { west: -5.5, east: 10.0, south: 41.0, north: 51.5 };
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/config.js
git commit -m "feat(pwa): constantes TTL et cache dans config.js"
```

---

## Tâche 2 — db.js : wrapper IndexedDB

**Fichiers :**
- Créer : `src/js/db.js`

Ce module expose 4 fonctions async. Chacune ouvre la base via `openDB()` et gère les TTL. Retourne `null` si absent ou expiré (signal pour l'appelant de faire un fetch réseau).

- [ ] **Étape 1 : Créer `src/js/db.js`**

```javascript
import { STATIONS_TTL_MS, OBSERVATIONS_TTL_MS } from './config.js';

const DB_NAME = 'hydro-explorer';
const DB_VERSION = 1;

/** Ouvre (ou crée) la base IndexedDB. Retourne une Promise<IDBDatabase>. */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('stations')) {
        db.createObjectStore('stations', { keyPath: 'code_station' });
      }
      if (!db.objectStoreNames.contains('observations')) {
        db.createObjectStore('observations', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retourne toutes les stations depuis IDB si le cache est valide (< 24h).
 * Retourne null si absent, vide ou expiré.
 */
export async function getStations() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('stations', 'readonly');
      const req = tx.objectStore('stations').getAll();
      req.onsuccess = () => {
        const all = req.result;
        if (!all || all.length === 0) return resolve(null);
        const cachedAt = all[0]?.cachedAt;
        if (!cachedAt || Date.now() - cachedAt > STATIONS_TTL_MS) return resolve(null);
        // Retirer le champ cachedAt avant de renvoyer (l'app ne doit pas le voir)
        resolve(all.map(({ cachedAt: _, ...s }) => s));
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Sauvegarde le tableau de stations en IDB avec timestamp courant.
 * @param {Array} stations - Tableau issu de fetchStations()
 */
export async function saveStations(stations) {
  try {
    const db = await openDB();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('stations', 'readwrite');
      const store = tx.objectStore('stations');
      store.clear();
      stations.forEach(s => store.put({ ...s, cachedAt: now }));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch {
    // Échec IDB non bloquant — l'app continue sans cache
  }
}

/**
 * Retourne les observations d'une station depuis IDB si valides (< 30min).
 * @param {string} codeStation
 * @param {number} days
 * @returns {Promise<Array|null>}
 */
export async function getObservations(codeStation, days) {
  try {
    const db = await openDB();
    const id = `${codeStation}-${days}`;
    return new Promise((resolve) => {
      const tx = db.transaction('observations', 'readonly');
      const req = tx.objectStore('observations').get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) return resolve(null);
        if (Date.now() - record.cachedAt > OBSERVATIONS_TTL_MS) return resolve(null);
        resolve(record.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Sauvegarde les observations d'une station en IDB.
 * @param {string} codeStation
 * @param {number} days
 * @param {Array} data - Tableau d'observations Hub'eau
 */
export async function saveObservations(codeStation, days, data) {
  try {
    const db = await openDB();
    const id = `${codeStation}-${days}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readwrite');
      tx.objectStore('observations').put({ id, data, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch {
    // Échec IDB non bloquant
  }
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/db.js
git commit -m "feat(pwa): wrapper IndexedDB (stations 24h, observations 30min)"
```

---

## Tâche 3 — cache-manager.js : précache tuiles IGN

**Fichiers :**
- Créer : `src/js/cache-manager.js`

**Important :** Ce fichier est un **classic script** (pas d'ES module). Il est chargé par `sw.js` via `importScripts('./js/cache-manager.js')` et expose `precacheTiles()` dans la portée globale du SW.

- [ ] **Étape 1 : Créer `src/js/cache-manager.js`**

```javascript
// cache-manager.js — CLASSIC SCRIPT (pas d'import/export)
// Importé par sw.js via importScripts(). Expose precacheTiles() globalement.

const CM_TILE_CACHE = 'hydro-tiles-v1';
const CM_IGN_BASE = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM';
const CM_BBOX = { west: -5.5, east: 10.0, south: 41.0, north: 51.5 };
const CM_ZOOM_MIN = 3;
const CM_ZOOM_MAX = 8;
const CM_BATCH = 20; // tuiles par lot réseau

/** Convertit lat/lon en coordonnées de tuile XY pour un zoom donné. */
function latLonToTile(lat, lon, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/** Construit l'URL WMTS d'une tuile IGN. */
function tileUrl(z, x, y) {
  return `${CM_IGN_BASE}&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
}

/** Calcule la liste de toutes les URLs de tuiles France zoom 3→8. */
function getAllTileUrls() {
  const urls = [];
  for (let z = CM_ZOOM_MIN; z <= CM_ZOOM_MAX; z++) {
    const min = latLonToTile(CM_BBOX.north, CM_BBOX.west, z);
    const max = latLonToTile(CM_BBOX.south, CM_BBOX.east, z);
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        urls.push(tileUrl(z, x, y));
      }
    }
  }
  return urls;
}

/**
 * Précache toutes les tuiles IGN France zoom 3→8 dans le Cache API.
 * Les tuiles déjà en cache sont ignorées. Les erreurs individuelles sont ignorées.
 * Traitement par lots de CM_BATCH pour ne pas saturer le réseau.
 */
async function precacheTiles() {
  const cache = await caches.open(CM_TILE_CACHE);
  const urls = getAllTileUrls();

  for (let i = 0; i < urls.length; i += CM_BATCH) {
    const batch = urls.slice(i, i + CM_BATCH);
    await Promise.allSettled(
      batch.map(async (url) => {
        const hit = await cache.match(url);
        if (hit) return; // déjà en cache
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      })
    );
  }
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/cache-manager.js
git commit -m "feat(pwa): précache tuiles IGN France zoom 3-8 (cache-manager)"
```

---

## Tâche 4 — sw.js : Service Worker

**Fichiers :**
- Créer : `src/sw.js`

**Important :** Classic script à la racine de `src/`. Les URLs du shell sont calculées à partir de `self.registration.scope` pour fonctionner en localhost ET en GitHub Pages avec sous-chemin.

- [ ] **Étape 1 : Créer `src/sw.js`**

```javascript
// sw.js — CLASSIC SCRIPT, à la racine de src/
importScripts('./js/cache-manager.js');

const CACHE_SHELL = 'hydro-shell-v1';

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
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Install partiel :', err))
  );
});

// ===== ACTIVATE : supprimer les anciens caches =====
self.addEventListener('activate', (event) => {
  const KNOWN_CACHES = [CACHE_SHELL, 'hydro-tiles-v1'];
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
              .then((c) => c.put(request, response.clone()));
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
```

- [ ] **Étape 2 : Commit**

```bash
git add src/sw.js
git commit -m "feat(pwa): Service Worker (shell cache-first, tiles IGN, fallback offline)"
```

---

## Tâche 5 — manifest.json + icônes PWA

**Fichiers :**
- Créer : `src/manifest.json`
- Créer : `src/assets/icon-192.png`
- Créer : `src/assets/icon-512.png`

- [ ] **Étape 1 : Créer `src/manifest.json`**

```json
{
  "name": "Hydro Explorer",
  "short_name": "Hydro",
  "description": "Visualisation des données hydrologiques françaises — API Hub'eau",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d6efd",
  "lang": "fr",
  "icons": [
    {
      "src": "assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Étape 2 : Générer les icônes PNG**

Créer le script `generate-icons.py` à la racine du projet puis l'exécuter :

```python
#!/usr/bin/env python3
"""Génère deux icônes PNG PWA sans dépendance externe."""
import struct, zlib, os

def make_png(size, r, g, b):
    """PNG RGBA solid color, format correct (filter byte 0 par scanline)."""
    raw = bytearray()
    for _ in range(size):
        raw.append(0)                          # filtre PNG type None
        for _ in range(size):
            raw.extend([r, g, b, 255])         # RGBA opaque
    # Chunks PNG
    def chunk(tag, data):
        payload = tag + data
        return (struct.pack('>I', len(data)) + payload +
                struct.pack('>I', zlib.crc32(payload) & 0xffffffff))
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' +
            chunk(b'IHDR', ihdr) +
            chunk(b'IDAT', zlib.compress(bytes(raw))) +
            chunk(b'IEND', b''))

os.makedirs('src/assets', exist_ok=True)
for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png')]:
    path = f'src/assets/{name}'
    with open(path, 'wb') as f:
        f.write(make_png(size, 13, 110, 253))   # #0d6efd bleu primaire
    print(f'✓ {path}')
```

Exécuter depuis la racine du projet :

```bash
python3 generate-icons.py
```

Attendu :
```
✓ src/assets/icon-192.png
✓ src/assets/icon-512.png
```

- [ ] **Étape 3 : Commit**

```bash
git add src/manifest.json src/assets/icon-192.png src/assets/icon-512.png generate-icons.py
git commit -m "feat(pwa): manifest.json et icônes PWA 192/512px"
```

---

## Tâche 6 — offline.html : page de fallback

**Fichiers :**
- Créer : `src/offline.html`

Page autonome (aucune dépendance JS/CSS externe) affichée quand l'utilisateur navigue hors-ligne sans cache disponible.

- [ ] **Étape 1 : Créer `src/offline.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hydro Explorer — Hors-ligne</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      background: #f8f9fa;
      color: #212529;
      padding: 2rem;
      text-align: center;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      padding: 2.5rem 2rem;
      box-shadow: 0 4px 24px rgba(0,0,0,.1);
      max-width: 380px;
    }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #0d6efd; }
    p { font-size: 0.9rem; color: #6c757d; line-height: 1.6; margin-bottom: 1rem; }
    .last-sync { font-size: 0.8rem; color: #adb5bd; }
    button {
      margin-top: 1rem;
      padding: 0.6rem 1.5rem;
      background: #0d6efd;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { background: #0b5ed7; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">💧</div>
    <h1>Hydro Explorer</h1>
    <p>Vous êtes actuellement hors-ligne et cette page n'est pas encore en cache.</p>
    <p>Reconnectez-vous à internet pour accéder aux données hydrologiques.</p>
    <p class="last-sync" id="last-sync"></p>
    <button onclick="window.location.reload()">Réessayer</button>
  </div>
  <script>
    const ts = localStorage.getItem('hydro-last-sync');
    if (ts) {
      const d = new Date(parseInt(ts));
      document.getElementById('last-sync').textContent =
        'Dernière synchronisation : ' + d.toLocaleString('fr-FR');
    }
  </script>
</body>
</html>
```

- [ ] **Étape 2 : Commit**

```bash
git add src/offline.html
git commit -m "feat(pwa): page fallback offline.html"
```

---

## Tâche 7 — pwa.js : install prompt + badge réseau

**Fichiers :**
- Créer : `src/js/pwa.js`

Module ES gérant deux responsabilités indépendantes : le bandeau d'installation PWA et le badge hors-ligne.

- [ ] **Étape 1 : Créer `src/js/pwa.js`**

```javascript
// pwa.js — Gestion install prompt et statut réseau

const INSTALL_DISMISSED_KEY = 'hydro-pwa-dismissed';
const LAST_SYNC_KEY = 'hydro-last-sync';

let deferredPrompt = null;

// ===== Enregistrement du Service Worker =====
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('[PWA] Service Worker enregistré'))
    .catch((err) => console.warn('[PWA] Enregistrement SW échoué :', err));
}

// ===== Install Prompt =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Ne pas afficher si déjà refusé définitivement
  if (!localStorage.getItem(INSTALL_DISMISSED_KEY)) {
    showInstallBanner();
  }
});

function showInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (!banner) return;
  // Ne pas afficher si refusé pour cette session
  if (sessionStorage.getItem('hydro-pwa-session-dismissed')) return;
  banner.hidden = false;
}

// Bouton "Installer"
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-install-now')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('pwa-install-banner').hidden = true;
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    }
  });

  // Bouton "Plus tard"
  document.getElementById('btn-install-later')?.addEventListener('click', () => {
    document.getElementById('pwa-install-banner').hidden = true;
    sessionStorage.setItem('hydro-pwa-session-dismissed', '1');
  });

  // Statut réseau initial
  updateOfflineBadge();
});

// ===== Statut réseau =====
function updateOfflineBadge() {
  const badge = document.getElementById('offline-badge');
  const dateEl = document.getElementById('offline-date');
  if (!badge) return;

  if (!navigator.onLine) {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (dateEl && lastSync) {
      dateEl.textContent = new Date(parseInt(lastSync, 10)).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
    badge.hidden = false;
  } else {
    badge.hidden = true;
    // Mettre à jour l'horodatage du dernier sync réussi
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  }
}

window.addEventListener('online', updateOfflineBadge);
window.addEventListener('offline', updateOfflineBadge);

/** Appelée par app.js après chaque fetch Hub'eau réussi pour mettre à jour le timestamp. */
export function markSynced() {
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/pwa.js
git commit -m "feat(pwa): install prompt, badge offline, enregistrement SW"
```

---

## Tâche 8 — app.js : intégration IndexedDB

**Fichiers :**
- Modifier : `src/js/app.js`

Deux changements : ajout des imports `db.js` + `pwa.js`, et modification de `loadStations()` et `onStationClick()` pour passer par le cache IDB avant de faire un fetch réseau.

- [ ] **Étape 1 : Remplacer l'entête des imports dans `src/js/app.js`**

Remplacer les 16 premières lignes (les imports actuels) par :

```javascript
import { fetchStations, fetchObservations, computeStationStatus } from './api.js';
import {
  initMap,
  renderStations,
  updateMarkerStatus,
  applyMarkerFilter,
  getAllStations,
} from './map.js';
import { renderChart, clearChart } from './chart.js';
import {
  initFilters,
  getFilterValues,
  buildFilterPredicate,
  toggleFiltersPanel,
} from './filters.js';
import { exportCSV } from './export.js';
import { getStations, saveStations, getObservations, saveObservations } from './db.js';
import { registerSW, markSynced } from './pwa.js';
```

- [ ] **Étape 2 : Modifier `loadStations()` dans `src/js/app.js`**

Remplacer la fonction `loadStations()` (lignes 34–48) par :

```javascript
async function loadStations() {
  showStatus('Chargement des stations…');
  try {
    // 1. Vérifier le cache IndexedDB (TTL 24h)
    let stations = await getStations();
    if (stations) {
      showStatus(`${stations.length} stations (cache local)`, 3000);
    } else {
      // 2. Fetch réseau si cache absent ou expiré
      stations = await fetchStations();
      await saveStations(stations);
      markSynced();
      showStatus(`${stations.length} stations chargées`, 4000);
    }
    state.allStations = stations;
    state.allStations.forEach(s => state.stationMap.set(s.code_station, s));
    renderStations(state.allStations);
    initFilters(state.allStations, onFilterChange);
  } catch (err) {
    showStatus(`Erreur de chargement : ${err.message}`, 10000);
    console.error('[Hydro Explorer]', err);
  }
}
```

- [ ] **Étape 3 : Modifier `onStationClick()` dans `src/js/app.js`**

Remplacer la fonction `onStationClick()` (lignes 51–76) par :

```javascript
async function onStationClick(station) {
  state.selectedStation = station;
  openChartPanel(station);

  const { periodDays } = getFilterValues();

  // 1. Vérifier le cache mémoire (session)
  const memCached = state.observationsCache.get(station.code_station);
  if (memCached) {
    displayChart(station, memCached);
    return;
  }

  // 2. Vérifier le cache IndexedDB (TTL 30min)
  updateChartMeta('Chargement des données…');
  const idbCached = await getObservations(station.code_station, periodDays);
  if (idbCached) {
    state.observationsCache.set(station.code_station, idbCached);
    displayChart(station, idbCached);
    return;
  }

  // 3. Fetch réseau
  try {
    const observations = await fetchObservations(station.code_station, periodDays);
    await saveObservations(station.code_station, periodDays, observations);
    markSynced();
    state.observationsCache.set(station.code_station, observations);
    const status = computeStationStatus(observations);
    updateMarkerStatus(station.code_station, status);
    displayChart(station, observations);
  } catch (err) {
    updateChartMeta(`Erreur : ${err.message}`);
    console.error('[Hydro Explorer]', err);
  }
}
```

- [ ] **Étape 4 : Ajouter l'appel `registerSW()` dans `DOMContentLoaded`**

Remplacer le bloc `DOMContentLoaded` (lignes 27–31) par :

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  registerSW();
  initMap('map', onStationClick);
  bindUIEvents();
  await loadStations();
});
```

- [ ] **Étape 5 : Commit**

```bash
git add src/js/app.js
git commit -m "feat(pwa): intégration IndexedDB dans loadStations et onStationClick"
```

---

## Tâche 9 — index.html + main.css : câblage final

**Fichiers :**
- Modifier : `src/index.html`
- Modifier : `src/css/main.css`

- [ ] **Étape 1 : Modifier `src/index.html` — ajouts dans `<head>`**

Remplacer le bloc `<head>` entier par :

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Visualisation des données hydrologiques françaises — API Hub'eau" />
  <meta name="theme-color" content="#0d6efd" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <title>Hydro Explorer — Données hydrologiques France</title>

  <link rel="manifest" href="manifest.json" />
  <link rel="apple-touch-icon" href="assets/icon-192.png" />

  <!-- Preconnect pour réduire la latence au premier chargement -->
  <link rel="preconnect" href="https://hubeau.eaufrance.fr" />
  <link rel="preconnect" href="https://data.geopf.fr" />
  <link rel="preconnect" href="https://unpkg.com" />
  <link rel="preconnect" href="https://cdn.plot.ly" />

  <!-- Leaflet -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

  <!-- Styles locaux -->
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/components.css" />
</head>
```

- [ ] **Étape 2 : Modifier `src/index.html` — ajouts avant `</body>`**

Remplacer la fin du `<body>` (après `</main>`, avant `</body>`) par :

```html
  <!-- Badge hors-ligne (masqué quand online) -->
  <div id="offline-badge" class="he-offline-badge" hidden aria-live="polite" aria-atomic="true">
    ⚡ Hors-ligne &middot; données du <span id="offline-date"></span>
  </div>

  <!-- Bandeau installation PWA (masqué par défaut) -->
  <div id="pwa-install-banner" class="he-install-banner" hidden role="complementary" aria-label="Installer l'application">
    <div class="he-install-banner__info">
      <span class="he-install-banner__icon" aria-hidden="true">💧</span>
      <div>
        <strong>Installer Hydro Explorer</strong>
        <span>Accès hors-ligne · Fonctionne comme une appli native</span>
      </div>
    </div>
    <div class="he-install-banner__actions">
      <button id="btn-install-later" class="he-install-btn he-install-btn--later">Plus tard</button>
      <button id="btn-install-now" class="he-install-btn he-install-btn--now">Installer</button>
    </div>
  </div>

  <!-- Leaflet JS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <!-- Plotly (bundle basic allégé) -->
  <script src="https://cdn.plot.ly/plotly-basic-2.32.0.min.js"></script>
  <!-- Application -->
  <script type="module" src="js/app.js"></script>
</body>
```

- [ ] **Étape 3 : Ajouter les styles dans `src/css/main.css`**

Ajouter à la fin du fichier (après la règle `:focus-visible`) :

```css
/* ===== PWA : Badge hors-ligne ===== */
.he-offline-badge {
  position: fixed;
  top: calc(var(--header-height) + 0.5rem);
  right: var(--spacing);
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  border-radius: 12px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  z-index: 2000;
  box-shadow: var(--shadow);
}

.he-offline-badge[hidden] { display: none; }

/* ===== PWA : Bandeau installation ===== */
.he-install-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-primary);
  color: #fff;
  padding: 0.8rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  z-index: 2000;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.2);
}

.he-install-banner[hidden] { display: none; }

.he-install-banner__info {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.he-install-banner__icon { font-size: 1.5rem; }

.he-install-banner__info strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
}

.he-install-banner__info span {
  display: block;
  font-size: 0.75rem;
  opacity: 0.85;
}

.he-install-banner__actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

.he-install-btn {
  padding: 0.4rem 1rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 500;
  min-height: 36px;
}

.he-install-btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

.he-install-btn--later {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.he-install-btn--later:hover { background: rgba(255, 255, 255, 0.25); }

.he-install-btn--now {
  background: #fff;
  color: var(--color-primary);
  border: none;
  font-weight: 700;
}

.he-install-btn--now:hover { background: #e8f0fe; }

@media (max-width: 640px) {
  .he-install-banner { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Étape 4 : Vérifier dans le navigateur**

```bash
python3 -m http.server 8082 --directory src
```

Ouvrir `http://localhost:8082`.

Checklist :
- [ ] Pas d'erreur console (onglet Console DevTools)
- [ ] Service Worker enregistré : onglet Application → Service Workers → Status "activated and running"
- [ ] Cache peuplé : onglet Application → Cache Storage → `hydro-shell-v1` contient les assets
- [ ] `hydro-tiles-v1` contient des tuiles IGN (peut prendre 1-2 min)
- [ ] IndexedDB : onglet Application → IndexedDB → `hydro-explorer` → `stations` rempli après premier chargement
- [ ] Couper le réseau (DevTools Network → Offline) → recharger → l'app fonctionne
- [ ] Badge orange "⚡ Hors-ligne" visible dans le coin supérieur droit
- [ ] Rétablir le réseau → badge disparaît

- [ ] **Étape 5 : Commit final**

```bash
git add src/index.html src/css/main.css
git commit -m "feat(pwa): câblage final manifest, preconnect, badge offline, bandeau install"
```

---

## Auto-vérification du plan

### Couverture du spec

| Exigence spec | Tâche |
|---|---|
| Offline complet | T4 (SW) + T2 (IDB) + T3 (tuiles) |
| Tuiles IGN zoom 3→8 précachées | T3 (cache-manager) + T4 (sw.js install) |
| Cache stations 24h | T1 (config) + T2 (db.js STATIONS_TTL_MS) |
| Cache observations 30min | T1 (config) + T2 (db.js OBSERVATIONS_TTL_MS) |
| Manifest PWA installable | T5 |
| Icônes 192 + 512 | T5 |
| Page offline.html fallback | T6 |
| Badge hors-ligne horodaté | T7 (pwa.js) + T9 (HTML/CSS) |
| Bandeau install prompt | T7 (pwa.js) + T9 (HTML/CSS) |
| preconnect 4 domaines | T9 (index.html) |
| localStorage hydro-last-sync | T7 (markSynced) + T8 (app.js appelle markSynced) |
| FRANCE_BBOX pour précache | T3 (CM_BBOX) |
| Base path GitHub Pages | T4 (SCOPE = self.registration.scope) |
| app.js intègre IDB | T8 |

### Cohérence des noms

| Symbole | Défini en | Utilisé en |
|---|---|---|
| `CACHE_SHELL_NAME` | T1 config.js | T4 sw.js (valeur hardcodée identique `'hydro-shell-v1'`) |
| `CACHE_TILES_NAME` | T1 config.js | T3 cache-manager.js (valeur identique `'hydro-tiles-v1'`) |
| `STATIONS_TTL_MS` | T1 config.js | T2 db.js (importé) |
| `OBSERVATIONS_TTL_MS` | T1 config.js | T2 db.js (importé) |
| `getStations` | T2 db.js | T8 app.js |
| `saveStations` | T2 db.js | T8 app.js |
| `getObservations` | T2 db.js | T8 app.js |
| `saveObservations` | T2 db.js | T8 app.js |
| `precacheTiles` | T3 cache-manager.js (global) | T4 sw.js |
| `registerSW` | T7 pwa.js | T8 app.js |
| `markSynced` | T7 pwa.js | T8 app.js |
| `#offline-badge` | T9 index.html | T7 pwa.js |
| `#offline-date` | T9 index.html | T7 pwa.js |
| `#pwa-install-banner` | T9 index.html | T7 pwa.js |
| `#btn-install-now` | T9 index.html | T7 pwa.js |
| `#btn-install-later` | T9 index.html | T7 pwa.js |

**Remarque sur les noms de cache :** `CACHE_SHELL_NAME` et `CACHE_TILES_NAME` sont dans `config.js` (ES module) mais le SW et cache-manager sont des classic scripts qui ne peuvent pas les importer. Les valeurs sont donc **dupliquées** intentionnellement dans `sw.js` et `cache-manager.js` — c'est un compromis volontaire documenté dans le spec (pas un oubli).
