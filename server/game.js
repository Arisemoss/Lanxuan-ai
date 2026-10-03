/**
 * 游戏状态API
 * 提供游戏进度保存/加载、对局历史记录、战绩统计功能
 * 使用文件系统持久化，与 data.js 共享存储基础设施
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const {
  validateUserId,
  validateRequired,
  asyncHandler,
  AppError,
  ErrorTypes
} = require('./middleware');

// ============================================================
// 1. 存储配置
// ============================================================

/** 游戏数据目录 */
const GAMES_DIR = path.join(__dirname, '../data/games');

/** 对局历史目录 */
const HISTORY_DIR = path.join(__dirname, '../data/games/history');

/**
 * 确保目录存在
 */
function ensureGameDirectories() {
  const dirs = [GAMES_DIR, HISTORY_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

ensureGameDirectories();

// ============================================================
// 2. 文件工具函数（与data.js保持一致）
// ============================================================

/**
 * 安全读取JSON文件
 * @param {string} filePath
 * @param {*} defaultValue
 * @returns {*}
 */
function readJSONFile(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`[游戏] 读取文件失败: ${filePath}`, err.message);
    return defaultValue;
  }
}

/**
 * 安全写入JSON文件（原子写入）
 * @param {string} filePath
 * @param {object} data
 * @returns {boolean}
 */
function writeJSONFile(filePath, data) {
  const tmpPath = filePath + '.tmp.' + Date.now();
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error(`[游戏] 写入文件失败: ${filePath}`, err.message);
    try { fs.unlinkSync(tmpPath); } catch (_) { /* 忽略 */ }
    return false;
  }
}

/**
 * 获取用户游戏存档路径
 * @param {string} userId
 * @returns {string}
 */
function getGameSavePath(userId) {
  const prefix = userId.slice(0, 2) || '00';
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(GAMES_DIR, 'saves', prefix, `${safeUserId}.json`);
}

/**
 * 获取用户对局历史文件路径
 * @param {string} userId
 * @returns {string}
 */
function getHistoryPath(userId) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(HISTORY_DIR, `${safeUserId}.json`);
}

/**
 * 获取用户统计数据文件路径
 * @param {string} userId
 * @returns {string}
 */
function getStatsPath(userId) {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(GAMES_DIR, 'stats', `${safeUserId}.json`);
}

// ============================================================
// 3. API 路由
// ============================================================

/**
 * POST /api/game/save
 * 保存游戏进度
 * 请求体: { userId: string, gameState: object }
 */
router.post('/save', asyncHandler(async (req, res) => {
  const { userId, gameState } = req.body;

  // 验证用户ID
  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  // 验证游戏状态
  if (!gameState || typeof gameState !== 'object' || Array.isArray(gameState)) {
    throw new AppError(ErrorTypes.VALIDATION, '游戏状态必须是一个对象');
  }

  // 验证数据大小（限制100KB）
  const dataSize = Buffer.byteLength(JSON.stringify(gameState), 'utf-8');
  if (dataSize > 100 * 1024) {
    throw new AppError(ErrorTypes.VALIDATION, `游戏数据过大，最大允许 100KB，当前 ${Math.floor(dataSize / 1024)}KB`);
  }

  const filePath = getGameSavePath(userId);
  const now = new Date().toISOString();

  // 构建保存数据
  const saveData = {
    _userId: userId,
    _version: 1,
    gameState: gameState,
    savedAt: now,
    updatedAt: now
  };

  // 读取旧存档，保留 createdAt
  const oldSave = readJSONFile(filePath);
  if (oldSave && oldSave.createdAt) {
    saveData.createdAt = oldSave.createdAt;
  } else {
    saveData.createdAt = now;
  }

  const success = writeJSONFile(filePath, saveData);
  if (!success) {
    throw new AppError(ErrorTypes.DATA, '游戏进度保存失败');
  }

  res.json({
    success: true,
    message: '游戏进度保存成功',
    savedAt: now
  });
}));

