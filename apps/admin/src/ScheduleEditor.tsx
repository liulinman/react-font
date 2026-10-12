import { PracticeFields } from './ReadingPracticeEditor';
import { practiceDefaults } from './api/readingPractice.type';
import { useRef, useState } from "react";
import { Alert, Button, DatePicker, Drawer, Form, Input, InputNumber, Select, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import request from "@font/api";
import { adminCreateSchedule } from "./api/notification";
import type { NotificationScheduleParams } from "./api/notification.type";
import { categoryOptions, weekdayOptions } from "./adminPresentation";

type Values = Omit<NotificationScheduleParams, "runAt"> & { runAt?: Dayjs };
export function ScheduleEditor({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form] = Form.useForm<Values>();
  const contentKind = Form.useWatch("contentKind", form);
  const cadence = Form.useWatch("cadence", form);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const create = async (values: Values) => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    const params: NotificationScheduleParams = {
      name: values.name.trim(), category: values.category, cadence: values.cadence,
      contentKind: values.contentKind,
      ...(values.contentKind === "reading_practice" ? { practiceConfig: values.practiceConfig } : { templatePrompt: values.templatePrompt }),
      aiMode: values.contentKind === "reading_practice" && values.aiMode === "off" ? "draft" : values.aiMode,
      targetType: "all", timezoneOffsetMinutes: 480,
      ...(values.cadence === "once" ? { runAt: values.runAt?.toISOString() } : {
        hour: values.hour, minute: values.minute,
        ...(values.cadence === "weekly" ? { weekday: values.weekday } : {}),
      }),
    };
    try {
      await request(adminCreateSchedule(params));
      message.success("定时任务已创建"); form.resetFields(); onClose(); onCreated();
    } catch { setError("创建失败，已保留表单内容，请重试。"); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <Drawer title="新建定时任务" open={open} width={560}
    onClose={() => { if (!busy) onClose(); }} closable={!busy} maskClosable={!busy} keyboard={!busy}
    extra={<Button type="primary" loading={busy} onClick={() => form.submit()}>保存定时任务</Button>}>
    <p className="admin-muted">普通通知面向全部用户。重复任务按北京时间（UTC+08:00）运行。</p>
    {error && <Alert message={error} type="error" showIcon />}
    <Form form={form} layout="vertical" disabled={busy} onFinish={values => void create(values)}
      initialValues={{ contentKind: "notification", practiceConfig: practiceDefaults, category: "ielts_daily", cadence: "daily", hour: 8, minute: 0, weekday: 1, aiMode: "auto_publish" }}>
      <Form.Item name="name" label="任务名称" rules={[{ required: true, whitespace: true, message: "请输入任务名称" }]}><Input maxLength={120} placeholder="例如：每日雅思表达" /></Form.Item>
      <Form.Item name="contentKind" label="内容形式"><Select options={[{value:"notification",label:"普通通知"},{value:"reading_practice",label:"阅读练习"}]} /></Form.Item>
      {contentKind === "reading_practice" && <PracticeFields prefix={["practiceConfig"]} />}
      <Form.Item hidden={contentKind === "reading_practice"} name="category" label="内容预设"><Select options={categoryOptions.filter(option => option.value !== "announcement")} /></Form.Item>
      <Form.Item name="aiMode" label="AI 模式"><Select options={[
        { label: "自动生成并发布", value: "auto_publish" }, { label: "生成草稿待发布", value: "draft" }, ...(contentKind === "reading_practice" ? [] : [{ label: "不使用 AI", value: "off" }]),
      ]} /></Form.Item>
      <Form.Item name="cadence" label="执行频率"><Select options={[{ label: "一次", value: "once" }, { label: "每天", value: "daily" }, { label: "每周", value: "weekly" }]} /></Form.Item>
      {cadence === "once" ? <Form.Item name="runAt" label="执行时间" extra="按当前浏览器时区选择，系统会转换为准确的执行时刻。" rules={[
        { required: true, message: "请选择执行时间" },
        { validator: (_, value: Dayjs | undefined) => !value || value.isAfter(dayjs()) ? Promise.resolve() : Promise.reject(new Error("执行时间必须晚于当前时间")) },
      ]}><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} /></Form.Item> : <>
        {cadence === "weekly" && <Form.Item name="weekday" label="每周几" rules={[{ required: true, message: "请选择星期" }]}><Select options={weekdayOptions} /></Form.Item>}
        <div className="admin-form-grid">
          <Form.Item name="hour" label="小时（北京时间）" rules={[{ required: true, type: "integer", min: 0, max: 23, message: "请输入 0–23 的整数" }]}><InputNumber min={0} max={23} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="minute" label="分钟" rules={[{ required: true, type: "integer", min: 0, max: 59, message: "请输入 0–59 的整数" }]}><InputNumber min={0} max={59} style={{ width: "100%" }} /></Form.Item>
        </div>
      </>}
      <Form.Item hidden={contentKind === "reading_practice"} name="templatePrompt" label="主题 / 提示词" extra="例如：用最近的一件小事，练习过去时和连接词。"><Input.TextArea autoSize={{ minRows: 5, maxRows: 12 }} /></Form.Item>
    </Form>
  </Drawer>;
}
