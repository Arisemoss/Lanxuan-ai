# 📱 Android APK 打包指南

把「兰轩」打包成可安装的 Android 应用。APK **内置本地 Node.js 后端**，装到手机上即用，聊天与三国杀对战全部在本机完成，数据存本机。

---

## 一、方案概览

```
Android App 启动
   └─ Capacitor-NodeJS 在 App 沙箱内拉起 Node.js 运行时
        └─ 执行 public/nodejs/index.js（启动器）
             └─ require api/server.js → Express 监听 127.0.0.1:3000
   └─ WebView 加载 http://127.0.0.1:3000
        └─ 页面 fetch('/api/...') → 同源命中本地后端 ✅
```

| 组件 | 说明 |
|------|------|
| `@capacitor/*` v7 | 把 Web 应用封装为原生 Android 应用 |
| `@hampoelz/capacitor-nodejs` v1.0.0-beta.9 | 在 APK 内嵌真实 Node.js 运行时 |
| `public/nodejs/` | Node 工程目录（启动器 + 依赖），随 APK 打包 |
| `android/` | 原生 Android 工程（由 `cap add android` 生成） |

**横竖屏**：Manifest 未锁定屏幕方向，跟随系统自动旋转；前端 CSS 已有响应式断点（桌面三栏 / 移动抽屉），横屏竖屏均可正常使用。

---

## 二、从 GitHub Actions 取包（推荐）

1. 打开仓库 **Actions** 页面 → 左侧选择 **Build Android APK**
2. 点 **Run workflow** 手动触发（或推送 `v1.0.0` 这类 `v*` 标签自动触发）
3. 构建完成后（约 5～10 分钟）：
   - **Artifact**：在该次运行页面底部「Artifacts」下载 `lanxuan-apk`
   - **Release**：打 tag 触发时，会自动创建 Release 并附带 APK 下载链接

> 工作流文件：`.github/workflows/android-apk.yml`

---

## 三、本地构建

**环境要求**

| 工具 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| JDK | 21（`capacitor-nodejs` 插件要求） |
| Android SDK | platform 35 / build-tools 35.0.0 |
| NDK | 27.0.12077973（编译 Node 原生桥接层） |
| CMake | 3.22.1 |

**步骤**

```bash
# 1. 安装项目依赖
npm install

# 2. 暂存内嵌后端源码（把 api/ server/ 复制进 public/nodejs/）
node scripts/prepare-node-backend.js

# 3. 安装 Node 内嵌后端依赖（必须在 public/nodejs 目录内）
cd public/nodejs
npm install --omit=dev
cd ../..

# 4. 同步 Web 资源与原生插件
npx cap sync android

# 5. 构建 Debug APK
cd android
./gradlew assembleDebug
```

**产物路径**

```
android/app/build/outputs/apk/debug/app-debug.apk
```

> 实测构建结果（本机验证）：`app-debug.apk` 约 **152 MB**，含三套架构的 `libnode.so`
> （arm64-v8a / armeabi-v7a / x86_64）；APK 内已包含 `assets/public/nodejs/`（启动器 + 后端源码 + 依赖）。

快捷命令（等价于上面 2～5 步）：

```bash
npm run cap:apk
```

---

## 四、安装到手机

1. 把 `app-debug.apk` 传到手机
2. 系统设置中允许「安装未知来源应用」
3. 点击 APK 安装，打开应用即可

首次启动时，App 会在沙箱内解压 Node 运行时并启动后端，可能需要几秒。

---

## 五、目录与文件说明

| 路径 | 作用 |
|------|------|
| `capacitor.config.json` | Capacitor 配置（webDir、本地服务地址、旋转等） |
| `public/nodejs/index.js` | Node 启动器：准备数据目录、注入环境变量、拉起后端 |
| `public/nodejs/package.json` | Node 工程依赖声明（express / cors / dotenv / express-rate-limit） |
| `scripts/prepare-node-backend.js` | 构建前把 `api/`、`server/`、前端资源暂存进 `public/nodejs/` |
| `android/init-mirrors.gradle` | 构建期 Maven 镜像（加速依赖拉取，回退官方源） |
| `android/app/src/main/AndroidManifest.xml` | 权限、明文流量、屏幕方向设置 |
| `android/app/src/main/res/xml/network_security_config.xml` | 仅允许 localhost 明文，其余强制 HTTPS |

> **未改动任何现有业务代码**：`api/`、`server/`、`public/`（前后端逻辑）、`Dockerfile`、`vercel.json` 与原有 Docker 工作流均保持原样，Web 端部署（Vercel / Docker / Netlify）不受影响。

### 目录暂存原理

现有后端用相对 `__dirname` 定位资源（`api/server.js` 找 `../public`，`server/data.js` 找 `../data`）。为保证这些路径在 App 沙箱内成立，`prepare-node-backend.js` 会把工程暂存成同构结构：

```
public/nodejs/
├── index.js          ← Node 启动器
├── package.json
├── api/server.js     ← 后端入口（暂存副本）
├── server/*.js       ← 后端模块（暂存副本）
├── public/           ← 前端资源副本（express.static 使用）
├── data/             ← 运行时数据（构建时不打包，运行时可写）
└── node_modules/     ← 后端依赖（构建时安装，随 APK 打包）
```

`api/`、`server/`、`public/` 的副本与 `data/`、`node_modules/` 均已加入 `.gitignore`，不会提交进仓库。

---

## 六、常见问题

**Q：APK 体积较大？**
内嵌了完整 Node.js 运行时（含多架构二进制），属正常现象。可用 `assembleRelease` + ABI 拆分减小体积。

**Q：App 打开白屏？**
多为本地后端尚未启动完成。请检查 `adb logcat | grep Lanxuan` 日志；启动器已内置异常兜底输出。

**Q：需要签名版 APK 上架？**
Debug 包免签名便于安装体验。如需 Release 签名，在 `android/app/build.gradle` 中配置 `signingConfigs`，并把 keystore 通过 GitHub Secrets 注入工作流。

**Q：想改默认 AI 提供商？**
在 App 内「设置 → AI 对话」填写自己的 API 密钥即可（仅存本机）。
