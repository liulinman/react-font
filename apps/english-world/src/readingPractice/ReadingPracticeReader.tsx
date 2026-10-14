import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import request from '@font/api';
import {getPractice,getResult,submitPractice} from './api';
import type {PracticeResult,PublicPractice} from './types';
import {usePracticeDraft} from './usePracticeDraft';
import {ResultContent} from './ReadingPracticeResult';
function AnswerSheet({paper,userId}:{paper:PublicPractice;userId:number}) {
 const {draft,choose,clear,notice}=usePracticeDraft(userId,paper.id,paper.questions);
 const [tab,setTab]=useState<'article'|'questions'>('article'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PracticeResult>();const lock=useRef(false);
 const submit=async()=>{
  if(lock.current)return;
  const missing=paper.questions.findIndex(q=>draft.answers[q.id]===undefined);
  if(missing>=0){setError(`请完成第 ${missing+1} 题后再提交。`);setTab('questions');setTimeout(()=>document.getElementById(`question-${missing}`)?.focus(),0);return;}
  lock.current=true;setBusy(true);setError('');
  try{const result=await request(submitPractice(paper.id,{requestUid:draft.requestUid,answers:paper.questions.map(q=>({questionId:q.id,selectedIndex:draft.answers[q.id]}))}));clear();setResult(result);}
  catch{try{const result=await request(getResult(paper.id));clear();setResult(result);}catch{setError('提交未完成，答案已保留。请联网后重试；如果练习已撤回，将无法继续提交。');}}
  finally{lock.current=false;setBusy(false);}
 };
 if(result)return <ResultContent result={result} paper={paper}/>;
 const completed=paper.questions.filter(q=>draft.answers[q.id]!==undefined).length;
 return <><header className="rp-heading"><h1>{paper.title}</h1><p>雅思 {paper.ieltsBand.toFixed(1)} · {paper.questions.length} 题 · 每题一项答案，提交后查看解析</p></header>
  {notice&&<p role="status">{notice}</p>}
  <div className="rp-mobile-tabs" role="group" aria-label="阅读和答题"><button aria-pressed={tab==='article'} onClick={()=>setTab('article')}>阅读文章</button><button aria-pressed={tab==='questions'} onClick={()=>setTab('questions')}>答题 {completed}/{paper.questions.length}</button></div>
  <div className={`rp-columns rp-tab-${tab}`}><article className="rp-article"><h2>阅读文章</h2>{paper.paragraphs.map((p,i)=><p key={i}><span className="rp-paragraph-number">{i+1}</span>{p}</p>)}</article><section className="rp-questions" aria-label="练习题目"><h2>配套练习</h2>{paper.questions.map((q,i)=><fieldset disabled={busy} tabIndex={-1} id={`question-${i}`} key={q.id}><legend>{i+1}. {q.stem}</legend>{q.options.map((o,n)=><label className={draft.answers[q.id]===n?'is-selected':''} key={n}><input type="radio" name={q.id} checked={draft.answers[q.id]===n} onChange={()=>choose(q.id,n)}/><span>{String.fromCharCode(65+n)}. {o}</span></label>)}</fieldset>)}</section></div>
  <footer className="rp-submit"><div><strong>已完成 {completed} / {paper.questions.length}</strong><small>每套练习只能正式提交一次</small>{error&&<p role="alert">{error}</p>}</div><button disabled={busy} onClick={()=>void submit()}>{busy?'正在提交…':'提交答案'}</button></footer>
 </>;
}
export function ReadingPracticeReader({practiceId,basePath,userId}:{practiceId:number;basePath:string;userId:number}) {
 const [paper,setPaper]=useState<PublicPractice>(),[result,setResult]=useState<PracticeResult>(),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;void request(getPractice(practiceId)).then(async p=>{const r=p.submitted?await request(getResult(practiceId)):undefined;if(active){setPaper(p);setResult(r);setError('');}}).catch(()=>{if(active)setError('练习暂时无法打开，请检查网络或确认你是接收人。');});return()=>{active=false;};},[practiceId,userId,retry]);
 return <main className="reading-practice"><Link className="rp-back" to={basePath}>← 返回练习列表</Link>{error?<div role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>重试</button></div>:!paper?<p role="status">正在加载练习…</p>:result?<ResultContent result={result} paper={paper}/>:paper.status==='withdrawn'?<div className="rp-empty"><h1>练习已撤回</h1><p>这套练习已停止作答，请查看其他阅读练习。</p></div>:<AnswerSheet key={`${userId}:${practiceId}`} paper={paper} userId={userId}/>}</main>;
}
