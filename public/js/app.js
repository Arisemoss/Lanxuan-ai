/**
 * 兰轩在线平台 - 主应用脚本
 * API密钥已移至后端，前端通过API端点调用
 */

// ═══ 统一状态管理 ═══
const Store = (function() {
  const state = {
    like: 59,
    trust: 50,
    mood: '正常',
    history: [],
    busy: false,
    userId: null,
    settings: {
      nickname: '你',
      theme: 'blue',
      animations: true,
      sound: true
    },
    game: {
      deck: [],
      turn: 0,
      round: 1,
      active: false,
      player: { hero: null, hp: 4, maxHp: 4, hand: [], hasDrawn: false, shaUsed: false, skillUsed: false, skillState: null, yaJiaoUsed: false, xiaoJiCount: 0, guanXingUsed: false },
      ai: { hero: null, hp: 4, maxHp: 4, hand: [], hasDrawn: false, shaUsed: false, skillUsed: false, skillState: null, yaJiaoUsed: false, xiaoJiCount: 0, guanXingUsed: false },
      stats: null
    },
    mobileTab: 'chat'
  };

  const listeners = new Map();

  function get(path) {
    if (!path) return state;
    const keys = path.split('.');
    let val = state;
    for (const k of keys) {
      if (val == null) return undefined;
      val = val[k];
    }
    return val;
  }

  function set(path, value) {
    const keys = path.split('.');
    let target = state;
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    const oldValue = target[keys[keys.length - 1]];
    target[keys[keys.length - 1]] = value;
    notify(path, value, oldValue);
  }

  function subscribe(path, cb) {
    if (!listeners.has(path)) listeners.set(path, new Set());
    listeners.get(path).add(cb);
    return () => listeners.get(path).delete(cb);
  }

  function notify(path, newValue, oldValue) {
    for (const [key, cbs] of listeners) {
      if (path === key || path.startsWith(key + '.') || key.startsWith(path + '.')) {
        cbs.forEach(cb => cb(newValue, oldValue, path));
      }
    }
  }

  return { get, set, subscribe };
})();

// 向后兼容的快捷访问器
const S = new Proxy({}, {
  get(_, k) { return Store.get(k); },
  set(_, k, v) { Store.set(k, v); return true; }
});

const G = new Proxy({}, {
  get(_, k) { return Store.get('game.' + k); },
  set(_, k, v) { Store.set('game.' + k, v); return true; }
});

// ═══ 设置状态 ═══
const SETTINGS_KEY = 'lanxuan_settings';
let settings = Store.get('settings');

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      settings = { ...settings, ...saved };
      Store.set('settings', settings);
    }
  } catch (e) {
    console.warn('设置加载失败');
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(Store.get('settings')));
}

function applySettings() {
  const s = Store.get('settings');
  // 昵称
  const nicknameInput = document.getElementById('nicknameInput');
  if (nicknameInput) nicknameInput.value = s.nickname;
  updatePlayerName();

  // 主题
  const theme = s.theme || 'blue';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
  const themeRadio = document.querySelector('input[name="theme"][value="' + theme + '"]');
  if (themeRadio) themeRadio.checked = true;
  const mobileThemeRadio = document.querySelector('input[name="mobileTheme"][value="' + theme + '"]');
  if (mobileThemeRadio) mobileThemeRadio.checked = true;

  // 动画
  const animationToggle = document.getElementById('animationToggle');
  if (animationToggle) {
    animationToggle.checked = s.animations;
    document.getElementById('animationLabel').textContent = s.animations ? '开启' : '关闭';
  }
  const mobileAnimationToggle = document.getElementById('mobileAnimationToggle');
  if (mobileAnimationToggle) {
    mobileAnimationToggle.checked = s.animations;
    const mobileAnimationLabel = document.getElementById('mobileAnimationLabel');
    if (mobileAnimationLabel) mobileAnimationLabel.textContent = s.animations ? '开启' : '关闭';
  }
  if (s.animations) {
    document.body.classList.remove('no-animations');
  } else {
    document.body.classList.add('no-animations');
  }

  // 音效
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.checked = s.sound;
    document.getElementById('soundLabel').textContent = s.sound ? '开启' : '关闭';
  }
  const mobileSoundToggle = document.getElementById('mobileSoundToggle');
  if (mobileSoundToggle) {
    mobileSoundToggle.checked = s.sound;
    const mobileSoundLabel = document.getElementById('mobileSoundLabel');
    if (mobileSoundLabel) mobileSoundLabel.textContent = s.sound ? '开启' : '关闭';
  }
}

function updatePlayerName() {
  const name = Store.get('settings.nickname') || '你';
  const playerNameText = document.getElementById('playerNameText');
  const playerAvatar = document.getElementById('playerAvatar');
  if (playerNameText) playerNameText.textContent = name;
  if (playerAvatar) playerAvatar.textContent = name;
}

// ═══ 设置面板 ═══
function openSettings() {
  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('settingsBackdrop').classList.add('show');
  applySettings();
}

function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('settingsBackdrop').classList.remove('show');
}

function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lanxuan_theme', theme);
  updateThemeIcon(theme);
  Store.set('settings.theme', theme);
  saveSettings();
}

function toggleAnimation() {
  const enabled = document.getElementById('animationToggle')?.checked ?? document.getElementById('mobileAnimationToggle')?.checked ?? Store.get('settings.animations');
  Store.set('settings.animations', enabled);
  const desktopLabel = document.getElementById('animationLabel');
  if (desktopLabel) desktopLabel.textContent = enabled ? '开启' : '关闭';
  const mobileLabel = document.getElementById('mobileAnimationLabel');
  if (mobileLabel) mobileLabel.textContent = enabled ? '开启' : '关闭';
  const desktopToggle = document.getElementById('animationToggle');
  if (desktopToggle) desktopToggle.checked = enabled;
  const mobileToggle = document.getElementById('mobileAnimationToggle');
  if (mobileToggle) mobileToggle.checked = enabled;
  if (enabled) {
    document.body.classList.remove('no-animations');
  } else {
    document.body.classList.add('no-animations');
  }
  saveSettings();
}

function toggleSound() {
  const enabled = document.getElementById('soundToggle')?.checked ?? document.getElementById('mobileSoundToggle')?.checked ?? Store.get('settings.sound');
  Store.set('settings.sound', enabled);
  const desktopLabel = document.getElementById('soundLabel');
  if (desktopLabel) desktopLabel.textContent = enabled ? '开启' : '关闭';
  const mobileLabel = document.getElementById('mobileSoundLabel');
  if (mobileLabel) mobileLabel.textContent = enabled ? '开启' : '关闭';
  const desktopToggle = document.getElementById('soundToggle');
  if (desktopToggle) desktopToggle.checked = enabled;
  const mobileToggle = document.getElementById('mobileSoundToggle');
  if (mobileToggle) mobileToggle.checked = enabled;
  saveSettings();
}

// ═══ 昵称设置 ═══
document.getElementById('nicknameInput')?.addEventListener('input', (e) => {
  const val = e.target.value.trim();
  Store.set('settings.nickname', val || '你');
  updatePlayerName();
  const mobileNicknameInput = document.getElementById('mobileNicknameInput');
  if (mobileNicknameInput) mobileNicknameInput.value = Store.get('settings.nickname');
  saveSettings();
});

// ═══ 数据导出/导入 ═══
function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lanxuan_')) {
      data[key] = localStorage.getItem(key);
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lanxuan_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  document.getElementById('importFile').click();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object' || data === null) {
        alert('导入失败：文件格式不正确');
        return;
      }
      let imported = 0;
      for (const key in data) {
        if (key.startsWith('lanxuan_')) {
          localStorage.setItem(key, data[key]);
          imported++;
        }
      }
      if (imported > 0) {
        alert('导入成功！共恢复 ' + imported + ' 项数据，页面将刷新。');
        location.reload();
      } else {
        alert('未找到有效的兰轩数据');
      }
    } catch (err) {
      alert('导入失败：' + err.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm('确定要清空所有本地数据吗？此操作不可恢复！')) return;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lanxuan_')) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
  alert('数据已重置，页面将刷新。');
  location.reload();
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.setTheme = setTheme;
window.toggleAnimation = toggleAnimation;
window.toggleSound = toggleSound;
window.exportData = exportData;
window.importData = importData;
window.handleImportFile = handleImportFile;
window.resetData = resetData;

// ═══ 主题系统 ═══
const THEMES = ['light', 'dark', 'blue'];
const THEME_ICONS = { light: '☀️', dark: '🌙', blue: '🔷' };

function initTheme() {
  const saved = localStorage.getItem('lanxuan_theme');
  const theme = saved && THEMES.includes(saved) ? saved : (Store.get('settings.theme') || 'blue');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
  Store.set('settings.theme', theme);
  saveSettings();
}

function cycleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'blue';
  const idx = THEMES.indexOf(current);
  const next = THEMES[(idx + 1) % THEMES.length];
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('lanxuan_theme', next);
  updateThemeIcon(next);
  Store.set('settings.theme', next);
  saveSettings();
  const themeRadio = document.querySelector('input[name="theme"][value="' + next + '"]');
  if (themeRadio) themeRadio.checked = true;
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = THEME_ICONS[theme] || '🌙';
}

window.cycleTheme = cycleTheme;

// ═══ 懒加载数据模块 ═══
let CARDS = null;
let HEROES = null;

async function loadCards() {
  if (CARDS) return CARDS;
  CARDS = [
    { id: 'sha', name: '杀', type: 'sha', tip: '对目标造成1点伤害', count: 30 },
    { id: 'shan', name: '闪', type: 'shan', tip: '抵消【杀】的效果', count: 15 },
    { id: 'tao', name: '桃', type: 'tao', tip: '恢复1点体力', count: 8 },
    { id: 'wzsy', name: '无中生有', type: 'wzsy', tip: '摸两张牌', count: 4 },
    { id: 'ghcq', name: '过河拆桥', type: 'ghcq', tip: '弃置目标一张手牌', count: 3 },
    { id: 'nmrr', name: '南蛮入侵', type: 'nmrr', tip: '需出【杀】抵挡，否则受1点伤害', count: 3 },
    { id: 'wjqf', name: '万箭齐发', type: 'wjqf', tip: '需出【闪】抵挡，否则受1点伤害', count: 3 }
  ];
  return CARDS;
}

async function loadHeroes() {
  if (HEROES) return HEROES;
  HEROES = [
    {
      id: 'guanyu', name: '关羽', title: '武圣',
      color: '#ef4444', char: '羽', hp: 4,
      skills: [
        { name: '武圣', desc: '你的红色【闪】可当作【杀】使用', type: 'passive' },
        { name: '义绝', desc: '出牌阶段，可弃一张红色牌令对方本回合无法使用【闪】', type: 'active', cost: 'red' }
      ],
      aiQuote: '某在此，谁敢一战！'
    },
    {
      id: 'zhaoyun', name: '赵云', title: '龙胆',
      color: '#3b82f6', char: '云', hp: 4,
      skills: [
        { name: '龙胆', desc: '你可以将【杀】当【闪】、【闪】当【杀】使用或打出', type: 'passive' },
        { name: '涯角', desc: '每当你使用或打出【杀】/【闪】时，可摸一张牌（每回合限一次）', type: 'trigger' }
      ],
      aiQuote: '子龙在此，何惧之有！'
    },
    {
      id: 'zhangfei', name: '张飞', title: '咆哮',
      color: '#f97316', char: '飞', hp: 4,
      skills: [
        { name: '咆哮', desc: '你出【杀】无次数限制', type: 'passive' },
        { name: '怒吼', desc: '当你手牌为0时，可对对方造成1点伤害（每局限一次）', type: 'active', cost: 'empty_hand' }
      ],
      aiQuote: '俺张飞来也！谁敢接招！'
    },
    {
      id: 'huangyueying', name: '黄月英', title: '集智',
      color: '#a855f7', char: '英', hp: 3,
      skills: [
        { name: '集智', desc: '每当你使用一张锦囊牌时，额外摸一张牌', type: 'trigger' },
        { name: '奇才', desc: '你可以将任意锦囊牌当作【无中生有】使用', type: 'active', cost: 'wzsy' }
      ],
      aiQuote: '哼，这点小计谋...'
    },
    {
      id: 'lvbu', name: '吕布', title: '无双',
      color: '#dc2626', char: '布', hp: 4,
      skills: [
        { name: '无双', desc: '你的【杀】需要两张【闪】才能抵消', type: 'passive' },
        { name: '利驭', desc: '出牌阶段，可弃一张牌视为使用一张【杀】', type: 'active', cost: 'any' }
      ],
      aiQuote: '人中吕布，马中赤兔！'
    },
    {
      id: 'zhugeliang', name: '诸葛亮', title: '卧龙',
      color: '#0d9488', char: '亮', hp: 3,
      skills: [
        { name: '观星', desc: '摸牌阶段，你可观看牌堆顶3张牌并调整顺序', type: 'active', cost: 'none' },
        { name: '空城', desc: '当你没有手牌时，不能成为【杀】的目标', type: 'passive' }
      ],
      aiQuote: '鞠躬尽瘁，死而后已。'
    },
    {
      id: 'simayi', name: '司马懿', title: '狼顾',
      color: '#4b5563', char: '懿', hp: 3,
      skills: [
        { name: '反馈', desc: '每当你受到1点伤害后，可获得对方一张手牌', type: 'trigger' },
        { name: '鬼才', desc: '出牌阶段，可弃置一张手牌并摸一张牌（每回合限一次）', type: 'active', cost: 'any' }
      ],
      aiQuote: '天命？哈哈哈哈...'
    },
    {
      id: 'sunshangxiang', name: '孙尚香', title: '枭姬',
      color: '#ec4899', char: '香', hp: 3,
      skills: [
        { name: '枭姬', desc: '每当你失去一张手牌时，可摸一张牌（每回合限两次）', type: 'trigger' },
        { name: '结姻', desc: '出牌阶段，可弃一张牌令双方各回复1点体力（每局限一次）', type: 'active', cost: 'any' }
      ],
      aiQuote: '本小姐可不是好惹的！'
    }
  ];
  return HEROES;
}

