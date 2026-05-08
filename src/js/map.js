import {
  MAP_CENTER,
  MAP_ZOOM_INIT,
  MAP_BASEMAPS,
  MAP_OVERLAYS,
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
    zoomControl: false,  // repositionné en haut à droite pour libérer le panneau filtres
  });

  // Contrôles zoom en haut à droite (le panneau filtres est à gauche)
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Couches de fond
  const baseLayers = {};
  let defaultLayer = null;
  Object.entries(MAP_BASEMAPS).forEach(([name, def]) => {
    const layer = L.tileLayer(def.url, def.options);
    baseLayers[name] = layer;
    if (def.default) { layer.addTo(map); defaultLayer = layer; }
  });

  // Overlays
  const overlayLayers = {};
  Object.entries(MAP_OVERLAYS).forEach(([name, def]) => {
    overlayLayers[name] = L.tileLayer(def.url, def.options);
  });

  // Sélecteur de couches (en haut à droite, sous le zoom)
  L.control.layers(baseLayers, overlayLayers, { position: 'topright', collapsed: true }).addTo(map);

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
    // role="region" + aria-label : rend la légende identifiable comme landmark
    // pour les lecteurs d'écran (RGAA 12.x)
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Légende des états de station');

    Object.entries(STATUS_LABELS).forEach(([key, label]) => {
      const item = L.DomUtil.create('div', 'he-legend__item', container);
      const dot = L.DomUtil.create('span', 'he-legend__dot', item);
      dot.style.background = STATUS_COLORS[key];
      // aria-hidden : la pastille est purement décorative, le texte qui suit
      // fournit l'alternative (RGAA 1.1)
      dot.setAttribute('aria-hidden', 'true');
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
function makeIcon(status, selected = false, label = '') {
  const color = STATUS_COLORS[status] || STATUS_COLORS.inactive;
  // color provient de STATUS_COLORS (constantes), safe pour style CSS
  const cls = selected ? 'station-marker station-marker--selected' : 'station-marker';
  // aria-hidden="true" : le marqueur visuel est décoratif, le title du L.marker
  // et le popup assurent l'alternative textuelle (RGAA 1.1 / 6.x)
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="background:${color}" aria-hidden="true"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

/**
 * Construit le nœud DOM du popup pour une station.
 * Toutes les valeurs issues de l'API passent par textContent (XSS-safe).
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
    ['Type', station.type_station],
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
