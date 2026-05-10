import React, { useEffect, useState } from "react";
import { Modal, Form, InputNumber, Button, message, Card } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import request from "@font/api";
import { getAllConfigs, batchSetConfigs } from "@/server/config/config";
import { PracticeDirection } from "../enum";

// 系统配置类型定义
export interface SystemSettings {
  wordDictation: {
    dictationCount: number; // 单词默写数量
    proficiencyLevels: number[]; // 熟练程度（多选）
    types: number[]; // 默写类型（多选，使用 EnglishType 枚举）
    direction: PracticeDirection; // 练习方向：0-中文写英文，1-英文写中文
  };
  wordListening: {
    dictationCount: number; // 单词听写数量
    proficiencyLevels: number[]; // 熟练程度（多选）
    types: number[]; // 听写类型（多选，使用 EnglishType 枚举）
    direction: PracticeDirection; // 练习方向：0-中文写英文，1-英文写中文
  };
}

// 默认配置
export const DEFAULT_SETTINGS: SystemSettings = {
  wordDictation: {
    dictationCount: 20,
    proficiencyLevels: [0], // 默认选择"不会"
    types: [0], // 默认选择"单词"
    direction: PracticeDirection.ChineseToEnglish, // 默认中文写英文
  },
  wordListening: {
    dictationCount: 20,
    proficiencyLevels: [0], // 默认选择"不会"
    types: [0], // 默认选择"单词"
    direction: PracticeDirection.ChineseToEnglish, // 默认中文写英文
  },
};

// 配置键名
const RECITE_CONFIG_KEY = "word_recite_config";
const LISTENING_CONFIG_KEY = "word_listening_config";

/**
 * 从后端获取系统配置
 */
export const getSystemSettings = async (): Promise<SystemSettings> => {
  const settings: SystemSettings = { ...DEFAULT_SETTINGS };

  try {
    // 一次性获取所有配置
    const allConfigs = await request(getAllConfigs());

    // 解析默写配置
    const reciteConfig = allConfigs[RECITE_CONFIG_KEY];
    if (reciteConfig && reciteConfig.configValue) {
      const value = reciteConfig.configValue as Record<string, unknown>;
      settings.wordDictation = {
        dictationCount:
          (value.wordCount as number) || DEFAULT_SETTINGS.wordDictation.dictationCount,
        proficiencyLevels: Array.isArray(value.proficiencyLevels)
          ? value.proficiencyLevels
          : value.proficiencyLevel != null
            ? [value.proficiencyLevel as number]
            : DEFAULT_SETTINGS.wordDictation.proficiencyLevels,
        types: Array.isArray(value.types)
          ? value.types
          : value.type !== undefined
            ? [value.type as number]
            : DEFAULT_SETTINGS.wordDictation.types,
        direction:
          value.direction !== undefined
            ? (value.direction as PracticeDirection)
            : DEFAULT_SETTINGS.wordDictation.direction,
      };
    }

    // 解析听写配置
    const listeningConfig = allConfigs[LISTENING_CONFIG_KEY];
    if (listeningConfig && listeningConfig.configValue) {
      const value = listeningConfig.configValue as Record<string, unknown>;
      settings.wordListening = {
        dictationCount:
          (value.wordCount as number) || DEFAULT_SETTINGS.wordListening.dictationCount,
        proficiencyLevels: Array.isArray(value.proficiencyLevels)
          ? value.proficiencyLevels
          : value.proficiencyLevel != null
            ? [value.proficiencyLevel as number]
            : DEFAULT_SETTINGS.wordListening.proficiencyLevels,
        types: Array.isArray(value.types)
          ? value.types
          : value.type !== undefined
            ? [value.type as number]
            : DEFAULT_SETTINGS.wordListening.types,
        direction:
          value.direction !== undefined
            ? (value.direction as PracticeDirection)
            : DEFAULT_SETTINGS.wordListening.direction,
      };
    }
  } catch (error) {
    console.error("读取系统配置失败:", error);
    // 如果获取失败，返回默认配置
  }

  return settings;
};

/**
 * 保存配置到后端
 */
