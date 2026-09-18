/* HWS CREPE — Service Worker
   يخزّن المنيو محلياً فتفتح الزيارات التالية فوراً حتى دون إنترنت.
   عند نشر نسخة جديدة، غيّر رقم CACHE ليحدّث جميع الأجهزة. */
const CACHE = "hws-v2";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // الخطوط وواتساب تمر للشبكة مباشرة

  // المستند: الشبكة أولاً ليصل أي تحديث، ثم الذاكرة عند الانقطاع
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req)
        .then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // بقية الملفات: الذاكرة أولاً
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return res;
      }).catch(() => new Response("", { status: 504, statusText: "offline" }));
    })
  );
});
