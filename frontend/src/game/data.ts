// ========================================
// ゲームデータ（実データ準拠）
// 水揚げ: 石川県漁業統計 2005-2025
// 卸値: 石川県水産物卸値データ
// ========================================

import type { FishingArea, FishingMethod, FishSpecies, Fisherman, Upgrade, EventTemplate, Regulation, NewsItem } from './types';

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
    baseYield: 12000,
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
    baseYield: 30000,
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
    baseYield: 7000,
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
    baseYield: 2000,
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
// NPC漁師（5名）
// ----------------------------------------
export const FISHERMEN: Fisherman[] = [
  {
    id: 'veteran',
    name: '高橋 正一（65歳）',
    description: 'ベテラン漁師。海を知り尽くした安定感が持ち味。荒天でも動じない。',
    yieldBonus: 1.05,
    stabilityBonus: 0.3,
    eventBonus: 0.1,
  },
  {
    id: 'young',
    name: '中島 海斗（24歳）',
    description: '元気いっぱいの若手。調子の良い時は誰よりも獲るが、ムラがある。',
    yieldBonus: 1.15,
    stabilityBonus: -0.1,
    eventBonus: -0.05,
  },
  {
    id: 'craftsman',
    name: '岡田 富夫（52歳）',
    description: '底曳網の職人。海底の地形を熟知しており、底曳網では圧倒的な腕前。',
    yieldBonus: 1.02,
    stabilityBonus: 0.1,
    specialMethod: 'bottom-trawl',
    eventBonus: 0.0,
  },
  {
    id: 'ika-master',
    name: '松田 光雄（48歳）',
    description: 'イカ釣りの名人。集魚灯の扱いが神がかっていて、夜の漁は任せろの男。',
    yieldBonus: 1.05,
    stabilityBonus: 0.1,
    specialMethod: 'squid-fishing',
    eventBonus: 0.05,
  },
  {
    id: 'savvy',
    name: '吉田 敏子（41歳）',
    description: '元水産市場職員。市場の動向を読む目が鋭く、高値売りの機会を逃さない。',
    yieldBonus: 0.95,
    stabilityBonus: 0.2,
    eventBonus: 0.15,
  },
];

// ----------------------------------------
// アップグレード
// ----------------------------------------
export const UPGRADES: Upgrade[] = [
  {
    id: 'cold-storage',
    name: '冷蔵設備改善',
    description: '最新の冷蔵設備で鮮度を保持。価格ブレを軽減する。',
    cost: 500000,
    effect: { priceVarianceReduction: 0.3 },
    purchased: false,
    unlockLevel: 2,
  },
  {
    id: 'port-maintenance',
    name: '港の整備',
    description: '出港・帰港の効率化で燃料費を削減。',
    cost: 400000,
    effect: { fuelCostReduction: 0.15 },
    purchased: false,
    unlockLevel: 2,
  },
  {
    id: 'info-network',
    name: '情報網構築',
    description: '漁協や市場との情報ネットワークを強化。ニュースの精度が上がる。',
    cost: 300000,
    effect: { newsPrecision: 0.4 },
    purchased: false,
    unlockLevel: 3,
  },
  {
    id: 'new-engine',
    name: '船舶エンジン換装',
    description: '省燃費エンジンへの換装。燃料費をさらに削減。',
    cost: 800000,
    effect: { fuelCostReduction: 0.25 },
    purchased: false,
    unlockLevel: 3,
  },
  {
    id: 'brand-certification',
    name: '石川ブランド認証',
    description: '石川ブランドの認証を取得。評判上昇と単価アップ。',
    cost: 600000,
    effect: { yieldBonus: 0.0, reputationBonus: 15 },
    purchased: false,
    unlockLevel: 4,
  },
];

