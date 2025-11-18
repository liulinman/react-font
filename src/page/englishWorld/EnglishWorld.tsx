import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
} from "antd";
import { EditAddModal } from "./component/EditAddModal";
import request, { useMutation } from "@/utils/axios/axios";
import {
  wordAdd,
  wordDel,
  wordExist,
  wordFilter,
  wordUpdate,
} from "@/server/word/word";
import { WordList } from "@/server/word/word.type";
import { convertToFormat } from "@/utils";
import { useColumns } from "./useColumns";
import { EnglishHeader } from "./component/EnglishHeader";
import { FormFieldGroup } from "./component/FormFieldGroup";
import { DownOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
const { RangePicker } = DatePicker;

type ListData = {
  list: WordList[];
  total: number;
  totalPages: number; // 计算总页数ag
};

const EnglishWorld: React.FC = () => {
  const [form] = Form.useForm();
  const [type, setType] = useState<"edit" | "add">("add");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [wordRecord, setWordRecord] = useState<WordList>();
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalNum, setTotalNum] = useState<number>(0);
  const { mutateAsync: mutateWordAdd, isPending: buttonPending } =
    useMutation(wordAdd);
  const [activeNav, setActiveNav] = useState("list");

  const filterFields = [
    {
      key: "time",
      node: (
        <Form.Item label="时间范围" name="time">
          <RangePicker allowClear placeholder={["开始时间", "结束时间"]} />
        </Form.Item>
      ),
    },
    {
      key: "englishChinese",
      node: (
        <Form.Item label="中文名" name="englishChinese">
          <Input placeholder="请输入中文名" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishWord",
      node: (
        <Form.Item label="英文名" name="englishWord">
          <Input placeholder="请输入英文名" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishPhonetic",
      node: (
        <Form.Item label="音标" name="englishPhonetic">
          <Input placeholder="请输入音标" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishType",
      node: (
        <Form.Item label="类型" name="englishType">
          <Select
            placeholder="请选择类型"
            allowClear
            options={[
              { label: "单词", value: "0" },
              { label: "短语", value: "1" },
              { label: "句子", value: "2" },
            ]}
          />
        </Form.Item>
      ),
    },
    {
      key: "englishLevel",
      node: (
        <Form.Item label="掌握程度" name="englishLevel">
          <Select
            placeholder="请选择掌握程度"
            allowClear
            options={[
              { label: "不会", value: "0" },
              { label: "一般", value: "1" },
              { label: "熟练", value: "2" },
              { label: "精通", value: "3" },
            ]}
          />
        </Form.Item>
      ),
    },
  ];

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
          await handleSearch();
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

  const { columns } = useColumns({
    handleEdit,
    handleDelete,
  });

  const initialWordData = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      const res = await request<{
        code: number;
        data: ListData;
        message: string;
      }>(wordFilter({ page, pageSize }));
      if (res.code === 200) {
        setWordList(res.data.list);
        setTotalNum(res.data.total);
      } else {
        message.error(`失败`);
        setWordList([]);
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    initialWordData(page, pageSize);
  }, [initialWordData, page, pageSize]);

  // 查询数据
  const handleSearch = async () => {
    const values = form.getFieldsValue();
    const { time } = values;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newValues: any = {};

    if (time) {
      // 将时间转换为UTC后，再转换为本地时间并格式化为YYYY-MM-DD HH:mm:ss
      newValues.startTime = convertToFormat(time[0], "start");
      newValues.endTime = convertToFormat(time[1], "end");
      delete values.time;
    }
    if (time === null || time === undefined) {
      delete values.time;
    }
    setLoading(true);
    const res = await request<{ code: number; data: ListData }>(
      wordFilter({ ...values, ...newValues, page: 1, pageSize })
    );

    if (res.code === 200) {
      setWordList(res.data.list);
      setTotalNum(res.data.total);
    }
    setLoading(false);
  };

  // 重置表单
  const handleReset = () => {
    form.resetFields();
    initialWordData(1, 10);
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
        await handleSearch();
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
        const res = await mutateWordAdd(values);
        if (res.code === 200 && res.data) {
          message.success("添加成功");
          setIsModalVisible(false);
          await handleSearch();
        } else {
          message.error(res.message || "添加失败");
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

  const handlePageChange = (page: number, pageSize: number) => {
    setPage(page); // 设置当前页码
    setPageSize(pageSize); // 设置每页显示条数
  };

  return (
    <div>
      <EnglishHeader activeKey={activeNav} onNavClick={setActiveNav} />
      <div
        style={{
          paddingLeft: "20px",
          paddingRight: "20px",
          width: "100%",
          marginTop: "90px", // 预留空间，避免被固定头部遮挡
        }}
      >
        {/* 查询条件：时间范围 1、中文名 2、英文名 3 掌握程度 */}

        <Form
          form={form}
          style={{ maxWidth: "none", width: "100%", marginTop: "10px" }}
        >
          <FormFieldGroup
            items={filterFields}
            columnsPerRow={4}
            collapsedRows={1}
            renderActions={({ toggle, expanded, shouldShowToggle }) => (
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  查询
                </Button>
                <Button htmlType="reset" onClick={handleReset}>
                  重置
                </Button>
                {shouldShowToggle && (
                  <Button type="link" onClick={toggle}>
                    {expanded ? (
                      <span className="gap-2">
                        <span>收起查询</span>
                        <UpOutlined />
                      </span>
                    ) : (
                      <span className="gap-2">
                        <span>展开查询</span>
                        <DownOutlined />
                      </span>
                    )}
                  </Button>
                )}
              </Space>
            )}
          />
        </Form>
        <div>
          <Space size="small" style={{ marginTop: 10, marginBottom: 10 }}>
            <Button
              type="primary"
              onClick={handleAdd}
              size="middle"
              loading={buttonPending}
              icon={<PlusOutlined />}
            >
              新增
            </Button>
          </Space>
        </div>
        <Table<WordList>
          bordered={false}
          size="small"
          loading={loading}
          columns={columns}
          dataSource={wordList}
          rowKey="id"
          scroll={{ x: "max-content", y: "calc(100vh - 350px)" }} // 使用 100vh 减去其他元素高度
          pagination={{
            total: totalNum, // 设置总数
            pageSizeOptions: ["10", "20", "50", "100", "200", "500"],
            showSizeChanger: true,
            showTotal: (total: number) => `数量: ${total} `, // 展示总数
            pageSize: pageSize, // 每页显示的数量
            onChange: handlePageChange,
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
    </div>
  );
};

export default EnglishWorld;
