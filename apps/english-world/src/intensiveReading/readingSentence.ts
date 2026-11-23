/// <reference lib="es2022.intl" />
/** Keep source text and offsets intact; segmentation only selects display boundaries. */
export function sentenceRange(text: string, start: number, end: number) {
  let sentenceStart = 0;
  for (const part of new Intl.Segmenter('en', {granularity: 'sentence'}).segment(text)) {
    // Intl can split titles such as “Dr. Whalen”.
    if (/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs)\.$/i.test(part.segment.trim())) continue;
    const sentenceEnd = part.index + part.segment.trimEnd().length;
    if (sentenceStart <= start && sentenceEnd >= end) return {start: sentenceStart, end: sentenceEnd};
    sentenceStart = part.index + part.segment.length;
  }
  return {start, end};
}
export function clickedSentence(context: string) {
  const start = context.indexOf('<target>');
  const close = context.indexOf('</target>', start);
  const text = context.replace(/<\/?target>/g, '');
  if (start < 0 || close < start) return text.trim();
  const range = sentenceRange(text, start, close - '<target>'.length);
  return text.slice(range.start, range.end).trim();
}
/** Only condense the machine-generated context block, leaving personal notes untouched. */
export function readingNoteForDisplay(note: string) {
  const generated = /^原文词：[ \t]*([^\n]+?) → [^\n]+\n\n原文语境：([\s\S]*?)\n\n本句含义：/;
  const match = note.match(generated);
  if (!match) return note;
  const source = match[1].trim(), context = match[2];
  const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const occurrences = [...context.matchAll(new RegExp(`\\b${escaped}\\b`, 'gi'))];
  let sentence = '历史语境无法确定唯一原句。';
  if (occurrences.length === 1) {
    const start = occurrences[0].index!;
    const range = sentenceRange(context, start, start + occurrences[0][0].length);
    sentence = context.slice(range.start, range.end).trim();
  }
  const offset = match[0].indexOf('原文语境：') + '原文语境：'.length;
  return note.slice(0, offset) + sentence + note.slice(offset + context.length);
}
