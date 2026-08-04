import {
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Button,
  message,
  Tag,
  Spin,
} from "antd";
import type { UploadProps } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";
import { WordList } from "@/server/word/word.type";
import request from "@font/api";
import { uploadFile } from "@/server";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { enumToOptions } from "@font/utils";
import { EnglishAbsorb, EnglishType } from "../enum";
import {
  wordAgentQuery,
  type WordAgentResponse,
} from "@/server/wordAgent/wordAgent";
import { WordCorrectionSuggestion } from "./WordCorrectionSuggestion";
import {
  buildAiCompletionPatch,
  getWordType,
  isLikelyEnglishLookupInput,
  normalizeWordInput,
  resolveWordAgentResult,
  type WordAgentResolution,
} from "./wordCorrection";

/** 新增时的预填数据（如从 AI 查询结果带入） */
export type AddInitialValues = Partial<Omit<WordList, "id">>;

interface Props {
  isModalVisible: boolean;
  currentRecord?: WordList | null;
  /** 新增模式下预填的表单值（如从 AI 单词卡片带入） */
  addInitialValues?: AddInitialValues | null;
  type: "edit" | "add";
  /** 提交回调；返回 true 表示成功（添加成功时会清空表单），否则保留表单内容 */
  onOk: (data: WordList, type: "edit" | "add") => void | boolean | Promise<void | boolean>;
  onCancel: () => void;
}

type FormValues = {
  englishWord: string;
  englishLevel: number;
  englishType: number;
  englishPhonetic?: string;
  englishPartSpeech?: number[];
  englishChinese?: string;
  englishImg?: string;
  englishNote?: string;
  englishReference?: string;
};

const AI_COMPLETION_DEBOUNCE_MS = 600;

type PendingWordSuggestion = Extract<
  WordAgentResolution,
  { kind: "suggestion" }
>;

