#!/usr/bin/env node
/**
 * 兰轩 - 准备 App 内嵌的 Node 后端
 *
 * 现有后端源码位于仓库根的 api/ 与 server/（与 Web 部署共用）。
 * Capacitor 只会打包 webDir（public/）内容，因此构建前需把后端
 * 暂存到 public/nodejs/ 下，供插件启动器 require。
 *
 * ⚠️ 路径兼容：现有后端用相对 __dirname 的方式定位资源
 *   - api/server.js  → path.join(__dirname, '../public')  （静态资源）
 *   - server/data.js → path.join(__dirname, '../data')    （数据目录）
 * 为了让这些相对路径在 App 沙箱内依然成立，暂存时构造出
 * 「与仓库根同构」的目录结构：
 *
 *   public/nodejs/
 *   ├── index.js            ← 启动器
 *   ├── package.json
 *   ├── api/server.js
 *   ├── server/*.js
 *   ├── public/             ← 指向 Web 资源（前端静态文件）
 *   └── data/               ← 运行时数据（可写）
 *
 * 这样 __dirname/../public 与 __dirname/../data 均能正确解析，
 * 无需修改任何现有业务代码。
 *
 * 幂等：重复执行先清理旧副本；只读源目录，不改动 api/ server/。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'public', 'nodejs');
const PUBLIC_SRC = path.join(ROOT, 'public');

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest, filter) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (filter && !filter(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d, filter);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

console.log('[prepare-node-backend] 暂存后端源码到 public/nodejs/');

fs.mkdirSync(TARGET, { recursive: true });

// ── 1. 后端源码：api/ 与 server/ ──
for (const name of ['api', 'server']) {
  const src = path.join(ROOT, name);
  const dest = path.join(TARGET, name);
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠️ 跳过：未找到 ${name}/`);
    continue;
  }
  rmrf(dest);
  copyDir(src, dest);
  console.log(`  ✅ ${name}/ → public/nodejs/${name}/`);
}

// ── 2. 前端静态资源：public/ → nodejs/public/（供 express.static 使用）──
// 只复制前端资源，避免把 nodejs/ 自身递归复制进去。
const NESTED_PUBLIC = path.join(TARGET, 'public');
rmrf(NESTED_PUBLIC);
copyDir(PUBLIC_SRC, NESTED_PUBLIC, (name) => name !== 'nodejs');
console.log('  ✅ public/(前端资源) → public/nodejs/public/');

// ── 3. 清理运行时数据目录（数据在 App 内运行时生成，不应打进 APK）──
rmrf(path.join(TARGET, 'data'));
console.log('  🧹 已清理 public/nodejs/data（运行时目录）');

console.log('[prepare-node-backend] 完成');
