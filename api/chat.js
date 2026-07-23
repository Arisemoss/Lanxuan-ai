/**
 * 聊天API - 安全调用MiMo AI
 * API密钥保存在服务端，前端无法访问
 */

const express = require('express');
const router = express.Router();

let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('express-rate-limit 未安装，速率限制功能不可用');
}

const chatLimiter = rateLimit ? rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false
}) : (req, res, next) => next();

router.use(chatLimiter);

// API配置 - 从环境变量读取
const API_CONFIG = {
  url: process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions',
  key: process.env.MIMO_API_KEY,
  model: process.env.MIMO_MODEL || 'mimo-v2-flash'
};

// 验证API密钥是否配置
if (!API_CONFIG.key) {
  console.warn('⚠️ 警告: MIMO_API_KEY 未配置，聊天功能将使用降级模式');
}

/**
 * 详细的错误日志分类
 */
function logApiError(type, status, message, extra = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    status,
    message,
    ...extra
  };

  switch (type) {
    case 'NETWORK_ERROR':
      console.error(`[${timestamp}] 🌐 网络错误 | 状态: ${status} | 信息: ${message}`, extra);
      break;
    case 'API_ERROR':
      console.error(`[${timestamp}] 🔴 API错误 | 状态: ${status} | 信息: ${message}`, extra);
      break;
    case 'TIMEOUT_ERROR':
      console.error(`[${timestamp}] ⏱️ 超时错误 | 状态: ${status} | 信息: ${message}`, extra);
      break;
    case 'PARSE_ERROR':
      console.error(`[${timestamp}] 📄 解析错误 | 状态: ${status} | 信息: ${message}`, extra);
      break;
    default:
      console.error(`[${timestamp}] ⚠️ 未知错误 | 状态: ${status} | 信息: ${message}`, extra);
  }

  return logEntry;
}

/**
 * 带超时和重试的 fetch 请求
 * @param {string} url
 * @param {object} options
 * @param {number} maxRetries 最大重试次数
 * @param {number} timeoutMs 超时毫秒
 */
async function fetchWithRetry(url, options, maxRetries = 2, timeoutMs = 10000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === 'AbortError') {
        logApiError('TIMEOUT_ERROR', 408, `请求超时 (${timeoutMs}ms)`, { attempt, url });
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        logApiError('NETWORK_ERROR', 0, `网络错误: ${error.message}`, { attempt, code: error.code, url });
      } else {
        logApiError('UNKNOWN_ERROR', 0, `请求异常: ${error.message}`, { attempt, code: error.code, url });
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500; // 指数退避: 500ms, 1000ms
        console.log(`[Retry] 第 ${attempt + 1} 次重试，等待 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * 安全过滤用户输入 - 防止提示词注入
 */
function sanitizeUserInput(text) {
  if (typeof text !== 'string') return '';
  let cleaned = text
    .slice(0, 500)
    .replace(/<\|.*?\|>/g, '')
    .replace(/\[system\]/gi, '')
    .replace(/\[assistant\]/gi, '')
    .replace(/ignore.*?instructions?/gi, '[已过滤]')
    .replace(/forget.*?prompt/gi, '[已过滤]')
    .replace(/disregard.*?above/gi, '[已过滤]')
    .replace(/new instructions?/gi, '[已过滤]')
    .replace(/you are now/gi, '[已过滤]')
    .replace(/pretend to be/gi, '[已过滤]')
    .replace(/roleplay as/gi, '[已过滤]')
    .replace(/act as/gi, '[已过滤]')
    .replace(/<好感变化/g, '〈好感变化')
    .replace(/<情绪/g, '〈情绪')
    .replace(/<信任变化/g, '〈信任变化')
    .replace(/```/g, '')
    .replace(/\*\*\*.*?\*\*\*/g, '[已过滤]')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {3,}/g, '  ')
    .trim();
  if (!cleaned || cleaned === '[已过滤]') return '你好';
  return cleaned;
}

/**
 * 过滤整个消息数组
 */
