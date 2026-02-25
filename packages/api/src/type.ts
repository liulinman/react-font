/**
 * 公共类型定义 - 用于 axios 请求相关的类型
 */
export type CommonRecord = {
  code: number;
  message: string;
  data?: unknown;
};

export type PaginationResponse<T> = {
  list: T[];
  total: number;
  totalPages?: number;
  page?: number;
  pageSize?: number;
};

export type ListResponse<T> = {
  data: PaginationResponse<T>;
};
