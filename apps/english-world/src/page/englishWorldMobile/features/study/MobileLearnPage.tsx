import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import { wordUpdateLevel } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import { MobileBritishPronunciationButton } from "../../MobileBritishPronunciationButton";
import { useConnectivity } from "../../offline/useConnectivity";
import { fetchAllMobileWords, wordKeys } from "../words/wordQueries";
import { selectedWordIds, useStudyDraft } from "./studyStorage";
import { StudyChrome, StudyError, StudyProgress } from "./StudyChrome";

type Deck = {
  words: WordList[];
  index: number;
  known: number;
  revealed: boolean;
};
function validDeck(value: unknown): value is Deck {
  const d = value as Deck | null;
  return (
    !!d &&
    Array.isArray(d.words) &&
    d.words.length > 0 &&
    d.words.length <= 50 &&
    d.words.every(
      (w) =>
        Number.isSafeInteger(w.id) &&
        w.id > 0 &&
        typeof w.englishWord === "string",
    ) &&
    Number.isInteger(d.index) &&
    d.index >= 0 &&
    d.index <= d.words.length &&
    Number.isInteger(d.known) &&
    d.known >= 0 &&
    d.known <= d.index &&
    typeof d.revealed === "boolean"
  );
}
export function MobileLearnPage() {
  const { user } = useAuth();
  const { search } = useLocation();
  return (
    <LearnFlow
      key={`${user?.id}:${search}`}
      userId={user?.id ?? 0}
      search={search}
    />
  );
}
function LearnFlow({ userId, search }: { userId: number; search: string }) {
  const ids = selectedWordIds(search);
  const queryClient = useQueryClient();
  const online = useConnectivity();
  const {
    draft: deck,
    setDraft: setDeck,
    storageError,
  } = useStudyDraft(userId, `cards:${ids.join(",")}`, validDeck);
  const [count, setCount] = useState(10);
  const [level, setLevel] = useState("all");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const words = useQuery({
    queryKey: ["mobile", "study-words", userId],
    queryFn: fetchAllMobileWords,
    enabled: !deck && online,
    retry: false,
  });
  const selected = (words.data ?? []).filter((w) =>
    ids.length
      ? ids.includes(w.id)
      : level === "all" || w.englishLevel === Number(level),
  );
  const missing =
    ids.length > 0 && words.isSuccess && selected.length !== ids.length;
  const start = () => {
    if (!selected.length || missing) return;
    setDeck({
      words: selected.slice(0, ids.length ? 50 : count),
      index: 0,
      known: 0,
      revealed: false,
    });
    setError("");
  };
  const rate = async (known: boolean) => {
    if (!deck || inFlight.current || !deck.revealed || !online) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await request(
        wordUpdateLevel({
          id: deck.words[deck.index].id,
          englishLevel: known ? 2 : 0,
        }),
      );
      setDeck({
        ...deck,
        index: deck.index + 1,
        known: deck.known + (known ? 1 : 0),
        revealed: false,
      });
      void queryClient.invalidateQueries({ queryKey: wordKeys.all });
      void queryClient.invalidateQueries({
        queryKey: ["mobile", "study-words"],
      });
    } catch {
      setError("掌握程度尚未保存，请检查网络后再次选择。");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const word = deck?.words[deck.index];
  return (
    <StudyChrome
      title={deck ? "词卡学习" : "选一组词，开始吧"}
      eyebrow="MAKE WORDS YOUR OWN"
    >
      {storageError && (
        <p role="status">本机存储不可用，离开此页可能丢失本轮进度。</p>
      )}
      {!online && (
        <p className="study-notice" role="status">
          当前离线。可以查看已加载词卡，联网后再保存掌握程度。
        </p>
      )}
      <StudyError message={error} />
      {!deck ? (
        <>
          <p className="study-muted">
            先回忆，再看释义。每一词都由你决定掌握程度。
          </p>
          <section className="study-panel">
            <span className="study-kicker">学习范围</span>
            <h2>
              {ids.length ? `从词库选中的 ${ids.length} 个词` : "我的词库"}
            </h2>
            {!ids.length && (
              <>
                <label>
                  掌握程度
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="all">全部单词</option>
                    <option value="0">不会 · 优先学习</option>
                    <option value="1">一般 · 加深印象</option>
                    <option value="2">熟练 · 再巩固</option>
                    <option value="3">精通</option>
                  </select>
                </label>
                <label>
                  本次词数
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    {[5, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n} 个词
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <p className="study-muted">
              {words.isPending
                ? "正在读取词库…"
                : `可学习 ${selected.length} 个词`}
            </p>
            {words.isError && (
              <>
                <StudyError message="词库加载失败，请重试。" />
                <button onClick={() => void words.refetch()}>重新加载</button>
              </>
            )}
            {missing && (
              <StudyError message="所选单词中有词条已不可用，请返回词库重新选择。" />
            )}
            {!words.isPending && !words.isError && !selected.length && (
              <p>这个范围还没有单词。可以换个范围，或先添加单词。</p>
            )}
            <button
              className="study-primary"
              disabled={
                !online || !selected.length || missing || ids.length > 50
              }
              onClick={start}
            >
              开始学习
            </button>
            {ids.length > 50 && (
              <StudyError message="每次最多学习 50 个词，请重新选择。" />
            )}
            <Link className="study-text-link" to="/mobile/words">
              去词库挑选单词 →
            </Link>
          </section>
        </>
      ) : word ? (
        <>
          <StudyProgress current={deck.index + 1} total={deck.words.length} />
          <article className="study-word-card">
            <span className="study-kicker">先试着回忆它的意思</span>
            <h2 lang="en">{word.englishWord}</h2>
            <div className="study-phonetic">
              <span>{word.englishPhonetic}</span>
              <MobileBritishPronunciationButton word={word.englishWord} />
            </div>
            {deck.revealed ? (
              <div className="study-meaning">
                <h3>{word.englishChinese || "这个词还没有释义"}</h3>
                {word.englishNote && <p>{word.englishNote}</p>}
                {word.englishReference && (
                  <p className="study-muted">{word.englishReference}</p>
                )}
                <Link to={`/mobile/words/${word.id}`}>查看完整词条 →</Link>
              </div>
            ) : (
              <p className="study-card-hint">想起来了吗？不用急着翻答案。</p>
            )}
          </article>
          {deck.revealed ? (
            <div className="study-rating">
              <button
                disabled={busy || !online}
                onClick={() => void rate(false)}
              >
                还不熟
              </button>
              <button
                className="study-primary"
                disabled={busy || !online}
                onClick={() => void rate(true)}
              >
                {busy ? "正在保存…" : "记住了"}
              </button>
            </div>
          ) : (
            <button
              className="study-primary"
              onClick={() => setDeck({ ...deck, revealed: true })}
            >
              查看释义
            </button>
          )}
          <p className="study-footnote">
            进度自动保存在本机，可以随时返回继续。
          </p>
        </>
      ) : (
        <section className="study-completion">
          <div className="study-completion__mark">✓</div>
          <span className="study-kicker">ONE STEP FORWARD</span>
          <h2>这一组，学完了</h2>
          <p>
            完成 {deck.words.length} 个词 · 记住 {deck.known} 个
          </p>
          <Link
            className="study-primary"
            to={`/mobile/review?wordIds=${deck.words.map((w) => w.id).join(",")}`}
          >
            默写一下，检验记忆
          </Link>
          <button onClick={() => setDeck(null)}>再学一组</button>
          <Link to="/mobile">返回学习首页</Link>
        </section>
      )}
    </StudyChrome>
  );
}
