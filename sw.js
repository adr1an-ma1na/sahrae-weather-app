/*
 * Sahrae Weather service worker.
 * Bump VERSION on every release so clients drop old caches.
 *
 * Strategy
 *  - App pages: network-first; on failure, the last cached copy of that page,
 *    else /offline.html.
 *  - /_next/static/* and /icons/*: cache-first (immutable, content-hashed).
 *  - /api/v1/* GET (public data only): network-first; on failure the last
 *    cached response is served with header X-Sahrae-Offline: 1. Each
 *    payload keeps its original provenance (fetchedAt/issuedAt), so the UI
 *    still shows how old the data is.
 *  - Never cached: /api/v1/me*, /api/v1/auth*, /api/v1/admin*, non-GET,
 *    third-party map tiles/imagery (size and licence).
 */
const VERSION = "v6-2026-10-20";
const STATIC = `atmo-static-${VERSION}`;
const PAGES = `atmo-pages-${VERSION}`;
const DATA = `atmo-data-${VERSION}`;
// Works at the site root (server build) and under a sub-path (GitHub Pages build).
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const at = (p) => BASE + p;
const OFFLINE_URL = at("/offline.html");
const MAX_DATA_ENTRIES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE_URL, at("/icons/icon-192.png"), at("/icons/icon-512.png")]))
      // The start page too, so reopening the installed app offline opens the app, not the offline card.
      .then(() => caches.open(PAGES).then((c) => c.add(at("/")).catch(() => {})))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("atmo-") && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function networkFirst(req, cacheName, { markOffline = false } = {}) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) {
      cache.put(req, res.clone());
      if (cacheName === DATA) trim(DATA, MAX_DATA_ENTRIES);
    }
    return res;
  } catch {
    const hit = await cache.match(req);
    if (!hit) throw new Error("offline and not cached");
    if (!markOffline) return hit;
    const headers = new Headers(hit.headers);
    headers.set("X-Sahrae-Offline", "1");
    return new Response(await hit.blob(), { status: hit.status, statusText: hit.statusText, headers });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // tiles, imagery: browser default

  const path = url.pathname.startsWith(BASE + "/") ? url.pathname.slice(BASE.length) : url.pathname;
  if (/^\/api\/v1\/(me|auth|admin)/.test(path)) return;

  if (path.startsWith("/_next/static/") || path.startsWith("/icons/") || path.startsWith("/maplibre/") || path.startsWith("/sqljs/")) {
    event.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (path.startsWith("/api/v1/")) {
    event.respondWith(
      networkFirst(req, DATA, { markOffline: true }).catch(
        () => new Response(JSON.stringify({ error: "You are offline and this data has not been cached yet." }), { status: 503, headers: { "Content-Type": "application/json" } }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      networkFirst(req, PAGES).catch(async () => (await caches.match(at("/"))) || (await caches.match(OFFLINE_URL)) || Response.error()),
    );
  }
});
