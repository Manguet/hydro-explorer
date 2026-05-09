# Hydro Explorer — Données Enrichies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir les données affichées : ajouter le débit (Q) en option au graphique, afficher des statistiques (min/max/moyenne) sous le graphique, et superposer les stations piézométriques (nappes souterraines) depuis Hub'eau.

**Architecture:** Vanilla JS ES modules. Le débit Q utilise le même endpoint Hub'eau `observations_tr` avec `grandeur_hydro=Q`. Les stats sont calculées côté client sur les observations déjà chargées. La piézométrie utilise l'API Hub'eau v1 `niveaux_nappes_eau_souterraine` avec un layer Leaflet dédié. Chaque tâche est indépendante.

**Tech Stack:** Vanilla JS (ES modules), Leaflet 1.9.4, Plotly Basic 2.32, Hub'eau API v2 (observations_tr), Hub'eau API v1 (niveaux_nappes_eau_souterraine).

---

## Structure des fichiers

**À créer :**
- `src/js/piezometry.js` — fetch et affichage des stations piézométriques

**À modifier :**
- `src/js/api.js` — ajouter `fetchObservationsQ()` et `fetchPiezometry()`
- `src/js/chart.js` — accepter deux traces (H + Q optionnel), ajouter barre de stats
- `src/js/app.js` — câblage débit Q, stats, piézométrie
- `src/index.html` — toggle H/Q, barre de stats, toggle piézométrie
- `src/css/main.css` — styles stats + toggle

---

## Task 1 : Débit (Q) dans le graphique

**Files:**
- Modify: `src/js/api.js`
- Modify: `src/js/chart.js`
- Modify: `src/index.html`
- Modify: `src/js/app.js`

### Contexte
L'API Hub'eau `observations_tr` supporte `grandeur_hydro=Q` pour les débits. Toutes les stations ne mesurent pas Q (certaines ne font que H). L'interface ajoute un toggle radio H/Q dans le panneau graphique. Si la station n'a pas de données Q, un message "Pas de données de débit pour cette station" est affiché.

- [ ] **Step 1 : Ajouter `fetchObservationsDebit` dans `api.js`**

Dans `src/js/api.js`, après `fetchObservations`, ajouter :

```javascript
/**
 * Récupère les observations de débit (Q) pour une station sur N jours.
 * Identique à fetchObservations mais avec grandeur_hydro=Q.
 * @param {string} codeStation
 * @param {number} days
 * @returns {Promise<Array>}
 */
export async function fetchObservationsDebit(codeStation, days = 30) {
  const url = new URL(`${API_HYDRO_BASE}/observations_tr`);
  url.searchParams.set('code_entite', codeStation);
  url.searchParams.set('grandeur_hydro', 'Q');
  url.searchParams.set('size', String(days * 24 * 2));
  url.searchParams.set('sort', 'desc');

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - days);
  url.searchParams.set('date_debut_obs', dateDebut.toISOString().slice(0, 19));

  const response = await fetch(url.toString());
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau débit : ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  return json.data;
}
```

- [ ] **Step 2 : Modifier `renderChart` dans `chart.js` pour accepter deux jeux de données**

Remplacer la signature et le corps de `renderChart` dans `src/js/chart.js` :

