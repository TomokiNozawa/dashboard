# -*- coding: utf-8 -*-
"""FP学習データのビルド + 整合性チェック（全分野共通）。

このディレクトリ (fp-data/src/) の `*.area.json` を分野の定義として読み、
それぞれの分割JSONを結合して ../<area>.json を生成する。

実行:
    bash ~/.claude/scripts/run_py.sh <repo>/fp-data/src/build.py          # 全分野
    bash ~/.claude/scripts/run_py.sh <repo>/fp-data/src/build.py tax      # 分野を指定

分野を増やすときは `<area>.area.json` と分割JSONを足すだけ。
このスクリプトは分野ごとにコピーしないこと（検査ロジックが分散して腐る）。

問題を追加・修正するときは src/ 側の分割JSONを編集し、必ずこのスクリプトを通す。
生成物の <area>.json を直接編集しない（下記の検査を素通りしてしまうため）。

検査内容:
    ID重複（分野をまたいでも一意か。SRSの保存キーが全分野共通のため必須）/
    単元・カード参照の存在 / prereq の存在 / 正解indexの範囲 / 選択肢の重複 /
    問題文・解説の欠落 / 表の列数不一致 / キリル文字などの混入 /
    単元ごとのカード・問題のカバレッジ
"""
import json, os, sys, re, glob
from collections import Counter

SRC = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.dirname(SRC)


def load(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return json.load(f)


# 日本語の文章に紛れ込みやすい他言語の文字。実際に「무リスク資産」「給与от天引き」が混入した
FOREIGN = re.compile(r"[Ѐ-ӿ가-힣฀-๿]")


def scan_chars(area, _id, obj, errs):
    blob = json.dumps(obj, ensure_ascii=False)
    for ch in sorted(set(FOREIGN.findall(blob))):
        errs.append("%s %s: 想定外の文字が混入 '%s'" % (area, _id, ch))


def build_area(cfg, seen_ids, errs, warns):
    """1分野ぶんを検査して dict を返す。errs が空でなければ呼び出し側が中止する。"""
    area = cfg["area"]
    cards, qs = [], []
    for fn in cfg["cards"]:
        cards += load(fn)
    for fn in cfg["questions"]:
        qs += load(fn)

    unit_ids = {u["id"] for u in cfg["units"]}
    card_ids = {c["id"] for c in cards}

    def dup(kind, _id):
        # SRS / 読了フラグの保存キーは分野をまたいで共通なので、全体で一意でなければならない
        if _id in seen_ids:
            errs.append("%s: %sID重複 %s（%s と衝突）" % (area, kind, _id, seen_ids[_id]))
        seen_ids[_id] = area

    for c in cards:
        dup("カード", c["id"])
        if c["unit"] not in unit_ids:
            errs.append("%s %s: 未定義の単元 %s" % (area, c["id"], c["unit"]))
        for p in c.get("prereq", []):
            if p not in card_ids:
                errs.append("%s %s: prereq が存在しない %s" % (area, c["id"], p))
        if not c.get("title") or not c.get("summary"):
            errs.append("%s %s: title / summary が空" % (area, c["id"]))
        scan_chars(area, c["id"], c, errs)
        for b in c["body"]:
            if b["t"] == "table":
                w = len(b["head"])
                for r in b["rows"]:
                    if len(r) != w:
                        errs.append("%s %s: 表の列数不一致 (head=%d, row=%d)" % (area, c["id"], w, len(r)))

    for q in qs:
        dup("問題", q["id"])
        if q["unit"] not in unit_ids:
            errs.append("%s %s: 未定義の単元 %s" % (area, q["id"], q["unit"]))
        if q["card"] not in card_ids:
            errs.append("%s %s: 参照カードが存在しない %s" % (area, q["id"], q["card"]))
        if not q.get("q"):
            errs.append("%s %s: 問題文が空" % (area, q["id"]))
        if not q.get("exp"):
            errs.append("%s %s: 解説が空" % (area, q["id"]))
        n = 2 if q["type"] == "ox" else len(q.get("c", []))
        if q["type"] == "mc":
            if q["level"] == 3 and n != 3:
                warns.append("%s %s: 3級の選択肢が%d個 (通常3個)" % (area, q["id"], n))
            if q["level"] == 2 and n != 4:
                warns.append("%s %s: 2級の選択肢が%d個 (通常4個)" % (area, q["id"], n))
            if len(set(q["c"])) != n:
                errs.append("%s %s: 選択肢が重複している" % (area, q["id"]))
        if not isinstance(q["a"], int) or not (0 <= q["a"] < n):
            errs.append("%s %s: 正解indexが範囲外 (a=%s, 選択肢%d)" % (area, q["id"], q["a"], n))
        scan_chars(area, q["id"], q, errs)

    cu = Counter(c["unit"] for c in cards)
    q3 = Counter(q["unit"] for q in qs if q["level"] == 3)
    q2 = Counter(q["unit"] for q in qs if q["level"] == 2)
    for u in cfg["units"]:
        if cu[u["id"]] == 0:
            errs.append("%s: 単元 %s にカードが無い" % (area, u["id"]))
        if q3[u["id"]] + q2[u["id"]] == 0:
            errs.append("%s: 単元 %s に問題が無い" % (area, u["id"]))

    print("\n【%s %s】" % (cfg["icon"], cfg["areaName"]))
    print("  単元                        カード   3級問  2級問")
    for u in cfg["units"]:
        tag = "実践" if u.get("practice") else ("2級" if u["level"] == 2 else "  ")
        print("  %-4s %-20s %s %3d %6d %6d" % (u["id"], u["name"], tag, cu[u["id"]], q3[u["id"]], q2[u["id"]]))
    print("  " + "-" * 56)
    print("  合計%37d %6d %6d" % (len(cards), sum(q3.values()), sum(q2.values())))

    out = dict(cfg)
    for k in ("cards", "questions"):
        out.pop(k, None)
    out["cards"] = cards
    out["questions"] = qs
    return out


def main():
    targets = sys.argv[1:]
    cfgs = sorted(glob.glob(os.path.join(SRC, "*.area.json")))
    if targets:
        cfgs = [p for p in cfgs if os.path.basename(p).split(".")[0] in targets]
        if not cfgs:
            print("該当する分野の定義 (*.area.json) がありません: %s" % ", ".join(targets))
            sys.exit(1)

    errs, warns, seen_ids, built = [], [], {}, []
    for p in cfgs:
        with open(p, encoding="utf-8") as f:
            cfg = json.load(f)
        built.append(build_area(cfg, seen_ids, errs, warns))

    print("")
    if warns:
        print("[WARN] %d件" % len(warns))
        for w in warns[:20]:
            print("  - " + w)
    if errs:
        print("[ERROR] %d件 — 出力を中止します" % len(errs))
        for e in errs[:40]:
            print("  - " + e)
        sys.exit(1)

    for data in built:
        out = os.path.join(OUT_DIR, data["area"] + ".json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print("OK -> %s (%.1f KB)" % (out, os.path.getsize(out) / 1024))


main()
