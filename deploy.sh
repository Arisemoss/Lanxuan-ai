#!/bin/bash

# 兰轩部署脚本

echo "🚀 开始部署兰轩-三国杀1v1对战平台..."

# 检查是否安装了git
if ! command -v git &> /dev/null; then
    echo "❌ 错误: 需要安装Git才能继续"
    echo "请访问 https://git-scm.com 下载安装"
    exit 1
fi

# 检查是否安装了vercel
if ! command -v vercel &> /dev/null; then
    echo "📦 正在安装Vercel CLI..."
    npm install -g vercel
fi

# 初始化git（如果还没有）
if [ ! -d .git ]; then
    echo "📝 初始化Git仓库..."
    git init
    git add .
    git commit -m "feat: 兰轩-三国杀1v1对战平台"
fi

echo "🌐 部署到Vercel..."
echo ""
echo "请按照提示完成部署："
echo "1. 登录Vercel（如果没有账号需要先注册）"
echo "2. 选择你的GitHub仓库"
echo "3. 点击Deploy"
echo ""

# 启动vercel部署
vercel

echo ""
echo "✅ 部署完成！"
echo "你现在可以通过Vercel提供的URL访问你的网站了"
echo ""
echo "💡 小贴士："
echo "- 在Vercel后台可以添加自定义域名"
echo "- 可以配置环境变量来启用更智能的AI对话"
echo "- 网页已经优化了社交分享，直接分享链接即可"
