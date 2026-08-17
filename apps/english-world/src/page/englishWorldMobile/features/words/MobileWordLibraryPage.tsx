import { useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PullToRefresh } from "antd-mobile";
import request from "@font/api";
import { wordUpdateLevel } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import { MobilePage } from "../../components/MobilePage";
import { MobileStateView } from "../../components/MobileStateView";
import { useMobileActivityLock } from "../../offline/MobileActivityLockContext";
import { useConnectivity } from "../../offline/useConnectivity";
import { MobileWordFiltersSheet, type MobileWordUrlFilters } from "./MobileWordFiltersSheet";
import { MobileWordRow } from "./MobileWordRow";
import { MobileWordSelectionBar, type MobileWordSelection } from "./MobileWordSelectionBar";
import { fetchMobileWords, type MobileWordFilters, type MobileWordPage, wordKeys } from "./wordQueries";

const PAGE_SIZE = 20;

function readNumber(value: string | null) {
  if (value === null || value === "") return undefined;
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
}

function readFilters(searchParams: URLSearchParams): MobileWordUrlFilters {
  const sort = searchParams.get("sort");
  return {
    ...(searchParams.get("q") ? { q: searchParams.get("q")! } : {}),
    ...(searchParams.get("word") ? { word: searchParams.get("word")! } : {}),
    ...(searchParams.get("meaning") ? { meaning: searchParams.get("meaning")! } : {}),
    ...(searchParams.get("phonetic") ? { phonetic: searchParams.get("phonetic")! } : {}),
    ...(readNumber(searchParams.get("type")) !== undefined ? { type: readNumber(searchParams.get("type")) } : {}),
    ...(readNumber(searchParams.get("level")) !== undefined ? { level: readNumber(searchParams.get("level")) } : {}),
    ...(searchParams.get("start") ? { start: searchParams.get("start")! } : {}),
    ...(searchParams.get("end") ? { end: searchParams.get("end")! } : {}),
    ...(sort === "newest" || sort === "oldest" || sort === "alphabetical" ? { sort } : {}),
  };
}

function toFetchFilters(filters: MobileWordUrlFilters, page: number): MobileWordFilters {
  return {
    page,
    pageSize: PAGE_SIZE,
    ...(filters.q ? { search: filters.q } : {}),
    ...(filters.word ? { englishWord: filters.word } : {}),
    ...(filters.meaning ? { englishChinese: filters.meaning } : {}),
    ...(filters.phonetic ? { englishPhonetic: filters.phonetic } : {}),
    ...(filters.type !== undefined ? { englishType: filters.type } : {}),
    ...(filters.level !== undefined ? { englishLevel: filters.level } : {}),
    ...(filters.start ? { startTime: filters.start } : {}),
    ...(filters.end ? { endTime: filters.end } : {}),
  };
}

function sortWords(words: WordList[], sort: MobileWordUrlFilters["sort"]) {
  if (!sort) return words;
  return [...words].sort((left, right) => {
    if (sort === "alphabetical") return left.englishWord.localeCompare(right.englishWord);
    const leftDate = sort === "newest" ? left.englishUpdateTime ?? left.englishCreateTime : left.englishCreateTime ?? left.englishUpdateTime;
    const rightDate = sort === "newest" ? right.englishUpdateTime ?? right.englishCreateTime : right.englishCreateTime ?? right.englishUpdateTime;
    return sort === "newest"
      ? String(rightDate ?? "").localeCompare(String(leftDate ?? ""))
      : String(leftDate ?? "").localeCompare(String(rightDate ?? ""));
  });
}

function updateSearchParams(searchParams: URLSearchParams, next: MobileWordUrlFilters) {
  const params = new URLSearchParams();
  const values: Array<[keyof MobileWordUrlFilters, string]> = [
    ["q", "q"], ["word", "word"], ["meaning", "meaning"], ["phonetic", "phonetic"],
    ["type", "type"], ["level", "level"], ["start", "start"], ["end", "end"], ["sort", "sort"],
  ];
  for (const [key, value] of values) {
    const item = next[key];
    if (item !== undefined && item !== "") params.set(value, String(item));
  }
  for (const [key] of searchParams) {
    if (!params.has(key) && !values.some(([, value]) => value === key)) params.set(key, searchParams.get(key)!);
  }
  return params;
}

