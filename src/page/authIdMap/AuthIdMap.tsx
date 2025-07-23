import React, { useState } from "react";
import { Input, message, Select, Button } from "antd";
import { useStyles } from "./home.style";
import { findModel, userCreate, getAuthIdOption } from "@/server/authId/authId";
import request from "@/utils/axios/axios";

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

  const handleChange = (e: any) => {
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

    const res: any = await request(findModel({ model: selectedModule }));
    if (res.data.code === 200) {
      message.success("查询成功");
      const { list } = res.data;
      setFormattedData(formatData(JSON.stringify(list)));
    } else {
      message.error("查询失败，请稍后再试");
    }
  };

  const getLabel = async () => {
    const res: any = await request(getAuthIdOption());
    if (res.code === 200) {
      const { data = [] } = res;
      setOptions(data);
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
