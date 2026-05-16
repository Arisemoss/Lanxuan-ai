/**
 * 兰轩在线平台 - 主应用脚本
 * API密钥已移至后端，前端通过API端点调用
 */

// ═══ 全局状态 ═══
const S = {
  like: 59,
  mood: '正常',
  history: [],
  busy: false,
  userId: null
};

// ═══ 卡牌定义 ═══
const CARDS = [
  { id: 'sha', name: '杀', type: 'sha', tip: '对目标造成1点伤害', count: 30 },
  { id: 'shan', name: '闪', type: 'shan', tip: '抵消【杀】的效果', count: 15 },
  { id: 'tao', name: '桃', type: 'tao', tip: '恢复1点体力', count: 8 },
  { id: 'wzsy', name: '无中生有', type: 'wzsy', tip: '摸两张牌', count: 4 },
  { id: 'ghcq', name: '过河拆桥', type: 'ghcq', tip: '弃置目标一张手牌', count: 3 },
  { id: 'nmrr', name: '南蛮入侵', type: 'nmrr', tip: '需出【杀】抵挡，否则受1点伤害', count: 3 },
  { id: 'wjqf', name: '万箭齐发', type: 'wjqf', tip: '需出【闪】抵挡，否则受1点伤害', count: 3 }
];

// ═══ 武将定义 ═══
const HEROES = [
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
  }
];

// ═══ 游戏状态 ═══
const G = {
  deck: [],
  turn: 0,
  round: 1,
  active: false,
  player: { hero: null, hp: 4, maxHp: 4, hand: [], hasDrawn: false, shaUsed: false, skillUsed: false, skillState: null, yaJiaoUsed: false },
  ai: { hero: null, hp: 4, maxHp: 4, hand: [], hasDrawn: false, shaUsed: false, skillUsed: false, skillState: null, yaJiaoUsed: false }
};

// ═══ 初始化 ═══
document.addEventListener('DOMContentLoaded', () => {
  initUserId();
  loadUserData();
  initClock();
  renderProfile();
  renderHeroCards();
});

// ═══ 用户ID与数据持久化 ═══
function initUserId() {
  let userId = localStorage.getItem('lanxuan_user_id');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('lanxuan_user_id', userId);
  }
  S.userId = userId;
}

async function saveUserData() {
  const data = {
    like: S.like,
    mood: S.mood,
    history: S.history.slice(-50) // 只保存最近50条
  };
  
  // 本地存储
  localStorage.setItem('lanxuan_data', JSON.stringify(data));
  
  // 后端存储（异步，不阻塞）
  try {
    await fetch('/api/data/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: S.userId, data })
    });
  } catch (e) {
    console.warn('后端存储失败，已使用本地存储');
  }
}

async function loadUserData() {
  // 先尝试本地存储
  const localData = localStorage.getItem('lanxuan_data');
  if (localData) {
    try {
      const data = JSON.parse(localData);
      S.like = data.like || 59;
      S.mood = data.mood || '正常';
      S.history = data.history || [];
      renderProfile();
    } catch (e) {
      console.warn('本地数据解析失败');
    }
  }
  
  // 尝试从后端加载
  try {
    const res = await fetch(`/api/data/load/${S.userId}`);
    if (res.ok) {
      const result = await res.json();
      if (result.data) {
        S.like = result.data.like || S.like;
        S.mood = result.data.mood || S.mood;
        S.history = result.data.history || S.history;
        renderProfile();
      }
    }
  } catch (e) {
    // 后端不可用，继续使用本地数据
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
  document.getElementById('likeNum').textContent = S.like;
  const bar = document.getElementById('likeBar');
  bar.style.width = S.like + '%';
  
  // 根据好感度设置颜色
  if (S.like >= 80) bar.style.background = 'var(--green)';
  else if (S.like >= 60) bar.style.background = 'var(--accent)';
  else bar.style.background = 'var(--text-3)';
  
  // 等级
  const tier = getTier(S.like);
  document.getElementById('tierName').textContent = tier.name;
  document.getElementById('tierBadge').textContent = tier.name;
  
  // 情绪
  const moodDot = document.getElementById('moodDot');
  const moodText = document.getElementById('moodText');
  moodText.textContent = S.mood;
  moodDot.className = 'mood-dot';
  if (['不爽', '困倦'].includes(S.mood)) moodDot.classList.add('negative');
  else if (S.mood === '正常') moodDot.classList.add('neutral');
}

function getTier(like) {
  if (like >= 90) return { name: '死基友', color: '#22c55e' };
  if (like >= 80) return { name: '铁哥们', color: '#22c55e' };
  if (like >= 70) return { name: '挚友', color: '#f59e0b' };
  if (like >= 60) return { name: '好朋友', color: '#f59e0b' };
  return { name: '普通舍友', color: '#71717a' };
}

// ═══ 消息处理 ═══
function addMsg(type, text) {
  const scroll = document.getElementById('chatScroll');
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.textContent = text;
  scroll.appendChild(div);
  scroll.scrollTop = scroll.scrollHeight;
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
  // 困倦相关
  if (lower.includes('睡觉') || lower.includes('困') || lower.includes('晚安') || lower.includes('累')) {
    S.mood = '困倦';
  } 
  // 兴奋相关
  else if (lower.includes('三国杀') || lower.includes('游戏') || lower.includes('玩') || lower.includes('来一局')) {
    S.mood = '兴奋';
  } 
  // 不爽相关
  else if (lower.includes('烦') || lower.includes('讨厌') || lower.includes('滚') || lower.includes('去死') || lower.includes('白痴')) {
    S.mood = '不爽';
  } 
  // 开心相关
  else if (lower.includes('开心') || lower.includes('哈哈') || lower.includes('笑') || lower.includes('棒') || lower.includes('厉害')) {
    S.mood = '开心';
  } 
  // 保持当前情绪或恢复正常
  else {
    S.mood = '正常';
  }
}

// ═══ API调用（密钥已隐藏在后端） ═══
async function callAI(userText) {
  const gameState = {
    like: S.like,
    mood: S.mood,
    inGame: G.active,
    playerHero: G.player.hero?.name,
    aiHero: G.ai.hero?.name,
    round: G.round
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: S.history,
        gameState
      })
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    return data.reply || generateFallbackReply();

  } catch (error) {
    console.error('Chat error:', error);
    return generateFallbackReply();
  }
}

