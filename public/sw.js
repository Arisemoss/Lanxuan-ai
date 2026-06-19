/**
 * 兰轩 - Service Worker
 * 缓存静态资源，实现离线访问
 */

const CACHE_NAME = 'lanxuan-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js'
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 拦截请求：优先网络，回退缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 仅处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // API 请求使用网络优先策略
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 静态资源使用缓存优先策略
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // 后台更新缓存
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // 离线时，如果是 HTML 请求返回缓存的首页
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
    })
  );
});
