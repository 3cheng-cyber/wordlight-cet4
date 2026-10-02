import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node executes this TypeScript directly.
import {drainGradingQueue,requestSentenceGrade} from '../lib/grading-queue.ts';
// @ts-ignore Node executes this TypeScript directly.
import {initialState,addAttempt,applyGrade} from '../lib/learning.ts';

const word={word:'time',phonetic:'',level:'easy',topic:'',question:'',reflection:'',senses:[{id:'time-1',meaning:'时间',pos:'n.',example:'',translation:'',prompt:'',hint:''}]};
const good={wordCorrect:true,grammarCorrect:true,correction:'I have time.',explanation:'正确。'};
function fixture(){const state=initialState();for(let i=0;i<3;i++)addAttempt(state,{word:'time',senseId:'time-1',kind:'new'},word,word.senses[0],'I have time.');return state}

test('disconnect stops later sentences and ignores a late response from the old request',async()=>{
 const state=fixture(),controller=new AbortController();let calls=0;let release!:(v:typeof good)=>void;
 const result=drainGradingQueue({signal:controller.signal,next:()=>state.attempts.find(a=>a.status==='pending'),request:async()=>{calls++;return new Promise(resolve=>{release=resolve})},apply:(a,g)=>applyGrade(state,a.id,g)});
 controller.abort();release(good);
 await assert.rejects(result,{name:'AbortError'});
 assert.equal(calls,1);assert.ok(state.attempts.every(a=>a.status==='pending'));
 const resumed=await drainGradingQueue({signal:new AbortController().signal,next:()=>state.attempts.find(a=>a.status==='pending'),request:async()=>good,apply:(a,g)=>applyGrade(state,a.id,g)});
 assert.equal(resumed,3);assert.ok(state.attempts.every(a=>a.status==='correct'));
});

test('cancellation reaches the HTTP request and leaves the sentence pending',async t=>{
 const state=fixture(),controller=new AbortController();let requestSignal:AbortSignal|undefined;
 t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{requestSignal=init.signal as AbortSignal;return new Promise((_resolve,reject)=>requestSignal!.addEventListener('abort',()=>reject(requestSignal!.reason),{once:true}))});
 const result=requestSentenceGrade(state.attempts[0],'n.','test-key-not-real',controller.signal);
 controller.abort();await assert.rejects(result,{name:'AbortError'});
 assert.ok(requestSignal?.aborted);assert.equal(state.attempts[0].status,'pending');
});

test('malformed successful HTTP response never counts as a passed sentence',async t=>{
 const state=fixture();t.mock.method(globalThis,'fetch',async()=>Response.json({wordCorrect:true}));
 await assert.rejects(requestSentenceGrade(state.attempts[0],'n.','test-key-not-real',new AbortController().signal),/批改结果不完整/);
 assert.equal(state.attempts[0].status,'pending');
});
