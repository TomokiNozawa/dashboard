/**
 * uranai-fusui.js — 風水 方位 (本命星 × 日付 → 吉凶方位)
 *
 * 九星気学の年盤・月盤・日盤を使って その日の吉方位を抽出。
 * 簡易版: 本命星と日盤の関係から「吉方位」「凶方位」 を算出。
 */
const UranaiFusui = (function() {
  // 方位 (8方位 + 中央)
  const DIRECTIONS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];

  // 九星 (一白 = 0, 二黒 = 1, ..., 九紫 = 8)
  const KYUUSEI = ['一白水星','二黒土星','三碧木星','四緑木星','五黄土星','六白金星','七赤金星','八白土星','九紫火星'];

  // 五行 相生 相剋 (kyuusei_idx → element index)
  // 一白=水, 二黒=土, 三碧=木, 四緑=木, 五黄=土, 六白=金, 七赤=金, 八白=土, 九紫=火
  const KYUUSEI_TO_GOGYO = [0, 2, 1, 1, 2, 3, 3, 2, 4];
  const GOGYO = ['水','木','土','金','火'];
  // 相生 (gogyo[i] が gogyo[(i+1)%5] を生む): 水→木→火→土→金→水
  // 上記の順は: 水(0)→木(1)→火(4)? 正確には 木火土金水 順 → 木0火1土2金3水4 が一般的
  // ここでは 水0木1土2金3火4 で:
  //   相生: 水→木, 木→火, 火→土, 土→金, 金→水  (各 +1 mod 5 ではない)
  // 正しい順序で並べ直し:
  //   水生木 (0→1), 木生火 (1→4), 火生土 (4→2), 土生金 (2→3), 金生水 (3→0)
  const SHEN_NEXT = { 0:1, 1:4, 4:2, 2:3, 3:0 };  // 「A が B を生む」 A→B
  const SHEN_PREV = { 1:0, 4:1, 2:4, 3:2, 0:3 };  // 「A は B から生まれる」 A の親
  const KE_NEXT   = { 0:4, 1:2, 4:3, 2:0, 3:1 };  // 「A が B を剋す」

  // 九星方位盤: 一白〜九紫 の 8方位+中央 配置 (毎日変わる、 ここは年盤の例)
  // 簡略: 中央に「日盤主」 が来て、 残り 8星が 後天定位 (洛書) に配置される。
  // 配置順: 中央以外は 一白=北, 二黒=西南, 三碧=東, 四緑=東南, 六白=西北, 七赤=西, 八白=東北, 九紫=南
  // 五黄=中央 (定位)
  const RAKUSHO_POSITION = {
    0: '北',     // 一白
    1: '西南',   // 二黒
    2: '東',     // 三碧
    3: '東南',   // 四緑
    4: '中央',   // 五黄
    5: '西北',   // 六白
    6: '西',     // 七赤
    7: '東北',   // 八白
    8: '南',     // 九紫
  };

  /**
   * 本人の本命星 × 日盤主 から その日の吉凶方位を判定
   * @param {number} honmeiIdx - 本命星 0-8
   * @param {string} dateStr - "YYYY-MM-DD" (日盤主算出用)
   */
  function getDailyHoui(honmeiIdx, dateStr) {
    const date = new Date(dateStr);
    const epoch = new Date('1900-01-01');
    const days = Math.floor((date - epoch) / 86400000);
    // 日盤主 = 一白から 9日周期で進む (簡略)
    const nichibanshuIdx = ((days % 9) + 9) % 9;
    // 本命星と日盤主が同じ = 凶日 (五黄殺等の判定省略)
    const honmeiPos = RAKUSHO_POSITION[honmeiIdx];
    const nichibanPos = RAKUSHO_POSITION[nichibanshuIdx];

    // 本命星から見た日盤主の五行関係
    const myGogyo = KYUUSEI_TO_GOGYO[honmeiIdx];
    const dayGogyo = KYUUSEI_TO_GOGYO[nichibanshuIdx];
    let relation = '中';
    if (SHEN_NEXT[dayGogyo] === myGogyo) relation = '大吉';  // 日盤が私を生む
    else if (SHEN_NEXT[myGogyo] === dayGogyo) relation = '吉'; // 私が日盤を生む
    else if (KE_NEXT[dayGogyo] === myGogyo) relation = '凶';   // 日盤が私を剋す
    else if (KE_NEXT[myGogyo] === dayGogyo) relation = '小凶'; // 私が日盤を剋す
    else if (myGogyo === dayGogyo) relation = '中吉';          // 比和

    // 吉方位 候補 = 自分の本命星と相生関係にある星の方位
    const kichiHoui = [];
    const kyouHoui = [];
    for (let i = 0; i < 9; i++) {
      if (i === honmeiIdx || i === 4) continue;
      const g = KYUUSEI_TO_GOGYO[i];
      if (SHEN_NEXT[g] === myGogyo || SHEN_NEXT[myGogyo] === g || g === myGogyo) {
        kichiHoui.push(RAKUSHO_POSITION[i]);
      } else if (KE_NEXT[g] === myGogyo || KE_NEXT[myGogyo] === g) {
        kyouHoui.push(RAKUSHO_POSITION[i]);
      }
    }
    return {
      nichibanshu: KYUUSEI[nichibanshuIdx],
      nichibanshuPos: nichibanPos,
      honmeiPos,
      relation,
      kichiHoui: [...new Set(kichiHoui)],
      kyouHoui: [...new Set(kyouHoui)],
      gokouSatsu: RAKUSHO_POSITION[4],  // 五黄殺 = 中央 (動けば災い、 簡略)
    };
  }

  return { DIRECTIONS, KYUUSEI, getDailyHoui };
})();

if (typeof module !== 'undefined') module.exports = UranaiFusui;
