import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import request from '@font/api';
import {getPractice,getResult} from './api';
import type {PracticeResult,PublicPractice} from './types';
export function ResultContent({result,paper}:{result:PracticeResult;paper:PublicPractice}) {
 const [tab,setTab]=useState<"article"|"questions">("questions");
 useEffect(()=>{document.querySelector(".rp-score")?.scrollIntoView?.({block:"start"});},[result.practiceId]);
 return <><div className="rp-score"><span><strong>{result.score}</strong><small> / 100</small></span><div><h2>练习已完成</h2><p>答对 {result.correctCount} / {result.total} 题 · {new Date(result.submittedAt).toLocaleString('zh-CN')}</p></div></div>
 <div className="rp-mobile-tabs" role="group" aria-label="原文和解析"><button aria-pressed={tab==="article"} onClick={()=>setTab("article")}>回看原文</button><button aria-pressed={tab==="questions"} onClick={()=>setTab("questions")}>答案与解析</button></div><div className={`rp-columns rp-tab-${tab}`}><article className="rp-article"><h2>{paper.title}</h2>{paper.paragraphs.map((p,i)=><p id={`paragraph-${i+1}`} key={i}><span className="rp-paragraph-number">{i+1}</span>{p}</p>)}</article><section className="rp-questions" aria-label="答案与解析"><h2>答案与解析</h2>{result.results.map((q,i)=><article className={`rp-result ${q.correct?'is-correct':'is-incorrect'}`} key={q.id}><span className="rp-status">{q.correct?'回答正确':'需要回顾'}</span><h3>{i+1}. {q.stem}</h3><p>你的答案：<strong>{q.options[q.selectedIndex]}</strong></p><p>正确答案：<strong>{q.options[q.correctIndex]}</strong></p><p className="rp-explanation">{q.explanation}</p><blockquote><a href={`#paragraph-${q.evidence.paragraph}`} onClick={()=>{setTab("article");setTimeout(()=>document.getElementById(`paragraph-${q.evidence.paragraph}`)?.scrollIntoView?.({block:"center"}),0);}}>原文第 {q.evidence.paragraph} 段</a><p>{q.evidence.quote??q.evidence.missingInformation}</p></blockquote></article>)}</section></div></>;
}
export function ReadingPracticeResult({practiceId,basePath}:{practiceId:number;basePath:string}) {
 const [data,setData]=useState<{paper:PublicPractice;result:PracticeResult}>(),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;void Promise.all([request(getPractice(practiceId)),request(getResult(practiceId))]).then(([paper,result])=>{if(active){setData({paper,result});setError('');}}).catch(()=>{if(active)setError('无法读取结果，请确认你已提交这套练习。');});return()=>{active=false;};},[practiceId,retry]);
 return <main className="reading-practice"><Link to={basePath}>← 阅读练习</Link>{error?<div role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>重试</button></div>:data?<ResultContent {...data}/>:<p role="status">正在读取结果…</p>}</main>;
}
