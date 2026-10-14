import { useCallback, useMemo, useRef, useState } from "react";
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
import "./MobileWordLibraryPage.css";

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
    ...(filters.sort ? { sort: filters.sort } : {}),
  };
}

function dedupeWords(words: WordList[]) {
  const seen = new Set<number>();
  return words.filter((word) => {
    if (seen.has(word.id)) return false;
    seen.add(word.id);
    return true;
  });
}

function sortWords(words: WordList[], sort: MobileWordUrlFilters["sort"]) {
  if (!sort) return words;
  return words.map((word, index) => ({ word, index })).sort((leftItem, rightItem) => {
    const left = leftItem.word;
    const right = rightItem.word;
    if (sort === "alphabetical") return left.englishWord.localeCompare(right.englishWord);
    const leftDate = sort === "newest" ? left.englishUpdateTime ?? left.englishCreateTime : left.englishCreateTime ?? left.englishUpdateTime;
    const rightDate = sort === "newest" ? right.englishUpdateTime ?? right.englishCreateTime : right.englishCreateTime ?? right.englishUpdateTime;
    const order = sort === "newest"
      ? String(rightDate ?? "").localeCompare(String(leftDate ?? ""))
      : String(leftDate ?? "").localeCompare(String(rightDate ?? ""));
    return order || leftItem.index - rightItem.index;
  }).map(({ word }) => word);
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
  return dedupeWords(data?.pages.flatMap((page) => page.list) ?? []);
}

