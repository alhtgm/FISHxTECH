// ========================================
// ゲームエンジン（状態管理・計算ロジック）
// ========================================

import type {
  GameState, GamePhase, Weather, MonthResult, CatchRecord,
  ScheduledEvent, EventOption, LearningBonus, LogEntry, ActiveChallenge,
  VoyageCard, CrewMember,
} from './types';
import {
  FISHING_AREAS, FISHING_METHODS, FISH_SPECIES, CREW_MEMBERS,
  UPGRADES, EVENT_TEMPLATES, REGULATIONS, NEWS_TEMPLATES, GAME_CONFIG,
  CHALLENGE_TEMPLATES, VOYAGE_CARDS,
} from './data';

function getConfig() {
  return GAME_CONFIG;
}

// ----------------------------------------
// 初期状態生成
// ----------------------------------------
export function createInitialState(): GameState {
  const dc = getConfig();
  return {
    phase: 'INIT',
    companyName: '',
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
    crew: [{ ...CREW_MEMBERS[0] }],  // 高橋正一のみ初期雇用済み
    applicants: [],
    selectedCrewIds: [CREW_MEMBERS[0].id],  // 高橋正一（初期採用済み）を初期選択
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

    currentVoyageCards: [],
    voyageCardDeck: [],
    bondLevels: {},
    monthlyServices: { forecast: false, insurance: false },
    runNumber: 1,
    yearFuelMultiplier: 1.0,
    yearFixedMultiplier: 1.0,
    personalBests: { bestMonthProfit: 0, bestStreak: 0 },
    consecutiveProfitMonths: 0,
    extraCrewDeployed: false,

    prologueSlide: 0,
    storyBeatSeen: false,
    tutorialStep: 0,
    currentChallenge: null,
  };
}

// ----------------------------------------
// 航海カードドロー（毎月n枚）
// ----------------------------------------
function drawVoyageCardDeck(n: number): VoyageCard[] {
  const deck = [...VOYAGE_CARDS];
  const drawn: VoyageCard[] = [];
  for (let i = 0; i < n && deck.length > 0; i++) {
    const idx = Math.floor(Math.random() * deck.length);
    drawn.push(deck.splice(idx, 1)[0]);
  }
  return drawn;
}

