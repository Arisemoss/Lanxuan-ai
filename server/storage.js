/**
 * 数据目录解析
 *
 * 优先级：
 *   1. DATADIR —— Capacitor-NodeJS 插件注入的 App 私有可写目录
 *      （filesDir/nodejs/data），APK 升级时不会被覆盖
 *   2. LANXUAN_DATA_DIR —— 启动器写入的兼容变量
 *   3. 仓库 data/ —— 常规 Web / Docker 部署
 *
 * 只读部署（如 Vercel 的 /var/task）创建目录会 EROFS，
 * 此时自动回退到 /tmp，避免 require 期抛错导致整个 Serverless 函数初始化失败。
 */

const fs = require('fs');
const path = require('path');

function resolveDataDir() {
  const configured = process.env.DATADIR || process.env.LANXUAN_DATA_DIR;
  const candidates = configured
    ? [configured]
    : [path.join(__dirname, '../data'), '/tmp/lanxuan-data'];

  let lastError;
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch (err) {
      lastError = err;
      if (configured) break; // 显式配置失败时不再静默换目录
    }
  }
  throw lastError;
}

const DATA_DIR = resolveDataDir();

module.exports = { DATA_DIR };