// ═══ 游戏状态（通过 Store 管理） ═══
// G 已在上方通过 Proxy 定义

// ═══ 移动端状态 ═══
let currentMobileTab = 'chat';

function initMobile() {
  const mobileNav = document.getElementById('mobileNav');
  if (!mobileNav) return;

  switchMobileTab('chat');
  syncMobileSettings();

  const mobileNicknameInput = document.getElementById('mobileNicknameInput');
  if (mobileNicknameInput) {
    mobileNicknameInput.value = Store.get('settings.nickname') || '你';
    mobileNicknameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      Store.set('settings.nickname', val || '你');
      updatePlayerName();
      const desktopInput = document.getElementById('nicknameInput');
      if (desktopInput) desktopInput.value = Store.get('settings.nickname');
      saveSettings();
    });
  }

  initTouchGestures();
}

function switchMobileTab(tab) {
  currentMobileTab = tab;
  Store.set('mobileTab', tab);

  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });

  document.querySelectorAll('.mobile-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.panel === tab);
  });

  if (tab === 'record') {
    renderMobileRecords();
  }
}

window.switchMobileTab = switchMobileTab;

function renderMobileRecords() {
  const container = document.getElementById('mobileRecordList');
  const summary = document.getElementById('mobileRecordSummary');
  if (!container) return;
  const records = getRecords();
  if (records.length === 0) {
    container.innerHTML = '<div class="record-empty">暂无战绩</div>';
    if (summary) summary.innerHTML = '';
    return;
  }
  const total = records.length;
  const wins = records.filter(r => r.result === 'win').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  if (summary) {
    summary.innerHTML =
      '<div class="record-stat">总场次：<b>' + total + '</b></div>' +
      '<div class="record-stat">胜率：<b style="color:var(--green)">' + winRate + '%</b></div>';
  }

  const frag = document.createDocumentFragment();
  records.forEach((r, i) => {
    const color = r.result === 'win' ? 'var(--green)' : (r.result === 'lose' ? 'var(--red)' : 'var(--text-3)');
    const label = r.result === 'win' ? '胜' : (r.result === 'lose' ? '负' : '平');
    const div = document.createElement('div');
    div.className = 'record-item';
    div.innerHTML = '<div class="record-top"><span class="record-result" style="color:' + color + '">' + label + '</span><span class="record-date">' + r.date + '</span><button class="record-share-btn" onclick="shareBattleIdx(' + i + ')" title="分享战绩">📤</button></div>' +
      '<div class="record-detail">' + r.hero + ' vs ' + r.aiHero + ' · ' + r.rounds + '回合 · 造成' + r.playerDmg + '伤 · 治疗' + r.playerHeal + '</div>';
    frag.appendChild(div);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

function syncMobileSettings() {
  const s = Store.get('settings');
  const mobileNicknameInput = document.getElementById('mobileNicknameInput');
  if (mobileNicknameInput) mobileNicknameInput.value = s.nickname || '你';

  const mobileThemeRadio = document.querySelector('input[name="mobileTheme"][value="' + (s.theme || 'blue') + '"]');
  if (mobileThemeRadio) mobileThemeRadio.checked = true;

  const mobileAnimationToggle = document.getElementById('mobileAnimationToggle');
  if (mobileAnimationToggle) mobileAnimationToggle.checked = s.animations;
  const mobileAnimationLabel = document.getElementById('mobileAnimationLabel');
  if (mobileAnimationLabel) mobileAnimationLabel.textContent = s.animations ? '开启' : '关闭';

  const mobileSoundToggle = document.getElementById('mobileSoundToggle');
  if (mobileSoundToggle) mobileSoundToggle.checked = s.sound;
  const mobileSoundLabel = document.getElementById('mobileSoundLabel');
  if (mobileSoundLabel) mobileSoundLabel.textContent = s.sound ? '开启' : '关闭';
}

// ═══ 触摸手势 ═══
function initTouchGestures() {
  const panels = document.getElementById('mobilePanels');
  if (!panels) return;

  const tabs = ['chat', 'battle', 'record', 'settings'];
  let startX = 0;
  let startY = 0;
  let isHorizontalSwipe = false;
  let isPulling = false;

  panels.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isHorizontalSwipe = false;
    isPulling = false;
  }, { passive: true });

  panels.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!isHorizontalSwipe && !isPulling) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        isHorizontalSwipe = true;
      } else if (dy > 10 && Math.abs(dy) > Math.abs(dx)) {
        if (currentMobileTab === 'chat') {
          const chatScroll = document.getElementById('chatScroll');
          if (chatScroll && chatScroll.scrollTop <= 0) {
            isPulling = true;
          }
        }
      }
    }

    if (isPulling) {
      const pullHint = document.getElementById('pullHint');
      if (pullHint) {
        const pullDistance = Math.min(dy, 60);
        if (pullDistance > 40) {
          pullHint.textContent = '松开刷新';
        } else {
          pullHint.textContent = '下拉搜索';
        }
        pullHint.classList.add('show');
      }
    }
  }, { passive: true });

  panels.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    if (isHorizontalSwipe && Math.abs(dx) > 60) {
      const currentIndex = tabs.indexOf(currentMobileTab);
      if (dx < 0 && currentIndex < tabs.length - 1) {
        switchMobileTab(tabs[currentIndex + 1]);
      } else if (dx > 0 && currentIndex > 0) {
        switchMobileTab(tabs[currentIndex - 1]);
      }
    }

    if (isPulling && dy > 50 && currentMobileTab === 'chat') {
      toggleSearch();
    }

    const pullHint = document.getElementById('pullHint');
    if (pullHint) pullHint.classList.remove('show');

    isHorizontalSwipe = false;
    isPulling = false;
  }, { passive: true });
}

// ═══ 初始化 ═══
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initTheme();
  initUserId();
  loadUserData();
  initClock();
  renderProfile();
  renderHeroCards();
  renderRecords();
  initPageLoadAnimation();
  applySettings();
  initMobile();
});

// ═══ 页面加载动画 ═══
function initPageLoadAnimation() {
  const overlay = document.getElementById('pageLoadOverlay');
  if (!overlay) return;
  setTimeout(() => {
    overlay.classList.add('done');
    requestAnimationFrame(() => {
      document.querySelectorAll('header, .sidebar-left, .sidebar-right, .center-col').forEach((el, i) => {
        el.style.opacity = '0';
        el.style.animation = `slideInUp .5s ease ${i * 0.08}s forwards`;
      });
    });
  }, 900);
}

// ═══ 用户ID与数据持久化 ═══
function initUserId() {
  let userId = localStorage.getItem('lanxuan_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('lanxuan_user_id', userId);
  }
  Store.set('userId', userId);
}

async function saveUserData() {
  const data = {
    like: Store.get('like'),
    trust: Store.get('trust'),
    mood: Store.get('mood'),
    history: Store.get('history').slice(-50)
  };

  localStorage.setItem('lanxuan_data', JSON.stringify(data));

  try {
    await fetch('/api/data/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: Store.get('userId'), data })
    });
  } catch (e) {
    console.warn('后端存储失败，已使用本地存储');
  }
}

async function loadUserData() {
  const localData = localStorage.getItem('lanxuan_data');
  if (localData) {
    try {
      const data = JSON.parse(localData);
      Store.set('like', data.like || 59);
      Store.set('trust', data.trust || 50);
      Store.set('mood', data.mood || '正常');
      Store.set('history', data.history || []);
      renderProfile();
    } catch (e) {
      console.warn('本地数据解析失败');
    }
  }

  try {
    const res = await fetch(`/api/data/load/${Store.get('userId')}`);
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        Store.set('like', result.data.like || Store.get('like'));
        Store.set('trust', result.data.trust || Store.get('trust'));
        Store.set('mood', result.data.mood || Store.get('mood'));
        Store.set('history', result.data.history || Store.get('history'));
        renderProfile();
      }
    }
  } catch (e) {
    // 后端不可用
  }
}

