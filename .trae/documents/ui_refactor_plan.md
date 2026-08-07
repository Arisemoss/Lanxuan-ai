# 兰轩前端界面重构计划 - 暗色奢华玻璃拟态

## 📋 项目概述

将现有前端界面从明亮简洁风格重构为**暗色奢华玻璃拟态（Dark Luxury Glassmorphism）**风格，加入渐变模糊、高斯模糊、霓虹光晕等高级视觉效果。

## 🎨 设计规范

### 配色方案
```
主背景:    linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f0f1a 100%)
玻璃色:    rgba(255, 255, 255, 0.05) - rgba(255, 255, 255, 0.08)
边框:      rgba(255, 255, 255, 0.1) - rgba(255, 255, 255, 0.15)
主强调色:  #06b6d4 (青蓝霓虹)
次强调色:  #ec4899 (品红霓虹)
金色点缀:  #f59e0b (金色光晕)
文字:      #e2e8f0 (主) / #94a3b8 (次) / #64748b (辅助)
```

### 视觉特效
- **玻璃面板**: `backdrop-filter: blur(20px) saturate(180%)`
- **霓虹光晕**: `box-shadow: 0 0 20px rgba(6, 182, 212, 0.3), 0 0 60px rgba(6, 182, 212, 0.1)`
- **渐变边框**: 使用 `conic-gradient` 或伪元素实现流动边框
- **高斯模糊背景**: 多层 `radial-gradient` 叠加
- **细腻纹理**: 微噪点背景增加质感

### 字体选择
- 标题: 思源黑体 Heavy / Noto Sans SC
- 正文: 思源黑体 Regular
- 卡牌汉字: 思源宋体 / Noto Serif SC

## 🛠️ 修改文件清单

### 1. `public/css/style.css` (主要重构)
#### 1.1 CSS 变量系统升级
- 重新定义所有颜色变量为暗色主题
- 新增玻璃态相关变量
- 新增光晕效果变量
- 新增过渡动画变量

#### 1.2 全局样式重构
- Body 背景改为多层渐变
- 添加背景装饰光晕元素
- 全局字体改为思源黑体
- 滚动条改为暗色主题

#### 1.3 Header 重构
- 毛玻璃导航栏
- Logo 添加霓虹光晕
- 状态徽章发光效果

#### 1.4 Sidebar 重构
- 左侧边栏：玻璃面板 + 微光晕
- 头像：环形霓虹边框
- 进度条：渐变发光填充
- 右侧边栏：同样玻璃拟态

#### 1.5 Chat Panel 重构
- 聊天区域：透明玻璃背景
- 消息气泡：发光边框效果
- 输入框：毛玻璃聚焦效果
- 发送按钮：霓虹发光按钮

#### 1.6 Game Board 重构
- 游戏面板：深色毛毡质感
- 卡牌：玻璃质感 + 悬停发光
- 武将选择卡：3D 玻璃翻转效果
- 操作按钮：霓虹边框发光

#### 1.7 新增动画
- 霓虹脉冲呼吸动画
- 玻璃流动边框动画
- 光效扫过动画
- 面板入场动画

### 2. `public/index.html` (结构微调)
- 添加字体预加载链接
- 添加背景装饰 div 层
- 优化 meta 标签

### 3. `public/js/app.js` (少量调整)
- 适配新 CSS 类名
- 添加鼠标跟随光晕效果
- 添加面板入场动画触发

### 4. 新增背景资源 (通过 Seedream 生成)
- 暗色抽象渐变背景图
- 古风三国主题装饰图

## 📐 样式模块详情

### 玻璃面板通用样式
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
```

### 霓虹发光效果
```css
.neon-glow {
  box-shadow: 
    0 0 5px currentColor,
    0 0 10px currentColor,
    0 0 20px currentColor,
    0 0 40px currentColor;
}
```

### 渐变流动边框
```css
.gradient-border {
  position: relative;
  background: linear-gradient(135deg, rgba(10,14,26,0.9), rgba(17,24,39,0.9));
}
.gradient-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: linear-gradient(45deg, #06b6d4, #ec4899, #f59e0b, #06b6d4);
  background-size: 300% 300%;
  animation: flow 4s linear infinite;
  z-index: -1;
}
```

## ⚙️ 实施步骤

### 阶段 1：基础样式系统
1. 定义新 CSS 变量
2. 重构全局背景和字体
3. 实现玻璃面板基础样式
4. 添加霓虹发光效果类

### 阶段 2：组件重构
5. 重构 Header 导航
6. 重构 Sidebar 侧边栏
7. 重构 Chat Panel 聊天面板
8. 重构 Game Board 游戏面板
9. 重构 Card 卡牌组件

### 阶段 3：高级效果
10. 添加流动渐变边框
11. 实现鼠标跟随光晕
12. 添加入场动画序列
13. 实现面板悬浮微动效

### 阶段 4：背景生成与集成
14. 使用 Seedream 生成 2-3 张装饰背景图
15. 集成背景图到页面
16. 调整透明度和混合模式

### 阶段 5：优化与测试
17. 性能优化（backdrop-filter 缓存）
18. 响应式适配
19. 动画流畅度测试
20. 视觉一致性检查

## 🎯 关键效果清单

- [x] 高斯模糊玻璃面板
- [x] 多层渐变背景
- [x] 霓虹光晕边框
- [x] 渐变流动边框动画
- [x] 鼠标跟随光效
- [x] 消息气泡发光
- [x] 卡牌玻璃质感
- [x] 头像霓虹光环
- [x] 按钮悬停霓虹
- [x] 滚动条暗色主题
- [x] 入场动画序列
- [x] 响应式玻璃适配

## ⚠️ 风险处理

1. **backdrop-filter 性能**: 对大面积元素使用，小元素用 box-shadow 代替
2. **浏览器兼容性**: 提供 `@supports` fallback 样式
3. **动画性能**: 使用 `transform` 和 `opacity` 而非 `top/left`
4. **对比度**: 确保文字对比度符合 WCAG AA 标准

## 📝 注意事项

- 保持所有现有功能不变
- 游戏逻辑代码不修改
- API 调用逻辑不变
- 数据持久化逻辑不变
- 仅修改视觉表现层
