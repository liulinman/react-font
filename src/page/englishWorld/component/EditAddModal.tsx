import { useEffect } from "react";
import { Modal, Form, Input, Select } from "antd";
import { WordList } from "@/server/word/word.type";
import TextArea from "antd/es/input/TextArea";

interface Props {
  isModalVisible: boolean;
  currentRecord?: WordList | null;
  type: "edit" | "add";
  onOk: (data: WordList, type: "edit" | "add") => void;
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
      })
      .catch((info) => {
        console.log("Validate Failed:", info);
      });
  };

  const handleModalCancel = () => {
    // 关闭模态框时清空表单数据
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
      styles={{
        body: { maxHeight: "500px", overflowY: "auto", padding: "10px" },
      }}
    >
      {/* 编辑/添加表单 */}
      <Form form={form} layout="vertical">
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
          <Input allowClear />
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
