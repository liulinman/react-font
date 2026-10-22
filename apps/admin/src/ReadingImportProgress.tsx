import {
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import type { AdminPractice } from "./api/readingPractice.type";
import { sourceUrl, type Source } from "./ReadingImport";
import { useState } from "react";
import "./readingImportProgress.css";

export function ReadingImportProgress({
  paper,
  sources,
  busy,
  onRetry,
}: {
  paper: AdminPractice;
  sources: Source[];
  busy: boolean;
  onRetry: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = sources.find((s) => s.id === selectedId) || sources[0];
  const failed = paper.status === "failed";
  const queued = paper.status === "queued";
  const input = paper.workflow?.importInput;
  const text = input?.text || "";
  const answerText = input?.answerText || "";
  return (
    <section className="reading-import-progress" aria-label="材料整理进度">
      <header className="rip-heading">
        <div>
          <span className={"rip-status " + (failed ? "rip-status-error" : "")}>
            {failed ? "需要重试" : queued ? "等待处理" : "处理中"}
          </span>
          <h2>
            {failed
              ? "材料整理暂未完成"
              : queued
                ? "材料已收到，等待整理"
                : "正在整理阅读材料"}
          </h2>
          <p>
            {failed
              ? "原稿和输入均已保留，可以重新整理。"
              : "整理完成后即可核对文章、题目和答案，再确认发布。"}
          </p>
        </div>
        <span className="rip-assurance">
          <CheckOutlined />{" "}
          {sources.length || text || answerText
            ? "原稿已保存"
            : "生成设置已保存"}
        </span>
      </header>
      <div className="rip-layout">
        <section className="rip-source" aria-label="原始材料预览">
          <header className="rip-source-heading">
            <div>
              <FileTextOutlined />
              <strong>原始材料</strong>
              <span>
                {sources.length ? `${sources.length} 份` : "文本材料"}
              </span>
            </div>
            {selected && (
              <a href={sourceUrl(selected)} target="_blank" rel="noreferrer">
                打开原稿 ↗
              </a>
            )}
          </header>
          {sources.length > 0 && (
            <div className="rip-files" aria-label="原稿列表">
              {sources.map((s, i) => (
                <button
                  key={s.id}
                  aria-label={`查看第 ${i + 1} 份原稿`}
                  aria-pressed={selected?.id === s.id}
                  className={selected?.id === s.id ? "rip-file-selected" : ""}
                  onClick={() => setSelectedId(s.id)}
                >
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span title={s.name}>{s.name}</span>
                  <small>{s.pages} 页</small>
                </button>
              ))}
            </div>
          )}
          <div className="rip-preview">
            {selected ? (
              selected.mime === "application/pdf" ? (
                <iframe
                  key={selected.id}
                  title={`PDF原稿：${selected.name}`}
                  src={sourceUrl(selected)}
                />
              ) : (
                <img
                  key={selected.id}
                  src={sourceUrl(selected)}
                  alt={`原稿预览：${selected.name}`}
                />
              )
            ) : text ? (
              <pre>{text}</pre>
            ) : (
              <div className="rip-preview-empty">
                <FileTextOutlined />
                <p>正在根据生成要求整理内容</p>
                <span>完成后将显示文章与题目，原有设置会保留。</span>
              </div>
            )}
          </div>
          {((text && sources.length > 0) || answerText) && (
            <details className="rip-extra">
              <summary>补充输入材料</summary>
              {text && sources.length > 0 && <pre>{text}</pre>}
              {answerText && (
                <>
                  <strong>已有答案与解析</strong>
                  <pre>{answerText}</pre>
                </>
              )}
            </details>
          )}
        </section>
        <aside className="rip-task">
          <div
            className={"rip-task-icon " + (failed ? "rip-task-icon-error" : "")}
          >
            {failed ? (
              <ReloadOutlined />
            ) : queued ? (
              <ClockCircleOutlined />
            ) : (
              <LoadingOutlined spin />
            )}
          </div>
          <h3>
            {failed
              ? "本次整理未完成"
              : queued
                ? "任务等待开始"
                : "正在自动整理"}
          </h3>
          <p className="rip-task-description">
            {failed
              ? "请查看下方原因后重试，无需重复上传材料。"
              : "系统会按所选处理方式整理材料。无需停留在此页面，可关闭后从练习列表查看状态。"}
          </p>
          {failed && (
            <div className="rip-failure" role="alert">
              {paper.failureSummary || "整理服务暂时不可用，请稍后重试。"}
            </div>
          )}
          <ol className="rip-steps">
            <li className="rip-step-current">
              <span>1</span>
              <div>
                <strong>自动整理材料</strong>
                <p>
                  {failed
                    ? "遇到问题，等待重试"
                    : queued
                      ? "等待任务开始"
                      : "识别文章与题目，按所选方式整理"}
                </p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>核对整理结果</strong>
                <p>核对文章、答案和解析，处理检查提示</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>确认发布</strong>
                <p>选择接收学生后，由你确认发布</p>
              </div>
            </li>
          </ol>
          {failed && (
            <Button
              aria-label="重新整理"
              type="primary"
              icon={<ReloadOutlined />}
              loading={busy}
              onClick={onRetry}
            >
              重新整理
            </Button>
          )}
          <div className="rip-note">
            <CheckOutlined />
            <span>整理完成后不会自动发布给学生</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
