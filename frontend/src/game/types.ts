// ========================================
// ゲーム全体の型定義
// ========================================

export type GamePhase =
  | 'INIT'
  | 'SETUP'
  | 'MONTH_START'
  | 'DECISION'
  | 'RUNNING'
  | 'EVENT'
  | 'RESULT'
  | 'NEWS'
  | 'GROWTH'
  | 'END';

export type Difficulty = 'normal' | 'hard';
export type Weather = 'sunny' | 'cloudy' | 'stormy';

// ========================================
// 海域
// ========================================
export interface FishingArea {
  id: string;
  name: string;
  description: string;
  distance: number;        // 燃料倍率の基礎（1.0〜3.0）
  availableMethods: string[];
  mainFish: string[];      // 主要魚種ID
  unlockLevel: number;     // 解放に必要な会社レベル
  icon: string;
}

// ========================================
// 漁法
// ========================================
export interface FishingMethod {
  id: string;
  name: string;
  description: string;
  fuelMultiplier: number;  // 燃料倍率
  baseYield: number;       // 基本水揚げ量（kg）
  yieldVariance: number;   // ばらつき係数（0〜1）
  targetFish: string[];    // 対象魚種ID
  unlockLevel: number;
  icon: string;
}

// ========================================
// 魚種
// ========================================
export interface FishSpecies {
  id: string;
  name: string;
  basePrice: number;       // 基本単価（円/kg）
  seasonality: number[];   // 月別係数（12要素、1が基準）
  areas: string[];         // 水揚げ可能な海域ID
  methods: string[];       // 対応漁法ID
  rarity: 'common' | 'uncommon' | 'rare'; // レア度
}

// ========================================
// NPC漁師
// ========================================
export interface Fisherman {
  id: string;
  name: string;
  description: string;
  yieldBonus: number;      // 水揚げ補正（倍率）
  stabilityBonus: number;  // 安定性補正（ばらつき軽減、0〜1）
  specialMethod?: string;  // 特定漁法が得意
  eventBonus: number;      // イベント時の有利補正
}

// ========================================
// アップグレード
// ========================================
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: UpgradeEffect;
  purchased: boolean;
  unlockLevel: number;
}

export interface UpgradeEffect {
  priceVarianceReduction?: number;  // 価格ブレ軽減
  fuelCostReduction?: number;       // 燃料費削減率
  newsPrecision?: number;           // ニュース精度UP
  yieldBonus?: number;              // 水揚げ量UP
  reputationBonus?: number;         // 評価UP
}

// ========================================
// ランダムイベント
// ========================================
export interface EventTemplate {
  id: string;
  title: string;
  description: string;
  applicableAreas?: string[];  // nullなら全海域
  applicableMethods?: string[];
  options: EventOption[];
}

export interface EventOption {
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  effect: EventEffect;
}

export interface EventEffect {
  moneyDelta?: number;            // 即時資金変動
  yieldMultiplier?: number;       // 月末水揚げ補正
  nextWeatherBonus?: boolean;     // 次月天候耐性
  newsPrecisionBonus?: boolean;   // 次月ニュース精度UP
  reputationDelta?: number;       // 評価変動
}

export interface ScheduledEvent {
  day: number;
  template: EventTemplate;
  resolved: boolean;
  chosenOption?: EventOption;
}

// ========================================
// 法規制
// ========================================
export interface Regulation {
  month: number;
  restrictedAreas?: string[];
  restrictedMethods?: string[];
  reason: string;
}

// ========================================
// ニュース
// ========================================
export interface NewsItem {
  id: string;
  title: string;
  body: string;
  category: 'regulation' | 'weather' | 'market' | 'area';
  hint?: string;  // 示唆する内容（直接答えは書かない）
}

// ========================================
// 月の結果
// ========================================
export interface CatchRecord {
  fishId: string;
  fishName: string;
  quantity: number;        // kg
  unitPrice: number;       // 円/kg
  subtotal: number;        // 円
}

export interface MonthResult {
  isResting: boolean;
  area?: string;
  method?: string;
  weather: Weather;
  catches: CatchRecord[];
  totalRevenue: number;    // 総売上
  fuelCost: number;        // 燃料費
  fixedCost: number;       // 固定費
  eventCostDelta: number;  // イベントによる増減
  interestCost: number;    // 利息
  profit: number;          // 利益
  yieldMultiplier: number; // イベントによる水揚げ補正（最終）
  events: ScheduledEvent[];
  learningKey?: string;    // 失敗ログのキー
}

// ========================================
// 学びボーナス
// ========================================
export interface LearningBonus {
  key: string;
  description: string;
  effect: Partial<EventEffect>;
  remainingMonths: number;
}

// ========================================
// ログエントリ
// ========================================
export interface LogEntry {
  month: number;
  day?: number;
  type: 'event' | 'news' | 'result' | 'regulation' | 'system';
  text: string;
}

// ========================================
// ゲーム全体の状態
// ========================================
export interface GameState {
  phase: GamePhase;
  companyName: string;
  difficulty: Difficulty;
  month: number;           // 1〜12

  money: number;
  debt: number;
  debtTurnsLeft: number;
  interestRate: number;    // 月利

  reputation: number;      // 0〜100
  level: number;           // 1〜5

  unlockedAreas: string[];
  unlockedMethods: string[];
  upgrades: Upgrade[];
  fishermen: Fisherman[];
  selectedFishermanId: string | null;

  // 今月の選択
  selectedAreaId: string | null;
  selectedMethodId: string | null;
  isResting: boolean;
  borrowAmount: number;

  // 今月の進行
  currentDay: number;
  scheduledEvents: ScheduledEvent[];
  currentEventIndex: number;
  monthResult: MonthResult | null;
  currentWeather: Weather;
  currentRegulations: Regulation[];

  // ニュース
  currentNews: NewsItem[];

  // 履歴
  log: LogEntry[];
  monthHistory: MonthResult[];
  learningBonuses: LearningBonus[];

  // 集計
  totalProfit: number;
  totalRevenue: number;
}
