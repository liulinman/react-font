import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => {
  // 定义样式
  const transferSlash = css`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `;

  const formDiv = css`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -100%);
    width: 800px;
    height: 200px;
    background-color: pink;
  `;

  // 返回样式对象
  return {
    formDiv,
    transferSlash,
  };
});
