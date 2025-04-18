import React, { useEffect } from "react";
import request from "../../utils/axios/axios";
import { wordFindList } from "../../server/word/word";

const Home: React.FC = () => {
  useEffect(() => {
    getList();
  }, []);
  const getList = async () => {
    await request(wordFindList());
  };

  return (
    <div>
      <div>当前版本号：{process.env.APP_VERSION}</div>
    </div>
  );
};

export default Home;
