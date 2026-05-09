/**
 * Échappe les caractères HTML spéciaux d'une chaîne.
 * À utiliser sur toute donnée externe avant injection dans innerHTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formate une date ISO en date française lisible.
 * @param {string} isoString - ex: "2026-05-08T14:30:00Z"
 * @returns {string} - ex: "08/05/2026 14:30"
 */
export function formatDateFr(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
