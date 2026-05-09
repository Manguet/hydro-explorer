# Hydro Explorer — UX & Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les fonctionnalités UX manquantes : labels lisibles pour les types de stations, filtre par statut, barre de recherche, géolocalisation, zoom au clic sur une station, et permalien par URL.

**Architecture:** Vanilla JS ES modules, Leaflet pour la carte, Plotly pour les graphiques. Pas de framework de test — la validation se fait en ouvrant `src/index.html` dans un serveur local (ex. `npx serve src`). Chaque tâche modifie des fichiers ciblés sans toucher aux autres.

**Tech Stack:** Vanilla JS (ES modules), Leaflet 1.9.4, Plotly Basic 2.32, Hub'eau API v2, HTML5 Geolocation API.

---

## Structure des fichiers

**À créer :**
- `src/js/search.js` — logique de recherche/filtrage par texte des stations
- `src/js/permalink.js` — lecture/écriture du hash URL pour partager une station

**À modifier :**
- `src/js/config.js` — ajouter `TYPE_STATION_LABELS` (map code → label lisible)
- `src/js/filters.js` — utiliser les labels, ajouter le filtre statut, exporter `getStatusFilter`
- `src/js/map.js` — zoom au clic sur station, bouton géolocalisation
- `src/js/app.js` — câblage search, géoloc, permalink, filtre statut
- `src/index.html` — input recherche, bouton géoloc, select filtre statut

---

## Task 1 : Labels lisibles pour `type_station`

**Files:**
- Modify: `src/js/config.js`
- Modify: `src/js/filters.js`

### Contexte
L'API Hub'eau renvoie `type_station` sous forme de codes bruts (`STD`, `DEB`, `H`, `LIMNI`, `PIEZO`, etc.). Ces codes s'affichent tels quels dans le filtre "Type de station" et dans le popup. Il faut une map code → label dans `config.js` et l'utiliser dans `filters.js`.

- [ ] **Step 1 : Ajouter `TYPE_STATION_LABELS` dans `config.js`**

Ajouter après le bloc `STATUS_LABELS` existant (ligne ~52) :

```javascript
// Labels lisibles pour les codes type_station Hub'eau
export const TYPE_STATION_LABELS = {
  STD:   'Standard (H + Q)',
  DEB:   'Débit',
  H:     'Hauteur',
  LIMNI: 'Limnimètre',
  PIEZO: 'Piézomètre',
  PLU:   'Pluviomètre',
  OA:    'Ouvrage',
};
```

- [ ] **Step 2 : Importer et utiliser `TYPE_STATION_LABELS` dans `filters.js`**

En haut de `src/js/filters.js`, ajouter l'import :

```javascript
import { TYPE_STATION_LABELS } from './config.js';
```

Dans `populateTypeSelect`, remplacer la ligne `opt.textContent = type;` par :

```javascript
opt.textContent = TYPE_STATION_LABELS[type] || type;
```

- [ ] **Step 3 : Vérification visuelle**

Ouvrir `http://localhost:3000` (serveur : `npx serve src`), cliquer sur "Filtres", ouvrir la liste "Type de station". Résultat attendu : au lieu de `STD`, on lit `Standard (H + Q)`. Les codes inconnus continuent d'afficher le code brut.

- [ ] **Step 4 : Commit**

```bash
cd /var/www/hydro-carto
git add src/js/config.js src/js/filters.js
git commit -m "feat: labels lisibles pour type_station dans le filtre"
```

---

## Task 2 : Filtre par statut de station

**Files:**
- Modify: `src/index.html`
- Modify: `src/js/filters.js`
- Modify: `src/js/app.js`

### Contexte
Les stations ont un statut (`normal`, `vigilance`, `inactive`) calculé dans `app.js` via `computeStationStatus()` et stocké dans `state.observationsCache`. Le filtre doit masquer les marqueurs dont le statut ne correspond pas à la sélection. Attention : le statut n'est connu que pour les stations dont les observations ont été chargées — les stations non consultées restent `inactive` par défaut (comportement attendu).

- [ ] **Step 1 : Ajouter le select statut dans `index.html`**

Dans `src/index.html`, après le groupe `filter-type` (ligne ~64), ajouter :

```html
<div class="he-filters__group">
  <label for="filter-status" class="he-label">Statut</label>
  <select id="filter-status" class="he-select">
    <option value="">Tous les statuts</option>
    <option value="normal">Normal</option>
    <option value="vigilance">Vigilance</option>
    <option value="inactive">Inactif</option>
  </select>
</div>
```

