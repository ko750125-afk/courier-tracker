const CACHE_NAME = 'courier-tracker-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting(); // 즉시 새 워커 활성화
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/']);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName); // 과거 캐시 즉각 삭제
                    }
                })
            );
        }).then(() => self.clients.claim()) // 모든 열린 탭 제어권 즉각 획득
    );
});

self.addEventListener('fetch', (event) => {
    // 1. 네트워크 통신을 우선 시도 (Network-First)
    // 2. 오프라인이거나 실패 시에만 캐시된 데이터 반환
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
