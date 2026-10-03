export type FeedbackKind = 'correct' | 'wrong' | 'unanswered' | 'saved' | 'complete' | 'ready';
export type ReadingProgress = {answer?:number; attempts:number; correct:boolean; draft:string; completedOn?:string;practicedOn?:string};
export type Reading = {id:string;title:string;titleEn:string;theme:string;paragraphs:{en:string;zh:string}[];keywords:{word:string;meaning:string}[];question:{question:string;options:string[];answerIndex:number;explanation:string};writingPrompt:string;phrase:{phrase:string;translation:string}};
export type ReadingCollection = {readings:Reading[];encouragements:{en:string;zh:string}[]};
export type FamilyEntry = {word:string;pos:string;meaning:string;relation:string;inVocabulary:boolean;label?:string;group?:string;meaningStatus?:'sense-reviewed'|'english-reference';englishDefinitions?:{senseId:string;definition:string}[]};
export type Family = {derivatives:FamilyEntry[];inflections:{word:string;label:string}[];note?:string};
export type FamilyCollection = {index:Record<string,Family>;coverage:Record<string,unknown>;missingText:string};

export const feedbackCopy:Record<FeedbackKind,{title:string;body:string}> = {
 correct:{title:'这一次，想起来了。',body:'把这一点进步留住，再往前一步。'},
 wrong:{title:'差一点，也有收获。',body:'看看哪里不同，下一次再试。'},
 unanswered:{title:'慢慢想，我在这里。',body:'想不起来也没关系，可以先看一点提示。'},
 saved:{title:'这句话，已经替你收好。',body:'待批改不算答错，也暂不计入掌握。'},
 complete:{title:'今天，又多走了一小步。',body:'给自己一点肯定，也留一点休息。'},
 ready:{title:'从一个词开始。',body:'不用一下子记住很多。'}
};
export function dailyIndex(date:string,length:number){const n=Math.floor(Date.parse(date+'T12:00:00Z')/86400000);return length?((n%length)+length)%length:0}
export function resolveReadingSelection<T extends{id:string}>(readings:T[],date:string,selectedId?:string){
 const selected=readings.findIndex(article=>article.id===selectedId);
 const current=selected>=0?selected:dailyIndex(date,readings.length);
 const article=readings[current];
 return{current,article,needsRemember:!!article&&selected<0};
}
export function assessReading(previous:ReadingProgress|undefined,answer:number,expected:number,date:string):ReadingProgress{
 if(!Number.isInteger(answer)||answer<0||answer>3)throw Error('Invalid answer');
 return {...previous,answer,attempts:(previous?.attempts||0)+1,correct:answer===expected,draft:previous?.draft||'',completedOn:answer===expected?date:previous?.completedOn};
}
