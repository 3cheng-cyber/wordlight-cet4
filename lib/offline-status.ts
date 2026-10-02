export function observeOfflineSupport(onStatus:(status:{ready?:boolean;updateReady?:boolean})=>void){
 let live=true;let registration:ServiceWorkerRegistration|undefined;let installing:ServiceWorker|null=null;let cancelQuery=()=>{};
 const report=(status:{ready?:boolean;updateReady?:boolean})=>{if(live)onStatus(status)};
 const query=()=>{
  cancelQuery();const worker=navigator.serviceWorker.controller||registration?.active;
  if(!worker){report({ready:false});return}
  const channel=new MessageChannel();let settled=false;
  const finish=(ready:boolean)=>{if(settled)return;settled=true;clearTimeout(timeout);channel.port1.close();channel.port2.close();report({ready})};
  const timeout=setTimeout(()=>finish(false),2000);
  cancelQuery=()=>{settled=true;clearTimeout(timeout);channel.port1.close();channel.port2.close()};
  channel.port1.onmessage=event=>{if(event.data?.type==='OFFLINE_STATUS')finish(event.data.ready===true)};
  try{worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2])}catch{finish(false)}
 };
 const changed=()=>{report({updateReady:!!registration?.waiting});if(installing?.state==='activated')query()};
 const found=()=>{installing?.removeEventListener('statechange',changed);installing=registration?.installing||null;installing?.addEventListener('statechange',changed);changed()};
 const message=(event:MessageEvent)=>{if(event.data?.type==='OFFLINE_READY')query()};
 navigator.serviceWorker.addEventListener('controllerchange',query);
 navigator.serviceWorker.addEventListener('message',message);
 void navigator.serviceWorker.register('/sw.js').then(async value=>{
  if(!live)return;registration=value;registration.addEventListener('updatefound',found);found();
  await navigator.serviceWorker.ready;if(live){changed();query()}
 }).catch(()=>report({ready:false}));
 return()=>{live=false;cancelQuery();registration?.removeEventListener('updatefound',found);installing?.removeEventListener('statechange',changed);navigator.serviceWorker.removeEventListener('controllerchange',query);navigator.serviceWorker.removeEventListener('message',message)};
}
