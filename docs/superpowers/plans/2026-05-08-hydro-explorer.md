# Hydro Explorer — Plan d'implémentation

> **Pour les agents automatiques :** SUB-SKILL REQUIS : Utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour implémenter ce plan tâche par tâche. Les étapes utilisent la syntaxe checkbox (`- [ ]`) pour le suivi.

**Goal:** Construire une application web statique de visualisation des données hydrologiques françaises (API Hub'eau) avec carte Leaflet + tuiles IGN, clustering de marqueurs, graphiques Plotly, filtres et export CSV — déployable sur GitHub Pages sans étape de build.

**Architecture:** JavaScript ES modules (`type="module"`) sans bundler. L'état global est un objet dans `app.js` qui orchestre les modules spécialisés. Toutes les données sont récupérées côté client via l'API Hub'eau publique (CORS activé). Leaflet.markercluster gère les ~5 000 stations nationales. Les données de l'API sont systématiquement échappées avant injection dans le DOM (protection XSS).

**Tech Stack:** HTML5, CSS3 (variables CSS, grid, flexbox), JavaScript ES2020 (modules, fetch, async/await), Leaflet 1.9, Leaflet.markercluster 1.5, Plotly.js (bundle basic, CDN), API Hub'eau v2 hydrométrie

---

## Structure des fichiers

```
src/
├── index.html           — Shell HTML, import des CDN, layout structure
├── css/
│   ├── main.css         — Variables, reset, layout responsive, RGAA
│   └── components.css   — Marqueurs, popups, panneau graphique, filtres
├── js/
│   ├── config.js        — Constantes (URLs API, couleurs, paramètres carte)
│   ├── utils.js         — Utilitaires partagés (escapeHtml, formatDate)
│   ├── api.js           — Client Hub'eau (fetchStations, fetchObservations)
│   ├── map.js           — Leaflet : init, markers, clustering, popups
│   ├── chart.js         — Plotly : rendu série temporelle
│   ├── filters.js       — Panneau filtres : état UI, application des filtres
│   ├── export.js        — Génération et téléchargement CSV
│   └── app.js           — Orchestration, état global, initialisation
└── assets/
    └── favicon.ico
```

### Conventions de nommage

- Fonctions exportées : `camelCase`
- État global dans `app.js` : objet `state` (jamais partagé directement, passé en param)
- IDs HTML : `kebab-case`
- Classes CSS : `kebab-case` avec préfixe `he-` (hydro-explorer)
- Codes station Hub'eau : chaîne de 10 caractères (ex: `K437311001`)
- Toute donnée externe (API) injectée dans le DOM passe par `escapeHtml()` de `utils.js`

---

## Tâche 1 — Structure HTML et CSS de base

**Fichiers :**
- Créer : `src/index.html`
- Créer : `src/css/main.css`
- Créer : `src/css/components.css`

- [ ] **Étape 1 : Créer `src/index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Visualisation des données hydrologiques françaises — API Hub'eau" />
  <title>Hydro Explorer — Données hydrologiques France</title>

  <!-- Leaflet -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

  <!-- Styles locaux -->
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/components.css" />
</head>
<body>
  <header class="he-header" role="banner">
    <div class="he-header__brand">
      <h1 class="he-header__title">Hydro Explorer</h1>
      <span class="he-header__subtitle">Données hydrologiques — Hub'eau</span>
    </div>
    <nav class="he-header__actions" aria-label="Actions principales">
      <button id="btn-filters" class="he-btn he-btn--secondary" aria-expanded="false" aria-controls="panel-filters">
        Filtres
      </button>
      <button id="btn-export" class="he-btn he-btn--secondary" aria-label="Exporter les données au format CSV">
        Exporter CSV
      </button>
    </nav>
  </header>

  <main class="he-main" role="main">
    <!-- Panneau de filtres (masqué par défaut) -->
    <aside id="panel-filters" class="he-filters" aria-label="Filtres" hidden>
      <h2 class="he-filters__title">Filtres</h2>

      <div class="he-filters__group">
        <label for="filter-department" class="he-label">Département</label>
        <select id="filter-department" class="he-select">
          <option value="">Tous les départements</option>
        </select>
      </div>

      <div class="he-filters__group">
        <label for="filter-type" class="he-label">Type de station</label>
        <select id="filter-type" class="he-select">
          <option value="">Tous les types</option>
        </select>
      </div>

      <div class="he-filters__group">
        <label for="filter-period" class="he-label">Période du graphique</label>
        <select id="filter-period" class="he-select">
          <option value="7">7 derniers jours</option>
          <option value="30" selected>30 derniers jours</option>
          <option value="90">90 derniers jours</option>
        </select>
      </div>

      <button id="btn-reset-filters" class="he-btn he-btn--ghost">Réinitialiser</button>
    </aside>

    <!-- Carte -->
    <div class="he-map-container">
      <div id="map" aria-label="Carte des stations hydrométriques" role="region" tabindex="0"></div>
      <div id="map-status" class="he-map-status" aria-live="polite" aria-atomic="true"></div>
    </div>

    <!-- Panneau graphique (masqué par défaut) -->
    <aside id="panel-chart" class="he-chart-panel" aria-label="Graphique de la station sélectionnée" hidden>
      <header class="he-chart-panel__header">
        <h2 id="chart-title" class="he-chart-panel__title">Station</h2>
        <button id="btn-close-chart" class="he-btn-icon" aria-label="Fermer le panneau graphique">&#x2715;</button>
      </header>
      <div id="chart" class="he-chart" role="img" aria-label="Graphique de hauteur d'eau"></div>
      <p id="chart-meta" class="he-chart-panel__meta"></p>
    </aside>
  </main>

  <!-- Leaflet JS -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <!-- Plotly (bundle basic allégé) -->
  <script src="https://cdn.plot.ly/plotly-basic-2.32.0.min.js"></script>
  <!-- Application -->
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Étape 2 : Créer `src/css/main.css`**

```css
/* ===== Variables ===== */
:root {
  --color-primary: #0d6efd;
  --color-bg: #f8f9fa;
  --color-surface: #ffffff;
  --color-border: #dee2e6;
  --color-text: #212529;
  --color-text-muted: #6c757d;

  --header-height: 56px;
  --filters-width: 280px;
  --chart-panel-width: 380px;
  --spacing: 1rem;
  --radius: 6px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* ===== Reset ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 1rem;
  color: var(--color-text);
  background: var(--color-bg);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== Header ===== */
.he-header {
  height: var(--header-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing);
  gap: var(--spacing);
  flex-shrink: 0;
  box-shadow: var(--shadow);
  z-index: 1000;
}

.he-header__brand { display: flex; align-items: baseline; gap: 0.5rem; }
.he-header__title { font-size: 1.25rem; font-weight: 700; color: var(--color-primary); }
.he-header__subtitle { font-size: 0.8rem; color: var(--color-text-muted); }
.he-header__actions { display: flex; gap: 0.5rem; }

/* ===== Main layout ===== */
.he-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.he-map-container {
  flex: 1;
  position: relative;
}

#map {
  width: 100%;
  height: 100%;
}

/* ===== Boutons ===== */
.he-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}

