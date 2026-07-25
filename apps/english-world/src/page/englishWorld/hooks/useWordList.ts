import { useCallback, useEffect, useRef, useState } from "react";
import request from "@font/api";
import { wordFilter } from "@/server/word/word";
import type { FilterWordList, WordList } from "@/server/word/word.type";

type ListData = {
  list: WordList[];
  total: number;
  totalPages: number;
};

type WordLevelUpdate = {
  id: number;
  englishLevel: number;
};

type WordQueryState = {
  page: number;
  pageSize: number;
  filters: Record<string, unknown>;
  revision: number;
};

export function applyWordLevelUpdates(
  words: WordList[],
  updates: WordLevelUpdate[],
) {
  const levelById = new Map(
    updates.map(({ id, englishLevel }) => [id, englishLevel]),
  );

  return words.map((word) => {
    const englishLevel = levelById.get(word.id);
    return englishLevel === undefined ? word : { ...word, englishLevel };
  });
}

export function useWordList(initialPageSize = 10) {
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalNum, setTotalNum] = useState(0);
  const [queryState, setQueryState] = useState<WordQueryState>({
    page: 1,
    pageSize: initialPageSize,
    filters: {},
    revision: 0,
  });
  const requestSequenceRef = useRef(0);
  const { page, pageSize, filters, revision } = queryState;

  useEffect(() => {
    let active = true;
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    const loadWordData = async () => {
      setLoading(true);
      try {
        const res = await request<ListData>(
          wordFilter({
            ...filters,
            page,
            pageSize,
          } as FilterWordList),
        );
        if (!active || requestSequence !== requestSequenceRef.current) return;

        const lastPage = Math.max(1, Math.ceil(res.total / pageSize));
        setTotalNum(res.total);
        if (page > lastPage) {
          setQueryState((current) =>
            current.page === page && current.pageSize === pageSize
              ? { ...current, page: lastPage }
              : current,
          );
          return;
        }
        setWordList(res.list);
      } catch (error) {
        if (!active || requestSequence !== requestSequenceRef.current) return;
        console.error("加载数据失败:", error);
        setWordList([]);
        setTotalNum(0);
      } finally {
        if (active && requestSequence === requestSequenceRef.current) {
          setLoading(false);
        }
      }
    };

    void loadWordData();

    return () => {
      active = false;
    };
  }, [filters, page, pageSize, revision]);

  const search = useCallback(async (filters: Record<string, unknown>) => {
    setQueryState((current) => ({
      ...current,
      page: 1,
      filters,
      revision: current.revision + 1,
    }));
  }, []);

  const reset = async () => {
    setQueryState((current) => ({
      page: 1,
      pageSize: initialPageSize,
      filters: {},
      revision: current.revision + 1,
    }));
  };

  const refresh = async () => {
    setQueryState((current) => ({
      ...current,
      revision: current.revision + 1,
    }));
  };

  const changePage = (nextPage: number, nextPageSize: number) => {
    setQueryState((current) => {
      const pageSizeChanged = current.pageSize !== nextPageSize;
      const page = pageSizeChanged ? 1 : nextPage;
      if (current.page === page && current.pageSize === nextPageSize) {
        return current;
      }
      return { ...current, page, pageSize: nextPageSize };
    });
  };

  const updateWordLevels = useCallback((updates: WordLevelUpdate[]) => {
    setWordList((current) => applyWordLevelUpdates(current, updates));
  }, []);

  const getCurrentFilters = () => filters;

  return {
    wordList,
    loading,
    page,
    pageSize,
    totalNum,
    getCurrentFilters,
    search,
    reset,
    refresh,
    changePage,
    updateWordLevels,
  };
}
