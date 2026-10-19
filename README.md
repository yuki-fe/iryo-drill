# 医療事務用語ドリル

医療事務の仕事と、医療事務の資格の勉強で使う用語を覚える静的サイトです。`python build.py` を実行すると `docs/` に全ページが書き出され、そのまま GitHub Pages で公開できます。

- 公開URL（予定）: https://iryo.yogo-drill.com/

## 普段の作業

```powershell
cd "C:\Users\admin\Desktop\iryo-drill"
python data/make_terms.py             # 用語を直したとき
python build.py                       # docs/ を作り直す
python -m http.server 8000 -d docs    # http://localhost:8000 で確認（Ctrl+C で終了）
```

## 用語を追加・修正する

`data/make_terms.py` の `TERMS` に、`(分野, 小分類, 用語, 正式名, 説明)` の形で書きます。

- 分野は `H`（医療保険のしくみ）/ `K`（公費負担医療と介護保険）/ `S`（診療報酬のしくみ）/ `R`（レセプトと窓口）/ `M`（医学の基礎）/ `Y`（カルテの略語）/ `L`（法律と医療の仕事）
- 正式名（英語・ラテン語など）を書くと、略語クイズに入る。ひらがなだけを書くと「読み」として扱う
- id は並び順で付く。公開後は、新しい用語をリストの最後に足す
- 診療報酬の点数は書かない（改定で変わるため）。制度の数字は、元の資料で確かめてから書く
