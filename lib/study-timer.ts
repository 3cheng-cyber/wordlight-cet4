type TimerCallbacks={tick:()=>boolean;save:()=>boolean};
type TimerEnvironment={
 document:Pick<Document,'visibilityState'|'addEventListener'|'removeEventListener'>;
 page:Pick<Window,'addEventListener'|'removeEventListener'>;
 everySecond:(tick:()=>void)=>()=>void;
};

// Only time counters may wait for a checkpoint. Answers and drafts save separately.
export function observeStudyTimer(callbacks:TimerCallbacks,environment?:TimerEnvironment){
 const env=environment||{document,page:window,everySecond:(tick:()=>void)=>{const id=setInterval(tick,1000);return()=>clearInterval(id)}};
 let unsavedTicks=0;
 const flush=()=>{if(unsavedTicks&&callbacks.save())unsavedTicks=0};
 const stop=env.everySecond(()=>{
  if(env.document.visibilityState!=='visible'||!callbacks.tick())return;
  if(++unsavedTicks>=15)flush();
 });
 const onVisibility=()=>{if(env.document.visibilityState!=='visible')flush()};
 env.document.addEventListener('visibilitychange',onVisibility);
 env.page.addEventListener('pagehide',flush);
 return()=>{
  stop();env.document.removeEventListener('visibilitychange',onVisibility);env.page.removeEventListener('pagehide',flush);flush();
 };
}
