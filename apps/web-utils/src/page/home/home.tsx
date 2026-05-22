import React, { useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { Button, Table } from "antd";
import { useStyles } from "./home.style";

const names = ["John", "Jane", "Alice", "Bob", "Charlie"];
const addresses = ["New York", "London", "Paris", "Berlin", "Madrid"];
const details = [
  "John is a software engineer.",
  "Jane is a designer.",
  "Alice is a doctor.",
  "Bob is a lawyer.",
  "Charlie is a teacher.",
];

const data = Array.from({ length: 100 }, (_, index) => {
  const rowNumber = index + 1;
  return {
    key: String(rowNumber),
    name: names[rowNumber % names.length],
    age: 20 + (rowNumber % 41),
    address: addresses[rowNumber % addresses.length],
    details: details[rowNumber % details.length],
  };
});

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { styles } = useStyles();

  const routeToNavigate = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

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
    <div className="p-4">
      {/* 使用 Tailwind CSS 类名 */}
      <div className="mb-4 flex gap-2">
        <Button onClick={() => routeToNavigate("/transferSlash")}>
          路径转化
        </Button>
        {/* <Button onClick={() => routeToNavigate("/englishWorld")}>英语单词</Button> */}
        <Button onClick={() => routeToNavigate("/authIdMap")}>
          书联调erp权限模块id
        </Button>
      </div>

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
