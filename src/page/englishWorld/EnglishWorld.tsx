import React from "react";

import { Space, Table } from "antd";
import type { TableProps } from "antd";

interface DataType {
  key: string;
  name: string;
  age: number;
  address: string;
  tags: string[];
}
/**
 *
 * 1 id
 * 2 单词名
 * 3 音标
 * 4 中文
 * 5 笔记
 * 6 掌握程度（不会、一般、熟练、精通）
 * 7 引用
 * 8 操作：删除、编辑
 *
 * 把这些数据发给
 *
 */

const columns: TableProps<DataType>["columns"] = [
  {
    title: "序号",
    dataIndex: "name",
    key: "name",
    render: (text) => <a>{text}</a>,
  },
  {
    title: "单词名",
    dataIndex: "age",
    key: "age",
  },
  {
    title: "音标",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "中文",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "笔记",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "掌握程度",
    dataIndex: "address",
    key: "address",
  },
  {
    title: "引用",
    dataIndex: "address",
    key: "address",
  },

  {
    title: "操作",
    key: "action",
    render: (_, record) => (
      <Space size="middle">
        <a>Invite {record.name}</a>
        <a>Delete</a>
      </Space>
    ),
  },
];

const data: DataType[] = [
  {
    key: "1",
    name: "John Brown",
    age: 32,
    address: "New York No. 1 Lake Park",
    tags: ["nice", "developer"],
  },
  {
    key: "2",
    name: "Jim Green",
    age: 42,
    address: "London No. 1 Lake Park",
    tags: ["loser"],
  },
  {
    key: "3",
    name: "Joe Black",
    age: 32,
    address: "Sydney No. 1 Lake Park",
    tags: ["cool", "teacher"],
  },
];
const EnglishWorld: React.FC = () => {
  return (
    <div>
      <Table<DataType> columns={columns} dataSource={data} />
    </div>
  );
};

export default EnglishWorld;
