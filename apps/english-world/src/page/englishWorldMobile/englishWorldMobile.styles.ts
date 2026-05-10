import { createStyles } from "antd-style";

export const useMobileStyles = createStyles(({ css }) => ({
  root: css`
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f5f5;

    /* 防止 iOS 聚焦输入框时自动放大 */
    input,
    textarea,
    .adm-input,
    .adm-text-area {
      font-size: 16px !important;
    }
    .adm-input-element,
    .adm-text-area-element {
      font-size: 16px !important;
    }
  `,
  content: css`
    flex: 1;
    overflow-y: auto;
    padding-bottom: 80px;
  `,
  searchSection: css`
    padding: 12px;
    background-color: #fff;
    border-bottom: 1px solid #f0f0f0;
  `,
  wordList: css`
    padding: 12px;
  `,
  wordCard: css`
    margin-bottom: 12px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  `,
  wordCardHeader: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
  `,
  wordTitle: css`
    font-size: 18px;
    font-weight: 600;
    color: #1677ff;
  `,
  wordPhonetic: css`
    font-size: 14px;
    color: #8c8c8c;
    font-style: italic;
  `,
  wordCardBody: css`
    margin-top: 12px;
  `,
  wordImage: css`
    margin-bottom: 12px;
  `,
  wordInfo: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  wordChinese: css`
    font-size: 16px;
    color: #262626;
    line-height: 1.5;
  `,
  wordTags: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  `,
  wordNote: css`
    margin-top: 8px;
    padding: 8px;
    background-color: #fafafa;
    border-radius: 6px;
  `,
  noteLabel: css`
    font-size: 12px;
    color: #8c8c8c;
    margin-bottom: 4px;
  `,
  noteContent: css`
    font-size: 14px;
    color: #595959;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  `,
  wordReference: css`
    margin-top: 8px;
  `,
  referenceLink: css`
    color: #1677ff;
    font-size: 14px;
    text-decoration: none;

    &:active {
      opacity: 0.7;
    }
  `,
  fabContainer: css`
    position: fixed;
    right: 20px;
    bottom: 80px;
    z-index: 100;
  `,
  filterPopup: css`
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #fff;
  `,
  pickerTrigger: css`
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 6px;
    color: #262626;
  `,
  filterActions: css`
    padding: 16px;
    background-color: #fff;
    border-top: 1px solid #f0f0f0;
    margin-top: auto;
  `,
  editModal: css`
    height: 80vh;
    display: flex;
    flex-direction: column;
    background-color: #fff;
  `,
  editFormContainer: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px;

    .adm-form-item-label {
      font-weight: 500;
      color: #262626;
    }
  `,
}));
