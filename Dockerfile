# 兰轩 - 三国杀1v1在线对战
FROM node:18-alpine

WORKDIR /app

# 安装依赖（install 比 ci 宽容，不会因 lockfile 版本偏差退出）
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# 复制源码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动
CMD ["node", "api/server.js"]