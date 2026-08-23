/**
 * 数据持久化API - 文件系统存储版本
 * 使用JSON文件进行数据持久化，支持自动备份、数据迁移和清理
 * 全部使用Node.js内置模块，无需额外依赖
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

/** 数据存储目录 */
const DATA_DIR = path.join(__dirname, '../data');

/** 备份存储目录 */
const BACKUP_DIR = path.join(__dirname, '../data/backups');

/** 单用户数据大小上限 (500KB) */
const MAX_USER_DATA_SIZE = 500 * 1024;

/** 数据不活跃天数阈值（超过此天数的用户数据将被清理） */
const INACTIVE_DAYS = 30;

/** 数据格式版本号 */
const DATA_VERSION = 2;

/**
 * 确保数据目录存在
 */
function ensureDirectories() {
  const dirs = [DATA_DIR, BACKUP_DIR, path.join(DATA_DIR, 'users'), path.join(DATA_DIR, 'games')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// 启动时确保目录存在
ensureDirectories();

// ============================================================
// 2. 文件读写工具函数
// ============================================================

/**
 * 安全读取JSON文件
 * @param {string} filePath - 文件路径
 * @param {*} defaultValue - 读取失败时的默认值
 * @returns {*}
 */
function readJSONFile(filePath, defaultValue = null) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`[数据] 读取文件失败: ${filePath}`, err.message);
    return defaultValue;
  }
}

/**
 * 安全写入JSON文件（先写临时文件再重命名，防止写入中断导致数据损坏）
 * @param {string} filePath - 目标文件路径
 * @param {object} data - 要写入的数据
 * @returns {boolean} 是否成功
 */
function writeJSONFile(filePath, data) {
  const tmpPath = filePath + '.tmp.' + Date.now();
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // 先写临时文件
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    // 原子重命名
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error(`[数据] 写入文件失败: ${filePath}`, err.message);
    // 清理临时文件
    try { fs.unlinkSync(tmpPath); } catch (_) { /* 忽略 */ }
    return false;
  }
}

/**
 * 获取用户数据文件路径
 * @param {string} userId
 * @returns {string}
 */
function getUserDataPath(userId) {
  // 使用用户ID的前两位作为子目录，避免单目录文件过多
  const prefix = userId.slice(0, 2) || '00';
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, 'users', prefix, `${safeUserId}.json`);
}

/**
 * 获取备份文件路径
 * @param {string} userId
 * @returns {string}
 */
function getBackupPath(userId) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(BACKUP_DIR, `${safeUserId}_${timestamp}.json`);
}

// ============================================================
// 3. 数据备份机制
// ============================================================

/**
 * 创建数据备份（写入前自动调用）
 * @param {string} userId - 用户ID
 * @param {object} currentData - 当前数据
 */
function createBackup(userId, currentData) {
  try {
    if (!currentData) return;
    const backupPath = getBackupPath(userId);
    writeJSONFile(backupPath, {
      _backup: true,
      _userId: userId,
      _createdAt: new Date().toISOString(),
      _version: currentData._version || 1,
      data: currentData
    });
    // 清理旧备份（每个用户最多保留5个）
    cleanOldBackups(userId, 5);
  } catch (err) {
    console.error(`[数据] 创建备份失败: ${userId}`, err.message);
  }
}

/**
 * 清理用户的旧备份文件
 * @param {string} userId
 * @param {number} keepCount - 保留的备份数量
 */
function cleanOldBackups(userId, keepCount = 5) {
  try {
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(safeUserId + '_') && f.endsWith('.json'))
      .sort()
      .reverse();

    // 删除超出保留数量的备份
    for (let i = keepCount; i < files.length; i++) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, files[i]));
      } catch (_) { /* 忽略删除失败 */ }
    }
  } catch (err) {
    console.error(`[数据] 清理备份失败: ${userId}`, err.message);
  }
}

// ============================================================
// 4. 数据迁移逻辑
// ============================================================

/**
 * 迁移旧格式数据到新格式
 * @param {object} oldData - 旧格式数据
 * @returns {object} 新格式数据
 */
function migrateData(oldData) {
  if (!oldData) return null;

  // 已是最新版本，无需迁移
  if (oldData._version === DATA_VERSION) return oldData;

  let migrated = { ...oldData };

  // v1 -> v2: 添加版本号和活跃时间字段
  if (!migrated._version || migrated._version < 2) {
    migrated._version = 2;
    migrated._migratedAt = new Date().toISOString();
    // 如果没有 updatedAt，使用迁移时间
    if (!migrated.updatedAt) {
      migrated.updatedAt = migrated._migratedAt;
    }
    // 如果没有 createdAt，使用 updatedAt
    if (!migrated.createdAt) {
      migrated.createdAt = migrated.updatedAt;
    }
  }

  return migrated;
}

// ============================================================
// 5. 数据清理（删除不活跃用户数据）
// ============================================================

/**
 * 扫描并清理超过指定天数未活跃的用户数据
 * @returns {{ cleaned: number, errors: number }}
 */
