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
