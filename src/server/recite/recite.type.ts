// 开始默写请求参数
export interface StartReciteParams {
  wordCount?: number; // 单词个数
  proficiencyLevels?: number[]; // 熟练程度数组
  types?: number[]; // 单词类型数组
  direction?: number; // 练习方向：0-中文写英文, 1-英文写中文
}

// 题目信息
export interface Question {
  wordId: number; // 单词ID
  question: string; // 题目内容（根据 direction 返回中文或英文）
  direction: number; // 练习方向
}

// 开始默写响应
export interface StartReciteResponse {
  questions: Question[]; // 题目列表
  direction: number; // 本次默写的练习方向
  totalCount: number; // 题目总数
}

// 提交答案项
export interface AnswerItem {
  wordId: number; // 单词ID
  userAnswer: string; // 用户填写的答案
}

// 提交答案请求参数
export interface SubmitAnswerParams {
  answers: AnswerItem[]; // 答案列表
  direction: number; // 练习方向
}

// 答题结果
export interface AnswerResult {
  wordId: number; // 单词ID
  englishWord: string; // 英文单词
  correctAnswer: string; // 正确答案
  userAnswer: string; // 用户答案
  isCorrect: boolean; // 是否正确
}

// 统计信息
export interface Statistics {
  totalCount: number; // 总题数
  correctCount: number; // 正确数
  errorCount: number; // 错误数
  accuracy: number; // 正确率（百分比，保留两位小数）
}

// 方向统计
export interface DirectionStat {
  total: number; // 该方向总题数
  correct: number; // 该方向正确数
  accuracy: number; // 该方向正确率（百分比，保留两位小数）
}

// 提交答案响应
export interface SubmitAnswerResponse {
  sessionId: number; // 本次默写的会话ID
  results: AnswerResult[]; // 答题结果列表
  statistics: Statistics; // 统计信息
}

// 历史记录中的单词项
export interface HistoryWordItem {
  id: number; // 记录ID
  wordId: number; // 单词ID
  englishWord: string; // 英文单词
  correctAnswer: string; // 正确答案
  userAnswer: string; // 用户答案
  isCorrect: boolean; // 是否正确
  direction: number; // 练习方向
  createTime: string; // 创建时间（ISO 8601 格式）
}

// 历史记录会话（新格式）
export interface ReciteSession {
  sessionId: number; // 会话ID
  wordCount: number; // 单词总数
  correctCount: number; // 正确数量
  errorCount: number; // 错误数量
  accuracy: number; // 正确率（百分比）
  direction: number; // 练习方向：0-中文写英文, 1-英文写中文
  createTime: string; // 创建时间（ISO 8601 格式）
  words: HistoryWordItem[]; // 该会话下的所有单词记录
}

// 历史记录项（旧格式，保留用于向后兼容）
export interface HistoryItem {
  id: number; // 记录ID
  userId: number; // 用户ID
  wordId: number; // 单词ID
  englishWord: string; // 英文单词
  correctAnswer: string; // 正确答案
  userAnswer: string; // 用户答案
  isCorrect: number; // 是否正确（0-错误, 1-正确）
  direction: number; // 练习方向
  createTime: string; // 创建时间（ISO 8601 格式）
}

// 获取历史记录请求参数
export interface GetHistoryParams {
  page: number; // 页码（从 1 开始）
  pageSize: number; // 每页数量
  direction?: number; // 练习方向筛选（0-中文写英文, 1-英文写中文），不传则查询所有方向
}

// 获取历史记录响应（新格式）
export interface GetHistoryResponse {
  list: ReciteSession[]; // 历史记录会话列表
  total: number; // 会话总数（不是单词总数）
  page: number; // 当前页码
  pageSize: number; // 每页数量
  totalPages: number; // 总页数
}

// 获取统计信息请求参数
export interface GetStatsParams {
  days?: number; // 统计最近 N 天的数据，不传则统计所有历史数据
}

// 获取统计信息响应
export interface GetStatsResponse {
  statistics: Statistics; // 总体统计
  directionStats: {
    [key: string]: DirectionStat; // 按方向统计，key 为 "0" 或 "1"
  };
}
