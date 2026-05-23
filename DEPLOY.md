# 🚀 兰轩 · 部署指南

几种免费部署方式，任选其一。

---

## 方式一：Render（推荐）

Render 原生支持 Node.js，免费计划足够日常使用。

### 一键部署

点击仓库 README 中的 **Deploy to Render** 按钮，或：

1. 打开 [render.com](https://render.com)，GitHub 登录
2. **New → Web Service**，选择 `Arisemoss/Lanxuan-ai`
3. 确认配置：
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. 点击 **Create Web Service**

### 免费计划说明

| 特性 | 限制 |
|------|------|
| 运行时间 | 750 小时/月 ✅ 够用 |
| 休眠 | 15 分钟无请求后休眠，下次请求自动唤醒（约 30 秒） |
| 带宽 | 100 GB/月 |
| 自定义域名 | 支持 ✅ |

> 💡 可以用 [UptimeRobot](https://uptimerobot.com) 或 [Cron-job.org](https://cron-job.org) 每 10 分钟 ping 一次，避免休眠。

---

## 方式二：Railway

1. 打开 [railway.app](https://railway.app)，GitHub 登录
2. **New Project → Deploy from GitHub repo**
3. 选择 `Arisemoss/Lanxuan-ai`
4. 自动部署，获得 `xxx.up.railway.app` 链接

> Railway 免费计划每月 $5 额度，够用。

---

## 方式三：自建服务器

```bash
git clone https://github.com/Arisemoss/Lanxuan-ai.git
cd Lanxuan-ai
npm install --production
NODE_ENV=production PORT=80 npm start
```

配合 nginx + systemd + Let's Encrypt 即可上线。

---

## ⚙️ 环境变量（可选）

创建 `.env` 文件：

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com
MIMO_API_KEY=你的API密钥
MIMO_API_URL=https://api.xiaomimimo.com/v1/chat/completions
MIMO_MODEL=mimo-v2-flash
```

不配置 AI API 也没关系，前端自带丰富的本地回复库。

---

## 📤 社交分享

任意部署链接都可以直接分享：

- **微信 / QQ** — 复制链接发送
- **微博 / Twitter** — 自动生成卡片预览
- **Discord / Telegram** — 丰富的链接预览

卡片信息在 `public/index.html` 的 `<meta>` 标签里，可自行修改。

---

## 📞 遇到问题？

1. 确认 `npm start` 在本地能跑 (`http://localhost:3000/api/health`)
2. 查看 Render / Railway 的部署日志
3. 浏览器 F12 查看控制台报错
4. 提 [GitHub Issue](https://github.com/Arisemoss/Lanxuan-ai/issues)

---

**部署愉快 🎉**