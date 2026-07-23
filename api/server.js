/**
 * 兰轩在线平台 - 后端API服务
 * 隐藏API密钥，提供安全的聊天和数据持久化服务
 * 
 * 注意：在 Vercel Serverless 环境下，api/data.js 的文件持久化不适用。
 * 如需完整 Serverless 支持，请使用 Netlify 或外置数据库。
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// 加载环境变量
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 安全与限流中间件 ====================

// 内存中的 IP 限流存储
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 30;        // 每个IP每分钟最多30次请求
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分钟窗口

/**
 * IP 限流中间件
 */
function rateLimitMiddleware(req, res, next) {
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown';

  const now = Date.now();
  let record = rateLimitMap.get(clientIp);

  if (!record) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(clientIp, record);
  } else {
    if (now > record.resetTime) {
      // 窗口已过期，重置
      record.count = 1;
      record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
      record.count += 1;
    }
  }

  // 设置限流相关的响应头
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - record.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

  if (record.count > RATE_LIMIT_MAX) {
    console.warn(`[RateLimit] IP ${clientIp} 超过限流: ${record.count} 请求/分钟`);
    return res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  next();
}

/**
 * 请求体验证中间件
 */
function validateRequestMiddleware(req, res, next) {
  // 验证 Content-Type（仅针对有请求体的 POST/PUT/PATCH）
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';

    // 允许空body或明确指定JSON的请求
    if (req.headers['content-length'] && parseInt(req.headers['content-length']) > 0) {
      if (!contentType.includes('application/json')) {
        return res.status(415).json({
          error: '不支持的媒体类型，请使用 application/json'
        });
      }
    }
  }

  next();
}

/**
 * 基本请求头安全检查中间件
 */
function securityHeadersMiddleware(req, res, next) {
  // 阻止明显的恶意请求头
  const userAgent = req.headers['user-agent'] || '';
  const forbiddenHeaders = ['x-http-method-override', 'x-http-method', 'x-method-override'];

  for (const h of forbiddenHeaders) {
    if (req.headers[h]) {
      console.warn(`[Security] 检测到可疑请求头: ${h}=${req.headers[h]} from ${req.ip}`);
      return res.status(403).json({ error: '非法请求头' });
    }
  }

  // 可选：阻止无 User-Agent 的请求（爬虫/脚本通常没有）
  if (!userAgent && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '缺少 User-Agent 请求头' });
  }

  next();
}

// ==================== CORS 配置 ====================

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 预检缓存24小时
};

// 应用中间件（注意顺序）
app.use(securityHeadersMiddleware);
app.use(rateLimitMiddleware);

// CORS 中间件 + 显式处理预检请求
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 处理所有路由的预检请求

// 请求体验证需要在 body-parser 之前检查请求头
app.use(validateRequestMiddleware);

// Body parser（限制大小）
app.use(express.json({ limit: '1mb' }));

// ==================== 静态文件与路由 ====================

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

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
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  // 处理 body-parser 大小超限错误
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: '请求体过大',
      message: '请求数据超过 1MB 限制'
    });
  }

  // 处理 JSON 解析错误
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: '无效的 JSON 格式',
      message: process.env.NODE_ENV === 'development' ? err.message : '请检查请求体格式'
    });
  }

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