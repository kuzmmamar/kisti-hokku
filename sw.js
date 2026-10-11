// Кисть и хокку — офлайн-кэш. Меняйте VERSION при каждом обновлении файлов.
const VERSION='kisti-v39';
const FILES=["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "Golos.woff", "KleeOne-400.woff", "KleeOne-600.woff", "Shippori-500.woff", "Shippori-700.woff", "YujiSyuku.woff"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url); if(url.origin!==location.origin)return;
  if(e.request.mode==='navigate'){
    // страница: из сети не дольше 2,5 с (чтобы получать обновления), иначе сразу из кэша
    const net=fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(VERSION).then(c=>c.put('index.html',cp));}return r;});
    const cached=()=>caches.match('index.html',{ignoreSearch:true});
    e.respondWith(Promise.race([net,new Promise(res=>setTimeout(()=>res(null),2500))])
      .then(r=>r||cached().then(c=>c||net)).catch(()=>cached()));
    return;}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(e.request,cp));}return res;})));
});