.he-btn:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.he-btn--secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.he-btn--secondary:hover { background: var(--color-bg); }

.he-btn--ghost {
  background: transparent;
  color: var(--color-text-muted);
  border-color: var(--color-border);
  width: 100%;
  justify-content: center;
  margin-top: var(--spacing);
}

.he-btn--ghost:hover { background: var(--color-bg); }

.he-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text-muted);
}

.he-btn-icon:hover { background: var(--color-bg); }
.he-btn-icon:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px; }

/* ===== Panneaux latéraux ===== */
.he-filters,
.he-chart-panel {
  position: absolute;
  top: 0;
  height: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  overflow-y: auto;
  z-index: 500;
  padding: var(--spacing);
  display: flex;
  flex-direction: column;
  gap: var(--spacing);
}

.he-filters[hidden],
.he-chart-panel[hidden] { display: none; }

.he-filters { left: 0; width: var(--filters-width); }
.he-chart-panel { right: 0; width: var(--chart-panel-width); }

/* ===== Form elements ===== */
.he-filters__title,
.he-chart-panel__title {
  font-size: 1rem;
  font-weight: 600;
}

.he-filters__group { display: flex; flex-direction: column; gap: 0.3rem; }

.he-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.he-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.he-select:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px; }

/* ===== Panneau graphique ===== */
.he-chart-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.he-chart { min-height: 250px; }
.he-chart-panel__meta { font-size: 0.8rem; color: var(--color-text-muted); }

/* ===== Statut carte ===== */
.he-map-status {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 400;
}

.he-map-status--visible { opacity: 1; }

/* ===== Responsive ===== */
@media (max-width: 640px) {
  .he-header__subtitle { display: none; }
  .he-filters { width: 100%; }
  .he-chart-panel { width: 100%; left: 0; }
  .he-btn { min-height: 44px; }
}

/* ===== RGAA : focus visible universel ===== */
:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px; }
```

- [ ] **Étape 3 : Créer `src/css/components.css`**

```css
/* ===== Marqueurs de station ===== */
.station-marker {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  cursor: pointer;
  transition: transform 0.15s;
}

.station-marker--selected {
  transform: scale(1.4);
  border-width: 3px;
}

/* ===== Popups Leaflet ===== */
.station-popup h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.3;
}

.station-popup dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem 0.5rem;
  font-size: 0.8rem;
}

