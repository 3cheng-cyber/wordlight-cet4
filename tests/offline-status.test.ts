import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node executes this TypeScript directly.
import {observeOfflineSupport} from '../lib/offline-status.ts';

test('offline readiness comes from the page controller, not a newer waiting registration',async t=>{
 let oldQueries=0,newQueries=0;
 const oldWorker={postMessage(_data:any,ports:MessagePort[]){oldQueries++;ports[0].postMessage({type:'OFFLINE_STATUS',version:'old',ready:false})}};
 const newWorker={postMessage(_data:any,ports:MessagePort[]){newQueries++;ports[0].postMessage({type:'OFFLINE_STATUS',version:'new',ready:true})}};
 const registration=Object.assign(new EventTarget(),{active:newWorker,waiting:newWorker,installing:null});
 const serviceWorker=Object.assign(new EventTarget(),{controller:oldWorker,register:async()=>registration,ready:Promise.resolve(registration)});
 Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:serviceWorker});
 let finish!:(ready:boolean)=>void;const ready=new Promise<boolean>(resolve=>{finish=resolve});let updateReady=false;
 const stop=observeOfflineSupport(status=>{if(status.updateReady!==undefined)updateReady=status.updateReady;if(status.ready!==undefined)finish(status.ready)});t.after(()=>{stop();delete (navigator as any).serviceWorker});
 assert.equal(await ready,false);assert.equal(updateReady,true);assert.equal(oldQueries,1);assert.equal(newQueries,0);
});
