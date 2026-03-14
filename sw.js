// ═══════════════════════════════════════════════════════════
// DRAGOS FUTBOL AKADEMİSİ — Service Worker v3.0
// ═══════════════════════════════════════════════════════════

const STATIC_CACHE = 'dragos-static-v3';
const API_CACHE = 'dragos-api-v3';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/script.js',
    '/script-fixes.js',
    '/ui-improvements.js',
    '/Security.js',
    '/style.css'
];

const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(function(cache) {
            var cdnPromises = CDN_ASSETS.map(function(url) {
                return fetch(url, { mode: 'cors' })
                    .then(function(resp) { if (resp.ok) return cache.put(url, resp); })
                    .catch(function() {});
            });
            return Promise.all([
                cache.addAll(STATIC_ASSETS).catch(function() {}),
                ...cdnPromises
            ]);
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
                    }).catch(function() { return cached; });
                    return cached || fetchPromise;
                });
            })
        );
        return;
    }

    if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'unpkg.com') {
        event.respondWith(
            fetch(event.request.clone()).then(function(resp) {
                if (resp.ok) {
                    var clone = resp.clone();
                    caches.open(STATIC_CACHE).then(function(c) { c.put(event.request, clone); });
                }
                return resp;
            }).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    return cached || new Response('', { status: 503, statusText: 'CDN Unavailable' });
                });
            })
        );
        return;
    }

    event.respondWith(
        fetch(event.request).catch(function() {
            if (event.request.mode === 'navigate') return caches.match('/index.html');
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
