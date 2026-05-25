export type WordTagColor =
  | "blue"
  | "green"
  | "orange"
  | "red"
  | "default";

export type WordLabel = {
  label: string;
  color: WordTagColor;
};

const TYPE_LABELS: Record<number, WordLabel> = {
  0: { label: "单词", color: "blue" },
  1: { label: "短语", color: "green" },
  2: { label: "句子", color: "orange" },
};

const LEVEL_LABELS: Record<number, WordLabel> = {
  0: { label: "不会", color: "red" },
  1: { label: "一般", color: "orange" },
  2: { label: "熟练", color: "blue" },
  3: { label: "精通", color: "green" },
};

const PART_SPEECH_LABELS: Record<number, WordLabel> = {
  1: { label: "动词", color: "blue" },
  2: { label: "名词", color: "green" },
  3: { label: "形容词", color: "orange" },
  4: { label: "副词", color: "default" },
  5: { label: "代词", color: "red" },
  6: { label: "介词", color: "default" },
  7: { label: "连词", color: "default" },
  8: { label: "感叹词", color: "default" },
  9: { label: "未分类", color: "default" },
};

export function getTypeLabel(type?: number) {
  return TYPE_LABELS[type ?? 0] ?? TYPE_LABELS[0];
}

export function getLevelLabel(level?: number) {
  return LEVEL_LABELS[level ?? 0] ?? LEVEL_LABELS[0];
}

export function getPartSpeechLabel(partSpeech?: number) {
  return PART_SPEECH_LABELS[partSpeech ?? 9] ?? PART_SPEECH_LABELS[9];
}
