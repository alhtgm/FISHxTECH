// ========================================
// ストーリー・チュートリアルデータ
// ========================================

import type { GamePhase } from './types';

export interface Character {
  id: string;
  name: string;
  portrait: string;
  role: string;
  color: string;
}

export interface PrologueSlide {
  character: string;
  title: string;
  lines: string[];
  bgEmoji: string;
}

export interface StoryBeat {
  month: number;
  character: string;
  lines: string[];
}

export interface TutorialStep {
  id: number;
  phase: GamePhase;
  character: string;
  lines: string[];
  highlightId?: string;
}

// ========================================
// キャラクター定義
// ========================================
export const CHARACTERS: Character[] = [
  {
    id: 'jiichan',
    name: '海野 義太郎',
    portrait: '👴',
    role: '祖父・元ベテラン漁師',
    color: '#5c9a9a',
  },
  {
    id: 'haruko',
    name: '港 春子',
    portrait: '👩‍✈️',
    role: '港の管理人・頼れる相談役',
    color: '#c0874a',
  },
  {
    id: 'kenji',
    name: '若原 健二',
    portrait: '🧑‍✈️',
    role: 'あなたのクルー・元気な若手漁師',
    color: '#2e9d7e',
  },
  {
    id: 'narrator',
    name: 'ナレーション',
    portrait: '🌊',
    role: '',
    color: '#1565c0',
  },
];

// ========================================
// プロローグ（4スライド）
// ========================================
export const PROLOGUE_SLIDES: PrologueSlide[] = [
  {
    character: 'jiichan',
    title: 'じいちゃんからの手紙',
    bgEmoji: '📜',
    lines: [
      '孫よ、お前に頼みたいことがある。',
      'わしが長年続けてきた漁業「海野水産」を、お前に任せたい。',
      'もう体が思うように動かなくなった。だが、石川の海はまだまだ豊かだ。',
      'お前ならきっとやれる。この海の声を聞いて、自分の道を切り開け。',
      '──　じいちゃんより',
    ],
  },
  {
    character: 'narrator',
    title: '石川の海へ',
    bgEmoji: '🌊',
    lines: [
      '波の音、潮の香り、漁師たちの活気ある声。',
      'あなたは故郷・石川県へと戻ってきた。',
      'じいちゃんが守り続けた小さな漁業会社。',
      '資金は心もとなく、設備も古い。',
      'それでも、この海は正直だ。努力と知恵が、必ず実を結ぶ。',
    ],
  },
  {
    character: 'haruko',
    title: '港の管理人・ハルコさん',
    bgEmoji: '⚓',
    lines: [
      'あら、義太郎さんのお孫さんね。はじめまして。',
      '私はハルコ。この港の管理をしているの。',
      'じいちゃんから、あなたのことは聞いていたわ。',
      '石川の海は季節によって全然違う顔を見せる。最初は近い海域からじっくり始めて。',
      '何かあったらいつでも相談して。応援しているわよ。',
    ],
  },
  {
    character: 'kenji',
    title: '若手漁師・ケンジ',
    bgEmoji: '⛵',
    lines: [
      '社長！お待ちしてました！',
      '俺、若原健二といいます。ケンジって呼んでください！',
      '義太郎さんには本当にお世話になってたんです。',
      'これからは社長の下で全力でがんばります！',
      '……で、社長。まずは会社名、決めましょうよ！',
    ],
  },
];

