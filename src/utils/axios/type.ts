/**
 * 公共类型定义 - 用于 axios 请求相关的类型
 * 
 * 使用说明：
 * - 如果类型是请求/API 相关的，放在这里
 * - 如果类型是全局通用的，考虑放在 src/types/ 目录
 * - 如果类型是模块特定的，放在各自模块的 *.type.ts 文件中
 */

/**
 * 通用响应记录类型
 * 用于 API 响应的基础结构
 */
export type CommonRecord = {
  code: number;
  message: string;
  data?: unknown;
};

/**
 * 分页响应类型
 */
export type PaginationResponse<T> = {
  list: T[];
  total: number;
  totalPages?: number;
  page?: number;
  pageSize?: number;
};

/**
 * 通用列表响应类型
 */
export type ListResponse<T> =  {
  data: PaginationResponse<T>;
};
