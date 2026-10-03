"use client";
import {useState} from 'react';
import {GitBranch,ChevronDown,Volume2,ArrowUpRight} from 'lucide-react';
import type {FamilyCollection} from '../lib/enrichment';

export default function WordFamily({word,data,onOpen,onPlay}:{word:string;data:FamilyCollection|null;onOpen:(word:string)=>void;onPlay:(word:string)=>void}){
 const[expanded,setExpanded]=useState(false);const item=data?.index[word]||data?.index[word.toLowerCase()];const entries=item?.derivatives||[];
 return <section className="word-family"><div className="family-heading"><span><GitBranch size={18}/>一起认识这个词族</span><small>{entries.length} 个已收录关联词</small></div>
 <p className="family-intro">词性变了，表达的角色也会变。先认出联系，再用一句话区分。</p>
 {!data?<p className="muted">词族资料正在准备；联网打开一次后可离线查看。</p>:!entries.length?<p className="family-empty">该参考库暂未收录这个词的派生关系；这不代表它没有派生词。</p>:<div className="family-grid">{(expanded?entries:entries.slice(0,6)).map((entry,i)=><div className="family-word" key={entry.word+entry.pos+i}><div><strong>{entry.word}</strong><span className="family-pos">{entry.pos}</span></div><p>{entry.meaning||'暂无中文释义'}</p>{!!entry.englishDefinitions?.length&&<details className="family-definitions"><summary>查看对应英文义项</summary>{entry.englishDefinitions.map(definition=><p lang="en" key={definition.senseId}>{definition.definition}</p>)}<small>Open English Wordnet · 当前词族关联对应的义项</small></details>}<span className="family-relation">{entry.label||'派生关联'}{entry.group?` · ${entry.group}`:''}</span><div className="family-word-actions"><small>{entry.inVocabulary?'核心词库内':'扩展了解'}</small><button aria-label={`播放 ${entry.word} 发音`} className="icon-button" onClick={()=>onPlay(entry.word)}><Volume2 size={16}/></button>{entry.inVocabulary&&<button className="icon-button" aria-label={`查看 ${entry.word}`} onClick={()=>onOpen(entry.word)}><ArrowUpRight size={16}/></button>}</div></div>)}</div>}
 {entries.length>6&&<button className="text-button full" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><ChevronDown size={16}/>{expanded?'收起词族':`展开全部 ${entries.length} 个已收录关联词`}</button>}
 {!!item?.inflections.length&&<details className="inflection-list"><summary>时态、复数等词形变化 <span>与派生词分开记</span></summary><div>{item.inflections.map((entry,i)=><span key={entry.word+entry.label+i}><strong>{entry.word}</strong><small>{entry.label}</small></span>)}</div></details>}
 {item?.note&&<p className="family-note">{item.note}</p>}
 <p className="family-source">展示参考库已收录的关联，不代表穷尽全部派生词。中文短释义未全部逐义项审校；缺少匹配词性的中文时会明确标注，并提供对应英文义项。<a href="/family-sources.json" target="_blank" rel="noreferrer">来源与范围</a></p>
 </section>
}
