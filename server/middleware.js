/**
 * 通用中间件模块
 * 提供请求限流、输入验证清理、错误分类格式化等功能
 * 全部使用Node.js内置模块实现，无需额外依赖
 */

const crypto = require('crypto');

// ============================================================
// 1. 请求限流增强 - 基于内存的滑动窗口限流器
// ============================================================

/**
 * 创建限流中间件
 * @param {object} options - 配置项
 * @param {number} options.windowMs - 时间窗口（毫秒），默认 15 分钟
 * @param {number} options.max - 窗口内最大请求数，默认 50
 * @param {string} options.message - 超限时的提示消息
 * @param {function} options.keyGenerator - 自定义限流键生成函数
 * @returns {function} Express中间件
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 50,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = null
  } = options;

  // 使用Map存储每个客户端的请求记录
  const store = new Map();

  // 定期清理过期记录，防止内存泄漏
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store) {
      if (now - record.windowStart > windowMs * 2) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 60000));

  // 允许进程正常退出（不阻止事件循环关闭）
  cleanupInterval.unref();

  return function rateLimiterMiddleware(req, res, next) {
    // 生成客户端唯一标识
    const key = keyGenerator
      ? keyGenerator(req)
      : (req.ip || req.connection?.remoteAddress || 'unknown');

    const now = Date.now();
    let record = store.get(key);

    // 如果没有记录或已过期，创建新窗口
    if (!record || now - record.windowStart > windowMs) {
      record = { windowStart: now, count: 0 };
      store.set(key, record);
    }

    record.count++;

    // 设置速率限制响应头
    const remaining = Math.max(0, max - record.count);
    const resetTime = new Date(record.windowStart + windowMs);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.windowStart + windowMs - now) / 1000));
      return res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000)
      });
    }

    next();
  };
}

// ============================================================
// 2. 输入验证和清理
// ============================================================

/**
 * 验证必填字段
 * @param {object} body - 请求体
 * @param {string[]} requiredFields - 必填字段名数组
 * @returns {{ valid: boolean, error?: string }}
 */
function validateRequired(body, requiredFields) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体格式错误' };
  }
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return { valid: false, error: `缺少必填字段: ${field}` };
    }
  }
  return { valid: true };
}

/**
 * 验证字符串长度
 * @param {string} value - 待验证字符串
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @param {string} fieldName - 字段名（用于错误提示）
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStringLength(value, min, max, fieldName = '字段') {
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName}必须是字符串` };
  }
  if (value.length < min) {
    return { valid: false, error: `${fieldName}长度不能少于${min}个字符` };
  }
  if (value.length > max) {
    return { valid: false, error: `${fieldName}长度不能超过${max}个字符` };
  }
  return { valid: true };
}

/**
 * 验证用户ID格式
 * 只允许字母、数字、下划线、短横线，长度 1-64
 * @param {string} userId
 * @returns {{ valid: boolean, error?: string }}
 */
function validateUserId(userId) {
  if (typeof userId !== 'string' || userId.length === 0) {
    return { valid: false, error: '用户ID不能为空' };
  }
  if (userId.length > 64) {
    return { valid: false, error: '用户ID长度不能超过64个字符' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return { valid: false, error: '用户ID只能包含字母、数字、下划线和短横线' };
  }
  return { valid: true };
}

/**
 * 清理和规范化字符串输入
 * - 去除首尾空白
 * - 规范化连续空白
 * - 移除零宽字符
 * @param {string} input
 * @returns {string}
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // 移除零宽字符
    .replace(/\s+/g, ' ')                   // 规范化连续空白
    .trim();
}

/**
 * 递归清理对象中的字符串字段
 * @param {object} obj
 * @param {number} maxDepth - 最大递归深度
 * @returns {object}
 */
function sanitizeObject(obj, maxDepth = 3) {
  if (maxDepth <= 0 || obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // 跳过原型链污染的键
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      cleaned[key] = sanitizeObject(value, maxDepth - 1);
    }
    return cleaned;
  }
  return obj;
}

/**
 * 创建输入清理中间件
 * 自动清理 req.body 中的字符串字段
 * @returns {function} Express中间件
 */
function inputSanitizer() {
  return function inputSanitizerMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  };
}

/**
 * 创建请求体大小限制中间件
 * @param {number} maxSize - 最大字节数，默认 1MB
 * @returns {function} Express中间件
 */
function bodySizeLimiter(maxSize = 1024 * 1024) {
  return function bodySizeLimiterMiddleware(req, res, next) {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: `请求体过大，最大允许 ${Math.floor(maxSize / 1024)}KB`
      });
    }
    next();
  };
}

// ============================================================
// 3. 错误分类和格式化
// ============================================================

/**
 * 错误类型枚举
 */
