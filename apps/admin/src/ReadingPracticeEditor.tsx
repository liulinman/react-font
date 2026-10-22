import "./readingCreate.css";
import { ReadingImport } from "./ReadingImport";
import { useRef, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Space,
  Tabs,
} from "antd";
import request from "@font/api";
import { generatePractice, newRequestId } from "./api/readingPractice";
import {
  practiceDefaults,
  type PracticeConfig,
} from "./api/readingPractice.type";
import { RecipientSelect } from "./RecipientSelect";
export function PracticeFields({
  prefix = [],
  mode = "original",
  showRecipients = true,
}: {
  showRecipients?: boolean;
  prefix?: string[];
  mode?: "original" | "generate_questions" | "import";
}) {
  const form = Form.useFormInstance();
  const target = Form.useWatch([...prefix, "targetType"], form);
  return (
    <>
      {mode === "original" && (
        <>
          <h3 className="admin-section-title">内容要求</h3>
          {prefix.length === 0 && (
            <Form.Item name={[...prefix, "title"]} label="独立练习标题（可选）">
              <Input
                maxLength={160}
                placeholder="不填则由AI识别标题；生成要求不会作为列表标题"
              />
            </Form.Item>
          )}
          <Form.Item
            name={[...prefix, "topic"]}
            label="文章主题 / 生成要求"
            rules={[
              { required: true, whitespace: true, message: "请输入主题" },
            ]}
          >
            <Input.TextArea
              maxLength={4000}
              autoSize={{ minRows: 3, maxRows: 7 }}
              placeholder="例如：城市花园如何改变社区生活"
            />
          </Form.Item>
        </>
      )}
      {mode !== "import" && (
        <>
          <h3 className="admin-section-title">题目设置</h3>
          <div className="admin-form-grid">
            <Form.Item
              name={[...prefix, "ieltsBand"]}
              label={mode === "original" ? "雅思难度" : "参考难度（可选）"}
              rules={mode === "original" ? [{ required: true }] : []}
            >
              <InputNumber min={5} max={7.5} step={0.5} />
            </Form.Item>
            {mode === "original" && (
              <Form.Item
                name={[...prefix, "wordCount"]}
                label="文章词数"
                rules={[
                  { required: true, type: "integer", min: 200, max: 800 },
                ]}
              >
                <InputNumber min={200} max={800} step={50} />
              </Form.Item>
            )}
            <Form.Item
              name={[...prefix, "questionCount"]}
              label="题目数量"
              rules={[{ required: true, type: "integer", min: 3, max: 13 }]}
            >
              <InputNumber min={3} max={13} />
            </Form.Item>
          </div>
          <Form.Item
            name={[...prefix, "questionTypes"]}
            label="题型"
            rules={[
              {
                required: true,
                type: "array",
                min: 1,
                message: "请至少选择一种题型",
              },
            ]}
          >
            <Checkbox.Group
              options={[
                { value: "choice", label: "单项选择" },
                { value: "sentence_completion", label: "句子填空" },
                {
                  value: "true_false_not_given",
                  label: "True / False / Not Given",
                },
              ]}
            />
          </Form.Item>
        </>
      )}
      {showRecipients && <>
      <h3 className="admin-section-title">接收学生</h3>
      <Form.Item name={[...prefix, "targetType"]} label="接收范围">
        <Radio.Group
          options={[
            { value: "all", label: "全部正常用户" },
            { value: "selected", label: "指定用户" },
          ]}
        />
      </Form.Item>
      <Form.Item
        name={[...prefix, "targetUserIds"]}
        label="接收人"
        hidden={target !== "selected"}
        rules={
          target === "selected"
            ? [
                {
                  required: true,
                  type: "array",
                  min: 1,
                  message: "请选择接收人",
                },
              ]
            : []
        }
      >
        <RecipientSelect />
      </Form.Item>
      </>}
    </>
  );
}
function GenerationFields() {
  const count = Form.useWatch("questionCount") ?? practiceDefaults.questionCount;
  const band = Form.useWatch("ieltsBand") ?? practiceDefaults.ieltsBand;
  const words = Form.useWatch("wordCount") ?? practiceDefaults.wordCount;
  return <>
    <div className="reading-create-intro"><h2>想练什么？</h2><p>描述一个主题，AI 会生成文章和题目，再交给你审核。</p></div>
    <Form.Item name="topic" label="生成要求" rules={[{ required: true, whitespace: true, message: "请描述想练习的主题" }]}>
      <Input.TextArea autoSize={{ minRows: 5, maxRows: 10 }} maxLength={4000} placeholder="例如：生成一篇关于城市花园的雅思阅读，重点练习细节理解和判断题。" />
    </Form.Item>
    <details className="reading-create-settings">
      <summary><span>题目设置</span><strong>{count} 题 · 雅思 {band} 分 · {words} 词</strong><span className="reading-create-adjust">调整</span></summary>
      <div className="reading-create-numbers">
        <Form.Item name="questionCount" label="题目数量" rules={[{ required: true, type: "integer", min: 3, max: 13 }]}><InputNumber min={3} max={13} /></Form.Item>
        <Form.Item name="ieltsBand" label="雅思难度" rules={[{ required: true }]}><InputNumber min={5} max={7.5} step={0.5} /></Form.Item>
        <Form.Item name="wordCount" label="文章词数" rules={[{ required: true, type: "integer", min: 200, max: 800 }]}><InputNumber min={200} max={800} step={50} /></Form.Item>
      </div>
      <Form.Item name="questionTypes" label="题型" rules={[{ required: true, type: "array", min: 1, message: "至少选择一种题型" }]}><Checkbox.Group options={[{ value: "choice", label: "单项选择" }, { value: "sentence_completion", label: "句子填空" }, { value: "true_false_not_given", label: "判断题（含未提及）" }]} /></Form.Item>
      <Form.Item name="title" label="练习标题（可选）"><Input maxLength={160} placeholder="留空，AI 会根据内容命名" /></Form.Item>
    </details>
  </>;
}
export function ReadingPracticeEditor({ open, onClose, onCreated, initial }: {
  open: boolean; onClose: () => void; onCreated: (id?: number) => void; initial?: PracticeConfig;
}) {
  const [form] = Form.useForm<PracticeConfig>();
  const [active, setActive] = useState(initial ? "generate" : "import");
  const [busy, setBusy] = useState(false), [importBusy, setImportBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), attempt = useRef<{ signature: string; uid: string } | undefined>(undefined);
  const blocked = busy || importBusy;
  const create = async (values: PracticeConfig) => {
    if (lock.current) return;
    const config = { ...(initial ?? practiceDefaults), ...values };
    lock.current = true; setBusy(true); setError("");
    const signature = JSON.stringify(config);
    if (attempt.current?.signature !== signature) attempt.current = { signature, uid: newRequestId() };
    try { const paper = await request(generatePractice(config, attempt.current.uid)); onCreated(paper?.id); onClose(); }
    catch { setError("创建失败，输入已保留，请重试。"); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Drawer title="新建练习" rootClassName="reading-create" width="min(760px, 100vw)" open={open}
    onClose={() => { if (!blocked) onClose(); }} maskClosable={!blocked} closable={!blocked} keyboard={!blocked}
    footer={<div className="reading-create-footer"><span>完成后由你审核，不会自动发布</span><Space><Button disabled={blocked} onClick={onClose}>取消</Button><Button type="primary" htmlType="submit" form={active === "import" ? "reading-import-form" : "reading-generate-form"} loading={blocked} disabled={blocked}>{active === "import" ? "开始整理" : "开始生成"}</Button></Space></div>}>
    <Tabs activeKey={active} onChange={setActive} items={[
      { key: "import", label: "导入材料", disabled: blocked, children: <ReadingImport onBusyChange={setImportBusy} onCreated={(id) => { onCreated(id); onClose(); }} /> },
      { key: "generate", label: "AI 出题", disabled: blocked, children: <Form id="reading-generate-form" form={form} layout="vertical" requiredMark={false} initialValues={initial ?? practiceDefaults} onFinish={create} disabled={busy}>
        <GenerationFields />{error && <Alert type="error" message={error} showIcon />}
      </Form> },
    ]} />
  </Drawer>;
}
