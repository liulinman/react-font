# 第一阶段：使用官方 Node.js 镜像作为基础镜像
FROM node:23.3.0 AS build

# 设置工作目录
WORKDIR /app

# 复制项目的 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制其他项目文件
COPY . .

# 运行构建命令
RUN npm run build


# 第二阶段：使用 Nginx 托管静态资源
FROM nginx:alpine

# 将构建好的静态文件复制到 Nginx 的默认静态文件目录
COPY --from=build /app/dist /usr/share/nginx/html

# 复制自定义的 nginx 配置文件到容器中
COPY nginx.conf /etc/nginx/nginx.conf


# 暴露应用监听的端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
