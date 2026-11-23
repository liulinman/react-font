# 数据

ielts_listening_material：UUID、owner_id、visibility、status、request_id、document JSON、created_at/updated_at；owner+request幂等。document冻结sections，含私有transcript/questions/answers、audioIds；发布投影移除私有评分字段。

ielts_listening_attempt：UUID、user_id、material_id、mode、state JSON、revision、created_at/updated_at；state冻结材料版本、answers/flags、startedAt/deadline、interrupted、result。事务锁保证首次提交不可覆盖。