```javascript
/**
 * Affiche ou met à jour le graphique Plotly.
 * @param {string} containerId
 * @param {Array}  observations      - Observations hauteur H (trié desc)
 * @param {string} coursEauLabel     - Nom du cours d'eau
 * @param {Array}  [observationsQ]   - Observations débit Q (trié desc), optionnel
 */
export function renderChart(containerId, observations, coursEauLabel, observationsQ = null) {
  const el = document.getElementById(containerId);

  if (!observations || observations.length === 0) {
    Plotly.purge(containerId);
    el.textContent = 'Aucune donnée disponible pour cette station.';
    return;
  }

  const sorted = [...observations].reverse();
  const dates = sorted.map(o => o.date_obs);
  const values = sorted.map(o => o.resultat_obs);

  const traces = [{
    x: dates,
    y: values,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Hauteur (mm)',
    yaxis: 'y',
    line: { color: '#0d6efd', width: 2 },
    marker: { size: 4, color: '#0d6efd' },
    hovertemplate: '%{x|%d/%m/%Y %H:%M}<br><b>%{y:.1f} mm</b><extra></extra>',
  }];

  const layout = {
    annotations: coursEauLabel
      ? [{ text: coursEauLabel, showarrow: false, xref: 'paper', yref: 'paper', x: 0, y: 1.08, font: { size: 11, color: '#5a6270' } }]
      : [],
    xaxis: { type: 'date', tickformat: '%d/%m', showgrid: true, gridcolor: '#dee2e6' },
    yaxis: { title: { text: 'Hauteur (mm)', font: { size: 11 } }, showgrid: true, gridcolor: '#dee2e6' },
    margin: { t: 36, r: 16, b: 48, l: 60 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'system-ui, sans-serif', size: 11 },
    showlegend: false,
    hovermode: 'closest',
  };

  if (observationsQ && observationsQ.length > 0) {
    const sortedQ = [...observationsQ].reverse();
    traces.push({
      x: sortedQ.map(o => o.date_obs),
      y: sortedQ.map(o => o.resultat_obs),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Débit (m³/s)',
      yaxis: 'y2',
      line: { color: '#e67e22', width: 2, dash: 'dot' },
      marker: { size: 4, color: '#e67e22' },
      hovertemplate: '%{x|%d/%m/%Y %H:%M}<br><b>%{y:.2f} m³/s</b><extra></extra>',
    });
    layout.yaxis2 = {
      title: { text: 'Débit (m³/s)', font: { size: 11 } },
      overlaying: 'y',
      side: 'right',
      showgrid: false,
    };
    layout.showlegend = true;
    layout.margin.r = 70;
  }

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'select2d', 'lasso2d'],
    locale: 'fr',
    displaylogo: false,
  };

  Plotly.react(containerId, traces, layout, config);
}
```

- [ ] **Step 3 : Ajouter le toggle H/Q dans `index.html`**

Dans `src/index.html`, dans `<header class="he-chart-panel__header">`, après le `<h2 id="chart-title">`, ajouter :

```html
<div class="he-chart-toggle" role="group" aria-label="Grandeur affichée">
  <label class="he-chart-toggle__opt">
    <input type="radio" name="chart-grandeur" value="H" checked /> H
  </label>
  <label class="he-chart-toggle__opt">
    <input type="radio" name="chart-grandeur" value="Q" /> Q
  </label>
</div>
```

- [ ] **Step 4 : Gérer le toggle dans `app.js`**

En haut de `app.js`, ajouter l'import :

```javascript
import { fetchObservationsDebit } from './api.js';
```

Dans l'objet `state`, ajouter :

```javascript
debitCache: new Map(),   // code_station → Array<observation Q>
```

Dans `displayChart`, remplacer l'appel `renderChart` pour passer les débits si disponibles :

```javascript
function displayChart(station, observations) {
  document.getElementById('chart-title').textContent =
    station.libelle_station || station.code_station;
  const debit = state.debitCache.get(station.code_station) || null;
  renderChart('chart', observations, station.libelle_cours_eau || '', debit);
  updateChartMeta(
    observations.length > 0
      ? `${observations.length} mesures — ${station.libelle_departement || ''}`
      : 'Aucune mesure disponible pour cette période.'
  );
}
```

Dans `onStationClick`, après le bloc fetch réseau (après `displayChart(station, observations)`), ajouter la récupération du débit en parallèle :

```javascript
// Charger le débit Q en arrière-plan si pas déjà en cache
if (!state.debitCache.has(station.code_station)) {
  fetchObservationsDebit(station.code_station, periodDays)
    .then(debitObs => {
      state.debitCache.set(station.code_station, debitObs);
      // Rafraîchir uniquement si c'est toujours la même station sélectionnée
      if (state.selectedStation?.code_station === station.code_station) {
        displayChart(station, state.observationsCache.get(station.code_station) || []);
      }
    })
    .catch(() => {}); // Q silencieux — certaines stations n'ont que H
}
```

Dans `bindUIEvents`, ajouter l'écouteur du toggle :

```javascript
document.querySelectorAll('input[name="chart-grandeur"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (state.selectedStation) {
      const obs = state.observationsCache.get(state.selectedStation.code_station) || [];
      displayChart(state.selectedStation, obs);
    }
  });
});
```

