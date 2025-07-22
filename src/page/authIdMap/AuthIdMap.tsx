import React, { useState } from "react";

import { GetProps, Input, message } from "antd";
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
    if (!value.trim() || value.trim() === "") return;
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

  // const copyToClipboard = () => {
  //   const text = formattedData;
  //   if (!text) {
  //     message.error("没有内容可以复制");
  //     return;
  //   }

  //   if (navigator.clipboard && navigator.clipboard?.writeText) {
  //     // 使用现代的 clipboard API
  //     navigator.clipboard
  //       .writeText(text)
  //       .then(() => {
  //         message.success("内容已复制到剪贴板");
  //       })
  //       .catch(() => {
  //         message.error("复制失败，请重试");
  //       });
  //   } else {
  //     // 提示用户手动复制
  //     // 旧浏览器回退方案
  //     let textArea = document.createElement("textarea");
  //     textArea.value = text;
  //     textArea.style.top = "0";
  //     textArea.style.left = "0";
  //     textArea.style.position = "fixed";
  //     document.body.appendChild(textArea);
  //     textArea.focus();
  //     textArea.select();
  //     try {
  //       let successful = document.execCommand("copy");
  //       let msg = successful ? "successful" : "unsuccessful";
  //       console.log("Fallback: Copying text command was " + msg);
  //     } catch (err) {
  //       console.error("Fallback: Oops, unable to copy", err);
  //     }
  //     document.body.removeChild(textArea);
  //     message.success("复制成功");
  //   }
  // };

  const onSearch: SearchProps["onSearch"] = async (value) => {
    if (!value.trim() || value.trim() === "") return;
    const res: any = await request(findModel({ model: value.trim() }));
    if (res.data.code === 200) {
      message.success("查找成功");
      const { list } = res.data;
      setFormattedData(formatData(JSON.stringify(list)));
    } else if (res.data.code === 8001) {
      message.info(res.data.message);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <textarea
          rows={15}
          style={{
            width: "35%",
            height: "60%",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
          value={formattedData}
          onChange={handleChange}
        />
        {/* <Button type="primary" onClick={copyToClipboard}>
          转换成英文
        </Button>
        <textarea
          rows={15}
          style={{
            width: "35%",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
          value={formattedData}
          onChange={handleChange}
        /> */}
      </div>
      {/* <div style={{ marginTop: 20 }}>
        <Button type="primary" onClick={copyToClipboard}>
          一键复制
        </Button>
      </div> */}
    </div>
  );
};

export default AuthIdMap;
