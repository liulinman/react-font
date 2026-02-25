import { YTRequest } from "@font/api";

export type ConfigType = "boolean" | "number" | "string" | "json";

export interface ConfigItem {
  configKey: string;
  configValue: unknown;
  configType: ConfigType;
  description?: string;
}

export interface AllConfigsResponse {
  [key: string]: ConfigItem;
}

export interface BatchConfigItem {
  configKey: string;
  configValue: string;
  configType?: ConfigType;
  description?: string;
}

export interface BatchSetResult {
  configKey: string;
  success: boolean;
  data?: ConfigItem;
  error?: string;
}

export const getConfig = (data: {
  configKey: string;
}): YTRequest<ConfigItem> => {
  return {
    url: "/config/get",
    method: "POST",
    data,
  };
};

export const getAllConfigs = (): YTRequest<AllConfigsResponse> => {
  return {
    url: "/config/getAll",
    method: "POST",
    data: {},
  };
};

export const setConfig = (data: {
  configKey: string;
  configValue: string;
  configType?: ConfigType;
  description?: string;
}): YTRequest<ConfigItem> => {
  return {
    url: "/config/set",
    method: "POST",
    data,
  };
};

export const batchSetConfigs = (data: {
  configs: BatchConfigItem[];
}): YTRequest<BatchSetResult[]> => {
  return {
    url: "/config/batchSet",
    method: "POST",
    data,
  };
};

export const deleteConfig = (data: {
  configKey: string;
}): YTRequest<null> => {
  return {
    url: "/config/delete",
    method: "POST",
    data,
  };
};
