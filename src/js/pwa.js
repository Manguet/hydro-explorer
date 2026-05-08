// pwa.js — Gestion install prompt et statut réseau

const INSTALL_DISMISSED_KEY = 'hydro-pwa-dismissed';
const LAST_SYNC_KEY = 'hydro-last-sync';

let deferredPrompt = null;

// ===== Enregistrement du Service Worker =====
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('[PWA] Service Worker enregistré'))
    .catch((err) => console.warn('[PWA] Enregistrement SW échoué :', err));
}

// ===== Install Prompt =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Ne pas afficher si déjà refusé définitivement
  if (!localStorage.getItem(INSTALL_DISMISSED_KEY)) {
    showInstallBanner();
  }
});

function showInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (!banner) return;
  // Ne pas afficher si refusé pour cette session
  if (sessionStorage.getItem('hydro-pwa-session-dismissed')) return;
  banner.hidden = false;
}

// Bouton "Installer"
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-install-now')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    document.getElementById('pwa-install-banner').hidden = true;
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    }
  });

  // Bouton "Plus tard"
  document.getElementById('btn-install-later')?.addEventListener('click', () => {
    document.getElementById('pwa-install-banner').hidden = true;
    sessionStorage.setItem('hydro-pwa-session-dismissed', '1');
  });

  // Statut réseau initial
  updateOfflineBadge();
});

// ===== Statut réseau =====
function updateOfflineBadge() {
  const badge = document.getElementById('offline-badge');
  const dateEl = document.getElementById('offline-date');
  if (!badge) return;

  if (!navigator.onLine) {
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (dateEl && lastSync) {
      dateEl.textContent = new Date(parseInt(lastSync, 10)).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
    badge.hidden = false;
  } else {
    badge.hidden = true;
    // Mettre à jour l'horodatage du dernier sync réussi
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  }
}

window.addEventListener('online', updateOfflineBadge);
window.addEventListener('offline', updateOfflineBadge);

/** Appelée par app.js après chaque fetch Hub'eau réussi pour mettre à jour le timestamp. */
export function markSynced() {
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
}
