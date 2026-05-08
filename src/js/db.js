import { STATIONS_TTL_MS, OBSERVATIONS_TTL_MS } from './config.js';

const DB_NAME = 'hydro-explorer';
const DB_VERSION = 1;

/** Ouvre (ou crée) la base IndexedDB. Retourne une Promise<IDBDatabase>. */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('stations')) {
        db.createObjectStore('stations', { keyPath: 'code_station' });
      }
      if (!db.objectStoreNames.contains('observations')) {
        db.createObjectStore('observations', { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retourne toutes les stations depuis IDB si le cache est valide (< 24h).
 * Retourne null si absent, vide ou expiré.
 */
export async function getStations() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('stations', 'readonly');
      const req = tx.objectStore('stations').getAll();
      req.onsuccess = () => {
        const all = req.result;
        if (!all || all.length === 0) { db.close(); return resolve(null); }
        const cachedAt = all[0]?.cachedAt;
        if (!cachedAt || Date.now() - cachedAt > STATIONS_TTL_MS) { db.close(); return resolve(null); }
        // Retirer le champ cachedAt avant de renvoyer (l'app ne doit pas le voir)
        db.close();
        resolve(all.map(({ cachedAt: _, ...s }) => s));
      };
      req.onerror = () => { db.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

/**
 * Sauvegarde le tableau de stations en IDB avec timestamp courant.
 * @param {Array} stations - Tableau issu de fetchStations()
 */
export async function saveStations(stations) {
  try {
    const db = await openDB();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('stations', 'readwrite');
      const store = tx.objectStore('stations');
      store.clear();
      stations.forEach(s => store.put({ ...s, cachedAt: now }));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = (e) => { db.close(); reject(e.target.error); };
    });
  } catch {
    // Échec IDB non bloquant — l'app continue sans cache
  }
}

/**
 * Retourne les observations d'une station depuis IDB si valides (< 30min).
 * @param {string} codeStation
 * @param {number} days
 * @returns {Promise<Array|null>}
 */
export async function getObservations(codeStation, days) {
  try {
    const db = await openDB();
    const id = `${codeStation}-${days}`;
    return new Promise((resolve) => {
      const tx = db.transaction('observations', 'readonly');
      const req = tx.objectStore('observations').get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) { db.close(); return resolve(null); }
        if (Date.now() - record.cachedAt > OBSERVATIONS_TTL_MS) { db.close(); return resolve(null); }
        db.close();
        resolve(record.data);
      };
      req.onerror = () => { db.close(); resolve(null); };
    });
  } catch {
    return null;
  }
}

/**
 * Sauvegarde les observations d'une station en IDB.
 * @param {string} codeStation
 * @param {number} days
 * @param {Array} data - Tableau d'observations Hub'eau
 */
export async function saveObservations(codeStation, days, data) {
  try {
    const db = await openDB();
    const id = `${codeStation}-${days}`;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('observations', 'readwrite');
      tx.objectStore('observations').put({ id, data, cachedAt: Date.now() });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = (e) => { db.close(); reject(e.target.error); };
    });
  } catch {
    // Échec IDB non bloquant
  }
}
