# MCP 笔记工具契约

精确定义：后端src/interface/mcp-access/mcp-notes.ts；读写同一/api/mcp JSON文本结果。工具结果错误isError=true，身份无效HTTP401；schema验证可能由SDK先拒绝。

| 工具 | 参数 | 返回 | scope |
|---|---|---|---|
| query_notes | q?,category?,page?,folderId?:ID或unfiled,wordId? | list/total/page/pageSize=20 | notes:read |
| get_note | noteId | 完整笔记与words/version/folderId | notes:read |
| list_note_folders | {} | list/total/unfiled | notes:read |
| create_note | note,folderId:ID,requestId:UUID | {note} | notes:create |
| preview_update_note | noteId,changes | before/after/changedFields/confirmationToken/expiresAt | notes:update |
| confirm_update_note | confirmationToken,confirmed:true,requestId | {note} | notes:update |
| preview_create_note_folder | name,parentId?:ID或null | folder/parentPath/confirmationToken/expiresAt | notes:folders:create |
| confirm_create_note_folder | confirmationToken,confirmed:true,requestId | {folder} | notes:folders:create |

note标题1–120，正文非空最多30000，固定category，examples≤10000/source≤1000，wordIds≤20不重复本人词。changes至少一字段、仅可写字段+已有folderId；可选字段清空，未指定保留。严格对象拒绝未声明的确认替换字段。名称1–40，目录≤200，深度≤5；保留名拒绝。confirmed不为true不写入；过期/跨绑定/旧版本或改路径须重新预览。
