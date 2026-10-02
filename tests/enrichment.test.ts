import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// @ts-ignore Node executes this TypeScript directly.
import {assessReading,dailyIndex} from '../lib/enrichment.ts';
// @ts-ignore Node executes this TypeScript directly.
import {initialState,validBackup} from '../lib/learning.ts';

test('reading retry keeps the draft, tracks actual answers, and survives backup validation',()=>{
 const first=assessReading({draft:'I choose to begin.',attempts:0,correct:false},0,2,'2026-10-03');assert.equal(first.correct,false);assert.equal(first.completedOn,undefined);
 const second=assessReading(first,2,2,'2026-10-03');assert.equal(second.correct,true);assert.equal(second.attempts,2);assert.equal(second.draft,first.draft);
 const state=initialState();state.readingProgress={'reading-01':second};assert.equal(validBackup(JSON.parse(JSON.stringify(state))),true);
 assert.equal(validBackup({...state,readingProgress:{bad:{...second,answer:8}}}),false);
 const legacy=initialState();delete legacy.settings.motion;delete legacy.settings.voiceFeedback;delete legacy.readingProgress;assert.equal(validBackup(legacy),true);
});
test('daily content is stable within a date and rotates on the next day',()=>{
 assert.equal(dailyIndex('2026-10-03',30),dailyIndex('2026-10-03',30));assert.equal(dailyIndex('2026-10-04',30),(dailyIndex('2026-10-03',30)+1)%30);
});
test('every core word has a family lookup, relation type is explicit, and inflections stay separate',async()=>{
 const read=async(name:string)=>JSON.parse(await readFile(new URL('../public/'+name,import.meta.url),'utf8'));
 const vocabulary=await read('vocab.json');const families=await read('word-families.json');const readings=await read('readings.json');const voice=await read('voice-manifest.json');
 const names=new Set(vocabulary.map((w:any)=>w.word.toLowerCase()));
 assert.equal(vocabulary.length,5358);for(const w of vocabulary){const family=families.index[w.word]||families.index[w.word.toLowerCase()];assert.ok(family);assert.ok(Array.isArray(family.inflections));for(const d of family.derivatives){assert.ok(['derivation','family','pertainym'].includes(d.relation));assert.ok(d.meaning);assert.notEqual(w.word.toLowerCase(),d.word.toLowerCase());assert.equal(d.inVocabulary,names.has(d.word.toLowerCase()))}}
 assert.ok(families.index.choose.inflections.some((f:any)=>f.word==='chose'));assert.ok(families.index.choose.derivatives.some((f:any)=>f.word==='choice'));
 assert.equal(readings.readings.length,14);assert.equal(readings.encouragements.length,30);for(const r of readings.readings){assert.equal(r.question.options.length,4);assert.ok(r.question.answerIndex>=0&&r.question.answerIndex<4);assert.ok(voice.files[r.id]);for(const k of r.keywords)assert.ok(names.has(k.word.toLowerCase()))}
 for(const path of Object.values(voice.files) as string[])assert.ok((await readFile(new URL('../public'+path,import.meta.url))).length>1000);
});
