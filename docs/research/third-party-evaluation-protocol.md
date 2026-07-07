# Third-Party Evaluation Protocol

## 目的

Study 2で作成された成果物が、制作者以外の評価者にどう見えるかを評価する。

成果物品質を制作者本人の主観だけで判断しないため、第三者評価を分離して実施する。

## 盲検化

評価者に見せないもの:

- baselineで作られたか
- supportで作られたか
- 制作者ID
- 制作時間
- 制作ログ
- 制作時のスコア

評価者に見せるもの:

- 完成した絵文字画像
- 表示背景
- 必要な場合のみ想定利用文脈

## 評価項目

- 文字や形の判別しやすさ
- 意味の分かりやすさ
- 解釈への自信
- 何を表していると思うか
- 必要に応じて文字転記

## 出力

1行1評価刺激としてCSVへ出力する。

含めるもの:

- `evaluatorId`
- `evaluationStimulusId`
- `hiddenCondition`
- `intendedText`
- `intendedMeaning`
- `displayBackground`
- `finalContrast`
- `finalScalability`
- `finalComposition`
- `finalTotalScore`
- `legibilityRating`
- `meaningClarityRating`
- `confidenceRating`
- `meaningFreeText`
- `transcriptionText`
- `responseTimeMs`
