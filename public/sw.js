const CACHE_NAME = 'etar-offline-v10';
const ASSETS_TO_CACHE = [
  '/offline.html',
  '/js/offline_app.js',
  '/manifest.json',
  '/images/ETAR_H.png'
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
  // azt a Dexie.js / app logika kezeli
  const url = new URL(event.request.url);
  if (url.origin.includes('firestore.googleapis.com') || url.origin.includes('firebase')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache találat esetén visszatérünk vele
        if (response) {
          return response;
        }

        // Ha nincs a cache-ben, hálózati kérés
        return fetch(event.request).then(
          (response) => {
            // Ellenőrizzük, hogy a válasz megfelelő-e cachelésre
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // A dinamikus fájlok (pl letöltött jegyzőkönyvek) mentése
            // Ezt klónozni kell, mert a response egy stream, amit csak egyszer lehet olvasni
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Csak az etar alatti fájlokat cacheljük dinamikusan, hogy ne szemeteljük tele
                if (event.request.url.includes(self.location.origin)) {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      }).catch(() => {
          // Ha offline vagyunk és egy olyan HTML fájlt kért, ami nincs cache-ben, visszaadjuk az offline.html-t (fallback)
          if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
          }
      })
  );
});

// Üzenet fogadása a kliens felől (pl. külső adatok manuális cache-elésére)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_URLS') {
        const urls = event.data.payload;
        event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
                console.log('[Service Worker] Dinamikus cikkek gyorsítótárazása...');
                return cache.addAll(urls);
            })
        );
    }
});
