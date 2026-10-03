import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node executes this TypeScript directly.
import {dailyIndex,resolveReadingSelection} from '../lib/enrichment.ts';
// @ts-ignore Node executes this TypeScript directly.
import {initialState,validBackup} from '../lib/learning.ts';

const articles=Array.from({length:14},(_,i)=>({id:`reading-${i+1}`}));

test('first recommended article remains selected with its draft after next-day backup restore',()=>{
 const state=initialState();const first=resolveReadingSelection(articles,'2026-10-02',state.readingSelection);
 assert.equal(first.needsRemember,true);state.readingSelection=first.article.id;
 state.readingProgress![first.article.id]={attempts:0,correct:false,draft:'I choose a quiet moment.'};
 const backup=JSON.parse(JSON.stringify(state));assert.equal(validBackup(backup),true);
 const resumed=resolveReadingSelection(articles,'2026-10-03',backup.readingSelection);
 assert.equal(resumed.article.id,first.article.id);assert.equal(resumed.needsRemember,false);
 assert.equal(backup.readingProgress[resumed.article.id].draft,'I choose a quiet moment.');
 assert.equal(backup.lastStudyDate,'');assert.deepEqual(backup.daily,{});
});

test('today recommendation remains an explicit choice and preserves the previous article notes',()=>{
 const state=initialState();const old=articles[dailyIndex('2026-10-02',articles.length)];state.readingSelection=old.id;
 state.readingProgress![old.id]={attempts:1,correct:true,answer:2,draft:'My earlier thought.'};
 const today=articles[dailyIndex('2026-10-03',articles.length)];assert.notEqual(old.id,today.id);
 state.readingSelection=today.id;
 assert.equal(resolveReadingSelection(articles,'2026-10-03',state.readingSelection).article.id,today.id);
 assert.equal(state.readingProgress![old.id].draft,'My earlier thought.');
 state.readingSelection=old.id;assert.equal(resolveReadingSelection(articles,'2026-10-04',state.readingSelection).article.id,old.id);
});

test('loading data never overwrites a restored choice; removed or legacy choices resolve once data is ready',()=>{
 const waiting=resolveReadingSelection([],'2026-10-03','reading-4');assert.equal(waiting.article,undefined);assert.equal(waiting.needsRemember,false);
 const restored=resolveReadingSelection(articles,'2026-10-03','reading-4');assert.equal(restored.article.id,'reading-4');assert.equal(restored.needsRemember,false);
 const fallback=resolveReadingSelection(articles,'2026-10-03','removed-id');assert.equal(fallback.needsRemember,true);assert.equal(fallback.article.id,articles[dailyIndex('2026-10-03',articles.length)].id);
});
