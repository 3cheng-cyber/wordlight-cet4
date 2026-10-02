import type {Attempt,Grade} from './learning';

export async function drainGradingQueue({next,request,apply,signal}:{next:()=>Attempt|undefined;request:(attempt:Attempt,signal:AbortSignal)=>Promise<Grade>;apply:(attempt:Attempt,grade:Grade)=>void;signal:AbortSignal}){
 let count=0;
 while(count<5000){
  signal.throwIfAborted();
  const attempt=next();
  if(!attempt)break;
  const grade=await request(attempt,signal);
  // A cancelled request can still finish on the server. Its late response must
  // not mutate a newly imported backup or continue the disconnected queue.
  signal.throwIfAborted();
  apply(attempt,grade);
  count++;
 }
 return count;
}

export async function requestSentenceGrade(attempt:Attempt,pos:string,key:string,signal:AbortSignal):Promise<Grade>{
 const controller=new AbortController();
 const cancel=()=>controller.abort(signal.reason);
 const timeout=setTimeout(()=>controller.abort(new Error('批改等待较久，句子已保留，可以稍后重试。')),65000);
 signal.addEventListener('abort',cancel,{once:true});
 try{
  signal.throwIfAborted();
  const response=await fetch('/api/grade',{method:'POST',headers:{'Content-Type':'application/json','X-DeepSeek-Key':key},body:JSON.stringify({word:attempt.word,meaning:attempt.meaning,pos,sentence:attempt.sentence}),signal:controller.signal});
  const result=await response.json().catch(()=>({error:'批改服务暂时没有响应。'})) as Partial<Grade>&{error?:string};
  if(!response.ok)throw Error(result.error||'暂时无法批改，请稍后再试。');
  if(typeof result.wordCorrect!=='boolean'||typeof result.grammarCorrect!=='boolean'||typeof result.correction!=='string'||typeof result.explanation!=='string')throw Error('批改结果不完整，句子已保留，请稍后重试。');
  return result as Grade;
 }finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel)}
}