Modifier `displayChart` pour respecter le toggle :

```javascript
function displayChart(station, observations) {
  document.getElementById('chart-title').textContent =
    station.libelle_station || station.code_station;
  const grandeur = document.querySelector('input[name="chart-grandeur"]:checked')?.value || 'H';
  const debit = grandeur === 'Q' ? (state.debitCache.get(station.code_station) || null) : null;
  renderChart('chart', observations, station.libelle_cours_eau || '', debit);
  updateChartMeta(
    observations.length > 0
      ? `${observations.length} mesures — ${station.libelle_departement || ''}`
      : 'Aucune mesure disponible pour cette période.'
  );
}
```

- [ ] **Step 5 : Styles pour le toggle dans `main.css`**

```css
/* ===== Toggle H/Q ===== */
.he-chart-toggle {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
  margin-right: 0.5rem;
}

.he-chart-toggle__opt {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: #495057;
}
```

- [ ] **Step 6 : Vérification visuelle**

1. Cliquer sur une station → le graphique H s'affiche, le toggle "H | Q" est visible.
2. Sélectionner "Q" → si la station a des données de débit, la courbe orange s'affiche en pointillé avec un axe Y droit.
3. Si la station n'a que H, le graphique reste H-only (silencieux).
4. Changer de station avec Q sélectionné → le débit de la nouvelle station se charge.

- [ ] **Step 7 : Commit**

```bash
git add src/js/api.js src/js/chart.js src/index.html src/js/app.js src/css/main.css
git commit -m "feat: débit Q dans le graphique — toggle H/Q avec axe double"
```

---

## Task 2 : Statistiques sur le graphique (min/max/moyenne)

**Files:**
- Modify: `src/js/chart.js`
- Modify: `src/index.html`
- Modify: `src/css/main.css`

### Contexte
Sous le graphique, afficher une ligne de statistiques calculées sur les observations actuellement visibles : valeur min, max, et moyenne. Ces stats sont calculées dans `chart.js` et injectées dans un élément DOM `#chart-stats`.

- [ ] **Step 1 : Ajouter `#chart-stats` dans `index.html`**

Dans `src/index.html`, dans `<aside id="panel-chart">`, après `<div id="chart">`, ajouter :

```html
<div id="chart-stats" class="he-chart-stats" aria-label="Statistiques" hidden></div>
```

- [ ] **Step 2 : Calculer et afficher les stats dans `chart.js`**

Dans `renderChart`, après `Plotly.react(...)`, ajouter :

```javascript
// Statistiques
const statsEl = document.getElementById('chart-stats');
if (statsEl) {
  const nums = values.filter(v => v != null && !isNaN(v));
  if (nums.length > 0) {
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    statsEl.hidden = false;
    // textContent uniquement — pas d'HTML utilisateur
    statsEl.textContent = '';
    const parts = [
      { label: 'Min', value: `${min.toFixed(1)} mm` },
      { label: 'Max', value: `${max.toFixed(1)} mm` },
      { label: 'Moy.', value: `${avg.toFixed(1)} mm` },
    ];
    parts.forEach(({ label, value }) => {
      const span = document.createElement('span');
      span.className = 'he-chart-stats__item';
      const strong = document.createElement('strong');
      strong.textContent = label;
      span.appendChild(strong);
      span.appendChild(document.createTextNode(` ${value}`));
      statsEl.appendChild(span);
    });
  } else {
    statsEl.hidden = true;
  }
}
```

Dans `clearChart`, ajouter après `Plotly.purge(containerId)` :

```javascript
const statsEl = document.getElementById('chart-stats');
if (statsEl) { statsEl.hidden = true; statsEl.textContent = ''; }
```

- [ ] **Step 3 : Styles pour les stats dans `main.css`**

```css
/* ===== Stats graphique ===== */
.he-chart-stats {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  color: #495057;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
}

.he-chart-stats__item {
  white-space: nowrap;
}
```

- [ ] **Step 4 : Vérification visuelle**

1. Cliquer sur une station avec données → sous le graphique : "Min 123.4 mm · Max 456.7 mm · Moy. 234.5 mm"
2. Station sans données → `#chart-stats` reste masqué.
3. Fermer le panneau et rouvrir → stats réinitialisées.

