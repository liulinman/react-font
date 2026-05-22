/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-03-14 13:53:26
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-03-17 11:14:17
 * @FilePath: \font\src\page\user\userList\userList.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useCallback, useEffect, useState } from "react";

import { Table } from "antd";
import request from "@font/api";
import { userFindList } from "@/server/user/user";

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

type UserRow = {
  key?: React.Key;
  userName?: string;
  userPhone?: string;
  userSex?: string;
  userAge?: number;
};

const UserList: React.FC = () => {
  const [dataSource, setDataSource] = useState<UserRow[]>([]);

  const getUserList = useCallback(async () => {
    const res = await request<{ data?: UserRow[] }>(userFindList());
    setDataSource(res?.data ?? []);
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel("ADD");
    channel.onmessage = (event) => {
      if (event.data === "UPDATE") {
        void getUserList();
      }
    };

    const timer = window.setTimeout(() => {
      void getUserList();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      channel.close();
    };
  }, [getUserList]);

  return (
    <div>
      <Table dataSource={dataSource} columns={columns} />;
    </div>
  );
};

export default UserList;
