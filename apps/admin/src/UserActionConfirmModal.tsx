import { useState } from "react";
import { Button, Input, Modal, Typography } from "antd";
import type { AdminUserItem } from "./api/notification.type";

export type UserAction = "ban" | "unban" | "delete";

interface UserActionConfirmModalProps {
  open: boolean;
  action: UserAction;
  user?: AdminUserItem;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (confirmUsername: string) => Promise<void>;
}

const actionLabels: Record<UserAction, string> = {
  ban: "封禁",
  unban: "解封",
  delete: "永久删除",
};

export function UserActionConfirmModal({
  open,
  action,
  user,
  loading,
  onCancel,
  onConfirm,
}: UserActionConfirmModalProps) {
  const [step, setStep] = useState(1);
  const [typedUsername, setTypedUsername] = useState("");
  const actionLabel = actionLabels[action];
  const isDelete = action === "delete";

  const close = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal
      open={open}
      title={step === 1 ? `确认${actionLabel}` : `再次确认${actionLabel}`}
      onCancel={close}
      closable={!loading}
      maskClosable={!loading}
      keyboard={!loading}
      footer={
        step === 1 ? (
          <>
            <Button onClick={close} disabled={loading}>
              取消
            </Button>
            <Button type="primary" danger={isDelete || action === "ban"} onClick={() => setStep(2)}>
              继续确认
            </Button>
          </>
        ) : (
          <>
            <Button onClick={close} disabled={loading}>
              取消
            </Button>
            <Button
              type="primary"
              danger={isDelete || action === "ban"}
              loading={loading}
              disabled={typedUsername !== user?.username}
              onClick={() => void onConfirm(typedUsername)}
            >
              确认{actionLabel}
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <Typography.Paragraph className="user-action-confirm-copy">
          你将{actionLabel}用户 <Typography.Text strong>{user?.username}</Typography.Text>。
          {isDelete ? " 此操作会永久删除其单词、背词、练习和通知记录，且无法恢复。" : " 请确认这是预期操作。"}
        </Typography.Paragraph>
      ) : (
        <div className="user-action-confirm-form">
          <Typography.Paragraph>
            请输入用户名 <Typography.Text strong>{user?.username}</Typography.Text> 以继续{actionLabel}。
          </Typography.Paragraph>
          <Input
            aria-label="输入用户名以确认"
            value={typedUsername}
            onChange={(event) => setTypedUsername(event.target.value)}
            autoComplete="off"
            disabled={loading}
          />
        </div>
      )}
    </Modal>
  );
}
