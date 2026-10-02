import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node executes this TypeScript directly.
import {advanceStudySecond,initialState,makeSession,dateKey} from '../lib/learning.ts';
// @ts-ignore Node executes this TypeScript directly.
import {observeStudyTimer} from '../lib/study-timer.ts';

function fixture(){const state=initialState();state.session=makeSession(state,[],5);return state}
function harness(){
 const document=Object.assign(new EventTarget(),{visibilityState:'visible' as DocumentVisibilityState});
 const page=new EventTarget();let tick=()=>{};let stopped=false;
 const environment={document,page,everySecond:(callback:()=>void)=>{tick=callback;return()=>{stopped=true}}};
 return{document,page,environment,seconds:(count:number)=>{for(let i=0;i<count;i++)if(!stopped)tick()}};
}

test('timer changes only counters, shares large history, and handles midnight without mutating prior state',()=>{
 const state=fixture();state.daily={};const dayOne=new Date(2026,9,2,23,59,59).getTime();const dayTwo=new Date(2026,9,3,0,0,0).getTime();
 const first=advanceStudySecond(state,dayOne);const second=advanceStudySecond(first,dayTwo);
 assert.equal(state.session!.seconds,0);assert.equal(first.session!.seconds,1);assert.equal(second.session!.seconds,2);
 assert.equal(second.daily[dateKey(dayOne)].seconds,1);assert.equal(second.daily[dateKey(dayTwo)].seconds,1);
 assert.equal(first.daily[dateKey(dayTwo)],undefined);
 assert.equal(second.progress,state.progress);assert.equal(second.attempts,state.attempts);assert.equal(second.settings,state.settings);
 assert.notEqual(second.session,first.session);assert.notEqual(second.daily,first.daily);
 state.session=null;assert.equal(advanceStudySecond(state),state);
});

test('five minutes make 20 timer saves while retaining per-second clock updates',()=>{
 const h=harness();let state=fixture();let saves=0;let saved=0;
 const stop=observeStudyTimer({tick:()=>{state=advanceStudySecond(state);return true},save:()=>{saves++;saved=state.session!.seconds;return true}},h.environment);
 h.seconds(300);assert.equal(state.session!.seconds,300);assert.equal(saves,20);assert.equal(saved,300);
 stop();assert.equal(saves,20);
});

test('hidden, pagehide, pause and cleanup save latest progress once and exclude background time',()=>{
 const h=harness();let state=fixture();let running=true;const saves:typeof state[]=[];
 const stop=observeStudyTimer({tick:()=>{if(!running)return false;state=advanceStudySecond(state);return true},save:()=>{saves.push(structuredClone(state));return true}},h.environment);
 h.seconds(14);assert.equal(saves.length,0);
 // Immediate answer/draft commits keep their normal save path; timer must use that newer snapshot.
 state=structuredClone(state);state.session!.draft='I choose a quiet moment.';
 h.document.visibilityState='hidden';h.document.dispatchEvent(new Event('visibilitychange'));h.page.dispatchEvent(new Event('pagehide'));
 h.seconds(90);assert.equal(state.session!.seconds,14);assert.equal(saves.length,1);assert.equal(saves[0].session!.draft,state.session!.draft);
 h.document.visibilityState='visible';h.seconds(4);running=false;h.seconds(30);stop();
 assert.equal(saves.length,2);assert.equal(saves[1].session!.seconds,18);h.seconds(30);assert.equal(state.session!.seconds,18);
});

test('import blocks timer writes and later lifecycle flush reads restored state, never an old snapshot',()=>{
 const h=harness();let state=fixture();let importing=false;const saves:typeof state[]=[];
 const save=()=>{saves.push(structuredClone(state));return true};
 const stop=observeStudyTimer({tick:()=>{if(importing)return false;state=advanceStudySecond(state);return true},save:()=>importing?false:save()},h.environment);
 h.seconds(8);importing=true;save(); // The app checkpoints before reading/confirming the file.
 h.page.dispatchEvent(new Event('pagehide'));h.seconds(30);assert.equal(saves.length,1);assert.equal(saves[0].session!.seconds,8);
 // Cancelling import leaves the old state safe, then learning can continue.
 importing=false;h.seconds(2);assert.equal(state.session!.seconds,10);
 importing=true;save();const restored=fixture();restored.session!.seconds=120;restored.session!.draft='My restored sentence.';state=restored;save();
 h.page.dispatchEvent(new Event('pagehide'));assert.equal(saves.length,3);
 importing=false;stop();assert.equal(saves.at(-1)!.session!.seconds,120);assert.equal(saves.at(-1)!.session!.draft,'My restored sentence.');
 assert.ok(saves.slice(2).every(value=>value.session!.seconds===120));
});
