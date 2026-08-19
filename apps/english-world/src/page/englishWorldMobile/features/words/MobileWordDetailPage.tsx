import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Dialog } from "antd-mobile";
import request from "@font/api";
import { wordDel } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import { useAuth } from "@/contexts/AuthContext";
import { isExternalReference } from "@/page/englishWorld/utils/contextLabReference";
import {
  getLevelLabel,
  getPartSpeechLabel,
  getTypeLabel,
} from "@/page/englishWorld/utils/wordLabels";
import { MobileImageViewer } from "../../components/MobileImageViewer";
import { MobilePage } from "../../components/MobilePage";
import { MobileStateView } from "../../components/MobileStateView";
import { MobileBritishPronunciationButton } from "../../MobileBritishPronunciationButton";
import { useMobileActivityLock } from "../../offline/MobileActivityLockContext";
import { useConnectivity } from "../../offline/useConnectivity";
import { recentWordStore } from "../home/recentWordStore";
import {
  fetchMobileWordDetail,
  findWordById,
  type MobileWordPage,
  wordKeys,
} from "./wordQueries";

function parseWordId(raw: string | undefined) {
  const id = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * The library composes list queries as `InfiniteData<MobileWordPage>`, but a
 * caller may seed a bare `MobileWordPage` directly (e.g. tests, or a future
 * warm cache write). Normalize either shape into a flat page list so the detail
 * resolver can scan everything that is cached under `wordKeys.lists`.
 */
function extractPages(data: unknown): MobileWordPage[] {
  if (!data) return [];
  if (typeof data !== "object") return [];
  if (Array.isArray((data as InfiniteData<MobileWordPage>).pages)) {
    return (data as InfiniteData<MobileWordPage>).pages;
  }
  if (Array.isArray((data as MobileWordPage).list)) {
    return [data as MobileWordPage];
  }
  return [];
}

function readWordFromListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number,
): WordList | null {
  const matches = queryClient.getQueriesData({ queryKey: wordKeys.lists });
  for (const [, data] of matches) {
    const word = findWordById(extractPages(data), id);
    if (word) return word;
  }
  return null;
}

function formatTimestamp(value?: string) {
  return value ? value.replace("T", " ").trim() : "";
}

