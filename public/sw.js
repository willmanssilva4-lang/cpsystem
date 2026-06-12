const CACHE_NAME = 'cpsystem-erp-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/vendas/historico',
  '/vendas/auditoria',
  '/pdv',
  '/produtos',
  '/financeiro'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use to cache the fallback resources
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Pre-cache warning (some pages require login or session):', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheKeys) => {
      return Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      ).then(() => self.clients.claim());
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests of local origin
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip intercepting standard dynamic API calls (Supabase logins/queries) so they are always direct
  if (event.request.url.includes('/api/') || event.request.url.includes('/rest/v1/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Direct response for static or successful pages
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache during offline status
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If a page cannot be found offline, return standard offline response
          if (event.request.mode === 'navigate') {
            return caches.match('/').then((homeResponse) => {
              if (homeResponse) return homeResponse;
              return new Response(
                '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>CPSystem - Sem Conexão</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#fff}h1{color:#00E676}p{color:#94a3b8}button{background:#1e40af;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:bold;cursor:pointer}</style></head><body><h1>Conectividade Offline</h1><p>O CPSystem ERP requer conexão ativa com a internet prontas para sincronizar com o banco de dados principal. Por favor, verifique sua conexão.</p><button onclick="window.location.reload()">Pre-carregar novamente</button></body></html>',
                {
                  status: 200,
                  headers: { 'Content-Type': 'text/html; charset=utf-8' }
                }
              );
            });
          }
          
          return new Response('Internet indisponível no momento.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