const ErrorTypes = {
  VALIDATION: 'VALIDATION',       // 输入验证错误
  AUTH: 'AUTH',                   // 认证/授权错误
  NOT_FOUND: 'NOT_FOUND',         // 资源不存在
  RATE_LIMIT: 'RATE_LIMIT',       // 限流
  UPSTREAM: 'UPSTREAM',           // 上游API错误
  NETWORK: 'NETWORK',             // 网络错误
  TIMEOUT: 'TIMEOUT',             // 超时
  INTERNAL: 'INTERNAL',           // 内部服务器错误
  DATA: 'DATA'                    // 数据存储错误
};

/**
 * HTTP状态码映射
 */
const ErrorStatusCodes = {
  [ErrorTypes.VALIDATION]: 400,
  [ErrorTypes.AUTH]: 401,
  [ErrorTypes.NOT_FOUND]: 404,
  [ErrorTypes.RATE_LIMIT]: 429,
  [ErrorTypes.UPSTREAM]: 502,
  [ErrorTypes.NETWORK]: 503,
  [ErrorTypes.TIMEOUT]: 504,
  [ErrorTypes.INTERNAL]: 500,
  [ErrorTypes.DATA]: 500
};

/**
 * 应用错误类 - 带类型分类
 */
class AppError extends Error {
  /**
   * @param {string} type - ErrorTypes 中的类型
   * @param {string} message - 用户友好的错误消息
   * @param {object} details - 额外详情（开发环境返回）
   */
  constructor(type, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type || ErrorTypes.INTERNAL;
    this.statusCode = ErrorStatusCodes[this.type] || 500;
    this.details = details;
  }

  /**
   * 转为JSON响应对象
   * @param {boolean} includeDetails - 是否包含详情（开发环境）
   * @returns {object}
   */
  toJSON(includeDetails = false) {
    const obj = {
      success: false,
      error: this.message,
      type: this.type
    };
    if (includeDetails && this.details) {
      obj.details = this.details;
    }
    return obj;
  }
}

/**
 * 创建全局错误处理中间件
 * 放在所有路由之后
 * @param {object} options
 * @param {boolean} options.includeDetails - 是否在响应中包含错误详情
 * @returns {function} Express错误中间件
 */
function errorHandler(options = {}) {
  const { includeDetails = false } = options;

  return function errorHandlerMiddleware(err, req, res, _next) {
    // 如果是已知的 AppError
    if (err instanceof AppError) {
      const statusCode = err.statusCode;
      return res.status(statusCode).json(err.toJSON(includeDetails));
    }

    // JSON 解析错误
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        error: '请求体JSON格式错误',
        type: ErrorTypes.VALIDATION
      });
    }

    // 请求体过大
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        error: '请求体过大',
        type: ErrorTypes.VALIDATION
      });
    }

    // 未知错误 - 记录日志并返回通用错误
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] 未捕获错误:`, err);

    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      type: ErrorTypes.INTERNAL,
      ...(includeDetails ? { details: { message: err.message, stack: err.stack } } : {})
    });
  };
}

/**
 * 创建404处理中间件（放在所有路由之后、错误处理之前）
 * @returns {function} Express中间件
 */
function notFoundHandler() {
  return function notFoundMiddleware(req, res) {
    res.status(404).json({
      success: false,
      error: '请求的资源不存在',
      type: ErrorTypes.NOT_FOUND,
      path: req.path
    });
  };
}

/**
 * 异步路由包装器 - 自动捕获async函数中的错误
 * @param {function} fn - 异步路由处理函数
 * @returns {function} 包装后的路由处理函数
 */
function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 请求日志中间件 - 轻量级自定义实现
 * 记录请求方法、路径、状态码、响应时间
 * @returns {function} Express中间件
 */
function requestLogger() {
  return function requestLoggerMiddleware(req, res, next) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    // 监听响应完成事件
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const method = req.method;
      const url = req.originalUrl || req.url;
      const contentLength = res.getHeader('content-length') || 0;

      // 根据状态码选择日志级别
      const statusIcon = statusCode >= 500 ? '🔴'
        : statusCode >= 400 ? '🟡'
        : statusCode >= 300 ? '🔵'
        : '🟢';

      console.log(
        `[${timestamp}] ${statusIcon} ${method} ${url} ${statusCode} ${duration}ms ${contentLength}B`
      );
    });

    next();
  };
}

/**
 * 安全响应头中间件
 * 设置常用的安全相关HTTP头
 * @returns {function} Express中间件
 */
function securityHeaders() {
  return function securityHeadersMiddleware(req, res, next) {
    // 防止MIME嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // 防止点击劫持
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // XSS保护（旧浏览器）
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // 控制Referrer信息
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // 权限策略 - 限制浏览器API访问
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // 移除X-Powered-By头
    res.removeHeader('X-Powered-By');

    next();
  };
}

module.exports = {
  // 限流
  createRateLimiter,
  // 输入验证
  validateRequired,
  validateStringLength,
  validateUserId,
  sanitizeString,
  sanitizeObject,
  inputSanitizer,
  bodySizeLimiter,
  // 错误处理
  ErrorTypes,
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  // 日志和安全
  requestLogger,
  securityHeaders
};
