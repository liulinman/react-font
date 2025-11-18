import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => {
  const tableCompact = css`
    .ant-table-cell {
      padding-top: 6px;
      padding-bottom: 6px;
    }
  `;

  return {
    tableCompact,
  };
});