- [ ] **Step 2 : Brancher le listener dans `initFilters`**

Dans `src/js/filters.js`, dans le tableau de la fonction `initFilters` (ligne ~10), ajouter `'filter-status'` :

```javascript
['filter-department', 'filter-type', 'filter-status', 'filter-period'].forEach(id => {
  document.getElementById(id).addEventListener('change', onFilterChange);
});
```

- [ ] **Step 3 : Inclure le statut dans `getFilterValues`**

Dans `getFilterValues()` de `filters.js`, ajouter `status` :

```javascript
export function getFilterValues() {
  return {
    department: document.getElementById('filter-department').value,
    type: document.getElementById('filter-type').value,
    status: document.getElementById('filter-status').value,
    periodDays: parseInt(document.getElementById('filter-period').value, 10),
  };
}
```

- [ ] **Step 4 : Réinitialiser le statut dans `resetFilters`**

Dans `resetFilters()` de `filters.js`, ajouter :

```javascript
document.getElementById('filter-status').value = '';
```

- [ ] **Step 5 : Passer le statut au prédicat dans `buildFilterPredicate`**

`buildFilterPredicate` reçoit déjà `stationMap` mais n'a pas accès aux statuts. Il faut lui passer également la `stationStatusMap`. Remplacer la signature et le corps de `buildFilterPredicate` dans `filters.js` :

```javascript
/**
 * Retourne un prédicat de filtrage basé sur les valeurs UI courantes.
 * @param {Map<string, Object>} stationMap       - code_station → station
 * @param {Map<string, string>} stationStatusMap - code_station → 'normal'|'vigilance'|'inactive'
 * @returns {Function} (codeStation: string) => boolean
 */
export function buildFilterPredicate(stationMap, stationStatusMap = new Map()) {
  const { department, type, status } = getFilterValues();

  return (codeStation) => {
    const station = stationMap.get(codeStation);
    if (!station) return false;
    if (department && station.code_departement !== department) return false;
    if (type && station.type_station !== type) return false;
    if (status) {
      const stStatus = stationStatusMap.get(codeStation) || 'inactive';
      if (stStatus !== status) return false;
    }
    return true;
  };
}
```

- [ ] **Step 6 : Maintenir `stationStatusMap` dans `app.js`**

Dans `src/js/app.js`, dans l'objet `state`, ajouter :

```javascript
stationStatusMap: new Map(),   // code_station → 'normal'|'vigilance'|'inactive'
```

Dans `onStationClick`, après `updateMarkerStatus(station.code_station, status)` (fetch réseau), ajouter :

```javascript
state.stationStatusMap.set(station.code_station, status);
```

Mettre à jour les deux appels à `buildFilterPredicate` dans `app.js` pour passer `stationStatusMap` :

```javascript
// Dans onFilterChange :
const predicate = buildFilterPredicate(state.stationMap, state.stationStatusMap);

// Dans bindUIEvents (btn-export) :
const predicate = buildFilterPredicate(state.stationMap, state.stationStatusMap);
```

- [ ] **Step 7 : Vérification visuelle**

1. Charger l'app. Ouvrir les filtres. Le select "Statut" apparaît.
2. Sélectionner "Normal" → seules les stations récemment consultées et actives restent visibles.
3. Sélectionner "Inactif" → les stations non consultées (statut par défaut `inactive`) restent visibles.
4. Réinitialiser → tous les marqueurs reviennent.

- [ ] **Step 8 : Commit**

```bash
git add src/index.html src/js/filters.js src/js/app.js
git commit -m "feat: filtre par statut de station (normal/vigilance/inactif)"
```

---

## Task 3 : Barre de recherche de station

**Files:**
- Create: `src/js/search.js`
- Modify: `src/index.html`
- Modify: `src/js/app.js`

### Contexte
L'utilisateur doit pouvoir taper un nom ou un code de station pour filtrer les marqueurs sur la carte. La recherche est combinée avec les autres filtres (département, type, statut). Le module `search.js` expose `initSearch()` et `getSearchPredicate()`.

- [ ] **Step 1 : Créer `src/js/search.js`**

