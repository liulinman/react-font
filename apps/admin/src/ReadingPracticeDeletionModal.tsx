import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Modal, Spin } from 'antd';
import request from '@font/api';
import { deletePractice, previewPracticeDeletion, type DeletionScope, type PracticeDeletionPreview, type PracticeDeletionResult } from './api/readingPractice';

function serverReason(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const data = error as { code?: unknown; statusCode?: unknown; message?: unknown };
  return Number.isFinite(Number(data.code ?? data.statusCode)) && typeof data.message === 'string' ? data.message : '';
}
const labels = { queued: '等待生成', generating: '生成中', draft: '待审核', published: '已发布', withdrawn: '已撤回', failed: '生成失败' };
export function ReadingPracticeDeletionModal({ id, onClose, onDeleted }: { id: number; onClose: () => void; onDeleted: (result: PracticeDeletionResult) => void }) {
  const [scope, setScope] = useState<DeletionScope>('current');
  const [preview, setPreview] = useState<PracticeDeletionPreview | null>(null);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [acknowledged, setAcknowledged] = useState(false), [error, setError] = useState('');
  const generation = useRef(0), locked = useRef(false);
  const load = async (nextScope: DeletionScope) => {
    const current = ++generation.current;
    setLoading(true); setPreview(null); setAcknowledged(false);
    try { const result = await request(previewPracticeDeletion(id, nextScope)); if (current === generation.current) setPreview(result); }
    catch (error) { if (current === generation.current) setError(serverReason(error) || '删除范围加载失败，请重新加载。'); }
    finally { if (current === generation.current) setLoading(false); }
  };
  useEffect(() => { void load(scope); return () => { generation.current++; }; }, [id, scope]);
  const remove = async () => {
    if (locked.current || !preview || loading || !acknowledged) return;
    locked.current = true; setBusy(true); setError('');
    try { const result = await request(deletePractice(id, scope, preview.confirmationToken)); onDeleted(result); }
    catch (error) { setError(`删除未完成。${serverReason(error) || '数据可能已变化或服务暂时不可用。'} 已重新加载范围，请核实后再次确认。`); await load(scope); }
    finally { locked.current = false; setBusy(false); }
  };
  const counts = preview?.counts;
  return <Modal open title="永久删除练习" width={640} okText="永久删除" cancelText="取消" okButtonProps={{ danger: true, disabled: !preview || loading || !acknowledged }} confirmLoading={busy} cancelButtonProps={{ disabled: busy }} closable={!busy} maskClosable={!busy} keyboard={!busy} onCancel={() => { if (!busy) onClose(); }} onOk={() => void remove()}>
    <Alert type="warning" showIcon message="删除后无法恢复" description="所选练习及其答卷、成绩、接收记录、通知、反馈和专属原稿将永久删除，学生将无法继续作答或查看成绩。学生账号、词库和笔记不受影响。" />
    <p><Checkbox checked={scope === 'family'} disabled={busy} onChange={e => { setError(''); setScope(e.target.checked ? 'family' : 'current'); }}>同时删除本练习的所有版本</Checkbox></p>
    <p>{scope === 'current' ? '当前范围：仅删除当前版本，其他版本保留。' : '当前范围：删除本练习的所有版本。'}</p>
    {error && <Alert type="error" showIcon message={error} />}
    {loading && <div role="status"><Spin size="small" /> 正在核实删除范围…</div>}
    {!loading && !preview && <Button onClick={() => { setError(''); void load(scope); }}>重新加载删除范围</Button>}
    {preview && counts && <>
      <ul aria-label="将删除的练习版本" style={{ maxHeight: 160, overflow: 'auto', paddingLeft: 22 }}>{preview.versions.map(v => <li key={v.id}>{v.title} · v{v.version} · {labels[v.status]}</li>)}</ul>
      <div aria-label="删除影响范围" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
        <span>练习版本：{counts.practices}</span><span>接收记录：{counts.assignments}</span><span>答卷及成绩：{counts.submissions}</span><span>通知：{counts.notifications}</span><span>阅读回执：{counts.receipts}</span><span>反馈及作答历史：{counts.events}</span><span>生成记录：{counts.runs}</span><span>专属原稿及附件：{counts.sources}</span>
      </div>
      <p>仍被其他练习使用的共用原稿将保留：{counts.sharedSources}。专属附件如未能立即清理，将进入后台重试。</p>
    </>}
    <Checkbox checked={acknowledged} disabled={!preview || loading || busy} onChange={e => setAcknowledged(e.target.checked)}>我已了解上述删除范围及不可恢复的后果，确认永久删除</Checkbox>
  </Modal>;
}
