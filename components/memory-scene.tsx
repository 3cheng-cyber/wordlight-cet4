"use client";
import {useEffect,useState} from 'react';
import {Pause,Play,Image as ImageIcon} from 'lucide-react';
const themes=[
 {words:['choose','choice'],kind:'choice',title:'在岔路口，作出一个选择',steps:['停在两条路之间，想一想自己的方向。','choose 是“作出选择”的动作。','choice 是你“作出的选择”或可选项。'],sentence:'I choose a quiet path. It is my choice.',translation:'我选择一条安静的小路。这是我的选择。'},
 {words:['grow','growth'],kind:'growth',title:'把成长想成一棵小树',steps:['把一个小动作，想成埋下一粒种子。','每天照顾一点，它就会 grow（生长）。','最后看见的 growth，是“成长”这件事。'],sentence:'Small habits help us grow. Growth takes time.',translation:'小习惯帮助我们成长。成长需要时间。'},
 {words:['habit','practice'],kind:'habit',title:'同一个小动作，慢慢留下痕迹',steps:['今天，翻开书，只学一个词。','明天，再重复这个小动作。','practice 是练习；重复做，会形成 habit。'],sentence:'I practice every day. It becomes a habit.',translation:'我每天练习。它变成了一个习惯。'}
];
export default function MemoryScene({word,motion}:{word:string;motion:boolean}){
 const theme=themes.find(t=>t.words.includes(word.toLowerCase()));const[playing,setPlaying]=useState(false);const[step,setStep]=useState(0);
 useEffect(()=>{setPlaying(false);setStep(0)},[word]);
 useEffect(()=>{if(!playing)return;const id=setTimeout(()=>{if(step===2)setPlaying(false);else setStep(step+1)},2000);return()=>clearTimeout(id)},[playing,step]);
 if(!theme)return null;
 return <details className={`memory-scene memory-${theme.kind}`}><summary><ImageIcon size={18}/>联想记忆 · {theme.title}</summary><div className="memory-content">
 {theme.kind==='choice'?<img src="/memory/choose.png" alt="一个人在分岔的小路前停下，两条路分别通向树林与晨光，联想 choose 和 choice" loading="lazy"/>:<svg viewBox="0 0 480 240" className={`memory-drawing ${playing&&motion?'playing':''}`} role="img" aria-label={theme.title}><rect width="480" height="240" rx="18" fill="#eff4e9"/><circle cx="383" cy="48" r="24" fill="#e7c878"/>{theme.kind==='growth'?<><path d="M70 204Q240 148 410 204" fill="#b9cbae"/><path className="growing-stem" d="M240 187V95" stroke="#466e52" strokeWidth="7" strokeLinecap="round"/><path className="growing-leaf leaf-left" d="M238 143Q157 131 173 87Q231 91 238 143" fill="#83a77b"/><path className="growing-leaf leaf-right" d="M242 119Q310 103 308 64Q250 68 242 119" fill="#608869"/><circle cx="241" cy="192" r="8" fill="#765e43"/></>:<>{[0,1,2].map((n)=><g key={n} className={'practice-book book-'+n} transform={`translate(${90+n*120},75)`}><rect width="80" height="108" rx="6" fill={['#94aea3','#66877c','#365e59'][n]}/><path d="M15 22H63M15 38H55M15 54H63" stroke="#f7f4df" strokeWidth="4" strokeLinecap="round"/><circle cx="40" cy="81" r="10" fill="#e6cc85"/></g>)}</>}</svg>}
 <div className="memory-player"><button className="button quiet" onClick={()=>{if(playing)setPlaying(false);else{if(step===2)setStep(0);setPlaying(true)}}}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'暂停':'播放 6 秒联想'}</button><div className="memory-step-buttons">{theme.steps.map((_,i)=><button key={i} aria-label={`联想第 ${i+1} 步`} aria-current={i===step?'step':undefined} onClick={()=>{setPlaying(false);setStep(i)}}>{i+1}</button>)}</div></div>
 <p className="memory-caption" key={step}>{theme.steps[step]}</p><blockquote>{theme.sentence}<small>{theme.translation}</small></blockquote><p className="family-source">这是帮助回忆的情境联想，不是词源解释。动画可暂停，图片和文字可离线查看。</p>
 </div></details>
}