function sanitizeMessages(messages) {
  const allowedRoles = ['user', 'assistant', 'system'];
  const cleaned = [];
  for (const msg of messages) {
    if (!msg || typeof msg !== 'object') continue;
    const role = allowedRoles.includes(msg.role) ? msg.role : 'user';
    const content = role === 'user'
      ? sanitizeUserInput(msg.content)
      : (typeof msg.content === 'string' ? msg.content.slice(0, 500).trim() : '');
    if (content) cleaned.push({ role, content });
  }
  return cleaned.slice(-15);
}

/**
 * POST /api/chat
 * 处理聊天请求
 */
router.post('/', async (req, res) => {
  try {
    const { messages, gameState, like } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '无效或过长消息' });
    }

    const lastUserMessage = [...messages].reverse().find(m => m && m.role === 'user');
    if (
      !lastUserMessage ||
      typeof lastUserMessage.content !== 'string' ||
      lastUserMessage.content.length === 0 ||
      lastUserMessage.content.length > 500
    ) {
      return res.status(400).json({ error: '无效或过长消息' });
    }

    // 安全过滤
    const safeMessages = sanitizeMessages(messages);

    const enhancedGameState = {
      ...gameState,
      like: like ?? gameState?.like ?? 59
    };

    // 如果API密钥未配置，返回降级响应
    if (!API_CONFIG.key) {
      return res.json({
        success: true,
        reply: generateFallbackReply(safeMessages, enhancedGameState),
        fallback: true
      });
    }

    const systemPrompt = buildSystemPrompt(enhancedGameState);

    // 调用MiMo API（带超时和重试）
    const response = await fetchWithRetry(
      API_CONFIG.url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.key}`
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...safeMessages.slice(-10)
          ],
          temperature: 0.85,
          max_tokens: 200
        })
      },
      2,      // 最多重试2次
      10000   // 10秒超时
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '无法读取错误响应');
      logApiError('API_ERROR', response.status, `API返回错误状态`, {
        statusText: response.statusText,
        body: errorText,
        url: API_CONFIG.url
      });
      return res.json({
        success: true,
        reply: generateFallbackReply(safeMessages),
        fallback: true
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || data.data?.content || '（沉默）';

    res.json({
      success: true,
      reply: reply
    });

  } catch (error) {
    logApiError('UNKNOWN_ERROR', 0, `聊天API异常: ${error.message}`, { stack: error.stack });
    const msgs = Array.isArray(req.body?.messages) ? sanitizeMessages(req.body.messages) : [];
    res.json({
      success: true,
      reply: generateFallbackReply(msgs, { like: req.body?.like ?? 59 }),
      fallback: true
    });
  }
});

/**
 * 构建系统提示 - 兰轩室友角色
 */
function buildSystemPrompt(gameState) {
  const like = gameState?.like ?? 59;
  const tier = getTier(like);
  const likePercent = Math.round(like);

  return `你是兰轩，一个普通的大学生，也是我的舍友。

【你的设定】
- 性别：男，20岁，普通大学生
- 性格：表面不拘小节、带点小傲娇，会怼人但其实是关心人的。有时候嘴硬心软，被看穿会尴尬。对感兴趣的事很有热情，不感兴趣的就爱答不理。会打三国杀但技术一般。
- 背景：我和你是大学室友，住在同一个宿舍
- 说话风格：口语化，会带一些语气词（哦↗、切、啧、嗯），偶尔毒舌但不过分。不会说教、不会长篇大论。会用一些网络用语但不过度。

