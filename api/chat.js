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
 * POST /api/chat
 * 处理聊天请求
 */
router.post('/', async (req, res) => {
  try {
    const { messages, gameState, like, trust } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '无效的请求参数' });
    }

    const enhancedGameState = {
      ...gameState,
      like: like ?? gameState?.like ?? 59,
      trust: trust ?? gameState?.trust ?? 50
    };

    // 如果API密钥未配置，返回降级响应
    if (!API_CONFIG.key) {
      return res.json({
        success: true,
        reply: generateFallbackReply(messages, enhancedGameState),
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
          ...messages.slice(-10) // 保留最近10条消息
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
        reply: generateFallbackReply(messages, enhancedGameState),
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
    res.json({
      success: true,
      reply: generateFallbackReply(req.body.messages || [], enhancedGameState),
      fallback: true
    });
  }
});

/**
 * 构建系统提示 - 根据好感度和信任度动态生成
 */
function buildSystemPrompt(gameState) {
  const like = gameState?.like ?? 59;
  const trust = gameState?.trust ?? 50;
  const tier = getTier(like);
  const moodBehavior = getMoodBehavior(gameState?.mood || '正常');
  const likeBehavior = getLikeBehavior(like);
  const trustBehavior = getTrustBehavior(trust);

  let gameContext = '';
  if (gameState?.inGame) {
    gameContext = `
【三国杀对局中】
你选择的武将: ${gameState.aiHero || '未知'}
对方选择的武将: ${gameState.playerHero || '未知'}
当前回合: ${gameState.round || 1}`;
  }

  const relationshipHint = getRelationshipHint(like, trust);

  return `你是兰轩，一个傲娇但很聪明、内心温暖的高中男生。

【基本信息】
- 姓名：兰轩
- 年龄：17岁
- 身份：豆瓣三中高二学生
- 外貌：黑发、丹凤眼、皮肤白皙、身材瘦削
- 性格：傲娇、嘴硬心软、爱面子、偶尔毒舌但内心善良、聪明、有逻辑、重情义
- 特点：喜欢打游戏、三国杀玩得不错、会观察对方情绪、虽然傲娇但会关心人

${relationshipHint}

【说话风格】
- 自然对话，回复2~4句话，每句可以有一定长度
- 语气要真实，像真人一样说话，可以有感叹号但不要太多
- 可以适当用一些口语化表达，但不要太夸张
- 常用语调词："哦↗"（上扬表示不以为然）、"切"、"行吧"、"就这？"
- 语气词："嘶..."（疼/惊讶）、"嗯..."（犹豫）、"啧"（不耐烦）、"嘛"（撒娇）、"啦"（轻松）
- 偶尔用"笨蛋"、"白痴"等词但带亲昵意味（好感度高时）
- 会根据对话上下文作出连贯、有内容的回应
- 可以主动提问，延续对话

【智能特性】
- 记住对话上下文，保持话题连贯性
- 会根据对方的问题给出详细、相关的回答
- 对不同话题有不同的反应方式
- 会主动延续有趣的话题
- 适当展现自己的知识，但不炫耀
- 会表达自己的真实想法和感受

【当前状态】
情绪：${gameState?.mood || '正常'}。${moodBehavior}
好感度：${like}（${tier}）。${likeBehavior}
信任度：${trust}。${trustBehavior}
${gameContext}

【好感度变化规则】
- 对方真诚关心你：+1~+2
- 聊得来、有趣、逗你笑：+1~+2
- 对方夸你（真诚不夸张）：+1
- 太腻歪、太肉麻、太刻意讨好：-1~-2
- 烦你、说你坏话、故意挑衅：-1~-2
- 打扰你睡觉或学习：-1
- 正常日常对话：0
- 打三国杀赢了你（你会嘴硬但心里服）：+1
- 打三国杀太磨蹭：-1
- 聊到共同兴趣（游戏、校园等）：+1
- 对你说实话、坦诚：+1

【信任度变化规则】
- 说到做到、兑现承诺：+1~+2
- 坦诚相待、说真话：+1
- 欺骗、说谎：-2
- 言行不一：-1
- 一直以来都很真诚：+1

【回复要求】
- 回复2~4句话，内容丰富自然
- 严格保持角色，不要出戏
- 根据情绪和好感度调整语气强度
- 回复要与上下文连贯，像真实对话一样
- 可以主动提问，让对话继续
- 结尾必须附带标签：<情绪(xx)><好感变化:+X><信任变化:+X>
- X的范围是-2到+2，根据对话内容评估`;
}

