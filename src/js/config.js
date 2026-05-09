// URLs API Hub'eau
export const API_HYDRO_BASE = 'https://hubeau.eaufrance.fr/api/v2/hydrometrie';

// Couches de fond de carte (basemaps) — IGN Géoplateforme + OSM
const _IGN = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';
const _IGN_ATTR = '&copy; <a href="https://www.ign.fr">IGN</a> G&eacute;oplateforme';

export const MAP_BASEMAPS = {
  'Plan IGN': {
    url: `${_IGN}&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png`,
    options: { attribution: _IGN_ATTR, minZoom: 3, maxZoom: 18 },
    default: true,
  },
  'Orthophotos': {
    url: `${_IGN}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg`,
    options: { attribution: _IGN_ATTR, minZoom: 3, maxZoom: 20 },
  },
  'OpenStreetMap': {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', minZoom: 3, maxZoom: 19 },
  },
};

export const MAP_OVERLAYS = {
  'Réseau hydrographique': {
    url: `${_IGN}&LAYER=HYDROGRAPHY.HYDROGRAPHY&STYLE=normal&FORMAT=image/png`,
    options: { attribution: _IGN_ATTR, opacity: 0.7, minZoom: 3, maxZoom: 18 },
  },
};

// Rétrocompatibilité cache-manager.js (classic script, ne peut pas importer)
export const IGN_TILES_URL = MAP_BASEMAPS['Plan IGN'].url;
export const IGN_ATTRIBUTION = _IGN_ATTR;

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

// Champs demandés à l'API stations (réduit la taille de réponse)
export const STATIONS_FIELDS = [
  'code_station',
  'libelle_station',
  'longitude_station',
  'latitude_station',
  'libelle_departement',
  'code_departement',
  'libelle_cours_eau',
  'type_station',
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
