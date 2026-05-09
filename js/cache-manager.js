// cache-manager.js — CLASSIC SCRIPT (pas d'import/export)
// Importé par sw.js via importScripts(). Expose precacheTiles() globalement.

const CM_TILE_CACHE = 'hydro-tiles-v1';
const CM_IGN_BASE = 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM';
const CM_BBOX = { west: -5.5, east: 10.0, south: 41.0, north: 51.5 };
const CM_ZOOM_MIN = 3;
const CM_ZOOM_MAX = 8;
const CM_BATCH = 20; // tuiles par lot réseau

/** Convertit lat/lon en coordonnées de tuile XY pour un zoom donné. */
function latLonToTile(lat, lon, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/** Construit l'URL WMTS d'une tuile IGN. */
function tileUrl(z, x, y) {
  return `${CM_IGN_BASE}&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;
}

/** Calcule la liste de toutes les URLs de tuiles France zoom 3→8. */
function getAllTileUrls() {
  const urls = [];
  for (let z = CM_ZOOM_MIN; z <= CM_ZOOM_MAX; z++) {
    const min = latLonToTile(CM_BBOX.north, CM_BBOX.west, z);
    const max = latLonToTile(CM_BBOX.south, CM_BBOX.east, z);
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        urls.push(tileUrl(z, x, y));
      }
    }
  }
  return urls;
}

/**
 * Précache toutes les tuiles IGN France zoom 3→8 dans le Cache API.
 * Les tuiles déjà en cache sont ignorées. Les erreurs individuelles sont ignorées.
 * Traitement par lots de CM_BATCH pour ne pas saturer le réseau.
 */
async function precacheTiles() {
  const cache = await caches.open(CM_TILE_CACHE);
  const urls = getAllTileUrls();

  for (let i = 0; i < urls.length; i += CM_BATCH) {
    const batch = urls.slice(i, i + CM_BATCH);
    await Promise.allSettled(
      batch.map(async (url) => {
        const hit = await cache.match(url);
        if (hit) return; // déjà en cache
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      })
    );
  }
}