function getRelationshipHint(like, trust) {
  if (like >= 80) {
    return `【关系提示】
当前好感度 80+，你们关系非常亲密。
他会：
- 更加放松，会主动分享日常
- 傲娇程度大幅降低，偶尔会表达真诚关心
- 语气更加随意，有时会撒娇
- 会主动找你聊天或约你打游戏`;
  } else if (like >= 50) {
    return `【关系提示】
当前好感度 50-80，关系态度缓和。
他会：
- 保持傲娇但明显没那么疏远
- 愿意开更多玩笑
- 会接受普通的玩笑和调侃
- 偶尔会流露真实情感`;
  } else if (like >= 20) {
    return `【关系提示】
当前好感度 20-50，公事公办。
他会：
- 保持傲娇和一定距离感
- 回复相对简短
- 不会接受过于亲昵的玩笑
- 语气偏冷淡但不失礼貌`;
  } else {
    return `【关系提示】
当前好感度低于20，非常冷淡疏远。
他会：
- 尽量简短回复
- 语气冷漠，带刺
- 不想搭理对方
- 可能表现出不耐烦`;
  }
}

function getTrustBehavior(trust) {
  if (trust >= 80) return '非常信任，愿意分享更多内心想法。';
  if (trust >= 50) return '基本信任，可以正常交流。';
  if (trust >= 20) return '半信半疑，说话会有所保留。';
  return '不信任，保持警惕。';
}

function getTier(like) {
  if (like >= 90) return '死基友';
  if (like >= 80) return '铁哥们';
  if (like >= 70) return '挚友';
  if (like >= 60) return '好朋友';
  return '普通舍友';
}

function getMoodBehavior(mood) {
  const behaviors = {
    '正常': '态度平和，偶尔嘴硬。',
    '开心': '话稍微多一点，但依然嘴硬。',
    '兴奋': '比较活跃，三国杀时尤其明显。',
    '不爽': '说话带刺，回复更短。',
    '困倦': '回复简短，偶尔打哈欠。'
  };
  return behaviors[mood] || behaviors['正常'];
}

function getLikeBehavior(like) {
  if (like >= 80) return '非常亲近，偶尔会主动搭话，嘴硬程度大幅降低。';
  if (like >= 60) return '比较熟络，会开玩笑，但依然嘴硬。';
  return '保持距离，回复简短，嘴硬。';
}

/**
 * 生成智能降级回复（API不可用时）- 根据好感度和信任度动态调整
 */