/**
 * GET /api/game/load/:userId
 * 加载游戏进度
 */
router.get('/load/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  const filePath = getGameSavePath(userId);
  const saveData = readJSONFile(filePath);

  if (!saveData) {
    return res.json({
      success: true,
      data: null,
      message: '未找到游戏存档'
    });
  }

  res.json({
    success: true,
    data: {
      gameState: saveData.gameState,
      savedAt: saveData.savedAt,
      createdAt: saveData.createdAt
    }
  });
}));

/**
 * POST /api/game/history
 * 保存对局历史
 * 请求体: { userId: string, gameRecord: object }
 *
 * gameRecord 示例:
 * {
 *   playerHero: "赵云",
 *   aiHero: "诸葛亮",
 *   result: "win" | "lose" | "draw",
 *   rounds: 12,
 *   duration: 180000,  // 毫秒
 *   details: { ... }   // 可选的对局详情
 * }
 */
router.post('/history', asyncHandler(async (req, res) => {
  const { userId, gameRecord } = req.body;

  // 验证用户ID
  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  // 验证对局记录
  if (!gameRecord || typeof gameRecord !== 'object') {
    throw new AppError(ErrorTypes.VALIDATION, '对局记录必须是一个对象');
  }

  const validResults = ['win', 'lose', 'draw'];
  if (gameRecord.result && !validResults.includes(gameRecord.result)) {
    throw new AppError(ErrorTypes.VALIDATION, `对局结果必须是: ${validResults.join(', ')} 之一`);
  }

  const now = new Date().toISOString();

  // 构建历史记录条目
  const historyEntry = {
    id: `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    playerHero: gameRecord.playerHero || '未知',
    aiHero: gameRecord.aiHero || '未知',
    result: gameRecord.result || 'draw',
    rounds: gameRecord.rounds || 0,
    duration: gameRecord.duration || 0,
    details: gameRecord.details || null,
    createdAt: now
  };

  // 读取现有历史记录
  const historyPath = getHistoryPath(userId);
  let history = readJSONFile(historyPath, { _userId: userId, records: [] });

  // 添加新记录
  history.records.push(historyEntry);
  history._userId = userId;
  history.updatedAt = now;

  // 限制历史记录数量（最多保留200条）
  if (history.records.length > 200) {
    history.records = history.records.slice(-200);
  }

  const success = writeJSONFile(historyPath, history);
  if (!success) {
    throw new AppError(ErrorTypes.DATA, '对局历史保存失败');
  }

  // 同时更新统计数据
  updateStats(userId, historyEntry);

  res.json({
    success: true,
    message: '对局历史保存成功',
    recordId: historyEntry.id
  });
}));

/**
 * GET /api/game/history/:userId
 * 获取对局历史（可选分页）
 * 查询参数: ?limit=20&offset=0
 */
router.get('/history/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const historyPath = getHistoryPath(userId);
  const history = readJSONFile(historyPath, { _userId: userId, records: [] });

  // 倒序返回（最新的在前）
  const allRecords = (history.records || []).slice().reverse();
  const total = allRecords.length;
  const records = allRecords.slice(offset, offset + limit);

  res.json({
    success: true,
    data: {
      records: records,
      total: total,
      limit: limit,
      offset: offset,
      hasMore: offset + limit < total
    }
  });
}));

/**
 * GET /api/game/stats/:userId
 * 获取战绩统计
 */
router.get('/stats/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  // 从历史记录实时计算统计（确保准确性）
  const historyPath = getHistoryPath(userId);
  const history = readJSONFile(historyPath, { _userId: userId, records: [] });
  const records = history.records || [];

  // 基础统计
  const totalGames = records.length;
  const wins = records.filter(r => r.result === 'win').length;
  const losses = records.filter(r => r.result === 'lose').length;
  const draws = records.filter(r => r.result === 'draw').length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 10000) / 100 : 0;

  // 武将使用统计
  const heroStats = {};
  for (const record of records) {
    const hero = record.playerHero || '未知';
    if (!heroStats[hero]) {
      heroStats[hero] = { used: 0, wins: 0, losses: 0, draws: 0 };
    }
    heroStats[hero].used++;
    if (record.result === 'win') heroStats[hero].wins++;
    else if (record.result === 'lose') heroStats[hero].losses++;
    else heroStats[hero].draws++;
  }

  // 计算每个武将的胜率
  for (const hero of Object.keys(heroStats)) {
    const stat = heroStats[hero];
    stat.winRate = stat.used > 0 ? Math.round((stat.wins / stat.used) * 10000) / 100 : 0;
  }

  // 对手武将统计
  const opponentStats = {};
  for (const record of records) {
    const hero = record.aiHero || '未知';
    if (!opponentStats[hero]) {
      opponentStats[hero] = { faced: 0, wins: 0, losses: 0 };
    }
    opponentStats[hero].faced++;
    if (record.result === 'win') opponentStats[hero].wins++;
    else if (record.result === 'lose') opponentStats[hero].losses++;
  }

  // 连胜/连败记录
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let tempWinStreak = 0;
  let tempLoseStreak = 0;

  for (const record of records) {
    if (record.result === 'win') {
      tempWinStreak++;
      tempLoseStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
    } else if (record.result === 'lose') {
      tempLoseStreak++;
      tempWinStreak = 0;
      maxLoseStreak = Math.max(maxLoseStreak, tempLoseStreak);
    } else {
      tempWinStreak = 0;
      tempLoseStreak = 0;
    }
  }

  // 计算当前连胜/连败
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i].result;
    if (currentStreak === 0) {
      currentStreak = r === 'win' ? 1 : r === 'lose' ? -1 : 0;
    } else if (currentStreak > 0 && r === 'win') {
      currentStreak++;
    } else if (currentStreak < 0 && r === 'lose') {
      currentStreak--;
    } else {
      break;
    }
  }

  // 平均回合数和时长
  const totalRounds = records.reduce((sum, r) => sum + (r.rounds || 0), 0);
  const totalDuration = records.reduce((sum, r) => sum + (r.duration || 0), 0);
  const avgRounds = totalGames > 0 ? Math.round(totalRounds / totalGames * 10) / 10 : 0;
  const avgDuration = totalGames > 0 ? Math.round(totalDuration / totalGames) : 0;

  res.json({
    success: true,
    data: {
      // 基础统计
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      // 连胜连败
      currentStreak,
      maxWinStreak,
      maxLoseStreak,
      // 武将统计
      heroStats,
      opponentStats,
      // 平均数据
      avgRounds,
      avgDuration,
      // 最后更新时间
      lastGameAt: records.length > 0 ? records[records.length - 1].createdAt : null
    }
  });
}));

/**
 * 更新用户统计数据（增量更新，用于快速查询）
 * @param {string} userId
 * @param {object} gameRecord
 */
function updateStats(userId, gameRecord) {
  try {
    const statsPath = getStatsPath(userId);
    const stats = readJSONFile(statsPath, {
      _userId: userId,
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      maxWinStreak: 0,
      maxLoseStreak: 0,
      updatedAt: null
    });

    stats.totalGames++;
    if (gameRecord.result === 'win') {
      stats.wins++;
      stats.currentStreak = stats.currentStreak > 0 ? stats.currentStreak + 1 : 1;
      stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.currentStreak);
    } else if (gameRecord.result === 'lose') {
      stats.losses++;
      stats.currentStreak = stats.currentStreak < 0 ? stats.currentStreak - 1 : -1;
      stats.maxLoseStreak = Math.max(stats.maxLoseStreak, Math.abs(stats.currentStreak));
    } else {
      stats.draws++;
      stats.currentStreak = 0;
    }

    stats.updatedAt = new Date().toISOString();
    writeJSONFile(statsPath, stats);
  } catch (err) {
    console.error(`[游戏] 更新统计数据失败: ${userId}`, err.message);
  }
}

module.exports = router;
