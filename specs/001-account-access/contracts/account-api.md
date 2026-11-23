# Account HTTP contract

现有/api前缀；成功{code:200,message,data}；失败400/401/403/429/503，可读message，无秘密。

| POST路径 | body | data |
|---|---|---|
| /user/captcha | {previousCaptchaId?} | {captchaId,imageDataUrl,expiresIn:120}，PNG无文字答案字段 |
| /user/email-code | {purpose:register或reset,email,captchaId,captchaCode} | {challengeId,retryAfter:60,expiresIn:600}；reset存在/不存在相同 |
| /user/register | {username,email,password,challengeId,emailCode} | 安全用户信息，不自动登录 |
| /user/login | {username,password,captchaId,captchaCode} | {user}与httpOnly学习cookie，正文无token |
| /user/reset-password | {email,password,challengeId,emailCode} | null，清本机cookie |
| /user/change-password | {currentPassword,password}，学习cookie | null，目标由cookie确定，清本机cookie |
| /user/getCurrentUser | {}，cookie | 安全用户信息可含email |
| /user/logout | {} | null |

邮箱错误次数按邮箱用途累计；未知邮箱重置同样产生不可验证的挑战并受相同限额；SMTP结果不确定时不得即时盲目重试。
