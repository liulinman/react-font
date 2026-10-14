import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import { contextLabCreateTask } from "@/page/englishWorld/server/learning";
import {
  buildContextLabGenerateParams,
  type ContextLabSourceMode,
} from "@/page/englishWorld/contextLab/contextLabPlanning";
import type {
  ContextLabModelProvider,
  ContextLabPastedQuestionMode,
} from "@/page/englishWorld/types/learning";
import { useStudyDraft } from "../study/studyStorage";
import { StudyChrome, StudyError } from "../study/StudyChrome";
import { useConnectivity } from "../../offline/useConnectivity";
import { articleRoot, articleKeys } from "./articleQueries";
type FormDraft = {
  source: ContextLabSourceMode;
  words: string;
  article: string;
  count: number;
  band: number;
  model: ContextLabModelProvider;
  mode: ContextLabPastedQuestionMode;
  questionCount: number;
};
function validForm(v: unknown): v is FormDraft {
  const f = v as FormDraft | null;
  return (
    !!f &&
    ["weak", "random", "custom", "pasted-article", "ielts-core"].includes(
      f.source,
    ) &&
    typeof f.words === "string" &&
    typeof f.article === "string" &&
    Number.isInteger(f.count) &&
    f.count >= 3 &&
    f.count <= 20 &&
    Number.isFinite(f.band) &&
    f.band >= 5 &&
    f.band <= 9 &&
    ["deepseek", "gpt"].includes(f.model) &&
    ["auto", "parse", "generate"].includes(f.mode) &&
    Number.isInteger(f.questionCount) &&
    f.questionCount >= 1 &&
    f.questionCount <= 13
  );
}
export function MobileArticleCreate() {
  const { user } = useAuth();
  const { search } = useLocation();
  return (
    <CreateFlow
      key={`${user?.id}:${search}`}
      userId={user?.id ?? 0}
      search={search}
    />
  );
}
function CreateFlow({ userId, search }: { userId: number; search: string }) {
  const seed = new URLSearchParams(search).get("words") ?? "";
  const { draft, setDraft, storageError } = useStudyDraft(
    userId,
    `article-create:${seed}`,
    validForm,
  );
  const preferences = useStudyDraft(userId, "article-preferences", validForm);
  const form =
    draft ??
    ({
      source: "weak",
      count: 8,
      band: 7,
      model: "deepseek",
      mode: "auto",
      questionCount: 8,
      ...preferences.draft,
      ...(seed ? { source: "custom" as const } : {}),
      words: seed,
      article: "",
    } satisfies FormDraft);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useConnectivity();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (patch: Partial<FormDraft>) => {
    const next = { ...form, ...patch };
    setDraft(next);
    preferences.setDraft({ ...next, words: "", article: "" });
  };
  const sourceLabel = {
    weak: "薄弱词", random: "随机词", "ielts-core": "雅思核心词",
    custom: "自选词", "pasted-article": "粘贴材料",
    proficiency: "指定熟练度词汇", "ielts-random": "随机雅思词",
  }[form.source];
  const wordCount = form.source === "custom"
    ? new Set(form.words.trim().split(/[\s,，]+/).filter(Boolean)).size
    : form.count;
  const summary = form.source === "pasted-article"
    ? form.mode === "parse" ? "保留材料中的题目"
      : form.mode === "generate" ? `生成 ${form.questionCount} 道题`
      : `优先识别已有题目，没有题目时生成 ${form.questionCount} 道题`
    : `使用 ${wordCount} 个${sourceLabel}，题数按生成规则安排`;
  const create = async () => {
    if (lock.current || !online) return;
    setError("");
    const params = buildContextLabGenerateParams({
      sourceMode: form.source,
      count: form.count,
      customWords: form.words,
      ieltsBand: form.band,
      modelProvider: form.model,
      pastedContent: form.article,
      pastedQuestionMode: form.mode,
      pastedQuestionCount: form.questionCount,
    });
    if (params.sourceType === "custom") {
      params.words = [...new Set(params.words)];
      if (params.words.length < 3 || params.words.length > 20) {
        setError("请输入 3 到 20 个不同的单词。");
        return;
      }
    }
    if (
      params.sourceType === "pasted-article" &&
      (!params.pastedContent.trim() || params.pastedContent.length > 30000)
    ) {
      setError("请粘贴 1 到 30000 字的文章内容。");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      const task = await request(contextLabCreateTask(params));
      setDraft(null);
      void qc.invalidateQueries({ queryKey: articleKeys });
      navigate(`${articleRoot}/${task.taskId}/read`);
    } catch {
      setError(
        "未确认创建结果，材料已保留。请先查看文章列表，避免重复创建；也可稍后重试。",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <StudyChrome title="准备一篇新文章" eyebrow="MAKE READING PERSONAL">
      <Link to={articleRoot}>← 我的文章</Link>
      <p className="study-muted">
        围绕自己的词汇阅读，或带来一篇你感兴趣的材料。
      </p>
      <StudyError message={error} />
      {error && <Link to={articleRoot}>查看文章列表</Link>}
      {(storageError || preferences.storageError) && (
        <p role="status">本机存储不可用，请勿离开页面以免材料丢失。</p>
      )}
      <form
        className="study-panel article-create-form"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <fieldset disabled={busy}>
          <legend>练习内容</legend>
          <label>
            材料来源
            <select
              value={form.source}
              onChange={(e) =>
                update({ source: e.target.value as FormDraft["source"] })
              }
            >
              <option value="weak">薄弱词生成文章</option>
              <option value="random">随机词生成文章</option>
              <option value="ielts-core">雅思核心词</option>
              <option value="custom">自己指定单词</option>
              <option value="pasted-article">粘贴文章 / 已有题目</option>
            </select>
          </label>
          {form.source === "custom" ? (
            <label>
              目标单词
              <textarea
                rows={4}
                value={form.words}
                onChange={(e) => update({ words: e.target.value })}
                placeholder="至少 3 个词，用空格或逗号分隔"
              />
            </label>
          ) : form.source === "pasted-article" ? (
            <>
              <label>
                文章内容
                <textarea
                  rows={9}
                  maxLength={30000}
                  value={form.article}
                  onChange={(e) => update({ article: e.target.value })}
                  placeholder="粘贴英文文章，也可以包含原有题目与选项"
                />
              </label>
              <label>
                题目处理
                <select
                  value={form.mode}
                  onChange={(e) =>
                    update({ mode: e.target.value as FormDraft["mode"] })
                  }
                >
                  <option value="auto">自动识别已有题目或生成新题</option>
                  <option value="generate">根据文章生成新题</option>
                  <option value="parse">解析材料中已有的题目</option>
                </select>
              </label>
              {form.mode !== "parse" && (
                <label>
                  题目数量
                  <select
                    value={form.questionCount}
                    onChange={(e) =>
                      update({ questionCount: Number(e.target.value) })
                    }
                  >
                    {[3, 5, 8, 10, 13].map((n) => (
                      <option key={n} value={n}>
                        {n} 题
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : (
            <label>
              目标词数
              <select
                value={form.count}
                onChange={(e) => update({ count: Number(e.target.value) })}
              >
                {[3, 5, 8, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} 个词
                  </option>
                ))}
              </select>
            </label>
          )}
          </fieldset>
          <fieldset disabled={busy}>
          <legend>生成设置</legend>
          <label>
            阅读难度
            <select
              value={form.band}
              onChange={(e) => update({ band: Number(e.target.value) })}
            >
              {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((n) => (
                <option key={n} value={n}>
                  雅思目标难度 {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            生成模型
            <select
              value={form.model}
              onChange={(e) =>
                update({ model: e.target.value as FormDraft["model"] })
              }
            >
              <option value="deepseek">DeepSeek</option>
              <option value="gpt">GPT</option>
            </select>
          </label>
        </fieldset>
        <p className="study-footnote">雅思难度仅作为生成参考，未经官方难度校准。粘贴材料的原文不会按所选难度重写。</p>
        <section className="article-create-summary" aria-label="本次练习" aria-live="polite">
          <strong>本次练习</strong>
          <p>{summary}；雅思目标难度 {form.band}；使用 {form.model === "gpt" ? "GPT" : "DeepSeek"}。</p>
          <small>自动记住设置，下次可直接使用。</small>
        </section>
        {!online && (
          <p className="study-notice">联网后可以生成，输入的材料会保留。</p>
        )}
        <button className="study-primary" disabled={busy || !online}>
          {busy ? "正在创建…" : "生成文章与练习"}
        </button>
        <p className="study-footnote">
          创建后可离开页面，文章列表会显示生成进度。
        </p>
      </form>
    </StudyChrome>
  );
}
