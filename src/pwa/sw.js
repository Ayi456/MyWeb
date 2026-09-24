// Offline shell for the post office. server/vite-pwa.ts prepends VERSION and
// PRECACHE at build time. The radio API and Vercel analytics stay online-only.
const CACHE = `spring-post-office-${VERSION}`;
const SHELL = "/";
const SHELL_PATHS = new Set(["/", "/index.html"]);
// On a slow link the cached island opens first; the network copy still lands.
const NAVIGATION_TIMEOUT = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          PRECACHE.map((url) => new Request(url, { cache: "no-cache" })),
        ),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("spring-post-office-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_vercel/")
  )
    return;
  if (request.mode === "navigate") {
    event.respondWith(navigate(event, url));
    return;
  }
  event.respondWith(asset(request));
});

async function navigate(event, url) {
  const cache = await caches.open(CACHE);
  const network = fetch(event.request).then(async (response) => {
    if (response.status === 200 && SHELL_PATHS.has(url.pathname))
      await cache.put(SHELL, response.clone());
    return response;
  });
  event.waitUntil(network.catch(() => undefined));
  const cached =
    SHELL_PATHS.has(url.pathname) &&
    (await cache.match(SHELL, { ignoreVary: true }));
  if (!cached) return network;
  return Promise.race([
    network.catch(() => cached),
    new Promise((resolve) =>
      setTimeout(() => resolve(cached), NAVIGATION_TIMEOUT),
    ),
  ]);
}

async function asset(request) {
  const cache = await caches.open(CACHE);
  // Module scripts carry an Origin header; servers answer with Vary: Origin,
  // which would miss the precached copy. Everything here is same-origin.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.status === 200 && response.type === "basic")
    await cache.put(request, response.clone());
  return response;
}