export const EditAddModal = (props: Props) => {
  const { isModalVisible, currentRecord, addInitialValues, type, onOk, onCancel } = props;

  // 初始化表单数据
  const [form] = Form.useForm();
  const [selectedPartSpeech, setSelectedPartSpeech] = useState<number[]>([]);
  const [aiLookupWord, setAiLookupWord] = useState("");
  const [aiCompleting, setAiCompleting] = useState(false);
  const [pendingWordSuggestion, setPendingWordSuggestion] =
    useState<PendingWordSuggestion | null>(null);
  const aiLookupRequestIdRef = useRef(0);
  const completedLookupWordRef = useRef<string | null>(null);
  const englishTypeManuallyChangedRef = useRef(false);

  // 词性选项
  const partSpeechOptions = [
    { value: 1, label: "动词", color: "blue" },
    { value: 2, label: "名词", color: "green" },
    { value: 3, label: "形容词", color: "orange" },
    { value: 4, label: "副词", color: "purple" },
    { value: 5, label: "代词", color: "red" },
    { value: 6, label: "介词", color: "cyan" },
    { value: 7, label: "连词", color: "volcano" },
    { value: 8, label: "感叹词", color: "magenta" },
    { value: 9, label: "未分类", color: "default" },
  ];

  // 编辑时预填 currentRecord；新增时若有 addInitialValues 则预填
  useLayoutEffect(() => {
    aiLookupRequestIdRef.current += 1;
    completedLookupWordRef.current = null;
    englishTypeManuallyChangedRef.current = false;
    /* eslint-disable react-hooks/set-state-in-effect -- Reset stale loading and pending suggestions atomically before paint. */
    setAiCompleting(false);
    setPendingWordSuggestion(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const timer = window.setTimeout(() => {
      if (type === "edit" && currentRecord) {
        form.setFieldsValue(currentRecord);
        setSelectedPartSpeech(currentRecord.englishPartSpeech || []);
      } else if (type === "add" && addInitialValues) {
        form.setFieldsValue(addInitialValues);
        setSelectedPartSpeech(addInitialValues.englishPartSpeech || []);
      } else {
        form.resetFields();
        setSelectedPartSpeech([]);
      }
      setAiLookupWord("");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [type, currentRecord, addInitialValues, form, isModalVisible]);

  useEffect(() => {
    const lookupWord = normalizeWordInput(aiLookupWord);
    const requestId = aiLookupRequestIdRef.current + 1;
    aiLookupRequestIdRef.current = requestId;

    if (
      !isModalVisible ||
      type !== "add" ||
      !lookupWord ||
      !isLikelyEnglishLookupInput(lookupWord)
    ) {
      // An invalidated request cannot clear its spinner in finally, so clear it now.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiCompleting(false);
      return;
    }

    const lookupKey = lookupWord.toLocaleLowerCase();
    if (completedLookupWordRef.current === lookupKey) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setAiCompleting(true);
      try {
        const data = await request<WordAgentResponse>(
          wordAgentQuery({ word: lookupWord }),
        );
        if (aiLookupRequestIdRef.current !== requestId) return;

        const item = data?.words?.[0];
        if (!item) return;

        const currentWord = normalizeWordInput(form.getFieldValue("englishWord"));
        if (currentWord.toLocaleLowerCase() !== lookupKey) return;

        const resolution = resolveWordAgentResult(item, lookupWord);
        if (resolution.kind === "suggestion") {
          setPendingWordSuggestion(resolution);
          completedLookupWordRef.current = lookupKey;
          return;
        }
        if (resolution.kind === "auto-complete") {
          const currentValues = form.getFieldsValue() as FormValues;
          const patch = buildAiCompletionPatch(
            resolution.item,
            lookupWord,
            currentValues,
            { preserveWordType: englishTypeManuallyChangedRef.current },
          );
          form.setFieldsValue(patch);
          if (patch.englishPartSpeech?.length) {
            setSelectedPartSpeech(patch.englishPartSpeech);
          }
        }
        completedLookupWordRef.current = lookupKey;
      } catch (error: unknown) {
        if (aiLookupRequestIdRef.current !== requestId) return;
        message.warning(
          error instanceof Error ? error.message : "AI 补全失败，可以手动填写",
        );
      } finally {
        if (aiLookupRequestIdRef.current === requestId) {
          setAiCompleting(false);
        }
      }
    }, AI_COMPLETION_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [aiLookupWord, form, isModalVisible, type]);

  const handleModalOk = async () => {
    try {
      const value = await form.validateFields();
      const values =
        type === "add" ? value : { ...value, id: currentRecord?.id };

      const result = await Promise.resolve(onOk({ ...values }, type));
      // 仅当添加成功（返回 true）时清空表单，避免「单词已存在」等失败时把用户输入清空
      if (type === "add" && result === true) {
        form.resetFields();
        setSelectedPartSpeech([]);
        setAiLookupWord("");
        setAiCompleting(false);
        setPendingWordSuggestion(null);
        completedLookupWordRef.current = null;
        englishTypeManuallyChangedRef.current = false;
        aiLookupRequestIdRef.current += 1;
      }
    } catch (info) {
      console.log("Validate Failed:", info);
    }
  };

  const handleModalCancel = () => {
    // 关闭模态框时清空表单数据
    onCancel();
  };

  const handleUseWordSuggestion = () => {
    if (!isModalVisible || type !== "add" || !pendingWordSuggestion) return;
    const { candidate, item } = pendingWordSuggestion;
    const currentValues = form.getFieldsValue() as FormValues;
    const patch = buildAiCompletionPatch(item, candidate, currentValues, {
      preserveWordType: englishTypeManuallyChangedRef.current,
    });

    completedLookupWordRef.current = candidate.toLowerCase();
    setAiLookupWord(candidate);
    setPendingWordSuggestion(null);
    form.setFieldsValue({ ...patch, englishWord: candidate });
    if (patch.englishPartSpeech?.length) {
      setSelectedPartSpeech(patch.englishPartSpeech);
    }
  };

  const handleKeepOriginalWord = () => {
    if (!pendingWordSuggestion) return;
    completedLookupWordRef.current =
      pendingWordSuggestion.input.toLowerCase();
    setPendingWordSuggestion(null);
  };

  const onValuesChange = (changedValues: Partial<FormValues>) => {
    if (Object.prototype.hasOwnProperty.call(changedValues, "englishType")) {
      englishTypeManuallyChangedRef.current = true;
    }
    if (Object.prototype.hasOwnProperty.call(changedValues, "englishWord")) {
      const englishWord = normalizeWordInput(changedValues.englishWord);
      completedLookupWordRef.current = null;
      englishTypeManuallyChangedRef.current = false;
      setPendingWordSuggestion(null);
      if (type === "add") {
        setAiLookupWord(englishWord);
      }
      if (!englishWord) return;
      // 开始决定掌握程度和类型
      form.setFieldsValue({
        englishLevel: 0,
        englishType: getWordType(englishWord),
      });
    }
  };

  // 处理词性标签点击
  const handlePartSpeechClick = (value: number) => {
    let newSelected: number[];
    if (selectedPartSpeech.includes(value)) {
      // 如果已选中，则取消选中
      newSelected = selectedPartSpeech.filter((item) => item !== value);
    } else {
      // 如果未选中，则添加
      newSelected = [...selectedPartSpeech, value];
    }
    setSelectedPartSpeech(newSelected);
    form.setFieldsValue({ englishPartSpeech: newSelected });
  };

  // 上传文件处理方法
  const onChange: UploadProps["onChange"] = (info) => {
    if (info.file.status === "uploading") {
      return;
    }
    if (info.file.status === "done") {
      message.success(`${info.file.name} 上传成功`);
      // 从 file.response 获取响应数据（customRequest 中设置的）
      // 上传接口返回的是 URL 字符串
      const imageUrl = info.file.response;
      if (imageUrl) {
        // 直接将 URL 设置到表单字段
        form.setFieldsValue({ englishImg: imageUrl });
      }
    } else if (info.file.status === "error") {
      message.error(`${info.file.name} 上传失败`);
    }
  };

  const customRequest: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      // 直接使用文件对象创建FormData
      const formData = new FormData();
      formData.append("file", file as Blob);

      // 模拟上传进度
      onProgress?.({ percent: 30 });

      // 调用上传接口，request 函数已经处理了响应拦截，直接返回 URL 字符串
      const imageUrl = await request<string>(uploadFile(formData));

      // 模拟上传完成
      onProgress?.({ percent: 100 });

      // 直接设置表单值，确保图片URL被保存（双重保险）
      form.setFieldsValue({ englishImg: imageUrl });

      // 上传成功，onSuccess 的第一个参数会被设置到 file.response
      onSuccess?.(imageUrl);
    } catch (error) {
      console.error("File upload failed", error);
      onError?.(error as Error);
    }
  };

  return (
    <Modal
      title={type === "edit" ? "编辑单词" : "添加单词"}
      open={isModalVisible}
      onOk={handleModalOk}
      onCancel={handleModalCancel}
      okText="确认"
      cancelText="取消"
      destroyOnHidden
      width={800} // 增加宽度
      styles={{
        body: {
          maxHeight: "calc(100vh - 360px)",
          overflowY: "auto",
          padding: "20px",
        },
      }}
    >
      {/* 编辑/添加表单 */}
      <Form form={form} onValuesChange={onValuesChange} layout="vertical">
        {/* 第一行：单词名 + 掌握程度 */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 1 }}>
            <Form.Item
              label="单词名"
              name="englishWord"
              rules={[{ required: true, message: "请输入单词名" }]}
            >
              <Input
                allowClear
                suffix={
                  aiCompleting ? (
                    <Spin aria-label="AI补全中" size="small" />
                  ) : undefined
                }
              />
            </Form.Item>
            {isModalVisible && type === "add" && pendingWordSuggestion ? (
              <WordCorrectionSuggestion
                input={pendingWordSuggestion.input}
                candidate={pendingWordSuggestion.candidate}
                status={pendingWordSuggestion.status}
                reason={pendingWordSuggestion.reason}
                onUse={handleUseWordSuggestion}
                onKeep={handleKeepOriginalWord}
              />
            ) : null}
          </div>
          <Form.Item
            label="掌握程度"
            name="englishLevel"
            rules={[{ required: true, message: "请选择掌握程度" }]}
            style={{ flex: 1 }}
          >
            <Select options={enumToOptions(EnglishAbsorb)} />
          </Form.Item>
        </div>

        {/* 第二行：类型 + 音标 */}
        <div style={{ display: "flex", gap: "16px" }}>
          <Form.Item
            label="类型"
            name="englishType"
            rules={[{ required: true, message: "请选择类型" }]}
            style={{ flex: 1 }}
          >
            <Select options={enumToOptions(EnglishType)} allowClear />
          </Form.Item>
          <Form.Item label="音标" name="englishPhonetic" style={{ flex: 1 }}>
            <Input allowClear />
          </Form.Item>
        </div>

        {/* 词性 - 独立一行 */}
        <Form.Item label="词性" name="englishPartSpeech">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {partSpeechOptions.map((option) => {
              const isSelected = selectedPartSpeech.includes(option.value);

              // 定义颜色映射（使用实际的颜色值）
              const colorMap: Record<string, string> = {
                blue: "#1677ff",
                green: "#52c41a",
                orange: "#fa8c16",
                purple: "#722ed1",
                red: "#f5222d",
                cyan: "#13c2c2",
                volcano: "#fa541c",
                magenta: "#eb2f96",
                default: "#d9d9d9",
              };

              const bgColor = colorMap[option.color] || "#d9d9d9";

              return (
                <Tag.CheckableTag
                  key={option.value}
                  checked={isSelected}
                  onChange={() => handlePartSpeechClick(option.value)}
                  style={{
                    padding: "4px 12px",
                    fontSize: "14px",
                    border: isSelected
                      ? `1px solid ${bgColor}`
                      : "1px solid #d9d9d9",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? bgColor : "transparent",
                    color: isSelected ? "#fff" : "#666",
                    fontWeight: isSelected ? 500 : 400,
                    transition: "all 0.3s ease",
                  }}
                >
                  {option.label}
                </Tag.CheckableTag>
              );
            })}
          </div>
        </Form.Item>

        {/* 中文 - 独立一行 */}
        <Form.Item label="中文" name="englishChinese">
          <TextArea rows={2} allowClear />
        </Form.Item>

        {/* 图片 - 独立一行 */}
        <Form.Item label="图片" name="englishImg">
          <Upload customRequest={customRequest} onChange={onChange}>
            <Button icon={<UploadOutlined />}>点击上传</Button>
          </Upload>
        </Form.Item>

        {/* 笔记 - 独立一行 */}
        <Form.Item label="笔记" name="englishNote">
          <TextArea rows={4} allowClear />
        </Form.Item>

        {/* 引用 - 独立一行 */}
        <Form.Item label="引用" name="englishReference">
          <Input allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
};
