# Research data exports

## Files

- `scoring-audit-v1.4.csv`: 現行`metric-rules-v1.4.0`の1,125条件監査。上下各行の文字数、かな3文字例外、入力パラメータ、APCA内訳、縮小耐性の原因別減点、形状リスク、総合点、表示帯、改善コメントを含む。
- `scoring-audit-v1.3.csv`: 旧`metric-rules-v1.3.0`の履歴データ。総文字数に基づく旧文字数減点を含むため、v1.4と同一集計へ混在させない。
- `default-palette-analysis.csv`: 標準PCCS bright tone 12色について、白・黒背景に対するAPCA Lc、WCAG 2.xコントラスト比、OKLCH、現行の黒内側線推奨判定を含む。

どちらもUTF-8 CSVで、Google Sheets、Excel、R、Pythonへ直接読み込める。列名は英数字、値は加工前の数値を基本とし、表示用の帯分類は別列に保持している。

## Reproduction

```bash
npm run audit:score:export
```

このコマンドは個別境界テストと1,125条件監査を通過した場合だけCSVを書き出す。採点規則を更新した場合は、`METRIC_VERSION` と出力ファイル名も更新し、旧版を上書きしない。

## Matrix definition

| Variable | Levels |
|---|---|
| fill color | 5: white, yellow, orange, blue, charcoal |
| text | 3: Latin 2 graphemes on one line, ordinary Kanji 2+1, dense Kanji 2+2 |
| font weight | 3: 300, 700, 900 |
| horizontal width | 5: 60, 85, 100, 120, 140% |
| outline condition | 5: none, inner only, outer only, stable double, excessive double |

The Cartesian product is `5 x 3 x 3 x 5 x 5 = 1,125` rows. This matrix is a software consistency audit, not a representative sample of all possible custom emoji designs.
