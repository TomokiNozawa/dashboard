/**
 * uranai-eki.js — 易経 64卦 + 今日の卦
 *
 * 八卦 (☰☷☳☵☶☴☲☱) の組合せ 8×8=64卦。 シード (日付+uid) で deterministic 抽出。
 */
const UranaiEki = (function() {
  // 八卦: 名・象徴・記号
  const HAKKA = [
    { name: '乾', symbol: '☰', mean: '天'   },
    { name: '兌', symbol: '☱', mean: '沢'   },
    { name: '離', symbol: '☲', mean: '火'   },
    { name: '震', symbol: '☳', mean: '雷'   },
    { name: '巽', symbol: '☴', mean: '風'   },
    { name: '坎', symbol: '☵', mean: '水'   },
    { name: '艮', symbol: '☶', mean: '山'   },
    { name: '坤', symbol: '☷', mean: '地'   },
  ];

  // 64卦の通称・卦意 (上卦 idx * 8 + 下卦 idx) — 周易の本卦順とは異なる「八卦組合せ順」
  // 簡略意味のみ (本格的占断は卦辞・爻辞が必要)
  const GUA = {
    '乾_乾':{ id:1,  name:'乾為天',     judge:'剛健・首領', advice:'積極果断に進むべし' },
    '坤_坤':{ id:2,  name:'坤為地',     judge:'柔順・受容', advice:'忍耐強く徳を積め' },
    '坎_震':{ id:3,  name:'水雷屯',     judge:'産みの苦しみ', advice:'準備を整え時を待て' },
    '艮_坎':{ id:4,  name:'山水蒙',     judge:'啓蒙・未熟', advice:'師から学ぶ姿勢を' },
    '坎_乾':{ id:5,  name:'水天需',     judge:'待機', advice:'急がず時機を待つ' },
    '乾_坎':{ id:6,  name:'天水訟',     judge:'争訟', advice:'争いを避けよ' },
    '坤_坎':{ id:7,  name:'地水師',     judge:'統率・戦', advice:'規律と義で人を率いる' },
    '坎_坤':{ id:8,  name:'水地比',     judge:'親しみ', advice:'仲間と結束せよ' },
    '巽_乾':{ id:9,  name:'風天小畜',   judge:'小成就', advice:'小さな積み重ねを' },
    '乾_兌':{ id:10, name:'天沢履',     judge:'踏み行く', advice:'礼節を守って進む' },
    '坤_乾':{ id:11, name:'地天泰',     judge:'通泰・大吉', advice:'今が好機' },
    '乾_坤':{ id:12, name:'天地否',     judge:'閉塞', advice:'動かず守りに徹せよ' },
    '乾_離':{ id:13, name:'天火同人',   judge:'協同', advice:'同志を得て成す' },
    '離_乾':{ id:14, name:'火天大有',   judge:'大いに有る', advice:'富を得て驕らず' },
    '坤_艮':{ id:15, name:'地山謙',     judge:'謙虚', advice:'謙遜が幸を呼ぶ' },
    '震_坤':{ id:16, name:'雷地豫',     judge:'喜び・余裕', advice:'楽しみつつ用心' },
    '兌_震':{ id:17, name:'沢雷随',     judge:'順応・随従', advice:'時流に従う' },
    '艮_巽':{ id:18, name:'山風蠱',     judge:'乱れの修復', advice:'問題を正面から直せ' },
    '坤_兌':{ id:19, name:'地沢臨',     judge:'臨み・進出', advice:'積極的に行動を' },
    '巽_坤':{ id:20, name:'風地観',     judge:'観察', advice:'静観して時を見極めよ' },
    '離_震':{ id:21, name:'火雷噬嗑',   judge:'噛みしめ・断行', advice:'障害を取り除け' },
    '艮_離':{ id:22, name:'山火賁',     judge:'装い・美化', advice:'外見より中身を磨け' },
    '艮_坤':{ id:23, name:'山地剥',     judge:'剥落・没落', advice:'守って動かず' },
    '坤_震':{ id:24, name:'地雷復',     judge:'復活', advice:'再起の時、一歩から' },
    '乾_震':{ id:25, name:'天雷无妄',   judge:'無心・自然', advice:'天の理に従い無欲に' },
    '艮_乾':{ id:26, name:'山天大畜',   judge:'大いに蓄える', advice:'力を蓄えて時を待つ' },
    '艮_震':{ id:27, name:'山雷頤',     judge:'養い', advice:'言葉と食を慎め' },
    '兌_巽':{ id:28, name:'沢風大過',   judge:'過大', advice:'重荷に注意、無理せず' },
    '坎_坎':{ id:29, name:'坎為水',     judge:'重なる困難', advice:'困難に学び信念を貫け' },
    '離_離':{ id:30, name:'離為火',     judge:'明るさ・付着', advice:'明知を保ち執着を捨てよ' },
    '兌_艮':{ id:31, name:'沢山咸',     judge:'感応・恋', advice:'心を開いて感じ取れ' },
    '震_巽':{ id:32, name:'雷風恒',     judge:'恒常', advice:'継続が力となる' },
    '乾_艮':{ id:33, name:'天山遯',     judge:'退き・引退', advice:'引くべき時は引く' },
    '震_乾':{ id:34, name:'雷天大壮',   judge:'勢い盛ん', advice:'勢いに乗りつつ慎重に' },
    '離_坤':{ id:35, name:'火地晋',     judge:'前進・栄達', advice:'明るく進め' },
    '坤_離':{ id:36, name:'地火明夷',   judge:'光を傷つけられる', advice:'力を隠し耐え忍べ' },
    '巽_離':{ id:37, name:'風火家人',   judge:'家庭', advice:'家を整えれば運開く' },
    '離_兌':{ id:38, name:'火沢睽',     judge:'背き合う', advice:'小事は通ず、大事は慎重' },
    '坎_艮':{ id:39, name:'水山蹇',     judge:'難所', advice:'動かず助けを待つ' },
    '震_坎':{ id:40, name:'雷水解',     judge:'解放', advice:'問題が解け始める' },
    '艮_兌':{ id:41, name:'山沢損',     judge:'損して益', advice:'与えれば返ってくる' },
    '巽_震':{ id:42, name:'風雷益',     judge:'増益', advice:'動けば益あり' },
    '兌_乾':{ id:43, name:'沢天夬',     judge:'決断', advice:'迷わず断行せよ' },
    '乾_巽':{ id:44, name:'天風姤',     judge:'出会い', advice:'予期せぬ出会いに注意' },
    '兌_坤':{ id:45, name:'沢地萃',     judge:'集まる', advice:'人を集めて事を成せ' },
    '坤_巽':{ id:46, name:'地風升',     judge:'上昇', advice:'順調に昇進・成長' },
    '兌_坎':{ id:47, name:'沢水困',     judge:'困窮', advice:'言葉を慎み信念を持て' },
    '坎_巽':{ id:48, name:'水風井',     judge:'井戸', advice:'恵みを汲み、深く掘れ' },
    '兌_離':{ id:49, name:'沢火革',     judge:'革命', advice:'時宜を得て改革せよ' },
    '離_巽':{ id:50, name:'火風鼎',     judge:'器・新生', advice:'新体制を整える時' },
    '震_震':{ id:51, name:'震為雷',     judge:'雷鳴・警告', advice:'驚きに動じず冷静に' },
    '艮_艮':{ id:52, name:'艮為山',     judge:'止まる', advice:'動かず内省せよ' },
    '巽_艮':{ id:53, name:'風山漸',     judge:'漸進', advice:'段階を踏み着実に' },
    '震_兌':{ id:54, name:'雷沢帰妹',   judge:'妹の嫁入り', advice:'立場をわきまえよ' },
    '震_離':{ id:55, name:'雷火豊',     judge:'豊か・絶頂', advice:'盛りの後は陰る、用心' },
    '離_艮':{ id:56, name:'火山旅',     judge:'旅', advice:'孤独な道、礼節を守れ' },
    '巽_巽':{ id:57, name:'巽為風',     judge:'従順・浸透', advice:'柔らかく入り込む' },
    '兌_兌':{ id:58, name:'兌為沢',     judge:'喜び', advice:'喜び合い分かち合え' },
    '巽_坎':{ id:59, name:'風水渙',     judge:'散る', advice:'執着を捨て自由になれ' },
    '坎_兌':{ id:60, name:'水沢節',     judge:'節度', advice:'過ぎたるは及ばず' },
    '巽_兌':{ id:61, name:'風沢中孚',   judge:'誠信', advice:'真心が通じる' },
    '震_艮':{ id:62, name:'雷山小過',   judge:'小事の過ぎ', advice:'控えめに行動せよ' },
    '坎_離':{ id:63, name:'水火既済',   judge:'完成', advice:'成った後の油断を戒めよ' },
    '離_坎':{ id:64, name:'火水未済',   judge:'未完', advice:'最後の一歩を慎重に' },
  };

  function _hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h = (h ^ str.charCodeAt(i)) >>> 0;
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function drawDailyGua(dateStr, uid) {
    const seed = _hash(`${dateStr}|${uid}|eki`);
    const upper = HAKKA[seed % 8];
    const lower = HAKKA[(seed >>> 4) % 8];
    const key = `${upper.name}_${lower.name}`;
    const gua = GUA[key] || { id: 0, name: `${upper.name}${lower.name}`, judge: '?', advice: '?' };
    // 変爻 (六爻のどれか)
    const movingLine = ((seed >>> 12) % 6) + 1;
    return {
      upper: upper.name, upperSym: upper.symbol, upperMean: upper.mean,
      lower: lower.name, lowerSym: lower.symbol, lowerMean: lower.mean,
      key, ...gua, movingLine,
      display: `${upper.symbol}${lower.symbol} ${gua.name}`,
    };
  }

  return { HAKKA, GUA, drawDailyGua };
})();

if (typeof module !== 'undefined') module.exports = UranaiEki;
