import {clickedSentence} from './readingSentence';
import {BritishPronunciationButton} from '@/page/englishWorld/component/BritishPronunciationButton';
import {getPartSpeechLabel} from '@/page/englishWorld/utils/wordLabels';
import {useEffect, useRef, useState} from 'react';
import {collectReadingWord, explainReadingWord, type CollectedWord, type ReadingWordDraft} from './collectedWordApi';
export default function ReadingWordCollect({word, context, onCollected}: {word: string; context: string; onCollected: (word: CollectedWord, created: boolean) => void}) {
  const [draft, setDraft] = useState<ReadingWordDraft | null>(null);
  const [phase, setPhase] = useState<'idle'|'loading'|'preview'|'adding'>('idle');
  const [error, setError] = useState('');
  const [addFailed, setAddFailed] = useState(false);
  const active = useRef(false);
  useEffect(() => { active.current = true; void explain(); return () => { active.current = false; }; }, []);
  async function explain() {
    setPhase('loading'); setError(''); setDraft(null); setAddFailed(false);
    try {
      const result = await explainReadingWord(word, context);
      if (!active.current) return;
      if (result.word) { onCollected(result.word, false); return; }
      if (!result.draft) throw new Error('暂时无法可靠解释本句含义，请结合原文重新查询');
      setDraft(result.draft); setPhase('preview');
    } catch (error) {
      if (active.current) { setError((error as Error)?.message || '释义查询失败，请重试'); setPhase('idle'); }
    }
  }
  async function collect() {
    if (!draft || phase === 'adding') return;
    setPhase('adding'); setError('');
    try {
      const result = await collectReadingWord(draft.previewToken);
      if (active.current) onCollected(result.word, result.created);
    } catch (error) {
      if (active.current) { setError((error as Error)?.message || '添加失败，请重试'); setAddFailed(true); setPhase('preview'); }
    }
  }
  return <div className="ir-word-collect" aria-busy={phase === 'loading' || phase === 'adding'}>
    {phase === 'loading' && <p role="status">正在结合原句查询含义…</p>}
    {error && <p className="ir-word-collect-error" role="alert">{error}</p>}
    {draft && <>
      <div className="ir-word-card-phonetic"><span>{draft.phonetic || '音标暂不可用'} · {getPartSpeechLabel(draft.partSpeech).label}</span><BritishPronunciationButton word={draft.lemma} ariaLabel={`播放 ${draft.lemma} 的发音`} title="播放单词发音" /></div>
      <h3>中文释义</h3><p>{draft.dictionaryMeaning || '暂无通用释义'}</p>
      <h3>本句含义</h3><p className="ir-word-card-meaning">{draft.meaning}</p>
      <p>{draft.explanation}</p>
      <details><summary>原句语境</summary><p>{clickedSentence(context)}</p></details>
      <p className="ir-word-collect-hint">AI释义，仅供参考。添加后会保存原型词及这段语境笔记。</p>
      <button className="ir-word-collect-primary" disabled={phase === 'adding'} onClick={() => void collect()}>{phase === 'adding' ? '正在添加…' : addFailed ? '重试添加' : '添加到词库'}</button>
      <button disabled={phase === 'adding'} onClick={() => void explain()}>重新查询含义</button>
    </>}
    {!draft && <button disabled={phase === 'loading'} onClick={() => void explain()}>{error ? '重试查询含义' : '查询本句含义'}</button>}
  </div>;
}
