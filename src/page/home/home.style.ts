import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => {
  // 定义样式

  const HomePage = css`
    position: absolute;
    width: 800px;
    height: 200px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -100%);
    border-radius: 20px;
    background-color: rgb(245, 242, 242);
  `;

  // 返回样式对象
  return {
    HomePage,
  };
});
