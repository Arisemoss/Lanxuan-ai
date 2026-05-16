# Lanxuan-ai

一个与傲娇舍友"兰轩"聊天并进行三国杀1v1对战的在线平台。

## 功能特点

- 🎮 **三国杀1v1对战** - 5位武将可选，每位都有独特技能
- 💬 **AI聊天** - 与傲娇角色兰轩互动，好感度系统
- 🔒 **API安全** - API密钥隐藏在后端，前端无法访问
- 💾 **数据持久化** - 本地存储 + 后端存储双重保障
- 📱 **响应式设计** - 支持桌面和移动设备

## 技术栈

- **前端**: HTML5, CSS3, Vanilla JavaScript
- **后端**: Node.js, Express
- **AI**: MiMo API (mimo-v2-flash)
- **部署**: Vercel / Netlify

## 快速开始

### 本地开发

1. 克隆项目
```bash
git clone https://github.com/Arisemoss/Lanxuan-ai.git
cd Lanxuan-ai
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API 密钥
```

4. 启动服务
```bash
npm run dev
```

5. 访问 http://localhost:3000

### 部署到 Vercel

1. Fork 本项目到你的 GitHub

2. 在 Vercel 中导入项目

3. 设置环境变量：
   - `MIMO_API_URL`: `https://api.xiaomimimo.com/v1/chat/completions`
   - `MIMO_API_KEY`: 你的API密钥
   - `MIMO_MODEL`: `mimo-v2-flash`

4. 部署完成！

## 项目结构

```
├── api/                    # 后端API
│   ├── server.js          # Express服务器入口
│   ├── chat.js            # 聊天API（隐藏密钥）
│   └── data.js            # 数据持久化API
├── public/                 # 前端静态文件
│   ├── index.html         # 主页面
│   ├── css/
│   │   └── style.css      # 样式文件
│   └── js/
│       └── app.js         # 前端逻辑
├── .env.example           # 环境变量示例
├── package.json           # 项目配置
└── vercel.json            # Vercel部署配置
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/chat` | POST | 与AI聊天 |
| `/api/data/save` | POST | 保存用户数据 |
| `/api/data/load/:userId` | GET | 加载用户数据 |
| `/api/health` | GET | 健康检查 |

## 武将介绍

| 武将 | 技能 | 特点 |
|------|------|------|
| 关羽 | 武圣、义绝 | 红色闪当杀，可禁用对方闪 |
| 赵云 | 龙胆、涯角 | 杀闪互换，使用后可摸牌 |
| 张飞 | 咆哮、怒吼 | 杀无限制，空手牌可造成伤害 |
| 黄月英 | 集智、奇才 | 使用锦囊额外摸牌 |
| 吕布 | 无双、利驭 | 杀需两张闪抵挡 |

## 安全说明

⚠️ **重要**: API密钥存储在后端环境变量中，前端代码**不包含**任何敏感信息。

- 生产环境请确保 `.env` 文件不被提交到版本控制
- Vercel/Netlify 等平台使用环境变量功能存储密钥
- 前端通过 `/api/chat` 端点间接调用AI API

## License

MIT
