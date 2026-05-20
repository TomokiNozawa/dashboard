/**
 * uranai-tarot.js — タロット 1日1枚引き
 *
 * 全78枚 (major 22 + minor 56) からシード (日付+uid) で deterministic に1枚抽出。
 * 同じ日に同じユーザーが引けば同じカード = 1日1枚の運勢として機能。
 */
const UranaiTarot = (function() {
  let CARDS = null;
  function setCardsData(data) { CARDS = data; }

  function _flatten() {
    if (!CARDS) return [];
    const all = [...CARDS.major.map(c => ({ ...c, suit: 'major' }))];
    ['wands', 'cups', 'swords', 'pentacles'].forEach(suitKey => {
      const suit = CARDS.minor[suitKey];
      const order = ['1','2','3','4','5','6','7','8','9','10','page','knight','queen','king'];
      order.forEach(rank => {
        const card = suit[rank];
        if (card) all.push({ ...card, suit: suitKey, rank, icon: suit.icon, element: suit.element });
      });
    });
    return all;
  }

  // 単純な文字列 → 数値ハッシュ (xmur3 風、 暗号強度不要)
  function _hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h = (h ^ str.charCodeAt(i)) >>> 0;
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  /**
   * @param {string} dateStr - "YYYY-MM-DD"
   * @param {string} uid - ユーザー識別子 (生年月日由来など)
   * @returns {object} { name, suit, rank, icon, upright, reversed, isReversed, meaning, en?, id? }
   */
  function drawDaily(dateStr, uid) {
    const all = _flatten();
    if (!all.length) return null;
    const seed = _hash(`${dateStr}|${uid}|tarot`);
    const idx = seed % all.length;
    const isReversed = ((seed >>> 16) & 1) === 1;
    const card = all[idx];
    return {
      ...card,
      isReversed,
      meaning: isReversed ? card.reversed : card.upright,
      orientation: isReversed ? '逆位置' : '正位置',
    };
  }

  // 3枚引き (過去・現在・未来)
  function drawThree(dateStr, uid) {
    const all = _flatten();
    if (all.length < 3) return [];
    const baseSeed = _hash(`${dateStr}|${uid}|tarot3`);
    const picked = new Set();
    const out = [];
    let s = baseSeed;
    while (out.length < 3) {
      s = (s * 1103515245 + 12345) >>> 0;
      const idx = s % all.length;
      if (picked.has(idx)) continue;
      picked.add(idx);
      const isRev = ((s >>> 8) & 1) === 1;
      out.push({
        ...all[idx],
        isReversed: isRev,
        meaning: isRev ? all[idx].reversed : all[idx].upright,
        orientation: isRev ? '逆位置' : '正位置',
        position: ['過去', '現在', '未来'][out.length],
      });
    }
    return out;
  }

  return { setCardsData, drawDaily, drawThree };
})();

if (typeof module !== 'undefined') module.exports = UranaiTarot;
