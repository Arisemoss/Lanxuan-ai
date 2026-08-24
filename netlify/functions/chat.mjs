/**
 * Netlify Functions - 聊天API
 * 与 api/chat.js 功能一致，适配 Netlify Functions v2
 */

const API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';

// 简化的系统提示（与 api/chat.js 保持一致）
function buildSystemPrompt(gameState) {
  const like = gameState?.like || 59;
  const tier = like >= 90 ? '死基友' : like >= 80 ? '铁哥们' : like >= 70 ? '挚友' : like >= 60 ? '好朋友' : '普通舍友';

  return `你是兰轩，一个傲娇但内心温暖的高中男生。
姓名：兰轩，17岁，豆瓣三中高二学生。
性格：傲娇、嘴硬心软、毒舌但善良。
当前好感度：${like}（${tier}）
说话风格：自然对话，2~4句话，常用"哦↗""切""行吧"。
结尾附带标签：<情绪(xx)><好感变化:+X><信任变化:+X>`;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { messages, gameState, apiKey, provider, model } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: '无效的消息' }, { status: 400 });
  }

  const activeKey = apiKey || Netlify.env.get('MIMO_API_KEY');
  const activeModel = model || 'mimo-v2-flash';

  if (!activeKey) {
    return Response.json({
      success: true,
      reply: '（瞥了你一眼）喂，你还没配API密钥呢。去设置一下。',
      fallback: true,
      needApiKey: true
    });
  }

  const systemPrompt = buildSystemPrompt(gameState);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      },
      body: JSON.stringify({
        model: activeModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10)
        ],
        temperature: 0.85,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      return Response.json({
        success: true,
        reply: '（沉默）API暂时不可用。' + '<情绪(正常)><好感变化:0><信任变化:0>',
        fallback: true
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '（沉默）';

    return Response.json({ success: true, reply });
  } catch (error) {
    return Response.json({
      success: true,
      reply: '（打哈欠）网络不太好，等会儿再聊。' + '<情绪(困倦)><好感变化:0><信任变化:0>',
      fallback: true
    });
  }
};
