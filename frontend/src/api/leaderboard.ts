// ========================================
// ランキングAPI クライアント
// ========================================

export interface ScoreEntry {
  rank?: number;
  companyName: string;
  score: number;
  difficulty: string;
  level: number;
  totalProfit: number;
  createdAt?: string;
}

const API_BASE = '/api';

export async function submitScore(entry: Omit<ScoreEntry, 'rank' | 'createdAt'>): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getLeaderboard(limit = 50): Promise<ScoreEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data as ScoreEntry[];
  } catch {
    // フォールバック：疑似ランキング
    return generateMockLeaderboard();
  }
}

function generateMockLeaderboard(): ScoreEntry[] {
  const names = [
    '能登漁業(株)', '加賀水産', '輪島漁業組合', '七尾湾漁業', '珠洲水産',
    '石川ブリ本舗', '白山丸', '志賀の海', '金沢市場', '能登魚市場',
  ];
  return names.map((name, i) => ({
    rank: i + 1,
    companyName: name,
    score: Math.floor(Math.random() * 15000000) + 5000000,
    difficulty: i % 3 === 0 ? 'hard' : 'normal',
    level: Math.floor(Math.random() * 3) + 3,
    totalProfit: Math.floor(Math.random() * 20000000) + 3000000,
  })).sort((a, b) => b.score - a.score).map((e, i) => ({ ...e, rank: i + 1 }));
}
