import { Alert, Form, Modal, Radio } from "antd";
import { useEffect } from "react";
import { RecipientSelect } from "./RecipientSelect";
import type { AdminPractice } from "./api/readingPractice.type";
type Recipients = { targetType: "all" | "selected"; targetUserIds?: number[] };
export function PracticePublishDialog({ open, paper, busy, error, onClose, onConfirm }: {
  open: boolean; paper: AdminPractice; busy: boolean; error: string; onClose: () => void; onConfirm: (recipients: Recipients) => Promise<void>;
}) {
  const [form] = Form.useForm<Recipients>();
  const target = Form.useWatch("targetType", form);
  useEffect(() => { if (open) form.setFieldsValue({targetType:paper.config.targetType,targetUserIds:paper.config.targetUserIds || []}); }, [open, paper.id, form]);
  return <Modal open={open} title="确认并发布" okText="确认发布" cancelText="再检查一下" confirmLoading={busy}
    onCancel={onClose} onOk={() => form.submit()} cancelButtonProps={{disabled:busy}} closable={!busy} maskClosable={!busy} keyboard={!busy}>
    <p><strong>{paper.title}</strong> · {paper.content?.questions.length || paper.config.questionCount} 道题</p>
    <p style={{color:"#64748b"}}>确认内容无误后，选择接收学生。发布后每人可正式提交一次。</p>
    <Form form={form} layout="vertical" requiredMark={false} disabled={busy} onFinish={(v) => onConfirm({targetType:v.targetType,...(v.targetType === "selected" ? {targetUserIds:v.targetUserIds} : {})})}>
      <Form.Item name="targetType" label="发送给"><Radio.Group options={[{value:"all",label:"全部学生"},{value:"selected",label:"指定学生"}]} /></Form.Item>
      <Form.Item name="targetUserIds" label="选择学生" hidden={target !== "selected"} rules={target === "selected" ? [{required:true,type:"array",min:1,message:"请至少选择一位学生"}] : []}><RecipientSelect disabled={busy} placement="topLeft" placeholder="搜索并选择学生" /></Form.Item>
    </Form>
    {error && <Alert showIcon type="error" message={error} />}
  </Modal>;
}
