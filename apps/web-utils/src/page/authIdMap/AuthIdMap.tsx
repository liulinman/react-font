import React, { useState } from "react";
import { Input, message, Select, Button } from "antd";
import { useStyles } from "./home.style";
import { findModel, userCreate, getAuthIdOption } from "@/server/authId/authId";
import request from "@font/api";

const { Search } = Input;

const AuthIdMap: React.FC = () => {
  const [formattedData, setFormattedData] = useState("");
  const [options, setOptions] = useState<{ label: string; value: string }[]>(
    []
  );
  const [selectedModule, setSelectedModule] = useState<string | undefined>(
    undefined
  );

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormattedData(e.target.value);
  };

  // Handle module selection change
  const handleModuleChange = (value: string) => {
    setSelectedModule(value);
  };

  const handleQuery = async () => {
    if (!selectedModule) {
      message.error("请选择一个模块！");
      return;
    }
    try {
      // 拦截器在 code===200 时只返回后端的 data，不是 { code, data, message }
      const data = await request<Record<string, string>>(
        findModel({ model: selectedModule })
      );
      message.success("查询成功");
      setFormattedData(formatData(JSON.stringify(data ?? {})));
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message || "查询失败，请稍后再试");
    }
  };

  // 获取下拉选项：拦截器在 code===200 时只返回后端的 data（选项数组）
  const getLabel = async () => {
    try {
      const data = await request<{ label: string; value: string }[]>(
        getAuthIdOption()
      );
      setOptions(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message || "查询失败，请稍后再试");
    }
  };

  return (
    <>
      <div className={styles.HomePage}>
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
          <Select
            showSearch
            style={{ width: 300, marginBottom: 40 }}
            placeholder="请输入查询模块"
            onFocus={getLabel}
            onChange={handleModuleChange} // Handle module selection
            options={options}
          />
          <Button
            type="primary"
            onClick={handleQuery} // Trigger query when button is clicked
            style={{ marginLeft: "20px" }}
          >
            查询
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <textarea
            rows={30}
            style={{
              width: "50%",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
            value={formattedData}
            onChange={handleChange}
          />
        </div>
      </div>
    </>
  );
};

export default AuthIdMap;
