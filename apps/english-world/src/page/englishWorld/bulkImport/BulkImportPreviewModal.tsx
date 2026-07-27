import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { RobotOutlined } from "@ant-design/icons";
import type {
  BulkImportAiFallbackReason,
  BulkImportPreviewItem,
} from "@/server/word/word.type";
import {
  getAiFallbackMessage,
  getLevelOptions,
  PART_SPEECH_OPTIONS,
  TYPE_OPTIONS,
} from "./bulkImportPreview";

const { Text } = Typography;

type BulkImportPreviewField = "word" | "phonetic" | "chinese" | "note";

type BulkImportPreviewModalProps<T extends BulkImportPreviewItem> = {
  aiEnhanced?: boolean;
  aiFallbackReason?: BulkImportAiFallbackReason;
  ariaLabel?: string;
  bodyClassName?: string;
  bodyDialogLabel?: string;
  cancelText?: string;
  centered?: boolean;
  className?: string;
  confirmText?: string;
  confirming?: boolean;
  defaultLevel?: number;
  description?: ReactNode;
  destroyOnHidden?: boolean;
  fieldAriaLabel?: (
    item: T,
    index: number,
    field: BulkImportPreviewField,
  ) => string;
  getWordKey?: (item: T, index: number) => string;
  inlineFooter?: boolean;
  inlineFooterClassName?: string;
  onCancel: () => void;
  onConfirm: () => void;
  onOverwriteExistingChange: (checked: boolean) => void;
  onWordsChange: (words: T[]) => void;
  open: boolean;
  overwriteExisting: boolean;
  title?: ReactNode;
  width?: number;
  words: T[];
};

const FIELD_LABELS: Record<BulkImportPreviewField, string> = {
  word: "词条",
  phonetic: "音标",
  chinese: "中文释义",
  note: "备注",
};

function getDefaultFieldAriaLabel<T extends BulkImportPreviewItem>(
  item: T,
  index: number,
  field: BulkImportPreviewField,
) {
  const word = item.englishWord || `第 ${index + 1} 个词`;
  return `${word} ${FIELD_LABELS[field]}`;
}

