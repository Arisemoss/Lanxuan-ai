/**
 * 兰轩 - 运行时配置
 *
 * window.__LANXUAN_API_BASE__：后端 API 基地址
 *   - 同源部署（Vercel / Docker / Netlify / 本地 npm start）：留空
 *   - 打包 APK / 离线包：填入后端完整地址，例如 https://your-app.example.com
 *
 * 构建 APK 时可通过 CI 的 LANXUAN_API_BASE 变量覆盖本文件中的默认值。
 */
window.__LANXUAN_API_BASE__ = window.__LANXUAN_API_BASE__ || '';