async function fetchCompleteMobileWords(filters: MobileWordFilters) {
  const pages: MobileWordPage[] = [];
  const seen = new Set<number>();
  let page = 1;
  let total: number;
  for (;;) {
    const result = await fetchMobileWords({ ...filters, page, pageSize: PAGE_SIZE });
    pages.push(result);
    total = result.total;
    const before = seen.size;
    result.list.forEach((word) => seen.add(word.id));
    if (seen.size >= total) break;
    if (result.list.length === 0 || seen.size === before) {
      throw new Error("词库分页数据异常，请刷新后重试。");
    }
    page += 1;
  }
  return { list: sortWords(dedupeWords(pages.flatMap((item) => item.list)), filters.sort), total, totalPages: 1 };
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
  const [actionPending, setActionPending] = useState(false);
  const actionPendingRef = useRef(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  useMobileActivityLock("mobile-word-library-action", actionPending);

  const rootFilters = useMemo(() => toFetchFilters(filters, 1), [filters]);
  const query = useInfiniteQuery({
    initialPageParam: 1,
    queryKey: wordKeys.list(rootFilters),
    queryFn: ({ pageParam }) => filters.sort
      ? fetchCompleteMobileWords(rootFilters)
      : fetchMobileWords(toFetchFilters(filters, pageParam)),
    getNextPageParam: (lastPage, pages) => {
      if (filters.sort || lastPage.list.length === 0) return undefined;
      const unique = dedupeWords(pages.flatMap((page) => page.list)).length;
      const previous = dedupeWords(pages.slice(0, -1).flatMap((page) => page.list)).length;
      if (unique <= previous || unique >= lastPage.total) return undefined;
      return pages.length + 1;
    },
  });
  const words = filters.sort ? flattenPages(query.data) : sortWords(flattenPages(query.data), filters.sort);
  const total = query.data?.pages[0]?.total ?? 0;
  const selectedIds = selection.mode === "ids" ? selection.wordIds : words.map((word) => word.id);
  const selectedCount = selection.mode === "current-filter" ? selection.expectedTotal - selection.excludedIds.length : selectedIds.length;

  const closeFilters = useCallback(() => setFilterOpen(false), []);
  const applyFilters = useCallback((next: MobileWordUrlFilters) => {
    setFilterOpen(false);
    setSelection({ mode: "ids", wordIds: [] });
    setSearchDraft(next.q ?? "");
    setSearchParams(updateSearchParams(searchParams, next), { replace: true });
  }, [searchParams, setSearchParams]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyFilters({ ...filters, q: searchDraft.trim() || undefined });
  };

  const toggleWord = (wordId: number, checked: boolean) => {
    setSelection((current) => {
      if (current.mode === "current-filter") {
        return { ...current, excludedIds: checked ? current.excludedIds.filter(id => id !== wordId) : [...new Set([...current.excludedIds, wordId])] };
      }
      const ids = current.wordIds;
      return { mode: "ids", wordIds: checked ? [...new Set([...ids, wordId])] : ids.filter((id) => id !== wordId) };
    });
  };

  const selectPage = () => {
    setSelection({ mode: "ids", wordIds: [...new Set(words.map((word) => word.id))] });
  };

  const selectCurrentFilter = () => {
    if (!total) return;
    setSelection({ mode: "current-filter", filters: rootFilters, expectedTotal: total, excludedIds: [] });
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
    const uniqueWords = dedupeWords(result.list);
    if (result.total !== selection.expectedTotal || uniqueWords.length !== selection.expectedTotal) {
      throw new Error("筛选结果已变化，请重新选择。");
    }
    const includedWords = uniqueWords.filter(word => !selection.excludedIds.includes(word.id));
    return { ids: includedWords.map((word) => word.id), words: includedWords };
  };

  const handleSelectionAction = async (
    options: { max?: number; min?: number; onlineMessage: string },
    action: (resolved: { ids: number[]; words: WordList[] }) => void | Promise<void>,
  ) => {
    if (actionPendingRef.current) return;
    setAlert(null);
    const knownCount = selection.mode === "current-filter" ? selection.expectedTotal - selection.excludedIds.length : selection.wordIds.length;
    if (!online) {
      setAlert(options.onlineMessage);
      return;
    }
    if (options.min !== undefined && knownCount < options.min) {
      setAlert(options.min === 1 ? "请先选择至少一个词。" : `语境题需要选择 ${options.min} 到 ${options.max} 个词。`);
      return;
    }
    if (options.max !== undefined && knownCount > options.max) {
      setAlert(options.max === 20 && options.min === 3 ? "语境题需要选择 3 到 20 个词。" : "词卡学习一次最多选择 20 个词。");
      return;
    }
    actionPendingRef.current = true;
    setActionPending(true);
    try {
      const resolved = await resolveSelection();
      await action(resolved);
    } catch (error) {
      setAlert(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    } finally {
      actionPendingRef.current = false;
      setActionPending(false);
    }
  };

  const batchSetLevel = (englishLevel: number) => {
    void handleSelectionAction({ min: 1, onlineMessage: "批量修改需要联网。" }, async ({ ids }) => {
      if (!ids.length) throw new Error("请先选择至少一个词。");
      const uncertain: number[] = [];
      // Bound concurrency; wait for every response before re-reading server state.
      for (let offset = 0; offset < ids.length; offset += 5) {
        const chunk = ids.slice(offset, offset + 5);
        const results = await Promise.allSettled(chunk.map(id => request(wordUpdateLevel({ id, englishLevel }))));
        results.forEach((result, index) => { if (result.status === "rejected") uncertain.push(chunk[index]); });
      }
      await queryClient.invalidateQueries({ queryKey: wordKeys.all });
      if (uncertain.length) {
        setSelection({ mode: "ids", wordIds: uncertain });
        setAlert(`已确认更新 ${ids.length - uncertain.length} 个词，另有 ${uncertain.length} 个词未确认结果，已保留选择。请核对词库后再重试；已成功的修改不会撤销。`);
      } else {
        setSelection({ mode: "ids", wordIds: [] });
        setAlert("已更新所选词条的掌握程度。");
      }
    });
  };

  const startLearning = () => {
    void handleSelectionAction({ max: 20, min: 1, onlineMessage: "创建学习任务需要联网。" }, ({ ids }) => {
      if (!ids.length) throw new Error("请先选择至少一个词。");
      if (ids.length > 20) throw new Error("词卡学习一次最多选择 20 个词。");
      navigate(`/mobile/learn?scope=selection&wordIds=${ids.join(",")}`);
    });
  };

  const createArticle = () => {
    void handleSelectionAction({max:20,min:3,onlineMessage:"生成文章练习需要联网。"}, ({ids,words:selectedWords})=>{
      if(ids.length<3||ids.length>20)throw new Error("请选择 3 到 20 个词。");
      navigate(`/mobile/tools/context-lab/new?words=${encodeURIComponent(selectedWords.map(w=>w.englishWord).join(","))}`);
    });
  };
  const stopSelecting = () => { setSelectionMode(false); setSelection({ mode: "ids", wordIds: [] }); };
  const cachedContent = words.length > 0;
  const refreshWords = async () => {
    const result = await query.refetch({ cancelRefetch: true });
    if (!result.isError) setAlert(null);
  };
  return (
    <MobilePage className="mobile-word-library-page" data-selection-mode={selectionMode ? "true" : "false"} title="词库" actions={<Link className="word-add-button" to="/mobile/words/new"><span aria-hidden="true">＋</span>添加单词</Link>}>
      <form aria-label="搜索词库" onSubmit={submitSearch} role="search">
        <label className="word-search-label" htmlFor="mobile-library-search">搜索英语单词、中文释义或类型/掌握标签</label>
        <input placeholder="搜索单词或中文释义" id="mobile-library-search" disabled={actionPending} onChange={(event) => setSearchDraft(event.target.value)} type="search" value={searchDraft} />
        <button disabled={actionPending} type="submit">搜索</button>
      </form>
      <div className="word-library-toolbar"><span>{query.data?.pages[0]?.total ?? words.length} 个词条</span>
        <button disabled={actionPending} onClick={() => setFilterOpen(true)} ref={filterTriggerRef} type="button">筛选</button>
        <button disabled={actionPending} onClick={() => selectionMode ? stopSelecting() : setSelectionMode(true)} type="button">{selectionMode ? "取消选择" : "选择"}</button>
      </div>

      {selectionMode && <div className="word-selection-scope">
        <button disabled={actionPending} onClick={selectPage} type="button">全选当前页</button>
        <button disabled={actionPending || !total} onClick={selectCurrentFilter} type="button">使用当前筛选结果</button>
      </div>}
      {filterOpen && <MobileWordFiltersSheet filters={filters} onApply={applyFilters} onClose={closeFilters} open returnFocusRef={filterTriggerRef} />}
      {alert && <p role="alert">{alert}</p>}
      {query.isError && cachedContent && <MobileStateView action={<button onClick={() => void refreshWords()} type="button">重试刷新</button>} message="刷新失败，正在显示缓存内容，内容可能不是最新。" state="error" />}
      {!online && cachedContent && <p>当前离线，正在显示已缓存的词库内容。</p>}
      {query.isPending && <MobileStateView state="loading" />}
      {query.isError && !cachedContent && <MobileStateView action={<button onClick={() => void refreshWords()} type="button">重试加载</button>} message="词库暂时无法加载，请检查网络后重试。" state={online ? "error" : "offline"} />}
      {!query.isPending && !query.isError && !words.length && <MobileStateView message="还没有符合条件的单词。" state="empty" />}
      <PullToRefresh onRefresh={refreshWords}>
        <div className="word-library-list">{words.map((word) => (
          <MobileWordRow
            href={`/mobile/words/${word.id}`}
            key={word.id}
            menuItems={[
              { key: "edit", label: "编辑", onClick: () => navigate(`/mobile/words/${word.id}/edit`) },
              { key: "delete", label: "删除", danger: true, onClick: () => navigate(`/mobile/words/${word.id}`) },
            ]}
            onSelect={(checked) => toggleWord(word.id, checked)}
            selected={selection.mode === "ids" ? selection.wordIds.includes(word.id) : !selection.excludedIds.includes(word.id)}
            disabled={actionPending}
            selectionMode={selectionMode}
            word={word}
          />
        ))}</div>
      </PullToRefresh>
      {query.hasNextPage && <button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} type="button">{query.isFetchingNextPage ? "正在加载" : "加载更多"}</button>}
      {selectionMode && (
        <MobileWordSelectionBar
          disabled={!online || actionPending}
          onBatchLevel={batchSetLevel}

          onStartLearning={startLearning}
          onContextLab={createArticle}
          selectedCount={selectedCount}
        />
      )}

    </MobilePage>
  );
}
