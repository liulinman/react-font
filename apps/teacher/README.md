# Freewing 教师端

教师使用已有 Freewing 账号登录。管理员在用户管理的「更多 → 开通教师端」为账号开通权限。登录后创建课堂、邀请学生、布置或补发阅读作业，也可以在班级群发文字消息。

## 本地启动

1. 在本地测试库应用后端迁移 `nestjs/migrations/create-classrooms.sql`，并启动已有 NestJS 后端。教师端开发代理默认使用 `127.0.0.1:3000`。
2. 在前端仓库运行 `pnpm --filter @font/teacher dev`，打开 `http://localhost:5187/teacher/`。
3. 启动学生端 `pnpm --filter @font/english-world dev`。邀请链接默认指向相同主机的 5173 端口。学生端使用其他地址时，可给教师端设置 `VITE_STUDENT_ORIGIN`。

`pnpm --filter @font/teacher build` 输出 `apps/teacher/dist`。静态部署路径为 `/teacher/`，请求通过同源 `/api` 访问后端。

## 独立部署

生产入口仍是同源 `/teacher/`。入口 Nginx 将该路径转发到 Docker 内网的 `teacher-frontend:80`；同源 `/api/` 仍由入口 Nginx 转发到现有后端。教师容器无需映射宿主机端口。学生与管理端镜像不再包含教师静态文件。仓库根目录的本地 Docker Compose 也使用同样的转发方式，启动前需先构建教师产物。

在生产发布包中携带下列命令所需的教师构建产物、Dockerfile 与 `deploy/teacher/`，无需携带学生端或后端产物：

```sh
pnpm --filter @font/teacher build
export TEACHER_IMAGE=english-world-teacher:release-001
export INGRESS_NETWORK=deploy_app-network
docker build -f Dockerfile.teacher -t "$TEACHER_IMAGE" .
docker compose -f deploy/teacher/compose.yml up -d --no-deps teacher
```

发布前保留当前教师镜像版本。发布后检查 `/teacher/`、一个教师端资源、缺失资源的 404、以及 `/api/teacher/classrooms` 的匿名 401。若回滚，使用之前的 `TEACHER_IMAGE` 重跑相同的 Compose 命令。教师端更新不需要重载入口 Nginx；入口通过 Docker DNS 查找教师容器。
