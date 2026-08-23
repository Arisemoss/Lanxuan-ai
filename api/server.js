/**
 * 兰轩在线平台 - 后端API服务
 * 集成中间件、数据持久化、游戏状态管理
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 加载环境变量
require('dotenv').config();

// 导入自定义中间件
const {
  createRateLimiter,
  inputSanitizer,
  requestLogger,
  securityHeaders,
  errorHandler,
  notFoundHandler
} = require('./middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══ 中间件配置 ═══

// 安全响应头
app.use(securityHeaders());

// 请求日志
app.use(requestLogger());

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || true)
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求体解析
app.use(express.json({ limit: '2mb' }));

// 输入清理
app.use(inputSanitizer());

// 静态文件服务（带缓存头）
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// ═══ 速率限制 ═══

const chatLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: '聊天请求过于频繁，请稍后再试'
});

const dataLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: '数据请求过于频繁，请稍后再试'
});

const gameLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: '游戏请求过于频繁，请稍后再试'
});

// ═══ API路由 ═══

// 聊天API
app.use('/api/chat', chatLimiter, require('./chat'));

// 数据持久化API
app.use('/api/data', dataLimiter, require('./data'));

// 游戏状态API
app.use('/api/game', gameLimiter, require('./game'));

// 健康检查端点（增强版）
app.get('/api/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.floor(memUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.floor(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.floor(memUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

// SPA回退 - 所有非API请求返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404处理（API路由未匹配时）
app.use('/api', notFoundHandler());

// 全局错误处理
app.use(errorHandler({
  includeDetails: process.env.NODE_ENV === 'development'
}));

// ═══ 服务器启动 ═══

let server;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`🚀 兰轩在线平台运行在 http://localhost:${PORT}`);
    console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 数据目录: ${path.join(__dirname, '../data')}`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n📴 收到 ${signal} 信号，正在优雅关闭...`);
    server.close(() => {
      console.log('✅ HTTP服务器已关闭');
      process.exit(0);
    });

    // 强制关闭超时（10秒）
    setTimeout(() => {
      console.error('⚠️ 强制关闭服务器');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // 未捕获异常处理
  process.on('uncaughtException', (err) => {
    console.error('🔴 未捕获异常:', err);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('🔴 未处理的Promise拒绝:', reason);
  });
}

module.exports = app;
