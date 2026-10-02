type Kind='word'|'feedback'|'reading';
type Entry={audio:HTMLAudioElement;kind:Kind;id?:string;phase:'loading'|'playing'|'paused';onError:()=>void};
type Environment={create:()=>HTMLAudioElement;cancelSpeech:()=>void;speechBusy:()=>boolean;onReadingChange:(id:string|null)=>void};

// Every asynchronous completion belongs to one playback request, not just one file.
export function createAudioPlayback(env:Environment){
 let current:Entry|null=null;let revision=0;
 const detach=(entry:Entry)=>{entry.audio.onended=null;entry.audio.onerror=null};
 function stop(){revision++;if(current){detach(current);current.audio.pause()}current=null;env.cancelSpeech();env.onReadingChange(null)}
 function pauseReading(){if(current?.kind!=='reading')return;revision++;detach(current);current.audio.pause();current.phase='paused';env.onReadingChange(null)}
 async function run(entry:Entry){
  const request=++revision;current=entry;entry.phase='loading';
  const owns=()=>current===entry&&revision===request;
  const failed=()=>{if(!owns())return;stop();entry.onError()};
  entry.audio.onended=()=>{if(!owns())return;revision++;detach(entry);entry.phase='paused';env.onReadingChange(null)};
  entry.audio.onerror=failed;
  // The pause control is available while the browser is still loading the file.
  env.onReadingChange(entry.kind==='reading'?entry.id!:null);
  try{
   await entry.audio.play();
   if(!owns()){if(current?.audio!==entry.audio)entry.audio.pause();return false}
   entry.phase='playing';return true;
  }catch{failed();return false}
 }
 function open(file:string,kind:Kind,onError:()=>void,id?:string,rate=1){
  stop();const audio=env.create();audio.crossOrigin='anonymous';audio.src=file;audio.playbackRate=rate;
  return run({audio,kind,id,phase:'loading',onError});
 }
 return{
  stop,pauseReading,
  busy:()=>!!(current&&current.phase!=='paused'&&!current.audio.ended)||env.speechBusy(),
  stopFeedback:()=>{if(current?.kind==='feedback')stop()},
  play:(file:string,kind:'word'|'feedback',onError:()=>void,rate=1)=>open(file,kind,onError,undefined,rate),
  toggleReading:(id:string,file:string,onError:()=>void)=>{
   if(current?.kind==='reading'&&current.id===id){
    if(current.phase!=='paused'){pauseReading();return Promise.resolve(false)}
    if(current.audio.ended)current.audio.currentTime=0;
    current.onError=onError;return run(current);
   }
   return open(file,'reading',onError,id);
  }
 };
}
