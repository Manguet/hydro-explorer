# Hydro Explorer — Vigicrues Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Superposer sur la carte les tronçons Vigicrues en couleur (vert/jaune/orange/rouge) depuis le GeoJSON public de l'API Vigicrues, activable/désactivable via le sélecteur de couches Leaflet.

**Architecture:** Le GeoJSON Vigicrues (`https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.json`) est récupéré à chaque chargement (pas de cache TTL long — les données changent régulièrement). Les tronçons sont colorés selon le niveau de vigilance. Le layer est ajouté au sélecteur de couches existant.

**Tech Stack:** Vanilla JS (ES modules), Leaflet 1.9.4 (L.geoJSON), API Vigicrues publique.

---

## Structure des fichiers

**À créer :**
- `src/js/vigicrues.js` — fetch GeoJSON Vigicrues + layer Leaflet

**À modifier :**
- `src/js/app.js` — câblage du layer Vigicrues au démarrage
- `src/js/map.js` — exposer `addOverlayLayer` et `getMap` si pas déjà fait (fait dans le plan données-enrichies — si ce plan est exécuté seul, voir Step 0 ci-dessous)

---

## Task 1 : Overlay Vigicrues

**Files:**
- Create: `src/js/vigicrues.js`
- Modify: `src/js/app.js`
- Modify: `src/js/map.js` (Step 0 uniquement si le plan données-enrichies n'a pas été exécuté)

### Contexte
L'API Vigicrues fournit un GeoJSON des tronçons avec un champ `NivSituVigiCruEnt` (niveau de vigilance) :
- 1 → Vert (pas de vigilance)
- 2 → Jaune (risque de crue)
- 3 → Orange (risque important)
- 4 → Rouge (risque majeur)

On affiche seulement les niveaux ≥ 2 pour ne pas surcharger la carte (le niveau 1 = normal est ignoré).

- [ ] **Step 0 (conditionnel) : Vérifier que `addOverlayLayer` et `getMap` existent dans `map.js`**

Vérifier si les fonctions `addOverlayLayer` et `getMap` sont exportées dans `src/js/map.js`. Si elles n'existent pas (plan données-enrichies non exécuté), les ajouter.

Rechercher dans `map.js` :
```bash
grep -n "addOverlayLayer\|getMap\|layerControl" src/js/map.js
```

Si absent, ajouter dans `map.js` :
- Changer `L.control.layers(...)` en `layerControl = L.control.layers(...)` (en déclarant `let layerControl;` en haut du fichier)
- Ajouter à la fin :

```javascript
export function addOverlayLayer(name, layer) {
  if (layerControl) layerControl.addOverlay(layer, name);
}

export function getMap() { return map; }
```

- [ ] **Step 1 : Créer `src/js/vigicrues.js`**

```javascript
/**
 * Layer Vigicrues — tronçons de cours d'eau colorés selon le niveau de vigilance.
 * Source : API publique Vigicrues (InfoVigiCru.json)
 * Niveaux : 1=Vert (ignoré), 2=Jaune, 3=Orange, 4=Rouge
 */

const VIGICRUES_URL = 'https://www.vigicrues.gouv.fr/services/1/InfoVigiCru.json';

const VIGI_COLORS = {
  2: '#f1c40f', // Jaune
  3: '#e67e22', // Orange
  4: '#e74c3c', // Rouge
};

const VIGI_LABELS = {
  2: 'Vigilance jaune',
  3: 'Vigilance orange',
  4: 'Vigilance rouge',
};

/**
 * Charge le GeoJSON Vigicrues et retourne un L.GeoJSON Leaflet.
 * Les tronçons de niveau 1 (vert, normal) sont ignorés.
 * @param {Object} map - Instance Leaflet
 * @returns {Promise<L.GeoJSON>}
 */
export async function initVigicruesLayer(map) {
  const response = await fetch(VIGICRUES_URL);
  if (!response.ok) {
    throw new Error(`Erreur Vigicrues : ${response.status}`);
  }
  const geojson = await response.json();

  const layer = L.geoJSON(geojson, {
    filter: (feature) => {
      const niveau = feature.properties?.NivSituVigiCruEnt;
      return niveau >= 2; // ignorer niveau 1 (pas de vigilance)
    },
    style: (feature) => {
      const niveau = feature.properties?.NivSituVigiCruEnt || 2;
      return {
        color: VIGI_COLORS[niveau] || VIGI_COLORS[2],
        weight: 4,
        opacity: 0.85,
      };
    },
    onEachFeature: (feature, featureLayer) => {
      const props = feature.properties || {};
      const niveau = props.NivSituVigiCruEnt;
      const nom = props.LbEntVigiCru || 'Tronçon inconnu';

      const popup = document.createElement('div');
      popup.className = 'station-popup';

      const h3 = document.createElement('h3');
      h3.textContent = nom;
      popup.appendChild(h3);

      const badge = document.createElement('span');
      badge.className = `popup-status popup-status--${niveau >= 4 ? 'alerte' : niveau >= 3 ? 'vigilance' : 'normal'}`;
      badge.textContent = VIGI_LABELS[niveau] || 'Vigilance';
      popup.appendChild(badge);

      featureLayer.bindPopup(popup, { maxWidth: 260 });
    },
  });

  return layer;
}
```

- [ ] **Step 2 : Câbler dans `app.js`**

En haut de `app.js`, ajouter l'import :

```javascript
import { initVigicruesLayer } from './vigicrues.js';
```

Vérifier que `getMap` et `addOverlayLayer` sont importés depuis `./map.js`. Ajouter si absent :

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

Dans `loadStations()`, après le bloc piézométrie (ou après `initFilters` si le plan données-enrichies n'a pas été fait), ajouter :

```javascript
// Vigicrues — chargement en arrière-plan
initVigicruesLayer(getMap())
  .then(layer => {
    addOverlayLayer('Vigicrues (vigilance crues)', layer);
  })
  .catch(err => console.warn('[Hydro Explorer] Vigicrues :', err.message));
```

- [ ] **Step 3 : Vérification visuelle**

1. Charger l'app. Le sélecteur de couches affiche "Vigicrues (vigilance crues)".
2. Activer le layer → des lignes colorées apparaissent sur les cours d'eau en alerte.
3. En période sans vigilance, peu ou aucune ligne apparaît (les niveaux 1 sont filtrés).
4. Cliquer sur une ligne → popup avec le nom du tronçon et le badge de vigilance.
5. Désactiver → les lignes disparaissent.
6. Les marqueurs hydrométriques et piézométriques ne sont pas affectés.

- [ ] **Step 4 : Commit**

```bash
git add src/js/vigicrues.js src/js/app.js src/js/map.js
git commit -m "feat: overlay Vigicrues — tronçons de vigilance crue sur la carte"
```

---

## Self-Review

**Spec coverage :**
- ✅ Fetch GeoJSON Vigicrues → Task 1 Step 1
- ✅ Overlay sur la carte avec couleurs → Task 1 Step 1 (style)
- ✅ Filtrage niveaux ≥ 2 → Task 1 Step 1 (filter)
- ✅ Popup avec nom + badge → Task 1 Step 1 (onEachFeature)
- ✅ Intégration dans le sélecteur de couches → Task 1 Step 2

**Placeholder scan :** aucun TBD ni TODO.

**Type consistency :**
- `initVigicruesLayer(map)` : créée Task 1 Step 1, importée Task 1 Step 2. ✅
- `addOverlayLayer`, `getMap` : soit déjà présents (plan données-enrichies), soit ajoutés en Step 0. ✅
