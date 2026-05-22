import { useCallback, useEffect, useRef, useState } from "react";
import request from "@font/api";
import { wordFilter } from "@/server/word/word";
import type { FilterWordList, WordList } from "@/server/word/word.type";

type ListData = {
  list: WordList[];
  total: number;
  totalPages: number;
};

export function useWordList(initialPageSize = 10) {
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalNum, setTotalNum] = useState(0);
  const filterParamsRef = useRef<Record<string, unknown>>({});

  const fetchWordData = useCallback(
    async (
      nextPage: number,
      nextPageSize: number,
      filters: Record<string, unknown> = filterParamsRef.current,
    ) => {
      setLoading(true);
      try {
        const res = await request<ListData>(
          wordFilter({
            page: nextPage,
            pageSize: nextPageSize,
            ...filters,
          } as FilterWordList),
        );
        setWordList(res.list);
        setTotalNum(res.total);
      } catch (error) {
        console.error("加载数据失败:", error);
        setWordList([]);
        setTotalNum(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchWordData(page, pageSize);
  }, [fetchWordData, page, pageSize]);

  const search = async (filters: Record<string, unknown>) => {
    filterParamsRef.current = filters;
    setPage(1);
    await fetchWordData(1, pageSize, filters);
  };

  const reset = async () => {
    filterParamsRef.current = {};
    setPage(1);
    setPageSize(initialPageSize);
    await fetchWordData(1, initialPageSize, {});
  };

  const refresh = async () => {
    await fetchWordData(page, pageSize, filterParamsRef.current);
  };

  const changePage = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  const getCurrentFilters = () => filterParamsRef.current;

  return {
    wordList,
    loading,
    page,
    pageSize,
    totalNum,
    getCurrentFilters,
    fetchWordData,
    search,
    reset,
    refresh,
    changePage,
  };
}