function cleanupInactiveUsers() {
  let cleaned = 0;
  let errors = 0;
  const cutoffDate = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

  try {
    const usersDir = path.join(DATA_DIR, 'users');
    if (!fs.existsSync(usersDir)) return { cleaned, errors };

    // 遍历所有子目录
    const subDirs = fs.readdirSync(usersDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const subDir of subDirs) {
      const subDirPath = path.join(usersDir, subDir);
      const files = fs.readdirSync(subDirPath)
        .filter(f => f.endsWith('.json') && !f.includes('.tmp.'));

      for (const file of files) {
        try {
          const filePath = path.join(subDirPath, file);
          const data = readJSONFile(filePath);
          if (!data) continue;

          const lastActive = new Date(data.updatedAt || data._migratedAt || 0);
          if (lastActive < cutoffDate) {
            // 创建最终备份后删除
            createBackup(file.replace('.json', ''), data);
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch (err) {
          errors++;
          console.error(`[数据清理] 处理文件失败: ${file}`, err.message);
        }
      }

      // 清理空子目录
      try {
        const remaining = fs.readdirSync(subDirPath);
        if (remaining.length === 0) {
          fs.rmdirSync(subDirPath);
        }
      } catch (_) { /* 忽略 */ }
    }
  } catch (err) {
    console.error('[数据清理] 清理过程出错:', err.message);
  }

  return { cleaned, errors };
}

// ============================================================
// 6. API 路由
// ============================================================

/**
 * POST /api/data/save
 * 保存用户数据
 * 请求体: { userId: string, data: object }
 */
router.post('/save', asyncHandler(async (req, res) => {
  const { userId, data } = req.body;

  // 验证用户ID
  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  // 验证数据
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new AppError(ErrorTypes.VALIDATION, '数据必须是一个对象');
  }

  // 验证数据大小（限制500KB）
  const dataSize = Buffer.byteLength(JSON.stringify(data), 'utf-8');
  if (dataSize > MAX_USER_DATA_SIZE) {
    throw new AppError(
      ErrorTypes.VALIDATION,
      `数据大小超出限制，最大允许 ${Math.floor(MAX_USER_DATA_SIZE / 1024)}KB，当前 ${Math.floor(dataSize / 1024)}KB`
    );
  }

  const filePath = getUserDataPath(userId);

  // 读取旧数据（用于备份）
  const oldData = readJSONFile(filePath);

  // 迁移旧数据（如果有）
  const existingData = migrateData(oldData);

  // 创建备份（如果存在旧数据）
  if (existingData) {
    createBackup(userId, existingData);
  }

  // 合并数据，保留元信息
  const now = new Date().toISOString();
  const savedData = {
    ...data,
    _version: DATA_VERSION,
    _userId: userId,
    createdAt: existingData?.createdAt || data.createdAt || now,
    updatedAt: now
  };

  // 写入文件
  const success = writeJSONFile(filePath, savedData);
  if (!success) {
    throw new AppError(ErrorTypes.DATA, '数据保存失败，请稍后重试');
  }

  res.json({
    success: true,
    message: '数据保存成功',
    updatedAt: now,
    dataSize: dataSize
  });
}));

/**
 * GET /api/data/load/:userId
 * 加载用户数据
 */
router.get('/load/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // 验证用户ID
  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  const filePath = getUserDataPath(userId);
  let data = readJSONFile(filePath);

  if (!data) {
    return res.json({
      success: true,
      data: null,
      message: '未找到用户数据'
    });
  }

  // 自动迁移旧格式数据
  data = migrateData(data);

  // 如果发生了迁移，写回文件
  if (data._version === DATA_VERSION) {
    writeJSONFile(filePath, data);
  }

  // 更新活跃时间
  data.updatedAt = new Date().toISOString();
  writeJSONFile(filePath, data);

  // 返回时移除内部元信息
  const { _version, _userId, _migratedAt, ...responseData } = data;

  res.json({
    success: true,
    data: responseData
  });
}));

/**
 * DELETE /api/data/delete/:userId
 * 删除用户数据
 */
router.delete('/delete/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // 验证用户ID
  const userIdCheck = validateUserId(userId);
  if (!userIdCheck.valid) {
    throw new AppError(ErrorTypes.VALIDATION, userIdCheck.error);
  }

  const filePath = getUserDataPath(userId);

  if (!fs.existsSync(filePath)) {
    return res.json({
      success: true,
      deleted: false,
      message: '数据不存在'
    });
  }

  // 删除前创建最终备份
  const data = readJSONFile(filePath);
  if (data) {
    createBackup(userId, data);
  }

  // 删除数据文件
  fs.unlinkSync(filePath);

  res.json({
    success: true,
    deleted: true,
    message: '数据已删除（备份已保留）'
  });
}));

/**
 * GET /api/data/list
 * 列出所有用户ID（管理用）
 */
router.get('/list', asyncHandler(async (req, res) => {
  const usersDir = path.join(DATA_DIR, 'users');
  if (!fs.existsSync(usersDir)) {
    return res.json({ success: true, users: [], count: 0 });
  }

  const userIds = [];
  const subDirs = fs.readdirSync(usersDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const subDir of subDirs) {
    const subDirPath = path.join(usersDir, subDir);
    const files = fs.readdirSync(subDirPath)
      .filter(f => f.endsWith('.json') && !f.includes('.tmp.'));

    for (const file of files) {
      const data = readJSONFile(path.join(subDirPath, file));
      if (data && data._userId) {
        userIds.push({
          userId: data._userId,
          updatedAt: data.updatedAt,
          dataSize: Buffer.byteLength(JSON.stringify(data), 'utf-8')
        });
      }
    }
  }

  res.json({
    success: true,
    users: userIds,
    count: userIds.length
  });
}));

/**
 * POST /api/data/cleanup
 * 手动触发不活跃数据清理（管理用）
 */
router.post('/cleanup', asyncHandler(async (req, res) => {
  const result = cleanupInactiveUsers();
  res.json({
    success: true,
    message: `清理完成: 删除 ${result.cleaned} 个不活跃用户数据`,
    ...result
  });
}));

module.exports = router;
