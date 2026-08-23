/**
 * 兰轩在线平台 - Service Worker
 * 提供离线缓存和PWA支持
 */

const CACHE_NAME = 'lanxuan-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json'
];

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截 - 网络优先策略（API请求）/ 缓存优先策略（静态资源）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API请求：网络优先，失败时返回离线提示
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() =>
          new Response(
            JSON.stringify({ success: false, error: '网络不可用，请检查连接', offline: true }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        )
    );
    return;
  }

  // 静态资源：缓存优先，后台更新
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
