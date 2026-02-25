import React from "react";
import { Button, Form, Input, message, Space } from "antd";

import { useStyles } from "./transferSlash.style";

type FieldType = {
  interfaceUrl?: string;
  transferInterfaceUrl?: string;
};

const TransferSlash: React.FC = () => {
  const [form] = Form.useForm();

  const { styles } = useStyles();

  const handleTransfer = () => {
    const interfaceUrl = form.getFieldValue("interfaceUrl");
    if (!interfaceUrl) {
      message.error("没有内容可以复制");
      return;
    }
    const parts = interfaceUrl?.split("/");

    // 遍历每个部分，只有在索引大于 0 时，才将第一个字符转换为大写
    const result = parts?.map((part: string, index: number) => {
      if (index === 0) return part; // 第一个部分不转换
      return part.charAt(0).toUpperCase() + part.slice(1); // 其余部分首字母大写
    });

    // 将数组重新拼接成一个字符串，不使用分隔符
    const transformedStr = result.join("");

    form.setFieldValue("transferInterfaceUrl", transformedStr);
  };

  const copyToClipboard = (text: string) => {
    if (!text) {
      message.error("没有内容可以复制");
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      // 使用现代的 clipboard API
      navigator.clipboard
        .writeText(text)
        .then(() => {
          message.success("内容已复制到剪贴板");
        })
        .catch(() => {
          message.error("复制失败，请重试");
        });
    } else {
      // 提示用户手动复制
      // 旧浏览器回退方案
      let textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        let successful = document.execCommand("copy");
        let msg = successful ? "successful" : "unsuccessful";
        console.log("Fallback: Copying text command was " + msg);
      } catch (err) {
        console.error("Fallback: Oops, unable to copy", err);
      }
      document.body.removeChild(textArea);
      message.success("复制成功");
    }
  };

  const handleCopy = () => {
    const transferInterfaceUrl = form.getFieldValue("transferInterfaceUrl");
    copyToClipboard(transferInterfaceUrl);
  };

  return (
    <div className={styles.formDiv}>
      <Form
        form={form}
        name="basic"
        initialValues={{ remember: true }}
        autoComplete="off"
        className={styles.transferSlash}
      >
        <Form.Item<FieldType> label="接口路径" name="interfaceUrl">
          <Input style={{ width: "400px" }} />
        </Form.Item>

        <Form.Item<FieldType> label="转换格式" name="transferInterfaceUrl">
          <Input style={{ width: "400px" }} />
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
    </div>
  );
};

export default TransferSlash;
