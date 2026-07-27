import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  FileSearchOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import request from "@font/api";
import { wordBulkImportPreview, wordImportMissing } from "@/server/word/word";
import type {
  BulkImportPreviewItem,
  BulkImportWordItem,
  BulkImportWordsPreviewResult,
  BulkImportWordsResult,
  ImportMissingWordsResult,
} from "@/server/word/word.type";
import {
  getLevelLabel,
  getPartSpeechLabel,
  getTypeLabel,
} from "../utils/wordLabels";
import { BulkImportPreviewModal } from "./BulkImportPreviewModal";
import {
  getBulkImportMessage,
  getBulkImportStatus,
  getLevelOptions,
  toBulkImportWordPayload,
} from "./bulkImportPreview";

const { Text, Title } = Typography;
const { TextArea } = Input;

const SAMPLE_TEXT = [
  "mitigate 缓解",
  "resilient",
  "climate change",
  "sustainable development, biodiversity, habitat loss",
].join("\n");

const STATUS_LABELS: Record<BulkImportWordItem["status"], string> = {
  inserted: "已导入",
  updated: "已覆盖",
  existing: "已存在",
  duplicate: "重复",
};

const STATUS_COLORS: Record<BulkImportWordItem["status"], string> = {
  inserted: "green",
  updated: "blue",
  existing: "gold",
  duplicate: "default",
};

function getItemKey(item: BulkImportWordItem) {
  return `${item.englishWord}-${item.status}`;
}

