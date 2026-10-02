import {initialState,validBackup,type State} from './learning';
let database:Promise<IDBDatabase>|null=null;
function db(){if(!database)database=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('wordlight',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return database}
export async function loadState(){const d=await db();return new Promise<State>((resolve,reject)=>{const r=d.transaction('state').objectStore('state').get('main');r.onsuccess=()=>{if(r.result===undefined)resolve(initialState());else if(validBackup(r.result))resolve(r.result);else reject(new Error('学习记录格式异常，请先保留原数据。'))};r.onerror=()=>reject(r.error)})}
let writes=Promise.resolve();
export function saveState(value:State){const snapshot=structuredClone(value);writes=writes.catch(()=>{}).then(async()=>{const d=await db();await new Promise<void>((resolve,reject)=>{const t=d.transaction('state','readwrite');t.objectStore('state').put(snapshot,'main');t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})});return writes}
export function download(name:string,text:string,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
