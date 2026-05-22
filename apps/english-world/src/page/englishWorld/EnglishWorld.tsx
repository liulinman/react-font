import React, { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Table,
  Tabs,
} from "antd";
import { EditAddModal } from "./component/EditAddModal";
import request, { useMutation } from "@font/api";
import { wordAdd, wordDel, wordExist, wordUpdate } from "@/server/word/word";
import { WordList } from "@/server/word/word.type";
import { useColumns } from "./useColumns";
import { EnglishHeader } from "./component/EnglishHeader";
import { WordAgentTab } from "./component/WordAgentTab";
import { ExerciseAgentTab } from "./component/ExerciseAgentTab";
import { FormFieldGroup } from "./component/FormFieldGroup";
import { EnglishStats } from "./component/EnglishStats";
import { DownOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useWordList } from "./hooks/useWordList";
import { normalizeDesktopWordFilters } from "./utils/wordFilters";
import "./EnglishWorld.css";
const { RangePicker } = DatePicker;

const HASH_TO_NAV: Record<string, string> = {
  list: "list",
  "ai-tool": "aiTool",
  aitool: "aiTool",
  stat: "stat",
};

function getNavFromHash(hash: string): string {
  const key = hash.replace(/^#\/?/, "").toLowerCase().trim();
  return HASH_TO_NAV[key] ?? "list";
}

const EnglishWorld: React.FC = () => {
  const [form] = Form.useForm();
  const [type, setType] = useState<"edit" | "add">("add");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [wordRecord, setWordRecord] = useState<WordList>();
  const { mutateAsync: mutateWordAdd, isPending: buttonPending } =
    useMutation(wordAdd);
  const location = useLocation();
  const navigate = useNavigate();
  const activeNav = getNavFromHash(location.hash || "");
  const {
    wordList,
    loading,
    page,
    pageSize,
    totalNum,
    getCurrentFilters,
    search,
    reset,
    refresh,
    changePage,
  } = useWordList(10);

  // 进入页面无 hash 时写入 #list，保证刷新后仍在当前 tab
  useEffect(() => {
    if (location.pathname === "/englishWorld" && !location.hash) {
      navigate({ pathname: "/englishWorld", hash: "list" }, { replace: true });
    }
  }, [location.pathname, location.hash, navigate]);

  const handleNavClick = () => {
    // 实际跳转已在 EnglishHeader 中通过 navigate + hash 处理
  };

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
          await refresh();
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

  // 查询数据
  const handleSearch = async () => {
    await search(normalizeDesktopWordFilters(form.getFieldsValue()));
  };

  // 重置表单
  const handleReset = async () => {
    form.resetFields();
    await reset();
  };

  // 提交编辑
  const handleModalOk = async (values: WordList, type: "edit" | "add") => {
    if (type === "edit") {
      // 开始真正的更新操作
      const res = await request<boolean>(wordUpdate(values));
      if (res) {
        message.success("更新成功");
        setIsModalVisible(false);
        await refresh();
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
          await search(getCurrentFilters());
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
    changePage(page, pageSize);
  };

  return (
    <div className="english-world-shell">
      <EnglishHeader activeKey={activeNav} onNavClick={handleNavClick} />
      <main className="english-world-main">
        {activeNav === "aiTool" ? (
          <Tabs
            defaultActiveKey="word"
            size="large"
            items={[
              { key: "word", label: "AI 单词查询", children: <WordAgentTab /> },
              {
                key: "exercise",
                label: "阅读 + 选择题练习",
                children: <ExerciseAgentTab />,
              },
            ]}
          />
        ) : activeNav === "stat" ? (
          <EnglishStats />
        ) : (
          <div className="english-world-stack">
            <section className="english-world-filter-panel">
              <Form
                form={form}
                className="english-world-filter-form"
                layout="horizontal"
                colon={false} // 去掉冒号，更简洁
              >
                <FormFieldGroup
                  items={filterFields}
                  columnsPerRow={4}
                  collapsedRows={1}
                  renderActions={({ toggle, expanded, shouldShowToggle }) => (
                    <div className="english-world-filter-actions">
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
                    </div>
                  )}
                />
              </Form>
            </section>

            <section className="english-world-table-panel">
              <div className="english-world-table-toolbar">
                <div className="english-world-table-title">
                  <strong>单词列表</strong>
                  <span>共 {totalNum} 条，当前第 {page} 页</span>
                </div>
                <Button
                  type="primary"
                  onClick={handleAdd}
                  size="middle"
                  loading={buttonPending}
                  icon={<PlusOutlined />}
                >
                  新增
                </Button>
              </div>

              <div className="english-world-table-wrap">
                <Table<WordList>
                  bordered={false}
                  size="middle"
                  loading={loading}
                  columns={columns}
                  dataSource={wordList}
                  rowKey="id"
                  scroll={{ x: 1360, y: "calc(100vh - 360px)" }}
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
            </section>
            {/* 编辑模态框 */}
            <EditAddModal
              isModalVisible={isModalVisible}
              currentRecord={wordRecord}
              type={type}
              onOk={handleModalOk}
              onCancel={handleModalCancel}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default EnglishWorld;