// ========================================
// 月別ストーリービート（MONTH_START時に表示）
// ========================================
export const STORY_BEATS: StoryBeat[] = [
  {
    month: 1,
    character: 'haruko',
    lines: [
      '新しい年が始まりましたね。1月の日本海は荒れやすい季節よ。',
      '最初の月は無理する必要はありません。',
      '近くの漁場から始めて、少しずつコツをつかんでください。',
      'じいちゃんも、きっと空から見守っているわよ。',
    ],
  },
  {
    month: 2,
    character: 'jiichan',
    lines: [
      '2月の日本海は本格的な冬じゃ。荒天に注意しろ。',
      'だが冬の底曳網は今が旬。カレイやマダラが狙い目だ。',
      '加能ガニもまだ解禁中だ。今のうちにしっかり稼いでおけ。',
      '無理な出港は命取りになる。天気を確かめてから出ろ。',
    ],
  },
  {
    month: 3,
    character: 'kenji',
    lines: [
      '社長！3月になりました。少しずつ春の気配がしてきましたよ！',
      'ハタハタやアカガレイが能登沖で増えてきてるみたいです。',
      '底曳網を使えるうちに、しっかり稼いでおきましょう！',
      '来月あたりから甘エビも本格化してきますよ。楽しみです！',
    ],
  },
  {
    month: 4,
    character: 'haruko',
    lines: [
      '4月になって、穏やかな日が増えてきたわ。',
      '甘エビが本格的な漁獲期に入るわよ。底曳網との相性が抜群。',
      '遠い漁場にも出やすくなる頃。少し冒険してみてもいいかもね。',
      '設備投資のチャンスでもあるわ。余裕があれば考えてみて。',
    ],
  },
  {
    month: 5,
    character: 'jiichan',
    lines: [
      '五月は風が変わりやすい。天気予報から目を離すな。',
      '能登の方角から黒い雲が来たら、無理するな。',
      '定置網は嵐でも比較的安定しておる。',
      '焦らず、じっくり確実にやれ。',
    ],
  },
  {
    month: 6,
    character: 'kenji',
    lines: [
      '梅雨の季節ですね〜。じめじめしてて苦手です…',
      'でも！この時期はイカが増えてくるんですよ！',
      '能登内浦でイカ釣りをすると面白いかも、社長。',
      '俺の実家もイカ漁師でした。思い出すな〜。',
    ],
  },
  {
    month: 7,
    character: 'haruko',
    lines: [
      '夏の石川は観光客でにぎわうわ。',
      '魚の値段が上がることもある。',
      'ただ、暑い時期は海も荒れやすい。',
      '信頼できる漁師と、慎重に判断してね。',
    ],
  },
  {
    month: 8,
    character: 'jiichan',
    lines: [
      '八月の日本海は台風の季節じゃ。',
      '出航前に天気をよく確認しろ。',
      '無理して嵐に出たら、船も人も危ない。',
      '時には「休業」という判断も、立派な経営だ。',
    ],
  },
  {
    month: 9,
    character: 'kenji',
    lines: [
      '社長！9月は底曳き網の禁漁期間ですよ！',
      '忘れてないですよね？別の漁法を使いましょう。',
      '秋の魚が動き始める、楽しみな季節です！',
      '俺も気合い入れていきますよ！',
    ],
  },
  {
    month: 10,
    character: 'haruko',
    lines: [
      '秋が来たわ。ブリが南下を始める時期ね。',
      '能登外浦の大漁旗が見えたら、豊漁の予感よ。',
      '設備投資や漁師の選択、見直してみるといいかも。',
      '実力の見せどころね。',
    ],
  },
  {
    month: 11,
    character: 'jiichan',
    lines: [
      'カニ漁の解禁日じゃ、孫よ。',
      '石川の加能ガニは、この時期が最高の旬。',
      '市場でも高値がつく。この月を絶対に逃すな。',
      'これが、漁師の季節というものだ。',
    ],
  },
  {
    month: 12,
    character: 'haruko',
    lines: [
      'いよいよ最後の月ね。',
      'この一年、本当によく頑張ったわ。',
      'この月の結果が、じいちゃんへの答えになる。',
      '全力でいきましょう！応援しているわよ！',
    ],
  },
];

// ========================================
// チュートリアルステップ（1ヶ月目のみ）
// ========================================
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    phase: 'MONTH_START',
    character: 'haruko',
    lines: [
      'ようこそ、石川の海へ！基本を説明するわね。',
    ],
  },
  {
    id: 2,
    phase: 'MONTH_START',
    character: 'haruko',
    lines: [
      '右上の天気アイコンを確認してね。嵐だと収量が大幅に落ちるわよ。',
    ],
  },
  {
    id: 3,
    phase: 'MONTH_START',
    character: 'haruko',
    lines: [
      '規制・ニュースもチェックしてね。準備できたら「漁に出る」を押して！',
    ],
  },
  {
    id: 4,
    phase: 'DECISION',
    character: 'haruko',
    lines: [
      '右パネルで「海域」を選んでね。最初は七尾湾か加賀海域がおすすめよ。',
    ],
    highlightId: 'right-panel',
  },
  {
    id: 5,
    phase: 'DECISION',
    character: 'haruko',
    lines: [
      '次に「漁法」を選んで。定置網は安定していてビギナー向けよ。',
    ],
    highlightId: 'right-panel',
  },
  {
    id: 6,
    phase: 'DECISION',
    character: 'haruko',
    lines: [
      'クルーを選んだら中央の「操業開始」ボタンを押してね！',
    ],
    highlightId: 'right-panel',
  },
  {
    id: 7,
    phase: 'RUNNING',
    character: 'haruko',
    lines: [
      '漁が始まったわ！タイムライン上でイベントが発生することがあるわよ。',
    ],
  },
  {
    id: 8,
    phase: 'EVENT',
    character: 'haruko',
    lines: [
      'イベント発生！リスクレベルを見て選択してね。正解はない、あなたの判断よ！',
    ],
  },
  {
    id: 9,
    phase: 'RESULT',
    character: 'haruko',
    lines: [
      '今月の結果よ。売上 − 燃料費 − 固定費 = 利益。来月の作戦に活かしてね！',
    ],
  },
  {
    id: 10,
    phase: 'GROWTH',
    character: 'haruko',
    lines: [
      'スキル購入・クルー雇用ができるわ。チュートリアル完了！楽しんでね♪',
    ],
  },
];
