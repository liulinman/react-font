import { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, Table } from "antd";
import request from "@font/api";
import { newRequestId } from "./api/readingPractice";
import type { AdminPractice } from "./api/readingPractice.type";
import { RecipientSelect } from "./RecipientSelect";

type Recipient = {
  assignmentId: number;
  userId: number;
  username: string;
  status: string;
  submitted: boolean;
};
type AssignmentResult = {
  addedCount: number | null;
  skippedCount: number | null;
  legacy?: boolean;
};
export function ReadingPracticeRecipients({
  paper,
  onClose,
  onAssigned,
}: {
  paper: AdminPractice;
  onClose: () => void;
  onAssigned: (paper: AdminPractice) => void;
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const lock = useRef(false);
  const attempt = useRef<{ signature: string; uid: string } | undefined>(
    undefined,
  );
  const loadGeneration = useRef(0);
  const load = async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await request({
        url: `/admin/reading-practices/${paper.id}/recipients`,
        method: "GET",
        __responseType: undefined as unknown as {
          list: Recipient[];
          total: number;
        },
      });
      if (generation === loadGeneration.current) {
        setRecipients(result.list);
        const received = new Set(result.list.map(recipient => recipient.userId));
        setIds(selected => selected.filter(id => !received.has(id)));
      }
    } catch {
      if (generation === loadGeneration.current) setLoadError(true);
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  };
  useEffect(() => {
    void load();
    return () => {
      loadGeneration.current++;
    };
  }, [paper.id]);
  const submit = async () => {
    if (
      lock.current ||
      loading ||
      loadError ||
      !ids.length ||
      ids.length > 1000
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    const signature = JSON.stringify([...ids].sort((a, b) => a - b));
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, uid: newRequestId() };
    try {
      const result = await request({
        url: `/admin/reading-practices/${paper.id}/assign`,
        method: "POST",
        data: { userIds: ids, requestUid: attempt.current.uid },
        __responseType: undefined as unknown as AdminPractice & {
          assignmentResult: AssignmentResult;
        },
      });
      const stats = result.assignmentResult;
      setSuccess(
        stats.legacy
          ? "追加请求已处理；历史请求无法提供准确新增统计，请查看当前名单。"
          : `已追加 ${stats.addedCount} 人，跳过已接收 ${stats.skippedCount} 人。通知将由系统投递。`,
      );
      setIds([]);
      attempt.current = undefined;
      onAssigned(result);
      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          (typeof e?.message === "string" ? e.message : "") ||
          "追加未确认，选择已保留，请重试；若用户已停用，请刷新名单并重新选择。",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title="追加接收人"
      width={720}
      onCancel={() => {
        if (!lock.current) onClose();
      }}
      closable={!busy}
      maskClosable={!busy}
      keyboard={!busy}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            关闭
          </Button>
          <Button
            type="primary"
            aria-label={`确认追加 ${ids.length} 人`}
            loading={busy}
            disabled={
              loading ||
              loadError ||
              !ids.length ||
              ids.length > 1000 ||
              paper.status !== "published"
            }
            onClick={() => void submit()}
          >
            确认追加 {ids.length} 人
          </Button>
        </>
      }
    >
      <h3 style={{ overflowWrap: "anywhere" }}>{paper.title}</h3>
      <p>
        版本 v{paper.workflow?.version || 1} · 已接收 {recipients.length}{" "}
        人（已创建分配）
      </p>
      <Button disabled={busy || loading} onClick={() => void load()}>
        刷新接收名单
      </Button>
      {success && <Alert showIcon type="success" message={success} />}
      {error && <Alert showIcon type="error" message={error} />}
      {loadError && (
        <Alert
          showIcon
          type="error"
          message={
            success
              ? "追加已成功，但名单刷新失败，请重试刷新。"
              : "接收名单加载失败，请重试。"
          }
          action={
            <Button onClick={() => void load()} disabled={busy}>
              重试刷新
            </Button>
          }
        />
      )}
      <Table
        size="small"
        rowKey="userId"
        dataSource={recipients}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "暂无接收人" }}
        columns={[
          {
            title: "用户名 / 用户ID",
            render: (_, r: Recipient) => (
              <span style={{ overflowWrap: "anywhere" }}>
                {r.username} (#{r.userId})
                {r.status !== "active" ? " · 已停用" : ""}
              </span>
            ),
          },
          {
            title: "作答状态",
            width: 100,
            render: (_, r: Recipient) => (r.submitted ? "已提交" : "未提交"),
          },
        ]}
      />
      <h4>选择新增用户</h4>
      <RecipientSelect
        value={ids}
        disabled={busy || loading || loadError}
        disabledIds={recipients.map((r) => r.userId)}
        onChange={(next) => {
          setIds(next.filter((id) => !recipients.some((r) => r.userId === id)));
          attempt.current = undefined;
          setError("");
          setSuccess("");
        }}
      />
      <p>
        本次新增 {ids.length} 人。每次最多 1000 人；原有作答和成绩保持不变。
      </p>
    </Modal>
  );
}
