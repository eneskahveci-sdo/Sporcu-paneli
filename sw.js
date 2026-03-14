// ═══════════════════════════════════════════════════════════
// DRAGOS FUTBOL AKADEMİSİ — Service Worker v3.1
// ═══════════════════════════════════════════════════════════

const STATIC_CACHE = 'dragos-static-v6';
const API_CACHE = 'dragos-api-v6';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/script.js',
    '/script-fixes.js',
    '/ui-improvements.js',
    '/Security.js',
    '/style.css'
];

const CDN_HOSTNAMES = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'esm.sh',
    'cdn.skypack.dev'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(function(cache) {
            return cache.addAll(STATIC_ASSETS).catch(function() {});
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
        event.respondWith(
            caches.open(STATIC_CACHE).then(function(cache) {
                return cache.match(event.request).then(function(cached) {
                    var fetchPromise = fetch(event.request.clone()).then(function(resp) {
                        if (resp.ok) cache.put(event.request, resp.clone());
                        return resp;
                    }).catch(function() {
                        return cached || new Response('', { status: 503, statusText: 'Offline' });
                    });
                    return cached || fetchPromise;
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

self.addEventListener('push', function(event) {
    if (!event.data) return;
    var data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || 'Dragos Akademi', {
            body: data.body || '',
            vibrate: [100, 50, 100],
            data: data.url || '/'
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data || '/'));
});
