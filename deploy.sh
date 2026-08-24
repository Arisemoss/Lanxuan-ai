#!/bin/bash

# 兰轩部署脚本
set -e

echo "🚀 兰轩 - 三国杀1v1在线对战平台"
echo "=================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 需要安装 Node.js (>=18)"
    echo "   下载: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低 (当前: $(node -v), 需要: >=18)"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install --production

# 检查环境变量
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  未找到 .env 文件"
    echo "   已复制 .env.example → .env"
    echo "   请编辑 .env 填入 MIMO_API_KEY"
    cp .env.example .env
fi

# 创建数据目录
mkdir -p data

# 启动
echo ""
echo "🎯 启动服务器..."
echo "   访问: http://localhost:3000"
echo "   按 Ctrl+C 停止"
echo ""
node api/server.js