.station-popup dt { color: #6c757d; font-weight: 500; }
.station-popup dd { color: #212529; }

.station-popup .popup-status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.5rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.popup-status--normal    { background: #d4edda; color: #155724; }
.popup-status--vigilance { background: #fff3cd; color: #856404; }
.popup-status--alerte    { background: #f8d7da; color: #721c24; }
.popup-status--inactive  { background: #e2e3e5; color: #383d41; }

/* ===== Légende ===== */
.he-legend {
  background: white;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  font-size: 0.8rem;
  line-height: 1.8;
}

.he-legend__item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.he-legend__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}
```

- [ ] **Étape 4 : Vérifier dans le navigateur**

Lancer un serveur local :
```bash
python3 -m http.server 8080 --directory src
```
Ouvrir `http://localhost:8080`.

Attendu : header avec titre et boutons, carte vide (fond sombre — tuiles IGN pas encore chargées), aucune erreur console.

- [ ] **Étape 5 : Commit**

```bash
git add src/index.html src/css/main.css src/css/components.css
git commit -m "feat: structure HTML/CSS de base avec layout responsive"
```

---

## Tâche 2 — utils.js — Utilitaires partagés

**Fichiers :**
- Créer : `src/js/utils.js`

Toute donnée provenant d'une API externe doit passer par `escapeHtml` avant d'être injectée dans le DOM via `innerHTML`. Ce module centralise cette responsabilité.

- [ ] **Étape 1 : Créer `src/js/utils.js`**

```javascript
/**
 * Échappe les caractères HTML spéciaux d'une chaîne.
 * À utiliser sur toute donnée externe avant injection dans innerHTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formate une date ISO en date française lisible.
 * @param {string} isoString - ex: "2026-05-08T14:30:00Z"
 * @returns {string} - ex: "08/05/2026 14:30"
 */
export function formatDateFr(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/utils.js
git commit -m "feat: utilitaires escapeHtml et formatDateFr"
```

---

## Tâche 3 — config.js — Constantes

**Fichiers :**
- Créer : `src/js/config.js`

- [ ] **Étape 1 : Créer `src/js/config.js`**

```javascript
// URLs API Hub'eau
export const API_HYDRO_BASE = 'https://hubeau.eaufrance.fr/api/v2/hydrometrie';

// Tuiles IGN Géoplateforme (accès libre depuis juin 2022, sans clé API)
export const IGN_TILES_URL =
  'https://data.geopf.fr/wmts?' +
  'SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' +
  '&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM' +
  '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';

export const IGN_ATTRIBUTION = '&copy; <a href="https://www.ign.fr">IGN</a> G&eacute;oplateforme';

// Centre France et zoom initial
export const MAP_CENTER = [46.5, 1.7];
export const MAP_ZOOM_INIT = 6;

// Couleurs des marqueurs selon l'état de la station
export const STATUS_COLORS = {
  normal: '#27ae60',
  vigilance: '#f39c12',
  alerte: '#e74c3c',
  inactive: '#95a5a6',
};

// Labels lisibles pour les états
export const STATUS_LABELS = {
  normal: 'Normal',
  vigilance: 'Vigilance',
  alerte: 'Alerte',
  inactive: 'Inactif',
};

// Champs demandés à l'API stations (réduit la taille de réponse)
export const STATIONS_FIELDS = [
  'code_station',
  'libelle_station',
  'longitude_station',
  'latitude_station',
  'libelle_departement',
  'code_departement',
  'libelle_cours_eau',
  'libelle_type_station',
  'en_service',
].join(',');

// Nombre de jours d'observations par défaut
export const DEFAULT_PERIOD_DAYS = 30;
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/config.js
git commit -m "feat: constantes de configuration (API, carte, couleurs)"
```

---

## Tâche 4 — api.js — Client Hub'eau

**Fichiers :**
- Créer : `src/js/api.js`

- [ ] **Étape 1 : Créer `src/js/api.js`**

```javascript
import { API_HYDRO_BASE, STATIONS_FIELDS } from './config.js';

/**
 * Récupère toutes les stations hydrométriques actives de France.
 * @returns {Promise<Array>} Tableau de stations Hub'eau
 */
export async function fetchStations() {
  const url = new URL(`${API_HYDRO_BASE}/referentiel/stations`);
  url.searchParams.set('en_service', 'true');
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', '5000');
  url.searchParams.set('fields', STATIONS_FIELDS);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau stations : ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  // Garder uniquement les stations avec coordonnées valides
  return json.data.filter(
    s => s.longitude_station !== null && s.latitude_station !== null
  );
}

/**
 * Récupère les observations de hauteur d'eau pour une station sur N jours.
 * @param {string} codeStation - Code Hub'eau de la station (10 car.)
 * @param {number} days - Nombre de jours à récupérer (défaut : 30)
 * @returns {Promise<Array>} Observations triées du plus récent au plus ancien
 */
export async function fetchObservations(codeStation, days = 30) {
  const url = new URL(`${API_HYDRO_BASE}/obs_tr`);
  url.searchParams.set('code_entite', codeStation);
  url.searchParams.set('grandeur_hydro', 'H');
  url.searchParams.set('size', String(days * 24 * 2)); // max 2 obs/h
  url.searchParams.set('sort', 'desc');

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - days);
  // Format ISO sans millisecondes (attendu par l'API)
  url.searchParams.set('date_debut_obs', dateDebut.toISOString().slice(0, 19));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau observations : ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  return json.data;
}

/**
 * Détermine l'état d'une station à partir de ses dernières observations.
 * Logique simplifiée (pour démo) :
 *  - inactive  : aucune observation
 *  - vigilance : dernière observation entre 2h et 24h
 *  - normal    : dernière observation < 2h
 *
 * @param {Array} observations - Résultat de fetchObservations (trié desc)
 * @returns {'normal'|'vigilance'|'inactive'}
 */
export function computeStationStatus(observations) {
  if (!observations || observations.length === 0) return 'inactive';
  const ageMs = Date.now() - new Date(observations[0].date_obs).getTime();
  const ageHours = ageMs / 3_600_000;
  if (ageHours > 24) return 'inactive';
  if (ageHours > 2) return 'vigilance';
  return 'normal';
}
```

- [ ] **Étape 2 : Tester dans la console navigateur**

Ouvrir `http://localhost:8080`, puis dans la console DevTools :
```javascript
import('/js/api.js').then(m => m.fetchStations()).then(d => console.log(d.length, d[0]));
```
Attendu : un nombre > 3 000, et un objet avec `code_station`, `latitude_station`, `longitude_station`.

- [ ] **Étape 3 : Commit**

```bash
git add src/js/api.js
git commit -m "feat: client Hub'eau (stations, observations, calcul statut)"
```

---

## Tâche 5 — map.js — Carte Leaflet avec tuiles IGN et marqueurs

**Fichiers :**
- Créer : `src/js/map.js`

**Note sécurité :** Ce module injecte des données d'API dans des éléments DOM.
Toutes les valeurs variables passent par `escapeHtml()` de `utils.js`. Les valeurs fixes (couleurs, classes CSS provenant de `config.js`) peuvent être utilisées directement.

- [ ] **Étape 1 : Créer `src/js/map.js`**

```javascript
import {
  IGN_TILES_URL,
  IGN_ATTRIBUTION,
  MAP_CENTER,
  MAP_ZOOM_INIT,
  STATUS_COLORS,
  STATUS_LABELS,
} from './config.js';
import { escapeHtml } from './utils.js';

let map;
let clusterGroup;
// code_station → { marker, station, status }
const stationIndex = new Map();
let onClickCallback;

/**
 * Initialise la carte Leaflet dans l'élément DOM `containerId`.
 * @param {string} containerId - ID de l'élément carte
 * @param {Function} onStationClick - callback(station) appelé au clic sur un marqueur
 */
export function initMap(containerId, onStationClick) {
  onClickCallback = onStationClick;

  map = L.map(containerId, {
    center: MAP_CENTER,
    zoom: MAP_ZOOM_INIT,
    zoomControl: true,
  });

  L.tileLayer(IGN_TILES_URL, {
    attribution: IGN_ATTRIBUTION,
    minZoom: 3,
    maxZoom: 18,
  }).addTo(map);

  clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50,
    showCoverageOnHover: false,
  });
  map.addLayer(clusterGroup);

  addLegend();
}

/**
 * Ajoute la légende des couleurs d'état en bas à gauche.
 * Utilise uniquement des constantes de config.js, pas de données utilisateur.
 */
function addLegend() {
  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = () => {
    const container = L.DomUtil.create('div', 'he-legend');
    container.setAttribute('aria-label', 'Légende des états de station');

    Object.entries(STATUS_LABELS).forEach(([key, label]) => {
      const item = L.DomUtil.create('div', 'he-legend__item', container);
      const dot = L.DomUtil.create('span', 'he-legend__dot', item);
      dot.style.background = STATUS_COLORS[key];
      const text = document.createTextNode(label);
      item.appendChild(text);
    });

    return container;
  };
  legend.addTo(map);
}

/**
 * Crée une icône DivIcon Leaflet colorée selon l'état.
 * @param {'normal'|'vigilance'|'alerte'|'inactive'} status
 * @param {boolean} selected
 */
function makeIcon(status, selected = false) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.inactive;
  // color provient de STATUS_COLORS (constantes), safe pour style CSS
  const cls = selected ? 'station-marker station-marker--selected' : 'station-marker';
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="background:${color}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

/**
 * Construit le nœud DOM du popup pour une station.
 * Toutes les valeurs issues de l'API passent par escapeHtml().
 * @param {Object} station
 * @param {'normal'|'vigilance'|'alerte'|'inactive'} status
 * @returns {HTMLElement}
 */
function buildPopupNode(station, status) {
  const wrapper = document.createElement('div');
  wrapper.className = 'station-popup';

  const h3 = document.createElement('h3');
  h3.textContent = station.libelle_station || station.code_station;
  wrapper.appendChild(h3);

  const dl = document.createElement('dl');
  const fields = [
    ['Code', station.code_station],
    ["Cours d'eau", station.libelle_cours_eau],
    ['Département', station.libelle_departement],
    ['Type', station.libelle_type_station],
  ];
  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value || '—';
    dl.appendChild(dt);
    dl.appendChild(dd);
  });
  wrapper.appendChild(dl);

  const badge = document.createElement('span');
  badge.className = `popup-status popup-status--${status}`;
  badge.textContent = STATUS_LABELS[status] || 'Inconnu';
  wrapper.appendChild(badge);

  return wrapper;
}

/**
 * Place les stations sur la carte. Remplace tous les marqueurs existants.
 * @param {Array} stations - Tableau de stations Hub'eau
 */
export function renderStations(stations) {
  clusterGroup.clearLayers();
  stationIndex.clear();

  stations.forEach(station => {
    const status = 'inactive'; // statut affiné après chargement des observations
    const marker = L.marker(
      [station.latitude_station, station.longitude_station],
      {
        icon: makeIcon(status),
        title: station.libelle_station || station.code_station,
        alt: `Station ${station.libelle_station || station.code_station}`,
      }
    );

    marker.bindPopup(buildPopupNode(station, status), { maxWidth: 280 });
    marker.on('click', () => {
      highlightMarker(station.code_station);
      onClickCallback(station);
    });

    stationIndex.set(station.code_station, { marker, station, status });
    clusterGroup.addLayer(marker);
  });
}

/**
 * Met à jour la couleur d'un marqueur et le contenu de son popup.
 * @param {string} codeStation
 * @param {'normal'|'vigilance'|'alerte'|'inactive'} status
 */
export function updateMarkerStatus(codeStation, status) {
  const entry = stationIndex.get(codeStation);
  if (!entry) return;
  entry.status = status;
  entry.marker.setIcon(makeIcon(status, false));
  entry.marker.setPopupContent(buildPopupNode(entry.station, status));
}

/**
 * Agrandit visuellement le marqueur sélectionné, réinitialise les autres.
 * @param {string} codeStation
 */
function highlightMarker(codeStation) {
  stationIndex.forEach((entry, code) => {
    entry.marker.setIcon(makeIcon(entry.status, code === codeStation));
  });
}

/**
 * Masque les marqueurs qui ne passent pas le prédicat.
 * @param {Function} predicate - (codeStation: string) => boolean
 */
export function applyMarkerFilter(predicate) {
  clusterGroup.clearLayers();
  stationIndex.forEach((entry, code) => {
    if (predicate(code)) clusterGroup.addLayer(entry.marker);
  });
}

/**
 * Retourne le tableau de toutes les stations actuellement indexées.
 */
export function getAllStations() {
  return Array.from(stationIndex.values()).map(e => e.station);
}
```

- [ ] **Étape 2 : Vérifier dans le navigateur**

Recharger `http://localhost:8080`. La carte doit afficher les tuiles IGN Plan V2 (fond cartographique français). La légende apparaît en bas à gauche.

- [ ] **Étape 3 : Commit**

```bash
git add src/js/map.js
git commit -m "feat: carte Leaflet avec tuiles IGN, marqueurs et légende (XSS-safe)"
```

---

## Tâche 6 — chart.js — Graphique Plotly

**Fichiers :**
- Créer : `src/js/chart.js`

- [ ] **Étape 1 : Créer `src/js/chart.js`**

```javascript
/**
 * Affiche ou met à jour le graphique Plotly dans `containerId`.
 * Plotly gère lui-même l'échappement de ses valeurs de données.
 *
 * @param {string} containerId    - ID de l'élément DOM hôte
 * @param {Array}  observations   - Tableau d'observations Hub'eau (trié desc)
 * @param {string} coursEauLabel  - Nom du cours d'eau pour le sous-titre
 */
export function renderChart(containerId, observations, coursEauLabel) {
  const el = document.getElementById(containerId);

  if (!observations || observations.length === 0) {
    Plotly.purge(containerId);
    el.textContent = 'Aucune donnée disponible pour cette station.';
    return;
  }

  // Les observations arrivent du plus récent au plus ancien → inverser pour l'axe X
  const sorted = [...observations].reverse();
  const dates = sorted.map(o => o.date_obs);
  const values = sorted.map(o => o.resultat_obs);

  const trace = {
    x: dates,
    y: values,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Hauteur (mm)',
    line: { color: '#0d6efd', width: 2 },
    marker: { size: 4, color: '#0d6efd' },
    hovertemplate: '%{x|%d/%m/%Y %H:%M}<br><b>%{y:.1f} mm</b><extra></extra>',
  };

  const layout = {
    annotations: coursEauLabel
      ? [{ text: coursEauLabel, showarrow: false, xref: 'paper', yref: 'paper', x: 0, y: 1.08, font: { size: 11, color: '#6c757d' } }]
      : [],
    xaxis: {
      type: 'date',
      tickformat: '%d/%m',
      showgrid: true,
      gridcolor: '#dee2e6',
    },
    yaxis: {
      title: { text: 'Hauteur (mm)', font: { size: 11 } },
      showgrid: true,
      gridcolor: '#dee2e6',
    },
    margin: { t: 36, r: 16, b: 48, l: 60 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'system-ui, sans-serif', size: 11 },
    showlegend: false,
    hovermode: 'closest',
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'select2d', 'lasso2d'],
    locale: 'fr',
    displaylogo: false,
  };

  Plotly.react(containerId, [trace], layout, config);
}

/**
 * Vide le graphique et libère la mémoire Plotly.
 * @param {string} containerId
 */
export function clearChart(containerId) {
  Plotly.purge(containerId);
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/chart.js
git commit -m "feat: graphique Plotly série temporelle hauteur d'eau"
```

---

## Tâche 7 — filters.js — Panneau de filtres

**Fichiers :**
- Créer : `src/js/filters.js`

- [ ] **Étape 1 : Créer `src/js/filters.js`**

```javascript
/**
 * Initialise le panneau de filtres à partir du tableau de stations.
 * @param {Array}    stations       - Toutes les stations chargées
 * @param {Function} onFilterChange - callback() déclenché à chaque changement
 */
export function initFilters(stations, onFilterChange) {
  populateDepartmentSelect(stations);
  populateTypeSelect(stations);

  ['filter-department', 'filter-type', 'filter-period'].forEach(id => {
    document.getElementById(id).addEventListener('change', onFilterChange);
  });

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    resetFilters();
    onFilterChange();
  });
}

/**
 * Remplit la liste déroulante des départements.
 * Utilise textContent (pas innerHTML) pour les options.
 * @param {Array} stations
 */
function populateDepartmentSelect(stations) {
  const select = document.getElementById('filter-department');
  const departments = new Map(); // code → libelle

  stations.forEach(s => {
    if (s.code_departement && s.libelle_departement && !departments.has(s.code_departement)) {
      departments.set(s.code_departement, s.libelle_departement);
    }
  });

  Array.from(departments.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([code, label]) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${code} — ${label}`;
      select.appendChild(opt);
    });
}

/**
 * Remplit la liste déroulante des types de station.
 * @param {Array} stations
 */
function populateTypeSelect(stations) {
  const select = document.getElementById('filter-type');
  const types = new Set(stations.map(s => s.libelle_type_station).filter(Boolean));

  Array.from(types)
    .sort()
    .forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      select.appendChild(opt);
    });
}

