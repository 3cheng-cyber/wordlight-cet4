import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-ignore Node executes TypeScript directly in this test.
import {POST} from '../app/api/grade/route.ts';

const payload={word:'choose',meaning:'选择',pos:'v.',sentence:'I choose to try again.'};
function request(key='test-key-never-a-real-secret',body:unknown=payload,origin='https://wordlight.test'){
 return new Request('https://wordlight.test/api/grade',{method:'POST',headers:{origin,'content-type':'application/json','x-deepseek-key':key},body:JSON.stringify(body)});
}
test('missing key and cross-origin requests are rejected before contacting the service',async t=>{
 let contacted=false;t.mock.method(globalThis,'fetch',async()=>{contacted=true;throw Error('must not call')});
 assert.equal((await POST(request(''))).status,401);
 assert.equal((await POST(request('test-key-never-a-real-secret',payload,'https://elsewhere.test'))).status,403);
 assert.equal(contacted,false);
});
test('model lookup and grading preserve the user sentence as data, returning only validated fields',async t=>{
 const calls:{url:string;body:any}[]=[];
 t.mock.method(globalThis,'fetch',async(url:string,options:RequestInit)=>{
  calls.push({url,body:options.body?JSON.parse(options.body as string):null});
  if(url.endsWith('/models'))return Response.json({data:[{id:'deepseek-chat'}]});
  return Response.json({choices:[{message:{content:JSON.stringify({wordCorrect:true,grammarCorrect:true,correction:payload.sentence,explanation:'表达正确。',ignored:'extra'})}}]});
 });
 const response=await POST(request());const result=await response.json() as Record<string,unknown>;
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(result.wordCorrect,true);assert.equal(result.ignored,undefined);
 assert.deepEqual(JSON.parse(calls[1].body.messages[1].content),payload);
 assert.equal(calls[1].body.response_format.type,'json_object');
});
test('malformed AI output is an error, never a successful grade',async t=>{
 t.mock.method(globalThis,'fetch',async(url:string)=>url.endsWith('/models')?Response.json({data:[{id:'deepseek-chat'}]}):Response.json({choices:[{message:{content:'{"wordCorrect":"yes"}'}}]}));
 assert.equal((await POST(request('test-malformed-response-key'))).status,502);
});
test('upstream failures are recoverable and do not expose the credential',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('secret upstream detail',{status:401}));
 const response=await POST(request('test-rejected-credential-key'));
 assert.equal(response.status,401);assert.equal((await response.text()).includes('test-rejected'),false);
});
