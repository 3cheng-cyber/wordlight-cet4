"use client";
import {Check,Volume2,X} from 'lucide-react';
import {feedbackCopy,type FeedbackKind} from '../lib/enrichment';

export default function LearningFeedback({kind,motion,onReplay,onDismiss}:{kind:FeedbackKind;motion:boolean;onReplay:()=>void;onDismiss:()=>void}){
 const copy=feedbackCopy[kind];const happy=kind==='correct'||kind==='complete';
 return <div className={`learning-feedback feedback-${kind} ${motion?'with-motion':'still'}`} role="status" aria-live="polite">
  <div className="feedback-orbit" aria-hidden="true">
   {happy&&Array.from({length:8},(_,i)=><i className="feedback-spark" key={i} style={{'--angle':`${i*45}deg`,'--delay':`${i*35}ms`} as React.CSSProperties}/>)}
   <svg className="feedback-face" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="currentColor"/><path d={happy?'M30 45q6-9 12 0M58 45q6-9 12 0':'M30 45h11M59 45h11'} stroke="#253d43" strokeWidth="4" strokeLinecap="round" fill="none"/><path d={happy?'M34 58q16 19 32 0':kind==='wrong'?'M40 62q10-7 20 0':'M42 61q8 5 16 0'} stroke="#253d43" strokeWidth="4" strokeLinecap="round" fill="none"/><circle cx="25" cy="55" r="5" fill="#e89f87" opacity=".65"/><circle cx="75" cy="55" r="5" fill="#e89f87" opacity=".65"/></svg>
   {kind==='saved'&&<Check className="feedback-check" size={20}/>}
  </div>
  <div className="feedback-words"><strong>{copy.title}</strong><span>{copy.body}</span></div>
  <button className="icon-button" aria-label="播放这句语音提示" onClick={onReplay}><Volume2 size={18}/></button>
  <button className="icon-button feedback-close" aria-label="收起反馈" onClick={onDismiss}><X size={16}/></button>
 </div>
}
