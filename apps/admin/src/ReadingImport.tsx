import { useRef, useState } from "react";
import { Alert, Button, Form, Input, Radio, Space, Upload } from "antd";
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
}: {
  value: Source[];
  onChange: (s: Source[]) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const current = useRef(value);
  current.current = value;
  return (
    <>
      <p>
        PDF / PNG / JPEG /
        WebP；每文件20MiB，合计40MiB、最多20页/图。原稿仅管理员可见。
      </p>
      <Upload
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        showUploadList={false}
        disabled={disabled || uploading}
        beforeUpload={async (file) => {
          if (file.size > 20 * 1024 * 1024) {
            setError("单文件不能超过20MiB");
            return false;
          }
          setUploading(true);
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
            setUploading(false);
          }
          return false;
        }}
      >
        <Button loading={uploading}>上传原稿</Button>
      </Upload>
      {error && <Alert type="error" message={error} />}
      {value.map((s, i) => (
        <div key={s.id} style={{ padding: "8px 0" }}>
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
export function ReadingImport({ onCreated }: { onCreated: () => void }) {
  const [sources, setSources] = useState<Source[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const attempt = useRef<{ signature: string; uid: string } | undefined>(
    undefined,
  );
  return (
    <Form
      layout="vertical"
      initialValues={{
        mode: "format",
        title: "",
        text: "",
        answerText: "",
        config: { ...practiceDefaults, topic: "导入已有材料" },
      }}
      onFinish={async (v: {
        title: string;
        mode: string;
        text: string;
        answerText: string;
        config: PracticeConfig;
      }) => {
        const data = { ...v, sourceIds: sources.map((s) => s.id) };
        const signature = JSON.stringify(data);
        if (attempt.current?.signature !== signature)
          attempt.current = { signature, uid: newRequestId() };
        setBusy(true);
        setError("");
        try {
          await request({
            url: "/admin/reading-practices/imports",
            method: "POST",
            data: { ...data, requestUid: attempt.current.uid },
          });
          onCreated();
        } catch {
          setError("导入任务未创建，材料已保留，请检查输入和网络后重试。");
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
    >
      <Alert
        showIcon
        type="info"
        message="默认保留原文原题，只识别与整理"
        description="缺少答案、模糊文字和不支持题型将保留为待确认问题。AI新增内容需审核后发布。"
      />
      <Form.Item name="title" label="练习标题">
        <Input maxLength={160} placeholder="可留空，由材料标题识别" />
      </Form.Item>
      <Form.Item name="mode" label="处理模式">
        <Radio.Group>
          <Space direction="vertical">
            <Radio value="format">仅识别并整理格式（默认）</Radio>
            <Radio value="generate_questions">保留文章并生成题目</Radio>
            <Radio value="complete_answers">整理并补充缺失答案解析</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="text" label="文章与题目 / 混合材料">
        <Input.TextArea rows={8} maxLength={100000} showCount />
      </Form.Item>
      <Form.Item name="answerText" label="答案与解析（可选）">
        <Input.TextArea rows={4} maxLength={100000} />
      </Form.Item>
      <SourceFiles value={sources} onChange={setSources} disabled={busy} />
      <p>上传顺序即识别顺序。关联原稿随练习保留；未使用的上传7天后清理。</p>
      <PracticeFields prefix={["config"]} />
      {error && <Alert type="error" message={error} />}
      <Button type="primary" htmlType="submit" loading={busy}>
        识别并创建草稿
      </Button>
    </Form>
  );
}
