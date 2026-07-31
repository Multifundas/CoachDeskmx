// Service Worker — placeholder Fase 1.
// La estrategia offline-first (precache del app shell + IndexedDB para
// mutaciones diferidas con last-write-wins) se implementa en fase posterior.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
