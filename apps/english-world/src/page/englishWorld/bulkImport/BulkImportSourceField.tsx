import {
  Button,
  Input,
  Modal,
  Popconfirm,
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
import {
  sourceFileDelete,
  sourceFileUpload,
} from "@/server/word/word";
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
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cleanUrl = value.url.trim();
  const showUrlError =
    value.mode === "url" &&
    urlTouched &&
    Boolean(cleanUrl) &&
    !isValidImportSourceUrl(cleanUrl);

  const getStorageName = () => {
    if (value.storageName) return value.storageName;
    const matched = value.url.match(
      /\/api\/upload\/source-file\/\d+\/([^/?#]+)$/,
    );
    return matched?.[1] ? decodeURIComponent(matched[1]) : "";
  };

  const deleteUploadedFile = async () => {
    const storageName = getStorageName();
    if (!storageName) {
      throw new Error("无法识别来源文件，请刷新后重试");
    }
    await request(sourceFileDelete(storageName));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteUploadedFile();
      onChange({ mode: "file", url: "" });
      message.success("来源文件已删除");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "来源文件删除失败",
      );
    } finally {
      setDeleting(false);
    }
  };

  const applyModeChange = (mode: SharedImportSource["mode"]) => {
    setUrlTouched(false);
    onChange({ mode, url: "" });
  };

  const handleModeChange = (mode: SharedImportSource["mode"]) => {
    if (value.mode === "file" && value.url && mode !== "file") {
      Modal.confirm({
        title: "切换来源并删除已上传文件？",
        content: "该文件尚未用于导入，切换来源后将从服务器删除。",
        okText: "删除并切换",
        cancelText: "取消",
        okButtonProps: { danger: true },
        onOk: async () => {
          setDeleting(true);
          try {
            await deleteUploadedFile();
            applyModeChange(mode);
            message.success("来源文件已删除");
          } catch (error) {
            message.error(
              error instanceof Error
                ? error.message
                : "来源文件删除失败",
            );
            throw error;
          } finally {
            setDeleting(false);
          }
        },
      });
      return;
    }
    applyModeChange(mode);
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
        storageName: result.storageName,
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
              <Popconfirm
                title="删除已上传的来源文件？"
                description="删除后无法恢复。"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="移除来源文件"
                  loading={deleting}
                />
              </Popconfirm>
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
