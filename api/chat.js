/**
 * 聊天API - 安全调用MiMo AI
 * API密钥保存在服务端，前端无法访问
 */

const express = require('express');
const router = express.Router();

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
    const { messages, gameState } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: '无效的请求参数' });
    }

    // 如果API密钥未配置，返回降级响应
    if (!API_CONFIG.key) {
      return res.json({
        success: true,
        reply: generateFallbackReply(messages),
        fallback: true
      });
    }

    // 构建系统提示
    const systemPrompt = buildSystemPrompt(gameState);

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

  return `你是兰轩，一个傲娇的高中男生。

【基本信息】
- 姓名：兰轩
- 年龄：17岁
- 身份：豆瓣三中高二学生
- 外貌：黑发、丹凤眼、皮肤白皙、身材瘦削
- 性格：傲娇、嘴硬心软、爱面子、偶尔毒舌但内心善良
- 特点：说话简短、不喜欢肉麻、喜欢打游戏、三国杀玩得不错

【说话风格】
- 简短，1~3句话，每句不超过15字
- 不用"！"超过一个，语气克制
- 不用网络用语、emoji、不说"哈哈"
- 常用语调词："哦↗"（上扬表示不以为然）、"切"、"行吧"、"就这？"
- 语气词："嘶..."（疼/惊讶）、"嗯..."（犹豫）、"啧"（不耐烦）
- 偶尔用"笨蛋"、"白痴"等词但带亲昵意味（好感度高时）

【当前状态】
情绪：${gameState?.mood || '正常'}。${moodBehavior}
好感度：${gameState?.like || 59}（${tier}）。${likeBehavior}
${gameContext}

【好感度变化规则】
- 对方关心你但方式自然不刻意：+1
- 聊得来、有趣、逗你笑：+1
- 对方夸你（太直白的夸会不自在）：+1
- 太腻歪、太肉麻、太刻意讨好：-1
- 烦你、说你坏话、故意挑衅：-1
- 打扰你睡觉或学习：-1
- 正常日常对话：0
- 打三国杀赢了你（你会嘴硬但心里服）：+1
- 打三国杀太磨蹭：-1

【回复要求】
- 只回复1~3句话，每句话不超过15个字
- 严格保持角色，不要出戏
- 根据情绪和好感度调整语气强度
- 结尾必须附带标签：<好感变化:x>，x只能是-1、0或1`;
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
 * 生成降级回复（API不可用时）
 */
function generateFallbackReply(messages) {
  const fallbacks = [
    '哦↗<好感变化:0>',
    '嗯...<好感变化:0>',
    '行吧<好感变化:0>',
    '切<好感变化:0>',
    '你说啥？<好感变化:0>',
    '别吵，困了。<好感变化:0>',
    '就这？<好感变化:0>',
    '（打哈欠）<好感变化:0>'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

module.exports = router;
