import React from "react";
import { Button, Form, Input, InputNumber } from "antd";
import { log } from "console";
import request from "../../../utils/axios/axios";
import { userAdd } from "../../../server/user/user";

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

const validateMessages = {
  required: "${label} is required!",
  types: {
    email: "${label} is not a valid email!",
    number: "${label} is not a valid number!",
  },
  number: {
    range: "${label} must be between ${min} and ${max}",
  },
};

const onFinish = async (values: any) => {
  console.log(`values`, values);

  console.log(values);

  const res = await request(userAdd(values));
  const channel = new BroadcastChannel("ADD");
  channel.postMessage("UPDATE");
};

const UserAdd: React.FC = () => {
  return (
    <Form
      {...layout}
      name="nest-messages"
      onFinish={onFinish}
      style={{ maxWidth: 600 }}
      validateMessages={validateMessages}
    >
      <Form.Item name={"userName"} label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      {/* <Form.Item
      name={["user", "email"]}
      label="Email"
      rules={[{ type: "email" }]}
    >
      <Input />
    </Form.Item> */}
      <Form.Item name={"userPassword"} label="userPassword">
        <Input />
      </Form.Item>
      <Form.Item name={"userPhone"} label="userPhone">
        <Input />
      </Form.Item>
      <Form.Item name={"userSex"} label="userSex">
        <Input />
      </Form.Item>
      <Form.Item
        name={"userAge"}
        label="Age"
        rules={[{ type: "number", min: 0, max: 99 }]}
      >
        <InputNumber />
      </Form.Item>

      <Form.Item label={null}>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};

export default UserAdd;
