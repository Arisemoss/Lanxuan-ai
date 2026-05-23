# 🎴 兰轩 — 三国杀 1v1 在线对战

> 和傲娇舍友兰轩聊天、对战！智能 AI 对话 × 好感度 × 三国杀，一个链接就能玩。

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## ✨ 特色

| 模块 | 说明 |
|------|------|
| 💬 **AI 聊天** | 傲娇人设，好感度 + 信任度双维度情绪系统 |
| 🀄 **三国杀 1v1** | 关羽 / 赵云 / 张飞 / 黄月英 / 吕布，完整技能 |
| 🎨 **蓝白主题** | 清新现代 UI，手机/电脑全适配 |
| 🔗 **一键分享** | Open Graph 卡片预览，发链接就能玩 |

---

## 🚀 快速部署

### Render（推荐 — 免费）

1. 点击上方 **Deploy to Render** 按钮
2. 连接 GitHub，选择本仓库
3. Render 自动识别 `npm start`，点击 **Create Web Service**
4. 等 2 分钟，获得 `https://你的项目.onrender.com` 链接 ✅

> Render 免费计划有 15 分钟空闲休眠，首次访问会稍慢唤醒。

### 本地运行

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
- **部署** Render / Railway / 自建
- **存储** 浏览器 localStorage（数据不会丢失）

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
├── package.json
└── render.yaml       # Render 部署配置
```

---

## 📄 许可证

MIT · [Arisemoss](https://github.com/Arisemoss)

---

**跟兰轩打个招呼吧 👋🎮**