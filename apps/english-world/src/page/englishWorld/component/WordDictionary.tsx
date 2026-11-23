import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Empty, Image, Spin } from 'antd';
import type { WordList } from '@/server/word/word.type';
import { NoteContent } from '@/components/notes/NoteContent';
import { BritishPronunciationButton } from './BritishPronunciationButton';
import { WordLevelQuickEdit } from './WordLevelQuickEdit';
import { WordKnowledgeLinks } from './WordNoteDisplay';
import { getLevelLabel, getPartSpeechLabel, getTypeLabel } from '../utils/wordLabels';
import { getContextLabReferenceLabel, isExternalReference, parseContextLabReference, type ParsedContextLabReference } from '../utils/contextLabReference';
import { BrowserSourceLink, BrowserWordSources } from './BrowserWordSources';
import './wordDictionary.css';
type Props={words:WordList[];loading:boolean;selectedIds:number[];onSelect:(ids:number[])=>void;onEdit:(word:WordList,note:boolean)=>void;onDelete:(id:number)=>void;onLevel:(word:WordList,level:number)=>void;updatingIds:number[];onReference?:(ref:ParsedContextLabReference,word:WordList)=>void;onAdd?:()=>void};
export function WordDictionary({words,loading,selectedIds,onSelect,onEdit,onDelete,onLevel,updatingIds,onReference,onAdd}:Props){
 const [activeId,setActiveId]=useState<number|null>(null);const content=useRef<HTMLElement>(null);
 const active=words.find(w=>w.id===activeId)??words[0];
 useEffect(()=>{if(content.current)content.current.scrollTop=0;},[active?.id]);
 const ref=active&&parseContextLabReference(active.englishReference);
 const date=(value?:string)=>value?new Date(value).toLocaleString():'未记录';
 return <Spin spinning={loading}><div className="word-dictionary" aria-label="词典式词库">
 <aside className="word-dictionary-index" aria-label="词条索引"><header><strong>我的词条</strong><Checkbox aria-label="全选当前页" checked={!!words.length&&words.every(w=>selectedIds.includes(w.id))} onChange={e=>onSelect(e.target.checked?[...new Set([...selectedIds,...words.map(w=>w.id)])]:selectedIds.filter(id=>!words.some(w=>w.id===id)))}>本页全选</Checkbox></header>
 {words.length?words.map(w=><div key={w.id} className={`word-dictionary-row${w.id===active?.id?' is-active':''}`}><Checkbox aria-label={`选择 ${w.englishWord}`} checked={selectedIds.includes(w.id)} onChange={e=>onSelect(e.target.checked?[...selectedIds,w.id]:selectedIds.filter(id=>id!==w.id))}/><button aria-label={`查看 ${w.englishWord}`} aria-current={w.id===active?.id?'true':undefined} onClick={()=>setActiveId(w.id)}><span><strong>{w.englishWord}</strong><small>{getLevelLabel(w.englishLevel).label}</small></span><p>{w.englishChinese||'未填写释义'}</p></button></div>):<Empty description="没有找到词条"><Button onClick={onAdd}>添加单词</Button></Empty>}
 </aside>
 <section className="word-dictionary-detail" ref={content} aria-label="词条完整内容">{active?<article key={active.id}>
 <header className="word-dictionary-head"><span>{getTypeLabel(active.englishType).label}</span><div><Button onClick={()=>onEdit(active,false)}>编辑词条</Button><Button danger onClick={()=>onDelete(active.id)}>删除</Button></div></header>
 <h2>{active.englishWord}</h2><div className="word-dictionary-pronunciation"><span>{active.englishPhonetic||'未添加音标'}</span><BritishPronunciationButton wordId={active.id} word={active.englishWord}/><a href={`https://www.baidu.com/s?wd=${encodeURIComponent(active.englishWord)}`} target="_blank" rel="noopener noreferrer">外部查询 ↗</a></div>
 <div className="word-dictionary-meaning"><span>{active.englishPartSpeech?.map(p=>getPartSpeechLabel(p).label).join(' / ')||'未分类'}</span><strong>{active.englishChinese||'未填写释义'}</strong></div>
 <div className="word-dictionary-level"><span>掌握程度</span><WordLevelQuickEdit word={active.englishWord} value={active.englishLevel} loading={updatingIds.includes(active.id)} onChange={level=>onLevel(active,level)}/></div>
 <section className="word-dictionary-note"><header><h3>{active.englishNote?'笔记':''}</h3><Button type="link" onClick={()=>onEdit(active,true)}>{active.englishNote?'编辑笔记':'＋记笔记'}</Button></header>{active.englishNote&&<NoteContent text={active.englishNote}/>}<WordKnowledgeLinks wordId={active.id} hasNote={!!active.englishNote}/></section>
 <section className="word-dictionary-image"><h3>词条图片</h3>{active.englishImg?<Image src={active.englishImg} alt={`${active.englishWord} 图片`} width={160}/>:<Button type="link" onClick={()=>onEdit(active,false)}>＋添加图片</Button>}</section>
 <BrowserWordSources wordId={active.id} />
 <section className="word-dictionary-source"><h3>来源与记录</h3><dl>
 <dt>引用</dt><dd>{ref?<Button type="link" onClick={()=>onReference?.(ref,active)}>{getContextLabReferenceLabel(ref)}</Button>:active.englishReference?(isExternalReference(active.englishReference)?<a href={active.englishReference} target="_blank" rel="noopener noreferrer">{active.englishReference}</a>:active.englishReference):'未填写'}</dd>
 <dt>来源链接</dt><dd><BrowserSourceLink url={active.sourceUrl} /></dd>
 <dt>添加时间</dt><dd>{date(active.englishCreateTime)}</dd><dt>更新时间</dt><dd>{date(active.englishUpdateTime)}</dd><dt>覆盖次数</dt><dd>{active.englishOverwriteCount??0} 次</dd><dt>词条编号</dt><dd>{active.id}</dd></dl></section>
 </article>:<p>选择词条后在这里阅读完整内容。</p>}</section></div></Spin>;
}
