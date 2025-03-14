/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-03-14 13:53:26
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-03-14 17:52:42
 * @FilePath: \font\src\page\user\userList\userList.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from "react";

import { Table } from "antd";
import request from "../../../utils/axios/axios";
import { userFindList } from "../../../server/user/user";

const columns = [
  {
    title: "姓名",
    dataIndex: "userName",
    key: "userName",
  },
  {
    title: "手机",
    dataIndex: "userPhone",
    key: "userPhone",
  },
  {
    title: "性别",
    dataIndex: "userSex",
    key: "userSex",
  },
  {
    title: "年龄",
    dataIndex: "userAge",
    key: "userAge",
  },
];

const UserList: React.FC = () => {
  const [dataSource, setDataSource] = useState([]);
  const channel = new BroadcastChannel("ADD");
  channel.onmessage = function (event) {
    console.log("Received message:", event.data);
    if (event.data === "UPDATE") {
      getUsetList();
    }
  };

  useEffect(() => {
    getUsetList();
  }, []);

  const getUsetList = async () => {
    const res: any = await request(userFindList());
    setDataSource(res?.data);
  };

  return (
    <div>
      <Table dataSource={dataSource} columns={columns} />;
    </div>
  );
};

export default UserList;
