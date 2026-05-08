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

// Centre France et zoom initial
export const MAP_CENTER = [46.5, 1.7];
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
