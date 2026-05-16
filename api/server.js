/**
 * 兰轩在线平台 - 后端API服务
 * 隐藏API密钥，提供安全的聊天和数据持久化服务
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 加载环境变量
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true
    : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// API路由
app.use('/api/chat', require('./chat'));
app.use('/api/data', require('./data'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// SPA回退 - 所有非API请求返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 启动服务器（仅在非Vercel环境下）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 兰轩在线平台运行在 http://localhost:${PORT}`);
    console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
