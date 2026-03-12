const CACHE_NAME = 'etar-cache-v3.0.3';
const ASSETS_TO_CACHE = [
  '/offline.html',
  '/js/offline_app.js',
  '/manifest.json',
  '/images/ETAR_H.png',
  'https://unpkg.com/html5-qrcode'
];

// Telepítés során a statikus fájlok cachelése
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching offline assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Aktiválás során a régi cache-ek törlése
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Törlöm a régi cache-t', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Hálózati kérések elfogása (Network-First stratégia a dynamikus adatoknál, Cache-First a statikusaknál)
self.addEventListener('fetch', (event) => {
  // Ha nem GET kérés, hagyjuk békén
  if (event.request.method !== 'GET') return;

  // A Firebase Firestore / API hívásokat nem cacheljük a service workerrel, 
  // azt a Dexie.js / app logika kezeli. Kivételt képeznek a fájl letöltések (storage).
  const url = new URL(event.request.url);
  if ((url.origin.includes('firestore.googleapis.com') || url.origin.includes('firebase')) && !url.origin.includes('firebasestorage.googleapis.com')) {
      return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Ellenőrizzük, hogy a válasz megfelelő-e cachelésre
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // A dinamikus fájlok (pl letöltött jegyzőkönyvek, js, html) mentése klónozva
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.url.includes(self.location.origin) || 
              event.request.url.includes('firebasestorage.googleapis.com') ||
              event.request.url.includes('unpkg.com') ||
              event.request.url.includes('cdn.jsdelivr.net') ||
              event.request.url.includes('kit.fontawesome.com')) {
              cache.put(event.request, responseToCache);
          }
        });

        return response; // Elsődlegesen a friss hálózati választ adjuk vissza!
      })
      .catch(() => {
        // Ha offline vagyunk (sikertelen hálózati kérés), próbáljuk a cache-t
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Ha offline vagyunk és egy olyan HTML fájlt kért, ami nincs cache-ben, visszaadjuk az offline.html-t (fallback)
          if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
          }
        });
      })
  );
});

// Üzenet fogadása a kliens felől (pl. külső adatok manuális cache-elésére)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_URLS') {
        const urls = event.data.urls || event.data.payload; // partner.js sends 'urls', old code expected 'payload'
        if (urls && urls.length > 0) {
            event.waitUntil(
                caches.open(CACHE_NAME).then(async (cache) => {
                    console.log(`[Service Worker] ${urls.length} db dinamikus fájl letöltése és gyorsítótárazása indult...`);
                    
                    let successCount = 0;
                    let failCount = 0;
                    
                    // Promise.allSettled helyett sima ciklus fetch-el, hogy mindegyik külön bekerüljön
                    for (const url of urls) {
                        try {
                            // A no-cors mód fontos lehet külső domain-eknél, pl. firebasestorage
                            const _url = new URL(url);
                            let reqMode = 'cors';
                            if (_url.origin !== self.location.origin) {
                                reqMode = 'no-cors';
                            }
                            
                            const response = await fetch(url, { mode: reqMode });
                            // no-cors esetén a status 0 (opáke).
                            if (response.ok || response.type === 'opaque') {
                                await cache.put(url, response);
                                successCount++;
                            } else {
                                console.warn(`[Service Worker] Nem sikerült cache-elni (${response.status}):`, url);
                                failCount++;
                            }
                        } catch (err) {
                            console.warn(`[Service Worker] Hálózati hiba a cache-elés során:`, url, err);
                            failCount++;
                        }
                    }
                    
                    console.log(`[Service Worker] Cache-elés kész: ${successCount} sikeres, ${failCount} sikertelen.`);
                })
            );
        }
    }
});
