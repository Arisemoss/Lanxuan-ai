import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === '/api/data/save' && req.method === 'POST') {
    return handleSave(req);
  }

  if (path.startsWith('/api/data/load/') && req.method === 'GET') {
    const userId = context.params.userId;
    return handleLoad(userId);
  }

  if (path.startsWith('/api/data/delete/') && req.method === 'DELETE') {
    const userId = context.params.userId;
    return handleDelete(userId);
  }

  return new Response('Not Found', { status: 404 });
};

export const config = {
  path: ['/api/data/save', '/api/data/load/:userId', '/api/data/delete/:userId'],
};

async function handleSave(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '无效的请求体' }, { status: 400 });
  }

  const { userId, data } = body;

  if (!userId) {
    return Response.json({ error: '缺少用户ID' }, { status: 400 });
  }

  const dataStr = JSON.stringify(data);
  if (dataStr.length > 1024 * 1024) {
    return Response.json({ error: '数据大小超过限制' }, { status: 400 });
  }

  const store = getStore('user-game-state');
  const updatedAt = new Date().toISOString();
  await store.setJSON(userId, { ...data, updatedAt });

  return Response.json({ success: true, message: '数据保存成功', updatedAt });
}

async function handleLoad(userId) {
  if (!userId) {
    return Response.json({ error: '缺少用户ID' }, { status: 400 });
  }

  const store = getStore('user-game-state');
  const data = await store.get(userId, { type: 'json' });

  if (!data) {
    return Response.json({ success: true, data: null, message: '未找到用户数据' });
  }

  return Response.json({ success: true, data });
}

async function handleDelete(userId) {
  if (!userId) {
    return Response.json({ error: '缺少用户ID' }, { status: 400 });
  }

  const store = getStore('user-game-state');
  await store.delete(userId);

  return Response.json({ success: true, deleted: true, message: '数据已删除' });
}