export function MobileWordDetailPage() {
  const params = useParams<{ wordId: string }>();
  const wordId = parseWordId(params.wordId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const online = useConnectivity();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  useMobileActivityLock("mobile-word-delete", deleting);

  const query = useQuery({
    enabled: wordId !== null,
    queryKey: wordId !== null ? wordKeys.detail(wordId) : ["mobile", "words", "detail", "invalid"],
    queryFn: async () => {
      if (wordId === null) throw new Error("单词 ID 无效。");
      // Prefer the already-fetched list cache so a navigation from the library
      // resolves instantly without the broad `wordFindList` fallback.
      const cached = readWordFromListCache(queryClient, wordId);
      if (cached) return cached;
      return fetchMobileWordDetail(wordId);
    },
    retry: false,
  });

  const word = query.data;
  const recordedIdRef = useRef<number | null>(null);

  // Record a successful detail view exactly once per resolved word id. The
  // home page only reads this cache; it never records. We key on the word id
  // (a primitive) so refetches returning the same word do not double-record,
  // and a recovery from error (undefined -> id) records a single time.
  useEffect(() => {
    if (!word || !user) return;
    if (recordedIdRef.current === word.id) return;
    recordedIdRef.current = word.id;
    void recentWordStore.record(user.id, word);
  }, [word, user]);

  const partSpeechLabels = useMemo(
    () => (word?.englishPartSpeech ?? []).map((value) => getPartSpeechLabel(value).label),
    [word],
  );

  if (wordId === null) {
    return (
      <MobilePage title="单词详情">
        <MobileStateView message="单词 ID 无效。" state="error" />
        <Link to="/mobile/words">返回词库</Link>
      </MobilePage>
    );
  }

  if (query.isPending) {
    return (
      <MobilePage title="单词详情">
        <MobileStateView state="loading" />
      </MobilePage>
    );
  }

  if (query.isError || !word) {
    return (
      <MobilePage title="单词详情">
        <MobileStateView
          action={<button onClick={() => void query.refetch()} type="button">重试</button>}
          message={query.error instanceof Error ? query.error.message : "单词暂时无法加载，请检查网络后重试。"}
          state={online ? "error" : "offline"}
        />
        <Link to="/mobile/words">返回词库</Link>
      </MobilePage>
    );
  }

  const typeLabel = getTypeLabel(word.englishType);
  const levelLabel = getLevelLabel(word.englishLevel);
  const dictionaryHref = `https://www.baidu.com/s?wd=${encodeURIComponent(word.englishWord)}`;
  const createTime = formatTimestamp(word.englishCreateTime);
  const updateTime = formatTimestamp(word.englishUpdateTime);

  const closeDelete = () => setDeleteOpen(false);

  const confirmDelete = async () => {
    if (deletingRef.current) return;
    if (!online) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await request(wordDel({ id: word.id }));
      // `wordKeys.all` is the approved consistency boundary; it invalidates
      // both list and detail families so the library never shows a deleted row.
      await queryClient.invalidateQueries({ queryKey: wordKeys.all });
      setDeleteOpen(false);
      navigate("/mobile/words");
    } catch (error) {
      console.error("删除单词失败:", error);
      setDeleteOpen(false);
      // Keep the user on the detail page so they can retry; the lock is released.
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  const deleteDialogTitle = `删除 ${word.englishWord}？`;

  return (
    <MobilePage title={word.englishWord}>
      <a href="/mobile/words" onClick={(event) => { event.preventDefault(); navigate("/mobile/words"); }}>返回词库</a>
      <section aria-label="单词概况">
        {word.englishPhonetic && <p>{word.englishPhonetic}</p>}
        {word.englishChinese && <p>{word.englishChinese}</p>}
        <p>
          <span aria-label={`类型：${typeLabel.label}`}>{typeLabel.label}</span>
          <span aria-label={`掌握程度：${levelLabel.label}`}>{levelLabel.label}</span>
          {partSpeechLabels.map((label, index) => (
            <span aria-label={`词性：${label}`} key={`${label}-${index}`}>{label}</span>
          ))}
        </p>
      </section>

      <section aria-label="释义与笔记">
        {word.englishNote && <p>{word.englishNote}</p>}
      </section>

      <section aria-label="来源">
        <h3>来源</h3>
        {word.englishReference && isExternalReference(word.englishReference) ? (
          <a href={word.englishReference} rel="noopener noreferrer" target="_blank">查看来源</a>
        ) : word.englishReference ? (
          <span>有引用</span>
        ) : (
          <span>暂无来源</span>
        )}
      </section>

      {word.englishImg && (
        <section aria-label="单词图片">
          <MobileImageViewer alt={`${word.englishWord} 图片`} src={word.englishImg} />
        </section>
      )}

      <section aria-label="操作">
        <Link to={`/mobile/words/${word.id}/edit`}>编辑</Link>
        <Link to="/mobile/learn">开始复习</Link>
        <a href={dictionaryHref} rel="noopener noreferrer" target="_blank">百度查询</a>
        <MobileBritishPronunciationButton ariaLabel={`播放 ${word.englishWord} 的英式发音`} word={word.englishWord} />
        <button
          disabled={!online || deleting}
          onClick={() => setDeleteOpen(true)}
          type="button"
        >
          删除单词
        </button>
      </section>

      {(createTime || updateTime) && (
        <section aria-label="时间信息">
          {createTime && <p>创建时间：{createTime}</p>}
          {updateTime && <p>更新时间：{updateTime}</p>}
        </section>
      )}

      <Dialog
        actions={[
          { key: "cancel", onClick: closeDelete, text: "取消" },
          { key: "confirm", danger: true, disabled: !online || deleting, onClick: () => void confirmDelete(), text: "确认删除" },
        ]}
        aria-label={deleteDialogTitle}
        closeOnAction
        closeOnMaskClick
        content="删除后无法恢复。"
        onAction={(action) => {
          if (action.key === "cancel") closeDelete();
        }}
        onClose={closeDelete}
        title={deleteDialogTitle}
        visible={deleteOpen}
      />
    </MobilePage>
  );
}
