// ========================================
// メインアプリケーション（UI制御）
// ========================================

import '../styles/main.css';
import type { GameState, EventOption } from '../game/types';
import {
  createInitialState, setPhase, startMonth, applyBorrow,
  prepareOperation, advanceDay, resolveEvent, finishMonth,
  checkGrowth, proceedToNextMonth, purchaseUpgrade, calculateScore,
  isAreaRestricted, isMethodRestricted,
} from '../game/engine';
import { FISHING_AREAS, FISHING_METHODS, FISHERMEN, GAME_CONFIG } from '../game/data';
import { submitScore, getLeaderboard, type ScoreEntry } from '../api/leaderboard';

export class App {
  private state: GameState;
  private root: HTMLElement;
  private runningTimer: number | null = null;
  private dayInterval: number | null = null;

  constructor(rootId: string) {
    this.root = document.getElementById(rootId)!;
    this.state = createInitialState();
    this.render();
  }

  private setState(updater: (s: GameState) => GameState) {
    this.state = updater(this.state);
    this.render();
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
      this.bindRunning();
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

    // 通常レイアウト（MONTH_START, DECISION, RESULT, NEWS, GROWTH）
    this.root.innerHTML = this.renderMainLayout();
    this.bindMainLayout();
  }

  // ========================================
  // セットアップ画面
  // ========================================
  private renderSetup(): string {
    return `
    <div class="setup-modal">
      <div class="setup-box">
        <div class="setup-game-title">
          <h1>🎣 石川漁業シミュレーション</h1>
          <p>石川の海で、漁業会社を育てよう。12か月の挑戦。</p>
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
                <div class="diff-name" style="color:#a5d6a7">ノーマル</div>
                <div class="diff-desc">価格変動 ±10%</div>
              </div>
              <div class="diff-option ${this.state.difficulty === 'hard' ? 'selected-hard' : ''}" data-diff="hard">
                <div class="diff-name" style="color:#ef9a9a">ハード</div>
                <div class="diff-desc">価格変動 ±20%</div>
              </div>
            </div>
          </div>
          <button id="start-game-btn" class="setup-start-btn"
            ${this.state.companyName.trim() === '' ? 'disabled' : ''}>
            ゲームスタート
          </button>
        </div>
      </div>
    </div>
    `;
  }