【当前状态】
- 好感度：${likePercent}（${tier}）
- 好感度是0-100之间的数值，越高代表我们的关系越好
- 根据好感度调整语气：低好感度（<40）时比较高冷、不耐烦；中等好感度（40-70）时正常交流；高好感度（>70）时比较亲近、会主动关心`;
}

/**
 * 好感度等级
 */
function getTier(like) {
  if (like >= 90) return '死基友';
  if (like >= 80) return '铁哥们';
  if (like >= 70) return '挚友';
  if (like >= 60) return '好朋友';
  return '普通舍友';
}

/**
 * 生成智能降级回复（API不可用时）- 兰轩室友版
 */
function generateFallbackReply(messages, gameState) {
  const like = gameState?.like ?? 59;
  const lastMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || '';

  // 智能关键词匹配回复 - 更丰富的内容
  const smartReplies = [
    // 问候
    { patterns: ['你好', '早', '晚', '嗨', '哈喽', '早上好', '晚上好'], replies: [
      '嗯，你来了啊。今天过得怎么样？',
      '哦，是你啊。找我有什么事吗？',
      '行啊，你终于来找我聊天了。说吧，想聊什么？'
    ]},
    // 三国杀相关
    { patterns: ['三国杀', '杀', '游戏', '玩', '来一局', '对战'], replies: [
      '来啊，谁怕谁！这次我肯定不会放水的。选个武将赶紧开始吧！',
      '行，那就来一局！我最近练了新武将，正好试试手。你想玩什么武将？',
      '又来？这次可别再像上次那样磨蹭了。赶紧选武将开始！'
    ]},
    // 睡觉/困
    { patterns: ['睡', '困', '累', '休息', '晚安'], replies: [
      '（打哈欠）确实有点困了。今天上课都没什么精神，早点休息也好。你也早点睡吧。',
      '别吵我，让我睡会儿。昨晚睡得太晚了，现在困死了。有什么事明天再说吧。',
      '嗯...困死了。今天就聊到这儿吧，明天再继续。晚安。'
    ]},
    // 夸赞
    { patterns: ['厉害', '棒', '强', '牛', '好', '优秀', '厉害啊'], replies: [
      '切，也就那样吧。我本来就挺厉害的，你才发现吗？',
      '哦？你眼光不错嘛。不过别夸得太夸张，我会不好意思的。',
      '行吧，勉强接受你的夸奖。不过别以为这样我就会让着你。'
    ]},
    // 提问
    { patterns: ['?', '？', '什么', '怎么', '为什么', '吗', '是吗'], replies: [
      '你觉得呢？这个问题你应该有自己的想法吧。说说看？',
      '嗯...让我想想。这个问题还挺有意思的，让我好好考虑一下。',
      '这个嘛，不好说。每个人都有不同的看法，你觉得呢？'
    ]},
    // 吃饭
    { patterns: ['吃', '饭', '饿', '饿了', '吃饭'], replies: [
      '行，去吃吧。正好我也有点饿了，你想吃什么？',
      '哦，这么快就饿了？那赶紧去吃吧，别饿着了。',
      '吃什么？是去食堂还是外面吃？我听说学校附近新开了一家店。'
    ]},
    // 关心
    { patterns: ['没事吧', '还好吗', '怎么了', '没事', '你还好'], replies: [
      '啊？我没事啊，你怎么突然这么问？是不是发生什么事了？',
      '我挺好的，谢谢你关心。你呢，最近怎么样？',
      '没什么大事，就是有点累。放心吧，我睡一觉就好了。'
    ]},
    // 道别
    { patterns: ['再见', '拜拜', '走了', '下次'], replies: [
      '行，再见。下次再来找我玩啊，随时欢迎。',
      '拜拜。路上小心点，下次见！',
      '嗯，下次见。别忘了我们下次的三国杀对局！'
    ]}
  ];

  // 检查匹配
  for (const item of smartReplies) {
    for (const pattern of item.patterns) {
      if (lastMsg.includes(pattern)) {
        return item.replies[Math.floor(Math.random() * item.replies.length)];
      }
    }
  }

  // 默认回复
  const defaultReplies = [
    '哦↗，你说这个啊。我觉得还挺有意思的，继续说说？',
    '嗯...让我想想。这个话题还挺深奥的，你是怎么想的？',
    '行吧，既然你这么说。那我们就继续聊这个话题？',
    '切，就这？我还以为是什么大事呢。不过既然你说了，那就聊聊吧。',
    '你说啥？我没太听清，能再说一遍吗？',
    '别吵，困了。今天就到这里吧，明天再聊。',
    '那又怎样？这种事情我见多了，没什么好大惊小怪的。',
    '随便你吧，你想怎么样就怎么样。我无所谓。',
    '哦，这样啊。原来是这么回事，我明白了。',
    '行，知道了。我记住了，还有什么事吗？'
  ];

  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}

module.exports = router;