/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-03-06 10:03:37
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-03-14 17:47:53
 * @FilePath: \font\src\page\home\home.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
      首页<span>自动化部署1.5</span>
      <Button type="primary">Primary Button</Button>
    </div>
  );
};

export default Home;
