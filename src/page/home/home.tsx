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

  return <div>首页</div>;
};

export default Home;
