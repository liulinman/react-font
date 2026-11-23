import { useEffect, useState } from 'react';
import request from '@font/api';

type Source = { id: number; sentence: string; sentenceTranslation?: string | null; meaning: string; title: string | null; url: string };

function safeLink(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

export function BrowserSourceLink({ url }: { url?: string | null }) {
  const source = safeLink(url);
  if (!source) return <span>—</span>;

  return (
    <a
      href={source.href}
      title={source.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      打开原文
    </a>
  );
}

export function BrowserWordSources({ wordId }: { wordId: number }) {
  const [attempt, retry] = useState(0);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setSources(null);
    setError(false);
    void request<Source[]>({
      url: `/browser-reading/words/${wordId}/sources`,
      method: 'GET',
      config: { suppressErrorMessage: true },
    }).then(
      (data) => {
        if (!active) return;
        if (Array.isArray(data)) setSources(data);
        else setError(true);
      },
      () => { if (active) setError(true); },
    );
    return () => { active = false; };
  }, [wordId, attempt]);

  if (sources?.length === 0) return null;
  return <section className="word-dictionary-source" aria-label="原文出处">
    <h3>原文出处</h3>
    {error ? <p>暂时无法读取出处。 <button type="button" onClick={() => retry(attempt + 1)}>重试</button></p>
      : !sources ? <p role="status">正在读取出处…</p>
      : <ul className="word-dictionary-browser-sources">
        {sources.map((source) => {
          const url = safeLink(source.url);
          return <li key={source.id}>
            <strong>{source.meaning}</strong>
            <blockquote>{source.sentence}</blockquote>
            {source.sentenceTranslation && <p>整句译文：{source.sentenceTranslation}</p>}
            {url && <a href={url.href} target="_blank" rel="noopener noreferrer">{source.title || url.hostname}</a>}
            {url && <p className="word-source-url" style={{ overflowWrap: 'anywhere' }}>{url.href}</p>}
          </li>;
        })}
      </ul>}
  </section>;
}
