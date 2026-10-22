import { InboxOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Input, Radio, Segmented, Space, Upload } from "antd";
import request, { getApiBaseUrl } from "@font/api";
import { newRequestId } from "./api/readingPractice";
import {
  practiceDefaults,
  type PracticeConfig,
} from "./api/readingPractice.type";
import { PracticeFields } from "./ReadingPracticeEditor";
export interface Source {
  id: string;
  name: string;
  mime: string;
  pages: number;
  size: number;
  url: string;
  pageSources?: Source[];
  originalUrl?: string;
  parentSourceId?: string;
  parentSize?: number;
}
export const workflowRequest = (
  id: number,
  action: string,
  data?: unknown,
) => ({
  url: `/admin/reading-practices/${id}/${action}`,
  method: data === undefined ? "GET" : "POST",
  data,
  __responseType: undefined as any,
});
export const sourceUrl = (s: Source) =>
  `${getApiBaseUrl().replace(/\/$/, "")}${s.url}`;
export function SourceFiles({
  value,
  onChange,
  disabled = false,
  onUploadingChange,
  prominent = false,
}: {
  value: Source[];
  onChange: (s: Source[]) => void;
  prominent?: boolean;
  disabled?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const inFlight = useRef(0);
  const current = useRef(value);
  current.current = value;
  const UploadControl = prominent ? Upload.Dragger : Upload;
  return (
    <>
      {!prominent && <p>PDF / PNG / JPEG / WebP；单文件 20MB，合计 40MB，最多 20 页或图片。</p>}
      <UploadControl
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        showUploadList={false}
        disabled={disabled || uploading}
        beforeUpload={async (file) => {
          if (file.size > 20 * 1024 * 1024) {
            setError("单文件不能超过20MiB");
            return false;
          }
          inFlight.current++;
          setUploading(true);
          onUploadingChange?.(true);
          setError("");
          try {
            const data = new FormData();
            data.append("file", file);
            const source = await request({
              url: "/admin/reading-practices/sources",
              method: "POST",
              data,
              __responseType: undefined as unknown as Source,
            });
            const next = [
              ...current.current,
              ...(source.pageSources || [source]),
            ];
            if (
              next.reduce((n, s) => n + s.pages, 0) > 20 ||
              [
                ...new Map(
                  next.map((s) => [
                    s.parentSourceId || s.id,
                    s.parentSize || s.size,
                  ]),
                ).values(),
              ].reduce((n, size) => n + size, 0) >
                40 * 1024 * 1024
            )
              throw Error("总量超限");
            current.current = next;
            onChange(next);
          } catch {
            setError("上传失败或总量超限，请检查文件格式、大小及页数后重试。");
          } finally {
            inFlight.current--;
            setUploading(inFlight.current > 0);
            onUploadingChange?.(inFlight.current > 0);
          }
          return false;
        }}
      >
        {prominent ? <div className="reading-create-dropzone"><InboxOutlined /><strong>{uploading ? "正在上传材料…" : "拖拽 PDF 或照片到这里"}</strong><span>也可以点击选择文件，支持一次上传多个文件</span><small>PDF、PNG、JPG、WebP · 单文件 20MB · 合计 40MB / 20 页</small></div> : <Button loading={uploading}>上传原稿</Button>}
      </UploadControl>
      {error && <Alert type="error" message={error} />}
      {value.map((s, i) => (
        <div key={s.id} className={prominent ? "reading-create-file" : undefined} style={{ padding: "8px 0" }}>
          <Space wrap>
            <span>
              {i + 1}. {s.name} · {s.pages} 页
            </span>
            <a href={sourceUrl(s)} target="_blank" rel="noreferrer">
              查看原稿
            </a>
            {s.originalUrl && (
              <a
                href={sourceUrl({ ...s, url: s.originalUrl })}
                target="_blank"
                rel="noreferrer"
              >
                原始PDF
              </a>
            )}
            <Button
              disabled={disabled || i === 0}
              onClick={() => {
                const next = [...value];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              上移
            </Button>
            <Button
              disabled={disabled || i === value.length - 1}
              onClick={() => {
                const next = [...value];
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                onChange(next);
              }}
            >
              下移
            </Button>
            <Button
              disabled={disabled}
              onClick={() => onChange(value.filter((_, n) => n !== i))}
            >
              移除
            </Button>
          </Space>
        </div>
      ))}
    </>
  );
}
function ImportFields() {
  const mode = Form.useWatch("mode");
  return (
    <PracticeFields
      prefix={["config"]}
      showRecipients={false}
      mode={mode === "generate_questions" ? "generate_questions" : "import"}
    />
  );
}
export function ReadingImport({ onCreated, onBusyChange }: { onCreated: (id?: number) => void; onBusyChange?: (busy: boolean) => void }) {
  const [inputMode, setInputMode] = useState("files");
  const [form] = Form.useForm();
  const text = Form.useWatch("text", form) || "";
  const [uploading, setUploading] = useState(false);
  const [sources, setSources] = useState<Source[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const attempt = useRef<{ signature: string; uid: string } | undefined>(
    undefined,
  );
  useEffect(() => { onBusyChange?.(busy || uploading); }, [busy, uploading, onBusyChange]);
  return (
    <Form
      id="reading-import-form" form={form} requiredMark={false}
      layout="vertical"
      initialValues={{
        mode: "complete_answers",
        title: "",
        text: "",
        answerText: "",
        config: {
          targetType: "all",
          questionCount: practiceDefaults.questionCount,
          questionTypes: practiceDefaults.questionTypes,
        },
      }}
      onFinish={async (v: {
        title: string;
        mode: string;
        text: string;
        answerText: string;
        config: Partial<PracticeConfig>;
      }) => {
        if (uploading) { setError("请等待所有文件上传完成后开始整理。"); return; }
        if (!v.text?.trim() && !sources.length) {
          setError("请先上传文件或粘贴文章和题目。");
          return;
        }
        const config = {
          targetType: "all",
          ...(v.mode === "generate_questions"
            ? {
                questionCount: v.config.questionCount,
                questionTypes: v.config.questionTypes,
                ...(v.config.ieltsBand != null
                  ? { ieltsBand: v.config.ieltsBand }
                  : {}),
              }
            : {}),
        };
        const data = { ...v, autoProcess: v.mode !== "format", config, sourceIds: sources.map((s) => s.id) };
        const signature = JSON.stringify(data);
        if (attempt.current?.signature !== signature)
          attempt.current = { signature, uid: newRequestId() };
        setBusy(true);
        setError("");
        try {
          const created: any = await request({
            url: "/admin/reading-practices/imports",
            method: "POST",
            data: { ...data, requestUid: attempt.current.uid },
          });
          onCreated(created?.id);
        } catch {
          setError("导入任务未创建，材料已保留，请检查输入和网络后重试。");
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
    >
      <div className="reading-create-intro"><h2>把材料交给 AI</h2><p>自动识别文章和题目，补全并检查，完成后由你审核。</p></div>
      {error && <Alert type="error" message={error} showIcon style={{marginBottom:16}} />}
      <Segmented aria-label="材料输入方式" value={inputMode} onChange={setInputMode} options={[{ value: "files", label: "上传文件" }, { value: "text", label: "粘贴文本" }]} />
      <div className="reading-create-material" style={{ display: inputMode === "files" ? undefined : "none" }}>
        <SourceFiles value={sources} onChange={setSources} disabled={busy} onUploadingChange={setUploading} prominent />
        {sources.length > 0 && <p className="reading-create-hint">已上传 {sources.length} 页 / 张，可调整顺序后开始整理。</p>}
        {text.trim() && <p className="reading-create-hint">同时附带已粘贴的文本，切换查看不会丢失材料。</p>}
      </div>
      <div className="reading-create-material" style={{ display: inputMode === "text" ? undefined : "none" }}>
        <Form.Item name="text" label="文章和题目"><Input.TextArea autoSize={{ minRows: 9, maxRows: 16 }} maxLength={100000} showCount={text.length > 90000} placeholder="粘贴文章和题目，已有答案也可以一起粘贴。AI 会自动整理。" /></Form.Item>
        {sources.length > 0 && <p className="reading-create-hint">同时附带 {sources.length} 页 / 张已上传材料。</p>}
      </div>
      <details className="reading-create-more"><summary>更多选项 <span>标题、已有答案、特殊处理</span></summary>
        <Form.Item name="title" label="练习标题（可选）"><Input maxLength={160} placeholder="留空，AI 会根据材料命名" /></Form.Item>
        <Form.Item name="answerText" label="补充已有答案或解析（可选）"><Input.TextArea rows={3} maxLength={100000} placeholder="如果答案在另一份材料中，可以补充在这里" /></Form.Item>
        <Form.Item name="mode" label="处理方式"><Radio.Group><Space direction="vertical"><Radio value="complete_answers">自动整理、补全并检查</Radio><Radio value="format">仅转录，不补答案</Radio><Radio value="generate_questions">根据文章重新出题</Radio></Space></Radio.Group></Form.Item>
        <ImportFields />
      </details>
    </Form>
  );
}
