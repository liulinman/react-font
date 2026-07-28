# 第一阶段：pnpm monorepo 构建
FROM node:23.3.0 AS build

WORKDIR /app

# 安装 pnpm（用 npm 安装避免 corepack 签名校验与镜像不兼容）
RUN npm config set registry https://registry.npmmirror.com \
    && npm install -g pnpm@10.8.1

# 复制 workspace 配置
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/english-world/package.json ./apps/english-world/
COPY apps/web-utils/package.json ./apps/web-utils/
COPY packages/api/package.json ./packages/api/
COPY packages/utils/package.json ./packages/utils/
COPY packages/ui/package.json ./packages/ui/

# 安装依赖（仅 production 可省略 devDependencies，这里保留以便 build）
RUN pnpm config set registry https://registry.npmmirror.com \
    && pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建 english-world 应用（默认部署此应用）
RUN pnpm --filter @font/english-world build

# 第二阶段：Nginx 托管
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/apps/english-world/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
