import { useState } from 'react';
import { Alert, Button, Checkbox, Input, Space } from 'antd';
import { sourceUrl, type Source } from './ReadingImport';

export interface SourceVerification {
  sourceId: string;
  reason: string;
  evidence: string;
}
export function ReadingSourceIssueReview({ sources, disabled, onVerify, onSupplement }: {
  sources: Source[];
  disabled: boolean;
  onVerify: (input: SourceVerification) => Promise<unknown>;
  onSupplement: () => void;
}) {
  const [sourceId, setSourceId] = useState(sources[0]?.id || '');
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [compared, setCompared] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const source = sources.find(s => s.id === sourceId);
  return <details className="reading-source-verification">
    <summary>核对原稿文字</summary>
    <p>拼写或印刷疑问需要对照原稿核实。确认只处理这条提示，文章、答案和发布状态保持不变。</p>
    {!sources.length ? <><Alert type="warning" message="当前没有可核对的原稿，请先补充原稿。" /><Button disabled={disabled} onClick={onSupplement}>补充原稿</Button></> : <>
      <label>核对的原稿
        <select aria-label="核对的原稿" value={sourceId} disabled={disabled} onChange={e => { setSourceId(e.target.value); setCompared(false); setUnavailable(false); setReason(''); setEvidence(''); }}>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      {source && <div className="reading-source-verification-preview" key={source.id}>
        <a href={sourceUrl(source)} target="_blank" rel="noreferrer">打开所选原稿 ↗</a>
        {source.mime.startsWith('image/') ? <img src={sourceUrl(source)} alt={`核对原稿：${source.name}`} onError={() => { setUnavailable(true); setCompared(false); }} /> : <iframe src={sourceUrl(source)} title={`核对原稿：${source.name}`} />}
      </div>}
      {unavailable && <Alert type="error" message="原稿未能加载，请重新打开或补充原稿后核对。" />}
      <label>核对说明<Input.TextArea aria-label="核对说明" placeholder="说明为何当前文字与原稿一致，例如原稿本身存在印刷拼写。" maxLength={3000} value={reason} disabled={disabled} onChange={e => setReason(e.target.value)} /></label>
      <label>原稿依据<Input.TextArea aria-label="原稿依据" placeholder="填写页码、位置和原稿中的文字。" maxLength={3000} value={evidence} disabled={disabled} onChange={e => setEvidence(e.target.value)} /></label>
      <Checkbox checked={compared} disabled={disabled || unavailable} onChange={e => setCompared(e.target.checked)}>我已查看所选原稿，确认当前文字与原稿一致</Checkbox>
      <Space wrap><Button type="primary" disabled={disabled || unavailable || !source || !compared || !reason.trim() || !evidence.trim()} onClick={() => void onVerify({ sourceId, reason: reason.trim(), evidence: evidence.trim() })}>确认与原稿一致</Button><Button disabled={disabled} onClick={onSupplement}>补充原稿</Button></Space>
    </>}
  </details>;
}
