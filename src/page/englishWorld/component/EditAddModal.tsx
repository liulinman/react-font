import { useEffect } from "react";
import { Modal, Form, Input, Select } from "antd";
import { WordList } from "@/server/word/word.type";
import TextArea from "antd/es/input/TextArea";

interface Props {
  isModalVisible: boolean;
  currentRecord?: WordList | null;
  type: "edit" | "add";
  onOk: (data: WordList) => void;
  onCancel: () => void;
}

export const EditAddModal = (props: Props) => {
  const { isModalVisible, currentRecord, type, onOk, onCancel } = props;

  // 初始化表单数据
  const [form] = Form.useForm();

  // 如果是编辑，表单预填充 currentRecord 数据
  useEffect(() => {
    if (type === "edit" && currentRecord) {
      form.setFieldsValue(currentRecord);
    }
  }, [type, currentRecord, form]);

  const handleModalOk = () => {
    // 获取表单数据并调用 onOk 提交
    form
      .validateFields()
      .then((values) => {
        onOk(values);
        form.resetFields();
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleModalCancel = () => {
    // 关闭模态框时清空表单数据
    form.resetFields();
    onCancel();
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
    >
      {/* 编辑/添加表单 */}
      <Form form={form} layout="vertical">
        <Form.Item
          label="单词名"
          name="englishWord"
          rules={[{ required: true, message: "请输入单词名" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="音标" name="englishPhonetic">
          <Input />
        </Form.Item>
        <Form.Item label="中文" name="englishChinese">
          <Input />
        </Form.Item>
        <Form.Item label="图片" name="englishImg">
          <Input />
        </Form.Item>
        <Form.Item label="类型" name="englishType">
          <Select>
            <Select.Option value={"0"}>单词</Select.Option>
            <Select.Option value={"1"}>短语</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="笔记" name="englishNote">
          <TextArea allowClear />
        </Form.Item>
        <Form.Item
          label="掌握程度"
          name="englishLevel"
          rules={[{ required: true, message: "请选择掌握程度" }]}
        >
          <Select>
            <Select.Option value={"0"}>不会</Select.Option>
            <Select.Option value={"1"}>一般</Select.Option>
            <Select.Option value={"2"}>熟练</Select.Option>
            <Select.Option value={"3"}>精通</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="引用" name="englishReference">
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