function generateFallbackReply() {
  const fallbacks = [
    '哦↗<好感变化:0>',
    '嗯...<好感变化:0>',
    '行吧<好感变化:0>',
    '切<好感变化:0>',
    '你说啥？<好感变化:0>',
    '别吵，困了。<好感变化:0>',
    '就这？<好感变化:0>'
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ═══ 发送消息 ═══
async function sendMsg() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || S.busy) return;
  
  input.value = '';
  S.busy = true;
  
  addMsg('u', text);
  updateMood(text);
  S.history.push({ role: 'user', content: text });
  
  const typingEl = showTyping();
  const reply = await callAI(text);
  if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
  
  // 解析好感度变化
  const match = reply.match(/<好感变化:([+-]?\d+)>/);
  let cleanReply = reply;
  if (match) {
    S.like = Math.max(0, Math.min(100, S.like + parseInt(match[1])));
    cleanReply = reply.replace(match[0], '').trim();
    renderProfile();
  }
  
  addMsg('a', cleanReply);
  S.history.push({ role: 'assistant', content: cleanReply });
  S.busy = false;
  
  // 保存数据
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
  if (S.busy) return;
  document.getElementById('chatPanel').classList.add('hidden');
  document.getElementById('heroSelectScreen').classList.add('active');
}

function renderHeroCards() {
  const container = document.getElementById('hsCards');
  if (!container) return;
  container.innerHTML = '';
  
  HEROES.forEach(h => {
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
    container.appendChild(card);
  });
}

function selectHero(heroId) {
  const hero = HEROES.find(h => h.id === heroId);
  G.player.hero = hero;
  
  const aiPool = HEROES.filter(h => h.id !== heroId);
  G.ai.hero = aiPool[Math.floor(Math.random() * aiPool.length)];
  
  document.getElementById('heroSelectScreen').classList.remove('active');
  document.getElementById('gameBoard').classList.add('active');
  
  document.getElementById('playerAvatar').textContent = hero.char;
  document.getElementById('playerAvatar').style.color = hero.color;
  document.getElementById('playerHeroTag').textContent = hero.name;
  
  document.getElementById('aiAvatar').textContent = G.ai.hero.char;
  document.getElementById('aiAvatar').style.color = G.ai.hero.color;
  document.getElementById('aiHeroTag').textContent = G.ai.hero.name;
  document.getElementById('aiNameText').textContent = '兰轩（' + G.ai.hero.name + '）';
  
  initGame();
}

