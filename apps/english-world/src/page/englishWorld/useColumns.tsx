import { WordList } from "@/server/word/word.type";
import {
  Button,
  Space,
  TableProps,
  Tag,
  Tooltip,
  Image,
  Typography,
} from "antd";
import moment from "moment";
import { DeleteFilled, EditFilled } from "@ant-design/icons";
import {
  getLevelLabel,
  getPartSpeechLabel,
  getTypeLabel,
} from "./utils/wordLabels";
import { BritishPronunciationButton } from "./component/BritishPronunciationButton";
import { hasDisplayNote } from "./utils/wordNote";
import {
  getContextLabReferenceLabel,
  isExternalReference,
  type ParsedContextLabReference,
  parseContextLabReference,
} from "./utils/contextLabReference";

type Props = {
  handleEdit: (record: WordList) => void;
  handleDelete: (id: number) => void;
  handleOpenContextLabReference?: (
    reference: ParsedContextLabReference,
    record: WordList,
  ) => void;
  page: number;
  pageSize: number;
};

const { Paragraph } = Typography;

export const useColumns = (props: Props) => {
  const {
    handleEdit,
    handleDelete,
    handleOpenContextLabReference,
    page,
    pageSize,
  } = props;

  // 将换行符转换为 HTML 的 <br /> 标签
  const formatNote = (text?: string) => {
    if (text) {
      return (
        <div
          style={{ maxHeight: "400px", maxWidth: "800px", overflow: "auto" }}
        >
          {text.split("\n").map((item, index) => (
            <span key={index}>
              {item}
              <br />
            </span>
          ))}
        </div>
      );
    } else {
      return null;
    }
  };

  const shouldShowTooltip = (text?: string, limit = 12) => {
    if (!text) return false;
    return text.length > limit;
  };

  const columns: TableProps<WordList>["columns"] = [
    {
      width: 72,
      title: "序号",
      dataIndex: "key",
      key: "key",
      align: "center",
      render: (_text: number, _record: WordList, index: number) => {
        const serialNumber = (page - 1) * pageSize + index + 1;
        return <span className="word-index">{serialNumber}</span>;
      },
    },
    {
      width: 170,
      title: "单词",
      dataIndex: "englishWord",
      key: "englishWord",
      // fixed: "left",
      render: (text: string, record: WordList) => (
        <span className="word-title-stack">
          <span className="word-title-cell">
            <a
              href={`https://www.baidu.com/s?wd=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="word-link"
              onClick={(e) => e.stopPropagation()}
            >
              {text}
            </a>
            <BritishPronunciationButton word={text} />
          </span>
          {hasDisplayNote(record.englishNote) && (
            <span className="word-note-indicator">有笔记</span>
          )}
        </span>
      ),
    },
    // ... 音标列
    {
      width: 140,
      title: "音标",
      dataIndex: "englishPhonetic",
      key: "englishPhonetic",
      render: (text: string) => (
        <span className="word-phonetic">
          {text || "-"}
        </span>
      ),
    },
    {
      width: 190,
      title: "词性",
      dataIndex: "englishPartSpeech",
      key: "englishPartSpeech",
      align: "left",
      render: (partSpeechList?: number[]) => {
        if (!partSpeechList || partSpeechList.length === 0) {
          return <span className="word-muted">-</span>;
        }

        // 最多显示3个，超过的用 +N 表示
        const displayList = partSpeechList.slice(0, 3);
        const remainingCount = partSpeechList.length - 3;

        const allTags = partSpeechList
          .map((partSpeech) => {
            return getPartSpeechLabel(partSpeech)?.label || "未知";
          })
          .join("、");

        return (
          <Tooltip title={partSpeechList.length > 3 ? allTags : undefined}>
            <Space size={2} wrap style={{ maxWidth: "100%" }}>
              {displayList.map((partSpeech) => {
                const info = getPartSpeechLabel(partSpeech);
                return (
                  <Tag
                    key={partSpeech}
                    color={info?.color || "default"}
                    style={{ margin: 0, fontSize: "12px" }}
                  >
                    {info?.label || "未知"}
                  </Tag>
                );
              })}
              {remainingCount > 0 && (
                <Tag color="default" style={{ margin: 0, fontSize: "12px" }}>
                  +{remainingCount}
                </Tag>
              )}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      width: 240,
      title: "中文释义",
      dataIndex: "englishChinese",
      key: "englishChinese",
      ellipsis: true,
      render: (englishChinese: string) =>
        (() => {
          const paragraph = (
            <Paragraph
              style={{ marginBottom: 0, maxWidth: 180 }}
              ellipsis={{ rows: 2, tooltip: false }}
            >
              {englishChinese || "-"}
            </Paragraph>
          );
          if (shouldShowTooltip(englishChinese, 20)) {
            return (
              <Tooltip placement="topLeft" title={formatNote(englishChinese)}>
                {paragraph}
              </Tooltip>
            );
          }
          return paragraph;
        })(),
    },
    {
      width: 100,
      title: "图片",
      dataIndex: "englishImg",
      key: "englishImg",
      align: "center",
      render: (value?: string) => {
        if (value) {
          return (
            <Image
              src={value}
              width={40}
              height={40}
              style={{ borderRadius: "4px", objectFit: "cover" }}
            />
          );
        } else {
              return <span className="word-muted">-</span>;
        }
      },
    },
    {
      width: 92,
      title: "类型",
      dataIndex: "englishType",
      key: "englishType",
      align: "center",
      render: (type: number) => {
        const info = getTypeLabel(type);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      width: 110,
      title: "掌握程度",
      dataIndex: "englishLevel",
      key: "englishLevel",
      align: "center",
      render: (level: number) => {
        const info = getLevelLabel(level);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      width: 180,
      title: "引用",
      dataIndex: "englishReference",
      key: "englishReference",
      ellipsis: true,
      render: (text: string, record: WordList) => {
        const contextLabReference = parseContextLabReference(text);
        const isUrl = isExternalReference(text);

        return (
          <Tooltip title={text} placement="topLeft">
            {contextLabReference ? (
              <button
                type="button"
                className="word-reference-link word-reference-link-internal"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenContextLabReference?.(contextLabReference, record);
                }}
              >
                {getContextLabReferenceLabel(contextLabReference)}
              </button>
            ) : isUrl ? (
              <a
                href={text}
                target="_blank"
                rel="noopener noreferrer"
                className="word-reference-link"
                onClick={(e) => e.stopPropagation()}
              >
                {text}
              </a>
            ) : (
              <span className="word-reference-text">{text || "-"}</span>
            )}
          </Tooltip>
        );
      },
    },
    {
      width: 132,
      title: "创建时间",
      dataIndex: "englishCreateTime",
      key: "englishCreateTime",
      render: (utcTime: string) => {
        return (
          <span className="word-date">
            {moment(utcTime).local().format("YYYY-MM-DD")}
          </span>
        );
      },
    },
    {
      width: 132,
      title: "更新时间",
      dataIndex: "englishUpdateTime",
      key: "englishUpdateTime",
      render: (utcTime: string) => {
        return (
          <span className="word-date">
            {moment(utcTime).local().format("YYYY-MM-DD")}
          </span>
        );
      },
    },
    {
      width: 136,
      title: "操作",
      key: "action",
      fixed: "right",
      align: "center",
      render: (_text: number, record: WordList) => (
        <span className="word-action-group">
          <Button
            type="text"
            size="small"
            onClick={() => handleEdit(record)}
            icon={<EditFilled />}
            className="word-action-button"
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            size="small"
            onClick={() => handleDelete(record.id)}
            icon={<DeleteFilled />}
            className="word-action-button"
          >
            删除
          </Button>
        </span>
      ),
    },
  ];

  return {
    columns,
  };
};
