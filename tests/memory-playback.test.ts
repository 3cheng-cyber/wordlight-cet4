import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node executes this TypeScript directly.
import {createMemoryPlayback,memoryIllustration,type MemoryFrame} from '../lib/memory-playback.ts';

function fixture(){
 let now=0;let serial=0;const callbacks=new Map<number,()=>void>();const frames:MemoryFrame[]=[];
 const player=createMemoryPlayback({now:()=>now,request:(callback:()=>void)=>{callbacks.set(++serial,callback);return serial},cancel:(id:number)=>{callbacks.delete(id)}},(frame:MemoryFrame)=>frames.push(frame));
 return{player,frames,callbacks,advance:(milliseconds:number)=>{now+=milliseconds;const due=[...callbacks.values()];callbacks.clear();for(const run of due)run()},time:(milliseconds:number)=>{now+=milliseconds}};
}

test('pause freezes fractional picture and caption time; hidden time is excluded on resume',()=>{
 const f=fixture();f.player.play();f.advance(1000);f.time(250);f.player.pause();
 const paused=f.player.snapshot();assert.deepEqual(paused,{elapsed:1250,step:0,playing:false});assert.equal(f.callbacks.size,0);
 const picture=memoryIllustration(paused.elapsed);f.advance(60000);assert.deepEqual(f.player.snapshot(),paused);assert.deepEqual(memoryIllustration(f.player.snapshot().elapsed),picture);
 f.player.play();f.advance(749);assert.equal(f.player.snapshot().step,0);f.advance(1);assert.equal(f.player.snapshot().step,1);assert.equal(f.player.snapshot().elapsed,2000);
});

test('pausing in the third step resumes it, while only a completed animation restarts',()=>{
 const f=fixture();f.player.play();f.advance(4500);f.player.pause();assert.equal(f.player.snapshot().step,2);
 f.advance(30000);f.player.play();assert.equal(f.player.snapshot().elapsed,4500);f.advance(1500);
 assert.deepEqual(f.player.snapshot(),{elapsed:6000,step:2,playing:false});assert.equal(f.callbacks.size,0);
 assert.deepEqual(memoryIllustration(6000),{stem:1,leftLeaf:1,rightLeaf:1,books:[1,1,1]});
 f.player.play();assert.deepEqual(f.player.snapshot(),{elapsed:0,step:0,playing:true});
});

test('manual steps stay still, can resume, and reset invalidates old animation callbacks',()=>{
 const f=fixture();f.player.play();const late=[...f.callbacks.values()][0];f.advance(300);
 f.player.seek(2);assert.deepEqual(f.player.snapshot(),{elapsed:4000,step:2,playing:false});late();assert.equal(f.player.snapshot().elapsed,4000);
 f.advance(10000);assert.equal(f.player.snapshot().elapsed,4000);f.player.play();f.advance(500);assert.equal(f.player.snapshot().elapsed,4500);
 const previous=[...f.callbacks.values()][0];f.player.reset();previous();assert.deepEqual(f.player.snapshot(),{elapsed:0,step:0,playing:false});
});

test('disposing cancels animation work and a late callback cannot update an unmounted scene',()=>{
 const f=fixture();f.player.play();const late=[...f.callbacks.values()][0];const count=f.frames.length;f.player.dispose();
 f.advance(8000);late();assert.equal(f.frames.length,count);assert.equal(f.callbacks.size,0);assert.equal(f.player.snapshot().playing,false);
});