```javascript
/**
 * Gestion de la barre de recherche de stations.
 * La recherche porte sur libelle_station et code_station (insensible à la casse).
 */

let currentQuery = '';

/**
 * Initialise l'input de recherche.
 * @param {Function} onSearch - callback() déclenché à chaque frappe (debounced 200ms)
 */
export function initSearch(onSearch) {
  const input = document.getElementById('search-station');
  if (!input) return;

  let timer;
  input.addEventListener('input', () => {
    currentQuery = input.value.trim().toLowerCase();
    clearTimeout(timer);
    timer = setTimeout(onSearch, 200);
  });

  document.getElementById('btn-search-clear')?.addEventListener('click', () => {
    input.value = '';
    currentQuery = '';
    onSearch();
    input.focus();
  });
}

/**
 * Retourne un prédicat de recherche texte.
 * @param {Map<string, Object>} stationMap - code_station → station
 * @returns {Function} (codeStation: string) => boolean
 */
export function getSearchPredicate(stationMap) {
  if (!currentQuery) return () => true;

  return (codeStation) => {
    const s = stationMap.get(codeStation);
    if (!s) return false;
    const name = (s.libelle_station || '').toLowerCase();
    const code = (s.code_station || '').toLowerCase();
    return name.includes(currentQuery) || code.includes(currentQuery);
  };
}
```

- [ ] **Step 2 : Ajouter la barre de recherche dans `index.html`**

Dans `src/index.html`, dans la `<nav class="he-header__actions">` (ligne ~36), ajouter avant le bouton "Filtres" :

```html
<div class="he-search" role="search" aria-label="Recherche de station">
  <input
    id="search-station"
    type="search"
    class="he-search__input"
    placeholder="Rechercher une station…"
    aria-label="Rechercher une station par nom ou code"
    autocomplete="off"
  />
  <button id="btn-search-clear" class="he-search__clear" aria-label="Effacer la recherche" hidden>&#x2715;</button>
</div>
```

- [ ] **Step 3 : Câbler dans `app.js`**

En haut de `src/js/app.js`, ajouter l'import :

```javascript
import { initSearch, getSearchPredicate } from './search.js';
```

Dans `DOMContentLoaded`, après `initFilters(...)`, ajouter :

```javascript
initSearch(onFilterChange);
```

Dans `onFilterChange`, remplacer le prédicat pour combiner recherche + filtres :

```javascript
function onFilterChange() {
  const { periodDays } = getFilterValues();
  if (state.lastPeriodDays !== null && state.lastPeriodDays !== periodDays) {
    state.observationsCache.clear();
  }
  state.lastPeriodDays = periodDays;

  const filterPredicate = buildFilterPredicate(state.stationMap, state.stationStatusMap);
  const searchPredicate = getSearchPredicate(state.stationMap);
  applyMarkerFilter(code => filterPredicate(code) && searchPredicate(code));
}
```

- [ ] **Step 4 : Ajouter les styles dans `src/css/main.css`**

Ajouter à la fin du fichier :

```css
/* ===== Barre de recherche ===== */
.he-search {
  position: relative;
  display: flex;
  align-items: center;
}

.he-search__input {
  width: 220px;
  padding: 0.4rem 2rem 0.4rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
  background: #fff;
  color: #212529;
}

.he-search__input:focus {
  outline: 2px solid #0d6efd;
  outline-offset: 1px;
}

.he-search__clear {
  position: absolute;
  right: 0.4rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 0.2rem;
  line-height: 1;
  font-size: 0.875rem;
}

.he-search__clear:focus-visible {
  outline: 2px solid #0d6efd;
  border-radius: 2px;
}
```

- [ ] **Step 5 : Afficher/masquer le bouton clear**

Dans `src/js/search.js`, dans le listener `input`, ajouter après `currentQuery = ...` :

```javascript
const clearBtn = document.getElementById('btn-search-clear');
if (clearBtn) clearBtn.hidden = currentQuery.length === 0;
```

- [ ] **Step 6 : Vérification visuelle**

1. L'input apparaît dans l'en-tête.
2. Taper "seine" → seules les stations dont le nom contient "seine" restent.
3. Taper un code ex. "K4390010" → la station correspondante reste seule.
4. Cliquer ✕ → tout revient.
5. Combiner avec le filtre département → les deux prédicats s'appliquent ensemble.

- [ ] **Step 7 : Commit**

```bash
git add src/js/search.js src/index.html src/js/app.js src/css/main.css
git commit -m "feat: barre de recherche de station par nom ou code"
```

---

## Task 4 : Géolocalisation

**Files:**
- Modify: `src/index.html`
- Modify: `src/js/map.js`
- Modify: `src/js/app.js`

### Contexte
Un bouton "Me localiser" dans l'en-tête utilise l'API `navigator.geolocation` pour centrer la carte sur la position de l'utilisateur et placer un marker temporaire. Le refus de permission est géré silencieusement (pas d'alert).