// ----------------------------------------
// ランダムイベントテンプレート
// ----------------------------------------
export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'engine-trouble',
    title: '⚙️ エンジントラブル',
    description: '出港直後にエンジンに異常音が発生。整備士を呼ぶか、そのまま操業を続けるか。',
    options: [
      {
        label: '港に戻り修理する',
        description: '修理費はかかるが安全。今月の漁は短縮。',
        risk: 'low',
        effect: { moneyDelta: -150000, yieldMultiplier: 0.6 },
      },
      {
        label: 'このまま続ける',
        description: '成功すれば問題なし。失敗すれば大損害。',
        risk: 'high',
        effect: { moneyDelta: -50000, yieldMultiplier: 0.9 },
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
        effect: { moneyDelta: -80000, yieldMultiplier: 1.4 },
      },
      {
        label: '断って通常操業',
        description: '余計なコストはかけない。',
        risk: 'low',
        effect: { yieldMultiplier: 1.0 },
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
        effect: { yieldMultiplier: 1.0 },
      },
      {
        label: '来週まで待つ',
        description: '成功すれば高値売り。失敗すれば鮮度低下で損。',
        risk: 'high',
        effect: { moneyDelta: 200000, yieldMultiplier: 0.9 },
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
        effect: { yieldMultiplier: 0.5 },
      },
      {
        label: '粘って漁を続ける',
        description: '嵐が来なければ高水揚げ。来れば危険。',
        risk: 'high',
        effect: { yieldMultiplier: 1.3 },
      },
    ],
  },
  {
    id: 'rival-info',
    title: '🔍 ライバル会社の情報',
    description: '「あの会社が七尾湾に集中してる。別の海域が空いてるぞ」という情報が入った。',
    options: [
      {
        label: '情報に乗って移動する',
        description: 'コストがかかるが漁場が広がる可能性。',
        risk: 'medium',
        effect: { moneyDelta: -50000, yieldMultiplier: 1.25 },
      },
      {
        label: '現在の海域に留まる',
        description: '余計なリスクを取らない。',
        risk: 'low',
        effect: { yieldMultiplier: 1.0 },
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
        effect: { yieldMultiplier: 0.75 },
      },
      {
        label: '帰港して修理',
        description: '修理費と漁の損失が発生。',
        risk: 'low',
        effect: { moneyDelta: -100000, yieldMultiplier: 0.5 },
      },
    ],
  },
  {
    id: 'high-price-buyer',
    title: '💰 高値買取オファー',
    description: '大手料亭から「今すぐ500kg分を通常の1.5倍で買いたい」というオファーが来た。',
    options: [
      {
        label: '特別売りに応じる',
        description: '即座に高収益が得られる。',
        risk: 'low',
        effect: { moneyDelta: 300000 },
      },
      {
        label: '断って市場で売る',
        description: '量で勝負する。',
        risk: 'low',
        effect: { yieldMultiplier: 1.1 },
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
        effect: { yieldMultiplier: 1.3 },
      },
      {
        label: 'サポート役に回す',
        description: '安定した状態を保つ。',
        risk: 'low',
        effect: { yieldMultiplier: 1.0, reputationDelta: 3 },
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
      { id: 'n1-2', title: '1月の海況', body: '日本海は冬型気圧配置が続き、荒天に注意が必要。外浦方面への出港は気象確認を怠りなく。', category: 'weather' },
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
      { id: 'n3-1', title: 'ハタハタが能登沖で増加', body: '能登沖でハタハタの魚影が濃くなっている。底曳網との相性が良く、量を狙えそうだ。', category: 'area', hint: '底曳網×能登内浦や志賀が◎' },
      { id: 'n3-2', title: '春漁スタート', body: '春の漁期に入り、各地で漁獲量が回復傾向。アカガレイも好調で市場価格が安定している。', category: 'market' },
    ],
  },
  {
    month: 4, items: [
      { id: 'n4-1', title: 'アマエビ漁が本格化', body: '春から初夏にかけて甘エビの漁獲量が増加する。底曳網での操業が中心となる。', category: 'area', hint: '甘エビは底曳網でのみ漁獲可能' },
      { id: 'n4-2', title: '4月の海況', body: '穏やかな日が増えてくる。外浦方面への出港も比較的安定してきた。', category: 'weather' },
    ],
  },
  {
    month: 5, items: [
      { id: 'n5-1', title: 'イカ釣りシーズン開幕', body: 'スルメイカが能登周辺に回遊し始めた。イカ釣り漁の最盛期は夏に向かって続く。', category: 'area', hint: 'イカ釣×能登が最盛期へ' },
      { id: 'n5-2', title: 'マアジ・マイワシが豊漁', body: '定置網・まき網で回遊魚の水揚げが増加。量を取るなら今がチャンス。', category: 'market' },
    ],
  },
  {
    month: 6, items: [
      { id: 'n6-1', title: '能登外浦の保護区情報', body: '6月から能登外浦の一部海域で保護区設定期間に入る。操業計画の見直しが必要な漁業者も。', category: 'regulation', hint: '6月は能登外浦が規制対象' },
      { id: 'n6-2', title: '夏場のスルメイカが最盛期', body: '能登方面でスルメイカの漁獲が増加。夜間操業のイカ釣り船が活発に動いている。', category: 'market' },
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
      { id: 'n10-2', title: 'マサバが好調', body: '秋サバは脂が乗っており、10月が旬の最盛期。七尾や志賀方面で水揚げ増。', category: 'area' },
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
// ゲーム定数
// ----------------------------------------
export const GAME_CONFIG = {
  INITIAL_MONEY: 3000000,          // 初期資金300万円
  FIXED_COST_PER_MONTH: 200000,    // 月次固定費20万円
  FUEL_COST_PER_UNIT: 100000,      // 燃料基本費10万円
  INTEREST_RATE: 0.05,             // 月利5%
  MAX_DEBT_NORMAL: 5000000,        // 借金上限（ノーマル）
  MAX_DEBT_HARD: 3000000,          // 借金上限（ハード）
  DEBT_REPAY_TURNS: 3,             // 返済猶予ターン
  RUNNING_DURATION: 30,            // 月内進行時間（秒）
  MAX_EVENTS_PER_MONTH: 3,         // 月最大イベント数
  LEVEL_THRESHOLDS: [0, 2000000, 5000000, 10000000, 20000000], // レベル別累積利益
  PRICE_VARIANCE_NORMAL: 0.10,     // 価格ブレ（ノーマル）
  PRICE_VARIANCE_HARD: 0.20,       // 価格ブレ（ハード）
  REST_INCOME: 50000,              // 休業時の副業収入（固定費の一部回収）
};