// ═══ 游戏逻辑 ═══
function buildDeck() {
  const deck = [];
  CARDS.forEach(t => {
    for (let i = 0; i < t.count; i++) {
      deck.push({ ...t });
    }
  });
  // 洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function drawFromDeck(n) {
  const result = [];
  for (let i = 0; i < n; i++) {
    if (!G.deck.length) G.deck = buildDeck();
    result.push(G.deck.pop());
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

function initGame() {
  G.deck = buildDeck();
  G.turn = 0;
  G.round = 1;
  
  G.player = {
    ...G.player,
    hp: G.player.hero.hp,
    maxHp: G.player.hero.hp,
    hand: drawFromDeck(4).map(assignColor),
    hasDrawn: false,
    shaUsed: false,
    skillUsed: false,
    skillState: null,
    yaJiaoUsed: false
  };
  
  G.ai = {
    ...G.ai,
    hp: G.ai.hero.hp,
    maxHp: G.ai.hero.hp,
    hand: drawFromDeck(4).map(assignColor),
    hasDrawn: false,
    shaUsed: false,
    skillUsed: false,
    skillState: null,
    yaJiaoUsed: false
  };
  
  G.active = true;
  
  document.getElementById('gameLog').innerHTML = '';
  addLog('══ 对局开始 ══', 'log-turn');
  addLog('你使用：' + G.player.hero.name + '（' + G.player.hero.title + '）', 'log-skill');
  addLog('兰轩使用：' + G.ai.hero.name + '（' + G.ai.hero.title + '）', 'log-skill');
  addLog('你的手牌: ' + G.player.hand.map(c => c.name).join(' / '), 'log-card');
  addLog('── 你的回合 ──', 'log-turn');
  
  document.getElementById('playText').textContent = '对局开始！你先手。';
  
  S.mood = '兴奋';
  renderProfile();
  renderGame();
}

function renderGame() {
  // HP显示
  const renderHp = (who, id) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    for (let i = 0; i < who.maxHp; i++) {
      const dot = document.createElement('div');
      dot.className = 'hp-dot' + (i < who.hp ? ' filled' : ' empty') + (who.hp <= 1 && i < who.hp ? ' danger' : '');
      el.appendChild(dot);
    }
  };
  
  renderHp(G.player, 'playerHp');
  renderHp(G.ai, 'aiHp');
  
  document.getElementById('aiHandCount').textContent = G.ai.hand.length;
  document.getElementById('playerHandCount').textContent = G.player.hand.length;
  
  // AI手牌背面
  const backs = document.getElementById('aiHandBacks');
  backs.innerHTML = '';
  for (let i = 0; i < Math.min(G.ai.hand.length, 10); i++) {
    const b = document.createElement('div');
    b.className = 'card-back';
    backs.appendChild(b);
  }
  
  // 玩家手牌
  const hand = document.getElementById('playerHand');
  hand.innerHTML = '';
  const isPlayerTurn = G.active && G.turn === 0;
  
  G.player.hand.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'card ' + c.type + (isPlayerTurn ? '' : ' disabled');
    
    // 技能提示
    let tip = c.tip;
    if (G.player.hero?.id === 'guanyu' && c.color === 'red' && c.type === 'shan') {
      tip = '【武圣】可当作【杀】使用';
    }
    if (G.player.hero?.id === 'zhaoyun' && c.type === 'sha') {
      tip = c.tip + ' | 【龙胆】可当【闪】';
    }
    if (G.player.hero?.id === 'zhaoyun' && c.type === 'shan') {
      tip = c.tip + ' | 【龙胆】可当【杀】';
    }
    
    d.setAttribute('data-tip', tip + (c.color === 'red' ? ' [红]' : ' [黑]'));
    d.innerHTML = '<div class="card-name">' + c.name + '</div><div class="card-type-label">' + (['sha', 'shan', 'tao'].includes(c.type) ? '基本' : '锦囊') + '</div>';
    d.style.animationDelay = (i * .04) + 's';
    d.style.animation = 'cardDeal .3s ease forwards';
    d.onclick = () => playCard(i);
    hand.appendChild(d);
  });
  
  // 回合状态
  document.getElementById('aiZone').className = 'gb-zone gb-ai' + (G.active && G.turn === 1 ? ' active-turn' : '');
  document.getElementById('playerZone').className = 'gb-zone gb-player' + (isPlayerTurn ? ' active-turn' : '');
  document.getElementById('gbPhase').textContent = G.active ? (G.turn === 0 ? '你的回合 · 出牌阶段' : '兰轩的回合 · 思考中...') : '等待开始';
  document.getElementById('gbRound').textContent = G.active ? '回合 ' + G.round : '三国杀 1v1';
  document.getElementById('gbDeck').textContent = '牌堆 ' + G.deck.length;
  document.getElementById('deckCount').textContent = G.deck.length;
  
  // 按钮状态
  const canAct = isPlayerTurn;
  document.getElementById('drawBtn').disabled = !canAct || G.player.hasDrawn;
  document.getElementById('endBtn').disabled = !canAct;
  document.getElementById('exitBtn').disabled = !G.active;
  
  // 技能按钮
  const skillBtn = document.getElementById('skillBtn');
  if (G.player.hero) {
    const activeSkill = G.player.hero.skills.find(s => s.type === 'active');
    if (activeSkill) {
      skillBtn.textContent = activeSkill.name;
      skillBtn.disabled = !canAct || G.player.skillUsed;
      skillBtn.title = activeSkill.desc;
    } else {
      skillBtn.textContent = G.player.hero.skills[0].name + '（被动）';
      skillBtn.disabled = true;
      skillBtn.title = G.player.hero.skills[0].desc;
    }
  }
  
  // 右侧面板
  document.getElementById('rDot').className = 'r-header-dot' + (G.active ? ' active' : '');
  document.getElementById('rTitle').textContent = G.active ? '对局记录' : '三国杀';
  document.getElementById('gamePreview').className = 'game-preview' + (G.active ? ' hidden' : '');
  document.getElementById('gameLog').style.display = G.active ? 'block' : 'none';
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

function damage(who, n) {
  who.hp = Math.max(0, who.hp - n);
  const zone = who === G.player ? 'playerZone' : 'aiZone';
  document.getElementById(zone).classList.add('shake', 'dmg-flash');
  setTimeout(() => document.getElementById(zone).classList.remove('shake', 'dmg-flash'), 400);
  renderGame();
}

function heal(who, n) {
  who.hp = Math.min(who.maxHp, who.hp + n);
  const zone = who === G.player ? 'playerZone' : 'aiZone';
  document.getElementById(zone).classList.add('heal-glow');
  setTimeout(() => document.getElementById(zone).classList.remove('heal-glow'), 500);
  renderGame();
}

function checkEnd() {
  if (G.ai.hp <= 0) { endGame('win'); return true; }
  if (G.player.hp <= 0) { endGame('lose'); return true; }
  return false;
}

