/**
 * Gestion du permalien par fragment URL (#code_station).
 * Permet de partager l'URL d'une station spécifique.
 */

/**
 * Met à jour le hash URL avec le code de la station sélectionnée.
 * Utilise replaceState pour ne pas polluer l'historique de navigation.
 * @param {string} codeStation
 */
export function setPermalink(codeStation) {
  if (history.replaceState) {
    history.replaceState(null, '', `#${codeStation}`);
  } else {
    location.hash = codeStation;
  }
}

/**
 * Efface le hash URL (quand le panneau est fermé).
 */
export function clearPermalink() {
  if (history.replaceState) {
    history.replaceState(null, '', location.pathname + location.search);
  } else {
    location.hash = '';
  }
}

/**
 * Retourne le code station présent dans le hash URL, ou null.
 * Valide le format : 1 à 20 caractères alphanumériques.
 * @returns {string|null}
 */
export function getPermalinkStation() {
  const hash = location.hash.slice(1); // enlever le '#'
  if (/^[A-Za-z0-9]{1,20}$/.test(hash)) return hash.toUpperCase();
  return null;
}
