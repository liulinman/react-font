import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { WordList } from "@/server/word/word.type";
import { MobilePage } from "../../components/MobilePage";
import { useConnectivity } from "../../offline/useConnectivity";
import { recentWordStore } from "./recentWordStore";

function recentWordName(word: WordList) {
  return [word.englishWord, word.englishChinese].filter(Boolean).join(" ");
}

export function MobileHomePage() {
  const { user } = useAuth();
  const online = useConnectivity();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [recentWords, setRecentWords] = useState<WordList[]>([]);

  useEffect(() => {
    let active = true;
    if (!user) {
      return () => {
        active = false;
      };
    }

    void recentWordStore.list(user.id).then((words) => {
      if (active) setRecentWords(words);
    }).catch(() => {
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
    <MobilePage className="mobile-home-page" title="学习">
      <form aria-label="搜索词库" onSubmit={searchWords} role="search">
        <label htmlFor="mobile-word-search">搜索单词、释义或标签</label>
        <input
          aria-label="搜索单词、释义或标签"
          id="mobile-word-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="输入单词、释义或标签"
          type="search"
          value={search}
        />
        <button type="submit">搜索</button>
      </form>

      <section aria-labelledby="mobile-home-quick-actions">
        <h2 id="mobile-home-quick-actions">快捷操作</h2>
        <div>
          <Link to="/mobile/words/new">手动添加</Link>
          <Link to="/mobile/tools/bulk-import">批量导入</Link>
          <button
            disabled={!online}
            onClick={() => navigate("/mobile/tools/ai-word")}
            type="button"
          >
            AI 补全
          </button>
        </div>
        {!online && <p>需要网络连接后才能使用 AI 补全和新建学习任务。</p>}
      </section>

      <section aria-labelledby="mobile-home-recent-words">
        <h2 id="mobile-home-recent-words">最近查看</h2>
        {recentWords.length ? (
          <ul>
            {recentWords.map((word) => (
              <li key={word.id}>
                <Link to={`/mobile/words/${word.id}`}>{recentWordName(word)}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>最近查看的单词会显示在这里。</p>
        )}
      </section>

      <section aria-labelledby="mobile-home-today-study">
        <h2 id="mobile-home-today-study">今日学习</h2>
        <p>从复习开始，或创建一组新的学习任务。</p>
        <div>
          <Link to="/mobile/review">开始今日复习</Link>
          <button
            disabled={!online}
            onClick={() => navigate("/mobile/learn")}
            type="button"
          >
            开始新的学习任务
          </button>
        </div>
      </section>
    </MobilePage>
  );
}
