// ========================================
// ゲーム全体の型定義
// ========================================

export type GamePhase =
  | 'INIT'
  | 'PROLOGUE'
  | 'SETUP'
  | 'MONTH_START'
  | 'CARD_SELECT'
  | 'DECISION'
  | 'RUNNING'
  | 'EVENT'
  | 'RESULT'
  | 'NEWS'
  | 'GROWTH'
  | 'YEAR_END'
  | 'END';

// ========================================
// 航海カード（Voyage Cards）
// ========================================
export interface VoyageCard {
  id: string;
  title: string;
  description: string;
  type: 'weather' | 'market' | 'special' | 'risk';
  rarity: 'common' | 'uncommon' | 'rare';
  icon: string;
  effect: VoyageCardEffect;
}

export interface VoyageCardEffect {
  weatherOverride?: Weather;
  allYieldMultiplier?: number;
  allPriceMultiplier?: number;
  rarePriceMultiplier?: number;
  fuelCostMultiplier?: number;
  fixedCostMultiplier?: number;
  fixedMoneyBonus?: number;
  eventSuccessBonus?: number;
  specificMethodMultipliers?: Partial<Record<string, number>>;
  specificAreaMultipliers?: Partial<Record<string, number>>;
  specificFishPriceMultipliers?: Partial<Record<string, number>>;
  seasonalFishMultiplier?: number;
  gamblerEffect?: { profitThreshold: number; bonus: number; penalty: number };
  stormBonusEffect?: { stormYieldMultiplier: number; calmYieldPenalty: number };
  fatefulEffect?: { luckyMultiplier: number; unluckyMultiplier: number };
}

// ========================================
// 個人記録
// ========================================
export interface PersonalBests {
  bestMonthProfit: number;
  bestStreak: number;
}

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
// 船員（クルー）
// ========================================
export interface CrewMember {
  id: string;
  name: string;
  description: string;
  icon: string;
  hireCost: number;
  hired: boolean;
  upgradeLevel: number;         // 0〜3
  upgradeCosts: number[];       // [Lv0→1, Lv1→2, Lv2→3]
  baseYieldBonus: number;       // 基本水揚げボーナス（0.1 = +10%）
  baseStabilityBonus: number;   // 安定性（ばらつき軽減）
  baseEventBonus: number;       // イベント成功率ボーナス
  yieldBonusPerLevel: number;   // アップグレード1段階ごとの水揚げボーナス
  specialMethod?: string;       // 特定漁法が得意（+20%）
  unlockLevel?: number;         // 解放に必要な会社レベル
}

// ========================================
// アップグレード（スキルツリー）
// ========================================
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: UpgradeEffect;
  purchased: boolean;
  unlockLevel: number;
  requires?: string[];                                                       // 前提アップグレードID
  category: 'info' | 'efficiency' | 'yield' | 'diving' | 'market';         // カテゴリ
}

export interface UpgradeEffect {
  priceVarianceReduction?: number;        // 価格ブレ軽減
  fuelCostReduction?: number;             // 燃料費削減率
  yieldBonus?: number;                    // 水揚げ量UP
  reputationBonus?: number;               // 評価UP
  methodYieldMultiplier?: { methodId: string; mult: number };  // 特定漁法の水揚げ倍率
  fishPriceBonus?: { fishIds: string[]; mult: number };        // 特定魚種の価格ボーナス
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
  isQuick?: boolean;  // true=クイック決断（ルーレットなし・即時効果）
}

export interface EventOption {
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  effect: EventEffect;           // 成功時エフェクト
  failureEffect?: EventEffect;   // 失敗時エフェクト（未指定の場合はeffectを劣化版で適用）
}

export interface EventEffect {
  moneyDelta?: number;            // 即時資金変動
  yieldMultiplier?: number;       // 月末水揚げ補正
  nextWeatherBonus?: boolean;     // 次月天候耐性
  reputationDelta?: number;       // 評価変動
}

export interface ScheduledEvent {
  day: number;
  template: EventTemplate;
  resolved: boolean;
  chosenOption?: EventOption;
  wasSuccess?: boolean;          // ルーレット結果（true=成功, false=失敗）
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
  cardBonusDelta: number;     // 航海カードによる追加損益
  fatefulWasLucky?: boolean;  // 運命の一網の結果
  effectiveWeather: Weather;  // カード適用後の実効天候
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
// 月間チャレンジ（Lv3以上で毎月発生）
// ========================================
export interface ActiveChallenge {
  id: string;
  title: string;
  description: string;
  rewardMoney: number;
  rewardRep: number;
  completed: boolean;
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
  crew: CrewMember[];
  selectedCrewIds: string[];   // 最大3人まで選択可能

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

  // 月間チャレンジ
  currentChallenge: ActiveChallenge | null;

  // 航海カード
  currentVoyageCards: VoyageCard[];
  voyageCardDeck: VoyageCard[];     // CARD_SELECT中の5枚候補

  // 今月の消費型サービス
  monthlyServices: { forecast: boolean; insurance: boolean };

  // 漁師絆
  bondLevels: Record<string, number>; // crew id → 0〜5

  // New Game+ / 年度制
  runNumber: number;           // 1=初回, 2+=NG+
  yearFuelMultiplier: number;  // 年度ごとに燃料コスト上昇
  yearFixedMultiplier: number; // 年度ごとに固定費上昇

  // 個人記録
  personalBests: PersonalBests;
  consecutiveProfitMonths: number;

  // RUNNING強化
  extraCrewDeployed: boolean;  // 増員投入済みか

  // ストーリー・チュートリアル
  prologueSlide: number;    // プロローグの現在スライド番号
  storyBeatSeen: boolean;   // 今月のストーリーを既読か
  tutorialStep: number;     // 0=未開始, 1-8=実行中, -1=完了
}
