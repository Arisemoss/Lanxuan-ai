FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 生产环境（启用静态缓存、CORS 默认策略与精简错误信息）
ENV NODE_ENV=production

# 复制依赖文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制项目文件
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 设置权限
RUN chown -R node:node /app

# 切换到非root用户
USER node

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# 启动命令
CMD ["node", "api/server.js"]
