# 🚀 兰轩 · 国内部署指南

几种**国内免费可用**的部署方式，任选其一。

---

## 方式一：Sealos 🇨🇳（首选推荐）

[Sealos](https://sealos.run) 是国产云操作系统，国内访问速度最快，**免费额度足够**。

### 一键部署

1. 打开 [cloud.sealos.io](https://cloud.sealos.io)
2. 微信扫码登录，进入 **应用管理**
3. 点 **新建应用 → 从 GitHub 导入**
4. 仓库填 `Arisemoss/Lanxuan-ai`
5. 框架选 **Docker**，端口填 `3000`
6. 点 **部署**，等 2 分钟

拿到 `https://xxx.cloud.sealos.io` 链接就能玩了 ✅

### 免费额度

| 项目 | 额度 |
|------|------|
| 容器实例 | 5 个 |
| 存储 | 20 GB |
| 流量 | 够个人用 |
| 休眠 | ❌ 不会休眠 |

> 🎉 不用折腾，直接部署就行。容器是持久化的，游戏存档不会丢。

---

## 方式二：Cloudflare Pages + Workers

Cloudflare 虽是国外公司，但国内访问可用，**完全免费不限量**。

### 第一步：部署前端（Pages）

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，注册登录
2. 左侧 **Workers & Pages → Overview → Create → Pages**
3. **Connect to Git**，授权 GitHub，选 `Arisemoss/Lanxuan-ai`
4. 构建设置：
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Output directory**: `public`
5. 点 **Save and Deploy**

### 第二步：部署后端（Workers）

1. 安装 Wrangler CLI：
   ```bash
   npm install -g wrangler
   ```

2. 创建 Worker：
   ```bash
   cd Lanxuan-ai
   wrangler login
   wrangler init lanxuan-api --yes
   ```

3. 把 `api/` 目录下的 Express 代码改写为 Worker 格式，或用 `@hono/node-server` 适配。

> 📦 需要改写后端代码。如果觉得麻烦，直接用 Sealos 更省心。

---

## 方式三：阿里云 / 腾讯云

如果你有实名账号，也可以：

| 平台 | 方案 |
|------|------|
| **阿里云 SAE** | Serverless 应用引擎，有免费额度 |
| **腾讯云 CloudBase** | 云开发，支持 Web 应用托管 |
| **阿里云 ECS** | 买台最便宜的轻量服务器，`npm start` 就行 |

---

## 方式四：本地部署

```bash
git clone https://github.com/Arisemoss/Lanxuan-ai.git
cd Lanxuan-ai
npm install
NODE_ENV=production npm start
# → http://localhost:3000
```

配合 **frp / ngrok** 内网穿透，也能分享给朋友玩。

---

## ⚙️ 环境变量（可选）

创建 `.env` 文件：

```env
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://你的域名.com
MIMO_API_KEY=你的API密钥
MIMO_API_URL=https://api.xiaomimimo.com/v1/chat/completions
MIMO_MODEL=mimo-v2-flash
```

**不配置 AI API 也无所谓** — 前端自带丰富的本地回复库，兰轩一样会和你聊天 😄

---

## 📤 社交分享

部署链接可以直接分享：

- **微信 / QQ** — 复制链接发送，自动生成卡片
- **朋友圈 / 微博** — 蓝白配色的链接预览
- **手机浏览器** — 适配移动端，跟原生 App 一样

卡片预览的标题和描述在 `public/index.html` 的 `<meta>` 标签里，想改就改。

---

## 📞 遇到问题？

1. 本地测试：`npm start`，访问 `http://localhost:3000/api/health` 看返回
2. 查看部署平台的日志（Sealos 应用详情页有日志面板）
3. 浏览器 F12 → Console → 看有没有报错
4. 提 [GitHub Issue](https://github.com/Arisemoss/Lanxuan-ai/issues)

---

**部署愉快 🎉**