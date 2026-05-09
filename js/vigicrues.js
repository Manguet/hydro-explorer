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
 * @param {Object} map - Instance Leaflet (non utilisé directement, passé pour cohérence)
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
      return niveau >= 2;
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
