# 第一阶段：pnpm monorepo 构建
FROM node:23.3.0 AS build

WORKDIR /app

# 安装 pnpm（用 npm 全局安装；使用官方源，避免 npmmirror 同步缺失导致安装残缺）
RUN npm install -g pnpm@10.8.1

# 复制 workspace 配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/english-world/package.json ./apps/english-world/
COPY apps/web-utils/package.json ./apps/web-utils/
COPY packages/api/package.json ./packages/api/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/

# 安装依赖（仅 production 可省略 devDependencies，这里保留以便 build）
# 使用官方 npm 源 + 重试/超时，规避 npmmirror 同步缺失与偶发拉取失败
RUN pnpm config set registry https://registry.npmjs.org/ \
    && pnpm install --frozen-lockfile \
        --fetch-retries 5 \
        --fetch-timeout 120000 \
        --fetch-retry-mintimeout 10000 \
        --fetch-retry-maxtimeout 60000

# 复制源码
COPY . .

# 构建前台应用和独立后台应用
RUN pnpm --filter @font/english-world build \
    && pnpm --filter @font/admin build

# 第二阶段：Nginx 托管
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/english-world/dist /usr/share/nginx/html
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html/admin

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
