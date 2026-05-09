/**
 * Gestion de la barre de recherche de stations.
 * La recherche porte sur libelle_station et code_station (insensible à la casse).
 */

let currentQuery = '';

/**
 * Initialise l'input de recherche.
 * @param {Function} onSearch - callback() déclenché à chaque frappe (debounced 200ms)
 */
export function initSearch(onSearch) {
  const input = document.getElementById('search-station');
  if (!input) return;

  let timer;
  input.addEventListener('input', () => {
    currentQuery = input.value.trim().toLowerCase();
    clearTimeout(timer);
    timer = setTimeout(onSearch, 200);

    const clearBtn = document.getElementById('btn-search-clear');
    if (clearBtn) clearBtn.hidden = currentQuery.length === 0;
  });

  document.getElementById('btn-search-clear')?.addEventListener('click', () => {
    input.value = '';
    currentQuery = '';
    const clearBtn = document.getElementById('btn-search-clear');
    if (clearBtn) clearBtn.hidden = true;
    onSearch();
    input.focus();
  });
}

/**
 * Retourne un prédicat de recherche texte.
 * @param {Map<string, Object>} stationMap - code_station → station
 * @returns {Function} (codeStation: string) => boolean
 */
export function getSearchPredicate(stationMap) {
  if (!currentQuery) return () => true;

  return (codeStation) => {
    const s = stationMap.get(codeStation);
    if (!s) return false;
    const name = (s.libelle_station || '').toLowerCase();
    const code = (s.code_station || '').toLowerCase();
    return name.includes(currentQuery) || code.includes(currentQuery);
  };
}
