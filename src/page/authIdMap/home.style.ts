import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => {
  // 定义样式

  const HomePage = css`
    position: absolute;
    width: 1200px;
    height: 700px;
    padding: 20px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 20px;
    background-color: rgb(245, 242, 242);
  `;

  // 返回样式对象
  return {
    HomePage,
  };
});
