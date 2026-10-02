const SHELL='wordlight-shell-v1',AUDIO='wordlight-audio-v1';
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const response=await fetch('/offline-assets.json',{cache:'no-store'});if(!response.ok)throw Error('Offline assets unavailable');const {assets,version}=await response.json();const cache=await caches.open(SHELL);
 const urls=['/','/manifest.webmanifest','/icon-192.png','/icon-512.png','/vocab.json','/philosophy.json','/audio-manifest.json','/sources.json','/ECDICT-LICENSE.txt',...assets];
 await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'reload'});if(!r.ok||r.redirected)throw Error('Cannot cache '+url);await cache.put(url,r)}));
 await cache.put('/offline-ready',new Response(version));await self.skipWaiting();
})())});
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const c of await self.clients.matchAll())c.postMessage({type:'OFFLINE_READY'})})()));
self.addEventListener('fetch',event=>{
 const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/sw.js'||url.pathname==='/offline-assets.json'||url.pathname.includes('signin')||url.pathname.includes('signout')||url.pathname==='/callback')return;
 if(url.pathname.startsWith('/audio/')){event.respondWith((async()=>{const cache=await caches.open(AUDIO);const cached=await cache.match(url.pathname);if(cached)return cached;const r=await fetch(req);if(r.ok&&/audio|octet/.test(r.headers.get('content-type')||''))await cache.put(url.pathname,r.clone());return r})());return}
 if(req.mode==='navigate'){event.respondWith((async()=>{try{const r=await fetch(req);if(r.ok&&!r.redirected&&(r.headers.get('content-type')||'').includes('text/html')){const c=await caches.open(SHELL);await c.put('/',r.clone())}return r}catch{const c=await caches.open(SHELL);return(await c.match('/'))||new Response('请联网打开一次词间，以准备离线学习。',{headers:{'Content-Type':'text/plain;charset=utf-8'}})}})());return}
 event.respondWith((async()=>{const c=await caches.open(SHELL);const found=await c.match(req,{ignoreSearch:true});if(found)return found;return fetch(req)})());
});
