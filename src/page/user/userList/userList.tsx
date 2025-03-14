import React, { useEffect, useState } from "react";

import { Button, Table } from "antd";
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
    const res = await request(userFindList());
    setDataSource(res.data);
  };

  return (
    <div>
      <Table dataSource={dataSource} columns={columns} />;
    </div>
  );
};

export default UserList;
