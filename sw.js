// Кисть и хокку — офлайн-кэш. Меняйте VERSION при каждом обновлении файлов.
const VERSION='kisti-v25';
const FILES=["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "Golos.woff", "KleeOne-400.woff", "KleeOne-600.woff", "Shippori-500.woff", "Shippori-700.woff", "YujiSyuku.woff"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url); if(url.origin!==location.origin)return;
  if(e.request.mode==='navigate'){
    // страница: сначала сеть (чтобы получать обновления), без сети — из кэша
    e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put('index.html',cp));return r;})
      .catch(()=>caches.match('index.html',{ignoreSearch:true})));
    return;}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(e.request,cp));}return res;})));
});
