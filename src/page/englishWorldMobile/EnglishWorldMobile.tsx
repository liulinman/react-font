import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  NavBar,
  SearchBar,
  PullToRefresh,
  InfiniteScroll,
  Card,
  Button,
  Tag,
  Popup,
  Form,
  Input,
  TextArea,
  Picker,
  Image,
  Dialog,
  Toast,
  Space,
  Empty,
  Loading,
  ImageUploader,
} from "antd-mobile";
import type { ImageUploadItem } from "antd-mobile/es/components/image-uploader";
import type { PickerActions } from "antd-mobile/es/components/picker";
import {
  AddOutline,
  EditSOutline,
  DeleteOutline,
  FilterOutline,
  AppOutline,
} from "antd-mobile-icons";
import request, { useMutation } from "@/utils/axios/axios";
import {
  wordAdd,
  wordDel,
  wordExist,
  wordFilter,
  wordUpdate,
  englishStats,
  uploadFile,
} from "@/server/word/word";
import { WordList, DailyStat } from "@/server/word/word.type";
import { EnglishAbsorb, EnglishPartSpeech } from "@/page/englishWorld/enum";
import { enumToOptions } from "@/utils/commonUtils/commonUtils";
import type { CommonRecord } from "@/utils/commonType/commonType";
import ReactECharts from "echarts-for-react";
import { PhotoProvider, PhotoView } from "react-photo-view";
import "react-photo-view/dist/react-photo-view.css";
import "./EnglishWorldMobile.css";

type ListData = {
  list: WordList[];
  total: number;
  totalPages: number;
};

type SummaryStat = {
  label: string;
  value: number | string;
  color: string;
};

type PartSpeechData = {
  value: number;
  name: string;
  color: string;
};

// 词性对应的颜色
const partSpeechColors: Record<number, string> = {
  1: "#1677ff", // 动词
  2: "#52c41a", // 名词
  3: "#faad14", // 形容词
  4: "#9254de", // 副词
  5: "#f5222d", // 代词
  6: "#13c2c2", // 介词
  7: "#fa8c16", // 连词
  8: "#eb2f96", // 感叹词
  9: "#8c8c8c", // 未分类
};

