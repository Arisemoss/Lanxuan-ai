# 🎴 兰轩 — 三国杀 1v1 在线对战

> 和傲娇舍友兰轩聊天、对战！智能 AI 对话 × 好感度系统 × 三国杀 1v1，一个链接就能玩。

纯 Node.js + 原生前端，**零构建**，克隆即跑；支持 Vercel / Docker / Sealos / Netlify 多种部署方式。

---

## ✨ 功能特性

| 模块 | 说明 |
|------|------|
| 💬 **AI 聊天** | 傲娇人设，好感度 + 信任度双维度情绪系统，情绪实时反映在回复风格里 |
| 🀄 **三国杀 1v1** | 关羽 / 赵云 / 张飞 / 黄月英 / 吕布，双技能完整实现，回合制对战引擎 |
| 🎨 **「青瓷·鎏金」主题** | 新中式暗色 UI：语义化配色、竖排卡牌、桌面三栏 / 移动端抽屉布局，全端响应式 |
| 📊 **战绩统计** | 总对局、胜率、连胜，随账号持久化 |
| 🤖 **多 AI 提供商** | MiMo（默认）/ OpenAI / DeepSeek / Moonshot / SiliconFlow / OpenRouter / 自定义中转，内置主流模型预设，支持手填任意模型 ID |
| 📱 **PWA** | 可安装到手机桌面，Service Worker 离线缓存 |
| 🔗 **一键分享** | Open Graph 卡片预览，发链接就能玩 |
| 🧭 **新手引导** | 首次访问分步引导：认识玩法 → 配置密钥 → 开聊开战 |

---

## 🚀 快速开始

**环境要求：** Node.js ≥ 18

```bash
git clone https://github.com/Arisemoss/Lanxuan-ai.git
cd Lanxuan-ai
npm install
npm start          # → http://localhost:3000
```

无需任何配置即可开箱体验（AI 回复走内置 MiMo 降级模式）。想让兰轩更智能：

- **服务端方式**：设置环境变量 `MIMO_API_KEY`（推荐，所有访客共享）
- **客户端方式**：页面右上角 ⚙ 打开「AI 设置」，填入任意提供商的密钥（仅存浏览器本地）

---

## 🤖 AI 提供商与模型

在「AI 设置」中切换提供商，模型下拉框内置主流预设；列表末尾的**「自定义模型…」**可手填任意模型 ID（适配中转站 / one-api / 新上线的模型）。

| 提供商 | 内置预设 | 接入说明 |
|--------|----------|----------|
| MiMo（默认） | mimo-v2-flash | 服务端环境变量 `MIMO_API_KEY` |
| OpenAI | gpt-5 / gpt-5-mini / gpt-4.1 / gpt-4.1-mini / gpt-4o / gpt-4o-mini / o4-mini | 用户自填密钥 |
| DeepSeek | deepseek-chat / deepseek-reasoner（自动指向最新版） | 用户自填密钥 |
| Moonshot | Kimi K2 系列、kimi-latest、moonshot-v1-128k/32k/8k | 用户自填密钥 |
| SiliconFlow | DeepSeek-V3.1 / V3 / R1、Qwen3 系列、Qwen2.5 系列、GLM-4 | 用户自填密钥 |
| OpenRouter | gpt-5 / claude-sonnet-4 / gemini-2.5 / grok-4 / kimi-k2 等 | 用户自填密钥 |
| 自定义 | 手填模型 ID + 任意 OpenAI 兼容地址（中转站 / one-api） | 用户自填密钥 |

> 模型目录随各家上新而变化，未收录的模型选「自定义模型…」手填即可，无需改代码。

---

## 🎯 武将一览

| 武将 | 技能 | 效果 |
|------|------|------|
| 关羽 | 武圣 + 义绝 | 红色闪当杀；弃红牌令对方无法用闪 |
| 赵云 | 龙胆 + 涯角 | 杀闪互换；使用杀/闪时额外摸牌 |
| 张飞 | 咆哮 + 怒吼 | 无限出杀；手牌为 0 时造成伤害 |
| 黄月英 | 集智 + 奇才 | 锦囊额外摸牌；锦囊当无中生有 |
| 吕布 | 无双 + 利驭 | 杀需两张闪；弃牌视为出杀 |

