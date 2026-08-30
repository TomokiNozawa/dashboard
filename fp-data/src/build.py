# -*- coding: utf-8 -*-
"""FP学習データのビルド + 整合性チェック。
このディレクトリ (fp-data/src/) の分割JSONを結合して ../tax.json を生成する。

実行:
    bash ~/.claude/scripts/run_py.sh <repo>/fp-data/src/build.py

問題を追加・修正するときは src/ 側の分割JSONを編集し、必ずこのスクリプトを通すこと。
tax.json を直接編集しない（下記の検査を素通りしてしまうため）。

検査内容:
    ID重複 / 単元・カード参照の存在 / 正解indexの範囲 / 選択肢の重複 /
    解説の欠落 / 表の列数不一致 / キリル文字などの混入 /
    単元ごとのカード・問題のカバレッジ
"""
import json, os, sys, re

SP = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.dirname(SP)
OUT = os.path.join(OUT_DIR, "tax.json")

UNITS = [
    {"id": "U1",  "name": "所得税の基本",          "level": 3},
    {"id": "U2",  "name": "利子・配当・不動産所得", "level": 3},
    {"id": "U3",  "name": "事業・給与・退職所得",   "level": 3},
    {"id": "U4",  "name": "譲渡・一時・雑・山林所得","level": 3},
    {"id": "U5",  "name": "損益通算と繰越控除",     "level": 3},
    {"id": "U6",  "name": "所得控除（物的控除）",   "level": 3},
    {"id": "U7",  "name": "所得控除（人的控除）",   "level": 3},
    {"id": "U8",  "name": "税額計算と税額控除",     "level": 3},
    {"id": "U9",  "name": "申告と納付・青色申告",   "level": 3},
    {"id": "U10", "name": "個人住民税・個人事業税", "level": 3},
    {"id": "U11", "name": "法人税の基礎",           "level": 2},
    {"id": "U12", "name": "消費税",                 "level": 2},
    {"id": "U13", "name": "会社と役員・決算書",     "level": 2},
]

def load(name):
    p = os.path.join(SP, name)
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def main():
    errs, warns = [], []

    cards = load("tax_cards_a.json") + load("tax_cards_b.json")
    qs = (load("tax_q3_a.json") + load("tax_q3_b.json")
          + load("tax_q2_a.json") + load("tax_q2_b.json"))

    unit_ids = {u["id"] for u in UNITS}
    card_ids = set()

    # ── カード検査 ──
    for c in cards:
        if c["id"] in card_ids:
            errs.append("カードID重複: %s" % c["id"])
        card_ids.add(c["id"])
        if c["unit"] not in unit_ids:
            errs.append("%s: 未定義の単元 %s" % (c["id"], c["unit"]))
        for p in c.get("prereq", []):
            if p not in {x["id"] for x in cards}:
                errs.append("%s: prereq が存在しない %s" % (c["id"], p))
        for b in c["body"]:
            if b["t"] == "table":
                w = len(b["head"])
                for r in b["rows"]:
                    if len(r) != w:
                        errs.append("%s: 表の列数不一致 (head=%d, row=%d)" % (c["id"], w, len(r)))

    # ── 問題検査 ──
    q_ids = set()
    for q in qs:
        if q["id"] in q_ids:
            errs.append("問題ID重複: %s" % q["id"])
        q_ids.add(q["id"])
        if q["unit"] not in unit_ids:
            errs.append("%s: 未定義の単元 %s" % (q["id"], q["unit"]))
        if q["card"] not in card_ids:
            errs.append("%s: 参照カードが存在しない %s" % (q["id"], q["card"]))
        n = 2 if q["type"] == "ox" else len(q.get("c", []))
        if q["type"] == "mc":
            if q["level"] == 3 and n != 3:
                warns.append("%s: 3級の選択肢が%d個 (通常3個)" % (q["id"], n))
            if q["level"] == 2 and n != 4:
                warns.append("%s: 2級の選択肢が%d個 (通常4個)" % (q["id"], n))
            if len(set(q["c"])) != n:
                errs.append("%s: 選択肢が重複している" % q["id"])
        if not isinstance(q["a"], int) or not (0 <= q["a"] < n):
            errs.append("%s: 正解indexが範囲外 (a=%s, 選択肢%d)" % (q["id"], q["a"], n))
        if not q.get("exp"):
            errs.append("%s: 解説が空" % q["id"])
        # 全角英字・キリル文字などの混入検査
        blob = json.dumps(q, ensure_ascii=False)
        for m in re.findall(r"[\u0400-\u04FF]", blob):
            errs.append("%s: キリル文字混入 '%s'" % (q["id"], m))

    # ── 単元ごとのカバレッジ ──
    from collections import Counter
    cu = Counter(c["unit"] for c in cards)
    q3 = Counter(q["unit"] for q in qs if q["level"] == 3)
    q2 = Counter(q["unit"] for q in qs if q["level"] == 2)
    for u in UNITS:
        if cu[u["id"]] == 0:
            errs.append("単元 %s にカードが無い" % u["id"])
        if q3[u["id"]] + q2[u["id"]] == 0:
            errs.append("単元 %s に問題が無い" % u["id"])

    print("=" * 62)
    print(" 単元          カード   3級問  2級問")
    for u in UNITS:
        print("  %-4s %-16s %3d %6d %6d" % (u["id"], u["name"], cu[u["id"]], q3[u["id"]], q2[u["id"]]))
    print("-" * 62)
    print("  合計%29d %6d %6d" % (len(cards), sum(q3.values()), sum(q2.values())))
    print("=" * 62)

    if warns:
        print("\n[WARN] %d件" % len(warns))
        for w in warns[:20]:
            print("  - " + w)
    if errs:
        print("\n[ERROR] %d件 — 出力を中止します" % len(errs))
        for e in errs[:40]:
            print("  - " + e)
        sys.exit(1)

    data = {
        "area": "tax",
        "areaName": "タックスプランニング",
        "icon": "💰",
        "lawBase": "2026年4月1日施行の法令（2026年6月〜2027年5月実施分の法令基準日）",
        "units": UNITS,
        "cards": cards,
        "questions": qs,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print("\nOK -> %s (%.1f KB)" % (OUT, os.path.getsize(OUT) / 1024))

main()
