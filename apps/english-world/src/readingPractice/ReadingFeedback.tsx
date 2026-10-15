import { useEffect, useRef, useState } from "react";
import request from "@font/api";
export const feedbackRequest = (id: number, data?: unknown) => ({
  url: `/reading-practices/${id}/feedback`,
  method: data ? "POST" : "GET",
  data,
  __responseType: undefined as any,
});
const labels: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已解决",
  reopened: "重新核查",
};
export function ReadingFeedback({
  practiceId,
  questionId,
}: {
  practiceId: number;
  questionId: string;
}) {
  const [open, setOpen] = useState(false),
    [type, setType] = useState("unclear"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [items, setItems] = useState<any[]>([]);
  const attempt = useRef<{ signature: string; uid: string } | undefined>(
    undefined,
  );
  useEffect(() => {
    if (open)
      void request(feedbackRequest(practiceId))
        .then((r: any) =>
          setItems(r.list.filter((x: any) => x.questionId === questionId)),
        )
        .catch(() => setError("处理状态读取失败，请重试。"));
  }, [open, practiceId, questionId]);
  return (
    <div className="rp-feedback">
      <button type="button" onClick={() => setOpen(!open)}>
        {open ? "收起题目反馈" : "反馈题目问题"}
      </button>
      {open && (
        <div>
          <p>反馈不会修改你的选项或成绩，老师会核查后处理。</p>
          <label>
            问题类型
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {[
                ["unclear", "题意不清"],
                ["multiple", "多解"],
                ["answer", "答案疑似错误"],
                ["missing", "缺少信息"],
                ["display", "材料显示 / 识别问题"],
                ["other", "其他"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            问题说明
            <textarea
              value={message}
              maxLength={3000}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </label>
          <button
            type="button"
            disabled={busy || !message.trim()}
            onClick={async () => {
              const signature = JSON.stringify({ type, message });
              if (attempt.current?.signature !== signature)
                attempt.current = {
                  signature,
                  uid: `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                };
              setBusy(true);
              setError("");
              try {
                const item = await request(
                  feedbackRequest(practiceId, {
                    requestUid: attempt.current.uid,
                    questionId,
                    type,
                    message,
                  }),
                );
                setItems((prev) => [
                  item,
                  ...prev.filter((x) => x.id !== item.id),
                ]);
                setMessage("");
              } catch {
                setError("反馈未送达，内容已保留，可重试。");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "正在发送…" : "提交反馈"}
          </button>
          {error && <p role="alert">{error}</p>}
          {items.map((item) => (
            <article key={item.id}>
              <strong>{labels[item.status] || item.status}</strong>
              <p>{item.message}</p>
              {item.reason && <p>老师回复：{item.reason}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
