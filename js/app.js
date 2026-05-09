import { fetchStations, fetchObservations, computeStationStatus, fetchObservationsDebit } from './api.js';
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
import { initPiezometryLayer } from './piezometry.js';
import { initVigicruesLayer } from './vigicrues.js';
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
import { initSearch, getSearchPredicate } from './search.js';
import { setPermalink, clearPermalink, getPermalinkStation } from './permalink.js';

// ===== État global =====
const state = {
  allStations: [],
  stationMap: new Map(),          // code_station → station
  observationsCache: new Map(),   // code_station → Array<observation>
  stationStatusMap: new Map(),    // code_station → 'normal'|'vigilance'|'inactive'
  selectedStation: null,
  lastPeriodDays: null,           // détecte les changements de période pour invalider le cache mémoire
  debitCache: new Map(),   // code_station → Array<observation Q>
};

// ===== Initialisation =====
document.addEventListener('DOMContentLoaded', async () => {
  registerSW();
  initMap('map', onStationClick);
  bindUIEvents();
  await loadStations();
});

// ===== Chargement des stations =====
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
    initSearch(onFilterChange);

    // Piézométrie — chargement silencieux en arrière-plan
    initPiezometryLayer(getMap())
      .then(layer => {
        addOverlayLayer('Piézométrie (nappes)', layer);
      })
      .catch(err => console.warn('[Hydro Explorer] Piézométrie :', err.message));

    // Vigicrues — chargement en arrière-plan
    initVigicruesLayer(getMap())
      .then(layer => {
        addOverlayLayer('Vigicrues (vigilance crues)', layer);
      })
      .catch(err => console.warn('[Hydro Explorer] Vigicrues :', err.message));

    // Restauration depuis le permalien
    const permalinkCode = getPermalinkStation();
    if (permalinkCode) {
      const station = state.stationMap.get(permalinkCode);
      if (station) {
        onStationClick(station);
      }
    }
  } catch (err) {
    showStatus(`Erreur de chargement : ${err.message}`, 10000);
    console.error('[Hydro Explorer]', err);
  }
}

// ===== Clic sur une station =====
async function onStationClick(station) {
  state.selectedStation = station;
  setPermalink(station.code_station);
  panToStation(station.code_station);
  clearChart('chart');          // vider l'ancien graphique immédiatement
  openChartPanel(station);
  updateChartMeta('Chargement des données…');

  const { periodDays } = getFilterValues();

  // 1. Vérifier le cache mémoire (session)
  const memCached = state.observationsCache.get(station.code_station);
  if (memCached) {
    displayChart(station, memCached);
    return;
  }

  // 2. Vérifier le cache IndexedDB (TTL 30min)
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
    state.stationStatusMap.set(station.code_station, status);
    displayChart(station, observations);
    // Charger le débit Q en arrière-plan si pas déjà en cache
    if (!state.debitCache.has(`${station.code_station}_${periodDays}`)) {
      fetchObservationsDebit(station.code_station, periodDays)
        .then(debitObs => {
          state.debitCache.set(`${station.code_station}_${periodDays}`, debitObs);
          // Rafraîchir uniquement si c'est toujours la même station
          if (state.selectedStation?.code_station === station.code_station) {
            displayChart(station, state.observationsCache.get(station.code_station) || []);
          }
        })
        .catch(() => {
          console.warn('[Hydro Explorer] Débit Q non disponible pour', station.code_station);
        });
    }
  } catch (err) {
    updateChartMeta(`Erreur : ${err.message}`);
    console.error('[Hydro Explorer]', err);
  }
}

// ===== Affichage du graphique =====
function displayChart(station, observations) {
  document.getElementById('chart-title').textContent =
    station.libelle_station || station.code_station;
  const grandeur = document.querySelector('input[name="chart-grandeur"]:checked')?.value || 'H';
  const debit = grandeur === 'Q' ? (state.debitCache.get(`${station.code_station}_${getFilterValues().periodDays}`) || null) : null;
  renderChart('chart', observations, station.libelle_cours_eau || '', debit);
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

  // RGAA 7.x — Déplacer le focus vers le titre du panneau à l'ouverture
  // afin que les utilisateurs de lecteur d'écran soient informés du changement
  // de contexte. Le titre est rendu focusable temporairement via tabindex="-1".
  const title = document.getElementById('chart-title');
  title.setAttribute('tabindex', '-1');
  title.focus();
}

function closeChartPanel() {
  document.getElementById('panel-chart').hidden = true;
  clearChart('chart');
  state.selectedStation = null;
  clearPermalink();

  // RGAA 7.x — Rendre le focus au bouton de fermeture n'est pas pertinent ici
  // (le panneau s'ouvre via un clic sur la carte). On renvoie le focus vers
  // la carte elle-même pour que la navigation clavier reste cohérente.
  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.focus();
}

function updateChartMeta(text) {
  document.getElementById('chart-meta').textContent = text;
}

// ===== Filtres =====
function onFilterChange() {
  const { periodDays } = getFilterValues();
  if (state.lastPeriodDays !== null && state.lastPeriodDays !== periodDays) {
    state.observationsCache.clear();
    state.debitCache.clear();
  }
  state.lastPeriodDays = periodDays;

  const filterPredicate = buildFilterPredicate(state.stationMap, state.stationStatusMap);
  const searchPredicate = getSearchPredicate(state.stationMap);
  applyMarkerFilter(code => filterPredicate(code) && searchPredicate(code));
}

// ===== Bindings UI =====
function bindUIEvents() {
  document.querySelectorAll('input[name="chart-grandeur"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (state.selectedStation) {
        const obs = state.observationsCache.get(state.selectedStation.code_station) || [];
        displayChart(state.selectedStation, obs);
      }
    });
  });
  document.getElementById('btn-filters').addEventListener('click', toggleFiltersPanel);
  document.getElementById('btn-close-chart').addEventListener('click', closeChartPanel);
  document.getElementById('btn-export').addEventListener('click', () => {
    const predicate = buildFilterPredicate(state.stationMap, state.stationStatusMap);
    const visible = getAllStations().filter(s => predicate(s.code_station));
    exportCSV(visible, state.observationsCache);
  });
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
