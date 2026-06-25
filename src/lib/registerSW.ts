/**
 * Registers the Ning Service Worker for PWA functionality.
 * Call this once at app startup (in main.tsx).
 */
export function registerSW() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[Ning] Service Worker registered:', registration.scope)

        // Check for updates on every page load
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — could show an update toast here
              console.log('[Ning] New version available. Refresh to update.')
            }
          })
        })
      })
      .catch((err) => {
        console.warn('[Ning] Service Worker registration failed:', err)
      })
  })
}
