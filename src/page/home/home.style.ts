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
    .ant-table-tbody {
      position: relative; /* 继续保持相对定位 */
    }

    .ant-table-tbody::after {
      content: "展开";
      display: flex; /* 使用 flexbox 来居中内容 */
      justify-content: center; /* 水平居中 */
      align-items: center; /* 垂直居中 */
      width: 60px;
      height: 100%; /* 保持伪元素占满容器高度 */
      position: fixed;
      top: 0;
      right: 0;
      background-color: #fff;
      z-index: 1; /* 调整层级，如果需要可减少该值 */
      /* 防止伪元素的高度影响内容 */
      pointer-events: none; /* 确保伪元素不会捕获鼠标事件 */
    }
  `;

  // 返回样式对象
  return {
    HomePage,
    tableExpand,
  };
});
