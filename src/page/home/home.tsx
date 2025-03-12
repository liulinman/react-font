import React, { useEffect } from "react";
import request from "../../utils/axios/axios";
import { wordFindList } from "../../server/word/word";
import { Button } from "antd";

const Home: React.FC = () => {
  useEffect(() => {
    getList();
  }, []);
  const getList = async () => {
    await request(wordFindList());
  };

  return (
    <div>
      首页<span>自动化部署1.4</span>
      <Button type="primary">Primary Button</Button>
    </div>
  );
};

export default Home;
