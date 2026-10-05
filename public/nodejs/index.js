/**
 * 兰轩 - Android 内嵌 Node 后端启动器
 *
 * 由 @hampoelz/capacitor-nodejs 在 App 启动时执行：
 *   1. 准备可持久化的数据目录（App 沙箱 files 目录）
 *   2. 注入移动端所需的环境变量
 *   3. 拉起现有的 Express 服务（api/server.js）
 *   4. 捕获异常并写入日志，避免静默崩溃
 *
 * 注意：本文件不修改任何现有业务逻辑，仅作为「启动封装」。
 */

const path = require('path');

// ═══ 1. 数据目录 ═══
// 后端 (server/data.js) 用相对 __dirname 的方式写数据：<工程>/server/../data，
// 即 public/nodejs/data。该路径位于 App 可写沙箱内，可跨启动持久化。
// 此处仅计算并记录该路径，便于排查；不改变后端既有解析逻辑。
try {
  const dataDir = path.join(__dirname, 'data');
  process.env.LANXUAN_DATA_DIR = dataDir;
} catch (_) {
  /* 忽略：由后端使用默认路径 */
}

// ═══ 2. 环境变量 ═══
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';
// 仅本机回环访问，无需限制跨域来源
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '';

// ═══ 3. Node for Mobile 兼容性兜底 ═══
// 部分精简版 Node 运行时可能缺失 fetch / AbortController，
// 而 server/chat.js 依赖它们调用第三方 AI API。此处做最小 polyfill。
(function ensureGlobals() {
  const g = globalThis;

  if (typeof g.AbortController === 'undefined') {
    // 极简 AbortController：仅保证不抛错，超时由 fetch 包装层处理
    g.AbortController = class AbortController {
      constructor() { this.signal = { aborted: false }; }
      abort() { this.signal.aborted = true; }
    };
  }

  if (typeof g.fetch === 'undefined') {
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');

    g.fetch = function fetch(url, options = {}) {
      return new Promise((resolve, reject) => {
        let target;
        try {
          target = new URL(url);
        } catch (e) {
          return reject(new TypeError('Invalid URL: ' + url));
        }

        const lib = target.protocol === 'https:' ? https : http;
        const reqOptions = {
          method: options.method || 'GET',
          headers: options.headers || {},
          hostname: target.hostname,
          port: target.port || (target.protocol === 'https:' ? 443 : 80),
          path: target.pathname + target.search
        };

        const req = lib.request(reqOptions, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const bodyBuffer = Buffer.concat(chunks);
            const text = bodyBuffer.toString('utf-8');
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage || '',
              headers: {
                get: (name) => res.headers[String(name).toLowerCase()]
              },
              text: () => Promise.resolve(text),
              json: () => Promise.resolve(JSON.parse(text))
            });
          });
        });

        req.on('error', reject);

        // 支持 AbortSignal（超时用）
        if (options.signal && typeof options.signal.addEventListener === 'function') {
          options.signal.addEventListener('abort', () => {
            req.destroy(new Error('The operation was aborted'));
          });
        } else if (options.signal && options.signal.aborted) {
          req.destroy(new Error('The operation was aborted'));
        }

        if (options.body) req.write(options.body);
        req.end();
      });
    };
  }
})();

// ═══ 4. 启动后端 ═══
const log = (...args) => console.log('[Lanxuan/Node]', ...args);

try {
  log('数据目录:', process.env.LANXUAN_DATA_DIR);
  log('启动端口:', process.env.PORT);

  // 现有后端唯一入口（构建前由 scripts/prepare-node-backend.js 暂存到 ./api/），
  // 保持零改动直接复用。
  const app = require('./api/server.js');

  log('Express 应用已加载');

  // api/server.js 在作为主模块时自行 listen；被 require 时导出 app。
  // 这里确保服务确实开始监听（兼容导出 app 的情形）。
  if (app && typeof app.listen === 'function') {
    app.listen(Number(process.env.PORT), '127.0.0.1', () => {
      log('本地后端已启动: http://127.0.0.1:' + process.env.PORT);
    });
  }
} catch (err) {
  console.error('[Lanxuan/Node] 后端启动失败:', err && err.stack ? err.stack : err);
}

// ═══ 5. 兜底异常处理 ═══
process.on('uncaughtException', (err) => {
  console.error('[Lanxuan/Node] 未捕获异常:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Lanxuan/Node] 未处理的 Promise 拒绝:', reason);
});
