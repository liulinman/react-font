import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  DatePicker,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
} from "antd";
import { EditAddModal } from "./component/EditAddModal";
import request, { useMutation } from "@font/api";
import { wordAdd, wordDel, wordExist, wordFilter, wordUpdate } from "@/server/word/word";
import { WordList } from "@/server/word/word.type";
import { convertToFormat } from "@font/utils";
import {
  useColumns,
  CORE_COLUMN_KEYS,
  EXTRA_COLUMN_KEYS,
  ALL_COLUMN_LABELS,
  getRowClassName,
} from "./useColumns";
import { EnglishHeader } from "./component/EnglishHeader";
import { WordAgentTab } from "./component/WordAgentTab";
import { ExerciseAgentTab } from "./component/ExerciseAgentTab";
import { FormFieldGroup } from "./component/FormFieldGroup";
import { EnglishStats } from "./component/EnglishStats";
import { DownOutlined, PlusOutlined, SettingOutlined, UpOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
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
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set([...CORE_COLUMN_KEYS]),
  );
  const [tableSize, setTableSize] = useState<"small" | "middle">("middle");
  const filterParamsRef = useRef<Record<string, unknown>>({}); // 使用 ref 保存筛选条件，避免不必要的重新渲染
  const { mutateAsync: mutateWordAdd, isPending: buttonPending } = useMutation(wordAdd);
  const location = useLocation();
  const navigate = useNavigate();
  const activeNav = getNavFromHash(location.hash || "");

  // 进入页面无 hash 时写入 #list，保证刷新后仍在当前 tab
  useEffect(() => {
    if (location.pathname === "/englishWorld" && !location.hash) {
      navigate({ pathname: "/englishWorld", hash: "list" }, { replace: true });
    }
  }, [location.pathname, location.hash, navigate]);

  const handleNavClick = (_key: string) => {
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
          // 直接使用当前筛选条件和页码刷新列表
          await fetchWordData(page, pageSize, filterParamsRef.current);
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

  const { columns: allColumns } = useColumns({
    handleEdit,
    handleDelete,
    page,
    pageSize,
  });

  const columns = allColumns?.filter((col) => visibleColumns.has(col.key as string));

  const toggleColumn = (key: string, visible: boolean) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (visible) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const columnMenuItems = [...CORE_COLUMN_KEYS, ...EXTRA_COLUMN_KEYS].map((key) => ({
    key,
    label: (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={visibleColumns.has(key)}
          disabled={CORE_COLUMN_KEYS.includes(key)}
          onChange={(e) => toggleColumn(key, e.target.checked)}
        />
        <span>{ALL_COLUMN_LABELS[key] || key}</span>
      </label>
    ),
  }));

  // 统一的查询函数，使用保存的筛选条件
  const fetchWordData = useCallback(
    async (page: number, pageSize: number, filters: Record<string, unknown> = {}) => {
      setLoading(true);
      try {
        const queryParams = {
          page,
          pageSize,
          ...filters, // 使用传入的筛选条件
        };
        const res = await request<ListData>(wordFilter(queryParams));
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
    [],
  );

  useEffect(() => {
    fetchWordData(page, pageSize, filterParamsRef.current);
  }, [fetchWordData, page, pageSize]);

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

    // 合并筛选条件
    const filters = { ...values, ...newValues };
    // 移除空值
    Object.keys(filters).forEach((key) => {
      if (filters[key] === undefined || filters[key] === null || filters[key] === "") {
        delete filters[key];
      }
    });

    // 保存筛选条件到 ref（同步更新，确保后续分页能使用）
    filterParamsRef.current = filters;
    // 重置到第一页
    setPage(1);
    // 直接调用查询，确保立即生效（即使当前已经在第1页）
    await fetchWordData(1, pageSize, filters);
  };

  // 重置表单
  const handleReset = async () => {
    form.resetFields();
    filterParamsRef.current = {}; // 清除筛选条件
    setPage(1); // 重置到第一页
    setPageSize(10); // 重置每页条数
    // 直接调用查询，确保立即生效（即使当前已经在第1页且每页条数已经是10）
    await fetchWordData(1, 10, {});
  };

  // 提交编辑
  const handleModalOk = async (values: WordList, type: "edit" | "add") => {
    if (type === "edit") {
      // 开始真正的更新操作
      const res = await request<boolean>(wordUpdate(values));
      if (res) {
        message.success("更新成功");
        setIsModalVisible(false);
        // 直接使用当前筛选条件和页码刷新列表
        await fetchWordData(page, pageSize, filterParamsRef.current);
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
          // 添加后重置到第一页并刷新列表
          setPage(1);
          await fetchWordData(1, pageSize, filterParamsRef.current);
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
    <div className="h-screen overflow-hidden bg-gray-100">
      <EnglishHeader activeKey={activeNav} onNavClick={handleNavClick} />
      <div className="h-full overflow-auto pt-[90px]">
        <div className="p-5 max-w-[2000px] mx-auto">
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
            <>
              {/* 查询条件 */}
              <div className="bg-white py-2 px-5 rounded-lg shadow-sm mb-2">
                <Form form={form} layout="horizontal" colon={false} className="w-full">
                  <FormFieldGroup
                    items={filterFields}
                    columnsPerRow={4}
                    collapsedRows={1}
                    renderActions={({ toggle, expanded, shouldShowToggle }) => (
                      <Space size="small">
                        <Button type="primary" onClick={handleSearch} size="middle">
                          查询
                        </Button>
                        <Button htmlType="reset" onClick={handleReset} size="middle">
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

              {/* 表格区域 */}
              <div className="bg-white p-5 rounded-lg shadow-sm flex flex-col">
                <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                  <Button
                    type="primary"
                    onClick={handleAdd}
                    size="small"
                    loading={buttonPending}
                    icon={<PlusOutlined />}
                  >
                    新增
                  </Button>

                  <Space size="small">
                    <Dropdown menu={{ items: columnMenuItems }} trigger={["click"]}>
                      <Button size="small" icon={<SettingOutlined />}>
                        列设置
                      </Button>
                    </Dropdown>
                    <Segmented
                      size="small"
                      value={tableSize}
                      onChange={(val) => setTableSize(val as "small" | "middle")}
                      options={[
                        { label: "紧凑", value: "small" },
                        { label: "舒适", value: "middle" },
                      ]}
                    />
                  </Space>
                </div>

                <Table<WordList>
                  bordered={false}
                  size={tableSize}
                  loading={loading}
                  columns={columns}
                  dataSource={wordList}
                  rowKey="id"
                  rowClassName={getRowClassName}
                  scroll={{ x: 1400 }}
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
    </div>
  );
};

export default EnglishWorld;
