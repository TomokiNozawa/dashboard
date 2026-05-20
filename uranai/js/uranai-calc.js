/**
 * uranai-calc.js — 静的占い計算ライブラリ
 *
 * 12星座 / 四柱推命命式 / 姓名判断 五格 / 数秘術 / 動物占い / 九星気学 / 干支
 * 計算式ベース、 一部 (姓名判断・動物) は外部 JSON 辞書を setKakusuuData / setDoubutsuData で注入
 */
const UranaiCalc = (function() {

  // ──────── 12星座 ────────
  const SEIZA = [
    {name:'山羊座', icon:'♑', element:'地', from:[12,22], to:[1,19]},
    {name:'水瓶座', icon:'♒', element:'風', from:[1,20],  to:[2,18]},
    {name:'魚座',   icon:'♓', element:'水', from:[2,19],  to:[3,20]},
    {name:'牡羊座', icon:'♈', element:'火', from:[3,21],  to:[4,19]},
    {name:'牡牛座', icon:'♉', element:'地', from:[4,20],  to:[5,20]},
    {name:'双子座', icon:'♊', element:'風', from:[5,21],  to:[6,21]},
    {name:'蟹座',   icon:'♋', element:'水', from:[6,22],  to:[7,22]},
    {name:'獅子座', icon:'♌', element:'火', from:[7,23],  to:[8,22]},
    {name:'乙女座', icon:'♍', element:'地', from:[8,23],  to:[9,22]},
    {name:'天秤座', icon:'♎', element:'風', from:[9,23],  to:[10,23]},
    {name:'蠍座',   icon:'♏', element:'水', from:[10,24], to:[11,22]},
    {name:'射手座', icon:'♐', element:'火', from:[11,23], to:[12,21]},
  ];
  function getSeiza(m, d) {
    for (const s of SEIZA) {
      const [fm, fd] = s.from, [tm, td] = s.to;
      if (fm === tm) {
        if (m === fm && d >= fd && d <= td) return s;
      } else {
        if ((m === fm && d >= fd) || (m === tm && d <= td)) return s;
      }
    }
    return null;
  }

  // ──────── 60干支 ────────
  const KAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const SHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const SHI_DOUBUTSU = ['鼠','牛','虎','兎','龍','蛇','馬','羊','猿','鶏','犬','猪'];
  const KAN_ELEM = ['木','木','火','火','土','土','金','金','水','水']; // 甲乙=木 丙丁=火 戊己=土 庚辛=金 壬癸=水
  function kanshi(idx) { return KAN[idx % 10] + SHI[idx % 12]; }

  // 年柱: 立春境 (2/4)、 1984年甲子起算
  function getYearKanshi(year, m, d) {
    let y = year;
    if (m === 1 || (m === 2 && d < 4)) y -= 1;
    const idx = ((y - 1984) % 60 + 60) % 60;
    return { idx, name: kanshi(idx), kan: KAN[idx % 10], shi: SHI[idx % 12], doubutsu: SHI_DOUBUTSU[idx % 12] };
  }

  // 月柱: 二十四節気の節入り日 (簡易固定値)。 寅月=立春2/4 から始まる12ヶ月
  // 各エントリ: (節入り月日, 月支index)
  const SETSUKI = [
    {m:2,  d:4,  shi:2},  // 寅月 (立春)
    {m:3,  d:6,  shi:3},  // 卯月 (啓蟄)
    {m:4,  d:5,  shi:4},  // 辰月 (清明)
    {m:5,  d:6,  shi:5},  // 巳月 (立夏)
    {m:6,  d:6,  shi:6},  // 午月 (芒種)
    {m:7,  d:8,  shi:7},  // 未月 (小暑)  ※ 1995年は 7/8 だが概ね 7/7-8
    {m:8,  d:8,  shi:8},  // 申月 (立秋)
    {m:9,  d:8,  shi:9},  // 酉月 (白露)
    {m:10, d:8,  shi:10}, // 戌月 (寒露)
    {m:11, d:8,  shi:11}, // 亥月 (立冬)
    {m:12, d:7,  shi:0},  // 子月 (大雪)
    {m:1,  d:6,  shi:1},  // 丑月 (小寒)
  ];
  function getMonthShiIdx(m, d) {
    // 与えられた (m, d) が どの寅〜丑月に属するか判定
    const norm = m * 100 + d;  // 比較用 YYMMDD様
    for (let i = 0; i < SETSUKI.length; i++) {
      const cur = SETSUKI[i];
      const nxt = SETSUKI[(i + 1) % SETSUKI.length];
      const curN = cur.m * 100 + cur.d;
      let nxtN = nxt.m * 100 + nxt.d;
      // 12月→1月跨ぎ
      if (i === 10) {  // 子月 (12月) の 次は 丑月 (1月)
        if (norm >= curN || norm < nxtN) return cur.shi;
      } else if (i === 11) {  // 丑月 (1月) の 次は 寅月 (2月)
        if (norm >= curN && norm < nxtN) return cur.shi;
      } else {
        if (norm >= curN && norm < nxtN) return cur.shi;
      }
    }
    return 0;
  }
  // 五虎遁: 年干 → 寅月の月干
  // 年干 甲己→丙寅起算 / 乙庚→戊寅 / 丙辛→庚寅 / 丁壬→壬寅 / 戊癸→甲寅
  function getMonthKanshi(year, m, d) {
    const y = getYearKanshi(year, m, d);
    const monthShi = getMonthShiIdx(m, d);
    const offsetFromTora = (monthShi - 2 + 12) % 12;
    const yearKanIdx = y.idx % 10;
    const toraStartKan = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][yearKanIdx];  // 甲=丙寅, 乙=戊寅, 丙=庚寅, 丁=壬寅, 戊=甲寅, 己=丙寅, ...
    const monthKanIdx = (toraStartKan + offsetFromTora) % 10;
    return { name: KAN[monthKanIdx] + SHI[monthShi], kan: KAN[monthKanIdx], shi: SHI[monthShi] };
  }

  // 日柱: 1900/01/01 = 甲戌 (idx 10) を起点とする60干支ループ
  function getDayKanshi(y, m, d) {
    const date = new Date(Date.UTC(y, m - 1, d));
    const epoch = Date.UTC(1900, 0, 1);
    const days = Math.round((date.getTime() - epoch) / 86400000);
    const idx = ((10 + days) % 60 + 60) % 60;
    return { idx, name: kanshi(idx), kan: KAN[idx % 10], shi: SHI[idx % 12] };
  }

  // 時柱: 23-1=子 / 1-3=丑 / ... / 21-23=亥
  function getHourKanshi(dayKanIdx, hour) {
    let shiIdx;
    if (hour >= 23 || hour < 1) shiIdx = 0;
    else if (hour < 3) shiIdx = 1;
    else if (hour < 5) shiIdx = 2;
    else if (hour < 7) shiIdx = 3;
    else if (hour < 9) shiIdx = 4;
    else if (hour < 11) shiIdx = 5;
    else if (hour < 13) shiIdx = 6;
    else if (hour < 15) shiIdx = 7;
    else if (hour < 17) shiIdx = 8;
    else if (hour < 19) shiIdx = 9;
    else if (hour < 21) shiIdx = 10;
    else shiIdx = 11;
    // 五子元遁: 日干 → 子の刻の時干
    const kanStart = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][dayKanIdx];
    const hourKanIdx = (kanStart + shiIdx) % 10;
    return { name: KAN[hourKanIdx] + SHI[shiIdx], kan: KAN[hourKanIdx], shi: SHI[shiIdx] };
  }

  function getShichuu(y, m, d, hh) {
    const yearK = getYearKanshi(y, m, d);
    const monthK = getMonthKanshi(y, m, d);
    const dayK = getDayKanshi(y, m, d);
    const hourK = getHourKanshi(dayK.idx % 10, hh);
    // 五行サマリ
    const elems = [
      KAN_ELEM[yearK.kan ? KAN.indexOf(yearK.kan) : 0],
      KAN_ELEM[monthK.kan ? KAN.indexOf(monthK.kan) : 0],
      KAN_ELEM[dayK.kan ? KAN.indexOf(dayK.kan) : 0],
      KAN_ELEM[hourK.kan ? KAN.indexOf(hourK.kan) : 0],
    ];
    return { 年: yearK, 月: monthK, 日: dayK, 時: hourK, 五行: elems };
  }

  // ──────── 姓名判断 五格 (熊崎式) ────────
  let KAKUSUU = null;
  function setKakusuuData(data) { KAKUSUU = data; }
  function getStrokes(ch, school = 'new') {
    if (!KAKUSUU) return null;
    const entry = KAKUSUU[ch];
    if (entry == null) return null;
    if (typeof entry === 'number') return entry;
    return entry[school] ?? entry.new ?? entry.old ?? null;
  }
  function getSeimei(last, first, school = 'new') {
    const lc = [...(last || '')].map(c => getStrokes(c, school));
    const fc = [...(first || '')].map(c => getStrokes(c, school));
    const missing = [];
    [...(last || '')].forEach((c, i) => { if (lc[i] == null) missing.push(c); });
    [...(first || '')].forEach((c, i) => { if (fc[i] == null) missing.push(c); });
    const lcv = lc.filter(v => v != null);
    const fcv = fc.filter(v => v != null);
    const lastTotal = lcv.reduce((a, b) => a + b, 0);
    const firstTotal = fcv.reduce((a, b) => a + b, 0);
    const tenkaku = lastTotal;
    const jinkaku = (lcv.length ? lcv[lcv.length - 1] : 0) + (fcv.length ? fcv[0] : 0);
    const chikaku = firstTotal;
    const gaikaku = (lcv.length ? lcv[0] : 0) + (fcv.length ? fcv[fcv.length - 1] : 0);
    const soukaku = tenkaku + chikaku;
    return { 天格: tenkaku, 人格: jinkaku, 地格: chikaku, 外格: gaikaku, 総格: soukaku, missing };
  }
  // 画数 → 吉凶 (簡易、 熊崎式 一般論)
  const SEIMEI_LUCK = {
    1:'大吉', 2:'凶',  3:'大吉', 5:'大吉', 6:'吉',  7:'吉',  8:'吉',  11:'大吉',13:'大吉',15:'大吉',
    16:'大吉',17:'吉', 18:'吉',  21:'大吉',23:'大吉',24:'大吉',25:'吉',  29:'吉',  31:'大吉',32:'大吉',
    33:'大吉',35:'吉', 37:'大吉',38:'吉',  39:'吉',  41:'大吉',45:'大吉',47:'大吉',48:'吉',  52:'大吉',
    57:'吉',  58:'吉', 61:'大吉',63:'大吉',65:'大吉',67:'大吉',68:'吉',  81:'大吉',
    4:'凶',   9:'凶',  10:'凶', 12:'凶',  14:'凶',  19:'凶',  20:'凶',  22:'凶',  26:'凶',  27:'凶',
    28:'凶',  30:'凶', 34:'凶', 36:'凶',  40:'凶',  42:'凶',  43:'凶',  44:'凶',  46:'凶',  49:'凶',
    50:'凶',  51:'凶', 53:'凶', 54:'凶',  55:'凶',  56:'凶',  59:'凶',  60:'凶',  62:'凶',  64:'凶',
    66:'凶',  69:'凶', 70:'凶', 71:'凶',  72:'凶',  73:'凶',  74:'凶',  75:'凶',  76:'凶',  77:'凶',
    78:'凶',  79:'凶', 80:'凶',
  };
  function seimeiLuck(n) {
    if (n <= 0) return '?';
    const m = n > 81 ? ((n - 1) % 81) + 1 : n;
    return SEIMEI_LUCK[m] || '中吉';
  }

  // ──────── 数秘術 ────────
  function reduceNum(n, allowMaster = true) {
    while (n > 9) {
      if (allowMaster && (n === 11 || n === 22 || n === 33)) return n;
      n = String(n).split('').reduce((a, b) => a + parseInt(b, 10), 0);
    }
    return n;
  }
  function getSuuhi(y, m, d) {
    const digits = String(y) + String(m).padStart(2, '0') + String(d).padStart(2, '0');
    const sum = digits.split('').reduce((a, b) => a + parseInt(b, 10), 0);
    return { lifepath: reduceNum(sum), birthday: reduceNum(d), totalSum: sum };
  }
  const LIFEPATH_TEXT = {
    1:'リーダー・独立心', 2:'協調・パートナー', 3:'創造・表現', 4:'安定・実直', 5:'自由・冒険',
    6:'愛情・調和', 7:'探究・スピリチュアル', 8:'力・成功', 9:'献身・完成',
    11:'直感・霊感 (マスター)', 22:'マスタービルダー', 33:'無条件の愛 (マスター)',
  };

  // ──────── 九星気学 ────────
  const KYUUSEI_NAMES = ['一白水星','二黒土星','三碧木星','四緑木星','五黄土星','六白金星','七赤金星','八白土星','九紫火星'];
  const KYUUSEI_ELEM  = ['水','土','木','木','土','金','金','土','火'];
  function getKyuusei(y, m, d) {
    if (m === 1 || (m === 2 && d < 4)) y -= 1;
    const sumDigits = String(y).split('').reduce((a, b) => a + parseInt(b, 10), 0);
    const reduced = sumDigits > 10 ? reduceNum(sumDigits, false) : sumDigits;
    const idx = ((11 - reduced) % 9 + 9) % 9;
    return { name: KYUUSEI_NAMES[idx], idx, elem: KYUUSEI_ELEM[idx] };
  }

  // ──────── 動物占い (個性心理學 60動物) ────────
  let DOUBUTSU_TABLE = null;
  function setDoubutsuData(data) { DOUBUTSU_TABLE = data; }
  function getDoubutsu(y, m, d) {
    // 個性心理學 (弦本式) 公式算式: (Excel シリアル値 + 8) mod 60 + 1
    // Excel シリアル値 は 1900/1/1=1 起点、 ただし 1900/2/29 を存在しない閏日として
    // カウントするバグがあるため 1900/3/1 以降は (1900/1/1からの通算日 + 2)
    const date = new Date(Date.UTC(y, m - 1, d));
    const epoch = Date.UTC(1900, 0, 1);
    const days = Math.floor((date.getTime() - epoch) / 86400000);
    let excelSerial = days + 1;
    if (date.getTime() >= Date.UTC(1900, 2, 1)) excelSerial += 1;  // 1900/3/1 以降は +1 (Excel 1900/2/29 バグ補正)
    const rem = ((excelSerial + 8) % 60 + 60) % 60;
    const num = rem === 0 ? 60 : rem;
    const entry = DOUBUTSU_TABLE ? DOUBUTSU_TABLE[String(num)] : null;
    return entry ? Object.assign({ num }, entry) : { num, name: '?', color: '?', tag: '?' };
  }

  // ──────── 高レベル API ────────
  function computeAll(profile) {
    const { birthYear: y, birthMonth: m, birthDay: d, birthHour: hh = 0,
            lastKanji = '', firstKanji = '', kakusuuSchool = 'new' } = profile;
    const seiza = getSeiza(m, d);
    const shichuu = getShichuu(y, m, d, hh);
    const suuhi = getSuuhi(y, m, d);
    const kyuusei = getKyuusei(y, m, d);
    const doubutsu = getDoubutsu(y, m, d);
    const eto = { year: shichuu.年.shi, doubutsu: SHI_DOUBUTSU[SHI.indexOf(shichuu.年.shi)], char: shichuu.年.name };
    const seimeiNew = getSeimei(lastKanji, firstKanji, 'new');
    const seimeiOld = getSeimei(lastKanji, firstKanji, 'old');
    return {
      seiza, shichuu, suuhi, kyuusei, doubutsu, eto,
      seimei: { new: seimeiNew, old: seimeiOld, school: kakusuuSchool },
      lifepathText: LIFEPATH_TEXT[suuhi.lifepath] || '',
    };
  }

  return {
    SEIZA, KAN, SHI, SHI_DOUBUTSU, KAN_ELEM,
    getSeiza, kanshi,
    getYearKanshi, getMonthKanshi, getDayKanshi, getHourKanshi, getShichuu,
    setKakusuuData, getStrokes, getSeimei, seimeiLuck,
    reduceNum, getSuuhi, LIFEPATH_TEXT,
    getKyuusei, KYUUSEI_NAMES, KYUUSEI_ELEM,
    setDoubutsuData, getDoubutsu,
    computeAll,
  };
})();

if (typeof module !== 'undefined') module.exports = UranaiCalc;
