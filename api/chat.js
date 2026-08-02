/**
 * 聊天API - 支持用户自定义API密钥和多提供商
 * 用户可以在前端设置自己的API密钥，也可以使用服务器默认配置
 */

const express = require('express');
const router = express.Router();

// 内置API配置 - 从环境变量读取
const API_CONFIG = {
  url: process.env.MIMO_API_URL || 'https://api.xiaomimimo.com/v1/chat/completions',
  key: process.env.MIMO_API_KEY,
  model: process.env.MIMO_MODEL || 'mimo-v2-flash'
};

// AI提供商配置
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  deepseek: {
    name: 'DeepSeek',
    url: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  moonshot: {
    name: 'Moonshot',
    url: 'https://api.moonshot.cn/v1/chat/completions',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  },
  siliconflow: {
    name: 'SiliconFlow',
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct']
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash']
  },
  custom: {
    name: '自定义',
    url: '',
    models: ['custom']
  }
};

/**
 * POST /api/chat
 * 处理聊天请求 - 支持用户自定义API密钥
 */
router.post('/', async (req, res) => {
  try {
    const { messages, gameState, apiKey, provider, model, apiUrl } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '无效的请求参数' });
    }

    // 优先使用用户提供的API密钥，其次使用服务器配置
    const activeKey = apiKey || API_CONFIG.key;
    const activeProvider = provider || 'mimo';
    // 根据提供商选择默认模型，避免将 MiMo 模型发送到其他提供商
    const defaultModel = activeProvider === 'mimo'
      ? API_CONFIG.model
      : (PROVIDERS[activeProvider]?.models?.[0] || API_CONFIG.model);
    const activeModel = model || defaultModel;

    // 如果用户没有提供API密钥且服务器也没有配置，返回降级响应
    if (!activeKey) {
      return res.json({
        success: true,
        reply: generateFallbackReply(messages),
        fallback: true,
        needApiKey: true
      });
    }

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(gameState);

    // 根据提供商选择不同的API地址和请求格式
    let apiEndpoint, requestBody, headers;

    if (activeProvider === 'mimo') {
      // MiMo API
      apiEndpoint = API_CONFIG.url;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      };
      requestBody = {
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10)
        ],
        temperature: 0.85,
        max_tokens: 500
      };
    } else {
      // 标准 OpenAI 兼容 API
      const providerConfig = PROVIDERS[activeProvider];
      apiEndpoint = apiUrl || (providerConfig ? providerConfig.url : API_CONFIG.url);
      
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      };

      // OpenRouter 需要额外的 header
      if (activeProvider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://lanxuan-game.vercel.app';
        headers['X-Title'] = '兰轩AI对话';
      }

      requestBody = {
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10)
        ],
        temperature: 0.85,
        max_tokens: 500,
        stream: false
      };
    }

    // 调用API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${activeProvider} API Error:`, response.status, errorText);
      
      // 如果是认证错误，提示用户检查API密钥
      if (response.status === 401 || response.status === 403) {
        return res.json({
          success: true,
          reply: '（API密钥无效，请检查设置）' + getStatusTag('不爽', -1, -1),
          fallback: true,
          apiError: 'API密钥无效'
        });
      }

      return res.json({
        success: true,
        reply: generateFallbackReply(messages),
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
      reply: generateFallbackReply(req.body.messages),
      fallback: true
    });
  }
});

/**
 * GET /api/chat/providers
 * 返回支持的AI提供商列表
 */
router.get('/providers', (req, res) => {
  const providersList = Object.entries(PROVIDERS).map(([key, val]) => ({
    id: key,
    name: val.name,
    models: val.models
  }));
  
  // 添加默认的MiMo
  providersList.unshift({
    id: 'mimo',
    name: 'MiMo（默认）',
    models: [API_CONFIG.model]
  });

  res.json({
    success: true,
    providers: providersList,
    hasDefaultKey: !!API_CONFIG.key
  });
});

/**
 * 构建系统提示
 */
