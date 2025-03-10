# 使用一个轻量级的 Node 镜像作为基础镜像
FROM nginx:alpine

# 创建目录（如果需要）
COPY dist/ /usr/share/nginx/html/

# 将 React 构建后的文件复制到 react 的默认静态文件路径
COPY dist/ /usr/share/nginx/html/

# 暴露端口
EXPOSE 80

# 启动 Nginx 服务
CMD ["nginx", "-g", "daemon off;"]
