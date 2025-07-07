import React, { useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { Button } from "antd";

const Home: React.FC = () => {
  const navigate = useNavigate();

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
    </div>
  );
};

export default Home;
