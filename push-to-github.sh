#!/bin/bash

# push-to-github.sh - 兰轩 - 三国杀1v1在线对战平台 GitHub 推送脚本
#
# 说明：
#   本脚本将当前仓库推送到用户指定的 GitHub 仓库。
#   支持通过环境变量在非交互环境（如 CI / 沙箱）中运行：
#     - GITHUB_USERNAME: GitHub 用户名
#     - GITHUB_REPO:     GitHub 仓库名
#   若未设置上述环境变量，脚本会回退到交互式读取。

set -euo pipefail

# 获取 GitHub 用户名和仓库名
if [[ -n "${GITHUB_USERNAME:-}" && -n "${GITHUB_REPO:-}" ]]; then
  username="$GITHUB_USERNAME"
  repo_name="$GITHUB_REPO"
  echo "✅ 使用环境变量 GITHUB_USERNAME 和 GITHUB_REPO"
else
  echo "📝 未检测到 GITHUB_USERNAME / GITHUB_REPO 环境变量，进入交互模式"
  read -rp "✅ 准备好了吗？输入你的 GitHub 用户名：" username
  read -rp "📦 输入仓库名：" repo_name
fi

echo ""
echo "🚀 开始上传兰轩-三国杀1v1对战平台到GitHub"
echo ""
echo "📝 请先访问 https://github.com 创建新仓库"
echo "   仓库名建议：$repo_name"
echo "   不要添加 README、.gitignore 或 LICENSE"
echo ""

# 配置Git（如果还没配置）
git config --global user.name "$username"
git config --global user.email "$username@users.noreply.github.com"

# 添加或更新远程仓库
repo_url="https://github.com/$username/$repo_name.git"
echo "🔗 连接到GitHub仓库: $repo_url"

if git remote get-url origin >/dev/null 2>&1; then
  echo "   检测到已存在 origin remote，更新其 URL..."
  git remote set-url origin "$repo_url"
else
  echo "   添加 origin remote..."
  git remote add origin "$repo_url"
fi

git branch -M main

# 推送
echo ""
echo "📤 正在推送代码..."
git push -u origin main

echo ""
echo "✅ 上传完成！"
echo ""
echo "🌐 访问：https://github.com/$username/$repo_name"
echo ""
echo "🚀 点击 README.md 查看部署到Vercel！"
