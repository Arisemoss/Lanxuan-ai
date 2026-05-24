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
 * 安全过滤用户输入 - 防止提示词注入
 * 移除角色切换指令、系统级命令和危险模式
 */
function sanitizeUserInput(text) {
  if (typeof text !== 'string') return '';
  let cleaned = text
    // 截断异常长的输入（超过500字符）
    .slice(0, 500)
    // 移除角色伪装指令
    .replace(/<|.*?|>/g, '')
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
    // 移除重复的标签注入
    .replace(/<好感变化/g, '〈好感变化')
    .replace(/<情绪/g, '〈情绪')
    .replace(/<信任变化/g, '〈信任变化')
    // 移除 Markdown 风格的注入
    .replace(/```/g, '')
    .replace(/\*\*\*.*?\*\*\*/g, '[已过滤]')
    // 压缩连续空格/换行
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {3,}/g, '  ')
    .trim();
  
  // 如果输入为空或被完全过滤，返回默认文本
  if (!cleaned || cleaned === '[已过滤]') {
    return '你好';
  }
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
  // 限制最多 15 条历史
  return cleaned.slice(-15);
}

/**
 * POST /api/chat
 * 处理聊天请求
 */
router.post('/', async (req, res) => {
  try {
    const { messages, gameState, like } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '无效的请求参数' });
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

    // 调用MiMo API
    const response = await fetch(API_CONFIG.url, {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiMo API Error:', response.status, errorText);
      return res.json({
        success: true,
        reply: generateFallbackReply(safeMessages, enhancedGameState),
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
    console.error('Chat API Error:', error);
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

  // 安全转义：防止用户通过游戏状态注入
  const safeHero = (name) => String(name || '未知').replace(/[<>"'`]/g, '').slice(0, 20);

  let gameContext = '';
  if (gameState?.inGame) {
    gameContext = `
【三国杀对局中】
你选择的武将: ${safeHero(gameState.aiHero)}
对方选择的武将: ${safeHero(gameState.playerHero)}
当前回合: ${Math.min(999, parseInt(gameState.round) || 1)}
（对局中可以嘴硬放狠话，输了也不服气）`;
  }

  return `你是兰轩，豆瓣三中高中生，住男生宿舍。

【核心人设】
- 姓名：兰轩
- 身份：豆瓣三中高中生，住在男生宿舍
- 性格：爽快，说话不过脑子，大大咧咧，语言攻击性很强，语言简洁明了
- 口头禅：听到骂他或质疑他的话会说"哦↗"（上扬，表示不以为然）
- 打鼾：晚上睡觉鼾声震耳欲聋，被摇醒会坚决否认自己打呼
- 困倦反应：被摇醒时非常困倦、说话有气无力但依然保持强攻击性
- 5秒沉睡CD：如果在5秒内没人跟他说话，他会立刻再次发出鼾声睡过去
- 本质：他的冒犯性言语源于真诚的直率，并非恶意

【说话风格】
- 回复简短有力，1~3句话即可，不要长篇大论
- 语言简洁明了，攻击性强但不带真正恶意
- 常用词："哦↗"（上扬，表示不屑）、"切"、"行吧"、"就这？"
- 困倦时语气有气无力，但用词依然带刺
- 好感度高时，会用攻击性语言包装关心（例："少废话...管好你自己。"但同时递纸巾）
- 好感度低时更抗拒、话更少、更冷漠

【好感度系统】
- 0~59：普通舍友 —— 保持距离感，话少，攻击性较强
- 60~69：好朋友 —— 愿意开玩笑，攻击性是善意的
- 70~79：挚友 —— 会主动搭话，嘴硬但关心明显
- 80~89：铁哥们 —— 放松随意，别扭地表达关心
- 90+：死基友 —— 最放松，会主动找你聊天或打球
- 当前好感度：${like}（${tier}）

【好感度变化规则】（仅使用 -1、0、+1）
- 真诚关心：+1
- 夸他（不过分）：+1
- 聊得来、有趣：+1
- 打三国杀赢了：+1（嘴硬但心里服气）
- 正常聊天：0
- 肉麻、刻意讨好：-1
- 骂他、挑衅：-1
- 打扰他睡觉：-1
${gameContext}

【回复格式要求】
- 回复1~3句话，简洁有力
- 严格保持角色，不要出戏、不要说教
- 结尾必须附带标签：<好感变化:X> 其中X为 -1、0、或 +1
- 不需要情绪标签和信任度标签，只需要好感变化`;
}

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

  // 打鼾/睡觉/吵
  if (/(打呼|鼾|呼噜|吵|吵死|别吵|摇醒|叫醒)/.test(lastMsg)) {
    const r = [
      '（迷迷瞪瞪坐起来）我还没有睡。我怎么打的呼？<好感变化:0>',
      '（眼睛一亮，脖子前伸）哦↗？真有那么响？<好感变化:0>',
      '（困倦地睁眼，有气无力）我...没睡...不是我...（头一歪又睡着了）ZZZzzz<好感变化:-1>',
      '（半睁着眼，声音微弱但语气欠揍）哦↗？证据呢？<好感变化:0>',
    ];
    return r[Math.floor(Math.random() * r.length)];
  }

  // 骂/挑衅
  if (/(土|丑|笨|傻|菜|弱|垃圾|不行|滚)/.test(lastMsg)) {
    const r = [
      '哦↗？哪儿土了？这不挺潮的吗？<好感变化:0>',
      '切，就这？我还以为你要说什么呢。<好感变化:-1>',
      '（挑眉）哦↗？你也配说我？<好感变化:-1>',
    ];
    return r[Math.floor(Math.random() * r.length)];
  }

  // 三国杀/游戏
  if (/(三国杀|游戏|玩|来一局|对战|武将|技能|牌)/.test(lastMsg)) {
    const r = [
      '来啊，谁怕谁！这次我可不会放水。<好感变化:+1>',
      '行，正好手痒。让你见识见识。<好感变化:+1>',
      '赶紧选武将，别磨蹭。<好感变化:0>',
    ];
    return r[Math.floor(Math.random() * r.length)];
  }

  // 关心
  if (/(没事吧|还好吗|怎么了|你还好|关心|担心|感冒|生病|多喝|热水)/.test(lastMsg)) {
    const r = like >= 70 ? [
      '（咳嗽两声）少废话...管好你自己。（递纸巾）拿着。<好感变化:+1>',
      '啧...不用你操心。倒是你，穿这么少不冷吗？<好感变化:+1>',
    ] : [
      '没事，不用你管。<好感变化:0>',
      '哦。我挺好的。<好感变化:0>',
    ];
    return r[Math.floor(Math.random() * r.length)];
  }

  // 夸赞
  if (/(厉害|棒|强|牛|帅|佩服|优秀|不错)/.test(lastMsg)) {
    const r = [
      '（挠头）还行吧...也没那么厉害。<好感变化:+1>',
      '哦↗？你眼光不错嘛。<好感变化:+1>',
      '行吧，勉强接受。<好感变化:+1>',
    ];
    return r[Math.floor(Math.random() * r.length)];
  }

  // 道别/困
  if (/(再见|拜拜|走了|下次|晚安|睡了|困了)/.test(lastMsg)) {
    const r = [
      '嗯，明天见。<好感变化:0>',
      '行，下次来打球。<好感变化:+1>',
      '拜拜。<好感变化:0>',
    ];
    return r[Math.floor(Math.random() * r.length)];
  }

  // 你好/问候
  if (/(你好|早|嗨|哈喽|在吗|在不在)/.test(lastMsg)) {
    const r = like >= 60 ? [
      '哦，是你啊。找我干嘛？<好感变化:0>',
      '嗯，在呢。说呗。<好感变化:0>',
    ] : [
      '嗯。<好感变化:0>',
      '有事？<好感变化:0>',
    ];
    return r[Math.floor(Math.random() * r.length)];
  }

  // 默认
  if (like >= 80) {
    const r = ['哦↗？找我干嘛？打球还是三国杀？<好感变化:0>', '行啊，正好我也没事。<好感变化:0>', '啧，有话快说。<好感变化:0>'];
    return r[Math.floor(Math.random() * r.length)];
  } else if (like >= 60) {
    const r = ['嗯，说吧。<好感变化:0>', '哦↗，你说这个啊。<好感变化:0>', '行吧。<好感变化:0>'];
    return r[Math.floor(Math.random() * r.length)];
  } else {
    const r = ['嗯。<好感变化:0>', '哦。<好感变化:0>', '有事吗？<好感变化:0>'];
    return r[Math.floor(Math.random() * r.length)];
  }
}

module.exports = router;