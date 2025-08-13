import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popover,
  Select,
  Space,
  Table,
} from "antd";
import type { TableProps } from "antd";
import { EditAddModal } from "./component/EditAddModal";
import request from "@/utils/axios/axios";
import {
  wordAdd,
  wordDel,
  wordExist,
  wordFilter,
  wordFindList,
  wordUpdate,
} from "@/server/word/word";
import { WordList } from "@/server/word/word.type";
import moment from "moment";
const { RangePicker } = DatePicker;

const EnglishWorld: React.FC = () => {
  const [form] = Form.useForm();
  const [type, setType] = useState<"edit" | "add">("add");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [wordRecord, setWordRecord] = useState<WordList>();
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const initialWordData = useCallback(async () => {
    setLoading(true);
    const res = await request<{
      code: number;
      data: WordList[];
      message: string;
    }>(wordFindList());
    if (res.code === 200) {
      setWordList(res.data);
    } else {
      message.error(`失败`);
      setWordList([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    initialWordData();
  }, [initialWordData]);

  // 将换行符转换为 HTML 的 <br /> 标签
  const formatNote = (text: string) => {
    return text.split("\n").map((item, index) => (
      <span key={index}>
        {item}
        <br />
      </span>
    ));
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
    },
    {
      width: 300,
      title: "单词名",
      dataIndex: "englishWord",
      key: "englishWord",
      // render: (text: string, record: WordList) => {
      //   const { englishType } = record;
      //   if (englishType === "2") {
      //     return (
      //       <Popover content={formatNote(text)} title="句子">
      //         <Button type="link">查看句子</Button>
      //       </Popover>
      //     );
      //   } else {
      //     return <span>{text}</span>;
      //   }
      // },
    },
    {
      width: 150,
      title: "音标",
      dataIndex: "englishPhonetic",
      key: "englishPhonetic",
    },
    {
      width: 100,
      title: "图片",
      dataIndex: "englishImg",
      key: "englishImg",
    },
    {
      width: 150,
      title: "中文",
      dataIndex: "englishChinese",
      key: "englishChinese",
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
      render: (level: number) => {
        const levels = ["不会", "一般", "熟练", "精通"];
        return levels[level];
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
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 查询数据
  const handleSearch = async () => {
    const values = form.getFieldsValue();
    const { time } = values;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newValues: any = {};
    if (time) {
      // 将时间转换为UTC后，再转换为本地时间并格式化为YYYY-MM-DD HH:mm:ss
      newValues.startTime = moment(time[0]).format("YYYY-MM-DD HH:mm:ss");
      newValues.endTime = moment(time[1]).format("YYYY-MM-DD HH:mm:ss");
    }
    setLoading(true);
    const res = await request<{ code: number; data: WordList[] }>(
      wordFilter({ ...values, ...newValues })
    );

    if (res.code === 200) {
      setWordList(res.data);
      message.success("查询成功");
    }
    setLoading(false);
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
  };

  // 删除操作
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "确认删除",
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        const res = await request<{ code: number; data: boolean }>(
          wordDel({ id })
        );
        if (res.data) {
          message.success("删除成功");
          await initialWordData();
        } else {
          message.error("删除失败");
        }
      },
    });
  };

  // 编辑操作
  const handleEdit = (record: WordList) => {
    setWordRecord(record);
    handleType("edit");
    setIsModalVisible(true);
  };

  // 提交编辑
  const handleModalOk = async (values: WordList, type: "edit" | "add") => {
    if (type === "edit") {
      // 开始真正的更新操作
      const res = await request<{
        code: number;
        data: boolean;
        message: string;
      }>(wordUpdate(values));
      if (res.data) {
        message.success("更新成功");
        setIsModalVisible(false);
        await initialWordData();
      } else {
        message.error(res.message);
      }
    }

    if (type === "add") {
      const { englishWord } = values;

      const res = await request<{ code: number; data: boolean }>(
        wordExist({ englishWord })
      );

      if (res.data) {
        Modal.info({
          title: "添加失败",
          content: "单词已经存在！",
        });
        return;
      } else {
        // 开始真正的插入操作
        const res = await request<{ code: number; data: boolean }>(
          wordAdd(values)
        );
        if (res.data) {
          message.success("添加成功");
          setIsModalVisible(false);
          await initialWordData();
        } else {
          message.error("添加失败");
        }
      }
    }
  };

  // 关闭编辑模态框
  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleAdd = () => {
    handleType("add");
    setIsModalVisible(true);
  };

  const handleType = (type: "add" | "edit") => {
    setType(type);
  };

  return (
    <div style={{ paddingLeft: "20px", paddingRight: "20px" }}>
      {/* 查询条件：时间范围 1、中文名 2、英文名 3 掌握程度 */}
      <Space style={{ marginTop: 10 }}>
        <Form layout={"inline"} form={form} style={{ maxWidth: "none" }}>
          <Form.Item
            label="时间范围"
            name="time"
            style={{ marginBottom: "16px" }}
          >
            <RangePicker allowClear />
          </Form.Item>
          <Form.Item
            label="中文名"
            name="englishChinese"
            style={{ marginBottom: "16px" }}
          >
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item
            label="英文名"
            name="englishWord"
            style={{ marginBottom: "16px" }}
          >
            <Input placeholder="请输入" allowClear />
          </Form.Item>
          <Form.Item
            label="类型"
            name="englishType"
            style={{ marginBottom: "16px" }}
          >
            <Select
              placeholder="请选择"
              allowClear
              style={{
                width: 200,
              }}
              options={[
                { label: "单词", value: "0" },
                { label: "短语", value: "1" },
                { label: "句子", value: "2" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="掌握程度"
            name="englishLevel"
            style={{ marginBottom: "16px" }}
          >
            <Select
              placeholder="请选择"
              allowClear
              style={{
                width: 200,
              }}
              options={[
                { label: "不会", value: "0" },
                { label: "一般", value: "1" },
                { label: "熟练", value: "2" },
                { label: "精通", value: "3" },
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
          <Button type="primary" onClick={handleAdd} size="middle">
            新增
          </Button>
        </Space>
      </div>
      <Table<WordList>
        size="small"
        loading={loading}
        columns={columns}
        dataSource={wordList}
        rowKey="id"
        scroll={{ x: "max-content" }}
        bordered
        pagination={{
          total: wordList.length, // 设置总数
          // pageSizeOptions: ["10", "20", "50", "100", "200", "500"],
          // showSizeChanger: true,
          showTotal: (total: number) => `数量: ${total} `, // 展示总数
          pageSize: 10, // 每页显示的数量
        }}
      />
      {/* 编辑模态框 */}
      <EditAddModal
        isModalVisible={isModalVisible}
        currentRecord={wordRecord}
        type={type}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      />
    </div>
  );
};

export default EnglishWorld;
