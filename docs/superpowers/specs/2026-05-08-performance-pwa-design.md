# Performance & PWA — Design Spec

**Date :** 2026-05-08
**Sous-projet :** 1/4 — Performance & PWA
**Objectif :** Rendre Hydro Explorer installable, utilisable hors-ligne (offline complet) et optimisé Lighthouse > 90.

---

## Résumé des décisions

| Décision | Choix |
|---|---|
| Stratégie offline | Complet — app shell + données Hub'eau + tuiles |
| Cache tuiles IGN | Zoom 3→8, France entière (~30 Mo) |
| TTL stations Hub'eau | 24 heures |
| TTL observations | 30 minutes |
| Architecture cache | Service Worker (statique) + IndexedDB (données API) |
| Build step | Aucun — compatible GitHub Pages statique |

---

## Architecture

Deux couches de cache strictement séparées :

**Cache API (géré par le Service Worker)**
- App shell : `index.html`, `offline.html`, CSS, JS locaux → Cache First, précaché à l'install
- CDN : Leaflet, Plotly → Cache First, précaché à l'install
- Tuiles IGN zoom 3→8 → Cache First, précaché à l'install (~30 Mo, ~2 000 tuiles)

**IndexedDB (géré par `db.js` côté application)**
- Store `stations` : liste Hub'eau avec TTL 24h
- Store `observations` : observations par station+période avec TTL 30min
- L'API Hub'eau n'est **pas** interceptée par le SW — `db.js` orchestre la logique cache/réseau

**Flux de données Hub'eau :**
`app.js` → `db.js` → vérifie IndexedDB (TTL ok ?) → si oui : données locales → si non : `api.js` (fetch) + sauvegarde IDB → retour données

---

## Nouveaux fichiers

### `src/manifest.json`
```json
{
  "name": "Hydro Explorer",
  "short_name": "Hydro",
  "description": "Visualisation des données hydrologiques françaises",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0d6efd",
  "lang": "fr",
  "icons": [
    { "src": "assets/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "assets/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### `src/sw.js` — Service Worker

**Événement `install` :**
- Précache la liste de ressources statiques : `["/", "/offline.html", "/css/main.css", "/css/components.css", "/js/app.js", ...]` + CDN Leaflet et Plotly
- Lance le précache des tuiles IGN zoom 3→8 via `cache-manager.js` (importé avec `importScripts`)
- `skipWaiting()` pour activation immédiate

**Événement `activate` :**
- Supprime les anciens caches (clés différentes du CACHE_NAME courant)
- `clients.claim()` pour contrôler tous les onglets immédiatement

**Événement `fetch` :**
- Tuiles IGN (`data.geopf.fr`) → Cache First (stockage long terme)
- CDN (`unpkg.com`, `cdn.plot.ly`) → Cache First
- Assets locaux (CSS, JS, HTML) → Cache First
- Hub'eau (`hubeau.eaufrance.fr`) → Network Only (géré par IndexedDB côté app)
- Navigation (HTML) → Cache First avec fallback `offline.html`

**Versionnement :** constante `CACHE_NAME = 'hydro-explorer-v1'`

### `src/offline.html`
Page HTML autonome (pas de dépendance JS) affichée quand l'utilisateur navigue directement hors-ligne. Affiche le logo, un message clair, et le dernier horodatage de mise en cache si disponible via `localStorage`.

### `src/js/db.js` — Wrapper IndexedDB

Base de données : `hydro-explorer`, version 1.

**Stores :**
```
stations  : keyPath='code_station'  — { code_station, ...stationData, cachedAt: Date.now() }
observations : keyPath='id'         — { id: `${code}-${days}`, data: Array, cachedAt: Date.now() }
```

**API exportée :**
```javascript
openDB()                              // ouvre/crée la base, retourne IDBDatabase
getStations()                         // retourne Array|null (null si absent ou TTL expiré)
saveStations(stations)                // sauvegarde avec cachedAt = Date.now()
getObservations(codeStation, days)    // retourne Array|null (null si absent ou TTL expiré)
saveObservations(code, days, data)    // sauvegarde avec cachedAt = Date.now()
```

**TTL :**
- Stations : `Date.now() - cachedAt > 24 * 3_600_000` → null (force refetch)
- Observations : `Date.now() - cachedAt > 30 * 60_000` → null (force refetch)

### `src/js/cache-manager.js` — Précache tuiles IGN

Importé dans `sw.js` via `importScripts('./js/cache-manager.js')`.

Calcule les coordonnées de toutes les tuiles IGN pour les niveaux de zoom 3 à 8 couvrant la France métropolitaine (bbox approximative : lon -5→10, lat 41→52) et les stocke dans le Cache API via `caches.open()`.

**Estimation :** zoom 3 (8 tuiles) + zoom 4 (24) + zoom 5 (80) + zoom 6 (270) + zoom 7 (900) + zoom 8 (3 200) ≈ 4 500 tuiles × ~7 Ko = ~30 Mo.

Le précache se fait en lots de 50 tuiles pour ne pas saturer le réseau à l'installation. Les erreurs individuelles sont ignorées (tuile manquante = chargée à la demande).

### `src/js/pwa.js` — Install prompt & statut réseau

**Install prompt :**
- Écoute `beforeinstallprompt`, stocke l'événement
- Affiche le bandeau d'installation (élément `#pwa-install-banner`) avec boutons "Plus tard" et "Installer"
- "Installer" → `prompt()` → `userChoice` → masque le bandeau définitivement (localStorage flag)
- "Plus tard" → masque pour la session (sessionStorage flag)

