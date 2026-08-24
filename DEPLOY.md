# 🚀 部署指南

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MIMO_API_URL` | MiMo API 地址 | `https://api.xiaomimimo.com/v1/chat/completions` |
| `MIMO_API_KEY` | MiMo API 密钥 | 无（需配置） |
| `MIMO_MODEL` | 默认模型 | `mimo-v2-flash` |
| `PORT` | 服务端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `ALLOWED_ORIGINS` | CORS 允许来源 | 生产环境需配置 |

## Vercel 部署

1. Fork 本仓库到你的 GitHub
2. 登录 [vercel.com](https://vercel.com)
3. **New Project** → 导入刚 Fork 的仓库
4. **Framework Preset**: Other
5. **Build Command**: `npm run build`
6. **Output Directory**: `public`
7. 点击 **Deploy**
8. 部署完成后，进入 **Settings → Environment Variables** 添加：
   - `MIMO_API_KEY` = 你的 API 密钥

## Docker 部署

```bash
# 构建镜像
docker build -t lanxuan .

# 运行容器
docker run -d \
  --name lanxuan \
  -p 3000:3000 \
  -e MIMO_API_KEY=your_key \
  -v lanxuan-data:/app/data \
  lanxuan

# 查看日志
docker logs -f lanxuan
```

## Docker Compose

```yaml
version: '3.8'
services:
  lanxuan:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MIMO_API_KEY=your_key
      - NODE_ENV=production
    volumes:
      - lanxuan-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  lanxuan-data:
```

## Sealos 部署（国内推荐）

1. 打开 [cloud.sealos.io](https://cloud.sealos.io)
2. 微信扫码登录
3. 应用管理 → 新建应用
4. 从 GitHub 导入，填 `Arisemoss/Lanxuan-ai`
5. 框架选 **Docker**，端口填 `3000`
6. 环境变量添加 `MIMO_API_KEY`
7. 点击部署

## 数据存储

- 用户数据存储在 `data/` 目录
- 自动备份（每用户最多 5 份）
- 30 天未活跃的用户数据自动清理
- Docker 部署建议挂载 `/app/data` 卷持久化

## 健康检查

```
GET /api/health
```

返回服务器状态、内存使用、运行时间等信息。