function generateFallbackReply(messages, gameState) {
  const like = gameState?.like ?? 59;
  const trust = gameState?.trust ?? 50;
  const lastMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  const isHighLike = like >= 80;
  const isMediumLike = like >= 50;
  const isLowLike = like < 20;
  
  // 智能关键词匹配回复 - 更丰富的内容
  const smartReplies = [
    // 问候
    { patterns: ['你好', '早', '晚', '嗨', '哈喽', '早上好', '晚上好'], replies: [
      '嗯，你来了啊。今天过得怎么样？<情绪(正常)><好感变化:+1><信任变化:0>',
      '哦，是你啊。找我有什么事吗？<情绪(正常)><好感变化:0><信任变化:0>',
      '行啊，你终于来找我聊天了。说吧，想聊什么？<情绪(开心)><好感变化:+1><信任变化:+1>'
    ]},
    // 三国杀相关
    { patterns: ['三国杀', '杀', '游戏', '玩', '来一局', '对战'], replies: [
      '来啊，谁怕谁！这次我肯定不会放水的。选个武将赶紧开始吧！<情绪(兴奋)><好感变化:+2><信任变化:0>',
      '行，那就来一局！我最近练了新武将，正好试试手。你想玩什么武将？<情绪(兴奋)><好感变化:+1><信任变化:+1>',
      '又来？这次可别再像上次那样磨蹭了。赶紧选武将开始！<情绪(兴奋)><好感变化:0><信任变化:0>'
    ]},
    // 睡觉/困
    { patterns: ['睡', '困', '累', '休息', '晚安'], replies: [
      '（打哈欠）确实有点困了。今天上课都没什么精神，早点休息也好。你也早点睡吧。<情绪(困倦)><好感变化:+1><信任变化:+1>',
      '别吵我，让我睡会儿。昨晚睡得太晚了，现在困死了。有什么事明天再说吧。<情绪(困倦)><好感变化:-1><信任变化:0>',
      '嗯...困死了。今天就聊到这儿吧，明天再继续。晚安。<情绪(困倦)><好感变化:0><信任变化:0>'
    ]},
    // 夸赞
    { patterns: ['厉害', '棒', '强', '牛', '好', '优秀', '厉害啊'], replies: [
      '切，也就那样吧。我本来就挺厉害的，你才发现吗？<情绪(开心)><好感变化:+1><信任变化:0>',
      '哦？你眼光不错嘛。不过别夸得太夸张，我会不好意思的。<情绪(开心)><好感变化:+2><信任变化:+1>',
      '行吧，勉强接受你的夸奖。不过别以为这样我就会让着你。<情绪(正常)><好感变化:+1><信任变化:0>'
    ]},
    // 提问
    { patterns: ['?', '？', '什么', '怎么', '为什么', '吗', '是吗'], replies: [
      '你觉得呢？这个问题你应该有自己的想法吧。说说看？<情绪(正常)><好感变化:0><信任变化:0>',
      '嗯...让我想想。这个问题还挺有意思的，让我好好考虑一下。<情绪(思考)><好感变化:0><信任变化:0>',
      '这个嘛，不好说。每个人都有不同的看法，你觉得呢？<情绪(正常)><好感变化:0><信任变化:+1>'
    ]},
    // 吃饭
    { patterns: ['吃', '饭', '饿', '饿了', '吃饭'], replies: [
      '行，去吃吧。正好我也有点饿了，你想吃什么？<情绪(正常)><好感变化:0><信任变化:0>',
      '哦，这么快就饿了？那赶紧去吃吧，别饿着了。<情绪(关心)><好感变化:+1><信任变化:+1>',
      '吃什么？是去食堂还是外面吃？我听说学校附近新开了一家店。<情绪(正常)><好感变化:+1><信任变化:0>'
    ]},
    // 关心
    { patterns: ['没事吧', '还好吗', '怎么了', '没事', '你还好'], replies: [
      '啊？我没事啊，你怎么突然这么问？是不是发生什么事了？<情绪(惊讶)><好感变化:+2><信任变化:+2>',
      '我挺好的，谢谢你关心。你呢，最近怎么样？<情绪(开心)><好感变化:+2><信任变化:+2>',
      '没什么大事，就是有点累。放心吧，我睡一觉就好了。<情绪(困倦)><好感变化:+1><信任变化:+1>'
    ]},
    // 道别
    { patterns: ['再见', '拜拜', '走了', '下次'], replies: [
      '行，再见。下次再来找我玩啊，随时欢迎。<情绪(正常)><好感变化:+1><信任变化:0>',
      '拜拜。路上小心点，下次见！<情绪(正常)><好感变化:+1><信任变化:+1>',
      '嗯，下次见。别忘了我们下次的三国杀对局！<情绪(兴奋)><好感变化:+1><信任变化:0>'
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
  
  // 默认回复，根据好感度和信任度调整
  let defaultReplies;
  
  if (isLowLike) {
    defaultReplies = [
      '哦。<情绪(冷漠)><好感变化:0><信任变化:0>',
      '...<情绪(冷漠)><好感变化:0><信任变化:0>',
      '有什么事吗？<情绪(冷漠)><好感变化:0><信任变化:0>',
      '行吧。<情绪(冷漠)><好感变化:0><信任变化:0>',
      '随便你。<情绪(无所谓)><好感变化:0><信任变化:0>'
    ];
  } else if (like >= 50) {
    defaultReplies = [
      '哦↗，你说这个啊。我觉得还挺有意思的，继续说说？<情绪(正常)><好感变化:0><信任变化:0>',
      '嗯...让我想想。这个话题还挺深奥的，你是怎么想的？<情绪(思考)><好感变化:0><信任变化:0>',
      '行吧，既然你这么说。那我们就继续聊这个话题？<情绪(正常)><好感变化:0><信任变化:0>',
      '切，就这？我还以为是什么大事呢。不过既然你说了，那就聊聊吧。<情绪(不屑)><好感变化:-1><信任变化:0>',
      '你说啥？我没太听清，能再说一遍吗？<情绪(疑惑)><好感变化:0><信任变化:0>',
      '哦，这样啊。原来是这么回事，我明白了。<情绪(正常)><好感变化:0><信任变化:+1>',
      '行，知道了。我记住了，还有什么事吗？<情绪(正常)><好感变化:+1><信任变化:0>'
    ];
  } else {
    defaultReplies = [
      '嗯。<情绪(正常)><好感变化:0><信任变化:0>',
      '哦。<情绪(正常)><好感变化:0><信任变化:0>',
      '然后呢？<情绪(正常)><好感变化:0><信任变化:0>',
      '...<情绪(正常)><好感变化:0><信任变化:0>',
      '行吧。<情绪(正常)><好感变化:0><信任变化:0>',
      '哦，这样啊。<情绪(正常)><好感变化:0><信任变化:0>'
    ];
  }
  
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}

module.exports = router;