牌堆（66 张）：杀 ×30 · 闪 ×15 · 桃 ×8 · 无中生有 ×4 · 过河拆桥 ×3 · 南蛮入侵 ×3 · 万箭齐发 ×3

## 📊 好感度等级

| 区间 | 关系 |
|------|------|
| 0 – 59 | 普通舍友 |
| 60 – 69 | 好朋友 |
| 70 – 79 | 挚友 |
| 80 – 89 | 铁哥们 |
| 90+ | 死基友 🔥 |

---

## 📦 部署

详细步骤（Vercel / Docker / Docker Compose / Sealos / Netlify）见 **[DEPLOY.md](DEPLOY.md)**，常用方式：

**Vercel**：Fork 仓库 → vercel.com 导入 → Framework 选 **Other** → 部署后添加环境变量 `MIMO_API_KEY`。

**Docker**：

```bash
docker build -t lanxuan .
docker run -d -p 3000:3000 -e MIMO_API_KEY=your_key -v lanxuan-data:/app/data lanxuan
```

### 环境变量（服务端）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `MIMO_API_URL` | MiMo API 地址 | `https://api.xiaomimimo.com/v1/chat/completions` |
| `MIMO_API_KEY` | MiMo API 密钥 | 无（不填走降级模式） |
| `MIMO_MODEL` | 默认模型 | `mimo-v2-flash` |
| `PORT` | 服务端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `ALLOWED_ORIGINS` | CORS 允许来源 | 生产环境建议配置 |

---

## 🏗️ 项目结构

```
Lanxuan-ai/
├── api/
│   └── server.js         # Express 入口：静态资源 + 路由挂载 + 健康检查
│                         # （部署平台上唯一的 Serverless 函数入口）
├── server/               # 服务端业务模块
│   ├── chat.js           # 聊天 API：多提供商适配、降级回复、错误分类
│   ├── data.js           # 用户数据持久化（文件系统，原子写入 + 备份）
│   ├── game.js           # 对局结果 / 战绩统计 API
│   └── middleware.js     # 限流、输入验证、安全头、错误处理
├── public/               # 前端（原生 HTML/CSS/JS，无构建）
│   ├── index.html        # 单页主界面
│   ├── css/style.css     # 「青瓷·鎏金」设计系统：语义色板 + 字号阶 + 4px 间距栅格
│   ├── js/app.js         # 聊天、好感度引擎、三国杀对战引擎、AI 设置
│   ├── sw.js             # Service Worker（更新资源后请递增 CACHE_NAME）
│   └── manifest.json     # PWA 清单
├── data/                 # 运行时用户数据（gitignored，Docker 部署时挂载卷）
├── netlify/functions/    # Netlify 部署适配
├── Dockerfile            # Docker 部署配置
├── vercel.json           # Vercel 部署配置（builds 白名单：api/server.js + public/**）
└── package.json
```

> **架构说明**：`api/server.js` 是唯一的后端入口，业务全部放在 `server/` 目录。在 Serverless 平台（Vercel）上这样能保证只部署一个函数；`vercel.json` 使用 builds 白名单而非 functions 配置，避免 `api/` 下多余文件被识别成幽灵函数抢路由。

---

## 🔒 安全特性

- 输入验证与清理（防 XSS / 注入）
- API 速率限制（滑动窗口算法，聊天 / 数据 / 对局接口独立限额）
- 安全响应头（X-Content-Type-Options、X-Frame-Options 等）
- 文件系统原子写入（防数据损坏），每用户自动保留 5 份备份
- 用户自填的 API 密钥仅存浏览器 localStorage，不经过服务器落盘

---

## 🛠️ 开发注意

- **改前端资源后**：递增 `public/sw.js` 的 `CACHE_NAME`，否则老用户的 PWA 缓存不会更新
- **新增服务端模块**：放 `server/` 目录，在 `api/server.js` 里 `require('../server/xxx')` 挂载，不要放回 `api/`
- **改模型预设**：前端 `public/js/app.js` 的 `PROVIDER_MODELS` 与后端 `server/chat.js` 的 `PROVIDERS` 两处保持同步

## 📄 License

MIT
