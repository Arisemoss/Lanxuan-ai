/**
 * Netlify Functions - 数据API
 * Netlify Functions 无持久化存储，返回提示信息
 * 建议使用 Vercel 或 Docker 部署以获得完整数据持久化
 */

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // POST /save
  if (req.method === 'POST' && path.endsWith('/save')) {
    return Response.json({
      success: true,
      message: 'Netlify环境不支持服务端数据持久化，数据已保存在浏览器本地'
    });
  }

  // GET /load/:userId
  if (req.method === 'GET' && path.includes('/load/')) {
    return Response.json({
      success: true,
      data: null,
      message: 'Netlify环境不支持服务端数据持久化'
    });
  }

  return Response.json({ error: 'Not Found' }, { status: 404 });
};
