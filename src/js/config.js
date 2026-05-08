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

// Centre et zoom initial — centré sur Parthenay (Deux-Sèvres), zoom 6 pour voir les 3/4 de la France
export const MAP_CENTER = [46.648, -0.247];
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

// ===== Cache & PWA =====
export const CACHE_SHELL_NAME = 'hydro-shell-v2';
export const CACHE_TILES_NAME = 'hydro-tiles-v1';
export const STATIONS_TTL_MS = 24 * 3_600_000;      // 24 heures
export const OBSERVATIONS_TTL_MS = 30 * 60_000;     // 30 minutes
export const TILE_ZOOM_MIN = 3;
export const TILE_ZOOM_MAX = 8;
// Bounding box France métropolitaine pour le précache des tuiles
export const FRANCE_BBOX = { west: -5.5, east: 10.0, south: 41.0, north: 51.5 };
