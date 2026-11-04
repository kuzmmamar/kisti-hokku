// 書道 — офлайн-кэш. Версия считается из содержимого файлов при сборке.
const VERSION='shodo-f15875f5ef';
const FILES=["./", "index.html", "manifest.webmanifest", "icon-180.e06cbb18.png", "icon-192.9bb9c672.png", "icon-512.84b50d9e.png", "icon-maskable-512.c5ecdfaf.png", "ShipporiB1-500.woff", "ShipporiB1-700.woff", "YujiSyuku.woff", "../Golos.woff", "calli/04e16.webp", "calli/04ecf.webp", "calli/04f1a.webp", "calli/04f98.webp", "calli/05149.webp", "calli/0514e.webp", "calli/051ac.webp", "calli/053e4.webp", "calli/0547d.webp", "calli/0548c.webp", "calli/054c0.webp", "calli/0559c.webp", "calli/058a8.webp", "calli/058f0.webp", "calli/0590f.webp", "calli/0591c.webp", "calli/05922.webp", "calli/05929.webp", "calli/05b64.webp", "calli/05bc2.webp", "calli/05bd2.webp", "calli/05ca9.webp", "calli/05d50.webp", "calli/05de3.webp", "calli/05e74.webp", "calli/05e7d.webp", "calli/05eb5.webp", "calli/05f71.webp", "calli/05fc3.webp", "calli/05fcd.webp", "calli/0604b.webp", "calli/060b2.webp", "calli/0611b.webp", "calli/0611f.webp", "calli/061b6.webp", "calli/065e5.webp", "calli/0661f.webp", "calli/06625.webp", "calli/0663c.webp", "calli/06642.webp", "calli/066ae.webp", "calli/066f8.webp", "calli/06708.webp", "calli/0671d.webp", "calli/0671f.webp", "calli/0677e.webp", "calli/067af.webp", "calli/0685c.webp", "calli/06885.webp", "calli/06c34.webp", "calli/06c37.webp", "calli/06c38.webp", "calli/06d6e.webp", "calli/06d77.webp", "calli/06d99.webp", "calli/0706b.webp", "calli/070ba.webp", "calli/07121.webp", "calli/071b1.webp", "calli/07269.webp", "calli/07384.webp", "calli/077f3.webp", "calli/07985.webp", "calli/079cb.webp", "calli/07a7a.webp", "calli/07af9.webp", "calli/07b46.webp", "calli/07d19.webp", "calli/07e01.webp", "calli/07f8e.webp", "calli/0821f.webp", "calli/08272.webp", "calli/082b1.webp", "calli/082e5.webp", "calli/08336.webp", "calli/08349.webp", "calli/083ca.webp", "calli/08449.webp", "calli/0864e.webp", "calli/08de1.webp", "calli/09053.webp", "calli/09591.webp", "calli/09593.webp", "calli/096c5.webp", "calli/096e8.webp", "calli/096ea.webp", "calli/096f2.webp", "calli/096f7.webp", "calli/09727.webp", "calli/09732.webp", "calli/09759.webp", "calli/097f3.webp", "calli/098a8.webp", "calli/09999.webp", "calli/099ac.webp", "calli/09b5a.webp", "calli/09ce5.webp", "calli/09db4.webp", "calli/09ed9.webp", "calli/09f8d.webp"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('shodo-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url); if(url.origin!==location.origin)return;
  if(e.request.mode==='navigate'){
    // страница: из сети не дольше 2,5 с (чтобы получать обновления), иначе из кэша
    const net=fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(VERSION).then(c=>c.put('index.html',cp));}return r;});
    const cached=()=>caches.match('index.html',{ignoreSearch:true});
    e.respondWith(Promise.race([net,new Promise(res=>setTimeout(()=>res(null),2500))])
      .then(r=>r||cached().then(c=>c||net)).catch(()=>cached()));
    return;}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok){const cp=res.clone();caches.open(VERSION).then(c=>c.put(e.request,cp));}return res;})));
});
