/**
 * 数据持久化API
 * 支持保存和加载用户数据 - 使用本地JSON文件存储
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 数据版本号（每次数据结构变更时递增）
const DATA_VERSION = 1;

// 内存存储（生产环境应使用数据库）
const dataStore = new Map();

// 数据清理配置：30天未更新的数据自动清理
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 每天检查一次
const DATA_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30天

/**
 * 启动自动数据清理定时器
 */
function startCleanupTimer() {
  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, record] of dataStore.entries()) {
      const updatedAt = record._meta?.updatedAt
        ? new Date(record._meta.updatedAt).getTime()
        : 0;

      if (updatedAt && (now - updatedAt > DATA_MAX_AGE_MS)) {
        dataStore.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[DataCleanup] 自动清理了 ${cleanedCount} 条过期数据`);
    }
  }, CLEANUP_INTERVAL_MS);
}

// 启动定时器
startCleanupTimer();

/**
 * 包装数据存储结构，添加元数据
 */
function wrapData(data) {
  const now = new Date().toISOString();
  return {
    _meta: {
      version: DATA_VERSION,
      createdAt: data?._meta?.createdAt || now,
      updatedAt: now
    },
    ...data
  };
}

/**
 * 验证并升级数据版本
 */
function validateAndUpgradeData(record) {
  if (!record || typeof record !== 'object') {
    return null;
  }

  // 如果没有 _meta，视为旧版本数据，进行包装
  if (!record._meta) {
    return wrapData(record);
  }

  const currentVersion = record._meta.version || 0;
  if (currentVersion < DATA_VERSION) {
    // 数据版本升级逻辑（未来可扩展）
    record._meta.version = DATA_VERSION;
    record._meta.updatedAt = new Date().toISOString();
  }

  return record;
}

/**
 * POST /api/data/save
 * 保存用户数据
 */
router.post('/save', (req, res) => {
  try {
    const { userId, data } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const dataSize = JSON.stringify(data).length;
    if (dataSize > 1024 * 1024) {
      return res.status(400).json({ error: '数据大小超过限制' });
    }

    // 包装数据（添加版本号和元数据）
    const wrappedData = wrapData(data);

    // 保存数据
    dataStore.set(userId, wrappedData);

    res.json({
      success: true,
      message: '数据保存成功',
      version: DATA_VERSION,
      updatedAt: wrappedData._meta.updatedAt
    });

  } catch (error) {
    console.error('Save Data Error:', error);
    res.status(500).json({ error: '保存数据失败' });
  }
});

router.get('/load/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    let data = dataStore.get(userId);

    if (!data) {
      return res.json({
        success: true,
        data: null,
        message: '未找到用户数据'
      });
    }

    // 验证并升级数据版本
    data = validateAndUpgradeData(data);
    if (data) {
      dataStore.set(userId, data);
    }

    res.json({
      success: true,
      data: data,
      version: data?._meta?.version || DATA_VERSION
    });

  } catch (error) {
    console.error('Load Data Error:', error);
    res.status(500).json({ error: '加载数据失败' });
  }
});

router.delete('/delete/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const deleted = dataStore.delete(userId);

    res.json({
      success: true,
      deleted: deleted,
      message: deleted ? '数据已删除' : '数据不存在'
    });

  } catch (error) {
    console.error('Delete Data Error:', error);
    res.status(500).json({ error: '删除数据失败' });
  }
});

// ==================== 批量操作接口 ====================

/**
 * POST /api/data/batch/save
 * 批量保存用户数据
 */
router.post('/batch/save', (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items 必须是数组' });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      const { userId, data } = item;

      if (!userId) {
        results.push({ userId: userId || null, success: false, error: '缺少用户ID' });
        failCount++;
        continue;
      }

      const dataSize = JSON.stringify(data).length;
      if (dataSize > 1024 * 1024) {
        results.push({ userId, success: false, error: '数据大小超过限制' });
        failCount++;
        continue;
      }

      const wrappedData = wrapData(data);
      dataStore.set(userId, wrappedData);
      results.push({ userId, success: true, updatedAt: wrappedData._meta.updatedAt });
      successCount++;
    }

    res.json({
      success: true,
      summary: { total: items.length, success: successCount, failed: failCount },
      results
    });

  } catch (error) {
    console.error('Batch Save Error:', error);
    res.status(500).json({ error: '批量保存失败' });
  }
});

/**
 * POST /api/data/batch/load
 * 批量加载用户数据
 */
router.post('/batch/load', (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds 必须是数组' });
    }

    const results = [];
    let foundCount = 0;

    for (const userId of userIds) {
      let data = dataStore.get(userId);

      if (data) {
        data = validateAndUpgradeData(data);
        if (data) {
          dataStore.set(userId, data);
        }
        foundCount++;
      }

      results.push({
        userId,
        found: !!data,
        data: data || null
      });
    }

    res.json({
      success: true,
      summary: { total: userIds.length, found: foundCount, notFound: userIds.length - foundCount },
      results
    });

  } catch (error) {
    console.error('Batch Load Error:', error);
    res.status(500).json({ error: '批量加载失败' });
  }
});

/**
 * POST /api/data/batch/delete
 * 批量删除用户数据
 */
router.post('/batch/delete', (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds 必须是数组' });
    }

    const results = [];
    let deletedCount = 0;

    for (const userId of userIds) {
      const deleted = dataStore.delete(userId);
      if (deleted) deletedCount++;
      results.push({ userId, deleted });
    }

    res.json({
      success: true,
      summary: { total: userIds.length, deleted: deletedCount, notFound: userIds.length - deletedCount },
      results
    });

  } catch (error) {
    console.error('Batch Delete Error:', error);
    res.status(500).json({ error: '批量删除失败' });
  }
});

// ==================== 数据统计接口 ====================

/**
 * GET /api/data/stats
 * 获取存储数据统计信息
 */
router.get('/stats', (req, res) => {
  try {
    let totalSize = 0;
    let oldestUpdate = null;
    let newestUpdate = null;
    const versionDistribution = {};

    for (const [userId, record] of dataStore.entries()) {
      const recordSize = JSON.stringify(record).length;
      totalSize += recordSize;

      const updatedAt = record._meta?.updatedAt
        ? new Date(record._meta.updatedAt)
        : null;

      if (updatedAt) {
        if (!oldestUpdate || updatedAt < oldestUpdate) oldestUpdate = updatedAt;
        if (!newestUpdate || updatedAt > newestUpdate) newestUpdate = updatedAt;
      }

      const version = record._meta?.version || 0;
      versionDistribution[version] = (versionDistribution[version] || 0) + 1;
    }

    const stats = {
      success: true,
      data: {
        totalRecords: dataStore.size,
        totalSizeBytes: totalSize,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        oldestUpdate: oldestUpdate?.toISOString() || null,
        newestUpdate: newestUpdate?.toISOString() || null,
        currentVersion: DATA_VERSION,
        versionDistribution,
        memoryUsage: {
          // Node.js 内存使用情况
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100,      // MB
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100, // MB
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,   // MB
          external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100    // MB
        },
        uptime: process.uptime()
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

/**
 * POST /api/data/cleanup
 * 手动触发数据清理（仅清理过期数据）
 */
router.post('/cleanup', (req, res) => {
  try {
    const now = Date.now();
    let cleanedCount = 0;
    const cleanedIds = [];

    for (const [userId, record] of dataStore.entries()) {
      const updatedAt = record._meta?.updatedAt
        ? new Date(record._meta.updatedAt).getTime()
        : 0;

      if (updatedAt && (now - updatedAt > DATA_MAX_AGE_MS)) {
        dataStore.delete(userId);
        cleanedCount++;
        cleanedIds.push(userId);
      }
    }

    res.json({
      success: true,
      cleanedCount,
      cleanedIds,
      maxAgeDays: 30,
      remainingRecords: dataStore.size
    });

  } catch (error) {
    console.error('Cleanup Error:', error);
    res.status(500).json({ error: '数据清理失败' });
  }
});

module.exports = router;
module.exports.readData = readData;
module.exports.writeData = writeData;
module.exports.readUserData = readUserData;
module.exports.deleteUserData = deleteUserData;
