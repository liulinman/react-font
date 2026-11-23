import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Modal, Radio, Space, Spin, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import {
  downloadReview, previewReview, REVIEW_CHANGED, type ReviewFormat, type ReviewPreview,
  type ReviewScope, type ReviewSource,
} from "./reviewDownloadApi";
import "./wordReviewDownload.css";

const columns = ["单词", "这次要记的词义", "记忆线索"];

function defaultFormat(scope: ReviewScope): ReviewFormat {
  return scope === "all" ? "xlsx" : "pdf";
}

function errorMessage(error: unknown, fallback: string) {
  // Network and JSON parsing errors use a short localized fallback.
  return error instanceof Error && /[\u3400-\u9fff]/.test(error.message)
    ? error.message
    : fallback;
}

export function WordReviewDownload({ ids, filters, onClose }: {
  ids: number[];
  filters: Record<string, unknown>;
  onClose: () => void;
}) {
  const canFilter = Object.keys(filters).length > 0;
  const initialScope = ids.length ? "selected" : canFilter ? "filtered" : "all";
  const [scope, setScope] = useState<ReviewScope>(initialScope);
  const [formatChoice, setFormatChoice] = useState<ReviewFormat>();
  const format = formatChoice ?? defaultFormat(scope);
  const [preview, setPreview] = useState<ReviewPreview>();
  const [previewError, setPreviewError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [reload, setReload] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const activeDownload = useRef<AbortController | undefined>(undefined);

  const source = useMemo<ReviewSource>(() => {
    if (scope === "selected") return { scope, ids };
    if (scope === "filtered") return { scope, filters };
    return { scope };
  }, [scope, ids, filters]);

  useEffect(() => {
    const controller = new AbortController();
    void previewReview(source, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPreview(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setPreviewError(errorMessage(error, "加载预览失败，请重试。"));
      });
    return () => controller.abort();
  }, [source, reload]);

  useEffect(() => () => activeDownload.current?.abort(), []);

  function refreshPreview() {
    setPreview(undefined);
    setPreviewError("");
    setDownloadError("");
    setReload((current) => current + 1);
  }

  async function handleDownload() {
    if (!preview?.count || downloadError === REVIEW_CHANGED || activeDownload.current) return;
    const controller = new AbortController();
    activeDownload.current = controller;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadReview(source, format, preview.revision, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) setDownloadError(errorMessage(error, "下载失败，请重试。"));
    } finally {
      activeDownload.current = undefined;
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  return (
    <Modal
      title="下载单词"
      open
      width={580}
      onCancel={onClose}
      onOk={() => void handleDownload()}
      okText="下载"
      cancelText="取消"
      confirmLoading={downloading}
      okButtonProps={{ disabled: !preview?.count || downloadError === REVIEW_CHANGED, icon: <DownloadOutlined /> }}
      cancelButtonProps={{ disabled: downloading }}
      closable={!downloading}
      maskClosable={!downloading}
      keyboard={!downloading}
    >
      <div className="word-review-download">
        <div className="word-review-download-choice">
          <Typography.Text strong id="word-review-scope">范围</Typography.Text>
          <div role="radiogroup" aria-labelledby="word-review-scope">
          <Radio.Group name="word-review-scope"
            value={scope}
            disabled={downloading}
            onChange={(event) => {
              setPreview(undefined);
              setPreviewError("");
              setDownloadError("");
              setScope(event.target.value);
            }}
          >
            <Space wrap>
              <Radio value="selected" disabled={!ids.length}>已勾选</Radio>
              <Radio value="filtered" disabled={!canFilter}>当前筛选</Radio>
              <Radio value="all">全部单词</Radio>
            </Space>
          </Radio.Group>
          </div>
        </div>
        <div className="word-review-download-choice">
          <Typography.Text strong id="word-review-format">格式</Typography.Text>
          <div role="radiogroup" aria-labelledby="word-review-format">
          <Radio.Group name="word-review-format"
            value={format}
            disabled={downloading}
            onChange={(event) => setFormatChoice(event.target.value)}
            options={[
              { label: "PDF", value: "pdf" },
              { label: "Word", value: "docx" },
              { label: "Excel", value: "xlsx" },
            ]}
          />
          </div>
        </div>

        <section className="word-review-download-preview" aria-label="下载预览" aria-busy={!preview && !previewError}>
          {previewError ? (
            <Alert type="error" showIcon message={previewError}
              action={<Button size="small" onClick={refreshPreview}>重试</Button>} />
          ) : !preview ? (
            <div className="word-review-download-status" role="status"><Spin size="small" /> 正在加载预览</div>
          ) : preview.count === 0 ? (
            <p className="word-review-download-status" role="status">此范围没有可下载的单词。</p>
          ) : (
            <>
              <p className="word-review-download-count">
                <strong>{preview.count} 个词</strong>
                {preview.count > preview.rows.length && <span>预览前 {preview.rows.length} 条</span>}
              </p>
              <table>
                <thead><tr>{columns.map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={index}>
                      <th scope="row" lang="en">{row[0]}</th>
                      <td>{row[1]}</td>
                      <td lang="en">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
        {downloadError && (
          <Alert type="error" showIcon message={downloadError}
            action={<Button size="small" onClick={refreshPreview}>刷新预览</Button>} />
        )}
      </div>
    </Modal>
  );
}
