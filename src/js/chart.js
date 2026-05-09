/**
 * Affiche ou met à jour le graphique Plotly.
 * @param {string} containerId
 * @param {Array}  observations      - Observations hauteur H (trié desc)
 * @param {string} coursEauLabel     - Nom du cours d'eau
 * @param {Array}  [observationsQ]   - Observations débit Q (trié desc), optionnel
 */
export function renderChart(containerId, observations, coursEauLabel, observationsQ = null) {
  const el = document.getElementById(containerId);

  if (!observations || observations.length === 0) {
    Plotly.purge(containerId);
    el.textContent = 'Aucune donnée disponible pour cette station.';
    return;
  }

  const sorted = [...observations].reverse();
  const dates = sorted.map(o => o.date_obs);
  const values = sorted.map(o => o.resultat_obs);

  const traces = [{
    x: dates,
    y: values,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Hauteur (mm)',
    yaxis: 'y',
    line: { color: '#0d6efd', width: 2 },
    marker: { size: 4, color: '#0d6efd' },
    hovertemplate: '%{x|%d/%m/%Y %H:%M}<br><b>%{y:.1f} mm</b><extra></extra>',
  }];

  const layout = {
    annotations: coursEauLabel
      ? [{ text: coursEauLabel, showarrow: false, xref: 'paper', yref: 'paper', x: 0, y: 1.08, font: { size: 11, color: '#5a6270' } }]
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

  if (observationsQ && observationsQ.length > 0) {
    const sortedQ = [...observationsQ].reverse();
    traces.push({
      x: sortedQ.map(o => o.date_obs),
      y: sortedQ.map(o => o.resultat_obs),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Débit (m³/s)',
      yaxis: 'y2',
      line: { color: '#e67e22', width: 2, dash: 'dot' },
      marker: { size: 4, color: '#e67e22' },
      hovertemplate: '%{x|%d/%m/%Y %H:%M}<br><b>%{y:.2f} m³/s</b><extra></extra>',
    });
    layout.yaxis2 = {
      title: { text: 'Débit (m³/s)', font: { size: 11 } },
      overlaying: 'y',
      side: 'right',
      showgrid: false,
    };
    layout.showlegend = true;
    layout.margin.r = 70;
  }

  const config = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'select2d', 'lasso2d'],
    locale: 'fr',
    displaylogo: false,
  };

  Plotly.react(containerId, traces, layout, config);

  // Statistiques
  const statsEl = document.getElementById('chart-stats');
  if (statsEl) {
    const nums = values.filter(v => v != null && !isNaN(v));
    if (nums.length > 0) {
      const min = nums.reduce((a, b) => (b < a ? b : a), nums[0]);
      const max = nums.reduce((a, b) => (b > a ? b : a), nums[0]);
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      statsEl.hidden = false;
      statsEl.textContent = '';
      const parts = [
        { label: 'Min', value: `${min.toFixed(1)} mm` },
        { label: 'Max', value: `${max.toFixed(1)} mm` },
        { label: 'Moy.', value: `${avg.toFixed(1)} mm` },
      ];
      parts.forEach(({ label, value }) => {
        const span = document.createElement('span');
        span.className = 'he-chart-stats__item';
        const strong = document.createElement('strong');
        strong.textContent = label;
        span.appendChild(strong);
        span.appendChild(document.createTextNode(` ${value}`));
        statsEl.appendChild(span);
      });
    } else {
      statsEl.hidden = true;
    }
  }
}

/**
 * Vide le graphique et libère la mémoire Plotly.
 * @param {string} containerId
 */
export function clearChart(containerId) {
  Plotly.purge(containerId);
  const statsEl = document.getElementById('chart-stats');
  if (statsEl) { statsEl.hidden = true; statsEl.textContent = ''; }
}
