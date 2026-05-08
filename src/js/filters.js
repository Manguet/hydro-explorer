/**
 * Initialise le panneau de filtres à partir du tableau de stations.
 * @param {Array}    stations       - Toutes les stations chargées
 * @param {Function} onFilterChange - callback() déclenché à chaque changement
 */
export function initFilters(stations, onFilterChange) {
  populateDepartmentSelect(stations);
  populateTypeSelect(stations);

  ['filter-department', 'filter-type', 'filter-period'].forEach(id => {
    document.getElementById(id).addEventListener('change', onFilterChange);
  });

  document.getElementById('btn-reset-filters').addEventListener('click', () => {
    resetFilters();
    onFilterChange();
  });
}

/**
 * Remplit la liste déroulante des départements.
 * Utilise textContent (pas innerHTML) pour les options.
 * @param {Array} stations
 */
function populateDepartmentSelect(stations) {
  const select = document.getElementById('filter-department');
  const departments = new Map(); // code → libelle

  stations.forEach(s => {
    if (s.code_departement && s.libelle_departement && !departments.has(s.code_departement)) {
      departments.set(s.code_departement, s.libelle_departement);
    }
  });

  Array.from(departments.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([code, label]) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = `${code} — ${label}`;
      select.appendChild(opt);
    });
}

/**
 * Remplit la liste déroulante des types de station.
 * @param {Array} stations
 */
function populateTypeSelect(stations) {
  const select = document.getElementById('filter-type');
  const types = new Set(stations.map(s => s.type_station).filter(Boolean));

  Array.from(types)
    .sort()
    .forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.textContent = type;
      select.appendChild(opt);
    });
}

/**
 * Retourne la valeur courante des filtres.
 * @returns {{ department: string, type: string, periodDays: number }}
 */
export function getFilterValues() {
  return {
    department: document.getElementById('filter-department').value,
    type: document.getElementById('filter-type').value,
    periodDays: parseInt(document.getElementById('filter-period').value, 10),
  };
}

/**
 * Retourne un prédicat de filtrage basé sur les valeurs UI courantes.
 * @param {Map<string, Object>} stationMap - code_station → station
 * @returns {Function} (codeStation: string) => boolean
 */
export function buildFilterPredicate(stationMap) {
  const { department, type } = getFilterValues();

  return (codeStation) => {
    const station = stationMap.get(codeStation);
    if (!station) return false;
    if (department && station.code_departement !== department) return false;
    if (type && station.type_station !== type) return false;
    return true;
  };
}

/**
 * Réinitialise tous les filtres à leur valeur par défaut.
 */
function resetFilters() {
  document.getElementById('filter-department').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-period').value = '30';
}

/**
 * Bascule la visibilité du panneau de filtres.
 * RGAA 7.x — Gestion du focus : à l'ouverture, le focus est déplacé vers
 * le premier élément interactif du panneau (le premier select). À la fermeture,
 * le focus revient sur le bouton déclencheur.
 */
export function toggleFiltersPanel() {
  const panel = document.getElementById('panel-filters');
  const btn = document.getElementById('btn-filters');
  const isHidden = panel.hidden;
  panel.hidden = !isHidden;
  btn.setAttribute('aria-expanded', String(isHidden));

  if (isHidden) {
    // Ouverture : déplacer le focus vers le premier champ du panneau
    const firstFocusable = panel.querySelector('select, button, input');
    if (firstFocusable) firstFocusable.focus();
  } else {
    // Fermeture : renvoyer le focus vers le bouton déclencheur
    btn.focus();
  }
}
