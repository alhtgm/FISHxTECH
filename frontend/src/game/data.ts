// ========================================
// ゲームデータ（実データ準拠）
// 水揚げ: 石川県漁業統計 2005-2025
// 卸値: 石川県水産物卸値データ
// ========================================

import type { FishingArea, FishingMethod, FishSpecies, CrewMember, Upgrade, EventTemplate, Regulation, NewsItem, ActiveChallenge, VoyageCard } from './types';

// ----------------------------------------
// 海域定義（5海域）
// ----------------------------------------
export const FISHING_AREAS: FishingArea[] = [
  {
    id: 'kaga',
    name: '加賀海域',
    description: '金沢・加賀方面の豊かな漁場。底曳網の本場で甘エビ・カレイが豊富。能登に比べ海が穏やか。',
    distance: 1.2,
    availableMethods: ['bottom-trawl', 'gill-net', 'fixed-net', 'line-fishing'],
    mainFish: ['ama-ebi', 'aka-garei', 'noto-kani', 'maaaji', 'suzuki', 'bai'],
    unlockLevel: 1,
    icon: '🌊',
  },
  {
    id: 'nanao-bay',
    name: '七尾湾',
    description: '日本三大内湾のひとつ。穏やかな海が定置網に最適。イワシ・アジ・ブリが大量に入る。',
    distance: 1.0,
    availableMethods: ['fixed-net', 'purse-seine', 'line-fishing'],
    mainFish: ['ma-iwashi', 'ma-aji', 'buri', 'ma-saba', 'fukuragi'],
    unlockLevel: 1,
    icon: '🏞️',
  },
  {
    id: 'noto-uchi',
    name: '能登内浦',
    description: '能登半島の内側。定置網とイカ釣りが盛ん。スルメイカの漁獲量は石川屈指。',
    distance: 2.0,
    availableMethods: ['fixed-net', 'squid-fishing', 'gill-net'],
    mainFish: ['surume-ika', 'ma-iwashi', 'ma-aji', 'hatahata', 'madara'],
    unlockLevel: 2,
    icon: '🦑',
  },
  {
    id: 'noto-soto',
    name: '能登外浦',
    description: '荒々しい日本海に面した漁場。輪島・珠洲の伝統漁法が息づく。ブリ・まき網の一大漁場。',
    distance: 2.8,
    availableMethods: ['purse-seine', 'gill-net', 'squid-fishing', 'line-fishing', 'bottom-trawl'],
    mainFish: ['buri', 'kano-kani', 'surume-ika', 'ma-saba', 'madara', 'nodoguro'],
    unlockLevel: 3,
    icon: '⛵',
  },
  {
    id: 'shika',
    name: '志賀海域',
    description: '大規模なまき網漁が展開される漁場。マイワシ・マサバが大量に獲れる。燃料コスト高め。',
    distance: 2.5,
    availableMethods: ['purse-seine', 'fixed-net', 'squid-fishing', 'bottom-trawl', 'gill-net'],
    mainFish: ['ma-iwashi', 'ma-saba', 'fukuragi', 'surume-ika', 'hatahata'],
    unlockLevel: 4,
    icon: '🎣',
  },
];

// ----------------------------------------
// 漁法定義（7種）
// ----------------------------------------
export const FISHING_METHODS: FishingMethod[] = [
  {
    id: 'fixed-net',
    name: '定置網',
    description: '海中に固定した網に魚が入るのを待つ漁法。安定した収穫が見込めるが、大量獲得は難しい。',
    fuelMultiplier: 1.0,
    baseYield: 8000,
    yieldVariance: 0.25,
    targetFish: ['ma-iwashi', 'ma-aji', 'buri', 'fukuragi', 'ma-saba', 'sawara'],
    unlockLevel: 1,
    icon: '🕸️',
  },
  {
    id: 'bottom-trawl',
    name: '底曳網',
    description: '海底を網で引いて底生魚介類を一網打尽にする漁法。甘エビ・カレイが主な対象。燃料大食い。',
    fuelMultiplier: 2.2,
    baseYield: 8000,
    yieldVariance: 0.35,
    targetFish: ['ama-ebi', 'aka-garei', 'hatahata', 'nigisu', 'ma-dara', 'aji-garei'],
    unlockLevel: 1,
    icon: '⚓',
  },
  {
    id: 'gill-net',
    name: '刺網',
    description: '魚のヒレや口が引っかかる網を仕掛ける漁法。多様な魚が獲れるが、管理に手間がかかる。',
    fuelMultiplier: 1.4,
    baseYield: 6000,
    yieldVariance: 0.40,
    targetFish: ['buri', 'fukuragi', 'suzuki', 'ma-dai', 'bai', 'madara', 'umadurai'],
    unlockLevel: 1,
    icon: '🪢',
  },
  {
    id: 'purse-seine',
    name: 'まき網',
    description: '魚の群れを大きな網で囲い込む漁法。大量漁獲が可能だが、外れると収穫ゼロに近い。',
    fuelMultiplier: 2.5,
    baseYield: 8000,
    yieldVariance: 0.60,
    targetFish: ['ma-iwashi', 'ma-saba', 'ma-aji', 'buri', 'fukuragi', 'katsuo'],
    unlockLevel: 2,
    icon: '🌀',
  },
  {
    id: 'squid-fishing',
    name: 'イカ釣',
    description: '夜間に集魚灯を使ってイカを集め、疑似餌で釣り上げる漁法。能登ではスルメイカが主役。',
    fuelMultiplier: 1.5,
    baseYield: 9500,
    yieldVariance: 0.45,
    targetFish: ['surume-ika', 'yari-ika', 'aori-ika', 'ken-saki-ika'],
    unlockLevel: 2,
    icon: '💡',
  },
  {
    id: 'line-fishing',
    name: '釣',
    description: '釣り糸と釣り針で魚を狙う漁法。量は少ないが鮮度が高く高単価で売れる。',
    fuelMultiplier: 1.0,
    baseYield: 3500,
    yieldVariance: 0.50,
    targetFish: ['buri', 'ma-dai', 'nodoguro', 'suzuki', 'ma-aji', 'kano-kani'],
    unlockLevel: 3,
    icon: '🎏',
  },
  {
    id: 'diving',
    name: '素潜り',
    description: '海女・海士が素潜りで貝・海藻を採取する伝統漁法。量は極少だが超高単価。',
    fuelMultiplier: 0.5,
    baseYield: 300,
    yieldVariance: 0.30,
    targetFish: ['awabi', 'uni', 'sazae', 'noko'],
    unlockLevel: 4,
    icon: '🤿',
  },
];

