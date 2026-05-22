import { WordList } from "@/server/word/word.type";
import {
  Button,
  Popover,
  Space,
  TableProps,
  Tag,
  Tooltip,
  Image,
  Typography,
} from "antd";
import moment from "moment";
import { TagColor } from "./types";
import { DeleteFilled, EditFilled } from "@ant-design/icons";
import { getPartSpeechLabel } from "./utils/wordLabels";

type Props = {
  handleEdit: (record: WordList) => void;
  handleDelete: (id: number) => void;
  page: number;
  pageSize: number;
};

const { Paragraph } = Typography;

export const useColumns = (props: Props) => {
  const { handleEdit, handleDelete, page, pageSize } = props;

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
        return <span style={{ color: "#6b7280", fontWeight: 600 }}>{serialNumber}</span>;
      },
    },
    {
      width: 170,
      title: "单词",
      dataIndex: "englishWord",
      key: "englishWord",
      // fixed: "left",
      render: (text: string) => (
        <a
          href={`https://www.baidu.com/s?wd=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="word-link"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </a>
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
      render: (level: number) => {
        const types = [
          { label: "单词", color: "blue" },
          { label: "短语", color: "green" },
          { label: "句子", color: "orange" },
        ];
        const type = types[level];
        return <Tag color={type.color}>{type.label}</Tag>;
      },
    },
    {
      width: 104,
      title: "笔记",
      dataIndex: "englishNote",
      key: "englishNote",
      align: "center",
      render: (text: string) => {
        if (text) {
          return (
            <Popover
              content={formatNote(text)}
              title="笔记内容"
              trigger="hover"
            >
              <Button type="link" size="small">
                查看笔记
              </Button>
            </Popover>
          );
        } else {
          return <span className="word-muted">无</span>;
        }
      },
    },
    {
      width: 110,
      title: "掌握程度",
      dataIndex: "englishLevel",
      key: "englishLevel",
      align: "center",
      render: (level: number) => {
        const levels = [
          { label: "不会", color: "red" },
          { label: "一般", color: "orange" },
          { label: "熟练", color: "blue" },
          { label: "精通", color: "green" },
        ];
        const currentLevel = levels[level];
        const color = TagColor[level];

        return (
          <Tag color={color || currentLevel.color}>{currentLevel.label}</Tag>
        );
      },
    },
    {
      width: 180,
      title: "引用",
      dataIndex: "englishReference",
      key: "englishReference",
      ellipsis: true,
      render: (text: string) => {
        // 检查是否是 URL
        const isUrl =
          text && (text.startsWith("http://") || text.startsWith("https://"));

        return (
          <Tooltip title={text} placement="topLeft">
            {isUrl ? (
              <a
                href={text}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1677ff", textDecoration: "underline" }}
                onClick={(e) => e.stopPropagation()}
              >
                {text}
              </a>
            ) : (
              <span style={{ color: "#666" }}>{text || "-"}</span>
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
          <span style={{ color: "#666", fontSize: "13px" }}>
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
          <span style={{ color: "#666", fontSize: "13px" }}>
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