export function BulkImportPreviewModal<T extends BulkImportPreviewItem>({
  aiEnhanced = false,
  aiFallbackReason,
  ariaLabel = "导入预览",
  bodyClassName,
  bodyDialogLabel,
  cancelText = "取消",
  centered,
  className = "bulk-import-preview-modal",
  confirmText = "确认导入",
  confirming = false,
  defaultLevel = 0,
  description,
  destroyOnHidden,
  fieldAriaLabel,
  getWordKey,
  inlineFooter = false,
  inlineFooterClassName = "context-lab-import-preview-actions",
  onCancel,
  onConfirm,
  onOverwriteExistingChange,
  onWordsChange,
  open,
  overwriteExisting,
  title,
  width = 980,
  words,
}: BulkImportPreviewModalProps<T>) {
  const levelOptions = useMemo(() => getLevelOptions(), []);
  const aiFallbackMessage = getAiFallbackMessage(aiFallbackReason);
  const resolveFieldAriaLabel = fieldAriaLabel ?? getDefaultFieldAriaLabel;
  const resolveWordKey =
    getWordKey ?? ((item: T, index: number) => `${item.englishWord}-${index}`);

  const modalTitle =
    title ?? (
      <Space wrap>
        <span>确认并修改导入词条</span>
        {aiEnhanced && (
          <Tag color="blue" icon={<RobotOutlined />}>
            AI 已补全
          </Tag>
        )}
        <Tag>{words.length} 个词条</Tag>
      </Space>
    );

  const updatePreviewWord = (
    index: number,
    patch: Partial<BulkImportPreviewItem>,
  ) => {
    onWordsChange(
      words.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const nextWord = patch.englishWord ?? item.englishWord;
        return {
          ...item,
          ...patch,
          englishType:
            patch.englishWord !== undefined
              ? nextWord.trim().includes(" ")
                ? 1
                : 0
              : patch.englishType ?? item.englishType,
        };
      }),
    );
  };

  const removePreviewWord = (index: number) => {
    onWordsChange(words.filter((_, itemIndex) => itemIndex !== index));
  };

  const footerButtons = [
    <Button key="cancel" onClick={onCancel}>
      {cancelText}
    </Button>,
    <Button
      key="confirm"
      loading={confirming}
      type="primary"
      onClick={onConfirm}
    >
      {confirmText}
    </Button>,
  ];

  const content = (
    <>
      {description && (
        <div className="bulk-import-preview-status">{description}</div>
      )}
      <div className="bulk-import-overwrite-panel">
        <label className="bulk-import-overwrite-switch">
          <Switch
            aria-label="覆盖已存在词条"
            checked={overwriteExisting}
            onChange={onOverwriteExistingChange}
          />
          <span>覆盖已存在词条</span>
        </label>
        <Text type="secondary">
          开启后会用本次预览里的非空字段更新已有词条；图片、引用等已有内容不会被空值清空。
        </Text>
      </div>
      {aiFallbackMessage && (
        <Alert
          className="bulk-import-alert"
          description={aiFallbackMessage}
          message="AI 补全未完成"
          showIcon
          type="warning"
        />
      )}
      <div className="bulk-import-preview-list">
        {words.map((item, index) => (
          <div
            className="bulk-import-preview-card"
            key={resolveWordKey(item, index)}
          >
            <div className="bulk-import-preview-head">
              <strong>
                {index + 1}. {item.englishWord || "未命名词条"}
              </strong>
              <Button
                danger
                size="small"
                type="text"
                onClick={() => removePreviewWord(index)}
              >
                移除
              </Button>
            </div>
            <div className="bulk-import-preview-grid">
              <label className="bulk-import-preview-field">
                <span>词条</span>
                <Input
                  aria-label={resolveFieldAriaLabel(item, index, "word")}
                  value={item.englishWord}
                  onChange={(event) =>
                    updatePreviewWord(index, {
                      englishWord: event.target.value,
                    })
                  }
                />
              </label>
              <label className="bulk-import-preview-field">
                <span>音标</span>
                <Input
                  aria-label={resolveFieldAriaLabel(item, index, "phonetic")}
                  value={item.englishPhonetic}
                  onChange={(event) =>
                    updatePreviewWord(index, {
                      englishPhonetic: event.target.value,
                    })
                  }
                />
              </label>
              <label className="bulk-import-preview-field">
                <span>中文释义</span>
                <Input
                  aria-label={resolveFieldAriaLabel(item, index, "chinese")}
                  value={item.englishChinese}
                  onChange={(event) =>
                    updatePreviewWord(index, {
                      englishChinese: event.target.value,
                    })
                  }
                />
              </label>
              <label className="bulk-import-preview-field">
                <span>类型</span>
                <Select
                  options={TYPE_OPTIONS}
                  value={item.englishType ?? 0}
                  onChange={(value) =>
                    updatePreviewWord(index, { englishType: value })
                  }
                />
              </label>
              <label className="bulk-import-preview-field">
                <span>掌握程度</span>
                <Select
                  options={levelOptions}
                  value={item.englishLevel ?? defaultLevel}
                  onChange={(value) =>
                    updatePreviewWord(index, { englishLevel: value })
                  }
                />
              </label>
              <label className="bulk-import-preview-field bulk-import-preview-field-wide">
                <span>词性</span>
                <Select
                  mode="multiple"
                  options={PART_SPEECH_OPTIONS}
                  value={
                    item.englishPartSpeech?.length
                      ? item.englishPartSpeech
                      : [9]
                  }
                  onChange={(value) =>
                    updatePreviewWord(index, { englishPartSpeech: value })
                  }
                />
              </label>
              <label className="bulk-import-preview-field bulk-import-preview-field-full">
                <span>备注</span>
                <Input
                  aria-label={resolveFieldAriaLabel(item, index, "note")}
                  value={item.englishNote}
                  onChange={(event) =>
                    updatePreviewWord(index, {
                      englishNote: event.target.value,
                    })
                  }
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      {inlineFooter && (
        <Space className={inlineFooterClassName} wrap>
          {footerButtons}
        </Space>
      )}
    </>
  );

  return (
    <Modal
      aria-label={ariaLabel}
      centered={centered}
      className={className}
      destroyOnHidden={destroyOnHidden}
      footer={inlineFooter ? null : footerButtons}
      onCancel={onCancel}
      open={open}
      title={modalTitle}
      width={width}
    >
      {bodyDialogLabel ? (
        <div
          aria-label={bodyDialogLabel}
          className={bodyClassName}
          role="region"
        >
          {content}
        </div>
      ) : (
        content
      )}
    </Modal>
  );
}
