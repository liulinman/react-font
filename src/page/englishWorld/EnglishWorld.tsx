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
import { EnglishStats } from "./component/EnglishStats";
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
              { label: "单词", value: 0 },
              { label: "短语", value: 1 },
              { label: "句子", value: 2 },
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
              { label: "不会", value: 0 },
              { label: "一般", value: 1 },
              { label: "熟练", value: 2 },
              { label: "精通", value: 3 },
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
        const res = await request<boolean>(wordDel({ id }));
        if (res) {
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
    page,
    pageSize,
  });

  const initialWordData = useCallback(
    async (page: number, pageSize: number) => {
      setLoading(true);
      try {
        const res = await request<ListData>(wordFilter({ page, pageSize }));
        setWordList(res.list);
        setTotalNum(res.total);
      } catch (error) {
        console.error("加载数据失败:", error);
        setWordList([]);
        setTotalNum(0);
      } finally {
        setLoading(false);
      }
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
    try {
      const res = await request<ListData>(
        wordFilter({ ...values, ...newValues, page, pageSize })
      );
      setWordList(res.list);
      setTotalNum(res.total);
    } catch (error) {
      console.error("查询失败:", error);
      setWordList([]);
      setTotalNum(0);
    } finally {
      setLoading(false);
    }
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
      const res = await request<boolean>(wordUpdate(values));
      if (res) {
        message.success("更新成功");
        setIsModalVisible(false);
        await handleSearch();
      } else {
        message.error("更新失败");
      }
    }

    if (type === "add") {
      const { englishWord } = values;

      const res = await request<boolean>(wordExist({ englishWord }));

      if (res) {
        Modal.info({
          title: "添加失败",
          content: "单词已经存在！",
        });
        return;
      } else {
        // 开始真正的插入操作
        const res = await mutateWordAdd(values);
        if (res) {
          message.success("添加成功");
          setIsModalVisible(false);
          await handleSearch();
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

  const handlePageChange = (page: number, pageSize: number) => {
    setPage(page); // 设置当前页码
    setPageSize(pageSize); // 设置每页显示条数
  };

  return (
    <div style={{ background: "#f5f5f5", height: "100vh" }}>
      <EnglishHeader activeKey={activeNav} onNavClick={setActiveNav} />
      <div
        style={{
          padding: "20px",
          paddingTop: "90px", // 使用 paddingTop 代替 margin-top，90px(header) + 20px
          maxWidth: "2000px",
          margin: "0 auto", // 只保留左右居中
          width: "100%",
          height: "100vh", // 高度为 100vh
          overflow: "auto", // 改为 auto，允许内部滚动
          boxSizing: "border-box", // 确保 padding 包含在高度内
        }}
      >
        {activeNav === "stat" ? (
          <EnglishStats />
        ) : (
          <>
            {/* 查询条件 - 添加卡片样式 */}
            <div
              style={{
                background: "#fff",
                padding: "8px 20px", // 减小 padding
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                marginBottom: "8px",
              }}
            >
              <Form
                form={form}
                style={{ maxWidth: "none", width: "100%" }}
                layout="horizontal"
                colon={false} // 去掉冒号，更简洁
              >
                <FormFieldGroup
                  items={filterFields}
                  columnsPerRow={4}
                  collapsedRows={1}
                  renderActions={({ toggle, expanded, shouldShowToggle }) => (
                    <Space size="small">
                      {" "}
                      {/* 改为 small */}
                      <Button
                        type="primary"
                        onClick={handleSearch}
                        size="middle"
                      >
                        查询
                      </Button>
                      <Button
                        htmlType="reset"
                        onClick={handleReset}
                        size="middle"
                      >
                        重置
                      </Button>
                      {shouldShowToggle && (
                        <Button type="link" onClick={toggle} size="small">
                          {expanded ? (
                            <span className="gap-2">
                              <span>收起</span>
                              <UpOutlined />
                            </span>
                          ) : (
                            <span className="gap-2">
                              <span>展开</span>
                              <DownOutlined />
                            </span>
                          )}
                        </Button>
                      )}
                    </Space>
                  )}
                />
              </Form>
            </div>

            {/* 表格区域 - 添加卡片样式 */}
            <div
              style={{
                background: "#fff",
                padding: "20px",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                height: "calc(100vh - 90px - 40px - 120px - 32px)", // 动态计算：100vh - header - padding - 查询区域 - margins
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* 在表格上方添加操作按钮 */}
              <div style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  onClick={handleAdd}
                  size="small"
                  loading={buttonPending}
                  icon={<PlusOutlined />}
                >
                  新增
                </Button>

                <Button
                  type="primary"
                  onClick={handleAdd}
                  size="small"
                  loading={buttonPending}
                  icon={<PlusOutlined />}
                >
                  默写（中文写英文）
                </Button>
              </div>

              <Table<WordList>
                bordered={false}
                size="middle"
                loading={loading}
                columns={columns}
                dataSource={wordList}
                rowKey="id"
                scroll={{ x: 1400, y: "calc(100vh - 400px)" }}
                pagination={{
                  total: totalNum,
                  pageSizeOptions: ["10", "20", "50", "100", "200", "500"],
                  showSizeChanger: true,
                  showTotal: (total: number) => `共 ${total} 条数据`,
                  pageSize: pageSize,
                  onChange: handlePageChange,
                  showQuickJumper: true,
                }}
              />
            </div>
            {/* 编辑模态框 */}
            <EditAddModal
              isModalVisible={isModalVisible}
              currentRecord={wordRecord}
              type={type}
              onOk={handleModalOk}
              onCancel={handleModalCancel}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EnglishWorld;
