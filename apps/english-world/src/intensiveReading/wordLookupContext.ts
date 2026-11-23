import {sentenceRange} from './readingSentence';
/** Send surrounding evidence for inference, preserving the complete clicked sentence. */
export function wordLookupContext(text: string, start: number, end: number) {
  const sentence = sentenceRange(text, start, end);
  const padding = Math.min(350, Math.max(0, Math.floor((1000 - 17 - (sentence.end - sentence.start)) / 2)));
  return text.slice(Math.max(0, sentence.start - padding), start) + '<target>' + text.slice(start, end) + '</target>' + text.slice(end, sentence.end + padding);
}
