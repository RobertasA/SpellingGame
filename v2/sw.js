/* Little Star Witch — offline support.
   Serves the game from a cache straight away and refreshes the cache in the
   background, so the game opens without a connection and updates itself the
   next time it is opened. */
const CACHE = "little-star-witch-v1";
const CORE = [
  "./", "index.html", "style.css", "icon.svg", "manifest.webmanifest",
  "lib/three.min.js",
  "js/words.js", "js/core.js", "js/engine.js", "js/models.js", "js/world.js", "js/game.js", "js/brew.js", "js/ui.js", "js/main.js",
  "fonts/fredoka-latin-500-normal.woff2", "fonts/fredoka-latin-600-normal.woff2", "fonts/fredoka-latin-700-normal.woff2",
  "fonts/andika-latin-400-normal.woff2", "fonts/andika-latin-700-normal.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // leave the music alone (browsers stream audio in pieces, which a cache cannot replay)
  if (req.method !== "GET" || url.origin !== location.origin || req.headers.has("range") || /\.(mp3|ogg)$/.test(url.pathname)) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    })
  );
});
