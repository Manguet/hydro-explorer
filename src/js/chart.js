/**
 * Affiche ou met à jour le graphique Plotly dans `containerId`.
 * Plotly gère lui-même l'échappement de ses valeurs de données.
 *
 * @param {string} containerId    - ID de l'élément DOM hôte
 * @param {Array}  observations   - Tableau d'observations Hub'eau (trié desc)
 * @param {string} coursEauLabel  - Nom du cours d'eau pour le sous-titre
 */
export function renderChart(containerId, observations, coursEauLabel) {
  const el = document.getElementById(containerId);

  if (!observations || observations.length === 0) {
    Plotly.purge(containerId);
    el.textContent = 'Aucune donnée disponible pour cette station.';
    return;
  }

  // Les observations arrivent du plus récent au plus ancien → inverser pour l'axe X
  const sorted = [...observations].reverse();
  const dates = sorted.map(o => o.date_obs);
  const values = sorted.map(o => o.resultat_obs);

  const trace = {
    x: dates,
    y: values,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Hauteur (mm)',
    line: { color: '#0d6efd', width: 2 },
    marker: { size: 4, color: '#0d6efd' },
    hovertemplate: '%{x|%d/%m/%Y %H:%M}<br><b>%{y:.1f} mm</b><extra></extra>',
  };

  const layout = {
    annotations: coursEauLabel
      ? [{ text: coursEauLabel, showarrow: false, xref: 'paper', yref: 'paper', x: 0, y: 1.08, font: { size: 11, color: '#6c757d' } }]
      : [],
    xaxis: {
      type: 'date',
      tickformat: '%d/%m',
      showgrid: true,
      gridcolor: '#dee2e6',
    },
    yaxis: {
      title: { text: 'Hauteur (mm)', font: { size: 11 } },
      showgrid: true,
      gridcolor: '#dee2e6',
    },
    margin: { t: 36, r: 16, b: 48, l: 60 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'system-ui, sans-serif', size: 11 },
    showlegend: false,
    hovermode: 'closest',
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'select2d', 'lasso2d'],
    locale: 'fr',
    displaylogo: false,
  };

  Plotly.react(containerId, [trace], layout, config);
}

/**
 * Vide le graphique et libère la mémoire Plotly.
 * @param {string} containerId
 */
export function clearChart(containerId) {
  Plotly.purge(containerId);
}
