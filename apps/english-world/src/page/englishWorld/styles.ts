import { createStyles } from "antd-style";

export const useStyles = createStyles(({ css }) => ({
  tableCompact: css`
    .ant-table-cell {
      padding-top: 6px;
      padding-bottom: 6px;
    }
  `,
  /* 掌握程度行边条 */
  levelStripe: css`
    &.level-0 {
      border-left: 4px solid #f5222d;
    }
    &.level-1 {
      border-left: 4px solid #fa8c16;
    }
    &.level-2 {
      border-left: 4px solid #1677ff;
    }
    &.level-3 {
      border-left: 4px solid #52c41a;
    }
  `,
}));