// ═══ 时钟 ═══
function initClock() {
  const updateClock = () => {
    const now = new Date();
    document.getElementById('clock').textContent =
      now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// ═══ 个人资料渲染 ═══
function renderProfile() {
  const like = Store.get('like');
  const trust = Store.get('trust');
  const mood = Store.get('mood');

  document.getElementById('likeNum').textContent = like;
  const likeBar = document.getElementById('likeBar');
  likeBar.style.width = like + '%';

  if (like >= 80) likeBar.style.background = 'var(--green)';
  else if (like >= 60) likeBar.style.background = 'var(--accent)';
  else likeBar.style.background = 'var(--text-3)';

  const trustNum = document.getElementById('trustNum');
  if (trustNum) trustNum.textContent = trust;
  const trustBar = document.getElementById('trustBar');
  if (trustBar) {
    trustBar.style.width = trust + '%';
    if (trust >= 80) trustBar.style.background = 'var(--cyan)';
    else if (trust >= 60) trustBar.style.background = 'var(--accent)';
    else trustBar.style.background = 'var(--text-3)';
  }

  const tier = getTier(like);
  document.getElementById('tierName').textContent = tier.name;
  document.getElementById('tierBadge').textContent = tier.name;

  const moodDot = document.getElementById('moodDot');
  const moodText = document.getElementById('moodText');
  moodText.textContent = mood;
  moodDot.className = 'mood-dot';
  if (['不爽', '困倦'].includes(mood)) moodDot.classList.add('negative');
  else if (mood === '正常') moodDot.classList.add('neutral');
}

function getTier(like) {
  if (like >= 90) return { name: '死基友', color: '#22c55e' };
  if (like >= 80) return { name: '铁哥们', color: '#22c55e' };
  if (like >= 70) return { name: '挚友', color: '#f59e0b' };
  if (like >= 60) return { name: '好朋友', color: '#f59e0b' };
  return { name: '普通舍友', color: '#71717a' };
}

// ═══ 消息处理 ═══
const EMOJIS = ['😊','😂','🤔','❤️','👍','😭','😡','🎉','👋','🙏','🔥','✨','💤','🍀','🌙','⭐','🤝','💪','🥳','😅','😎','🤗','😴','🤯'];
const QUICK_REPLIES = ['你好','来一局三国杀','晚安','谢谢','哈哈','在干嘛','吃饭了吗','加油'];

function formatTime(date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function addMsg(type, text) {
  const scroll = document.getElementById('chatScroll');
  const div = document.createElement('div');
  div.className = 'msg ' + type;

  const content = document.createElement('div');
  content.className = 'msg-content';
  content.textContent = text;
  div.appendChild(content);

  const time = document.createElement('div');
  time.className = 'msg-time';
  const now = new Date();
  time.innerHTML = '<span>' + formatTime(now) + '</span>' + (type === 'u' ? '<span class="msg-read">✓</span>' : '');
  div.appendChild(time);

  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showMsgContextMenu(e, text, div);
  });

  let longPressTimer;
  div.addEventListener('touchstart', () => {
    longPressTimer = setTimeout(() => {
      copyMsgText(text);
    }, 600);
  }, { passive: true });
  div.addEventListener('touchend', () => clearTimeout(longPressTimer), { passive: true });
  div.addEventListener('touchmove', () => clearTimeout(longPressTimer), { passive: true });

  scroll.appendChild(div);
  scroll.scrollTop = scroll.scrollHeight;
}

function showMsgContextMenu(e, text, msgEl) {
  document.querySelectorAll('.msg-context-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'msg-context-menu';
  menu.innerHTML = '<button>复制</button>';
  const btn = menu.querySelector('button');
  btn.onclick = () => {
    copyMsgText(text);
    menu.remove();
  };

  const rect = msgEl.getBoundingClientRect();
  const scrollRect = document.getElementById('chatScroll').getBoundingClientRect();
  const chatScroll = document.getElementById('chatScroll');
  menu.style.left = (rect.left - scrollRect.left + chatScroll.scrollLeft) + 'px';
  menu.style.top = (rect.bottom - scrollRect.top + chatScroll.scrollTop + 4) + 'px';

  chatScroll.appendChild(menu);

  const closeMenu = (ev) => {
    if (!menu.contains(ev.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

async function copyMsgText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// ═══ 搜索功能 ═══
function toggleSearch() {
  const area = document.getElementById('chatSearchArea');
  const input = document.getElementById('chatSearchInput');
  if (area.style.display === 'none') {
    area.style.display = 'block';
    input.focus();
  } else {
    area.style.display = 'none';
    input.value = '';
    document.getElementById('chatSearchResults').innerHTML = '';
  }
}

document.getElementById('chatSearchInput')?.addEventListener('input', (e) => {
  const query = e.target.value.trim().toLowerCase();
  const results = document.getElementById('chatSearchResults');
  if (!query) {
    results.innerHTML = '';
    return;
  }
  const msgs = Array.from(document.querySelectorAll('.msg .msg-content'));
  const matched = msgs.filter(el => el.textContent.toLowerCase().includes(query));
  results.innerHTML = matched.slice(0, 8).map(el => {
    const text = el.textContent;
    const idx = text.toLowerCase().indexOf(query);
    const highlighted = text.slice(0, idx) + '<span class="search-highlight">' + text.slice(idx, idx + query.length) + '</span>' + text.slice(idx + query.length);
    return '<div class="chat-search-result-item" onclick="scrollToMsg(this)" data-text="' + encodeURIComponent(text) + '">' + highlighted + '</div>';
  }).join('') || '<div class="chat-search-result-item">无匹配结果</div>';
});

function scrollToMsg(el) {
  const text = decodeURIComponent(el.dataset.text);
  const msgs = Array.from(document.querySelectorAll('.msg .msg-content'));
  const target = msgs.find(m => m.textContent === text);
  if (target) {
    target.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.parentElement.style.animation = 'none';
    target.parentElement.offsetHeight;
    target.parentElement.style.animation = 'msgIn .4s ease';
  }
}

// ═══ 表情面板 ═══
function toggleEmojiPanel() {
  const panel = document.getElementById('emojiPanel');
  const quickPanel = document.getElementById('quickReplyPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    quickPanel.style.display = 'none';
    renderEmojis();
  } else {
    panel.style.display = 'none';
  }
}

function renderEmojis() {
  const grid = document.getElementById('emojiGrid');
  if (grid.children.length) return;
  const frag = document.createDocumentFragment();
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('div');
    btn.className = 'emoji-item';
    btn.textContent = emoji;
    btn.onclick = () => {
      const input = document.getElementById('chatInput');
      input.value += emoji;
      input.focus();
    };
    frag.appendChild(btn);
  });
  grid.appendChild(frag);
}

// ═══ 快捷回复 ═══
function toggleQuickReply() {
  const panel = document.getElementById('quickReplyPanel');
  const emojiPanel = document.getElementById('emojiPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    emojiPanel.style.display = 'none';
    renderQuickReplies();
  } else {
    panel.style.display = 'none';
  }
}

function renderQuickReplies() {
  const list = document.getElementById('quickReplyList');
  if (list.children.length) return;
  const frag = document.createDocumentFragment();
  QUICK_REPLIES.forEach(text => {
    const btn = document.createElement('button');
    btn.className = 'quick-reply-item';
    btn.textContent = text;
    btn.onclick = () => {
      const input = document.getElementById('chatInput');
      input.value = text;
      input.focus();
      document.getElementById('quickReplyPanel').style.display = 'none';
    };
    frag.appendChild(btn);
  });
  list.appendChild(frag);
}

function showTyping() {
  const scroll = document.getElementById('chatScroll');
  const div = document.createElement('div');
  div.className = 'typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  scroll.appendChild(div);
  scroll.scrollTop = scroll.scrollHeight;
  return div;
}

function updateMood(text) {
  const lower = text.toLowerCase();
  if (lower.includes('睡觉') || lower.includes('困') || lower.includes('晚安') || lower.includes('累')) {
    Store.set('mood', '困倦');
  } else if (lower.includes('三国杀') || lower.includes('游戏') || lower.includes('玩') || lower.includes('来一局')) {
    Store.set('mood', '兴奋');
  } else if (lower.includes('烦') || lower.includes('讨厌') || lower.includes('滚') || lower.includes('去死') || lower.includes('白痴')) {
    Store.set('mood', '不爽');
  } else if (lower.includes('开心') || lower.includes('哈哈') || lower.includes('笑') || lower.includes('棒') || lower.includes('厉害')) {
    Store.set('mood', '开心');
  } else {
    Store.set('mood', '正常');
  }
}

// ═══ API调用 ═══
async function callAI(userText) {
  const gameState = {
    like: Store.get('like'),
    trust: Store.get('trust'),
    mood: Store.get('mood'),
    inGame: Store.get('game.active'),
    playerHero: Store.get('game.player.hero')?.name,
    aiHero: Store.get('game.ai.hero')?.name,
    round: Store.get('game.round')
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: Store.get('history'),
        gameState
      })
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    return data.reply || generateLocalReply();

  } catch (error) {
    console.warn('Chat API不可用，使用本地回复:', error);
    return generateLocalReply();
  }
}

// 本地智能回复生成器
function generateLocalReply() {
  const history = Store.get('history');
  const lastMsg = history.length > 0 ? history[history.length - 1].content.toLowerCase() : '';

  const smartReplies = [
    { patterns: ['你好', '早', '晚', '嗨', '哈喽', '早上好', '晚上好'], replies: [
      '嗯，你来了啊。今天过得怎么样？',
      '哦，是你啊。找我有什么事吗？',
      '行啊，你终于来找我聊天了。说吧，想聊什么？'
    ]},
    { patterns: ['三国杀', '杀', '游戏', '玩', '来一局', '对战'], replies: [
      '来啊，谁怕谁！这次我肯定不会放水的。选个武将赶紧开始吧！',
      '行，那就来一局！我最近练了新武将，正好试试手。你想玩什么武将？',
      '又来？这次可别再像上次那样磨蹭了。赶紧选武将开始！'
    ]},
    { patterns: ['睡', '困', '累', '休息', '晚安'], replies: [
      '（打哈欠）确实有点困了。今天上课都没什么精神，早点休息也好。你也早点睡吧。',
      '别吵我，让我睡会儿。昨晚睡得太晚了，现在困死了。有什么事明天再说吧。',
      '嗯...困死了。今天就聊到这儿吧，明天再继续。晚安。'
    ]},
    { patterns: ['厉害', '棒', '强', '牛', '好', '优秀', '厉害啊'], replies: [
      '切，也就那样吧。我本来就挺厉害的，你才发现吗？',
      '哦？你眼光不错嘛。不过别夸得太夸张，我会不好意思的。',
      '行吧，勉强接受你的夸奖。不过别以为这样我就会让着你。'
    ]},
    { patterns: ['?', '？', '什么', '怎么', '为什么', '吗', '是吗'], replies: [
      '你觉得呢？这个问题你应该有自己的想法吧。说说看？',
      '嗯...让我想想。这个问题还挺有意思的，让我好好考虑一下。',
      '这个嘛，不好说。每个人都有不同的看法，你觉得呢？'
    ]},
    { patterns: ['吃', '饭', '饿', '饿了', '吃饭'], replies: [
      '行，去吃吧。正好我也有点饿了，你想吃什么？',
      '哦，这么快就饿了？那赶紧去吃吧，别饿着了。',
      '吃什么？是去食堂还是外面吃？我听说学校附近新开了一家店。'
    ]},
    { patterns: ['没事吧', '还好吗', '怎么了', '没事', '你还好'], replies: [
      '啊？我没事啊，你怎么突然这么问？是不是发生什么事了？',
      '我挺好的，谢谢你关心。你呢，最近怎么样？',
      '没什么大事，就是有点累。放心吧，我睡一觉就好了。'
    ]},
    { patterns: ['再见', '拜拜', '走了', '下次'], replies: [
      '行，再见。下次再来找我玩啊，随时欢迎。',
      '拜拜。路上小心点，下次见！',
      '嗯，下次见。别忘了我们下次的三国杀对局！'
    ]}
  ];

  for (const item of smartReplies) {
    for (const pattern of item.patterns) {
      if (lastMsg.includes(pattern)) {
        return item.replies[Math.floor(Math.random() * item.replies.length)] + getStatusTag();
      }
    }
  }

  const defaultReplies = [
    '哦↗，你说这个啊。我觉得还挺有意思的，继续说说？',
    '嗯...让我想想。这个话题还挺深奥的，你是怎么想的？',
    '行吧，既然你这么说。那我们就继续聊这个话题？',
    '切，就这？我还以为是什么大事呢。不过既然你说了，那就聊聊吧。',
    '你说啥？我没太听清，能再说一遍吗？',
    '别吵，困了。今天就到这里吧，明天再聊。',
    '那又怎样？这种事情我见多了，没什么好大惊小怪的。',
    '随便你吧，你想怎么样就怎么样。我无所谓。',
    '哦，这样啊。原来是这么回事，我明白了。',
    '行，知道了。我记住了，还有什么事吗？'
  ];

  return defaultReplies[Math.floor(Math.random() * defaultReplies.length)] + getStatusTag();
}

function getStatusTag() {
  const moods = ['正常', '开心', '兴奋', '不屑', '困倦', '疑惑'];
  const mood = moods[Math.floor(Math.random() * moods.length)];
  const likeChange = Math.floor(Math.random() * 3) - 1;
  const trustChange = Math.floor(Math.random() * 3) - 1;

  return `<情绪(${mood})><好感变化:${likeChange >= 0 ? '+' : ''}${likeChange}><信任变化:${trustChange >= 0 ? '+' : ''}${trustChange}>`;
}

function generateFallbackReply() {
  const fallbacks = [
    '哦↗<情绪(正常)><好感变化:0><信任变化:0>',
    '嗯...<情绪(正常)><好感变化:0><信任变化:0>',
    '行吧<情绪(正常)><好感变化:0><信任变化:0>',
    '切<情绪(不屑)><好感变化:-1><信任变化:0>',
    '你说啥？<情绪(疑惑)><好感变化:0><信任变化:0>',
    '别吵，困了。<情绪(困倦)><好感变化:-1><信任变化:0>',
    '就这？<情绪(不屑)><好感变化:0><信任变化:0>',
    '（打哈欠）<情绪(困倦)><好感变化:0><信任变化:0>',
    '那又怎样？<情绪(不屑)><好感变化:0><信任变化:0>',
    '随便你。<情绪(正常)><好感变化:0><信任变化:0>',
    '哦，这样啊。<情绪(正常)><好感变化:0><信任变化:0>',
    '行，知道了。<情绪(正常)><好感变化:+1><信任变化:0>'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ═══ 发送消息 ═══
async function sendMsg() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || Store.get('busy')) return;

  input.value = '';
  Store.set('busy', true);

  addMsg('u', text);
  updateMood(text);
  Store.set('history', [...Store.get('history'), { role: 'user', content: text }]);

  const typingEl = showTyping();
  const reply = await callAI(text);
  if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);

  let cleanReply = reply;

  const moodMatch = reply.match(/<情绪\(([^)]+)\)>/);
  let newMood = Store.get('mood');
  if (moodMatch) {
    newMood = moodMatch[1];
    cleanReply = cleanReply.replace(moodMatch[0], '').trim();
  }

  const likeMatch = cleanReply.match(/<好感变化:([+-]?\d+)>/);
  if (likeMatch) {
    const likeChange = parseInt(likeMatch[1]);
    Store.set('like', Math.max(0, Math.min(100, Store.get('like') + likeChange)));
    cleanReply = cleanReply.replace(likeMatch[0], '').trim();
  }

  const trustMatch = cleanReply.match(/<信任变化:([+-]?\d+)>/);
  if (trustMatch) {
    const trustChange = parseInt(trustMatch[1]);
    Store.set('trust', Math.max(0, Math.min(100, Store.get('trust') + trustChange)));
    cleanReply = cleanReply.replace(trustMatch[0], '').trim();
  }

  if (moodMatch) {
    Store.set('mood', newMood);
  }

  addMsg('a', cleanReply);
  Store.set('history', [...Store.get('history'), { role: 'assistant', content: cleanReply }]);
  renderProfile();
  Store.set('busy', false);

  saveUserData();
}

