# Tasks

- [x] Task 1: 修复武将技能与游戏逻辑 Bug
  - [x] SubTask 1.1: 修复黄月英「奇才」技能，使其可弃置任意锦囊牌
  - [x] SubTask 1.2: 修复手牌每次渲染都重新播放发牌动画的问题
  - [x] SubTask 1.3: 统一「退出」按钮行为为「投降」
  - [x] SubTask 1.4: 让信任度在游戏结算和本地回复时产生实际影响

- [x] Task 2: 优化前端视觉与移动端体验
  - [x] SubTask 2.1: 修正浅色主题下残留的深色风格 CSS
  - [x] SubTask 2.2: 为移动端增加查看个人状态/对局记录的入口
  - [x] SubTask 2.3: 替换 index.html 中的占位 OG/Twitter 图片

- [x] Task 3: 优化后端 API 健壮性
  - [x] SubTask 3.1: 为 /api/chat 增加消息内容与长度校验
  - [x] SubTask 3.2: 增加基础速率限制中间件
  - [x] SubTask 3.3: 为 /api/data 增加请求体大小与字段校验

- [x] Task 4: 完善 GitHub 部署配置
  - [x] SubTask 4.1: 替换 README.md 中的占位仓库链接
  - [x] SubTask 4.2: 检查 push-to-github.sh 脚本并优化非交互提示

- [x] Task 5: 验证与回归测试
  - [x] SubTask 5.1: 按 checklist.md 逐项验证修复点
  - [x] SubTask 5.2: 运行本地开发服务器，进行基础功能回归

# Task Dependencies
- Task 5 依赖 Task 1、Task 2、Task 3、Task 4