function endGame(reason) {
  G.active = false;
  document.getElementById('chatPanel').classList.remove('hidden');
  document.getElementById('gameBoard').classList.remove('active');
  document.getElementById('heroSelectScreen').classList.remove('active');
  
  if (reason === 'win') {
    addMsg('a', '（瘫在椅子上）行...你赢了...下次再来。');
    S.like = Math.min(100, S.like + 2);
    addLog('你赢了！好感度 +2', 'log-heal');
    showOverlay('你赢了', '兰轩不服气地哼了一声，但嘴角带笑。<br>好感度 +2');
  } else if (reason === 'lose') {
    addMsg('a', '（得意地靠在椅背上）就这？再来一局？');
    S.like = Math.min(100, S.like + 1);
    addLog('兰轩赢了，好感度 +1', 'log-turn');
    showOverlay('兰轩赢了', '他得意洋洋地看着你。<br>好感度 +1');
  } else if (reason === 'surrender') {
    addMsg('a', '（挑眉）哦↗？这就投了？');
    addLog('你投降了', 'log-dmg');
    showOverlay('你投降了', '兰轩一脸不屑地看着你。');
  } else {
    addMsg('a', '（不爽）打到一半跑了？下次别找我打。');
    addLog('对局中断', 'log-dmg');
  }
  
  S.mood = '正常';
  renderProfile();
  renderGame();
  saveUserData();
}

// ═══ 摸牌 ═══
function drawCard() {
  if (!G.active || G.turn !== 0 || G.player.hasDrawn) return;
  const drawn = drawFromDeck(2).map(assignColor);
  G.player.hand.push(...drawn);
  G.player.hasDrawn = true;
  addLog('你摸了: ' + drawn.map(c => c.name).join(', '), 'log-card');
  G.player.skillState = null;
  renderGame();
}

// ═══ 涯角触发 ═══
function triggerYaJiao(who) {
  if (who.hero?.id === 'zhaoyun' && !who.yaJiaoUsed) {
    const extra = drawFromDeck(1).map(assignColor);
    who.hand.push(...extra);
    who.yaJiaoUsed = true;
    const name = who === G.player ? '你' : '兰轩';
    addLog('【涯角】' + name + '额外摸了一张牌', 'log-skill');
  }
}

// ═══ 防御辅助函数 ═══
function aiDefendSha(needShan) {
  let shanUsed = 0;
  for (let s = 0; s < needShan; s++) {
    const si = G.ai.hand.findIndex(c => c.type === 'shan');
    const shaAsShan = G.ai.hero?.id === 'zhaoyun' ? G.ai.hand.findIndex(c => c.type === 'sha') : -1;
    if (si >= 0) {
      G.ai.hand.splice(si, 1);
      shanUsed++;
      triggerYaJiao(G.ai);
    } else if (shaAsShan >= 0) {
      G.ai.hand.splice(shaAsShan, 1);
      shanUsed++;
      addLog('【龙胆】兰轩将【杀】当作【闪】打出', 'log-skill');
      triggerYaJiao(G.ai);
    }
  }
  return shanUsed;
}

function playerDefendSha(needShan) {
  let shanUsed = 0;
  for (let s = 0; s < needShan; s++) {
    const si = G.player.hand.findIndex(c => c.type === 'shan');
    const shaAsShan = G.player.hero?.id === 'zhaoyun' ? G.player.hand.findIndex(c => c.type === 'sha') : -1;
    if (si >= 0) {
      G.player.hand.splice(si, 1);
      shanUsed++;
      triggerYaJiao(G.player);
    } else if (shaAsShan >= 0) {
      G.player.hand.splice(shaAsShan, 1);
      shanUsed++;
      addLog('【龙胆】你将【杀】当作【闪】打出', 'log-skill');
      triggerYaJiao(G.player);
    }
  }
  return shanUsed;
}

function aiDefendNanMan() {
  const shaIdx = G.ai.hand.findIndex(c => c.type === 'sha');
  const shanAsSha = G.ai.hero?.id === 'zhaoyun' ? G.ai.hand.findIndex(c => c.type === 'shan') : -1;
  if (shaIdx >= 0) {
    G.ai.hand.splice(shaIdx, 1);
    addLog('兰轩打出【杀】抵挡', 'log-action');
    triggerYaJiao(G.ai);
    return true;
  } else if (shanAsSha >= 0) {
    G.ai.hand.splice(shanAsSha, 1);
    addLog('【龙胆】兰轩将【闪】当作【杀】抵挡', 'log-skill');
    triggerYaJiao(G.ai);
    return true;
  }
  return false;
}

function aiDefendWanJian() {
  const shanIdx = G.ai.hand.findIndex(c => c.type === 'shan');
  const shaAsShan = G.ai.hero?.id === 'zhaoyun' ? G.ai.hand.findIndex(c => c.type === 'sha') : -1;
  if (shanIdx >= 0) {
    G.ai.hand.splice(shanIdx, 1);
    addLog('兰轩打出【闪】躲避', 'log-action');
    triggerYaJiao(G.ai);
    return true;
  } else if (shaAsShan >= 0) {
    G.ai.hand.splice(shaAsShan, 1);
    addLog('【龙胆】兰轩将【杀】当作【闪】躲避', 'log-skill');
    triggerYaJiao(G.ai);
    return true;
  }
  return false;
}

