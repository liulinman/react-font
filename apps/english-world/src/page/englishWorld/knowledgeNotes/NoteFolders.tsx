import { useRef, useState } from 'react';
import { Modal } from 'antd';
import { FolderOutlined, FolderOpenOutlined, PlusOutlined, MoreOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { notesApi, noteError, type NoteFolder, type KnowledgeNote } from './api';
export function useFolders(enabled = true) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['knowledge-notes', user?.id, 'folders'], queryFn: notesApi.folders, enabled });
}
export function folderPath(folders: NoteFolder[], id: number): string {
  const parts: string[] = []; const seen = new Set<number>();
  let current = folders.find(f => f.id === id);
  while (current && !seen.has(current.id)) { seen.add(current.id); parts.unshift(current.name); current = folders.find(f => f.id === current!.parentId); }
  return parts.join(' / ');
}
function descendant(folders: NoteFolder[], id: number, ancestor?: number) {
  const seen = new Set<number>(); let node = folders.find(f => f.id === id);
  while (node && !seen.has(node.id)) { if (node.id === ancestor) return true; seen.add(node.id); node = folders.find(f => f.id === node!.parentId); }
  return false;
}
export function FolderSelect({ folders, value, onChange, exclude, rootLabel = '未归档', disabled = false }: { folders: NoteFolder[]; value: number | null; onChange: (value: number | null) => void; exclude?: number; rootLabel?: string; disabled?: boolean }) {
  return <select aria-label="目标文件夹" value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} disabled={disabled}>
    <option value="">{rootLabel}</option>
    {value !== null && !folders.some(f => f.id === value) && <option value={value}>原文件夹已失效，请重新选择</option>}
    {folders.filter(f => !descendant(folders, f.id, exclude)).map(f => <option key={f.id} value={f.id}>{folderPath(folders, f.id)}</option>)}
  </select>;
}
type Action = { kind: 'create' | 'edit' | 'delete'; folder?: NoteFolder } | { kind: 'move' };
export function NoteFolders({ current, onChoose, selected, onMoved }: { current?: number | 'unfiled'; onChoose: (id?: number | 'unfiled') => void; selected: KnowledgeNote[]; onMoved: () => void }) {
  const query = useFolders(); const folders = query.data?.list ?? [];
  const { user } = useAuth(); const client = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);
  const [moveSelection, setMoveSelection] = useState<{ id: number; version: number }[]>([]);
  const [name, setName] = useState(''); const [target, setTarget] = useState<number | null>(null);
  const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState(''); const [closed, setClosed] = useState<Set<number>>(new Set());
  const open = (next: Action) => { if (next.kind === 'move') setMoveSelection(selected.map(n => ({ id: n.id, version: n.version }))); setError(''); setName('folder' in next ? next.folder?.name ?? '' : ''); setTarget(next.kind === 'edit' ? next.folder?.parentId ?? null : next.kind === 'create' && typeof current === 'number' ? current : null); setAction(next); };
  async function save() {
    if (!action || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (action.kind === 'move') await notesApi.move(moveSelection, target);
      else if (action.kind === 'delete') await notesApi.removeFolder(action.folder!.id);
      else await notesApi.saveFolder(action.kind === 'edit' ? action.folder!.id : null, { name, parentId: target });
      await client.invalidateQueries({ queryKey: ['knowledge-notes', user?.id] });
      if (action.kind === 'delete') onChoose();
      if (action.kind === 'move') onMoved();
      setAction(null);
    } catch (e) { setError(noteError(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  function branch(parentId: number | null, depth = 0): React.ReactNode {
    if (depth >= 5) return null;
    return folders.filter(f => f.parentId === parentId).map(folder => {
      const children = folders.some(f => f.parentId === folder.id);
      return <div key={folder.id}>
        <div className={`note-folder-row${current === folder.id ? ' is-current' : ''}`} style={{ paddingLeft: depth * 12 }}>
          <button className="note-folder-toggle" aria-label={`${closed.has(folder.id) ? '展开' : '收起'} ${folder.name}`} aria-expanded={children ? !closed.has(folder.id) : undefined} disabled={!children} onClick={() => setClosed(old => { const next = new Set(old); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next; })}>{children ? closed.has(folder.id) ? '›' : '⌄' : '·'}</button>
          <button className="note-folder-link" aria-current={current === folder.id ? 'page' : undefined} onClick={() => onChoose(folder.id)} title={folderPath(folders, folder.id)}>{current === folder.id ? <FolderOpenOutlined /> : <FolderOutlined />}<span>{folder.name}</span><small>{folder.noteCount}</small></button>
          <button className="note-folder-more" aria-label={`管理文件夹 ${folder.name}`} onClick={() => open({ kind: 'edit', folder })}><MoreOutlined /></button>
        </div>
        {!closed.has(folder.id) && branch(folder.id, depth + 1)}
      </div>;
    });
  }
  return <aside className="note-folders" aria-label="笔记文件夹">
    <div className="note-folders-heading"><strong>我的文件夹</strong><button aria-label="新建文件夹" disabled={!query.data} onClick={() => open({ kind: 'create' })}><PlusOutlined /></button></div>
    <button className={`note-folder-view${current === undefined ? ' is-current' : ''}`} onClick={() => onChoose()}>全部笔记 <small>{query.data?.total ?? '—'}</small></button>
    <button className={`note-folder-view${current === 'unfiled' ? ' is-current' : ''}`} onClick={() => onChoose('unfiled')}>未归档 <small>{query.data?.unfiled ?? '—'}</small></button>
    {query.isPending ? <p role="status">正在加载文件夹…</p> : query.isError ? <div role="alert"><p>文件夹加载失败</p><button onClick={() => void query.refetch()}>重试</button></div> : <><div className="note-folder-tree">{branch(null)}</div>{!folders.length && <p className="knowledge-muted">创建文件夹，按自己的习惯整理笔记。</p>}</>}
    <button className="note-folder-create" disabled={!query.data} onClick={() => open({ kind: 'create' })}><PlusOutlined /> 新建{typeof current === 'number' ? '子' : ''}文件夹</button>
    {!!selected.length && <button className="knowledge-primary note-move-selected" disabled={!query.data} onClick={() => open({ kind: 'move' })}>移动已选 {selected.length} 条笔记</button>}
    <Modal open={!!action} title={action?.kind === 'move' ? '移动笔记' : action?.kind === 'delete' ? '删除文件夹' : action?.kind === 'edit' ? '管理文件夹' : '新建文件夹'} onCancel={() => { if (!busy) setAction(null); }} onOk={() => void save()} confirmLoading={busy} okText={action?.kind === 'delete' ? '删除文件夹，保留笔记' : action?.kind === 'move' ? '确认移动' : '保存文件夹'} cancelText="取消" closable={!busy} maskClosable={!busy} keyboard={!busy} cancelButtonProps={{ disabled: busy }} okButtonProps={{ danger: action?.kind === 'delete', disabled: !query.data || ((action?.kind === 'create' || action?.kind === 'edit') && !name.trim()) }}>
      <div className="note-folder-form">
        {error && <p role="alert" className="knowledge-error">{error}</p>}
        {action?.kind === 'delete' ? <><p>删除“{action.folder!.name}”及其所有子文件夹？</p><p>其中全部笔记会移到“未归档”，正文、分类和关联单词都会保留。</p><p className="knowledge-muted">按确认时的最新目录范围执行，包含其他设备刚移入的笔记。</p></> : <>
          {action?.kind !== 'move' && <label>文件夹名称<input aria-label="文件夹名称" value={name} maxLength={40} disabled={busy} onChange={e => setName(e.target.value)} placeholder="例如：短语辨析" /></label>}
          <label>{action?.kind === 'move' ? `将 ${moveSelection.length} 条笔记移动到` : '所在位置'}<FolderSelect folders={folders} value={target} onChange={setTarget} disabled={busy} exclude={action?.kind === 'edit' ? action.folder!.id : undefined} rootLabel={action?.kind === 'move' ? '未归档' : '我的文件夹（根目录）'} /></label>
          {action?.kind === 'edit' && <><p className="knowledge-muted">调整位置时，子文件夹与笔记会一起移动。</p><button className="note-folder-danger" disabled={busy} onClick={() => open({ kind: 'delete', folder: action.folder })}>删除此文件夹…</button></>}
        </>}
      </div>
    </Modal>
  </aside>;
}
