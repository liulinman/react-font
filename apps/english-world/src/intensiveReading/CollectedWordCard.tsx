import {readingNoteForDisplay} from './readingSentence';
import { BritishPronunciationButton } from '@/page/englishWorld/component/BritishPronunciationButton';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseOutlined, DragOutlined } from '@ant-design/icons';
import { NoteContent } from '@/components/notes/NoteContent';
import { getPartSpeechLabel } from '@/page/englishWorld/utils/wordLabels';
import { lookupCollectedWord, type ReadingWordLookup } from './collectedWordApi';
import ReadingWordCollect from './ReadingWordCollect';
import './collectedWordCard.css';
type Point = { x: number; y: number };
// One non-modal card lives outside the scrolling reader and its clipping ancestors.
export default function CollectedWordCard({word, context = '', onClose}: {word: string; context?: string; onClose: () => void}) {
  const query = JSON.stringify([word, context]);
  const card = useRef<HTMLElement>(null);
  const drag = useRef<{id: number; x: number; y: number; origin: Point} | null>(null);
  const [position, setPosition] = useState<Point>(() => ({x: Math.max(8, window.innerWidth - 384), y: Math.max(8, window.innerHeight - 500)}));
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{query: string; status: 'loading' | 'ready' | 'error'; value?: ReadingWordLookup; message?: string; notice?: string}>({query, status: 'loading'});
  function constrain(p: Point): Point {
    const rect = card.current?.getBoundingClientRect();
    return {x: Math.max(8, Math.min(p.x, window.innerWidth - (rect?.width || 360) - 8)),
      y: Math.max(8, Math.min(p.y, window.innerHeight - (rect?.height || 200) - 8))};
  }
  useEffect(() => {
    let active = true;
    setResult({query, status: 'loading'});
    lookupCollectedWord(word, context).then(value => {
      if (active) setResult({query, status: 'ready', value});
    }).catch((error: unknown) => { if (active) setResult({query, status: 'error', message: typeof (error as Error)?.message === 'string' ? (error as Error).message.slice(0, 300) : undefined}); });
    return () => { active = false; };
  }, [word, context, attempt]);
  useEffect(() => {
    const fit = () => setPosition(p => constrain(p));
    window.addEventListener('resize', fit);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    if (card.current) observer?.observe(card.current);
    fit();
    return () => { window.removeEventListener('resize', fit); observer?.disconnect(); };
  }, []);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [onClose]);
  const current = result.query === query ? result : {status: 'loading' as const, value: null};
  const value = current.value;
  const saved = value?.word;
  return createPortal(<section ref={card} className="ir-word-card" role="dialog" aria-modal="false" aria-label={`词库卡片：${word}`}
    style={{left: position.x, top: position.y}} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
    <header className="ir-word-card-header">
      <button className="ir-word-card-handle" aria-label="移动词卡：拖拽或使用方向键" title="拖拽移动，也可用方向键调整"
        onPointerDown={e => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {id: e.pointerId, x: e.clientX, y: e.clientY, origin: position};
        }}
        onPointerMove={e => {
          const d = drag.current;
          if (d && d.id === e.pointerId) setPosition(constrain({x: d.origin.x + e.clientX - d.x, y: d.origin.y + e.clientY - d.y}));
        }}
        onPointerUp={e => { if (drag.current?.id === e.pointerId) { drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId); } }}
        onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={e => {
          const delta: Record<string, Point> = {ArrowLeft:{x:-20,y:0},ArrowRight:{x:20,y:0},ArrowUp:{x:0,y:-20},ArrowDown:{x:0,y:20}};
          if (delta[e.key]) { e.preventDefault(); const d = delta[e.key]; setPosition(p => constrain({x:p.x+d.x,y:p.y+d.y})); }
        }}><DragOutlined aria-hidden="true" /> 我的词库 <small>拖动标题可移动</small></button>
      <button className="ir-word-card-close" aria-label="关闭词库卡片" onClick={onClose}><CloseOutlined /></button>
    </header>
    <div className="ir-word-card-content" aria-busy={current.status === 'loading'}>
      <h2>{saved?.englishWord || value?.lemma || word}</h2>
      {result.query === query && result.notice && <p role="status">{result.notice}</p>}
      {value?.resolution === 'ai' && <p className="ir-word-card-source">原文词：{word} → 原型：{value.lemma}</p>}
      {current.status === 'loading' ? <p role="status">正在识别词形并查询你的词库…</p> : current.status === 'error' ? <div role="alert"><p>{result.message || "原型识别或词库查询失败，请重试。"}</p><button onClick={() => setAttempt(n => n + 1)}>重试查询</button></div> : value?.resolution === 'uncertain' ? <><p>暂时无法确定单词原型</p><p>AI未能可靠识别这个词，请结合原句确认后重试。</p><button onClick={() => setAttempt(n => n + 1)}>重新识别</button></> : saved ? <>
        <div className="ir-word-card-phonetic"><span>{saved.englishPhonetic || '未添加音标'}{saved.englishPartSpeech?.length ? ` · ${saved.englishPartSpeech.map(p => getPartSpeechLabel(p).label).join(' / ')}` : ''}</span><BritishPronunciationButton key={saved.id} word={saved.englishWord} wordId={saved.id} ariaLabel={`播放 ${saved.englishWord} 的发音`} title="播放词条发音" /></div>
        <p className="ir-word-card-meaning">{saved.englishChinese || '未填写释义'}</p>
        <h3>我的笔记</h3>{saved.englishNote ? <NoteContent text={readingNoteForDisplay(saved.englishNote)}/> : <p>这个词还没有笔记。</p>}
      </> : <><p>还没有收集这个词</p><p>词库中没有与“{value?.lemma || word}”匹配的词条。</p>{value?.resolution === 'ai' && context.trim() && <ReadingWordCollect key={query} word={word} context={context} onCollected={(word, created) => setResult(previous => previous.query === query && previous.value ? {...previous, status: 'ready', notice: created ? '已添加到词库' : '已在词库中，已显示原有内容', value: {...previous.value, word}} : previous)} />}</>}
    </div>
  </section>, document.body);
}
