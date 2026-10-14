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
      <div className="admin-panel-heading"><h2>编辑公告</h2><p>编写内容，选择接收范围，预览后发送。</p></div>
      <Form form={form} layout="vertical" className="admin-form" disabled={busy !== null}
        initialValues={{ category: "announcement", priority: "normal", targetType: "all", sourceType: "manual" }}
        onFinish={values => { setError(""); setPreview({ ...values, targetUserIds: values.targetType === "selected" ? values.targetUserIds : undefined }); }}>
        {error && !preview && <Alert type="error" showIcon message={error} />}
        <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true, message: "请输入公告标题" }]}>
          <Input placeholder="用一句话说明这条公告" maxLength={160} showCount />
        </Form.Item>
        <Form.Item name="body" label="正文" rules={[{ required: true, whitespace: true, message: "请输入公告正文" }]}>
          <Input.TextArea autoSize={{ minRows: 8, maxRows: 18 }} placeholder="输入公告内容，或填写主题后让 AI 帮你生成…" />
        </Form.Item>
        <Form.Item name="sourceType" hidden><Input /></Form.Item>
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
      </Form>
    </section>
    <aside className="admin-help-panel"><span className="admin-eyebrow">发布提示</span><h3>清楚传达，适度提醒</h3><p>标题概括重点，正文交代具体内容和行动建议。</p><p>普通通知适合日常学习内容；重要和紧急通知用于需要及时关注的事项。</p><p>AI 生成的内容会先填入草稿，检查后再发布。</p></aside>
    <Modal open={preview !== null} title="确认发布公告" okText="确认发送" cancelText="返回编辑" width={600}
      confirmLoading={busy === "publish"} onOk={() => void publish()} onCancel={() => { if (!busy) setPreview(null); }}
      closable={!busy} maskClosable={!busy} keyboard={!busy} cancelButtonProps={{ disabled: !!busy }}>
      {error && <Alert type="error" showIcon message={error} />}
      <p className="admin-preview-meta">{categoryLabels[preview?.category ?? "announcement"]} · {priorityLabels[preview?.priority ?? "normal"]} · {preview?.targetType === "selected" ? `指定 ${preview.targetUserIds?.length ?? 0} 位用户` : "全部用户"}</p>
      <h3>{preview?.title}</h3><div className="admin-notification-body">{preview?.body}</div>
    </Modal>
  </div>;
}
