import { WordList } from "@/server/word/word.type";
import { Button, Popover, Space, TableProps, Tag, Tooltip, Image, Typography } from "antd";
import { TagColor } from "./types";
import { formatUtcTime, PART_SPEECH_MAP, WORD_TYPE_MAP, LEVEL_MAP } from "@/utils/formatters";
import { DeleteFilled, EditFilled } from "@ant-design/icons";

type Props = {
  handleEdit: (record: WordList) => void;
  handleDelete: (id: number) => void;
  page: number;
  pageSize: number;
};

export const CORE_COLUMN_KEYS = ["key", "englishWord", "englishChinese", "englishLevel", "action"];

export const EXTRA_COLUMN_KEYS = [
  "englishPhonetic",
  "englishPartSpeech",
  "englishImg",
  "englishType",
  "englishNote",
  "englishReference",
  "englishCreateTime",
  "englishUpdateTime",
];

export const ALL_COLUMN_LABELS: Record<string, string> = {
  key: "序号",
  englishWord: "单词",
  englishPhonetic: "音标",
  englishPartSpeech: "词性",
  englishChinese: "中文释义",
  englishImg: "图片",
  englishType: "类型",
  englishNote: "笔记",
  englishLevel: "掌握程度",
  englishReference: "引用",
  englishCreateTime: "创建时间",
  englishUpdateTime: "更新时间",
  action: "操作",
};

export function getRowClassName(record: WordList): string {
  return `level-${record.englishLevel ?? 0}`;
}

const { Paragraph } = Typography;

export const useColumns = (props: Props) => {
  const { handleEdit, handleDelete, page, pageSize } = props;

  const formatNote = (text?: string) => {
    if (text) {
      return (
        <div className="max-h-[400px] max-w-[800px] overflow-auto">
          {text.split("\n").map((item, index) => (
            <span key={index}>
              {item}
              <br />
            </span>
          ))}
        </div>
      );
    }
    return null;
  };

  const shouldShowTooltip = (text?: string, limit = 12) => {
    if (!text) return false;
    return text.length > limit;
  };

  const columns: TableProps<WordList>["columns"] = [
    {
      width: 80,
      title: "序号",
      dataIndex: "key",
      key: "key",
      align: "center",
      render: (_text: number, _record: WordList, index: number) => {
        const serialNumber = (page - 1) * pageSize + index + 1;
        return <span className="font-medium">{serialNumber}</span>;
      },
    },
    {
      width: 180,
      title: "单词",
      dataIndex: "englishWord",
      key: "englishWord",
      // fixed: "left",
      render: (text: string) => (
        <a
          href={`https://www.baidu.com/s?wd=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {text}
        </a>
      ),
    },
    // ... 音标列
    {
      width: 150,
      title: "音标",
      dataIndex: "englishPhonetic",
      key: "englishPhonetic",
      render: (text: string) => <span className="text-gray-500 italic">{text || "-"}</span>,
    },
    {
      width: 200,
      title: "词性",
      dataIndex: "englishPartSpeech",
      key: "englishPartSpeech",
      align: "left",
      render: (partSpeechList?: number[]) => {
        if (!partSpeechList || partSpeechList.length === 0) {
          return <span className="text-gray-300">-</span>;
        }

        const displayList = partSpeechList.slice(0, 3);
        const remainingCount = partSpeechList.length - 3;

        const allTags = partSpeechList.map((ps) => PART_SPEECH_MAP[ps]?.label || "未知").join("、");

        return (
          <Tooltip title={partSpeechList.length > 3 ? allTags : undefined}>
            <Space size={2} wrap className="max-w-full">
              {displayList.map((ps) => {
                const info = PART_SPEECH_MAP[ps];
                return (
                  <Tag key={ps} color={info?.color || "default"} className="m-0 text-xs">
                    {info?.label || "未知"}
                  </Tag>
                );
              })}
              {remainingCount > 0 && (
                <Tag color="default" className="m-0 text-xs">
                  +{remainingCount}
                </Tag>
              )}
            </Space>
          </Tooltip>
        );
      },
    },
    {
      width: 200,
      title: "中文释义",
      dataIndex: "englishChinese",
      key: "englishChinese",
      ellipsis: true,
      render: (englishChinese: string) =>
        (() => {
          const paragraph = (
            <Paragraph className="mb-0 max-w-[180px]" ellipsis={{ rows: 2, tooltip: false }}>
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
          return <Image src={value} width={40} height={40} className="rounded object-cover" />;
        } else {
          return <span className="text-gray-300">-</span>;
        }
      },
    },
    {
      width: 100,
      title: "类型",
      dataIndex: "englishType",
      key: "englishType",
      align: "center",
      render: (level: number) => {
        const type = WORD_TYPE_MAP[level];
        return <Tag color={type?.color}>{type?.label}</Tag>;
      },
    },
    {
      width: 120,
      title: "笔记",
      dataIndex: "englishNote",
      key: "englishNote",
      align: "center",
      render: (text: string) => {
        if (text) {
          return (
            <Popover content={formatNote(text)} title="笔记内容" trigger="hover">
              <Button type="link" size="small">
                查看笔记
              </Button>
            </Popover>
          );
        } else {
          return <span className="text-gray-300">无</span>;
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
        const info = LEVEL_MAP[level] || LEVEL_MAP[0];
        const color = TagColor[level] || info.color;
        return <Tag color={color}>{info.label}</Tag>;
      },
    },
    {
      width: 200,
      title: "引用",
      dataIndex: "englishReference",
      key: "englishReference",
      ellipsis: true,
      render: (text: string) => {
        // 检查是否是 URL
        const isUrl = text && (text.startsWith("http://") || text.startsWith("https://"));

        return (
          <Tooltip title={text} placement="topLeft">
            {isUrl ? (
              <a
                href={text}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
                onClick={(e) => e.stopPropagation()}
              >
                {text}
              </a>
            ) : (
              <span className="text-gray-500">{text || "-"}</span>
            )}
          </Tooltip>
        );
      },
    },
    {
      width: 180,
      title: "创建时间",
      dataIndex: "englishCreateTime",
      key: "englishCreateTime",
      render: (utcTime: string) => {
        return <span className="text-gray-500 text-[13px]">{formatUtcTime(utcTime)}</span>;
      },
    },
    {
      width: 180,
      title: "更新时间",
      dataIndex: "englishUpdateTime",
      key: "englishUpdateTime",
      render: (utcTime: string) => {
        return <span className="text-gray-500 text-[13px]">{formatUtcTime(utcTime)}</span>;
      },
    },
    {
      width: 150,
      title: "操作",
      key: "action",
      fixed: "right",
      align: "center",
      render: (_text: number, record: WordList) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleEdit(record)}
            icon={<EditFilled />}
            className="px-2"
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            onClick={() => handleDelete(record.id)}
            icon={<DeleteFilled />}
            className="px-2"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return {
    columns,
  };
};
