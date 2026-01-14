import { YTRequest } from "@/utils/axios/axios";

// 配置项类型
export type ConfigType = "boolean" | "number" | "string" | "json";

// 配置项响应类型
export interface ConfigItem {
  configKey: string;
  configValue: any; // 根据 configType 自动解析后的值
  configType: ConfigType;
  description?: string;
}

// 所有配置响应类型
export interface AllConfigsResponse {
  [key: string]: ConfigItem;
}

// 批量设置配置项
export interface BatchConfigItem {
  configKey: string;
  configValue: string; // 必须是字符串格式
  configType?: ConfigType;
  description?: string;
}

// 批量设置响应项
export interface BatchSetResult {
  configKey: string;
  success: boolean;
  data?: ConfigItem;
  error?: string;
}

/**
 * 获取单个配置
 */
export const getConfig = (data: {
  configKey: string;
}): YTRequest<ConfigItem> => {
  return {
    url: "/config/get",
    method: "POST",
    data,
  };
};

/**
 * 获取所有配置
 */
export const getAllConfigs = (): YTRequest<AllConfigsResponse> => {
  return {
    url: "/config/getAll",
    method: "POST",
    data: {},
  };
};

/**
 * 设置单个配置
 */
export const setConfig = (data: {
  configKey: string;
  configValue: string; // 必须是字符串格式
  configType?: ConfigType;
  description?: string;
}): YTRequest<ConfigItem> => {
  return {
    url: "/config/set",
    method: "POST",
    data,
  };
};

/**
 * 批量设置配置
 */
export const batchSetConfigs = (data: {
  configs: BatchConfigItem[];
}): YTRequest<BatchSetResult[]> => {
  return {
    url: "/config/batchSet",
    method: "POST",
    data,
  };
};

/**
 * 删除配置
 */
export const deleteConfig = (data: {
  configKey: string;
}): YTRequest<null> => {
  return {
    url: "/config/delete",
    method: "POST",
    data,
  };
};



