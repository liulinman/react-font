(() => {
  if (globalThis.englishWorldReadingCard) return;
  globalThis.englishWorldReadingCard = true;

  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  const stylesheet = new CSSStyleSheet();
  stylesheet.replaceSync(`
    :host { all: initial; position: fixed; z-index: 2147483647; width: min(380px, calc(100vw - 16px)); }
    .card { box-sizing: border-box; font: 14px/1.5 system-ui, sans-serif; color: #18283d; background: white;
      border: 1px solid #b4c0ce; border-radius: 10px; box-shadow: 0 8px 30px #132f4829; padding: 12px; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    strong { font-size: 16px; overflow-wrap: anywhere; }
    .body { max-height: min(480px, 65vh); overflow: auto; overflow-wrap: anywhere; }
    .label { display: block; font-weight: 600; margin-top: 12px; }
    .pronunciation { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .source-url { display: block; font-size: 12px; overflow-wrap: anywhere; }
    textarea { box-sizing: border-box; display: block; width: 100%; min-height: 76px; resize: vertical; max-height: 180px; font: inherit; color: inherit; border: 1px solid #899eb7; border-radius: 5px; padding: 7px; margin-top: 6px; }
    button:focus-visible, a:focus-visible, textarea:focus-visible { outline: 2px solid #21456f; outline-offset: 2px; }
    p, blockquote { margin: 8px 0; }
    blockquote { color: #48566a; border-left: 2px solid #b4c0ce; padding-left: 8px; }
    button { font: inherit; color: #21456f; background: #fff; cursor: pointer; border: 1px solid #899eb7; border-radius: 5px; padding: 3px 9px; }
    button:disabled { opacity: .6; cursor: wait; }
    a { color: #21456f; }
  `);
  let host;
  let close;

  function element(tag, text, parent) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    parent.append(node);
    return node;
  }

  function visibleSelectionText(block, range) {
    const before = document.createRange();
    before.selectNodeContents(block);
    before.setEnd(range.startContainer, range.startOffset);
    let text = '';
    let start = 0;

    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.data.replace(/[\r\n\t\f]/g, ' ');
        if (node === range.startContainer) start += range.startOffset;
        else if (before.comparePoint(node, node.length) <= 0) start += node.length;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE ||
          node.matches('[hidden], [aria-hidden="true"], script, style, template, noscript, input, textarea, select')) return;
      const style = getComputedStyle(node);
      if (style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) ||
          style.contentVisibility === 'hidden') return;
      if (node.tagName === 'BR') {
        text += ' ';
        if (before.comparePoint(node, 0) <= 0) start++;
        return;
      }
      for (const child of node.childNodes) visit(child);
    }

    visit(block);
    return { text, start };
  }

  function selectedContext(expected) {
    const selection = window.getSelection();
    const word = selection?.toString().trim();
    if (!selection?.rangeCount || !word || word !== expected?.trim() ||
        !/^[A-Za-z]+(?:['’\-][A-Za-z]+)*['’]?$/.test(word)) return null;
    const range = selection.getRangeAt(0);
    let block = range.commonAncestorContainer;
    if (block.nodeType !== Node.ELEMENT_NODE) block = block.parentElement;
    if (!block || block.closest('input, textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return null;
    while (block.parentElement && getComputedStyle(block).display.startsWith('inline')) block = block.parentElement;
    const visible = visibleSelectionText(block, range);
    const { text } = visible;
    const rawSelection = selection.toString();
    const start = visible.start + rawSelection.length - rawSelection.trimStart().length;
    if (text.slice(start, start + word.length) !== word ||
        /[\p{L}\p{N}’'-]/u.test(text[start - 1] ?? '') || /[\p{L}\p{N}’'-]/u.test(text[start + word.length] ?? '')) return null;
    let sentenceStart = 0;
    for (const part of segmenter.segment(text)) {
      if (/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs)\.$/i.test(part.segment.trim())) continue;
      const end = part.index + part.segment.trimEnd().length;
      if (sentenceStart <= start && start + word.length <= end) {
        const context = (text.slice(sentenceStart, start) + '<target>' + word + '</target>' + text.slice(start + word.length, end)).trim();
        if (context.length > 1000) return null;
        return {
          payload: { englishWord: word, context, url: location.href, title: document.title.slice(0, 500) },
          rect: range.getBoundingClientRect(),
        };
      }
      sentenceStart = part.index + part.segment.length;
    }
    return null;
  }

  function show(selected) {
    close?.();
    const selection = selectedContext(selected);
    const focusBefore = document.activeElement;
    const current = host = document.createElement('div');
    document.documentElement.append(current);
    const root = current.attachShadow({ mode: 'closed' });
    root.adoptedStyleSheets = [stylesheet];
    const card = element('section', '', root);
    card.className = 'card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'English World 语境查词');
    const header = element('header', '', card);
    const title = element('strong', selection?.payload.englishWord ?? '语境查词', header);
    const dismiss = element('button', '关闭', header);
    const body = element('div', '', card);
    body.className = 'body';
    body.setAttribute('aria-live', 'polite');
    const footer = element('footer', '', card);
    let speech = null;
    let noteDraft = null;

    function stopSpeech() {
      if (!speech) return;
      speech = null;
      globalThis.speechSynthesis?.cancel();
    }

    function place() {
      const rect = selection?.rect;
      current.style.left = `${Math.max(8, Math.min(rect?.left ?? 16, innerWidth - current.offsetWidth - 8))}px`;
      current.style.top = `${Math.max(8, Math.min((rect?.bottom ?? 8) + 8, innerHeight - current.offsetHeight - 8))}px`;
    }
    const observer = new ResizeObserver(place);
    observer.observe(card);
    window.addEventListener('resize', place);
    close = (restore = false) => {
      stopSpeech();
      observer.disconnect();
      window.removeEventListener('resize', place);
      current.remove();
      host = undefined;
      if (restore && focusBefore instanceof HTMLElement) focusBefore.focus({ preventScroll: true });
    };
    dismiss.onclick = () => close(true);
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close(true);
      }
    });
    dismiss.focus({ preventScroll: true });
    const active = () => host === current && current.isConnected;
    const state = (message, action, handler) => {
      body.replaceChildren();
      footer.replaceChildren();
      element('p', message, body);
      if (action) element('button', action, footer).onclick = handler;
    };
    const disconnected = () => state('连接账号后即可查询本句。', '连接 English World',
      () => void chrome.runtime.sendMessage({ kind: 'open-settings' }));

    async function query() {
      state('正在查本句含义…');
      const result = await chrome.runtime.sendMessage({ kind: 'explain', payload: selection.payload })
        .catch(() => ({ error: '查询失败，请重试。' }));
      if (!active()) return;
      if (result?.disconnected) return disconnected();
      if (!result?.data) return state(result?.error || '查询失败，请重试。', '重试查询', query);
      const draft = result.data;
      title.textContent = draft.lemma === selection.payload.englishWord ? draft.lemma : `${selection.payload.englishWord} → ${draft.lemma}`;
      body.replaceChildren();
      footer.replaceChildren();
      const pronunciation = element('p', '', body);
      pronunciation.className = 'pronunciation';
      element('span', draft.phonetic || '暂无音标', pronunciation);
      const sound = element('button', '播放发音', pronunciation);
      sound.setAttribute('aria-label', `播放 ${draft.lemma} 的发音`);
      const soundStatus = element('p', '', body);
      soundStatus.setAttribute('role', 'status');
      sound.onclick = async () => {
        sound.disabled = true;
        soundStatus.textContent = '正在准备英语发音…';
        try {
          stopSpeech();
          const synth = globalThis.speechSynthesis;
          if (!synth || !globalThis.SpeechSynthesisUtterance) throw new Error('此浏览器不支持朗读');
          let voices = synth.getVoices();
          if (!voices.length) {
            await new Promise(resolve => {
              const finish = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', finish); resolve(); };
              const timer = setTimeout(finish, 2000);
              synth.addEventListener('voiceschanged', finish, { once: true });
            });
            voices = synth.getVoices();
          }
          if (!active()) return;
          const voice = voices.find(v => /^en-GB$/i.test(v.lang)) || voices.find(v => /^en(?:-|$)/i.test(v.lang));
          if (!voice) throw new Error('未找到英语语音，请在系统中启用英语语音后重试');
          const utterance = new SpeechSynthesisUtterance(draft.lemma);
          utterance.lang = voice.lang;
          utterance.voice = voice;
          const finish = (message) => {
            if (speech !== utterance) return;
            speech = null;
            if (active()) soundStatus.textContent = message;
          };
          utterance.onend = () => finish('');
          utterance.onerror = () => finish('发音播放失败，请点击播放发音重试。');
          speech = utterance;
          soundStatus.textContent = '正在播放英语发音';
          synth.speak(utterance);
        } catch (error) {
          stopSpeech();
          if (active()) soundStatus.textContent = error.message || '发音播放失败，请重试。';
        } finally {
          if (active()) sound.disabled = false;
        }
      };
      element('span', '本句词义', body).className = 'label';
      element('p', draft.meaning, body);
      element('span', '原句', body).className = 'label';
      element('blockquote', draft.sentence, body);
      element('span', '整句译文', body).className = 'label';
      element('p', draft.sentenceTranslation || '当前服务尚未提供整句译文，请更新后重试。', body);
      element('span', '原文来源', body).className = 'label';
      const source = new URL(draft.source.url);
      if (['https:', 'http:'].includes(source.protocol)) {
        const link = element('a', draft.source.title || source.hostname, element('p', '', body));
        link.href = source.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        element('span', source.href, link).className = 'source-url';
      }
      if (draft.saved) {
        element('span', '本句已保存', footer);
        return;
      }
      const noteLabel = element('label', '单词笔记', body);
      noteLabel.className = 'label';
      const note = element('textarea', '', noteLabel);
      note.setAttribute('aria-label', '单词笔记');
      note.name = 'note';
      note.autocomplete = 'off';
      note.maxLength = 4000;
      note.value = noteDraft ?? (draft.wordExists ? '' : (draft.explanation || ''));
      note.addEventListener('input', () => { noteDraft = note.value; });
      note.placeholder = draft.wordExists ? '补充本次笔记，原有内容会保留…' : '记录用法或自己的理解…';
      const feedback = element('p', '', footer);
      feedback.setAttribute('role', 'status');
      const save = element('button', draft.wordExists ? '保存本句' : '加入词库', footer);
      save.onclick = async () => {
        save.disabled = true;
        note.disabled = true;
        feedback.textContent = '正在保存…';
        const result = await chrome.runtime.sendMessage({ kind: 'save', payload: { previewToken: draft.previewToken, note: note.value } })
          .catch(() => ({ error: '保存失败，请重试。' }));
        if (!active()) return;
        if (result?.disconnected) return disconnected();
        if (result?.expired) {
          feedback.textContent = '释义预览已过期。';
          save.disabled = false;
          save.textContent = '重新查询';
          save.onclick = query;
          return;
        }
        if (result?.data) {
          feedback.textContent = '本句已保存';
          save.remove();
          return;
        }
        feedback.textContent = result?.error || '保存失败，请重试。';
        note.disabled = false;
        save.textContent = '重试保存';
        save.disabled = false;
      };
    }

    if (selection) void query();
    else state('请在正文中选中一个完整的英文单词。');
    place();
  }

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.kind === 'read-selection') {
      show(message.selected);
      reply({ shown: true });
    }
  });
})();
