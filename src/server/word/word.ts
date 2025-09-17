/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-05-21 14:39:08
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-09-17 17:00:01
 * @FilePath: /react-font/src/server/word/word.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { FilterWordList, WordList } from "./word.type";

export const wordFindList = () => {
  return {
    url: "/english/findWordList",
    method: "GET",
  };
};

export const wordAdd = (data: Omit<WordList, "id">) => {
  return {
    url: "/english/AddEnglishWord",
    method: "POST",
    data,
  };
};

export const wordDel = (data: { id: number }) => {
  return {
    url: "/english/delEnglishWord",
    method: "POST",
    data,
  };
};

export const wordExist = (data: { englishWord: string }) => {
  return {
    url: "/english/existEnglishWord",
    method: "POST",
    data,
  };
};

export const wordUpdate = (data: WordList) => {
  return {
    url: "/english/updateEnglishWord",
    method: "POST",
    data,
  };
};

export const wordFilter = (data: FilterWordList) => {
  return {
    url: "/english/filterWordList",
    method: "POST",
    data,
  };
};

export const uploadFile = (data: any) => {
  return {
    url: "/oss/uploadFile",
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    data,
  };
};
