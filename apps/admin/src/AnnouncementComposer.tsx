import { useRef, useState } from "react";
import { Alert, Button, Form, Input, Modal, Select, message } from "antd";
import { RobotOutlined, SendOutlined } from "@ant-design/icons";
import request from "@font/api";
import { adminAiPreview, adminPublishNotification } from "./api/notification";
import type { PublishNotificationParams } from "./api/notification.type";
import { categoryOptions, categoryLabels, priorityLabels } from "./adminPresentation";
import { RecipientSelect } from "./RecipientSelect";

export function AnnouncementComposer({ onPublished }: { onPublished: () => void }) {
  const [form] = Form.useForm<PublishNotificationParams>();
  const target = Form.useWatch("targetType", form);
  const [preview, setPreview] = useState<PublishNotificationParams | null>(null);
  const [busy, setBusy] = useState<"ai" | "publish" | null>(null);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const generate = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy("ai"); setError("");
    try {
      const draft = await request(adminAiPreview({ category: form.getFieldValue("category"), prompt: form.getFieldValue("body") || undefined }));
      form.setFieldsValue({ title: draft.title, body: draft.body, priority: draft.priority ?? "normal", sourceType: draft.sourceType ?? "ai" });
      message.success("草稿已生成，请检查内容后发布");
    } catch { setError("AI 生成失败，已保留当前内容，请重试。"); }
    finally { submitting.current = false; setBusy(null); }
  };
  const publish = async () => {
    if (!preview || submitting.current) return;
    submitting.current = true; setBusy("publish"); setError("");
    try {
      await request(adminPublishNotification(preview));
      setPreview(null); form.resetFields(); message.success("公告已发送"); onPublished();
    } catch { setError("发布失败，内容已保留，请重试。"); }
    finally { submitting.current = false; setBusy(null); }
  };
  return <div className="admin-compose-layout">
    <section className="admin-panel">
      <div className="admin-panel-heading"><h2>公告内容</h2></div>
      <Form form={form} layout="vertical" className="admin-form" disabled={busy !== null}
        initialValues={{ category: "announcement", priority: "normal", targetType: "all", sourceType: "manual" }}
        onFinish={values => { setError(""); setPreview({ ...values, targetUserIds: values.targetType === "selected" ? values.targetUserIds : undefined }); }}>
        {error && !preview && <Alert type="error" showIcon message={error} />}
        <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: "请输入公告标题" }]}>
          <Input placeholder="用一句话说明这条公告" maxLength={160} showCount />
        </Form.Item>
        <Form.Item name="body" label="正文" rules={[{ required: true, whitespace: true, message: "请输入公告正文" }]}>
          <Input.TextArea autoSize={{ minRows: 6, maxRows: 18 }} placeholder="输入公告内容，或填写主题后让 AI 帮你生成…" />
        </Form.Item>
        <Form.Item name="sourceType" hidden><Input /></Form.Item>
        <h3 className="admin-section-title">发送设置</h3>
        <div className="admin-form-grid">
          <Form.Item name="category" label="类型"><Select options={categoryOptions} /></Form.Item>
          <Form.Item name="priority" label="优先级"><Select options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>
        </div>
        <Form.Item name="targetType" label="发送范围"><Select options={[{ label: "全部用户", value: "all" }, { label: "指定用户", value: "selected" }]} /></Form.Item>
        <Form.Item name="targetUserIds" label="接收用户" hidden={target !== "selected"} rules={target === "selected" ? [{ required: true, type: "array", min: 1, message: "请至少选择一位接收用户" }] : []}><RecipientSelect /></Form.Item>
        <div className="admin-form-actions">
          <Button icon={<RobotOutlined />} loading={busy === "ai"} onClick={() => void generate()}>AI 帮我生成</Button>
          <Button type="primary" htmlType="submit" icon={<SendOutlined />}>预览并发送</Button>
        </div>
        <p className="admin-inline-help">AI 生成的内容会填入草稿，请检查后再发送。</p>
      </Form>
    </section>

    <Modal open={preview !== null} title="确认发布公告" okText="确认发送" cancelText="返回编辑" width={600}
      confirmLoading={busy === "publish"} onOk={() => void publish()} onCancel={() => { if (!busy) setPreview(null); }}
      closable={!busy} maskClosable={!busy} keyboard={!busy} cancelButtonProps={{ disabled: !!busy }}>
      {error && <Alert type="error" showIcon message={error} />}
      <p className="admin-preview-meta">{categoryLabels[preview?.category ?? "announcement"]} · {priorityLabels[preview?.priority ?? "normal"]} · {preview?.targetType === "selected" ? `指定 ${preview.targetUserIds?.length ?? 0} 位用户` : "全部用户"}</p>
      <h3>{preview?.title}</h3><div className="admin-notification-body">{preview?.body}</div>
    </Modal>
  </div>;
}