- [ ] **Step 1 : Ajouter le bouton dans `index.html`**

Dans la `<nav class="he-header__actions">`, après le bouton `btn-filters` :

```html
<button id="btn-geolocate" class="he-btn he-btn--secondary" aria-label="Centrer la carte sur ma position">
  &#x25CE; Me localiser
</button>
```

- [ ] **Step 2 : Ajouter `flyToLocation` dans `map.js`**

À la fin de `src/js/map.js`, ajouter :

```javascript
let geoMarker = null;

/**
 * Centre la carte sur des coordonnées et place un marqueur de position.
 * Remplace l'éventuel marqueur précédent.
 * @param {number} lat
 * @param {number} lng
 */
export function flyToLocation(lat, lng) {
  if (geoMarker) {
    map.removeLayer(geoMarker);
  }
  geoMarker = L.circleMarker([lat, lng], {
    radius: 10,
    color: '#0d6efd',
    fillColor: '#0d6efd',
    fillOpacity: 0.4,
    weight: 2,
  }).addTo(map);
  geoMarker.bindPopup('Votre position').openPopup();
  map.flyTo([lat, lng], 11, { duration: 1.2 });
}
```

- [ ] **Step 3 : Câbler dans `app.js`**

En haut de `app.js`, ajouter `flyToLocation` dans l'import depuis `./map.js` :

```javascript
import {
  initMap,
  renderStations,
  updateMarkerStatus,
  applyMarkerFilter,
  getAllStations,
  flyToLocation,
} from './map.js';
```

Dans `bindUIEvents()`, ajouter :

```javascript
document.getElementById('btn-geolocate')?.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showStatus('Géolocalisation non supportée par ce navigateur.', 4000);
    return;
  }
  showStatus('Localisation en cours…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      flyToLocation(pos.coords.latitude, pos.coords.longitude);
      showStatus('Position trouvée.', 3000);
    },
    () => {
      showStatus('Accès à la position refusé ou impossible.', 4000);
    },
    { timeout: 8000, maximumAge: 60000 }
  );
});
```

- [ ] **Step 4 : Vérification visuelle**

1. Le bouton "Me localiser" apparaît dans l'en-tête.
2. Cliquer → le navigateur demande la permission de géolocalisation.
3. Autoriser → la carte se déplace vers la position, un cercle bleu apparaît.
4. Refuser → le message "Accès à la position refusé" s'affiche 4 secondes.

- [ ] **Step 5 : Commit**

```bash
git add src/index.html src/js/map.js src/js/app.js
git commit -m "feat: géolocalisation — centrage carte sur position utilisateur"
```

---

## Task 5 : Zoom vers la station au clic

**Files:**
- Modify: `src/js/map.js`
- Modify: `src/js/app.js`

### Contexte
Actuellement, cliquer sur un marqueur ouvre le panneau graphique mais ne déplace pas la carte. Il faut centrer la carte sur la station sélectionnée avec un zoom modéré, sans être trop intrusif (zoom 12 si l'utilisateur est déjà à un zoom > 10, sinon 12).

- [ ] **Step 1 : Ajouter `panToStation` dans `map.js`**

À la fin de `src/js/map.js`, ajouter :

```javascript
/**
 * Centre la carte sur une station sélectionnée.
 * Zoom à 12 si le zoom actuel est inférieur, sinon garde le zoom actuel.
 * @param {string} codeStation
 */
export function panToStation(codeStation) {
  const entry = stationIndex.get(codeStation);
  if (!entry) return;
  const { lat, lng } = entry.marker.getLatLng();
  const targetZoom = Math.max(map.getZoom(), 12);
  map.flyTo([lat, lng], targetZoom, { duration: 0.8 });
}
```

- [ ] **Step 2 : Importer et appeler dans `app.js`**

Dans les imports de `map.js` dans `app.js`, ajouter `panToStation` :

```javascript
import {
  initMap,
  renderStations,
  updateMarkerStatus,
  applyMarkerFilter,
  getAllStations,
  flyToLocation,
  panToStation,
} from './map.js';
```

Dans `onStationClick`, au début de la fonction (après `state.selectedStation = station`), ajouter :

```javascript
panToStation(station.code_station);
```

- [ ] **Step 3 : Vérification visuelle**

1. Depuis le zoom initial (6), cliquer sur un marqueur → la carte zoome à 12 et se centre sur la station.
2. Depuis un zoom > 12, cliquer → la carte se centre sans modifier le zoom.
3. L'animation est fluide (0.8s).

- [ ] **Step 4 : Commit**

```bash
git add src/js/map.js src/js/app.js
git commit -m "feat: zoom et centrage automatique sur la station sélectionnée"
```

---

## Task 6 : Permalien par URL

**Files:**
- Create: `src/js/permalink.js`
- Modify: `src/js/app.js`

### Contexte
Quand l'utilisateur sélectionne une station, le hash URL est mis à jour (`#K4390010`). Au chargement de la page, si un hash est présent, la station correspondante est automatiquement sélectionnée (en attendant que les données soient chargées). Cela permet de partager une URL directement sur une station.

- [ ] **Step 1 : Créer `src/js/permalink.js`**

```javascript
/**
 * Gestion du permalien par fragment URL (#code_station).
 * Permet de partager l'URL d'une station spécifique.
 */

/**
 * Met à jour le hash URL avec le code de la station sélectionnée.
 * Utilise replaceState pour ne pas polluer l'historique de navigation.
 * @param {string} codeStation
 */
export function setPermalink(codeStation) {
  if (history.replaceState) {
    history.replaceState(null, '', `#${codeStation}`);
  } else {
    location.hash = codeStation;
  }
}

