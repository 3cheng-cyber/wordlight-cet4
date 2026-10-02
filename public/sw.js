const SHELL='wordlight-shell-v1',AUDIO='wordlight-audio-v1';
async function audioRange(response,request){
 const range=request.headers.get('range');
 if(!range||response.status!==200)return response;
 const ifRange=request.headers.get('if-range');
 if(ifRange&&(ifRange.startsWith('W/')||ifRange!==response.headers.get('etag')&&ifRange!==response.headers.get('last-modified')))return response;
 // Unsupported units, malformed and multipart ranges may be ignored. Never
 // mistake a multipart request for a single contiguous piece of the audio.
 const match=/^bytes=(\d*)-(\d*)$/i.exec(range.trim());
 if(!match||!match[1]&&!match[2])return response;
 const body=await response.arrayBuffer(),length=body.byteLength;
 const start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(Number(match[2]),length-1):length-1):length-1;
 const headers=new Headers(response.headers);
 headers.delete('content-encoding');headers.set('Accept-Ranges','bytes');
 if(!length||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=length||end<start||(!match[1]&&Number(match[2])===0)){
  headers.set('Content-Range',`bytes */${length}`);headers.set('Content-Length','0');
  return new Response(null,{status:416,headers});
 }
 headers.set('Content-Range',`bytes ${start}-${end}/${length}`);headers.set('Content-Length',String(end-start+1));
 return new Response(body.slice(start,end+1),{status:206,headers});
}
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const response=await fetch('/offline-assets.json',{cache:'no-store'});if(!response.ok)throw Error('Offline assets unavailable');const {assets,version}=await response.json();const cache=await caches.open(SHELL);
 const urls=[...new Set(['/','/manifest.webmanifest','/icon-192.png','/icon-512.png','/vocab.json','/philosophy.json','/audio-manifest.json','/sources.json','/ECDICT-LICENSE.txt','/readings.json','/word-families.json','/voice-manifest.json','/family-sources.json','/WORDNET-LICENSE.txt','/memory/choose.png',...['correct','wrong','unanswered','saved','complete','ready'].map(k=>`/voice/${k}.mp3`),...assets])];
 await Promise.all(urls.map(async url=>{const r=await fetch(url,{cache:'reload'});if(!r.ok||r.redirected)throw Error('Cannot cache '+url);await cache.put(url,r)}));
 await cache.put('/offline-ready',new Response(version));await self.skipWaiting();
})())});
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const c of await self.clients.matchAll())c.postMessage({type:'OFFLINE_READY'})})()));
self.addEventListener('fetch',event=>{
 const req=event.request;const url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/sw.js'||url.pathname==='/offline-assets.json'||url.pathname.includes('signin')||url.pathname.includes('signout')||url.pathname==='/callback')return;
 if(url.pathname.startsWith('/audio/')||url.pathname.startsWith('/voice/')){event.respondWith((async()=>{const cache=await caches.open(AUDIO);const shell=await caches.open(SHELL);const cached=await cache.match(url.pathname)||await shell.match(url.pathname);if(cached)return audioRange(cached,req);const r=await fetch(req);if(r.status===200&&!r.redirected&&/audio|octet/.test(r.headers.get('content-type')||'')){try{await cache.put(url.pathname,r.clone())}catch{/* Full cache or storage restrictions must not interrupt online playback. */}}return r})());return}
 if(req.mode==='navigate'){event.respondWith((async()=>{try{const r=await fetch(req);if(r.ok&&!r.redirected&&(r.headers.get('content-type')||'').includes('text/html')){const c=await caches.open(SHELL);await c.put('/',r.clone())}return r}catch{const c=await caches.open(SHELL);return(await c.match('/'))||new Response('请联网打开一次词间，以准备离线学习。',{headers:{'Content-Type':'text/plain;charset=utf-8'}})}})());return}
 event.respondWith((async()=>{const c=await caches.open(SHELL);const found=await c.match(req,{ignoreSearch:true});if(found)return found;return fetch(req)})());
});
