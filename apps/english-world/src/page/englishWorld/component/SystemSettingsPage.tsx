import React, { useEffect, useState } from "react";
import {
  Form,
  InputNumber,
  Button,
  message,
  Card,
  Space,
  Collapse,
  Checkbox,
  Tag,
  Radio,
} from "antd";
import { SaveOutlined, EditOutlined } from "@ant-design/icons";
import { EnglishWorldLayout } from "../layout/EnglishWorldLayout";
import { EnglishWorldPageHeader } from "./EnglishWorldPageHeader";
import {
  getSystemSettings,
  saveSystemSettings,
  SystemSettings,
  DEFAULT_SETTINGS,
} from "./SystemSettings";
import { deleteConfig } from "@/server/config/config";
import request from "@font/api";
import { EnglishAbsorb, EnglishType, PracticeDirection } from "../enum";
import { enumToOptions } from "@font/utils";

const { Panel } = Collapse;

export const SystemSettingsPage: React.FC = () => {
  const [form] = Form.useForm<SystemSettings>();
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | string[]>([
    "wordDictation",
    "wordListening",
  ]);

  // 初始化表单数据
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await getSystemSettings();
        form.setFieldsValue(currentSettings);
      } catch (error) {
        console.error("加载配置失败:", error);
        message.error("加载配置失败，使用默认配置");
        form.setFieldsValue(DEFAULT_SETTINGS);
      }
    };
    loadSettings();
  }, [form]);

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 保存到后端
      const success = await saveSystemSettings(values);

      if (success) {
        message.success("配置保存成功");
      } else {
        message.error("配置保存失败");
      }
    } catch (error) {
      console.error("保存配置失败:", error);
      message.error("配置保存失败，请检查输入");
    } finally {
      setLoading(false);
    }
  };

  // 重置为默认值（删除配置，恢复为系统默认值）
  const handleReset = async () => {
    try {
      setLoading(true);
      // 删除两个配置
      await Promise.all([
        request(deleteConfig({ configKey: "word_recite_config" })),
        request(deleteConfig({ configKey: "word_listening_config" })),
      ]);
      // 重新加载配置（会返回默认值）
      const defaultSettings = await getSystemSettings();
      form.setFieldsValue(defaultSettings);
      message.success("已重置为默认配置");
    } catch (error) {
      console.error("重置配置失败:", error);
      // 即使删除失败，也设置表单为默认值
      form.setFieldsValue(DEFAULT_SETTINGS);
      message.info("已重置为默认配置（本地）");
    } finally {
      setLoading(false);
    }
  };

  // 获取熟练程度选项
  const proficiencyOptions = enumToOptions(EnglishAbsorb);

  // 获取类型选项
  const typeOptions = enumToOptions(EnglishType);

  // 熟练程度颜色映射
  const proficiencyColors: Record<number, string> = {
    0: "#ff4d4f", // 不会 - 红色
    1: "#faad14", // 一般 - 橙色
    2: "#1890ff", // 熟练 - 蓝色
    3: "#52c41a", // 精通 - 绿色
  };

  // 类型颜色映射
  const typeColors: Record<number, string> = {
    0: "#1890ff", // 单词 - 蓝色
    1: "#52c41a", // 短语 - 绿色
    2: "#faad14", // 句子 - 橙色
  };

  return (
    <EnglishWorldLayout activeKey="setting">
      <div className="system-settings-page">
        <EnglishWorldPageHeader
          eyebrow="偏好设置"
          title="系统设置"
          description="管理默写和听写的默认范围，让每次学习从合适的难度开始。"
          actions={
            <Space>
              <Button onClick={handleReset}>重置默认</Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSave}
                size="large"
              >
                保存配置
              </Button>
            </Space>
          }
        />
        <Card className="system-settings-surface">
          <Form
            form={form}
            layout="vertical"
            initialValues={DEFAULT_SETTINGS}
            className="system-settings-form"
            style={{ marginTop: "16px" }}
          >
            <Collapse
              activeKey={activeKey}
              onChange={setActiveKey}
              expandIcon={({ isActive }) => (
                <EditOutlined
                  rotate={isActive ? 90 : 0}
                  style={{ fontSize: "16px", color: "#1890ff" }}
                />
              )}
              style={{
                background: "transparent",
              }}
            >
              {/* 单词默写配置模块 */}
              <Panel
                header={
                  <span style={{ fontSize: "16px", fontWeight: 500 }}>
                    单词默写配置
                  </span>
                }
                key="wordDictation"
                style={{
                  marginBottom: 0,
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e8e8e8",
                }}
              >
                <div style={{ padding: "8px 0" }}>
                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        单词默写数量
                      </span>
                    }
                    name={["wordDictation", "dictationCount"]}
                    rules={[
                      { required: true, message: "请输入单词默写数量" },
                      {
                        type: "number",
                        min: 1,
                        max: 100,
                        message: "范围：1-100",
                      },
                    ]}
                    tooltip="每次默写练习的单词数量"
                    style={{ marginBottom: "24px" }}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="请输入单词默写数量"
                      min={1}
                      max={100}
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        熟练程度
                      </span>
                    }
                    name={["wordDictation", "proficiencyLevels"]}
                    rules={[
                      {
                        required: true,
                        message: "请至少选择一个熟练程度",
                        type: "array",
                        min: 1,
                      },
                    ]}
                    tooltip="选择要练习的单词熟练程度（可多选）"
                    style={{ marginBottom: "24px" }}
                  >
                    <Checkbox.Group
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      {proficiencyOptions.map((option) => {
                        const levelValue = option.value as number;
                        const color =
                          proficiencyColors[levelValue] || "#d9d9d9";
                        return (
                          <Checkbox
                            key={levelValue}
                            value={levelValue}
                            style={{
                              margin: 0,
                              padding: "8px 16px",
                              borderRadius: "6px",
                              border: `1px solid ${color}`,
                              backgroundColor: "transparent",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <Tag
                              color={color}
                              style={{
                                margin: 0,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            >
                              {option.label}
                            </Tag>
                          </Checkbox>
                        );
                      })}
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        默写类型
                      </span>
                    }
                    name={["wordDictation", "types"]}
                    rules={[
                      {
                        required: true,
                        message: "请至少选择一个类型",
                        type: "array",
                        min: 1,
                      },
                    ]}
                    tooltip="选择要练习的单词类型（可多选）"
                    style={{ marginBottom: "24px" }}
                  >
                    <Checkbox.Group
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      {typeOptions.map((option) => {
                        const typeValue = option.value as number;
                        const color = typeColors[typeValue] || "#d9d9d9";
                        return (
                          <Checkbox
                            key={typeValue}
                            value={typeValue}
                            style={{
                              margin: 0,
                              padding: "8px 16px",
                              borderRadius: "6px",
                              border: `1px solid ${color}`,
                              backgroundColor: "transparent",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <Tag
                              color={color}
                              style={{
                                margin: 0,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            >
                              {option.label}
                            </Tag>
                          </Checkbox>
                        );
                      })}
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        练习方向
                      </span>
                    }
                    name={["wordDictation", "direction"]}
                    rules={[{ required: true, message: "请选择练习方向" }]}
                    tooltip="选择是根据中文写英文，还是根据英文写中文"
                  >
                    <Radio.Group>
                      <Radio value={PracticeDirection.ChineseToEnglish}>
                        中文写英文
                      </Radio>
                      <Radio value={PracticeDirection.EnglishToChinese}>
                        英文写中文
                      </Radio>
                    </Radio.Group>
                  </Form.Item>
                </div>
              </Panel>

              {/* 单词听写配置模块 */}
              <Panel
                header={
                  <span style={{ fontSize: "16px", fontWeight: 500 }}>
                    单词听写配置
                  </span>
                }
                key="wordListening"
                style={{
                  marginBottom: 0,
                  marginTop: "16px",
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e8e8e8",
                }}
              >
                <div style={{ padding: "8px 0" }}>
                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        单词听写数量
                      </span>
                    }
                    name={["wordListening", "dictationCount"]}
                    rules={[
                      { required: true, message: "请输入单词听写数量" },
                      {
                        type: "number",
                        min: 1,
                        max: 100,
                        message: "范围：1-100",
                      },
                    ]}
                    tooltip="每次听写练习的单词数量"
                    style={{ marginBottom: "24px" }}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      placeholder="请输入单词听写数量"
                      min={1}
                      max={100}
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        熟练程度
                      </span>
                    }
                    name={["wordListening", "proficiencyLevels"]}
                    rules={[
                      {
                        required: true,
                        message: "请至少选择一个熟练程度",
                        type: "array",
                        min: 1,
                      },
                    ]}
                    tooltip="选择要练习的单词熟练程度（可多选）"
                    style={{ marginBottom: "24px" }}
                  >
                    <Checkbox.Group
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      {proficiencyOptions.map((option) => {
                        const levelValue = option.value as number;
                        const color =
                          proficiencyColors[levelValue] || "#d9d9d9";
                        return (
                          <Checkbox
                            key={levelValue}
                            value={levelValue}
                            style={{
                              margin: 0,
                              padding: "8px 16px",
                              borderRadius: "6px",
                              border: `1px solid ${color}`,
                              backgroundColor: "transparent",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <Tag
                              color={color}
                              style={{
                                margin: 0,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            >
                              {option.label}
                            </Tag>
                          </Checkbox>
                        );
                      })}
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        听写类型
                      </span>
                    }
                    name={["wordListening", "types"]}
                    rules={[
                      {
                        required: true,
                        message: "请至少选择一个类型",
                        type: "array",
                        min: 1,
                      },
                    ]}
                    tooltip="选择要练习的单词类型（可多选）"
                    style={{ marginBottom: "24px" }}
                  >
                    <Checkbox.Group
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      {typeOptions.map((option) => {
                        const typeValue = option.value as number;
                        const color = typeColors[typeValue] || "#d9d9d9";
                        return (
                          <Checkbox
                            key={typeValue}
                            value={typeValue}
                            style={{
                              margin: 0,
                              padding: "8px 16px",
                              borderRadius: "6px",
                              border: `1px solid ${color}`,
                              backgroundColor: "transparent",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <Tag
                              color={color}
                              style={{
                                margin: 0,
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            >
                              {option.label}
                            </Tag>
                          </Checkbox>
                        );
                      })}
                    </Checkbox.Group>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>
                        练习方向
                      </span>
                    }
                    name={["wordListening", "direction"]}
                    rules={[{ required: true, message: "请选择练习方向" }]}
                    tooltip="选择是根据中文写英文，还是根据英文写中文"
                  >
                    <Radio.Group>
                      <Radio value={PracticeDirection.ChineseToEnglish}>
                        中文写英文
                      </Radio>
                      <Radio value={PracticeDirection.EnglishToChinese}>
                        英文写中文
                      </Radio>
                    </Radio.Group>
                  </Form.Item>
                </div>
              </Panel>

              {/* 未来可以在这里添加其他配置模块 */}
              {/* 
              <Panel
                header="其他配置模块"
                key="otherModule"
                style={{ marginBottom: 16 }}
              >
                <Form.Item
                  label="示例配置项"
                  name={["example", "someSetting"]}
                >
                  <Input placeholder="请输入配置值" />
                </Form.Item>
              </Panel>
              */}
            </Collapse>
          </Form>
        </Card>
      </div>
    </EnglishWorldLayout>
  );
};
