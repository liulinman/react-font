import React, { useState } from "react";

import { Button, GetProps, Input, message } from "antd";
import { useStyles } from "./home.style";
import { findModel, userCreate } from "@/server/authId/authId";
import request from "@/utils/axios/axios";

const { Search } = Input;
type SearchProps = GetProps<typeof Input.Search>;

const AuthIdMap: React.FC = () => {
  const [formattedData, setFormattedData] = useState("");

  const { styles } = useStyles();

  // 解析和格式化 JSON 数据
  const formatData = (data: string) => {
    try {
      const parsedData = JSON.parse(data);
      return JSON.stringify(parsedData, null, 2); // 格式化为可读的 JSON 字符串
    } catch {
      message.error("数据格式错误！");
      return "";
    }
  };

  const onUploadCookie = async (value: string) => {
    const res = await request(
      userCreate({
        cookieValue: value.trim(),
        type: "authId",
      })
    );
    if (res) {
      message.success("添加cookie成功!");
    }

    console.log(res);
  };

  // 处理 textarea 中的数据变化
  const handleChange = (e: any) => {
    setFormattedData(e.target.value);
  };

  // 复制数据到剪贴板
  const handleCopy = () => {
    navigator.clipboard.writeText(formattedData).then(
      () => {
        message.success("已复制到剪贴板！");
      },
      () => {
        message.error("复制失败！");
      }
    );
  };

  const onSearch: SearchProps["onSearch"] = async (value) => {
    const res: any = await request(findModel({ model: value.trim() }));
    if (res.code === 200) {
      message.success("查找成功");
      const { list } = res.data;
      setFormattedData(formatData(JSON.stringify(list)));
    }
  };

  return (
    <div className={styles.HomePage}>
      {/* <h2>JSON 数据编辑</h2> */}
      <div>
        <Search
          placeholder="请输入cookie"
          allowClear
          enterButton="上传cookie"
          size="middle"
          style={{ width: 800, marginBottom: 40 }}
          onSearch={onUploadCookie}
        />
      </div>
      <div>
        <Search
          placeholder="请输入模块名称"
          allowClear
          enterButton="查找"
          size="middle"
          style={{ width: 300, marginBottom: 40 }}
          onSearch={onSearch}
        />
      </div>
      <textarea
        rows={15}
        style={{ width: "50%", fontFamily: "monospace", fontSize: "14px" }}
        value={formattedData}
        onChange={handleChange}
      />
      <div style={{ marginTop: 20 }}>
        <Button type="primary" onClick={handleCopy}>
          一键复制
        </Button>
      </div>
    </div>
  );
};

export default AuthIdMap;
