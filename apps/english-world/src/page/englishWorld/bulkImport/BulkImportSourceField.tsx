import {
  Button,
  Input,
  Segmented,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadProps } from "antd";
import {
  DeleteOutlined,
  FilePdfOutlined,
  LinkOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import request from "@font/api";
import { sourceFileUpload } from "@/server/word/word";
import type { SourceFileUploadResult } from "@/server/word/word.type";
import { useState } from "react";
import {
  isValidImportSourceUrl,
  type SharedImportSource,
} from "./bulkImportSource";

const { Text } = Typography;

const MAX_SOURCE_FILE_SIZE = 20 * 1024 * 1024;
const SOURCE_FILE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

type BulkImportSourceFieldProps = {
  value: SharedImportSource;
  onChange: (source: SharedImportSource) => void;
};

export function BulkImportSourceField({
  value,
  onChange,
}: BulkImportSourceFieldProps) {
  const [urlTouched, setUrlTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cleanUrl = value.url.trim();
  const showUrlError =
    value.mode === "url" &&
    urlTouched &&
    Boolean(cleanUrl) &&
    !isValidImportSourceUrl(cleanUrl);

  const handleModeChange = (mode: SharedImportSource["mode"]) => {
    setUrlTouched(false);
    onChange({ mode, url: "" });
  };

  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    if (!SOURCE_FILE_TYPES.has(file.type)) {
      message.error("仅支持 PDF、PNG、JPG、JPEG 或 WebP 文件");
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_SOURCE_FILE_SIZE) {
      message.error("来源文件不能超过 20MB");
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const customRequest: UploadProps["customRequest"] = async ({
    file,
    onError,
    onProgress,
    onSuccess,
  }) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file as Blob);
      onProgress?.({ percent: 25 });
      const result = await request<SourceFileUploadResult>(
        sourceFileUpload(formData),
      );
      onProgress?.({ percent: 100 });
      onChange({
        mode: "file",
        url: result.url,
        name: result.originalName,
      });
      onSuccess?.(result);
      message.success("来源文件上传成功");
    } catch (error) {
      const uploadError =
        error instanceof Error ? error : new Error("来源文件上传失败");
      onError?.(uploadError);
      message.error(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bulk-import-source-field">
      <div className="bulk-import-source-heading">
        <span>统一来源</span>
        <Text type="secondary">本批所有词条共用</Text>
      </div>
      <Segmented
        block
        value={value.mode}
        options={[
          { label: "无来源", value: "none" },
          { label: "网页链接", value: "url" },
          { label: "上传文件", value: "file" },
        ]}
        onChange={(nextValue) =>
          handleModeChange(nextValue as SharedImportSource["mode"])
        }
      />

      {value.mode === "url" && (
        <div className="bulk-import-source-input">
          <Input
            prefix={<LinkOutlined />}
            maxLength={255}
            status={showUrlError ? "error" : undefined}
            value={value.url}
            placeholder="粘贴文章网页地址，例如 https://..."
            onBlur={() => setUrlTouched(true)}
            onChange={(event) =>
              onChange({
                mode: "url",
                url: event.target.value,
              })
            }
          />
          {showUrlError && (
            <Text type="danger">
              请输入 http:// 或 https:// 开头的链接
            </Text>
          )}
        </div>
      )}

      {value.mode === "file" && (
        <div className="bulk-import-source-upload">
          {value.url ? (
            <Space size={8} wrap>
              <FilePdfOutlined />
              <a href={value.url} target="_blank" rel="noreferrer">
                {value.name || "查看已上传来源"}
              </a>
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label="移除来源文件"
                onClick={() => onChange({ mode: "file", url: "" })}
              />
            </Space>
          ) : (
            <Upload
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              beforeUpload={beforeUpload}
              customRequest={customRequest}
              maxCount={1}
              showUploadList={false}
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploading}
              >
                上传来源文件
              </Button>
            </Upload>
          )}
          <Text type="secondary">PDF 或图片，最大 20MB，仅登录后可查看</Text>
        </div>
      )}
    </div>
  );
}
