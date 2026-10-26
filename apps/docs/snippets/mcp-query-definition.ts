// Source: nestjs/src/interface/mcp-access/mcp.controller.ts
// Revision: 59bd79378d035aeccd6e67c52a1762543d0e4c1d
// Selected teaching excerpt; surrounding authentication remains required.
  query_words: {
    description: '查询当前授权账号的词条，支持关键词和分页。',
    schema: {
      keyword: z.string().trim().max(100).optional(),
      limit: z.number().int().min(1).max(50).optional(),
      offset: z.number().int().min(0).max(1000000).optional(),
    },
  },
