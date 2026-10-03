export type MemoryFrame={elapsed:number;step:number;playing:boolean};
type Clock={now:()=>number;request:(callback:()=>void)=>number;cancel:(id:number)=>void};
const duration=6000;
export function createMemoryPlayback(clock:Clock,onChange:(frame:MemoryFrame)=>void){
 let elapsed=0;let playing=false;let started=0;let frameId:number|undefined;let revision=0;
 const snapshot=():MemoryFrame=>({elapsed,step:Math.min(2,Math.floor(elapsed/2000)),playing});
 const emit=()=>onChange(snapshot());
 const cancel=()=>{revision++;if(frameId!==undefined)clock.cancel(frameId);frameId=undefined};
 const update=()=>{if(playing){elapsed=Math.min(duration,Math.max(0,clock.now()-started));if(elapsed===duration)playing=false}};
 function pause(){if(!playing)return;update();playing=false;cancel();emit()}
 function play(){
  if(playing)return;if(elapsed===duration)elapsed=0;
  playing=true;started=clock.now()-elapsed;const request=++revision;emit();
  const tick=()=>{if(request!==revision||!playing)return;frameId=undefined;update();emit();if(playing)frameId=clock.request(tick)};
  frameId=clock.request(tick);
 }
 function seek(step:number){cancel();playing=false;elapsed=Math.max(0,Math.min(2,Math.floor(step)))*2000;emit()}
 return{play,pause,seek,reset:()=>seek(0),snapshot,dispose:()=>{cancel();playing=false}};
}

export function memoryIllustration(elapsed:number){
 const ratio=(start:number,length:number)=>Math.max(0,Math.min(1,(elapsed-start)/length));
 return{stem:.1+.9*ratio(0,4000),leftLeaf:ratio(1000,3000),rightLeaf:ratio(1300,3000),books:[0,1700,3400].map(start=>ratio(start,1500))};
}
