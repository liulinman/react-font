import {useCallback,useEffect,useRef,useState} from 'react';
import {Alert,Button,Modal,Space,Table,Tag} from 'antd';
import request from '@font/api';
import {getPractice,listPractices,practiceAction} from './api/readingPractice';
import type {AdminPractice,PracticeConfig} from './api/readingPractice.type';
import {ReadingPracticeEditor} from './ReadingPracticeEditor';
import {ReadingPracticePreview} from './ReadingPracticePreview';
import {formatDate} from './adminPresentation';
export const practiceLabels:Record<AdminPractice['status'],string>={queued:'等待生成',generating:'生成中',draft:'待审核',published:'已发布',withdrawn:'已撤回',failed:'生成失败'};
export function ReadingPracticePanel({initialId}:{initialId?:number}) {
 const [rows,setRows]=useState<AdminPractice[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [editor,setEditor]=useState(false),[initial,setInitial]=useState<PracticeConfig>(),[preview,setPreview]=useState<AdminPractice|null>(null);
 const [pending,setPending]=useState<{row:AdminPractice;action:'publish'|'withdraw'|'delete'}|null>(null),[busy,setBusy]=useState(false);
 const lock=useRef(false),version=useRef(0);
 const refresh=useCallback(async()=>{const v=++version.current;setLoading(true);try{const data=await request(listPractices(page));if(v!==version.current)return;setRows(data.list);setTotal(data.total);setError('');if(page>Math.max(1,Math.ceil(data.total/20)))setPage(Math.max(1,Math.ceil(data.total/20)));}catch{if(v===version.current)setError('练习列表加载失败，请重试。');}finally{if(v===version.current)setLoading(false);}},[page]);
 useEffect(()=>{void refresh();return()=>{version.current++;};},[refresh]);
 useEffect(()=>{if(!rows.some(r=>['queued','generating'].includes(r.status)))return;const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[rows,refresh]);
 const openPreview=useCallback(async(id:number)=>{try{setPreview(await request(getPractice(id)));}catch{setError('预览加载失败，请重试。');}},[]);
 useEffect(()=>{if(initialId)void openPreview(initialId);},[initialId,openPreview]);
 const act=async(id:number,action:'publish'|'withdraw'|'retry'|'delete')=>{if(lock.current)return;lock.current=true;setBusy(true);try{await request(practiceAction(id,action));setPending(null);if(action==='publish')setPreview(null);await refresh();}catch{setError('操作未完成，请检查练习状态和接收人后重试。');}finally{lock.current=false;setBusy(false);}};
 return <section className="admin-panel">
  <div className="admin-list-toolbar"><div><h2>阅读练习 <span className="admin-count">{total}</span></h2><p>AI 生成文章与配套题，审核后发给用户独立完成。</p></div><Space><Button onClick={()=>void refresh()} loading={loading}>刷新练习</Button><Button type="primary" onClick={()=>{setInitial(undefined);setEditor(true);}}>新建练习</Button></Space></div>
  {error&&<Alert message={error} type="error" showIcon/>}
  <Table rowKey="id" dataSource={rows} loading={loading} scroll={{x:950}} locale={{emptyText:'还没有练习，点击“新建练习”开始'}} pagination={{current:page,pageSize:20,total,onChange:setPage}} columns={[
   {title:'练习',render:(_,r:AdminPractice)=><div className="admin-title-cell"><button className="admin-title-link" onClick={()=>void openPreview(r.id)}><strong>{r.title}</strong></button><small>雅思 {r.config.ieltsBand} · {r.config.questionCount} 题</small>{r.failureSummary&&<small role="status">{r.failureSummary}</small>}</div>},
   {title:'状态',width:115,render:(_,r:AdminPractice)=><Tag color={r.status==='published'?'green':r.status==='failed'?'red':'blue'}>{practiceLabels[r.status]}</Tag>},
   {title:'完成 / 接收',width:120,render:(_,r:AdminPractice)=>`${r.submittedCount} / ${r.assignedCount}`},
   {title:'创建时间',dataIndex:'createdAt',width:165,render:formatDate},
   {title:'操作',width:285,render:(_,r:AdminPractice)=><Space wrap size={0}>
    <Button type="link" onClick={()=>void openPreview(r.id)}>{r.status==='draft'?'审核练习':'预览'}</Button>
    {r.status==='published'&&<Button type="text" onClick={()=>setPending({row:r,action:'withdraw'})}>撤回</Button>}
    {r.status==='failed'&&<Button loading={busy} onClick={()=>void act(r.id,'retry')}>重试生成</Button>}
    {!['queued','generating'].includes(r.status)&&<Button type="text" onClick={()=>{setInitial(r.config);setEditor(true);}}>再生成</Button>}
    {['draft','failed','queued'].includes(r.status)&&<Button type="text" danger onClick={()=>setPending({row:r,action:'delete'})}>删除</Button>}
   </Space>},
  ]}/>
  {editor&&<ReadingPracticeEditor open onClose={()=>setEditor(false)} initial={initial} onCreated={()=>void refresh()}/>}
  <ReadingPracticePreview paper={preview} onClose={()=>setPreview(null)} busy={busy} onApprove={row=>setPending({row,action:"publish"})}/>
  <Modal open={!!pending} title={pending?.action==='publish'?'审核通过并发布练习':pending?.action==='withdraw'?'确认撤回练习':'确认删除草稿'} okText={pending?.action==='publish'?'确认发布':pending?.action==='withdraw'?'确认撤回':'确认删除'} cancelText="取消" confirmLoading={busy} cancelButtonProps={{disabled:busy}} closable={!busy} maskClosable={!busy} keyboard={!busy} onCancel={()=>{if(!busy)setPending(null);}} onOk={()=>{if(pending)void act(pending.row.id,pending.action);}}>
   <h3>{pending?.row.title}</h3><p>{pending?.action==='publish'?`将发布给${pending.row.config.targetType==='all'?'当前全部正常用户':`${pending.row.config.targetUserIds?.length??0} 位指定用户`}。发布后内容固定，每人可提交一次。`:pending?.action==='withdraw'?'停止新的提交，已经提交的用户仍可查看成绩与解析。':'将删除这份未发布练习。'}</p>{error&&<Alert type="error" message={error}/>}
  </Modal>
 </section>;
}
