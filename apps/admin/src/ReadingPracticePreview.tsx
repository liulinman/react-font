import {useEffect,useState} from 'react';
import {Drawer,Tag,Alert,Button,Checkbox} from 'antd';
import type {AdminPractice} from './api/readingPractice.type';
export function ReadingPracticePreview({paper,onClose,onApprove,busy=false}:{paper:AdminPractice|null;onClose:()=>void;onApprove?:(paper:AdminPractice)=>void;busy?:boolean}) {
 const [reviewed,setReviewed]=useState(false);
 useEffect(()=>setReviewed(false),[paper]);
 return <Drawer title={paper?.status==='draft'?'审核练习 · 含标准答案':'练习预览 · 含标准答案'} width={800} open={!!paper} onClose={onClose} footer={paper?.status==='draft'&&paper.content&&onApprove?<div style={{display:'flex',gap:16,alignItems:'center',justifyContent:'space-between'}}><Checkbox checked={reviewed} onChange={e=>setReviewed(e.target.checked)}>我已核对文章、题目、正确答案和解析</Checkbox><Button type="primary" disabled={!reviewed||busy} onClick={()=>onApprove(paper)}>审核通过并发布</Button></div>:null}>
  {paper&&<><h2>{paper.title}</h2><Tag>雅思 {paper.config.ieltsBand}</Tag><Tag>{paper.config.questionCount} 题</Tag>
   {paper.failureSummary&&<Alert type="warning" message={paper.failureSummary}/>}
   {paper.content?<div className="admin-reading-preview"><h3>阅读文章</h3>{paper.content.paragraphs.map((p,i)=><p key={i}><span className="admin-muted">{i+1}.</span> {p}</p>)}<h3>题目与解析</h3>{paper.content.questions.map((q,i)=><section key={q.id}><h4>{i+1}. {q.stem}</h4>{q.options.map((o,n)=><p key={n}>{String.fromCharCode(65+n)}. {o}{n===q.correctIndex&&<Tag color="green">正确答案</Tag>}</p>)}<p><strong>解析：</strong>{q.explanation}</p><blockquote>第 {q.evidence.paragraph} 段：{q.evidence.quote??q.evidence.missingInformation}</blockquote></section>)}</div>:<p>内容生成完成后可在此预览。</p>}
  </>}
 </Drawer>;
}