const EnglishWorldMobile: React.FC = () => {
  const [wordList, setWordList] = useState<WordList[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const loadingRef = useRef<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>(
    {}
  );
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editType, setEditType] = useState<"edit" | "add">("add");
  const [currentRecord, setCurrentRecord] = useState<WordList | undefined>();
  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [selectedPartSpeech, setSelectedPartSpeech] = useState<number[]>([]);
  const levelPickerRef = useRef<PickerActions>(null);
  const typePickerRef = useRef<PickerActions>(null);
  const statsLevelPickerRef = useRef<PickerActions>(null);
  const filterTypePickerRef = useRef<PickerActions>(null);
  const filterLevelPickerRef = useRef<PickerActions>(null);
  const [activeView, setActiveView] = useState<"list" | "stats">("list");

  // 统计相关状态
  const [selectedLevel, setSelectedLevel] = useState<EnglishAbsorb>(
    EnglishAbsorb["一般"]
  );
  const [summaryStats, setSummaryStats] = useState<SummaryStat[]>([
    { label: "总学习单词", value: 0, color: "#1677ff" },
    { label: "已掌握单词", value: 0, color: "#52c41a" },
    { label: "掌握率", value: 0, color: "#faad14" },
  ]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [wordTypeData, setWordTypeData] = useState<PartSpeechData[]>([]);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  // 筛选条件
  const [filterValues, setFilterValues] = useState<{
    englishType?: number;
    englishLevel?: number;
    englishChinese?: string;
  }>({});

  const { mutateAsync: mutateWordAdd, isPending: buttonPending } =
    useMutation(wordAdd);
  const { mutateAsync: mutateEnglishStats } = useMutation(englishStats);

  // 初始化加载数据
  const loadWordData = useCallback(
    async (pageNum: number, reset: boolean = false) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      try {
        const res = await request<ListData>(
          wordFilter({
            page: pageNum,
            pageSize,
            ...filterValues,
            ...(searchKeyword ? { englishWord: searchKeyword } : {}),
          })
        );

        setTotal(res.total);
        if (reset) {
          setWordList(res.list);
          setHasMore(
            res.list.length >= pageSize && res.list.length < res.total
          );
        } else {
          setWordList((prev) => {
            const newList = [...prev, ...res.list];
            setHasMore(
              res.list.length >= pageSize && newList.length < res.total
            );
            return newList;
          });
        }
      } catch {
        Toast.show({
          icon: "fail",
          content: "加载失败",
        });
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [pageSize, filterValues, searchKeyword]
  );

  // 加载统计数据
  const loadStats = useCallback(
    async (level: EnglishAbsorb) => {
      setStatsLoading(true);
      try {
        const res = await mutateEnglishStats({ level });
        const {
          levelCount,
          percentage,
          totalCount,
          dailyStats,
          partSpeechStatisticalClass,
        } = res;

        setSummaryStats([
          { label: "总学习单词", value: totalCount, color: "#1677ff" },
          { label: "已掌握单词", value: levelCount, color: "#52c41a" },
          {
            label: "掌握率",
            value: Number(percentage).toFixed(2),
            color: "#faad14",
          },
        ]);

        setDailyStats(dailyStats);

        // 处理词性统计数据
        const partSpeechData: PartSpeechData[] = Object.entries(
          partSpeechStatisticalClass as CommonRecord
        ).map(([key, value]) => {
          const partSpeechKey = Number(key);
          return {
            value: value as number,
            name: EnglishPartSpeech[partSpeechKey],
            color: partSpeechColors[partSpeechKey] || "#8c8c8c",
          };
        });

        setWordTypeData(partSpeechData);
      } catch (error) {
        console.error("加载统计数据失败:", error);
        Toast.show({
          icon: "fail",
          content: "加载统计数据失败",
        });
      } finally {
        setStatsLoading(false);
      }
    },
    [mutateEnglishStats]
  );

  useEffect(() => {
    setPage(1);
    setWordList([]);
    loadWordData(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filterValues), searchKeyword]);

  // 当切换到统计视图时加载数据
  useEffect(() => {
    if (activeView === "stats") {
      loadStats(selectedLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedLevel]);

  // 下拉刷新
  const handleRefresh = async () => {
    setPage(1);
    setWordList([]);
    await loadWordData(1, true);
  };

  // 加载更多
  const loadMore = async () => {
    if (hasMore && !loadingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      await loadWordData(nextPage, false);
    }
  };

  // 搜索
  const handleSearch = (value: string) => {
    setSearchKeyword(value);
  };

  // 删除操作
  const handleDelete = (id: number) => {
    Dialog.confirm({
      content: "确定要删除这个单词吗？",
      confirmText: "删除",
      cancelText: "取消",
      onConfirm: async () => {
        try {
          const res = await request<boolean>(wordDel({ id }));
          if (res) {
            Toast.show({
              icon: "success",
              content: "删除成功",
            });
            await handleRefresh();
          } else {
            Toast.show({
              icon: "fail",
              content: "删除失败",
            });
          }
        } catch {
          Toast.show({
            icon: "fail",
            content: "删除失败",
          });
        }
      },
    });
  };

  // 编辑操作
  const handleEdit = (record: WordList) => {
    setCurrentRecord(record);
    setEditType("edit");
    setSelectedPartSpeech(record.englishPartSpeech || []);
    setShowEditModal(true);
    // 设置表单初始值
    setTimeout(() => {
      form.setFieldsValue({
        englishWord: record.englishWord,
        englishLevel: record.englishLevel,
        englishType: record.englishType,
        englishPhonetic: record.englishPhonetic,
        englishChinese: record.englishChinese,
        englishNote: record.englishNote,
        englishReference: record.englishReference,
        englishImg: record.englishImg,
        englishPartSpeech: record.englishPartSpeech || [],
      });
    }, 100);
  };

  // 添加操作
  const handleAdd = () => {
    setCurrentRecord(undefined);
    setEditType("add");
    setSelectedPartSpeech([]);
    setShowEditModal(true);
    form.resetFields();
  };

  // 提交编辑/添加
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        ...(editType === "edit" && currentRecord
          ? { id: currentRecord.id }
          : {}),
      };

      if (editType === "edit") {
        const res = await request<boolean>(wordUpdate(submitData as WordList));
        if (res) {
          Toast.show({
            icon: "success",
            content: "更新成功",
          });
          setShowEditModal(false);
          await handleRefresh();
        } else {
          Toast.show({
            icon: "fail",
            content: "更新失败",
          });
        }
      } else {
        // 检查单词是否存在
        const existRes = await request<boolean>(
          wordExist({ englishWord: values.englishWord })
        );

        if (existRes) {
          Dialog.alert({
            content: "单词已经存在！",
            confirmText: "确定",
          });
          return;
        }

        const res = await mutateWordAdd(submitData);
        if (res) {
          Toast.show({
            icon: "success",
            content: "添加成功",
          });
          setShowEditModal(false);
          await handleRefresh();
        } else {
          Toast.show({
            icon: "fail",
            content: "添加失败",
          });
        }
      }
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  // 应用筛选
  const handleApplyFilter = (values: {
    englishType?: number;
    englishLevel?: number;
    englishChinese?: string;
  }) => {
    setFilterValues(values);
    setShowFilter(false);
  };

  // 获取类型标签
  const getTypeLabel = (type?: number) => {
    const types: Record<number, { label: string; color: string }> = {
      0: { label: "单词", color: "primary" },
      1: { label: "短语", color: "success" },
      2: { label: "句子", color: "warning" },
    };
    return types[type ?? 0] || types[0];
  };

  // 获取掌握程度标签
  const getLevelLabel = (level?: number) => {
    const levels: Record<number, { label: string; color: string }> = {
      0: { label: "不会", color: "danger" },
      1: { label: "一般", color: "warning" },
      2: { label: "熟练", color: "primary" },
      3: { label: "精通", color: "success" },
    };
    return levels[level ?? 0] || levels[0];
  };

  // 词性选项
  const partSpeechOptions = [
    { label: "动词", value: 1, color: "primary" },
    { label: "名词", value: 2, color: "success" },
    { label: "形容词", value: 3, color: "warning" },
    { label: "副词", value: 4, color: "default" },
    { label: "代词", value: 5, color: "danger" },
    { label: "介词", value: 6, color: "default" },
    { label: "连词", value: 7, color: "default" },
    { label: "感叹词", value: 8, color: "default" },
    { label: "未分类", value: 9, color: "default" },
  ];

  // 统计图表配置
  const optionBar = {
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: 30,
      right: 20,
      top: 20,
      bottom: 60,
    },
    xAxis: {
      type: "category",
      data: dailyStats.map((item) => item.date),
      axisTick: { show: false },
      axisLabel: {
        interval: Math.max(0, Math.floor(dailyStats.length / 7) - 1),
        color: "#666",
        fontSize: 10,
        rotate: 45,
        margin: 12,
      },
    },
    yAxis: {
      type: "value",
      name: "新增单词",
      minInterval: 5,
    },
    series: [
      {
        data: dailyStats.map((item) => item.count),
        type: "bar",
        barWidth: 20,
        itemStyle: {
          color: "#1677ff",
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  const optionPie = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "horizontal",
      left: "center",
      top: 10,
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 16,
      textStyle: {
        fontSize: 10,
      },
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "60%"],
        avoidLabelOverlap: false,
        label: {
          formatter: "{b}\n{d}%",
          color: "#595959",
          fontSize: 10,
        },
        labelLine: {
          length: 10,
          length2: 8,
        },
        itemStyle: {
          shadowBlur: 4,
          shadowColor: "rgba(0,0,0,0.1)",
          borderColor: "#fff",
          borderWidth: 1,
        },
        data: wordTypeData.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color,
            opacity: 0.6 + index * 0.08,
          },
        })),
      },
    ],
  };

  const handleLevelChange = async (value: EnglishAbsorb) => {
    if (value) {
      setSelectedLevel(value);
      await loadStats(value);
    }
  };

  return (
    <div className="english-world-mobile">
      <NavBar
        back={null}
        right={
          <Space>
            {activeView === "list" ? (
              <>
                <Button
                  fill="none"
                  size="small"
                  onClick={() => setActiveView("stats")}
                  style={{ padding: "4px 8px" }}
                >
                  <AppOutline />
                </Button>
                <Button
                  fill="none"
                  size="small"
                  onClick={() => setShowFilter(true)}
                  style={{ padding: "4px 8px" }}
                >
                  <FilterOutline />
                </Button>
              </>
            ) : (
              <Button
                fill="none"
                size="small"
                onClick={() => setActiveView("list")}
                style={{ padding: "4px 8px" }}
              >
                列表
              </Button>
            )}
          </Space>
        }
      >
        {activeView === "list" ? "单词管理" : "学习统计"}
      </NavBar>

      <div className="mobile-content">
        {activeView === "list" ? (
          <>
            {/* 搜索栏 */}
            <div className="search-section">
              <SearchBar
                placeholder="搜索单词或中文"
                value={searchKeyword}
                onChange={handleSearch}
                onSearch={handleSearch}
                showCancelButton
              />
              {total > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "#8c8c8c",
                  }}
                >
                  共 {total} 条
                </div>
              )}
            </div>

            {/* 单词列表 */}
            <PullToRefresh onRefresh={handleRefresh}>
              {wordList.length === 0 && !loading ? (
                <Empty description="暂无数据" />
              ) : (
                <PhotoProvider>
                  <div className="word-list">
                    {wordList.map((item) => (
                      <Card
                        key={item.id}
                        className="word-card"
                        title={
                          <div className="word-card-header">
                            <span className="word-title">
                              {item.englishWord}
                            </span>
                            {item.englishPhonetic && (
                              <span className="word-phonetic">
                                [{item.englishPhonetic}]
                              </span>
                            )}
                          </div>
                        }
                        extra={
                          <Space>
                            <Button
                              fill="none"
                              size="small"
                              onClick={() => handleEdit(item)}
                              style={{ padding: "4px" }}
                            >
                              <EditSOutline />
                            </Button>
                            <Button
                              fill="none"
                              size="small"
                              onClick={() => handleDelete(item.id)}
                              style={{ padding: "4px", color: "#ff3141" }}
                            >
                              <DeleteOutline />
                            </Button>
                          </Space>
                        }
                      >
                        <div className="word-card-body">
                          {item.englishImg && (
                            <div className="word-image">
                              <PhotoView src={item.englishImg}>
                                <Image
                                  src={item.englishImg}
                                  width={60}
                                  height={60}
                                  fit="cover"
                                  style={{
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                  }}
                                />
                              </PhotoView>
                            </div>
                          )}
                          <div className="word-info">
                            {item.englishChinese && (
                              <div className="word-chinese">
                                {item.englishChinese}
                              </div>
                            )}
                            <div className="word-tags">
                              <Tag color={getTypeLabel(item.englishType).color}>
                                {getTypeLabel(item.englishType).label}
                              </Tag>
                              <Tag
                                color={getLevelLabel(item.englishLevel).color}
                              >
                                {getLevelLabel(item.englishLevel).label}
                              </Tag>
                              {item.englishPartSpeech &&
                                item.englishPartSpeech.length > 0 && (
                                  <Tag color="default">
                                    {partSpeechOptions
                                      .filter((opt) =>
                                        item.englishPartSpeech?.includes(
                                          opt.value
                                        )
                                      )
                                      .map((opt) => opt.label)
                                      .join("、")}
                                  </Tag>
                                )}
                            </div>
                            {item.englishNote && (
                              <div className="word-note">
                                <div className="note-label">笔记：</div>
                                <div className="note-content">
                                  {expandedNotes[item.id] ||
                                  item.englishNote.length <= 100
                                    ? item.englishNote
                                    : `${item.englishNote.substring(
                                        0,
                                        100
                                      )}...`}
                                </div>
                                {item.englishNote.length > 100 && (
                                  <div
                                    style={{
                                      marginTop: "8px",
                                      textAlign: "right",
                                    }}
                                  >
                                    <Button
                                      fill="none"
                                      size="mini"
                                      color="primary"
                                      onClick={() => {
                                        setExpandedNotes((prev) => ({
                                          ...prev,
                                          [item.id]: !prev[item.id],
                                        }));
                                      }}
                                    >
                                      {expandedNotes[item.id] ? "收起" : "展开"}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                            {item.englishReference && (
                              <div className="word-reference">
                                <a
                                  href={item.englishReference}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="reference-link"
                                >
                                  参考链接
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </PhotoProvider>
              )}
              <InfiniteScroll loadMore={loadMore} hasMore={hasMore}>
                {loading && wordList.length > 0 && (
                  <div style={{ textAlign: "center", padding: "16px" }}>
                    <Loading />
                  </div>
                )}
              </InfiniteScroll>
            </PullToRefresh>

            {/* 添加按钮 */}
            <div className="fab-container">
              <Button
                color="primary"
                shape="rounded"
                size="large"
                onClick={handleAdd}
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  boxShadow: "0 4px 12px rgba(22, 119, 255, 0.4)",
                }}
              >
                <AddOutline fontSize={24} />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* 统计视图 */}
            <div
              style={{
                padding: "16px",
                background: "#f5f5f5",
                minHeight: "calc(100vh - 45px)",
              }}
            >
              {statsLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <Loading />
                </div>
              ) : (
                <>
                  {/* 统计卡片 */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    {summaryStats.map((item) => (
                      <Card key={item.label} style={{ borderRadius: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: "#999",
                                fontSize: "14px",
                                marginBottom: "8px",
                              }}
                            >
                              {item.label}
                              {item.label === "已掌握单词" && (
                                <span
                                  onClick={() => {
                                    statsLevelPickerRef.current?.open();
                                  }}
                                  style={{
                                    marginLeft: "8px",
                                    color: "#1677ff",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                  }}
                                >
                                  (
                                  {enumToOptions(EnglishAbsorb, [
                                    EnglishAbsorb["不会"],
                                  ]).find((opt) => opt.value === selectedLevel)
                                    ?.label || ""}
                                  )
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                color: item.color,
                                fontSize: "24px",
                                fontWeight: "bold",
                              }}
                            >
                              {item.label === "掌握率"
                                ? `${item.value}%`
                                : item.value}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* 每日新增单词图表 */}
                  <Card
                    title="每日新增单词"
                    style={{ borderRadius: "12px", marginBottom: "16px" }}
                  >
                    <ReactECharts
                      option={optionBar}
                      style={{ height: "250px", width: "100%" }}
                    />
                  </Card>

                  {/* 词性分布图表 */}
                  <Card title="词性分布" style={{ borderRadius: "12px" }}>
                    <ReactECharts
                      option={optionPie}
                      style={{ height: "250px", width: "100%" }}
                    />
                  </Card>

                  {/* 掌握程度选择器（隐藏） */}
                  <Picker
                    ref={statsLevelPickerRef as React.RefObject<PickerActions>}
                    columns={[
                      enumToOptions(EnglishAbsorb, [EnglishAbsorb["不会"]]).map(
                        (opt) => ({
                          label: opt.label,
                          value: opt.value as EnglishAbsorb,
                        })
                      ),
                    ]}
                    value={[selectedLevel]}
                    onConfirm={(val) => {
                      if (val[0]) {
                        handleLevelChange(val[0] as EnglishAbsorb);
                      }
                    }}
                  >
                    {() => null}
                  </Picker>
                </>
              )}
            </div>
          </>
        )}

        {/* 筛选弹窗 */}
        <Popup
          visible={showFilter}
          onMaskClick={() => setShowFilter(false)}
          position="right"
          bodyStyle={{ width: "80vw", height: "100vh" }}
        >
          <div className="filter-popup">
            <NavBar onBack={() => setShowFilter(false)}>筛选条件</NavBar>
            <Form
              form={filterForm}
              layout="vertical"
              initialValues={filterValues}
            >
              <Form.Item
                label="类型"
                name="englishType"
                trigger="onConfirm"
                getValueFromEvent={(val) => {
                  return Array.isArray(val) ? val[0] : val;
                }}
                getValueProps={(val) => {
                  return { value: val ? [val] : undefined };
                }}
                onClick={() => {
                  filterTypePickerRef.current?.open();
                }}
              >
                <Picker
                  ref={filterTypePickerRef as React.RefObject<PickerActions>}
                  columns={[
                    [
                      { label: "单词", value: 0 },
                      { label: "短语", value: 1 },
                      { label: "句子", value: 2 },
                    ],
                  ]}
                >
                  {(items) => (
                    <div className="picker-trigger">
                      {items?.[0]?.label || "请选择"}
                    </div>
                  )}
                </Picker>
              </Form.Item>
              <Form.Item
                label="掌握程度"
                name="englishLevel"
                trigger="onConfirm"
                getValueFromEvent={(val) => {
                  return Array.isArray(val) ? val[0] : val;
                }}
                getValueProps={(val) => {
                  return { value: val ? [val] : undefined };
                }}
                onClick={() => {
                  filterLevelPickerRef.current?.open();
                }}
              >
                <Picker
                  ref={filterLevelPickerRef as React.RefObject<PickerActions>}
                  columns={[
                    [
                      { label: "不会", value: 0 },
                      { label: "一般", value: 1 },
                      { label: "熟练", value: 2 },
                      { label: "精通", value: 3 },
                    ],
                  ]}
                >
                  {(items) => (
                    <div className="picker-trigger">
                      {items?.[0]?.label || "请选择"}
                    </div>
                  )}
                </Picker>
              </Form.Item>
              <Form.Item label="中文" name="englishChinese">
                <Input placeholder="请输入中文" />
              </Form.Item>
              <div className="filter-actions">
                <Button
                  block
                  onClick={() => {
                    setFilterValues({});
                    filterForm.resetFields();
                    setShowFilter(false);
                  }}
                  style={{ marginBottom: "12px" }}
                >
                  重置
                </Button>
                <Button
                  block
                  color="primary"
                  onClick={() => {
                    const values = filterForm.getFieldsValue();
                    handleApplyFilter(values);
                  }}
                >
                  应用
                </Button>
              </div>
            </Form>
          </div>
        </Popup>

        {/* 编辑/添加弹窗 */}
        <Popup
          visible={showEditModal}
          onMaskClick={() => setShowEditModal(false)}
          position="bottom"
          bodyStyle={{
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <div className="edit-modal">
            <NavBar
              onBack={() => setShowEditModal(false)}
              right={
                <Button
                  fill="none"
                  size="small"
                  onClick={handleSubmit}
                  loading={buttonPending}
                >
                  保存
                </Button>
              }
            >
              {editType === "edit" ? "编辑单词" : "添加单词"}
            </NavBar>
            <div className="edit-form-container">
              <Form form={form} layout="vertical">
                <Form.Item
                  label="单词名"
                  name="englishWord"
                  rules={[{ required: true, message: "请输入单词名" }]}
                >
                  <Input placeholder="请输入单词名" />
                </Form.Item>
                <Form.Item
                  label="掌握程度"
                  name="englishLevel"
                  rules={[{ required: true, message: "请选择掌握程度" }]}
                  trigger="onConfirm"
                  getValueFromEvent={(val) => {
                    return Array.isArray(val) ? val[0] : val;
                  }}
                  getValueProps={(val) => {
                    return { value: val ? [val] : undefined };
                  }}
                  onClick={() => {
                    levelPickerRef.current?.open();
                  }}
                >
                  <Picker
                    ref={levelPickerRef as React.RefObject<PickerActions>}
                    columns={[
                      [
                        { label: "不会", value: 0 },
                        { label: "一般", value: 1 },
                        { label: "熟练", value: 2 },
                        { label: "精通", value: 3 },
                      ],
                    ]}
                  >
                    {(items) => (
                      <div className="picker-trigger">
                        {items?.[0]?.label || "请选择"}
                      </div>
                    )}
                  </Picker>
                </Form.Item>
                <Form.Item
                  label="类型"
                  name="englishType"
                  rules={[{ required: true, message: "请选择类型" }]}
                  trigger="onConfirm"
                  getValueFromEvent={(val) => {
                    return Array.isArray(val) ? val[0] : val;
                  }}
                  getValueProps={(val) => {
                    return { value: val ? [val] : undefined };
                  }}
                  onClick={() => {
                    typePickerRef.current?.open();
                  }}
                >
                  <Picker
                    ref={typePickerRef as React.RefObject<PickerActions>}
                    columns={[
                      [
                        { label: "单词", value: 0 },
                        { label: "短语", value: 1 },
                        { label: "句子", value: 2 },
                      ],
                    ]}
                  >
                    {(items) => (
                      <div className="picker-trigger">
                        {items?.[0]?.label || "请选择"}
                      </div>
                    )}
                  </Picker>
                </Form.Item>
                <Form.Item label="音标" name="englishPhonetic">
                  <Input placeholder="请输入音标" />
                </Form.Item>
                <Form.Item label="词性" name="englishPartSpeech">
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {partSpeechOptions.map((option) => {
                      const isSelected = selectedPartSpeech.includes(
                        option.value
                      );
                      return (
                        <Tag
                          key={option.value}
                          color={isSelected ? option.color : "default"}
                          style={{
                            cursor: "pointer",
                            opacity: isSelected ? 1 : 0.6,
                          }}
                          onClick={() => {
                            let newSelected: number[];
                            if (selectedPartSpeech.includes(option.value)) {
                              newSelected = selectedPartSpeech.filter(
                                (item) => item !== option.value
                              );
                            } else {
                              newSelected = [
                                ...selectedPartSpeech,
                                option.value,
                              ];
                            }
                            setSelectedPartSpeech(newSelected);
                            form.setFieldsValue({
                              englishPartSpeech: newSelected,
                            });
                          }}
                        >
                          {option.label}
                        </Tag>
                      );
                    })}
                  </div>
                </Form.Item>
                <Form.Item label="中文" name="englishChinese">
                  <TextArea
                    placeholder="请输入中文释义"
                    rows={2}
                    showCount
                    maxLength={200}
                  />
                </Form.Item>
                <Form.Item
                  label="图片"
                  name="englishImg"
                  getValueFromEvent={(items: ImageUploadItem[]) => {
                    return items.length > 0 ? items[0].url : undefined;
                  }}
                  getValueProps={(value?: string) => {
                    return {
                      value: value
                        ? [
                            {
                              url: value,
                            },
                          ]
                        : [],
                    };
                  }}
                >
                  <ImageUploader
                    maxCount={1}
                    upload={async (file: File) => {
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        const res = await request<string>(uploadFile(formData));
                        return {
                          url: res,
                        };
                      } catch (error) {
                        Toast.show({
                          icon: "fail",
                          content: "上传失败",
                        });
                        throw error;
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item label="笔记" name="englishNote">
                  <TextArea
                    placeholder="请输入笔记"
                    rows={4}
                    showCount
                    maxLength={500}
                  />
                </Form.Item>
                <Form.Item label="引用" name="englishReference">
                  <Input placeholder="请输入引用链接" />
                </Form.Item>
              </Form>
            </div>
          </div>
        </Popup>
      </div>
    </div>
  );
};

export default EnglishWorldMobile;
