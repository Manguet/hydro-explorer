import { API_HYDRO_BASE, STATIONS_FIELDS } from './config.js';

/**
 * Récupère toutes les stations hydrométriques actives de France.
 * @returns {Promise<Array>} Tableau de stations Hub'eau
 */
export async function fetchStations() {
  const url = new URL(`${API_HYDRO_BASE}/referentiel/stations`);
  url.searchParams.set('en_service', 'true');
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', '5000');
  url.searchParams.set('fields', STATIONS_FIELDS);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau stations : ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  // Garder uniquement les stations avec coordonnées valides
  return json.data.filter(
    s => s.longitude_station !== null && s.latitude_station !== null
  );
}

/**
 * Récupère les observations de hauteur d'eau pour une station sur N jours.
 * @param {string} codeStation - Code Hub'eau de la station (10 car.)
 * @param {number} days - Nombre de jours à récupérer (défaut : 30)
 * @returns {Promise<Array>} Observations triées du plus récent au plus ancien
 */
export async function fetchObservations(codeStation, days = 30) {
  const url = new URL(`${API_HYDRO_BASE}/observations_tr`);
  url.searchParams.set('code_entite', codeStation);
  url.searchParams.set('grandeur_hydro', 'H');
  url.searchParams.set('size', String(days * 24 * 2)); // max 2 obs/h
  url.searchParams.set('sort', 'desc');

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - days);
  // Format ISO sans millisecondes (attendu par l'API)
  url.searchParams.set('date_debut_obs', dateDebut.toISOString().slice(0, 19));

  const response = await fetch(url.toString());
  // 404 = aucune observation trouvée pour cette station/période (résultat vide, pas une erreur)
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau observations : ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  return json.data;
}

/**
 * Récupère les observations de débit (Q) pour une station sur N jours.
 * Identique à fetchObservations mais avec grandeur_hydro=Q.
 * @param {string} codeStation
 * @param {number} days
 * @returns {Promise<Array>}
 */
export async function fetchObservationsDebit(codeStation, days = 30) {
  const url = new URL(`${API_HYDRO_BASE}/observations_tr`);
  url.searchParams.set('code_entite', codeStation);
  url.searchParams.set('grandeur_hydro', 'Q');
  url.searchParams.set('size', String(days * 24 * 2));
  url.searchParams.set('sort', 'desc');

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - days);
  url.searchParams.set('date_debut_obs', dateDebut.toISOString().slice(0, 19));

  const response = await fetch(url.toString());
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau débit : ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  return json.data;
}

/**
 * Détermine l'état d'une station à partir de ses dernières observations.
 * Logique simplifiée (pour démo) :
 *  - inactive  : aucune observation
 *  - vigilance : dernière observation entre 2h et 24h
 *  - normal    : dernière observation < 2h
 *
 * @param {Array} observations - Résultat de fetchObservations (trié desc)
 * @returns {'normal'|'vigilance'|'inactive'}
 */
export function computeStationStatus(observations) {
  if (!observations || observations.length === 0) return 'inactive';
  const ageMs = Date.now() - new Date(observations[0].date_obs).getTime();
  const ageHours = ageMs / 3_600_000;
  if (ageHours > 24) return 'inactive';
  if (ageHours > 2) return 'vigilance';
  return 'normal';
}

const API_PIEZO_BASE = 'https://hubeau.eaufrance.fr/api/v1/niveaux_nappes';

/**
 * Récupère les stations piézométriques actives (nappes souterraines).
 * @returns {Promise<Array>}
 */
export async function fetchPiezometryStations() {
  const url = new URL(`${API_PIEZO_BASE}/stations`);
  url.searchParams.set('format', 'json');
  url.searchParams.set('size', '3000');
  url.searchParams.set('fields', 'code_bss,nom_commune,x,y,altitude_station,profondeur_investigation');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur Hub'eau piézométrie : ${response.status}`);
  }
  const json = await response.json();
  return json.data.filter(s => s.x !== null && s.y !== null);
}