function playerDefendNanMan() {
  const shaIdx = G.player.hand.findIndex(c => c.type === 'sha');
  const shanAsSha = G.player.hero?.id === 'zhaoyun' ? G.player.hand.findIndex(c => c.type === 'shan') : -1;
  if (shaIdx >= 0) {
    G.player.hand.splice(shaIdx, 1);
    addLog('你打出【杀】抵挡', 'log-action');
    triggerYaJiao(G.player);
    return true;
  } else if (shanAsSha >= 0) {
    G.player.hand.splice(shanAsSha, 1);
    addLog('【龙胆】你将【闪】当作【杀】抵挡', 'log-skill');
    triggerYaJiao(G.player);
    return true;
  }
  return false;
}

function playerDefendWanJian() {
  const shanIdx = G.player.hand.findIndex(c => c.type === 'shan');
  const shaAsShan = G.player.hero?.id === 'zhaoyun' ? G.player.hand.findIndex(c => c.type === 'sha') : -1;
  if (shanIdx >= 0) {
    G.player.hand.splice(shanIdx, 1);
    addLog('你打出【闪】躲避', 'log-action');
    triggerYaJiao(G.player);
    return true;
  } else if (shaAsShan >= 0) {
    G.player.hand.splice(shaAsShan, 1);
    addLog('【龙胆】你将【杀】当作【闪】躲避', 'log-skill');
    triggerYaJiao(G.player);
    return true;
  }
  return false;
}

// ═══ 集智触发 ═══
function triggerJiZhi(who) {
  if (who.hero?.id === 'huangyueying') {
    const extra = drawFromDeck(1).map(assignColor);
    who.hand.push(...extra);
    const name = who === G.player ? '你' : '兰轩';
    addLog('【集智】' + name + '额外摸了一张【' + extra[0].name + '】', 'log-skill');
  }
}

// ═══ 技能使用 ═══
function useSkill() {
  if (!G.active || G.turn !== 0 || G.player.skillUsed || !G.player.hero) return;
  
  const hero = G.player.hero;
  const activeSkill = hero.skills.find(s => s.type === 'active');
  if (!activeSkill) return;

  switch (hero.id) {
    case 'guanyu': {
      const redCards = G.player.hand.filter(c => c.color === 'red');
      if (redCards.length === 0) { addLog('你没有红色牌可以弃置', ''); return; }
      const idx = G.player.hand.indexOf(redCards[0]);
      G.player.hand.splice(idx, 1);
      G.player.skillUsed = true;
      G.player.skillState = 'yijue';
      addLog('【义绝】关羽弃置一张红色牌，兰轩本回合无法使用【闪】！', 'log-skill');
      addMsg('a', '（咬牙）好你个关羽！');
      break;
    }
    case 'zhangfei': {
      if (G.player.hand.length > 0) { addLog('【怒吼】需要手牌为0才能发动', ''); return; }
      G.player.skillUsed = true;
      damage(G.ai, 1);
      addLog('【怒吼】张飞手牌为0，对兰轩造成1点伤害！', 'log-skill');
      addMsg('a', '（被震退）什...什么力气！');
      if (checkEnd()) return;
      break;
    }
    case 'huangyueying': {
      const wzIdx = G.player.hand.findIndex(c => c.type === 'wzsy');
      if (wzIdx < 0) { addLog('【奇才】需要一张锦囊牌', ''); return; }
      G.player.hand.splice(wzIdx, 1);
      const extra = drawFromDeck(2).map(assignColor);
      G.player.hand.push(...extra);
      G.player.skillUsed = true;
      addLog('【集智】黄月英使用锦囊，额外摸一张牌', 'log-skill');
      triggerJiZhi(G.player);
      addLog('摸到: ' + extra.map(c => c.name).join(', '), 'log-card');
      break;
    }
    case 'lvbu': {
      if (G.player.hand.length === 0) { addLog('【利驭】没有手牌可以弃置', ''); return; }
      const discarded = G.player.hand.splice(0, 1)[0];
      G.player.skillUsed = true;
      addLog('【利驭】吕布弃置【' + discarded.name + '】，视为使用一张【杀】', 'log-skill');
      showPlayedCard({ type: 'sha', name: '杀' }, '吕布发动【利驭】！');
      
      let needShan = G.player.hero.id === 'lvbu' ? 2 : 1;
      let shanUsed = aiDefendSha(needShan);
      if (shanUsed >= needShan) {
        addLog('兰轩打出' + shanUsed + '张【闪】躲避', 'log-action');
        addMsg('a', '（连挡' + shanUsed + '下）还好我闪多！');
      } else {
        damage(G.ai, 1);
        addLog('兰轩无法打出足够的【闪】，受到1点伤害！', 'log-dmg');
        addMsg('a', '（被击退）吕布...果然凶猛！');
      }
      if (checkEnd()) return;
      break;
    }
  }
  renderGame();
}