// ----------------------------------------
// カード効果集約
// ----------------------------------------
function getCardFx(cards: VoyageCard[], weather: Weather) {
  const weatherOverride = cards.map(c => c.effect.weatherOverride).find(w => w !== undefined);
  const effectiveWeather = weatherOverride ?? weather;

  let allYieldMult = cards.reduce((acc, c) => acc * (c.effect.allYieldMultiplier ?? 1), 1);

  // 嵐こそチャンスカード（収量補正のみここで適用）
  const stormCard = cards.find(c => c.effect.stormBonusEffect);
  if (stormCard?.effect.stormBonusEffect) {
    const se = stormCard.effect.stormBonusEffect;
    allYieldMult *= effectiveWeather === 'stormy' ? se.stormYieldMultiplier : se.calmYieldPenalty;
  }

  // 運命の一網（ここでロールして決定）
  const fatefulCard = cards.find(c => c.effect.fatefulEffect);
  let fatefulMult = 1;
  let fatefulWasLucky: boolean | undefined;
  if (fatefulCard?.effect.fatefulEffect) {
    fatefulWasLucky = Math.random() < 0.5;
    fatefulMult = fatefulWasLucky
      ? fatefulCard.effect.fatefulEffect.luckyMultiplier
      : fatefulCard.effect.fatefulEffect.unluckyMultiplier;
    allYieldMult *= fatefulMult;
  }

  const methodMults: Record<string, number> = {};
  for (const c of cards) {
    if (c.effect.specificMethodMultipliers) {
      for (const [id, mult] of Object.entries(c.effect.specificMethodMultipliers)) {
        if (mult !== undefined) methodMults[id] = (methodMults[id] ?? 1) * mult;
      }
    }
  }
  const areaMults: Record<string, number> = {};
  for (const c of cards) {
    if (c.effect.specificAreaMultipliers) {
      for (const [id, mult] of Object.entries(c.effect.specificAreaMultipliers)) {
        if (mult !== undefined) areaMults[id] = (areaMults[id] ?? 1) * mult;
      }
    }
  }
  const fishPriceMults: Record<string, number> = {};
  for (const c of cards) {
    if (c.effect.specificFishPriceMultipliers) {
      for (const [id, mult] of Object.entries(c.effect.specificFishPriceMultipliers)) {
        if (mult !== undefined) fishPriceMults[id] = (fishPriceMults[id] ?? 1) * mult;
      }
    }
  }

  return {
    effectiveWeather,
    allYieldMult,
    allPriceMult: cards.reduce((acc, c) => acc * (c.effect.allPriceMultiplier ?? 1), 1),
    rarePriceMult: cards.reduce((acc, c) => acc * (c.effect.rarePriceMultiplier ?? 1), 1),
    fuelMult: cards.reduce((acc, c) => acc * (c.effect.fuelCostMultiplier ?? 1), 1),
    fixedCostMult: cards.reduce((acc, c) => acc * (c.effect.fixedCostMultiplier ?? 1), 1),
    fixedBonus: cards.reduce((acc, c) => acc + (c.effect.fixedMoneyBonus ?? 0), 0),
    eventSuccessBonus: cards.reduce((acc, c) => acc + (c.effect.eventSuccessBonus ?? 0), 0),
    seasonalMult: cards.reduce((acc, c) => acc * (c.effect.seasonalFishMultiplier ?? 1), 1),
    methodMults,
    areaMults,
    fishPriceMults,
    gamblerEffect: cards.find(c => c.effect.gamblerEffect)?.effect.gamblerEffect,
    fatefulWasLucky,
  };
}

// ========================================
// New Game+ 開始（年度継続）
// ========================================
export function startNewYear(state: GameState): GameState {
  const carryover = Math.round(state.money * 0.4);
  const newRun = state.runNumber + 1;
  const dc = getConfig();
  const fuelMult = 1 + (newRun - 1) * 0.15;
  const fixedMult = 1 + (newRun - 1) * 0.12;

  return startMonth({
    ...createInitialState(),
    companyName: state.companyName,
    money: dc.initialMoney * 0.3 + carryover,
    upgrades: state.upgrades,
    crew: state.crew,
    applicants: [],
    selectedCrewIds: state.selectedCrewIds,
    unlockedAreas: ['kaga', 'nanao-bay'],
    unlockedMethods: ['fixed-net', 'bottom-trawl', 'gill-net'],
    reputation: Math.round(state.reputation * 0.5),
    level: 1,
    runNumber: newRun,
    yearFuelMultiplier: fuelMult,
    yearFixedMultiplier: fixedMult,
    personalBests: state.personalBests,
    bondLevels: state.bondLevels, // 絆は引き継ぐ
    consecutiveProfitMonths: 0,
    tutorialStep: -1,
    phase: 'MONTH_START',
    month: 1,
  });
}

// ----------------------------------------
// 航海カード選択（CARD_SELECT フェーズ）
// ----------------------------------------
export function enterCardSelect(state: GameState): GameState {
  return { ...state, phase: 'CARD_SELECT' };
}

export function toggleVoyageCard(state: GameState, cardId: string): GameState {
  const card = state.voyageCardDeck.find(c => c.id === cardId);
  if (!card) return state;
  const alreadySelected = state.currentVoyageCards.some(c => c.id === cardId);
  if (alreadySelected) {
    return { ...state, currentVoyageCards: state.currentVoyageCards.filter(c => c.id !== cardId) };
  }
  if (state.currentVoyageCards.length >= 3) return state;
  return { ...state, currentVoyageCards: [...state.currentVoyageCards, card] };
}

