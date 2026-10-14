import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { WordList } from "@/server/word/word.type";
import { MobilePage } from "../../components/MobilePage";
import { useConnectivity } from "../../offline/useConnectivity";
import { getStudyResumePath } from "../study/studyStorage";
import { useStudyStats } from "../study/useStudyStats";
import { recentWordStore } from "./recentWordStore";

function recentWordName(word: WordList) {
  return [word.englishWord, word.englishChinese].filter(Boolean).join(" ");
}

export function MobileHomePage() {
  const { user } = useAuth();
  const online = useConnectivity();
  const navigate = useNavigate();
  const stats = useStudyStats();
  const resumeCards = getStudyResumePath(user?.id ?? 0, "cards");
  const resumeReview = getStudyResumePath(user?.id ?? 0, "review");
  const [search, setSearch] = useState("");
  const [recentWords, setRecentWords] = useState<WordList[]>([]);

  useEffect(() => {
    let active = true;
    if (!user) {
      return () => {
        active = false;
      };
    }

    void recentWordStore
      .list(user.id)
      .then((words) => {
        if (active) setRecentWords(words);
      })
      .catch(() => {
        if (active) setRecentWords([]);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const searchWords = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    navigate(`/mobile/words?${new URLSearchParams({ q: query }).toString()}`);
  };

  return (
    <MobilePage className="mobile-home-page" title="让每个词，留下来。">
      <header className="study-home-brand">
        <span>ENGLISH WORLD</span>
        <Link className="home-add-word" to="/mobile/words/new">＋ 添加单词</Link>
        <Link to="/mobile/me" aria-label="查看我的账号">
          {user?.username?.slice(0, 1).toUpperCase() || "E"}
        </Link>
      </header>
      <p className="study-home-subtitle">每天一小步，慢慢走得更远。</p>
      {!online && (
        <p className="study-notice">当前离线，联网后可以开始学习和复习。</p>
      )}
      <section className="study-hero" aria-labelledby="mobile-home-today-study">
        <div>
          <span className="study-kicker">A MOMENT FOR YOURSELF</span>
          <h2 id="mobile-home-today-study">今日学习</h2>
          <p>
            给自己几分钟，
            <br />
            认识新词，也重逢旧词。
          </p>
        </div>
        <div className="study-hero-art" aria-hidden="true">
          <span>Aa</span>
          <i>word by word</i>
        </div>
        <button
          className="study-primary"
          disabled={!online}
          onClick={() => navigate(resumeCards ?? "/mobile/learn")}
        >
          {resumeCards ? "继续学习" : "开始学习"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </section>
      <Link className="study-primary" style={{display:"flex",justifyContent:"space-between",margin:"16px 0"}} to="/mobile/reading-practices">阅读练习 <span>文章 · 答题 · 解析 →</span></Link>
      <div className="study-home-actions">
        <Link to={resumeReview ?? "/mobile/review"}>
          <span>↻</span>
          <div>
            <strong>{resumeReview ? "继续复习" : "默写复习"}</strong>
            <small>看看记住了多少</small>
          </div>
          <span>→</span>
        </Link>
        <Link to="/mobile/cockpit">
          <span>▥</span>
          <div>
            <strong>学习记录</strong>
            <small>每一次进步都有迹可循</small>
          </div>
          <span>→</span>
        </Link>
      </div>
      <Link className="study-panel article-home-entry" to="/mobile/tools/context-lab"><span>READ &amp; PRACTICE</span><h2>文章阅读与练习 ↗</h2><p>读懂一篇文章，让词汇真正用起来。</p></Link>
      <section className="study-week" aria-label="近七天默写表现">
        <span>这一周的积累</span>
        <div>
          <strong>
            {stats.data?.statistics.totalCount ?? "—"}
            <small>词次练习</small>
          </strong>
          <strong>
            {stats.data
              ? `${Math.round(stats.data.statistics.accuracy)}%`
              : "—"}
            <small>默写正确率</small>
          </strong>
        </div>
        {stats.isError && (
          <button onClick={() => void stats.refetch()}>
            暂未加载，点此重试
          </button>
        )}
      </section>
      <form
        aria-label="搜索词库"
        onSubmit={searchWords}
        role="search"
        className="study-home-search"
      >
        <input
          aria-label="搜索单词、释义或标签"
          id="mobile-word-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="寻找一个单词…"
          type="search"
          value={search}
        />
        <button type="submit">搜索</button>
      </form>
      <section aria-labelledby="mobile-home-recent-words">
        <div className="study-section-heading">
          <h2 id="mobile-home-recent-words">最近查看</h2>
          <Link to="/mobile/words/new">手动添加</Link>
        </div>
        {recentWords.length ? (
          <ul className="study-recent">
            {recentWords.slice(0, 3).map((word) => (
              <li key={word.id}>
                <Link
                  to={`/mobile/words/${word.id}`}
                  aria-label={recentWordName(word)}
                >
                  <strong>{word.englishWord}</strong>
                  <span>{word.englishChinese}</span>
                  <i aria-hidden="true">↗</i>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="study-muted">去词库看看，让学习从一个词开始。</p>
        )}
      </section>
    </MobilePage>
  );
}
