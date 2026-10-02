import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function worker({cached=false,status=200,storageFull=false}={}){
 const listeners:Record<string,(event:any)=>void>={};const stores=new Map<string,Map<string,Response>>();
 let networkCalls=0,cacheWrites=0;
 const key=(input:any)=>new URL(typeof input==='string'?input:input.url,'https://wordlight.test').pathname;
 const full=()=>new Response('0123456789',{headers:{'Content-Type':'audio/mpeg','Content-Length':'10',ETag:'"recording-1"'}});
 if(cached){stores.set('wordlight-audio-v1',new Map([['/audio/time.mp3',full()]]));stores.set('wordlight-shell-test',new Map([['/voice/correct.mp3',full()]]))}
 const caches={async open(name:string){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name)!;return{async match(input:any){return data.get(key(input))?.clone()},async put(input:any,response:Response){cacheWrites++;if(response.status===206)throw TypeError('Cannot cache a partial response');if(storageFull)throw Error('QuotaExceededError');data.set(key(input),response.clone())}}}};
 const fetch=async()=>{networkCalls++;if(cached)throw Error('offline');return status===206?new Response('2345',{status:206,headers:{'Content-Type':'audio/mpeg','Content-Range':'bytes 2-5/10'}}):full()};
 const self={location:{origin:'https://wordlight.test'},addEventListener(type:string,handler:(event:any)=>void){listeners[type]=handler}};
 vm.runInNewContext((await readFile(new URL('../public/sw.js',import.meta.url),'utf8')).replace('__WORDLIGHT_BUILD__','test'),{self,caches,fetch,Response,Headers,URL,Promise,Error});
 return{request(path:string,range?:string,ifRange?:string){let response!:Promise<Response>;const headers=new Headers();if(range)headers.set('Range',range);if(ifRange)headers.set('If-Range',ifRange);listeners.fetch({request:{url:'https://wordlight.test'+path,method:'GET',mode:'cors',headers},respondWith(p:Promise<Response>){response=p}});return response},get networkCalls(){return networkCalls},get cacheWrites(){return cacheWrites}};
}

test('downloaded word and feedback audio serve byte ranges offline without modifying the full recording',async()=>{
 const app=await worker({cached:true});
 for(const path of ['/audio/time.mp3','/voice/correct.mp3']){
  for(const [range,body,contentRange] of [['bytes=2-5','2345','bytes 2-5/10'],['bytes=7-','789','bytes 7-9/10'],['bytes=-3','789','bytes 7-9/10'],['bytes=8-20','89','bytes 8-9/10'],['bytes=-20','0123456789','bytes 0-9/10']]){
   const response=await app.request(path,range);assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),contentRange);assert.equal(response.headers.get('Content-Length'),String(body.length));assert.equal(await response.text(),body);
  }
  const full=await app.request(path);assert.equal(full.status,200);assert.equal(await full.text(),'0123456789');
 }
 assert.equal(app.networkCalls,0);assert.equal(app.cacheWrites,0);
});

test('out-of-bounds ranges return 416; unsupported ranges and changed If-Range return full audio',async()=>{
 const app=await worker({cached:true});
 for(const range of ['bytes=10-','bytes=3-2','bytes=-0']){const response=await app.request('/audio/time.mp3',range);assert.equal(response.status,416);assert.equal(response.headers.get('Content-Range'),'bytes */10');assert.equal(await response.text(),'')}
 for(const [range,ifRange] of [['bytes=0-1,4-5',undefined],['unknown=0-1',undefined],['bytes=2-5','"old-recording"'],['bytes=2-5','W/"recording-1"']]){const response=await app.request('/audio/time.mp3',range,ifRange);assert.equal(response.status,200);assert.equal(await response.text(),'0123456789')}
 assert.equal((await app.request('/audio/time.mp3','bytes=2-5','"recording-1"')).status,206);
});

test('network partial audio is never cached and storage failures do not interrupt online playback',async()=>{
 const partial=await worker({status:206});const response=await partial.request('/voice/reading-01.mp3','bytes=2-5');assert.equal(response.status,206);assert.equal(await response.text(),'2345');assert.equal(partial.cacheWrites,0);
 const full=await worker();assert.equal((await full.request('/audio/time.mp3')).status,200);assert.equal(full.cacheWrites,1);
 const noSpace=await worker({storageFull:true});assert.equal(await(await noSpace.request('/audio/time.mp3')).text(),'0123456789');assert.equal(noSpace.cacheWrites,1);
});