export function confirmVoyageCards(state: GameState): GameState {
  let selected = [...state.currentVoyageCards];
  if (selected.length < 3) {
    const remaining = state.voyageCardDeck.filter(c => !selected.some(s => s.id === c.id));
    const shuffled = remaining.sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, 3 - selected.length));
  }
  return { ...state, phase: 'DECISION', currentVoyageCards: selected };
}

// ----------------------------------------
// 月間チャレンジ
// ----------------------------------------
function generateChallenge(level: number, weather: Weather): ActiveChallenge | null {
  if (level < 3) return null;
  const eligible = CHALLENGE_TEMPLATES.filter(c => {
    if (c.minLevel > level) return false;
    // storm-hero は荒天の月にのみ出題
    if (c.id === 'storm-hero' && weather !== 'stormy') return false;
    return true;
  });
  if (eligible.length === 0) return null;
  const t = eligible[Math.floor(Math.random() * eligible.length)];
  return { ...t, completed: false };
}

function checkChallengeCompleted(id: string, result: MonthResult, state: GameState): boolean {
  switch (id) {
    case 'big-haul':        return result.profit >= 500_000;
    case 'storm-hero':      return result.weather === 'stormy' && result.profit > 0;
    case 'event-ace':       return result.events.length >= 1 && result.events.every(e => e.resolved);
    case 'million-revenue': return result.totalRevenue >= 1_000_000;
    case 'rare-catch':      return result.catches.some(c => ['nodoguro', 'awabi'].includes(c.fishId));
    case 'mega-profit':     return result.profit >= 1_000_000;
    default: return false;
  }
}

// ----------------------------------------
// フェーズ遷移
// ----------------------------------------
export function setPhase(state: GameState, phase: GamePhase): GameState {
  return { ...state, phase };
}

// ----------------------------------------
// ゲーム開始
// ----------------------------------------
export function startGame(state: GameState): GameState {
  const dc = getConfig();
  return startMonth({
    ...state,
    money: dc.initialMoney,
    interestRate: dc.interestRate,
    phase: 'MONTH_START',
    tutorialStep: 1,
    storyBeatSeen: false,
  });
}

// ----------------------------------------
// 月開始処理
// ----------------------------------------
export function startMonth(state: GameState): GameState {
  const weather = rollWeather();
  const regulations = REGULATIONS.filter(r => r.month === state.month);
  const newsTemplate = NEWS_TEMPLATES.find(n => n.month === state.month);
  const news = newsTemplate ? newsTemplate.items : [];
  const challenge = generateChallenge(state.level, weather);
  // 5枚ドロー→CARD_SELECTフェーズでプレイヤーが3枚を選ぶ
  const voyageCardDeck = drawVoyageCardDeck(5);
  // 毎月2〜3名の新規応募者を生成
  const applicants = generateApplicants(state.crew, state.level);

  return {
    ...state,
    phase: 'MONTH_START',
    currentWeather: weather,
    currentRegulations: regulations,
    currentNews: news,
    currentChallenge: challenge,
    voyageCardDeck,
    applicants,
    currentVoyageCards: [], // CARD_SELECTで選択するまで空
    selectedAreaId: null,
    selectedMethodId: null,
    isResting: false,
    borrowAmount: 0,
    scheduledEvents: [],
    currentEventIndex: 0,
    monthResult: null,
    storyBeatSeen: false,
    extraCrewDeployed: false,
    monthlyServices: { forecast: false, insurance: false },
  };
}

// ----------------------------------------
// 応募者生成（毎月呼ばれる）
// ----------------------------------------
function generateApplicants(existingCrew: import('./types').CrewMember[], level: number): import('./types').CrewMember[] {
  const existingIds = new Set(existingCrew.map(c => c.id));
  const pool = CREW_MEMBERS.filter(c =>
    !existingIds.has(c.id) &&
    (!c.unlockLevel || c.unlockLevel <= level)
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(3, shuffled.length));
}

