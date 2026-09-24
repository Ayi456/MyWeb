/** Production only: the dev server's modules change too often to cache. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const register = () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is optional; the island still runs online.
    });
  // Wait for the first load so caching never competes with the scene.
  if (document.readyState === "complete") void register();
  else addEventListener("load", () => void register(), { once: true });
}
