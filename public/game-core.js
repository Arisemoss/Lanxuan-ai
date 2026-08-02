/**
 * 三国杀游戏核心逻辑
 * 实现回合制循环、摸牌、出牌、弃牌等阶段
 */

class GameCore {
  constructor() {
    this.deck = [];
    this.turn = 0;
    this.round = 1;
    this.phase = 'none';
    this.active = false;
    this.player = null;
    this.ai = null;
  }

  initGame(playerHero, aiHero) {
    this.deck = this.buildDeck();
    this.turn = 0;
    this.round = 1;
    this.active = true;
    this.phase = 'draw';

    this.player = {
      hero: playerHero,
      hp: playerHero.hp,
      maxHp: playerHero.hp,
      hand: [],
      hasDrawn: false,
      shaUsed: false,
      discardCount: 0
    };

    this.ai = {
      hero: aiHero,
      hp: aiHero.hp,
      maxHp: aiHero.hp,
      hand: [],
      hasDrawn: false,
      shaUsed: false,
      discardCount: 0
    };

    this.player.hand = this.drawCards(4);
    this.ai.hand = this.drawCards(4);

    this.syncToGlobalState();
    return this.getGameState();
  }

  buildDeck() {
    const cards = [
      { type: 'sha', name: '杀', count: 30 },
      { type: 'shan', name: '闪', count: 15 },
      { type: 'tao', name: '桃', count: 8 }
    ];
    const deck = [];
    cards.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        deck.push({ ...c });
      }
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  drawCards(n) {
    const cards = [];
    for (let i = 0; i < n; i++) {
      if (this.deck.length === 0) {
        this.deck = this.buildDeck();
      }
      cards.push(this.deck.pop());
    }
    return cards;
  }

  startTurn() {
    if (!this.active) return null;
    this.phase = 'draw';
    this.syncToGlobalState();
    return this.getGameState();
  }

  drawPhase() {
    if (!this.active || this.phase !== 'draw') return null;
    const current = this.getCurrentPlayer();
    if (current.hasDrawn) return null;

    current.hasDrawn = true;
    const drawn = this.drawCards(2);
    current.hand.push(...drawn);

    this.phase = 'play';
    this.syncToGlobalState();
    return {
      ...this.getGameState(),
      drawnCards: drawn,
      action: 'drawPhase'
    };
  }

  playPhase() {
    if (!this.active || this.phase !== 'play') return null;
    this.syncToGlobalState();
    return this.getGameState();
  }

  useSha(target) {
    if (!this.active || this.phase !== 'play') return null;
    const attacker = this.getCurrentPlayer();

    const shaIdx = attacker.hand.findIndex(c => c.type === 'sha');
    if (shaIdx === -1) return { success: false, reason: '没有杀' };

    if (attacker.shaUsed && attacker.hero.id !== 'zhangfei') {
      return { success: false, reason: '本回合已出过杀' };
    }

    attacker.hand.splice(shaIdx, 1);
    attacker.shaUsed = true;

    const defender = target === 'ai' ? this.ai : this.player;
    const shanIdx = defender.hand.findIndex(c => c.type === 'shan');

    if (shanIdx >= 0) {
      defender.hand.splice(shanIdx, 1);
      this.syncToGlobalState();
      return {
        success: true,
        action: 'sha',
        blocked: true,
        defenderCard: '闪',
        target: target
      };
    } else {
      defender.hp--;
      const targetDead = defender.hp <= 0;
      this.syncToGlobalState();
      return {
        success: true,
        action: 'sha',
        blocked: false,
        damage: 1,
        target: target,
        gameOver: targetDead ? this.getWinner() : null
      };
    }
  }

