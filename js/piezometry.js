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
  piezoLayer = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 40,
    showCoverageOnHover: false,
  });

  stations.forEach(s => {
    // s.x = longitude, s.y = latitude (coordonnées WGS84 fournies par l'API)
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
