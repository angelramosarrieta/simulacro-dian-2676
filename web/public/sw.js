// Este dominio antes alojaba CENTRA, que instalaba un service worker en /sw.js.
// Esta versión lo desactiva: borra su caché, se da de baja y recarga las
// pestañas abiertas para que vean el sitio actual sin interferencias.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});
