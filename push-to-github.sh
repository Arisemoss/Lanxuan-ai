#!/bin/bash

# 兰轩项目GitHub上传脚本

echo "🚀 开始上传兰轩-三国杀1v1对战平台到GitHub"
echo ""
echo "📝 请先访问 https://github.com 创建新仓库"
echo "   仓库名建议：lanxuan-game"
echo "   不要添加README、.gitignore或LICENSE"
echo ""
read -p "✅ 准备好了吗？输入你的GitHub用户名：" username
read -p "📦 输入仓库名：" repo_name

# 配置Git（如果还没配置）
git config --global user.name "$username"
git config --global user.email "$username@users.noreply.github.com"

# 添加远程仓库
echo ""
echo "🔗 连接到GitHub仓库..."
git remote add origin https://github.com/$username/$repo_name.git
git branch -M main

# 推送
echo "📤 正在推送代码..."
git push -u origin main

echo ""
echo "✅ 上传完成！"
echo ""
echo "🌐 访问：https://github.com/$username/$repo_name"
echo ""
echo "🚀 点击 README.md 查看部署到Vercel！"
