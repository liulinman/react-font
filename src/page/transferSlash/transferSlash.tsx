import React from "react";
import { Button, Form, Input, message, Space } from "antd";

import "./transferSlash.less";

type FieldType = {
  interfaceUrl?: string;
  transferInterfaceUrl?: string;
};

const TransferSlash: React.FC = () => {
  const [form] = Form.useForm();

  const handleTransfer = () => {
    const interfaceUrl = form.getFieldValue("interfaceUrl");
    const parts = interfaceUrl.split("/");

    // 遍历每个部分，只有在索引大于 0 时，才将第一个字符转换为大写
    const result = parts.map((part: string, index: number) => {
      if (index === 0) return part; // 第一个部分不转换
      return part.charAt(0).toUpperCase() + part.slice(1); // 其余部分首字母大写
    });

    // 将数组重新拼接成一个字符串，不使用分隔符
    const transformedStr = result.join("");

    form.setFieldValue("transferInterfaceUrl", transformedStr);
  };

  // 复制转换格式的函数
  const handleCopy = () => {
    const transferInterfaceUrl = form.getFieldValue("transferInterfaceUrl");

    if (!transferInterfaceUrl) {
      message.error("没有转换结果可以复制");
      return;
    }

    // 将转换格式复制到剪贴板
    navigator.clipboard
      .writeText(transferInterfaceUrl)
      .then(() => {
        message.success("转换格式已经复制");
      })
      .catch(() => {
        message.error("复制失败，请重试");
      });
  };

  return (
    <Form
      form={form}
      name="basic"
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      style={{ maxWidth: 600 }}
      initialValues={{ remember: true }}
      autoComplete="off"
      className="transferSlash"
    >
      <Form.Item<FieldType>
        label="接口路径"
        name="interfaceUrl"
        rules={[{ required: true, message: "请输入url路径" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<FieldType> label="转换格式" name="transferInterfaceUrl">
        <Input />
      </Form.Item>

      <Form.Item label={null}>
        <Space>
          <Button type="primary" onClick={handleTransfer}>
            转换
          </Button>
          <Button color="purple" variant="filled" onClick={handleCopy}>
            复制转换格式
          </Button>
          <Button color="danger" onClick={() => form.resetFields()}>
            清空
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default TransferSlash;
