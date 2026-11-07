// 仙武之體 PWA Service Worker：預先快取所有檔案，之後可離線遊玩。
// 更新遊戲時，把 CACHE 的版本號改掉，玩家下次開啟就會換新版。
// v0.2.2 起：主頁（index.html）改為「先連網、失敗才用快取」，之後改版更容易拿到新檔。
const CACHE = 'xianwu-v0.5-20261107h-180922';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './assets/xtl/final.jpg',
  './assets/bld/hall.webp',
  './assets/bld/altar.webp',
  './assets/bld/house.webp',
  './assets/bld/wudao.webp',
  './assets/bld/lianwu.webp',
  './assets/bld/library.webp',
  './assets/bld/alchemy.webp',
  './assets/bld/forge.webp',
  './assets/bld/cangku.webp',
  './assets/bld/shitang.webp',
  './assets/bld/lingtian.webp',
  './assets/bld/renwutang.webp',
  './assets/bld/zhifatang.webp',
  './assets/bld/waishitang.webp',
  './assets/bld/kuangchang.webp',
  './assets/bld/zongcang.webp',
  './assets/bld/juling.webp',
  './assets/bld/lingshou.webp',
  './assets/bld/chuangong.webp',
  './assets/bld/tianjietai.webp',
  './assets/bld/huanjingta.webp',
  './assets/bld/xianyuan.webp',
  './assets/bld/qingxinge.webp',
  './assets/bld/fuluge.webp',
  './assets/bld/gongfage.webp',
  './assets/bld/huzhen.webp',
  './assets/bld/yinglieci.webp',
  './assets/bld/laozu.webp',
  './assets/bld/lingmai.webp',
  './assets/bld/hall_m.webp',
  './assets/bld/altar_m.webp',
  './assets/bld/house_m.webp',
  './assets/bld/wudao_m.webp',
  './assets/bld/lianwu_m.webp',
  './assets/bld/library_m.webp',
  './assets/bld/alchemy_m.webp',
  './assets/bld/forge_m.webp',
  './assets/bld/cangku_m.webp',
  './assets/bld/shitang_m.webp',
  './assets/bld/lingtian_m.webp',
  './assets/bld/renwutang_m.webp',
  './assets/bld/zhifatang_m.webp',
  './assets/bld/waishitang_m.webp',
  './assets/bld/kuangchang_m.webp',
  './assets/bld/zongcang_m.webp',
  './assets/bld/juling_m.webp',
  './assets/bld/lingshou_m.webp',
  './assets/bld/chuangong_m.webp',
  './assets/bld/tianjietai_m.webp',
  './assets/bld/huanjingta_m.webp',
  './assets/bld/xianyuan_m.webp',
  './assets/bld/qingxinge_m.webp',
  './assets/bld/fuluge_m.webp',
  './assets/bld/gongfage_m.webp',
  './assets/bld/huzhen_m.webp',
  './assets/bld/yinglieci_m.webp',
  './assets/bld/laozu_m.webp',
  './assets/bld/lingmai_m.webp'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  // Cloud save/auth responses must never enter PWA cache (including across Google accounts).
  if (new URL(req.url).pathname.startsWith('/api/cloud/') || req.headers.has('Authorization')) return;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => Response.error()))
  );
});
