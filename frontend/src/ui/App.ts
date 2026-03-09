// ========================================
// メインアプリケーション v2（アニメーション強化版）
// ========================================

import '../styles/main.css';
import { audioManager } from '../game/audio';
import type { BGMScene } from '../game/audio';
import type { GameState, EventOption, EventEffect, GamePhase } from '../game/types';
import {
  PROLOGUE_SLIDES, STORY_BEATS, TUTORIAL_STEPS, CHARACTERS,
  type StoryBeat,
} from '../game/story';
import {
  createInitialState, setPhase, startMonth, startGame, applyBorrow,
  prepareOperation, advanceDay, resolveEvent, finishMonth,
  checkGrowth, proceedToNextMonth, purchaseUpgrade, calculateScore,
  isAreaRestricted, isMethodRestricted,
  enterCardSelect, toggleVoyageCard, confirmVoyageCards,
  hireCrew, hireApplicant, fireCrew, upgradeCrew, toggleCrewSelection, getCrewEventBonus,
  calcCrewSalary,
} from '../game/engine';
import { FISHING_AREAS, FISHING_METHODS, FISH_SPECIES, CREW_MEMBERS, GAME_CONFIG } from '../game/data';
import { submitScore, getLeaderboard, type ScoreEntry } from '../api/leaderboard';

// ========================================
// カウントアップユーティリティ
// ========================================
function countUp(el: HTMLElement, target: number, duration = 800, prefix = '¥') {
  const start = Date.now();
  const initial = 0;
  const tick = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(initial + (target - initial) * eased);
    el.textContent = prefix + current.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ========================================
// 魚ジャンプパーティクル
// ========================================
const FISH_EMOJIS = ['🐟', '🐠', '🐡', '🦐', '🦞', '🦀', '🦑', '🐙'];

function spawnFishParticle(container: HTMLElement, weather: string) {
  const fish = document.createElement('div');
  fish.className = 'fish-particle';
  fish.textContent = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
  const x = 10 + Math.random() * 80;
  const duration = 1.2 + Math.random() * 0.8;
  fish.style.left = `${x}%`;
  fish.style.bottom = '40%';
  fish.style.animationDuration = `${duration}s`;
  fish.style.fontSize = `${1 + Math.random()}rem`;
  if (weather === 'stormy') fish.style.opacity = '0.5';
  container.appendChild(fish);
  setTimeout(() => fish.remove(), duration * 1000 + 100);
}

// ========================================
// コインパーティクル
// ========================================
function spawnCoins(count: number) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const coin = document.createElement('div');
      coin.className = 'coin-particle';
      coin.textContent = '🪙';
      coin.style.left = `${20 + Math.random() * 60}%`;
      coin.style.top = `${20 + Math.random() * 40}%`;
      coin.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;
      document.body.appendChild(coin);
      setTimeout(() => coin.remove(), 1500);
    }, i * 80);
  }
}

// ========================================
// 期待収益プレビュー計算
// ========================================
function calcExpectedProfit(
  areaId: string, methodId: string, month: number, weather: string,
  fuelReduction: number, crewSalaryCost = 0
): { min: number; max: number; topFish: typeof FISH_SPECIES } {
  const area = FISHING_AREAS.find(a => a.id === areaId)!;
  const method = FISHING_METHODS.find(m => m.id === methodId)!;
  const validFish = FISH_SPECIES.filter(f => f.areas.includes(areaId) && f.methods.includes(methodId));
  const dc = GAME_CONFIG;

  const weatherMult = weather === 'sunny' ? 1.0 : weather === 'cloudy' ? 0.9 : 0.55;
  const priceVar = dc.priceVariance;
  const fuelCost = Math.round(dc.fuelCostPerUnit * area.distance * method.fuelMultiplier * (1 - fuelReduction));
  const fixedCost = dc.fixedCostPerMonth;

  // 期待収益（楽観・悲観）
  const baseYield = method.baseYield * weatherMult * dc.baseYieldMultiplier;
  let totalRevMin = 0, totalRevMax = 0;
  const weights = validFish.map(f => Math.max(0, f.seasonality[month - 1] * (f.rarity === 'common' ? 1 : f.rarity === 'uncommon' ? 0.4 : 0.1)));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  validFish.forEach((f, i) => {
    if (weights[i] <= 0) return;
    const share = weights[i] / totalWeight;
    const qty = baseYield * share;
    const seasonal = f.basePrice * f.seasonality[month - 1];
    totalRevMin += qty * seasonal * (1 - priceVar) * (1 - method.yieldVariance);
    totalRevMax += qty * seasonal * (1 + priceVar) * (1 + method.yieldVariance * 0.5);
  });

  const min = Math.round(totalRevMin - fuelCost - fixedCost - crewSalaryCost);
  const max = Math.round(totalRevMax - fuelCost - fixedCost - crewSalaryCost);

  // 旬の魚TOP3
  const topFish = validFish
    .filter((_, i) => weights[i] > 0)
    .sort((a, b) => b.seasonality[month - 1] - a.seasonality[month - 1])
    .slice(0, 4);

  return { min, max, topFish };
}

// ========================================
// App クラス
// ========================================
export class App {
  private state: GameState;
  private root: HTMLElement;
  private fishSpawnInterval: number | null = null;
  private runningRaf: number | null = null;
  private runningStartTime: number | null = null;
  private lastDay = 0;
  private bgmStarted = false;

  constructor(rootId: string) {
    this.root = document.getElementById(rootId)!;
    this.state = createInitialState();
    this.render();
  }

  private setState(updater: (s: GameState) => GameState) {
    this.stopRunning();
    this.state = updater(this.state);
    this.render();
  }

  private stopRunning() {
    if (this.runningRaf) { cancelAnimationFrame(this.runningRaf); this.runningRaf = null; }
    if (this.fishSpawnInterval) { clearInterval(this.fishSpawnInterval); this.fishSpawnInterval = null; }
    this.runningStartTime = null;
    this.lastDay = 0;
  }

  // ========================================
  // BGMシーン制御
  // ========================================
  private getBGMScene(phase: GamePhase): BGMScene {
    switch (phase) {
      case 'INIT': case 'PROLOGUE': case 'SETUP': case 'MONTH_START': return 'exploration';
      case 'CARD_SELECT': return 'decision';
      case 'DECISION': return 'decision';
      case 'RUNNING': case 'EVENT':
        return this.state.currentWeather === 'stormy' ? 'storm' : 'sailing';
      case 'RESULT': case 'NEWS': return 'result';
      case 'GROWTH': return 'growth';
      case 'END': return 'result';
      default: return 'exploration';
    }
  }

  // ========================================
  // メインレンダリング
  // ========================================
  private render() {
    const { phase } = this.state;

    // BGMシーン切り替え
    if (this.bgmStarted) {
      audioManager.switchScene(this.getBGMScene(phase));
    }

    // プロローグ（初回起動 or PROLOGUE フェーズ）
    if (phase === 'INIT' || phase === 'PROLOGUE') {
      this.root.innerHTML = this.renderPrologue();
      this.bindPrologue();
      return;
    }
    // セットアップ
    if (phase === 'SETUP') {
      this.root.innerHTML = this.renderSetup();
      this.bindSetup();
      return;
    }
    // 航海カード選択
    if (phase === 'CARD_SELECT') {
      this.root.innerHTML = this.renderCardSelect();
      this.bindCardSelect();
      return;
    }
    // 操業中
    if (phase === 'RUNNING') {
      this.root.innerHTML = this.renderRunningView();
      this.startRunning();
      this.appendTutorialOverlay();
      return;
    }

    // メインレイアウト + オーバーレイ類
    let html = this.renderMainLayout();
    if (phase === 'EVENT') html += this.renderEventModal();
    if (phase === 'END') html += this.renderEndModal();

    // ストーリービートモーダル（月初・未読）
    const beat = STORY_BEATS.find(b => b.month === this.state.month);
    const showingStoryBeat = phase === 'MONTH_START' && !this.state.storyBeatSeen && !!beat;
    if (showingStoryBeat && beat) html += this.renderStoryBeatModal(beat);

    this.root.innerHTML = html;
    this.bindMainLayout();
    if (phase === 'EVENT') this.bindEventModal();
    if (phase === 'END') this.bindEndModal();
    if (showingStoryBeat) this.bindStoryBeat();

    // チュートリアルはストーリービートがない時だけ表示
    if (!showingStoryBeat) this.appendTutorialOverlay();

    if (phase === 'RESULT') this.animateResult();
  }

  // ========================================
  // セットアップ
  // ========================================
  private renderSetup(): string {
    return `
    <div class="setup-modal">
      <div class="setup-box">
        <div class="setup-game-title">
          <h1>🎣 石川漁業シミュレーション</h1>
          <p class="title-sub">石川の豊かな海で、あなただけの漁業会社を育てよう。<br>12か月の判断と挑戦が始まる。</p>
          <div class="setup-difficulty-badge">🎮 石川漁業シミュレーション　初期資金150万・月利15%</div>
        </div>
        <div class="setup-form">
          <div>
            <label class="form-label">会社名</label>
            <input id="company-name-input" class="form-input" type="text"
              placeholder="例：能登漁業（株）" maxlength="20"
              value="${this.state.companyName}" />
          </div>
          <button id="start-game-btn" class="setup-start-btn"
            ${this.state.companyName.trim() === '' ? 'disabled' : ''}>
            ⛵ ゲームスタート
          </button>
        </div>
      </div>
    </div>`;
  }

  private bindSetup() {
    const nameInput = document.getElementById('company-name-input') as HTMLInputElement;
    const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
    nameInput?.addEventListener('input', () => {
      this.state = { ...this.state, companyName: nameInput.value };
      startBtn.disabled = nameInput.value.trim() === '';
    });
    startBtn?.addEventListener('click', () => {
      if (!this.state.companyName.trim()) return;
      audioManager.resume();
      audioManager.startBGM('exploration');
      this.bgmStarted = true;
      audioManager.playSE('decision');
      this.setState(s => startGame(s));
    });
  }

