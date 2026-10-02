import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('offline shell, scripts, dictionary, and downloaded audio remain available; API bypasses cache',async()=>{
 const listeners:Record<string,(e:any)=>void>={};
 const stores=new Map<string,Map<string,Response>>();let online=true;let networkCalls=0;
 const key=(v:any)=>new URL(typeof v==='string'?v:v.url,'https://wordlight.test').pathname;
 const caches={async open(name:string){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name)!;return {async put(url:any,r:Response){data.set(key(url),r.clone())},async match(url:any){return data.get(key(url))?.clone()}}}};
 const fetch=async(url:any)=>{networkCalls++;if(!online)throw Error('offline');return key(url)==='/offline-assets.json'?Response.json({version:'test',assets:['/assets/app.js']}):new Response('cached '+key(url),{headers:{'content-type':key(url).endsWith('.mp3')?'audio/mpeg':key(url)==='/'?'text/html':'application/octet-stream'}})};
 const self={location:{origin:'https://wordlight.test'},addEventListener(type:string,fn:(e:any)=>void){listeners[type]=fn},async skipWaiting(){},clients:{async claim(){},async matchAll(){return[]}}};
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self,caches,fetch,Response,URL,Promise,Error});
 let install:Promise<any>|undefined;listeners.install({waitUntil(p:Promise<any>){install=p}});await install;
 function request(path:string,mode='cors',method='GET'){let response:Promise<Response>|undefined;listeners.fetch({request:{url:'https://wordlight.test'+path,method,mode},respondWith(p:Promise<Response>){response=p}});return response}
 await request('/audio/time.mp3');online=false;
 assert.equal(await(await request('/','navigate'))!.text(),'cached /');
 assert.equal(await(await request('/vocab.json'))!.text(),'cached /vocab.json');
 assert.equal(await(await request('/assets/app.js'))!.text(),'cached /assets/app.js');
 assert.equal(await(await request('/audio/time.mp3'))!.text(),'cached /audio/time.mp3');
 const before=networkCalls;assert.equal(request('/api/grade','cors','POST'),undefined);assert.equal(request('/sw.js'),undefined);assert.equal(networkCalls,before);
});
