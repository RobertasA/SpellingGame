/* Little Star Witch — offline support.
   Serves the game from a cache straight away and refreshes the cache in the
   background, so the game opens without a connection and updates itself the
   next time it is opened. */
const CACHE = "little-star-witch-v11";
const CORE = [
  "./", "index.html", "style.css", "icon.svg", "manifest.webmanifest",
  "record.html", "record.css", "js/record.js",
  "lib/three.min.js",
  "voice/manifest.js",
  "js/words.js", "js/core.js", "js/voice.js", "js/textures.js", "js/engine.js", "js/models.js", "js/world.js", "js/game.js", "js/brew.js", "js/ui.js", "js/main.js",
  "fonts/fredoka-latin-500-normal.woff2", "fonts/fredoka-latin-600-normal.woff2", "fonts/fredoka-latin-700-normal.woff2",
  "fonts/andika-latin-400-normal.woff2", "fonts/andika-latin-700-normal.woff2",
];

self.addEventListener("install", (e) => {
  // "reload" goes past the browser's own cache: otherwise a new version could be stored as a mix of new and old files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});
/* Recorded voice clips are small, so each is kept whole and the piece the audio player
   asks for is cut out of it here — that way the recordings work offline too. */
async function clip(req) {
  const cache = await caches.open(CACHE);
  let full = await cache.match(req.url);
  if (full) fetch(req.url, { cache: "no-cache" }).then(res => { if (res.status === 200) cache.put(req.url, res); }).catch(() => { /* offline */ });
  else {
    full = await fetch(req.url);
    if (full.status !== 200) return full;
    cache.put(req.url, full.clone());
  }
  const range = /bytes=(\d+)-(\d*)/.exec(req.headers.get("range") || "");
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const start = Math.min(+range[1], buf.byteLength - 1);
  const end = range[2] ? Math.min(+range[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": full.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === "GET" && url.origin === location.origin && /\/voice\/.+\.(mp3|m4a|ogg|wav|webm)$/.test(url.pathname)) {
    e.respondWith(clip(req));
    return;
  }
  // leave the music alone (browsers stream audio in pieces, which a cache cannot replay)
  if (req.method !== "GET" || url.origin !== location.origin || req.headers.has("range") || /\.(mp3|m4a|ogg|wav|webm)$/.test(url.pathname)) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      const fresh = fetch(req.url, { cache: "no-cache" }).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    })
  );
});
