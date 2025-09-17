/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-05-21 14:39:08
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-09-17 16:59:56
 * @FilePath: /react-font/src/server/word/word.type.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export type WordList = {
  id: number;
  englishWord: string;
  englishPhonetic?: string;
  englishType?: string;
  englishChinese?: string;
  englishNote?: string;
  englishLevel?: string;
  englishReference?: string;
  englishCreateTime?: string;
  englishUpdateTime?: string;
  englishImg?: string;
};

export type FilterWordList = {
  page: number;
  pageSize: number;
  englishChinese?: string;
  englishWord?: string;
  englishType?: string;
  englishLevel?: string;
  startTime?: string;
  endTime?: string;
};
