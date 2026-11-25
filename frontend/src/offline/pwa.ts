/** Registers the service worker so Teguwaz opens without a connection and can be installed on a phone. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker not registered', e));
  });
}

/** Removes cached memories from this device, e.g. on sign-out. */
export async function clearOfflineData() {
  navigator.serviceWorker?.controller?.postMessage('clear-data');
  try { indexedDB.deleteDatabase('teguwaz-offline'); } catch { /* ignore */ }
  try { localStorage.removeItem(LAST_USER_KEY); } catch { /* ignore */ }
}

export const LAST_USER_KEY = 'teguwaz.lastUser';
