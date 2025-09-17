import { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Upload, Button, message } from "antd";
import { WordList } from "@/server/word/word.type";
import TextArea from "antd/es/input/TextArea";
import { UploadOutlined } from "@ant-design/icons";

import request from "@/utils/axios/axios";
import { uploadFile } from "@/server/word/word";

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
  englishChinese?: string;
  englishImg?: string;
  englishNote?: string;
  englishReference?: string;
};

export const EditAddModal = (props: Props) => {
  const { isModalVisible, currentRecord, type, onOk, onCancel } = props;
  const [uploadLoading, setUploadLoading] = useState(false);

  // 初始化表单数据
  const [form] = Form.useForm();

  // 如果是编辑，表单预填充 currentRecord 数据
  useEffect(() => {
    if (type === "edit" && currentRecord) {
      form.setFieldsValue(currentRecord);
    } else {
      form.resetFields();
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
      });
    }
  };

  // 上传文件处理方法
  const onChange = (info: any) => {
    if (info.file.status === "uploading") {
      setUploadLoading(true);
      return;
    }
    if (info.file.status === "done") {
      setUploadLoading(false);
      message.success(`${info.file.name} 上传成功`);
      // 假设后端返回的数据结构为 { data: { url: string } }
      const uploadedUrl =
        info.file.response?.data?.url || info.file.response?.url;
      if (uploadedUrl) {
        form.setFieldsValue({ englishImg: uploadedUrl });
      }
    } else if (info.file.status === "error") {
      setUploadLoading(false);
      message.error(`${info.file.name} 上传失败`);
    }
  };

  const customRequest = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      // 直接使用文件对象创建FormData
      const fileBlob = new Blob([file], { type: file.type });

      // 模拟上传进度
      onProgress({ percent: 0 });

      // 发送请求
      const result = await request(uploadFile({ file: fileBlob }));

      // 上传成功
      onSuccess(result, file);
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
      destroyOnClose
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
          <Select allowClear>
            <Select.Option value={"0"}>不会</Select.Option>
            <Select.Option value={"1"}>一般</Select.Option>
            <Select.Option value={"2"}>熟练</Select.Option>
            <Select.Option value={"3"}>精通</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label="类型"
          name="englishType"
          rules={[{ required: true, message: "请选择类型" }]}
        >
          <Select allowClear>
            <Select.Option value={"0"}>单词</Select.Option>
            <Select.Option value={"1"}>短语</Select.Option>
            <Select.Option value={"2"}>句子</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="音标" name="englishPhonetic">
          <Input allowClear />
        </Form.Item>
        <Form.Item label="中文" name="englishChinese">
          <Input allowClear />
        </Form.Item>
        <Form.Item label="图片" name="englishImg">
          <Upload
            customRequest={customRequest}
            onChange={onChange}
            // showUploadList={false}
          >
            <Button icon={<UploadOutlined />} loading={uploadLoading}>
              点击上传
            </Button>
          </Upload>
          {/* {form.getFieldValue("englishImg") && (
            <div style={{ marginTop: 8 }}>
              <img
                src={form.getFieldValue("englishImg")}
                alt="预览"
                style={{ maxWidth: "100%", maxHeight: 200 }}
              />
            </div>
          )} */}
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
