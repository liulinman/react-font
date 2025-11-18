import { WordList } from "@/server/word/word.type";
import { Button, Popover, Space, TableProps, Tag, Tooltip, Image } from "antd";
import moment from "moment";
import { TagColor } from "./types";
import { DeleteFilled, EditFilled } from "@ant-design/icons";

type Props = {
  handleEdit: (record: WordList) => void;
  handleDelete: (id: number) => void;
};

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

  const columns: TableProps<WordList>["columns"] = [
    {
      width: 80,
      title: "序号",
      dataIndex: "key",
      key: "key",
      render: (_text: number, _record: WordList, index: number) => {
        return index + 1;
      },
      fixed: "left",
    },
    {
      width: 300,
      title: "单词名",
      dataIndex: "englishWord",
      key: "englishWord",
      fixed: "left",
    },
    {
      width: 150,
      title: "音标",
      dataIndex: "englishPhonetic",
      key: "englishPhonetic",
    },
    {
      width: 200,
      title: "中文",
      dataIndex: "englishChinese",
      key: "englishChinese",
      ellipsis: true,
      render: (englishChinese: string) => (
        <Tooltip placement="topLeft" title={formatNote(englishChinese)}>
          {englishChinese}
        </Tooltip>
      ),
    },
    {
      width: 100,
      title: "图片",
      dataIndex: "englishImg",
      key: "englishImg",
      align: "center",
      render: (value?: string) => {
        if (value) {
          return <Image src={value} width={30} height={30} />;
        } else {
          return null;
        }
      },
    },
    {
      width: 100,
      title: "类型",
      dataIndex: "englishType",
      key: "englishType",
      render: (level: number) => {
        const levels = ["单词", "短语", "句子"];
        return levels[level];
      },
    },
    {
      width: 150,
      title: "笔记",
      dataIndex: "englishNote",
      key: "englishNote",
      render: (text: string) => {
        if (text) {
          return (
            <Popover content={formatNote(text)} title="笔记内容">
              <Button type="link">查看笔记</Button>
            </Popover>
          );
        } else {
          return <Button type="text">无笔记</Button>;
        }
      },
    },
    {
      width: 100,
      title: "掌握程度",
      dataIndex: "englishLevel",
      key: "englishLevel",
      render: (level: string) => {
        const levels = ["不会", "一般", "熟练", "精通"];
        const color = TagColor[level as keyof typeof TagColor];

        return <Tag color={color}>{levels[Number(level)]}</Tag>;
      },
    },
    {
      width: 200,
      title: "引用",
      dataIndex: "englishReference",
      key: "englishReference",
    },
    {
      title: "新增时间",
      dataIndex: "englishCreateTime",
      key: "englishCreateTime",
      render: (utcTime: string) => {
        return (
          <span>{moment(utcTime).local().format("YYYY-MM-DD HH:mm:ss")}</span>
        );
      },
    },
    {
      title: "修改时间",
      dataIndex: "englishUpdateTime",
      key: "englishUpdateTime",
      render: (utcTime: string) => {
        return (
          <span>{moment(utcTime).local().format("YYYY-MM-DD HH:mm:ss")}</span>
        );
      },
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      render: (_text: number, record: WordList) => (
        <Space size="small">
          <Button
            variant="text"
            color="primary"
            size="small"
            onClick={() => handleEdit(record)}
            icon={<EditFilled />}
          >
            编辑
          </Button>
          <Button
            color="danger"
            variant="text"
            size="small"
            onClick={() => handleDelete(record.id)}
            icon={<DeleteFilled />}
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