export function BulkImportPage() {
  const [rawText, setRawText] = useState("");
  const [defaultLevel, setDefaultLevel] = useState(0);
  const [maxItems, setMaxItems] = useState(120);
  const [useAi, setUseAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<BulkImportWordsPreviewResult | null>(
    null,
  );
  const [previewWords, setPreviewWords] = useState<BulkImportPreviewItem[]>([]);
  const [result, setResult] = useState<BulkImportWordsResult | null>(null);
  const levelOptions = useMemo(() => getLevelOptions(), []);
  const trimmedText = rawText.trim();

  const columns = useMemo<ColumnsType<BulkImportWordItem>>(
    () => [
      {
        title: "词条",
        key: "englishWord",
        width: 220,
        render: (_, item) => (
          <div className="bulk-import-word-cell">
            <strong>{item.englishWord}</strong>
            {item.englishPhonetic && (
              <Text type="secondary">{item.englishPhonetic}</Text>
            )}
          </div>
        ),
      },
      {
        title: "释义",
        dataIndex: "englishChinese",
        key: "englishChinese",
        width: 220,
        render: (value) => value || <Text type="secondary">待补充</Text>,
      },
      {
        title: "分类",
        key: "classify",
        width: 180,
        render: (_, item) => {
          const type = getTypeLabel(item.englishType);
          const level = getLevelLabel(item.englishLevel);

          return (
            <Space wrap size={[6, 4]}>
              <Tag color={type.color}>{type.label}</Tag>
              <Tag color={level.color}>{level.label}</Tag>
            </Space>
          );
        },
      },
      {
        title: "词性",
        key: "partSpeech",
        width: 190,
        render: (_, item) => {
          const partSpeech = item.englishPartSpeech?.length
            ? item.englishPartSpeech
            : [9];

          return (
            <Space wrap size={[6, 4]}>
              {partSpeech.map((value) => {
                const label = getPartSpeechLabel(value);
                return (
                  <Tag color={label.color} key={`${item.englishWord}-${value}`}>
                    {label.label}
                  </Tag>
                );
              })}
            </Space>
          );
        },
      },
      {
        title: "备注",
        dataIndex: "englishNote",
        key: "englishNote",
        ellipsis: true,
        render: (value) => value || <Text type="secondary">-</Text>,
      },
      {
        title: "状态",
        key: "status",
        fixed: "right",
        width: 96,
        render: (_, item) => (
          <Tag color={STATUS_COLORS[item.status]}>
            {STATUS_LABELS[item.status]}
          </Tag>
        ),
      },
    ],
    [],
  );

  const handlePreview = async () => {
    if (!trimmedText) {
      message.warning("请先粘贴需要导入的单词内容");
      return;
    }

    setLoading(true);
    try {
      const response = await request<BulkImportWordsPreviewResult>(
        wordBulkImportPreview({
          rawText: trimmedText,
          defaultLevel,
          maxItems,
          useAi,
        }),
      );
      setPreview(response);
      setPreviewWords(response.items);
      setOverwriteExisting(false);
      if (response.items.length > 0) {
        setPreviewOpen(true);
      } else {
        message.info("没有从文本中识别到可导入的英文词条");
      }
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "解析预览失败");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (previewWords.length === 0) {
      message.warning("没有可导入的预览词条");
      return;
    }

    setConfirming(true);
    try {
      const response = await request<ImportMissingWordsResult>(
        wordImportMissing({
          overwriteExisting,
          words: previewWords.map((item) =>
            toBulkImportWordPayload(item, defaultLevel),
          ),
        }),
      );
      const messageText = getBulkImportMessage(response);
      setResult({
        ...response,
        receivedTextLength: preview?.receivedTextLength ?? trimmedText.length,
        extracted: preview?.extracted ?? previewWords.length,
        aiEnhanced: preview?.aiEnhanced ?? false,
        items: previewWords.map((item) => ({
          ...item,
          status: getBulkImportStatus(item, response),
        })),
        message: messageText,
      });
      setPreviewOpen(false);
      message.success(messageText);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "确认导入失败");
    } finally {
      setConfirming(false);
    }
  };

  const handleUseSample = () => {
    setRawText(SAMPLE_TEXT);
  };

  return (
    <div className="bulk-import-page">
      <section className="learning-cockpit-hero bulk-import-hero">
        <Tag className="context-lab-hero-tag" icon={<CloudUploadOutlined />}>
          批量新增
        </Tag>
        <Title level={1}>AI 批量导入单词</Title>
        <Text>
          粘贴外部收集的词表，系统会抽取英文词条、补齐学习字段，并跳过已存在的词。
        </Text>
      </section>

      <div className="bulk-import-grid">
        <section className="learning-cockpit-card bulk-import-input-card">
          <div className="learning-cockpit-card-heading">
            <div>
              <Text className="learning-cockpit-label">IMPORT SOURCE</Text>
              <Title level={3}>粘贴词表</Title>
            </div>
            <span className="learning-cockpit-card-icon">
              <FileSearchOutlined />
            </span>
          </div>

          <TextArea
            className="bulk-import-textarea"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="支持换行、逗号、序号、英文 + 中文释义混合粘贴"
            autoSize={{ minRows: 13, maxRows: 18 }}
          />

          <div className="bulk-import-controls">
            <label className="bulk-import-field">
              <span>默认掌握程度</span>
              <Select
                value={defaultLevel}
                options={levelOptions}
                onChange={setDefaultLevel}
              />
            </label>
            <label className="bulk-import-field">
              <span>本次最多导入</span>
              <InputNumber
                min={1}
                max={300}
                value={maxItems}
                onChange={(value) => setMaxItems(Number(value) || 120)}
              />
            </label>
            <label className="bulk-import-switch">
              <Switch checked={useAi} onChange={setUseAi} />
              <span>
                <RobotOutlined /> AI 补全字段
              </span>
            </label>
          </div>

          <Space wrap className="bulk-import-actions">
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              loading={loading}
              onClick={handlePreview}
            >
              解析预览
            </Button>
            <Button onClick={handleUseSample}>填入示例</Button>
          </Space>
        </section>

        <section className="learning-cockpit-card bulk-import-result-card">
          <div className="learning-cockpit-card-heading">
            <div>
              <Text className="learning-cockpit-label">IMPORT RESULT</Text>
              <Title level={3}>导入结果</Title>
            </div>
            {result?.aiEnhanced && (
              <Tag color="blue" icon={<RobotOutlined />}>
                AI 已补全
              </Tag>
            )}
          </div>

          {result ? (
            <>
              <div className="bulk-import-summary">
                <div>
                  <Text type="secondary">识别词条</Text>
                  <strong>{result.extracted}</strong>
                </div>
                <div>
                  <Text type="secondary">新增</Text>
                  <strong>{result.inserted}</strong>
                </div>
                <div>
                  <Text type="secondary">覆盖</Text>
                  <strong>{result.updated ?? 0}</strong>
                </div>
                <div>
                  <Text type="secondary">已存在</Text>
                  <strong>{result.skippedExisting}</strong>
                </div>
                <div>
                  <Text type="secondary">重复</Text>
                  <strong>{result.skippedDuplicate}</strong>
                </div>
              </div>

              <Alert
                className="bulk-import-alert"
                type={result.inserted > 0 ? "success" : "info"}
                showIcon
                icon={<CheckCircleOutlined />}
                message={result.message}
              />

              <Table
                className="bulk-import-table"
                rowKey={getItemKey}
                columns={columns}
                dataSource={result.items}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                scroll={{ x: 980 }}
              />
            </>
          ) : (
            <Empty
              className="bulk-import-empty"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="导入完成后会在这里查看补全字段和跳过原因"
            />
          )}
        </section>
      </div>

      <BulkImportPreviewModal
        aiEnhanced={preview?.aiEnhanced}
        aiFallbackReason={preview?.aiFallbackReason}
        confirming={confirming}
        defaultLevel={defaultLevel}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={handleConfirmImport}
        onOverwriteExistingChange={setOverwriteExisting}
        onWordsChange={setPreviewWords}
        open={previewOpen}
        overwriteExisting={overwriteExisting}
        words={previewWords}
      />
    </div>
  );
}
