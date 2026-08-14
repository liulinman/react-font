export type ArticleTranslationBlock = {
  english: string;
  chinese?: string;
};

export function splitArticleTranslationBlocks(article: string) {
  return article
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function mergeArticleTranslationBlocks(
  englishBlocks: string[],
  chineseBlocks: string[],
): ArticleTranslationBlock[] {
  return englishBlocks.map((english, index) => ({
    english,
    chinese: chineseBlocks[index]?.trim() || undefined,
  }));
}

export function buildArticleTranslationBlocks(
  article: string,
  chineseBlocks: string[],
) {
  return mergeArticleTranslationBlocks(
    splitArticleTranslationBlocks(article),
    chineseBlocks,
  );
}