// 回车发送
document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMsg();
});

// 初始消息
addMsg('a', '（深夜，宿舍里响起震耳欲聋的鼾声，你忍无可忍摇醒他）');
addMsg('a', '兰轩迷迷糊糊地坐起来，双眼迷离，有气无力地盯着你：');
addMsg('a', '（声音微弱但依旧嘴硬）"我还没有睡。我怎么打的呼？"');

// ═══ 武将选择界面 ═══
function showHeroSelect() {
  if (Store.get('busy')) return;
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('heroSelectScreen').classList.add('active');
}

async function renderHeroCards() {
  const container = document.getElementById('hsCards');
  if (!container) return;
  container.innerHTML = '';

  const heroes = await loadHeroes();
  const frag = document.createDocumentFragment();
  heroes.forEach(h => {
    const card = document.createElement('div');
    card.className = 'hero-card';
    card.innerHTML = `
      <div class="hero-avatar" style="background:linear-gradient(135deg,${h.color}22,${h.color}08);color:${h.color};border-color:${h.color}33">${h.char}</div>
      <div class="hero-card-name">${h.name}</div>
      <div class="hero-card-title">${h.title}</div>
      <div class="hero-card-skills">
        ${h.skills.map(s => `<div class="hero-skill"><span class="hero-skill-name">${s.name}</span> <span class="hero-skill-desc">${s.desc}</span></div>`).join('')}
      </div>`;
    card.onclick = () => selectHero(h.id);
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

async function selectHero(heroId) {
  const heroes = await loadHeroes();
  const hero = heroes.find(h => h.id === heroId);
  Store.set('game.player.hero', hero);

  const aiPool = heroes.filter(h => h.id !== heroId);
  Store.set('game.ai.hero', aiPool[Math.floor(Math.random() * aiPool.length)]);

  document.getElementById('heroSelectScreen').classList.remove('active');
  document.getElementById('gameBoard').classList.add('active');

  document.getElementById('playerAvatar').textContent = hero.char;
  document.getElementById('playerAvatar').style.color = hero.color;
  document.getElementById('playerHeroTag').textContent = hero.name;
  const playerNameText = document.getElementById('playerNameText');
  if (playerNameText) playerNameText.textContent = Store.get('settings.nickname') || '你';

  document.getElementById('aiAvatar').textContent = Store.get('game.ai.hero').char;
  document.getElementById('aiAvatar').style.color = Store.get('game.ai.hero').color;
  document.getElementById('aiHeroTag').textContent = Store.get('game.ai.hero').name;
  document.getElementById('aiNameText').textContent = '兰轩（' + Store.get('game.ai.hero').name + '）';

  initGame();
}

// ═══ 游戏逻辑 ═══
async function buildDeck() {
  const cards = await loadCards();
  const deck = [];
  cards.forEach(t => {
    for (let i = 0; i < t.count; i++) {
      deck.push({ ...t });
    }
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

async function drawFromDeck(n) {
  const result = [];
  for (let i = 0; i < n; i++) {
    if (!Store.get('game.deck').length) {
      const newDeck = await buildDeck();
      Store.set('game.deck', newDeck);
    }
    result.push(Store.get('game.deck').pop());
  }
  return result;
}

function assignColor(card) {
  if (!card.color) {
    const r = Math.random();
    if (card.type === 'sha') card.color = r < 0.5 ? 'red' : 'black';
    else if (card.type === 'shan') card.color = r < 0.8 ? 'red' : 'black';
    else if (card.type === 'tao') card.color = 'red';
    else card.color = r < 0.5 ? 'red' : 'black';
  }
  return card;
}

async function initGame() {
  const deck = await buildDeck();
  Store.set('game.deck', deck);
  Store.set('game.turn', 0);
  Store.set('game.round', 1);

  const playerHero = Store.get('game.player.hero');
  const aiHero = Store.get('game.ai.hero');

  Store.set('game.player', {
    ...Store.get('game.player'),
    hp: playerHero.hp,
    maxHp: playerHero.hp,
    hand: (await drawFromDeck(4)).map(assignColor),
    hasDrawn: false,
    shaUsed: false,
    skillUsed: false,
    skillState: null,
    yaJiaoUsed: false,
    xiaoJiCount: 0,
    guanXingUsed: false
  });

  Store.set('game.ai', {
    ...Store.get('game.ai'),
    hp: aiHero.hp,
    maxHp: aiHero.hp,
    hand: (await drawFromDeck(4)).map(assignColor),
    hasDrawn: false,
    shaUsed: false,
    skillUsed: false,
    skillState: null,
    yaJiaoUsed: false,
    xiaoJiCount: 0,
    guanXingUsed: false
  });

  Store.set('game.active', true);
  Store.set('game.stats', {
    playerHero: playerHero.name,
    aiHero: aiHero.name,
    rounds: 1,
    playerDmgDealt: 0,
    playerHeal: 0,
    aiDmgDealt: 0,
    aiHeal: 0,
    cardsUsed: {},
    result: ''
  });

  document.getElementById('gameLog').innerHTML = '';
  addLog('══ 对局开始 ══', 'log-turn');
  addLog('你使用：' + playerHero.name + '（' + playerHero.title + '）', 'log-skill');
  addLog('兰轩使用：' + aiHero.name + '（' + aiHero.title + '）', 'log-skill');
  addLog('你的手牌: ' + Store.get('game.player.hand').map(c => c.name).join(' / '), 'log-card');
  addLog('── 你的回合 ──', 'log-turn');

  document.getElementById('playText').textContent = '对局开始！你先手。';

  Store.set('mood', '兴奋');
  renderProfile();
  renderGame();
}

function renderGame() {
  const player = Store.get('game.player');
  const ai = Store.get('game.ai');

  const renderHp = (who, id) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < who.maxHp; i++) {
      const dot = document.createElement('div');
      dot.className = 'hp-dot' + (i < who.hp ? ' filled' : ' empty') + (who.hp <= 1 && i < who.hp ? ' danger' : '');
      frag.appendChild(dot);
    }
    el.appendChild(frag);
  };

  renderHp(player, 'playerHp');
  renderHp(ai, 'aiHp');

  document.getElementById('aiHandCount').textContent = ai.hand.length;
  document.getElementById('playerHandCount').textContent = player.hand.length;

  const backs = document.getElementById('aiHandBacks');
  backs.innerHTML = '';
  const backFrag = document.createDocumentFragment();
  for (let i = 0; i < Math.min(ai.hand.length, 10); i++) {
    const b = document.createElement('div');
    b.className = 'card-back';
    backFrag.appendChild(b);
  }
  backs.appendChild(backFrag);

  const hand = document.getElementById('playerHand');
  hand.innerHTML = '';
  const isPlayerTurn = Store.get('game.active') && Store.get('game.turn') === 0;

  const handFrag = document.createDocumentFragment();
  player.hand.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'card ' + c.type + (isPlayerTurn ? '' : ' disabled');

    let tip = c.tip;
    if (player.hero?.id === 'guanyu' && c.color === 'red' && c.type === 'shan') {
      tip = '【武圣】可当作【杀】使用';
    }
    if (player.hero?.id === 'zhaoyun' && c.type === 'sha') {
      tip = c.tip + ' | 【龙胆】可当【闪】';
    }
    if (player.hero?.id === 'zhaoyun' && c.type === 'shan') {
      tip = c.tip + ' | 【龙胆】可当【杀】';
    }

    d.setAttribute('data-tip', tip + (c.color === 'red' ? ' [红]' : ' [黑]'));
    d.innerHTML = '<div class="card-name">' + c.name + '</div><div class="card-type-label">' + (['sha', 'shan', 'tao'].includes(c.type) ? '基本' : '锦囊') + '</div>';
    d.style.animationDelay = (i * .04) + 's';
    d.style.animation = 'cardFlipIn .35s ease forwards';
    d.onclick = () => playCard(i);
    handFrag.appendChild(d);
  });
  hand.appendChild(handFrag);

  document.getElementById('aiZone').className = 'gb-zone gb-ai' + (Store.get('game.active') && Store.get('game.turn') === 1 ? ' active-turn' : '');
  document.getElementById('playerZone').className = 'gb-zone gb-player' + (isPlayerTurn ? ' active-turn' : '');
  document.getElementById('gbPhase').textContent = Store.get('game.active') ? (Store.get('game.turn') === 0 ? '你的回合 · 出牌阶段' : '兰轩的回合 · 思考中...') : '等待开始';
  document.getElementById('gbRound').textContent = Store.get('game.active') ? '回合 ' + Store.get('game.round') : '三国杀 1v1';
  document.getElementById('gbDeck').textContent = '牌堆 ' + Store.get('game.deck').length;
  document.getElementById('deckCount').textContent = Store.get('game.deck').length;

  const canAct = isPlayerTurn;
  document.getElementById('drawBtn').disabled = !canAct || player.hasDrawn;
  document.getElementById('endBtn').disabled = !canAct;
  document.getElementById('exitBtn').disabled = !Store.get('game.active');

  const skillBtn = document.getElementById('skillBtn');
  if (player.hero) {
    const activeSkill = player.hero.skills.find(s => s.type === 'active');
    if (activeSkill) {
      skillBtn.textContent = activeSkill.name;
      skillBtn.disabled = !canAct || player.skillUsed;
      skillBtn.title = activeSkill.desc;
    } else {
      skillBtn.textContent = player.hero.skills[0].name + '（被动）';
      skillBtn.disabled = true;
      skillBtn.title = player.hero.skills[0].desc;
    }
  }

  document.getElementById('rDot').className = 'r-header-dot' + (Store.get('game.active') ? ' active' : '');
  document.getElementById('rTitle').textContent = Store.get('game.active') ? '对局记录' : '三国杀';
  document.getElementById('gamePreview').className = 'game-preview' + (Store.get('game.active') ? ' hidden' : '');
  document.getElementById('gameLog').style.display = Store.get('game.active') ? 'block' : 'none';
}

function animateCardToPlayZone(cardEl, cardData, text) {
  const handArea = document.getElementById('playerHand');
  const playZone = document.getElementById('playedCard');
  const rectFrom = cardEl.getBoundingClientRect();
  const rectTo = playZone.getBoundingClientRect();

  const clone = cardEl.cloneNode(true);
  clone.style.position = 'fixed';
  clone.style.left = rectFrom.left + 'px';
  clone.style.top = rectFrom.top + 'px';
  clone.style.width = rectFrom.width + 'px';
  clone.style.height = rectFrom.height + 'px';
  clone.style.zIndex = '100';
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';
  clone.style.transition = 'transform 0.45s cubic-bezier(.34,1.56,.64,1), opacity 0.45s ease';
  document.body.appendChild(clone);

  requestAnimationFrame(() => {
    const tx = rectTo.left + rectTo.width / 2 - rectFrom.left - rectFrom.width / 2;
    const ty = rectTo.top + rectTo.height / 2 - rectFrom.top - rectFrom.height / 2;
    clone.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(1.15) rotateZ(3deg)';
  });

  setTimeout(() => {
    clone.style.opacity = '0';
    clone.style.transform = clone.style.transform.replace('scale(1.15)', 'scale(0.9)');
    setTimeout(() => { if (clone.parentNode) clone.parentNode.removeChild(clone); }, 300);
  }, 500);

  showPlayedCard(cardData, text);
}

function showPlayedCard(card, text) {
  const el = document.getElementById('playedCard');
  el.innerHTML = '<div class="card ' + card.type + '" style="pointer-events:none;transform:none"><div class="card-name">' + card.name + '</div><div class="card-type-label">' + (['sha', 'shan', 'tao'].includes(card.type) ? '基本' : '锦囊') + '</div></div>';
  el.className = 'gb-played-card visible';
  document.getElementById('playText').textContent = text;
  setTimeout(() => { el.className = 'gb-played-card'; }, 1800);
}

function addLog(text, cls) {
  const el = document.getElementById('gameLog');
  const d = document.createElement('div');
  d.className = 'log-entry fade-in ' + (cls || '');
  d.textContent = text;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

function showFloatText(zoneId, text, type) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  const float = document.createElement('div');
  float.className = type === 'heal' ? 'heal-float' : 'damage-float';
  float.textContent = text;
  const rect = zone.getBoundingClientRect();
  const parentRect = zone.offsetParent ? zone.offsetParent.getBoundingClientRect() : rect;
  float.style.left = (rect.left - parentRect.left + rect.width / 2 - 20) + 'px';
  float.style.top = (rect.top - parentRect.top) + 'px';
  zone.style.position = 'relative';
  zone.appendChild(float);
  requestAnimationFrame(() => {
    if (float.parentNode) float.parentNode.removeChild(float);
  });
  setTimeout(() => { if (float.parentNode) float.parentNode.removeChild(float); }, 950);
}

function damage(who, n, source) {
  const player = Store.get('game.player');
  const ai = Store.get('game.ai');

  if (who === player && who.hero?.id === 'zhugeliang' && who.hand.length === 0 && source === 'sha') {
    addLog('【空城】诸葛亮没有手牌，不能成为【杀】的目标！', 'log-skill');
    return;
  }
  if (who === ai && who.hero?.id === 'zhugeliang' && who.hand.length === 0 && source === 'sha') {
    addLog('【空城】兰轩（诸葛亮）没有手牌，不能成为【杀】的目标！', 'log-skill');
    return;
  }

  who.hp = Math.max(0, who.hp - n);
  const zone = who === player ? 'playerZone' : 'aiZone';
  document.getElementById(zone).classList.add('shake', 'dmg-flash');
  showFloatText(zone, '-' + n, 'damage');
  setTimeout(() => document.getElementById(zone).classList.remove('shake', 'dmg-flash'), 400);

  const stats = Store.get('game.stats');
  if (who === ai && stats) stats.playerDmgDealt += n;
  if (who === player && stats) stats.aiDmgDealt += n;
  Store.set('game.stats', stats);

  if (who === player && who.hero?.id === 'simayi' && source !== 'feedback' && ai.hand.length > 0) {
    const stolen = ai.hand.splice(Math.floor(Math.random() * ai.hand.length), 1)[0];
    player.hand.push(stolen);
    addLog('【反馈】司马懿受到伤害，获得兰轩一张【' + stolen.name + '】', 'log-skill');
  }
  if (who === ai && who.hero?.id === 'simayi' && source !== 'feedback' && player.hand.length > 0) {
    const stolen = player.hand.splice(Math.floor(Math.random() * player.hand.length), 1)[0];
    ai.hand.push(stolen);
    addLog('【反馈】兰轩（司马懿）受到伤害，获得你一张【' + stolen.name + '】', 'log-skill');
  }

  if (who === player) Store.set('game.player', { ...player });
  else Store.set('game.ai', { ...ai });

  renderGame();
}

function heal(who, n) {
  who.hp = Math.min(who.maxHp, who.hp + n);
  const zone = who === Store.get('game.player') ? 'playerZone' : 'aiZone';
  document.getElementById(zone).classList.add('heal-glow');
  showFloatText(zone, '+' + n, 'heal');
  setTimeout(() => document.getElementById(zone).classList.remove('heal-glow'), 500);

  const stats = Store.get('game.stats');
  if (who === Store.get('game.player') && stats) stats.playerHeal += n;
  if (who === Store.get('game.ai') && stats) stats.aiHeal += n;
  Store.set('game.stats', stats);

  renderGame();
}

function checkEnd() {
  const ai = Store.get('game.ai');
  const player = Store.get('game.player');
  if (ai.hp <= 0) { endGame('win'); return true; }
  if (player.hp <= 0) { endGame('lose'); return true; }
  return false;
}

function saveRecord(result) {
  const stats = Store.get('game.stats');
  if (!stats) return;
  const records = JSON.parse(localStorage.getItem('lanxuan_records') || '[]');
  records.unshift({
    date: new Date().toLocaleString('zh-CN'),
    hero: stats.playerHero,
    aiHero: stats.aiHero,
    rounds: stats.rounds,
    result: result,
    playerDmg: stats.playerDmgDealt,
    playerHeal: stats.playerHeal
  });
  if (records.length > 50) records.pop();
  localStorage.setItem('lanxuan_records', JSON.stringify(records));
  renderRecords();
}

function getRecords() {
  return JSON.parse(localStorage.getItem('lanxuan_records') || '[]');
}

function clearRecords() {
  localStorage.removeItem('lanxuan_records');
  renderRecords();
}

function renderRecords() {
  const container = document.getElementById('recordList');
  if (!container) return;
  const records = getRecords();
  if (records.length === 0) {
    container.innerHTML = '<div class="record-empty">暂无战绩</div>';
    document.getElementById('recordSummary').innerHTML = '';
    return;
  }
  const total = records.length;
  const wins = records.filter(r => r.result === 'win').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  document.getElementById('recordSummary').innerHTML =
    '<div class="record-stat">总场次：<b>' + total + '</b></div>' +
    '<div class="record-stat">胜率：<b style="color:var(--green)">' + winRate + '%</b></div>';

  const frag = document.createDocumentFragment();
  records.forEach((r, i) => {
    const color = r.result === 'win' ? 'var(--green)' : (r.result === 'lose' ? 'var(--red)' : 'var(--text-3)');
    const label = r.result === 'win' ? '胜' : (r.result === 'lose' ? '负' : '平');
    const div = document.createElement('div');
    div.className = 'record-item';
    div.innerHTML = '<div class="record-top"><span class="record-result" style="color:' + color + '">' + label + '</span><span class="record-date">' + r.date + '</span><button class="record-share-btn" onclick="shareBattleIdx(' + i + ')" title="分享战绩">📤</button></div>' +
      '<div class="record-detail">' + r.hero + ' vs ' + r.aiHero + ' · ' + r.rounds + '回合 · 造成' + r.playerDmg + '伤 · 治疗' + r.playerHeal + '</div>';
    frag.appendChild(div);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

function shareBattleIdx(index) {
  const records = getRecords();
  if (records[index]) shareBattle(records[index]);
}

window.shareBattleIdx = shareBattleIdx;
window.shareCurrentBattle = shareCurrentBattle;

function showBattleReport(result) {
  const stats = Store.get('game.stats');
  if (!stats) return;
  const st = stats;
  const cardsUsedHtml = Object.entries(st.cardsUsed).map(([k, v]) => '<span class="report-card">' + k + ' x' + v + '</span>').join('');
  const resultColor = result === 'win' ? 'var(--green)' : (result === 'lose' ? 'var(--red)' : 'var(--text-3)');
  const resultText = result === 'win' ? '胜利' : (result === 'lose' ? '失败' : '平局');
  const html = '<div class="battle-report">' +
    '<div class="report-title" style="color:' + resultColor + '">' + resultText + '</div>' +
    '<div class="report-heroes">你：' + st.playerHero + ' vs 兰轩：' + st.aiHero + '</div>' +
    '<div class="report-grid">' +
      '<div class="report-cell"><div class="report-label">回合数</div><div class="report-num">' + st.rounds + '</div></div>' +
      '<div class="report-cell"><div class="report-label">造成伤害</div><div class="report-num">' + st.playerDmgDealt + '</div></div>' +
      '<div class="report-cell"><div class="report-label">受到治疗</div><div class="report-num">' + st.playerHeal + '</div></div>' +
    '</div>' +
    '<div class="report-cards"><div class="report-label">使用卡牌</div><div class="report-card-list">' + (cardsUsedHtml || '无') + '</div></div>' +
    '</div>';
  document.getElementById('overlayTitle').textContent = '战报统计';
  document.getElementById('overlaySub').innerHTML = html;
  document.getElementById('overlayActions').innerHTML = '<button class="overlay-btn" onclick="shareCurrentBattle()">📤 分享战绩</button><button class="overlay-btn" onclick="closeOverlay()">确定</button>';
  document.getElementById('overlayCard').style.maxWidth = '420px';
  document.getElementById('overlay').classList.add('show');
}

function shareCurrentBattle() {
  const stats = Store.get('game.stats');
  if (!stats) return;
  const record = {
    result: stats.result,
    hero: stats.playerHero,
    aiHero: stats.aiHero,
    rounds: stats.rounds,
    playerDmg: stats.playerDmgDealt,
    playerHeal: stats.playerHeal,
    date: new Date().toLocaleString('zh-CN')
  };
  shareBattle(record);
}

function endGame(reason) {
  Store.set('game.active', false);
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('gameBoard').classList.remove('active');
  document.getElementById('heroSelectScreen').classList.remove('active');

  const stats = Store.get('game.stats');
  if (reason === 'win') {
    if (stats) { stats.result = 'win'; stats.rounds = Store.get('game.round'); Store.set('game.stats', stats); }
    saveRecord('win');
    addMsg('a', '（瘫在椅子上）行...你赢了...下次再来。');
    Store.set('like', Math.min(100, Store.get('like') + 2));
    addLog('你赢了！好感度 +2', 'log-heal');
    showBattleReport('win');
  } else if (reason === 'lose') {
    if (stats) { stats.result = 'lose'; stats.rounds = Store.get('game.round'); Store.set('game.stats', stats); }
    saveRecord('lose');
    addMsg('a', '（得意地靠在椅背上）就这？再来一局？');
    Store.set('like', Math.min(100, Store.get('like') + 1));
    addLog('兰轩赢了，好感度 +1', 'log-turn');
    showBattleReport('lose');
  } else if (reason === 'surrender') {
    if (stats) { stats.result = 'surrender'; stats.rounds = Store.get('game.round'); Store.set('game.stats', stats); }
    saveRecord('surrender');
    addMsg('a', '（挑眉）哦↗？这就投了？');
    addLog('你投降了', 'log-dmg');
    showOverlay('你投降了', '兰轩一脸不屑地看着你。');
  } else {
    addMsg('a', '（不爽）打到一半跑了？下次别找我打。');
    addLog('对局中断', 'log-dmg');
  }

  Store.set('mood', '正常');
  renderProfile();
  renderGame();
  saveUserData();
}

// ═══ 摸牌 ═══
async function drawCard() {
  if (!Store.get('game.active') || Store.get('game.turn') !== 0 || Store.get('game.player.hasDrawn')) return;

  const player = Store.get('game.player');
  if (player.hero?.id === 'zhugeliang' && !player.guanXingUsed) {
    player.guanXingUsed = true;
    const top3 = [];
    for (let i = 0; i < 3; i++) {
      if (!Store.get('game.deck').length) {
        const newDeck = await buildDeck();
        Store.set('game.deck', newDeck);
      }
      top3.push(Store.get('game.deck').pop());
    }
    top3.sort((a, b) => {
      const order = { tao: 4, wzsy: 3, sha: 2, ghcq: 1, nmrr: 1, wjqf: 1, shan: 0 };
      return (order[b.type] || 0) - (order[a.type] || 0);
    });
    const deck = Store.get('game.deck');
    deck.push(...top3.reverse());
    Store.set('game.deck', deck);
    addLog('【观星】诸葛亮调整牌堆顶3张牌的顺序', 'log-skill');
  }

  const drawn = (await drawFromDeck(2)).map(assignColor);
  player.hand.push(...drawn);
  player.hasDrawn = true;
  Store.set('game.player', { ...player });
  addLog('你摸了: ' + drawn.map(c => c.name).join(', '), 'log-card');
  player.skillState = null;
  renderGame();
}

// ═══ 涯角触发 ═══
async function triggerYaJiao(who) {
  if (who.hero?.id === 'zhaoyun' && !who.yaJiaoUsed) {
    const extra = (await drawFromDeck(1)).map(assignColor);
    who.hand.push(...extra);
    who.yaJiaoUsed = true;
    const name = who === Store.get('game.player') ? '你' : '兰轩';
    addLog('【涯角】' + name + '额外摸了一张牌', 'log-skill');
  }
}

// ═══ 防御辅助函数 ═══
async function aiDefendSha(needShan) {
  const ai = Store.get('game.ai');
  let shanUsed = 0;
  for (let s = 0; s < needShan; s++) {
    const si = ai.hand.findIndex(c => c.type === 'shan');
    const shaAsShan = ai.hero?.id === 'zhaoyun' ? ai.hand.findIndex(c => c.type === 'sha') : -1;
    if (si >= 0) {
      ai.hand.splice(si, 1);
      shanUsed++;
      await triggerYaJiao(ai);
    } else if (shaAsShan >= 0) {
      ai.hand.splice(shaAsShan, 1);
      shanUsed++;
      addLog('【龙胆】兰轩将【杀】当作【闪】打出', 'log-skill');
      await triggerYaJiao(ai);
    }
  }
  Store.set('game.ai', { ...ai });
  return shanUsed;
}

async function playerDefendSha(needShan) {
  const player = Store.get('game.player');
  let shanUsed = 0;
  for (let s = 0; s < needShan; s++) {
    const si = player.hand.findIndex(c => c.type === 'shan');
    const shaAsShan = player.hero?.id === 'zhaoyun' ? player.hand.findIndex(c => c.type === 'sha') : -1;
    if (si >= 0) {
      player.hand.splice(si, 1);
      shanUsed++;
      await triggerYaJiao(player);
    } else if (shaAsShan >= 0) {
      player.hand.splice(shaAsShan, 1);
      shanUsed++;
      addLog('【龙胆】你将【杀】当作【闪】打出', 'log-skill');
      await triggerYaJiao(player);
    }
  }
  Store.set('game.player', { ...player });
  return shanUsed;
}

async function aiDefendNanMan() {
  const ai = Store.get('game.ai');
  const shaIdx = ai.hand.findIndex(c => c.type === 'sha');
  const shanAsSha = ai.hero?.id === 'zhaoyun' ? ai.hand.findIndex(c => c.type === 'shan') : -1;
  if (shaIdx >= 0) {
    ai.hand.splice(shaIdx, 1);
    addLog('兰轩打出【杀】抵挡', 'log-action');
    await triggerYaJiao(ai);
    Store.set('game.ai', { ...ai });
    return true;
  } else if (shanAsSha >= 0) {
    ai.hand.splice(shanAsSha, 1);
    addLog('【龙胆】兰轩将【闪】当作【杀】抵挡', 'log-skill');
    await triggerYaJiao(ai);
    Store.set('game.ai', { ...ai });
    return true;
  }
  return false;
}

async function aiDefendWanJian() {
  const ai = Store.get('game.ai');
  const shanIdx = ai.hand.findIndex(c => c.type === 'shan');
  const shaAsShan = ai.hero?.id === 'zhaoyun' ? ai.hand.findIndex(c => c.type === 'sha') : -1;
  if (shanIdx >= 0) {
    ai.hand.splice(shanIdx, 1);
    addLog('兰轩打出【闪】躲避', 'log-action');
    await triggerYaJiao(ai);
    Store.set('game.ai', { ...ai });
    return true;
  } else if (shaAsShan >= 0) {
    ai.hand.splice(shaAsShan, 1);
    addLog('【龙胆】兰轩将【杀】当作【闪】躲避', 'log-skill');
    await triggerYaJiao(ai);
    Store.set('game.ai', { ...ai });
    return true;
  }
  return false;
}

async function playerDefendNanMan() {
  const player = Store.get('game.player');
  const shaIdx = player.hand.findIndex(c => c.type === 'sha');
  const shanAsSha = player.hero?.id === 'zhaoyun' ? player.hand.findIndex(c => c.type === 'shan') : -1;
  if (shaIdx >= 0) {
    player.hand.splice(shaIdx, 1);
    addLog('你打出【杀】抵挡', 'log-action');
    await triggerYaJiao(player);
    Store.set('game.player', { ...player });
    return true;
  } else if (shanAsSha >= 0) {
    player.hand.splice(shanAsSha, 1);
    addLog('【龙胆】你将【闪】当作【杀】抵挡', 'log-skill');
    await triggerYaJiao(player);
    Store.set('game.player', { ...player });
    return true;
  }
  return false;
}

async function playerDefendWanJian() {
  const player = Store.get('game.player');
  const shanIdx = player.hand.findIndex(c => c.type === 'shan');
  const shaAsShan = player.hero?.id === 'zhaoyun' ? player.hand.findIndex(c => c.type === 'sha') : -1;
  if (shanIdx >= 0) {
    player.hand.splice(shanIdx, 1);
    addLog('你打出【闪】躲避', 'log-action');
    await triggerYaJiao(player);
    Store.set('game.player', { ...player });
    return true;
  } else if (shaAsShan >= 0) {
    player.hand.splice(shaAsShan, 1);
    addLog('【龙胆】你将【杀】当作【闪】躲避', 'log-skill');
    await triggerYaJiao(player);
    Store.set('game.player', { ...player });
    return true;
  }
  return false;
}

// ═══ 集智触发 ═══
async function triggerJiZhi(who) {
  if (who.hero?.id === 'huangyueying') {
    const extra = (await drawFromDeck(1)).map(assignColor);
    who.hand.push(...extra);
    const name = who === Store.get('game.player') ? '你' : '兰轩';
    addLog('【集智】' + name + '额外摸了一张【' + extra[0].name + '】', 'log-skill');
  }
}

// ═══ 枭姬触发 ═══
async function triggerXiaoJi(who) {
  if (who.hero?.id === 'sunshangxiang' && who.xiaoJiCount < 2) {
    const extra = (await drawFromDeck(1)).map(assignColor);
    who.hand.push(...extra);
    who.xiaoJiCount++;
    const name = who === Store.get('game.player') ? '你' : '兰轩';
    addLog('【枭姬】' + name + '失去手牌，额外摸了一张【' + extra[0].name + '】', 'log-skill');
  }
}

// ═══ 技能使用 ═══
async function useSkill() {
  if (!Store.get('game.active') || Store.get('game.turn') !== 0 || Store.get('game.player.skillUsed') || !Store.get('game.player.hero')) return;

  const hero = Store.get('game.player.hero');
  const activeSkill = hero.skills.find(s => s.type === 'active');
  if (!activeSkill) return;

  const player = Store.get('game.player');

  switch (hero.id) {
    case 'guanyu': {
      const redCards = player.hand.filter(c => c.color === 'red');
      if (redCards.length === 0) { addLog('你没有红色牌可以弃置', ''); return; }
      const idx = player.hand.indexOf(redCards[0]);
      const discarded = player.hand.splice(idx, 1)[0];
      await triggerXiaoJi(player);
      player.skillUsed = true;
      player.skillState = 'yijue';
      addLog('【义绝】关羽弃置一张红色牌，兰轩本回合无法使用【闪】！', 'log-skill');
      addMsg('a', '（咬牙）好你个关羽！');
      break;
    }
    case 'zhangfei': {
      if (player.hand.length > 0) { addLog('【怒吼】需要手牌为0才能发动', ''); return; }
      player.skillUsed = true;
      damage(Store.get('game.ai'), 1, 'skill');
      addLog('【怒吼】张飞手牌为0，对兰轩造成1点伤害！', 'log-skill');
      addMsg('a', '（被震退）什...什么力气！');
      if (checkEnd()) return;
      break;
    }
    case 'huangyueying': {
      const wzIdx = player.hand.findIndex(c => c.type === 'wzsy');
      if (wzIdx < 0) { addLog('【奇才】需要一张锦囊牌', ''); return; }
      player.hand.splice(wzIdx, 1);
      await triggerXiaoJi(player);
      const extra = (await drawFromDeck(2)).map(assignColor);
      player.hand.push(...extra);
      player.skillUsed = true;
      addLog('【集智】黄月英使用锦囊，额外摸一张牌', 'log-skill');
      await triggerJiZhi(player);
      addLog('摸到: ' + extra.map(c => c.name).join(', '), 'log-card');
      break;
    }
    case 'lvbu': {
      if (player.hand.length === 0) { addLog('【利驭】没有手牌可以弃置', ''); return; }
      const discarded = player.hand.splice(0, 1)[0];
      await triggerXiaoJi(player);
      player.skillUsed = true;
      addLog('【利驭】吕布弃置【' + discarded.name + '】，视为使用一张【杀】', 'log-skill');
      showPlayedCard({ type: 'sha', name: '杀' }, '吕布发动【利驭】！');

      let needShan = player.hero.id === 'lvbu' ? 2 : 1;
      let shanUsed = await aiDefendSha(needShan);
      if (shanUsed >= needShan) {
        addLog('兰轩打出' + shanUsed + '张【闪】躲避', 'log-action');
        addMsg('a', '（连挡' + shanUsed + '下）还好我闪多！');
      } else {
        damage(Store.get('game.ai'), 1, 'skill');
        addLog('兰轩无法打出足够的【闪】，受到1点伤害！', 'log-dmg');
        addMsg('a', '（被击退）吕布...果然凶猛！');
      }
      if (checkEnd()) return;
      break;
    }
    case 'zhugeliang': {
      if (player.hand.length === 0) { addLog('【观星】没有手牌可调整', ''); return; }
      player.skillUsed = true;
      const top3 = [];
      for (let i = 0; i < 3; i++) {
        if (!Store.get('game.deck').length) {
          const newDeck = await buildDeck();
          Store.set('game.deck', newDeck);
        }
        top3.push(Store.get('game.deck').pop());
      }
      top3.sort((a, b) => {
        const order = { tao: 4, wzsy: 3, sha: 2, ghcq: 1, nmrr: 1, wjqf: 1, shan: 0 };
        return (order[b.type] || 0) - (order[a.type] || 0);
      });
      const deck = Store.get('game.deck');
      deck.push(...top3.reverse());
      Store.set('game.deck', deck);
      addLog('【观星】诸葛亮调整牌堆顶3张牌的顺序', 'log-skill');
      addMsg('a', '（皱眉）又在算计什么...');
      break;
    }
    case 'simayi': {
      if (player.hand.length === 0) { addLog('【鬼才】没有手牌可以弃置', ''); return; }
      const discarded = player.hand.splice(0, 1)[0];
      await triggerXiaoJi(player);
      const extra = (await drawFromDeck(1)).map(assignColor);
      player.hand.push(...extra);
      player.skillUsed = true;
      addLog('【鬼才】司马懿弃置【' + discarded.name + '】，摸一张【' + extra[0].name + '】', 'log-skill');
      addMsg('a', '（警惕）这家伙在换牌...');
      break;
    }
    case 'sunshangxiang': {
      if (player.skillUsed) { addLog('【结姻】每局限一次', ''); return; }
      if (player.hand.length === 0) { addLog('【结姻】没有手牌可以弃置', ''); return; }
      const discarded = player.hand.splice(0, 1)[0];
      await triggerXiaoJi(player);
      player.skillUsed = true;
      if (player.hp < player.maxHp) heal(player, 1);
      if (Store.get('game.ai').hp < Store.get('game.ai').maxHp) heal(Store.get('game.ai'), 1);
      addLog('【结姻】孙尚香弃置【' + discarded.name + '】，双方各回复1点体力', 'log-skill');
      addMsg('a', '（愣住）咦？突然对我这么好？');
      break;
    }
  }
  Store.set('game.player', { ...player });
  renderGame();
}

// ═══ 出牌 ═══
async function playCard(idx) {
  if (!Store.get('game.active') || Store.get('game.turn') !== 0) return;
  const player = Store.get('game.player');
  const card = player.hand[idx];
  if (!card) return;

  const handEl = document.getElementById('playerHand');
  const cardEl = handEl.children[idx];

  const stats = Store.get('game.stats');
  if (stats) {
    stats.cardsUsed[card.name] = (stats.cardsUsed[card.name] || 0) + 1;
    Store.set('game.stats', stats);
  }

  if (player.hero?.id === 'guanyu' && card.color === 'red' && card.type === 'shan') {
    if (player.shaUsed) { addLog('本回合已出过【杀】', ''); return; }
    player.hand.splice(idx, 1);
    await triggerXiaoJi(player);
    player.shaUsed = true;
    addLog('【武圣】你将红色【闪】当作【杀】使用！', 'log-skill');
    if (cardEl) animateCardToPlayZone(cardEl, { type: 'sha', name: '杀' }, '关羽发动【武圣】！');
    else showPlayedCard({ type: 'sha', name: '杀' }, '关羽发动【武圣】！');
    await triggerYaJiao(player);

    let needShan = player.hero.id === 'lvbu' ? 2 : 1;
    if (player.skillState === 'yijue') {
      addLog('【义绝】效果生效，兰轩无法使用【闪】！', 'log-skill');
      damage(Store.get('game.ai'), 1, 'sha');
      addLog('兰轩受到1点伤害！', 'log-dmg');
      addMsg('a', '（龇牙）嘶...义绝？！');
    } else {
      let shanUsed = await aiDefendSha(needShan);
      if (shanUsed >= needShan) {
        addLog('兰轩打出' + shanUsed + '张【闪】躲避', 'log-action');
        addMsg('a', '（随手一挡）就这？');
      } else {
        damage(Store.get('game.ai'), 1, 'sha');
        addLog('兰轩受到1点伤害！', 'log-dmg');
        addMsg('a', '（龇牙）嘶...武圣？！');
      }
    }
    if (checkEnd()) return;
    Store.set('game.player', { ...player });
    renderGame();
    return;
  }

  switch (card.type) {
    case 'sha': {
      if (player.shaUsed && player.hero.id !== 'zhangfei') { addLog('本回合已出过【杀】', ''); return; }
      player.hand.splice(idx, 1);
      await triggerXiaoJi(player);
      player.shaUsed = true;
      addLog('你对兰轩使用【杀】！', 'log-card');
      if (cardEl) animateCardToPlayZone(cardEl, card, '你对兰轩使用【杀】！');
      else showPlayedCard(card, '你对兰轩使用【杀】！');
      await triggerYaJiao(player);

      let needShan = player.hero?.id === 'lvbu' ? 2 : 1;
      if (player.skillState === 'yijue') {
        addLog('【义绝】效果生效，兰轩无法使用【闪】！', 'log-skill');
        damage(Store.get('game.ai'), 1, 'sha');
        addLog('兰轩受到1点伤害！', 'log-dmg');
        addMsg('a', '（龇牙）嘶...义绝？！');
      } else {
        let shanUsed = await aiDefendSha(needShan);
        if (shanUsed >= needShan) {
          addLog('兰轩打出' + shanUsed + '张【闪】躲避', 'log-action');
          addMsg('a', '（随手一挡）就这？');
        } else {
          damage(Store.get('game.ai'), 1, 'sha');
          addLog('兰轩受到1点伤害！', 'log-dmg');
          addMsg('a', '（龇牙）嘶...你来真的？');
        }
      }
      break;
    }
    case 'shan': {
      if (player.hero?.id === 'zhaoyun') {
        if (player.shaUsed) { addLog('本回合已出过【杀】', ''); return; }
        player.hand.splice(idx, 1);
        await triggerXiaoJi(player);
        player.shaUsed = true;
        addLog('【龙胆】你将【闪】当作【杀】使用！', 'log-skill');
        if (cardEl) animateCardToPlayZone(cardEl, { type: 'sha', name: '杀' }, '赵云发动【龙胆】！');
        else showPlayedCard({ type: 'sha', name: '杀' }, '赵云发动【龙胆】！');
        await triggerYaJiao(player);

        if (player.skillState === 'yijue') {
          addLog('【义绝】效果生效，兰轩无法使用【闪】！', 'log-skill');
          damage(Store.get('game.ai'), 1, 'sha');
          addLog('兰轩受到1点伤害！', 'log-dmg');
          addMsg('a', '（龇牙）嘶...！');
        } else {
          let shanUsed = await aiDefendSha(1);
          if (shanUsed >= 1) {
            addLog('兰轩打出【闪】躲避', 'log-action');
            addMsg('a', '（随手一挡）就这？');
          } else {
            damage(Store.get('game.ai'), 1, 'sha');
            addLog('兰轩受到1点伤害！', 'log-dmg');
            addMsg('a', '（龇牙）嘶...！');
          }
        }
      } else {
        addLog('【闪】不能主动使用', '');
        return;
      }
      break;
    }
    case 'tao': {
      if (player.hp >= player.maxHp) { addLog('血量已满', ''); return; }
      player.hand.splice(idx, 1);
      await triggerXiaoJi(player);
      heal(player, 1);
      if (cardEl) animateCardToPlayZone(cardEl, card, '你使用【桃】恢复1点体力');
      else showPlayedCard(card, '你使用【桃】恢复1点体力');
      addLog('你使用【桃】恢复1点体力', 'log-heal');
      break;
    }
    case 'wzsy': {
      player.hand.splice(idx, 1);
      await triggerXiaoJi(player);
      const ex = (await drawFromDeck(2)).map(assignColor);
      player.hand.push(...ex);
      if (cardEl) animateCardToPlayZone(cardEl, card, '你使用【无中生有】摸了2张牌');
      else showPlayedCard(card, '你使用【无中生有】摸了2张牌');
      addLog('你使用【无中生有】摸了' + ex.map(c => c.name).join(' / '), 'log-card');
      if (player.hero?.id === 'huangyueying') await triggerJiZhi(player);
      break;
    }
    case 'ghcq': {
      player.hand.splice(idx, 1);
      await triggerXiaoJi(player);
      const ai = Store.get('game.ai');
      if (ai.hand.length > 0) {
        const ri = Math.floor(Math.random() * ai.hand.length);
        const rm = ai.hand.splice(ri, 1)[0];
        if (cardEl) animateCardToPlayZone(cardEl, card, '你拆掉了兰轩的【' + rm.name + '】');
        else showPlayedCard(card, '你拆掉了兰轩的【' + rm.name + '】');
        addLog('你使用【过河拆桥】拆掉了兰轩的【' + rm.name + '】', 'log-card');
        addMsg('a', '（护住手牌）你——！');
      } else {
        if (cardEl) animateCardToPlayZone(cardEl, card, '兰轩没有手牌可拆');
        else showPlayedCard(card, '兰轩没有手牌可拆');
        addLog('兰轩没有手牌可拆', '');
      }
      if (player.hero?.id === 'huangyueying') await triggerJiZhi(player);
      break;
    }
    case 'nmrr': {
      player.hand.splice(idx, 1);
      await triggerXiaoJi(player);
      if (cardEl) animateCardToPlayZone(cardEl, card, '你使用【南蛮入侵】！');
      else showPlayedCard(card, '你使用【南蛮入侵】！');
      addLog('你使用【南蛮入侵】！', 'log-card');
      if (await aiDefendNanMan()) {
        addMsg('a', '（不屑）就这？');
      } else {
        damage(Store.get('game.ai'), 1, 'nmrr');
        addLog('兰轩无法抵挡，受到1点伤害！', 'log-dmg');
        addMsg('a', '（被击中）嘶...！');
      }
      if (player.hero?.id === 'huangyueying') await triggerJiZhi(player);
      break;
    }
    case 'wjqf': {
      player.hand.splice(idx, 1);
      await triggerXiaoJi(player);
      if (cardEl) animateCardToPlayZone(cardEl, card, '你使用【万箭齐发】！');
      else showPlayedCard(card, '你使用【万箭齐发】！');
      addLog('你使用【万箭齐发】！', 'log-card');
      if (await aiDefendWanJian()) {
        addMsg('a', '（闪开）切，没中。');
      } else {
        damage(Store.get('game.ai'), 1, 'wjqf');
        addLog('兰轩无法抵挡，受到1点伤害！', 'log-dmg');
        addMsg('a', '（被射中）啊——！');
      }
      if (player.hero?.id === 'huangyueying') await triggerJiZhi(player);
      break;
    }
  }

  Store.set('game.player', { ...player });
  if (checkEnd()) return;
  renderGame();
}

// ═══ 结束回合 ═══
function endTurn() {
  if (!Store.get('game.active') || Store.get('game.turn') !== 0) return;

  const player = Store.get('game.player');
  player.hasDrawn = false;
  player.shaUsed = false;
  player.skillState = null;
  player.yaJiaoUsed = false;
  player.xiaoJiCount = 0;
  player.guanXingUsed = false;
  Store.set('game.player', { ...player });

  Store.set('game.turn', 1);
  Store.set('game.round', Store.get('game.round') + 1);
  const stats = Store.get('game.stats');
  if (stats) { stats.rounds = Store.get('game.round'); Store.set('game.stats', stats); }

  addLog('── 兰轩的回合 ──', 'log-turn');
  document.getElementById('playText').textContent = '兰轩正在思考...';
  renderGame();
  setTimeout(aiTurn, 700);
}

// ═══ AI回合 ═══
async function aiTurn() {
  if (!Store.get('game.active')) return;

  const ai = Store.get('game.ai');

  if (ai.hero?.id === 'zhugeliang' && !ai.guanXingUsed) {
    ai.guanXingUsed = true;
    const top3 = [];
    for (let i = 0; i < 3; i++) {
      if (!Store.get('game.deck').length) {
        const newDeck = await buildDeck();
        Store.set('game.deck', newDeck);
      }
      top3.push(Store.get('game.deck').pop());
    }
    top3.sort((a, b) => {
      const order = { tao: 4, wzsy: 3, sha: 2, ghcq: 1, nmrr: 1, wjqf: 1, shan: 0 };
      return (order[b.type] || 0) - (order[a.type] || 0);
    });
    const deck = Store.get('game.deck');
    deck.push(...top3.reverse());
    Store.set('game.deck', deck);
    addLog('【观星】兰轩（诸葛亮）调整牌堆顶3张牌的顺序', 'log-skill');
  }

  const drawn = (await drawFromDeck(2)).map(assignColor);
  ai.hand.push(...drawn);
  ai.hasDrawn = true;
  addLog('兰轩摸了牌', 'log-card');

  setTimeout(() => {
    useAISmartSkills();
    executeSmartAIActions();
  }, 600);
}

async function useAISmartSkills() {
  const ai = Store.get('game.ai');

  if (ai.hero?.id === 'guanyu' && !ai.skillUsed) {
    const hasSha = ai.hand.some(c => c.type === 'sha');
    const redCards = ai.hand.filter(c => c.color === 'red');
    if (hasSha && redCards.length >= 1) {
      const idx = ai.hand.indexOf(redCards[0]);
      ai.hand.splice(idx, 1);
      await triggerXiaoJi(ai);
      ai.skillUsed = true;
      ai.skillState = 'yijue';
      addLog('【义绝】兰轩弃置红色牌，你本回合无法使用【闪】！', 'log-skill');
      addMsg('a', '（冷笑）武圣在此，休想闪避！');
    }
  }

  if (ai.hero?.id === 'zhangfei' && !ai.skillUsed && ai.hand.length === 0 && Store.get('game.player').hp <= 2) {
    ai.skillUsed = true;
    damage(Store.get('game.player'), 1, 'skill');
    addLog('【怒吼】兰轩手牌为0，对你造成1点伤害！', 'log-skill');
    addMsg('a', '（大喝）接俺一吼！');
    if (checkEnd()) return;
  }

  if (ai.hero?.id === 'simayi' && !ai.skillUsed && ai.hand.length > 0) {
    const discarded = ai.hand.splice(0, 1)[0];
    await triggerXiaoJi(ai);
    const extra = (await drawFromDeck(1)).map(assignColor);
    ai.hand.push(...extra);
    ai.skillUsed = true;
    addLog('【鬼才】兰轩（司马懿）弃置【' + discarded.name + '】，摸一张牌', 'log-skill');
  }

  if (ai.hero?.id === 'sunshangxiang' && !ai.skillUsed && ai.hp <= 2 && ai.hand.length > 0) {
    const discarded = ai.hand.splice(0, 1)[0];
    await triggerXiaoJi(ai);
    ai.skillUsed = true;
    if (ai.hp < ai.maxHp) heal(ai, 1);
    if (Store.get('game.player').hp < Store.get('game.player').maxHp) heal(Store.get('game.player'), 1);
    addLog('【结姻】兰轩（孙尚香）弃置【' + discarded.name + '】，双方各回复1点体力', 'log-skill');
    addMsg('a', '（微笑）互相帮助嘛~');
  }

  Store.set('game.ai', { ...ai });
}

async function executeSmartAIActions() {
  let acted = true;
  let actionsCount = 0;
  const maxActions = 6;

  const executeNextAction = async () => {
    if (!Store.get('game.active') || actionsCount >= maxActions) {
      finishAITurn();
      return;
    }

    acted = false;
    const ai = Store.get('game.ai');
    const player = Store.get('game.player');
    const cards = await loadCards();

    if (ai.hp <= 2 && ai.hp < ai.maxHp) {
      const t = ai.hand.findIndex(c => c.type === 'tao');
      if (t >= 0) {
        ai.hand.splice(t, 1);
        await triggerXiaoJi(ai);
        heal(ai, 1);
        showPlayedCard(cards[2], '兰轩使用【桃】恢复体力');
        addLog('兰轩使用【桃】恢复体力', 'log-heal');
        addMsg('a', '（得意）想杀我没那么容易。');
        acted = true;
        actionsCount++;
      }
    }

    if (!acted) {
      const nm = ai.hand.findIndex(c => c.type === 'nmrr');
      const wj = ai.hand.findIndex(c => c.type === 'wjqf');

      if (nm >= 0) {
        ai.hand.splice(nm, 1);
        await triggerXiaoJi(ai);
        showPlayedCard(cards[5], '兰轩使用【南蛮入侵】！');
        addLog('兰轩使用【南蛮入侵】！', 'log-dmg');
        if (!await playerDefendNanMan()) {
          damage(player, 1, 'nmrr');
          addLog('你无法抵挡，受到1点伤害！', 'log-dmg');
        }
        if (ai.hero?.id === 'huangyueying') await triggerJiZhi(ai);
        if (checkEnd()) return;
        acted = true;
        actionsCount++;
      } else if (wj >= 0) {
        ai.hand.splice(wj, 1);
        await triggerXiaoJi(ai);
        showPlayedCard(cards[6], '兰轩使用【万箭齐发】！');
        addLog('兰轩使用【万箭齐发】！', 'log-dmg');
        if (!await playerDefendWanJian()) {
          damage(player, 1, 'wjqf');
          addLog('你无法抵挡，受到1点伤害！', 'log-dmg');
        }
        if (ai.hero?.id === 'huangyueying') await triggerJiZhi(ai);
        if (checkEnd()) return;
        acted = true;
        actionsCount++;
      }
    }

    if (!acted) {
      const s = ai.hand.findIndex(c => c.type === 'sha');
      const canUseSha = (!ai.shaUsed || ai.hero?.id === 'zhangfei');
      const playerEmpty = player.hero?.id === 'zhugeliang' && player.hand.length === 0;
      if (s >= 0 && canUseSha && !playerEmpty) {
        ai.hand.splice(s, 1);
        await triggerXiaoJi(ai);
        ai.shaUsed = true;
        showPlayedCard(cards[0], '兰轩对你使用【杀】！');
        addLog('兰轩对你使用【杀】！', 'log-dmg');
        await triggerYaJiao(ai);

        let needShan = ai.hero?.id === 'lvbu' ? 2 : 1;

        if (ai.skillState === 'yijue') {
          addLog('【义绝】效果生效，你无法使用【闪】！', 'log-skill');
          damage(player, 1, 'sha');
          addLog('你受到1点伤害！', 'log-dmg');
          addMsg('a', '（得意）义绝之下，无处可逃！');
        } else {
          let shanUsed = await playerDefendSha(needShan);
          if (shanUsed >= needShan) {
            addLog('你打出' + shanUsed + '张【闪】躲避', 'log-action');
            addMsg('a', '（撇嘴）运气不错。');
          } else {
            damage(player, 1, 'sha');
            addLog('你受到1点伤害！', 'log-dmg');
            addMsg('a', '（得意）中了吧！');
          }
        }
        if (checkEnd()) return;
        acted = true;
        actionsCount++;
      }
    }

    if (!acted && player.hand.length > 0) {
      const gh = ai.hand.findIndex(c => c.type === 'ghcq');
      if (gh >= 0) {
        ai.hand.splice(gh, 1);
        await triggerXiaoJi(ai);
        let targetIdx = 0;
        const taoIdx = player.hand.findIndex(c => c.type === 'tao');
        const shaIdx = player.hand.findIndex(c => c.type === 'sha');
        if (taoIdx >= 0) targetIdx = taoIdx;
        else if (shaIdx >= 0) targetIdx = shaIdx;

        const rm = player.hand.splice(targetIdx, 1)[0];
        showPlayedCard(cards[4], '兰轩拆掉了你的【' + rm.name + '】');
        addLog('兰轩使用【过河拆桥】拆掉了你的【' + rm.name + '】', 'log-dmg');
        addMsg('a', '（坏笑）嘿嘿。');
        if (ai.hero?.id === 'huangyueying') await triggerJiZhi(ai);
        acted = true;
        actionsCount++;
      }
    }

    if (!acted) {
      const wz = ai.hand.findIndex(c => c.type === 'wzsy');
      if (wz >= 0) {
        ai.hand.splice(wz, 1);
        await triggerXiaoJi(ai);
        const ex = (await drawFromDeck(2)).map(assignColor);
        ai.hand.push(...ex);
        showPlayedCard(cards[3], '兰轩使用【无中生有】');
        addLog('兰轩使用【无中生有】摸了牌', 'log-card');
        if (ai.hero?.id === 'huangyueying') await triggerJiZhi(ai);
        acted = true;
        actionsCount++;
      }
    }

    if (!acted && ai.hero?.id === 'lvbu' && !ai.skillUsed && ai.hand.length > 0) {
      const discarded = ai.hand.splice(0, 1)[0];
      await triggerXiaoJi(ai);
      ai.skillUsed = true;
      addLog('【利驭】兰轩弃置【' + discarded.name + '】，视为使用一张【杀】', 'log-skill');
      await triggerYaJiao(ai);

      let shanUsed = await playerDefendSha(2);
      if (shanUsed >= 2) {
        addLog('你打出两张【闪】躲避', 'log-action');
      } else {
        damage(player, 1, 'skill');
        addLog('你受到1点伤害！', 'log-dmg');
        addMsg('a', '（冷哼）吕布之威，岂是尔等可挡。');
      }
      if (checkEnd()) return;
      acted = true;
      actionsCount++;
    }

    Store.set('game.ai', { ...ai });
    Store.set('game.player', { ...player });

    if (acted) {
      setTimeout(executeNextAction, 550 + Math.random() * 250);
    } else {
      finishAITurn();
    }
  };

  executeNextAction();
}

function finishAITurn() {
  const ai = Store.get('game.ai');
  ai.hasDrawn = false;
  ai.shaUsed = false;
  ai.skillState = null;
  ai.yaJiaoUsed = false;
  ai.xiaoJiCount = 0;
  ai.guanXingUsed = false;
  Store.set('game.ai', { ...ai });
  Store.set('game.turn', 0);

  addLog('── 你的回合 ──', 'log-turn');
  document.getElementById('playText').textContent = '你的回合，出牌吧！';

  if (Store.get('game.deck').length < 5) {
    buildDeck().then(d => Store.set('game.deck', d));
  }
  renderGame();
}

// ═══ 弹窗 ═══
function showOverlay(title, sub) {
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlaySub').innerHTML = sub;
  document.getElementById('overlayActions').innerHTML = '<button class="overlay-btn" onclick="closeOverlay()">确定</button>';
  document.getElementById('overlayCard').style.maxWidth = '340px';
  document.getElementById('overlay').classList.add('show');
}

function closeOverlay() {
  document.getElementById('overlay').classList.remove('show');
}

document.getElementById('overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeOverlay();
});

// ═══ 帮助面板 ═══
function openHelp() {
  document.getElementById('helpPanel').classList.add('open');
  document.getElementById('helpBackdrop').classList.add('show');
  renderHelpHeroes();
}

function closeHelp() {
  document.getElementById('helpPanel').classList.remove('open');
  document.getElementById('helpBackdrop').classList.remove('show');
}

function switchHelpTab(tab) {
  document.querySelectorAll('.help-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.help-content').forEach(c => c.classList.toggle('active', c.id === 'help-' + tab));
}

async function renderHelpHeroes() {
  const container = document.getElementById('helpHeroList');
  if (!container || container.children.length) return;
  const heroes = await loadHeroes();
  const frag = document.createDocumentFragment();
  heroes.forEach(h => {
    const div = document.createElement('div');
    div.className = 'help-hero-item';
    div.innerHTML = `
      <div class="help-hero-top">
        <div class="help-hero-avatar" style="background:linear-gradient(135deg,${h.color}22,${h.color}08);color:${h.color};border-color:${h.color}33">${h.char}</div>
        <div>
          <div class="help-hero-name">${h.name}</div>
          <div class="help-hero-title">${h.title} · ${h.hp}体力</div>
        </div>
      </div>
      <div class="help-hero-skills">
        ${h.skills.map(s => `<div class="help-hero-skill"><span class="help-hero-skill-name">${s.name}</span>：${s.desc}</div>`).join('')}
      </div>`;
    frag.appendChild(div);
  });
  container.appendChild(frag);
}

window.openHelp = openHelp;
window.closeHelp = closeHelp;
window.switchHelpTab = switchHelpTab;

// ═══ 关于面板 ═══
function openAbout() {
  document.getElementById('aboutPanel').classList.add('open');
  document.getElementById('aboutBackdrop').classList.add('show');
  updateAboutTime();
}

function closeAbout() {
  document.getElementById('aboutPanel').classList.remove('open');
  document.getElementById('aboutBackdrop').classList.remove('show');
}

function updateAboutTime() {
  const el = document.getElementById('aboutTime');
  if (el) el.textContent = new Date().toLocaleString('zh-CN');
}

window.openAbout = openAbout;
window.closeAbout = closeAbout;

// ═══ 快捷键面板 ═══
function openShortcuts() {
  document.getElementById('shortcutsPanel').classList.add('open');
  document.getElementById('shortcutsBackdrop').classList.add('show');
}

function closeShortcuts() {
  document.getElementById('shortcutsPanel').classList.remove('open');
  document.getElementById('shortcutsBackdrop').classList.remove('show');
}

window.openShortcuts = openShortcuts;
window.closeShortcuts = closeShortcuts;

// ═══ 分享功能 ═══
async function shareBattle(record) {
  const text = `【兰轩 - 三国杀1v1战绩】\n结果：${record.result === 'win' ? '胜利' : (record.result === 'lose' ? '失败' : '平局')}\n武将：${record.hero} vs ${record.aiHero}\n回合数：${record.rounds}\n造成伤害：${record.playerDmg}\n治疗量：${record.playerHeal}\n时间：${record.date}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: '兰轩 - 三国杀1v1战绩', text });
      return;
    } catch (e) {
      // 用户取消或分享失败，降级
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('战绩已复制到剪贴板');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('战绩已复制到剪贴板');
  }
}

function showToast(message) {
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'toast-msg';
  div.textContent = message;
  div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--surface);color:var(--text);padding:10px 18px;border-radius:10px;border:1px solid var(--border);box-shadow:0 4px 16px var(--card-shadow);z-index:300;font-size:12px;animation:msgIn .3s ease;';
  document.body.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 2200);
}

window.shareBattle = shareBattle;

// ═══ 键盘快捷键 ═══
document.addEventListener('keydown', (e) => {
  // 忽略输入框内的快捷键（除 Enter 和 Esc）
  const tag = e.target.tagName;
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

  // Esc 关闭弹窗/面板
  if (e.key === 'Escape') {
    if (document.getElementById('overlay').classList.contains('show')) {
      closeOverlay();
      return;
    }
    if (document.getElementById('settingsPanel').classList.contains('open')) {
      closeSettings();
      return;
    }
    if (document.getElementById('helpPanel').classList.contains('open')) {
      closeHelp();
      return;
    }
    if (document.getElementById('aboutPanel').classList.contains('open')) {
      closeAbout();
      return;
    }
    if (document.getElementById('shortcutsPanel').classList.contains('open')) {
      closeShortcuts();
      return;
    }
    return;
  }

  if (isInput && e.key !== 'Enter') return;

  // Enter 发送消息
  if (e.key === 'Enter' && isInput && e.target.id === 'chatInput') {
    sendMsg();
    return;
  }

  // G 快速打开游戏
  if (e.key === 'g' || e.key === 'G') {
    showHeroSelect();
    return;
  }

  // S 打开设置
  if (e.key === 's' || e.key === 'S') {
    openSettings();
    return;
  }

  // H 打开帮助
  if (e.key === 'h' || e.key === 'H') {
    openHelp();
    return;
  }

  // 数字键 1-9 快速出牌
  if (/^[1-9]$/.test(e.key)) {
    const idx = parseInt(e.key, 10) - 1;
    const hand = document.getElementById('playerHand');
    if (hand && hand.children[idx]) {
      hand.children[idx].click();
    }
    return;
  }

  // D 摸牌
  if (e.key === 'd' || e.key === 'D') {
    drawCard();
    return;
  }

  // E 结束回合
  if (e.key === 'e' || e.key === 'E') {
    endTurn();
    return;
  }
});

// ═══ 暴露全局函数 ═══
window.sendMsg = sendMsg;
window.showHeroSelect = showHeroSelect;
window.drawCard = drawCard;
window.useSkill = useSkill;
window.playCard = playCard;
window.endTurn = endTurn;
window.endGame = endGame;
window.closeOverlay = closeOverlay;
window.cycleTheme = cycleTheme;
window.toggleSearch = toggleSearch;
window.scrollToMsg = scrollToMsg;
window.toggleEmojiPanel = toggleEmojiPanel;
window.toggleQuickReply = toggleQuickReply;
window.clearRecords = clearRecords;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.setTheme = setTheme;
window.toggleAnimation = toggleAnimation;
window.toggleSound = toggleSound;
window.exportData = exportData;
window.importData = importData;
window.handleImportFile = handleImportFile;
window.resetData = resetData;
