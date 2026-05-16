/**
 * 数据持久化API
 * 支持保存和加载用户数据
 */

const express = require('express');
const router = express.Router();

// 内存存储（生产环境应使用数据库）
const dataStore = new Map();

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

    // 验证数据大小（限制1MB）
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 1024 * 1024) {
      return res.status(400).json({ error: '数据大小超过限制' });
    }

    // 保存数据
    dataStore.set(userId, {
      ...data,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '数据保存成功',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Save Data Error:', error);
    res.status(500).json({ error: '保存数据失败' });
  }
});

/**
 * GET /api/data/load/:userId
 * 加载用户数据
 */
router.get('/load/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const data = dataStore.get(userId);
    
    if (!data) {
      return res.json({
        success: true,
        data: null,
        message: '未找到用户数据'
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Load Data Error:', error);
    res.status(500).json({ error: '加载数据失败' });
  }
});

/**
 * DELETE /api/data/delete/:userId
 * 删除用户数据
 */
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

module.exports = router;
