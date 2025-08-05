import { WordList } from "./word.type";

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