// ----------------------------------------
// 魚種定義（15種 + プレミアム3種）
// 価格は石川県実績データ準拠
// seasonality: 月別係数（1が基準、高いほど多い/高い）
// ----------------------------------------
export const FISH_SPECIES: FishSpecies[] = [
  // ---- 大量漁獲系 ----
  {
    id: 'ma-iwashi',
    name: 'マイワシ',
    basePrice: 385,
    seasonality: [0.7, 0.7, 0.8, 0.9, 1.1, 1.3, 1.4, 1.2, 1.1, 0.9, 0.8, 0.7],
    areas: ['nanao-bay', 'noto-uchi', 'noto-soto', 'shika'],
    methods: ['fixed-net', 'purse-seine'],
    rarity: 'common',
  },
  {
    id: 'ma-saba',
    name: 'マサバ',
    basePrice: 384,
    seasonality: [0.8, 0.8, 0.8, 0.9, 1.0, 1.2, 1.3, 1.1, 1.0, 1.2, 0.9, 0.8],
    areas: ['nanao-bay', 'noto-soto', 'shika', 'noto-uchi'],
    methods: ['purse-seine', 'fixed-net', 'gill-net'],
    rarity: 'common',
  },
  {
    id: 'ma-aji',
    name: 'マアジ',
    basePrice: 444,
    seasonality: [0.7, 0.7, 0.8, 0.9, 1.3, 1.4, 1.4, 1.1, 1.0, 0.9, 0.8, 0.7],
    areas: ['nanao-bay', 'kaga', 'noto-uchi', 'shika'],
    methods: ['fixed-net', 'purse-seine', 'gill-net'],
    rarity: 'common',
  },
  // ---- ブリ系 ----
  {
    id: 'buri',
    name: '寒ブリ',
    basePrice: 863,
    seasonality: [1.8, 1.2, 0.9, 0.7, 0.6, 0.5, 0.5, 0.6, 0.8, 1.0, 1.3, 1.9],
    areas: ['nanao-bay', 'noto-soto', 'noto-uchi'],
    methods: ['fixed-net', 'gill-net', 'line-fishing'],
    rarity: 'uncommon',
  },
  {
    id: 'fukuragi',
    name: 'フクラギ（ブリ若魚）',
    basePrice: 380,
    seasonality: [0.6, 0.6, 0.7, 0.8, 1.0, 1.0, 1.1, 1.3, 1.4, 1.3, 1.0, 0.7],
    areas: ['nanao-bay', 'noto-soto', 'shika', 'kaga'],
    methods: ['fixed-net', 'purse-seine', 'gill-net'],
    rarity: 'common',
  },
  // ---- イカ ----
  {
    id: 'surume-ika',
    name: 'スルメイカ',
    basePrice: 462,
    seasonality: [0.5, 0.5, 0.6, 0.8, 1.3, 1.5, 1.5, 1.2, 1.1, 0.8, 0.6, 0.5],
    areas: ['noto-uchi', 'noto-soto', 'shika', 'kaga'],
    methods: ['squid-fishing', 'line-fishing'],
    rarity: 'common',
  },
  // ---- 底物高級魚 ----
  {
    id: 'ama-ebi',
    name: 'アマエビ（甘エビ）',
    basePrice: 1525,
    seasonality: [0.9, 0.9, 1.0, 1.1, 1.3, 1.3, 1.0, 0.9, 1.2, 1.0, 0.9, 0.9],
    areas: ['kaga', 'noto-soto'],
    methods: ['bottom-trawl'],
    rarity: 'uncommon',
  },
  {
    id: 'aka-garei',
    name: 'アカガレイ',
    basePrice: 546,
    seasonality: [1.1, 1.3, 1.3, 1.2, 1.0, 0.7, 0.6, 0.6, 0.8, 0.9, 1.0, 1.0],
    areas: ['kaga', 'noto-soto'],
    methods: ['bottom-trawl', 'gill-net'],
    rarity: 'common',
  },
  {
    id: 'hatahata',
    name: 'ハタハタ',
    basePrice: 376,
    seasonality: [0.8, 0.8, 1.1, 1.2, 1.1, 0.7, 0.5, 0.5, 0.7, 0.9, 1.3, 1.3],
    areas: ['noto-uchi', 'noto-soto', 'shika'],
    methods: ['bottom-trawl', 'gill-net'],
    rarity: 'common',
  },
  {
    id: 'madara',
    name: 'マダラ',
    basePrice: 457,
    seasonality: [1.3, 1.3, 1.0, 0.8, 0.6, 0.5, 0.4, 0.4, 0.6, 0.8, 1.2, 1.3],
    areas: ['noto-soto', 'noto-uchi'],
    methods: ['bottom-trawl', 'gill-net', 'line-fishing'],
    rarity: 'common',
  },
  // ---- カニ ----
  {
    id: 'kano-kani',
    name: '加能ガニ（ズワイガニ雄）',
    basePrice: 4218,
    seasonality: [1.5, 1.3, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.2, 1.6],
    areas: ['noto-soto', 'kaga'],
    methods: ['bottom-trawl', 'line-fishing'],
    rarity: 'rare',
  },
  {
    id: 'koubako-gani',
    name: '香箱ガニ（ズワイガニ雌）',
    basePrice: 2028,
    seasonality: [1.2, 0.4, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.5, 2.0],
    areas: ['noto-soto', 'kaga'],
    methods: ['bottom-trawl'],
    rarity: 'rare',
  },
  // ---- プレミアム ----
  {
    id: 'nodoguro',
    name: 'のどぐろ（アカムツ）',
    basePrice: 6853,
    seasonality: [1.0, 0.9, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.1, 1.0, 0.9, 0.9],
    areas: ['noto-soto', 'kaga'],
    methods: ['line-fishing', 'bottom-trawl', 'gill-net'],
    rarity: 'rare',
  },
  {
    id: 'awabi',
    name: 'アワビ',
    basePrice: 8225,
    seasonality: [0.7, 0.7, 0.8, 0.9, 1.1, 1.3, 1.4, 1.3, 1.1, 0.9, 0.8, 0.7],
    areas: ['noto-soto', 'noto-uchi'],
    methods: ['diving'],
    rarity: 'rare',
  },
  {
    id: 'uni',
    name: 'ウニ',
    basePrice: 5816,
    seasonality: [0.6, 0.6, 0.7, 0.9, 1.2, 1.4, 1.5, 1.4, 1.1, 0.9, 0.7, 0.6],
    areas: ['noto-soto', 'noto-uchi'],
    methods: ['diving'],
    rarity: 'rare',
  },
  // ---- その他 ----
  {
    id: 'suzuki',
    name: 'スズキ',
    basePrice: 798,
    seasonality: [0.7, 0.7, 0.8, 1.0, 1.2, 1.3, 1.3, 1.2, 1.1, 0.9, 0.8, 0.7],
    areas: ['kaga', 'nanao-bay'],
    methods: ['gill-net', 'line-fishing'],
    rarity: 'uncommon',
  },
  {
    id: 'nigisu',
    name: 'ニギス',
    basePrice: 342,
    seasonality: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    areas: ['kaga', 'shika'],
    methods: ['bottom-trawl'],
    rarity: 'common',
  },
  {
    id: 'sawara',
    name: 'サワラ',
    basePrice: 809,
    seasonality: [0.7, 0.7, 0.8, 1.0, 1.3, 1.4, 1.2, 1.0, 1.0, 1.1, 0.9, 0.7],
    areas: ['nanao-bay', 'kaga', 'shika'],
    methods: ['fixed-net', 'gill-net'],
    rarity: 'uncommon',
  },
  {
    id: 'bai',
    name: 'バイ貝',
    basePrice: 953,
    seasonality: [1.0, 1.0, 1.1, 1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    areas: ['kaga', 'nanao-bay'],
    methods: ['gill-net', 'bottom-trawl'],
    rarity: 'common',
  },
];

// ----------------------------------------
// クルー応募者プール（毎月ランダムに2〜3名が応募）
// ----------------------------------------
export const CREW_MEMBERS: CrewMember[] = [
  // ── 初期クルー（高橋正一のみ最初から雇用済み） ──
  {
    id: 'veteran',
    name: '高橋 正一（65歳）',
    description: 'ベテラン漁師。海を知り尽くした安定感が持ち味。荒天でも動じない。',
    icon: '👨‍🦳',
    hireCost: 0,
    hired: true,
    upgradeLevel: 0,
    upgradeCosts: [200_000, 350_000, 500_000],
    baseYieldBonus: 0.05,
    baseStabilityBonus: 0.3,
    baseEventBonus: 0.10,
    yieldBonusPerLevel: 0.02,
  },
  // ── 応募者プール（20名） ──
  {
    id: 'young',
    name: '中島 海斗（24歳）',
    description: '元気いっぱいの若手。調子の良い時は誰よりも獲るが、ムラがある。',
    icon: '👦',
    hireCost: 300_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [250_000, 400_000, 600_000],
    baseYieldBonus: 0.15,
    baseStabilityBonus: -0.1,
    baseEventBonus: -0.05,
    yieldBonusPerLevel: 0.05,
  },
  {
    id: 'craftsman',
    name: '岡田 富夫（52歳）',
    description: '底曳網の職人。海底の地形を熟知しており、底曳網では圧倒的な腕前。',
    icon: '⚓',
    hireCost: 400_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [300_000, 450_000, 600_000],
    baseYieldBonus: 0.02,
    baseStabilityBonus: 0.1,
    baseEventBonus: 0.0,
    yieldBonusPerLevel: 0.03,
    specialMethod: 'bottom-trawl',
  },
  {
    id: 'ika-master',
    name: '松田 光雄（48歳）',
    description: 'イカ釣りの名人。集魚灯の扱いが神がかっていて、夜の漁は任せろの男。',
    icon: '🦑',
    hireCost: 350_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [280_000, 420_000, 580_000],
    baseYieldBonus: 0.05,
    baseStabilityBonus: 0.1,
    baseEventBonus: 0.05,
    yieldBonusPerLevel: 0.03,
    specialMethod: 'squid-fishing',
  },
  {
    id: 'savvy',
    name: '吉田 敏子（41歳）',
    description: '元水産市場職員。市場の動向を読む目が鋭く、高値売りの機会を逃さない。',
    icon: '📊',
    hireCost: 450_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [320_000, 480_000, 650_000],
    baseYieldBonus: -0.05,
    baseStabilityBonus: 0.2,
    baseEventBonus: 0.15,
    yieldBonusPerLevel: 0.03,
  },
  {
    id: 'ama',
    name: '磯山 ふみ（38歳）',
    description: '能登の海女。素潜り漁のスペシャリスト。アワビ・ウニの採取量は県内随一。',
    icon: '🤿',
    hireCost: 500_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [350_000, 500_000, 700_000],
    baseYieldBonus: 0.10,
    baseStabilityBonus: 0.0,
    baseEventBonus: 0.0,
    yieldBonusPerLevel: 0.05,
    specialMethod: 'diving',
    unlockLevel: 4,
  },
  {
    id: 'purse-pro',
    name: '新堂 龍司（33歳）',
    description: 'まき網専門の若手漁師。魚群の動きを読む直感が鋭く、大漁を呼び込む男。',
    icon: '🎣',
    hireCost: 380_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [300_000, 450_000, 620_000],
    baseYieldBonus: 0.08,
    baseStabilityBonus: -0.05,
    baseEventBonus: 0.05,
    yieldBonusPerLevel: 0.04,
    specialMethod: 'purse-seine',
  },
  {
    id: 'steady',
    name: '木村 春雄（58歳）',
    description: '穏やかで確実な漁師。水揚げのムラが少なく、毎月安定した結果を出す。',
    icon: '🧓',
    hireCost: 350_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [270_000, 400_000, 560_000],
    baseYieldBonus: 0.03,
    baseStabilityBonus: 0.4,
    baseEventBonus: 0.08,
    yieldBonusPerLevel: 0.02,
  },
  {
    id: 'gill-ace',
    name: '前田 彩（28歳）',
    description: '刺網漁の若手エース。網の設置位置の選定が巧みで、高品質な魚が獲れる。',
    icon: '🌊',
    hireCost: 250_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [220_000, 360_000, 520_000],
    baseYieldBonus: 0.06,
    baseStabilityBonus: 0.1,
    baseEventBonus: 0.0,
    yieldBonusPerLevel: 0.04,
    specialMethod: 'gill-net',
  },
  {
    id: 'line-pro',
    name: '宮下 啓二（47歳）',
    description: '一本釣りの達人。のどぐろやマダイなど高級魚を専門に狙う技術を持つ。',
    icon: '🎏',
    hireCost: 420_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [310_000, 460_000, 630_000],
    baseYieldBonus: 0.04,
    baseStabilityBonus: 0.15,
    baseEventBonus: 0.08,
    yieldBonusPerLevel: 0.03,
    specialMethod: 'line-fishing',
  },
  {
    id: 'old-master',
    name: '山下 大悟（62歳）',
    description: '40年以上のキャリアを持つ超ベテラン。どんな状況でも動じない精神的支柱。',
    icon: '⚓',
    hireCost: 480_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [350_000, 500_000, 680_000],
    baseYieldBonus: 0.04,
    baseStabilityBonus: 0.5,
    baseEventBonus: 0.12,
    yieldBonusPerLevel: 0.02,
    unlockLevel: 2,
  },
  {
    id: 'negotiator',
    name: '野口 沙織（36歳）',
    description: '元漁協職員。交渉力と人脈が武器でイベントを有利に解決する腕を持つ。',
    icon: '📋',
    hireCost: 400_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [300_000, 440_000, 600_000],
    baseYieldBonus: -0.02,
    baseStabilityBonus: 0.1,
    baseEventBonus: 0.20,
    yieldBonusPerLevel: 0.02,
    unlockLevel: 2,
  },
  {
    id: 'daredevil',
    name: '橋本 鉄也（44歳）',
    description: '大胆な判断で知られる漁師。水揚げは多いがリスクも高め。当たればでかい。',
    icon: '⚡',
    hireCost: 370_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [280_000, 420_000, 580_000],
    baseYieldBonus: 0.18,
    baseStabilityBonus: -0.25,
    baseEventBonus: -0.08,
    yieldBonusPerLevel: 0.06,
  },
  {
    id: 'market-queen',
    name: '津田 光子（55歳）',
    description: '市場の番頭として長年働いた経験者。売れるタイミングを見極めるプロ。',
    icon: '🏪',
    hireCost: 440_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [330_000, 480_000, 650_000],
    baseYieldBonus: -0.03,
    baseStabilityBonus: 0.25,
    baseEventBonus: 0.18,
    yieldBonusPerLevel: 0.02,
    unlockLevel: 3,
  },
  {
    id: 'net-expert',
    name: '小林 武（39歳）',
    description: '定置網の設置・回収を極めた職人。定置網漁の効率が格段に上がる。',
    icon: '🕸️',
    hireCost: 320_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [250_000, 390_000, 550_000],
    baseYieldBonus: 0.07,
    baseStabilityBonus: 0.2,
    baseEventBonus: 0.03,
    yieldBonusPerLevel: 0.03,
    specialMethod: 'fixed-net',
  },
  {
    id: 'rookie',
    name: '石川 直人（22歳）',
    description: '地元出身の新人漁師。経験は浅いが安い採用費と熱い向上心が魅力。',
    icon: '🐟',
    hireCost: 150_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [200_000, 350_000, 500_000],
    baseYieldBonus: 0.02,
    baseStabilityBonus: -0.05,
    baseEventBonus: -0.02,
    yieldBonusPerLevel: 0.06,
  },
  {
    id: 'trawl-vet',
    name: '永田 実（51歳）',
    description: '加賀海域の底曳網漁で20年。甘エビやカレイの取り方を熟知している。',
    icon: '🦐',
    hireCost: 430_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [320_000, 470_000, 640_000],
    baseYieldBonus: 0.06,
    baseStabilityBonus: 0.2,
    baseEventBonus: 0.05,
    yieldBonusPerLevel: 0.03,
    specialMethod: 'bottom-trawl',
    unlockLevel: 2,
  },
  {
    id: 'pr-master',
    name: '遠藤 雅子（43歳）',
    description: '漁業PR担当の経歴を持つ女性漁師。メディア対応が得意でトラブルを丸く収める。',
    icon: '📺',
    hireCost: 410_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [310_000, 460_000, 620_000],
    baseYieldBonus: 0.0,
    baseStabilityBonus: 0.15,
    baseEventBonus: 0.22,
    yieldBonusPerLevel: 0.02,
    unlockLevel: 3,
  },
  {
    id: 'safety-first',
    name: '近藤 浩二（49歳）',
    description: '安全管理のスペシャリスト。荒天・トラブル時の損失を最小限に抑える名人。',
    icon: '🛡️',
    hireCost: 390_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [290_000, 430_000, 590_000],
    baseYieldBonus: -0.01,
    baseStabilityBonus: 0.45,
    baseEventBonus: 0.15,
    yieldBonusPerLevel: 0.02,
    unlockLevel: 2,
  },
  {
    id: 'mid-allround',
    name: '牧野 達夫（37歳）',
    description: 'バランスの良い中堅漁師。特化型ではないが穴のない安定した働きが魅力。',
    icon: '⛵',
    hireCost: 280_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [240_000, 380_000, 540_000],
    baseYieldBonus: 0.06,
    baseStabilityBonus: 0.1,
    baseEventBonus: 0.06,
    yieldBonusPerLevel: 0.03,
  },
  {
    id: 'noto-native',
    name: '竹内 耕作（56歳）',
    description: '能登生まれの能登育ち。能登の海を知り尽くした地元の重鎮的存在。',
    icon: '🏔️',
    hireCost: 460_000,
    hired: false,
    upgradeLevel: 0,
    upgradeCosts: [340_000, 490_000, 660_000],
    baseYieldBonus: 0.08,
    baseStabilityBonus: 0.3,
    baseEventBonus: 0.10,
    yieldBonusPerLevel: 0.03,
    unlockLevel: 3,
  },
];

// ----------------------------------------
// アップグレード
// ----------------------------------------
// スキルツリー（10アイテム）
// ----------------------------------------
export const UPGRADES: Upgrade[] = [
  // ---- 情報系 Info ----
  {
    id: 'info-1',
    name: '魚群探知機基礎',
    description: '魚群探知機を導入。DECISIONフェーズで釣れる魚種が事前にわかるようになる。',
    cost: 400_000,
    effect: {},
    purchased: false,
    unlockLevel: 1,
    category: 'info',
  },
  {
    id: 'info-2',
    name: '海況情報システム',
    description: '高精度の海況データを取得。旬魚のハイライト＋天候確率を表示。',
    cost: 800_000,
    effect: {},
    purchased: false,
    unlockLevel: 2,
    category: 'info',
    requires: ['info-1'],
  },
  // ---- 効率化 Efficiency ----
  {
    id: 'eff-1',
    name: '港の整備',
    description: '出港・帰港の効率化で燃料費を15%削減。',
    cost: 500_000,
    effect: { fuelCostReduction: 0.15 },
    purchased: false,
    unlockLevel: 1,
    category: 'efficiency',
  },
  {
    id: 'eff-2',
    name: '船舶エンジン換装',
    description: '省燃費エンジンへの換装。燃料費をさらに30%削減（合計45%）。',
    cost: 1_500_000,
    effect: { fuelCostReduction: 0.30 },
    purchased: false,
    unlockLevel: 3,
    category: 'efficiency',
    requires: ['eff-1'],
  },
  // ---- 収益強化 Yield ----
  {
    id: 'yield-1',
    name: '冷蔵設備改善',
    description: '最新の冷蔵設備で鮮度を保持。価格ブレを30%軽減。',
    cost: 600_000,
    effect: { priceVarianceReduction: 0.30 },
    purchased: false,
    unlockLevel: 2,
    category: 'yield',
  },
  {
    id: 'yield-2',
    name: '石川ブランド認証',
    description: '石川ブランドを取得。高級魚（のどぐろ・アワビ等）の価格が20%UP。',
    cost: 1_800_000,
    effect: {
      reputationBonus: 15,
      fishPriceBonus: { fishIds: ['nodoguro', 'awabi', 'uni', 'kano-kani', 'koubako-gani', 'ma-dai'], mult: 1.20 },
    },
    purchased: false,
    unlockLevel: 4,
    category: 'yield',
    requires: ['yield-1'],
  },
  // ---- 市場 Market ----
  {
    id: 'market-1',
    name: '情報網構築',
    description: '漁協・市場との情報ネットワーク強化。水揚げ量が10%アップ。',
    cost: 400_000,
    effect: { yieldBonus: 0.1 },
    purchased: false,
    unlockLevel: 2,
    category: 'market',
  },
  {
    id: 'market-2',
    name: '市場人脈',
    description: '市場のバイヤーと太いパイプ。今月の相場トレンドを1つ表示する。',
    cost: 1_200_000,
    effect: {},
    purchased: false,
    unlockLevel: 3,
    category: 'market',
    requires: ['market-1'],
  },
  // ---- 素潜り Diving（Lv4解放）----
  {
    id: 'dive-1',
    name: '海女技術向上',
    description: '素潜り漁の技術改善。素潜りの水揚げが1.5倍になる。',
    cost: 600_000,
    effect: { methodYieldMultiplier: { methodId: 'diving', mult: 1.5 } },
    purchased: false,
    unlockLevel: 4,
    category: 'diving',
  },
  {
    id: 'dive-2',
    name: '禁漁区特別許可',
    description: '禁漁区の特別許可を取得。素潜り収量×2、アワビ・ウニ価格+30%。',
    cost: 1_600_000,
    effect: {
      methodYieldMultiplier: { methodId: 'diving', mult: 2.0 },
      fishPriceBonus: { fishIds: ['awabi', 'uni'], mult: 1.30 },
    },
    purchased: false,
    unlockLevel: 4,
    category: 'diving',
    requires: ['dive-1'],
  },
];

// ----------------------------------------
// ランダムイベントテンプレート（通常イベント + クイック決断）
// ----------------------------------------
export const EVENT_TEMPLATES: EventTemplate[] = [
  // ===== 通常イベント（ルーレットあり）=====
  {
    id: 'engine-trouble',
    title: '⚙️ エンジントラブル',
    description: '出港直後にエンジンに異常音が発生。整備士を呼ぶか、そのまま操業を続けるか。',
    options: [
      {
        label: '港に戻り修理する',
        description: '修理費はかかるが安全。今月の漁は短縮。',
        risk: 'low',
        effect: { moneyDelta: -80000, yieldMultiplier: 0.75 },
        failureEffect: { moneyDelta: -280000, yieldMultiplier: 0.5 },
      },
      {
        label: 'このまま続ける',
        description: '成功すれば問題なし。失敗すれば大損害。',
        risk: 'high',
        effect: { moneyDelta: 0, yieldMultiplier: 1.05 },
        failureEffect: { moneyDelta: -550000, yieldMultiplier: 0.2 },
      },
    ],
  },
  {
    id: 'fisherman-advice',
    title: '🧓 漁師からの提案',
    description: '「この海域、最近魚影が濃いぞ」とベテラン漁師が声をかけてきた。時間外操業を提案している。',
    options: [
      {
        label: '時間外操業する',
        description: '人件費増だが水揚げ増が期待できる。',
        risk: 'medium',
        effect: { moneyDelta: -80000, yieldMultiplier: 1.55 },
        failureEffect: { moneyDelta: -160000, yieldMultiplier: 0.85 },
      },
      {
        label: '断って通常操業',
        description: '余計なコストはかけない。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.9 },
      },
    ],
  },
  {
    id: 'market-rumor',
    title: '📢 市場の噂',
    description: '「来週、大手水産会社が石川産に高値をつけるらしい」という噂が入った。今すぐ売るか来週まで待つか。',
    options: [
      {
        label: '今すぐ売る',
        description: '確実に現金化できる。',
        risk: 'low',
        effect: { moneyDelta: 50000, yieldMultiplier: 1.0 },
        failureEffect: { moneyDelta: -20000, yieldMultiplier: 1.0 },
      },
      {
        label: '来週まで待つ',
        description: '成功すれば高値売り。失敗すれば鮮度低下で損。',
        risk: 'high',
        effect: { moneyDelta: 350000, yieldMultiplier: 1.0 },
        failureEffect: { moneyDelta: -100000, yieldMultiplier: 0.7 },
      },
    ],
  },
  {
    id: 'sudden-storm',
    title: '🌩️ 突発的な嵐',
    description: '予報にない嵐が接近中。今すぐ帰港するか、もう少し粘るか。',
    options: [
      {
        label: '即座に帰港する',
        description: '安全第一。今月の漁は短縮。',
        risk: 'low',
        effect: { yieldMultiplier: 0.62 },
        failureEffect: { moneyDelta: -50000, yieldMultiplier: 0.52 },
      },
      {
        label: '粘って漁を続ける',
        description: '嵐が来なければ高水揚げ。来れば危険。',
        risk: 'high',
        effect: { yieldMultiplier: 1.45 },
        failureEffect: { moneyDelta: -450000, yieldMultiplier: 0.2 },
      },
    ],
  },
  {
    id: 'rival-info',
    title: '🔍 ライバル「能登漁業」の情報',
    description: '「能登漁業が七尾湾に集中している。別の海域が手薄だ」という情報が入った。',
    options: [
      {
        label: '情報に乗って移動する',
        description: 'コストがかかるが漁場が広がる可能性。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.35 },
        failureEffect: { moneyDelta: -70000, yieldMultiplier: 0.82 },
      },
      {
        label: '現在の海域に留まる',
        description: '余計なリスクを取らない。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.88 },
      },
    ],
  },
  {
    id: 'equipment-malfunction',
    title: '🔧 漁具のトラブル',
    description: '網の一部が破損。応急処置で続けるか、修理のため帰港するか。',
    options: [
      {
        label: '応急処置で続行',
        description: '水揚げは減るが費用は最小限。',
        risk: 'medium',
        effect: { yieldMultiplier: 0.85 },
        failureEffect: { moneyDelta: -220000, yieldMultiplier: 0.38 },
      },
      {
        label: '帰港して修理',
        description: '修理費と漁の損失が発生。',
        risk: 'low',
        effect: { moneyDelta: -80000, yieldMultiplier: 0.65 },
        failureEffect: { moneyDelta: -220000, yieldMultiplier: 0.48 },
      },
    ],
  },
  {
    id: 'high-price-buyer',
    title: '💰 高値買取オファー',
    description: '金沢の老舗料亭「八百万」から「今すぐ500kg分を通常の1.5倍で買いたい」というオファーが来た。',
    options: [
      {
        label: '特別売りに応じる',
        description: '即座に高収益が確定するが、漁獲に集中できず量は落ちる。',
        risk: 'low',
        effect: { moneyDelta: 420000, yieldMultiplier: 0.85 },
        failureEffect: { moneyDelta: 80000, yieldMultiplier: 0.75 },
      },
      {
        label: '断って全力で漁を続ける',
        description: '量が増える可能性があるが、市場価格次第では損をすることも。',
        risk: 'high',
        effect: { yieldMultiplier: 1.45 },
        failureEffect: { moneyDelta: -80000, yieldMultiplier: 0.7 },
      },
    ],
  },
  {
    id: 'young-fisherman-growth',
    title: '🌱 若手漁師の成長',
    description: '若手が「自分に任せてください！」と意気込んでいる。責任ある仕事を任せるか様子見か。',
    options: [
      {
        label: '重要なポジションを任せる',
        description: 'うまくいけば水揚げ増。失敗すれば損失。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.38, reputationDelta: 5 },
        failureEffect: { moneyDelta: -100000, yieldMultiplier: 0.78, reputationDelta: -5 },
      },
      {
        label: 'サポート役に回す',
        description: '安定した状態を保つ。',
        risk: 'low',
        effect: { yieldMultiplier: 1.0, reputationDelta: 5 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  // ===== 新追加：通常イベント =====
  {
    id: 'typhoon-warning',
    title: '🌀 台風接近警報',
    description: '台風が能登半島方向に向かっているとの情報が入った。海上保安庁からも警戒警報が出ている。',
    options: [
      {
        label: '直ちに帰港する',
        description: '安全優先。漁は大幅短縮になる。',
        risk: 'low',
        effect: { yieldMultiplier: 0.45 },
        failureEffect: { moneyDelta: -30000, yieldMultiplier: 0.38 },
      },
      {
        label: '台風の隙間を狙い続ける',
        description: '腕があれば大漁。タイミングを外せば大損害。',
        risk: 'high',
        effect: { yieldMultiplier: 1.8 },
        failureEffect: { moneyDelta: -700000, yieldMultiplier: 0.05 },
      },
    ],
  },
  {
    id: 'media-coverage',
    title: '📺 テレビ取材が来た！',
    description: '地元テレビ局が「石川の漁業」特集を組んでいる。密着取材を受けるか断るか。',
    options: [
      {
        label: '取材を受ける',
        description: '放送されれば評判UP。でも気を遣って漁が乱れるかも。',
        risk: 'medium',
        effect: { reputationDelta: 15, yieldMultiplier: 1.1 },
        failureEffect: { reputationDelta: 5, yieldMultiplier: 0.8 },
      },
      {
        label: '断る',
        description: '普通通りに漁に集中。余計なプレッシャーなし。',
        risk: 'low',
        effect: { yieldMultiplier: 1.1 },
        failureEffect: { yieldMultiplier: 0.92 },
      },
    ],
  },
  {
    id: 'rival-company-trouble',
    title: '⚓ ライバル「能登漁業」がトラブル',
    description: '能登漁業の主力船がエンジン故障。彼らのバイヤーに売り込む絶好のチャンス！',
    options: [
      {
        label: 'バイヤーに積極的に売り込む',
        description: '成功すれば新取引先を獲得。',
        risk: 'medium',
        effect: { moneyDelta: 300000, reputationDelta: 8 },
        failureEffect: { moneyDelta: -80000, reputationDelta: -2 },
      },
      {
        label: '通常通り操業',
        description: '余計な動きはせず、手堅く漁をする。',
        risk: 'low',
        effect: { yieldMultiplier: 1.08 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'cooperative-fishing',
    title: '🤝 近隣漁船からの協力提案',
    description: '「一緒に魚群を追おう」と近くの漁船から提案が来た。燃料を分担して大物を狙う計画だ。',
    options: [
      {
        label: '協力する',
        description: '成功すれば倍の収穫。失敗すれば燃料費だけかかる。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.6, moneyDelta: -60000 },
        failureEffect: { moneyDelta: -120000, yieldMultiplier: 0.7 },
      },
      {
        label: '断って単独操業',
        description: '自分のペースで安全に。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.9 },
      },
    ],
  },
  {
    id: 'noto-elder-advice',
    title: '🧙 能登の長老から伝授',
    description: '能登半島に住む90歳の元漁師・田中翁が「今年は魚の回り方が違う」と秘密を教えてくれた。',
    options: [
      {
        label: '長老の教えを信じる',
        description: '独自のルートを試みる。当たれば大漁。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.55, reputationDelta: 3 },
        failureEffect: { moneyDelta: -50000, yieldMultiplier: 0.7 },
      },
      {
        label: '敬意を表しつつ自分の判断で',
        description: '安全なルートで確実に。',
        risk: 'low',
        effect: { yieldMultiplier: 1.08, reputationDelta: 2 },
        failureEffect: { yieldMultiplier: 0.92 },
      },
    ],
  },
  {
    id: 'fishing-contest',
    title: '🏆 石川県漁業コンテスト開催！',
    description: '漁業組合主催のコンテスト。「最高のノドグロを持ってこい」というルールだ。優勝すれば大きな注目を集める。',
    options: [
      {
        label: 'コンテストに参加する',
        description: '参加料は少しかかるが、優勝すれば評判大幅UP。',
        risk: 'medium',
        effect: { moneyDelta: -50000, reputationDelta: 20, yieldMultiplier: 1.2 },
        failureEffect: { moneyDelta: -80000, reputationDelta: 3, yieldMultiplier: 0.85 },
      },
      {
        label: '参加しない',
        description: '今月は実利に集中する。',
        risk: 'low',
        effect: { yieldMultiplier: 1.1 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'new-equipment-test',
    title: '🔬 新型漁具のモニター試験',
    description: '漁具メーカーから「新型超音波魚群探知機のモニター試験をしてほしい」と依頼が来た。謝礼あり。',
    options: [
      {
        label: '試験に参加する',
        description: '謝礼と引き換えに機器を使って漁をする。',
        risk: 'medium',
        effect: { moneyDelta: 150000, yieldMultiplier: 1.25 },
        failureEffect: { moneyDelta: 50000, yieldMultiplier: 0.8 },
      },
      {
        label: '断る',
        description: '実績ある機器を使い続ける。',
        risk: 'low',
        effect: { yieldMultiplier: 1.08 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'harbor-gossip',
    title: '🗣️ 港の情報屋',
    description: '「今週、特定の漁場に大群が来る」と港の情報屋が囁いた。信頼性は定かでないが代金は先払い…。',
    options: [
      {
        label: '情報を買って確認する',
        description: '情報料を払って場所を聞く。当たれば大漁。',
        risk: 'high',
        effect: { moneyDelta: -30000, yieldMultiplier: 1.7 },
        failureEffect: { moneyDelta: -80000, yieldMultiplier: 0.65 },
      },
      {
        label: '自分の勘で行く',
        description: '余計なコストはかけない。',
        risk: 'low',
        effect: { yieldMultiplier: 1.08 },
        failureEffect: { yieldMultiplier: 0.88 },
      },
    ],
  },
  {
    id: 'rival-stole-spot',
    title: '😤 能登漁業に漁場を取られた',
    description: '狙っていた漁場に能登漁業の船が先乗りしていた！別の漁場に移動するか、強引に並んで操業するか。',
    options: [
      {
        label: '別の漁場に移動する',
        description: '燃料費はかかるが新しい漁場を探す。',
        risk: 'medium',
        effect: { moneyDelta: -80000, yieldMultiplier: 1.2 },
        failureEffect: { moneyDelta: -150000, yieldMultiplier: 0.7 },
      },
      {
        label: '同じ海域で粘る',
        description: '魚は減るが移動コストなし。',
        risk: 'low',
        effect: { yieldMultiplier: 0.8 },
        failureEffect: { yieldMultiplier: 0.65 },
      },
    ],
  },
  {
    id: 'crew-accident',
    title: '🚑 クルーが軽傷を負った',
    description: '荒天の中、クルーの一人が軽傷を負った。病院に連れて行くか、応急処置で操業を続けるか。',
    options: [
      {
        label: '港に戻り病院へ',
        description: '安全第一。医療費と時間のロスが発生。',
        risk: 'low',
        effect: { moneyDelta: -120000, yieldMultiplier: 0.6, reputationDelta: 5 },
        failureEffect: { moneyDelta: -200000, yieldMultiplier: 0.5, reputationDelta: 3 },
      },
      {
        label: '応急処置で続行',
        description: '本人が「大丈夫だ」と言っている。',
        risk: 'high',
        effect: { yieldMultiplier: 0.95 },
        failureEffect: { moneyDelta: -500000, yieldMultiplier: 0.2, reputationDelta: -10 },
      },
    ],
  },
  {
    id: 'big-wave-opportunity',
    title: '🌊 荒波の中の大チャンス',
    description: '嵐の影響で他の船がみんな帰港した。漁場は独り占め！でも波は相当荒い…。',
    options: [
      {
        label: '独占チャンスを活かす',
        description: '荒天だが誰もいない漁場を独占。リスク大、リターン大。',
        risk: 'high',
        effect: { yieldMultiplier: 2.0 },
        failureEffect: { moneyDelta: -600000, yieldMultiplier: 0.1 },
      },
      {
        label: '他の船と同様に帰港',
        description: '安全を優先。今月は控えめな漁で終わる。',
        risk: 'low',
        effect: { yieldMultiplier: 0.55 },
        failureEffect: { moneyDelta: -20000, yieldMultiplier: 0.48 },
      },
    ],
  },
  {
    id: 'shark-net',
    title: '🦈 サメが網に絡まった！',
    description: 'サメが網に入り込んでいる。無理に外そうとすれば網が破れるかもしれない。どうする？',
    options: [
      {
        label: '慎重に網を操作して外す',
        description: 'じっくり作業すれば被害を最小限にできるが、時間がかかる。',
        risk: 'medium',
        effect: { yieldMultiplier: 0.85 },
        failureEffect: { moneyDelta: -250000, yieldMultiplier: 0.4 },
      },
      {
        label: '網を一部切って逃がす',
        description: '網の損傷は確実だが、安全に操業を続けられる。',
        risk: 'low',
        effect: { moneyDelta: -80000, yieldMultiplier: 0.9 },
        failureEffect: { moneyDelta: -150000, yieldMultiplier: 0.75 },
      },
    ],
  },
  {
    id: 'fog-navigation',
    title: '🌫️ 濃霧が発生！',
    description: '視界がほぼゼロの濃霧に突入した。レーダーを頼りに進むか、帰港するか。',
    options: [
      {
        label: 'レーダーを頼りに操業を継続',
        description: '腕とレーダー次第。うまくいけば通常の漁が続けられる。',
        risk: 'high',
        effect: { yieldMultiplier: 1.1 },
        failureEffect: { moneyDelta: -400000, yieldMultiplier: 0.2, reputationDelta: -5 },
      },
      {
        label: '安全を優先して帰港',
        description: 'その日の漁は諦めるが、船と人は無事。',
        risk: 'low',
        effect: { yieldMultiplier: 0.4 },
        failureEffect: { yieldMultiplier: 0.35 },
      },
    ],
  },
  {
    id: 'engine-trouble-2',
    title: '⚙️ エンジントラブル発生！',
    description: 'エンジンから異音がする。このまま続けるか、港に引き返して点検するか。',
    options: [
      {
        label: 'だましだまし続行する',
        description: '今日の漁はこなせるかもしれないが、大破すれば莫大な修理費に。',
        risk: 'high',
        effect: { yieldMultiplier: 1.0 },
        failureEffect: { moneyDelta: -700000, yieldMultiplier: 0.1, reputationDelta: -3 },
      },
      {
        label: '点検のため帰港する',
        description: '修理費は安く済むが今月の漁は短縮。',
        risk: 'low',
        effect: { moneyDelta: -100000, yieldMultiplier: 0.6 },
        failureEffect: { moneyDelta: -200000, yieldMultiplier: 0.5 },
      },
    ],
  },
  {
    id: 'buyer-offer',
    title: '💰 仲買人から特別オファー',
    description: '「今月の水揚げを全て私に回してくれれば特別単価で買い取る」と仲買人が提案。',
    options: [
      {
        label: 'オファーに乗る',
        description: '一発勝負。単価が跳ね上がることも、下がることもある。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.2, reputationDelta: 3 },
        failureEffect: { yieldMultiplier: 0.7, reputationDelta: -2 },
      },
      {
        label: '通常の市場に出荷',
        description: '安定した相場での売却。変動なし。',
        risk: 'low',
        effect: { yieldMultiplier: 1.0 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'veteran-advice',
    title: '🧓 ベテラン漁師からのアドバイス',
    description: '近くに碇泊していたベテラン漁師が「もっと北に行け、そこに大群がいる」と教えてくれた。',
    options: [
      {
        label: '礼を言って北へ向かう',
        description: '燃料を使うが、情報が当たれば大漁の予感。',
        risk: 'medium',
        effect: { moneyDelta: -50000, yieldMultiplier: 1.5 },
        failureEffect: { moneyDelta: -100000, yieldMultiplier: 0.8 },
      },
      {
        label: '礼だけ言って今の漁場を続ける',
        description: '移動リスクなし。現状維持。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'inspection',
    title: '🚢 漁業監視船が接近',
    description: '漁業監視船が検査のため接近してきた。書類は揃っているはずだが…。',
    options: [
      {
        label: '堂々と検査を受ける',
        description: '後ろめたいことはない。むしろ評判が上がるかも。',
        risk: 'low',
        effect: { reputationDelta: 5, yieldMultiplier: 0.9 },
        failureEffect: { moneyDelta: -100000, yieldMultiplier: 0.7, reputationDelta: -5 },
      },
      {
        label: '漁場を移動して回避',
        description: '検査を避けることはできるが、怪しまれるリスクがある。',
        risk: 'high',
        effect: { yieldMultiplier: 1.0 },
        failureEffect: { moneyDelta: -300000, reputationDelta: -15, yieldMultiplier: 0.5 },
      },
    ],
  },
  {
    id: 'net-repair',
    title: '🔱 網の破損を発見',
    description: '今朝の点検で網の一部に小さな亀裂を発見。応急処置か港でしっかり修理か。',
    options: [
      {
        label: '港に戻って完全修理',
        description: '確実だが今日の漁の時間が短くなる。修理費もかかる。',
        risk: 'low',
        effect: { moneyDelta: -150000, yieldMultiplier: 0.65 },
        failureEffect: { moneyDelta: -200000, yieldMultiplier: 0.55 },
      },
      {
        label: '海上で応急処置して続行',
        description: '時間は節約できるが、破損が拡大するリスクがある。',
        risk: 'medium',
        effect: { yieldMultiplier: 0.95 },
        failureEffect: { moneyDelta: -500000, yieldMultiplier: 0.3 },
      },
    ],
  },
  // ===== リスク中・高のみのイベント =====
  {
    id: 'storm-gamble',
    title: '⛈️ 嵐が来る前に一勝負',
    description: '気象レーダーに嵐の接近。数時間後には操業不能になる。今すぐ全力で稼ぐか、早期帰港か。',
    options: [
      {
        label: '嵐が来る前に全力で漁をする',
        description: '時間との勝負。成功すれば大漁だが、判断が遅れれば大惨事。',
        risk: 'high',
        effect: { yieldMultiplier: 1.8 },
        failureEffect: { moneyDelta: -800000, yieldMultiplier: 0.1, reputationDelta: -5 },
      },
      {
        label: '早めに切り上げて帰港する',
        description: '収穫は減るが確実に帰れる。ただし帰港中も荒れてくる。',
        risk: 'medium',
        effect: { yieldMultiplier: 0.6 },
        failureEffect: { moneyDelta: -300000, yieldMultiplier: 0.3 },
      },
    ],
  },
  {
    id: 'poaching-area',
    title: '🚫 禁漁区スレスレの大群',
    description: '禁漁区のすぐ外に大きな魚群がいる。少し踏み込めば大漁だが、発覚すれば罰則は重い。',
    options: [
      {
        label: '禁漁区ギリギリを攻める',
        description: '限界まで近づいて漁をする。発覚リスクあり。',
        risk: 'high',
        effect: { yieldMultiplier: 2.2 },
        failureEffect: { moneyDelta: -1000000, yieldMultiplier: 0.1, reputationDelta: -20 },
      },
      {
        label: '合法の範囲で最大限攻める',
        description: '禁漁区には入らないが、境界近くで頑張る。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.4 },
        failureEffect: { yieldMultiplier: 0.75 },
      },
    ],
  },
  {
    id: 'rival-challenge',
    title: '🏆 ライバル漁師との賭け',
    description: '「今月どちらが多く水揚げするか勝負しよう」とライバル漁師が挑発。受けて立つか？',
    options: [
      {
        label: '賭けを受けて全力でぶつかる',
        description: '勝てば多額の賞金と評判アップ。負ければ金も評判も失う。',
        risk: 'high',
        effect: { moneyDelta: 400000, yieldMultiplier: 1.3, reputationDelta: 10 },
        failureEffect: { moneyDelta: -400000, yieldMultiplier: 0.7, reputationDelta: -8 },
      },
      {
        label: '互いに切磋琢磨するだけにする',
        description: 'お金は賭けないが、張り合うことで士気が上がる。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.2, reputationDelta: 3 },
        failureEffect: { yieldMultiplier: 0.85 },
      },
    ],
  },
  {
    id: 'black-market',
    title: '🌑 謎の買い取り業者',
    description: '怪しい業者が「市場より3割高く買い取る」と申し出てきた。素性は不明…。',
    options: [
      {
        label: '怪しい業者に売る',
        description: '高値で売れる可能性。でも詐欺なら全損。評判も危うい。',
        risk: 'high',
        effect: { yieldMultiplier: 1.5, reputationDelta: -3 },
        failureEffect: { moneyDelta: -500000, reputationDelta: -15, yieldMultiplier: 0.5 },
      },
      {
        label: '話だけ聞いて通常市場へ',
        description: '安全だが機会損失。情報だけはもらっておく。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.05, reputationDelta: 1 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  // ===== クイック航海決断（ルーレットなし・即時効果）=====
  {
    id: 'quick-school-spotted',
    title: '🐟 大きな魚群を発見！',
    description: '魚群探知機に大きな反応！追いかけますか？燃料を余分に使いますが、大量漁獲のチャンスです。',
    isQuick: true,
    options: [
      {
        label: '全速力で追いかける',
        description: '大量水揚げを狙うが、外すと燃料だけが消える。',
        risk: 'medium',
        effect: { moneyDelta: -10000, yieldMultiplier: 1.45 },
        failureEffect: { moneyDelta: -60000, yieldMultiplier: 0.85 },
      },
      {
        label: '様子を見る',
        description: '確実なペースを保つ。安定の選択。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'quick-tide-change',
    title: '🌊 絶好の潮目が出現！',
    description: '絶好の潮目が出現。漁場内を移動すれば旬の魚が集まりやすくなる。しかし読み間違えると逆効果に。',
    isQuick: true,
    options: [
      {
        label: '潮目を思い切って追う',
        description: '好条件を活かすが、外れるリスクもある。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.35 },
        failureEffect: { yieldMultiplier: 0.80 },
      },
      {
        label: '現位置を維持',
        description: '移動コストゼロ。安定を優先。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.92 },
      },
    ],
  },
  {
    id: 'quick-bait-upgrade',
    title: '🦐 高品質な餌を使う？',
    description: 'クルーが「高級餌を使えば高単価魚が集まりやすい」と提案。コストはかかるが…。',
    isQuick: true,
    options: [
      {
        label: '高級餌に切り替える',
        description: '高い餌で高級魚を引き寄せる作戦。うまくいけば大漁。',
        risk: 'medium',
        effect: { moneyDelta: -80000, yieldMultiplier: 1.30 },
        failureEffect: { moneyDelta: -80000, yieldMultiplier: 0.90 },
      },
      {
        label: 'そのままで行く',
        description: '普通の餌で通常操業。確実だが派手さはない。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'quick-extra-hour',
    title: '⏰ もう少し粘る？',
    description: '漁の調子が良い。日没まで粘れば追加水揚げが見込める。しかし海況が急変する恐れも。',
    isQuick: true,
    options: [
      {
        label: '粘って追加漁獲を狙う',
        description: '延長操業で追加収穫。ただし海況次第で裏目に。',
        risk: 'medium',
        effect: { moneyDelta: -50000, yieldMultiplier: 1.30 },
        failureEffect: { moneyDelta: -120000, yieldMultiplier: 0.75 },
      },
      {
        label: '今日の漁はここまで',
        description: '無理せず確実に帰港。損失も最小限。',
        risk: 'low',
        effect: { yieldMultiplier: 1.02 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'quick-whale-spotted',
    title: '🐋 クジラを発見！',
    description: 'クジラが付近を泳いでいる！後を追えば魚群に出会える可能性が高いが、接近は危険も伴う。',
    isQuick: true,
    options: [
      {
        label: 'クジラを大胆に追いかける',
        description: '大漁のチャンスだが、クジラの動き次第では危険が伴う。',
        risk: 'high',
        effect: { yieldMultiplier: 1.70 },
        failureEffect: { moneyDelta: -200000, yieldMultiplier: 0.50 },
      },
      {
        label: '安全を優先して距離を置く',
        description: 'クジラとの衝突リスクを避ける。確実な選択。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'quick-favorable-current',
    title: '🌀 有利な海流に突入！',
    description: '漁場が有利な海流に入った！今すぐ網を追加投入するか。ただし海流の読み違いは大きな損失に。',
    isQuick: true,
    options: [
      {
        label: '全力で網を追加投入',
        description: '海流の恩恵を最大化。成功すれば大漁、失敗すれば網が絡まる。',
        risk: 'medium',
        effect: { yieldMultiplier: 1.40 },
        failureEffect: { moneyDelta: -100000, yieldMultiplier: 0.70 },
      },
      {
        label: '通常の操業を続ける',
        description: 'リスクを取らず現状維持。確実に今日の漁を終える。',
        risk: 'low',
        effect: { yieldMultiplier: 1.05 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
  {
    id: 'quick-crew-boost',
    title: '💪 クルーが気合い十分！',
    description: 'クルーの士気が最高潮！「もっとやれる！」と声が上がる。増員を投入するか？',
    isQuick: true,
    options: [
      {
        label: '全員で総力戦に挑む',
        description: '士気を活かして全力操業。うまくいけば大漁だが、疲労で崩れるリスクも。',
        risk: 'medium',
        effect: { moneyDelta: -30000, yieldMultiplier: 1.35 },
        failureEffect: { moneyDelta: -30000, yieldMultiplier: 0.80 },
      },
      {
        label: '無理をさせず普通のペースで',
        description: 'クルーの体力を温存。安定した漁を続ける。',
        risk: 'low',
        effect: { yieldMultiplier: 1.08 },
        failureEffect: { yieldMultiplier: 0.95 },
      },
    ],
  },
];

// ----------------------------------------
// 月別規制（実際の解禁・禁漁期間を参考）
// ----------------------------------------
export const REGULATIONS: Regulation[] = [
  // 香箱ガニ（ズワイガニ雌）は11-12月のみ解禁（1月から禁漁）
  { month: 1, restrictedMethods: [], reason: '香箱ガニ漁期終了（1月以降禁漁）' },
  { month: 2, restrictedMethods: [], reason: '' },
  { month: 3, restrictedMethods: [], reason: '' },
  // 春のカニ禁漁（3月〜10月）- ゲームでは簡略化済み（seasonalityで0設定）
  { month: 4, restrictedMethods: [], reason: '' },
  { month: 5, restrictedMethods: [], reason: '' },
  { month: 6, restrictedAreas: ['noto-soto'], reason: '能登外浦：一部海域保護区設定期間' },
  { month: 7, restrictedMethods: [], reason: '' },
  { month: 8, restrictedMethods: [], reason: '' },
  { month: 9, restrictedMethods: ['bottom-trawl'], reason: '底曳網：資源保護のための休漁期間（9月）' },
  { month: 10, restrictedMethods: [], reason: '' },
  // 加能ガニ解禁（11月6日〜3月20日）
  { month: 11, restrictedMethods: [], reason: '加能ガニ・香箱ガニ解禁（11月6日〜）' },
  { month: 12, restrictedMethods: [], reason: '寒ブリシーズン最盛期' },
];

// ----------------------------------------
// ニューステンプレート
// ----------------------------------------
export const NEWS_TEMPLATES: Array<{
  month: number;
  items: NewsItem[];
}> = [
  {
    month: 1, items: [
      { id: 'n1-1', title: '年明けの寒ブリ相場', body: '石川産ブリの卸値が高騰している。鮮度の高い状態での水揚げが価格を左右しそうだ。', category: 'market', hint: 'ブリの旬は今がピーク' },
      { id: 'n1-2', title: '1月の海況', body: '日本海は冬型気圧配置が続き、荒天に注意が必要。能登外浦への出港は気象確認を怠りなく。', category: 'weather' },
      { id: 'n1-3', title: '香箱ガニ漁終了間近', body: '香箱ガニ（ズワイガニ雌）の漁期は1月末まで。残りわずかな時期にどう動くか注目される。', category: 'regulation' },
    ],
  },
  {
    month: 2, items: [
      { id: 'n2-1', title: '冬の底曳網漁が好調', body: 'カレイ・マダラなど底物の水揚げが各港で増加傾向。加賀・金沢市場に活気が戻っている。', category: 'market', hint: '底曳網×加賀海域が狙い目' },
      { id: 'n2-2', title: '2月の海況', body: '厳冬期が続く。七尾湾は比較的穏やかで操業しやすい日が多い見込み。', category: 'weather' },
    ],
  },
  {
    month: 3, items: [
      { id: 'n3-1', title: 'ハタハタが能登内浦で増加', body: '能登内浦でハタハタの魚影が濃くなっている。底曳網との相性が良く、量を狙えそうだ。', category: 'area', hint: '底曳網×能登内浦や志賀海域が◎' },
      { id: 'n3-2', title: '春漁スタート', body: '春の漁期に入り、各地で漁獲量が回復傾向。アカガレイも好調で市場価格が安定している。', category: 'market' },
    ],
  },
  {
    month: 4, items: [
      { id: 'n4-1', title: 'アマエビ漁が本格化', body: '春から初夏にかけて甘エビの漁獲量が増加する。底曳網での操業が中心となる。', category: 'area', hint: '甘エビは底曳網でのみ漁獲可能' },
      { id: 'n4-2', title: '4月の海況', body: '穏やかな日が増えてくる。能登外浦への出港も比較的安定してきた。', category: 'weather' },
    ],
  },
  {
    month: 5, items: [
      { id: 'n5-1', title: 'イカ釣りシーズン開幕', body: 'スルメイカが能登内浦に回遊し始めた。イカ釣り漁の最盛期は夏に向かって続く。', category: 'area', hint: 'イカ釣×能登内浦が最盛期へ' },
      { id: 'n5-2', title: 'マアジ・マイワシが豊漁', body: '定置網・まき網で回遊魚の水揚げが増加。量を取るなら今がチャンス。', category: 'market' },
    ],
  },
  {
    month: 6, items: [
      { id: 'n6-1', title: '能登外浦の保護区情報', body: '6月から能登外浦の一部海域で保護区設定期間に入る。操業計画の見直しが必要な漁業者も。', category: 'regulation', hint: '6月は能登外浦が規制対象' },
      { id: 'n6-2', title: '夏場のスルメイカが最盛期', body: '能登内浦でスルメイカの漁獲が増加。夜間操業のイカ釣り船が活発に動いている。', category: 'market' },
    ],
  },
  {
    month: 7, items: [
      { id: 'n7-1', title: 'のどぐろ高値安定', body: '夏ののどぐろは脂が乗っており、高値圏で推移。釣りや延縄で上質なものが求められている。', category: 'market', hint: 'のどぐろは釣りで高品質が取れる' },
      { id: 'n7-2', title: '夏の漁海況', body: '海水温が上昇。浅い海域を好む魚種が活発に動く。七尾湾も豊漁傾向。', category: 'weather' },
    ],
  },
  {
    month: 8, items: [
      { id: 'n8-1', title: 'アワビ・ウニが旬', body: '素潜りで収穫されるアワビとウニが最高品質の季節。量は少ないが単価が抜群に高い。', category: 'market', hint: '素潜り漁が最も稼げる季節' },
      { id: 'n8-2', title: '台風シーズン開始', body: '8月から台風の影響が出始める。気象情報の確認を徹底すること。', category: 'weather' },
    ],
  },
  {
    month: 9, items: [
      { id: 'n9-1', title: '底曳網休漁期間', body: '資源保護のため、9月は底曳網漁が禁止されている。他の漁法への切り替えを。', category: 'regulation', hint: '9月は底曳網が使えない' },
      { id: 'n9-2', title: 'ブリ若魚の回遊開始', body: 'フクラギ（ブリの若魚）が沿岸に回遊し始めた。定置網での漁獲が増加している。', category: 'area' },
    ],
  },
  {
    month: 10, items: [
      { id: 'n10-1', title: '秋のブリシーズンへ', body: 'ブリの回遊量が増加。まき網や定置網で大量水揚げのチャンスが近づいている。', category: 'market', hint: 'ブリは12月に向けて価格が上昇' },
      { id: 'n10-2', title: 'マサバが好調', body: '秋サバは脂が乗っており、10月が旬の最盛期。七尾湾・志賀海域で水揚げ増。', category: 'area' },
    ],
  },
  {
    month: 11, items: [
      { id: 'n11-1', title: '加能ガニ解禁！', body: '石川が誇るズワイガニ（加能ガニ）の漁が11月6日に解禁。高値での取引が予想される。', category: 'regulation', hint: '加能ガニは今月から！底曳網で' },
      { id: 'n11-2', title: '香箱ガニも同時解禁', body: 'ズワイガニの雌「香箱ガニ」も解禁。12月末で禁漁になるため短期集中型の漁が続く。', category: 'market' },
    ],
  },
  {
    month: 12, items: [
      { id: 'n12-1', title: '寒ブリが最盛期', body: '12月は寒ブリの最盛期。日本海の荒波を越えた天然寒ブリは高値必至。能登外浦が注目。', category: 'market', hint: '寒ブリは12月・1月が最高値' },
      { id: 'n12-2', title: '香箱ガニは12月末まで', body: '香箱ガニの漁期は12月末まで。残りわずかな期間に最後の追い込みをかける漁船が多い。', category: 'regulation' },
      { id: 'n12-3', title: '年末の市場活況', body: '年末商戦で海産物全般の需要が増加。質の高い魚介類は例年より高値になる傾向。', category: 'market' },
    ],
  },
];

// ----------------------------------------
// ゲーム定数（激ムズ固定パラメータ）
// ----------------------------------------
export const GAME_CONFIG = {
  RUNNING_DURATION: 20,            // 月内進行時間（秒）
  MAX_EVENTS_PER_MONTH: 3,         // 月最大イベント数
  LEVEL_THRESHOLDS: [0, 2000000, 5000000, 10000000, 20000000], // レベル別累積利益
  // --- 激ムズ固定パラメータ ---
  initialMoney: 1_500_000,         // 初期資金150万
  fixedCostPerMonth: 420_000,      // 月次固定費（42万）
  fuelCostPerUnit: 180_000,        // 燃料基本費（激増）
  interestRate: 0.15,              // 月利15%（借金地獄）
  priceVariance: 0.50,             // 価格ブレ±50%（博打）
  maxDebt: 500_000,                // 借金上限50万
  debtRepayTurns: 1,               // 返済猶予1ターン
  weatherSunny: 0.45,              // 晴れ確率45%
  weatherCloudy: 0.35,             // 曇り確率35%（残り20%が嵐）
  baseYieldMultiplier: 0.35,       // 水揚げ量-65%
  scoreMultiplier: 5.0,            // スコア倍率
  restIncome: 0,                   // 休業しても収入ゼロ
};

// ----------------------------------------
// 月間チャレンジテンプレート（Lv3以上で毎月発生）
// ----------------------------------------
export const CHALLENGE_TEMPLATES: (Omit<ActiveChallenge, 'completed'>& { minLevel: number })[] = [
  { id: 'big-haul',        title: '🏆 大漁月間',    description: '今月 ¥500,000 以上の純利益を達成する',    rewardMoney: 250_000, rewardRep: 5,  minLevel: 3 },
  { id: 'storm-hero',      title: '⚡ 嵐の勇者',    description: '荒天の月でも黒字を達成する',              rewardMoney: 350_000, rewardRep: 8,  minLevel: 3 },
  { id: 'event-ace',       title: '🎯 イベント達人', description: '全てのランダムイベントを解決する',        rewardMoney: 180_000, rewardRep: 6,  minLevel: 3 },
  { id: 'million-revenue', title: '💰 百万水揚げ',  description: '水揚げ売上 ¥1,000,000 超を達成する',     rewardMoney: 300_000, rewardRep: 8,  minLevel: 4 },
  { id: 'rare-catch',      title: '🐡 希少魚ゲット',description: 'のどぐろ か アワビ を水揚げする',         rewardMoney: 200_000, rewardRep: 10, minLevel: 4 },
  { id: 'mega-profit',     title: '👑 百万超利益',  description: '¥1,000,000 以上の純利益を達成する',      rewardMoney: 600_000, rewardRep: 15, minLevel: 5 },
];

// ----------------------------------------
// 航海カードデッキ（20枚）
// 毎月3枚ドロー → 今月の条件が変わる
// ----------------------------------------
export const VOYAGE_CARDS: VoyageCard[] = [
  // ===== 天候カード（5枚）=====
  {
    id: 'golden-day', title: '漁師日和', type: 'weather', rarity: 'common', icon: '☀️',
    description: '天候が快晴に確定\n全漁法の収量＋15%',
    effect: { weatherOverride: 'sunny', allYieldMultiplier: 1.15 },
  },
  {
    id: 'storm-front', title: '嵐の前触れ', type: 'weather', rarity: 'uncommon', icon: '🌩️',
    description: '荒天確定。定置網の収量＋30%\nその他の漁法は収量－20%',
    effect: { weatherOverride: 'stormy', specificMethodMultipliers: { 'fixed-net': 1.3, 'bottom-trawl': 0.8, 'gill-net': 0.8, 'purse-seine': 0.8, 'squid-fishing': 0.8, 'line-fishing': 0.8, 'diving': 0.5 } },
  },
  {
    id: 'morning-mist', title: '霧の朝', type: 'weather', rarity: 'uncommon', icon: '🌫️',
    description: 'くもり確定。イカ釣りの収量×1.8\nその他の漁法は収量－10%',
    effect: { weatherOverride: 'cloudy', specificMethodMultipliers: { 'squid-fishing': 1.8, 'fixed-net': 0.9, 'bottom-trawl': 0.9, 'gill-net': 0.9, 'purse-seine': 0.9, 'line-fishing': 0.9 } },
  },
  {
    id: 'calm-voyage', title: '春の凪', type: 'weather', rarity: 'common', icon: '⛵',
    description: '穏やかな航海\n燃料費－40%',
    effect: { fuelCostMultiplier: 0.6 },
  },
  {
    id: 'north-wind', title: '北風一番', type: 'weather', rarity: 'common', icon: '💨',
    description: 'ブリ・フクラギの価格×2.0\n（荒天リスクは通常通り）',
    effect: { specificFishPriceMultipliers: { 'buri': 2.0, 'fukuragi': 2.0 } },
  },
  // ===== 市場カード（6枚）=====
  {
    id: 'luxury-demand', title: '高級品需要', type: 'market', rarity: 'rare', icon: '💎',
    description: 'レア魚の価格×2.5\n（のどぐろ・アワビ・カニ類）',
    effect: { rarePriceMultiplier: 2.5 },
  },
  {
    id: 'tourism-season', title: '観光シーズン', type: 'market', rarity: 'common', icon: '🏖️',
    description: '全魚種の価格＋35%',
    effect: { allPriceMultiplier: 1.35 },
  },
  {
    id: 'bumper-haul', title: '豊漁祭り', type: 'market', rarity: 'uncommon', icon: '🎪',
    description: '全収量×1.25\nただし全魚価格×0.65（供給過多）',
    effect: { allYieldMultiplier: 1.25, allPriceMultiplier: 0.65 },
  },
  {
    id: 'export-boom', title: '輸出需要急騰', type: 'market', rarity: 'rare', icon: '✈️',
    description: 'のどぐろ・アワビ・加能ガニの価格×3.5',
    effect: { specificFishPriceMultipliers: { 'nodoguro': 3.5, 'awabi': 3.5, 'kano-kani': 3.5 } },
  },
  {
    id: 'local-fish-boom', title: '地魚ブーム', type: 'market', rarity: 'uncommon', icon: '📺',
    description: 'マイワシ・マアジ・マサバの価格×2.2',
    effect: { specificFishPriceMultipliers: { 'ma-iwashi': 2.2, 'ma-aji': 2.2, 'ma-saba': 2.2 } },
  },
  {
    id: 'market-crash', title: '相場暴落', type: 'market', rarity: 'uncommon', icon: '📉',
    description: '全魚価格×0.5\nただし即時ボーナス＋¥200,000',
    effect: { allPriceMultiplier: 0.5, fixedMoneyBonus: 200_000 },
  },
  // ===== 特殊カード（6枚）=====
  {
    id: 'great-migration', title: '大回遊', type: 'special', rarity: 'rare', icon: '🐟',
    description: '旬の魚（旬係数1.2以上）の収量×2.0',
    effect: { seasonalFishMultiplier: 2.0 },
  },
  {
    id: 'lucky-tide', title: '幸運の潮', type: 'special', rarity: 'common', icon: '🌊',
    description: 'イベント成功確率＋40%\n全収量＋10%',
    effect: { eventSuccessBonus: 0.4, allYieldMultiplier: 1.1 },
  },
  {
    id: 'cost-cut', title: '経費削減月間', type: 'special', rarity: 'common', icon: '✂️',
    description: '固定費－50%\nただし収量×0.8',
    effect: { fixedCostMultiplier: 0.5, allYieldMultiplier: 0.8 },
  },
  {
    id: 'deep-sea-knowledge', title: '深海の知識', type: 'special', rarity: 'uncommon', icon: '🤿',
    description: '底曳網・素潜りの収量×1.8',
    effect: { specificMethodMultipliers: { 'bottom-trawl': 1.8, 'diving': 1.8 } },
  },
  {
    id: 'bay-master', title: '湾内の達人', type: 'special', rarity: 'uncommon', icon: '⚓',
    description: '七尾湾・加賀海域での収量×1.6',
    effect: { specificAreaMultipliers: { 'nanao-bay': 1.6, 'kaga': 1.6 } },
  },
  {
    id: 'open-sea-master', title: '外洋の猛者', type: 'special', rarity: 'uncommon', icon: '🌊',
    description: '能登外浦・志賀海域での収量×1.7',
    effect: { specificAreaMultipliers: { 'noto-soto': 1.7, 'shika': 1.7 } },
  },
  // ===== リスク・リワードカード（3枚）=====
  {
    id: 'big-gamble', title: '大博打', type: 'risk', rarity: 'rare', icon: '🎰',
    description: '月利益¥50万超→ボーナス＋¥40万\n赤字→追加ペナルティ－¥30万',
    effect: { gamblerEffect: { profitThreshold: 500_000, bonus: 400_000, penalty: -300_000 } },
  },
  {
    id: 'storm-fortune', title: '嵐こそチャンス', type: 'risk', rarity: 'rare', icon: '⚡',
    description: '荒天なら収量×2.5\n晴れ・くもりなら収量×0.65',
    effect: { stormBonusEffect: { stormYieldMultiplier: 2.5, calmYieldPenalty: 0.65 } },
  },
  {
    id: 'destiny-haul', title: '運命の一網', type: 'risk', rarity: 'uncommon', icon: '🎲',
    description: '50%で収量×2.5（大漁！）\n50%で収量×0.3（大外れ…）',
    effect: { fatefulEffect: { luckyMultiplier: 2.5, unluckyMultiplier: 0.3 } },
  },
  // ===== 新追加カード（8枚）=====
  {
    id: 'spring-blessing', title: '春の恵み', type: 'weather', rarity: 'uncommon', icon: '🌸',
    description: '穏やかな春の潮流\nアマエビ・カレイの価格×1.8',
    effect: { specificFishPriceMultipliers: { 'ama-ebi': 1.8, 'aka-garei': 1.8 } },
  },
  {
    id: 'moonlight-fishing', title: '満月の夜漁', type: 'special', rarity: 'rare', icon: '🌕',
    description: 'イカ釣りの収量×3.0\nその他漁法は収量×0.7',
    effect: { specificMethodMultipliers: { 'squid-fishing': 3.0, 'fixed-net': 0.7, 'bottom-trawl': 0.7, 'gill-net': 0.7, 'purse-seine': 0.7, 'line-fishing': 0.7 } },
  },
  {
    id: 'noto-heritage', title: '能登の誇り', type: 'special', rarity: 'uncommon', icon: '🏔️',
    description: '能登内浦・能登外浦での収量×2.0',
    effect: { specificAreaMultipliers: { 'noto-uchi': 2.0, 'noto-soto': 2.0 } },
  },
  {
    id: 'kani-season', title: 'カニ解禁ラッシュ', type: 'market', rarity: 'rare', icon: '🦀',
    description: '加能ガニ・香箱ガニの価格×4.0',
    effect: { specificFishPriceMultipliers: { 'kano-kani': 4.0, 'koubako-gani': 4.0 } },
  },
  {
    id: 'fuel-subsidy', title: '燃料費補助金', type: 'market', rarity: 'common', icon: '⛽',
    description: '燃料費－70%\n固定費+20%（手続きコスト）',
    effect: { fuelCostMultiplier: 0.3, fixedCostMultiplier: 1.2 },
  },
  {
    id: 'fishing-lore', title: '漁師の知恵', type: 'special', rarity: 'common', icon: '📚',
    description: '全収量×1.2\nイベント成功率+25%',
    effect: { allYieldMultiplier: 1.2, eventSuccessBonus: 0.25 },
  },
  {
    id: 'winter-gale', title: '冬の大時化', type: 'weather', rarity: 'rare', icon: '❄️',
    description: '荒天確定\n底曳網の収量×1.8・カニ類価格×2.0',
    effect: { weatherOverride: 'stormy', specificMethodMultipliers: { 'bottom-trawl': 1.8 }, specificFishPriceMultipliers: { 'kano-kani': 2.0, 'koubako-gani': 2.0 } },
  },
  {
    id: 'veteran-knowledge', title: 'ベテランの眼力', type: 'special', rarity: 'uncommon', icon: '👁️',
    description: 'イカ・カニを除く全魚種の価格×1.4\n全収量×1.1',
    effect: { allYieldMultiplier: 1.1, allPriceMultiplier: 1.4 },
  },
];
