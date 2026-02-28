// ========================================
// メインアプリケーション v2（アニメーション強化版）
// ========================================

import '../styles/main.css';
import { audioManager } from '../game/audio';
import type { GameState, EventOption } from '../game/types';
import {
  createInitialState, setPhase, startMonth, startGame, applyBorrow,
  prepareOperation, advanceDay, resolveEvent, finishMonth,
  checkGrowth, proceedToNextMonth, purchaseUpgrade, calculateScore,
  isAreaRestricted, isMethodRestricted,
} from '../game/engine';
import { FISHING_AREAS, FISHING_METHODS, FISH_SPECIES, FISHERMEN, GAME_CONFIG, DIFFICULTY_CONFIG } from '../game/data';
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
  difficulty: string, fuelReduction: number
): { min: number; max: number; topFish: typeof FISH_SPECIES } {
  const area = FISHING_AREAS.find(a => a.id === areaId)!;
  const method = FISHING_METHODS.find(m => m.id === methodId)!;
  const validFish = FISH_SPECIES.filter(f => f.areas.includes(areaId) && f.methods.includes(methodId));
  const dc = DIFFICULTY_CONFIG[difficulty as 'normal' | 'hard' | 'extreme'] ?? DIFFICULTY_CONFIG.normal;

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

  const min = Math.round(totalRevMin - fuelCost - fixedCost);
  const max = Math.round(totalRevMax - fuelCost - fixedCost);

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
  // メインレンダリング
  // ========================================
  private render() {
    const { phase } = this.state;
    if (phase === 'INIT' || phase === 'SETUP') {
      this.root.innerHTML = this.renderSetup();
      this.bindSetup();
      return;
    }
    if (phase === 'RUNNING') {
      this.root.innerHTML = this.renderRunningView();
      this.startRunning();
      return;
    }
    if (phase === 'EVENT') {
      this.root.innerHTML = this.renderMainLayout() + this.renderEventModal();
      this.bindMainLayout();
      this.bindEventModal();
      return;
    }
    if (phase === 'END') {
      this.root.innerHTML = this.renderMainLayout() + this.renderEndModal();
      this.bindMainLayout();
      this.bindEndModal();
      return;
    }
    this.root.innerHTML = this.renderMainLayout();
    this.bindMainLayout();

    // 結果フェーズのアニメーション
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
        </div>
        <div class="setup-form">
          <div>
            <label class="form-label">会社名</label>
            <input id="company-name-input" class="form-input" type="text"
              placeholder="例：能登漁業（株）" maxlength="20"
              value="${this.state.companyName}" />
          </div>
          <div>
            <label class="form-label">難易度</label>
            <div class="difficulty-options">
              <div class="diff-option ${this.state.difficulty === 'normal' ? 'selected-normal' : ''}" data-diff="normal">
                <div class="diff-name" style="color:#a5d6a7">🟢 ノーマル</div>
                <div class="diff-desc">価格変動 ±15%・固定費25万<br>嵐確率28%・スコア×1.0</div>
              </div>
              <div class="diff-option ${this.state.difficulty === 'hard' ? 'selected-hard' : ''}" data-diff="hard">
                <div class="diff-name" style="color:#ef9a9a">🔴 ハード</div>
                <div class="diff-desc">価格変動 ±30%・固定費32万<br>嵐確率38%・スコア×2.0</div>
              </div>
              <div class="diff-option ${this.state.difficulty === 'extreme' ? 'selected-extreme' : ''}" data-diff="extreme">
                <div class="diff-name" style="color:#ff6b35">☠️ 激ムズ</div>
                <div class="diff-desc">初期資金150万・固定費42万<br>嵐確率50%・月利15%<br>ほぼ破産確定・スコア×5.0</div>
              </div>
            </div>
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
    document.querySelectorAll('.diff-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const diff = (opt as HTMLElement).dataset.diff as 'normal' | 'hard' | 'extreme';
        this.state = { ...this.state, difficulty: diff };
        document.querySelectorAll('.diff-option').forEach(o => o.classList.remove('selected-normal', 'selected-hard', 'selected-extreme'));
        opt.classList.add(diff === 'normal' ? 'selected-normal' : diff === 'hard' ? 'selected-hard' : 'selected-extreme');
      });
    });
    startBtn?.addEventListener('click', () => {
      if (!this.state.companyName.trim()) return;
      audioManager.resume();
      audioManager.startBGM();
      audioManager.playSE('decision');
      this.setState(s => startGame(s));
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
        ${this.renderLogPanel()}
      </div>
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
    const { companyName, month, difficulty, phase, currentWeather, money } = this.state;
    const weatherIcon = { sunny: '☀️', cloudy: '☁️', stormy: '⛈️' }[currentWeather];
    const phaseMsg = this.getPhaseMessage(phase);
    return `
    <div id="header">
      <span class="company-name">🏢 ${companyName}</span>
      <span class="month-display">${month}月</span>
      <span class="difficulty-badge ${difficulty}">${difficulty === 'normal' ? 'ノーマル' : difficulty === 'hard' ? 'ハード' : '☠️激ムズ'}</span>
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
        <div style="font-size:0.62rem;color:var(--text-muted);margin-bottom:4px">
          累積利益 ¥${totalProfit.toLocaleString()} / ¥${(GAME_CONFIG.LEVEL_THRESHOLDS[level] || 99999999).toLocaleString()}
        </div>
        <div class="reputation-bar" title="評判 ${reputation}/100">
          <div class="reputation-bar-fill" style="width:${reputation}%"></div>
        </div>
        <div style="font-size:0.62rem;color:var(--text-muted);margin-bottom:8px">⭐ 評判 ${reputation}/100</div>
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
      </div>
    </div>`;
  }

  // ========================================
  // 右パネル
  // ========================================
  private renderRightPanel(): string {
    const { selectedAreaId, selectedMethodId, selectedFishermanId, phase, unlockedAreas, unlockedMethods } = this.state;
    const isDecision = phase === 'DECISION';

    const areasHtml = FISHING_AREAS.map(area => {
      const unlocked = unlockedAreas.includes(area.id);
      const restricted = unlocked && isAreaRestricted(this.state, area.id);
      const selected = selectedAreaId === area.id;
      let cls = 'select-item';
      if (!unlocked) cls += ' locked';
      else if (restricted) cls += ' restricted';
      else if (selected) cls += ' selected';
      const badge = !unlocked ? '<span class="lock-icon">🔒</span>'
        : restricted ? '<span class="restrict-badge">規制中</span>' : '';
      return `<div class="${cls}" data-area="${area.id}" ${!isDecision || !unlocked || restricted ? 'style="pointer-events:none"' : ''}>
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
      const badge = !unlocked ? '<span class="lock-icon">🔒</span>'
        : restricted ? '<span class="restrict-badge">規制中</span>'
        : !applicable && area ? '<span class="restrict-badge">不可</span>' : '';
      return `<div class="${cls}" data-method="${method.id}"
        ${!isDecision || !unlocked || restricted || (!applicable && !!area) ? 'style="pointer-events:none"' : ''}>
        <span class="item-icon">${method.icon}</span>
        <span class="item-name">${method.name}</span>
        <span class="item-sub">燃×${method.fuelMultiplier}</span>${badge}
      </div>`;
    }).join('');

    const fishermenHtml = FISHERMEN.map(f => `
      <div class="npc-card ${selectedFishermanId === f.id ? 'selected' : ''}" data-fisher="${f.id}"
        ${!isDecision ? 'style="pointer-events:none"' : ''}>
        <div class="npc-name">${f.name}</div>
        <div class="npc-trait">${f.description.slice(0, 30)}...</div>
      </div>`).join('');

    return `
    <div id="right-panel" class="panel">
      <div class="panel-header">意思決定リソース</div>
      <div class="panel-body">
        <div class="section-title">🌊 海域</div>${areasHtml}
        <div class="section-title">⚙️ 漁法</div>${methodsHtml}
        <div class="section-title">👨‍✈️ 漁師</div>${fishermenHtml}
      </div>
    </div>`;
  }

  private bindRightPanel() {
    if (this.state.phase !== 'DECISION') return;
    document.querySelectorAll('[data-area]').forEach(el => {
      el.addEventListener('click', () => {
        const areaId = (el as HTMLElement).dataset.area!;
        audioManager.playSE('select');
        this.setState(s => ({ ...s, selectedAreaId: areaId }));
      });
    });
    document.querySelectorAll('[data-method]').forEach(el => {
      el.addEventListener('click', () => {
        const methodId = (el as HTMLElement).dataset.method!;
        audioManager.playSE('select');
        this.setState(s => ({ ...s, selectedMethodId: methodId }));
      });
    });
    document.querySelectorAll('[data-fisher]').forEach(el => {
      el.addEventListener('click', () => {
        const fisherId = (el as HTMLElement).dataset.fisher!;
        audioManager.playSE('select');
        this.setState(s => ({ ...s, selectedFishermanId: fisherId }));
      });
    });
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
      this.setState(s => setPhase(s, 'DECISION'));
    });
  }

  // ---- 判断パネル ----
  private renderDecision(): string {
    const { selectedAreaId, selectedMethodId, isResting, month, currentWeather, difficulty } = this.state;
    const area = FISHING_AREAS.find(a => a.id === selectedAreaId);
    const method = FISHING_METHODS.find(m => m.id === selectedMethodId);

    // コスト計算
    const dc = DIFFICULTY_CONFIG[this.state.difficulty];
    const fuelReduction = this.state.upgrades.filter(u => u.purchased).reduce((a, u) => a + (u.effect.fuelCostReduction || 0), 0);
    const fuelCost = area && method
      ? Math.round(dc.fuelCostPerUnit * area.distance * method.fuelMultiplier * (1 - fuelReduction))
      : 0;
    const canStart = isResting || (!!selectedAreaId && !!selectedMethodId);

    // 期待収益プレビュー
    let previewHtml = '';
    if (!isResting && area && method) {
      const preview = calcExpectedProfit(area.id, method.id, month, currentWeather, difficulty, fuelReduction);
      const fishChips = preview.topFish.map((f, i) => {
        const seasonal = f.seasonality[month - 1];
        const isHot = seasonal >= 1.2;
        return `<span class="expected-fish-chip ${f.rarity}" style="animation-delay:${i * 0.07}s">
          ${isHot ? '🔥' : '🐟'} ${f.name}
          ${isHot ? `<span style="font-size:0.6rem;color:var(--accent-gold)">旬！</span>` : ''}
        </span>`;
      }).join('');
      const isStormy = currentWeather === 'stormy';
      previewHtml = `
      <div class="profit-preview">
        <div class="profit-preview-title">📊 期待収益プレビュー</div>
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
        ${isStormy ? '<div class="weather-warning">⛈️ 荒天のため水揚げが大幅に減少します！</div>' : ''}
      </div>`;
    }

    return `
    <div class="panel-header">判断フェーズ</div>
    <div class="panel-body">
      <div class="decision-view">
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
            <span style="color:${area ? 'var(--accent-primary)' : 'var(--text-muted)'}">
              ${area ? area.icon + ' ' + area.name : '← 右パネルで選択'}
            </span><br>
            <span style="color:var(--text-muted)">漁法：</span>
            <span style="color:${method ? 'var(--accent-primary)' : 'var(--text-muted)'}">
              ${method ? method.icon + ' ' + method.name : '← 右パネルで選択'}
            </span>
          </div>
          ${area && method ? `<div class="cost-preview">
            <div class="cost-item">⛽ 燃料費 <span>¥${fuelCost.toLocaleString()}</span></div>
            <div class="cost-item">🏢 固定費 <span>¥${dc.fixedCostPerMonth.toLocaleString()}</span></div>
          </div>` : ''}
        </div>
        ${previewHtml}
        ` : `
        <div class="decision-section" style="background:rgba(244,162,97,0.05);border-color:rgba(244,162,97,0.3)">
          <div style="font-size:0.8rem;color:var(--accent-gold)">
            🏠 休業を選択<br>
            <span style="color:var(--text-muted);font-size:0.72rem">副業収入 ¥${dc.restIncome.toLocaleString()} / 固定費 ¥${dc.fixedCostPerMonth.toLocaleString()}</span>
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

    const eventLogs = r.events.filter(e => e.resolved && e.chosenOption).map(e =>
      `<div style="font-size:0.72rem;color:var(--accent-yellow);margin-bottom:2px">📅 ${e.day}日：${e.template.title} → ${e.chosenOption!.label}</div>`
    ).join('');

    return `
    <div class="panel-header">${this.state.month}月 操業結果</div>
    <div class="panel-body">
      <div class="result-view">
        ${r.isResting ? `
        <div style="text-align:center;padding:24px;color:var(--accent-gold)">
          <div style="font-size:3rem;animation:bannerPop 0.5s cubic-bezier(0.34,1.56,0.64,1)">🏠</div>
          <div style="font-size:1.1rem;font-weight:700;margin-top:10px">今月は休業</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">副業収入: ¥${DIFFICULTY_CONFIG[this.state.difficulty].restIncome.toLocaleString()}</div>
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
        </div>
        ${eventLogs ? `<div class="mb-8">${eventLogs}</div>` : ''}
        `}
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
    document.getElementById('to-news-btn')?.addEventListener('click', () => { audioManager.playSE('click'); this.setState(s => setPhase(s, 'NEWS')); });
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
    document.getElementById('to-growth-btn')?.addEventListener('click', () => { audioManager.playSE('click'); this.setState(s => checkGrowth(s)); });
  }

  // ---- 成長・解放 ----
  private renderGrowth(): string {
    const { level, unlockedAreas, unlockedMethods, upgrades, money, monthHistory } = this.state;
    const prevResult = monthHistory[monthHistory.length - 1];
    const newAreas = unlockedAreas.filter(id => FISHING_AREAS.find(a => a.id === id)?.unlockLevel === level);
    const newMethods = unlockedMethods.filter(id => FISHING_METHODS.find(m => m.id === id)?.unlockLevel === level);
    const availableUpgrades = upgrades.filter(u => !u.purchased && u.unlockLevel <= level);

    return `
    <div class="panel-header">成長・解放</div>
    <div class="panel-body">
      <div class="growth-view">
        <div class="growth-title">📊 ${this.state.month}月 まとめ</div>
        ${prevResult && !prevResult.isResting ? `
        <div class="info-card">
          <div class="info-card-label">今月の学び</div>
          <div style="font-size:0.8rem;margin-top:4px">
            ${prevResult.weather === 'stormy' && prevResult.profit < 0 ? '⚡ 荒天で苦戦。次回は天候を見極めよう。'
              : prevResult.profit > 1000000 ? `🎉 大漁！¥${prevResult.profit.toLocaleString()} を稼いだ！素晴らしい判断でした。`
              : prevResult.profit > 0 ? `✅ 利益 ¥${prevResult.profit.toLocaleString()} を達成！`
              : '📉 今月は赤字。海域・漁法の組み合わせを見直そう。'}
          </div>
        </div>` : ''}
        ${(newAreas.length + newMethods.length) > 0 ? `
        <div>
          <div style="font-size:0.85rem;font-weight:700;color:var(--accent-gold);margin-bottom:6px">🔓 新要素解放！</div>
          <div class="unlock-list">
            ${newAreas.map(id => { const a = FISHING_AREAS.find(a => a.id === id)!; return `<div class="unlock-item"><span class="unlock-icon">${a.icon}</span>海域「${a.name}」が解放されました！</div>`; }).join('')}
            ${newMethods.map(id => { const m = FISHING_METHODS.find(m => m.id === id)!; return `<div class="unlock-item"><span class="unlock-icon">${m.icon}</span>漁法「${m.name}」が解放されました！</div>`; }).join('')}
          </div>
        </div>` : ''}
        ${availableUpgrades.length > 0 ? `
        <div>
          <div style="font-size:0.8rem;font-weight:700;margin-bottom:6px">⚡ アップグレード</div>
          <div class="upgrade-grid">
            ${availableUpgrades.map(u => `
            <div class="upgrade-card">
              <div class="upgrade-info">
                <div class="upgrade-name">${u.name}</div>
                <div class="upgrade-desc">${u.description}</div>
              </div>
              <span class="upgrade-cost">¥${u.cost.toLocaleString()}</span>
              <button class="upgrade-btn" data-upgrade="${u.id}" ${money >= u.cost ? '' : 'disabled'}>
                ${money >= u.cost ? '購入' : '資金不足'}
              </button>
            </div>`).join('')}
          </div>
        </div>` : ''}
        <button id="next-month-btn" class="next-btn">
          ${this.state.month >= 12 ? '🏁 ゲーム終了へ' : `${this.state.month + 1}月へ進む →`}
        </button>
      </div>
    </div>`;
  }

  private bindGrowth() {
    document.querySelectorAll('[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const upgradeId = (btn as HTMLElement).dataset.upgrade!;
        audioManager.playSE('coin');
        this.setState(s => purchaseUpgrade(s, upgradeId));
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

  // ---- ログパネル ----
  private renderLogPanel(): string {
    const entries = [...this.state.log].reverse().slice(0, 30);
    return `
    <div id="log-panel" class="panel">
      <div class="panel-header">ログ</div>
      <div class="panel-body">
        ${entries.map(e => `
        <div class="log-entry ${e.type}">
          <span class="log-time">${e.month}月${e.day ? e.day + '日' : ''}</span>${e.text}
        </div>`).join('') || '<div class="log-entry system">ゲーム開始</div>'}
      </div>
    </div>`;
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

    const eventDots = Array.from({ length: GAME_CONFIG.MAX_EVENTS_PER_MONTH }, (_, i) =>
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
  // イベントモーダル
  // ========================================
  private renderEventModal(): string {
    const eventIdx = this.state.currentEventIndex;
    const event = this.state.scheduledEvents[eventIdx];
    if (!event) return '';
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
      <div class="event-modal">
        <div class="event-modal-day">📅 ${event.day}日目のイベント</div>
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
    document.querySelectorAll('.event-option-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const option = event.template.options[i];
        // フィードバック演出
        const flash = document.createElement('div');
        flash.className = 'event-result-flash';
        const hasGain = (option.effect.moneyDelta || 0) > 0 || (option.effect.yieldMultiplier || 1) > 1;
        flash.innerHTML = `<span class="event-result-text" style="color:${hasGain ? 'var(--accent-gold)' : 'var(--text-secondary)'}">
          ${hasGain ? '✨ 好判断！' : '👊 決断した！'}
        </span>`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 600);
        audioManager.playSE('decision');
        this.setState(s => resolveEvent(s, option));
        // setState が phase='RUNNING' を検知して自動的に startRunning() を呼ぶため、ここでは不要
      });
    });
  }

  // ========================================
  // ゲーム終了
  // ========================================
  private renderEndModal(): string {
    const score = calculateScore(this.state);
    const { companyName, totalProfit, level, difficulty, reputation, debt, unlockedAreas, unlockedMethods } = this.state;
    const dm = DIFFICULTY_CONFIG[difficulty].scoreMultiplier;
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
          <div class="score-row"><span>難易度補正 (${difficulty === 'normal' ? 'ノーマル' : difficulty === 'hard' ? 'ハード' : '☠️激ムズ'})</span><span>×${dm}</span></div>
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
      const text = `【石川漁業シミュレーション】\n${this.state.companyName} スコア: ${score.toLocaleString()}pt\n難易度: ${this.state.difficulty === 'hard' ? 'ハード' : 'ノーマル'} Lv.${this.state.level}`;
      navigator.clipboard.writeText(text).catch(() => prompt('結果テキスト:', text));
    });
  }

  private async submitAndLoadRanking() {
    const score = calculateScore(this.state);
    await submitScore({ companyName: this.state.companyName, score, difficulty: this.state.difficulty, level: this.state.level, totalProfit: this.state.totalProfit });
    const rankings = await getLeaderboard(20);
    const myIdx = rankings.findIndex(r => r.companyName === this.state.companyName && r.score === score);
    const rankingSection = document.getElementById('ranking-section');
    if (!rankingSection) return;
    const rowsHtml = rankings.slice(0, 10).map((r, i) => {
      const isMe = i === myIdx;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      return `<tr ${isMe ? 'class="my-rank"' : ''}><td>${medal}</td><td>${r.companyName}${isMe ? ' 👈' : ''}</td><td>${r.score.toLocaleString()}</td><td>${r.difficulty === 'hard' ? 'ハード' : 'ノーマル'}</td><td>Lv.${r.level}</td></tr>`;
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