  useTao() {
    if (!this.active || this.phase !== 'play') return null;
    const current = this.getCurrentPlayer();

    const tIdx = current.hand.findIndex(c => c.type === 'tao');
    if (tIdx === -1) return { success: false, reason: '没有桃' };
    if (current.hp >= current.maxHp) return { success: false, reason: '血量已满' };

    current.hand.splice(tIdx, 1);
    current.hp = Math.min(current.maxHp, current.hp + 1);
    this.syncToGlobalState();
    return {
      success: true,
      action: 'tao',
      healed: 1,
      newHp: current.hp
    };
  }

  endTurn() {
    if (!this.active || this.phase !== 'play' && this.phase !== 'discard') return null;

    const current = this.getCurrentPlayer();
    const maxHand = current.hp;
    while (current.hand.length > maxHand) {
      current.hand.pop();
      current.discardCount++;
    }

    current.hasDrawn = false;
    current.shaUsed = false;
    this.turn = this.turn === 0 ? 1 : 0;

    if (this.turn === 0) {
      this.round++;
    }

    this.phase = 'draw';
    this.syncToGlobalState();
    return this.getGameState();
  }

  getCurrentPlayer() {
    return this.turn === 0 ? this.player : this.ai;
  }

  getWinner() {
    if (this.ai.hp <= 0) return 'player';
    if (this.player.hp <= 0) return 'ai';
    return null;
  }

  checkGameEnd() {
    if (this.ai.hp <= 0) {
      this.active = false;
      this.phase = 'ended';
      this.syncToGlobalState();
      return { ended: true, winner: 'player' };
    }
    if (this.player.hp <= 0) {
      this.active = false;
      this.phase = 'ended';
      this.syncToGlobalState();
      return { ended: true, winner: 'ai' };
    }
    return { ended: false };
  }

  syncToGlobalState() {
    if (typeof G !== 'undefined') {
      G.deck = this.deck;
      G.turn = this.turn;
      G.round = this.round;
      G.active = this.active;
      G.player = this.player;
      G.ai = this.ai;
    }
  }

  getGameState() {
    return {
      deck: this.deck,
      turn: this.turn,
      round: this.round,
      phase: this.phase,
      active: this.active,
      player: this.player,
      ai: this.ai,
      isPlayerTurn: this.turn === 0,
      currentPlayer: this.turn === 0 ? 'player' : 'ai',
      winner: this.getWinner()
    };
  }

  resetGame() {
    this.deck = [];
    this.turn = 0;
    this.round = 1;
    this.phase = 'none';
    this.active = false;
    this.player = null;
    this.ai = null;
    this.syncToGlobalState();
  }
}

const gameCore = new GameCore();

function startGame(playerHeroId) {
  const HEROES = typeof HEROES !== 'undefined' ? HEROES : [
    { id: 'guanyu', name: '关羽', hp: 4 },
    { id: 'zhaoyun', name: '赵云', hp: 4 },
    { id: 'zhangfei', name: '张飞', hp: 4 },
    { id: 'huangyueying', name: '黄月英', hp: 3 },
    { id: 'lvbu', name: '吕布', hp: 4 }
  ];

  const playerHero = HEROES.find(h => h.id === playerHeroId);
  if (!playerHero) return null;

  const aiPool = HEROES.filter(h => h.id !== playerHeroId);
  const aiHero = aiPool[Math.floor(Math.random() * aiPool.length)];

  return gameCore.initGame(playerHero, aiHero);
}

function drawCard() {
  return gameCore.drawPhase();
}

function playSha(target = 'ai') {
  return gameCore.useSha(target);
}

function playTao() {
  return gameCore.useTao();
}

function endTurn() {
  return gameCore.endTurn();
}

function getGameState() {
  return gameCore.getGameState();
}

function resetGame() {
  gameCore.resetGame();
}

window.GameCore = GameCore;
window.gameCore = gameCore;
window.startGame = startGame;
window.drawCard = drawCard;
window.playSha = playSha;
window.playTao = playTao;
window.endTurn = endTurn;
window.getGameState = getGameState;
window.resetGame = resetGame;