function flattenPages(data?: InfiniteData<MobileWordPage>) {
  return data?.pages.flatMap((page) => page.list) ?? [];
}

export function MobileWordLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const online = useConnectivity();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.q ?? "");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState<MobileWordSelection>({ mode: "ids", wordIds: [] });
  const [alert, setAlert] = useState<string | null>(null);
  const [batchPending, setBatchPending] = useState(false);
  useMobileActivityLock("mobile-word-library-batch", batchPending);

  const rootFilters = useMemo(() => toFetchFilters(filters, 1), [filters]);
  const query = useInfiniteQuery({
    initialPageParam: 1,
    queryKey: wordKeys.list(rootFilters),
    queryFn: ({ pageParam }) => fetchMobileWords(toFetchFilters(filters, pageParam)),
    getNextPageParam: (lastPage, pages) => {
      const length = pages.flatMap((page) => page.list).length;
      return length < lastPage.total ? pages.length + 1 : undefined;
    },
  });
  const words = sortWords(flattenPages(query.data), filters.sort);
  const total = query.data?.pages[0]?.total ?? 0;
  const selectedIds = selection.mode === "ids" ? selection.wordIds : words.map((word) => word.id);
  const selectedCount = selection.mode === "current-filter" ? selection.expectedTotal : selectedIds.length;

  const applyFilters = (next: MobileWordUrlFilters) => {
    setFilterOpen(false);
    setSelection({ mode: "ids", wordIds: [] });
    setSearchDraft(next.q ?? "");
    setSearchParams(updateSearchParams(searchParams, next), { replace: true });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters({ ...filters, q: searchDraft.trim() || undefined });
  };

  const toggleWord = (wordId: number, checked: boolean) => {
    setSelection((current) => {
      const ids = current.mode === "ids" ? current.wordIds : [];
      return { mode: "ids", wordIds: checked ? [...new Set([...ids, wordId])] : ids.filter((id) => id !== wordId) };
    });
  };

  const selectPage = () => {
    setSelection({ mode: "ids", wordIds: [...new Set(words.map((word) => word.id))] });
  };

  const selectCurrentFilter = () => {
    if (!total) return;
    setSelection({ mode: "current-filter", filters: rootFilters, expectedTotal: total });
  };

  const resolveSelection = async () => {
    if (selection.mode === "ids") {
      const selectedWords = words.filter((word) => selection.wordIds.includes(word.id));
      return { ids: selection.wordIds, words: selectedWords };
    }
    const result = await fetchMobileWords({
      ...(selection.filters as MobileWordFilters),
      page: 1,
      pageSize: selection.expectedTotal,
    });
    if (result.total !== selection.expectedTotal || result.list.length !== selection.expectedTotal) {
      throw new Error("筛选结果已变化，请重新选择。");
    }
    return { ids: result.list.map((word) => word.id), words: result.list };
  };

  const handleSelectionAction = async (action: (resolved: { ids: number[]; words: WordList[] }) => void | Promise<void>) => {
    setAlert(null);
    try {
      const resolved = await resolveSelection();
      await action(resolved);
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    }
  };

  const batchSetLevel = (englishLevel: number) => {
    void handleSelectionAction(async ({ ids }) => {
      if (!online) throw new Error("批量修改需要联网。");
      if (!ids.length) throw new Error("请先选择至少一个词。");
      const snapshots = queryClient.getQueriesData<InfiniteData<MobileWordPage>>({ queryKey: wordKeys.all });
      queryClient.setQueriesData<InfiniteData<MobileWordPage>>({ queryKey: wordKeys.all }, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            list: page.list.map((word) => ids.includes(word.id) ? { ...word, englishLevel } : word),
          })),
        };
      });
      setBatchPending(true);
      try {
        await Promise.all(ids.map((id) => request(wordUpdateLevel({ id, englishLevel }))));
      } catch {
        snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
        throw new Error("批量设置失败，已恢复原来的掌握程度。");
      } finally {
        setBatchPending(false);
      }
      await queryClient.invalidateQueries({ queryKey: wordKeys.all });
      setAlert("已更新所选词条的掌握程度。");
    });
  };

  const startLearning = () => {
    void handleSelectionAction(({ ids }) => {
      if (!online) throw new Error("创建学习任务需要联网。");
      if (!ids.length) throw new Error("请先选择至少一个词。");
      if (ids.length > 20) throw new Error("混合记忆一次最多选择 20 个词。");
      navigate(`/mobile/learn?scope=selection&wordIds=${ids.join(",")}`);
    });
  };

  const createContextLab = () => {
    void handleSelectionAction(({ ids, words: selectedWords }) => {
      if (!online) throw new Error("生成语境题需要联网。");
      if (ids.length < 3 || ids.length > 20) throw new Error("语境题需要选择 3 到 20 个词。");
      navigate(`/mobile/tools/context-lab/new?source=word-library&words=${encodeURIComponent(selectedWords.map((word) => word.englishWord).join(","))}`);
    });
  };

  const cachedContent = words.length > 0;
  const refreshWords = async () => {
    await queryClient.invalidateQueries({ queryKey: wordKeys.list(rootFilters) });
    await query.refetch();
  };
  return (
    <MobilePage className="mobile-word-library-page" title="词库">
      <form aria-label="搜索词库" onSubmit={submitSearch} role="search">
        <label htmlFor="mobile-library-search">搜索单词、释义或标签</label>
        <input id="mobile-library-search" onChange={(event) => setSearchDraft(event.target.value)} type="search" value={searchDraft} />
        <button type="submit">搜索</button>
        <button onClick={() => setFilterOpen(true)} type="button">筛选</button>
        <button onClick={() => setSelectionMode((current) => !current)} type="button">{selectionMode ? "取消选择" : "选择"}</button>
      </form>

      {filterOpen && <MobileWordFiltersSheet filters={filters} onApply={applyFilters} onClose={() => setFilterOpen(false)} open />}
      {alert && <p role="alert">{alert}</p>}
      {!online && cachedContent && <p>当前离线，正在显示已缓存的词库内容。</p>}
      {query.isPending && <MobileStateView state="loading" />}
      {query.isError && !cachedContent && <MobileStateView message="词库暂时无法加载，请稍后重试。" state={online ? "error" : "offline"} />}
      {!query.isPending && !query.isError && !words.length && <MobileStateView message="还没有符合条件的单词。" state="empty" />}
      <PullToRefresh onRefresh={refreshWords}>
        {words.map((word) => (
          <MobileWordRow
            href={`/mobile/words/${word.id}`}
            key={word.id}
            menuItems={[
              { key: "edit", label: "编辑", onClick: () => navigate(`/mobile/words/${word.id}/edit`) },
              { key: "delete", label: "删除", danger: true, onClick: () => navigate(`/mobile/words/${word.id}`) },
            ]}
            onSelect={(checked) => toggleWord(word.id, checked)}
            selected={selection.mode === "ids" && selection.wordIds.includes(word.id)}
            selectionMode={selectionMode}
            word={word}
          />
        ))}
      </PullToRefresh>
      {query.hasNextPage && <button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} type="button">{query.isFetchingNextPage ? "正在加载" : "加载更多"}</button>}
      {selectionMode && (
        <MobileWordSelectionBar
          disabled={!online || batchPending}
          onBatchLevel={batchSetLevel}
          onContextLab={createContextLab}
          onSelectCurrentFilter={selectCurrentFilter}
          onSelectPage={selectPage}
          onStartLearning={startLearning}
          onStopSelecting={() => { setSelectionMode(false); setSelection({ mode: "ids", wordIds: [] }); }}
          selectedCount={selectedCount}
          selection={selection}
        />
      )}
      <Link to="/mobile/words/new">添加单词</Link>
    </MobilePage>
  );
}
