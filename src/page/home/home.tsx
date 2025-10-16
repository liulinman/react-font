import React, { useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { Button, Table } from "antd";
import { useStyles } from "./home.style";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { styles } = useStyles();

  // useEffect(() => {
  //   getList();
  // }, []);
  // const getList = async () => {
  //   await request(wordFindList());
  // };

  const routeToNavigate = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  const data = [];
  const names = ["John", "Jane", "Alice", "Bob", "Charlie"];
  const addresses = ["New York", "London", "Paris", "Berlin", "Madrid"];
  const details = [
    "John is a software engineer.",
    "Jane is a designer.",
    "Alice is a doctor.",
    "Bob is a lawyer.",
    "Charlie is a teacher.",
  ];

  for (let i = 1; i <= 100; i++) {
    const randomName = names[i % names.length];
    const randomAddress = addresses[i % addresses.length];
    const randomDetails = details[i % details.length];
    const age = Math.floor(Math.random() * (60 - 20 + 1)) + 20; // 随机年龄范围在20到60之间

    data.push({
      key: String(i),
      name: randomName,
      age: age,
      address: randomAddress,
      details: randomDetails,
    });
  }

  const columns = [
    { title: "Name", dataIndex: "name", key: "name", width: 150 },
    { title: "Age", dataIndex: "age", key: "age", width: 100 },
    { title: "Address", dataIndex: "address", key: "address", width: 200 },
    { title: "Details", dataIndex: "details", key: "details", width: 300 },
    {
      title: "Occupation",
      dataIndex: "occupation",
      key: "occupation",
      width: 150,
    },
    { title: "Country", dataIndex: "country", key: "country", width: 100 },
    { title: "City", dataIndex: "city", key: "city", width: 100 },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 150 },
    { title: "Email", dataIndex: "email", key: "email", width: 200 },
    { title: "Phone2", dataIndex: "phone", key: "phone", width: 150 },
    { title: "Email2", dataIndex: "email", key: "email", width: 200 },
    { title: "Phone3", dataIndex: "phone", key: "phone", width: 150 },
    { title: "Email3", dataIndex: "email", key: "email", width: 200 },
  ];

  return (
    <div>
      {/* <div>当前版本号：{1.0}</div> */}
      <Button onClick={() => routeToNavigate("/transferSlash")}>
        路径转化
      </Button>
      {/* <Button onClick={() => routeToNavigate("/englishWorld")}>英语单词</Button> */}
      <Button onClick={() => routeToNavigate("/authIdMap")}>
        书联调erp权限模块id
      </Button>

      <Table
        dataSource={data}
        columns={columns}
        scroll={{ x: "max-content", y: 500 }}
        className={styles.tableExpand}
      />
    </div>
  );
};

export default Home;
