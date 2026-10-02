import type {ReadingProgress} from './enrichment';
export type Sense={id:string;meaning:string;pos:string;example:string;translation:string;prompt:string;hint:string};
export type Word={word:string;phonetic:string;level:string;topic:string;question:string;reflection:string;senses:Sense[];curated?:boolean};
export type Skill='read'|'listen'|'write';
export type Progress={level:number;due:number;last:number;correct:number;wrong:number};
export type Attempt={id:string;word:string;senseId:string;meaning:string;sentence:string;date:string;createdAt:number;status:'pending'|'correct'|'error';correction?:string;explanation?:string;wordCorrect?:boolean;grammarCorrect?:boolean;retryOf?:string;resolvedAt?:number};
export type Draft={id:string;word:string;senseId:string;meaning:string;sentence:string;date:string;createdAt:number;retryOf?:string};
export type Task={word:string;senseId:string;kind:'new'|'review'|'comfort'|'error';retryOf?:string};
export type Session={id:string;queue:Task[];index:number;phase:'recall'|'reveal'|'listen'|'write'|'saved';seconds:number;minutes:number;draft:string;misses:number;recent:boolean[];buffered:boolean;heard:boolean;listeningAnswer?:string;listeningOptions?:string[];hint:boolean;checkRecall:boolean;revealKnown?:boolean;draftId?:string};
export type Daily={seconds:number;read:number;listen:number;sentences:number;completed:number;words:string[];readings?:number};
export type State={version:1;settings:{minutes:number;exam:string;reminder:string;newLimit:number;remindEnabled:boolean;voiceFeedback?:boolean;motion?:boolean};readingProgress?:Record<string,ReadingProgress>;readingSelection?:string;drafts?:Draft[];progress:Record<string,Progress>;attempts:Attempt[];daily:Record<string,Daily>;lastStudyDate:string;recovery:{words:string[];started:string;until:string}|null;session:Session|null};
const DAY=86400000;
export function dateKey(time=Date.now()){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function dayNumber(key:string){return Math.floor(Date.parse(key+'T12:00:00Z')/DAY)}
export function daysBetween(a:string,b:string){return dayNumber(b)-dayNumber(a)}
export function initialState():State{return {version:1,settings:{minutes:5,exam:'2026-12-12',reminder:'20:30',newLimit:10,remindEnabled:false,voiceFeedback:true,motion:true},readingProgress:{},progress:{},attempts:[],daily:{},lastStudyDate:'',recovery:null,session:null}}
export function progressKey(word:string,senseId:string,skill:Skill){return `${word}|${senseId}|${skill}`}
export function daily(state:State,now=Date.now()):Daily{const key=dateKey(now);return state.daily[key]??(state.daily[key]={seconds:0,read:0,listen:0,sentences:0,completed:0,words:[]})}
export function touch(state:State,word:string,now=Date.now()){state.lastStudyDate=dateKey(now);const d=daily(state,now);if(!d.words.includes(word))d.words.push(word)}
export function schedule(state:State,word:string,senseId:string,skill:Skill,success:boolean,now=Date.now()){
 const key=progressKey(word,senseId,skill);const old=state.progress[key]??{level:0,due:now,last:0,correct:0,wrong:0};
 const level=success?Math.min(old.level+1,6):0;const intervals=[0,1,3,7,14,30,60];
 state.progress[key]={level,due:now+(success?intervals[level]*DAY:60000),last:now,correct:old.correct+(success?1:0),wrong:old.wrong+(success?0:1)};
 if(skill!=='write'){touch(state,word,now);if(success)daily(state,now)[skill]++;}
}
export function resumeAfterGap(state:State,now=Date.now()){
 const today=dateKey(now);if(!state.lastStudyDate||daysBetween(state.lastStudyDate,today)<4)return false;
 if(state.recovery?.started===today)return false;
 const last=new Date(state.lastStudyDate+'T12:00:00');const weekday=(last.getDay()+6)%7;const monday=dayNumber(state.lastStudyDate)-weekday;
 const words=[...new Set(Object.entries(state.daily).filter(([k])=>dayNumber(k)>=monday&&dayNumber(k)<=monday+6).flatMap(([,d])=>d.words))];
 state.recovery={words,started:today,until:dateKey(now+7*DAY)};if(!state.session?.draft.trim())state.session=null;return true;
}
export function dueTasks(state:State,words:Word[],now=Date.now()):Task[]{
 const tasks: {task:Task;priority:number}[]=[];
 const errors=new Map<string,Attempt>();for(const a of state.attempts)if(a.status==='error'&&!a.resolvedAt&&!errors.has(`${a.word}|${a.senseId}`))errors.set(`${a.word}|${a.senseId}`,a);
 const recovering=new Set(state.recovery?.words||[]);
 for(const w of words)for(const sense of w.senses){
  const items=(['read','listen','write'] as Skill[]).map(s=>state.progress[progressKey(w.word,sense.id,s)]).filter(Boolean);
  const due=items.filter(p=>p.due<=now);
  const error=errors.get(`${w.word}|${sense.id}`);
  const recover=state.recovery&&dateKey(now)<state.recovery.until&&recovering.has(w.word)&&!items.some(p=>dateKey(p.last)>=state.recovery!.started);
  if(due.length||error||recover)tasks.push({task:{word:w.word,senseId:sense.id,kind:error?'error':'review',retryOf:error?.id},priority:error?-1e15:recover?-1e14:Math.min(...due.map(p=>p.due))});
 }
 return tasks.sort((a,b)=>a.priority-b.priority).map(v=>v.task);
}
export function newTasks(state:State,words:Word[]):Task[]{return words.flatMap(w=>w.senses.filter((s,i)=>!state.progress[progressKey(w.word,s.id,'read')]&&(i===0||!!state.progress[progressKey(w.word,w.senses[i-1].id,'read')])).map(s=>({word:w.word,senseId:s.id,kind:'new' as const})))}
export function makeSession(state:State,words:Word[],minutes:number,mode:'mixed'|'review'|'errors'='mixed',now=Date.now()):Session{
 const today=daily(state,now);const remaining=minutes*60;const due=dueTasks(state,words,now);const capacity=Math.max(1,Math.floor(remaining/120));
 let tasks=mode==='errors'?due.filter(t=>t.kind==='error'):due;
 tasks=tasks.slice(0,capacity);
 const learnedToday=today.words.filter(w=>!Object.entries(state.daily).some(([date,d])=>date!==dateKey(now)&&d.words.includes(w))).length;
 const room=Math.max(0,Math.min(capacity-tasks.length,state.settings.newLimit-learnedToday));
 if(mode==='mixed'&&remaining>due.length*120&&room>0)tasks.push(...newTasks(state,words).slice(0,room));
 return {id:`s-${now}`,queue:tasks,index:0,phase:'recall',seconds:0,minutes,draft:'',misses:0,recent:[],buffered:false,heard:false,hint:false,checkRecall:false};
}
export function recordAnswer(state:State,success:boolean,words:Word[]){const s=state.session;if(!s)return;s.misses=success?0:s.misses+1;s.recent=[...s.recent.slice(-4),success];
 if(s.misses>=2&&!s.buffered){const current=s.queue[s.index];const easy=words.find(w=>w.word!==current.word&&w.level==='easy'&&w.senses.some(x=>(state.progress[progressKey(w.word,x.id,'read')]?.level??0)>0));
 if(easy){s.queue.splice(s.index+1,0,{word:easy.word,senseId:easy.senses[0].id,kind:'comfort'});s.buffered=true;}}
 if(s.recent.length===5&&s.recent.filter(v=>!v).length>=3){s.queue=s.queue.filter((t,i)=>i<=s.index||t.kind!=='new')}
}
export function addAttempt(state:State,task:Task,word:Word,sense:Sense,sentence:string,now=Date.now()):Attempt{
 const id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`a-${now}-${Math.random().toString(16).slice(2)}`;
 const a:Attempt={id,word:word.word,senseId:sense.id,meaning:sense.meaning,sentence:sentence.trim(),date:dateKey(now),createdAt:now,status:'pending',retryOf:task.retryOf};state.attempts.push(a);touch(state,word.word,now);daily(state,now).sentences++;return a;
}
export type Grade={wordCorrect:boolean;grammarCorrect:boolean;correction:string;explanation:string};
export function applyGrade(state:State,id:string,g:Grade,now=Date.now()){const a=state.attempts.find(a=>a.id===id);if(!a||a.status!=='pending')return;a.wordCorrect=g.wordCorrect;a.grammarCorrect=g.grammarCorrect;a.correction=g.correction;a.explanation=g.explanation;a.status=g.wordCorrect&&g.grammarCorrect?'correct':'error';schedule(state,a.word,a.senseId,'write',a.status==='correct',now);
 if(a.status==='correct'&&a.retryOf){const original=state.attempts.find(x=>x.id===a.retryOf);if(original)original.resolvedAt=now;}
}
export function validBackup(value:unknown):value is State{
 if(!value||typeof value!=='object')return false;
 const s=value as State;
 const num=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
 const strings=(x:unknown)=>Array.isArray(x)&&x.every(v=>typeof v==='string');
 const date=(x:unknown)=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x));
 const object=(x:unknown)=>!!x&&typeof x==='object'&&!Array.isArray(x);
 if(s.version!==1||!object(s.settings)||![5,15,30,60].includes(s.settings.minutes)||!date(s.settings.exam)||!num(s.settings.newLimit)||s.settings.newLimit>60||typeof s.settings.remindEnabled!=='boolean'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.settings.reminder))return false;
 if(!object(s.progress)||!Object.values(s.progress).every(p=>p&&num(p.level)&&p.level<=6&&num(p.due)&&num(p.last)&&num(p.correct)&&num(p.wrong)))return false;
 if(!Array.isArray(s.attempts)||!s.attempts.every(a=>a&&typeof a.id==='string'&&typeof a.word==='string'&&typeof a.senseId==='string'&&typeof a.meaning==='string'&&date(a.date)&&typeof a.sentence==='string'&&num(a.createdAt)&&['pending','correct','error'].includes(a.status)))return false;
 if(!object(s.daily)||!Object.entries(s.daily).every(([k,d])=>date(k)&&d&&num(d.seconds)&&num(d.read)&&num(d.listen)&&num(d.sentences)&&num(d.completed)&&strings(d.words)&&(d.readings===undefined||num(d.readings))))return false;
 if(s.lastStudyDate!==''&&!date(s.lastStudyDate))return false;
 if(s.recovery!==null&&(!object(s.recovery)||!strings(s.recovery.words)||!date(s.recovery.started)||!date(s.recovery.until)))return false;
 if(s.readingSelection!==undefined&&typeof s.readingSelection!=='string')return false;
 if(s.settings.voiceFeedback!==undefined&&typeof s.settings.voiceFeedback!=='boolean')return false;
 if(s.settings.motion!==undefined&&typeof s.settings.motion!=='boolean')return false;
 if(s.readingProgress!==undefined&&(!object(s.readingProgress)||!Object.values(s.readingProgress).every(p=>p&&num(p.attempts)&&typeof p.correct==='boolean'&&typeof p.draft==='string'&&(p.answer===undefined||Number.isInteger(p.answer)&&p.answer>=0&&p.answer<4))))return false;
 if(s.drafts!==undefined&&(!Array.isArray(s.drafts)||!s.drafts.every(d=>d&&typeof d.id==='string'&&typeof d.word==='string'&&typeof d.senseId==='string'&&typeof d.meaning==='string'&&typeof d.sentence==='string'&&date(d.date)&&num(d.createdAt))))return false;
 const q=s.session;
 if(q!==null&&(!object(q)||!Array.isArray(q.queue)||!q.queue.length||!num(q.index)||!Number.isInteger(q.index)||q.index>=q.queue.length||!num(q.seconds)||![5,15,30,60].includes(q.minutes)||typeof q.draft!=='string'||!['recall','reveal','listen','write','saved'].includes(q.phase)||!Array.isArray(q.recent)||!q.recent.every(v=>typeof v==='boolean')||!q.queue.every(t=>t&&typeof t.word==='string'&&typeof t.senseId==='string'&&['new','review','comfort','error'].includes(t.kind))))return false;
 return true;
}