**Statut réseau :**
- Écoute `online` / `offline` sur `window`
- Quand offline → affiche `#offline-badge` dans le header avec horodatage du dernier sync (lu dans `localStorage`)
- Quand online → masque le badge, met à jour le timestamp dans `localStorage`

### `src/assets/icon-192.png` et `src/assets/icon-512.png`
Icônes PWA générées depuis un SVG inline (goutte d'eau bleue sur fond blanc). Générées en canvas HTML et exportées en PNG au premier lancement, ou intégrées comme data URI dans le manifest. Format PNG, fond blanc, icon maskable.

---

## Modifications des fichiers existants

### `src/index.html`

Ajouts dans `<head>` :
```html
<link rel="manifest" href="manifest.json" />
<meta name="theme-color" content="#0d6efd" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="assets/icon-192.png" />

<!-- Preconnect pour réduire la latence réseau -->
<link rel="preconnect" href="https://hubeau.eaufrance.fr" />
<link rel="preconnect" href="https://data.geopf.fr" />
<link rel="preconnect" href="https://unpkg.com" />
<link rel="preconnect" href="https://cdn.plot.ly" />
```

Ajouts dans `<body>` (avant `</body>`) :
```html
<!-- Badge hors-ligne -->
<div id="offline-badge" class="he-offline-badge" hidden aria-live="polite">
  ⚡ Hors-ligne · <span id="offline-date"></span>
</div>

<!-- Bandeau installation PWA -->
<div id="pwa-install-banner" class="he-install-banner" hidden>
  <div class="he-install-banner__info">
    <span class="he-install-banner__icon">💧</span>
    <div>
      <strong>Installer Hydro Explorer</strong>
      <span>Accès hors-ligne · Fonctionne comme une appli native</span>
    </div>
  </div>
  <div class="he-install-banner__actions">
    <button id="btn-install-later">Plus tard</button>
    <button id="btn-install-now">Installer</button>
  </div>
</div>

<script src="js/pwa.js" type="module"></script>
```

Enregistrement du SW (inline dans `<script type="module">` ou dans `app.js`) :
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### `src/js/app.js`

`loadStations()` modifié :
```javascript
// Avant : state.allStations = await fetchStations();
// Après :
let stations = await getStations();          // db.js — vérifie TTL 24h
if (!stations) {
  stations = await fetchStations();          // api.js — fetch réseau
  await saveStations(stations);             // db.js — persiste
}
state.allStations = stations;
```

`onStationClick()` modifié :
```javascript
// Avant : const observations = await fetchObservations(...)
// Après :
let observations = await getObservations(station.code_station, periodDays); // db.js
if (!observations) {
  observations = await fetchObservations(station.code_station, periodDays); // api.js
  await saveObservations(station.code_station, periodDays, observations);   // db.js
}
```

### `src/css/main.css`

Ajout des styles pour les nouveaux éléments UI :
```css
/* Badge hors-ligne */
.he-offline-badge { ... }  /* position fixed top-right, fond jaune, z-index 2000 */

/* Bandeau installation */
.he-install-banner { ... } /* position fixed bottom, fond #0d6efd, couleur blanche */
.he-install-banner__info { ... }
.he-install-banner__actions { ... }
```

### `src/js/api.js`
Aucune modification — reste un client HTTP pur.

### `src/js/config.js`
Ajout des constantes de cache :
```javascript
export const CACHE_NAME = 'hydro-explorer-v1';
export const STATIONS_TTL_MS = 24 * 3_600_000;
export const OBSERVATIONS_TTL_MS = 30 * 60_000;
export const TILE_ZOOM_MIN = 3;
export const TILE_ZOOM_MAX = 8;
// Bounding box France métropolitaine pour le précache tuiles
export const FRANCE_BBOX = { west: -5.5, east: 10.0, south: 41.0, north: 51.5 };
```

---

## Interface utilisateur

### Badge hors-ligne
- **Visible** uniquement quand `navigator.onLine === false`
- Contenu : `⚡ Hors-ligne · données du JJ/MM/AAAA HH:mm`
- Horodatage lu dans `localStorage['hydro-last-sync']`
- Mis à jour à chaque fetch réseau réussi
- Accessible : `aria-live="polite"` pour annonce lecteur d'écran

### Bandeau installation
- Déclenché par `beforeinstallprompt`
- Affiché une seule fois (flag `localStorage['pwa-install-dismissed']`)
- Bouton "Plus tard" → sessionStorage flag, réapparaît à la prochaine session
- Bouton "Installer" → `deferredPrompt.prompt()` → masqué définitivement si accepté

### Skeleton loading
- Remplacement du texte "Chargement des stations…" par une barre de progression animée avec compteur réel
- Le compteur est mis à jour dans `loadStations()` à chaque lot de 500 stations rendues
- Style CSS `@keyframes shimmer` déjà dans le plan

---

## Optimisations performance (Lighthouse)

| Optimisation | Impact Lighthouse | Fichier |
|---|---|---|
| `preconnect` pour 4 domaines | LCP, FCP | `index.html` |
| SW répond assets statiques < 5ms | FCP, TTI | `sw.js` |
| IDB évite refetch stations (24h) | TTI, Network | `db.js` + `app.js` |
| Tuiles IGN précachées | LCP carte | `sw.js` + `cache-manager.js` |
| Stations chargées en chunks 500 | Long Tasks | `app.js` |

---

## Ce qui n'est PAS dans ce spec

- Push notifications (hors scope)
- Background sync (les données sont rafraîchies au lancement, pas en arrière-plan)
- Piézométrie, débits, Vigicrues (sous-projet 2)
- Comparaison multi-stations (sous-projet 3)
- Refonte design (sous-projet 4)
