import { createStyles } from "antd-style";

export const useLoginStyles = createStyles(({ css }) => ({
  card: css`
    width: 100%;
    max-width: 420px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    border-radius: 12px;

    .ant-card-head-title {
      text-align: center;
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }

    .ant-tabs-tab {
      font-size: 16px;
      padding: 12px 24px;
    }

    .ant-form-item {
      margin-bottom: 20px;
    }

    .ant-input-affix-wrapper,
    .ant-input {
      border-radius: 6px;
    }

    .ant-btn-primary {
      height: 44px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
    }

    .ant-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
      transition: all 0.3s;
    }
  `,
}));
