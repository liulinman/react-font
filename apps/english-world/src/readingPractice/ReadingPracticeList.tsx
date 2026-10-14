import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import request from '@font/api';
import {listPractices} from './api';
import type {PracticeSummary} from './types';
export function ReadingPracticeList({basePath}:{basePath:string}) {
 const [page,setPage]=useState(1),[data,setData]=useState<{list:PracticeSummary[];total:number}>(),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;void request(listPractices(page)).then(d=>{if(active){setData(d);setError('');}}).catch(()=>{if(active)setError('练习加载失败，请联网后重试。');});return()=>{active=false;};},[page,retry]);
 return <main className="reading-practice"><header className="rp-heading"><h1>阅读练习</h1><p>选择练习开始作答，已完成的练习可查看解析。</p></header>{error&&<p role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>重试</button></p>}
 {!data&&!error&&<p role="status">正在加载…</p>}{data?.list.length===0&&<div className="rp-empty"><h2>还没有收到练习</h2><p>新练习发布后，会显示在这里，并通过通知提醒你。</p></div>}
 <div className="rp-grid">{data?.list.map(p=><article className="rp-card" key={p.id}><span className={`rp-status ${p.submitted?'is-done':''}`}>{p.submitted?'已完成':p.status==='withdrawn'?'已撤回':'待完成'}</span><h2>{p.title}</h2><p>雅思 {p.ieltsBand.toFixed(1)} · {p.questionCount} 题</p><div>{p.submitted&&<strong>{p.score} 分</strong>}<Link to={`${basePath}/${p.id}${p.submitted?'/result':''}`}>{p.submitted?'查看解析':p.status==='withdrawn'?'查看状态':'开始练习'} →</Link></div></article>)}</div>
 {(data?.total??0)>12&&<nav className="rp-pagination" aria-label="练习分页"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>上一页</button><span>第 {page} 页</span><button disabled={page*12>=(data?.total??0)} onClick={()=>setPage(p=>p+1)}>下一页</button></nav>}
 </main>;
}
