import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function formatUtcTime(utcTime: string, fmt = "YYYY-MM-DD"): string {
  return dayjs(utcTime).local().format(fmt);
}

/** 词性 → {label, color} */
export const PART_SPEECH_MAP: Record<number, { label: string; color: string }> = {
  1: { label: "动词", color: "blue" },
  2: { label: "名词", color: "green" },
  3: { label: "形容词", color: "orange" },
  4: { label: "副词", color: "purple" },
  5: { label: "代词", color: "red" },
  6: { label: "介词", color: "cyan" },
  7: { label: "连词", color: "volcano" },
  8: { label: "感叹词", color: "magenta" },
  9: { label: "未分类", color: "default" },
};

/** 单词类型 → {label, color} */
export const WORD_TYPE_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "单词", color: "blue" },
  1: { label: "短语", color: "green" },
  2: { label: "句子", color: "orange" },
};

/** 掌握程度 → {label, color} */
export const LEVEL_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "不会", color: "red" },
  1: { label: "一般", color: "orange" },
  2: { label: "熟练", color: "blue" },
  3: { label: "精通", color: "green" },
};
