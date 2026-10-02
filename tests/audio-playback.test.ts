import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node executes this TypeScript directly.
import {createAudioPlayback} from '../lib/audio-playback.ts';

class FakeAudio{
 src='';crossOrigin='';playbackRate=1;currentTime=0;paused=true;ended=false;pauses=0;
 onended:(()=>void)|null=null;onerror:(()=>void)|null=null;
 requests:{resolve:()=>void;reject:(e:Error)=>void}[]=[];
 play(){this.paused=false;this.ended=false;return new Promise<void>((resolve,reject)=>this.requests.push({resolve,reject}))}
 pause(){this.paused=true;this.pauses++}
}
function fixture(){
 const audios:FakeAudio[]=[];const reading:(string|null)[]=[];let speech=false;let cancelCalls=0;let errors=0;
 const playback=createAudioPlayback({create:()=>{const audio=new FakeAudio();audios.push(audio);return audio as unknown as HTMLAudioElement},cancelSpeech:()=>{speech=false;cancelCalls++},speechBusy:()=>speech,onReadingChange:(id:string|null)=>reading.push(id)});
 return{playback,audios,reading,onError:()=>{errors++},errors:()=>errors,cancelCalls:()=>cancelCalls,speech:(value:boolean)=>{speech=value}};
}

test('leaving reading during pending play stays paused and cancellation is silent',async()=>{
 const f=fixture();const first=f.playback.toggleReading('one','/one.mp3',f.onError);const audio=f.audios[0];
 assert.equal(f.reading.at(-1),'one');assert.equal(f.playback.busy(),true);
 f.playback.pauseReading();audio.requests[0].reject(new DOMException('paused','AbortError'));
 assert.equal(await first,false);assert.equal(f.reading.at(-1),null);assert.equal(f.errors(),0);assert.equal(audio.paused,true);
});

test('late success and callbacks from an old article cannot alter the next article',async()=>{
 const f=fixture();const first=f.playback.toggleReading('one','/one.mp3',f.onError);const old=f.audios[0];const ended=old.onended!;const failed=old.onerror!;
 const next=f.playback.toggleReading('two','/two.mp3',f.onError);const active=f.audios[1];active.requests[0].resolve();assert.equal(await next,true);
 old.requests[0].resolve();assert.equal(await first,false);ended();failed();
 assert.equal(f.reading.at(-1),'two');assert.equal(active.paused,false);assert.equal(old.paused,true);assert.equal(f.errors(),0);
});

test('pause then resume keeps position and ignores the previous request on the same element',async()=>{
 const f=fixture();const first=f.playback.toggleReading('one','/one.mp3',f.onError);const audio=f.audios[0];audio.currentTime=21;
 await f.playback.toggleReading('one','/one.mp3',f.onError);assert.equal(audio.paused,true);
 const resumed=f.playback.toggleReading('one','/one.mp3',f.onError);audio.requests[1].resolve();assert.equal(await resumed,true);
 audio.requests[0].resolve();assert.equal(await first,false);assert.equal(f.audios.length,1);assert.equal(audio.paused,false);assert.equal(audio.currentTime,21);assert.equal(f.reading.at(-1),'one');
});

test('real current playback failures clear the control and show exactly one message',async()=>{
 const f=fixture();const request=f.playback.toggleReading('one','/one.mp3',f.onError);const audio=f.audios[0];
 audio.onerror!();audio.requests[0].reject(new Error('network failure'));assert.equal(await request,false);
 assert.equal(f.errors(),1);assert.equal(f.reading.at(-1),null);assert.equal(f.playback.busy(),false);
 const retry=f.playback.toggleReading('one','/one.mp3',f.onError);f.audios[1].requests[0].resolve();assert.equal(await retry,true);
});

test('completed narration can replay from the beginning',async()=>{
 const f=fixture();const request=f.playback.toggleReading('one','/one.mp3',f.onError);const audio=f.audios[0];audio.requests[0].resolve();await request;
 audio.currentTime=80;audio.ended=true;audio.paused=true;audio.onended!();assert.equal(f.reading.at(-1),null);
 const replay=f.playback.toggleReading('one','/one.mp3',f.onError);assert.equal(audio.currentTime,0);audio.requests[1].resolve();assert.equal(await replay,true);
});

test('word playback cancels speech, makes old reading outcomes harmless, and mute stops only feedback',async()=>{
 const f=fixture();f.speech(true);assert.equal(f.playback.busy(),true);
 const word=f.playback.play('/word.mp3','word',f.onError,.95);assert.equal(f.cancelCalls(),1);assert.equal(f.audios[0].crossOrigin,'anonymous');assert.equal(f.audios[0].playbackRate,.95);
 f.playback.stopFeedback();assert.equal(f.audios[0].paused,false);f.audios[0].requests[0].resolve();assert.equal(await word,true);
 const feedback=f.playback.play('/correct.mp3','feedback',f.onError);const audio=f.audios[1];f.playback.stopFeedback();audio.requests[0].reject(new DOMException('muted','AbortError'));
 assert.equal(await feedback,false);assert.equal(audio.paused,true);assert.equal(f.errors(),0);
});

test('dispose makes all pending audio results obsolete',async()=>{
 const f=fixture();const pending=f.playback.play('/word.mp3','word',f.onError);const audio=f.audios[0];f.playback.stop();audio.requests[0].resolve();
 assert.equal(await pending,false);assert.equal(audio.paused,true);assert.equal(f.playback.busy(),false);assert.equal(f.errors(),0);
});
