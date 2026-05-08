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

// ===== État global =====
const state = {
  allStations: [],
  stationMap: new Map(),          // code_station → station
  observationsCache: new Map(),   // code_station → Array<observation>
  selectedStation: null,
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
  } catch (err) {
    showStatus(`Erreur de chargement : ${err.message}`, 10000);
    console.error('[Hydro Explorer]', err);
  }
}

// ===== Clic sur une station =====
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
