import { Modal, Form, Input, Select, Upload, Button, message, Tag } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";
import { WordList } from "@/server/word/word.type";
import request from "@/utils/axios/axios";
import { uploadFile } from "@/server";
import { useEffect, useState } from "react";
import { enumToOptions } from "@/utils";
import { EnglishAbsorb, EnglishPartSpeech, EnglishType } from "../enum";

interface Props {
  isModalVisible: boolean;
  currentRecord?: WordList | null;
  type: "edit" | "add";
  onOk: (data: WordList, type: "edit" | "add") => void;
  onCancel: () => void;
}

type FormValues = {
  englishWord: string;
  englishLevel: string;
  englishType: string;
  englishPhonetic?: string;
  englishPartSpeech?: number[];
  englishChinese?: string;
  englishImg?: string;
  englishNote?: string;
  englishReference?: string;
};

export const EditAddModal = (props: Props) => {
  const { isModalVisible, currentRecord, type, onOk, onCancel } = props;

  // 初始化表单数据
  const [form] = Form.useForm();
  const [selectedPartSpeech, setSelectedPartSpeech] = useState<number[]>([]);

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

  // 如果是编辑，表单预填充 currentRecord 数据
  useEffect(() => {
    if (type === "edit" && currentRecord) {
      form.setFieldsValue(currentRecord);
      setSelectedPartSpeech(currentRecord.englishPartSpeech || []);
    } else {
      form.resetFields();
      setSelectedPartSpeech([]);
    }
  }, [type, currentRecord, form]);

  const handleModalOk = () => {
    // 获取表单数据并调用 onOk 提交
    form
      .validateFields()
      .then((value) => {
        const values =
          type === "add" ? value : { ...value, id: currentRecord?.id };
        onOk({ ...values }, type);
        if (type === "add") {
          form.resetFields();
          setSelectedPartSpeech([]);
        }
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleModalCancel = () => {
    // 关闭模态框时清空表单数据
    onCancel();
  };

  const onValuesChange = (changedValues: FormValues) => {
    const { englishWord } = changedValues;
    if (englishWord) {
      // 开始决定掌握程度和类型
      const isPhrase = englishWord.trim().includes(" ");
      form.setFieldsValue({
        englishLevel: "0",
        englishType: isPhrase ? "1" : "0",
        englishPartSpeech: [9],
      });
      setSelectedPartSpeech([9]);
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
  const onChange = (info: any) => {
    if (info.file.status === "uploading") {
      return;
    }
    if (info.file.status === "done") {
      message.success(`${info.file.name} 上传成功`);
      const { response } = info.file;
      form.setFieldsValue({ englishImg: response.data });
    } else if (info.file.status === "error") {
      message.error(`${info.file.name} 上传失败`);
    }
  };

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      // 直接使用文件对象创建FormData
      const formData = new FormData();
      formData.append("file", file);

      // 模拟上传进度
      onProgress({ percent: 0 });

      const response = await request(uploadFile(formData));

      // 上传成功
      onSuccess(response, file);
    } catch (error) {
      console.error("File upload failed", error);
      onError(error);
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
      styles={{
        body: { maxHeight: "500px", overflowY: "auto", padding: "10px" },
      }}
    >
      {/* 编辑/添加表单 */}
      <Form form={form} onValuesChange={onValuesChange} layout="vertical">
        <Form.Item
          label="单词名"
          name="englishWord"
          rules={[{ required: true, message: "请输入单词名" }]}
        >
          <Input allowClear />
        </Form.Item>
        <Form.Item
          label="掌握程度"
          name="englishLevel"
          rules={[{ required: true, message: "请选择掌握程度" }]}
        >
          <Select options={enumToOptions(EnglishAbsorb)} />
        </Form.Item>
        <Form.Item
          label="类型"
          name="englishType"
          rules={[{ required: true, message: "请选择类型" }]}
        >
          <Select options={enumToOptions(EnglishType)} allowClear />
        </Form.Item>
        <Form.Item label="音标" name="englishPhonetic">
          <Input allowClear />
        </Form.Item>
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
        <Form.Item label="中文" name="englishChinese">
          <TextArea rows={4} allowClear />
        </Form.Item>
        <Form.Item label="图片" name="englishImg">
          <Upload customRequest={customRequest} onChange={onChange}>
            <Button icon={<UploadOutlined />}>点击上传</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="笔记" name="englishNote">
          <TextArea rows={4} allowClear />
        </Form.Item>

        <Form.Item label="引用" name="englishReference">
          <Input allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
};