  private bindSetup() {
    const nameInput = document.getElementById('company-name-input') as HTMLInputElement;
    const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
    const diffOptions = document.querySelectorAll('.diff-option');

    nameInput?.addEventListener('input', () => {
      this.state = { ...this.state, companyName: nameInput.value };
      startBtn.disabled = nameInput.value.trim() === '';
    });

    diffOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        const diff = (opt as HTMLElement).dataset.diff as 'normal' | 'hard';
        this.state = { ...this.state, difficulty: diff };
        diffOptions.forEach(o => {
          o.classList.remove('selected-normal', 'selected-hard');
        });
        opt.classList.add(diff === 'normal' ? 'selected-normal' : 'selected-hard');
      });
    });

    startBtn?.addEventListener('click', () => {
      if (this.state.companyName.trim() === '') return;
      this.setState(s => startMonth({ ...s, phase: 'MONTH_START' }));
    });
  }

  // ========================================
  // メインレイアウト
  // ========================================
  private renderMainLayout(): string {
    return `
    <div id="app-inner">
      ${this.renderHeader()}
      <div id="main-layout">
        ${this.renderLeftPanel()}
        <div id="center-panel" class="panel">
          ${this.renderCenterPanel()}
        </div>
        ${this.renderRightPanel()}
        ${this.renderLogPanel()}
      </div>
    </div>
    `;
  }

  private bindMainLayout() {
    this.bindRightPanel();
    this.bindCenterPanel();
  }

  // ========================================
  // ヘッダー
  // ========================================
  private renderHeader(): string {
    const { companyName, month, difficulty, phase, currentWeather, money } = this.state;
    const weatherIcon = currentWeather === 'sunny' ? '☀️' : currentWeather === 'cloudy' ? '☁️' : '⛈️';
    const phaseMsg = this.getPhaseMessage(phase);
    return `
    <div id="header">
      <span class="company-name">🏢 ${companyName}</span>
      <span class="month-display">${month}月</span>
      <span class="difficulty-badge ${difficulty}">${difficulty === 'normal' ? 'ノーマル' : 'ハード'}</span>
      <span class="status-message">${phaseMsg}</span>
      <span class="weather-display">${weatherIcon}</span>
      <span style="font-size:0.8rem;color:var(--accent-gold);font-weight:600">¥${money.toLocaleString()}</span>
    </div>
    `;
  }

  private getPhaseMessage(phase: string): string {
    switch (phase) {
      case 'MONTH_START': return '今月の状況を確認してください';
      case 'DECISION': return '海域と漁法を選んで操業を開始してください';
      case 'RUNNING': return '操業中...';
      case 'RESULT': return '今月の結果です';
      case 'NEWS': return 'ニュースを確認してください';
      case 'GROWTH': return '成長・解放確認';
      default: return '';
    }
  }

  // ========================================
  // 左パネル
  // ========================================
  private renderLeftPanel(): string {
    const { money, debt, debtTurnsLeft, reputation, level, learningBonuses, totalProfit, interestRate } = this.state;
    const nextLevelThreshold = GAME_CONFIG.LEVEL_THRESHOLDS[level] || 0;

    return `
    <div id="left-panel" class="panel">
      <div class="panel-header">会社ステータス</div>
      <div class="panel-body">
        <div class="level-display">
          <span class="level-num">Lv.${level}</span>
          <span class="level-label">会社レベル</span>
        </div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:4px">
          累積利益 ¥${totalProfit.toLocaleString()} / ¥${(GAME_CONFIG.LEVEL_THRESHOLDS[level] || 99999999).toLocaleString()}
        </div>
        <div class="reputation-bar" title="評判 ${reputation}/100">
          <div class="reputation-bar-fill" style="width:${reputation}%"></div>
        </div>
        <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:8px">評判 ${reputation}/100</div>

        <div class="stat-row">
          <span class="stat-label">💰 資金</span>
          <span class="stat-value money">¥${money.toLocaleString()}</span>
        </div>
        ${debt > 0 ? `
        <div class="debt-info">
          <div class="stat-row">
            <span class="stat-label">借金</span>
            <span class="stat-value debt">¥${debt.toLocaleString()}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">月利</span>
            <span class="stat-value">${(interestRate * 100).toFixed(0)}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">返済期限</span>
            <span class="stat-value ${debtTurnsLeft <= 1 ? 'debt' : ''}">${debtTurnsLeft}ターン</span>
          </div>
        </div>
        ` : '<div style="font-size:0.75rem;color:var(--accent-green);margin-top:4px">✅ 借金なし</div>'}

        ${learningBonuses.length > 0 ? `
        <div style="margin-top:10px">
          <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px">📚 学びボーナス</div>
          <div class="learning-tags">
            ${learningBonuses.map(lb => `
              <span class="learning-tag" title="${lb.description}">
                ${lb.description.split('：')[0]} (${lb.remainingMonths}ヶ月)
              </span>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    `;
  }

  // ========================================
  // 右パネル
  // ========================================
  private renderRightPanel(): string {
    const { selectedAreaId, selectedMethodId, selectedFishermanId, phase,
            unlockedAreas, unlockedMethods } = this.state;
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

      return `
      <div class="${cls}" data-area="${area.id}" ${!isDecision || !unlocked || restricted ? 'style="pointer-events:none"' : ''}>
        <span class="item-icon">${area.icon}</span>
        <span class="item-name">${area.name}</span>
        <span class="item-sub">${unlocked ? `距離×${area.distance}` : `Lv.${area.unlockLevel}`}</span>
        ${badge}
      </div>`;
    }).join('');

    const methodsHtml = FISHING_METHODS.map(method => {
      const unlocked = unlockedMethods.includes(method.id);
      const restricted = unlocked && isMethodRestricted(this.state, method.id);
      const selected = selectedMethodId === method.id;
      // 選択中の海域で使えるか
      const area = FISHING_AREAS.find(a => a.id === selectedAreaId);
      const applicable = !area || area.availableMethods.includes(method.id);
      let cls = 'select-item';
      if (!unlocked) cls += ' locked';
      else if (restricted) cls += ' restricted';
      else if (selected) cls += ' selected';
      else if (!applicable && area) cls += ' locked';

      const badge = !unlocked ? '<span class="lock-icon">🔒</span>'
        : restricted ? '<span class="restrict-badge">規制中</span>'
        : (!applicable && area) ? '<span class="restrict-badge">不可</span>' : '';

      return `
      <div class="${cls}" data-method="${method.id}"
        ${!isDecision || !unlocked || restricted || (!applicable && !!area) ? 'style="pointer-events:none"' : ''}>
        <span class="item-icon">${method.icon}</span>
        <span class="item-name">${method.name}</span>
        <span class="item-sub">燃料×${method.fuelMultiplier}</span>
        ${badge}
      </div>`;
    }).join('');

    const fishermenHtml = FISHERMEN.map(f => {
      const selected = selectedFishermanId === f.id;
      return `
      <div class="npc-card ${selected ? 'selected' : ''}" data-fisher="${f.id}"
        ${!isDecision ? 'style="pointer-events:none"' : ''}>
        <div class="npc-name">${f.name}</div>
        <div class="npc-trait">${f.description}</div>
      </div>`;
    }).join('');

    return `
    <div id="right-panel" class="panel">
      <div class="panel-header">意思決定リソース</div>
      <div class="panel-body">
        <div class="section-title">🌊 海域</div>
        ${areasHtml}
        <div class="section-title">⚙️ 漁法</div>
        ${methodsHtml}
        <div class="section-title">👨‍✈️ 漁師</div>
        ${fishermenHtml}
      </div>
    </div>
    `;
  }

  private bindRightPanel() {
    if (this.state.phase !== 'DECISION') return;

    document.querySelectorAll('[data-area]').forEach(el => {
      el.addEventListener('click', () => {
        const areaId = (el as HTMLElement).dataset.area!;
        this.setState(s => ({ ...s, selectedAreaId: areaId }));
      });
    });

    document.querySelectorAll('[data-method]').forEach(el => {
      el.addEventListener('click', () => {
        const methodId = (el as HTMLElement).dataset.method!;
        this.setState(s => ({ ...s, selectedMethodId: methodId }));
      });
    });

    document.querySelectorAll('[data-fisher]').forEach(el => {
      el.addEventListener('click', () => {
        const fisherId = (el as HTMLElement).dataset.fisher!;
        this.setState(s => ({ ...s, selectedFishermanId: fisherId }));
      });
    });
  }

  // ========================================
  // 中央パネル（フェーズ別）
  // ========================================
  private renderCenterPanel(): string {
    switch (this.state.phase) {
      case 'MONTH_START': return this.renderMonthStart();
      case 'DECISION': return this.renderDecision();
      case 'RESULT': return this.renderResult();
      case 'NEWS': return this.renderNews();
      case 'GROWTH': return this.renderGrowth();
      default: return '<div class="panel-body">読み込み中...</div>';
    }
  }

  private bindCenterPanel() {
    switch (this.state.phase) {
      case 'MONTH_START': this.bindMonthStart(); break;
      case 'DECISION': this.bindDecision(); break;
      case 'RESULT': this.bindResult(); break;
      case 'NEWS': this.bindNews(); break;
      case 'GROWTH': this.bindGrowth(); break;
    }
  }

  // ---- 月開始サマリ ----
  private renderMonthStart(): string {
    const { month, currentWeather, currentRegulations } = this.state;
    const weatherLabels: Record<string, string> = { sunny: '☀️ 晴れ', cloudy: '☁️ くもり', stormy: '⛈️ 荒れ' };
    const regHtml = currentRegulations.filter(r => r.reason).map(r => `
      <div class="regulation-item">⚠️ ${r.reason}</div>
    `).join('') || '<div class="no-regulation">✅ 特別な規制なし</div>';

    const newsTemplate = this.state.currentNews;
    const newsHint = newsTemplate.length > 0 ? newsTemplate[0].body : '情報なし';

    return `
    <div class="panel-header">月開始サマリ</div>
    <div class="panel-body">
      <div class="month-start-view">
        <div class="month-banner">
          <div class="month-num">${month}</div>
          <div class="month-label">月</div>
        </div>
        <div class="info-cards">
          <div class="info-card">
            <div class="info-card-label">天候</div>
            <div class="info-card-value weather-${currentWeather}">${weatherLabels[currentWeather]}</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">今月の規制</div>
            <div class="regulation-list">${regHtml}</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-card-label">📰 今月の注目情報</div>
          <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px">${newsHint}</div>
        </div>
        <button id="to-decision-btn" class="start-btn">判断フェーズへ →</button>
      </div>
    </div>
    `;
  }

  private bindMonthStart() {
    document.getElementById('to-decision-btn')?.addEventListener('click', () => {
      this.setState(s => setPhase(s, 'DECISION'));
    });
  }

  // ---- 判断パネル ----
  private renderDecision(): string {
    const { selectedAreaId, selectedMethodId, isResting, money, debt } = this.state;
    const area = FISHING_AREAS.find(a => a.id === selectedAreaId);
    const method = FISHING_METHODS.find(m => m.id === selectedMethodId);

    const fuelCost = area && method
      ? Math.round(GAME_CONFIG.FUEL_COST_PER_UNIT * area.distance * method.fuelMultiplier)
      : 0;
    const canStart = isResting || (!!selectedAreaId && !!selectedMethodId);

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
              ${area ? area.icon + ' ' + area.name : '未選択（右パネルで選択）'}
            </span><br>
            <span style="color:var(--text-muted)">漁法：</span>
            <span style="color:${method ? 'var(--accent-primary)' : 'var(--text-muted)'}">
              ${method ? method.icon + ' ' + method.name : '未選択（右パネルで選択）'}
            </span>
          </div>
          ${area && method ? `
          <div class="cost-preview">
            <div class="cost-item">燃料費 <span>¥${fuelCost.toLocaleString()}</span></div>
            <div class="cost-item">固定費 <span>¥${GAME_CONFIG.FIXED_COST_PER_MONTH.toLocaleString()}</span></div>
          </div>
          ` : ''}
        </div>
        ` : `
        <div class="decision-section" style="background:rgba(244,162,97,0.05);border-color:rgba(244,162,97,0.3)">
          <div style="font-size:0.8rem;color:var(--accent-gold)">
            🏠 休業を選択。副業収入 ¥${GAME_CONFIG.REST_INCOME.toLocaleString()} を得ます。<br>
            <span style="color:var(--text-muted);font-size:0.72rem">固定費 ¥${GAME_CONFIG.FIXED_COST_PER_MONTH.toLocaleString()} は発生します。</span>
          </div>
        </div>
        `}

        <div class="decision-section">
          <div class="decision-section-title">借入（任意）</div>
          <div class="borrow-input-row">
            <input id="borrow-input" class="borrow-input" type="number"
              min="0" max="${debt > 0 ? 0 : (this.state.difficulty === 'normal' ? GAME_CONFIG.MAX_DEBT_NORMAL : GAME_CONFIG.MAX_DEBT_HARD)}"
              step="100000" placeholder="借入額（円）"
              value="${this.state.borrowAmount || ''}"
              ${debt > 0 ? 'disabled title="既存の借金を返済してから借入できます"' : ''} />
            <button id="borrow-btn" class="upgrade-btn" ${debt > 0 ? 'disabled' : ''}>借入</button>
          </div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">
            月利 ${(GAME_CONFIG.INTEREST_RATE * 100).toFixed(0)}% / 返済期限 ${GAME_CONFIG.DEBT_REPAY_TURNS}ターン
          </div>
        </div>

        <button id="operation-start-btn" class="start-btn" ${canStart ? '' : 'disabled'}>
          ${isResting ? '🏠 休業確定して月を進める' : '⛵ 操業開始！'}
        </button>
      </div>
    </div>
    `;
  }

  private bindDecision() {
    document.getElementById('btn-port')?.addEventListener('click', () => {
      this.setState(s => ({ ...s, isResting: false }));
    });
    document.getElementById('btn-rest')?.addEventListener('click', () => {
      this.setState(s => ({ ...s, isResting: true, selectedAreaId: null, selectedMethodId: null }));
    });

    const borrowInput = document.getElementById('borrow-input') as HTMLInputElement;
    borrowInput?.addEventListener('input', () => {
      this.state = { ...this.state, borrowAmount: parseInt(borrowInput.value) || 0 };
    });

    document.getElementById('borrow-btn')?.addEventListener('click', () => {
      const amount = this.state.borrowAmount;
      if (amount > 0) {
        this.setState(s => applyBorrow(s, amount));
      }
    });

    document.getElementById('operation-start-btn')?.addEventListener('click', () => {
      if (this.state.isResting) {
        this.setState(s => finishMonth(prepareOperation(s)));
      } else {
        this.setState(s => prepareOperation(s));
        this.startRunning();
      }
    });
  }

  // ---- 結果 ----
  private renderResult(): string {
    const r = this.state.monthResult;
    if (!r) return '<div class="panel-body">データなし</div>';

    const catchRows = r.catches.slice(0, 5).map(c => `
      <tr>
        <td>${c.fishName}</td>
        <td class="num">${c.quantity.toLocaleString()} kg</td>
        <td class="num">¥${c.unitPrice.toLocaleString()}/kg</td>
        <td class="num">¥${c.subtotal.toLocaleString()}</td>
      </tr>
    `).join('');

    const profitClass = r.profit >= 0 ? 'positive' : 'negative';
    const profitSign = r.profit >= 0 ? '+' : '';

    const eventLogs = r.events.filter(e => e.resolved && e.chosenOption).map(e => `
      <div style="font-size:0.72rem;color:var(--accent-yellow);margin-bottom:2px">
        📅 ${e.day}日：${e.template.title} → ${e.chosenOption!.label}
      </div>
    `).join('');

    return `
    <div class="panel-header">${this.state.month}月 操業結果</div>
    <div class="panel-body">
      <div class="result-view">
        ${r.isResting ? `
        <div style="text-align:center;padding:20px;color:var(--accent-gold)">
          <div style="font-size:2rem">🏠</div>
          <div style="font-size:1rem;font-weight:700;margin-top:8px">今月は休業</div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">副業収入: ¥${GAME_CONFIG.REST_INCOME.toLocaleString()}</div>
        </div>
        ` : `
        <div class="result-header">
          <span class="result-title">💹 利益</span>
          <span class="result-profit ${profitClass}">${profitSign}¥${r.profit.toLocaleString()}</span>
        </div>

        ${r.catches.length > 0 ? `
        <table class="catches-table">
          <thead>
            <tr><th>魚種</th><th>水揚げ量</th><th>単価</th><th>売上</th></tr>
          </thead>
          <tbody>${catchRows}</tbody>
        </table>
        ` : '<div style="color:var(--text-muted);font-size:0.8rem">水揚げなし</div>'}

        <div class="breakdown-rows">
          <div class="breakdown-item">
            <div class="breakdown-label">総売上</div>
            <div class="breakdown-value text-green">¥${r.totalRevenue.toLocaleString()}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">燃料費</div>
            <div class="breakdown-value text-red">-¥${r.fuelCost.toLocaleString()}</div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">固定費</div>
            <div class="breakdown-value text-red">-¥${r.fixedCost.toLocaleString()}</div>
          </div>
          ${r.interestCost > 0 ? `
          <div class="breakdown-item">
            <div class="breakdown-label">利息</div>
            <div class="breakdown-value text-red">-¥${r.interestCost.toLocaleString()}</div>
          </div>` : ''}
          ${r.eventCostDelta !== 0 ? `
          <div class="breakdown-item">
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
    </div>
    `;
  }

  private bindResult() {
    document.getElementById('to-news-btn')?.addEventListener('click', () => {
      this.setState(s => setPhase(s, 'NEWS'));
    });
  }

  // ---- ニュース ----
  private renderNews(): string {
    const newsHtml = this.state.currentNews.map(n => `
      <div class="news-card ${n.category}">
        <div class="news-card-title">${n.title}</div>
        <div class="news-card-body">${n.body}</div>
      </div>
    `).join('');

    return `
    <div class="panel-header">ニュース</div>
    <div class="panel-body">
      <div class="news-view">
        <div class="news-title-bar">📰 ${this.state.month}月のニュース</div>
        ${newsHtml || '<div style="color:var(--text-muted)">今月は特別なニュースはありません。</div>'}
        <button id="to-growth-btn" class="next-btn" style="margin-top:16px">成長・解放確認 →</button>
      </div>
    </div>
    `;
  }

  private bindNews() {
    document.getElementById('to-growth-btn')?.addEventListener('click', () => {
      this.setState(s => checkGrowth(s));
    });
  }

  // ---- 成長・解放 ----
  private renderGrowth(): string {
    const { level, unlockedAreas, unlockedMethods, upgrades, money, monthHistory } = this.state;
    const prevResult = monthHistory[monthHistory.length - 1];

    // 新しく解放された要素を計算（前月との比較は簡略化）
    const newAreas = unlockedAreas.filter(id => {
      const area = FISHING_AREAS.find(a => a.id === id);
      return area && area.unlockLevel === level;
    });
    const newMethods = unlockedMethods.filter(id => {
      const m = FISHING_METHODS.find(m => m.id === id);
      return m && m.unlockLevel === level;
    });

    const availableUpgrades = upgrades.filter(u => !u.purchased && u.unlockLevel <= level);
    const upgradesHtml = availableUpgrades.length > 0 ? availableUpgrades.map(u => {
      const canBuy = money >= u.cost;
      return `
      <div class="upgrade-card">
        <div class="upgrade-info">
          <div class="upgrade-name">${u.name}</div>
          <div class="upgrade-desc">${u.description}</div>
        </div>
        <span class="upgrade-cost">¥${u.cost.toLocaleString()}</span>
        <button class="upgrade-btn" data-upgrade="${u.id}" ${canBuy ? '' : 'disabled'}>
          ${canBuy ? '購入' : '資金不足'}
        </button>
      </div>`;
    }).join('') : '<div style="color:var(--text-muted);font-size:0.8rem">利用可能なアップグレードはありません</div>';

    return `
    <div class="panel-header">成長・解放</div>
    <div class="panel-body">
      <div class="growth-view">
        <div class="growth-title">📊 ${this.state.month}月 まとめ</div>

        ${prevResult && !prevResult.isResting ? `
        <div class="info-card">
          <div class="info-card-label">今月の学び</div>
          <div style="font-size:0.8rem;margin-top:4px">
            ${prevResult.weather === 'stormy' && prevResult.profit < 0
              ? '⚡ 荒天で苦戦。次回は天候を見極めよう。'
              : prevResult.profit > 0
              ? `✅ 利益 ¥${prevResult.profit.toLocaleString()} を達成！良い判断でした。`
              : '📉 今月は赤字。海域・漁法の組み合わせを見直そう。'
            }
          </div>
        </div>
        ` : ''}

        ${(newAreas.length + newMethods.length) > 0 ? `
        <div>
          <div style="font-size:0.8rem;font-weight:700;color:var(--accent-gold);margin-bottom:6px">🔓 新要素解放！</div>
          <div class="unlock-list">
            ${newAreas.map(id => {
              const area = FISHING_AREAS.find(a => a.id === id)!;
              return `<div class="unlock-item"><span class="unlock-icon">${area.icon}</span>海域「${area.name}」が解放されました！</div>`;
            }).join('')}
            ${newMethods.map(id => {
              const m = FISHING_METHODS.find(m => m.id === id)!;
              return `<div class="unlock-item"><span class="unlock-icon">${m.icon}</span>漁法「${m.name}」が解放されました！</div>`;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <div>
          <div style="font-size:0.8rem;font-weight:700;margin-bottom:6px">⚡ アップグレード</div>
          <div class="upgrade-grid">${upgradesHtml}</div>
        </div>

        <button id="next-month-btn" class="next-btn">
          ${this.state.month >= 12 ? '🏁 ゲーム終了へ' : `${this.state.month + 1}月へ進む →`}
        </button>
      </div>
    </div>
    `;
  }

  private bindGrowth() {
    document.querySelectorAll('[data-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => {
        const upgradeId = (btn as HTMLElement).dataset.upgrade!;
        this.setState(s => purchaseUpgrade(s, upgradeId));
      });
    });

    document.getElementById('next-month-btn')?.addEventListener('click', () => {
      this.setState(s => {
        const next = proceedToNextMonth(s);
        if (next.phase === 'END') return next;
        return startMonth(next);
      });
    });
  }

  // ---- ログパネル ----
  private renderLogPanel(): string {
    const entries = [...this.state.log].reverse().slice(0, 30);
    const logsHtml = entries.map(e => `
      <div class="log-entry ${e.type}">
        <span class="log-time">${e.month}月${e.day ? e.day + '日' : ''}</span>
        ${e.text}
      </div>
    `).join('');

    return `
    <div id="log-panel" class="panel">
      <div class="panel-header">ログ</div>
      <div class="panel-body">
        ${logsHtml || '<div class="log-entry system">ゲーム開始</div>'}
      </div>
    </div>
    `;
  }

  // ========================================
  // 月内進行ビュー（UI-04）
  // ========================================
  private renderRunningView(): string {
    const { companyName, month, currentDay, scheduledEvents } = this.state;
    const firedCount = scheduledEvents.filter(e => e.resolved).length;
    const totalEvents = scheduledEvents.length;

    const progress = Math.round((currentDay / 30) * 100);

    // カレンダー生成
    const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
    const firstDayOfWeek = 1; // 月曜始まり（固定）
    const calDays = Array.from({ length: 30 }, (_, i) => i + 1);
    const paddingDays = firstDayOfWeek;

    const calPadding = Array.from({ length: paddingDays }, (_, i) => `<div class="calendar-day" style="opacity:0"></div>`).join('');
    const calHtml = calDays.map(d => {
      const isEventDay = scheduledEvents.some(e => e.day === d);
      const isEventDone = scheduledEvents.some(e => e.day === d && e.resolved);
      let cls = 'calendar-day';
      if (d < currentDay) cls += ' past';
      else if (d === currentDay) cls += ' current';
      else cls += ' future';
      if (isEventDone) cls = 'calendar-day event-done';
      else if (isEventDay && d > currentDay) cls += ' event-day';

      return `<div class="${cls}">${d}</div>`;
    }).join('');

    const eventDots = Array.from({ length: GAME_CONFIG.MAX_EVENTS_PER_MONTH }, (_, i) => `
      <div class="event-dot ${i < firedCount ? 'fired' : ''}"></div>
    `).join('');

    const area = FISHING_AREAS.find(a => a.id === this.state.selectedAreaId);
    const method = FISHING_METHODS.find(m => m.id === this.state.selectedMethodId);
    const weatherIcon = this.state.currentWeather === 'sunny' ? '☀️' : this.state.currentWeather === 'cloudy' ? '☁️' : '⛈️';

    return `
    <div id="running-view">
      <div class="ocean-bg"></div>
      <div class="running-header">
        <span class="running-company">🏢 ${companyName}</span>
        <span class="running-month">${month}月 操業中</span>
        <span id="running-timer-display" class="running-timer">残り -- 秒</span>
      </div>

      <div class="running-content">
        <div class="operation-info">
          ${area ? `<div class="op-item"><div class="op-icon">${area.icon}</div><div class="op-label">海域</div><div class="op-value">${area.name}</div></div>` : ''}
          ${method ? `<div class="op-item"><div class="op-icon">${method.icon}</div><div class="op-label">漁法</div><div class="op-value">${method.name}</div></div>` : ''}
          <div class="op-item"><div class="op-icon">${weatherIcon}</div><div class="op-label">天候</div>
            <div class="op-value">${this.state.currentWeather === 'sunny' ? '晴れ' : this.state.currentWeather === 'cloudy' ? 'くもり' : '荒れ'}</div>
          </div>
        </div>

        <div class="calendar-wrap">
          <div class="calendar-month-title">${month}月</div>
          <div class="calendar-grid">
            ${dayLabels.map(d => `<div class="calendar-day-label">${d}</div>`).join('')}
            ${calPadding}${calHtml}
          </div>
        </div>

        <div class="progress-bar-wrap">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${progress}%"></div>
          </div>
          <div class="progress-label">${currentDay} / 30日</div>
        </div>

        <div class="event-count-display">
          <span>イベント</span>
          ${eventDots}
          <span>${firedCount}/${totalEvents}</span>
        </div>
      </div>
    </div>
    `;
  }

  private startRunning() {
    const totalDuration = GAME_CONFIG.RUNNING_DURATION * 1000; // 30秒
    const startTime = Date.now();
    let lastDay = 0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);
      const targetDay = Math.floor(progress * 30);
      const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));

      // タイマー表示更新（再レンダリングなし）
      const timerEl = document.getElementById('running-timer-display');
      if (timerEl) timerEl.textContent = `残り ${remaining} 秒`;

      // 日付が進んだ場合、イベントチェック
      if (targetDay > lastDay) {
        for (let d = lastDay + 1; d <= targetDay; d++) {
          const result = advanceDay({ ...this.state, currentDay: d - 1 });
          if (result.eventFired && this.state.phase !== 'EVENT') {
            this.setState(() => result.state);
            return; // イベント発火 → タイマー停止
          }
          this.state = { ...this.state, currentDay: d };
          // カレンダーの部分更新（軽量化）
          this.updateCalendarDay(d);
        }
        lastDay = targetDay;
      }

      if (progress >= 1) {
        // 月終了
        this.setState(s => finishMonth({ ...s, currentDay: 30 }));
        return;
      }

      this.dayInterval = requestAnimationFrame(tick);
    };

    this.dayInterval = requestAnimationFrame(tick);
  }

  private updateCalendarDay(day: number) {
    // カレンダーの個別セル更新（軽量）
    const calDays = document.querySelectorAll('.calendar-day');
    calDays.forEach((el, idx) => {
      // padding分を除いて実際の日付を計算
      const d = idx - 1; // firstDayOfWeek=1分のパディング
      if (d + 1 === day) {
        el.className = 'calendar-day current';
      } else if (d + 1 < day && d >= 0) {
        const scheduledEvent = this.state.scheduledEvents.find(e => e.day === d + 1 && e.resolved);
        el.className = scheduledEvent ? 'calendar-day event-done' : 'calendar-day past';
      }
    });

    // プログレスバー更新
    const progressFill = document.querySelector('.progress-bar-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.width = `${Math.round((day / 30) * 100)}%`;
    }
    const progressLabel = document.querySelector('.progress-label');
    if (progressLabel) progressLabel.textContent = `${day} / 30日`;
  }

  private bindRunning() {
    // 進行中は自動スタート
    if (this.state.phase === 'RUNNING' && this.state.currentDay < 30) {
      setTimeout(() => this.startRunning(), 500);
    }
  }

  // ========================================
  // イベントモーダル（UI-05）
  // ========================================
  private renderEventModal(): string {
    const eventIdx = this.state.currentEventIndex;
    const event = this.state.scheduledEvents[eventIdx];
    if (!event) return '';

    const optionsHtml = event.template.options.map((opt, i) => `
      <button class="event-option-btn" data-option="${i}">
        <div class="event-option-label">
          ${opt.label}
          <span class="risk-badge ${opt.risk}">${
            opt.risk === 'low' ? '低リスク' : opt.risk === 'medium' ? '中リスク' : '高リスク'
          }</span>
        </div>
        <div class="event-option-desc">${opt.description}</div>
      </button>
    `).join('');

    return `
    <div class="modal-overlay">
      <div class="event-modal">
        <div class="event-modal-title">${event.template.title}</div>
        <div class="event-modal-body">${event.template.description}</div>
        <div class="event-options">${optionsHtml}</div>
      </div>
    </div>
    `;
  }

  private bindEventModal() {
    const eventIdx = this.state.currentEventIndex;
    const event = this.state.scheduledEvents[eventIdx];
    if (!event) return;

    document.querySelectorAll('.event-option-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const option = event.template.options[i];
        this.setState(s => resolveEvent(s, option));
        // 進行再開
        setTimeout(() => this.startRunning(), 200);
      });
    });
  }

  // ========================================
  // ゲーム終了モーダル（UI-12/13）
  // ========================================
  private renderEndModal(): string {
    const score = calculateScore(this.state);
    const { companyName, totalProfit, level, difficulty, reputation, debt, unlockedAreas, unlockedMethods } = this.state;
    const diffMultiplier = difficulty === 'hard' ? 1.5 : 1.0;
    const levelBonus = (level - 1) * 500000;
    const unlockedBonus = (unlockedAreas.length + unlockedMethods.length) * 100000;
    const reputationBonus = reputation * 10000;
    const debtPenalty = debt * 0.5;

    return `
    <div class="end-modal">
      <div class="result-box">
        <h2>🏁 ゲーム終了</h2>
        <div style="font-size:0.85rem;color:var(--text-muted)">${companyName}</div>

        <div class="final-score">
          ${score.toLocaleString()} pt
        </div>

        <div class="score-breakdown">
          <div class="score-row">
            <span>総利益</span>
            <span class="${totalProfit >= 0 ? 'text-green' : 'text-red'}">¥${totalProfit.toLocaleString()}</span>
          </div>
          <div class="score-row">
            <span>レベルボーナス (Lv.${level})</span>
            <span class="text-gold">+¥${levelBonus.toLocaleString()}</span>
          </div>
          <div class="score-row">
            <span>解放ボーナス (${unlockedAreas.length}海域/${unlockedMethods.length}漁法)</span>
            <span class="text-gold">+¥${unlockedBonus.toLocaleString()}</span>
          </div>
          <div class="score-row">
            <span>評判ボーナス (${reputation}pt)</span>
            <span class="text-gold">+¥${reputationBonus.toLocaleString()}</span>
          </div>
          ${debt > 0 ? `
          <div class="score-row">
            <span>借金ペナルティ</span>
            <span class="text-red">-¥${debtPenalty.toLocaleString()}</span>
          </div>` : ''}
          <div class="score-row">
            <span>難易度補正 (×${diffMultiplier})</span>
            <span>-</span>
          </div>
          <div class="score-row total">
            <span>最終スコア</span>
            <span class="text-gold">${score.toLocaleString()} pt</span>
          </div>
        </div>

        <div id="ranking-section" style="margin-top:12px">
          <div style="color:var(--text-muted);font-size:0.8rem">ランキングを読み込み中...</div>
        </div>

        <div class="btn-row">
          <button id="retry-btn" class="btn-primary">🔄 もう一度プレイ</button>
          <button id="share-btn" class="btn-secondary">📋 結果をコピー</button>
        </div>
      </div>
    </div>
    `;
  }

  private bindEndModal() {
    // スコア送信 & ランキング取得
    this.submitAndLoadRanking();

    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.state = createInitialState();
      this.render();
    });

    document.getElementById('share-btn')?.addEventListener('click', () => {
      const score = calculateScore(this.state);
      const text = `【石川漁業シミュレーション】\n${this.state.companyName} スコア: ${score.toLocaleString()}pt\n難易度: ${this.state.difficulty === 'hard' ? 'ハード' : 'ノーマル'} Lv.${this.state.level}`;
      navigator.clipboard.writeText(text).then(() => {
        alert('結果をクリップボードにコピーしました！');
      }).catch(() => {
        prompt('結果テキスト:', text);
      });
    });
  }

  private async submitAndLoadRanking() {
    const score = calculateScore(this.state);

    // スコア送信（失敗しても続行）
    await submitScore({
      companyName: this.state.companyName,
      score,
      difficulty: this.state.difficulty,
      level: this.state.level,
      totalProfit: this.state.totalProfit,
    });

    // ランキング取得
    const rankings = await getLeaderboard(20);
    const myRank = rankings.findIndex(r => r.companyName === this.state.companyName && r.score === score) + 1;

    const rankingSection = document.getElementById('ranking-section');
    if (!rankingSection) return;

    const rowsHtml = rankings.slice(0, 10).map((r, i) => {
      const isMe = r.companyName === this.state.companyName && r.score === score;
      return `
      <tr ${isMe ? 'class="my-rank"' : ''}>
        <td>${i + 1}</td>
        <td>${r.companyName}</td>
        <td>${r.score.toLocaleString()}</td>
        <td>${r.difficulty === 'hard' ? 'ハード' : 'ノーマル'}</td>
        <td>Lv.${r.level}</td>
      </tr>`;
    }).join('');

    rankingSection.innerHTML = `
    <div style="font-size:0.85rem;font-weight:700;margin-bottom:8px;color:var(--accent-primary)">
      🏆 ランキング ${myRank > 0 ? `（あなたは${myRank}位）` : ''}
    </div>
    <table class="ranking-table">
      <thead><tr><th>#</th><th>会社名</th><th>スコア</th><th>難易度</th><th>レベル</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    `;
  }
}
