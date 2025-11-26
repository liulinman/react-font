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

type Props = {
  handleEdit: (record: WordList) => void;
  handleDelete: (id: number) => void;
};

const { Paragraph } = Typography;

export const useColumns = (props: Props) => {
  const { handleEdit, handleDelete } = props;

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
      width: 80,
      title: "序号",
      dataIndex: "key",
      key: "key",
      align: "center",
      render: (_text: number, _record: WordList, index: number) => {
        return <span style={{ fontWeight: 500 }}>{index + 1}</span>;
      },
      // fixed: "left",
    },
    {
      width: 180,
      title: "单词",
      dataIndex: "englishWord",
      key: "englishWord",
      // fixed: "left",
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>{text}</span>
      ),
    },
    {
      width: 150,
      title: "音标",
      dataIndex: "englishPhonetic",
      key: "englishPhonetic",
      render: (text: string) => (
        <span style={{ color: "#666", fontStyle: "italic" }}>
          {text || "-"}
        </span>
      ),
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
          return <span style={{ color: "#ccc" }}>-</span>;
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
      width: 120,
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
          return <span style={{ color: "#ccc" }}>无</span>;
        }
      },
    },
    {
      width: 110,
      title: "掌握程度",
      dataIndex: "englishLevel",
      key: "englishLevel",
      align: "center",
      render: (level: string) => {
        const levels = [
          { label: "不会", color: "red" },
          { label: "一般", color: "orange" },
          { label: "熟练", color: "blue" },
          { label: "精通", color: "green" },
        ];
        const currentLevel = levels[Number(level)];
        const color = TagColor[level as keyof typeof TagColor];

        return (
          <Tag color={color || currentLevel.color}>{currentLevel.label}</Tag>
        );
      },
    },
    {
      width: 200,
      title: "引用",
      dataIndex: "englishReference",
      key: "englishReference",
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ color: "#666" }}>{text || "-"}</span>
        </Tooltip>
      ),
    },
    {
      width: 180,
      title: "创建时间",
      dataIndex: "englishCreateTime",
      key: "englishCreateTime",
      render: (utcTime: string) => {
        return (
          <span style={{ color: "#666", fontSize: "13px" }}>
            {moment(utcTime).local().format("YYYY-MM-DD HH:mm:ss")}
          </span>
        );
      },
    },
    {
      width: 180,
      title: "更新时间",
      dataIndex: "englishUpdateTime",
      key: "englishUpdateTime",
      render: (utcTime: string) => {
        return (
          <span style={{ color: "#666", fontSize: "13px" }}>
            {moment(utcTime).local().format("YYYY-MM-DD HH:mm:ss")}
          </span>
        );
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
            style={{ padding: "0 8px" }}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            onClick={() => handleDelete(record.id)}
            icon={<DeleteFilled />}
            style={{ padding: "0 8px" }}
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