function rollWeather(): Weather {
  const dc = getConfig();
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
  const dc = getConfig();
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

  // 全イベントから5件をランダム選択（全件がミニゲーム付きで発生）
  const allTemplates = pickRandomFromPool(EVENT_TEMPLATES, 5);
  const days = pickUniqueDays(allTemplates.length, 5, 26);

  const scheduled: ScheduledEvent[] = allTemplates.map((t, i) => ({
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

function pickRandomFromPool<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
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
// イベント選択適用（ルーレット結果付き）
// ----------------------------------------
export function resolveEvent(state: GameState, option: EventOption, success: boolean): GameState {
  const events = [...state.scheduledEvents];
  const idx = state.currentEventIndex;

  // 成功/失敗に応じたエフェクトを決定
  const appliedEffect = success || !option.failureEffect ? option.effect : option.failureEffect;

  const resolvedEvent: ScheduledEvent = {
    ...events[idx],
    resolved: true,
    chosenOption: { ...option, effect: appliedEffect }, // 適用エフェクトを保存
    wasSuccess: success,
  };
  events[idx] = resolvedEvent;

  let money = state.money;
  if (appliedEffect.moneyDelta) {
    money += appliedEffect.moneyDelta;
  }

  // 評判変動
  let reputation = state.reputation;
  if (appliedEffect.reputationDelta) {
    reputation = Math.max(0, Math.min(100, reputation + appliedEffect.reputationDelta));
  }

  const resultLabel = success ? '✅成功' : '❌失敗';
  const log: LogEntry[] = [
    ...state.log,
    {
      month: state.month,
      day: events[idx].day,
      type: 'event',
      text: `【${events[idx].template.title}】${option.label} → ${resultLabel}`,
    },
  ];

  return {
    ...state,
    money,
    reputation,
    scheduledEvents: events,
    currentEventIndex: idx + 1,
    phase: 'RUNNING',
    log,
  };
}

// ----------------------------------------
// 月終了：結果計算
// ----------------------------------------
// ----------------------------------------
// クルー人件費計算
// ----------------------------------------
export function calcCrewSalary(c: import('./types').CrewMember): number {
  const base = Math.max(180_000, Math.round(c.hireCost * 0.35));
  return base + c.upgradeLevel * 50_000;
}

export function finishMonth(state: GameState): GameState {
  const result = calculateMonthResult(state);

  let money = state.money - result.fuelCost - result.fixedCost - result.crewSalaryCost + result.totalRevenue + result.eventCostDelta - result.interestCost;
  let debt = state.debt;
  let debtTurnsLeft = state.debtTurnsLeft;

  // 休業時の副業収入
  if (state.isResting) {
    money += getConfig().restIncome;
  }

  // 漁業保険（赤字時に損失の30%を補填）
  if (state.monthlyServices.insurance && result.profit < 0) {
    money += Math.round(Math.abs(result.profit) * 0.3);
  }

  const totalProfit = state.totalProfit + result.profit;
  const totalRevenue = state.totalRevenue + result.totalRevenue;
  // 利益に応じた評判の微量自動変動（月次）
  const profitRepDelta = result.profit > 500_000 ? 2 : result.profit > 0 ? 1 : result.profit < -500_000 ? -3 : result.profit < 0 ? -1 : 0;
  const baseNewRep = Math.min(100, Math.max(0, state.reputation + profitRepDelta));
  const newLevel = calcLevel(baseNewRep);

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

  // 月間チャレンジ達成チェック
  let currentChallenge = state.currentChallenge;
  let challengeRepBonus = 0;
  if (currentChallenge && !currentChallenge.completed && !state.isResting) {
    if (checkChallengeCompleted(currentChallenge.id, result, state)) {
      currentChallenge = { ...currentChallenge, completed: true };
      money += currentChallenge.rewardMoney;
      challengeRepBonus = currentChallenge.rewardRep;
    }
  }

  const log: LogEntry[] = [
    ...state.log,
    {
      month: state.month,
      type: 'result',
      text: `${state.month}月結果：利益 ${result.profit.toLocaleString()}円`,
    },
  ];

  // クルー絆レベル更新（操業した月は選択クルー全員+1）
  const bondLevels = { ...state.bondLevels };
  if (!state.isResting) {
    for (const crewId of state.selectedCrewIds) {
      const current = bondLevels[crewId] ?? 0;
      bondLevels[crewId] = Math.min(5, current + 1);
    }
  }

  return {
    ...state,
    phase: 'RESULT',
    money,
    debt,
    debtTurnsLeft,
    reputation: Math.min(100, baseNewRep + challengeRepBonus),
    monthResult: result,
    totalProfit,
    totalRevenue,
    level: calcLevel(Math.min(100, baseNewRep + challengeRepBonus)),
    monthHistory: [...state.monthHistory, result],
    learningBonuses,
    currentChallenge,
    bondLevels,
    log,
  };
}

// 評判→レベル（Lv1:0+ / Lv2:30+ / Lv3:55+ / Lv4:75+ / Lv5:90+）
function calcLevel(reputation: number): number {
  const thresholds = [0, 30, 55, 75, 90];
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (reputation >= thresholds[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 5);
}

function calculateMonthResult(state: GameState): MonthResult {
  const { selectedAreaId, selectedMethodId, isResting, currentWeather } = state;
  const dc = getConfig();

  // 航海カード効果を集約
  const cardFx = getCardFx(state.currentVoyageCards, currentWeather);
  const effectiveWeather = cardFx.effectiveWeather;

  const crewSalaryCost = state.crew.reduce((sum, c) => sum + calcCrewSalary(c), 0);

  if (isResting) {
    const ic = calcInterest(state);
    const fixedCost = Math.round(dc.fixedCostPerMonth * state.yearFixedMultiplier);
    return {
      isResting: true,
      weather: effectiveWeather,
      catches: [],
      totalRevenue: 0,
      fuelCost: 0,
      fixedCost,
      crewSalaryCost,
      eventCostDelta: 0,
      interestCost: ic,
      profit: -fixedCost - crewSalaryCost - ic + dc.restIncome,
      yieldMultiplier: 1.0,
      events: state.scheduledEvents,
      cardBonusDelta: 0,
      effectiveWeather,
    };
  }

  const area = FISHING_AREAS.find(a => a.id === selectedAreaId)!;
  const method = FISHING_METHODS.find(m => m.id === selectedMethodId)!;

  if (!area || !method) {
    return emptyResult(effectiveWeather, calcInterest(state), crewSalaryCost);
  }

  // 対象魚種を絞る（海域×漁法の交差）
  const validFish = FISH_SPECIES.filter(
    f => f.areas.includes(area.id) && f.methods.includes(method.id)
  );

  if (validFish.length === 0) {
    return emptyResult(effectiveWeather, calcInterest(state), crewSalaryCost);
  }

  // 天候補正（実効天候を使用）
  const weatherMultiplier = getWeatherMultiplier(effectiveWeather, method.id);

  // イベントによる水揚げ補正
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

  // クルーボーナス（選択クルー全員を合算）
  const selectedCrew = state.crew.filter(c => c.hired && state.selectedCrewIds.includes(c.id));
  let totalCrewYieldBonus = 0;
  let totalStabilityBonus = 0;
  let totalEventBonus = 0;
  let hasSpecialMethod = false;
  for (const c of selectedCrew) {
    const bond = state.bondLevels[c.id] ?? 0;
    const yb = c.baseYieldBonus + c.upgradeLevel * c.yieldBonusPerLevel;
    totalCrewYieldBonus += yb + bond * 0.02;
    totalStabilityBonus += c.baseStabilityBonus;
    totalEventBonus += c.baseEventBonus + bond * 0.02;
    if (c.specialMethod === method.id) hasSpecialMethod = true;
  }
  const specialBonus = hasSpecialMethod ? 1.2 : 1.0;
  const crewYieldMult = 1 + totalCrewYieldBonus;

  // アップグレードボーナス
  const purchasedUpgrades = state.upgrades.filter(u => u.purchased);
  const fuelReduction = purchasedUpgrades.reduce((acc, u) => acc + (u.effect.fuelCostReduction || 0), 0);
  const fixedCostReduction = purchasedUpgrades.reduce((acc, u) => acc + (u.effect.fixedCostReduction || 0), 0);
  const priceVarianceReduction = purchasedUpgrades.reduce((acc, u) => acc + (u.effect.priceVarianceReduction || 0), 0);
  const upgradeYieldBonus = purchasedUpgrades.reduce((acc, u) => acc + (u.effect.yieldBonus || 0), 0);
  const upgradeAllPriceMult = purchasedUpgrades.reduce((acc, u) => acc * (u.effect.allPriceMultiplier || 1), 1);

  // アップグレードの漁法特化倍率（dive-1, dive-2 等）
  let upgradeMethodMult = 1;
  for (const u of purchasedUpgrades) {
    if (u.effect.methodYieldMultiplier && u.effect.methodYieldMultiplier.methodId === method.id) {
      upgradeMethodMult *= u.effect.methodYieldMultiplier.mult;
    }
  }

  // 増員投入ボーナス
  const extraCrewBonus = state.extraCrewDeployed ? 1.2 : 1.0;

  // カードの漁法・海域ボーナス
  const cardMethodMult = cardFx.methodMults[method.id] ?? 1;
  const cardAreaMult = cardFx.areaMults[area.id] ?? 1;

  // 水揚げ量計算
  const baseVariance = Math.max(0.05, method.yieldVariance - totalStabilityBonus * 0.2);
  const yieldNoise = 1 + (Math.random() * 2 - 1) * baseVariance;
  const totalYieldMultiplier = dc.baseYieldMultiplier * weatherMultiplier * eventYieldMultiplier
    * learningYieldBonus * crewYieldMult * specialBonus * (1 + upgradeYieldBonus)
    * upgradeMethodMult * cardFx.allYieldMult * cardMethodMult * cardAreaMult * extraCrewBonus * yieldNoise;
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
    // 旬魚ボーナス（seasonalFishMultiplier）
    const isInSeason = fish.seasonality[state.month - 1] >= 1.2;
    const seasonalCardMult = isInSeason ? cardFx.seasonalMult : 1;
    const quantity = Math.round(baseYield * share * seasonalCardMult);
    if (quantity <= 0) continue;

    const seasonalPrice = fish.basePrice * fish.seasonality[state.month - 1];
    const priceNoise = 1 + (Math.random() * 2 - 1) * priceVariance;
    // カードの価格補正（全体・レア・魚種別）
    const rarityMult = fish.rarity === 'rare' ? cardFx.rarePriceMult : 1;
    const fishPriceMult = cardFx.fishPriceMults[fish.id] ?? 1;
    // アップグレードの魚種別価格ボーナス（yield-2, dive-2等）
    let upgradeFishPriceMult = 1;
    for (const u of purchasedUpgrades) {
      if (u.effect.fishPriceBonus && u.effect.fishPriceBonus.fishIds.includes(fish.id)) {
        upgradeFishPriceMult *= u.effect.fishPriceBonus.mult;
      }
    }
    const unitPrice = Math.round(seasonalPrice * priceNoise * cardFx.allPriceMult * rarityMult * fishPriceMult * upgradeFishPriceMult * upgradeAllPriceMult);
    const subtotal = quantity * unitPrice;

    catches.push({ fishId: fish.id, fishName: fish.name, quantity, unitPrice, subtotal });
    totalRevenue += subtotal;
  }

  // コスト計算（年度補正・カード補正を適用）
  const fuelCost = Math.round(
    dc.fuelCostPerUnit * area.distance * method.fuelMultiplier * (1 - fuelReduction)
    * cardFx.fuelMult * state.yearFuelMultiplier
  );
  const fixedCost = Math.round(dc.fixedCostPerMonth * cardFx.fixedCostMult * state.yearFixedMultiplier * (1 - fixedCostReduction));
  const interestCost = calcInterest(state);

  // カードの固定ボーナス（相場暴落など）
  const cardFixedBonus = cardFx.fixedBonus;

  // 大博打カード（利益確定後に適用）
  let gamblerBonus = 0;
  if (cardFx.gamblerEffect) {
    const baseProfit = totalRevenue - fuelCost - fixedCost - crewSalaryCost + eventCostDelta - interestCost + cardFixedBonus;
    const ge = cardFx.gamblerEffect;
    if (baseProfit >= ge.profitThreshold) gamblerBonus = ge.bonus;
    else if (baseProfit < 0) gamblerBonus = ge.penalty;
  }

  const cardBonusDelta = cardFixedBonus + gamblerBonus;
  const profit = totalRevenue - fuelCost - fixedCost - crewSalaryCost + eventCostDelta - interestCost + cardBonusDelta;

  const eventDetails = state.scheduledEvents
    .filter(ev => ev.resolved && ev.chosenOption)
    .map(ev => ({
      title: ev.template.title,
      option: ev.chosenOption!.label,
      yieldMult: ev.chosenOption!.effect.yieldMultiplier,
      moneyDelta: ev.chosenOption!.effect.moneyDelta,
    }));

  return {
    isResting: false,
    area: area.name,
    method: method.name,
    weather: effectiveWeather,
    catches,
    totalRevenue,
    fuelCost,
    fixedCost,
    crewSalaryCost,
    eventCostDelta,
    interestCost,
    profit,
    yieldMultiplier: totalYieldMultiplier,
    events: state.scheduledEvents,
    cardBonusDelta,
    fatefulWasLucky: cardFx.fatefulWasLucky,
    effectiveWeather,
    yieldBreakdown: {
      weather: weatherMultiplier,
      event: eventYieldMultiplier,
      learning: learningYieldBonus,
      crew: crewYieldMult * specialBonus,
      upgrade: (1 + upgradeYieldBonus) * upgradeMethodMult,
      card: cardFx.allYieldMult * cardMethodMult * cardAreaMult * extraCrewBonus,
      noise: yieldNoise,
    },
    eventDetails,
  };
}

function emptyResult(weather: Weather, interestCost: number, crewSalaryCost = 0): MonthResult {
  const fixedCost = getConfig().fixedCostPerMonth;
  return {
    isResting: false,
    weather,
    catches: [],
    totalRevenue: 0,
    fuelCost: 0,
    fixedCost,
    crewSalaryCost,
    eventCostDelta: 0,
    interestCost,
    profit: -fixedCost - crewSalaryCost - interestCost,
    yieldMultiplier: 1.0,
    events: [],
    cardBonusDelta: 0,
    effectiveWeather: weather,
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
        description: '荒天を経験：次の3ヶ月、嵐時の水揚げが15%向上',
        effect: { yieldMultiplier: 1.15 },
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
  // finishMonthで既にlevelは更新済みのため、現在レベルに対応する解放を必ず実行する
  let unlockedAreas = [...state.unlockedAreas];
  let unlockedMethods = [...state.unlockedMethods];

  FISHING_AREAS.forEach(area => {
    if (area.unlockLevel <= state.level && !unlockedAreas.includes(area.id)) {
      unlockedAreas.push(area.id);
    }
  });
  FISHING_METHODS.forEach(method => {
    if (method.unlockLevel <= state.level && !unlockedMethods.includes(method.id)) {
      unlockedMethods.push(method.id);
    }
  });

  return {
    ...state,
    unlockedAreas,
    unlockedMethods,
    phase: 'GROWTH',
  };
}

// ----------------------------------------
// 次の月へ or ゲーム終了
// ----------------------------------------
export function proceedToNextMonth(state: GameState): GameState {
  const dc = getConfig();
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
    storyBeatSeen: false,
  };
}

// ----------------------------------------
// アップグレード購入
// ----------------------------------------
export function purchaseUpgrade(state: GameState, upgradeId: string): GameState {
  const upgrade = state.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || upgrade.purchased || state.money < upgrade.cost) return state;

  // 前提アップグレードチェック
  if (upgrade.requires) {
    for (const reqId of upgrade.requires) {
      if (!state.upgrades.find(u => u.id === reqId && u.purchased)) return state;
    }
  }

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
  const difficultyMultiplier = getConfig().scoreMultiplier;
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

// ----------------------------------------
// 応募者から雇用
// ----------------------------------------
export function hireApplicant(state: GameState, crewId: string): GameState {
  const applicant = state.applicants.find(c => c.id === crewId);
  if (!applicant || state.money < applicant.hireCost) return state;
  if (applicant.unlockLevel && applicant.unlockLevel > state.level) return state;

  return {
    ...state,
    money: state.money - applicant.hireCost,
    crew: [...state.crew, { ...applicant, hired: true }],
    applicants: state.applicants.filter(c => c.id !== crewId),
  };
}

// ----------------------------------------
// クルー解雇（初期クルーは解雇不可）
// ----------------------------------------
export function fireCrew(state: GameState, crewId: string): GameState {
  if (crewId === 'veteran') return state;  // 高橋正一は解雇不可
  return {
    ...state,
    crew: state.crew.filter(c => c.id !== crewId),
    selectedCrewIds: state.selectedCrewIds.filter(id => id !== crewId),
  };
}

// ----------------------------------------
// 船員雇用（後方互換性のため残す）
// ----------------------------------------
export function hireCrew(state: GameState, crewId: string): GameState {
  return hireApplicant(state, crewId);
}

// ----------------------------------------
// 船員スキルアップ
// ----------------------------------------
export function upgradeCrew(state: GameState, crewId: string): GameState {
  const member = state.crew.find(c => c.id === crewId);
  if (!member || !member.hired || member.upgradeLevel >= 3) return state;
  const cost = member.upgradeCosts[member.upgradeLevel];
  if (state.money < cost) return state;

  return {
    ...state,
    money: state.money - cost,
    crew: state.crew.map(c => c.id === crewId ? { ...c, upgradeLevel: c.upgradeLevel + 1 } : c),
  };
}

// ----------------------------------------
// 出撃クルー選択トグル（最大3人）
// ----------------------------------------
export function toggleCrewSelection(state: GameState, crewId: string): GameState {
  const member = state.crew.find(c => c.id === crewId);
  if (!member || !member.hired) return state;

  const already = state.selectedCrewIds.includes(crewId);
  if (already) {
    return { ...state, selectedCrewIds: state.selectedCrewIds.filter(id => id !== crewId) };
  }
  if (state.selectedCrewIds.length >= 3) return state;
  return { ...state, selectedCrewIds: [...state.selectedCrewIds, crewId] };
}

// ----------------------------------------
// クルーのイベント成功率ボーナス合計（showRoulette用）
// ----------------------------------------
export function getCrewEventBonus(state: GameState): number {
  const selectedCrew = state.crew.filter(c => c.hired && state.selectedCrewIds.includes(c.id));
  let total = 0;
  for (const c of selectedCrew) {
    const bond = state.bondLevels[c.id] ?? 0;
    total += c.baseEventBonus + bond * 0.02;
  }
  return total;
}
