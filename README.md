# 🎴 兰轩 — 三国杀 1v1 在线对战

> 和傲娇舍友兰轩聊天、对战！智能 AI 对话 × 好感度 × 三国杀，一个链接就能玩。

[![Deploy on Sealos](https://raw.githubusercontent.com/labring-actions/templates/main/Deploy-on-Sealos.svg)](https://cloud.sealos.io/?openapp=system-template%3FtemplateName%3Dnodejs)

---

## ✨ 特色

| 模块 | 说明 |
|------|------|
| 💬 **AI 聊天** | 傲娇人设，好感度 + 信任度双维度情绪系统 |
| 🀄 **三国杀 1v1** | 关羽 / 赵云 / 张飞 / 黄月英 / 吕布，完整技能 |
| 🎨 **蓝白主题** | 清新现代 UI，手机/电脑全适配 |
| 🔗 **一键分享** | Open Graph 卡片预览，发链接就能玩 |

---

## 🚀 快速部署（国内免费）

### 方式一：Sealos（推荐 🇨🇳）

[Sealos](https://sealos.run) 是国内云操作系统，**免费额度足够用，国内访问飞快**。

1. 打开 [cloud.sealos.io](https://cloud.sealos.io)，微信扫码登录
2. **应用管理 → 新建应用**
3. 选择 **从 GitHub 导入**，填 `Arisemoss/Lanxuan-ai`
4. 框架选 **Docker**，端口填 `3000`
5. 点击 **部署**，等 2 分钟拿链接 ✅

> 💡 免费额度：5 个容器实例，完全够用。数据存在容器内不会丢。

### 方式二：Cloudflare Pages（全球加速）

虽是国外平台，但国内访问可用，且**完全免费不限量**。

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，注册登录
2. **Workers & Pages → Create → Pages → Connect to Git**
3. 选 `Arisemoss/Lanxuan-ai`
4. **Build command**：`npm run build`，**Output directory**：`public`
5. 另外创建 **Workers** 部署 `api/` 为后端 API

> 📖 详细步骤见 [DEPLOY.md](./DEPLOY.md)

### 方式三：本地运行

```bash
git clone https://github.com/Arisemoss/Lanxuan-ai.git
cd Lanxuan-ai
npm install
npm start          # → http://localhost:3000
```

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

## 🎯 武将一览

| 武将 | 技能 | 效果 |
|------|------|------|
| 关羽 | 武圣 | 红桃手牌当杀 |
| 赵云 | 龙胆 | 杀当闪、闪当杀 |
| 张飞 | 咆哮 | 每回合无限出杀 |
| 黄月英 | 集智 | 使用非延时锦囊摸牌 |
| 吕布 | 无双 | 对手需两张闪 |

---

## 🛠 技术栈

- **前端** HTML5 · CSS3 · Vanilla JS
- **后端** Node.js · Express
- **部署** Sealos / Cloudflare / 自建
- **存储** 浏览器 localStorage（数据不丢失）

---

## 📁 结构

```
├── public/           # 前端
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── api/              # 后端
│   ├── server.js     # Express 入口
│   ├── chat.js       # AI 聊天 API
│   └── data.js       # 数据 API
├── Dockerfile        # Sealos 部署配置
├── package.json
└── DEPLOY.md         # 详细部署指南
```

---

## 📄 许可证

MIT · [Arisemoss](https://github.com/Arisemoss)

---

**跟兰轩打个招呼吧 👋🎮**