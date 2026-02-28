// ========================================
// ゲームエンジン（状態管理・計算ロジック）
// ========================================

import type {
  GameState, GamePhase, Weather, MonthResult, CatchRecord,
  ScheduledEvent, EventOption, LearningBonus, LogEntry,
} from './types';
import {
  FISHING_AREAS, FISHING_METHODS, FISH_SPECIES, FISHERMEN,
  UPGRADES, EVENT_TEMPLATES, REGULATIONS, NEWS_TEMPLATES, GAME_CONFIG, DIFFICULTY_CONFIG,
} from './data';
import type { Difficulty } from './types';

function getDC(difficulty: Difficulty) {
  return DIFFICULTY_CONFIG[difficulty];
}

// ----------------------------------------
// 初期状態生成
// ----------------------------------------
export function createInitialState(): GameState {
  const dc = getDC('normal');
  return {
    phase: 'INIT',
    companyName: '',
    difficulty: 'normal',
    month: 1,
    money: dc.initialMoney,
    debt: 0,
    debtTurnsLeft: 0,
    interestRate: dc.interestRate,
    reputation: 50,
    level: 1,
    unlockedAreas: ['kaga', 'nanao-bay'],
    unlockedMethods: ['fixed-net', 'bottom-trawl', 'gill-net'],
    upgrades: UPGRADES.map(u => ({ ...u, purchased: false })),
    fishermen: [...FISHERMEN],
    selectedFishermanId: FISHERMEN[0].id,
    selectedAreaId: null,
    selectedMethodId: null,
    isResting: false,
    borrowAmount: 0,
    currentDay: 0,
    scheduledEvents: [],
    currentEventIndex: 0,
    monthResult: null,
    currentWeather: 'sunny',
    currentRegulations: [],
    currentNews: [],
    log: [],
    monthHistory: [],
    learningBonuses: [],
    totalProfit: 0,
    totalRevenue: 0,
  };
}

// ----------------------------------------
// フェーズ遷移
// ----------------------------------------
export function setPhase(state: GameState, phase: GamePhase): GameState {
  return { ...state, phase };
}

// ----------------------------------------
// ゲーム開始（難易度パラメータ適用）
// ----------------------------------------
export function startGame(state: GameState): GameState {
  const dc = getDC(state.difficulty);
  return startMonth({
    ...state,
    money: dc.initialMoney,
    interestRate: dc.interestRate,
    phase: 'MONTH_START',
  });
}

// ----------------------------------------
// 月開始処理
// ----------------------------------------
export function startMonth(state: GameState): GameState {
  const weather = rollWeather(state.difficulty);
  const regulations = REGULATIONS.filter(r => r.month === state.month);
  const newsTemplate = NEWS_TEMPLATES.find(n => n.month === state.month);
  const news = newsTemplate ? newsTemplate.items : [];

  return {
    ...state,
    phase: 'MONTH_START',
    currentWeather: weather,
    currentRegulations: regulations,
    currentNews: news,
    selectedAreaId: null,
    selectedMethodId: null,
    isResting: false,
    borrowAmount: 0,
    scheduledEvents: [],
    currentEventIndex: 0,
    monthResult: null,
  };
}

function rollWeather(difficulty: Difficulty): Weather {
  const dc = getDC(difficulty);
  const r = Math.random();
  if (r < dc.weatherSunny) return 'sunny';
  if (r < dc.weatherSunny + dc.weatherCloudy) return 'cloudy';
  return 'stormy';
}

// ----------------------------------------
// 借入処理
// ----------------------------------------
export function applyBorrow(state: GameState, amount: number): GameState {
  if (amount <= 0) return state;
  const dc = getDC(state.difficulty);
  const newDebt = state.debt + amount;
  if (newDebt > dc.maxDebt) return state;

  return {
    ...state,
    money: state.money + amount,
    debt: newDebt,
    debtTurnsLeft: state.debt === 0 ? dc.debtRepayTurns : state.debtTurnsLeft,
  };
}