export const saveSystemSettings = async (settings: SystemSettings): Promise<boolean> => {
  try {
    // 使用批量设置接口
    const configs = [
      {
        configKey: RECITE_CONFIG_KEY,
        configValue: JSON.stringify({
          wordCount: settings.wordDictation.dictationCount,
          proficiencyLevels: settings.wordDictation.proficiencyLevels,
          types: settings.wordDictation.types,
          direction: settings.wordDictation.direction,
        }),
        configType: "json" as const,
        description: "单词默写默认配置（单词个数、熟练程度、类型和练习方向）",
      },
      {
        configKey: LISTENING_CONFIG_KEY,
        configValue: JSON.stringify({
          wordCount: settings.wordListening.dictationCount,
          proficiencyLevels: settings.wordListening.proficiencyLevels,
          types: settings.wordListening.types,
          direction: settings.wordListening.direction,
        }),
        configType: "json" as const,
        description: "单词听写默认配置（单词个数、熟练程度、类型和练习方向）",
      },
    ];

    const results = await request(batchSetConfigs({ configs }));

    // 检查是否有失败的配置
    const failedConfigs = results.filter((result) => !result.success);
    if (failedConfigs.length > 0) {
      console.error("部分配置保存失败:", failedConfigs);
      return false;
    }

    return true;
  } catch (error) {
    console.error("保存系统配置失败:", error);
    return false;
  }
};

type SystemSettingsProps = {
  visible: boolean;
  onClose: () => void;
};

export const SystemSettings: React.FC<SystemSettingsProps> = ({ visible, onClose }) => {
  const [form] = Form.useForm<SystemSettings>();
  const [loading, setLoading] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (visible) {
      const loadSettings = async () => {
        try {
          const currentSettings = await getSystemSettings();
          form.setFieldsValue(currentSettings);
        } catch (error) {
          console.error("加载配置失败:", error);
          form.setFieldsValue(DEFAULT_SETTINGS);
        }
      };
      loadSettings();
    }
  }, [visible, form]);

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 保存到后端
      const success = await saveSystemSettings(values);

      if (success) {
        message.success("配置保存成功");
        onClose();
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

  // 重置为默认值
  const handleReset = () => {
    form.setFieldsValue(DEFAULT_SETTINGS);
    message.info("已重置为默认配置");
  };

  return (
    <Modal
      title="系统设置"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="reset" onClick={handleReset}>
          重置默认
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}
        >
          保存
        </Button>,
      ]}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_SETTINGS}
        className="system-settings-form"
      >
        {/* 单词默写配置模块 */}
        <Card
          title="单词默写配置"
          size="small"
          style={{ marginBottom: 16 }}
          headStyle={{ backgroundColor: "#f5f5f5" }}
        >
          <Form.Item
            label="单词默写数量"
            name={["wordDictation", "dictationCount"]}
            rules={[
              { required: true, message: "请输入单词默写数量" },
              { type: "number", min: 1, max: 100, message: "范围：1-100" },
            ]}
            tooltip="每次默写练习的单词数量"
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="请输入单词默写数量"
              min={1}
              max={100}
            />
          </Form.Item>

          <Form.Item
            label="单词个数"
            name={["wordDictation", "wordCount"]}
            rules={[
              { required: true, message: "请输入单词个数" },
              { type: "number", min: 1, max: 500, message: "范围：1-500" },
            ]}
            tooltip="单词库中的单词总数"
          >
            <InputNumber style={{ width: "100%" }} placeholder="请输入单词个数" min={1} max={500} />
          </Form.Item>
        </Card>

        {/* 未来可以在这里添加其他配置模块 */}
        {/* 
        <Divider />
        <Card
          title="其他配置模块"
          size="small"
          style={{ marginBottom: 16 }}
          headStyle={{ backgroundColor: "#f5f5f5" }}
        >
          <Form.Item
            label="示例配置项"
            name={["example", "someSetting"]}
          >
            <Input placeholder="请输入配置值" />
          </Form.Item>
        </Card>
        */}
      </Form>
    </Modal>
  );
};
