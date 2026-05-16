# 🚀 兰轩 - 三国杀1v1在线对战平台

一个完整的在线网页应用，可以直接部署和分享给朋友！

## ✨ 特色功能

- 🎮 **三国杀1v1对战** - 与智能AI进行紧张刺激的对战
- 💬 **智能聊天AI** - 支持好感度和信任度系统
- 🎨 **蓝白配色主题** - 清新的视觉设计
- 📱 **响应式设计** - 支持各种设备
- 🔗 **一键分享** - 优化了社交分享meta标签

## 🛠️ 快速部署

### 方式一：Vercel部署（推荐）

1. **Fork项目**
   - 点击右上角 "Fork" 按钮复制项目到你的GitHub

2. **连接Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 使用GitHub账号登录
   - 点击 "New Project"
   - 选择刚刚Fork的项目
   - 点击 "Deploy"

3. **配置环境变量（可选）**
   - 在Vercel项目设置中添加：
   - `MIMO_API_KEY`: 你的API密钥（用于更智能的对话）

4. **完成！**
   - 获取部署URL，如：`https://your-project.vercel.app`
   - 可以直接分享这个链接给朋友

### 方式二：Netlify部署

1. **Fork项目到GitHub**

2. **连接Netlify**
   - 访问 [netlify.com](https://netlify.com)
   - 使用GitHub账号登录
   - 点击 "Add new site" → "Import an existing project"
   - 选择GitHub项目
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `public`
   - 点击 "Deploy site"

### 方式三：直接下载使用

1. **下载public文件夹**
   - 下载整个项目到本地
   - 只需 `public` 文件夹即可独立运行

2. **本地运行**
   - 直接在浏览器打开 `public/index.html`
   - 注意：聊天功能需要启动后端服务器

## 🌐 部署到自己的域名

### Vercel
1. 进入项目设置 → Domains
2. 输入你的域名（如：`game.example.com`）
3. 按照提示配置DNS记录
4. 等待SSL证书自动配置

### Netlify
1. 进入 Site settings → Domain management
2. 点击 "Add custom domain"
3. 配置DNS记录指向Netlify
4. 启用HTTPS（自动配置）

## 📤 社交分享

网页已优化社交分享体验：

### 分享链接格式
```
https://your-deployed-url.vercel.app/
```

### 分享到社交平台
- **微信/QQ**: 可以直接复制链接发送
- **微博**: 链接卡片自动生成预览
- **Twitter**: 显示优化的大图卡片
- **Facebook**: 显示标题、描述和预览图
- **Discord**: 显示丰富的链接预览

### 自定义分享信息
编辑 `public/index.html` 中的meta标签：

```html
<meta property="og:title" content="你的标题">
<meta property="og:description" content="你的描述">
<meta property="og:image" content="预览图片URL">
```

## ⚙️ 功能说明

### 对话系统
- **好感度**: 影响对话语气和互动
- **信任度**: 体现你的真诚程度
- **情绪**: AI会根据对话内容展现不同情绪

### 好感度等级
- 0-59: 普通舍友
- 60-69: 好朋友
- 70-79: 挚友
- 80-89: 铁哥们
- 90+: 死基友

### 三国杀对战
- 5位可选武将，各有独特技能
- 智能AI对手
- 完整的三国杀1v1规则

## 🔧 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

## 📁 项目结构

```
/workspace
├── public/                 # 前端文件
│   ├── index.html         # 主页面
│   ├── css/
│   │   └── style.css     # 样式文件
│   └── js/
│       └── app.js        # 前端逻辑
├── api/                   # 后端API
│   ├── server.js         # 服务器入口
│   ├── chat.js           # 聊天API
│   └── data.js           # 数据存储API
├── vercel.json           # Vercel配置
└── package.json          # 项目配置
```

## 🎯 API配置（可选）

如果想要更智能的对话体验，可以配置AI API：

1. 获取MiMo API密钥
2. 创建 `.env` 文件：
   ```env
   MIMO_API_KEY=your_api_key_here
   MIMO_API_URL=https://api.xiaomimimo.com/v1/chat/completions
   MIMO_MODEL=mimo-v2-flash
   ```
3. 重启服务器

## 🌟 技术栈

- **前端**: HTML5, CSS3, JavaScript ES6+
- **后端**: Node.js, Express
- **部署**: Vercel / Netlify
- **AI**: MiMo API (可选)

## 📝 注意事项

1. **数据存储**: 默认使用浏览器本地存储，切换设备会重置数据
2. **API密钥**: 不要将API密钥提交到GitHub，使用环境变量
3. **跨域**: 部署时确保API和前端在同一域名下

## 🎉 开始使用

1. 访问部署好的网站
2. 和兰轩打个招呼吧！
3. 点击"三国杀"开始对战
4. 通过对话提升好感度和信任度

## 📞 支持

如果遇到问题：
1. 检查浏览器控制台错误信息
2. 确认网络连接正常
3. 尝试清除浏览器缓存
4. 查看部署平台的日志

---

**祝你玩得开心！🎮**