  // ========================================
  // 航海カード選択（CARD_SELECT フェーズ）
  // ========================================
  private renderCardSelect(): string {
    const { voyageCardDeck, currentVoyageCards, month } = this.state;
    const selectedIds = new Set(currentVoyageCards.map(c => c.id));
    const typeColors: Record<string, string> = {
      weather: 'card-type-weather',
      market: 'card-type-market',
      special: 'card-type-special',
      risk: 'card-type-risk',
    };
    const rarityStars: Record<string, string> = {
      common: '★☆☆',
      uncommon: '★★☆',
      rare: '★★★',
    };
    const rarityLabels: Record<string, string> = {
      common: 'コモン',
      uncommon: 'アンコモン',
      rare: 'レア',
    };

    const cardsHtml = voyageCardDeck.map((card, i) => {
      const isSelected = selectedIds.has(card.id);
      const canSelect = isSelected || selectedIds.size < 3;
      return `
      <div class="voyage-card ${typeColors[card.type] ?? ''} ${isSelected ? 'voyage-card-selected' : ''} ${!canSelect ? 'voyage-card-disabled' : ''}"
           data-card-id="${card.id}"
           style="animation-delay: ${i * 0.1}s">
        <div class="voyage-card-rarity ${card.rarity}">${rarityStars[card.rarity]}</div>
        <div class="voyage-card-icon">${card.icon}</div>
        <div class="voyage-card-title">${card.title}</div>
        <div class="voyage-card-type-label">${{ weather: '天候', market: '市場', special: '特殊', risk: 'リスク' }[card.type] ?? ''} / ${rarityLabels[card.rarity]}</div>
        <div class="voyage-card-desc">${card.description.replace(/\n/g, '<br>')}</div>
        ${isSelected ? '<div class="voyage-card-check">✓ 選択中</div>' : ''}
      </div>`;
    }).join('');

    const selectedCount = selectedIds.size;
    const canConfirm = selectedCount >= 1;

    return `
    <div id="card-select-screen">
      <div class="card-select-bg">
        <div class="card-select-container">
          <div class="card-select-header">
            <div class="card-select-title">⚓ ${month}月の航海カード</div>
            <div class="card-select-subtitle">5枚の中から3枚を選んでください。今月の漁に特別な効果をもたらします。</div>
          </div>
          <div class="card-select-counter">
            <span class="counter-current">${selectedCount}</span>
            <span class="counter-slash"> / </span>
            <span class="counter-max">3</span>
            <span class="counter-label"> 枚選択中</span>
          </div>
          <div class="voyage-cards-grid">${cardsHtml}</div>
          <div class="card-select-actions">
            <button id="card-select-random-btn" class="card-random-btn">
              🎲 ランダムに選ぶ
            </button>
            <button id="card-select-confirm-btn" class="card-confirm-btn" ${canConfirm ? '' : 'disabled'}>
              ${selectedCount >= 3 ? '✓ この3枚で決定！' : selectedCount > 0 ? `${selectedCount}枚選択（残り${3 - selectedCount}枚をランダム補完）` : '少なくとも1枚選んでください'}
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  private bindCardSelect() {
    audioManager.playSE('decision');

    document.querySelectorAll('[data-card-id]').forEach(el => {
      el.addEventListener('click', () => {
        const cardId = (el as HTMLElement).dataset.cardId!;
        audioManager.playSE('select');
        this.state = toggleVoyageCard(this.state, cardId);
        // DOM直接更新（フラッシュなし）
        const selectedIds = new Set(this.state.currentVoyageCards.map(c => c.id));
        document.querySelectorAll('[data-card-id]').forEach(card => {
          const cid = (card as HTMLElement).dataset.cardId!;
          const isSelected = selectedIds.has(cid);
          const canSelect = isSelected || selectedIds.size < 3;
          card.classList.toggle('voyage-card-selected', isSelected);
          card.classList.toggle('voyage-card-disabled', !canSelect);
          const check = card.querySelector('.voyage-card-check');
          if (isSelected && !check) {
            const div = document.createElement('div');
            div.className = 'voyage-card-check';
            div.textContent = '✓ 選択中';
            card.appendChild(div);
          } else if (!isSelected && check) {
            check.remove();
          }
        });
        const count = selectedIds.size;
        const counterEl = document.querySelector('.counter-current');
        if (counterEl) counterEl.textContent = String(count);
        const confirmBtn = document.getElementById('card-select-confirm-btn') as HTMLButtonElement | null;
        if (confirmBtn) {
          confirmBtn.disabled = count < 1;
          confirmBtn.textContent = count >= 3 ? '✓ この3枚で決定！'
            : count > 0 ? `${count}枚選択（残り${3 - count}枚をランダム補完）`
            : '少なくとも1枚選んでください';
        }
      });
    });

    document.getElementById('card-select-random-btn')?.addEventListener('click', () => {
      audioManager.playSE('select');
      this.setState(s => confirmVoyageCards({ ...s, currentVoyageCards: [] }));
    });

    document.getElementById('card-select-confirm-btn')?.addEventListener('click', () => {
      audioManager.playSE('decision');
      this.setState(s => confirmVoyageCards(s));
    });
  }

  // ========================================
  // メインレイアウト
  // ========================================
  private renderMainLayout(): string {
    // 背景に漂う魚・泡アニメーション
    const bgFish = ['🐟','🐠','🐡','🦐','🦑','🐙','🦀','🦞'];
    const fishItems = Array.from({length: 8}, (_, i) => {
      const emoji = bgFish[i % bgFish.length];
      const top = 10 + Math.random() * 80;
      const dur = 18 + Math.random() * 20;
      const delay = Math.random() * -20;
      const size = 0.9 + Math.random() * 0.8;
      const dir = i % 2 === 0 ? 'bg-fish-left' : 'bg-fish-right';
      return `<div class="bg-fish ${dir}" style="top:${top}%;animation-duration:${dur}s;animation-delay:${delay}s;font-size:${size}rem;opacity:0.07">${emoji}</div>`;
    }).join('');
    const bubbles = Array.from({length: 12}, (_, i) => {
      const left = 5 + Math.random() * 90;
      const dur = 8 + Math.random() * 12;
      const delay = Math.random() * -15;
      const size = 4 + Math.random() * 8;
      return `<div class="bg-bubble" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s;width:${size}px;height:${size}px"></div>`;
    }).join('');

    return `
    <div id="app-inner">
      <div class="bg-layer">${fishItems}${bubbles}</div>
      ${this.renderHeader()}
      <div id="main-layout">
        ${this.renderLeftPanel()}
        <div id="center-panel" class="panel">${this.renderCenterPanel()}</div>
        ${this.renderRightPanel()}
      </div>
      <div class="version-label">v1.0.0</div>
    </div>`;
  }

  private bindMainLayout() {
    document.getElementById('mute-btn')?.addEventListener('click', () => {
      const muted = audioManager.toggleMute();
      const btn = document.getElementById('mute-btn');
      if (btn) btn.textContent = muted ? '🔇' : '🔊';
    });
    this.bindRightPanel();
    this.bindCenterPanel();
  }

  // ========================================
  // ヘッダー
  // ========================================
  private renderHeader(): string {
    const { companyName, month, phase, currentWeather, money } = this.state;
    const weatherIcon = { sunny: '☀️', cloudy: '☁️', stormy: '⛈️' }[currentWeather];
    const phaseMsg = this.getPhaseMessage(phase);
    return `
    <div id="header">
      <span class="company-name">🏢 ${companyName}</span>
      <span class="month-display">${month}月</span>
      <span class="status-message">${phaseMsg}</span>
      <span class="weather-display">${weatherIcon}</span>
      <span style="font-size:0.85rem;color:var(--accent-gold);font-weight:700">¥${money.toLocaleString()}</span>
      <button id="mute-btn" class="mute-btn" title="ミュート切替">${audioManager.muted ? '🔇' : '🔊'}</button>
    </div>`;
  }

  private getPhaseMessage(phase: string): string {
    const msgs: Record<string, string> = {
      MONTH_START: '今月の状況を確認してください',
      DECISION: '⚓ 海域・漁法を選んで出港しよう',
      RUNNING: '🌊 操業中...',
      RESULT: '📊 今月の結果',
      NEWS: '📰 ニュースをチェック',
      GROWTH: '📈 成長・解放確認',
    };
    return msgs[phase] || '';
  }

  // ========================================
  // 左パネル
  // ========================================
  private renderLeftPanel(): string {
    const { money, debt, debtTurnsLeft, reputation, level, learningBonuses, totalProfit, interestRate } = this.state;
    return `
    <div id="left-panel" class="panel">
      <div class="panel-header">会社ステータス</div>
      <div class="panel-body">
        <div class="level-display">
          <span class="level-num">Lv.${level}</span>
          <span class="level-label">会社レベル</span>
        </div>
        <div class="reputation-bar" title="評判 ${reputation}/100">
          <div class="reputation-bar-fill" style="width:${reputation}%"></div>
        </div>
        <div style="font-size:0.62rem;color:var(--text-muted);margin-bottom:8px">
          ⭐ 評判 ${reputation}/100　次Lv: ${[0,30,55,75,90][level] ?? '―'}
        </div>
        <div class="stat-row">
          <span class="stat-label">💰 資金</span>
          <span class="stat-value money">¥${money.toLocaleString()}</span>
        </div>
        ${debt > 0 ? `
        <div class="debt-info">
          <div class="stat-row"><span class="stat-label">借金</span><span class="stat-value debt">¥${debt.toLocaleString()}</span></div>
          <div class="stat-row"><span class="stat-label">月利</span><span class="stat-value">${(interestRate * 100).toFixed(0)}%</span></div>
          <div class="stat-row"><span class="stat-label">返済期限</span>
            <span class="stat-value ${debtTurnsLeft <= 1 ? 'debt' : ''}">${debtTurnsLeft}ターン</span>
          </div>
        </div>` : '<div style="font-size:0.75rem;color:var(--accent-green);margin-top:4px">✅ 借金なし</div>'}
        ${learningBonuses.length > 0 ? `
        <div style="margin-top:10px">
          <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px">📚 学びボーナス</div>
          <div class="learning-tags">
            ${learningBonuses.map(lb => `<span class="learning-tag" title="${lb.description}">${lb.description.split('：')[0]} (${lb.remainingMonths}ヶ月)</span>`).join('')}
          </div>
        </div>` : ''}
        ${this.state.currentNews.length > 0 ? `
        <div class="news-sidebar">
          <div class="news-sidebar-title">📰 今月のニュース</div>
          ${this.state.currentNews.slice(0, 3).map(n => `
          <div class="news-mini-card ${n.category}">
            <div class="news-mini-title">${n.title}</div>
            <div class="news-mini-body">${n.body}</div>
          </div>`).join('')}
        </div>` : ''}
      </div>
    </div>`;
  }

  // ========================================
  // 右パネル
  // ========================================
  private renderRightPanel(): string {
    const { selectedAreaId, selectedMethodId, selectedCrewIds, phase, unlockedAreas, unlockedMethods } = this.state;
    const isDecision = phase === 'DECISION';
    const isGrowth = phase === 'GROWTH';
    const showUnlocked = isDecision || isGrowth; // 開放表示モード

    const areasHtml = FISHING_AREAS.map(area => {
      const unlocked = unlockedAreas.includes(area.id);
      const restricted = unlocked && isAreaRestricted(this.state, area.id);
      const selected = selectedAreaId === area.id;
      let cls = 'select-item';
      if (!unlocked) cls += ' locked';
      else if (restricted) cls += ' restricted';
      else if (selected) cls += ' selected';
      const badge = !unlocked ? `<span class="lock-icon">🔒 Lv.${area.unlockLevel}</span>`
        : restricted ? '<span class="restrict-badge">規制中</span>' : '';
      const interactive = isDecision && unlocked && !restricted;
      return `<div class="${cls}" data-area="${area.id}" ${!interactive ? 'style="pointer-events:none"' : ''}>
        <span class="item-icon">${area.icon}</span>
        <span class="item-name">${area.name}</span>
        <span class="item-sub">${unlocked ? `距×${area.distance}` : `Lv.${area.unlockLevel}`}</span>${badge}
      </div>`;
    }).join('');

    const methodsHtml = FISHING_METHODS.map(method => {
      const unlocked = unlockedMethods.includes(method.id);
      const restricted = unlocked && isMethodRestricted(this.state, method.id);
      const selected = selectedMethodId === method.id;
      const area = FISHING_AREAS.find(a => a.id === selectedAreaId);
      const applicable = !area || area.availableMethods.includes(method.id);
      let cls = 'select-item';
      if (!unlocked) cls += ' locked';
      else if (restricted) cls += ' restricted';
      else if (selected) cls += ' selected';
      else if (!applicable && area) cls += ' locked';
      const badge = !unlocked ? `<span class="lock-icon">🔒 Lv.${method.unlockLevel}</span>`
        : restricted ? '<span class="restrict-badge">規制中</span>'
        : !applicable && area ? '<span class="restrict-badge">不可</span>' : '';
      const interactive = isDecision && unlocked && !restricted && (applicable || !area);
      return `<div class="${cls}" data-method="${method.id}"
        ${!interactive ? 'style="pointer-events:none"' : ''}>
        <span class="item-icon">${method.icon}</span>
        <span class="item-name">${method.name}</span>
        <span class="item-sub">燃×${method.fuelMultiplier}</span>${badge}
      </div>`;
    }).join('');

    // 採用済みクルーカード（DECISIONフェーズでトグル選択）
    const hiredCrew = this.state.crew.filter(c => c.hired);
    const crewHtml = hiredCrew.map(c => {
      const isSelected = selectedCrewIds.includes(c.id);
      const canSelect = isSelected || selectedCrewIds.length < 3;
      const bond = this.state.bondLevels[c.id] ?? 0;
      const bondHearts = '♥'.repeat(bond) + '♡'.repeat(5 - bond);
      const yieldPct = Math.round((c.baseYieldBonus + c.upgradeLevel * c.yieldBonusPerLevel) * 100);
      const bondBonus = bond > 0 ? `+${bond * 2}%` : '';
      const specialBadge = c.specialMethod
        ? `<span class="crew-special-badge">${FISHING_METHODS.find(m => m.id === c.specialMethod)?.icon ?? ''} 専門</span>`
        : '';
      const lvBadge = c.upgradeLevel > 0 ? `<span class="crew-lv-badge">Lv.${c.upgradeLevel}</span>` : '';
      return `
      <div class="npc-card crew-select-card ${isSelected ? 'selected' : ''} ${!canSelect && !isSelected ? 'crew-disabled' : ''}"
        data-crew="${c.id}" ${!isDecision ? 'style="pointer-events:none"' : ''}>
        <div class="npc-name">${c.icon} ${c.name} ${lvBadge}${specialBadge}</div>
        <div class="npc-bond">
          <span class="bond-hearts">${bondHearts}</span>
          ${bondBonus ? `<span class="bond-bonus">${bondBonus}</span>` : ''}
        </div>
        <div style="font-size:0.7rem;color:${yieldPct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
          水揚げ ${yieldPct >= 0 ? '+' : ''}${yieldPct}%
          ${isSelected ? '<span style="color:var(--accent-gold);margin-left:6px">✓ 出撃中</span>' : ''}
        </div>
      </div>`;
    }).join('');

    const panelBodyClass = isGrowth ? 'panel-body panel-unlocked' : 'panel-body';
    const crewCountLabel = isDecision
      ? `<span style="font-size:0.7rem;color:var(--text-muted)">（${selectedCrewIds.length}/3 人選択中）</span>` : '';
    return `
    <div id="right-panel" class="panel">
      <div class="panel-header">
        ${isGrowth ? '成長リソース 🔓' : isDecision ? '⬇️ ここで海域・漁法を選択' : '情報パネル'}
      </div>
      <div class="${panelBodyClass}">
        ${isDecision ? '<div class="right-panel-hint">👇 下から選んでください</div>' : ''}
        <div class="section-title">🌊 海域</div>${areasHtml}
        <div class="section-title">⚙️ 漁法</div>${methodsHtml}
        <div class="section-title">👨‍✈️ クルー ${crewCountLabel}</div>${crewHtml || '<div style="color:var(--text-muted);font-size:0.75rem;padding:4px">採用済みのクルーなし</div>'}
      </div>
    </div>`;
  }

  private bindRightPanel() {
    if (this.state.phase !== 'DECISION') return;
    document.querySelectorAll('[data-area]').forEach(el => {
      el.addEventListener('click', () => {
        const areaId = (el as HTMLElement).dataset.area!;
        if (!this.state.unlockedAreas.includes(areaId)) return;
        if (isAreaRestricted(this.state, areaId)) return;
        audioManager.playSE('select');
        // 全再レンダリングを避けるためDOMを直接更新
        this.state = { ...this.state, selectedAreaId: areaId };
        this.refreshAreaClasses(areaId);
        this.refreshMethodClasses();
        this.refreshCenterPanel();
      });
    });
    document.querySelectorAll('[data-method]').forEach(el => {
      el.addEventListener('click', () => {
        const methodId = (el as HTMLElement).dataset.method!;
        if (!this.state.unlockedMethods.includes(methodId)) return;
        if (isMethodRestricted(this.state, methodId)) return;
        audioManager.playSE('select');
        this.state = { ...this.state, selectedMethodId: methodId };
        this.refreshMethodClasses();
        this.refreshCenterPanel();
      });
    });
    document.querySelectorAll('[data-crew]').forEach(el => {
      el.addEventListener('click', () => {
        const crewId = (el as HTMLElement).dataset.crew!;
        audioManager.playSE('select');
        this.state = toggleCrewSelection(this.state, crewId);
        // DOM直接更新（クルーカードのクラスのみ）
        document.querySelectorAll('[data-crew]').forEach(card => {
          const cid = (card as HTMLElement).dataset.crew!;
          const isSelected = this.state.selectedCrewIds.includes(cid);
          const canSelect = isSelected || this.state.selectedCrewIds.length < 3;
          card.classList.toggle('selected', isSelected);
          card.classList.toggle('crew-disabled', !canSelect && !isSelected);
          const selLabel = card.querySelector('span[style*="accent-gold"]');
          if (isSelected && !selLabel) {
            const sp = document.createElement('span');
            sp.style.cssText = 'color:var(--accent-gold);margin-left:6px';
            sp.textContent = '✓ 出撃中';
            card.querySelector('div:last-child')?.appendChild(sp);
          } else if (!isSelected && selLabel) {
            selLabel.remove();
          }
        });
        // クルー選択数ラベル更新
        const crewHeader = document.querySelector('#right-panel .section-title:last-of-type span');
        if (crewHeader) {
          crewHeader.textContent = `（${this.state.selectedCrewIds.length}/3 人選択中）`;
        }
      });
    });
  }

  // 海域選択クラス更新（DOM直接操作、再レンダリングなし）
  private refreshAreaClasses(selectedId: string) {
    document.querySelectorAll('[data-area]').forEach(el => {
      const areaId = (el as HTMLElement).dataset.area!;
      el.classList.toggle('selected', areaId === selectedId);
    });
  }

  // 漁法クラス更新（選択海域との適合性も反映）
  private refreshMethodClasses() {
    const selectedArea = FISHING_AREAS.find(a => a.id === this.state.selectedAreaId);
    document.querySelectorAll('[data-method]').forEach(el => {
      const methodId = (el as HTMLElement).dataset.method!;
      const unlocked = this.state.unlockedMethods.includes(methodId);
      const restricted = isMethodRestricted(this.state, methodId);
      const applicable = !selectedArea || selectedArea.availableMethods.includes(methodId);
      const isLocked = !unlocked || restricted || (!applicable && !!selectedArea);

      el.classList.toggle('selected', methodId === this.state.selectedMethodId && !isLocked);
      el.classList.toggle('locked', isLocked);
      (el as HTMLElement).style.pointerEvents = (!unlocked || restricted || (!applicable && !!selectedArea)) ? 'none' : '';

      // 不適合になった選択中漁法をクリア
      if (isLocked && methodId === this.state.selectedMethodId) {
        this.state = { ...this.state, selectedMethodId: null };
        el.classList.remove('selected');
      }
    });
  }

  // 中央パネルのみ再レンダリング（右パネルは触らない）
  private refreshCenterPanel() {
    const cp = document.getElementById('center-panel');
    if (cp) {
      // スクロール可能な内部ビューのスクロール位置を保存
      const scrollableSelectors = ['.growth-view', '.decision-view', '.result-view', '.news-view', '.panel-body'];
      let savedScroll = 0;
      let savedSelector = '';
      for (const sel of scrollableSelectors) {
        const el = cp.querySelector(sel) as HTMLElement | null;
        if (el && el.scrollTop > 0) {
          savedScroll = el.scrollTop;
          savedSelector = sel;
          break;
        }
      }
      cp.innerHTML = this.renderCenterPanel();
      this.bindCenterPanel();
      if (savedScroll > 0 && savedSelector) {
        const restored = cp.querySelector(savedSelector) as HTMLElement | null;
        if (restored) restored.scrollTop = savedScroll;
      }
    }
  }

  // ========================================
  // 中央パネル
  // ========================================
  private renderCenterPanel(): string {
    switch (this.state.phase) {
      case 'MONTH_START': return this.renderMonthStart();
      case 'DECISION':    return this.renderDecision();
      case 'RESULT':      return this.renderResult();
      case 'NEWS':        return this.renderNews();
      case 'GROWTH':      return this.renderGrowth();
      default: return '<div class="panel-body">読み込み中...</div>';
    }
  }

  private bindCenterPanel() {
    switch (this.state.phase) {
      case 'MONTH_START': this.bindMonthStart(); break;
      case 'DECISION':    this.bindDecision();    break;
      case 'RESULT':      this.bindResult();      break;
      case 'NEWS':        this.bindNews();         break;
      case 'GROWTH':      this.bindGrowth();       break;
    }
  }

  // ---- 月開始サマリ ----
  private renderMonthStart(): string {
    const { month, currentWeather, currentRegulations } = this.state;
    const weatherLabels: Record<string, string> = { sunny: '☀️ 晴れ', cloudy: '☁️ くもり', stormy: '⛈️ 荒れ' };
    const weatherDesc: Record<string, string> = {
      sunny: '操業に最適。水揚げ量UP。',
      cloudy: '普通の漁模様。多少影響あり。',
      stormy: '荒天！水揚げ大幅減・リスク高。',
    };
    const regHtml = currentRegulations.filter(r => r.reason).map(r =>
      `<div class="regulation-item">⚠️ ${r.reason}</div>`
    ).join('') || '<div class="no-regulation">✅ 今月は特別な規制なし</div>';
    const newsHint = this.state.currentNews[0]?.body || '';

    return `
    <div class="panel-header">${month}月 開始</div>
    <div class="panel-body">
      <div class="month-start-view">
        <div class="month-banner">
          <div class="month-num">${month}</div>
          <div class="month-label">月が始まった</div>
        </div>
        <div class="info-cards">
          <div class="info-card">
            <div class="info-card-label">今月の天候</div>
            <div class="info-card-value weather-${currentWeather}">${weatherLabels[currentWeather]}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);margin-top:3px">${weatherDesc[currentWeather]}</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">規制情報</div>
            <div class="regulation-list">${regHtml}</div>
          </div>
        </div>
        ${newsHint ? `
        <div class="info-card">
          <div class="info-card-label">📰 最新情報（ニュースより）</div>
          <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;line-height:1.5">${newsHint}</div>
        </div>` : ''}
        <button id="to-decision-btn" class="start-btn">判断フェーズへ →</button>
      </div>
    </div>`;
  }

  private bindMonthStart() {
    audioManager.playSE('monthstart');
    document.getElementById('to-decision-btn')?.addEventListener('click', () => {
      audioManager.playSE('click');
      this.setState(s => enterCardSelect(s));
    });
  }

  // ---- 判断パネル ----
  private renderDecision(): string {
    const { selectedAreaId, selectedMethodId, isResting, month, currentWeather } = this.state;
    const area = FISHING_AREAS.find(a => a.id === selectedAreaId);
    const method = FISHING_METHODS.find(m => m.id === selectedMethodId);

    // コスト計算
    const dc = GAME_CONFIG;
    const fuelReduction = this.state.upgrades.filter(u => u.purchased).reduce((a, u) => a + (u.effect.fuelCostReduction || 0), 0);
    const fuelCost = area && method
      ? Math.round(dc.fuelCostPerUnit * area.distance * method.fuelMultiplier * (1 - fuelReduction))
      : 0;
    const canStart = isResting || (!!selectedAreaId && !!selectedMethodId);

    // 魚情報表示判定（info-1購入後に開示）
    const hasInfo1 = this.state.upgrades.find(u => u.id === 'info-1' && u.purchased);
    const hasInfo2 = this.state.upgrades.find(u => u.id === 'info-2' && u.purchased);
    const hasForecast = this.state.monthlyServices.forecast;

    // 期待収益プレビュー
    let previewHtml = '';
    if (!isResting && area && method) {
      const weatherForCalc = hasForecast ? currentWeather : 'cloudy'; // 予報なしは中間値
      const crewSalaryCost = this.state.crew.reduce((sum, c) => sum + calcCrewSalary(c), 0);
      const preview = calcExpectedProfit(area.id, method.id, month, weatherForCalc, fuelReduction, crewSalaryCost);
      const isStormy = currentWeather === 'stormy';
      let fishChips = '';
      if (hasInfo1) {
        fishChips = preview.topFish.map((f, i) => {
          const seasonal = f.seasonality[month - 1];
          const isHot = seasonal >= 1.2 && hasInfo2;
          return `<span class="expected-fish-chip ${f.rarity}" style="animation-delay:${i * 0.07}s">
            ${isHot ? '🔥' : '🐟'} ${f.name}
            ${isHot ? `<span style="font-size:0.6rem;color:var(--accent-gold)">旬！</span>` : ''}
          </span>`;
        }).join('');
      } else {
        fishChips = `<span style="color:var(--text-muted);font-size:0.75rem">❓ どんな魚が釣れるか不明（魚群探知機で確認可）</span>`;
      }
      previewHtml = `
      <div class="profit-preview">
        <div class="profit-preview-title">📊 期待収益プレビュー${!hasForecast ? ' <span style="font-size:0.65rem;color:var(--text-muted)">（天気予報なし・概算）</span>' : ''}</div>
        <div class="expected-fish-row">${fishChips}</div>
        <div class="profit-range">
          <div class="profit-range-item">
            <div class="profit-range-label">悲観</div>
            <div class="profit-range-val ${preview.min >= 0 ? 'positive' : 'negative'}">
              ${preview.min >= 0 ? '+' : ''}¥${preview.min.toLocaleString()}
            </div>
          </div>
          <div class="profit-range-item">
            <div class="profit-range-label">期待値</div>
            <div class="profit-range-val ${(preview.min + preview.max) / 2 >= 0 ? 'positive' : 'negative'}">
              ${((preview.min + preview.max) / 2) >= 0 ? '+' : ''}¥${Math.round((preview.min + preview.max) / 2).toLocaleString()}
            </div>
          </div>
          <div class="profit-range-item">
            <div class="profit-range-label">楽観</div>
            <div class="profit-range-val ${preview.max >= 0 ? 'positive' : 'negative'}">
              ${preview.max >= 0 ? '+' : ''}¥${preview.max.toLocaleString()}
            </div>
          </div>
        </div>
        ${hasForecast && isStormy ? '<div class="weather-warning">⛈️ 荒天のため水揚げが大幅に減少します！</div>' : ''}
        ${hasForecast ? `<div style="font-size:0.7rem;margin-top:4px;color:var(--accent-green)">📡 予報：${{ sunny: '☀️ 晴れ', cloudy: '☁️ くもり', stormy: '⛈️ 荒れ' }[currentWeather]}</div>` : ''}
      </div>`;
    }

    // 消費型サービス
    const svc = this.state.monthlyServices;
    const serviceHtml = `
    <div class="decision-section service-section">
      <div class="decision-section-title">🛒 今月のオプション</div>
      <div class="service-row">
        <button id="btn-forecast" class="service-btn ${svc.forecast ? 'service-purchased' : ''}" ${svc.forecast || this.state.money < 100_000 ? 'disabled' : ''}>
          <span class="service-icon">📡</span>
          <span>天気予報</span>
          <span class="service-cost">${svc.forecast ? '✓ 購入済' : '¥100,000'}</span>
        </button>
        <button id="btn-insurance" class="service-btn ${svc.insurance ? 'service-purchased' : ''}" ${svc.insurance || this.state.money < 150_000 ? 'disabled' : ''}>
          <span class="service-icon">🛡️</span>
          <span>漁業保険</span>
          <span class="service-cost">${svc.insurance ? '✓ 購入済' : '¥150,000'}</span>
        </button>
      </div>
      <div style="font-size:0.65rem;color:var(--text-muted);margin-top:3px">
        天気予報：天候を事前確認 ／ 漁業保険：赤字損失の30%補填
      </div>
    </div>`;

    return `
    <div class="panel-header">判断フェーズ</div>
    <div class="panel-body">
      <div class="decision-view">
        ${serviceHtml}
        <div class="decision-section">
          <div class="decision-section-title">出港 / 休業</div>
          <div class="rest-toggle">
            <button id="btn-port" class="${!isResting ? 'active-port' : ''}">⛵ 出港する</button>
            <button id="btn-rest" class="${isResting ? 'active-rest' : ''}">🏠 今月は休業</button>
          </div>
        </div>
        ${!isResting ? `
        <div class="decision-section">
          <div class="decision-section-title">選択内容</div>
          <div style="font-size:0.8rem;line-height:1.8">
            <span style="color:var(--text-muted)">海域：</span>
            <span style="color:${area ? 'var(--accent-primary)' : 'var(--accent-gold)'}">
              ${area ? area.icon + ' ' + area.name : '👉 右パネルで選択してください'}
            </span><br>
            <span style="color:var(--text-muted)">漁法：</span>
            <span style="color:${method ? 'var(--accent-primary)' : 'var(--accent-gold)'}">
              ${method ? method.icon + ' ' + method.name : '👉 右パネルで選択してください'}
            </span>
          </div>
          ${area && method ? `<div class="cost-preview">
            <div class="cost-item">⛽ 燃料費 <span>¥${fuelCost.toLocaleString()}</span></div>
            <div class="cost-item">🏢 固定費 <span>¥${dc.fixedCostPerMonth.toLocaleString()}</span></div>
          </div>` : ''}
        </div>
        ${previewHtml}
        ${this.state.currentChallenge ? `
        <div class="challenge-card">
          <div class="challenge-badge-row">
            <span class="challenge-badge">📋 月間チャレンジ</span>
            ${this.state.currentChallenge.completed ? '<span class="challenge-done">✅ 達成！</span>' : ''}
          </div>
          <div class="challenge-title">${this.state.currentChallenge.title}</div>
          <div class="challenge-desc">${this.state.currentChallenge.description}</div>
          <div class="challenge-reward">🎁 <span style="color:var(--accent-gold)">¥${this.state.currentChallenge.rewardMoney.toLocaleString()}</span> + 評判<span style="color:var(--accent-green)">+${this.state.currentChallenge.rewardRep}</span></div>
        </div>` : ''}
        ` : `
        <div class="decision-section" style="background:rgba(244,162,97,0.05);border-color:rgba(244,162,97,0.3)">
          <div style="font-size:0.8rem;color:var(--accent-gold)">
            🏠 休業を選択<br>
            <span style="color:var(--text-muted);font-size:0.72rem">副業収入 ¥${dc.restIncome.toLocaleString()} / 固定費 ¥${dc.fixedCostPerMonth.toLocaleString()} / 人件費 ¥${this.state.crew.reduce((sum, c) => sum + calcCrewSalary(c), 0).toLocaleString()}</span>
          </div>
        </div>`}
        <div class="decision-section">
          <div class="decision-section-title">借入（任意）</div>
          <div class="borrow-input-row">
            <input id="borrow-input" class="borrow-input" type="number" min="0"
              step="100000" placeholder="借入額（円）"
              value="${this.state.borrowAmount || ''}"
              ${this.state.debt > 0 ? 'disabled title="既存の借金を返済してから借入できます"' : ''} />
            <button id="borrow-btn" class="upgrade-btn" ${this.state.debt > 0 ? 'disabled' : ''}>借入</button>
          </div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">
            月利 ${(dc.interestRate * 100).toFixed(0)}% / 返済期限 ${dc.debtRepayTurns}ターン / 上限¥${dc.maxDebt.toLocaleString()}
          </div>
        </div>
        <button id="operation-start-btn" class="start-btn" ${canStart ? '' : 'disabled'}>
          ${isResting ? '🏠 休業確定して月を進める' : '⛵ 操業開始！'}
        </button>
      </div>
    </div>`;
  }

  private bindDecision() {
    // 消費型サービス購入
    document.getElementById('btn-forecast')?.addEventListener('click', () => {
      if (this.state.monthlyServices.forecast || this.state.money < 100_000) return;
      audioManager.playSE('coin');
      this.state = {
        ...this.state,
        money: this.state.money - 100_000,
        monthlyServices: { ...this.state.monthlyServices, forecast: true },
      };
      this.refreshCenterPanel();
      this.updateMoneyDisplay();
    });
    document.getElementById('btn-insurance')?.addEventListener('click', () => {
      if (this.state.monthlyServices.insurance || this.state.money < 150_000) return;
      audioManager.playSE('coin');
      this.state = {
        ...this.state,
        money: this.state.money - 150_000,
        monthlyServices: { ...this.state.monthlyServices, insurance: true },
      };
      this.refreshCenterPanel();
      this.updateMoneyDisplay();
    });
    document.getElementById('btn-port')?.addEventListener('click', () => { audioManager.playSE('click'); this.setState(s => ({ ...s, isResting: false })); });
    document.getElementById('btn-rest')?.addEventListener('click', () => { audioManager.playSE('click'); this.setState(s => ({ ...s, isResting: true, selectedAreaId: null, selectedMethodId: null })); });
    const borrowInput = document.getElementById('borrow-input') as HTMLInputElement;
    borrowInput?.addEventListener('input', () => { this.state = { ...this.state, borrowAmount: parseInt(borrowInput.value) || 0 }; });
    document.getElementById('borrow-btn')?.addEventListener('click', () => {
      if (this.state.borrowAmount > 0) { audioManager.playSE('coin'); this.setState(s => applyBorrow(s, s.borrowAmount)); }
    });
    document.getElementById('operation-start-btn')?.addEventListener('click', () => {
      audioManager.playSE('decision');
      if (this.state.isResting) {
        this.setState(s => finishMonth(prepareOperation(s)));
      } else {
        this.setState(s => prepareOperation(s));
      }
    });
  }

  private updateMoneyDisplay() {
    const headerMoney = document.querySelector<HTMLElement>('#header span[style*="accent-gold"]');
    if (headerMoney) headerMoney.textContent = `¥${this.state.money.toLocaleString()}`;
    const leftMoney = document.querySelector<HTMLElement>('#left-panel .money');
    if (leftMoney) leftMoney.textContent = `¥${this.state.money.toLocaleString()}`;
  }

  // ---- 結果（アニメーション後にcountUpを呼ぶ）----
  private renderResult(): string {
    const r = this.state.monthResult;
    if (!r) return '<div class="panel-body">データなし</div>';

    const profitClass = r.profit >= 0 ? 'positive' : 'negative';
    const profitSign = r.profit >= 0 ? '+' : '';
    const isHugeCatch = r.profit > 1000000;

    const catchRows = r.catches.slice(0, 6).map((c, i) => {
      const fishData = FISH_SPECIES.find(f => f.id === c.fishId);
      const isRare = fishData?.rarity === 'rare';
      return `<div class="catch-card ${isRare ? 'rare' : ''}" style="animation-delay:${i * 0.08}s">
        <span style="font-size:1rem">${isRare ? '⭐' : '🐟'}</span>
        <span class="catch-fish-name">${c.fishName}</span>
        <span class="catch-qty">${c.quantity.toLocaleString()}kg</span>
        <span class="catch-price">@¥${c.unitPrice.toLocaleString()}</span>
        <span class="catch-subtotal">¥${c.subtotal.toLocaleString()}</span>
      </div>`;
    }).join('');

    return `
    <div class="panel-header">${this.state.month}月 操業結果</div>
    <div class="panel-body">
      <div class="result-view">
        ${r.isResting ? `
        <div style="text-align:center;padding:24px;color:var(--accent-gold)">
          <div style="font-size:3rem;animation:pixelBannerIn 0.2s steps(3)">🏠</div>
          <div style="font-size:1.1rem;font-weight:700;margin-top:10px">今月は休業</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">副業収入: ¥${GAME_CONFIG.restIncome.toLocaleString()}</div>
        </div>` : `
        ${isHugeCatch ? `<div class="big-catch-banner">🎉 大漁！今月は絶好調でした！</div>` : ''}
        <div class="result-header">
          <span class="result-title">💹 今月の利益</span>
          <span class="result-profit ${profitClass}" id="profit-display">${profitSign}¥${r.profit.toLocaleString()}</span>
        </div>
        ${r.catches.length > 0 ? `<div class="mb-8">${catchRows}</div>` : '<div style="color:var(--text-muted);font-size:0.8rem;margin-bottom:8px">水揚げなし</div>'}
        <div class="breakdown-rows">
          <div class="breakdown-item">
            <div class="breakdown-label">総売上</div>
            <div class="breakdown-value text-green" id="revenue-countup">¥${r.totalRevenue.toLocaleString()}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">燃料費</div>
            <div class="breakdown-value text-red">-¥${r.fuelCost.toLocaleString()}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">固定費</div>
            <div class="breakdown-value text-red">-¥${r.fixedCost.toLocaleString()}</div>
          </div>
          ${r.crewSalaryCost > 0 ? `<div class="breakdown-item">
            <div class="breakdown-label">👥 人件費</div>
            <div class="breakdown-value text-red">-¥${r.crewSalaryCost.toLocaleString()}</div>
          </div>` : ''}
          ${r.interestCost > 0 ? `<div class="breakdown-item">
            <div class="breakdown-label">利息</div>
            <div class="breakdown-value text-red">-¥${r.interestCost.toLocaleString()}</div>
          </div>` : ''}
          ${r.eventCostDelta !== 0 ? `<div class="breakdown-item">
            <div class="breakdown-label">イベント影響</div>
            <div class="breakdown-value ${r.eventCostDelta >= 0 ? 'text-green' : 'text-red'}">
              ${r.eventCostDelta >= 0 ? '+' : ''}¥${r.eventCostDelta.toLocaleString()}
            </div>
          </div>` : ''}
          ${r.cardBonusDelta !== 0 ? `<div class="breakdown-item">
            <div class="breakdown-label">航海カード</div>
            <div class="breakdown-value ${r.cardBonusDelta >= 0 ? 'text-green' : 'text-red'}">
              ${r.cardBonusDelta >= 0 ? '+' : ''}¥${r.cardBonusDelta.toLocaleString()}
            </div>
          </div>` : ''}
        </div>
        <div class="profit-formula-detail">
          <div class="formula-section-title">▶ 収益計算式</div>

          ${r.yieldBreakdown ? (() => {
            const factors = [
              { label: '天候', val: r.yieldBreakdown!.weather,   icon: r.weather === 'sunny' ? '☀️' : r.weather === 'cloudy' ? '☁️' : '⛈️' },
              { label: 'イベント', val: r.yieldBreakdown!.event,  icon: '📅' },
              { label: '学び',  val: r.yieldBreakdown!.learning,  icon: '📚' },
              { label: 'クルー',  val: r.yieldBreakdown!.crew,    icon: '👥' },
              { label: 'UP',    val: r.yieldBreakdown!.upgrade,   icon: '⚙️' },
              { label: 'カード', val: r.yieldBreakdown!.card,     icon: '🃏' },
              { label: 'ノイズ', val: r.yieldBreakdown!.noise,    icon: '🎲' },
            ].filter(f => Math.abs(f.val - 1.0) > 0.005);

            const terms = factors.map(f => {
              const cls = f.val >= 1 ? 'pos' : 'neg';
              const pct = `${f.val >= 1 ? '+' : ''}${((f.val - 1) * 100).toFixed(1)}%`;
              return `<span class="eq-op">×</span>
              <div class="eq-term ${cls}">
                <span class="eq-val">${f.val.toFixed(2)}</span>
                <span class="eq-label">${f.icon}${f.label}<br><span class="eq-pct">${pct}</span></span>
              </div>`;
            }).join('');

            return `
            <div class="formula-block">
              <div class="formula-block-title">水揚げ補正</div>
              <div class="eq-chain">
                <div class="eq-term neutral">
                  <span class="eq-val">1.00</span>
                  <span class="eq-label">基準</span>
                </div>
                ${terms}
                <span class="eq-op eq-eq">=</span>
                <div class="eq-term result ${r.yieldMultiplier >= 1 ? 'pos' : 'neg'}">
                  <span class="eq-val">${r.yieldMultiplier.toFixed(2)}</span>
                  <span class="eq-label">合計倍率</span>
                </div>
              </div>
            </div>`;
          })() : ''}

          ${r.eventDetails && r.eventDetails.length > 0 ? `
          <div class="formula-block">
            <div class="formula-block-title">イベント内訳</div>
            ${r.eventDetails.map(ev => {
              const hasYield = ev.yieldMult && Math.abs(ev.yieldMult - 1) > 0.005;
              const hasMoney = ev.moneyDelta && ev.moneyDelta !== 0;
              const isGood = (ev.yieldMult ?? 1) >= 1 && (ev.moneyDelta ?? 0) >= 0;
              return `<div class="formula-event-row">
                <span class="formula-event-icon">${isGood ? '✅' : '⚠️'}</span>
                <div class="formula-event-body">
                  <span class="formula-event-title">${ev.title}</span>
                  <span class="formula-event-choice">→ ${ev.option}</span>
                </div>
                <div class="formula-event-effects">
                  ${hasYield ? `<span class="eq-badge ${(ev.yieldMult ?? 1) >= 1 ? 'pos' : 'neg'}">水揚げ × ${ev.yieldMult!.toFixed(2)}</span>` : ''}
                  ${hasMoney ? `<span class="eq-badge ${(ev.moneyDelta ?? 0) >= 0 ? 'pos' : 'neg'}">${(ev.moneyDelta ?? 0) >= 0 ? '+' : ''}¥${ev.moneyDelta!.toLocaleString()}</span>` : ''}
                  ${!hasYield && !hasMoney ? `<span class="eq-badge neutral">効果なし</span>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>` : ''}

          <div class="formula-block">
            <div class="formula-block-title">利益計算式</div>
            <div class="eq-chain">
              <div class="eq-term pos">
                <span class="eq-val">¥${r.totalRevenue.toLocaleString()}</span>
                <span class="eq-label">💰売上</span>
              </div>
              <span class="eq-op">−</span>
              <div class="eq-term neg">
                <span class="eq-val">¥${r.fuelCost.toLocaleString()}</span>
                <span class="eq-label">⛽燃料</span>
              </div>
              <span class="eq-op">−</span>
              <div class="eq-term neg">
                <span class="eq-val">¥${r.fixedCost.toLocaleString()}</span>
                <span class="eq-label">🏢固定費</span>
              </div>
              ${r.crewSalaryCost > 0 ? `
              <span class="eq-op">−</span>
              <div class="eq-term neg">
                <span class="eq-val">¥${r.crewSalaryCost.toLocaleString()}</span>
                <span class="eq-label">👥人件費</span>
              </div>` : ''}
              ${r.interestCost > 0 ? `
              <span class="eq-op">−</span>
              <div class="eq-term neg">
                <span class="eq-val">¥${r.interestCost.toLocaleString()}</span>
                <span class="eq-label">💳利息</span>
              </div>` : ''}
              ${r.eventCostDelta !== 0 ? `
              <span class="eq-op">${r.eventCostDelta >= 0 ? '+' : '−'}</span>
              <div class="eq-term ${r.eventCostDelta >= 0 ? 'pos' : 'neg'}">
                <span class="eq-val">¥${Math.abs(r.eventCostDelta).toLocaleString()}</span>
                <span class="eq-label">📅イベント</span>
              </div>` : ''}
              ${r.cardBonusDelta !== 0 ? `
              <span class="eq-op">${r.cardBonusDelta >= 0 ? '+' : '−'}</span>
              <div class="eq-term ${r.cardBonusDelta >= 0 ? 'pos' : 'neg'}">
                <span class="eq-val">¥${Math.abs(r.cardBonusDelta).toLocaleString()}</span>
                <span class="eq-label">🃏カード</span>
              </div>` : ''}
              <span class="eq-op eq-eq">=</span>
              <div class="eq-term result ${r.profit >= 0 ? 'pos' : 'neg'}">
                <span class="eq-val">${r.profit >= 0 ? '+' : ''}¥${r.profit.toLocaleString()}</span>
                <span class="eq-label">最終利益</span>
              </div>
            </div>
          </div>
        </div>
        `}
        ${this.state.currentChallenge ? `
        <div class="challenge-result-card ${this.state.currentChallenge.completed ? 'success' : 'fail'}">
          <div style="font-weight:700">${this.state.currentChallenge.title}</div>
          ${this.state.currentChallenge.completed
            ? `<div style="color:var(--accent-green);font-size:0.85rem">✅ チャレンジ達成！ ¥${this.state.currentChallenge.rewardMoney.toLocaleString()} + 評判+${this.state.currentChallenge.rewardRep} を獲得</div>`
            : `<div style="color:var(--text-muted);font-size:0.82rem">❌ チャレンジ未達成：${this.state.currentChallenge.description}</div>`}
        </div>` : ''}
        <button id="to-news-btn" class="next-btn">ニュースを確認 →</button>
      </div>
    </div>`;
  }

  private animateResult() {
    const r = this.state.monthResult;
    if (!r || r.isResting) return;

    // 利益/損失SE
    setTimeout(() => {
      if (r.profit >= 0) {
        audioManager.playSE('profit');
      } else {
        audioManager.playSE('loss');
      }
    }, 300);

    // カウントアップ
    setTimeout(() => {
      const revenueEl = document.getElementById('revenue-countup');
      if (revenueEl) countUp(revenueEl, r.totalRevenue, 800);
    }, 400);

    // 大利益ならコイン演出
    if (r.profit > 500000) {
      setTimeout(() => {
        audioManager.playSE('coin');
        spawnCoins(Math.min(Math.floor(r.profit / 500000), 8));
      }, 600);
    }
  }

  private bindResult() {
    document.getElementById('to-news-btn')?.addEventListener('click', () => {
      audioManager.playSE('click');
      // 暗転なしでニュースへ遷移（中央パネルのみ更新）
      this.state = setPhase(this.state, 'NEWS');
      audioManager.switchScene(this.getBGMScene('NEWS'));
      this.refreshCenterPanel();
    });
  }

  // ---- ニュース ----
  private renderNews(): string {
    const newsHtml = this.state.currentNews.map(n => `
      <div class="news-card ${n.category}">
        <div class="news-card-title">${n.title}</div>
        <div class="news-card-body">${n.body}</div>
      </div>`).join('');
    return `
    <div class="panel-header">ニュース</div>
    <div class="panel-body">
      <div class="news-view">
        <div class="news-title-bar">📰 ${this.state.month}月のニュース</div>
        ${newsHtml || '<div style="color:var(--text-muted)">今月は特別なニュースはありません。</div>'}
        <button id="to-growth-btn" class="next-btn" style="margin-top:16px">成長・解放確認 →</button>
      </div>
    </div>`;
  }

  private bindNews() {
    document.getElementById('to-growth-btn')?.addEventListener('click', () => {
      audioManager.playSE('click');
      // 暗転なしで成長画面へ遷移（中央パネルのみ更新）
      this.state = checkGrowth(this.state);
      audioManager.switchScene(this.getBGMScene('GROWTH'));
      this.refreshCenterPanel();
    });
  }

  // ---- 成長・解放 ----
  private renderGrowth(): string {
    const { level, unlockedAreas, unlockedMethods, upgrades, money, monthHistory, crew } = this.state;
    const prevResult = monthHistory[monthHistory.length - 1];
    // 今回レベルアップで初めて解放されたもの（Lv1初期解放は除外）
    const newAreas = level > 1
      ? unlockedAreas.filter(id => FISHING_AREAS.find(a => a.id === id)?.unlockLevel === level)
      : [];
    const newMethods = level > 1
      ? unlockedMethods.filter(id => FISHING_METHODS.find(m => m.id === id)?.unlockLevel === level)
      : [];

    // スキルツリーUI（横一列ノード形式）
    const categories: Array<{ key: string; label: string; icon: string }> = [
      { key: 'info', label: '情報', icon: '🔭' },
      { key: 'efficiency', label: '効率化', icon: '⚙️' },
      { key: 'yield', label: '収益強化', icon: '📈' },
      { key: 'market', label: '市場', icon: '🏪' },
      { key: 'boat', label: '船舶', icon: '🚢' },
      { key: 'safety', label: '安全', icon: '🛡️' },
      { key: 'diving', label: '素潜り', icon: '🤿' },
    ];
    const skillTreeHtml = categories.map(cat => {
      const items = upgrades.filter(u => u.category === cat.key);
      if (items.length === 0) return '';
      const nodesHtml = items.map((u, i) => {
        const prereqMet = !u.requires || u.requires.every(rid => upgrades.find(r => r.id === rid && r.purchased));
        const locked = u.unlockLevel > level;
        const canBuy = prereqMet && !u.purchased && !locked && money >= u.cost;
        let stateClass = '';
        if (u.purchased) stateClass = 'snode-purchased';
        else if (locked) stateClass = 'snode-lv-locked';
        else if (!prereqMet) stateClass = 'snode-prereq-locked';
        else stateClass = 'snode-available';
        const connector = i > 0 ? `<div class="snode-connector">→</div>` : '';
        const btnLabel = u.purchased ? '✅ 購入済' : locked ? `🔒 Lv.${u.unlockLevel}` : !prereqMet ? '前提未購入' : money >= u.cost ? '購入する' : '資金不足';
        return `${connector}
        <div class="snode ${stateClass}">
          <div class="snode-name">${u.name}</div>
          <div class="snode-desc">${u.description}</div>
          <div class="snode-footer">
            <span class="snode-cost">${u.purchased ? '' : '¥' + u.cost.toLocaleString()}</span>
            ${!u.purchased
              ? `<button class="upgrade-btn snode-btn" data-upgrade="${u.id}" ${canBuy ? '' : 'disabled'}>${btnLabel}</button>`
              : `<span class="snode-done">${btnLabel}</span>`
            }
          </div>
        </div>`;
      }).join('');
      return `
      <div class="skill-tree-row">
        <div class="skill-cat-label">${cat.icon}<br><span>${cat.label}</span></div>
        <div class="skill-nodes-row">${nodesHtml}</div>
      </div>`;
    }).join('');

    // 雇用済みクルー管理UI
    const hiredCrewHtml = crew.map(c => {
      const bond = this.state.bondLevels[c.id] ?? 0;
      const bondHearts = '♥'.repeat(bond) + '♡'.repeat(5 - bond);
      const canUpgrade = c.upgradeLevel < 3 && money >= c.upgradeCosts[c.upgradeLevel];
      const canFire = c.id !== 'veteran';
      return `
      <div class="crew-manage-card crew-hired">
        <div class="crew-manage-header">
          <span class="crew-icon">${c.icon}</span>
          <div style="flex:1">
            <div class="crew-manage-name">${c.name}</div>
            <div class="crew-manage-lv">Lv.${c.upgradeLevel} <span class="bond-hearts" style="font-size:0.7rem">${bondHearts}</span></div>
          </div>
          ${canFire ? `<button class="fire-btn" data-fire-crew="${c.id}" title="解雇">🚪解雇</button>` : '<span style="font-size:0.65rem;color:var(--text-muted)">解雇不可</span>'}
        </div>
        <div class="crew-manage-desc">${c.description}</div>
        <div class="crew-manage-footer">
          ${c.upgradeLevel < 3
            ? `<span class="crew-hire-cost">強化: ¥${c.upgradeCosts[c.upgradeLevel].toLocaleString()} (Lv${c.upgradeLevel}→${c.upgradeLevel + 1})</span>
               <button class="upgrade-btn" data-upgrade-crew="${c.id}" ${canUpgrade ? '' : 'disabled'}>${canUpgrade ? 'スキルUP' : '資金不足'}</button>`
            : '<span style="color:var(--accent-gold);font-size:0.75rem">✨ MAX強化済</span>'
          }
        </div>
      </div>`;
    }).join('');

    // 今月の応募者UI
    const applicants = this.state.applicants;
    const applicantsHtml = applicants.length === 0
      ? '<div style="color:var(--text-muted);font-size:0.75rem;padding:6px">今月の応募者はいません</div>'
      : applicants.map(c => {
          const canHire = money >= c.hireCost;
          const yieldPct = Math.round(c.baseYieldBonus * 100);
          const specialBadge = c.specialMethod
            ? `<span class="crew-special-badge">⭐${FISHING_METHODS.find(m => m.id === c.specialMethod)?.name ?? c.specialMethod}専門</span>`
            : '';
          return `
          <div class="crew-manage-card applicant-card">
            <div class="crew-manage-header">
              <span class="crew-icon">${c.icon}</span>
              <div style="flex:1">
                <div class="crew-manage-name">${c.name} ${specialBadge}</div>
                <div style="font-size:0.65rem;color:var(--text-muted)">
                  水揚げ ${yieldPct >= 0 ? '+' : ''}${yieldPct}% ／ 安定性 ${c.baseStabilityBonus >= 0 ? '+' : ''}${Math.round(c.baseStabilityBonus * 100)}%
                </div>
              </div>
            </div>
            <div class="crew-manage-desc">${c.description}</div>
            <div class="crew-manage-footer">
              <span class="crew-hire-cost">採用費: ¥${c.hireCost.toLocaleString()}</span>
              <button class="upgrade-btn" data-hire-applicant="${c.id}" ${canHire ? '' : 'disabled'}>${canHire ? '採用する' : '資金不足'}</button>
            </div>
          </div>`;
        }).join('');

    const hasUnlocks = (newAreas.length + newMethods.length) > 0;

    return `
    <div class="panel-header">成長・解放 [${this.state.month}月]</div>
    <div class="panel-body growth-panel-body">
      <div class="growth-view">

        ${hasUnlocks ? `
        <div class="growth-unlock-banner">
          <div class="growth-unlock-title">★ 新要素解放！</div>
          <div class="unlock-list">
            ${newAreas.map(id => { const a = FISHING_AREAS.find(a => a.id === id)!; return `<div class="unlock-item"><span class="unlock-icon">${a.icon}</span>海域「${a.name}」解放！</div>`; }).join('')}
            ${newMethods.map(id => { const m = FISHING_METHODS.find(m => m.id === id)!; return `<div class="unlock-item"><span class="unlock-icon">${m.icon}</span>漁法「${m.name}」解放！</div>`; }).join('')}
          </div>
        </div>` : ''}

        ${prevResult && !prevResult.isResting ? `
        <div class="growth-summary-bar">
          <div class="gsummary-item">
            <span class="gsummary-label">今月利益</span>
            <span class="gsummary-val ${prevResult.profit >= 0 ? 'pos' : 'neg'}">${prevResult.profit >= 0 ? '+' : ''}¥${prevResult.profit.toLocaleString()}</span>
          </div>
          <div class="gsummary-item">
            <span class="gsummary-label">水揚げ補正</span>
            <span class="gsummary-val">${prevResult.yieldMultiplier.toFixed(2)}x</span>
          </div>
          <div class="gsummary-item">
            <span class="gsummary-label">現在資金</span>
            <span class="gsummary-val pos">¥${this.state.money.toLocaleString()}</span>
          </div>
        </div>` : ''}

        <div class="growth-tabs">
          <button class="growth-tab active" data-tab="skill">⚡ スキル</button>
          <button class="growth-tab" data-tab="crew">👥 クルー(${crew.length})</button>
          <button class="growth-tab" data-tab="recruit">📋 採用(${applicants.length})</button>
        </div>

        <div class="growth-tab-content" id="growth-tab-skill">
          <div class="skill-tree-container">${skillTreeHtml}</div>
        </div>

        <div class="growth-tab-content hidden" id="growth-tab-crew">
          ${crew.length === 0
            ? '<div class="growth-empty">クルーがいません</div>'
            : `<div class="crew-manage-grid">${hiredCrewHtml}</div>`
          }
        </div>

        <div class="growth-tab-content hidden" id="growth-tab-recruit">
          ${applicants.length === 0
            ? '<div class="growth-empty">今月の応募者はいません</div>'
            : `<div class="crew-manage-grid">${applicantsHtml}</div>`
          }
        </div>

        <button id="next-month-btn" class="next-btn growth-next-btn">
          ${this.state.month >= 12 ? '★ ゲーム終了へ' : `${this.state.month + 1}月へ進む →`}
        </button>
      </div>
    </div>`;
  }

  // タブを保持したままGROWH画面を再描画するヘルパー
  private refreshGrowthPanel() {
    const activeTabEl = document.querySelector('.growth-tab.active') as HTMLElement | null;
    const activeTab = activeTabEl?.dataset.tab ?? 'skill';
    this.refreshCenterPanel();
    // タブ状態を復元
    document.querySelectorAll('.growth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.growth-tab-content').forEach(c => (c as HTMLElement).classList.add('hidden'));
    const tab = document.querySelector(`.growth-tab[data-tab="${activeTab}"]`);
    tab?.classList.add('active');
    document.getElementById(`growth-tab-${activeTab}`)?.classList.remove('hidden');
  }

  private bindGrowth() {
    // タブ切替
    document.querySelectorAll('.growth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabKey = (tab as HTMLElement).dataset.tab!;
        document.querySelectorAll('.growth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.growth-tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`growth-tab-${tabKey}`)?.classList.remove('hidden');
      });
    });
    // スキルツリー購入
    document.querySelectorAll('[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const upgradeId = (btn as HTMLElement).dataset.upgrade!;
        audioManager.playSE('coin');
        this.state = purchaseUpgrade(this.state, upgradeId);
        this.refreshGrowthPanel();
        this.updateMoneyDisplay();
      });
    });
    // 応募者採用
    document.querySelectorAll('[data-hire-applicant]').forEach(btn => {
      btn.addEventListener('click', () => {
        const crewId = (btn as HTMLElement).dataset.hireApplicant!;
        audioManager.playSE('coin');
        this.state = hireApplicant(this.state, crewId);
        this.refreshGrowthPanel();
        this.updateMoneyDisplay();
      });
    });
    // クルー解雇
    document.querySelectorAll('[data-fire-crew]').forEach(btn => {
      btn.addEventListener('click', () => {
        const crewId = (btn as HTMLElement).dataset.fireCrew!;
        audioManager.playSE('click');
        this.state = fireCrew(this.state, crewId);
        this.refreshGrowthPanel();
        this.updateMoneyDisplay();
      });
    });
    // 船員スキルアップ
    document.querySelectorAll('[data-upgrade-crew]').forEach(btn => {
      btn.addEventListener('click', () => {
        const crewId = (btn as HTMLElement).dataset.upgradeCrew!;
        audioManager.playSE('coin');
        this.state = upgradeCrew(this.state, crewId);
        this.refreshGrowthPanel();
        this.updateMoneyDisplay();
      });
    });
    document.getElementById('next-month-btn')?.addEventListener('click', () => {
      audioManager.playSE('click');
      this.setState(s => {
        const next = proceedToNextMonth(s);
        if (next.phase === 'END') return next;
        // レベルアップしたらファンファーレ
        if (next.level > s.level) audioManager.playSE('levelup');
        return startMonth(next);
      });
    });
  }

  // ========================================
  // 月内進行ビュー（フルリニューアル）
  // ========================================
  private renderRunningView(): string {
    const { companyName, month, currentDay, scheduledEvents, currentWeather } = this.state;
    const firedCount = scheduledEvents.filter(e => e.resolved).length;
    const totalEvents = scheduledEvents.length;
    const progress = Math.round((currentDay / 30) * 100);
    const area = FISHING_AREAS.find(a => a.id === this.state.selectedAreaId);
    const method = FISHING_METHODS.find(m => m.id === this.state.selectedMethodId);
    const weatherIcon = { sunny: '☀️', cloudy: '☁️', stormy: '⛈️' }[currentWeather];
    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

    const calHtml = Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
      const isEventDay = scheduledEvents.some(e => e.day === d);
      const isEventDone = scheduledEvents.some(e => e.day === d && e.resolved);
      let cls = 'calendar-day';
      if (isEventDone) cls = 'calendar-day event-done';
      else if (d < currentDay) cls += ' past';
      else if (d === currentDay) cls += ' current';
      else { cls += ' future'; if (isEventDay) cls += ' event-day'; }
      return `<div class="${cls}">${d}${isEventDay && !isEventDone ? '<span style="position:absolute;top:-2px;right:-2px;width:5px;height:5px;background:var(--accent-gold);border-radius:50%"></span>' : ''}</div>`;
    }).join('');

    const eventDots = Array.from({ length: totalEvents }, (_, i) =>
      `<div class="event-dot ${i < firedCount ? 'fired' : ''}"></div>`).join('');

    // 天候エフェクト
    let weatherFx = '';
    if (currentWeather === 'sunny') {
      weatherFx = `<div class="sun"></div><div class="sun-rays"></div>
        <div class="cloud" style="width:120px;height:30px;top:20%;left:10%;animation-duration:25s;animation-delay:0s"></div>
        <div class="cloud" style="width:80px;height:20px;top:30%;left:40%;animation-duration:30s;animation-delay:8s"></div>`;
    } else if (currentWeather === 'cloudy') {
      weatherFx = `
        <div class="cloud" style="width:200px;height:50px;top:10%;left:5%;animation-duration:20s"></div>
        <div class="cloud" style="width:160px;height:40px;top:20%;left:35%;animation-duration:28s;animation-delay:5s"></div>
        <div class="cloud" style="width:140px;height:35px;top:15%;left:65%;animation-duration:35s;animation-delay:10s"></div>`;
    } else {
      // stormy
      const rainDrops = Array.from({ length: 40 }, (_, i) =>
        `<div class="rain-drop" style="left:${Math.random()*100}%;height:${15+Math.random()*20}px;animation-duration:${0.5+Math.random()*0.5}s;animation-delay:${Math.random()*1}s"></div>`
      ).join('');
      weatherFx = `
        <div class="lightning">⚡</div>
        <div class="rain-container">${rainDrops}</div>
        <div class="cloud" style="width:300px;height:70px;top:5%;left:0%;animation-duration:15s;background:rgba(80,80,100,0.3)"></div>`;
    }

    return `
    <div id="running-view">
      <!-- 空レイヤー -->
      <div class="sky-layer ${currentWeather}">${weatherFx}</div>
      <!-- 海レイヤー -->
      <div class="ocean-layer ${currentWeather}">
        <div class="wave-container">
          <div class="wave wave1"></div>
          <div class="wave wave2"></div>
          <div class="wave wave3"></div>
        </div>
        <div class="ocean-glitter"></div>
      </div>
      <!-- 船 -->
      <div class="boat-container">
        <div class="boat-wrapper">
          <div class="boat-smoke">
            <div class="smoke-puff"></div>
            <div class="smoke-puff"></div>
            <div class="smoke-puff"></div>
          </div>
          <span class="boat-emoji">⛵</span>
        </div>
      </div>
      <!-- 魚ジャンプエリア -->
      <div id="fish-jump-area" style="position:absolute;inset:0;pointer-events:none;z-index:6"></div>

      <!-- ヘッダーバー -->
      <div class="running-header-bar">
        <span class="running-company">🏢 ${companyName}</span>
        <span class="running-month">${month}月 操業中</span>
        <span class="running-weather-badge">${weatherIcon}</span>
        ${area ? `<span style="font-size:0.8rem;color:var(--text-secondary)">${area.icon} ${area.name}</span>` : ''}
        ${method ? `<span style="font-size:0.8rem;color:var(--text-secondary)">${method.icon} ${method.name}</span>` : ''}
        <div class="running-timer-wrap">
          <span class="running-timer-label">残り</span>
          <span id="running-timer-display">--</span>
          <span class="running-timer-label">秒</span>
        </div>
      </div>

      <!-- 下部UI -->
      <div class="running-ui-overlay">
        <div class="event-count-display" style="margin-bottom:6px">
          <span>イベント</span>${eventDots}<span>${firedCount}/${totalEvents}</span>
        </div>
        <div class="calendar-section">
          <div class="calendar-wrap">
            <div class="calendar-month-title">${month}月</div>
            <div class="calendar-grid">
              ${dayLabels.map(d => `<div class="calendar-day-label">${d}</div>`).join('')}
              <div class="calendar-day" style="opacity:0"></div><!-- padding -->
              ${calHtml}
            </div>
          </div>
          <div class="running-right-info">
            <div class="progress-bar-wrap">
              <div class="progress-bar"><div class="progress-bar-fill" id="progress-fill" style="width:${progress}%"></div></div>
              <div class="progress-label"><span>${currentDay} / 30日</span><span id="progress-day-right">${currentDay}日目</span></div>
            </div>
            <div id="live-log-area" class="live-log"></div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ========================================
  // 運航タイマー
  // ========================================
  private startRunning() {
    const totalDuration = GAME_CONFIG.RUNNING_DURATION * 1000;
    // イベント後に再開する場合、既に経過した時間分を差し引いてタイマーを継続
    this.runningStartTime = Date.now() - (this.state.currentDay / 30) * totalDuration;
    this.lastDay = this.state.currentDay;

    // 魚ジャンプ定期スポーン
    const jumpInterval = this.state.currentWeather === 'stormy' ? 4000 : 2500;
    this.fishSpawnInterval = window.setInterval(() => {
      const area = document.getElementById('fish-jump-area');
      if (area) spawnFishParticle(area, this.state.currentWeather);
    }, jumpInterval);

    const tick = () => {
      if (!this.runningStartTime) return;
      const elapsed = Date.now() - this.runningStartTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const targetDay = Math.min(30, Math.floor(progress * 30));
      const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));

      // UI部分更新
      const timerEl = document.getElementById('running-timer-display');
      if (timerEl) timerEl.textContent = String(remaining);
      const progressFill = document.getElementById('progress-fill') as HTMLElement;
      if (progressFill) progressFill.style.width = `${Math.round(progress * 100)}%`;

      // 日付進行
      if (targetDay > this.lastDay) {
        for (let d = this.lastDay + 1; d <= targetDay; d++) {
          const nextEvent = this.state.scheduledEvents[this.state.currentEventIndex];
          if (nextEvent && !nextEvent.resolved && d >= nextEvent.day) {
            this.stopRunning();
            this.setState(s => ({ ...s, currentDay: nextEvent.day, phase: 'EVENT' }));
            return;
          }
          this.state = { ...this.state, currentDay: d };
          this.updateCalendarDay(d);
        }
        this.lastDay = targetDay;
      }

      if (progress >= 1) {
        this.stopRunning();
        this.setState(s => finishMonth({ ...s, currentDay: 30 }));
        return;
      }
      this.runningRaf = requestAnimationFrame(tick);
    };
    this.runningRaf = requestAnimationFrame(tick);
  }

  private updateCalendarDay(day: number) {
    const calDays = document.querySelectorAll('.calendar-day');
    calDays.forEach((el, idx) => {
      // idx=0はpadding、idx=1〜30が1〜30日
      const realDay = idx;
      if (realDay === 0 || realDay > 30) return;
      if (realDay === day) {
        el.className = 'calendar-day current';
      } else if (realDay < day) {
        const isDone = this.state.scheduledEvents.some(e => e.day === realDay && e.resolved);
        el.className = isDone ? 'calendar-day event-done' : 'calendar-day past';
      }
    });
    const label = document.getElementById('progress-day-right');
    if (label) label.textContent = `${day}日目`;
  }

  // ========================================
  // イベントモーダル（通常 / クイック決断 の2種）
  // ========================================
  private renderEventModal(): string {
    const eventIdx = this.state.currentEventIndex;
    const event = this.state.scheduledEvents[eventIdx];
    if (!event) return '';

    const allMechanics = ['reaction', 'gauge', 'card', 'dice', 'mash', 'guess', 'memory', 'order'];
    const mechanic = allMechanics[Math.floor(Math.random() * allMechanics.length)];
    const mechanicLabels: Record<string, string> = {
      reaction: '⚡ 反応ゲーム', gauge: '⏱️ ゲージ止め',
      card: '🂠 カード引き', dice: '🎲 サイコロ',
      mash: '👊 連打', guess: '🎁 宝箱当て',
      memory: '🧠 記憶ゲーム', order: '🔢 順番タップ',
    };
    const dayLabel = `📅 ${event.day}日目のイベント — ${mechanicLabels[mechanic] ?? '?'}`;

    const optionsHtml = event.template.options.map((opt, i) => `
      <button class="event-option-btn" data-option="${i}">
        <div class="event-option-label">
          ${opt.label}
          <span class="risk-badge ${opt.risk}">${opt.risk === 'low' ? '低リスク' : opt.risk === 'medium' ? '中リスク' : '⚠️高リスク'}</span>
        </div>
        <div class="event-option-desc">${opt.description}</div>
      </button>`).join('');

    return `
    <div class="modal-overlay">
      <div class="event-modal" data-mechanic="${mechanic}">
        <div class="event-modal-day">${dayLabel}</div>
        <div class="event-modal-title">${event.template.title}</div>
        <div class="event-modal-body">${event.template.description}</div>
        <div class="event-options">${optionsHtml}</div>
      </div>
    </div>`;
  }

  private bindEventModal() {
    const eventIdx = this.state.currentEventIndex;
    const event = this.state.scheduledEvents[eventIdx];
    if (!event) return;

    // renderEventModal で決定したミニゲーム種類を読み取る
    const modalEl = document.querySelector('.event-modal') as HTMLElement | null;
    const mechanic = (modalEl?.dataset.mechanic ?? 'card') as 'reaction' | 'gauge' | 'card' | 'dice' | 'mash' | 'guess' | 'memory' | 'order';

    document.querySelectorAll('.event-option-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const option = event.template.options[i];
        const callback = (success: boolean) => {
          this.setState(s => resolveEvent(s, option, success));
        };
        switch (mechanic) {
          case 'gauge':    this.showGaugeStop(option, callback);    break;
          case 'card':     this.showCardDraw(option, callback);     break;
          case 'dice':     this.showDiceRoll(option, callback);     break;
          case 'mash':     this.showMashGame(option, callback);     break;
          case 'guess':    this.showGuessGame(option, callback);    break;
          case 'memory':   this.showMemoryGame(option, callback);   break;
          case 'order':    this.showOrderGame(option, callback);    break;
          default:         this.showReactionGame(option, callback); break;
        }
      });
    });
  }

  // ========================================
  // ミニゲーム①: 反応ゲーム（GO信号に反応）
  // ========================================
  private showReactionGame(option: EventOption, callback: (success: boolean) => void) {
    const thresholds: Record<string, number> = { low: 1200, medium: 800, high: 450 };
    const crewBonus = getCrewEventBonus(this.state);
    const baseThreshold = thresholds[option.risk] ?? 800;
    const threshold = Math.min(2000, Math.max(200, baseThreshold + crewBonus * 400));
    const waitMin = 1500;
    const waitMax = 4000;
    const waitDelay = waitMin + Math.random() * (waitMax - waitMin);

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">⚡ 反応ゲーム</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction">🟡 が 🟢 に変わったら素早くボタンを押せ！(${threshold}ms以内)</div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 猶予+${Math.round(crewBonus * 400)}ms</div>` : ''}
      <div class="reaction-signal" id="reaction-signal">🟡</div>
      <div class="reaction-timer" id="reaction-timer"></div>
      <button class="reaction-btn" id="reaction-btn" disabled>待機中...</button>
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    const signalEl = document.getElementById('reaction-signal');
    const timerEl = document.getElementById('reaction-timer');
    const btn = document.getElementById('reaction-btn') as HTMLButtonElement;
    const resultEl = document.getElementById('mg-result');
    const confirmBtn = document.getElementById('mg-confirm');

    let goTime = 0;
    let reacted = false;
    let earlyPressed = false;

    const finish = (reactionMs: number | null) => {
      if (reacted) return;
      reacted = true;
      btn.disabled = true;
      const success = reactionMs !== null && reactionMs <= threshold;
      if (!resultEl || !confirmBtn) return;
      if (earlyPressed) {
        audioManager.playSE('roulette-fail');
        resultEl.innerHTML = `<div class="mg-failure">❌ フライング！早押しは失敗...<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
        confirmBtn.classList.remove('hidden');
        confirmBtn.addEventListener('click', () => { overlay.remove(); callback(false); });
        return;
      }
      if (success) {
        audioManager.playSE('roulette-success');
        resultEl.innerHTML = `<div class="mg-success">✅ ${reactionMs}ms — 成功！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
      } else {
        audioManager.playSE('roulette-fail');
        resultEl.innerHTML = `<div class="mg-failure">❌ ${reactionMs ?? '?'}ms — 遅い！(${threshold}ms以内必要)<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
      }
      confirmBtn.classList.remove('hidden');
      confirmBtn.addEventListener('click', () => { overlay.remove(); callback(success); });
    };

    btn.addEventListener('click', () => {
      if (reacted) return;
      if (goTime === 0) {
        // フライング
        earlyPressed = true;
        reacted = true;
        if (signalEl) signalEl.textContent = '❌';
        finish(null);
        return;
      }
      const ms = Date.now() - goTime;
      if (timerEl) timerEl.textContent = `${ms}ms`;
      finish(ms);
    });

    setTimeout(() => {
      if (reacted) return;
      if (signalEl) signalEl.textContent = '🟢';
      signalEl?.classList.add('reaction-go');
      btn.disabled = false;
      btn.textContent = '⚡ NOW!';
      goTime = Date.now();

      // 制限時間を超えたら自動的に失敗
      setTimeout(() => {
        if (!reacted) {
          if (timerEl) timerEl.textContent = `タイムオーバー`;
          finish(threshold + 999);
        }
      }, threshold + 500);
    }, waitDelay);
  }

  // ========================================
  // ミニゲーム②: ゲージ止め
  // ========================================
  private showGaugeStop(option: EventOption, callback: (success: boolean) => void) {
    const successWidths: Record<string, number> = { low: 50, medium: 32, high: 22 };
    const crewBonus = getCrewEventBonus(this.state);
    const baseWidth = successWidths[option.risk] ?? 30;
    const successWidth = Math.min(70, Math.max(8, baseWidth + crewBonus * 100));
    const successStart = Math.random() * (100 - successWidth);

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">⏱️ ゲージ止め</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction">SUCCESS ZONE に止めろ！</div>
      <div class="gauge-bar-wrap">
        <div class="gauge-bar">
          <div class="gauge-success-zone" id="gauge-zone" style="left:${successStart}%;width:${successWidth}%">
            <span class="gauge-zone-label">SUCCESS</span>
          </div>
          <div class="gauge-cursor" id="gauge-cursor"></div>
        </div>
      </div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 ゾーン${crewBonus > 0 ? '+' : ''}${Math.round(crewBonus * 100)}%</div>` : ''}
      <button class="mg-stop-btn" id="gauge-stop-btn">■ STOP!</button>
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    let pos = 0;
    let dir = 1;
    const speed = option.risk === 'high' ? 1.4 : option.risk === 'medium' ? 0.9 : 0.55;
    let rafId: number;
    let stopped = false;

    const cursor = document.getElementById('gauge-cursor');
    const stopBtn = document.getElementById('gauge-stop-btn');
    const resultEl = document.getElementById('mg-result');
    const confirmBtn = document.getElementById('mg-confirm');

    const animate = () => {
      pos += dir * speed;
      if (pos >= 99) { pos = 99; dir = -1; }
      if (pos <= 0)  { pos = 0;  dir = 1; }
      if (cursor) cursor.style.left = `${pos}%`;
      if (!stopped) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    stopBtn?.addEventListener('click', () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      if (stopBtn) { (stopBtn as HTMLButtonElement).disabled = true; stopBtn.textContent = '■ STOPPED'; }

      const inZone = pos >= successStart && pos <= successStart + successWidth;
      if (!resultEl || !confirmBtn) return;
      if (inZone) {
        audioManager.playSE('roulette-success');
        resultEl.innerHTML = `<div class="mg-success">✅ 成功！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
        if (cursor) cursor.classList.add('gauge-cursor-success');
      } else {
        audioManager.playSE('roulette-fail');
        resultEl.innerHTML = `<div class="mg-failure">❌ 失敗...<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
        if (cursor) cursor.classList.add('gauge-cursor-fail');
      }
      confirmBtn.classList.remove('hidden');
      confirmBtn.addEventListener('click', () => { overlay.remove(); callback(inZone); });
    });
  }

  // ========================================
  // ミニゲーム③: カード引き
  // ========================================
  private showCardDraw(option: EventOption, callback: (success: boolean) => void) {
    const configs: Record<string, { total: number; success: number }> = {
      low:    { total: 4, success: 3 },
      medium: { total: 4, success: 2 },
      high:   { total: 5, success: 1 },
    };
    const crewBonus = getCrewEventBonus(this.state);
    const conf = configs[option.risk] ?? { total: 4, success: 2 };
    const totalCards = conf.total;
    let successCards = Math.min(conf.total - 1, Math.round(conf.success + crewBonus * totalCards));
    successCards = Math.max(1, successCards);

    const cards = Array(totalCards).fill(false).fill(true, 0, successCards);
    // シャッフル
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    const cardsHtml = cards.map((_, i) =>
      `<div class="draw-card" id="draw-card-${i}" data-index="${i}">
        <div class="draw-card-face front">🂠</div>
        <div class="draw-card-face back"></div>
      </div>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">🂠 カード引き</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction">${successCards}/${totalCards} 枚が当たり。1枚引け！</div>
      <div class="draw-cards-row">${cardsHtml}</div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 当たり+${Math.round(crewBonus * totalCards * 10) / 10}枚分</div>` : ''}
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    overlay.querySelectorAll('.draw-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (overlay.querySelector('.draw-card.flipped')) return; // already picked
        const idx = parseInt((card as HTMLElement).dataset.index ?? '0');
        const isSuccess = cards[idx];

        card.classList.add('flipped');
        const backFace = card.querySelector('.draw-card-face.back') as HTMLElement;
        if (backFace) backFace.textContent = isSuccess ? '✅' : '❌';

        setTimeout(() => {
          // すべてのカードを公開
          overlay.querySelectorAll('.draw-card').forEach((c, ci) => {
            if (ci !== idx) {
              c.classList.add('flipped', 'revealed');
              const bf = c.querySelector('.draw-card-face.back') as HTMLElement;
              if (bf) bf.textContent = cards[ci] ? '🐟' : '💀';
            }
          });

          const resultEl = document.getElementById('mg-result');
          const confirmBtn = document.getElementById('mg-confirm');
          if (!resultEl || !confirmBtn) return;
          if (isSuccess) {
            audioManager.playSE('roulette-success');
            resultEl.innerHTML = `<div class="mg-success">✅ 当たり！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
          } else {
            audioManager.playSE('roulette-fail');
            resultEl.innerHTML = `<div class="mg-failure">❌ はずれ...<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
          }
          confirmBtn.classList.remove('hidden');
          confirmBtn.addEventListener('click', () => { overlay.remove(); callback(isSuccess); });
        }, 600);
      });
    });
  }

  // ========================================
  // ミニゲーム④: サイコロ
  // ========================================
  private showDiceRoll(option: EventOption, callback: (success: boolean) => void) {
    const thresholds: Record<string, number> = { low: 4, medium: 7, high: 9 };
    const crewBonus = getCrewEventBonus(this.state);
    const threshold = Math.max(2, Math.round((thresholds[option.risk] ?? 7) - crewBonus * 6));

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;
    const success = total >= threshold;

    const diceFaces = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">🎲 サイコロ</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction">2d6 で ${threshold} 以上を出せ！</div>
      <div class="dice-roll-area">
        <div class="dice-box" id="dice1">🎲</div>
        <span class="dice-plus">+</span>
        <div class="dice-box" id="dice2">🎲</div>
        <span class="dice-eq">=</span>
        <div class="dice-total" id="dice-total">?</div>
      </div>
      <div class="dice-threshold">目標: ${threshold} 以上</div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 目標値-${Math.abs(Math.round(crewBonus * 6))}</div>` : ''}
      <button class="mg-roll-btn" id="dice-roll-btn">🎲 サイコロを振る！</button>
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    document.getElementById('dice-roll-btn')?.addEventListener('click', () => {
      const rollBtn = document.getElementById('dice-roll-btn') as HTMLButtonElement;
      if (rollBtn) { rollBtn.disabled = true; rollBtn.textContent = '振り中...'; }

      const dice1El = document.getElementById('dice1');
      const dice2El = document.getElementById('dice2');
      const totalEl = document.getElementById('dice-total');

      // サイコロがランダムに回るアニメーション
      let ticks = 0;
      const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
      const rollInterval = setInterval(() => {
        if (dice1El) dice1El.textContent = faces[Math.floor(Math.random() * 6)];
        if (dice2El) dice2El.textContent = faces[Math.floor(Math.random() * 6)];
        ticks++;
        if (ticks >= 12) {
          clearInterval(rollInterval);
          if (dice1El) dice1El.textContent = diceFaces[die1];
          if (dice2El) dice2El.textContent = diceFaces[die2];
          if (totalEl) {
            totalEl.textContent = String(total);
            totalEl.className = `dice-total ${success ? 'pos' : 'neg'}`;
          }

          setTimeout(() => {
            const resultEl = document.getElementById('mg-result');
            const confirmBtn = document.getElementById('mg-confirm');
            if (!resultEl || !confirmBtn) return;
            if (success) {
              audioManager.playSE('roulette-success');
              resultEl.innerHTML = `<div class="mg-success">✅ ${total} ≥ ${threshold} 成功！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
            } else {
              audioManager.playSE('roulette-fail');
              resultEl.innerHTML = `<div class="mg-failure">❌ ${total} < ${threshold} 失敗...<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
            }
            confirmBtn.classList.remove('hidden');
            confirmBtn.addEventListener('click', () => { overlay.remove(); callback(success); });
          }, 500);
        }
      }, 80);
    });
  }

  // ========================================
  // ミニゲーム⑤: 連打ゲーム
  // ========================================
  private showMashGame(option: EventOption, callback: (success: boolean) => void) {
    const requiredClicks: Record<string, number> = { low: 20, medium: 32, high: 45 };
    const crewBonus = getCrewEventBonus(this.state);
    const target = Math.max(5, Math.round((requiredClicks[option.risk] ?? 32) - crewBonus * 12));
    const timeLimit = 2500; // 2.5秒

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">👊 連打ゲーム</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction">2.5秒以内に ${target} 回ボタンを押せ！</div>
      <div class="mash-progress">
        <div class="mash-count" id="mash-count">0 / ${target}</div>
        <div class="mash-bar-wrap"><div class="mash-bar" id="mash-bar" style="width:0%"></div></div>
        <div class="mash-timer" id="mash-timer">⏱ 2.5s</div>
      </div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 目標-${Math.round(crewBonus * 12)}回</div>` : ''}
      <button class="mash-btn" id="mash-btn">👊 叩く！</button>
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    let clicks = 0;
    let started = false;
    let finished = false;
    let startTime = 0;
    let rafId: number;

    const mashBtn = document.getElementById('mash-btn') as HTMLButtonElement;
    const countEl = document.getElementById('mash-count');
    const barEl = document.getElementById('mash-bar');
    const timerEl = document.getElementById('mash-timer');
    const resultEl = document.getElementById('mg-result');
    const confirmBtn = document.getElementById('mg-confirm');

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      if (mashBtn) { mashBtn.disabled = true; }
      const success = clicks >= target;
      if (!resultEl || !confirmBtn) return;
      if (success) {
        audioManager.playSE('roulette-success');
        resultEl.innerHTML = `<div class="mg-success">✅ ${clicks}/${target} 達成！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
      } else {
        audioManager.playSE('roulette-fail');
        resultEl.innerHTML = `<div class="mg-failure">❌ ${clicks}/${target} 惜しい...<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
      }
      confirmBtn.classList.remove('hidden');
      confirmBtn.addEventListener('click', () => { overlay.remove(); callback(success); });
    };

    const tick = () => {
      if (finished) return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, timeLimit - elapsed);
      if (timerEl) timerEl.textContent = `⏱ ${(remaining / 1000).toFixed(1)}s`;
      if (remaining <= 0) { finish(); return; }
      rafId = requestAnimationFrame(tick);
    };

    mashBtn?.addEventListener('click', () => {
      if (finished) return;
      if (!started) {
        started = true;
        startTime = Date.now();
        rafId = requestAnimationFrame(tick);
      }
      clicks++;
      const pct = Math.min(100, (clicks / target) * 100);
      if (countEl) countEl.textContent = `${clicks} / ${target}`;
      if (barEl) barEl.style.width = `${pct}%`;
      if (clicks >= target) finish();
    });
  }

  // ========================================
  // ミニゲーム⑥: 宝箱当て（シェルゲーム）
  // ========================================
  private showGuessGame(option: EventOption, callback: (success: boolean) => void) {
    const boxCounts: Record<string, number> = { low: 3, medium: 4, high: 5 };
    const crewBonus = getCrewEventBonus(this.state);
    const totalBoxes = boxCounts[option.risk] ?? 4;
    // クルーボーナスで正解箱を増やす（最低1箱）
    const winBoxes = Math.min(totalBoxes - 1, Math.max(1, Math.round(1 + crewBonus * totalBoxes)));
    const winSet = new Set<number>();
    while (winSet.size < winBoxes) winSet.add(Math.floor(Math.random() * totalBoxes));

    const boxEmojis = ['🎁', '📦', '🧰', '💼', '🎒'];
    const boxHtml = Array.from({ length: totalBoxes }, (_, i) =>
      `<button class="guess-box" data-box="${i}" title="箱${i + 1}">${boxEmojis[i % boxEmojis.length]}</button>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">🎁 宝箱当て</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction">${winBoxes}/${totalBoxes} 箱に魚が入っている。1箱選べ！</div>
      <div class="guess-boxes-row">${boxHtml}</div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 当たり+${Math.round(crewBonus * totalBoxes)}箱分</div>` : ''}
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    overlay.querySelectorAll('.guess-box').forEach(box => {
      box.addEventListener('click', () => {
        if (overlay.querySelector('.guess-box.opened')) return;
        const idx = parseInt((box as HTMLElement).dataset.box ?? '0');
        const isWin = winSet.has(idx);

        // 全箱を開ける
        overlay.querySelectorAll('.guess-box').forEach((b, bi) => {
          (b as HTMLButtonElement).disabled = true;
          b.textContent = winSet.has(bi) ? '🐟' : '💀';
          b.classList.add('opened', winSet.has(bi) ? 'opened-win' : 'opened-lose');
        });
        (box as HTMLElement).classList.add('opened-picked');

        const resultEl = document.getElementById('mg-result');
        const confirmBtn = document.getElementById('mg-confirm');
        if (!resultEl || !confirmBtn) return;
        setTimeout(() => {
          if (isWin) {
            audioManager.playSE('roulette-success');
            resultEl.innerHTML = `<div class="mg-success">✅ 当たり！🐟 魚がいた！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
          } else {
            audioManager.playSE('roulette-fail');
            resultEl.innerHTML = `<div class="mg-failure">❌ 外れ...💀<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
          }
          confirmBtn.classList.remove('hidden');
          confirmBtn.addEventListener('click', () => { overlay.remove(); callback(isWin); });
        }, 400);
      });
    });
  }

  // ========================================
  // ミニゲーム⑦: 記憶ゲーム（光ったマスを覚えて再現）
  // ========================================
  private showMemoryGame(option: EventOption, callback: (success: boolean) => void) {
    const seqLengths: Record<string, number> = { low: 3, medium: 5, high: 7 };
    const crewBonus = getCrewEventBonus(this.state);
    const seqLen = Math.max(2, Math.round((seqLengths[option.risk] ?? 5) - crewBonus * 2));
    const gridSize = 9; // 3x3

    const sequence: number[] = [];
    while (sequence.length < seqLen) {
      const n = Math.floor(Math.random() * gridSize);
      if (!sequence.includes(n)) sequence.push(n);
    }

    const cellsHtml = Array.from({ length: gridSize }, (_, i) =>
      `<button class="memory-cell" id="mc-${i}" data-idx="${i}"></button>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">🧠 記憶ゲーム</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction" id="mem-instruction">光ったマスを覚えろ！</div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 覚える数-${Math.round(crewBonus * 2)}</div>` : ''}
      <div class="memory-grid">${cellsHtml}</div>
      <div class="memory-progress" id="mem-progress"></div>
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    const instructionEl = document.getElementById('mem-instruction');
    const progressEl = document.getElementById('mem-progress');
    const resultEl = document.getElementById('mg-result');
    const confirmBtn = document.getElementById('mg-confirm');

    let phase: 'show' | 'input' = 'show';
    let inputSeq: number[] = [];

    const getCell = (i: number) => document.getElementById(`mc-${i}`);

    // Show sequence
    const showSequence = async () => {
      for (let i = 0; i < seqLen; i++) {
        await new Promise(r => setTimeout(r, 500));
        const cell = getCell(sequence[i]);
        if (cell) { cell.classList.add('memory-lit'); }
        await new Promise(r => setTimeout(r, 500));
        if (cell) { cell.classList.remove('memory-lit'); }
      }
      await new Promise(r => setTimeout(r, 300));
      phase = 'input';
      if (instructionEl) instructionEl.textContent = `覚えた順に ${seqLen} マスを押せ！`;
      if (progressEl) progressEl.textContent = `0 / ${seqLen}`;
      overlay.querySelectorAll('.memory-cell').forEach(c => (c as HTMLButtonElement).disabled = false);
    };

    overlay.querySelectorAll('.memory-cell').forEach(cell => {
      (cell as HTMLButtonElement).disabled = true;
      cell.addEventListener('click', () => {
        if (phase !== 'input') return;
        const idx = parseInt((cell as HTMLElement).dataset.idx ?? '0');
        inputSeq.push(idx);
        const pos = inputSeq.length - 1;
        const correct = sequence[pos] === idx;
        cell.classList.add(correct ? 'memory-lit' : 'memory-wrong');
        setTimeout(() => cell.classList.remove('memory-lit', 'memory-wrong'), 300);
        if (progressEl) progressEl.textContent = `${inputSeq.length} / ${seqLen}`;

        if (!correct) {
          phase = 'show';
          overlay.querySelectorAll('.memory-cell').forEach(c => (c as HTMLButtonElement).disabled = true);
          setTimeout(() => {
            audioManager.playSE('roulette-fail');
            if (!resultEl || !confirmBtn) return;
            resultEl.innerHTML = `<div class="mg-failure">❌ ${pos + 1}番目が違う！失敗...<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
            confirmBtn.classList.remove('hidden');
            confirmBtn.addEventListener('click', () => { overlay.remove(); callback(false); });
          }, 400);
          return;
        }
        if (inputSeq.length >= seqLen) {
          phase = 'show';
          overlay.querySelectorAll('.memory-cell').forEach(c => (c as HTMLButtonElement).disabled = true);
          setTimeout(() => {
            audioManager.playSE('roulette-success');
            if (!resultEl || !confirmBtn) return;
            resultEl.innerHTML = `<div class="mg-success">✅ 全部正解！完璧な記憶！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
            confirmBtn.classList.remove('hidden');
            confirmBtn.addEventListener('click', () => { overlay.remove(); callback(true); });
          }, 400);
        }
      });
    });

    showSequence();
  }

  // ========================================
  // ミニゲーム⑧: 順番タップ（数字を小さい順に押せ）
  // ========================================
  private showOrderGame(option: EventOption, callback: (success: boolean) => void) {
    const configs: Record<string, { count: number; time: number }> = {
      low:    { count: 5, time: 7000 },
      medium: { count: 8, time: 7000 },
      high:   { count: 12, time: 8000 },
    };
    const crewBonus = getCrewEventBonus(this.state);
    const conf = configs[option.risk] ?? { count: 8, time: 7000 };
    const count = Math.max(3, Math.round(conf.count - crewBonus * 3));
    const timeLimit = conf.time;

    const positions: Array<{ x: number; y: number }> = [];
    const numbers = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = 0; i < count; i++) {
      let x: number, y: number, ok: boolean;
      let tries = 0;
      do {
        x = 5 + Math.random() * 80;
        y = 5 + Math.random() * 80;
        ok = positions.every(p => Math.hypot(p.x - x, p.y - y) > 18);
        tries++;
      } while (!ok && tries < 50);
      positions.push({ x, y });
    }

    const numHtml = numbers.map((n, i) =>
      `<button class="order-num" id="on-${n}" data-num="${n}" style="left:${positions[i].x}%;top:${positions[i].y}%">${n}</button>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
    <div class="minigame-modal">
      <div class="mg-header">
        <span class="mg-type-badge">🔢 順番タップ</span>
        <span class="risk-badge ${option.risk}">${{ low: '低リスク', medium: '中リスク', high: '⚠️高リスク' }[option.risk]}</span>
      </div>
      <div class="mg-option-label">${option.label}</div>
      <div class="mg-instruction">1 から ${count} まで順番に押せ！</div>
      ${crewBonus !== 0 ? `<div class="mg-crew-bonus-row ${crewBonus > 0 ? 'pos' : 'neg'}">クルー補正 数-${Math.round(crewBonus * 3)}</div>` : ''}
      <div class="order-timer" id="order-timer">⏱ ${(timeLimit / 1000).toFixed(1)}s</div>
      <div class="order-area">${numHtml}</div>
      <div class="mg-result" id="mg-result"></div>
      <button class="mg-confirm-btn hidden" id="mg-confirm">続ける →</button>
    </div>`;
    document.body.appendChild(overlay);
    audioManager.playSE('event');

    const timerEl = document.getElementById('order-timer');
    const resultEl = document.getElementById('mg-result');
    const confirmBtn = document.getElementById('mg-confirm');

    let nextExpected = 1;
    let finished = false;
    const startTime = Date.now();

    const finish = (success: boolean) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      overlay.querySelectorAll('.order-num').forEach(b => (b as HTMLButtonElement).disabled = true);
      if (!resultEl || !confirmBtn) return;
      if (success) {
        audioManager.playSE('roulette-success');
        resultEl.innerHTML = `<div class="mg-success">✅ 全部押した！<span class="mg-effect">${this.describeEffect(option.effect)}</span></div>`;
      } else {
        audioManager.playSE('roulette-fail');
        resultEl.innerHTML = `<div class="mg-failure">❌ タイムオーバー！${nextExpected - 1}/${count}まで押した<span class="mg-effect">${this.describeEffect(option.failureEffect ?? option.effect)}</span></div>`;
      }
      confirmBtn.classList.remove('hidden');
      confirmBtn.addEventListener('click', () => { overlay.remove(); callback(success); });
    };

    let rafId: number;
    const tick = () => {
      if (finished) return;
      const remaining = Math.max(0, timeLimit - (Date.now() - startTime));
      if (timerEl) timerEl.textContent = `⏱ ${(remaining / 1000).toFixed(1)}s`;
      if (remaining <= 0) { finish(false); return; }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    overlay.querySelectorAll('.order-num').forEach(btn => {
      btn.addEventListener('click', () => {
        if (finished) return;
        const n = parseInt((btn as HTMLElement).dataset.num ?? '0');
        if (n !== nextExpected) {
          btn.classList.add('order-wrong');
          setTimeout(() => btn.classList.remove('order-wrong'), 300);
          return;
        }
        (btn as HTMLButtonElement).disabled = true;
        btn.classList.add('order-done');
        nextExpected++;
        if (nextExpected > count) finish(true);
      });
    });
  }

  private describeEffect(eff: EventEffect): string {
    const parts: string[] = [];
    if (eff.moneyDelta) parts.push(`${eff.moneyDelta >= 0 ? '+' : ''}¥${eff.moneyDelta.toLocaleString()}`);
    if (eff.yieldMultiplier && eff.yieldMultiplier !== 1.0) {
      const pct = Math.round((eff.yieldMultiplier - 1) * 100);
      parts.push(`水揚げ${pct >= 0 ? '+' : ''}${pct}%`);
    }
    if (eff.reputationDelta) parts.push(`評判${eff.reputationDelta >= 0 ? '+' : ''}${eff.reputationDelta}`);
    return parts.length > 0 ? parts.join(' / ') : '影響なし';
  }

  // ========================================
  // ゲーム終了
  // ========================================
  private renderEndModal(): string {
    const score = calculateScore(this.state);
    const { companyName, totalProfit, level, reputation, debt, unlockedAreas, unlockedMethods } = this.state;
    const dm = GAME_CONFIG.scoreMultiplier;
    const levelBonus = (level - 1) * 500000;
    const unlockedBonus = (unlockedAreas.length + unlockedMethods.length) * 100000;
    const repBonus = reputation * 10000;
    const debtPenalty = debt * 0.5;
    return `
    <div class="end-modal">
      <div class="result-box">
        <h2>🏁 12か月終了</h2>
        <div style="font-size:0.85rem;color:var(--text-muted)">${companyName}</div>
        <div class="final-score" id="final-score-display">0 pt</div>
        <div class="score-breakdown">
          <div class="score-row"><span>総利益</span><span class="${totalProfit >= 0 ? 'text-green' : 'text-red'}">¥${totalProfit.toLocaleString()}</span></div>
          <div class="score-row"><span>レベルボーナス (Lv.${level})</span><span class="text-gold">+¥${levelBonus.toLocaleString()}</span></div>
          <div class="score-row"><span>解放ボーナス (${unlockedAreas.length}海域/${unlockedMethods.length}漁法)</span><span class="text-gold">+¥${unlockedBonus.toLocaleString()}</span></div>
          <div class="score-row"><span>評判ボーナス (${reputation}pt)</span><span class="text-gold">+¥${repBonus.toLocaleString()}</span></div>
          ${debt > 0 ? `<div class="score-row"><span>借金ペナルティ</span><span class="text-red">-¥${debtPenalty.toLocaleString()}</span></div>` : ''}
          <div class="score-row"><span>スコア倍率</span><span>×${dm}</span></div>
          <div class="score-row total"><span>最終スコア</span><span class="text-gold">${score.toLocaleString()} pt</span></div>
        </div>
        <div id="ranking-section"><div style="color:var(--text-muted);font-size:0.8rem">ランキングを読み込み中...</div></div>
        <div class="btn-row">
          <button id="retry-btn" class="btn-primary">🔄 もう一度プレイ</button>
          <button id="share-btn" class="btn-secondary">📋 結果をコピー</button>
        </div>
      </div>
    </div>`;
  }

  private bindEndModal() {
    const score = calculateScore(this.state);
    // スコアカウントアップ
    setTimeout(() => {
      const el = document.getElementById('final-score-display');
      if (el) countUp(el, score, 1500, '');
      if (score > 5000000) spawnCoins(12);
    }, 300);

    this.submitAndLoadRanking();
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.state = createInitialState();
      this.render();
    });
    document.getElementById('share-btn')?.addEventListener('click', () => {
      const text = `【石川漁業シミュレーション】\n${this.state.companyName} スコア: ${score.toLocaleString()}pt\n Lv.${this.state.level}`;
      navigator.clipboard.writeText(text).catch(() => prompt('結果テキスト:', text));
    });
  }

  // ========================================
  // プロローグ
  // ========================================
  private renderPrologue(): string {
    const slide = PROLOGUE_SLIDES[this.state.prologueSlide] ?? PROLOGUE_SLIDES[0];
    const char = CHARACTERS.find(c => c.id === slide.character);
    const isLast = this.state.prologueSlide >= PROLOGUE_SLIDES.length - 1;
    const dots = PROLOGUE_SLIDES.map((_, i) =>
      `<span class="prologue-dot${i === this.state.prologueSlide ? ' active' : ''}"></span>`
    ).join('');

    return `
    <div class="prologue-overlay">
      <div class="prologue-scene">
        <div class="prologue-ocean-bg">${slide.bgEmoji}</div>
        <div class="prologue-dialogue" style="border-color: ${char?.color ?? '#4fc3f7'}60">
          <div class="prologue-portrait">${char?.portrait ?? '📜'}</div>
          <div class="prologue-text-area">
            <div class="prologue-char-name" style="color: ${char?.color ?? '#4fc3f7'}">${char?.name ?? ''}</div>
            ${char?.role ? `<div class="prologue-char-role">${char.role}</div>` : ''}
            <div class="prologue-title">${slide.title}</div>
            <div class="prologue-lines">
              ${slide.lines.map(l => `<p>${l}</p>`).join('')}
            </div>
          </div>
        </div>
        <div class="prologue-controls">
          <div class="prologue-dots">${dots}</div>
          <div class="prologue-btns">
            <button id="prologue-skip-btn" class="prologue-skip-btn">スキップ</button>
            <button id="prologue-next-btn" class="prologue-next-btn">
              ${isLast ? '会社を立ち上げる ⛵' : '次へ →'}
            </button>
          </div>
        </div>
      </div>
    </div>`;
  }

  private bindPrologue() {
    document.getElementById('prologue-next-btn')?.addEventListener('click', () => {
      const nextSlide = this.state.prologueSlide + 1;
      if (nextSlide >= PROLOGUE_SLIDES.length) {
        this.setState(s => ({ ...s, phase: 'SETUP' as const }));
      } else {
        this.setState(s => ({ ...s, prologueSlide: nextSlide }));
      }
    });
    document.getElementById('prologue-skip-btn')?.addEventListener('click', () => {
      this.setState(s => ({ ...s, phase: 'SETUP' as const }));
    });
  }

  // ========================================
  // ストーリービートモーダル
  // ========================================
  private renderStoryBeatModal(beat: StoryBeat): string {
    const char = CHARACTERS.find(c => c.id === beat.character);
    return `
    <div class="story-modal-overlay">
      <div class="story-modal" style="border-color: ${char?.color ?? '#4fc3f7'}">
        <div class="story-modal-header" style="background: ${char?.color ?? '#4fc3f7'}18; border-bottom: 1px solid ${char?.color ?? '#4fc3f7'}50">
          <span class="story-portrait">${char?.portrait ?? '📖'}</span>
          <div class="story-char-info">
            <span class="story-char-name">${char?.name ?? ''}</span>
            <span class="story-char-role">${char?.role ?? ''}</span>
          </div>
          <span class="story-month-badge">${this.state.month}月</span>
        </div>
        <div class="story-modal-body">
          ${beat.lines.map(l => `<p class="story-line">${l}</p>`).join('')}
        </div>
        <button id="story-close-btn" class="story-close-btn">理解した！漁へ出よう ⛵</button>
      </div>
    </div>`;
  }

  private bindStoryBeat() {
    document.getElementById('story-close-btn')?.addEventListener('click', () => {
      this.setState(s => ({ ...s, storyBeatSeen: true }));
    });
  }

  // ========================================
  // チュートリアルオーバーレイ
  // ========================================
  private renderTutorialOverlay(): string {
    const { tutorialStep } = this.state;
    if (tutorialStep <= 0) return '';
    // フェーズがスキップされた場合、現在フェーズに対応する最初のステップに自動進行
    const step = TUTORIAL_STEPS.find(s => s.id >= tutorialStep && s.phase === this.state.phase);
    if (!step) return '';
    if (step.id !== tutorialStep) {
      this.state = { ...this.state, tutorialStep: step.id };
    }
    const char = CHARACTERS.find(c => c.id === step.character);
    const isLast = step.id === TUTORIAL_STEPS.length;
    return `
    <div id="tutorial-overlay" class="tutorial-overlay">
      <div class="tutorial-tooltip">
        <div class="tutorial-portrait">${char?.portrait ?? '💬'}</div>
        <div class="tutorial-content">
          <div class="tutorial-header">
            <span class="tutorial-char-name">${char?.name ?? ''}</span>
            <span class="tutorial-badge">チュートリアル ${step.id}/${TUTORIAL_STEPS.length}</span>
          </div>
          <div class="tutorial-lines">
            ${step.lines.map(l => `<p>${l}</p>`).join('')}
          </div>
        </div>
        <button id="tutorial-next-btn" class="tutorial-next-btn">
          ${isLast ? '完了！' : 'わかった'}
        </button>
      </div>
    </div>`;
  }

  private appendTutorialOverlay() {
    const html = this.renderTutorialOverlay();
    if (!html) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const el = wrapper.firstElementChild;
    if (el) {
      this.root.appendChild(el);
      this.bindTutorial();
    }
  }

  private bindTutorial() {
    document.getElementById('tutorial-next-btn')?.addEventListener('click', () => {
      const next = this.state.tutorialStep + 1;
      const newStep = next > TUTORIAL_STEPS.length ? -1 : next;
      // 全フェーズでDOM直接操作（フラッシュなし）
      this.state = { ...this.state, tutorialStep: newStep };
      const nextHtml = this.renderTutorialOverlay();
      const overlay = document.getElementById('tutorial-overlay');
      if (nextHtml) {
        if (overlay) {
          overlay.outerHTML = nextHtml;
        } else {
          document.body.insertAdjacentHTML('beforeend', nextHtml);
        }
        this.bindTutorial();
      } else {
        overlay?.remove();
      }
    });
  }

  private async submitAndLoadRanking() {
    const score = calculateScore(this.state);
    await submitScore({ companyName: this.state.companyName, score, difficulty: 'extreme', level: this.state.level, totalProfit: this.state.totalProfit });
    const rankings = await getLeaderboard(20);
    const myIdx = rankings.findIndex(r => r.companyName === this.state.companyName && r.score === score);
    const rankingSection = document.getElementById('ranking-section');
    if (!rankingSection) return;
    const rowsHtml = rankings.slice(0, 10).map((r, i) => {
      const isMe = i === myIdx;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      const diffLabel = r.difficulty === 'extreme' ? '☠️激ムズ' : r.difficulty === 'hard' ? 'ハード' : 'ノーマル';
      return `<tr ${isMe ? 'class="my-rank"' : ''}><td>${medal}</td><td>${r.companyName}${isMe ? ' 👈' : ''}</td><td>${r.score.toLocaleString()}</td><td>${diffLabel}</td><td>Lv.${r.level}</td></tr>`;
    }).join('');
    rankingSection.innerHTML = `
    <div style="font-size:0.85rem;font-weight:700;margin:12px 0 6px;color:var(--accent-primary)">
      🏆 ランキング ${myIdx >= 0 ? `（あなたは${myIdx + 1}位）` : ''}
    </div>
    <table class="ranking-table">
      <thead><tr><th>#</th><th>会社名</th><th>スコア</th><th>難易度</th><th>Lv</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
  }
}