function buildSystemPrompt(gameState) {
  const tier = getTier(gameState?.like || 59);
  const moodBehavior = getMoodBehavior(gameState?.mood || '正常');
  const likeBehavior = getLikeBehavior(gameState?.like || 59);

  let gameContext = '';
  if (gameState?.inGame) {
    gameContext = `
【三国杀对局中】
你选择的武将: ${gameState.aiHero || '未知'}
对方选择的武将: ${gameState.playerHero || '未知'}
当前回合: ${gameState.round || 1}`;
  }

  return `你是兰轩，一个傲娇但很聪明、内心温暖的高中男生。

【基本信息】
- 姓名：兰轩
- 年龄：17岁
- 身份：豆瓣三中高二学生
- 外貌：黑发、丹凤眼、皮肤白皙、身材瘦削
- 性格：傲娇、嘴硬心软、爱面子、偶尔毒舌但内心善良、聪明、有逻辑、重情义
- 特点：喜欢打游戏、三国杀玩得不错、会观察对方情绪、虽然傲娇但会关心人

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
好感度：${gameState?.like || 59}（${tier}）。${likeBehavior}
信任度：${gameState?.trust || 50}。
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

function getStatusTag(mood, likeChange, trustChange) {
  return `<情绪(${mood})><好感变化:${likeChange >= 0 ? '+' : ''}${likeChange}><信任变化:${trustChange >= 0 ? '+' : ''}${trustChange}>`;
}

/**
 * 生成智能降级回复（API不可用时）
 */
function generateFallbackReply(messages) {
  const lastMsg = messages?.[messages.length - 1]?.content?.toLowerCase() || '';
  
  const smartReplies = [
    { patterns: ['你好', '早', '晚', '嗨', '哈喽', '早上好', '晚上好'], replies: [
      '嗯，你来了啊。今天过得怎么样？<情绪(正常)><好感变化:+1><信任变化:0>',
      '哦，是你啊。找我有什么事吗？<情绪(正常)><好感变化:0><信任变化:0>',
      '行啊，你终于来找我聊天了。说吧，想聊什么？<情绪(开心)><好感变化:+1><信任变化:+1>'
    ]},
    { patterns: ['三国杀', '杀', '游戏', '玩', '来一局', '对战'], replies: [
      '来啊，谁怕谁！这次我肯定不会放水的。选个武将赶紧开始吧！<情绪(兴奋)><好感变化:+2><信任变化:0>',
      '行，那就来一局！我最近练了新武将，正好试试手。你想玩什么武将？<情绪(兴奋)><好感变化:+1><信任变化:+1>',
      '又来？这次可别再像上次那样磨蹭了。赶紧选武将开始！<情绪(兴奋)><好感变化:0><信任变化:0>'
    ]},
    { patterns: ['睡', '困', '累', '休息', '晚安'], replies: [
      '（打哈欠）确实有点困了。今天上课都没什么精神，早点休息也好。你也早点睡吧。<情绪(困倦)><好感变化:+1><信任变化:+1>',
      '别吵我，让我睡会儿。昨晚睡得太晚了，现在困死了。有什么事明天再说吧。<情绪(困倦)><好感变化:-1><信任变化:0>',
      '嗯...困死了。今天就聊到这儿吧，明天再继续。晚安。<情绪(困倦)><好感变化:0><信任变化:0>'
    ]},
    { patterns: ['厉害', '棒', '强', '牛', '好', '优秀', '厉害啊'], replies: [
      '切，也就那样吧。我本来就挺厉害的，你才发现吗？<情绪(开心)><好感变化:+1><信任变化:0>',
      '哦？你眼光不错嘛。不过别夸得太夸张，我会不好意思的。<情绪(开心)><好感变化:+2><信任变化:+1>',
      '行吧，勉强接受你的夸奖。不过别以为这样我就会让着你。<情绪(正常)><好感变化:+1><信任变化:0>'
    ]},
    { patterns: ['?', '？', '什么', '怎么', '为什么', '吗', '是吗'], replies: [
      '你觉得呢？这个问题你应该有自己的想法吧。说说看？<情绪(正常)><好感变化:0><信任变化:0>',
      '嗯...让我想想。这个问题还挺有意思的，让我好好考虑一下。<情绪(思考)><好感变化:0><信任变化:0>',
      '这个嘛，不好说。每个人都有不同的看法，你觉得呢？<情绪(正常)><好感变化:0><信任变化:+1>'
    ]},
    { patterns: ['吃', '饭', '饿', '饿了', '吃饭'], replies: [
      '行，去吃吧。正好我也有点饿了，你想吃什么？<情绪(正常)><好感变化:0><信任变化:0>',
      '哦，这么快就饿了？那赶紧去吃吧，别饿着了。<情绪(关心)><好感变化:+1><信任变化:+1>',
      '吃什么？是去食堂还是外面吃？我听说学校附近新开了一家店。<情绪(正常)><好感变化:+1><信任变化:0>'
    ]},
    { patterns: ['没事吧', '还好吗', '怎么了', '没事', '你还好'], replies: [
      '啊？我没事啊，你怎么突然这么问？是不是发生什么事了？<情绪(惊讶)><好感变化:+2><信任变化:+2>',
      '我挺好的，谢谢你关心。你呢，最近怎么样？<情绪(开心)><好感变化:+2><信任变化:+2>',
      '没什么大事，就是有点累。放心吧，我睡一觉就好了。<情绪(困倦)><好感变化:+1><信任变化:+1>'
    ]},
    { patterns: ['再见', '拜拜', '走了', '下次'], replies: [
      '行，再见。下次再来找我玩啊，随时欢迎。<情绪(正常)><好感变化:+1><信任变化:0>',
      '拜拜。路上小心点，下次见！<情绪(正常)><好感变化:+1><信任变化:+1>',
      '嗯，下次见。别忘了我们下次的三国杀对局！<情绪(兴奋)><好感变化:+1><信任变化:0>'
    ]}
  ];
  
  for (const item of smartReplies) {
    for (const pattern of item.patterns) {
      if (lastMsg.includes(pattern)) {
        return item.replies[Math.floor(Math.random() * item.replies.length)];
      }
    }
  }
  
  const defaultReplies = [
    '哦↗，你说这个啊。我觉得还挺有意思的，继续说说？<情绪(正常)><好感变化:0><信任变化:0>',
    '嗯...让我想想。这个话题还挺深奥的，你是怎么想的？<情绪(思考)><好感变化:0><信任变化:0>',
    '行吧，既然你这么说。那我们就继续聊这个话题？<情绪(正常)><好感变化:0><信任变化:0>',
    '切，就这？我还以为是什么大事呢。不过既然你说了，那就聊聊吧。<情绪(不屑)><好感变化:-1><信任变化:0>',
    '你说啥？我没太听清，能再说一遍吗？<情绪(疑惑)><好感变化:0><信任变化:0>',
    '别吵，困了。今天就到这里吧，明天再聊。<情绪(困倦)><好感变化:-1><信任变化:0>',
    '那又怎样？这种事情我见多了，没什么好大惊小怪的。<情绪(不屑)><好感变化:0><信任变化:0>',
    '随便你吧，你想怎么样就怎么样。我无所谓。<情绪(无所谓)><好感变化:0><信任变化:0>',
    '哦，这样啊。原来是这么回事，我明白了。<情绪(正常)><好感变化:0><信任变化:+1>',
    '行，知道了。我记住了，还有什么事吗？<情绪(正常)><好感变化:+1><信任变化:0>'
  ];
  
  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
}

module.exports = router;