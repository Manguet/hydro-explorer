/**
 * Génère et déclenche le téléchargement d'un fichier CSV des stations visibles.
 * @param {Array}                stations          - Stations actuellement affichées
 * @param {Map<string, Array>}   observationsCache - code_station → observations
 */
export function exportCSV(stations, observationsCache) {
  const rows = [[
    'Code station', 'Nom', "Cours d'eau",
    'Département', 'Type',
    'Dernière observation', 'Hauteur (mm)', 'Statut',
  ]];

  stations.forEach(station => {
    const obs = observationsCache.get(station.code_station) || [];
    const latest = obs[0];
    rows.push([
      station.code_station || '',
      station.libelle_station || '',
      station.libelle_cours_eau || '',
      station.libelle_departement || '',
      station.type_station || '',
      latest ? latest.date_obs : '',
      latest != null ? String(latest.resultat_obs) : '',
      resolveStatusLabel(obs),
    ]);
  });

  const csv = rows.map(row => row.map(escapeCsvCell).join(';')).join('\r\n');
  triggerDownload(csv, `hydro-explorer-${todayISO()}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Échappe une cellule CSV (RFC 4180).
 * @param {string} value
 */
function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Déclenche le téléchargement d'un contenu texte.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
function triggerDownload(content, filename, mimeType) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType }); // BOM UTF-8 pour Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Retourne un label d'état lisible à partir d'un tableau d'observations.
 * @param {Array} observations
 * @returns {string}
 */
function resolveStatusLabel(observations) {
  if (!observations || observations.length === 0) return 'Inactif';
  const ageH = (Date.now() - new Date(observations[0].date_obs).getTime()) / 3_600_000;
  if (ageH > 24) return 'Inactif';
  if (ageH > 2) return 'Vigilance';
  return 'Normal';
}

/**
 * Retourne la date du jour au format YYYY-MM-DD.
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