- [ ] **Step 5 : Commit**

```bash
git add src/js/chart.js src/index.html src/css/main.css
git commit -m "feat: statistiques min/max/moyenne sous le graphique"
```

---

## Task 3 : Piézométrie (nappes souterraines)

**Files:**
- Create: `src/js/piezometry.js`
- Modify: `src/js/api.js`
- Modify: `src/js/map.js`
- Modify: `src/js/app.js`
- Modify: `src/index.html`

### Contexte
Hub'eau API v1 expose les stations piézométriques (mesure du niveau des nappes phréatiques) via `https://hubeau.eaufrance.fr/api/v1/niveaux_nappes/stations`. Ces stations ont leurs propres codes, coordonnées et noms. Elles s'affichent sur la carte avec un marqueur carré violet, sur un layer séparable du layer hydrométriques. Un toggle dans les filtres permet d'activer/désactiver ce layer.

- [ ] **Step 1 : Ajouter `fetchPiezometryStations` dans `api.js`**

Dans `src/js/api.js`, ajouter à la fin :

```javascript
const API_PIEZO_BASE = 'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes';

/**
 * Récupère les stations piézométriques actives (nappes souterraines).
 * @returns {Promise<Array>}
 */
export async function fetchPiezometryStations() {
  const url = new URL(`${API_PIEZO_BASE}/stations`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', '3000');
  url.searchParams.set('fields', 'code_bss,nom_commune,x,y,altitude_station,profondeur_investigation');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau piézométrie : ${response.status}`);
  }
  const json = await response.json();
  return json.data.filter(s => s.x !== null && s.y !== null);
}
```

- [ ] **Step 2 : Créer `src/js/piezometry.js`**

```javascript
import { fetchPiezometryStations } from './api.js';

let piezoLayer = null;

/**
 * Initialise le layer piézométrique sur la carte Leaflet.
 * Les marqueurs sont des carrés violets distincts des marqueurs hydro ronds.
 * @param {Object} map - Instance Leaflet
 * @returns {Promise<L.LayerGroup>} Le layer créé (pour contrôle On/Off)
 */
