/**
 * 数据持久化API
 * 支持保存和加载用户数据 - 使用本地JSON文件存储
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Vercel Serverless 环境使用 /tmp 目录
const DATA_DIR = (process.env.VERCEL || process.env.NODE_ENV === 'production')
  ? path.join('/tmp', 'lanxuan-data')
  : path.join(__dirname, '../data');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ 无法创建数据目录，数据持久化功能将降级:', e.message);
}

function getDataFilePath(userId) {
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeId}.json`);
}

function readData() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const allData = {};
  files.forEach(file => {
    try {
      const filePath = path.join(DATA_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      const userId = file.replace('.json', '');
      allData[userId] = data;
    } catch (e) {
      console.error(`读取文件失败: ${file}`, e);
    }
  });
  return allData;
}

function writeData(userId, data) {
  const filePath = getDataFilePath(userId);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error(`写入文件失败: ${filePath}`, e);
    return false;
  }
}

function readUserData(userId) {
  const filePath = getDataFilePath(userId);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  } catch (e) {
    console.error(`读取用户数据失败: ${userId}`, e);
    return null;
  }
}

function deleteUserData(userId) {
  const filePath = getDataFilePath(userId);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (e) {
    console.error(`删除用户数据失败: ${userId}`, e);
    return false;
  }
}

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

    const savedData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    const success = writeData(userId, savedData);

    if (!success) {
      return res.status(500).json({ error: '保存数据失败' });
    }

    res.json({
      success: true,
      message: '数据保存成功',
      updatedAt: savedData.updatedAt
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

    const data = readUserData(userId);

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

router.delete('/delete/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' });
    }

    const deleted = deleteUserData(userId);

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
module.exports.readData = readData;
module.exports.writeData = writeData;
module.exports.readUserData = readUserData;
module.exports.deleteUserData = deleteUserData;
