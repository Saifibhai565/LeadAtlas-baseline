// Minimal service worker: makes the app installable on phones and desktops.
// It doesn't cache pages, so you always see fresh data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
