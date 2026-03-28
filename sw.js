// ═══════════════════════════════════════════════════════════
// DRAGOS FUTBOL AKADEMİSİ — Service Worker v3.2
// v3.2: Statik dosyalar için network-first stratejisi — eski
//       cache kullanıcıya eski kod servis etmesini önler.
// ═══════════════════════════════════════════════════════════

const STATIC_CACHE = 'dragos-static-v13';
const API_CACHE = 'dragos-api-v13';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/error-handler.js',
    '/init.js',
    '/script.js',
    '/script-fixes.js',
    '/ui-improvements.js',
    '/Security.js',
    '/event-handlers.js',
    '/pwa-register.js',
    '/style.css',
    '/robots.txt',
    '/sitemap.xml',
    '/icons/icon.svg'
];

const CDN_HOSTNAMES = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'esm.sh',
    'cdn.skypack.dev',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(function(cache) {
            return cache.addAll(STATIC_ASSETS).catch(function(err) {
                console.warn('[SW] Cache addAll hatası:', err);
            });
        }).then(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(n) { return n !== STATIC_CACHE && n !== API_CACHE; })
                     .map(function(n) { return caches.delete(n); })
            );
        }).then(function() { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    if (url.hostname.includes('supabase.co')) {
        // Edge Function requests — let the browser handle them natively.
        // Service Worker interception of cross-origin Edge Function fetches
        // causes CORS preflight failures (OPTIONS requests lack JWT).
        if (url.pathname.indexOf('/functions/v1/') !== -1) {
            return;
        }

        // Hassas endpoint'leri ASLA cache'leme — doğrudan network'ten dön
        var sensitiveEndpoints = ['athletes', 'payments', 'coaches', 'settings', 'users', 'attendance', 'messages'];
        var isSensitive = sensitiveEndpoints.some(function(ep) {
            return url.pathname.includes(ep) || url.search.includes(ep);
        });
        if (isSensitive) {
            event.respondWith(fetch(event.request));
            return;
        }

        // Sadece public endpoint'leri (branches, orgs, sports, classes) cache'le
        event.respondWith(
            fetch(event.request.clone())
                .then(function(resp) {
                    if (resp.ok && event.request.method === 'GET') {
                        var clone = resp.clone();
                        caches.open(API_CACHE).then(function(c) { c.put(event.request, clone); });
                    }
                    return resp;
                })
                .catch(function() {
                    return caches.match(event.request).then(function(cached) {
                        return cached || new Response(JSON.stringify({ message: 'Bağlantı yok', code: 'OFFLINE' }), {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    });
                })
        );
        return;
    }

    // CDN requests — let the browser handle them natively.
    // Service Worker interception of cross-origin CDN fetches causes CORS
    // failures and can resolve respondWith() with undefined.
    if (CDN_HOSTNAMES.indexOf(url.hostname) !== -1) {
        return;
    }

    if (event.request.method === 'GET' && (
        url.pathname.endsWith('.js') || url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.html') || url.pathname === '/'
    )) {
        // Network-first: önce sunucudan çek (taze kod), hata varsa cache'den dön.
        // Cache-first kullanılmasın — deploy sonrası eski kod yüklenmesin.
        event.respondWith(
            fetch(event.request.clone()).then(function(resp) {
                if (resp.ok) {
                    var clone = resp.clone();
                    caches.open(STATIC_CACHE).then(function(cache) { cache.put(event.request, clone); });
                }
                return resp;
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    return cached || new Response('', { status: 503, statusText: 'Offline' });
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(event.request).catch(function() {
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html').then(function(page) {
                    return page || new Response('Çevrimdışı', {
                        status: 503,
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                });
            }
            return new Response('', { status: 503, statusText: 'Offline' });
        })
    );
});
