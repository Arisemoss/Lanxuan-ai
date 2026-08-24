# 🎴 兰轩 — 三国杀 1v1 在线对战

> 和傲娇舍友兰轩聊天、对战！智能 AI 对话 × 好感度 × 三国杀，一个链接就能玩。

---

## ✨ 特色

| 模块 | 说明 |
|------|------|
| 💬 **AI 聊天** | 傲娇人设，好感度 + 信任度双维度情绪系统 |
| 🀄 **三国杀 1v1** | 关羽 / 赵云 / 张飞 / 黄月英 / 吕布，完整技能 |
| 🎨 **暗色主题** | 玻璃拟态 UI，手机/电脑全适配 |
| 📊 **战绩统计** | 胜率、连胜、武将使用分析 |
| 📱 **PWA 支持** | 可安装到手机桌面，离线缓存 |
| 🔗 **一键分享** | Open Graph 卡片预览，发链接就能玩 |

---

## 🚀 快速部署

### 方式一：本地运行

```bash
git clone https://github.com/Arisemoss/Lanxuan-ai.git
cd Lanxuan-ai
npm install
npm start          # → http://localhost:3000
```

### 方式二：Vercel（全球 CDN）

1. Fork 本仓库
2. 打开 [vercel.com](https://vercel.com)，导入 GitHub 仓库
3. 框架选 **Other**，直接 Deploy
4. 在 Settings → Environment Variables 添加 `MIMO_API_KEY`

### 方式三：Docker

```bash
docker build -t lanxuan .
docker run -p 3000:3000 -e MIMO_API_KEY=your_key lanxuan
```

### 方式四：Sealos（国内免费）

1. 打开 [cloud.sealos.io](https://cloud.sealos.io)，微信扫码登录
2. 应用管理 → 新建应用 → 从 GitHub 导入
3. 框架选 Docker，端口填 3000，部署

---

## 🎯 武将一览

| 武将 | 技能 | 效果 |
|------|------|------|
| 关羽 | 武圣 + 义绝 | 红色闪当杀；弃红牌令对方无法用闪 |
| 赵云 | 龙胆 + 涯角 | 杀闪互换；使用杀/闪时额外摸牌 |
| 张飞 | 咆哮 + 怒吼 | 无限出杀；手牌为0时造成伤害 |
| 黄月英 | 集智 + 奇才 | 锦囊额外摸牌；锦囊当无中生有 |
| 吕布 | 无双 + 利驭 | 杀需两张闪；弃牌视为出杀 |

---

## 📊 好感度等级

| 区间 | 关系 |
|------|------|
| 0 – 59 | 普通舍友 |
| 60 – 69 | 好朋友 |
| 70 – 79 | 挚友 |
| 80 – 89 | 铁哥们 |
| 90+ | 死基友 🔥 |

---

## ⚙️ AI 配置

支持多种 AI 提供商，用户可在前端设置中自行切换：

| 提供商 | 说明 |
|--------|------|
| MiMo（默认） | 内置，开箱即用 |
| OpenAI | GPT-4o / GPT-4o-mini |
| DeepSeek | deepseek-chat / deepseek-reasoner |
| Moonshot | moonshot-v1-8k / 32k / 128k |
| SiliconFlow | DeepSeek-V3 / Qwen2.5 |
| OpenRouter | 多模型聚合 |
| 自定义 | 任意 OpenAI 兼容 API |

---

## 🏗️ 项目结构

```
Lanxuan-ai/
├── api/
│   ├── server.js       # Express 服务器 + 中间件栈
│   ├── chat.js         # 聊天 API（多提供商支持）
│   ├── data.js         # 用户数据持久化（文件系统）
│   ├── game.js         # 游戏状态/历史/战绩 API
│   └── middleware.js   # 限流、验证、错误处理、安全头
├── public/
│   ├── index.html      # 主页面
│   ├── css/style.css   # 暗色玻璃拟态主题
│   ├── js/app.js       # 前端应用逻辑 + 游戏引擎
│   ├── sw.js           # Service Worker（PWA）
│   └── manifest.json   # PWA 清单
├── data/               # 运行时数据（gitignored）
├── Dockerfile          # Docker 部署配置
├── vercel.json         # Vercel 部署配置
└── package.json
```

---

## 🔒 安全特性

- 输入验证与清理（防 XSS / 注入）
- API 速率限制（滑动窗口算法）
- 安全响应头（X-Content-Type-Options, X-Frame-Options 等）
- 文件系统原子写入（防数据损坏）
- 自动数据备份（每用户保留 5 份）
- API 密钥仅存浏览器本地，不上传服务器

---

## 📄 License

MIT
