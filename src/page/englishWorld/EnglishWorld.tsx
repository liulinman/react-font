import React, { useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Modal,
} from "antd";
import type { TableProps } from "antd";
const { RangePicker } = DatePicker;

interface DataType {
  key: string;
  word: string; // 单词名
  phonetic: string; // 音标
  chinese: string; // 中文
  type: string;
  note: string; // 笔记
  level: number; // 掌握程度
  reference: string; // 引用
  createTime: string; // 新增时间
  updateTime: string; // 修改时间
}

const initialData: DataType[] = [
  {
    key: "1",
    word: "Hello",
    type: "单词",
    phonetic: "/həˈləʊ/",
    chinese: "你好",
    note: "常用问候语",
    level: 2,
    reference: "日常对话",
    createTime: "2022-01-01",
    updateTime: "2023-01-01",
  },
  {
    key: "2",
    word: "World",
    phonetic: "/wɜːld/",
    type: "单词",
    chinese: "世界",
    note: "常用词汇",
    level: 1,
    reference: "日常对话",
    createTime: "2022-01-01",
    updateTime: "2023-02-01",
  },
  {
    key: "3",
    word: "Computer",
    type: "单词",
    phonetic: "/kəmˈpjuːtə/",
    chinese: "计算机",
    note: "技术词汇",
    level: 3,
    reference: "专业学习",
    createTime: "2022-02-01",
    updateTime: "2023-03-01",
  },
];

const EnglishWorld: React.FC = () => {
  const [form] = Form.useForm();
  const [filteredData, setFilteredData] = useState(initialData);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const columns: TableProps<DataType>["columns"] = [
    {
      title: "序号",
      dataIndex: "key",
      key: "key",
    },
    {
      title: "单词名",
      dataIndex: "word",
      key: "word",
    },
    {
      title: "音标",
      dataIndex: "phonetic",
      key: "phonetic",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
    },

    {
      title: "中文",
      dataIndex: "chinese",
      key: "chinese",
    },

    {
      title: "笔记",
      dataIndex: "note",
      key: "note",
    },
    {
      title: "掌握程度",
      dataIndex: "level",
      key: "level",
      render: (level: number) => {
        const levels = ["不会", "一般", "熟练", "精通"];
        return levels[level];
      },
    },
    {
      title: "引用",
      dataIndex: "reference",
      key: "reference",
    },
    {
      title: "新增时间",
      dataIndex: "createTime",
      key: "createTime",
    },
    {
      title: "修改时间",
      dataIndex: "updateTime",
      key: "updateTime",
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            color="danger"
            variant="solid"
            size="small"
            onClick={() => handleDelete(record.key)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 查询数据
  const handleSearch = () => {
    const values = form.getFieldsValue();
    const { layout, layouta, level } = values;
    const filtered = initialData.filter((item) => {
      const matchDate = layouta
        ? new Date(item.createTime) >= layouta[0]?.toDate() &&
          new Date(item.createTime) <= layouta[1]?.toDate()
        : true;
      const matchWord = layout
        ? item.word.includes(layout) || item.chinese.includes(layout)
        : true;
      const matchLevel = level != null ? item.level === level : true;

      return matchDate && matchWord && matchLevel;
    });
    setFilteredData(filtered);
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    setFilteredData(initialData);
  };

  // 删除操作
  const handleDelete = (key: string) => {
    setFilteredData(filteredData.filter((item) => item.key !== key));
  };

  // 编辑操作
  const handleEdit = (record: DataType) => {
    console.log(`===`, record);
    setIsModalVisible(true);
  };

  // 提交编辑
  const handleModalOk = () => {
    setIsModalVisible(false);
    // 更新数据（可以在这里加入更新逻辑）
  };

  // 关闭编辑模态框
  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* 查询条件：时间范围 1、中文名 2、英文名 3 掌握程度 */}
      <Space style={{ marginBottom: 30, marginTop: 30 }}>
        <Form layout={"inline"} form={form} style={{ maxWidth: "none" }}>
          <Form.Item label="时间范围" name="layouta">
            <RangePicker allowClear />
          </Form.Item>
          <Form.Item label="中文名" name="layout">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item label="英文名">
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item label="掌握程度">
            <Select
              placeholder="请选择"
              allowClear
              style={{
                width: 200,
              }}
              options={[
                { label: "不会", value: 0 },
                { label: "一般", value: 1 },
                { label: "熟练", value: 2 },
                { label: "精通", value: 3 },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                查询
              </Button>
              <Button htmlType="reset" onClick={handleReset}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
      <div>
        <Space size="small" style={{ marginTop: 10, marginBottom: 10 }}>
          <Button type="primary" size="middle">
            新增
          </Button>
        </Space>
      </div>
      <Table<DataType>
        columns={columns}
        dataSource={filteredData}
        rowKey="key"
        scroll={{ x: "max-content" }}
        bordered
      />

      {/* 编辑模态框 */}
      <Modal
        title="编辑单词"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        {/* 这里可以放编辑表单，预填充 currentRecord 的数据 */}
        <Form layout="vertical">
          <Form.Item label="单词名" name="word">
            <Input />
          </Form.Item>
          <Form.Item label="音标" name="phonetic">
            <Input />
          </Form.Item>
          <Form.Item label="中文" name="chinese">
            <Input />
          </Form.Item>
          <Form.Item label="笔记" name="note">
            <Input />
          </Form.Item>
          <Form.Item label="掌握程度" name="level">
            <Select>
              <Select.Option value={0}>不会</Select.Option>
              <Select.Option value={1}>一般</Select.Option>
              <Select.Option value={2}>熟练</Select.Option>
              <Select.Option value={3}>精通</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnglishWorld;
