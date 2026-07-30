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

  const tableExpand = css`
    /* 移除了不需要的右侧固定提示 */
  `;

  // 返回样式对象
  return {
    HomePage,
    tableExpand,
  };
});