// ═══ 出牌 ═══
function playCard(idx) {
  if (!G.active || G.turn !== 0) return;
  const card = G.player.hand[idx];
  if (!card) return;

  // 关羽武圣：红色闪当杀
  if (G.player.hero?.id === 'guanyu' && card.color === 'red' && card.type === 'shan') {
    if (G.player.shaUsed) { addLog('本回合已出过【杀】', ''); return; }
    G.player.hand.splice(idx, 1);
    G.player.shaUsed = true;
    addLog('【武圣】你将红色【闪】当作【杀】使用！', 'log-skill');
    showPlayedCard({ type: 'sha', name: '杀' }, '关羽发动【武圣】！');
    triggerYaJiao(G.player);
    
    let needShan = G.player.hero.id === 'lvbu' ? 2 : 1;
    if (G.player.skillState === 'yijue') {
      addLog('【义绝】效果生效，兰轩无法使用【闪】！', 'log-skill');
      damage(G.ai, 1);
      addLog('兰轩受到1点伤害！', 'log-dmg');
      addMsg('a', '（龇牙）嘶...义绝？！');
    } else {
      let shanUsed = aiDefendSha(needShan);
      if (shanUsed >= needShan) {
        addLog('兰轩打出' + shanUsed + '张【闪】躲避', 'log-action');
        addMsg('a', '（随手一挡）就这？');
      } else {
        damage(G.ai, 1);
        addLog('兰轩受到1点伤害！', 'log-dmg');
        addMsg('a', '（龇牙）嘶...武圣？！');
      }
    }
    if (checkEnd()) return;
    renderGame();
    return;
  }

  switch (card.type) {
    case 'sha': {
      if (G.player.shaUsed && G.player.hero.id !== 'zhangfei') { addLog('本回合已出过【杀】', ''); return; }
      G.player.hand.splice(idx, 1);
      G.player.shaUsed = true;
      addLog('你对兰轩使用【杀】！', 'log-card');
      showPlayedCard(card, '你对兰轩使用【杀】！');
      triggerYaJiao(G.player);
      
      let needShan = G.player.hero?.id === 'lvbu' ? 2 : 1;
      if (G.player.skillState === 'yijue') {
        addLog('【义绝】效果生效，兰轩无法使用【闪】！', 'log-skill');
        damage(G.ai, 1);
        addLog('兰轩受到1点伤害！', 'log-dmg');
        addMsg('a', '（龇牙）嘶...义绝？！');
      } else {
        let shanUsed = aiDefendSha(needShan);
        if (shanUsed >= needShan) {
          addLog('兰轩打出' + shanUsed + '张【闪】躲避', 'log-action');
          addMsg('a', '（随手一挡）就这？');
        } else {
          damage(G.ai, 1);
          addLog('兰轩受到1点伤害！', 'log-dmg');
          addMsg('a', '（龇牙）嘶...你来真的？');
        }
      }
      break;
    }
    case 'shan': {
      if (G.player.hero?.id === 'zhaoyun') {
        if (G.player.shaUsed) { addLog('本回合已出过【杀】', ''); return; }
        G.player.hand.splice(idx, 1);
        G.player.shaUsed = true;
        addLog('【龙胆】你将【闪】当作【杀】使用！', 'log-skill');
        showPlayedCard({ type: 'sha', name: '杀' }, '赵云发动【龙胆】！');
        triggerYaJiao(G.player);
        
        if (G.player.skillState === 'yijue') {
          addLog('【义绝】效果生效，兰轩无法使用【闪】！', 'log-skill');
          damage(G.ai, 1);
          addLog('兰轩受到1点伤害！', 'log-dmg');
          addMsg('a', '（龇牙）嘶...！');
        } else {
          let shanUsed = aiDefendSha(1);
          if (shanUsed >= 1) {
            addLog('兰轩打出【闪】躲避', 'log-action');
            addMsg('a', '（随手一挡）就这？');
          } else {
            damage(G.ai, 1);
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
      if (G.player.hp >= G.player.maxHp) { addLog('血量已满', ''); return; }
      G.player.hand.splice(idx, 1);
      heal(G.player, 1);
      showPlayedCard(card, '你使用【桃】恢复1点体力');
      addLog('你使用【桃】恢复1点体力', 'log-heal');
      break;
    }
    case 'wzsy': {
      G.player.hand.splice(idx, 1);
      const ex = drawFromDeck(2).map(assignColor);
      G.player.hand.push(...ex);
      showPlayedCard(card, '你使用【无中生有】摸了2张牌');
      addLog('你使用【无中生有】摸了' + ex.map(c => c.name).join(' / '), 'log-card');
      if (G.player.hero?.id === 'huangyueying') triggerJiZhi(G.player);
      break;
    }
    case 'ghcq': {
      G.player.hand.splice(idx, 1);
      if (G.ai.hand.length > 0) {
        const ri = Math.floor(Math.random() * G.ai.hand.length);
        const rm = G.ai.hand.splice(ri, 1)[0];
        showPlayedCard(card, '你拆掉了兰轩的【' + rm.name + '】');
        addLog('你使用【过河拆桥】拆掉了兰轩的【' + rm.name + '】', 'log-card');
        addMsg('a', '（护住手牌）你——！');
      } else {
        showPlayedCard(card, '兰轩没有手牌可拆');
        addLog('兰轩没有手牌可拆', '');
      }
      if (G.player.hero?.id === 'huangyueying') triggerJiZhi(G.player);
      break;
    }
    case 'nmrr': {
      G.player.hand.splice(idx, 1);
      showPlayedCard(card, '你使用【南蛮入侵】！');
      addLog('你使用【南蛮入侵】！', 'log-card');
      if (aiDefendNanMan()) {
        addMsg('a', '（不屑）就这？');
      } else {
        damage(G.ai, 1);
        addLog('兰轩无法抵挡，受到1点伤害！', 'log-dmg');
        addMsg('a', '（被击中）嘶...！');
      }
      if (G.player.hero?.id === 'huangyueying') triggerJiZhi(G.player);
      break;
    }
    case 'wjqf': {
      G.player.hand.splice(idx, 1);
      showPlayedCard(card, '你使用【万箭齐发】！');
      addLog('你使用【万箭齐发】！', 'log-card');
      if (aiDefendWanJian()) {
        addMsg('a', '（闪开）切，没中。');
      } else {
        damage(G.ai, 1);
        addLog('兰轩无法抵挡，受到1点伤害！', 'log-dmg');
        addMsg('a', '（被射中）啊——！');
      }
      if (G.player.hero?.id === 'huangyueying') triggerJiZhi(G.player);
      break;
    }
  }
  
  if (checkEnd()) return;
  renderGame();
}

// ═══ 结束回合 ═══
function endTurn() {
  if (!G.active || G.turn !== 0) return;
  
  G.player.hasDrawn = false;
  G.player.shaUsed = false;
  G.player.skillState = null;
  G.player.yaJiaoUsed = false;
  G.turn = 1;
  G.round++;
  
  addLog('── 兰轩的回合 ──', 'log-turn');
  document.getElementById('playText').textContent = '兰轩正在思考...';
  renderGame();
  setTimeout(aiTurn, 700);
}

// ═══ AI回合（智能优化版） ═══
function aiTurn() {
  if (!G.active) return;
  
  const drawn = drawFromDeck(2).map(assignColor);
  G.ai.hand.push(...drawn);
  G.ai.hasDrawn = true;
  addLog('兰轩摸了牌', 'log-card');

  // AI智能策略 - 根据情况选择最优策略
  let actionDelay = 0;
  
  setTimeout(() => {
    // AI智能技能使用
    useAISmartSkills();
    
    // 执行AI出牌策略
    executeSmartAIActions();
  }, 800);
}

function useAISmartSkills() {
  // 关羽义绝 - 有红色牌且准备杀人时使用
  if (G.ai.hero?.id === 'guanyu' && !G.ai.skillUsed) {
    const hasSha = G.ai.hand.some(c => c.type === 'sha');
    const redCards = G.ai.hand.filter(c => c.color === 'red');
    if (hasSha && redCards.length >= 1) {
      const idx = G.ai.hand.indexOf(redCards[0]);
      G.ai.hand.splice(idx, 1);
      G.ai.skillUsed = true;
      G.ai.skillState = 'yijue';
      addLog('【义绝】兰轩弃置红色牌，你本回合无法使用【闪】！', 'log-skill');
      addMsg('a', '（冷笑）武圣在此，休想闪避！');
    }
  }
  
  // 张飞怒吼 - 手牌为0且有机会时使用
  if (G.ai.hero?.id === 'zhangfei' && !G.ai.skillUsed && G.ai.hand.length === 0 && G.player.hp <= 2) {
    G.ai.skillUsed = true;
    damage(G.player, 1);
    addLog('【怒吼】兰轩手牌为0，对你造成1点伤害！', 'log-skill');
    addMsg('a', '（大喝）接俺一吼！');
    if (checkEnd()) return;
  }
}

function executeSmartAIActions() {
  let acted = true;
  let actionsCount = 0;
  const maxActions = 6; // 限制AI行动次数
  
  const executeNextAction = () => {
    if (!G.active || actionsCount >= maxActions) {
      finishAITurn();
      return;
    }
    
    acted = false;
    
    // 策略1：血量低时优先治疗
    if (G.ai.hp <= 2 && G.ai.hp < G.ai.maxHp) {
      const t = G.ai.hand.findIndex(c => c.type === 'tao');
      if (t >= 0) {
        G.ai.hand.splice(t, 1);
        heal(G.ai, 1);
        showPlayedCard(CARDS[2], '兰轩使用【桃】恢复体力');
        addLog('兰轩使用【桃】恢复体力', 'log-heal');
        addMsg('a', '（得意）想杀我没那么容易。');
        acted = true;
        actionsCount++;
      }
    }
    
    // 策略2：有AOE牌时优先使用
    if (!acted) {
      const nm = G.ai.hand.findIndex(c => c.type === 'nmrr');
      const wj = G.ai.hand.findIndex(c => c.type === 'wjqf');
      
      if (nm >= 0) {
        G.ai.hand.splice(nm, 1);
        showPlayedCard(CARDS[5], '兰轩使用【南蛮入侵】！');
        addLog('兰轩使用【南蛮入侵】！', 'log-dmg');
        if (!playerDefendNanMan()) {
          damage(G.player, 1);
          addLog('你无法抵挡，受到1点伤害！', 'log-dmg');
        }
        if (G.ai.hero?.id === 'huangyueying') triggerJiZhi(G.ai);
        if (checkEnd()) return;
        acted = true;
        actionsCount++;
      } else if (wj >= 0) {
        G.ai.hand.splice(wj, 1);
        showPlayedCard(CARDS[6], '兰轩使用【万箭齐发】！');
        addLog('兰轩使用【万箭齐发】！', 'log-dmg');
        if (!playerDefendWanJian()) {
          damage(G.player, 1);
          addLog('你无法抵挡，受到1点伤害！', 'log-dmg');
        }
        if (G.ai.hero?.id === 'huangyueying') triggerJiZhi(G.ai);
        if (checkEnd()) return;
        acted = true;
        actionsCount++;
      }
    }
    
    // 策略3：然后出杀
    if (!acted) {
      const s = G.ai.hand.findIndex(c => c.type === 'sha');
      const canUseSha = (!G.ai.shaUsed || G.ai.hero?.id === 'zhangfei');
      if (s >= 0 && canUseSha) {
        G.ai.hand.splice(s, 1);
        G.ai.shaUsed = true;
        showPlayedCard(CARDS[0], '兰轩对你使用【杀】！');
        addLog('兰轩对你使用【杀】！', 'log-dmg');
        triggerYaJiao(G.ai);
        
        let needShan = G.ai.hero?.id === 'lvbu' ? 2 : 1;
        
        if (G.ai.skillState === 'yijue') {
          addLog('【义绝】效果生效，你无法使用【闪】！', 'log-skill');
          damage(G.player, 1);
          addLog('你受到1点伤害！', 'log-dmg');
          addMsg('a', '（得意）义绝之下，无处可逃！');
        } else {
          let shanUsed = playerDefendSha(needShan);
          if (shanUsed >= needShan) {
            addLog('你打出' + shanUsed + '张【闪】躲避', 'log-action');
            addMsg('a', '（撇嘴）运气不错。');
          } else {
            damage(G.player, 1);
            addLog('你受到1点伤害！', 'log-dmg');
            addMsg('a', '（得意）中了吧！');
          }
        }
        if (checkEnd()) return;
        acted = true;
        actionsCount++;
      }
    }
    
    // 策略4：过河拆桥 - 拆对方关键牌
    if (!acted && G.player.hand.length > 0) {
      const gh = G.ai.hand.findIndex(c => c.type === 'ghcq');
      if (gh >= 0) {
        G.ai.hand.splice(gh, 1);
        // 智能选择要拆的牌
        let targetIdx = 0;
        const shaIdx = G.player.hand.findIndex(c => c.type === 'sha');
        if (shaIdx >= 0) targetIdx = shaIdx;
        
        const rm = G.player.hand.splice(targetIdx, 1)[0];
        showPlayedCard(CARDS[4], '兰轩拆掉了你的【' + rm.name + '】');
        addLog('兰轩使用【过河拆桥】拆掉了你的【' + rm.name + '】', 'log-dmg');
        addMsg('a', '（坏笑）嘿嘿。');
        if (G.ai.hero?.id === 'huangyueying') triggerJiZhi(G.ai);
        acted = true;
        actionsCount++;
      }
    }
    
    // 策略5：无中生有 - 补充手牌
    if (!acted) {
      const wz = G.ai.hand.findIndex(c => c.type === 'wzsy');
      if (wz >= 0) {
        G.ai.hand.splice(wz, 1);
        const ex = drawFromDeck(2).map(assignColor);
        G.ai.hand.push(...ex);
        showPlayedCard(CARDS[3], '兰轩使用【无中生有】');
        addLog('兰轩使用【无中生有】摸了牌', 'log-card');
        if (G.ai.hero?.id === 'huangyueying') triggerJiZhi(G.ai);
        acted = true;
        actionsCount++;
      }
    }
    
    // 策略6：吕布利驭 - 最后手段
    if (!acted && G.ai.hero?.id === 'lvbu' && !G.ai.skillUsed && G.ai.hand.length > 0) {
      const discarded = G.ai.hand.splice(0, 1)[0];
      G.ai.skillUsed = true;
      addLog('【利驭】兰轩弃置【' + discarded.name + '】，视为使用一张【杀】', 'log-skill');
      triggerYaJiao(G.ai);
      
      let shanUsed = playerDefendSha(2);
      if (shanUsed >= 2) {
        addLog('你打出两张【闪】躲避', 'log-action');
      } else {
        damage(G.player, 1);
        addLog('你受到1点伤害！', 'log-dmg');
        addMsg('a', '（冷哼）吕布之威，岂是尔等可挡。');
      }
      if (checkEnd()) return;
      acted = true;
      actionsCount++;
    }
    
    if (acted) {
      setTimeout(executeNextAction, 700);
    } else {
      finishAITurn();
    }
  };
  
  executeNextAction();
}

function finishAITurn() {
  G.ai.hasDrawn = false;
  G.ai.shaUsed = false;
  G.ai.skillState = null;
  G.ai.yaJiaoUsed = false;
  G.turn = 0;
  
  addLog('── 你的回合 ──', 'log-turn');
  document.getElementById('playText').textContent = '你的回合，出牌吧！';
  
  if (G.deck.length < 5) G.deck = buildDeck();
  renderGame();
}

// ═══ 弹窗 ═══
function showOverlay(title, sub) {
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlaySub').innerHTML = sub;
  document.getElementById('overlay').classList.add('show');
}

function closeOverlay() {
  document.getElementById('overlay').classList.remove('show');
}

document.getElementById('overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeOverlay();
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
