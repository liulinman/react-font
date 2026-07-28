import { Modal, Tag, Typography } from "antd";
import type { ImportMissingWordsPreviewResult } from "@/server/word/word.type";

const { Text } = Typography;

type BulkImportConflictModalProps = {
  confirming: boolean;
  conflict: ImportMissingWordsPreviewResult | null;
  onCancel: () => void;
  onContinue: () => void;
};

function WordListPreview({
  label,
  words,
}: {
  label: string;
  words: string[];
}) {
  if (words.length === 0) return null;

  return (
    <div className="bulk-import-conflict-group">
      <Text strong>{label}</Text>
      <div className="bulk-import-conflict-words">
        {words.slice(0, 10).map((word) => (
          <Tag key={word}>{word}</Tag>
        ))}
        {words.length > 10 && <Text type="secondary">等 {words.length} 个</Text>}
      </div>
    </div>
  );
}

export function BulkImportConflictModal({
  confirming,
  conflict,
  onCancel,
  onContinue,
}: BulkImportConflictModalProps) {
  return (
    <Modal
      cancelButtonProps={{ disabled: confirming }}
      cancelText="返回检查"
      centered
      closable={!confirming}
      destroyOnHidden
      maskClosable={!confirming}
      okText="继续导入"
      confirmLoading={confirming}
      onCancel={onCancel}
      onOk={onContinue}
      open={Boolean(conflict)}
      title="发现已有或重复词条，是否继续？"
      width={520}
    >
      {conflict && (
        <div className="bulk-import-conflict-content">
          <Text>
            词库中已存在 {conflict.skippedExisting} 个，本次输入重复{" "}
            {conflict.skippedDuplicate} 个。继续后将新增 {conflict.importable}{" "}
            个词条，被跳过的词不会覆盖原内容。
          </Text>
          <WordListPreview label="词库中已存在" words={conflict.existingWords} />
          <WordListPreview label="本次输入重复" words={conflict.duplicateWords} />
        </div>
      )}
    </Modal>
  );
}