/**
 * Retourne la valeur courante des filtres.
 * @returns {{ department: string, type: string, periodDays: number }}
 */
export function getFilterValues() {
  return {
    department: document.getElementById('filter-department').value,
    type: document.getElementById('filter-type').value,
    periodDays: parseInt(document.getElementById('filter-period').value, 10),
  };
}

/**
 * Retourne un prédicat de filtrage basé sur les valeurs UI courantes.
 * @param {Map<string, Object>} stationMap - code_station → station
 * @returns {Function} (codeStation: string) => boolean
 */
export function buildFilterPredicate(stationMap) {
  const { department, type } = getFilterValues();

  return (codeStation) => {
    const station = stationMap.get(codeStation);
    if (!station) return false;
    if (department && station.code_departement !== department) return false;
    if (type && station.libelle_type_station !== type) return false;
    return true;
  };
}

/**
 * Réinitialise tous les filtres à leur valeur par défaut.
 */
function resetFilters() {
  document.getElementById('filter-department').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-period').value = '30';
}

/**
 * Bascule la visibilité du panneau de filtres.
 */
export function toggleFiltersPanel() {
  const panel = document.getElementById('panel-filters');
  const btn = document.getElementById('btn-filters');
  const isHidden = panel.hidden;
  panel.hidden = !isHidden;
  btn.setAttribute('aria-expanded', String(isHidden));
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/filters.js
git commit -m "feat: panneau de filtres (département, type, période)"
```

---

## Tâche 8 — export.js — Export CSV

**Fichiers :**
- Créer : `src/js/export.js`

- [ ] **Étape 1 : Créer `src/js/export.js`**

```javascript
/**
 * Génère et déclenche le téléchargement d'un fichier CSV des stations visibles.
 * @param {Array}                stations          - Stations actuellement affichées
 * @param {Map<string, Array>}   observationsCache - code_station → observations
 */
export function exportCSV(stations, observationsCache) {
  const rows = [[
    'Code station', 'Nom', "Cours d'eau",
    'Département', 'Type',
    'Dernière observation', 'Hauteur (mm)', 'Statut',
  ]];

  stations.forEach(station => {
    const obs = observationsCache.get(station.code_station) || [];
    const latest = obs[0];
    rows.push([
      station.code_station || '',
      station.libelle_station || '',
      station.libelle_cours_eau || '',
      station.libelle_departement || '',
      station.libelle_type_station || '',
      latest ? latest.date_obs : '',
      latest != null ? String(latest.resultat_obs) : '',
      resolveStatusLabel(obs),
    ]);
  });

  const csv = rows.map(row => row.map(escapeCsvCell).join(';')).join('\r\n');
  triggerDownload(csv, `hydro-explorer-${todayISO()}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Échappe une cellule CSV (RFC 4180).
 * @param {string} value
 */
function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Déclenche le téléchargement d'un contenu texte.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
function triggerDownload(content, filename, mimeType) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM UTF-8 pour Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Retourne un label d'état lisible à partir d'un tableau d'observations.
 * @param {Array} observations
 * @returns {string}
 */
function resolveStatusLabel(observations) {
  if (!observations || observations.length === 0) return 'Inactif';
  const ageH = (Date.now() - new Date(observations[0].date_obs).getTime()) / 3_600_000;
  if (ageH > 24) return 'Inactif';
  if (ageH > 2) return 'Vigilance';
  return 'Normal';
}

/**
 * Retourne la date du jour au format YYYY-MM-DD.
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
```

- [ ] **Étape 2 : Commit**

```bash
git add src/js/export.js
git commit -m "feat: export CSV des stations affichées (RFC 4180, BOM UTF-8)"
```

---

## Tâche 9 — app.js — Orchestration complète

**Fichiers :**
- Créer : `src/js/app.js`

- [ ] **Étape 1 : Créer `src/js/app.js`**

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

// ===== État global =====
const state = {
  allStations: [],
  stationMap: new Map(),          // code_station → station
  observationsCache: new Map(),   // code_station → Array<observation>
  selectedStation: null,
};

// ===== Initialisation =====
document.addEventListener('DOMContentLoaded', async () => {
  initMap('map', onStationClick);
  bindUIEvents();
  await loadStations();
});

// ===== Chargement des stations =====
async function loadStations() {
  showStatus('Chargement des stations…');
  try {
    state.allStations = await fetchStations();
    state.allStations.forEach(s => state.stationMap.set(s.code_station, s));

    renderStations(state.allStations);
    initFilters(state.allStations, onFilterChange);

    showStatus(`${state.allStations.length} stations chargées`, 4000);
  } catch (err) {
    showStatus(`Erreur de chargement : ${err.message}`, 10000);
    console.error('[Hydro Explorer]', err);
  }
}

// ===== Clic sur une station =====
async function onStationClick(station) {
  state.selectedStation = station;
  openChartPanel(station);

  // Si observations déjà en cache, afficher directement
  const cached = state.observationsCache.get(station.code_station);
  if (cached) {
    displayChart(station, cached);
    return;
  }

  const { periodDays } = getFilterValues();
  updateChartMeta('Chargement des données…');

  try {
    const observations = await fetchObservations(station.code_station, periodDays);
    state.observationsCache.set(station.code_station, observations);

    const status = computeStationStatus(observations);
    updateMarkerStatus(station.code_station, status);
    displayChart(station, observations);
  } catch (err) {
    updateChartMeta(`Erreur : ${err.message}`);
    console.error('[Hydro Explorer]', err);
  }
}

// ===== Affichage du graphique =====
function displayChart(station, observations) {
  document.getElementById('chart-title').textContent =
    station.libelle_station || station.code_station;
  renderChart('chart', observations, station.libelle_cours_eau || '');
  updateChartMeta(
    observations.length > 0
      ? `${observations.length} mesures — ${station.libelle_departement || ''}`
      : 'Aucune mesure disponible pour cette période.'
  );
}

function openChartPanel(station) {
  const panel = document.getElementById('panel-chart');
  panel.hidden = false;
  document.getElementById('chart-title').textContent =
    station.libelle_station || station.code_station;
  updateChartMeta('');
}

function closeChartPanel() {
  document.getElementById('panel-chart').hidden = true;
  clearChart('chart');
  state.selectedStation = null;
}

function updateChartMeta(text) {
  document.getElementById('chart-meta').textContent = text;
}

// ===== Filtres =====
function onFilterChange() {
  const predicate = buildFilterPredicate(state.stationMap);
  applyMarkerFilter(predicate);
}

// ===== Bindings UI =====
function bindUIEvents() {
  document.getElementById('btn-filters').addEventListener('click', toggleFiltersPanel);
  document.getElementById('btn-close-chart').addEventListener('click', closeChartPanel);
  document.getElementById('btn-export').addEventListener('click', () => {
    const predicate = buildFilterPredicate(state.stationMap);
    const visible = getAllStations().filter(s => predicate(s.code_station));
    exportCSV(visible, state.observationsCache);
  });
}

// ===== Statut visuel sur la carte =====
let statusTimer;
function showStatus(message, durationMs = 0) {
  const el = document.getElementById('map-status');
  el.textContent = message;
  el.classList.add('he-map-status--visible');
  clearTimeout(statusTimer);
  if (durationMs > 0) {
    statusTimer = setTimeout(
      () => el.classList.remove('he-map-status--visible'),
      durationMs
    );
  }
}
```

- [ ] **Étape 2 : Test fonctionnel complet**

Lancer le serveur local :
```bash
python3 -m http.server 8080 --directory src
```
Ouvrir `http://localhost:8080`.

Vérifier chaque point :
- [ ] Message "Chargement des stations…" apparaît puis disparaît
- [ ] Le nombre de stations chargées s'affiche brièvement (ex: "4521 stations chargées")
- [ ] La carte affiche des clusters de marqueurs sur toute la France
- [ ] Cliquer sur un cluster → dézoom ou séparation des marqueurs
- [ ] Cliquer sur un marqueur individuel → panneau graphique s'ouvre à droite
- [ ] Le titre du panneau affiche le nom de la station
- [ ] Le message "Chargement des données…" s'affiche, puis le graphique apparaît
- [ ] La courbe de hauteur d'eau s'affiche avec l'axe X en dates françaises (jj/mm)
- [ ] Bouton "Filtres" → panneau s'ouvre à gauche
- [ ] Choisir le département "17" → seules les stations de Charente-Maritime restent visibles
- [ ] Cliquer "Réinitialiser" → toutes les stations réapparaissent
- [ ] Bouton "Exporter CSV" → fichier `.csv` téléchargé
- [ ] Ouvrir le CSV → colonnes correctes, valeurs cohérentes, encodage UTF-8 avec BOM
- [ ] Aucune erreur dans la console DevTools (onglet Console)

- [ ] **Étape 3 : Commit**

```bash
git add src/js/app.js
git commit -m "feat: orchestration complète, état global, interactions map/chart/filtres"
```

---

## Tâche 10 — Accessibilité RGAA et vérifications finales

**Fichiers :**
- Modifier si nécessaire : `src/index.html`, `src/css/main.css`

- [ ] **Étape 1 : Audit automatique axe DevTools**

Installer l'extension [axe DevTools](https://www.deque.com/axe/) dans Chrome/Firefox.

Ouvrir `http://localhost:8080` et lancer l'audit.

Points à corriger si signalés :
- Contraste insuffisant → ajuster les variables CSS `--color-text` ou `--color-text-muted`
- Éléments interactifs sans label accessible → ajouter `aria-label`
- Images sans attribut `alt` → vérifier les marqueurs Leaflet

- [ ] **Étape 2 : Navigation clavier**

Tester Tab → Shift+Tab → Entrée → Espace :
- [ ] Bouton "Filtres" atteignable et activable au clavier
- [ ] Sélecteurs de filtre accessibles
- [ ] Bouton "Réinitialiser" atteignable
- [ ] Bouton "Exporter CSV" atteignable
- [ ] Bouton "Fermer" (panneau graphique) atteignable
- [ ] Le focus ne se perd jamais dans un élément non atteignable

- [ ] **Étape 3 : Vérification mobile (375px)**

Dans Chrome DevTools → Toggle device toolbar → iPhone SE.
- [ ] La carte occupe toute la hauteur disponible
- [ ] Le panneau filtres s'affiche en pleine largeur
- [ ] Le panneau graphique s'affiche en pleine largeur
- [ ] Les boutons respectent la cible tactile minimale (44×44px)

- [ ] **Étape 4 : Lighthouse**

Dans Chrome DevTools → Lighthouse → Performance, Accessibility, Best Practices.

Cibles minimales :
- Performance : > 70 (le chargement de ~5000 stations est lourd)
- Accessibility : > 90
- Best Practices : > 90

- [ ] **Étape 5 : Commit final**

```bash
git add src/
git commit -m "fix: corrections accessibilité RGAA et responsive mobile"
```

---

## Auto-vérification du plan

### Couverture des spécifications (claude.md §4 Phase 1)

| Spécification | Tâche couvrant |
|---|---|
| Carte Leaflet centrée sur bassin / France entière | T5 (MAP_CENTER, MAP_ZOOM_INIT) |
| Markers stations avec popup (nom, code, mesure) | T5 (buildPopupNode) |
| Couleur des markers selon état | T3 (STATUS_COLORS) + T4 (computeStationStatus) + T5 (makeIcon) |
| Graphique temporel sur clic station (30 jours) | T6 + T9 (onStationClick) |
| Filtres : type de station, département, période | T7 (initFilters, buildFilterPredicate) |
| Export CSV | T8 (exportCSV) |
| Design responsive mobile-first | T1 (CSS media queries) |
| Conformité RGAA niveau AA | T1 (focus-visible, aria-*) + T10 (audit) |
| Tuiles IGN | T3 (IGN_TILES_URL) + T5 (L.tileLayer) |
| France entière | T4 (size=5000) |
| Français uniquement | T1 (lang="fr") + T6 (locale: 'fr') |
| Protection XSS | T2 (escapeHtml) + T5 (buildPopupNode via DOM API) + T7 (textContent) |

### Cohérence des noms entre modules

| Symbole | Défini en | Utilisé en |
|---|---|---|
| `escapeHtml` | T2 utils.js | T5 map.js |
| `fetchStations` | T4 api.js | T9 app.js |
| `fetchObservations` | T4 api.js | T9 app.js |
| `computeStationStatus` | T4 api.js | T9 app.js |
| `initMap` | T5 map.js | T9 app.js |
| `renderStations` | T5 map.js | T9 app.js |
| `updateMarkerStatus` | T5 map.js | T9 app.js |
| `applyMarkerFilter` | T5 map.js | T9 app.js |
| `getAllStations` | T5 map.js | T9 app.js |
| `renderChart` | T6 chart.js | T9 app.js |
| `clearChart` | T6 chart.js | T9 app.js |
| `initFilters` | T7 filters.js | T9 app.js |
| `getFilterValues` | T7 filters.js | T9 app.js |
| `buildFilterPredicate` | T7 filters.js | T9 app.js |
| `toggleFiltersPanel` | T7 filters.js | T9 app.js |
| `exportCSV` | T8 export.js | T9 app.js |