/**
 * Efface le hash URL (quand le panneau est fermé).
 */
export function clearPermalink() {
  if (history.replaceState) {
    history.replaceState(null, '', location.pathname + location.search);
  } else {
    location.hash = '';
  }
}

/**
 * Retourne le code station présent dans le hash URL, ou null.
 * Valide le format : 10 caractères alphanumériques.
 * @returns {string|null}
 */
export function getPermalinkStation() {
  const hash = location.hash.slice(1); // enlever le '#'
  if (/^[A-Za-z0-9]{1,20}$/.test(hash)) return hash.toUpperCase();
  return null;
}
```

- [ ] **Step 2 : Importer dans `app.js`**

En haut de `app.js`, ajouter :

```javascript
import { setPermalink, clearPermalink, getPermalinkStation } from './permalink.js';
```

- [ ] **Step 3 : Appeler `setPermalink` dans `onStationClick`**

Dans `onStationClick`, après `state.selectedStation = station` :

```javascript
setPermalink(station.code_station);
```

- [ ] **Step 4 : Appeler `clearPermalink` dans `closeChartPanel`**

Dans `closeChartPanel()` de `app.js`, après `state.selectedStation = null` :

```javascript
clearPermalink();
```

- [ ] **Step 5 : Restaurer la station depuis le hash au chargement**

Dans `loadStations()`, après `initFilters(state.allStations, onFilterChange)`, ajouter :

```javascript
// Restauration depuis le permalien
const permalinkCode = getPermalinkStation();
if (permalinkCode) {
  const station = state.stationMap.get(permalinkCode);
  if (station) {
    onStationClick(station);
  }
}
```

- [ ] **Step 6 : Vérification visuelle**

1. Cliquer sur une station → l'URL devient `http://localhost:3000/#K4390010`.
2. Copier cette URL, ouvrir un nouvel onglet → la station s'ouvre automatiquement.
3. Fermer le panneau → le hash disparaît de l'URL.
4. Tester un hash invalide (`#../../../../etc/passwd`) → ignoré (la regex le rejette).

- [ ] **Step 7 : Commit**

```bash
git add src/js/permalink.js src/js/app.js
git commit -m "feat: permalien — partage d'URL avec sélection de station"
```

---

## Self-Review

**Spec coverage :**
- ✅ Labels `type_station` → Task 1
- ✅ Filtre par statut → Task 2
- ✅ Recherche par nom/code → Task 3
- ✅ Géolocalisation → Task 4
- ✅ Zoom au clic → Task 5
- ✅ Permalien → Task 6

**Placeholder scan :** aucun TBD ni TODO.

**Type consistency :**
- `buildFilterPredicate(stationMap, stationStatusMap)` : signature mise à jour dans Task 2 Step 5, appelée dans Task 2 Step 6 et Task 3 Step 3. ✅
- `flyToLocation` : exportée dans Task 4 Step 2, importée dans Task 4 Step 3. ✅
- `panToStation` : exportée dans Task 5 Step 1, importée dans Task 5 Step 2. ✅
- `setPermalink`, `clearPermalink`, `getPermalinkStation` : créées dans Task 6 Step 1, importées dans Task 6 Step 2. ✅
- `initSearch` + `getSearchPredicate` : créées dans Task 3 Step 1, importées dans Task 3 Step 3. ✅