export async function initPiezometryLayer(map) {
  const stations = await fetchPiezometryStations();
  piezoLayer = L.layerGroup();

  stations.forEach(s => {
    // s.x = longitude (Lambert 93 converti par l'API → WGS84)
    // s.y = latitude
    const marker = L.marker([s.y, s.x], {
      icon: L.divIcon({
        className: '',
        html: '<div class="piezo-marker" aria-hidden="true"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -8],
      }),
      title: s.nom_commune || s.code_bss,
      alt: `Station piézométrique ${s.code_bss}`,
    });

    const popup = document.createElement('div');
    popup.className = 'station-popup';
    const h3 = document.createElement('h3');
    h3.textContent = s.nom_commune || s.code_bss;
    popup.appendChild(h3);
    const dl = document.createElement('dl');
    [
      ['Code BSS', s.code_bss],
      ['Altitude', s.altitude_station != null ? `${s.altitude_station} m` : '—'],
      ['Profondeur', s.profondeur_investigation != null ? `${s.profondeur_investigation} m` : '—'],
    ].forEach(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value || '—';
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    popup.appendChild(dl);
    marker.bindPopup(popup, { maxWidth: 260 });
    piezoLayer.addLayer(marker);
  });

  return piezoLayer;
}

/**
 * Retourne le layer piézométrique (null si pas encore chargé).
 * @returns {L.LayerGroup|null}
 */
export function getPiezoLayer() {
  return piezoLayer;
}
```

- [ ] **Step 3 : Ajouter le marker CSS dans `main.css`**

```css
/* ===== Marker piézométrique ===== */
.piezo-marker {
  width: 10px;
  height: 10px;
  background: #8e44ad;
  border: 1px solid #fff;
  border-radius: 2px; /* carré aux coins légèrement arrondis */
  box-shadow: 0 1px 3px rgba(0,0,0,.4);
}
```

- [ ] **Step 4 : Exposer `addOverlayLayer` dans `map.js`**

Dans `src/js/map.js`, après `initMap`, ajouter une référence au contrôle de couches. Modifier `initMap` pour stocker `layerControl` :

```javascript
let layerControl;

// Dans initMap, remplacer la ligne layerControl :
layerControl = L.control.layers(baseLayers, overlayLayers, { position: 'topright', collapsed: true }).addTo(map);
```

Ajouter à la fin de `map.js` :

```javascript
/**
 * Ajoute un overlay au sélecteur de couches existant.
 * @param {string} name - Label affiché dans le sélecteur
 * @param {L.Layer} layer - Layer Leaflet à ajouter
 */
export function addOverlayLayer(name, layer) {
  if (layerControl) layerControl.addOverlay(layer, name);
}
```

- [ ] **Step 5 : Câbler dans `app.js`**

En haut de `app.js`, ajouter les imports :

```javascript
import { initPiezometryLayer } from './piezometry.js';
import { addOverlayLayer } from './map.js';
```

Dans `loadStations()`, après `initFilters(...)`, ajouter le chargement piézométrique en arrière-plan :

```javascript
// Piézométrie — chargement silencieux en arrière-plan
initPiezometryLayer(/* map est interne à map.js, on passe par addOverlayLayer */)
  .then(layer => {
    addOverlayLayer('Piézométrie (nappes)', layer);
  })
  .catch(err => console.warn('[Hydro Explorer] Piézométrie :', err.message));
```

**Note :** `initPiezometryLayer` doit recevoir la carte. Comme `map` est privé dans `map.js`, il faut exposer une fonction `getMap()` dans `map.js` :

Ajouter dans `map.js` :

```javascript
/** Retourne l'instance Leaflet (pour les modules externes). */
export function getMap() { return map; }
```

Mettre à jour l'import dans `app.js` :

```javascript
import {
  initMap,
  renderStations,
  updateMarkerStatus,
  applyMarkerFilter,
  getAllStations,
  flyToLocation,
  panToStation,
  addOverlayLayer,
  getMap,
} from './map.js';
```

Mettre à jour l'appel dans `loadStations` :

```javascript
initPiezometryLayer(getMap())
  .then(layer => {
    addOverlayLayer('Piézométrie (nappes)', layer);
  })
  .catch(err => console.warn('[Hydro Explorer] Piézométrie :', err.message));
```

Et mettre à jour `piezometry.js` pour que `initPiezometryLayer` reçoive la map :

```javascript
export async function initPiezometryLayer(map) {
  // ... (le reste est identique à Step 2)
```

- [ ] **Step 6 : Vérification visuelle**

1. Charger l'app. Le sélecteur de couches affiche "Piézométrie (nappes)" en overlay.
2. Activer le layer → des carrés violets apparaissent sur la carte (quelques secondes de chargement).
3. Cliquer sur un carré → popup avec code BSS, commune, altitude, profondeur.
4. Désactiver le layer → les carrés disparaissent.
5. Les marqueurs hydrométriques (ronds colorés) ne sont pas affectés.

- [ ] **Step 7 : Commit**

```bash
git add src/js/api.js src/js/piezometry.js src/js/map.js src/js/app.js src/css/main.css
git commit -m "feat: layer piézométrique — nappes souterraines Hub'eau v1"
```

---

## Self-Review

**Spec coverage :**
- ✅ Débit Q dans le graphique → Task 1
- ✅ Statistiques min/max/moyenne → Task 2
- ✅ Piézométrie → Task 3

**Placeholder scan :** aucun TBD ni TODO.

**Type consistency :**
- `fetchObservationsDebit` : créée Task 1 Step 1, importée Task 1 Step 4. ✅
- `renderChart(containerId, observations, coursEauLabel, observationsQ)` : modifiée Task 1 Step 2, appelée Task 1 Step 4. ✅
- `fetchPiezometryStations` : créée Task 3 Step 1, importée dans `piezometry.js` Task 3 Step 2. ✅
- `initPiezometryLayer(map)` : créée Task 3 Step 2 + amendée Step 5, appelée dans `app.js` Task 3 Step 5. ✅
- `addOverlayLayer` : créée Task 3 Step 4, importée Task 3 Step 5. ✅
- `getMap` : créée Task 3 Step 5 dans `map.js`, importée dans `app.js` Task 3 Step 5. ✅
