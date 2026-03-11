// ========================================
// 石川県の魚 ピクセルアートスプライト v2
// P=4: 1ドット=4px  16x10 grid → 64x40 CSS px
// 目・デフォルメ重視
// ========================================

const P = 5;

function px(rows: string[], pal: Record<string, string>): string {
  const h = rows.length;
  const w = rows[0].length;
  const rects: string[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const color = pal[rows[y][x]];
      if (color) rects.push(`<rect x="${x * P}" y="${y * P}" width="${P}" height="${P}" fill="${color}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * P}" height="${h * P}" style="image-rendering:pixelated;display:inline-block;vertical-align:middle;flex-shrink:0">${rects.join('')}</svg>`;
}

// ====================================================================
// 魚スプライト（16x10, P=4 → 64x40px）
// 魚は左向き（頭が左）。E=黒目, W=白ハイライト, T=尾びれ
// ====================================================================

// 寒ブリ：大型・青銀・黄色い帯・背びれ
const buri = px([
  '......DDDD......', // D=背びれ
  '....OObbbbbbOT..',
  '..ObbbcbbbbbOTT.',
  '.ObbbbcbbbbbbOT.',
  'OEWbbbyyybbbbOT.',
  '.ObbbbbbbbbbbOT.',
  '..OObbbbbbbbOTT.',
  '....OObbbbOOT...',
  '......OOOOOO....',
  '................',
], { O:'#1a2a3a', b:'#4477aa', c:'#88bbcc', y:'#eedd22', E:'#000000', W:'#ffffff', T:'#2a6aaa', D:'#2a4a66' });

// のどぐろ：丸い・赤橙・特大の目（デフォルメ）
const nodoguro = px([
  '....OOOOOOOO....',
  '..OOrrrrrrrrO...',
  '.ORRRooorrrrO...',
  'OEEWoooorrrrOT..',
  'OEEWoooorrrrOT..',
  '.ORRRooorrrrOT..',
  '..OOrrrrrrrOTT..',
  '....OOOOOOOOT...',
  '................',
  '................',
], { O:'#1a0500', r:'#cc3311', o:'#ff6633', R:'#ff4422', E:'#000000', W:'#ffffff', T:'#aa3322' });

// 加能ガニ：ハサミ・甲羅・脚（18x12）
const kanoKani = px([
  'L..L..OOOOOO..L..L',
  'LL.LL.bbbbbb.LL.LL',
  '.LLEHbbbbbbbEHLL..',
  '..ObbbbbWWbbbbbO..',
  '..ObbbbWWWbbbbO...',
  '..ObbbbbWWbbbbbO..',
  '.LLbbbbbbbbbbbLL..',
  'LL.LL.bbbbbb.LL.LL',
  'L..L..OOOOOO..L..L',
  '...................',
], { O:'#550000', b:'#dd4422', W:'#ffbb88', L:'#991100', E:'#000000', H:'#ffffff' });

// アワビ：楕円・渦巻き模様・穴
const awabi = px([
  '....OOOOOOOOO...',
  '..OOgggggggggO..',
  '.OgggGGGGGGGgO..',
  'OggGGGSSSGGGggO.',
  'OggGGSSGSGGGggO.',
  'OggGGGSSSGGGgO..',
  '.OgggGGGGGGgO...',
  '..OOgggggggO....',
  '....OOOOOOO.....',
  '................',
], { O:'#110800', g:'#557733', G:'#334422', S:'#88aa44' });

// スルメイカ：胴体＋ひれ＋触手（12x16）
const surumeIka = px([
  '....OOOOOO....',
  '..OObbbbbbOO..',
  '.ObbbbbbbbbbO.',
  '.ObbEWbbbbbbO.',
  '.ObbbbbbbbbO..',
  '..OObbbbbbO...',
  '...OObbbbOO...',
  '....OObbOO....',
  '...O.OO.O.....',
  '..O..OO..O....',
  '.O...OO...O...',
  'O....OO....O..',
  '......OO......',
  '.............',
], { O:'#111122', b:'#cce8ff', E:'#000000', W:'#ffffff' });

// アマエビ：曲線体・長いひげ・ピンク（14x10）
const amaEbi = px([
  'A.A..OOOOOO.....',  // A=アンテナ
  'A.A.OppppppO....',
  '.A.Oppppp.ppO...',
  '..OppppppEWpO...',
  '.OppppppppppO...',
  'OppppppppppO....',
  '.Opppppppp.O....',
  '..OOppppOO......',
  '...OOOOOO.......',
  '................',
], { O:'#330011', p:'#ff9988', A:'#cc7755', E:'#000000', W:'#ffffff' });

// マイワシ：細身・青い背・銀腹・目
const maIwashi = px([
  '......OOOOOO....',
  '....OOssssssO...',
  '..OOsBBBBBssO...',
  '.OssBBBBBBssOT..',
  'OEWsBBBBBBBsOT..',
  '.OssBBBBBBssOTT.',
  '..OOsBBBBBssO...',
  '....OOssssOO....',
  '......OOOO......',
  '................',
], { O:'#1a2233', s:'#aabbcc', B:'#1144aa', E:'#000000', W:'#ffffff', T:'#2255aa' });

// ハタハタ：扁平・丸い頭・オレンジ褐色・大きな目
const hatahata = px([
  '.....OOOOOOO....',
  '...OOeeeeeeeO...',
  '..OeeefffeeeeO..',
  '.OeeeffffffeeOT.',
  'OEEWffffffeeOTT.',
  '.OeeeffffffeeOT.',
  '..OeeefffeeeeO..',
  '...OOeeeeeeeO...',
  '.....OOOOOOO....',
  '................',
], { O:'#221100', e:'#cc8833', f:'#ffaa44', E:'#000000', W:'#ffffff', T:'#996633' });

// マダラ：灰青・白いヒゲ・斑点
const madara = px([
  '......OOOOOOO...',
  '....OOgggggggO..',
  '...OggGGggggggO.',
  '..OggGGGgggggOT.',
  '.MEWgGGGgggggOT.',  // M=ヒゲ(髭)
  '..OggGGGgggggOT.',
  '...OggGGggggOOT.',
  '....OOgggggOO...',
  '......OOOOO.....',
  '................',
], { O:'#111a22', g:'#8899aa', G:'#445566', E:'#000000', W:'#ffffff', T:'#335577', M:'#eeeeff' });

// マアジ：青銀・稜鱗（棘状の側線）
const maAji = px([
  '.....OOOOOOO....',
  '...OObbbbbbbbO..',
  '..ObbcbbbbbbbbO.',
  '.ObbcbbbbbbbbOT.',
  'OEWbbbbbbbbbbOT.',
  '.ObbcbbbbbbbbOT.',
  '..ObbcbbbbbbOTT.',
  '...OObbbbbbOO...',
  '.....OOOOOOO....',
  '................',
], { O:'#0f1a2a', b:'#336688', c:'#88aacc', E:'#000000', W:'#ffffff', T:'#1a4488' });

// フクラギ（ブリ若魚）：ブリより細め
const fukuragi = px([
  '.....OOOOOOO....',
  '...OObbbbbbbbO..',
  '..ObbbcbbbbbbbO.',
  '.ObbbbcbbbbbbOT.',
  'OEWbbbyybbbbOTT.',
  '.ObbbbbbbbbbOT..',
  '..OObbbbbbbbO...',
  '...OObbbbbbO....',
  '.....OOOOOOO....',
  '................',
], { O:'#1a2a3a', b:'#3a5a8a', c:'#7799bb', y:'#ddbb22', E:'#000000', W:'#ffffff', T:'#2266aa' });

// スズキ：銀白・背が暗い
const suzuki = px([
  '......OOOOOO....',
  '....OOssssssO...',
  '...OssDDDssssO..',
  '..OssDDDDssssOT.',
  '.EWssDDDDsssOTT.',
  '..OssDDDDssssOT.',
  '...OssDDDssssO..',
  '....OOssssssO...',
  '......OOOOOO....',
  '................',
], { O:'#1a1a1a', s:'#bbcccc', D:'#3a5a5a', E:'#000000', W:'#ffffff', T:'#446688' });

// 香箱ガニ：小型・丸い甲羅
const koubako = px([
  '..L..OOOOOO..L..',
  '.LL.LbbbbbbL.LL.',
  'LLEHbbbbbbbEHLL.',
  '.ObbbbWWWbbbbO..',
  '.ObbbbWWWbbbbO..',
  'LLbbbbbbbbbbbLL.',
  '.LL.LbbbbbbL.LL.',
  '..L..OOOOOO..L..',
  '................',
  '................',
], { O:'#550000', b:'#dd4422', W:'#ffbb88', L:'#991100', E:'#000000', H:'#ffffff' });

// ニギス：細長・透明感
const nigisu = px([
  '.......OOOO.....',
  '.....OOnnnnO....',
  '...OOnnnnnnnO...',
  '..OnnnnnnnnnnOT.',
  '.EEWnnnnnnnnnOT.',
  '..OnnnnnnnnnnOT.',
  '...OOnnnnnnOOT..',
  '.....OOnnnnO....',
  '.......OOOO.....',
  '................',
], { O:'#1a1a2a', n:'#ccddee', E:'#000000', W:'#ffffff', T:'#3a6688' });

// サワラ：細長・青みがかった銀
const sawara = px([
  '....OOOOOOOO....',
  '..OOssssssssO...',
  '.OssBBBBBssssO..',
  'OssBBBBBBsssOT..',
  'EWsBBBBBBssOTT..',
  'OssBBBBBBsssOT..',
  '.OssBBBBBssssO..',
  '..OOssssssssO...',
  '....OOOOOOOO....',
  '................',
], { O:'#111a22', s:'#99aaaa', B:'#334466', E:'#000000', W:'#ffffff', T:'#2a5a7a' });

// バイ貝：縦縞の巻貝
const bai = px([
  '......OOO.......',
  '....OOsssOO.....',
  '...OssSSsssO....',
  '..OssSSSSssO....',
  '..OsSSSSSSsO....',
  '..OssSSSSssO....',
  '...OssSSsssOO...',
  '....OOsssssO....',
  '......OOO.......',
  '................',
], { O:'#221100', s:'#997755', S:'#665533' });

// ウニ：とげとげ・丸い・オレンジ
const uni = px([
  '..T...T...T.....',
  '...TOOOOOT......',
  '..TOouuuuOT.....',
  '.TOuuYYYuuuOT...',
  'TOuuYYYYYuuuOT..',
  '.TOuuYYYuuuOT...',
  '..TOouuuuOT.....',
  '...TOOOOOT......',
  '..T...T...T.....',
  '................',
], { O:'#331100', u:'#dd6600', Y:'#ffaa00', T:'#331100', o:'#bb4400' });

// ヤリイカ：細長・透明
const yariIka = px([
  '....OOOOO.......',
  '...ObbbbbbO.....',
  '..ObbbbbbbbO....',
  '..ObbEWbbbbO....',
  '..ObbbbbbbO.....',
  '...OOOOOO.......',
  '...O....O.......',
  '..O......O......',
  '.O........O.....',
  '..O......O......',
  '...O....O.......',
  '....OOOO........',
  '................',
  '................',
], { O:'#0a0a1a', b:'#ddeeff', E:'#000000', W:'#ffffff' });

// アオリイカ：広いひれ
const aoriIka = px([
  '...OOOOOOOO.....',
  '..ObbbbbbbbO....',
  '.ObbbbbbbbbbO...',
  '.ObbEWbbbbbbO...',
  '.ObbbbbbbbbO....',
  '..OOOOOOOOO.....',
  '..O.....O.......',
  '.O.......O......',
  'O.........O.....',
  '.O.......O......',
  '..OO...OO.......',
  '................',
  '................',
  '................',
], { O:'#0a0a1a', b:'#cce8dd', E:'#000000', W:'#ffffff' });

// ケンサキイカ：細い
const kensakiIka = px([
  '....OOOOOO......',
  '...ObbbbbbO.....',
  '..ObbbbbbbbO....',
  '..ObbEWbbbbO....',
  '..ObbbbbbbO.....',
  '...OOOOOOO......',
  '...O.....O......',
  '..O.......O.....',
  '.O.........O....',
  '..O.......O.....',
  '...OO...OO......',
  '................',
  '................',
  '................',
], { O:'#0a0a1a', b:'#eef4ff', E:'#000000', W:'#ffffff' });

// マダイ：赤い・鯛型
const maDai = px([
  '.....OOOOOOO....',
  '...OOrrrrrrrrO..',
  '..OrrRRrrrrrrO..',
  '.OrrRRRrrrrrOT..',
  'OEEWRRRRrrrOTT..',
  '.OrrRRRrrrrrOT..',
  '..OrrRRrrrrrrO..',
  '...OOrrrrrrrrO..',
  '.....OOOOOOO....',
  '................',
], { O:'#220000', r:'#cc4444', R:'#ff7777', E:'#000000', W:'#ffffff', T:'#aa3333' });

// アカガレイ（カレイ）：扁平・楕円・茶色
const akaGarei = px([
  '..OOOOOOOOOOOO..',
  '.ObbbbbbbbbbbbO.',
  'ObbbbDDbbbbbbbO.',
  'ObbDDDDDDbbbbbO.',
  'ObEWDDDDDbbbbbO.',
  'ObbDDDDDDbbbbbO.',
  'ObbbbDDbbbbbbbO.',
  '.ObbbbbbbbbbbbO.',
  '..OOOOOOOOOOOO..',
  '................',
], { O:'#1a1000', b:'#997755', D:'#664433', E:'#000000', W:'#ffffff' });

// ノコギリザメ系（noko - 代替）
const noko = px([
  '......OOOOOO....',
  '....OObbbbbbO...',
  '...ObbbbbbbbO...',
  '..ObbbbbbbbOT...',
  '.ObbbbbbbbOTT...',
  '..ObbbbbbbOT....',
  '...OObbbbOO.....',
  '....OOOOOO......',
  '................',
  '................',
], { O:'#0a0a0a', b:'#445566', T:'#335577' });

// ====================================================================
// スプライトマップ
// ====================================================================
export const FISH_SPRITES: Record<string, string> = {
  'buri':          buri,
  'fukuragi':      fukuragi,
  'nodoguro':      nodoguro,
  'kano-kani':     kanoKani,
  'koubako-gani':  koubako,
  'awabi':         awabi,
  'uni':           uni,
  'surume-ika':    surumeIka,
  'ama-ebi':       amaEbi,
  'ma-iwashi':     maIwashi,
  'hatahata':      hatahata,
  'madara':        madara,
  'ma-aji':        maAji,
  'ma-saba':       sawara,
  'suzuki':        suzuki,
  'nigisu':        nigisu,
  'sawara':        sawara,
  'bai':           bai,
  'aka-garei':     akaGarei,
  'noto-kani':     kanoKani,
  'yari-ika':      yariIka,
  'aori-ika':      aoriIka,
  'ken-saki-ika':  kensakiIka,
  'ma-dai':        maDai,
  'noko':          noko,
  'aji-garei':     akaGarei,
  'umadurai':      maAji,
  'katsuo':        fukuragi,
  'ma-dara':       madara,
  'sazae':         bai,
};

export function getFishSprite(fishId: string): string {
  return FISH_SPRITES[fishId] ?? '';
}

// ====================================================================
// 石川漁港 ピクセルアートシーン（完全リワーク）
// 純粋なピクセルブロックで構成。グラデーションなし。
// 8pxグリッドで手描きした能登の漁港。
// ====================================================================
export function getHarborScene(weather: string = 'sunny'): string {
  // 天候別カラーパレット
  const pal = weather === 'stormy'
    ? { sky:'#06080f', sky2:'#0a0d18', hill2:'#111520', hill1:'#0d1018',
        sea:'#060c12', seaLine:'#0f1c24', pier:'#1a2530',
        bldWall:'#111820', bldRoof:'#0d1420', ltHouse:'#aaa9a0', ltRed:'#883322',
        boatHull:'#1a2530', boatCabin:'#111820', boatMast:'#2a3540',
        winLight:'#332200', starCol:'#334466', moonCol:'#334466' }
    : weather === 'cloudy'
    ? { sky:'#0a1020', sky2:'#111828', hill2:'#1a2030', hill1:'#111825',
        sea:'#0a1520', seaLine:'#162232', pier:'#2a3a44',
        bldWall:'#1a2530', bldRoof:'#141e28', ltHouse:'#ddddcc', ltRed:'#cc2211',
        boatHull:'#2a3a4a', boatCabin:'#1a2a38', boatMast:'#3a4a55',
        winLight:'#554422', starCol:'#445566', moonCol:'#888888' }
    : { sky:'#08101e', sky2:'#0d1830', hill2:'#1a2238', hill1:'#101825',
        sea:'#0a1828', seaLine:'#163044', pier:'#2a3a4a',
        bldWall:'#1a2a38', bldRoof:'#121e2c', ltHouse:'#eeeedd', ltRed:'#dd2211',
        boatHull:'#2a3a4a', boatCabin:'#1e2e40', boatMast:'#3a4a5a',
        winLight:'#887722', starCol:'#aabbdd', moonCol:'#ddeebb' };

  // ----- 星（固定位置） -----
  const starPos = [
    [48,6],[96,10],[144,4],[192,14],[256,8],[304,5],[352,16],[400,10],
    [448,6],[512,12],[560,4],[608,9],[656,14],[700,7],[32,18],[280,20],[480,16]
  ];
  const stars = starPos.map(([x,y]) =>
    `<rect x="${x}" y="${y}" width="2" height="2" fill="${pal.starCol}" opacity="0.8"/>`
  ).join('');

  // ----- 月（ピクセルアート円） -----
  const moonPixels = weather !== 'stormy' ? [
    [2,0],[3,0],[4,0],[5,0],
    [1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],
    [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],
    [0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],
    [1,6],[2,6],[3,6],[4,6],[5,6],[6,6],
    [2,7],[3,7],[4,7],[5,7],
  ].map(([dx,dy]) => `<rect x="${648+dx*4}" y="${8+dy*4}" width="4" height="4" fill="${pal.moonCol}"/>`)
    .join('') : '';

  // ----- 能登半島シルエット（奥の山）-----
  // stepped silhouette using rows of rects
  const farHill = [
    // [x, y, w, h]
    [0,  62, 80,  28],
    [64, 54, 48,  36],
    [96, 46, 48,  44],
    [128,56, 40,  34],
    [152,50, 56,  40],
    [192,60, 40,  30],
    [216,42, 64,  48],
    [264,52, 48,  38],
    [296,38, 56,  52],
    [336,50, 48,  40],
    [368,44, 48,  46],
    [400,56, 48,  34],
    [432,48, 56,  42],
    [472,58, 48,  32],
    [504,50, 56,  40],
    [544,62, 48,  28],
    [576,54, 56,  36],
    [616,60, 48,  30],
    [648,52, 48,  38],
    [680,58, 40,  32],
  ].map(([x,y,w,h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${pal.hill2}"/>`).join('');

  // 手前の岸の台地
  const nearHill = [
    [0,   78, 240, 12],
    [224, 74,  80, 16],
    [288, 80, 160, 10],
    [432, 76,  80, 14],
    [496, 80, 224, 10],
  ].map(([x,y,w,h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${pal.hill1}"/>`).join('');

  // ----- 岸壁 -----
  const pier = [
    [0,   88, 280, 8],  // メイン桟橋
    [64,  82,  8, 8],   // 杭1
    [128, 82,  8, 8],   // 杭2
    [200, 82,  8, 8],   // 杭3
    [280, 88, 80, 8],   // 延長
  ].map(([x,y,w,h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${pal.pier}"/>`).join('');

  // ----- 建物A（左の漁協倉庫）-----
  const buildingA = `
    <rect x="0"   y="60" width="64" height="28" fill="${pal.bldWall}"/>
    <rect x="0"   y="56" width="64" height="6"  fill="${pal.bldRoof}"/>
    <rect x="4"   y="64" width="12" height="14" fill="${pal.winLight}"/>
    <rect x="24"  y="64" width="12" height="14" fill="${pal.winLight}"/>
    <rect x="44"  y="64" width="12" height="14" fill="${pal.winLight}"/>
    ${weather !== 'stormy' ? `
    <rect x="5"   y="65" width="10" height="12" fill="#ffeeaa" opacity="0.25"/>
    <rect x="25"  y="65" width="10" height="12" fill="#ffeeaa" opacity="0.25"/>
    ` : ''}
  `;

  // ----- 建物B（右の施設）-----
  const buildingB = `
    <rect x="640" y="66" width="80" height="24" fill="${pal.bldWall}"/>
    <rect x="640" y="62" width="80" height="6"  fill="${pal.bldRoof}"/>
    <rect x="644" y="70" width="10" height="12" fill="${pal.winLight}"/>
    <rect x="660" y="70" width="10" height="12" fill="${pal.winLight}"/>
    <rect x="680" y="70" width="10" height="12" fill="${pal.winLight}"/>
    <rect x="700" y="70" width="10" height="12" fill="${pal.winLight}"/>
  `;

  // ----- 灯台（輪島イメージ）8pxグリッド -----
  const lighthouse = `
    <rect x="104" y="40" width="16" height="8"  fill="${pal.bldRoof}"/>
    <rect x="106" y="32" width="12" height="10" fill="${pal.ltHouse}"/>
    <rect x="104" y="28" width="16" height="6"  fill="${pal.bldRoof}"/>
    <rect x="108" y="22" width="8"  height="8"  fill="${pal.ltHouse}"/>
    <rect x="110" y="16" width="4"  height="8"  fill="${pal.bldRoof}"/>
    <rect x="106" y="48" width="12" height="12" fill="${pal.ltRed}"/>
    <rect x="104" y="60" width="16" height="16" fill="${pal.ltHouse}"/>
    <rect x="104" y="76" width="16" height="12" fill="${pal.ltRed}"/>
    <rect x="100" y="86" width="24" height="4"  fill="${pal.pier}"/>
    ${weather !== 'stormy' ? `<rect x="100" y="20" width="24" height="24" fill="#ffee88" opacity="0.12"/>` : ''}
  `;

  // ----- 大型漁船（左）-----
  const bigBoat = `
    <rect x="168" y="78" width="144" height="8"  fill="${pal.boatHull}"/>
    <rect x="172" y="74" width="136" height="6"  fill="${pal.boatCabin}"/>
    <rect x="192" y="54" width="64"  height="22" fill="${pal.boatCabin}"/>
    <rect x="200" y="46" width="48"  height="10" fill="${pal.boatHull}"/>
    <rect x="220" y="30" width="6"   height="20" fill="${pal.boatMast}"/>
    <rect x="236" y="34" width="4"   height="16" fill="${pal.boatMast}"/>
    <rect x="192" y="54" width="6"   height="22" fill="${pal.boatMast}"/>
    <rect x="252" y="54" width="6"   height="22" fill="${pal.boatMast}"/>
    <rect x="280" y="64" width="24"  height="16" fill="${pal.boatHull}"/>
    ${weather !== 'stormy' ? `
    <rect x="194" y="56" width="56" height="8" fill="#ffeeaa" opacity="0.15"/>
    ` : ''}
  `;

  // ----- 小型漁船（右）-----
  const smallBoat = `
    <rect x="480" y="80" width="96" height="8"  fill="${pal.boatHull}"/>
    <rect x="484" y="76" width="88" height="6"  fill="${pal.boatCabin}"/>
    <rect x="496" y="60" width="48" height="18" fill="${pal.boatCabin}"/>
    <rect x="516" y="50" width="4"  height="14" fill="${pal.boatMast}"/>
    <rect x="496" y="60" width="4"  height="18" fill="${pal.boatMast}"/>
  `;

  // ----- 漁港の旗 -----
  const flag = weather !== 'stormy'
    ? `<rect x="220" y="28" width="16" height="10" fill="#cc2211"/>
       <rect x="220" y="28" width="16" height="4"  fill="#eeeeee"/>
       <rect x="220" y="32" width="16" height="3"  fill="#cc2211"/>`
    : '';

  // ----- 海 -----
  const seaRows = [96, 104, 112, 120, 132, 148, 168].map((y, i) => {
    const op = [0.6, 0.4, 0.3, 0.22, 0.16, 0.1, 0.07][i];
    return `<rect x="0" y="${y}" width="720" height="4" fill="${pal.seaLine}" opacity="${op}"/>`;
  }).join('');

  const sea = `
    <rect x="0" y="92" width="720" height="100" fill="${pal.sea}"/>
    ${seaRows}
  `;

  // ----- 荒天エフェクト（雨） -----
  const stormFx = weather === 'stormy'
    ? Array.from({length: 28}, (_,i) => {
        const x = (i * 67 + 20) % 720;
        const y1 = (i * 43) % 80;
        return `<rect x="${x}" y="${y1}" width="2" height="16" fill="#334455" opacity="0.5"/>`;
      }).join('')
    : '';

  // ----- 漁港ロゴ看板 -----
  const sign = `
    <rect x="72" y="66" width="32" height="14" fill="${pal.bldRoof}"/>
    <rect x="72" y="66" width="32" height="2"  fill="#00e5ff" opacity="0.6"/>
    <text x="88" y="77" font-family="monospace" font-size="7" fill="#88ccdd" text-anchor="middle" letter-spacing="0">能登漁港</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="192"
    style="image-rendering:pixelated;display:block;width:100%;height:auto">
    <!-- 空 -->
    <rect width="720" height="92" fill="${pal.sky}"/>
    <!-- 星 -->
    ${stars}
    <!-- 月 -->
    ${moonPixels}
    <!-- 山シルエット -->
    ${farHill}
    ${nearHill}
    <!-- 海 -->
    ${sea}
    <!-- 建物 -->
    ${buildingA}
    ${buildingB}
    <!-- 灯台 -->
    ${lighthouse}
    <!-- 岸壁 -->
    ${pier}
    <!-- 漁船 -->
    ${bigBoat}
    ${smallBoat}
    <!-- 旗 -->
    ${flag}
    <!-- 看板 -->
    ${sign}
    <!-- 荒天 -->
    ${stormFx}
  </svg>`;
}

// ====================================================================
// 魚の説明（ツールチップ用）
// ====================================================================
export const FISH_FLAVOR: Record<string, string> = {
  'buri':          '石川県の冬の王者。能登の荒波で育った脂ノリ最高の寒ブリ。',
  'nodoguro':      '「白身のトロ」と呼ばれる超高級魚。のどの黒さが特徴。',
  'kano-kani':     '石川県のブランド蟹。加能ガニは大型で身が甘い。',
  'koubako-gani':  '香箱ガニはズワイガニの雌。内子・外子が絶品。',
  'awabi':         '能登の海女が素潜りで採る貝の王様。弾力のある歯ごたえ。',
  'uni':           '能登のウニは甘くて濃厚。夏が旬。',
  'surume-ika':    '能登でイカ釣り漁船の集魚灯が輝く夏の風物詩。',
  'ama-ebi':       '石川の底曳網が誇る甘エビ。加賀海域の深海から。',
  'ma-iwashi':     '七尾湾で大量に獲れる。定置網の主力魚種。',
  'hatahata':      'ハタハタは冬の能登の味。脂ののった白身が人気。',
  'madara':        'タラ鍋で有名な冬魚。能登外浦の深海に生息。',
  'ma-aji':        '石川のアジは身が締まり旨味が強い。夏に旬。',
  'suzuki':        '七尾湾の夏の釣りターゲット。淡白で上品な白身。',
  'ma-saba':       '石川のサバは新鮮で旨みが強い。',
  'sawara':        '春に旬を迎える大型魚。サワラの西京焼きが有名。',
  'bai':           'バイ貝は加賀・能登の名産。コリコリとした食感。',
  'aka-garei':     '底曳網で獲れる加賀のカレイ。煮付けが定番。',
  'nigisu':        'ニギス（メギス）は深海の底曳魚。干物が有名。',
  'fukuragi':      'ブリの若魚。石川では「フクラギ」と呼ぶ。秋が旬。',
};