// ----------------------------------------
// 操業開始：イベントをスケジュール
// ----------------------------------------
export function prepareOperation(state: GameState): GameState {
  if (state.isResting) {
    return { ...state, scheduledEvents: [], currentEventIndex: 0 };
  }

  const eventCount = Math.floor(Math.random() * (GAME_CONFIG.MAX_EVENTS_PER_MONTH + 1));
  const days = pickUniqueDays(eventCount, 3, 27); // 3日〜27日にランダム配置
  const templates = pickRandomEventTemplates(eventCount, state);

  const scheduled: ScheduledEvent[] = templates.map((t, i) => ({
    day: days[i],
    template: t,
    resolved: false,
  }));
  scheduled.sort((a, b) => a.day - b.day);

  return {
    ...state,
    phase: 'RUNNING',
    currentDay: 0,
    scheduledEvents: scheduled,
    currentEventIndex: 0,
  };
}

function pickUniqueDays(count: number, min: number, max: number): number[] {
  const days = new Set<number>();
  while (days.size < count) {
    days.add(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return Array.from(days).sort((a, b) => a - b);
}

function pickRandomEventTemplates(count: number, state: GameState) {
  const pool = [...EVENT_TEMPLATES];
  const result = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

// ----------------------------------------
// 日付進行（呼び出し側でタイマー管理）
// ----------------------------------------
export function advanceDay(state: GameState): { state: GameState; eventFired: boolean } {
  const nextDay = state.currentDay + 1;

  // 次のイベント日に到達したか
  const nextEvent = state.scheduledEvents[state.currentEventIndex];
  if (nextEvent && !nextEvent.resolved && nextDay >= nextEvent.day) {
    return {
      state: { ...state, currentDay: nextEvent.day, phase: 'EVENT' },
      eventFired: true,
    };
  }

  return {
    state: { ...state, currentDay: nextDay },
    eventFired: false,
  };
}

// ----------------------------------------
// イベント選択適用
// ----------------------------------------
export function resolveEvent(state: GameState, option: EventOption): GameState {
  const events = [...state.scheduledEvents];
  const idx = state.currentEventIndex;
  const resolvedEvent: ScheduledEvent = {
    ...events[idx],
    resolved: true,
    chosenOption: option,
  };
  events[idx] = resolvedEvent;

  let money = state.money;
  if (option.effect.moneyDelta) {
    money += option.effect.moneyDelta;
  }

  const log: LogEntry[] = [
    ...state.log,
    {
      month: state.month,
      day: events[idx].day,
      type: 'event',
      text: `【${events[idx].template.title}】${option.label}を選択`,
    },
  ];

  return {
    ...state,
    money,
    scheduledEvents: events,
    currentEventIndex: idx + 1,
    phase: 'RUNNING',
    log,
  };
}

// ----------------------------------------
// 月終了：結果計算
// ----------------------------------------
export function finishMonth(state: GameState): GameState {
  const result = calculateMonthResult(state);

  let money = state.money - result.fuelCost - result.fixedCost + result.totalRevenue + result.eventCostDelta - result.interestCost;
  let debt = state.debt;
  let debtTurnsLeft = state.debtTurnsLeft;

  // 休業時の副業収入
  if (state.isResting) {
    money += getDC(state.difficulty).restIncome;
  }

  const totalProfit = state.totalProfit + result.profit;
  const totalRevenue = state.totalRevenue + result.totalRevenue;
  const newLevel = calcLevel(totalProfit);

  // 借金ターン進行
  if (debt > 0) {
    debtTurnsLeft = Math.max(0, debtTurnsLeft - 1);
  }

  // 学びボーナス更新（残り月数を減らす）
  const learningBonuses = state.learningBonuses
    .map(lb => ({ ...lb, remainingMonths: lb.remainingMonths - 1 }))
    .filter(lb => lb.remainingMonths > 0);

  // 失敗から学ぶ
  const newBonuses = deriveNewLearningBonuses(result, state.learningBonuses);
  learningBonuses.push(...newBonuses);

  const log: LogEntry[] = [
    ...state.log,
    {
      month: state.month,
      type: 'result',
      text: `${state.month}月結果：利益 ${result.profit.toLocaleString()}円`,
    },
  ];

  return {
    ...state,
    phase: 'RESULT',
    money,
    debt,
    debtTurnsLeft,
    monthResult: result,
    totalProfit,
    totalRevenue,
    level: newLevel,
    monthHistory: [...state.monthHistory, result],
    learningBonuses,
    log,
  };
}

function calcLevel(totalProfit: number): number {
  const thresholds = GAME_CONFIG.LEVEL_THRESHOLDS;
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalProfit >= thresholds[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 5);
}

function calculateMonthResult(state: GameState): MonthResult {
  const { selectedAreaId, selectedMethodId, isResting, currentWeather, difficulty } = state;
  const dc = getDC(difficulty);

  if (isResting) {
    const ic = calcInterest(state);
    return {
      isResting: true,
      weather: currentWeather,
      catches: [],
      totalRevenue: 0,
      fuelCost: 0,
      fixedCost: dc.fixedCostPerMonth,
      eventCostDelta: 0,
      interestCost: ic,
      profit: -dc.fixedCostPerMonth - ic + dc.restIncome,
      yieldMultiplier: 1.0,
      events: state.scheduledEvents,
    };
  }

  const area = FISHING_AREAS.find(a => a.id === selectedAreaId)!;
  const method = FISHING_METHODS.find(m => m.id === selectedMethodId)!;

  if (!area || !method) {
    return emptyResult(currentWeather, calcInterest(state), state.difficulty);
  }

  // 対象魚種を絞る（海域×漁法の交差）
  const validFish = FISH_SPECIES.filter(
    f => f.areas.includes(area.id) && f.methods.includes(method.id)
  );

  if (validFish.length === 0) {
    return emptyResult(currentWeather, calcInterest(state), state.difficulty);
  }

  // 天候補正
  const weatherMultiplier = getWeatherMultiplier(currentWeather, method.id);

  // イベントによる水揚げ補正（解決済みイベントを合算）
  let eventYieldMultiplier = 1.0;
  let eventCostDelta = 0;
  for (const ev of state.scheduledEvents) {
    if (ev.resolved && ev.chosenOption) {
      const eff = ev.chosenOption.effect;
      if (eff.yieldMultiplier) eventYieldMultiplier *= eff.yieldMultiplier;
      if (eff.moneyDelta) eventCostDelta += eff.moneyDelta;
    }
  }

  // 学びボーナス
  let learningYieldBonus = 1.0;
  for (const lb of state.learningBonuses) {
    if (lb.effect.yieldMultiplier) learningYieldBonus *= lb.effect.yieldMultiplier;
  }

  // 漁師ボーナス
  const fisherman = state.fishermen.find(f => f.id === state.selectedFishermanId);
  const fisherYieldBonus = fisherman ? fisherman.yieldBonus : 1.0;
  const fisherStabilityBonus = fisherman ? fisherman.stabilityBonus : 0;
  const specialBonus = fisherman?.specialMethod === method.id ? 1.2 : 1.0;

  // アップグレードボーナス
  const purchasedUpgrades = state.upgrades.filter(u => u.purchased);
  const fuelReduction = purchasedUpgrades.reduce((acc, u) => acc + (u.effect.fuelCostReduction || 0), 0);
  const priceVarianceReduction = purchasedUpgrades.reduce((acc, u) => acc + (u.effect.priceVarianceReduction || 0), 0);
  const upgradeYieldBonus = purchasedUpgrades.reduce((acc, u) => acc + (u.effect.yieldBonus || 0), 0);

  // 水揚げ量計算
  const baseVariance = Math.max(0.05, method.yieldVariance - fisherStabilityBonus * 0.2);
  const yieldNoise = 1 + (Math.random() * 2 - 1) * baseVariance;
  const totalYieldMultiplier = dc.baseYieldMultiplier * weatherMultiplier * eventYieldMultiplier * learningYieldBonus
    * fisherYieldBonus * specialBonus * (1 + upgradeYieldBonus) * yieldNoise;
  const baseYield = method.baseYield * totalYieldMultiplier;

  // 魚種ごとの分配
  const catches: CatchRecord[] = [];
  const priceVariance = dc.priceVariance * (1 - priceVarianceReduction);

  // 魚種ウェイト（レア度・旬を考慮）
  const weights = validFish.map(f => {
    const seasonal = f.seasonality[state.month - 1];
    const rarityWeight = f.rarity === 'common' ? 1.0 : f.rarity === 'uncommon' ? 0.4 : 0.1;
    return Math.max(0, seasonal * rarityWeight);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let totalRevenue = 0;
  for (let i = 0; i < validFish.length; i++) {
    const fish = validFish[i];
    if (weights[i] <= 0) continue;

    const share = weights[i] / totalWeight;
    const quantity = Math.round(baseYield * share);
    if (quantity <= 0) continue;

    const seasonalPrice = fish.basePrice * fish.seasonality[state.month - 1];
    const priceNoise = 1 + (Math.random() * 2 - 1) * priceVariance;
    const unitPrice = Math.round(seasonalPrice * priceNoise);
    const subtotal = quantity * unitPrice;

    catches.push({ fishId: fish.id, fishName: fish.name, quantity, unitPrice, subtotal });
    totalRevenue += subtotal;
  }

  // コスト計算
  const fuelCost = Math.round(
    dc.fuelCostPerUnit * area.distance * method.fuelMultiplier * (1 - fuelReduction)
  );
  const fixedCost = dc.fixedCostPerMonth;
  const interestCost = calcInterest(state);
  const profit = totalRevenue - fuelCost - fixedCost + eventCostDelta - interestCost;

  return {
    isResting: false,
    area: area.name,
    method: method.name,
    weather: currentWeather,
    catches,
    totalRevenue,
    fuelCost,
    fixedCost,
    eventCostDelta,
    interestCost,
    profit,
    yieldMultiplier: totalYieldMultiplier,
    events: state.scheduledEvents,
  };
}

function emptyResult(weather: Weather, interestCost: number, difficulty: Difficulty = 'normal'): MonthResult {
  const fixedCost = getDC(difficulty).fixedCostPerMonth;
  return {
    isResting: false,
    weather,
    catches: [],
    totalRevenue: 0,
    fuelCost: 0,
    fixedCost,
    eventCostDelta: 0,
    interestCost,
    profit: -fixedCost - interestCost,
    yieldMultiplier: 1.0,
    events: [],
  };
}

function getWeatherMultiplier(weather: Weather, methodId: string): number {
  if (weather === 'sunny') return 1.0;
  if (weather === 'cloudy') {
    return methodId === 'squid-fishing' ? 0.85 : 0.9;
  }
  // stormy
  if (methodId === 'fixed-net') return 0.7;
  if (methodId === 'diving') return 0.3;
  return 0.55;
}

function calcInterest(state: GameState): number {
  if (state.debt <= 0) return 0;
  return Math.round(state.debt * state.interestRate);
}

// ----------------------------------------
// 失敗から学ぶボーナス生成
// ----------------------------------------
function deriveNewLearningBonuses(result: MonthResult, existing: LearningBonus[]): LearningBonus[] {
  const bonuses: LearningBonus[] = [];

  if (result.weather === 'stormy' && result.profit < 0) {
    const alreadyHas = existing.some(lb => lb.key === 'storm-resilience');
    if (!alreadyHas) {
      bonuses.push({
        key: 'storm-resilience',
        description: '荒天を経験：次回荒天時の損失軽減',
        effect: {},
        remainingMonths: 3,
      });
    }
  }

  return bonuses;
}

// ----------------------------------------
// 成長・解放判定
// ----------------------------------------
export function checkGrowth(state: GameState): GameState {
  const newLevel = calcLevel(state.totalProfit);
  const levelUp = newLevel > state.level;
  let unlockedAreas = [...state.unlockedAreas];
  let unlockedMethods = [...state.unlockedMethods];

  if (levelUp || newLevel !== state.level) {
    // 解放チェック
    FISHING_AREAS.forEach(area => {
      if (area.unlockLevel <= newLevel && !unlockedAreas.includes(area.id)) {
        unlockedAreas.push(area.id);
      }
    });
    FISHING_METHODS.forEach(method => {
      if (method.unlockLevel <= newLevel && !unlockedMethods.includes(method.id)) {
        unlockedMethods.push(method.id);
      }
    });
  }

  return {
    ...state,
    level: newLevel,
    unlockedAreas,
    unlockedMethods,
    phase: 'GROWTH',
  };
}

// ----------------------------------------
// 次の月へ or ゲーム終了
// ----------------------------------------
export function proceedToNextMonth(state: GameState): GameState {
  const dc = getDC(state.difficulty);
  // 強制終了チェック（借金返済期限切れ）
  if (state.debt > 0 && state.debtTurnsLeft === 0) {
    return { ...state, phase: 'END' };
  }
  // 借金上限超過
  if (state.debt > dc.maxDebt) {
    return { ...state, phase: 'END' };
  }
  // 資金不足による破産（資金マイナス かつ これ以上借りられない）
  if (state.money < 0 && state.debt >= dc.maxDebt) {
    return { ...state, phase: 'END' };
  }

  if (state.month >= 12) {
    return { ...state, phase: 'END' };
  }

  return {
    ...state,
    month: state.month + 1,
    phase: 'MONTH_START',
    currentDay: 0,
    scheduledEvents: [],
    currentEventIndex: 0,
    monthResult: null,
  };
}

// ----------------------------------------
// アップグレード購入
// ----------------------------------------
export function purchaseUpgrade(state: GameState, upgradeId: string): GameState {
  const upgrade = state.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || upgrade.purchased || state.money < upgrade.cost) return state;

  // 評判ボーナス適用
  const repBonus = upgrade.effect.reputationBonus || 0;

  return {
    ...state,
    money: state.money - upgrade.cost,
    reputation: Math.min(100, state.reputation + repBonus),
    upgrades: state.upgrades.map(u =>
      u.id === upgradeId ? { ...u, purchased: true } : u
    ),
  };
}

// ----------------------------------------
// 借金返済
// ----------------------------------------
export function repayDebt(state: GameState, amount: number): GameState {
  const repay = Math.min(amount, state.debt, state.money);
  const newDebt = state.debt - repay;
  return {
    ...state,
    money: state.money - repay,
    debt: newDebt,
    debtTurnsLeft: newDebt > 0 ? state.debtTurnsLeft : 0,
  };
}

// ----------------------------------------
// スコア計算
// ----------------------------------------
export function calculateScore(state: GameState): number {
  const difficultyMultiplier = getDC(state.difficulty).scoreMultiplier;
  const levelBonus = (state.level - 1) * 500000;
  const unlockedBonus = (state.unlockedAreas.length + state.unlockedMethods.length) * 100000;
  const reputationBonus = state.reputation * 10000;
  const debtPenalty = state.debt * 0.5;

  const base = state.totalProfit + levelBonus + unlockedBonus + reputationBonus - debtPenalty;
  return Math.max(0, Math.round(base * difficultyMultiplier));
}

// ----------------------------------------
// 規制チェック
// ----------------------------------------
export function isAreaRestricted(state: GameState, areaId: string): boolean {
  return state.currentRegulations.some(r => r.restrictedAreas?.includes(areaId));
}

export function isMethodRestricted(state: GameState, methodId: string): boolean {
  return state.currentRegulations.some(r => r.restrictedMethods?.includes(methodId));
}
