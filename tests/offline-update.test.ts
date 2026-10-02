import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function fixture(){
 const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');const stores=new Map<string,Map<string,Response>>();
 const key=(input:any)=>new URL(typeof input==='string'?input:input.url,'https://wordlight.test').pathname;
 const caches={async keys(){return [...stores.keys()]},async delete(name:string){return stores.delete(name)},async open(name:string){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name)!;return{async match(input:any){return data.get(key(input))?.clone()},async put(input:any,response:Response){if(response.status===206)throw TypeError('partial response');data.set(key(input),response.clone())}}}};
 function worker(build:string,{fail='',manifest=build,htmlBuild=build,slow=false}={}){
  const listeners:Record<string,(event:any)=>void>={};let networkCalls=0,skipped=false,claimed=false;let release=()=>{};
  const fetch=async(input:any)=>{networkCalls++;const path=key(input);if(path==='/offline-assets.json')return Response.json({version:manifest,assets:[`/_next/static/${build}.js`,...(slow?['/slow.json']:[])]});if(path===fail)throw Error('connection lost');if(path==='/slow.json')await new Promise<void>(r=>{release=r});return new Response(path==='/'?`<script src="/_next/static/${htmlBuild}.js"></script>`:`${build}:${path}`,{headers:{'Content-Type':path==='/'?'text/html':path.endsWith('.mp3')?'audio/mpeg':'application/octet-stream'}})};
  const self={location:{origin:'https://wordlight.test'},addEventListener(type:string,fn:(event:any)=>void){listeners[type]=fn},async skipWaiting(){skipped=true},clients:{async claim(){claimed=true},async matchAll(){return[]}}};
  vm.runInNewContext(source.replace('__WORDLIGHT_BUILD__',build),{self,caches,fetch,Response,Headers,URL,Promise,Error});
  const lifecycle=(type:string)=>{let result!:Promise<void>;listeners[type]({waitUntil(p:Promise<void>){result=p}});return result};
  return{install:()=>lifecycle('install'),activate:()=>lifecycle('activate'),release:()=>release(),get skipped(){return skipped},get claimed(){return claimed},get networkCalls(){return networkCalls},request(path:string,mode='cors'){let response!:Promise<Response>;listeners.fetch({request:{url:'https://wordlight.test'+path,method:'GET',mode,headers:new Headers()},respondWith(p:Promise<Response>){response=p}});return response},async status(){let result:any;let done!:Promise<void>;listeners.message({data:{type:'OFFLINE_STATUS'},ports:[{postMessage(value:any){result=value}}],waitUntil(p:Promise<void>){done=p}});await done;return result}};
 }
 return{worker,stores,caches};
}

test('an interrupted update keeps the old offline page and assets intact and waits for all pending writes',async()=>{
 const f=await fixture(),old=f.worker('old');await old.install();await old.activate();
 const next=f.worker('next',{fail:'/_next/static/next.js',slow:true});let settled=false;
 const install=next.install().finally(()=>{settled=true});const rejected=assert.rejects(install,/incomplete/);
 await new Promise(r=>setTimeout(r,0));assert.equal(settled,false);next.release();await rejected;
 assert.equal(f.stores.has('wordlight-shell-next'),false);
 const calls=old.networkCalls;
 assert.equal(await(await old.request('/','navigate')).text(),'<script src="/_next/static/old.js"></script>');
 assert.equal(await(await old.request('/_next/static/old.js')).text(),'old:/_next/static/old.js');
 assert.equal(old.networkCalls,calls);assert.deepEqual(JSON.parse(JSON.stringify(await old.status())),{type:'OFFLINE_STATUS',version:'old',ready:true});
});

test('completed updates wait for current pages; safe activation preserves audio and survives worker restart',async()=>{
 const f=await fixture(),old=f.worker('old');await old.install();await old.activate();
 const audio=await f.caches.open('wordlight-audio-v1');await audio.put('/audio/time.mp3',new Response('saved-audio',{headers:{'Content-Type':'audio/mpeg'}}));
 const next=f.worker('next');await next.install();assert.equal(next.skipped,false);assert.equal(next.claimed,false);
 assert.equal(await(await old.request('/','navigate')).text(),'<script src="/_next/static/old.js"></script>');
 assert.equal(f.stores.has('wordlight-shell-old'),true);
 await next.activate();assert.equal(f.stores.has('wordlight-shell-old'),false);assert.equal(f.stores.has('wordlight-audio-v1'),true);
 const restarted=f.worker('next');assert.equal(await(await restarted.request('/','navigate')).text(),'<script src="/_next/static/next.js"></script>');
 assert.equal(await(await restarted.request('/audio/time.mp3')).text(),'saved-audio');assert.equal(restarted.networkCalls,0);
 assert.equal((await restarted.status()).ready,true);
});

test('mismatched manifests or HTML referring to another build never become ready',async()=>{
 const f=await fixture(),old=f.worker('old');await old.install();
 await assert.rejects(f.worker('wrong',{manifest:'different'}).install(),/changed/);
 await assert.rejects(f.worker('mixed',{htmlBuild:'different'}).install(),/another build/);
 assert.equal(f.stores.has('wordlight-shell-wrong'),false);assert.equal(f.stores.has('wordlight-shell-mixed'),false);
 assert.equal((await old.status()).ready,true);
});

test('activating a waiting version cannot delete a newer update that is still downloading',async()=>{
 const f=await fixture(),old=f.worker('old');await old.install();await old.activate();
 const waiting=f.worker('waiting');await waiting.install();
 const newer=f.worker('newer',{slow:true});const install=newer.install();await new Promise(r=>setTimeout(r,0));
 assert.equal(f.stores.has('wordlight-shell-newer'),true);
 await waiting.activate();assert.equal(f.stores.has('wordlight-shell-newer'),true);
 newer.release();await install;
 const restarted=f.worker('newer');await restarted.activate();assert.equal((await restarted.status()).ready,true);
 assert.equal(f.stores.has('wordlight-shell-waiting'),false);
 assert.equal(await(await restarted.request('/','navigate')).text(),'<script src="/_next/static/newer.js"></script>');
});
